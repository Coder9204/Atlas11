'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// ELON GAME #20: PACKAGING LIMIT - Complete 10-Phase Game
// Advanced chip packaging (CoWoS, chiplets, 3D stacking) as the new bottleneck
// limiting AI chip production
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ELON_PackagingLimitRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "TSMC's CoWoS (Chip-on-Wafer-on-Substrate) packaging is the primary method for assembling NVIDIA's H100 and B200 GPUs. Each package places GPU die and HBM stacks on a large silicon interposer.",
    question: "Why is CoWoS capacity considered the main bottleneck for AI chip production rather than transistor fabrication itself?",
    options: [
      { id: 'a', label: "CoWoS requires a silicon interposer larger than the GPU die itself, consuming extra wafer capacity and having lower yield", correct: true },
      { id: 'b', label: "CoWoS is slower than traditional wire bonding" },
      { id: 'c', label: "The GPU dies cannot be tested before packaging" },
      { id: 'd', label: "CoWoS only works with a single die per package" }
    ],
    explanation: "CoWoS uses a silicon interposer that can be 2-3x larger than the GPU die to accommodate HBM stacks. This interposer consumes additional wafer capacity, and the large area means lower yield. TSMC has had to rapidly expand CoWoS capacity to meet AI demand."
  },
  {
    scenario: "A packaging engineer is comparing wire bonding, flip-chip, and hybrid bonding for connecting a chiplet to an interposer. Wire bonding uses gold wires at 50\u03BCm pitch, flip-chip uses solder bumps at 150\u03BCm pitch, and hybrid bonding uses copper pads at 9\u03BCm pitch.",
    question: "What is the primary advantage of hybrid bonding over flip-chip for advanced packaging?",
    options: [
      { id: 'a', label: "Hybrid bonding achieves much higher interconnect density with shorter connections, enabling more bandwidth per mm\u00B2", correct: true },
      { id: 'b', label: "Hybrid bonding is cheaper than flip-chip" },
      { id: 'c', label: "Hybrid bonding uses less power per connection" },
      { id: 'd', label: "Hybrid bonding works at higher temperatures" }
    ],
    explanation: "Hybrid bonding (Cu-Cu direct bonding) achieves ~9\u03BCm pitch versus 150\u03BCm for flip-chip, giving roughly 280x more connections per unit area. The shorter interconnect height also reduces parasitic inductance and capacitance, improving signal integrity and bandwidth density."
  },
  {
    scenario: "Through-silicon vias (TSVs) are vertical electrical connections that pass completely through a silicon wafer or die. A typical TSV has a diameter of 5-10\u03BCm and must pass through silicon that is 50-100\u03BCm thick.",
    question: "What is the 'aspect ratio' challenge with TSVs and why does it matter?",
    options: [
      { id: 'a', label: "The depth-to-width ratio (10:1 to 20:1) makes it difficult to uniformly fill the via with copper, risking voids and reliability failures", correct: true },
      { id: 'b', label: "TSVs must be perfectly circular, which is hard to etch" },
      { id: 'c', label: "TSVs cannot carry more than 1mA of current" },
      { id: 'd', label: "The aspect ratio only affects optical properties" }
    ],
    explanation: "TSV aspect ratios of 10:1 to 20:1 make copper electroplating challenging \u2014 the narrow, deep holes can trap air bubbles or develop voids during filling. Incomplete fill causes high resistance, electromigration, and reliability failures. This requires precise control of plating chemistry and thinning processes."
  },
  {
    scenario: "A 3D-stacked chip package has a logic die on the bottom and a memory die (or SRAM cache) bonded on top. During operation, the logic die generates 150W of heat in a 100mm\u00B2 area.",
    question: "What is the fundamental thermal challenge of 3D stacking?",
    options: [
      { id: 'a', label: "The top die acts as a thermal insulator, trapping heat from the bottom die and creating hotspots that limit performance", correct: true },
      { id: 'b', label: "3D stacking makes chips weigh too much for the socket" },
      { id: 'c', label: "The bonding material melts at operating temperatures" },
      { id: 'd', label: "Heat only flows sideways in 3D stacks" }
    ],
    explanation: "In 3D stacks, heat from the bottom die must pass through the top die (and bonding layers) to reach the heatsink. Silicon has finite thermal conductivity (~150 W/mK), so each stacked layer adds thermal resistance. This creates hotspots that throttle performance, which is why AMD's 3D V-Cache puts SRAM (low power) on top rather than logic."
  },
  {
    scenario: "Before assembling a multi-chiplet package, each individual chiplet must be tested. An untested 'bad' die integrated into an expensive package wastes the entire assembly.",
    question: "What is 'known-good-die' (KGD) testing and why is it critical for chiplet economics?",
    options: [
      { id: 'a', label: "KGD testing verifies each chiplet works before packaging, preventing waste of good dies bonded with a defective one in an expensive assembly", correct: true },
      { id: 'b', label: "KGD testing measures the physical dimensions of each die" },
      { id: 'c', label: "KGD testing checks only the packaging substrate" },
      { id: 'd', label: "KGD testing is optional and rarely performed in production" }
    ],
    explanation: "A CoWoS package with one GPU die and six HBM stacks costs thousands of dollars. If any single component is defective, the entire assembly is lost. KGD testing uses wafer-level probing and burn-in to ensure each chiplet functions correctly before the irreversible bonding step, dramatically improving composite yield."
  },
  {
    scenario: "The Universal Chiplet Interconnect Express (UCIe) standard defines a die-to-die interface for chiplets from different vendors to communicate within a single package.",
    question: "Why is a universal chiplet interconnect standard important for the semiconductor industry?",
    options: [
      { id: 'a', label: "It enables a chiplet ecosystem where dies from different foundries and designers can be mixed in one package, reducing costs and increasing flexibility", correct: true },
      { id: 'b', label: "It eliminates the need for any packaging at all" },
      { id: 'c', label: "It only benefits memory manufacturers" },
      { id: 'd', label: "It replaces PCIe for board-level connections" }
    ],
    explanation: "UCIe standardizes the physical layer, protocol, and software stack for die-to-die communication. This allows a company to combine its own logic chiplet with third-party I/O, memory, or accelerator chiplets in one package \u2014 similar to how USB standardized peripheral connections. It enables a 'chiplet marketplace' reducing costs through specialization."
  },
  {
    scenario: "A silicon interposer for a large AI accelerator measures 2,500mm\u00B2 \u2014 significantly larger than the reticle limit of ~800mm\u00B2 for a single lithography exposure.",
    question: "How do manufacturers create interposers larger than the lithography reticle limit?",
    options: [
      { id: 'a', label: "They use multi-shot lithography (stitching), exposing overlapping sections and aligning them, but this introduces yield challenges at stitch boundaries", correct: true },
      { id: 'b', label: "They use a completely different non-lithographic process" },
      { id: 'c', label: "They shrink the interposer pattern to fit within one exposure" },
      { id: 'd', label: "They simply use a larger lens" }
    ],
    explanation: "Multi-shot lithography stitches multiple reticle exposures together to pattern an interposer larger than the ~800mm\u00B2 reticle limit. The stitch boundaries must align within nanometers, and any defect at a boundary kills the interposer. This is why large interposers have lower yield and higher cost."
  },
  {
    scenario: "HBM3E provides 1.2 TB/s of memory bandwidth per stack by using 1,024 data pins connected via microbumps to a base logic die, which connects to the GPU through the silicon interposer.",
    question: "Why does adding more HBM stacks to a package improve AI training performance but reduce packaging yield?",
    options: [
      { id: 'a', label: "Each HBM stack adds memory bandwidth linearly, but the interposer must grow to accommodate them, and more components means more chances for a defective bond", correct: true },
      { id: 'b', label: "HBM stacks generate too much heat for the package" },
      { id: 'c', label: "HBM stacks interfere with each other electromagnetically" },
      { id: 'd', label: "More HBM stacks require a faster GPU clock speed" }
    ],
    explanation: "Going from 4 to 6 HBM stacks on an H100/B200 package increases bandwidth from 3.2 to 4.8 TB/s, but the interposer area grows proportionally. Composite yield = GPU yield x HBM1 yield x HBM2 yield x ... x interposer yield. Each additional component multiplies the probability of a defect."
  },
  {
    scenario: "A chiplet-based design uses four compute chiplets on a single package, each manufactured at 3nm, connected to I/O chiplets made at 12nm. A monolithic equivalent would be a single large 3nm die.",
    question: "What is the primary economic advantage of the chiplet approach over a monolithic die?",
    options: [
      { id: 'a', label: "Smaller dies have exponentially higher yield, and non-critical functions can use cheaper older nodes, dramatically reducing total cost", correct: true },
      { id: 'b', label: "Chiplets are always faster than monolithic dies" },
      { id: 'c', label: "Chiplets eliminate all packaging costs" },
      { id: 'd', label: "Chiplets use less total silicon area" }
    ],
    explanation: "Yield follows a negative exponential with die area: halving die area more than doubles yield. Four 100mm\u00B2 chiplets at 3nm are far cheaper than one 400mm\u00B2 monolithic die. Putting I/O on 12nm instead of 3nm saves ~4x per mm\u00B2 for those functions. The packaging cost is offset by dramatically higher silicon yield."
  },
  {
    scenario: "During thermal cycling of a large advanced package, the silicon die (CTE ~2.6 ppm/\u00B0C) is mounted on an organic substrate (CTE ~17 ppm/\u00B0C). This mismatch causes the package to warp.",
    question: "Why is package warpage a critical reliability concern for advanced packaging?",
    options: [
      { id: 'a', label: "Warpage strains solder joints and microbumps, causing cracks and opens over time, and makes the package difficult to mount on PCBs", correct: true },
      { id: 'b', label: "Warpage only affects the visual appearance of the chip" },
      { id: 'c', label: "Warpage increases clock speed due to stress effects" },
      { id: 'd', label: "Warpage is only a problem during manufacturing, not in operation" }
    ],
    explanation: "The CTE mismatch between silicon (~2.6 ppm/\u00B0C) and organic substrate (~17 ppm/\u00B0C) causes differential expansion during temperature changes. Large packages (>60mm per side) can warp by hundreds of microns, stressing microbump connections and making SMT board mounting unreliable. This drives the need for multi-layer substrate engineering and underfill materials."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\uD83D\uDD25',
    title: 'TSMC CoWoS Capacity Crisis',
    short: 'The packaging bottleneck throttling AI chip supply',
    tagline: 'When advanced packaging becomes the gating factor',
    description: 'TSMC\'s CoWoS advanced packaging technology is the primary method for assembling NVIDIA\'s H100, A100, and B200 GPUs. Each package requires a large silicon interposer (up to 2.5x reticle size) to connect the GPU die with 4-6 HBM memory stacks. Despite TSMC doubling CoWoS capacity in 2024, demand from AI training still far outstrips supply, with lead times exceeding 50 weeks.',
    connection: 'CoWoS demonstrates the interconnect pitch vs. yield tradeoff: the fine-pitch microbumps (~40\u03BCm) connecting HBM to the interposer require extreme precision, and the large interposer area drives yield down, creating a production bottleneck that transistor-level fabrication alone cannot solve.',
    howItWorks: 'In CoWoS, chiplets (GPU + HBM stacks) are first bonded to a silicon interposer using microbumps (Chip-on-Wafer). The interposer contains TSVs and redistribution layers for routing. The assembly is then bonded to an organic substrate with C4 bumps (on-Substrate). Finally, BGA balls connect the package to the PCB.',
    stats: [
      { value: '2.5x', label: 'Interposer vs Reticle', icon: '\uD83D\uDD2C' },
      { value: '50+ wk', label: 'CoWoS Lead Time', icon: '\u23F0' },
      { value: '6 HBM', label: 'Stacks per B200', icon: '\uD83D\uDCE6' }
    ],
    examples: ['H100 GPU packaging', 'B200 Blackwell assembly', 'MI300X multi-die package', 'Gaudi3 accelerator packaging'],
    companies: ['TSMC', 'NVIDIA', 'AMD', 'Intel'],
    futureImpact: 'TSMC plans to 3x CoWoS capacity by 2026, and is developing CoWoS-L (using local silicon interconnect bridges instead of full interposers) to improve yield and reduce cost for next-generation AI accelerators.',
    color: '#3B82F6'
  },
  {
    icon: '\uD83C\uDFD7\uFE0F',
    title: 'Intel Foveros 3D Stacking',
    short: 'True 3D chip stacking with face-to-face bonding',
    tagline: 'Building up when you cannot shrink further',
    description: 'Intel\'s Foveros technology enables true 3D stacking by bonding a top die face-down onto a base die, with TSVs providing power and signal connections through the stack. Used in Meteor Lake and Lunar Lake processors, Foveros allows Intel to combine compute tiles (manufactured at Intel 4 or TSMC N3) with I/O tiles (Intel 16/22nm), optimizing each function for its ideal process node.',
    connection: 'Foveros shows how interconnect pitch directly impacts 3D stacking density: original Foveros used 50\u03BCm bump pitch, while Foveros Direct achieves 36\u03BCm, and future Foveros Omni targets <10\u03BCm pitch, enabling denser vertical connections but requiring progressively tighter alignment and cleaner bonding surfaces.',
    howItWorks: 'The base die contains TSVs and is bonded face-up to the substrate. The top die is flipped and bonded face-down onto the base die using microbumps or hybrid bonding. Signals pass vertically through the stack via TSVs, while an EMIB (Embedded Multi-die Interconnect Bridge) provides high-density lateral connections between adjacent tiles.',
    stats: [
      { value: '36\u03BCm', label: 'Bump Pitch (Direct)', icon: '\uD83D\uDD17' },
      { value: '<10\u03BCm', label: 'Future Target', icon: '\uD83C\uDFAF' },
      { value: '3D+2.5D', label: 'Hybrid Integration', icon: '\uD83E\uDDE9' }
    ],
    examples: ['Meteor Lake CPU tiles', 'Lunar Lake SoC integration', 'Ponte Vecchio GPU', 'Clearwater Forest server chip'],
    companies: ['Intel', 'Amkor', 'ASE Group', 'Synopsys'],
    futureImpact: 'Intel\'s roadmap targets sub-10\u03BCm Foveros Direct bonding by 2026, enabling much denser 3D stacks. Combined with PowerVia (backside power delivery), this could allow logic-on-logic stacking for dramatically higher transistor density per mm\u00B2 of package area.',
    color: '#F59E0B'
  },
  {
    icon: '\uD83D\uDCBE',
    title: 'AMD 3D V-Cache',
    short: 'Stacking SRAM on top of CPU for massive cache',
    tagline: '64MB of cache, bonded directly on top',
    description: 'AMD\'s 3D V-Cache technology stacks an additional 64MB SRAM die directly on top of the CCD (Core Complex Die) using TSMC\'s SoIC (System on Integrated Chips) hybrid bonding. The 5800X3D, 7800X3D, and EPYC processors with V-Cache achieve up to 3x more L3 cache than standard parts, dramatically improving gaming and HPC workloads that are sensitive to memory latency.',
    connection: 'V-Cache illustrates the thermal challenge of 3D stacking: the SRAM cache die is placed on top (because it generates minimal heat), and the CCD below is thinned to improve thermal conduction to the heatsink. If the positions were reversed, the logic die\'s heat would be trapped, causing thermal throttling.',
    howItWorks: 'The CCD is thinned from ~750\u03BCm to ~25\u03BCm using backgrinding. A 64MB SRAM die is then bonded on top using hybrid bonding (Cu-Cu pads at ~9\u03BCm pitch). Structural silicon fills the height gap between the V-Cache die and the I/O die. TSVs carry signals vertically through the thinned CCD to the cache above.',
    stats: [
      { value: '64MB', label: 'Extra L3 Cache', icon: '\uD83D\uDCCA' },
      { value: '9\u03BCm', label: 'Hybrid Bond Pitch', icon: '\u26A1' },
      { value: '~15%', label: 'Gaming FPS Gain', icon: '\uD83C\uDFAE' }
    ],
    examples: ['Ryzen 7 5800X3D desktop', 'Ryzen 9 7950X3D gaming', 'EPYC Genoa-X server', 'Ryzen 9800X3D next-gen'],
    companies: ['AMD', 'TSMC', 'Cadence', 'Mentor Graphics'],
    futureImpact: 'Future V-Cache iterations may stack multiple cache layers or integrate HBM-style memory directly on top of the CPU die, blurring the line between processor and memory and potentially enabling terabytes-per-second of on-chip bandwidth.',
    color: '#10B981'
  },
  {
    icon: '\uD83E\uDD16',
    title: 'Tesla Dojo Wafer-Scale',
    short: 'An entire wafer as a single training tile',
    tagline: 'Packaging pushed to the extreme',
    description: 'Tesla\'s Dojo training computer uses wafer-scale integration for its D1 chip tiles. Each training tile bonds 25 D1 dies (manufactured at TSMC 7nm) onto a single large module, connected via custom high-bandwidth die-to-die links. The resulting system board assembles multiple tiles into a training cluster with aggregate bandwidth exceeding 36 TB/s per cabinet, designed specifically for training Tesla\'s autonomous driving neural networks.',
    connection: 'Dojo represents the extreme end of the packaging spectrum: rather than packaging individual chips, entire wafers or large multi-die modules become the unit of assembly. This pushes every packaging challenge to the limit \u2014 thermal management, yield (all 25 dies must work), power delivery, and mechanical stress across a very large substrate.',
    howItWorks: 'Each D1 die is tested (KGD), then 25 dies are bonded to a large custom interposer/substrate. High-bandwidth die-to-die links (custom protocol, not UCIe) connect adjacent dies at >500 GB/s each. A vertical power delivery system supplies >10kW per training tile. Custom cooling solutions remove heat from the tightly-packed array.',
    stats: [
      { value: '25 dies', label: 'Per Training Tile', icon: '\uD83E\uDDE9' },
      { value: '36 TB/s', label: 'Cabinet Bandwidth', icon: '\uD83D\uDE80' },
      { value: '>10kW', label: 'Per Tile Power', icon: '\u26A1' }
    ],
    examples: ['Dojo D1 training tile', 'Cerebras WSE-3 wafer-scale', 'Tesla FSD training cluster', 'Dojo ExaPOD system'],
    companies: ['Tesla', 'Cerebras', 'TSMC', 'Amkor'],
    futureImpact: 'Wafer-scale and large-tile integration may become standard for AI training, with future systems integrating photonic interconnects between tiles and liquid cooling channels built directly into the package substrate.',
    color: '#EF4444'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_PackagingLimitRenderer: React.FC<ELON_PackagingLimitRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [interconnectPitch, setInterconnectPitch] = useState(150);
  const [animFrame, setAnimFrame] = useState(0);

  // Twist phase - HBM stacks
  const [hbmStacks, setHbmStacks] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Packaging simulation calculations
  const calculateBandwidthDensity = (pitch: number) => {
    // Bandwidth density in GB/s/mm^2 - inversely proportional to pitch squared
    const refPitch = 150; // flip-chip reference
    const refBW = 2.5; // GB/s/mm^2 at flip-chip pitch
    return refBW * (refPitch / pitch) * (refPitch / pitch);
  };

  const calculateYield = (pitch: number, numHBM: number) => {
    // Yield drops with finer pitch and larger interposer area
    const pitchFactor = Math.max(0.15, 1 - ((150 - pitch) / 150) * 0.6);
    const baseInterposerArea = 800; // mm^2
    const hbmAreaPerStack = 120; // mm^2 each
    const totalArea = baseInterposerArea + numHBM * hbmAreaPerStack;
    const defectDensity = 0.0008; // defects/mm^2
    const interposerYield = Math.exp(-defectDensity * totalArea);
    const hbmYieldPerStack = 0.92;
    const compositeYield = pitchFactor * interposerYield * Math.pow(hbmYieldPerStack, numHBM);
    return Math.max(0.05, Math.min(0.99, compositeYield));
  };

  const calculateCostPerPackage = (pitch: number, numHBM: number) => {
    // Cost in dollars
    const baseCost = 200;
    const pitchCost = (150 / pitch) * 150;
    const hbmCostPerStack = 80;
    const yld = calculateYield(pitch, numHBM);
    const rawCost = baseCost + pitchCost + numHBM * hbmCostPerStack;
    return rawCost / Math.max(0.1, yld);
  };

  const calculateMemoryBandwidth = (numHBM: number) => {
    // TB/s per HBM3E stack ~1.2 TB/s
    return numHBM * 1.2;
  };

  const currentBWDensity = calculateBandwidthDensity(interconnectPitch);
  const currentYield = calculateYield(interconnectPitch, hbmStacks);
  const currentCost = calculateCostPerPackage(interconnectPitch, hbmStacks);
  const currentMemBW = calculateMemoryBandwidth(hbmStacks);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    interposer: '#6366F1',
    chiplet: '#10B981',
    hbm: '#F59E0B',
    substrate: '#78716C',
    tsv: '#06B6D4',
    heat: '#EF4444',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'packaging-limit',
        gameTitle: 'Packaging Limit',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          data-navigation-dot="true"
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // Packaging Cross-Section SVG Visualization
  const PackagingVisualization = ({ showHBM }: { showHBM?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 400;
    const cx = width / 2;
    const activeHBM = showHBM ? hbmStacks : 0;
    const interposerWidth = 220 + activeHBM * 35;
    const halfIW = interposerWidth / 2;

    // Pitch-dependent visual scaling
    const pitchNorm = (150 - interconnectPitch) / 141; // 0 at 150um, 1 at 9um
    const bumpSize = Math.max(1.5, 6 - pitchNorm * 4);
    const bumpSpacing = Math.max(4, 14 - pitchNorm * 10);

    // Heat animation
    const heatOffset = (animFrame % 60) / 60;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="interposerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.interposer} />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>
          <linearGradient id="chipletGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.chiplet} />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="hbmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.hbm} />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="substrateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.substrate} />
            <stop offset="100%" stopColor="#57534E" />
          </linearGradient>
          <linearGradient id="heatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.heat} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.hbm} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="tsvGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.tsv} />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <filter id="pkgGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softPkgGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={cx} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Advanced Package Cross-Section \u2014 {interconnectPitch}\u03BCm Pitch
        </text>

        {/* BGA Balls (bottom) */}
        {Array.from({ length: Math.floor(interposerWidth / 18) }).map((_, i) => (
          <circle
            key={`bga-${i}`}
            cx={cx - halfIW + 9 + i * 18}
            cy={345}
            r={6}
            fill="#A8A29E"
            stroke="#78716C"
            strokeWidth="1"
            filter="url(#softPkgGlow)"
          />
        ))}
        <text x={cx} y={370} fill={colors.textMuted} fontSize="11" textAnchor="middle">BGA Solder Balls</text>

        {/* Organic Substrate */}
        <rect x={cx - halfIW - 10} y={295} width={interposerWidth + 20} height={42} rx="3" fill="url(#substrateGrad)" opacity="0.9" />
        {/* Substrate layers */}
        {[305, 315, 325].map((y, i) => (
          <line key={`sub-layer-${i}`} x1={cx - halfIW - 5} y1={y} x2={cx + halfIW + 5} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4,3" />
        ))}
        <text x={cx} y={320} fill="rgba(255,255,255,0.7)" fontSize="11" fontWeight="600" textAnchor="middle">Organic Substrate (multi-layer)</text>

        {/* C4 Bumps (between interposer and substrate) */}
        {Array.from({ length: Math.floor(interposerWidth / 12) }).map((_, i) => (
          <circle
            key={`c4-${i}`}
            cx={cx - halfIW + 6 + i * 12}
            cy={290}
            r={3}
            fill={colors.accent}
            opacity="0.6"
          />
        ))}

        {/* Silicon Interposer */}
        <rect x={cx - halfIW} y={245} width={interposerWidth} height={40} rx="2" fill="url(#interposerGrad)" opacity="0.85" />
        <text x={cx} y={270} fill="rgba(255,255,255,0.85)" fontSize="11" fontWeight="600" textAnchor="middle">Silicon Interposer ({interposerWidth > 300 ? 'multi-shot stitched' : 'single exposure'})</text>

        {/* TSVs through interposer */}
        {Array.from({ length: Math.floor(interposerWidth / 16) }).map((_, i) => (
          <rect
            key={`tsv-${i}`}
            x={cx - halfIW + 6 + i * 16}
            y={245}
            width={3}
            height={40}
            fill="url(#tsvGrad)"
            opacity="0.5"
          />
        ))}

        {/* Microbumps (between chiplets and interposer) */}
        {Array.from({ length: Math.floor(80 / bumpSpacing) }).map((_, i) => (
          <circle
            key={`ubump-${i}`}
            cx={cx - 40 + i * bumpSpacing}
            cy={240}
            r={bumpSize}
            fill={colors.accent}
            opacity="0.7"
            filter="url(#softPkgGlow)"
          />
        ))}

        {/* GPU Chiplet (center) */}
        <rect x={cx - 45} y={195} width={90} height={40} rx="4" fill="url(#chipletGrad)" />
        <text x={cx} y={213} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">GPU Die</text>
        <text x={cx} y={230} fill="rgba(255,255,255,0.6)" fontSize="11" textAnchor="middle">~800mm\u00B2</text>

        {/* HBM Stacks */}
        {Array.from({ length: activeHBM }).map((_, idx) => {
          const hbmX = idx < Math.ceil(activeHBM / 2)
            ? cx - halfIW + 20 + idx * 50
            : cx + halfIW - 20 - (activeHBM - 1 - idx) * 50;
          const stackLayers = 8; // HBM3E has 8 layers
          return (
            <g key={`hbm-${idx}`}>
              {/* HBM stack layers */}
              {Array.from({ length: stackLayers }).map((_, layer) => (
                <rect
                  key={`hbm-layer-${idx}-${layer}`}
                  x={hbmX - 18}
                  y={205 - layer * 4}
                  width={36}
                  height={4}
                  rx="1"
                  fill="url(#hbmGrad)"
                  opacity={0.5 + layer * 0.06}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="0.5"
                />
              ))}
              {/* HBM base logic die */}
              <rect x={hbmX - 18} y={232} width={36} height={8} rx="1" fill={colors.tsv} opacity="0.6" />
              {/* Label */}
              <text x={hbmX} y={170} fill={colors.hbm} fontSize="11" fontWeight="600" textAnchor="middle">HBM{idx + 1}</text>
            </g>
          );
        })}

        {/* Heat flow arrows (upward) */}
        {[0, 1, 2].map((i) => {
          const arrowX = cx - 30 + i * 30;
          const baseY = 190;
          const arrowY = baseY - 30 - heatOffset * 20 - i * 5;
          return (
            <g key={`heat-${i}`} opacity={0.4 + Math.sin(animFrame * 0.08 + i) * 0.2}>
              <line x1={arrowX} y1={baseY} x2={arrowX} y2={arrowY + 10} stroke="url(#heatGrad)" strokeWidth="2" />
              <line x1={arrowX - 5} y1={arrowY + 15} x2={arrowX} y2={arrowY + 5} stroke="url(#heatGrad)" strokeWidth="2" />
              <line x1={arrowX + 5} y1={arrowY + 15} x2={arrowX} y2={arrowY + 5} stroke="url(#heatGrad)" strokeWidth="2" />
              <circle cx={arrowX} cy={arrowY + 5} r={2} fill={colors.heat} opacity="0.6" />
            </g>
          );
        })}
        <text x={cx} y={140} fill={colors.heat} fontSize="11" fontWeight="600" textAnchor="middle" opacity="0.7">Heat Flow \u2191</text>

        {/* Interconnect pitch indicator */}
        <g>
          <line x1={cx - 40} y1={388} x2={cx + 40} y2={388} stroke={colors.accent} strokeWidth="1" />
          <line x1={cx - 40} y1={384} x2={cx - 40} y2={392} stroke={colors.accent} strokeWidth="1" />
          <line x1={cx + 40} y1={384} x2={cx + 40} y2={392} stroke={colors.accent} strokeWidth="1" />
          <text x={cx} y={398} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">{interconnectPitch}\u03BCm pitch</text>
        </g>

        {/* Legend */}
        <g>
          <rect x={10} y={height - 25} width="10" height="10" rx="2" fill={colors.interposer} />
          <text x={24} y={height - 16} fill={colors.textMuted} fontSize="11">Interposer</text>
          <rect x={85} y={height - 25} width="10" height="10" rx="2" fill={colors.chiplet} />
          <text x={99} y={height - 16} fill={colors.textMuted} fontSize="11">GPU</text>
          <circle cx={140} cy={height - 20} r={4} fill={colors.hbm} />
          <text x={148} y={height - 16} fill={colors.textMuted} fontSize="11">HBM</text>
          <circle cx={185} cy={height - 20} r={4} fill={colors.tsv} />
          <text x={193} y={height - 16} fill={colors.textMuted} fontSize="11">TSV</text>
          <circle cx={222} cy={height - 20} r={4} fill={colors.heat} />
          <text x={230} y={height - 16} fill={colors.textMuted} fontSize="11">Heat</text>
        </g>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            {'\uD83D\uDCE6\uD83D\uDD2C'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Packaging Limit
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"We can fabricate billions of transistors at 3nm, but "}
            <span style={{ color: colors.accent }}>connecting them together</span>
            {" is now the hardest problem in semiconductors. Advanced packaging \u2014 CoWoS, chiplets, 3D stacking \u2014 has become the bottleneck limiting AI chip production."}
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "You can make all the transistors in the world, but if you can't package them together with enough bandwidth, power delivery, and cooling, they're just expensive sand. Packaging is the new lithography."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Advanced Packaging Engineering
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Bandwidth increases linearly while cost stays constant' },
      { id: 'b', text: 'Finer pitch dramatically increases bandwidth density but yield drops, raising cost per package' },
      { id: 'c', text: 'Pitch has no effect \u2014 bandwidth is determined only by clock speed' },
      { id: 'd', text: 'Finer pitch only affects power consumption, not bandwidth' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              What happens when you shrink the interconnect pitch from 150\u03BCm (flip-chip) to 9\u03BCm (hybrid bonding)?
            </h2>

            {/* Static SVG showing pitch concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictPitchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.interposer} />
                    <stop offset="100%" stopColor="#818CF8" />
                  </linearGradient>
                  <filter id="predictPkgGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Interconnect Pitch Comparison</text>

                {/* Flip-chip side */}
                <text x="100" y="45" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="600">Flip-Chip: 150\u03BCm</text>
                <rect x="30" y="55" width="140" height="20" rx="3" fill={colors.interposer} opacity="0.3" />
                {[0, 1, 2, 3, 4].map(i => (
                  <circle key={`fc-${i}`} cx={50 + i * 30} cy={55} r={8} fill={colors.accent} opacity="0.6" filter="url(#predictPkgGlow)" />
                ))}
                <text x="100" y="95" textAnchor="middle" fill={colors.textMuted} fontSize="11">5 connections / mm</text>

                {/* Hybrid bonding side */}
                <text x="300" y="45" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">Hybrid Bond: 9\u03BCm</text>
                <rect x="230" y="55" width="140" height="20" rx="3" fill={colors.interposer} opacity="0.3" />
                {Array.from({ length: 20 }).map((_, i) => (
                  <circle key={`hb-${i}`} cx={237 + i * 7} cy={55} r={2} fill={colors.success} opacity="0.7" />
                ))}
                <text x="300" y="95" textAnchor="middle" fill={colors.textMuted} fontSize="11">~80 connections / mm</text>

                {/* Arrow showing density increase */}
                <path d="M 120 120 L 280 120" stroke={colors.accent} strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                <text x="200" y="115" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="700">~280x more connections</text>

                <text x="200" y="155" textAnchor="middle" fill={colors.warning} fontSize="13" fontWeight="700">But what about yield and cost?</text>
                <text x="200" y="180" textAnchor="middle" fill={colors.textMuted} fontSize="11">Finer pitch = tighter alignment tolerances = ???</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Packaging Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Packaging Interconnect Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> The interconnect pitch between chiplets and the interposer determines bandwidth density, yield, and cost. Finer pitch enables more data lanes per mm\u00B2, but requires extreme alignment precision and cleaner bonding surfaces, directly impacting manufacturing yield.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Interconnect Pitch</strong> is the center-to-center distance between adjacent bumps or pads. Smaller pitch = more connections per area = higher bandwidth density.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Bandwidth Density</strong> measures data throughput per unit area (GB/s/mm\u00B2). It scales roughly with the inverse square of pitch.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Composite Yield</strong> is the probability that an entire multi-chip package works. It is the product of individual component yields.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Adjust the interconnect pitch slider and observe how bandwidth density increases as pitch shrinks, while yield drops and cost rises. Watch the cross-section visualization update in real time.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualizations */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                            {/* Bandwidth Density vs Pitch Chart */}
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <svg
                  width="100%"
                  height={280}
                  viewBox="0 0 480 280"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: 480 }}
                >
                  <defs>
                    <linearGradient id="chartBwGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#EF4444" /></linearGradient>
                    <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <text x={240} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
                    Bandwidth Density vs Interconnect Pitch
                  </text>
                  {/* Y-axis label */}
                  <text x={14} y={140} fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90, 14, 140)">
                    BW Density (GB/s/mm²)
                  </text>
                  {/* X-axis label */}
                  <text x={270} y={270} fill={colors.textMuted} fontSize="11" textAnchor="middle">
                    Pitch (μm)
                  </text>
                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75].map((f, i) => {
                    const gy = 240 - f * 200;
                    return <line key={'grid-' + i} x1={60} y1={gy} x2={460} y2={gy} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />;
                  })}
                  {/* X-axis ticks */}
                  {[9, 30, 60, 90, 120, 150].map((p, i) => {
                    const tx = 60 + ((p - 9) / 141) * 400;
                    return (
                      <g key={'xtick-' + i}>
                        <line x1={tx} y1={240} x2={tx} y2={245} stroke={colors.textMuted} strokeWidth="1" />
                        <text x={tx} y={257} fill={colors.textMuted} fontSize="11" textAnchor="middle">{p}</text>
                      </g>
                    );
                  })}
                  {/* Axes */}
                  <line x1={60} y1={40} x2={60} y2={240} stroke={colors.textMuted} strokeWidth="1" />
                  <line x1={60} y1={240} x2={460} y2={240} stroke={colors.textMuted} strokeWidth="1" />
                  {/* Curve: BW density = 2.5 * (150/pitch)^2, use log scale for Y */}
                  <path
                    d={(() => {
                      const pts: string[] = [];
                      const maxLogBW = Math.log10(2.5 * (150 / 9) * (150 / 9));
                      const minLogBW = Math.log10(2.5);
                      for (let i = 0; i <= 20; i++) {
                        const pitch = 9 + (141 * i) / 20;
                        const bw = 2.5 * (150 / pitch) * (150 / pitch);
                        const logBW = Math.log10(bw);
                        const x = 60 + ((pitch - 9) / 141) * 400;
                        const y = 240 - ((logBW - minLogBW) / (maxLogBW - minLogBW)) * 200;
                        pts.push((i === 0 ? 'M' : 'L') + ' ' + x.toFixed(1) + ' ' + y.toFixed(1));
                      }
                      return pts.join(' ');
                    })()}
                    stroke={colors.success}
                    strokeWidth="2.5"
                    fill="none"
                  />
                  {/* Interactive marker at current pitch */}
                  {(() => {
                    const bw = 2.5 * (150 / interconnectPitch) * (150 / interconnectPitch);
                    const maxLogBW = Math.log10(2.5 * (150 / 9) * (150 / 9));
                    const minLogBW = Math.log10(2.5);
                    const logBW = Math.log10(bw);
                    const mx = 60 + ((interconnectPitch - 9) / 141) * 400;
                    const my = 240 - ((logBW - minLogBW) / (maxLogBW - minLogBW)) * 200;
                    return (
                      <>
                        <line x1={mx} y1={my} x2={mx} y2={240} stroke={colors.accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                        <circle cx={mx} cy={my} r={8} fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#chartGlow)" />
                        <text x={mx + 12} y={my - 8} fill={colors.accent} fontSize="12" fontWeight="700">
                          {bw.toFixed(1)} GB/s/mm²
                        </text>
                      </>
                    );
                  })()}
                  {/* Reference lines */}
                  <rect x={340} y={45} width="115" height="50" rx="4" fill={colors.bgSecondary} opacity="0.8" />
                  <circle cx={352} cy={58} r={4} fill={colors.success} />
                  <text x={360} y={62} fill={colors.textMuted} fontSize="11">BW Density</text>
                  <circle cx={352} cy={78} r={4} fill={colors.accent} />
                  <text x={360} y={82} fill={colors.textMuted} fontSize="11">Current</text>
                </svg>
              </div>

    
              <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                <PackagingVisualization />
              </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Interconnect pitch slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Interconnect Pitch</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {interconnectPitch}\u03BCm
                  </span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="150"
                  value={interconnectPitch}
                  onChange={(e) => setInterconnectPitch(parseInt(e.target.value))}
                  onInput={(e) => setInterconnectPitch(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Interconnect Pitch"
                  style={sliderStyle(colors.accent, interconnectPitch, 9, 150)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.success }}>9\u03BCm (Hybrid Bonding)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>80\u03BCm</span>
                  <span style={{ ...typo.small, color: colors.error }}>150\u03BCm (Flip-Chip)</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(1, 1fr)',
                gap: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{currentBWDensity.toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>BW Density (GB/s/mm\u00B2)</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: currentYield < 0.5 ? colors.error : colors.warning }}>
                    {(currentYield * 100).toFixed(1)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Package Yield</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: currentCost > 2000 ? colors.error : colors.accent }}>
                    ${currentCost.toFixed(0)}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Cost per Package</div>
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Packaging Limits
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right \u2014 shrinking interconnect pitch dramatically increases bandwidth density (scaling with 1/pitch\u00B2) but yield drops because finer features require tighter alignment and are more susceptible to defects.'
                : 'As you observed in the experiment, finer pitch increases bandwidth density quadratically, but yield drops significantly. This is the fundamental tradeoff in advanced packaging \u2014 more bandwidth per area comes at the cost of manufacturing difficulty.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>BW_density \u221D 1 / pitch\u00B2</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Bandwidth density scales with the <span style={{ color: colors.accent }}>inverse square of pitch</span> because connections pack in two dimensions. Going from 150\u03BCm to 9\u03BCm pitch gives (150/9)\u00B2 = <span style={{ color: colors.success }}>~278x more connections per unit area</span>. However, each connection must align within nanometers, and any single defective bond in thousands can cause failure.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  {'Yield_composite = Yield_die1 \u00D7 Yield_die2 \u00D7 ... \u00D7 Yield_interposer'}
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Composite yield is multiplicative: a package with 6 components at 92% yield each gives 0.92\u2076 = 61% composite yield before interposer yield.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Packaging Is the New Bottleneck
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Transistor scaling (Moore's Law) has given us the ability to build enormous dies with billions of transistors. But connecting those dies together with enough bandwidth, delivering enough power, and removing enough heat requires advanced packaging that is now harder to scale than the transistors themselves. CoWoS, Foveros, and hybrid bonding are packaging's answer to the end of easy scaling.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Packaging Technology Hierarchy
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Wire Bond', pitch: '50\u03BCm+', desc: 'Legacy, low cost' },
                  { name: 'Flip-Chip', pitch: '~150\u03BCm', desc: 'Mainstream BGA' },
                  { name: 'CoWoS 2.5D', pitch: '~40\u03BCm', desc: 'Si interposer' },
                  { name: 'Foveros 3D', pitch: '~36\u03BCm', desc: 'Face-to-face' },
                  { name: 'Hybrid Bond', pitch: '~9\u03BCm', desc: 'Cu-Cu direct' },
                  { name: 'Future', pitch: '<5\u03BCm', desc: 'Monolithic-like' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.pitch}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Adding HBM stacks has no impact on yield or interposer size' },
      { id: 'b', text: 'Each HBM stack increases memory bandwidth ~1.2 TB/s, but the interposer grows and composite yield drops multiplicatively' },
      { id: 'c', text: 'HBM stacks only affect thermal performance, not yield' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: HBM Memory Stacks
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Adding HBM stacks (0 to 6) to the AI chip package. Each stack provides ~1.2 TB/s of memory bandwidth...
            </h2>

            {/* Static SVG showing HBM concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistHbmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.hbm} />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                  <filter id="twistPkgGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Interposer line */}
                <rect x="30" y="55" width="340" height="8" rx="2" fill={colors.interposer} opacity="0.4" />
                {/* GPU */}
                <rect x="155" y="25" width="90" height="28" rx="4" fill={colors.chiplet} opacity="0.5" />
                <text x="200" y="44" textAnchor="middle" fill={colors.chiplet} fontSize="11" fontWeight="600">GPU Die</text>
                {/* HBM stacks */}
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <g key={`hbm-preview-${i}`}>
                    <rect x={40 + i * 55} y={20} width={30} height={33} rx="3" fill="url(#twistHbmGrad)" opacity={i < 4 ? 0.6 : 0.2} />
                    <text x={55 + i * 55} y={40} textAnchor="middle" fill={i < 4 ? colors.hbm : colors.textMuted} fontSize="11" fontWeight="600">HBM</text>
                  </g>
                ))}
                {/* Yield indicator */}
                <text x="200" y="85" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">More HBM = More BW, but larger interposer</text>
                <text x="200" y="105" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="600">Composite yield drops with each additional stack</text>
                <text x="200" y="125" textAnchor="middle" fill={colors.textMuted} fontSize="11">What is the optimal number of HBM stacks?</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See HBM Stack Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - HBM Stacks + Pitch Simulator
  if (phase === 'twist_play') {
    const yieldNoHBM = calculateYield(interconnectPitch, 0);
    const yieldWithHBM = calculateYield(interconnectPitch, hbmStacks);
    const costNoHBM = calculateCostPerPackage(interconnectPitch, 0);
    const costWithHBM = calculateCostPerPackage(interconnectPitch, hbmStacks);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              HBM Stacks vs Package Yield
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              How many HBM stacks can you add before yield and cost become prohibitive?
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  {/* SVG Visualization with HBM */}
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <PackagingVisualization showHBM={true} />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Educational panel */}
              <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you&apos;re seeing:</strong> The cross-section above shows how HBM memory stacks are arranged around the GPU die on a silicon interposer. As you add more stacks, the interposer must grow to accommodate them, visualized by the expanding package width.</p>
                <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> Increasing HBM stacks boosts memory bandwidth linearly (~1.2 TB/s per stack), but each additional stack enlarges the interposer and multiplies yield risk, causing package cost to rise exponentially.</p>
              </div>

              {/* HBM stacks slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>HBM Memory Stacks</span>
                  <span style={{ ...typo.small, color: colors.hbm, fontWeight: 600 }}>{hbmStacks} stacks ({currentMemBW.toFixed(1)} TB/s)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={hbmStacks}
                  onChange={(e) => setHbmStacks(parseInt(e.target.value))}
                  onInput={(e) => setHbmStacks(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="HBM Memory Stacks"
                  style={sliderStyle(colors.hbm, hbmStacks, 0, 6)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>0 (No HBM)</span>
                  <span style={{ ...typo.small, color: colors.hbm }}>6 Stacks (7.2 TB/s)</span>
                </div>
              </div>

              {/* Pitch slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Interconnect Pitch</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{interconnectPitch}\u03BCm</span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="150"
                  value={interconnectPitch}
                  onChange={(e) => setInterconnectPitch(parseInt(e.target.value))}
                  onInput={(e) => setInterconnectPitch(parseInt((e.target as HTMLInputElement).value))}
                  aria-label="Interconnect Pitch"
                  style={sliderStyle(colors.accent, interconnectPitch, 9, 150)}
                />
              </div>

              {/* Comparison Results */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Without HBM</div>
                  <div style={{ ...typo.h3, color: yieldNoHBM < 0.5 ? colors.error : colors.success }}>
                    {(yieldNoHBM * 100).toFixed(1)}% yield
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    ${costNoHBM.toFixed(0)}/pkg
                  </div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>With {hbmStacks} HBM Stacks</div>
                  <div style={{ ...typo.h3, color: yieldWithHBM < 0.5 ? colors.error : colors.hbm }}>
                    {(yieldWithHBM * 100).toFixed(1)}% yield
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    ${costWithHBM.toFixed(0)}/pkg | {currentMemBW.toFixed(1)} TB/s
                  </div>
                </div>
              </div>

              {/* Bandwidth indicator */}
              {hbmStacks > 0 && (
                <div style={{
                  background: `${colors.hbm}22`,
                  border: `1px solid ${colors.hbm}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.body, color: colors.hbm, fontWeight: 700, margin: 0 }}>
                    {hbmStacks} HBM stacks = {currentMemBW.toFixed(1)} TB/s bandwidth ({(currentMemBW / 1.2).toFixed(0)}x single stack)
                  </p>
                  <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                    Yield dropped from {(yieldNoHBM * 100).toFixed(1)}% to {(yieldWithHBM * 100).toFixed(1)}% \u2014 cost increased by ${(costWithHBM - costNoHBM).toFixed(0)} per package
                  </p>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand HBM Impact
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              HBM & The Interposer: Packaging's Critical Tradeoff
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why More HBM Means Lower Yield</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Each HBM stack added to the package requires the silicon interposer to grow by ~120mm\u00B2. A 6-HBM package needs an interposer of ~1,520mm\u00B2 \u2014 nearly twice the reticle limit, requiring multi-shot lithography stitching. The composite yield is multiplicative: if each HBM stack has 92% yield, six stacks give 0.92\u2076 = 61% yield from HBM alone, before accounting for the GPU die and interposer.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Known-Good-Die Imperative</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When a single CoWoS package costs thousands of dollars (GPU die + 6 HBM stacks + interposer + substrate), a single defective component wastes the entire assembly. This makes known-good-die (KGD) testing essential \u2014 every chiplet must be exhaustively tested at wafer level before the irreversible bonding step. The cost of testing is far less than the cost of scrapping a completed package.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Bandwidth-Yield-Cost Triangle</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Advanced AI chip packaging is fundamentally a three-way tradeoff: more HBM stacks give more memory bandwidth (essential for large language models), but the larger interposer drops yield, and the additional components raise cost. The optimal design point depends on the application \u2014 training accelerators need maximum bandwidth (6 HBM), while inference chips may use fewer stacks at lower cost.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Packaging Limit"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                      // Auto-advance to next uncompleted app or test phase
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted === -1) {
                        // All apps completed - advance to test
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextUncompleted);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand advanced chip packaging and its critical role as the bottleneck in AI chip production!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Complete Lesson
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Packaging Limit
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of advanced chip packaging, interconnect pitch, TSVs, HBM stacking, yield, and chiplet economics to real-world semiconductor packaging scenarios. Consider the tradeoffs between bandwidth density, yield, thermal management, and cost.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {question.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Packaging Limit Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why advanced chip packaging has become the critical bottleneck in AI chip production, how interconnect pitch trades off against yield and cost, and how HBM stacking enables the massive memory bandwidth AI models demand.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Interconnect pitch determines bandwidth density (1/pitch\u00B2)',
                'CoWoS uses silicon interposers with TSVs for 2.5D integration',
                'HBM stacks add bandwidth but reduce composite yield',
                'Known-good-die testing prevents expensive assembly waste',
                'Chiplet economics beat monolithic dies through better yield',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Play Again
            </button>
            <a
              href="/"
              style={{
                ...primaryButtonStyle,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_PackagingLimitRenderer;
