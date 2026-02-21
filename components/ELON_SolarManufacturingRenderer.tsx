'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// ELON GAME #12 — SOLAR MANUFACTURING
// From beach sand to solar electricity: the manufacturing journey of a solar cell
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

interface ELON_SolarManufacturingRendererProps {
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
    scenario: "A polysilicon factory receives metallurgical-grade silicon (99% pure) and must refine it to solar-grade (99.9999% or '6N' purity).",
    question: "What process is used for this extreme purification?",
    options: [
      { id: 'a', label: "Siemens process — chemical vapor deposition of trichlorosilane", correct: true },
      { id: 'b', label: "Simple melting and filtering" },
      { id: 'c', label: "Centrifugal separation" },
      { id: 'd', label: "Electrolysis in salt water" }
    ],
    explanation: "The Siemens process converts MG-Si to trichlorosilane (SiHCl₃), distills it to extreme purity, then deposits pure silicon on heated rods via CVD. This achieves 9N-11N purity."
  },
  {
    scenario: "In the Czochralski (Cz) process, a seed crystal is slowly pulled from a crucible of molten silicon at about 1425°C.",
    question: "Why must the pull rate be precisely controlled?",
    options: [
      { id: 'a', label: "Too fast creates defects; too slow wastes energy and time", correct: true },
      { id: 'b', label: "Speed doesn't matter — only temperature matters" },
      { id: 'c', label: "Faster pulling makes purer silicon" },
      { id: 'd', label: "The crystal only forms at exactly one speed" }
    ],
    explanation: "Pull rate (typically 1-2 mm/min) determines crystal quality. Too fast causes dislocations and inclusions; too slow reduces throughput. The interface shape must remain slightly convex for defect-free growth."
  },
  {
    scenario: "A wire saw cuts a silicon ingot into wafers using diamond-coated wire moving at high speed.",
    question: "What percentage of the ingot is lost as 'kerf loss' during cutting?",
    options: [
      { id: 'a', label: "Less than 5%" },
      { id: 'b', label: "About 10%" },
      { id: 'c', label: "About 30-40%", correct: true },
      { id: 'd', label: "Over 50%" }
    ],
    explanation: "With ~180μm wafers and ~120μm kerf (saw cut width), roughly 40% of expensive polysilicon becomes dust. This is one of the biggest cost drivers — reducing kerf loss is a major research focus."
  },
  {
    scenario: "During solar cell fabrication, an anti-reflection coating (ARC) is deposited on the front surface of the silicon wafer.",
    question: "What material is most commonly used and why?",
    options: [
      { id: 'a', label: "Silicon nitride (SiNx) — it also passivates surface defects", correct: true },
      { id: 'b', label: "Gold — it reflects infrared light" },
      { id: 'c', label: "Glass — it's transparent and cheap" },
      { id: 'd', label: "Aluminum — it's conductive" }
    ],
    explanation: "SiNx (~75nm thick) serves double duty: its refractive index (~2.0) minimizes reflection (reducing it from ~35% to ~3%), and it provides excellent surface passivation by reducing recombination at defects."
  },
  {
    scenario: "The metallization step prints silver paste fingers on the front of a solar cell using screen printing.",
    question: "Why are the silver lines made as narrow as possible?",
    options: [
      { id: 'a', label: "Narrower lines shade less active area, increasing current", correct: true },
      { id: 'b', label: "Thinner lines conduct better" },
      { id: 'c', label: "It uses less ink, saving printing time" },
      { id: 'd', label: "Wider lines would melt the silicon" }
    ],
    explanation: "Silver gridlines shade ~3-5% of the cell. Each 10μm reduction in finger width gains ~0.1% absolute efficiency. But too narrow increases resistance. Modern cells use ~30μm fingers vs. 100μm+ a decade ago."
  },
  {
    scenario: "Swanson's Law describes the historical trend in solar module pricing since the 1970s.",
    question: "What does Swanson's Law state?",
    options: [
      { id: 'a', label: "Module price drops ~20% for every doubling of cumulative production", correct: true },
      { id: 'b', label: "Efficiency doubles every 5 years" },
      { id: 'c', label: "Solar panels degrade 1% per year" },
      { id: 'd', label: "Manufacturing speed doubles every 2 years" }
    ],
    explanation: "Similar to Moore's Law for semiconductors, Swanson's Law shows a ~20% learning rate. From $76/W in 1977 to <$0.20/W today — a 99.7% cost reduction driven by scale, efficiency gains, and process improvements."
  },
  {
    scenario: "A PERC (Passivated Emitter and Rear Cell) solar cell adds a dielectric passivation layer to the rear surface.",
    question: "How does rear passivation improve efficiency?",
    options: [
      { id: 'a', label: "Reduces electron recombination at the back surface, boosting voltage", correct: true },
      { id: 'b', label: "Makes the cell physically stronger" },
      { id: 'c', label: "Increases light absorption in the infrared" },
      { id: 'd', label: "Lowers the operating temperature" }
    ],
    explanation: "Without passivation, the aluminum back surface has high recombination velocity (~200 cm/s). PERC's Al₂O₃/SiNx stack reduces this to <10 cm/s, boosting Voc by 10-15mV and efficiency by 1%+ absolute."
  },
  {
    scenario: "A solar module manufacturer encapsulates 60 cells between glass and backsheet using EVA (ethylene-vinyl acetate).",
    question: "Why is encapsulation critical for the 25-year warranty?",
    options: [
      { id: 'a', label: "Protects cells from moisture, UV, and mechanical stress", correct: true },
      { id: 'b', label: "Increases electrical output" },
      { id: 'c', label: "Makes the module lighter" },
      { id: 'd', label: "Improves cell efficiency" }
    ],
    explanation: "Moisture causes corrosion of silver contacts and delamination. UV degrades materials. EVA encapsulation with glass provides a hermetic seal. PID (Potential Induced Degradation) from moisture is a leading failure mode."
  },
  {
    scenario: "TOPCon (Tunnel Oxide Passivated Contact) cells use an ultra-thin (~1.5nm) silicon oxide tunnel layer.",
    question: "What is the purpose of this tunnel oxide?",
    options: [
      { id: 'a', label: "Allows electrons to tunnel through while blocking recombination", correct: true },
      { id: 'b', label: "Acts as an anti-reflection coating" },
      { id: 'c', label: "Provides mechanical support" },
      { id: 'd', label: "Stores electrical charge" }
    ],
    explanation: "The tunnel oxide is thin enough for quantum mechanical tunneling of carriers but thick enough to chemically passivate the surface. This enables full-area contacts without the recombination penalty of direct metal-silicon contact."
  },
  {
    scenario: "A heterojunction (HJT) solar cell uses amorphous silicon (a-Si) layers deposited on crystalline silicon at low temperature (~200°C).",
    question: "What is the key advantage of HJT's low-temperature process?",
    options: [
      { id: 'a', label: "Preserves wafer quality and enables bifacial design with highest Voc", correct: true },
      { id: 'b', label: "Uses less electricity" },
      { id: 'c', label: "Makes thicker wafers" },
      { id: 'd', label: "Eliminates the need for silver" }
    ],
    explanation: "High temperatures (>800°C in PERC/TOPCon) can degrade bulk lifetime. HJT's <200°C process preserves carrier lifetime, achieving Voc >740mV (vs ~680mV for PERC). This enables >25% efficiency with thinner wafers."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💎',
    title: 'LONGi Mono Revolution',
    short: 'How one company transformed global solar manufacturing',
    tagline: 'The bet on monocrystalline that changed everything',
    description: 'LONGi Green Energy bet everything on mono-Si Czochralski technology when the industry favored cheaper multicrystalline. By perfecting Cz growth and diamond wire sawing, they achieved both higher efficiency AND lower cost, capturing over 30% of global wafer production and driving mono-Si to 95%+ market share.',
    connection: 'The Czochralski process you explored — LONGi optimized pull speed, crucible lifetime, and crystal quality to produce 300mm+ ingots at unprecedented scale.',
    howItWorks: 'Continuous Czochralski (CCz) process feeds fresh polysilicon into the melt, enabling longer ingots with less downtime.',
    stats: [
      { value: '70%', label: 'Mono market share', icon: '📊' },
      { value: 'Cz', label: 'Czochralski process', icon: '🔬' },
      { value: '$0.15/W', label: 'Module cost', icon: '💰' }
    ],
    examples: ['Hi-MO 7 modules', 'N-type TOPCon cells', 'HPBC technology', '182mm M10 wafers'],
    companies: ['LONGi', 'TCL Zhonghuan', 'Shangji Automation', 'Xiechen Silicon'],
    futureImpact: 'Perovskite-silicon tandems on LONGi wafers targeting 30%+ efficiency.',
    color: '#3B82F6'
  },
  {
    icon: '🔬',
    title: 'First Solar CdTe',
    short: 'The silicon-free alternative that defied expectations',
    tagline: 'Thin-film technology at utility scale',
    description: 'First Solar bypasses silicon entirely, using cadmium telluride (CdTe) deposited by vapor transport at high speed. Their Series 7 modules achieve 19%+ efficiency with the lowest carbon footprint and best hot-climate performance in the industry. No ingot pulling, no wire sawing, no kerf loss.',
    connection: 'While silicon manufacturing has 30-40% kerf loss, CdTe vapor deposition wastes almost zero semiconductor material — a fundamentally different approach to the same problem.',
    howItWorks: 'CdTe is sublimated and deposited on glass in a continuous inline process — from raw glass to finished module in under 3 hours.',
    stats: [
      { value: 'No Si', label: 'Silicon-free', icon: '🚫' },
      { value: 'Vapor', label: 'Deposition process', icon: '💨' },
      { value: '19%+', label: 'Module efficiency', icon: '⚡' }
    ],
    examples: ['Series 7 modules', 'Utility-scale farms', 'Desert installations', 'Low-carbon manufacturing'],
    companies: ['First Solar', 'Calyxo', 'Advanced Solar Power', 'Toledo Solar'],
    futureImpact: 'CdSeTe alloys and improved back contacts pushing toward 25% cell efficiency.',
    color: '#10B981'
  },
  {
    icon: '⚡',
    title: 'Tesla/Panasonic HJT',
    short: 'Heterojunction technology for premium performance',
    tagline: 'When amorphous meets crystalline silicon',
    description: 'The Tesla Gigafactory in Buffalo, NY produces HJT solar cells combining crystalline and amorphous silicon. This technology achieves the highest open-circuit voltage of any silicon cell architecture, enabling 22%+ module efficiency with excellent temperature coefficients for real-world energy yield.',
    connection: 'HJT is the "twist" in solar manufacturing — instead of high-temperature diffusion, it uses low-temperature PECVD to deposit ultra-thin amorphous silicon passivation layers.',
    howItWorks: 'Intrinsic a-Si:H layers (~5nm) passivate both surfaces, then doped a-Si:H creates the junction, all below 200°C.',
    stats: [
      { value: 'HJT', label: 'Cell technology', icon: '🔋' },
      { value: 'Buffalo', label: 'Gigafactory location', icon: '🏭' },
      { value: '22%+', label: 'Module efficiency', icon: '📈' }
    ],
    examples: ['Tesla Solar Roof', 'Powerwall integration', 'Residential systems', 'Commercial rooftops'],
    companies: ['Tesla/Panasonic', 'REC Group', 'Meyer Burger', 'Huasun'],
    futureImpact: 'Copper-plated contacts replacing silver could cut HJT cell cost by 30%.',
    color: '#F97316'
  },
  {
    icon: '🎯',
    title: 'Maxeon IBC',
    short: 'All contacts on the back for maximum light capture',
    tagline: 'The highest efficiency residential solar panel',
    description: 'Maxeon (formerly SunPower) places ALL electrical contacts on the back of the cell — zero shading on the front. Their Interdigitated Back Contact (IBC) architecture achieves 24%+ cell efficiency, the highest of any mass-produced residential technology. Originally developed at Stanford University.',
    connection: 'Remember how front metallization shades 3-5% of the cell? IBC eliminates this entirely by moving both positive and negative contacts to the rear.',
    howItWorks: 'Interdigitated n+ and p+ doped regions on the rear collect carriers, with front surface passivated by SiO₂/SiNx stack.',
    stats: [
      { value: '24%+', label: 'Cell efficiency', icon: '🏆' },
      { value: 'Back', label: 'Contact location', icon: '🔄' },
      { value: 'Top', label: 'Residential choice', icon: '🏠' }
    ],
    examples: ['Maxeon 7 panels', 'Premium residential', 'Space-constrained roofs', 'High-value commercial'],
    companies: ['Maxeon Solar', 'LONGi (HPBC)', 'Aiko Solar', 'Jolywood'],
    futureImpact: 'Tandem IBC cells with perovskite top cell targeting 30%+ efficiency.',
    color: '#8B5CF6'
  }
];

// Manufacturing stages data
interface ManufacturingStage {
  name: string;
  yield: number;
  description: string;
  color: string;
}

const manufacturingStages: ManufacturingStage[] = [
  { name: 'Quartz Sand', yield: 100, description: 'Raw SiO₂ from mines', color: '#D4A574' },
  { name: 'MG-Silicon', yield: 90, description: '99% pure, arc furnace', color: '#9CA3AF' },
  { name: 'Polysilicon', yield: 85, description: '99.9999% Siemens CVD', color: '#60A5FA' },
  { name: 'Ingot (Cz)', yield: 80, description: 'Single crystal pulled', color: '#818CF8' },
  { name: 'Wafer', yield: 55, description: 'Wire saw, kerf loss!', color: '#F472B6' },
  { name: 'Cell', yield: 50, description: 'Doping, ARC, contacts', color: '#34D399' },
  { name: 'Module', yield: 48, description: 'Encapsulated, tested', color: '#FBBF24' }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_SolarManufacturingRenderer: React.FC<ELON_SolarManufacturingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();
// Simulation state — wafer thickness slider
  const [waferThickness, setWaferThickness] = useState(180); // μm, 180 = current, 80 = future
  const [cellTech, setCellTech] = useState<'PERC' | 'TOPCon' | 'HJT'>('PERC');

  // Twist phase — PERC vs TOPCon/HJT
  const [twistTech, setTwistTech] = useState<'PERC' | 'TOPCon' | 'HJT'>('PERC');

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
// Calculate manufacturing metrics
  const kerfWidth = 120; // μm typical
  const wafersPerMm = 1000 / (waferThickness + kerfWidth);
  const kerfLossPercent = (kerfWidth / (waferThickness + kerfWidth)) * 100;
  const materialUtilization = 100 - kerfLossPercent;
  const baseEfficiency: Record<string, number> = { PERC: 23.5, TOPCon: 25.5, HJT: 25.8 };
  const breakageRate = waferThickness < 120 ? (120 - waferThickness) * 0.15 : 0; // % breakage risk
  const costPerWatt = (0.25 - (180 - waferThickness) * 0.0008 + breakageRate * 0.002).toFixed(3);
  const cellEfficiency = baseEfficiency[cellTech] - (waferThickness < 140 ? (140 - waferThickness) * 0.005 : 0);

  // Twist calculations
  const twistData: Record<string, { eff: number; steps: number; voc: number; tempCoeff: number; cost: number }> = {
    PERC: { eff: 23.5, steps: 8, voc: 680, tempCoeff: -0.35, cost: 0.18 },
    TOPCon: { eff: 25.5, steps: 10, voc: 715, tempCoeff: -0.30, cost: 0.20 },
    HJT: { eff: 25.8, steps: 6, voc: 745, tempCoeff: -0.25, cost: 0.22 }
  };

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
    solar: '#FBBF24',
    silicon: '#818CF8',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'elon-solar-manufacturing',
        gameTitle: 'Solar Manufacturing',
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.solar})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.solar})`,
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

  // ---------------------------------------------------------------------------
  // SVG: Manufacturing Pipeline Visualization (complexity >= 15 elements)
  // ---------------------------------------------------------------------------
  const ManufacturingPipelineSVG = () => {
    const width = isMobile ? 340 : 520;
    const height = 480;
    const thicknessNorm = (waferThickness - 80) / 100; // 0 (80μm) to 1 (180μm)
    const stageWidth = (width - 80) / manufacturingStages.length;

    const yieldCurvePoints: { x: number; y: number }[] = [];
    const curveSteps = 14;
    for (let s = 0; s <= curveSteps; s++) {
      const t = s / curveSteps;
      const yieldVal = 100 - (100 - (48 - (180 - waferThickness) * 0.15)) * t * t;
      const px = 40 + t * (width - 80);
      const py = 40 + (1 - yieldVal / 100) * 300;
      yieldCurvePoints.push({ x: px, y: py });
    }
    const yieldCurveD = yieldCurvePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Solar Manufacturing visualization">
        <defs>
          <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="siliconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="yieldGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="kerfGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="waferGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <filter id="pipeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="stageGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="140" x2={width - 30} y2="140" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="220" x2={width - 30} y2="220" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="280" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Manufacturing Pipeline — Energy Concentration Yield
        </text>

        <text x={18} y={155} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, 18, 155)`}>
          Energy Yield (%)
        </text>
        <text x={width / 2} y={270} fill="#94a3b8" fontSize="11" textAnchor="middle">
          Manufacturing Stage
        </text>
        <path d={yieldCurveD} stroke="url(#yieldGrad)" strokeWidth="2.5" fill="none" />
        <circle cx={yieldCurvePoints[yieldCurvePoints.length - 1].x} cy={yieldCurvePoints[yieldCurvePoints.length - 1].y} r="9" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#pipeGlow)" />

        {/* Manufacturing flow — bars showing yield drop */}
        {manufacturingStages.map((stage, i) => {
          const x = 40 + i * stageWidth;
          const barHeight = (stage.yield / 100) * 180;
          const y = 240 - barHeight;
          return (
            <g key={stage.name}>
              {/* Yield bar */}
              <rect
                x={x + 4}
                y={y}
                width={stageWidth - 8}
                height={barHeight}
                rx="4"
                fill={stage.color}
                opacity={0.8}
              />
              {/* Yield % label */}
              <text
                x={x + stageWidth / 2}
                y={y - 6}
                fill={stage.color}
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                {stage.yield}%
              </text>
              {/* Stage name */}
              <text
                x={x + stageWidth / 2}
                y={254}
                fill={colors.textSecondary}
                fontSize="11"
                textAnchor="middle"
                fontWeight="500"
              >
                {["Sand","MG-Si","Poly","Ingot","Wafer","Cell","Module"][i]}
              </text>

              {/* Interactive dot on kerf loss step */}
              {stage.name === 'Wafer' && (
                <circle
                  cx={x + stageWidth / 2}
                  cy={y + barHeight / 2}
                  r="5"
                  fill={colors.error}
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}

        {/* Kerf loss indicator */}
        <rect x={40} y={290} width={width - 80} height="28" rx="6" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.3)" />
        <text x={width / 2} y={308} fill={colors.error} fontSize="12" fontWeight="600" textAnchor="middle">
          Kerf Loss: {kerfLossPercent.toFixed(1)}% | Wafer: {waferThickness}μm | Used: {materialUtilization.toFixed(1)}%
        </text>

        {/* Formula */}
        <text x={width / 2} y={338} fill={colors.textMuted} fontSize="12" fontWeight="600" textAnchor="middle">
          Kerf% = kerfWidth / (waferThickness + kerfWidth) × 100
        </text>

        {/* Bottom stats row */}
        <text x={width * 0.18} y={368} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          Wafers/mm: {wafersPerMm.toFixed(2)}
        </text>
        <text x={width * 0.50} y={368} fill={colors.success} fontSize="11" fontWeight="600" textAnchor="middle">
          Cell Eff: {cellEfficiency.toFixed(1)}%
        </text>
        <text x={width * 0.82} y={368} fill={colors.solar} fontSize="11" fontWeight="600" textAnchor="middle">
          Cost: ${costPerWatt}/W
        </text>

        {/* Thickness indicator bar */}
        <rect x={40} y={390} width={width - 80} height="11" rx="5" fill={colors.border} />
        <rect x={40} y={390} width={(width - 80) * thicknessNorm} height="11" rx="5" fill="url(#waferGrad)" />
        <circle
          cx={40 + (width - 80) * thicknessNorm}
          cy={395}
          r="7"
          fill={colors.silicon}
          stroke="white"
          strokeWidth="2"
          filter="url(#stageGlow)"
        />

        {/* Legend */}
        <circle cx={60} cy={425} r="4" fill={colors.error} />
        <text x={72} y={429} fill="#94a3b8" fontSize="11">Kerf Loss</text>
        <circle cx={160} cy={425} r="4" fill={colors.success} />
        <text x={172} y={429} fill="#94a3b8" fontSize="11">Yield</text>
        <circle cx={250} cy={425} r="4" fill={colors.silicon} />
        <text x={262} y={429} fill="#94a3b8" fontSize="11">Thickness</text>

        {/* Breakage warning */}
        {breakageRate > 0 && (
          <text x={width / 2} y={455} fill={colors.error} fontSize="11" fontWeight="600" textAnchor="middle">
            Breakage Risk: {breakageRate.toFixed(1)}% at {waferThickness}μm
          </text>
        )}
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // SVG: Technology Comparison (Twist Phase)
  // ---------------------------------------------------------------------------
  const TechComparisonSVG = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const techs = ['PERC', 'TOPCon', 'HJT'] as const;
    const barGroupWidth = (width - 100) / 3;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="percGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="topconGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="hjtGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <filter id="techGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        <line x1="50" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="50" y1="100" x2={width - 30} y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="50" y1="150" x2={width - 30} y2="150" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="50" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Cell Technology Comparison — {twistTech}
        </text>

        {/* Efficiency bars */}
        {techs.map((tech, i) => {
          const x = 50 + i * barGroupWidth + 10;
          const barW = barGroupWidth - 20;
          const effH = (twistData[tech].eff / 30) * 180;
          const y = 230 - effH;
          const isSelected = twistTech === tech;
          const gradId = tech === 'PERC' ? 'percGrad' : tech === 'TOPCon' ? 'topconGrad' : 'hjtGrad';

          return (
            <g key={tech}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={effH}
                rx="4"
                fill={`url(#${gradId})`}
                opacity={isSelected ? 1 : 0.4}
                filter={isSelected ? 'url(#techGlow)' : undefined}
              />
              <text x={x + barW / 2} y={y - 8} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
                {twistData[tech].eff}%
              </text>
              <text x={x + barW / 2} y={248} fill={isSelected ? colors.textPrimary : colors.textMuted} fontSize="12" fontWeight={isSelected ? '700' : '400'} textAnchor="middle">
                {tech}
              </text>
              {/* Voc marker */}
              <circle
                cx={x + barW / 2}
                cy={y + effH / 2}
                r={isSelected ? 8 : 6}
                fill="white"
                opacity={0.9}
                filter={isSelected ? 'url(#techGlow)' : undefined}
              />
              <text x={x + barW / 2} y={y + effH / 2 + 4} fill={colors.bgPrimary} fontSize="11" fontWeight="700" textAnchor="middle">
                {twistData[tech].voc}
              </text>
            </g>
          );
        })}

        {/* Axis label */}
        <text x={25} y={140} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, 25, 140)`}>
          Efficiency (%)
        </text>

        {/* Selected tech details */}
        <rect x={40} y={265} width={width - 80} height="42" rx="8" fill="rgba(249,115,22,0.1)" stroke="rgba(249,115,22,0.3)" />
        <text x={width / 2} y={282} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          {twistTech}: Voc={twistData[twistTech].voc}mV | Steps={twistData[twistTech].steps} | TempCoeff={twistData[twistTech].tempCoeff}%/°C
        </text>
        <text x={width / 2} y={300} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Cost: ${twistData[twistTech].cost}/W | Complexity: {twistData[twistTech].steps} process steps
        </text>
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
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            ☀️🏭
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Solar Manufacturing
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            &quot;The journey from <span style={{ color: colors.solar }}>beach sand to solar electricity</span> is one of the most remarkable transformations in manufacturing — turning common quartz into devices that convert photons to electrons with over 25% efficiency.&quot;
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              &quot;Every solar panel starts as sand on a beach. The transformation from SiO₂ to a 25%-efficient photovoltaic cell requires temperatures exceeding 1400°C, purity of 99.9999%, and precision measured in micrometers. Yet the result costs less than $0.20 per watt.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Solar Cell Manufacturing Principles
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
      { id: 'a', text: 'Less than 5% — wire saws are very precise' },
      { id: 'b', text: 'About 10% — a small but acceptable amount' },
      { id: 'c', text: 'About 30-40% — a shocking amount of expensive silicon' },
      { id: 'd', text: 'Over 50% — more wasted than used' },
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
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What percentage of a silicon ingot is wasted as &quot;kerf loss&quot; when cutting wafers?
            </h2>

            {/* Static SVG showing wire saw concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="ingotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                  <linearGradient id="dustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Wire Saw Cutting a Silicon Ingot</text>
                {/* Ingot block */}
                <rect x="60" y="40" width="280" height="80" rx="6" fill="url(#ingotGrad)" />
                <text x="200" y="85" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Silicon Ingot (Czochralski)</text>
                {/* Wire saw lines */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <line key={i} x1={90 + i * 30} y1="38" x2={90 + i * 30} y2="122" stroke="#FBBF24" strokeWidth="1.5" opacity="0.7" />
                ))}
                {/* Kerf dust */}
                <rect x="60" y="130" width="280" height="20" rx="4" fill="url(#dustGrad)" opacity="0.6" />
                <text x="200" y="145" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Kerf loss — silicon dust (wasted!)</text>
                {/* Question mark */}
                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="12">How much of the ingot becomes dust?</text>
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
              ← Back
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

  // PLAY PHASE - Interactive Manufacturing Flow Simulator
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
              Solar Manufacturing Flow Simulator
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
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Solar manufacturing is the fastest-growing energy technology on Earth. Understanding the process from quartz to panel reveals where cost reduction and efficiency gains come from — and why &quot;kerf loss&quot; is one of the industry&#39;s biggest challenges.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Kerf Loss</strong> is defined as the ratio of silicon destroyed as dust when a wire saw cuts through an ingot — calculated as kerfWidth / (waferThickness + kerfWidth).
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Wafer Thickness</strong> determines how much silicon each cell uses. Thinner wafers save material but are more fragile.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.solar }}>Cell Efficiency</strong> is the percentage of incoming sunlight converted to electricity — the key metric for any solar technology.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows the complete manufacturing pipeline from quartz sand to finished module. Adjust the wafer thickness slider to see how thinner wafers change kerf loss, material utilization, breakage risk, and cost per watt. Try different cell technologies to compare their efficiency ceilings.
            </p>

            {/* Main visualization - side by side on desktop */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <ManufacturingPipelineSVG />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Cell technology selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Cell Technology</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {cellTech} ({cellEfficiency.toFixed(1)}% efficiency)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(['PERC', 'TOPCon', 'HJT'] as const).map((tech) => (
                        <button
                          key={tech}
                          onClick={() => { playSound('click'); setCellTech(tech); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: cellTech === tech ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                            background: cellTech === tech ? `${colors.accent}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            minHeight: '44px',
                          }}
                        >
                          {tech}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wafer thickness slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Wafer Thickness</span>
                      <span style={{ ...typo.small, color: colors.silicon, fontWeight: 600 }}>
                        {waferThickness}μm {waferThickness <= 120 ? '(ultra-thin!)' : waferThickness <= 150 ? '(thin)' : '(standard)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="180"
                      step="5"
                      value={waferThickness}
                      onChange={(e) => setWaferThickness(parseInt(e.target.value))}
                      onInput={(e) => setWaferThickness(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Wafer Thickness"
                      style={sliderStyle(colors.silicon, waferThickness, 80, 180)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.success }}>80μm (future)</span>
                      <span style={{ ...typo.small, color: colors.silicon }}>180μm (current)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>{kerfLossPercent.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Kerf Loss</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{cellEfficiency.toFixed(1)}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Cell Efficiency</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.solar }}>${costPerWatt}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Cost/Watt</div>
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Process
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
              The Manufacturing Journey: Sand to Solar
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'c'
                ? 'Correct! Your prediction was right — about 30-40% of expensive polysilicon is lost as kerf dust during wire sawing. This is one of the biggest cost and waste challenges in solar manufacturing.'
                : 'As you observed in the simulator, about 30-40% of the silicon ingot becomes kerf dust — wasted material that drives up cost. With 180μm wafers and 120μm saw cuts, nearly as much silicon is destroyed as ends up in cells.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Kerf Loss = Wire Width / (Wafer + Wire Width)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  With standard <span style={{ color: colors.silicon }}>180μm wafers</span> and <span style={{ color: colors.error }}>120μm wire kerf</span>, the loss is 120/(180+120) = <span style={{ color: colors.accent }}>40%</span>. Thinner wafers actually make this worse unless wire diameter also shrinks.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  At 180μm: 40% loss | At 130μm: 48% loss | At 80μm: <strong>60% loss!</strong>
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                The 7-Step Journey
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {manufacturingStages.map((stage, i) => (
                  <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: stage.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: colors.bgPrimary,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{stage.name}</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}> — {stage.description}</span>
                    </div>
                    <span style={{ ...typo.small, color: stage.color, fontWeight: 600 }}>{stage.yield}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Swanson&#39;s Law: The Learning Curve
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Solar module prices drop ~20% for every doubling of cumulative production. From $76/W in 1977 to less than $0.20/W today — a staggering 99.7% cost reduction. This is driven by larger ingots, thinner wafers, higher efficiency, and massive manufacturing scale.
              </p>
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
              ← Back
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
      { id: 'a', text: 'Only changes one process step — a simple drop-in replacement' },
      { id: 'b', text: 'Adds complexity but raises efficiency ceiling from ~24% to 26%+' },
      { id: 'c', text: 'Simplifies manufacturing and reduces cost immediately' },
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
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: PERC to TOPCon/HJT Transition
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Switching from PERC to TOPCon cells — what does this mean for manufacturing?
            </h2>

            {/* Static SVG showing PERC vs TOPCon */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="percCompGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="topconCompGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                </defs>
                <text x="100" y="22" textAnchor="middle" fill="#60A5FA" fontSize="13" fontWeight="700">PERC (~24%)</text>
                <rect x="20" y="30" width="160" height="35" rx="6" fill="url(#percCompGrad)" opacity="0.7" />
                <text x="100" y="53" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">8 process steps</text>
                <text x="300" y="22" textAnchor="middle" fill="#FBBF24" fontSize="13" fontWeight="700">TOPCon (~26%)</text>
                <rect x="220" y="30" width="160" height="35" rx="6" fill="url(#topconCompGrad)" opacity="0.7" />
                <text x="300" y="53" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">10 process steps</text>
                <text x="200" y="90" textAnchor="middle" fill={colors.warning} fontSize="13" fontWeight="700">More complexity → Higher efficiency?</text>
                <text x="200" y="115" textAnchor="middle" fill="#94a3b8" fontSize="11">Or does simpler HJT (6 steps, 26%+) win?</text>
                <text x="200" y="135" textAnchor="middle" fill="#94a3b8" fontSize="11">The industry is making this choice RIGHT NOW</text>
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
              ← Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See the Technology Comparison
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Technology Comparison
  if (phase === 'twist_play') {
    const currentTwist = twistData[twistTech];

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
              Cell Technology Explorer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Compare PERC, TOPCon, and HJT — the three architectures battling for solar dominance
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
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <TechComparisonSVG />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> This chart compares three competing solar cell architectures — PERC, TOPCon, and HJT — showing their efficiency ceilings, open-circuit voltage, and manufacturing complexity side by side.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you switch between technologies, notice how higher efficiency comes with tradeoffs in process complexity and cost — HJT has fewer steps but requires expensive equipment, while TOPCon adds steps to existing PERC lines.</p>
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Technology selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Select Technology</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {twistTech} — {currentTwist.eff}% peak efficiency
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(['PERC', 'TOPCon', 'HJT'] as const).map((tech) => (
                        <button
                          key={tech}
                          onClick={() => { playSound('click'); setTwistTech(tech); }}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: twistTech === tech ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                            background: twistTech === tech ? `${colors.accent}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: twistTech === tech ? 700 : 400,
                            minHeight: '44px',
                            flex: 1,
                          }}
                        >
                          {tech}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detailed comparison grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>{currentTwist.eff}%</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Peak Efficiency</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{currentTwist.voc}mV</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Open-Circuit Voltage</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>{currentTwist.steps}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Process Steps</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.silicon }}>{currentTwist.tempCoeff}%/°C</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Temp Coefficient</div>
                    </div>
                  </div>

                  {/* Technology description */}
                  <div style={{
                    background: `${colors.accent}11`,
                    border: `1px solid ${colors.accent}33`,
                    borderRadius: '12px',
                    padding: '16px',
                  }}>
                    {twistTech === 'PERC' && (
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                        <strong style={{ color: colors.accent }}>PERC</strong> (Passivated Emitter and Rear Cell) is the workhorse of solar: rear dielectric passivation reduces recombination, boosting efficiency to ~24%. Mature, proven, but approaching its theoretical limit.
                      </p>
                    )}
                    {twistTech === 'TOPCon' && (
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                        <strong style={{ color: colors.accent }}>TOPCon</strong> (Tunnel Oxide Passivated Contact) adds an ultra-thin oxide + poly-Si layer for carrier-selective contacts. More complex (10 steps) but raises the ceiling to 26%+. The current industry transition target.
                      </p>
                    )}
                    {twistTech === 'HJT' && (
                      <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                        <strong style={{ color: colors.accent }}>HJT</strong> (Heterojunction) deposits amorphous silicon at low temperature (&lt;200°C). Fewest steps (6), highest Voc (745mV), best temperature coefficient. But requires expensive equipment and indium-tin-oxide (ITO) contacts.
                      </p>
                    )}
                  </div>
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
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Technology Shift
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Technology Transition: Why It Matters
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Efficiency Ceiling</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>PERC: ~24% | TOPCon: ~26% | HJT: ~26.5% | Tandem: ~30%+</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  PERC is approaching its theoretical limit. The industry MUST transition to n-type architectures (TOPCon or HJT) to continue efficiency gains. Each 1% absolute efficiency gain reduces balance-of-system cost by ~4%.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Passivation Revolution</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The key difference is surface passivation quality. PERC uses Al₂O₃ on the rear only. TOPCon uses tunnel oxide + poly-Si for full-area passivated contacts. HJT uses intrinsic amorphous silicon on BOTH surfaces. Better passivation = higher voltage = higher efficiency.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Solar manufacturing is in the middle of a massive technology transition. Billions of dollars in PERC equipment may become obsolete. Companies that bet correctly on TOPCon vs HJT will dominate the next decade. The answer may be neither — perovskite-silicon tandems could leapfrog both.
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
              ← Back
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
        conceptName="E L O N_ Solar Manufacturing"
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
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
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
                      // Auto-advance to next uncompleted app, or to test if all done
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i > idx);
                      if (nextUncompleted === -1) {
                        // Check if all are now completed
                        if (newCompleted.every(c => c)) {
                          setTimeout(() => goToPhase('test'), 400);
                        } else {
                          // Find first uncompleted from beginning
                          const firstUncompleted = newCompleted.findIndex(c => !c);
                          if (firstUncompleted !== -1) {
                            setSelectedApp(firstUncompleted);
                          }
                        }
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
              ← Back
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
            paddingTop: '60px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand solar cell manufacturing from sand to panel!' : 'Review the manufacturing process and try again.'}
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
                  Review &amp; Try Again
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
              Knowledge Test: Solar Manufacturing
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of solar cell manufacturing to real-world scenarios. Each question covers a different aspect of the manufacturing chain — from silicon purification to cell architecture to module assembly. Consider the tradeoffs between cost, efficiency, and complexity.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
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
                ← Previous
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
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Solar Manufacturing Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the remarkable journey from beach sand to solar electricity — and the manufacturing choices that determine cost, efficiency, and the future of clean energy.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Sand → MG-Si → Poly-Si → Ingot → Wafer → Cell → Module',
                'Kerf loss wastes 30-40% of expensive polysilicon',
                'Thinner wafers save material but increase breakage',
                'PERC → TOPCon/HJT: higher efficiency, more complexity',
                'Swanson\'s Law: 20% cost drop per production doubling',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
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

export default ELON_SolarManufacturingRenderer;
