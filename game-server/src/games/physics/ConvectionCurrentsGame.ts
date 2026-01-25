import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CONVECTION CURRENTS GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Convection is heat transfer through fluid motion
// Hot fluid expands, becomes less dense, and rises
// Cool fluid contracts, becomes more dense, and sinks
// This creates circular convection cells
// Buoyancy force: F_b = (rho_cold - rho_hot) * g * V
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  title: string;
  description: string;
  fact: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  temp: number;
}

// Physics constants (PROTECTED - never sent to client)
const BASE_TEMPERATURE = 20; // Celsius
const HOT_TEMPERATURE = 100;
const BUOYANCY_COEFFICIENT = 0.02;
const DRAG_COEFFICIENT = 0.95;
const COOLING_RATE = 1;
const HEATING_RATE = 2;

export class ConvectionCurrentsGame extends BaseGame {
  readonly gameType = 'convection_currents';
  readonly gameTitle = 'Convection Currents: Heat in Motion';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Main simulation
  private particles: Particle[] = [];
  private heatSource: 'bottom' | 'left' | 'right' | 'off' = 'bottom';
  private isSimulating = false;
  private animationTime = 0;

  // Twist simulation - pot of water
  private potParticles: Particle[] = [];
  private burnerPower = 0;
  private isPotSimulating = false;

  // Review steps
  private reviewStep = 0;
  private twistReviewStep = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "In convection, why does warm fluid rise?",
      options: ["It weighs more", "It is less dense", "It moves faster", "It is more viscous"],
      correctIndex: 1,
      explanation: "Warm fluid expands and becomes less dense than the surrounding cooler fluid. Buoyancy forces push the less dense fluid upward."
    },
    {
      question: "What happens to fluid molecules when heated?",
      options: ["They slow down", "They move faster and spread apart", "They bond together", "They become heavier"],
      correctIndex: 1,
      explanation: "Heat increases the kinetic energy of molecules, causing them to move faster and spread apart, decreasing the fluid's density."
    },
    {
      question: "What drives a convection current?",
      options: ["Magnetic forces", "Temperature differences", "Electric current", "Sound waves"],
      correctIndex: 1,
      explanation: "Convection currents are driven by temperature differences that create density differences in the fluid."
    },
    {
      question: "In a pot of boiling water, where does the coolest water sink?",
      options: ["Near the heat source", "Along the sides", "In the center only", "It doesn't sink"],
      correctIndex: 1,
      explanation: "Water cools along the sides of the pot (away from heat) and sinks back down, completing the convection cycle."
    },
    {
      question: "What type of heat transfer is convection?",
      options: ["Transfer through electromagnetic waves", "Transfer through direct contact", "Transfer through fluid movement", "Transfer through a vacuum"],
      correctIndex: 2,
      explanation: "Convection is heat transfer through the bulk movement of fluids (liquids or gases), carrying thermal energy with them."
    },
    {
      question: "Why do convection currents form circular patterns?",
      options: ["The earth's rotation", "Continuous heating and cooling cycle", "Magnetic fields", "Pressure differences only"],
      correctIndex: 1,
      explanation: "Hot fluid rises, cools at the top, becomes denser, sinks, gets heated again - creating a continuous circular flow pattern."
    },
    {
      question: "In atmospheric convection, what causes sea breezes?",
      options: ["Moon's gravity", "Land heats faster than water", "Ocean currents", "Cloud formation"],
      correctIndex: 1,
      explanation: "During the day, land heats faster than water. Hot air over land rises, and cooler air from over the sea flows in to replace it."
    },
    {
      question: "What would happen to convection if gravity were eliminated?",
      options: ["It would speed up", "It would stop", "No change", "It would reverse"],
      correctIndex: 1,
      explanation: "Convection depends on buoyancy, which requires gravity. Without gravity, density differences wouldn't cause fluid movement."
    },
    {
      question: "Which is NOT an example of convection?",
      options: ["Boiling water", "Sea breeze", "Sunlight warming Earth", "Home radiator heating"],
      correctIndex: 2,
      explanation: "Sunlight warming Earth is radiation, not convection. It doesn't require a medium and travels through the vacuum of space."
    },
    {
      question: "In a convection oven, how is food cooked more evenly?",
      options: ["Higher temperatures", "Circulating hot air", "Microwave radiation", "Infrared heat only"],
      correctIndex: 1,
      explanation: "Convection ovens use fans to circulate hot air, ensuring even heat distribution around the food from all sides."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      title: "Ocean Currents",
      description: "The Gulf Stream and other ocean currents are massive convection cells! Warm water near the equator rises and flows toward the poles, while cold polar water sinks and flows back toward the equator along the ocean floor.",
      fact: "The Gulf Stream transports about 30 million cubic meters of water per second - more than all the world's rivers combined!"
    },
    {
      title: "Weather & Wind",
      description: "Most weather patterns are driven by atmospheric convection. The sun heats the Earth's surface unevenly, creating rising warm air and sinking cool air. This convection drives winds, thunderstorms, and global circulation patterns.",
      fact: "Sea breezes occur because land heats faster than water during the day, creating local convection cells along coastlines."
    },
    {
      title: "Home Heating",
      description: "Radiators and forced-air heating systems use convection! Warm air rises from heaters, circulates around the room, cools, and sinks back down to be reheated. This is why radiators are often placed under windows.",
      fact: "Placing furniture over a radiator blocks convection currents and can reduce heating efficiency by up to 40%!"
    },
    {
      title: "Earth's Mantle",
      description: "Deep inside Earth, convection currents in the molten mantle drive plate tectonics! Hot rock rises from the core, spreads along the surface, cools, and sinks back down - moving continents over millions of years.",
      fact: "Mantle convection cells move at about 2-10 cm per year - roughly the speed your fingernails grow!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate buoyancy force
  private calculateBuoyancy(temp: number): number {
    return (temp - 50) * BUOYANCY_COEFFICIENT;
  }

  // PROTECTED: Get temperature color (blue to red gradient)
  private getTempColor(temp: number): string {
    const t = (temp - 20) / 80;
    const r = Math.round(66 + t * 173);
    const g = Math.round(135 - t * 70);
    const b = Math.round(245 - t * 177);
    return `rgb(${r}, ${g}, ${b})`;
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

  // Initialize particles for main simulation
  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        id: i,
        x: 50 + Math.random() * 200,
        y: 50 + Math.random() * 200,
        vx: 0,
        vy: 0,
        temp: BASE_TEMPERATURE
      });
    }
  }

  // Initialize pot particles
  private initPotParticles(): void {
    this.potParticles = [];
    for (let i = 0; i < 50; i++) {
      this.potParticles.push({
        id: i,
        x: 60 + Math.random() * 180,
        y: 80 + Math.random() * 140,
        vx: 0,
        vy: 0,
        temp: BASE_TEMPERATURE
      });
    }
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      if (input.id === 'burner_power') {
        this.burnerPower = Math.max(0, Math.min(5, input.value));
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'explore') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (buttonId.startsWith('pred_')) {
          this.prediction = buttonId.replace('pred_', '');
        } else if (buttonId === 'continue' && this.prediction) {
          this.phase = 'play';
          this.initParticles();
        }
        break;

      case 'play':
        if (buttonId === 'heat_bottom') {
          this.heatSource = 'bottom';
        } else if (buttonId === 'heat_left') {
          this.heatSource = 'left';
        } else if (buttonId === 'heat_right') {
          this.heatSource = 'right';
        } else if (buttonId === 'heat_off') {
          this.heatSource = 'off';
        } else if (buttonId === 'toggle_sim') {
          this.isSimulating = !this.isSimulating;
        } else if (buttonId === 'reset') {
          this.initParticles();
        } else if (buttonId === 'continue') {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'next_step' && this.reviewStep < 2) {
          this.reviewStep++;
        } else if (buttonId === 'prev_step' && this.reviewStep > 0) {
          this.reviewStep--;
        } else if (buttonId === 'continue' && this.reviewStep === 2) {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (buttonId.startsWith('twist_')) {
          this.twistPrediction = buttonId.replace('twist_', '');
        } else if (buttonId === 'continue' && this.twistPrediction) {
          this.phase = 'twist_play';
          this.initPotParticles();
        }
        break;

      case 'twist_play':
        if (buttonId === 'toggle_pot_sim') {
          this.isPotSimulating = !this.isPotSimulating;
        } else if (buttonId === 'reset_pot') {
          this.initPotParticles();
        } else if (buttonId === 'continue') {
          this.phase = 'twist_review';
        }
        break;

      case 'twist_review':
        if (buttonId === 'next_step' && this.twistReviewStep < 2) {
          this.twistReviewStep++;
        } else if (buttonId === 'prev_step' && this.twistReviewStep > 0) {
          this.twistReviewStep--;
        } else if (buttonId === 'continue' && this.twistReviewStep === 2) {
          this.phase = 'transfer';
        }
        break;

      case 'transfer':
        if (buttonId.startsWith('app_')) {
          this.activeAppIndex = parseInt(buttonId.split('_')[1]);
        } else if (buttonId === 'mark_read') {
          this.completedApps.add(this.activeAppIndex);
          if (this.activeAppIndex < 3) {
            this.activeAppIndex++;
          }
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
    this.particles = [];
    this.potParticles = [];
    this.heatSource = 'bottom';
    this.isSimulating = false;
    this.burnerPower = 0;
    this.isPotSimulating = false;
    this.reviewStep = 0;
    this.twistReviewStep = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Main simulation
    if (this.phase === 'play' && this.isSimulating && this.heatSource !== 'off') {
      this.particles = this.particles.map(p => {
        let newTemp = p.temp;
        let newVx = p.vx;
        let newVy = p.vy;

        // Heat source effects
        if (this.heatSource === 'bottom' && p.y > 220) {
          newTemp = Math.min(100, p.temp + HEATING_RATE);
        } else if (this.heatSource === 'left' && p.x < 80) {
          newTemp = Math.min(100, p.temp + HEATING_RATE);
        } else if (this.heatSource === 'right' && p.x > 220) {
          newTemp = Math.min(100, p.temp + HEATING_RATE);
        }

        // Cooling at top
        if (p.y < 80) {
          newTemp = Math.max(20, p.temp - COOLING_RATE);
        }

        // Buoyancy - hot rises, cold sinks
        const buoyancy = this.calculateBuoyancy(newTemp);
        newVy -= buoyancy;

        // Convection flow pattern
        if (this.heatSource === 'bottom') {
          if (p.y < 100 && newTemp > 60) {
            newVx += p.x < 150 ? -0.1 : 0.1;
          }
          if (p.y > 200 && newTemp < 40) {
            newVx += p.x < 150 ? 0.1 : -0.1;
          }
        }

        // Drag
        newVx *= DRAG_COEFFICIENT;
        newVy *= DRAG_COEFFICIENT;

        // Update position
        let newX = p.x + newVx;
        let newY = p.y + newVy;

        // Boundary collisions
        if (newX < 50) { newX = 50; newVx *= -0.5; }
        if (newX > 250) { newX = 250; newVx *= -0.5; }
        if (newY < 50) { newY = 50; newVy *= -0.5; }
        if (newY > 250) { newY = 250; newVy *= -0.5; }

        return { ...p, x: newX, y: newY, vx: newVx, vy: newVy, temp: newTemp };
      });
    }

    // Pot simulation
    if (this.phase === 'twist_play' && this.isPotSimulating && this.burnerPower > 0) {
      this.potParticles = this.potParticles.map(p => {
        let newTemp = p.temp;
        let newVx = p.vx;
        let newVy = p.vy;

        // Heat from bottom (burner)
        if (p.y > 190) {
          newTemp = Math.min(100, p.temp + this.burnerPower * 0.3);
        }

        // Cool at sides
        if (p.x < 80 || p.x > 220) {
          newTemp = Math.max(20, p.temp - 0.5);
        }

        // Cool at surface
        if (p.y < 100) {
          newTemp = Math.max(20, p.temp - 0.3);
        }

        // Buoyancy
        const buoyancy = (newTemp - 50) * 0.025;
        newVy -= buoyancy;

        // Convection pattern - two cells
        const centerX = 150;
        if (p.y < 120 && newTemp > 60) {
          newVx += p.x < centerX ? -0.15 : 0.15;
        }
        if (p.y > 180 && newTemp < 50) {
          newVx += p.x < centerX ? 0.15 : -0.15;
        }

        // Drag
        newVx *= 0.94;
        newVy *= 0.94;

        // Update position
        let newX = p.x + newVx;
        let newY = p.y + newVy;

        // Pot boundaries
        if (newX < 60) { newX = 60; newVx *= -0.5; }
        if (newX > 240) { newX = 240; newVx *= -0.5; }
        if (newY < 80) { newY = 80; newVy *= -0.5; }
        if (newY > 220) { newY = 220; newVy *= -0.5; }

        return { ...p, x: newX, y: newY, vx: newVx, vy: newVy, temp: newTemp };
      });
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    r.clear('#0a0f1a');

    // Background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(239, 68, 68, 0.05)' });

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
    r.roundRect(120, 50, 160, 30, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 120, 'Convection Currents', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'Discover how temperature differences', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 175, 'create flowing currents in fluids', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 260, '...', { fill: '#f97316', fontSize: 64, textAnchor: 'middle' });

    r.roundRect(40, 320, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 355, 'Have you watched smoke rise', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 380, 'from a campfire? Why does it go UP?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 420, 'Uncover the force that drives weather patterns!', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'explore', label: 'Explore Convection', variant: 'primary' });

    r.setCoachMessage('Learn how heat creates motion in fluids!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'When you heat water at the bottom of a', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 115, 'container, what happens to the warm water?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    const options = [
      { id: 'rises', text: 'Hot fluid rises because it expands and becomes lighter' },
      { id: 'sinks', text: 'Hot fluid sinks because heat makes things fall' },
      { id: 'stays', text: "Hot fluid stays in place - heat doesn't affect movement" },
      { id: 'random', text: 'Hot fluid moves randomly in all directions' }
    ];

    options.forEach((opt, i) => {
      const y = 150 + i * 60;
      const isSelected = this.prediction === opt.id;
      const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(25, y, 350, 52, 10, { fill: bgColor });
      if (isSelected) {
        r.roundRect(25, y, 350, 52, 10, { fill: 'none', stroke: '#f97316', strokeWidth: 2 });
      }
      const displayText = opt.text.length > 52 ? opt.text.substring(0, 49) + '...' : opt.text;
      r.text(40, y + 30, displayText, { fill: '#e2e8f0', fontSize: 11 });

      r.addButton({ id: `pred_${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'continue', label: 'Test My Prediction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Convection Simulator', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Container visualization
    r.roundRect(40, 75, 220, 220, 8, { fill: 'rgba(14, 165, 233, 0.1)', stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 2 });

    // Heat source indicator
    if (this.heatSource === 'bottom') {
      r.roundRect(50, 285, 200, 10, 5, { fill: '#ef4444' });
      r.text(150, 310, 'Heat Source', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });
    } else if (this.heatSource === 'left') {
      r.roundRect(28, 85, 10, 200, 5, { fill: '#ef4444' });
    } else if (this.heatSource === 'right') {
      r.roundRect(262, 85, 10, 200, 5, { fill: '#ef4444' });
    }

    // Particles
    this.particles.forEach(p => {
      // Scale positions to fit container
      const screenX = 50 + ((p.x - 50) / 200) * 200;
      const screenY = 85 + ((p.y - 50) / 200) * 200;
      const color = this.getTempColor(p.temp);
      r.circle(screenX, screenY, 5, { fill: color, opacity: 0.8 });
    });

    // Flow arrows when simulating
    if (this.isSimulating && this.heatSource === 'bottom') {
      // Up arrow in center
      r.line(150, 250, 150, 140, { stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 2 });
      r.polygon([[145, 145], [150, 130], [155, 145]], { fill: 'rgba(255, 255, 255, 0.3)' });

      // Side arrows
      r.line(80, 110, 80, 250, { stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 });
      r.line(220, 110, 220, 250, { stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 });
    }

    // Temperature legend
    r.roundRect(270, 80, 20, 100, 4, { fill: 'linear-gradient(to top, #4287f5, #ef4444)' });
    r.rect(270, 80, 20, 100, { fill: 'none', stroke: '#ffffff', strokeWidth: 1 });
    r.text(280, 75, 'Hot', { fill: '#ef4444', fontSize: 9, textAnchor: 'middle' });
    r.text(280, 195, 'Cold', { fill: '#4287f5', fontSize: 9, textAnchor: 'middle' });

    // Controls
    r.roundRect(280, 220, 105, 100, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(332, 240, 'Heat Source', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'heat_bottom', label: 'Bottom', variant: this.heatSource === 'bottom' ? 'primary' : 'secondary' });
    r.addButton({ id: 'heat_left', label: 'Left', variant: this.heatSource === 'left' ? 'primary' : 'secondary' });
    r.addButton({ id: 'heat_right', label: 'Right', variant: this.heatSource === 'right' ? 'primary' : 'secondary' });
    r.addButton({ id: 'heat_off', label: 'Off', variant: this.heatSource === 'off' ? 'primary' : 'secondary' });

    r.addButton({ id: 'toggle_sim', label: this.isSimulating ? 'Pause' : 'Start Simulation', variant: this.isSimulating ? 'secondary' : 'primary' });
    r.addButton({ id: 'reset', label: 'Reset Particles', variant: 'secondary' });

    // Insight box
    r.roundRect(30, 400, 340, 60, 12, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 425, 'Watch hot particles (red) rise and', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 445, 'cool particles (blue) sink!', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Results', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Understanding Convection', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const reviewContent = [
      { title: 'Why Hot Fluid Rises', content: 'When fluid is heated, molecules gain energy, move faster, and spread apart. This makes the fluid expand and become LESS dense than cooler fluid. Buoyancy pushes it up!', formula: 'Density decreases: rho_hot < rho_cold' },
      { title: 'The Convection Cycle', content: 'Hot fluid rises, cools at the top, becomes denser, and sinks back down. Near the heat source, it warms up again. This creates a continuous circular current!', formula: 'Heat -> Rise -> Cool -> Sink -> Repeat' },
      { title: 'Your Prediction', content: this.prediction === 'rises' ? 'Correct! Hot fluid rises because it expands and becomes less dense.' : 'Hot fluid rises because it expands and becomes less dense - buoyancy drives convection!', formula: 'Buoyancy Force proportional to (rho_cold - rho_hot) x g x V' }
    ];

    const content = reviewContent[this.reviewStep];

    r.roundRect(30, 90, 340, 230, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 120, content.title, { fill: '#f97316', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });

    // Word wrap content
    const words = content.content.split(' ');
    let line = '';
    let lineY = 160;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 20;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Formula box
    r.roundRect(50, 260, 300, 40, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 285, content.formula, { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });

    // Step indicators
    for (let i = 0; i < 3; i++) {
      const color = i === this.reviewStep ? '#f97316' : '#334155';
      r.roundRect(155 + i * 30, 320, 20, 6, 3, { fill: color });
    }

    // Navigation
    if (this.reviewStep > 0) {
      r.addButton({ id: 'prev_step', label: 'Previous', variant: 'secondary' });
    }
    if (this.reviewStep < 2) {
      r.addButton({ id: 'next_step', label: 'Continue', variant: 'primary' });
    } else {
      r.addButton({ id: 'continue', label: 'Try a Twist', variant: 'primary' });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Twist: Boiling Water', { fill: '#8b5cf6', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 90, 'When you heat a pot of water on a stove,', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 110, 'what happens to the water?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    const options = [
      { id: 'even', text: 'The water heats evenly throughout the pot' },
      { id: 'bottom', text: 'Only the water at the bottom gets hot' },
      { id: 'cells', text: 'Convection cells form, distributing heat throughout' },
      { id: 'top', text: 'The top heats first because heat rises' }
    ];

    options.forEach((opt, i) => {
      const y = 145 + i * 60;
      const isSelected = this.twistPrediction === opt.id;
      const bgColor = isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(25, y, 350, 52, 10, { fill: bgColor });
      if (isSelected) {
        r.roundRect(25, y, 350, 52, 10, { fill: 'none', stroke: '#8b5cf6', strokeWidth: 2 });
      }
      r.text(40, y + 30, opt.text, { fill: '#e2e8f0', fontSize: 12 });

      r.addButton({ id: `twist_${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'continue', label: 'Test My Prediction', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Pot of Water Simulation', { fill: '#8b5cf6', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Pot shape
    r.polygon([[50, 70], [50, 230], [70, 250], [230, 250], [250, 230], [250, 70]], { fill: 'none', stroke: '#666666', strokeWidth: 5 });

    // Pot handles
    r.ellipse(30, 150, 15, 30, { fill: 'none', stroke: '#666666', strokeWidth: 4 });
    r.ellipse(270, 150, 15, 30, { fill: 'none', stroke: '#666666', strokeWidth: 4 });

    // Water particles
    this.potParticles.forEach(p => {
      const color = this.getTempColor(p.temp);
      r.circle(p.x, p.y, 6, { fill: color, opacity: 0.8 });
    });

    // Burner glow
    if (this.burnerPower > 0) {
      const glowSize = 60 + this.burnerPower * 10;
      r.ellipse(150, 270, glowSize, 15, { fill: `rgba(239, 68, 68, ${0.3 + this.burnerPower * 0.15})` });
    }

    // Burner rings
    r.circle(150, 270, 40, { fill: 'none', stroke: '#444444', strokeWidth: 3 });
    r.circle(150, 270, 30, { fill: 'none', stroke: '#444444', strokeWidth: 2 });
    r.circle(150, 270, 20, { fill: 'none', stroke: '#444444', strokeWidth: 2 });

    // Controls
    r.roundRect(280, 80, 105, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(332, 105, `Burner: ${this.burnerPower}`, { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });

    r.addSlider({ id: 'burner_power', label: 'Power', min: 0, max: 5, step: 1, value: this.burnerPower });

    // Average temperature display
    const avgTemp = this.potParticles.reduce((sum, p) => sum + p.temp, 0) / (this.potParticles.length || 1);
    r.text(332, 175, 'Avg Temp', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(332, 200, `${Math.round(avgTemp)}C`, { fill: '#f97316', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'toggle_pot_sim', label: this.isPotSimulating ? 'Pause' : 'Start Heating', variant: this.isPotSimulating ? 'secondary' : 'primary' });
    r.addButton({ id: 'reset_pot', label: 'Reset Water', variant: 'secondary' });

    // Insight box
    r.roundRect(30, 340, 340, 60, 12, { fill: 'rgba(139, 92, 246, 0.1)' });
    r.text(200, 365, 'Watch water rise in center, cool at sides,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 385, 'and sink back down - two convection cells!', { fill: '#8b5cf6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Results', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Pot Convection Analysis', { fill: '#8b5cf6', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    const reviewContent = [
      { title: 'Convection Cells Form', content: 'When you heat water from below, convection cells form! Hot water rises in the center, spreads at the surface, cools along the edges, then sinks back down.', correct: this.twistPrediction === 'cells' },
      { title: 'Why This Matters', content: 'This is why you can heat an entire pot with just a burner at the bottom! Convection naturally circulates heat throughout the fluid, making it efficient for cooking.', correct: true },
      { title: 'Two-Cell Pattern', content: 'In a typical pot, two convection cells form - one on each side. Water rises where hottest (center), flows outward at top, cools along sides, and descends.', correct: true }
    ];

    const content = reviewContent[this.twistReviewStep];

    r.roundRect(30, 90, 340, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 120, content.title, { fill: '#8b5cf6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Word wrap content
    const words = content.content.split(' ');
    let line = '';
    let lineY = 160;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 20;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Feedback
    if (this.twistReviewStep === 0) {
      const feedbackColor = content.correct ? '#10b981' : '#f59e0b';
      const feedbackText = content.correct ? 'You predicted correctly!' : 'Convection cells distribute heat throughout!';
      r.roundRect(50, 260, 300, 35, 8, { fill: content.correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)' });
      r.text(200, 282, feedbackText, { fill: feedbackColor, fontSize: 12, textAnchor: 'middle' });
    }

    // Step indicators
    for (let i = 0; i < 3; i++) {
      const color = i === this.twistReviewStep ? '#8b5cf6' : '#334155';
      r.roundRect(155 + i * 30, 320, 20, 6, 3, { fill: color });
    }

    // Navigation
    if (this.twistReviewStep > 0) {
      r.addButton({ id: 'prev_step', label: 'Previous', variant: 'secondary' });
    }
    if (this.twistReviewStep < 2) {
      r.addButton({ id: 'next_step', label: 'Continue', variant: 'primary' });
    } else {
      r.addButton({ id: 'continue', label: 'Real-World Examples', variant: 'primary' });
    }
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Convection in the Real World', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress dots
    this.transferApps.forEach((_, i) => {
      const x = 140 + i * 40;
      const color = this.completedApps.has(i) ? '#10b981' : (i === this.activeAppIndex ? '#f97316' : '#334155');
      r.circle(x, 85, 6, { fill: color });
    });

    // Tab buttons
    this.transferApps.forEach((app, i) => {
      const x = 45 + i * 90;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = 'rgba(249, 115, 22, 0.3)';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.15)';

      r.roundRect(x, 100, 80, 35, 8, { fill: bgColor });
      const label = app.title.split(' ')[0];
      r.text(x + 40, 122, label, { fill: isActive || isCompleted ? '#f97316' : '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(30, 150, 340, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 185, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description
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

    // Fact box
    r.roundRect(45, 330, 310, 70, 10, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 355, 'Fun Fact:', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    const factText = app.fact.length > 55 ? app.fact.substring(0, 52) + '...' : app.fact;
    r.text(200, 380, factText, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark as read button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_read', label: 'Mark as Read', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Check', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      const qText = question.question.length > 55 ? question.question.substring(0, 52) + '...' : question.question;
      r.text(200, 125, qText, { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 155 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const optionText = option.length > 45 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${optionText}`, { fill: isSelected ? '#f97316' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 425, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();
      const percentage = Math.round((score / 10) * 100);

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '' : '', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, `${percentage}%`, { fill: '#f97316', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Hot fluids expand and rise',
        'Cool fluids contract and sink',
        'Convection cells form circular patterns',
        'Drives weather, oceans, and geology'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 22, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Journey', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Convection Master!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });

    const score = this.calculateScore();
    r.text(200, 240, `${Math.round((score / 10) * 100)}%`, { fill: '#f97316', fontSize: 36, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 270, `${score}/10 correct answers`, { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Key takeaways
    r.roundRect(40, 300, 320, 150, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 330, 'Key Takeaways', { fill: '#f97316', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const takeaways = [
      'Hot fluids expand, become less dense, rise',
      'Cool fluids contract, become denser, sink',
      'Convection cells create circular flow',
      'Convection drives weather, ocean currents, more'
    ];
    takeaways.forEach((item, i) => {
      r.text(200, 360 + i * 22, item, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });

    r.setCoachMessage('You now understand how temperature differences drive fluid motion!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      particles: this.particles,
      potParticles: this.potParticles,
      heatSource: this.heatSource,
      isSimulating: this.isSimulating,
      burnerPower: this.burnerPower,
      isPotSimulating: this.isPotSimulating,
      reviewStep: this.reviewStep,
      twistReviewStep: this.twistReviewStep,
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
    if (state.particles) this.particles = state.particles as Particle[];
    if (state.potParticles) this.potParticles = state.potParticles as Particle[];
    if (state.heatSource !== undefined) this.heatSource = state.heatSource as 'bottom' | 'left' | 'right' | 'off';
    if (state.isSimulating !== undefined) this.isSimulating = state.isSimulating as boolean;
    if (state.burnerPower !== undefined) this.burnerPower = state.burnerPower as number;
    if (state.isPotSimulating !== undefined) this.isPotSimulating = state.isPotSimulating as boolean;
    if (state.reviewStep !== undefined) this.reviewStep = state.reviewStep as number;
    if (state.twistReviewStep !== undefined) this.twistReviewStep = state.twistReviewStep as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createConvectionCurrentsGame(sessionId: string): ConvectionCurrentsGame {
  return new ConvectionCurrentsGame(sessionId);
}
