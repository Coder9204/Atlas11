import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// FLUORESCENCE GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: UV absorption and re-emission at longer visible wavelengths
// Stokes shift: emitted photon has lower energy than absorbed photon
// UV excites electron to higher state, some energy lost as heat,
// then photon emitted at longer wavelength (lower energy = visible)
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

interface MaterialProps {
  fluorescent: boolean;
  emitColor: string;
  emitGlow: string;
  name: string;
  wavelengthNm: number;
}

// Physics constants (PROTECTED - never sent to client)
const UV_WAVELENGTH_NM = 365; // typical blacklight
const UV_ENERGY_EV = 3.4; // photon energy at 365nm
const PLANCK_CONSTANT = 4.136e-15; // eV*s
const SPEED_OF_LIGHT = 3e8; // m/s

export class FluorescenceGame extends BaseGame {
  readonly gameType = 'fluorescence';
  readonly gameTitle = 'Fluorescence: The Glowing Mystery';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private animationTime = 0;

  // Simulation parameters
  private uvOn = false;
  private regularLightOn = true;
  private selectedMaterial: 'highlighter' | 'paper' | 'tonic' | 'mineral' = 'highlighter';
  private twistMaterial: 'highlighter_yellow' | 'highlighter_pink' | 'highlighter_green' | 'laundry_detergent' = 'highlighter_yellow';

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Material fluorescence properties (PROTECTED)
  private readonly materialProps: Record<string, MaterialProps> = {
    highlighter: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter', wavelengthNm: 520 },
    paper: { fluorescent: false, emitColor: '#f5f5dc', emitGlow: '#f5f5dc', name: 'Plain Paper', wavelengthNm: 0 },
    tonic: { fluorescent: true, emitColor: '#00ccff', emitGlow: '#00ffff', name: 'Tonic Water (Quinine)', wavelengthNm: 450 },
    mineral: { fluorescent: true, emitColor: '#ff4444', emitGlow: '#ff0000', name: 'Fluorite Mineral', wavelengthNm: 700 },
    highlighter_yellow: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter', wavelengthNm: 520 },
    highlighter_pink: { fluorescent: true, emitColor: '#ff66cc', emitGlow: '#ff00ff', name: 'Pink Highlighter', wavelengthNm: 580 },
    highlighter_green: { fluorescent: true, emitColor: '#00ffaa', emitGlow: '#00ff88', name: 'Green Highlighter', wavelengthNm: 510 },
    laundry_detergent: { fluorescent: true, emitColor: '#6666ff', emitGlow: '#0000ff', name: 'Laundry Detergent', wavelengthNm: 440 }
  };

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A highlighter appears yellow under regular light but glows bright green under a blacklight.",
      question: "Why does a highlighter glow under UV light but appear normal under regular light?",
      options: ["Highlighters have tiny LEDs inside", "UV light chemically changes the ink", "Fluorescent molecules absorb UV and re-emit visible light", "Regular light is too weak to activate the glow"],
      correctIndex: 2,
      explanation: "Fluorescent molecules absorb high-energy UV and emit lower-energy visible light."
    },
    {
      scenario: "UV light has wavelength ~365nm. The highlighter emits green light at ~520nm.",
      question: "Why is the emitted light a different color (longer wavelength) than the absorbed UV light?",
      options: ["Some energy is lost as heat during the process (Stokes shift)", "The molecules change color when hit by light", "UV light bounces off and changes color", "The eye perceives UV as a different color"],
      correctIndex: 0,
      explanation: "Stokes shift: some absorbed energy becomes heat, so emitted photon has less energy."
    },
    {
      scenario: "You shine a blacklight on plain white paper and a highlighter.",
      question: "Why doesn't regular white paper fluoresce much?",
      options: ["White paper is too bright already", "Paper lacks special fluorescent molecules", "Paper absorbs all UV light completely", "Paper is too thick for light to penetrate"],
      correctIndex: 1,
      explanation: "Fluorescence requires specific molecules that can absorb UV and re-emit visible."
    },
    {
      scenario: "A mineral glows red under UV light.",
      question: "What wavelength is the UV light that excites the mineral?",
      options: ["Longer than red (infrared)", "The same as red (~700nm)", "Shorter than red, shorter than all visible light (~365nm)", "It depends on the room temperature"],
      correctIndex: 2,
      explanation: "UV is always shorter wavelength (higher energy) than visible light."
    },
    {
      scenario: "Forensic investigators use UV lights at crime scenes.",
      question: "Why do body fluids fluoresce under UV light?",
      options: ["They contain bacteria that glow", "Natural proteins contain fluorescent amino acids", "UV light makes any liquid visible", "Criminals use fluorescent markers"],
      correctIndex: 1,
      explanation: "Proteins like tryptophan are naturally fluorescent under UV."
    },
    {
      scenario: "A blacklight party uses UV lights (~365nm).",
      question: "Why can't you see the UV light itself?",
      options: ["UV is absorbed by air before reaching your eyes", "Human eyes lack receptors for UV wavelengths", "UV is too dim to see", "UV only exists in special bulbs"],
      correctIndex: 1,
      explanation: "Human cone cells respond only to visible wavelengths (400-700nm)."
    },
    {
      scenario: "Laundry detergent makes white clothes 'glow' under blacklight.",
      question: "Why do detergent companies add fluorescent brighteners?",
      options: ["To make clothes smell cleaner", "To convert UV to visible light, making whites appear brighter", "To kill bacteria on fabric", "For decoration purposes only"],
      correctIndex: 1,
      explanation: "Optical brighteners convert UV to blue light, making whites appear brighter."
    },
    {
      scenario: "Compare a yellow highlighter and a green highlighter under UV.",
      question: "Why do different highlighters glow different colors under the same UV?",
      options: ["The UV changes color as it travels", "Each fluorescent molecule has unique energy levels", "They absorb different amounts of UV", "The ink reflects different wavelengths"],
      correctIndex: 1,
      explanation: "Different molecules have different electronic structures and Stokes shifts."
    },
    {
      scenario: "Fluorescent lights use UV to create white light.",
      question: "How do fluorescent tube lights work?",
      options: ["They heat a wire until it glows", "Mercury vapor emits UV, phosphor coating fluoresces white", "Electric current directly produces white light", "They use tiny LEDs inside the tube"],
      correctIndex: 1,
      explanation: "Mercury UV excites phosphor coating which emits broad-spectrum visible light."
    },
    {
      scenario: "Scientists use GFP (green fluorescent protein) to track cells.",
      question: "Why is GFP useful for biological research?",
      options: ["It kills unwanted cells", "It can be attached to proteins, making them visible under UV", "It provides nutrients to cells", "It blocks UV from damaging cells"],
      correctIndex: 1,
      explanation: "GFP acts as a fluorescent tag, revealing protein location in living cells."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "💵",
      title: "Currency Security",
      tagline: "Anti-counterfeiting measures",
      description: "Modern banknotes contain fluorescent inks that glow under UV light. Each denomination has specific patterns invisible under normal light.",
      connection: "Counterfeiters can't easily replicate the exact fluorescent compounds."
    },
    {
      icon: "🔍",
      title: "Forensics",
      tagline: "Crime scene investigation",
      description: "Body fluids like blood, saliva, and semen contain proteins that fluoresce under UV, helping investigators find trace evidence.",
      connection: "Natural amino acids (tryptophan, tyrosine) are inherently fluorescent."
    },
    {
      icon: "💡",
      title: "Fluorescent Lights",
      tagline: "Efficient illumination",
      description: "UV from mercury vapor hits a phosphor coating inside the tube, which fluoresces to produce white light using 75% less energy than incandescent.",
      connection: "Multiple phosphors create broad-spectrum white from narrow UV emission."
    },
    {
      icon: "🦂",
      title: "Scorpion Detection",
      tagline: "Nature's glow",
      description: "Scorpion exoskeletons contain fluorescent compounds (beta-carbolines) that glow bright cyan under UV, helping researchers find them at night.",
      connection: "Scientists still debate why scorpions evolved this fluorescence."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate Stokes shift (wavelength difference)
  private calculateStokesShift(absorbedNm: number, emittedNm: number): number {
    return emittedNm - absorbedNm;
  }

  // PROTECTED: Calculate energy from wavelength (E = hc/lambda)
  private calculatePhotonEnergy(wavelengthNm: number): number {
    const wavelengthM = wavelengthNm * 1e-9;
    return (PLANCK_CONSTANT * SPEED_OF_LIGHT) / wavelengthM;
  }

  // Get material properties
  private getMaterialProps(material: string): MaterialProps {
    return this.materialProps[material] || this.materialProps.highlighter;
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
        if (buttonId === 'investigate') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (buttonId.startsWith('pred_')) {
          this.prediction = buttonId.split('_')[1];
        } else if (buttonId === 'continue' && this.prediction) {
          this.phase = 'play';
        }
        break;

      case 'play':
        if (buttonId === 'toggle_uv') {
          this.uvOn = !this.uvOn;
        } else if (buttonId === 'toggle_room') {
          this.regularLightOn = !this.regularLightOn;
        } else if (buttonId.startsWith('material_')) {
          this.selectedMaterial = buttonId.split('_')[1] as typeof this.selectedMaterial;
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
        if (buttonId.startsWith('twist_')) {
          this.twistPrediction = buttonId.split('_')[1];
        } else if (buttonId === 'continue' && this.twistPrediction) {
          this.phase = 'twist_play';
        }
        break;

      case 'twist_play':
        if (buttonId.startsWith('twist_mat_')) {
          this.twistMaterial = buttonId.split('twist_mat_')[1] as typeof this.twistMaterial;
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
    this.uvOn = false;
    this.regularLightOn = true;
    this.selectedMaterial = 'highlighter';
    this.twistMaterial = 'highlighter_yellow';
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    r.clear('#0a0f1a');

    r.circle(100, 100, 150, { fill: 'rgba(139, 92, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(236, 72, 153, 0.05)' });

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
    r.roundRect(120, 60, 160, 30, 8, { fill: 'rgba(139, 92, 246, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 125, 'The Glowing Highlighter', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'Mystery', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 185, 'How does invisible light create visible glow?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Visual elements
    r.text(160, 260, '🖍️', { fontSize: 48, textAnchor: 'middle' });
    r.text(240, 260, '🔦', { fontSize: 48, textAnchor: 'middle' });

    r.roundRect(40, 300, 320, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 330, "You've seen highlighters glow bright", { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 350, 'under a blacklight at parties.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.text(200, 385, "But here's the mystery:", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 410, 'UV light is invisible, yet the highlighter', { fill: '#ec4899', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 430, 'glows visible green!', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'investigate', label: 'Investigate!', variant: 'primary' });

    r.setCoachMessage('Discover how fluorescence transforms light!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'You shine an invisible UV light on a', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'yellow highlighter. What will happen?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      { id: 'reflect', text: 'The UV bounces back as UV (still invisible)', icon: '↩️' },
      { id: 'absorb', text: 'The highlighter absorbs UV and re-emits VISIBLE light', icon: '✨' },
      { id: 'nothing', text: 'Nothing - UV passes right through', icon: '➡️' },
      { id: 'heat', text: "The highlighter heats up but doesn't glow", icon: '🔥' }
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
      const isSelected = this.prediction === option.id;
      const isCorrect = option.id === 'absorb';
      let bgColor = 'rgba(51, 65, 85, 0.5)';

      if (this.prediction && isCorrect) {
        bgColor = 'rgba(16, 185, 129, 0.3)';
      } else if (isSelected && !isCorrect) {
        bgColor = 'rgba(239, 68, 68, 0.3)';
      } else if (isSelected) {
        bgColor = 'rgba(139, 92, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${option.icon} ${option.text}`, { fill: isSelected ? '#a855f7' : '#e2e8f0', fontSize: 10 });

      if (!this.prediction) {
        r.addButton({ id: `pred_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.prediction) {
      r.roundRect(30, 430, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const correct = this.prediction === 'absorb';
      r.text(200, 458, correct ? 'Correct!' : 'Not quite.', { fill: correct ? '#10b981' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'Fluorescent molecules absorb UV and re-emit visible!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'UV Fluorescence Experiment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    const props = this.getMaterialProps(this.selectedMaterial);
    const isGlowing = this.uvOn && props.fluorescent;
    const ambientLight = this.regularLightOn ? 0.8 : (this.uvOn ? 0.2 : 0.05);

    // Dark room background
    const roomColor = this.regularLightOn ? '#1e293b' : '#0a0a15';
    r.roundRect(20, 80, 360, 220, 12, { fill: roomColor });

    // UV light source
    r.roundRect(295, 90, 50, 80, 5, { fill: '#1f2937' });
    r.roundRect(300, 160, 40, 30, 3, { fill: this.uvOn ? '#7c3aed' : '#374151' });
    r.text(320, 185, 'UV', { fill: '#ffffff', fontSize: 8, textAnchor: 'middle' });

    // UV beam cone if on
    if (this.uvOn) {
      r.line(300, 180, 180, 250, { stroke: '#8b5cf6', strokeWidth: 2, opacity: 0.4 + Math.sin(this.animationTime * 4) * 0.2 });
      r.line(320, 180, 200, 250, { stroke: '#8b5cf6', strokeWidth: 2, opacity: 0.4 + Math.sin(this.animationTime * 4 + 0.5) * 0.2 });
      r.line(340, 180, 220, 250, { stroke: '#8b5cf6', strokeWidth: 2, opacity: 0.4 + Math.sin(this.animationTime * 4 + 1) * 0.2 });
    }

    // Object/material
    const objX = 150;
    const objY = 180;

    // Glow effect
    if (isGlowing) {
      const glowSize = 50 + Math.sin(this.animationTime * 3) * 5;
      r.circle(objX + 40, objY + 40, glowSize, { fill: props.emitGlow, opacity: 0.3 });
    }

    // Object shapes based on material
    if (this.selectedMaterial.includes('highlighter')) {
      const color = isGlowing ? props.emitColor : '#fef08a';
      r.roundRect(objX, objY, 80, 80, 6, { fill: color, opacity: ambientLight });
      r.text(objX + 40, objY + 50, 'TEXT', { fill: '#1f2937', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    } else if (this.selectedMaterial === 'paper') {
      r.roundRect(objX, objY, 80, 80, 2, { fill: `rgba(245, 245, 220, ${ambientLight})` });
    } else if (this.selectedMaterial === 'tonic') {
      r.roundRect(objX + 15, objY - 10, 50, 100, 4, { fill: '#374151' });
      const tonicColor = isGlowing ? props.emitColor : `rgba(200, 230, 255, ${ambientLight})`;
      r.roundRect(objX + 20, objY + 10, 40, 70, 3, { fill: tonicColor });
    } else if (this.selectedMaterial === 'mineral') {
      const mineralColor = isGlowing ? props.emitColor : '#8b7355';
      r.polygon([
        { x: objX + 40, y: objY },
        { x: objX + 70, y: objY + 30 },
        { x: objX + 60, y: objY + 80 },
        { x: objX + 20, y: objY + 80 },
        { x: objX + 10, y: objY + 30 }
      ], { fill: mineralColor, opacity: ambientLight });
    }

    // Light status
    r.circle(35, 95, 8, { fill: this.regularLightOn ? '#fbbf24' : '#374151' });
    r.text(50, 99, 'Room Light', { fill: '#94a3b8', fontSize: 9 });
    r.circle(35, 115, 8, { fill: this.uvOn ? '#8b5cf6' : '#374151' });
    r.text(50, 119, 'UV Light', { fill: '#94a3b8', fontSize: 9 });

    // Material name
    r.text(200, 285, props.name, { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Controls
    r.roundRect(80, 310, 100, 35, 6, { fill: this.regularLightOn ? '#fbbf24' : 'rgba(51, 65, 85, 0.5)' });
    r.text(130, 332, 'Room: ' + (this.regularLightOn ? 'ON' : 'OFF'), { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
    r.addButton({ id: 'toggle_room', label: '', variant: 'secondary' });

    r.roundRect(220, 310, 100, 35, 6, { fill: this.uvOn ? '#8b5cf6' : 'rgba(51, 65, 85, 0.5)' });
    r.text(270, 332, 'UV: ' + (this.uvOn ? 'ON' : 'OFF'), { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
    r.addButton({ id: 'toggle_uv', label: '', variant: 'secondary' });

    // Material selection
    r.text(200, 365, 'Material:', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    const materials = ['highlighter', 'paper', 'tonic', 'mineral'];
    materials.forEach((mat, i) => {
      const x = 50 + i * 80;
      const isActive = this.selectedMaterial === mat;
      r.roundRect(x, 375, 70, 28, 5, { fill: isActive ? '#a855f7' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 35, 393, mat.charAt(0).toUpperCase() + mat.slice(1, 6), { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 9, textAnchor: 'middle' });
      r.addButton({ id: `material_${mat}`, label: '', variant: 'secondary' });
    });

    // Result explanation
    if (this.uvOn && props.fluorescent) {
      r.roundRect(30, 420, 340, 50, 10, { fill: 'rgba(139, 92, 246, 0.2)' });
      r.text(200, 440, 'Fluorescence! UV absorbed, visible light emitted', { fill: '#ec4899', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 458, 'Shorter wavelength in -> longer wavelength out', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    } else if (this.uvOn && !props.fluorescent) {
      r.roundRect(30, 420, 340, 50, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
      r.text(200, 448, 'No fluorescence - lacks special molecules', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Science', variant: 'secondary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "What's Really Happening", { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.7)' });

    // Step 1
    r.circle(60, 115, 16, { fill: '#8b5cf6' });
    r.text(60, 120, '1', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(85, 110, 'UV Absorption', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold' });
    r.text(85, 130, 'High-energy UV photon excites electron', { fill: '#94a3b8', fontSize: 9 });

    // Step 2
    r.circle(60, 165, 16, { fill: '#ec4899' });
    r.text(60, 170, '2', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(85, 160, 'Energy Loss', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold' });
    r.text(85, 180, 'Some energy lost as heat (vibrational)', { fill: '#94a3b8', fontSize: 9 });

    // Step 3
    r.circle(60, 215, 16, { fill: '#22c55e' });
    r.text(60, 220, '3', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(85, 210, 'Visible Emission', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold' });
    r.text(85, 230, 'Lower-energy photon emitted = visible!', { fill: '#94a3b8', fontSize: 9 });

    // Stokes shift explanation
    r.roundRect(30, 260, 340, 70, 10, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 285, 'Stokes Shift', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 305, 'Wavelength difference between absorbed UV (~365nm)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 320, 'and emitted visible light (~520nm green)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 360, `Your prediction: ${this.prediction === 'absorb' ? 'Correct!' : 'Not quite'}`, { fill: this.prediction === 'absorb' ? '#10b981' : '#fbbf24', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'But wait...', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist!', { fill: '#ec4899', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'Different highlighters (yellow, pink, green)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 140, 'all absorb the same UV light.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 165, 'What color will each glow?', { fill: '#ec4899', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      { id: 'same', text: 'They all glow the same color (UV is UV)', icon: '⚪' },
      { id: 'different', text: 'They each glow their own DIFFERENT color', icon: '🌈' },
      { id: 'white', text: 'They all glow white when fluorescent', icon: '⬜' },
      { id: 'yellow', text: 'Only yellow highlighters can fluoresce', icon: '🟡' }
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
      const isSelected = this.twistPrediction === option.id;
      const isCorrect = option.id === 'different';
      let bgColor = 'rgba(51, 65, 85, 0.5)';

      if (this.twistPrediction && isCorrect) {
        bgColor = 'rgba(16, 185, 129, 0.3)';
      } else if (isSelected && !isCorrect) {
        bgColor = 'rgba(239, 68, 68, 0.3)';
      } else if (isSelected) {
        bgColor = 'rgba(236, 72, 153, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${option.icon} ${option.text}`, { fill: isSelected ? '#ec4899' : '#e2e8f0', fontSize: 10 });

      if (!this.twistPrediction) {
        r.addButton({ id: `twist_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.twistPrediction) {
      r.roundRect(30, 430, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const correct = this.twistPrediction === 'different';
      r.text(200, 458, correct ? 'Correct!' : 'Not quite.', { fill: correct ? '#10b981' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'Each molecule has its own unique energy levels!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Compare Fluorescent Materials', { fill: '#ec4899', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(20, 80, 360, 180, 12, { fill: '#0a0a15' });

    // Show all four materials under UV
    const materials: Array<typeof this.twistMaterial> = ['highlighter_yellow', 'highlighter_pink', 'highlighter_green', 'laundry_detergent'];

    materials.forEach((mat, i) => {
      const x = 50 + i * 85;
      const props = this.getMaterialProps(mat);
      const isSelected = this.twistMaterial === mat;

      // Glow effect
      const glowSize = 30 + Math.sin(this.animationTime * 3 + i) * 3;
      r.circle(x + 25, 160, glowSize, { fill: props.emitGlow, opacity: 0.3 });

      // Object
      r.roundRect(x, 130, 50, 60, 4, { fill: props.emitColor, stroke: isSelected ? '#ffffff' : 'transparent', strokeWidth: 2 });

      // Wavelength label
      r.text(x + 25, 120, `${props.wavelengthNm}nm`, { fill: props.emitColor, fontSize: 9, textAnchor: 'middle' });

      // Name label
      const shortName = mat.includes('highlighter') ? mat.split('_')[1] : 'detergent';
      r.text(x + 25, 210, shortName, { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

      r.addButton({ id: `twist_mat_${mat}`, label: '', variant: 'secondary' });
    });

    r.text(200, 245, 'Same UV input -> Different emission colors!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Explanation box
    r.roundRect(30, 275, 340, 80, 12, { fill: 'rgba(236, 72, 153, 0.2)' });
    r.text(200, 300, 'Same UV in -> Different colors out!', { fill: '#ec4899', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 325, 'Each molecule has its own energy levels,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 345, 'determining its unique emission wavelength.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Explanation', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Molecular Fingerprint', { fill: '#ec4899', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 110, 'Each fluorescent molecule has unique', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 130, 'energy levels. The Stokes shift varies!', { fill: '#ec4899', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Emission wavelengths
    const emissions = [
      { name: 'Yellow Highlighter', color: '#22ff22', wave: '520nm' },
      { name: 'Pink Highlighter', color: '#ff66cc', wave: '580nm' },
      { name: 'Green Highlighter', color: '#00ffaa', wave: '510nm' },
      { name: 'Laundry Detergent', color: '#6666ff', wave: '440nm' }
    ];

    emissions.forEach((em, i) => {
      const x = i < 2 ? 45 : 205;
      const y = 150 + (i % 2) * 50;
      r.roundRect(x, y, 150, 40, 6, { fill: 'rgba(15, 23, 42, 0.6)' });
      r.text(x + 75, y + 18, em.name, { fill: em.color, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 33, `Emits ${em.wave}`, { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    });

    r.text(200, 265, `Your prediction: ${this.twistPrediction === 'different' ? 'Correct!' : 'Not quite'}`, { fill: this.twistPrediction === 'different' ? '#10b981' : '#fbbf24', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#8b5cf6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#a855f7', fontSize: 11, textAnchor: 'middle' });

    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
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

    r.roundRect(40, 310, 320, 60, 10, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 358, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Explored', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Fluorescence Quiz', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      r.roundRect(25, 100, 350, 55, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 132, question.question.substring(0, 55) + (question.question.length > 55 ? '...' : ''), { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 170 + i * 48;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#a855f7' : '#e2e8f0', fontSize: 10 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Quiz', variant: 'primary' });
      } else {
        r.text(200, 400, `${answered}/10 answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🎉' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Fluorescence mastered!' : 'Keep studying!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.roundRect(30, 280, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 335, 'UV absorption -> visible emission', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 355, 'Stokes shift: energy lost as heat', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 375, 'Different molecules -> different colors', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete!', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '🏆', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 180, 'Fluorescence Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 215, "You've mastered the physics of", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 238, 'fluorescence!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    r.roundRect(30, 265, 340, 120, 12, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 290, 'You now understand:', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 315, 'UV absorption by fluorescent molecules', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 335, 'Re-emission at longer wavelength (Stokes shift)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 355, 'Different molecules -> different emission colors', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 375, 'Real applications: security, forensics, lighting', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 420, "Next blacklight party, you'll know the physics!", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering fluorescence physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      uvOn: this.uvOn,
      regularLightOn: this.regularLightOn,
      selectedMaterial: this.selectedMaterial,
      twistMaterial: this.twistMaterial,
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
    if (state.uvOn !== undefined) this.uvOn = state.uvOn as boolean;
    if (state.regularLightOn !== undefined) this.regularLightOn = state.regularLightOn as boolean;
    if (state.selectedMaterial) this.selectedMaterial = state.selectedMaterial as typeof this.selectedMaterial;
    if (state.twistMaterial) this.twistMaterial = state.twistMaterial as typeof this.twistMaterial;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createFluorescenceGame(sessionId: string): FluorescenceGame {
  return new FluorescenceGame(sessionId);
}
