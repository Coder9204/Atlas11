'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Fluorescence Physics - Complete 10-Phase Game
// Understanding how materials absorb UV light and emit visible light
// ─────────────────────────────────────────────────────────────────────────────

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

interface FluorescenceRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A student shines a UV flashlight on various objects in a dark room. Some objects begin to glow brightly in visible colors, while others remain dark.",
    question: "What is the fundamental process that causes certain materials to glow under UV light?",
    options: [
      { id: 'a', label: "The UV light reflects off the surface and changes color" },
      { id: 'b', label: "Fluorescent molecules absorb UV photons and re-emit lower-energy visible light photons", correct: true },
      { id: 'c', label: "The materials contain tiny LEDs that activate when exposed to UV" },
      { id: 'd', label: "UV light chemically reacts with the material to produce new glowing compounds" }
    ],
    explanation: "Fluorescence occurs when molecules absorb high-energy UV photons, which excite electrons to higher energy states. These electrons then relax back down, releasing the energy as visible light photons."
  },
  {
    scenario: "At a party, black light posters on the walls display vivid neon colors that seem to glow intensely, while a regular printed photograph nearby appears dull and barely visible.",
    question: "Why do black light posters glow so brightly while regular photographs do not?",
    options: [
      { id: 'a', label: "Black light posters are printed with special fluorescent inks that absorb UV and emit visible light", correct: true },
      { id: 'b', label: "Regular photographs absorb all the UV light without releasing any" },
      { id: 'c', label: "The black light only illuminates certain color pigments" },
      { id: 'd', label: "Black light posters have a battery-powered backlight" }
    ],
    explanation: "Black light posters use fluorescent inks specifically designed to absorb UV radiation efficiently and re-emit it as bright visible light."
  },
  {
    scenario: "An office manager notices that fluorescent tube lights consume far less electricity than incandescent bulbs while producing similar brightness. Inside the fluorescent tube, mercury vapor produces UV light.",
    question: "How does a fluorescent light tube convert this UV light into the white light we see?",
    options: [
      { id: 'a', label: "The glass tube filters the UV and only allows white light through" },
      { id: 'b', label: "A phosphor coating on the inside of the tube absorbs UV and fluoresces visible white light", correct: true },
      { id: 'c', label: "The mercury vapor directly produces white light at high temperatures" },
      { id: 'd', label: "Multiple colored gases mix together to create white light" }
    ],
    explanation: "Fluorescent tubes work by a two-step process: electrical current excites mercury vapor to produce UV light, then a phosphor coating absorbs this UV and fluoresces visible light."
  },
  {
    scenario: "A forensic investigator uses a UV lamp to examine a document. The yellow highlighter marks, which appear pale yellow in normal light, now glow an intense bright green under the UV lamp.",
    question: "Why does the highlighter appear a different, more intense color under UV light compared to normal light?",
    options: [
      { id: 'a', label: "UV light is stronger and makes all colors more vivid" },
      { id: 'b', label: "The fluorescent dye absorbs UV and emits green light, adding to the reflected yellow to create intense brightness", correct: true },
      { id: 'c', label: "The ink chemically changes color when exposed to UV" },
      { id: 'd', label: "Our eyes perceive UV light as green" }
    ],
    explanation: "Highlighter ink contains fluorescent dyes that reflect yellow light AND absorb UV light and fluoresce green. Under UV, you see both effects, creating unusual brightness."
  },
  {
    scenario: "A photophysics researcher measures that a fluorescent dye absorbs light at 350 nm (UV) but emits at 520 nm (green visible light). She notes this wavelength difference is essential for imaging.",
    question: "What is this wavelength difference between absorption and emission called, and why does it always occur?",
    options: [
      { id: 'a', label: "Chromatic shift - the molecule changes its chemical structure during fluorescence" },
      { id: 'b', label: "Stokes shift - energy is lost to molecular vibrations and heat before emission", correct: true },
      { id: 'c', label: "Quantum tunneling - some photon energy escapes through quantum effects" },
      { id: 'd', label: "Reflection loss - part of the light bounces away before being absorbed" }
    ],
    explanation: "The Stokes shift describes the difference between absorption and emission wavelengths. After absorption, some energy is lost as heat before emission, so emitted photons have less energy (longer wavelength)."
  },
  {
    scenario: "A cell biologist uses fluorescence microscopy to study protein locations inside living cells. She labels a specific protein with GFP (Green Fluorescent Protein) and can see exactly where that protein exists in the cell.",
    question: "Why is fluorescence microscopy particularly powerful for studying specific structures in cells?",
    options: [
      { id: 'a', label: "It magnifies cells more than regular microscopes" },
      { id: 'b', label: "Fluorescent labels can target specific molecules, and the Stokes shift allows emission to be separated from background", correct: true },
      { id: 'c', label: "All cell components naturally fluoresce in different colors" },
      { id: 'd', label: "Fluorescent light penetrates deeper into thick samples" }
    ],
    explanation: "Fluorescence microscopy is powerful because fluorescent labels target specific molecules, and the Stokes shift allows filters to separate emission from excitation light."
  },
  {
    scenario: "A child notices that glow-in-the-dark stars on their ceiling continue glowing for several minutes after the lights are turned off, while their fluorescent poster stops glowing immediately when the UV lamp is switched off.",
    question: "What fundamental difference explains why phosphorescent materials glow long after excitation while fluorescent materials stop immediately?",
    options: [
      { id: 'a', label: "Phosphorescent materials store more light energy in their chemical bonds" },
      { id: 'b', label: "Phosphorescence involves a 'forbidden' triplet state transition that occurs slowly, while fluorescence uses allowed transitions", correct: true },
      { id: 'c', label: "Phosphorescent materials have larger molecules that release energy more slowly" },
      { id: 'd', label: "Fluorescent materials convert all their energy to heat instead of storing it" }
    ],
    explanation: "In fluorescence, electrons return via 'allowed' transitions in nanoseconds. In phosphorescence, electrons enter a triplet state where the return is 'forbidden' and happens slowly (milliseconds to hours)."
  },
  {
    scenario: "A biochemist studies protein interactions using FRET (Forster Resonance Energy Transfer). She labels one protein with cyan and another with yellow fluorescent protein. When the proteins bind, cyan emission decreases while yellow emission appears.",
    question: "What physical mechanism allows energy to transfer between the two fluorescent labels when the proteins interact?",
    options: [
      { id: 'a', label: "The proteins physically merge, combining their fluorescent properties" },
      { id: 'b', label: "Non-radiative dipole-dipole coupling transfers energy between nearby fluorophores without emitting a photon", correct: true },
      { id: 'c', label: "The cyan fluorophore emits a photon that the yellow one absorbs" },
      { id: 'd', label: "Chemical bonds form between the two fluorescent labels" }
    ],
    explanation: "FRET occurs through non-radiative energy transfer via electromagnetic dipole-dipole coupling. This only works when fluorophores are very close (1-10 nm)."
  },
  {
    scenario: "A materials scientist compares two fluorescent dyes for a sensor application. Dye A has a quantum yield of 0.95, while Dye B has a quantum yield of 0.15. Both absorb the same wavelength of light.",
    question: "What does quantum yield measure, and why would Dye A be preferred for a brightness-critical application?",
    options: [
      { id: 'a', label: "Quantum yield measures color purity; Dye A produces more saturated colors" },
      { id: 'b', label: "Quantum yield is the ratio of photons emitted to photons absorbed; Dye A converts 95% of absorbed photons to fluorescence", correct: true },
      { id: 'c', label: "Quantum yield measures how fast the dye fluoresces; Dye A glows more quickly" },
      { id: 'd', label: "Quantum yield measures the wavelength shift; Dye A has a larger Stokes shift" }
    ],
    explanation: "Quantum yield is the ratio of photons emitted to photons absorbed. A QY of 0.95 means 95% of absorbed photons result in fluorescence emission."
  },
  {
    scenario: "A microscopist observes a fluorescently-labeled cell over time. After several minutes of continuous UV exposure, the fluorescence signal gradually fades until the cell is barely visible, even though the UV lamp intensity remains constant.",
    question: "What causes this permanent loss of fluorescence, and why is it a concern in fluorescence imaging?",
    options: [
      { id: 'a', label: "The fluorescent molecules migrate out of the illuminated area" },
      { id: 'b', label: "Photobleaching - reactive oxygen species generated during fluorescence irreversibly destroy the fluorophore molecules", correct: true },
      { id: 'c', label: "The UV lamp gradually weakens over time" },
      { id: 'd', label: "The cell membrane blocks UV light increasingly over time" }
    ],
    explanation: "Photobleaching occurs when fluorophores are permanently destroyed through photochemical reactions with reactive oxygen species generated during excitation."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Fluorescence Microscopy',
    short: 'Illuminating the invisible machinery of life',
    tagline: 'See individual molecules inside living cells',
    description: 'Fluorescence microscopy uses fluorescent dyes and proteins (like GFP) to tag specific molecules in cells, allowing scientists to watch proteins move, cells divide, and diseases progress in real time with incredible precision.',
    connection: 'The Stokes shift you learned about - absorbing UV/blue light and emitting green/red - allows microscopes to filter out excitation light and see only the fluorescent signal from labeled molecules.',
    howItWorks: 'Specimens are labeled with fluorescent molecules that bind to specific targets. UV or blue light excites the fluorophores, which emit longer-wavelength light. Filters block the excitation light, letting only fluorescence reach the detector.',
    stats: [
      { value: '20 nm', label: 'Super-resolution limit', icon: '🔍' },
      { value: '$6B', label: 'Microscopy market', icon: '💰' },
      { value: '200×', label: 'Magnification range', icon: '🏆' }
    ],
    examples: ['Cancer cell tracking', 'Neuron activity imaging', 'Protein localization studies', 'Live cell imaging'],
    companies: ['Zeiss', 'Leica Microsystems', 'Nikon Instruments', 'Olympus'],
    futureImpact: 'Expansion microscopy and new fluorophores will enable nanometer-scale imaging of individual proteins in living tissue.',
    color: '#22C55E'
  },
  {
    icon: '🧬',
    title: 'DNA Sequencing',
    short: 'Reading the genetic code with fluorescent markers',
    tagline: 'Four colors spell out lifes instructions',
    description: 'Modern DNA sequencing uses four different fluorescent dyes - one for each base (A, T, G, C). As DNA is synthesized, each added base emits a specific color, allowing machines to read genetic sequences at millions of bases per hour.',
    connection: 'Each dye absorbs the same excitation wavelength but emits a different color due to its unique molecular structure - the same fluorescence principles you explored with different substances.',
    howItWorks: 'In Illumina sequencing, DNA fragments are amplified on a chip. Fluorescently labeled nucleotides are added one at a time. After each addition, a camera captures which color each spot emits, recording the sequence.',
    stats: [
      { value: '$1B', label: 'First human genome cost', icon: '💰' },
      { value: '$200', label: 'Current genome cost', icon: '📉' },
      { value: '600 GB', label: 'Data per sequencing run', icon: '💾' }
    ],
    examples: ['Whole genome sequencing', 'Cancer mutation detection', 'Prenatal genetic testing', 'Pathogen identification'],
    companies: ['Illumina', 'Pacific Biosciences', 'Oxford Nanopore', 'BGI Genomics'],
    futureImpact: 'Single-molecule sequencing will enable real-time reading of DNA modifications, revealing the epigenetic code.',
    color: '#3B82F6'
  },
  {
    icon: '💡',
    title: 'Fluorescent Lighting',
    short: 'Efficient illumination through phosphor conversion',
    tagline: 'Mercury UV becomes visible light',
    description: 'Fluorescent tubes generate UV light from mercury vapor, then convert it to visible white light using phosphor coatings on the tube walls. This two-step process is 4-5 times more efficient than incandescent bulbs.',
    connection: 'The phosphor coating demonstrates the Stokes shift perfectly: it absorbs invisible UV photons and re-emits visible photons, with the energy difference released as heat.',
    howItWorks: 'Electric current excites mercury vapor, producing UV at 254 nm. Phosphor crystals on the tube interior absorb UV and emit visible light. Different phosphor mixtures create warm or cool white light.',
    stats: [
      { value: '100 lm/W', label: 'Fluorescent efficacy', icon: '💡' },
      { value: '15 lm/W', label: 'Incandescent efficacy', icon: '🔥' },
      { value: '10000 hrs', label: 'Typical tube lifespan', icon: '⏰' }
    ],
    examples: ['Office lighting', 'Compact fluorescent bulbs', 'Blacklight fixtures', 'Aquarium lighting'],
    companies: ['Philips Lighting', 'Osram', 'GE Lighting', 'Sylvania'],
    futureImpact: 'LED phosphor technology is replacing fluorescent tubes, using blue LEDs with phosphor conversion for even greater efficiency.',
    color: '#F59E0B'
  },
  {
    icon: '🏥',
    title: 'Medical Diagnostics',
    short: 'Detecting diseases with glowing antibodies',
    tagline: 'Your immune system lights up infections',
    description: 'Immunofluorescence tests use antibodies labeled with fluorescent dyes to detect specific pathogens, autoimmune conditions, and cancer markers. From COVID tests to cancer screening, fluorescence saves millions of lives.',
    connection: 'Antibodies tagged with fluorophores work like molecular highlighters - they bind only to specific targets, and the fluorescence reveals exactly where those targets are located.',
    howItWorks: 'Fluorescent antibodies are added to patient samples (blood, tissue). They bind to specific antigens (viral proteins, cancer markers). UV excitation reveals bound antibodies as bright spots, indicating positive detection.',
    stats: [
      { value: '$25B', label: 'Immunodiagnostics market', icon: '💰' },
      { value: '5 minutes', label: 'Rapid test results', icon: '⏱️' },
      { value: '99%', label: 'Sensitivity achievable', icon: '🎯' }
    ],
    examples: ['COVID-19 antigen tests', 'HIV screening', 'Autoimmune disease diagnosis', 'Cancer biomarker detection'],
    companies: ['Roche Diagnostics', 'Abbott', 'Siemens Healthineers', 'Bio-Rad'],
    futureImpact: 'Quantum dot fluorophores will enable multiplexed tests detecting dozens of diseases from a single drop of blood.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FluorescenceRenderer: React.FC<FluorescenceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [uvIntensity, setUvIntensity] = useState(50);

  // Twist phase - phosphorescence and quantum yield
  const [excitationWavelength, setExcitationWavelength] = useState(365);

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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6',
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
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
        gameType: 'fluorescence',
        gameTitle: 'Fluorescence Physics',
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
  }, [phase, goToPhase, phaseOrder]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Helper to convert wavelength to color
  const wavelengthToColor = (wavelength: number): string => {
    if (wavelength < 380) return '#8b5cf6';
    if (wavelength < 450) return '#3b82f6';
    if (wavelength < 495) return '#06b6d4';
    if (wavelength < 570) return '#22c55e';
    if (wavelength < 590) return '#eab308';
    if (wavelength < 620) return '#f97316';
    if (wavelength < 700) return '#ef4444';
    return '#7f1d1d';
  };

  // Slider style
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    accentColor: '#3b82f6',
    cursor: 'pointer',
  };

  // Progress bar render function
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots render function
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
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
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

  // Navigation bar render function - with back button
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '48px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1001,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={prevPhase}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.textSecondary,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px 8px',
            minHeight: '44px',
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: '20px' }}>🔦</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Fluorescence</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Fluorescence Intensity Chart SVG - render function (not a component)
  // Shows emission intensity vs wavelength, controlled by UV intensity slider
  // ─────────────────────────────────────────────────────────────────────────────
  const renderFluorescenceChart = (intensity: number, showControls: boolean = true) => {
    const svgW = 460;
    const svgH = 320;
    const pad = { top: 30, right: 30, bottom: 50, left: 55 };
    const plotW = svgW - pad.left - pad.right;
    const plotH = svgH - pad.top - pad.bottom;

    // Emission spectrum as Gaussian curve - intensity scales with UV power
    const emissionPeak = 520; // nm - green emission
    const excitationPeak = 365; // nm - UV excitation
    const emissionWidth = 40;
    const excitationWidth = 15;
    const scale = intensity / 100;

    // Generate wavelength points from 300 to 700 nm
    const nPoints = 40;
    const wlMin = 300;
    const wlMax = 700;

    const toX = (wl: number) => pad.left + ((wl - wlMin) / (wlMax - wlMin)) * plotW;
    const toY = (val: number) => pad.top + plotH - val * plotH;

    // Excitation spectrum (UV absorption)
    const excitationPoints: string[] = [];
    for (let i = 0; i <= nPoints; i++) {
      const wl = wlMin + (i / nPoints) * (wlMax - wlMin);
      const val = Math.exp(-0.5 * ((wl - excitationPeak) / excitationWidth) ** 2) * 0.85;
      excitationPoints.push(`${i === 0 ? 'M' : 'L'} ${toX(wl).toFixed(1)} ${toY(val).toFixed(1)}`);
    }

    // Emission spectrum (visible light)
    const emissionPoints: string[] = [];
    for (let i = 0; i <= nPoints; i++) {
      const wl = wlMin + (i / nPoints) * (wlMax - wlMin);
      const val = Math.exp(-0.5 * ((wl - emissionPeak) / emissionWidth) ** 2) * scale;
      emissionPoints.push(`${i === 0 ? 'M' : 'L'} ${toX(wl).toFixed(1)} ${toY(val).toFixed(1)}`);
    }

    // Interactive point on emission curve at peak
    const peakY = toY(scale);
    const peakX = toX(emissionPeak);

    // Stokes shift indicator position
    const stokesX1 = toX(excitationPeak);
    const stokesX2 = toX(emissionPeak);

    // Grid lines
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * plotH;
      gridLines.push(y);
    }
    const wlTicks = [350, 400, 450, 500, 550, 600, 650];

    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: '100%' }} role="img" aria-label="Fluorescence emission intensity vs wavelength chart">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="emissionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="exciteFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={svgW} height={svgH} fill="#1a1a24" rx="8" />

        {/* Grid lines */}
        <g className="grid-lines">
          {gridLines.map((y, i) => (
            <line key={`h${i}`} x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          ))}
          {wlTicks.map((wl, i) => (
            <line key={`v${i}`} x1={toX(wl)} y1={pad.top} x2={toX(wl)} y2={pad.top + plotH} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
          ))}
        </g>

        {/* Axes */}
        <g className="axes">
          {/* Y axis */}
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#64748b" strokeWidth="1.5" />
          {/* X axis */}
          <line x1={pad.left} y1={pad.top + plotH} x2={svgW - pad.right} y2={pad.top + plotH} stroke="#64748b" strokeWidth="1.5" />
        </g>

        {/* Axis labels */}
        <g className="axis-labels">
          <text x={12} y={pad.top + plotH / 2} textAnchor="end" fill={colors.textSecondary} fontSize="12" transform={`rotate(-90, ${12}, ${pad.top + plotH / 2})`}>Intensity (a.u.)</text>
          <text x={pad.left + plotW / 2} y={svgH - 8} textAnchor="middle" fill={colors.textSecondary} fontSize="12">Wavelength (nm)</text>

          {/* Tick labels on X axis */}
          {wlTicks.map((wl, i) => (
            <text key={`xt${i}`} x={toX(wl)} y={pad.top + plotH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">{wl}</text>
          ))}

          {/* Y axis tick labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((v, i) => (
            <text key={`yt${i}`} x={pad.left - 12} y={toY(v) + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">{v.toFixed(1)}</text>
          ))}
        </g>

        {/* Curves */}
        <g className="curves">
          {/* Excitation curve (UV absorption) */}
          <path d={excitationPoints.join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />

          {/* Emission curve (visible fluorescence) - area fill */}
          <path d={emissionPoints.join(' ') + ` L ${toX(wlMax).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(wlMin).toFixed(1)} ${toY(0).toFixed(1)} Z`} fill="url(#emissionFill)" />
          {/* Emission curve stroke */}
          <path d={emissionPoints.join(' ')} fill="none" stroke="#22c55e" strokeWidth="2.5" />
        </g>

        {/* Stokes shift annotation */}
        <g className="stokes-shift">
          <line x1={stokesX1} y1={toY(0.4)} x2={stokesX2} y2={toY(0.4)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 3" />
          <text x={(stokesX1 + stokesX2) / 2} y={toY(0.4) - 8} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">Stokes Shift</text>
          <text x={(stokesX1 + stokesX2) / 2} y={toY(0.4) + 16} textAnchor="middle" fill="#f59e0b" fontSize="11">{emissionPeak - excitationPeak} nm</text>
        </g>

        {/* Peak labels */}
        <text x={stokesX1} y={pad.top + 16} textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="600">UV Excitation</text>
        <text x={stokesX2} y={pad.top + 16} textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="600">Emission</text>

        {/* Interactive point on emission peak */}
        <circle cx={peakX} cy={peakY} r={8} fill="#22c55e" filter="url(#glow)" stroke="#fff" strokeWidth={2} />

        {/* Current intensity label near point */}
        <text x={peakX + 14} y={peakY - 8} fill="#22c55e" fontSize="12" fontWeight="600">{(scale * 100).toFixed(0)}%</text>

        {/* Chart title */}
        <text x={svgW / 2} y={16} textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">Fluorescence Emission Spectrum</text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Twist Play Chart - excitation wavelength vs emission intensity
  // ─────────────────────────────────────────────────────────────────────────────
  const renderTwistChart = (excWl: number) => {
    const svgW = 460;
    const svgH = 320;
    const pad = { top: 30, right: 30, bottom: 50, left: 55 };
    const plotW = svgW - pad.left - pad.right;
    const plotH = svgH - pad.top - pad.bottom;

    // Excitation efficiency drops as wavelength moves away from optimal 365nm
    const optimalWl = 365;
    const efficiency = Math.exp(-0.5 * ((excWl - optimalWl) / 40) ** 2);

    // Generate excitation efficiency curve
    const nPoints = 30;
    const wlMin = 300;
    const wlMax = 450;
    const toX = (wl: number) => pad.left + ((wl - wlMin) / (wlMax - wlMin)) * plotW;
    const toY = (val: number) => pad.top + plotH - val * plotH;

    const curvePoints: string[] = [];
    for (let i = 0; i <= nPoints; i++) {
      const wl = wlMin + (i / nPoints) * (wlMax - wlMin);
      const val = Math.exp(-0.5 * ((wl - optimalWl) / 40) ** 2);
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${toX(wl).toFixed(1)} ${toY(val).toFixed(1)}`);
    }

    const pointX = toX(excWl);
    const pointY = toY(efficiency);

    // Determine color based on wavelength
    const wlColor = wavelengthToColor(excWl);

    // Grid lines
    const gridLines = [];
    for (let i = 0; i <= 4; i++) gridLines.push(pad.top + (i / 4) * plotH);
    const wlTicks = [300, 325, 350, 375, 400, 425, 450];

    return (
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: '100%' }} role="img" aria-label="Excitation efficiency vs wavelength chart">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={svgW} height={svgH} fill="#1a1a24" rx="8" />

        {/* Grid */}
        {gridLines.map((y, i) => (
          <line key={`h${i}`} x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {wlTicks.map((wl, i) => (
          <line key={`v${i}`} x1={toX(wl)} y1={pad.top} x2={toX(wl)} y2={pad.top + plotH} stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#64748b" strokeWidth="1.5" />
        <line x1={pad.left} y1={pad.top + plotH} x2={svgW - pad.right} y2={pad.top + plotH} stroke="#64748b" strokeWidth="1.5" />

        {/* Axis labels */}
        <text x={pad.left - 8} y={pad.top + plotH / 2} textAnchor="middle" fill={colors.textSecondary} fontSize="12" transform={`rotate(-90, ${pad.left - 8}, ${pad.top + plotH / 2})`}>Intensity (a.u.)</text>
        <text x={pad.left + plotW / 2} y={svgH - 8} textAnchor="middle" fill={colors.textSecondary} fontSize="12">Excitation Wavelength (nm)</text>

        {/* X tick labels */}
        {wlTicks.map((wl, i) => (
          <text key={`xt${i}`} x={toX(wl)} y={pad.top + plotH + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">{wl}</text>
        ))}

        {/* Excitation efficiency curve */}
        <path d={curvePoints.join(' ')} fill="none" stroke={wlColor} strokeWidth="2.5" />

        {/* Optimal line */}
        <line x1={toX(optimalWl)} y1={pad.top} x2={toX(optimalWl)} y2={pad.top + plotH} stroke="#a78bfa" strokeWidth="1" strokeDasharray="6 3" />
        <text x={toX(optimalWl)} y={pad.top + plotH + 32} textAnchor="middle" fill="#a78bfa" fontSize="11">Optimal 365 nm</text>

        {/* Interactive point */}
        <circle cx={pointX} cy={pointY} r={8} fill={wlColor} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
        <text x={pointX + 14} y={pointY - 8} fill={wlColor} fontSize="12" fontWeight="600">{(efficiency * 100).toFixed(0)}%</text>

        {/* Title */}
        <text x={svgW / 2} y={16} textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">Excitation Efficiency Spectrum</text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '80px', textAlign: 'center' }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🔦✨
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Fluorescence Physics
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "Under a UV lamp, a highlighter transforms into a brilliant beacon of <span style={{ color: colors.accent }}>glowing green light</span>. But why does invisible UV light become visible color, and why do some things glow while others stay dark?"
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Fluorescence is natures light show - molecules absorbing invisible radiation and re-emitting it as visible beauty. Its the principle behind everything from crime scene investigation to saving lives with medical diagnostics."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — Photophysics Fundamentals
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Next
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The UV light reflects off the highlighter and changes color' },
      { id: 'b', text: 'Special molecules absorb UV and re-emit visible light at lower energy', correct: true },
      { id: 'c', text: 'The highlighter contains tiny LEDs powered by UV radiation' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', padding: '24px', paddingTop: '80px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction - Step 1 of 3
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A yellow highlighter appears pale in normal light, but glows bright green under UV. Why does this happen?
            </h2>

            {/* Static SVG diagram for predict phase */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="400" height="200" viewBox="0 0 400 200" role="img" aria-label="UV light hitting highlighter to produce green glow diagram">
                <defs>
                  <linearGradient id="uvGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#86efac" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <marker id="arrowhead" markerWidth="12" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 12 3.5, 0 7" fill={colors.accent} />
                  </marker>
                  <marker id="arrowhead2" markerWidth="12" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 12 3.5, 0 7" fill="#22c55e" />
                  </marker>
                </defs>
                <rect width="400" height="200" fill="#1a1a24" rx="8" />

                {/* UV Source */}
                <rect x="20" y="55" width="60" height="60" rx="8" fill="#374151" />
                <rect x="30" y="65" width="40" height="40" rx="4" fill="url(#uvGrad)" />
                <text x="50" y="135" textAnchor="middle" fill={colors.textSecondary} fontSize="12">UV Light</text>
                <text x="50" y="155" textAnchor="middle" fill={colors.accent} fontSize="11">365 nm</text>

                {/* Arrow 1 */}
                <path d="M 90 85 L 140 85" stroke={colors.accent} strokeWidth="3" markerEnd="url(#arrowhead)" />

                {/* Highlighter */}
                <rect x="150" y="50" width="100" height="70" rx="8" fill="#fef08a" stroke={colors.accent} strokeWidth="2" />
                <text x="200" y="90" textAnchor="middle" fill="#374151" fontSize="14" fontWeight="600">Highlighter</text>
                <text x="200" y="145" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Sample Material</text>

                {/* Arrow 2 */}
                <path d="M 260 85 L 310 85" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowhead2)" />

                {/* Emission */}
                <circle cx="350" cy="85" r="30" fill="url(#greenGrad)" opacity="0.8" filter="url(#glow)" />
                <text x="350" y="135" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Green Glow</text>
                <text x="350" y="155" textAnchor="middle" fill="#22c55e" fontSize="11">520 nm</text>

                {/* Energy label */}
                <text x="200" y="185" textAnchor="middle" fill={colors.textMuted} fontSize="11">E = hc/λ (higher energy UV → lower energy visible)</text>
              </svg>

              {/* Legend */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '16px',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: colors.accent, borderRadius: '4px' }} />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>UV Light (invisible)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#fef08a', borderRadius: '4px', border: '1px solid #d4d4d4' }} />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Highlighter material</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#22c55e', borderRadius: '4px' }} />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Visible emission</span>
                </div>
              </div>
            </div>

            {/* Options */}
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

            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Next
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive Fluorescence Lab
  if (phase === 'play') {
    // Calculate emission intensity based on UV intensity
    const emissionIntensity = uvIntensity / 100;
    const stokesShift = 155; // nm difference between excitation and emission
    const quantumYield = 0.85;
    const emittedEnergy = emissionIntensity * quantumYield;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Fluorescence Laboratory
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
              Fluorescence is defined as the emission of light by a substance that has absorbed electromagnetic radiation. Adjust the UV intensity to observe how emission intensity varies proportionally.
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              The Stokes shift describes how emitted photons always have longer wavelength (lower energy) than absorbed photons. This relationship between absorption and emission is calculated as: E = hc/λ. Real-world relevance: This same principle is used in forensic analysis, medical diagnostics, and fluorescent lighting.
            </p>

            {/* Main SVG visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {renderFluorescenceChart(uvIntensity)}
              </div>

              {/* Legend */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#8b5cf6', borderRadius: '4px' }} />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>UV (365 nm)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#22c55e', borderRadius: '4px' }} />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Emission (520 nm)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#f59e0b', borderRadius: '4px' }} />
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Stokes Shift</span>
                </div>
              </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Formula display */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <span style={{ ...typo.body, color: colors.textPrimary, fontFamily: 'monospace' }}>
                  E = hc/λ | QY = {quantumYield}
                </span>
              </div>

              {/* UV Intensity slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>UV Intensity</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{uvIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={uvIntensity}
                  onChange={(e) => setUvIntensity(parseInt(e.target.value))}
                  onInput={(e) => setUvIntensity(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                  aria-label="UV Intensity slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>10%</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>100%</span>
                </div>
              </div>

              {/* Status display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: emissionIntensity > 0.5 ? colors.success : colors.warning }}>
                    {(emittedEnergy * 100).toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Emission</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>365 nm</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Excitation</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: '#22c55e' }}>
                    {stokesShift} nm
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Stokes Shift</div>
                </div>
              </div>
              </div>
              </div>
            </div>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> As you observed in the prediction phase, UV light excites fluorescent molecules. Drag the UV intensity slider to see how excitation power affects emission brightness. Notice the emission peak always stays at 520 nm regardless of intensity - only the amplitude changes.
              </p>
            </div>

            {/* Color-coded feedback */}
            {uvIntensity >= 80 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  Maximum fluorescence! The emission peak reaches {(emittedEnergy * 100).toFixed(0)}% of maximum possible intensity.
                </p>
              </div>
            )}

            {uvIntensity < 30 && (
              <div style={{
                background: `${colors.error}22`,
                border: `1px solid ${colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                  Low UV intensity - fluorescence emission is very weak at {(emittedEnergy * 100).toFixed(0)}%.
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Next
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Fluorescence Process
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  As you observed in the experiment, your prediction about fluorescence can now be confirmed:
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Step 1: Absorption</strong> - A UV photon excites an electron to a higher energy state
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Step 2: Relaxation</strong> - The electron loses some energy as heat (vibrational relaxation)
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Step 3: Emission</strong> - The electron falls back down, releasing a <span style={{ color: colors.success }}>lower-energy visible photon</span>
                </p>
                <p>
                  This energy difference between absorbed and emitted light is called the <span style={{ color: colors.accent, fontWeight: 600 }}>Stokes Shift</span> - its why emission is always at a longer wavelength than excitation!
                </p>
              </div>
            </div>

            {/* Energy diagram */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block' }}>
                <rect width="300" height="200" fill="#1a1a24" rx="8" />
                {/* Ground state */}
                <rect x="40" y="155" width="100" height="8" rx="2" fill="#4b5563" />
                <text x="90" y="180" textAnchor="middle" fill={colors.textMuted} fontSize="11">Ground State (S0)</text>

                {/* Excited state */}
                <rect x="40" y="35" width="100" height="8" rx="2" fill="#8b5cf6" />
                <text x="90" y="28" textAnchor="middle" fill="#a78bfa" fontSize="11">Excited State (S1)</text>

                {/* Absorption arrow */}
                <line x1="60" y1="150" x2="60" y2="47" stroke="#8b5cf6" strokeWidth="4" />
                <polygon points="60,43 55,53 65,53" fill="#c4b5fd" />
                <text x="40" y="100" fill="#a78bfa" fontSize="11" transform="rotate(-90, 40, 100)">Absorb UV</text>

                {/* Heat loss */}
                <path d="M 90 45 Q 100 55 90 65 Q 80 75 90 85" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" fill="none" />
                <text x="108" y="65" fill="#f59e0b" fontSize="11">Heat loss</text>

                {/* Emission arrow */}
                <line x1="120" y1="47" x2="120" y2="150" stroke="#22c55e" strokeWidth="4" />
                <polygon points="120,153 115,143 125,143" fill="#22c55e" />
                <text x="140" y="100" fill="#22c55e" fontSize="11" transform="rotate(90, 140, 100)">Emit Visible</text>

                {/* Stokes shift label */}
                <rect x="175" y="65" width="100" height="40" rx="4" fill="#0f172a" />
                <text x="225" y="82" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">Stokes Shift</text>
                <text x="225" y="98" textAnchor="middle" fill={colors.textMuted} fontSize="11">155 nm</text>
              </svg>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Key Insight: Why Longer Wavelength?
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Energy is conserved! The emitted photon has <strong>less energy</strong> than the absorbed one because some energy is lost as heat. Since E = hc/λ, less energy means <strong>longer wavelength</strong> - UV (365 nm) becomes green (520 nm)!
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Next
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'It glows even brighter due to stored energy' },
      { id: 'b', text: 'Fluorescence stops immediately, but phosphorescence continues glowing', correct: true },
      { id: 'c', text: 'Both fluorescence and phosphorescence stop at exactly the same time' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Phosphorescence
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              When you turn off the UV light, what happens to a glow-in-the-dark star vs a fluorescent highlighter?
            </h2>

            {/* SVG for twist_predict */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="400" height="220" viewBox="0 0 400 220" role="img" aria-label="Fluorescence vs phosphorescence comparison">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect width="400" height="220" fill="#1a1a24" rx="8" />

                {/* Title */}
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">Time After UV Light Removed</text>

                {/* Time axis */}
                <line x1="50" y1="180" x2="360" y2="180" stroke="#64748b" strokeWidth="1.5" />
                <text x="205" y="210" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Time (seconds)</text>
                {[0, 1, 2, 3, 5, 10].map((t, i) => (
                  <text key={i} x={50 + i * 62} y="196" textAnchor="middle" fill={colors.textMuted} fontSize="11">{t}s</text>
                ))}

                {/* Fluorescence - drops instantly */}
                <line x1="50" y1="60" x2="50" y2="180" stroke="#22c55e" strokeWidth="3" />
                <line x1="50" y1="180" x2="360" y2="180" stroke="#22c55e" strokeWidth="2" opacity="0.5" />
                <text x="80" y="50" fill="#22c55e" fontSize="12" fontWeight="600">Fluorescence</text>
                <text x="80" y="68" fill="#22c55e" fontSize="11">(instant off)</text>

                {/* Phosphorescence - decays slowly */}
                <path d="M 50 60 L 50 70 L 112 100 L 174 130 L 236 155 L 298 170 L 360 175" stroke="#f59e0b" strokeWidth="3" fill="none" />
                <text x="300" y="50" fill="#f59e0b" fontSize="12" fontWeight="600">Phosphorescence</text>
                <text x="300" y="68" fill="#f59e0b" fontSize="11">(slow decay)</text>

                {/* Y axis label */}
                <text x="30" y="120" textAnchor="middle" fill={colors.textSecondary} fontSize="12" transform="rotate(-90, 30, 120)">Intensity</text>
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

            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                See the Difference
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const optimalWl = 365;
    const efficiency = Math.exp(-0.5 * ((excitationWavelength - optimalWl) / 40) ** 2);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Excitation Wavelength and Efficiency
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Not all wavelengths excite fluorescence equally. Adjust the excitation wavelength to discover the optimal absorption range.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Chart */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {renderTwistChart(excitationWavelength)}
              </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Excitation wavelength slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Wavelength</span>
                  <span style={{ ...typo.small, color: wavelengthToColor(excitationWavelength), fontWeight: 600 }}>{excitationWavelength} nm</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="450"
                  value={excitationWavelength}
                  onChange={(e) => setExcitationWavelength(parseInt(e.target.value))}
                  onInput={(e) => setExcitationWavelength(parseInt((e.target as HTMLInputElement).value))}
                  style={sliderStyle}
                  aria-label="Excitation Wavelength slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>UV (300)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Violet (450)</span>
                </div>
              </div>

              {/* Status */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  <div style={{ ...typo.small, color: efficiency > 0.7 ? colors.success : efficiency > 0.3 ? colors.warning : colors.error, fontWeight: 600, marginBottom: '4px' }}>
                    Efficiency: {(efficiency * 100).toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    {efficiency > 0.8 ? 'Optimal excitation range' : efficiency > 0.3 ? 'Partial absorption' : 'Poor absorption at this wavelength'}
                  </div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  <div style={{ ...typo.small, color: colors.warning, fontWeight: 600, marginBottom: '4px' }}>
                    Stokes Shift: {520 - excitationWavelength} nm
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    Energy lost as heat before emission
                  </div>
                </div>
              </div>
              </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Mechanism
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Singlet vs Triplet States
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚡</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Fluorescence (Fast)</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Electrons return from the singlet excited state via an <strong>"allowed"</strong> transition. This happens in <span style={{ color: colors.success }}>nanoseconds (10⁻⁹ s)</span> - the moment UV stops, emission stops.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🌙</span>
                  <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Phosphorescence (Slow)</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Electrons cross to a triplet state where the return is <strong>"forbidden"</strong> by quantum rules. It still happens, but slowly over <span style={{ color: colors.warning }}>milliseconds to hours</span> - creating the afterglow effect.
                </p>
              </div>

              <div style={{
                background: `${colors.accent}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.accent}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔬</span>
                  <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>Applications</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  <strong>Quantum Yield</strong> measures efficiency: what fraction of absorbed photons become emitted light. High QY = bright fluorophore. <strong>Photobleaching</strong> is permanent fluorophore destruction - a limit in long imaging experiments.
                </p>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Real-World Applications
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Fluorescence"
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
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              App {selectedApp + 1} of {realWorldApps.length} - Explore how fluorescence impacts everyday life
            </p>

            {/* App selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound('click');
                    setSelectedApp(i);
                    const newCompleted = [...completedApps];
                    newCompleted[i] = true;
                    setCompletedApps(newCompleted);
                  }}
                  style={{
                    background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  {completedApps[i] && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: colors.success,
                      color: 'white',
                      fontSize: '12px',
                      lineHeight: '18px',
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                    {a.title.split(' ').slice(0, 2).join(' ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected app details */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              borderLeft: `4px solid ${app.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                {app.description}
              </p>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How Fluorescence Connects:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How It Works:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Examples:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {app.examples.map((ex, i) => (
                    <span key={i} style={{
                      background: colors.bgSecondary,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      ...typo.small,
                      color: colors.textSecondary,
                    }}>{ex}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Companies:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.companies.join(', ')}</p>
              </div>

              <div style={{
                background: `${app.color}11`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>
                  <strong>Future Impact:</strong> {app.futureImpact}
                </p>
              </div>

              {/* Got It button */}
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  if (selectedApp < realWorldApps.length - 1) {
                    setSelectedApp(selectedApp + 1);
                  }
                }}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  background: completedApps[selectedApp] ? colors.success : `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
                }}
              >
                Got It
              </button>
            </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Test
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '24px' }}>
              <div style={{
                fontSize: '80px',
                marginBottom: '24px',
              }}>
                {passed ? '🎉' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed
                  ? 'You understand fluorescence physics!'
                  : 'Review the concepts and try again.'}
              </p>

              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={primaryButtonStyle}
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
                  style={primaryButtonStyle}
                >
                  Review & Try Again
                </button>
              )}
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion
                      ? colors.accent
                      : testAnswers[i]
                        ? colors.success
                        : colors.border,
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

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
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
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white',
                    cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
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
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                    color: 'white',
                    cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Fluorescence Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how molecules absorb UV light and emit visible light, powering applications from microscopy to medical diagnostics.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'UV absorption excites electrons to higher energy states',
                'Stokes shift explains why emission is longer wavelength',
                'Fluorescence is instant, phosphorescence is delayed',
                'Quantum yield measures fluorescence efficiency',
                'Real-world applications in biology and medicine',
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

          {renderNavDots()}
        </div>
      </div>
    );
  }

  return null;
};

export default FluorescenceRenderer;
