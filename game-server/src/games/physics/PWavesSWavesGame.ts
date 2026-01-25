import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// P-WAVES VS S-WAVES GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Seismic wave propagation through different media
// P-waves (Primary/Compression): v_p = sqrt((K + 4G/3) / rho) - travel through solids AND liquids
// S-waves (Secondary/Shear): v_s = sqrt(G / rho) - ONLY travel through solids
// Liquids have shear modulus G = 0, so S-wave speed = 0 in liquids
// This is how scientists discovered Earth's liquid outer core!
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  connection: string;
}

// Physics constants (PROTECTED - never sent to client)
const P_WAVE_SPEED_ROCK = 6.5; // km/s in typical rock
const S_WAVE_SPEED_ROCK = 3.7; // km/s in typical rock
const P_WAVE_SPEED_LIQUID = 1.5; // km/s in water/liquid
const S_WAVE_SPEED_LIQUID = 0; // S-waves cannot travel through liquid!
const SPEED_RATIO = P_WAVE_SPEED_ROCK / S_WAVE_SPEED_ROCK; // ~1.7x faster

export class PWavesSWavesGame extends BaseGame {
  readonly gameType = 'p_waves_s_waves';
  readonly gameTitle = 'P-Waves vs S-Waves: Probing Earth\'s Core';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private waveType: 'p' | 's' = 'p';
  private medium: 'solid' | 'liquid' = 'solid';
  private waveProgress = 0;
  private isWaveActive = false;
  private hasExperimented = false;
  private hasSentSWaveInLiquid = false;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A seismometer station records two distinct arrivals from a distant earthquake. The first arrival shows a sharp back-and-forth motion, the second shows a stronger side-to-side shaking.",
      question: "Which seismic wave arrives first at a monitoring station?",
      options: [
        "S-wave (Secondary)",
        "P-wave (Primary)",
        "Surface wave",
        "Both arrive together"
      ],
      correctIndex: 1,
      explanation: "P-waves (Primary waves) travel about 1.7x faster than S-waves through rock, so they always arrive first - hence the name 'Primary.'"
    },
    {
      scenario: "In the early 1900s, geologist Richard Oldham noticed that seismic S-waves from major earthquakes never arrived at stations located on the opposite side of Earth from the earthquake epicenter.",
      question: "How did scientists discover Earth's outer core is liquid?",
      options: [
        "Temperature measurements",
        "S-wave shadow zone",
        "Drilling experiments",
        "Satellite imagery"
      ],
      correctIndex: 1,
      explanation: "S-waves cannot travel through liquids. Scientists found that S-waves disappear on the opposite side of Earth after an earthquake, creating a 'shadow zone' that proves the outer core is liquid."
    },
    {
      scenario: "A physics student is building a model to demonstrate seismic wave motion. They want to show how P-wave particles move through rock.",
      question: "How do particles move in a P-wave?",
      options: [
        "Perpendicular to wave direction",
        "Parallel to wave direction (compression)",
        "In circular orbits",
        "They don't move"
      ],
      correctIndex: 1,
      explanation: "P-waves are compression waves - particles push and pull back and forth parallel to the direction the wave travels, like a slinky being pushed from one end."
    },
    {
      scenario: "A geophysicist is explaining to students why S-waves create a shadow zone behind Earth's liquid outer core.",
      question: "Why can't S-waves travel through liquids?",
      options: [
        "Liquids are too dense",
        "Liquids move too fast",
        "Liquids cannot support shear stress",
        "S-waves are always slower"
      ],
      correctIndex: 2,
      explanation: "S-waves require the material to 'spring back' when displaced sideways (shear). Liquids flow instead of springing back - there's no restoring force to propagate the wave."
    },
    {
      scenario: "A resident in an earthquake zone feels two distinct types of shaking during an earthquake. First, a quick sharp jolt, then seconds later, a much stronger rolling motion.",
      question: "In an earthquake, what causes the first sharp jolt you feel?",
      options: [
        "S-wave arrival",
        "P-wave arrival",
        "Surface wave",
        "Aftershock"
      ],
      correctIndex: 1,
      explanation: "The faster P-wave arrives first as a sharp, quick jolt. The more damaging S-wave arrives seconds later with stronger shaking."
    },
    {
      scenario: "A medical technician is using an ultrasound machine to image a patient's internal organs. The device sends sound waves through the body and detects reflections.",
      question: "Medical ultrasound uses which type of wave principle?",
      options: [
        "S-waves (shear)",
        "P-waves (compression)",
        "Surface waves",
        "Electromagnetic waves"
      ],
      correctIndex: 1,
      explanation: "Ultrasound uses compression waves (same principle as P-waves) because they can travel through fluids like blood and amniotic fluid."
    },
    {
      scenario: "Petroleum geologists are searching for underground oil reservoirs. They use seismic surveys that send both P and S waves into the ground.",
      question: "How do oil companies use P and S waves together?",
      options: [
        "Only P-waves are used",
        "S-waves reflect differently off fluid reservoirs",
        "For legal compliance",
        "They cannot be used together"
      ],
      correctIndex: 1,
      explanation: "S-waves are blocked by fluid-filled reservoirs while P-waves pass through. This difference helps locate underground oil and gas deposits."
    },
    {
      scenario: "Planetary scientists are analyzing seismic data from a probe on another planet to determine its internal structure.",
      question: "If you wanted to detect a liquid layer inside another planet, what would you look for?",
      options: [
        "Higher temperatures",
        "S-wave shadow zone",
        "Magnetic field changes",
        "Visual light reflection"
      ],
      correctIndex: 1,
      explanation: "Just like on Earth, an S-wave shadow zone would indicate liquid layers - this is how planetary scientists study the interiors of planets and moons."
    },
    {
      scenario: "A seismologist is analyzing how P-waves behave as they enter Earth's liquid outer core at a depth of 2,900 km.",
      question: "What happens when P-waves enter the liquid outer core?",
      options: [
        "They stop completely",
        "They speed up dramatically",
        "They slow down and bend",
        "They convert to S-waves"
      ],
      correctIndex: 2,
      explanation: "P-waves slow down in liquid (from ~14 km/s to ~8 km/s) and bend (refract) at the boundary. This creates a P-wave shadow zone between 104 and 140 degrees from the epicenter."
    },
    {
      scenario: "A structural engineer is explaining to building designers why earthquake-resistant buildings need special reinforcement for horizontal forces.",
      question: "Why do buildings often shake more during S-wave passage than P-wave?",
      options: [
        "S-waves are always larger",
        "S-wave shear motion causes more horizontal movement",
        "P-waves are absorbed by ground",
        "S-waves last longer"
      ],
      correctIndex: 1,
      explanation: "S-waves cause side-to-side (shear) motion which is more damaging to buildings than the back-and-forth compression of P-waves. Buildings are better at resisting vertical loads than horizontal shaking."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🌍",
      title: "Earthquake Early Warning",
      tagline: "Seconds of warning can save lives",
      description: "Modern seismometers detect P-waves within seconds of an earthquake. Since P-waves travel faster but cause less damage than S-waves, this gives precious seconds of warning before the destructive S-waves arrive.",
      connection: "Japan's system gives 5-40 seconds warning. Trains automatically slow down, factories shut off gas lines, and elevators stop at nearest floor."
    },
    {
      icon: "🛢️",
      title: "Oil & Gas Exploration",
      tagline: "Seismic imaging worth billions",
      description: "Seismic surveys send controlled waves into the ground. Since S-waves don't travel through fluids but P-waves do, comparing their reflections reveals underground oil and gas reservoirs.",
      connection: "S-waves shadows indicate fluid pockets. Computer models combine P and S wave data to create 3D reservoir maps worth billions to energy companies."
    },
    {
      icon: "🏥",
      title: "Medical Ultrasound Imaging",
      tagline: "Compression waves see inside you",
      description: "Ultrasound uses compression waves (like P-waves) that can travel through body fluids. Echoes from different tissues create real-time images of babies, organs, and blood flow without radiation.",
      connection: "Works through amniotic fluid and blood because P-waves travel through liquids. Over 3 billion scans performed yearly worldwide."
    },
    {
      icon: "🏗️",
      title: "Structural Integrity Testing",
      tagline: "Finding cracks before they fail",
      description: "Non-destructive testing sends ultrasonic waves through bridges, pipelines, and aircraft. Waves reflect off hidden cracks and defects, revealing dangerous flaws before they cause failures.",
      connection: "Uses both compression and shear wave modes to detect different defect orientations. Achieves 99.9% defect detection accuracy in critical structures."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate wave speed based on medium and wave type
  private calculateWaveSpeed(waveType: 'p' | 's', medium: 'solid' | 'liquid'): number {
    if (waveType === 'p') {
      return medium === 'solid' ? P_WAVE_SPEED_ROCK : P_WAVE_SPEED_LIQUID;
    } else {
      return medium === 'solid' ? S_WAVE_SPEED_ROCK : S_WAVE_SPEED_LIQUID;
    }
  }

  // PROTECTED: Check if S-wave can propagate
  private canSWavePropagate(medium: 'solid' | 'liquid'): boolean {
    // S-waves require shear modulus > 0, liquids have G = 0
    return medium === 'solid';
  }

  // PROTECTED: Calculate arrival time difference
  private calculateArrivalTimeDifference(distance: number): number {
    // t_s - t_p = d * (1/v_s - 1/v_p)
    return distance * (1 / S_WAVE_SPEED_ROCK - 1 / P_WAVE_SPEED_ROCK);
  }

  // PROTECTED: Check test answer
  private checkAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.testQuestions[questionIndex].correctIndex === answerIndex;
  }

  // Calculate test score
  private calculateScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (this.checkAnswer(index, answer) ? 1 : 0);
    }, 0);
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'discover') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('option_')) {
            this.prediction = buttonId.replace('option_', '');
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'wave_p') {
          this.waveType = 'p';
        } else if (buttonId === 'wave_s') {
          this.waveType = 's';
        } else if (buttonId === 'send_wave' && !this.isWaveActive) {
          this.isWaveActive = true;
          this.waveProgress = 0;
          this.hasExperimented = true;
        } else if (buttonId === 'continue' && this.hasExperimented) {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'continue') {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (!this.showTwistFeedback) {
          if (buttonId.startsWith('option_')) {
            this.twistPrediction = buttonId.replace('option_', '');
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'medium_solid') {
          this.medium = 'solid';
        } else if (buttonId === 'medium_liquid') {
          this.medium = 'liquid';
        } else if (buttonId === 'wave_p') {
          this.waveType = 'p';
        } else if (buttonId === 'wave_s') {
          this.waveType = 's';
        } else if (buttonId === 'send_wave' && !this.isWaveActive) {
          this.isWaveActive = true;
          this.waveProgress = 0;
          if (this.waveType === 's' && this.medium === 'liquid') {
            this.hasSentSWaveInLiquid = true;
          }
        } else if (buttonId === 'continue' && this.hasSentSWaveInLiquid) {
          this.phase = 'twist_review';
        }
        break;

      case 'twist_review':
        if (buttonId === 'continue') {
          this.phase = 'transfer';
        }
        break;

      case 'transfer':
        if (buttonId.startsWith('app_')) {
          this.activeAppIndex = parseInt(buttonId.split('_')[1]);
        } else if (buttonId === 'mark_understood') {
          this.completedApps.add(this.activeAppIndex);
        } else if (buttonId === 'continue' && this.completedApps.size >= 4) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (!this.showTestResults) {
          if (buttonId.startsWith('answer_')) {
            const answerIndex = parseInt(buttonId.split('_')[1]);
            this.testAnswers[this.currentQuestionIndex] = answerIndex;
          } else if (buttonId === 'next_question' && this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
          } else if (buttonId === 'prev_question' && this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
          } else if (buttonId === 'submit' && !this.testAnswers.includes(-1)) {
            this.showTestResults = true;
          }
        } else {
          if (buttonId === 'continue') {
            if (this.calculateScore() >= 7) {
              this.phase = 'mastery';
            } else {
              this.showTestResults = false;
              this.testAnswers = Array(10).fill(-1);
              this.currentQuestionIndex = 0;
              this.phase = 'review';
            }
          }
        }
        break;

      case 'mastery':
        if (buttonId === 'restart') {
          this.resetGame();
        }
        break;
    }
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.waveType = 'p';
    this.medium = 'solid';
    this.waveProgress = 0;
    this.isWaveActive = false;
    this.hasExperimented = false;
    this.hasSentSWaveInLiquid = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update wave progress
    if (this.isWaveActive) {
      this.waveProgress += deltaTime * 0.8;
      if (this.waveProgress >= 1) {
        this.waveProgress = 0;
        this.isWaveActive = false;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(139, 92, 246, 0.05)' });

    // Render phase-specific content
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

    // Progress indicator
    this.renderProgress(r);

    return r.toFrame(Math.floor(this.animationTime * 60));
  }

  private renderProgress(r: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);

    r.setProgress({
      id: 'phase_progress',
      current: currentIndex + 1,
      total: phases.length,
      labels: phases
    });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 80, 'SEISMIC PHYSICS', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'P-Waves vs S-Waves', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How we proved Earth\'s core is liquid', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Earth illustration
    r.text(200, 250, '🌍', { fill: '#ffffff', fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'Scientists discovered something strange:', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 365, 'S-waves disappear!', { fill: '#a78bfa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'When an earthquake hits, some waves', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 420, 'never reach the other side of Earth.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 450, 'What blocks them 2,900 km underground?', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Explore the Mystery', variant: 'primary' });

    r.setCoachMessage('Learn how seismic waves reveal Earth\'s hidden liquid core!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Seismologists detect two types of waves', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'after earthquakes. What can travel', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'through liquid materials?', { fill: '#f97316', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'p_only', label: 'Only P-waves (compression)' },
      { id: 's_only', label: 'Only S-waves (shear)' },
      { id: 'both', label: 'Both wave types' },
      { id: 'neither', label: 'Neither wave type' }
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'p_only') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option.label}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 480, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 'p_only' ? 'Excellent prediction!' : 'The answer: Only P-waves travel through liquids!';
      r.text(200, 510, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 540, "Let's explore both wave types...", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore Wave Types', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Wave Type Comparison', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 85, 360, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Medium label (solid)
    r.text(200, 110, '🪨 SOLID ROCK MEDIUM', { fill: '#a1a1aa', fontSize: 11, textAnchor: 'middle' });

    // Draw particle chain
    const numParticles = 10;
    const baseY = 180;
    const sWaveBlocked = this.waveType === 's' && this.medium === 'liquid';

    for (let i = 0; i < numParticles; i++) {
      const baseX = 60 + i * 32;
      const waveReached = this.waveProgress * numParticles > i;
      const intensity = waveReached ? Math.max(0, 1 - Math.abs(this.waveProgress * numParticles - i) / 3) : 0;

      let offsetX = 0, offsetY = 0;
      if (this.waveType === 'p') {
        // P-wave: compression (parallel motion)
        offsetX = intensity * Math.sin(this.animationTime * 12 + i * 0.8) * 12;
      } else {
        // S-wave in solid: shear (perpendicular motion)
        offsetY = intensity * Math.sin(this.animationTime * 12 + i * 0.8) * 16;
      }

      const particleColor = waveReached
        ? (this.waveType === 'p' ? '#fb923c' : '#a78bfa')
        : '#52525b';

      // Connection line
      if (i < numParticles - 1) {
        r.line(baseX + offsetX, baseY + offsetY, 60 + (i + 1) * 32, baseY, { stroke: '#52525b', strokeWidth: 2 });
      }

      // Particle
      r.circle(baseX + offsetX, baseY + offsetY, 8, { fill: particleColor });
    }

    // Wave type indicator
    r.roundRect(300, 130, 70, 80, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(335, 155, this.waveType === 'p' ? 'P-Wave' : 'S-Wave', {
      fill: this.waveType === 'p' ? '#fb923c' : '#a78bfa',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(335, 180, this.waveType === 'p' ? '← →' : '↑ ↓', { fontSize: 18, textAnchor: 'middle', fill: '#ffffff' });
    r.text(335, 200, this.waveType === 'p' ? 'Compression' : 'Shear', {
      fill: '#94a3b8',
      fontSize: 9,
      textAnchor: 'middle'
    });

    // Motion explanation
    r.text(200, 265, this.waveType === 'p'
      ? 'P-Wave: Particles compress/expand parallel to wave'
      : 'S-Wave: Particles move perpendicular (shear)',
      { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Speed comparison
    r.roundRect(40, 285, 150, 55, 10, { fill: 'rgba(251, 146, 60, 0.1)' });
    r.text(115, 308, 'P-Wave Speed', { fill: '#fb923c', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 328, `${P_WAVE_SPEED_ROCK} km/s (FIRST)`, { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.roundRect(210, 285, 150, 55, 10, { fill: 'rgba(167, 139, 250, 0.1)' });
    r.text(285, 308, 'S-Wave Speed', { fill: '#a78bfa', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 328, `${S_WAVE_SPEED_ROCK} km/s (SECOND)`, { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Wave type selector
    r.text(60, 365, 'Select Wave Type:', { fill: '#94a3b8', fontSize: 12 });

    r.roundRect(40, 380, 150, 45, 8, {
      fill: this.waveType === 'p' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(51, 65, 85, 0.5)'
    });
    r.text(115, 408, '← → P-Wave', {
      fill: this.waveType === 'p' ? '#fb923c' : '#94a3b8',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'wave_p', label: '', variant: 'secondary' });

    r.roundRect(210, 380, 150, 45, 8, {
      fill: this.waveType === 's' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(51, 65, 85, 0.5)'
    });
    r.text(285, 408, '↑ ↓ S-Wave', {
      fill: this.waveType === 's' ? '#a78bfa' : '#94a3b8',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'wave_s', label: '', variant: 'secondary' });

    // Send wave button
    r.addButton({
      id: 'send_wave',
      label: this.isWaveActive ? 'Wave Propagating...' : 'Send Wave',
      variant: 'primary',
      disabled: this.isWaveActive
    });

    // Continue button
    if (this.hasExperimented) {
      r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'secondary' });
    }

    r.setCoachMessage('Try both wave types! Notice how particles move differently.');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Two Types of Seismic Motion', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // P-Wave card
    r.roundRect(25, 85, 350, 110, 12, { fill: 'rgba(251, 146, 60, 0.1)' });
    r.text(55, 115, '← →', { fill: '#fb923c', fontSize: 24 });
    r.text(120, 115, 'P-Waves: Compression', { fill: '#fb923c', fontSize: 16, fontWeight: 'bold' });
    r.text(200, 145, 'Particles push back-and-forth, parallel to', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 163, 'wave direction. Like pushing a slinky.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 185, `Speed: ~${P_WAVE_SPEED_ROCK} km/s • Arrives FIRST`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // S-Wave card
    r.roundRect(25, 210, 350, 110, 12, { fill: 'rgba(167, 139, 250, 0.1)' });
    r.text(55, 240, '↑ ↓', { fill: '#a78bfa', fontSize: 24 });
    r.text(120, 240, 'S-Waves: Shear', { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold' });
    r.text(200, 270, 'Particles move side-to-side, perpendicular', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 288, 'to wave direction. Like shaking a rope.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 310, `Speed: ~${S_WAVE_SPEED_ROCK} km/s • Arrives SECOND`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 335, 340, 100, 16, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 365, 'Key Question', { fill: '#f97316', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 395, 'Both waves travel through solid rock.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 418, 'But what happens when they hit LIQUID?', { fill: '#38bdf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'The Liquid Puzzle', variant: 'primary' });

    r.setCoachMessage('Now let\'s see what happens in liquid - this is where the real discovery begins!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: S-Waves in Liquid', { fill: '#a78bfa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Scientists noticed S-waves from earthquakes', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'never arrived on Earth\'s opposite side.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'What happens to S-waves in liquid?', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'travels', label: 'Travels normally' },
      { id: 'slows', label: 'Slows down but continues' },
      { id: 'blocked', label: 'Cannot travel through' }
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.id === 'blocked') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(139, 92, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option.label}`, { fill: textColor, fontSize: 14 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 'blocked' ? 'Correct!' : 'S-waves CANNOT travel through liquids!';
      r.text(200, 460, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, 'Liquids have no shear resistance -', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 510, 'they flow instead of springing back.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It In Action', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Solid vs Liquid Medium', { fill: '#a78bfa', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 75, 360, 200, 16, { fill: this.medium === 'solid' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(56, 189, 248, 0.15)' });
    r.text(200, 100, this.medium === 'solid' ? '🪨 SOLID ROCK' : '💧 LIQUID (Water/Molten Iron)', {
      fill: this.medium === 'solid' ? '#a1a1aa' : '#38bdf8',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Draw particle chain
    const numParticles = 10;
    const baseY = 170;
    const sWaveBlocked = this.waveType === 's' && this.medium === 'liquid';

    for (let i = 0; i < numParticles; i++) {
      const baseX = 60 + i * 32;
      const waveReached = this.waveProgress * numParticles > i;
      let intensity = waveReached ? Math.max(0, 1 - Math.abs(this.waveProgress * numParticles - i) / 3) : 0;

      let offsetX = 0, offsetY = 0;
      if (this.waveType === 'p') {
        offsetX = intensity * Math.sin(this.animationTime * 12 + i * 0.8) * 12;
      } else if (this.medium === 'solid') {
        offsetY = intensity * Math.sin(this.animationTime * 12 + i * 0.8) * 16;
      } else {
        // S-wave in liquid: rapidly decays
        offsetY = intensity * Math.sin(this.animationTime * 12 + i * 0.8) * 16 * Math.exp(-i * 0.5);
      }

      const particleColor = waveReached
        ? (this.waveType === 'p' ? '#fb923c' : '#a78bfa')
        : '#52525b';

      const opacity = sWaveBlocked && i > 2 ? 0.2 : 1;

      // Connection line
      if (i < numParticles - 1) {
        r.line(baseX + offsetX, baseY + offsetY, 60 + (i + 1) * 32, baseY, {
          stroke: '#52525b',
          strokeWidth: 2,
          opacity: sWaveBlocked && i > 2 ? 0.15 : 0.35
        });
      }

      // Particle
      r.circle(baseX + offsetX, baseY + offsetY, 8, { fill: particleColor, opacity });
    }

    // S-wave blocked indicator
    if (sWaveBlocked && this.isWaveActive && this.waveProgress > 0.2) {
      r.roundRect(120, 130, 160, 50, 10, { fill: 'rgba(239, 68, 68, 0.9)' });
      r.text(200, 152, 'S-WAVE BLOCKED!', { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 170, 'No shear resistance', { fill: '#fca5a5', fontSize: 10, textAnchor: 'middle' });
    }

    // Medium selector
    r.text(60, 295, 'Medium:', { fill: '#94a3b8', fontSize: 12 });

    r.roundRect(40, 308, 150, 40, 8, {
      fill: this.medium === 'solid' ? 'rgba(161, 161, 170, 0.2)' : 'rgba(51, 65, 85, 0.5)'
    });
    r.text(115, 333, '🪨 Solid', {
      fill: this.medium === 'solid' ? '#a1a1aa' : '#71717a',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'medium_solid', label: '', variant: 'secondary' });

    r.roundRect(210, 308, 150, 40, 8, {
      fill: this.medium === 'liquid' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(51, 65, 85, 0.5)'
    });
    r.text(285, 333, '💧 Liquid', {
      fill: this.medium === 'liquid' ? '#38bdf8' : '#71717a',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'medium_liquid', label: '', variant: 'secondary' });

    // Wave type selector
    r.text(60, 365, 'Wave Type:', { fill: '#94a3b8', fontSize: 12 });

    r.roundRect(40, 378, 150, 40, 8, {
      fill: this.waveType === 'p' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(51, 65, 85, 0.5)'
    });
    r.text(115, 403, '← → P-Wave', {
      fill: this.waveType === 'p' ? '#fb923c' : '#71717a',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'wave_p', label: '', variant: 'secondary' });

    r.roundRect(210, 378, 150, 40, 8, {
      fill: this.waveType === 's' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(51, 65, 85, 0.5)'
    });
    r.text(285, 403, '↑ ↓ S-Wave', {
      fill: this.waveType === 's' ? '#a78bfa' : '#71717a',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'wave_s', label: '', variant: 'secondary' });

    // Warning for S-wave in liquid
    if (this.waveType === 's' && this.medium === 'liquid') {
      r.roundRect(40, 430, 320, 40, 8, { fill: 'rgba(239, 68, 68, 0.2)' });
      r.text(200, 455, '⚠️ S-waves cannot propagate through liquids!', {
        fill: '#ef4444',
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
    }

    // Send wave button
    r.addButton({
      id: 'send_wave',
      label: this.isWaveActive ? 'Propagating...' : 'Send Wave',
      variant: 'primary',
      disabled: this.isWaveActive
    });

    // Continue button
    if (this.hasSentSWaveInLiquid) {
      r.addButton({ id: 'continue', label: 'Understand Why', variant: 'secondary' });
    }

    r.setCoachMessage('Try sending an S-wave through liquid to see what happens!');
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Why Liquids Block S-Waves', { fill: '#a78bfa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main insight
    r.roundRect(25, 80, 350, 100, 12, { fill: 'rgba(139, 92, 246, 0.15)' });
    r.text(200, 105, 'The Fundamental Difference', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, 'S-waves need materials that "spring back"', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 150, 'when pushed sideways (shear resistance).', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 170, 'Liquids just FLOW - no restoring force!', { fill: '#38bdf8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // P-wave explanation
    r.roundRect(25, 195, 350, 80, 12, { fill: 'rgba(251, 146, 60, 0.15)' });
    r.text(200, 220, 'P-Waves Work Everywhere', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 245, 'Both solids AND liquids resist compression.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 265, "That's why P-waves travel through Earth's liquid core!", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Earth discovery
    r.roundRect(25, 290, 350, 100, 12, { fill: 'rgba(34, 197, 94, 0.15)' });
    r.text(200, 315, '🌍 How We Found the Liquid Core', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'In 1906, Richard Oldham noticed S-waves', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 360, 'never arrived opposite from earthquakes.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 380, 'This "S-wave shadow" proved liquid exists!', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula
    r.roundRect(40, 405, 320, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 430, 'Key Physics', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 455, 'v_s = sqrt(G / rho)', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 470, 'Liquids: G = 0, so v_s = 0', { fill: '#a78bfa', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f97316';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 190, app.tagline, { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    // Description (wrap text)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 220;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 310, 320, 65, 10, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 335, 'Physics Connection', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 435, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 48) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 15;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question, { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 215 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`, {
          fill: isSelected ? '#f97316' : '#e2e8f0',
          fontSize: 11
        });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 445, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "You've mastered seismic waves!" : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'P-waves: compression, travel everywhere',
        'S-waves: shear, blocked by liquids',
        'S-wave shadow proves liquid core',
        'Early warning and exploration uses'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 335 + i * 20, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Seismic Wave Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how P and S waves', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'reveal Earth\'s hidden liquid core!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '← →', label: 'P-Wave Compression' },
      { icon: '↑ ↓', label: 'S-Wave Shear' },
      { icon: '🌍', label: 'Core Discovery' },
      { icon: '⚡', label: 'Early Warning' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 290 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 455, 300, 70, 12, { fill: 'rgba(167, 139, 250, 0.2)' });
    r.text(200, 480, 'Key Insight', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 510, 'Shear Modulus = 0 in liquids → S-waves stop!', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering P-waves and S-waves!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      waveType: this.waveType,
      medium: this.medium,
      waveProgress: this.waveProgress,
      isWaveActive: this.isWaveActive,
      hasExperimented: this.hasExperimented,
      hasSentSWaveInLiquid: this.hasSentSWaveInLiquid,
      animationTime: this.animationTime,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.waveType !== undefined) this.waveType = state.waveType as 'p' | 's';
    if (state.medium !== undefined) this.medium = state.medium as 'solid' | 'liquid';
    if (state.waveProgress !== undefined) this.waveProgress = state.waveProgress as number;
    if (state.isWaveActive !== undefined) this.isWaveActive = state.isWaveActive as boolean;
    if (state.hasExperimented !== undefined) this.hasExperimented = state.hasExperimented as boolean;
    if (state.hasSentSWaveInLiquid !== undefined) this.hasSentSWaveInLiquid = state.hasSentSWaveInLiquid as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createPWavesSWavesGame(sessionId: string): PWavesSWavesGame {
  return new PWavesSWavesGame(sessionId);
}
