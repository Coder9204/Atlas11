import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// ECHO TIME OF FLIGHT GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Distance = (Speed × Time) / 2
// Sound travels to object and back - we measure round-trip time
// Speed varies by medium: Air ≈ 343 m/s, Water ≈ 1480 m/s
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
const SPEED_OF_SOUND_AIR = 343; // m/s at 20°C
const SPEED_OF_SOUND_WATER = 1480; // m/s
const SPEED_OF_SOUND_STEEL = 5960; // m/s
const SPEED_OF_SOUND_TISSUE = 1540; // m/s (body tissue for ultrasound)

export class EchoTimeOfFlightGame extends BaseGame {
  readonly gameType = 'echo_time_of_flight';
  readonly gameTitle = 'Echo Time of Flight: Measuring with Sound';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private wallDistance = 170; // meters
  private medium: 'air' | 'water' = 'air';
  private animationTime = 0;
  private soundProgress = 0; // 0-1 for animation
  private echoReceived = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You shout at a cliff 170 meters away and count the time until you hear the echo. The speed of sound in air is approximately 340 m/s.",
      question: "How long will it take to hear the echo?",
      options: [
        "0.5 seconds",
        "1 second",
        "2 seconds",
        "0.25 seconds"
      ],
      correctIndex: 1,
      explanation: "Sound travels to cliff (170m) and back (170m) = 340m total. At 340 m/s: time = 340/340 = 1 second."
    },
    {
      scenario: "A bat sends an ultrasonic pulse and detects the echo after 0.02 seconds. Sound travels at 340 m/s in air.",
      question: "How far away is the insect the bat is hunting?",
      options: [
        "6.8 meters",
        "3.4 meters",
        "0.68 meters",
        "13.6 meters"
      ],
      correctIndex: 1,
      explanation: "Total distance = 340 × 0.02 = 6.8m (round trip). One-way distance = 6.8/2 = 3.4 meters."
    },
    {
      scenario: "Sound travels about 4 times faster in water (1500 m/s) than in air (340 m/s).",
      question: "Why does sound travel faster in water?",
      options: [
        "Water is less dense than air",
        "Water molecules are closer together",
        "Water has more oxygen",
        "Sound doesn't actually travel faster in water"
      ],
      correctIndex: 1,
      explanation: "In water, molecules are much closer together. Sound transmits through molecular collisions, so denser media transmit sound faster."
    },
    {
      scenario: "A ship's sonar system detects a submarine. The echo returns after 4 seconds in water where sound travels at 1500 m/s.",
      question: "How deep is the submarine?",
      options: [
        "6000 meters",
        "3000 meters",
        "1500 meters",
        "750 meters"
      ],
      correctIndex: 1,
      explanation: "Total distance = 1500 × 4 = 6000m. Divide by 2 for one-way: 6000/2 = 3000 meters deep."
    },
    {
      scenario: "You want to measure the distance to the Moon using echo-location principles.",
      question: "Why can't we use sound waves for this measurement?",
      options: [
        "The Moon is too far away",
        "There's no medium in space for sound to travel",
        "Sound would take too long to return",
        "The Moon absorbs all sound"
      ],
      correctIndex: 1,
      explanation: "Sound needs a medium (air, water) to travel. Space is a vacuum - no molecules to transmit vibrations. We use radio waves instead!"
    },
    {
      scenario: "Dolphins use echolocation while hunting fish underwater. Sound travels at about 1500 m/s in water.",
      question: "Why is underwater echolocation particularly effective for dolphins?",
      options: [
        "Dolphins have superior hearing",
        "Sound travels 4x faster in water, giving rapid responses",
        "Water amplifies sound waves",
        "Fish cannot hear ultrasonic frequencies"
      ],
      correctIndex: 1,
      explanation: "The 4x faster speed means dolphins get near-instant echo responses, allowing precise real-time navigation and hunting."
    },
    {
      scenario: "A medical ultrasound measures fetal depth. Sound in body tissue travels at 1540 m/s, and the echo returns in 0.0001 seconds.",
      question: "How deep in the tissue is the feature being imaged?",
      options: [
        "154 cm",
        "15.4 cm",
        "7.7 cm",
        "0.77 cm"
      ],
      correctIndex: 2,
      explanation: "Distance = (1540 × 0.0001) / 2 = 0.077m = 7.7 cm. Medical ultrasound uses very short time intervals."
    },
    {
      scenario: "Bats use ultrasonic (very high frequency) sounds for echolocation rather than lower frequency sounds.",
      question: "Why do bats prefer high-frequency sounds?",
      options: [
        "Lower frequencies hurt their ears",
        "Higher frequencies give better detail and resolution",
        "Insects can only hear low frequencies",
        "High frequencies travel farther"
      ],
      correctIndex: 1,
      explanation: "Higher frequencies have shorter wavelengths, allowing detection of smaller objects and providing more detailed 'images' of the environment."
    },
    {
      scenario: "Thunder often seems to 'roll' and last for several seconds after a lightning strike.",
      question: "Why does thunder have this rolling, extended sound?",
      options: [
        "Lightning bolts are very long, so sound from different parts arrives at different times",
        "Thunder echoes off clouds and terrain",
        "Multiple lightning strokes can occur",
        "All of the above"
      ],
      correctIndex: 3,
      explanation: "Thunder rolls because: 1) Lightning is long (different arrival times), 2) Sound echoes off terrain/clouds, 3) Multiple strokes can occur!"
    },
    {
      scenario: "You're designing an ultrasonic parking sensor for a car. The sensor needs to detect objects 0.5m to 3m away.",
      question: "What timing range should the sensor measure? (Speed of sound ≈ 340 m/s)",
      options: [
        "0.003s to 0.018s",
        "0.0015s to 0.009s",
        "0.006s to 0.036s",
        "0.001s to 0.006s"
      ],
      correctIndex: 0,
      explanation: "For 0.5m: time = (0.5×2)/340 = 0.003s. For 3m: time = (3×2)/340 = 0.018s. The sensor measures round-trip times."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🦇",
      title: "Bat Echolocation",
      tagline: "Nature's sonar system",
      description: "Bats emit ultrasonic pulses (20-200 kHz) and listen for echoes to navigate in complete darkness and hunt insects.",
      connection: "A bat can detect a moth 5m away in just 0.03 seconds! The echo time tells them exactly where dinner is."
    },
    {
      icon: "🚢",
      title: "Ship Sonar Systems",
      tagline: "Mapping the ocean depths",
      description: "SONAR (Sound Navigation And Ranging) measures ocean depth and detects submarines by analyzing echo timing.",
      connection: "The Titanic wreck was found using sonar. At 3800m depth, the echo takes about 5 seconds to return!"
    },
    {
      icon: "👶",
      title: "Medical Ultrasound",
      tagline: "Seeing inside the body safely",
      description: "Ultrasound machines send sound waves into tissue and use echo timing to create images of internal organs and fetuses.",
      connection: "Sound in tissue travels at ~1540 m/s. By measuring millions of echoes, we can build detailed 3D images."
    },
    {
      icon: "🚗",
      title: "Parking Sensors",
      tagline: "Ultrasonic obstacle detection",
      description: "Car parking sensors use ultrasonic pulses to detect nearby obstacles and warn drivers of collision risks.",
      connection: "Sensors measure echo times of 0.001-0.02 seconds to detect objects 0.2-3 meters away with centimeter precision."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate echo time using distance formula
  private calculateEchoTime(distanceMeters: number, speedOfSound: number = SPEED_OF_SOUND_AIR): number {
    // time = (2 × distance) / speed (round trip)
    return (2 * distanceMeters) / speedOfSound;
  }

  // PROTECTED: Calculate distance from echo time
  private calculateDistance(echoTimeSeconds: number, speedOfSound: number = SPEED_OF_SOUND_AIR): number {
    // distance = (speed × time) / 2 (one way)
    return (speedOfSound * echoTimeSeconds) / 2;
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
    } else if (input.type === 'slider_change') {
      if (input.id === 'wall_distance') {
        this.wallDistance = Math.max(50, Math.min(500, input.value));
        this.soundProgress = 0;
        this.echoReceived = false;
      }
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
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'send_sound') {
          this.soundProgress = 0;
          this.echoReceived = false;
        } else if (buttonId === 'continue') {
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
            this.twistPrediction = parseInt(buttonId.split('_')[1]);
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'switch_air') {
          this.medium = 'air';
          this.soundProgress = 0;
          this.echoReceived = false;
        } else if (buttonId === 'switch_water') {
          this.medium = 'water';
          this.soundProgress = 0;
          this.echoReceived = false;
        } else if (buttonId === 'send_sound') {
          this.soundProgress = 0;
          this.echoReceived = false;
        } else if (buttonId === 'continue') {
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
    this.wallDistance = 170;
    this.medium = 'air';
    this.soundProgress = 0;
    this.echoReceived = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate sound wave progression
    if ((this.phase === 'play' || this.phase === 'twist_play') && this.soundProgress < 1 && this.soundProgress > 0) {
      const speed = this.medium === 'water' ? SPEED_OF_SOUND_WATER : SPEED_OF_SOUND_AIR;
      const totalDistance = this.wallDistance * 2;
      const totalTime = totalDistance / speed;
      this.soundProgress += deltaTime / totalTime;
      if (this.soundProgress >= 1) {
        this.soundProgress = 1;
        this.echoReceived = true;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Echoes: Measuring with Sound', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How do bats navigate in darkness?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Bat icon
    r.text(200, 250, '🦇', { fill: '#22d3ee', fontSize: 64, textAnchor: 'middle' });

    // Sound waves
    for (let i = 1; i <= 3; i++) {
      const radius = 30 + i * 25;
      const opacity = 0.3 - i * 0.08;
      r.circle(200, 250, radius, { fill: `rgba(34, 211, 238, ${opacity})` });
    }

    // Fact card
    r.roundRect(40, 310, 320, 150, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 345, 'Bats emit ultrasonic pulses and', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 370, 'listen for echoes to "see" in the dark.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 410, 'Distance = (Speed × Time) / 2', { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 440, 'Sound travels there AND back!', { fill: '#fbbf24', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover Echolocation', variant: 'primary' });

    r.setCoachMessage('Learn how sound can measure distance through echoes!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You shout at a cliff 170m away.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'Sound travels at 340 m/s in air.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 190, 'How long until you hear the echo?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = ['0.5 seconds', '1 second', '2 seconds', '170 seconds'];

    options.forEach((option, i) => {
      const y = 225 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1) { // Correct answer
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 14 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 490, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly right!' : 'The answer is 1 second!';
      r.text(200, 525, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 555, '170m there + 170m back = 340m at 340 m/s', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 575, '= 1 second total', { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Simulation', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 60, 'Echo Timing Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 90, 360, 260, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Person
    r.circle(60, 220, 20, { fill: '#22d3ee' });
    r.text(60, 225, '🔊', { fontSize: 16, textAnchor: 'middle' });

    // Wall/cliff
    r.rect(330, 150, 30, 100, { fill: '#64748b' });
    r.text(345, 200, '🏔️', { fontSize: 24, textAnchor: 'middle' });

    // Sound wave animation
    if (this.soundProgress > 0) {
      const waveX = this.soundProgress <= 0.5
        ? 80 + (this.soundProgress * 2) * 230  // Going out
        : 80 + ((1 - this.soundProgress) * 2) * 230; // Coming back

      r.circle(waveX, 220, 15, { fill: this.soundProgress > 0.5 ? '#a78bfa' : '#22d3ee' });

      // Wave ripples
      for (let i = 1; i <= 2; i++) {
        const radius = 15 + i * 10;
        const opacity = 0.4 - i * 0.15;
        r.circle(waveX, 220, radius, { fill: `rgba(34, 211, 238, ${opacity})` });
      }
    }

    // Distance label
    r.text(200, 140, `Distance: ${this.wallDistance}m`, { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Echo time calculation
    const echoTime = this.calculateEchoTime(this.wallDistance);
    r.text(200, 280, `Echo Time: ${echoTime.toFixed(2)}s`, { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 305, `(${this.wallDistance}m × 2 ÷ 343 m/s)`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Status
    if (this.echoReceived) {
      r.roundRect(120, 320, 160, 30, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 340, '✓ Echo received!', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Slider
    r.addSlider({
      id: 'wall_distance',
      label: 'Wall Distance (m)',
      min: 50,
      max: 500,
      step: 10,
      value: this.wallDistance
    });

    r.addButton({ id: 'send_sound', label: '🔊 Send Sound Pulse', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Understand the Math', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 60, 'The Echo Distance Formula', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula card
    r.roundRect(30, 90, 340, 140, 16, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 120, 'The Key Equation', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 140, 260, 45, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 170, 'Distance = (Speed × Time) ÷ 2', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.text(200, 210, 'We divide by 2 because sound travels THERE and BACK', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Speed of sound facts
    r.roundRect(30, 245, 340, 120, 16, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 275, 'Speed of Sound Varies!', { fill: '#fbbf24', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(100, 310, 'Air:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(100, 330, '343 m/s', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 310, 'Water:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 330, '1480 m/s', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(300, 310, 'Steel:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(300, 330, '5960 m/s', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Why divide by 2
    r.roundRect(30, 380, 340, 100, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 410, 'Why divide by 2?', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 440, 'The sound pulse travels TO the object', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 460, 'then bounces BACK to you. Double trip!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Different Media', variant: 'secondary' });

    r.setCoachMessage("Now let's see how the medium affects sound speed...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Underwater Sound', { fill: '#a78bfa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'You send sound pulses 100m to a wall.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'Once in AIR, once in WATER.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 185, 'How will the echo times compare?', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Same time - distance is what matters',
      'Water echo is FASTER (sound travels faster)',
      'Water echo is SLOWER',
      'Sound cannot travel in water'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 1) { // Correct
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 455, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Correct!' : 'Water echoes are FASTER!';
      r.text(200, 485, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 515, 'Sound travels ~4× faster in water', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 535, '(1480 m/s vs 343 m/s)', { fill: '#a78bfa', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Compare in Simulation', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Air vs Water Comparison', { fill: '#a78bfa', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const distance = 100;
    const airTime = this.calculateEchoTime(distance, SPEED_OF_SOUND_AIR);
    const waterTime = this.calculateEchoTime(distance, SPEED_OF_SOUND_WATER);

    // Air side
    r.roundRect(25, 85, 165, 200, 12, { fill: 'rgba(34, 211, 238, 0.1)' });
    r.text(107, 110, 'AIR', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(107, 135, '343 m/s', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Air visualization
    r.circle(60, 200, 15, { fill: '#22d3ee' });
    r.rect(160, 160, 10, 80, { fill: '#64748b' });

    r.text(107, 260, `Echo: ${airTime.toFixed(3)}s`, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Water side
    r.roundRect(210, 85, 165, 200, 12, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(292, 110, 'WATER', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(292, 135, '1480 m/s', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Water visualization
    r.circle(245, 200, 15, { fill: '#3b82f6' });
    r.rect(345, 160, 10, 80, { fill: '#64748b' });

    r.text(292, 260, `Echo: ${waterTime.toFixed(3)}s`, { fill: '#3b82f6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Speed ratio
    r.roundRect(80, 300, 240, 60, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 325, `Water is ${(SPEED_OF_SOUND_WATER / SPEED_OF_SOUND_AIR).toFixed(1)}× faster!`, { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 345, `Air: ${airTime.toFixed(3)}s vs Water: ${waterTime.toFixed(3)}s`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Medium selector
    r.addButton({ id: 'switch_air', label: '🌬️ Air', variant: this.medium === 'air' ? 'primary' : 'secondary' });
    r.addButton({ id: 'switch_water', label: '🌊 Water', variant: this.medium === 'water' ? 'primary' : 'secondary' });
    r.addButton({ id: 'continue', label: 'Learn Why', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Why Speed Varies by Medium', { fill: '#a78bfa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Molecular explanation
    r.roundRect(25, 85, 350, 120, 12, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 115, 'Sound = Molecular Collisions', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Sound travels by molecules bumping into', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 165, 'each other, passing energy along.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 190, 'Closer molecules = faster transmission!', { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison cards
    r.roundRect(25, 220, 165, 90, 10, { fill: 'rgba(34, 211, 238, 0.1)' });
    r.text(107, 245, 'Air (Gas)', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(107, 270, 'Molecules far apart', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 290, '→ Slower: 343 m/s', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(210, 220, 165, 90, 10, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(292, 245, 'Water (Liquid)', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(292, 270, 'Molecules close together', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(292, 290, '→ Faster: 1480 m/s', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Space fact
    r.roundRect(30, 325, 340, 80, 12, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 350, '❌ No Sound in Space!', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, 'Space is a vacuum - no molecules at all.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 395, 'Sound cannot travel without a medium!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Echolocation in Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 230;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 48) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.scenario.substring(0, 50), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 148, question.scenario.substring(50, 100), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 200, question.question, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 25, `${String.fromCharCode(65 + i)}. ${option}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 480, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🎉' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered echolocation!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Echo Time of Flight Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how sound measures distance!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📐', label: 'd = (v×t)/2' },
      { icon: '🦇', label: 'Echolocation' },
      { icon: '🌊', label: 'Medium Speed' },
      { icon: '🚢', label: 'SONAR' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 135, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 67, y + 22, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 67, y + 44, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 468, 'Key Formula', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'Distance = (Speed × Time) ÷ 2', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering echo time of flight!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      wallDistance: this.wallDistance,
      medium: this.medium,
      animationTime: this.animationTime,
      soundProgress: this.soundProgress,
      echoReceived: this.echoReceived,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as number | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as number | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.wallDistance !== undefined) this.wallDistance = state.wallDistance as number;
    if (state.medium !== undefined) this.medium = state.medium as 'air' | 'water';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.soundProgress !== undefined) this.soundProgress = state.soundProgress as number;
    if (state.echoReceived !== undefined) this.echoReceived = state.echoReceived as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createEchoTimeOfFlightGame(sessionId: string): EchoTimeOfFlightGame {
  return new EchoTimeOfFlightGame(sessionId);
}
