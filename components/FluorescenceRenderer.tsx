'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

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
      { value: '2008', label: 'Nobel Prize for GFP', icon: '🏆' }
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
      { value: '10,000 hrs', label: 'Typical tube lifespan', icon: '⏰' }
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
      { value: 'Minutes', label: 'Rapid test results', icon: '⏱️' },
      { value: '99%', label: 'Sensitivity achievable', icon: '🎯' }
    ],
    examples: ['COVID-19 antigen tests', 'HIV screening', 'Autoimmune disease diagnosis', 'Cancer biomarker detection'],
    companies: ['Roche Diagnostics', 'Abbott', 'Siemens Healthineers', 'Bio-Rad'],
    futureImpact: 'Quantum dot fluorophores will enable multiplexed tests detecting dozens of diseases from a single drop of blood.',
    color: '#8B5CF6'
  }
];

// Material properties for the simulation
const getMaterialProps = (mat: string) => {
  const props: Record<string, { fluorescent: boolean; emitColor: string; emitGlow: string; name: string; emissionWavelength: number }> = {
    highlighter: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter', emissionWavelength: 520 },
    paper: { fluorescent: false, emitColor: '#f5f5dc', emitGlow: '#f5f5dc', name: 'Plain Paper', emissionWavelength: 0 },
    tonic: { fluorescent: true, emitColor: '#00ccff', emitGlow: '#00ffff', name: 'Tonic Water (Quinine)', emissionWavelength: 450 },
    mineral: { fluorescent: true, emitColor: '#ff4444', emitGlow: '#ff0000', name: 'Fluorite Mineral', emissionWavelength: 620 },
  };
  return props[mat] || props.highlighter;
};

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
  const [uvOn, setUvOn] = useState(false);
  const [roomLightOn, setRoomLightOn] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<'highlighter' | 'paper' | 'tonic' | 'mineral'>('highlighter');
  const [uvIntensity, setUvIntensity] = useState(70);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - phosphorescence and quantum yield
  const [showPhosphorescence, setShowPhosphorescence] = useState(false);
  const [phosphorDecay, setPhosphorDecay] = useState(100);
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

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Phosphorescence decay
  useEffect(() => {
    if (showPhosphorescence && !uvOn && phosphorDecay > 0) {
      const timer = setInterval(() => {
        setPhosphorDecay(d => Math.max(0, d - 2));
      }, 100);
      return () => clearInterval(timer);
    }
    if (uvOn) {
      setPhosphorDecay(100);
    }
  }, [showPhosphorescence, uvOn, phosphorDecay]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#8B5CF6', // Purple for UV theme
    accentGlow: 'rgba(139, 92, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast for readability
    textMuted: '#e2e8f0', // Better contrast
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
    twist_play: 'Advanced Lab',
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

  // Helper to convert wavelength to color
  const wavelengthToColor = (wavelength: number): string => {
    if (wavelength < 380) return '#8b5cf6'; // UV - violet
    if (wavelength < 450) return '#3b82f6'; // Blue
    if (wavelength < 495) return '#06b6d4'; // Cyan
    if (wavelength < 570) return '#22c55e'; // Green
    if (wavelength < 590) return '#eab308'; // Yellow
    if (wavelength < 620) return '#f97316'; // Orange
    if (wavelength < 700) return '#ef4444'; // Red
    return '#7f1d1d'; // IR - dark red
  };

  // Progress bar component
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

  // Navigation bar component - fixed at top with z-index
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1001,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>🔦</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Fluorescence</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // Fluorescence Scene Visualization
  const FluorescenceScene = ({ showControls = true }: { showControls?: boolean }) => {
    const matProps = getMaterialProps(selectedMaterial);
    const isGlowing = uvOn && matProps.fluorescent && showControls;
    const ambientLight = roomLightOn ? 0.8 : (uvOn ? 0.2 : 0.05);
    const glowIntensity = (uvIntensity / 100);
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 260 : 320;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} role="img" aria-label="Fluorescence experiment visualization">
        <defs>
          <linearGradient id="labBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={roomLightOn ? '#1e293b' : '#050510'} />
            <stop offset="100%" stopColor={roomLightOn ? '#0f172a' : '#030308'} />
          </linearGradient>
          <radialGradient id="uvBeam" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={uvOn ? 0.6 * glowIntensity : 0} />
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="emission" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={matProps.emitGlow} stopOpacity={isGlowing ? 0.9 * glowIntensity : 0} />
            <stop offset="50%" stopColor={matProps.emitColor} stopOpacity={isGlowing ? 0.5 * glowIntensity : 0} />
            <stop offset="100%" stopColor={matProps.emitColor} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#labBg)" />

        {/* UV Beam */}
        {uvOn && (
          <ellipse cx={width * 0.7} cy={height * 0.4} rx={width * 0.3} ry={height * 0.5} fill="url(#uvBeam)" />
        )}

        {/* UV Light Source */}
        <g transform={`translate(${width * 0.75}, 20)`}>
          <rect x="-25" y="0" width="50" height="60" rx="6" fill="#374151" />
          <rect x="-20" y="50" width="40" height="25" rx="4" fill={uvOn ? '#a78bfa' : '#4b5563'} filter={uvOn ? 'url(#glow)' : ''} />
          {uvOn && (
            <>
              {[...Array(5)].map((_, i) => (
                <line
                  key={i}
                  x1={-15 + i * 8}
                  y1="75"
                  x2={-40 + i * 15}
                  y2={height - 40}
                  stroke="#a78bfa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity={0.3 + Math.sin(animationFrame * 0.1 + i) * 0.2}
                />
              ))}
            </>
          )}
        </g>

        {/* Sample Object */}
        <g transform={`translate(${width * 0.3}, ${height * 0.4})`}>
          {/* Glow effect */}
          {isGlowing && (
            <ellipse
              cx="50"
              cy="50"
              rx={80 + Math.sin(animationFrame * 0.1) * 8 * glowIntensity}
              ry={60 + Math.sin(animationFrame * 0.1) * 8 * glowIntensity}
              fill="url(#emission)"
              filter="url(#glow)"
            />
          )}

          {/* Object based on material */}
          {selectedMaterial === 'highlighter' && (
            <g>
              <rect x="20" y="25" width="60" height="50" rx="4" fill={isGlowing ? matProps.emitColor : '#fef08a'} opacity={ambientLight} filter={isGlowing ? 'url(#glow)' : ''} />
              <line x1="28" y1="38" x2="72" y2="38" stroke="#374151" strokeWidth="1" opacity={0.3} />
              <line x1="28" y1="50" x2="72" y2="50" stroke="#374151" strokeWidth="1" opacity={0.3} />
              <line x1="28" y1="62" x2="72" y2="62" stroke="#374151" strokeWidth="1" opacity={0.3} />
            </g>
          )}
          {selectedMaterial === 'paper' && (
            <g>
              <rect x="15" y="20" width="70" height="60" rx="2" fill="#f5f5dc" opacity={ambientLight} />
              {[...Array(5)].map((_, i) => (
                <line key={i} x1="22" y1={30 + i * 10} x2="78" y2={30 + i * 10} stroke="#d4d4d4" strokeWidth="0.5" opacity={0.4} />
              ))}
            </g>
          )}
          {selectedMaterial === 'tonic' && (
            <g>
              <rect x="30" y="15" width="40" height="70" rx="4" fill="#4b5563" />
              <rect x="36" y="8" width="28" height="10" rx="2" fill="#4b5563" />
              <rect x="35" y="22" width="30" height="58" rx="3" fill={isGlowing ? matProps.emitColor : '#bae6fd'} opacity={ambientLight} filter={isGlowing ? 'url(#glow)' : ''} />
              {[...Array(6)].map((_, i) => (
                <circle
                  key={i}
                  cx={40 + (i % 3) * 8}
                  cy={70 - ((animationFrame * 2 + i * 10) % 40)}
                  r={1.5 + (i % 2)}
                  fill={isGlowing ? matProps.emitGlow : '#ffffff'}
                  opacity={0.5}
                />
              ))}
            </g>
          )}
          {selectedMaterial === 'mineral' && (
            <g>
              <polygon
                points="50,10 85,45 70,85 30,85 15,45"
                fill={isGlowing ? matProps.emitColor : '#a78bfa'}
                opacity={ambientLight}
                filter={isGlowing ? 'url(#glow)' : ''}
              />
              <polygon points="50,10 65,35 50,50 35,35" fill={isGlowing ? '#ffffff' : '#c4b5fd'} opacity={0.6} />
            </g>
          )}
        </g>

        {/* Material label */}
        <text x={width / 2} y={height - 20} textAnchor="middle" fill={colors.textSecondary} fontSize="14">
          {matProps.name}
        </text>

        {/* Light status indicators */}
        <g transform="translate(15, 15)">
          <circle cx="10" cy="10" r="8" fill={roomLightOn ? '#fef08a' : '#374151'} filter={roomLightOn ? 'url(#glow)' : ''} />
          <text x="25" y="14" fill={colors.textMuted} fontSize="10">Room</text>
          <circle cx="10" cy="35" r="8" fill={uvOn ? '#a78bfa' : '#374151'} filter={uvOn ? 'url(#glow)' : ''} />
          <text x="25" y="39" fill={colors.textMuted} fontSize="10">UV</text>
        </g>
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

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
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction - Step 1 of 3
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
            <svg width="100%" height="160" viewBox="0 0 400 160" role="img" aria-label="UV light hitting highlighter to produce green glow diagram">
              <defs>
                <linearGradient id="uvGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>
              </defs>
              {/* UV Source */}
              <rect x="20" y="50" width="60" height="60" rx="8" fill="#374151" />
              <rect x="30" y="60" width="40" height="40" rx="4" fill="url(#uvGrad)" />
              <text x="50" y="130" textAnchor="middle" fill={colors.textSecondary} fontSize="12">UV Light</text>
              <text x="50" y="145" textAnchor="middle" fill={colors.accent} fontSize="10">365 nm</text>

              {/* Arrow 1 */}
              <path d="M 90 80 L 140 80" stroke={colors.accent} strokeWidth="3" markerEnd="url(#arrowhead)" />
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={colors.accent} />
                </marker>
              </defs>

              {/* Highlighter */}
              <rect x="150" y="45" width="100" height="70" rx="8" fill="#fef08a" stroke={colors.accent} strokeWidth="2" />
              <text x="200" y="85" textAnchor="middle" fill="#374151" fontSize="14" fontWeight="600">Highlighter</text>
              <text x="200" y="135" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Sample</text>

              {/* Arrow 2 */}
              <path d="M 260 80 L 310 80" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrowhead2)" />
              <defs>
                <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
              </defs>

              {/* Emission */}
              <circle cx="350" cy="80" r="30" fill="url(#greenGrad)" opacity="0.8" />
              <text x="350" y="130" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Green Glow</text>
              <text x="350" y="145" textAnchor="middle" fill="#22c55e" fontSize="10">520 nm</text>
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
    );
  }

  // PLAY PHASE - Interactive Fluorescence Lab
  if (phase === 'play') {
    const matProps = getMaterialProps(selectedMaterial);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Fluorescence Laboratory
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            Control the light sources and materials to discover what fluoresces
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '12px' }}>
            Try toggling the UV light and observe what happens. Experiment with different materials!
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Real-world relevance: This same principle is used in forensic analysis to detect hidden evidence, in medical diagnostics to identify diseases, and in fluorescent lighting that powers buildings worldwide.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <FluorescenceScene />
            </div>

            {/* Material selector */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Select Material:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['highlighter', 'paper', 'tonic', 'mineral'] as const).map(mat => (
                  <button
                    key={mat}
                    onClick={() => { playSound('click'); setSelectedMaterial(mat); }}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedMaterial === mat ? colors.accent : colors.border}`,
                      background: selectedMaterial === mat ? `${colors.accent}22` : colors.bgSecondary,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                      {mat === 'highlighter' ? '📝' : mat === 'paper' ? '📄' : mat === 'tonic' ? '🥤' : '💎'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textPrimary }}>
                      {getMaterialProps(mat).name.split(' ')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Light controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <button
                onClick={() => { playSound('click'); setRoomLightOn(!roomLightOn); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${roomLightOn ? colors.warning : colors.border}`,
                  background: roomLightOn ? `${colors.warning}22` : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>💡</div>
                <div style={{ ...typo.body, color: roomLightOn ? colors.warning : colors.textMuted, fontWeight: 600 }}>
                  Room Light {roomLightOn ? 'ON' : 'OFF'}
                </div>
              </button>
              <button
                onClick={() => { playSound('click'); setUvOn(!uvOn); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${uvOn ? colors.accent : colors.border}`,
                  background: uvOn ? `${colors.accent}22` : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔦</div>
                <div style={{ ...typo.body, color: uvOn ? colors.accent : colors.textMuted, fontWeight: 600 }}>
                  UV Light {uvOn ? 'ON' : 'OFF'}
                </div>
              </button>
            </div>

            {/* UV intensity slider - always visible */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>UV Intensity</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{uvIntensity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={uvIntensity}
                onChange={(e) => setUvIntensity(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
                aria-label="UV Intensity slider"
              />
            </div>

            {/* Status display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: matProps.fluorescent ? colors.success : colors.error }}>
                  {matProps.fluorescent ? 'Yes' : 'No'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Fluorescent</div>
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
                <div style={{ ...typo.h3, color: matProps.fluorescent ? matProps.emitColor : colors.textMuted }}>
                  {matProps.fluorescent ? `${matProps.emissionWavelength} nm` : '-'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Emission</div>
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
              <strong style={{ color: colors.accent }}>Observe:</strong> Toggle the UV light ON and room light OFF to see fluorescence. Try different materials and adjust UV intensity using the slider to see how brightness changes.
            </p>
          </div>

          {/* Discovery prompt */}
          {uvOn && !roomLightOn && matProps.fluorescent && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Beautiful! The {matProps.name.toLowerCase()} absorbs invisible UV and emits visible {matProps.emissionWavelength < 500 ? 'blue' : matProps.emissionWavelength < 570 ? 'green' : 'red'} light!
              </p>
            </div>
          )}

          {uvOn && !matProps.fluorescent && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Plain paper has no fluorescent molecules - it just reflects UV without converting it!
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
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
            <svg viewBox="0 0 300 150" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'block' }}>
              <defs>
                <linearGradient id="absorbArrow" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#c4b5fd" />
                </linearGradient>
                <linearGradient id="emitArrow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              {/* Ground state */}
              <rect x="40" y="120" width="100" height="8" rx="2" fill="#4b5563" />
              <text x="90" y="140" textAnchor="middle" fill={colors.textMuted} fontSize="10">Ground State (S0)</text>

              {/* Excited state */}
              <rect x="40" y="30" width="100" height="8" rx="2" fill="#8b5cf6" />
              <text x="90" y="22" textAnchor="middle" fill="#a78bfa" fontSize="10">Excited State (S1)</text>

              {/* Absorption arrow */}
              <line x1="60" y1="115" x2="60" y2="42" stroke="url(#absorbArrow)" strokeWidth="4" />
              <polygon points="60,38 55,48 65,48" fill="#c4b5fd" />
              <text x="45" y="80" fill="#a78bfa" fontSize="9" transform="rotate(-90, 45, 80)">Absorb UV</text>

              {/* Heat loss */}
              <path d="M 90 40 Q 100 50 90 60 Q 80 70 90 80" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2" fill="none" />
              <text x="105" y="60" fill="#f59e0b" fontSize="8">Heat loss</text>

              {/* Emission arrow */}
              <line x1="120" y1="42" x2="120" y2="115" stroke="url(#emitArrow)" strokeWidth="4" />
              <polygon points="120,118 115,108 125,108" fill="#22c55e" />
              <text x="135" y="80" fill="#22c55e" fontSize="9" transform="rotate(90, 135, 80)">Emit Visible</text>

              {/* Stokes shift label */}
              <rect x="170" y="55" width="80" height="40" rx="4" fill="#0f172a" />
              <text x="210" y="72" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="bold">Stokes Shift</text>
              <text x="210" y="88" textAnchor="middle" fill={colors.textMuted} fontSize="9">~150 nm</text>
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
              💡 Key Insight: Why Longer Wavelength?
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
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🌙 New Variable: Phosphorescence
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            When you turn off the UV light, what happens to a glow-in-the-dark star vs a fluorescent highlighter?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📝✨</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Fluorescent</p>
                <p style={{ ...typo.small, color: colors.success }}>Highlighter</p>
              </div>
              <div style={{ fontSize: '32px', color: colors.textMuted }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>⭐🌙</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Phosphorescent</p>
                <p style={{ ...typo.small, color: colors.accent }}>Glow Star</p>
              </div>
            </div>
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
              See the Difference →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const decayOpacity = !uvOn && showPhosphorescence ? phosphorDecay / 100 : (uvOn ? 1 : 0);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Fluorescence vs Phosphorescence
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle phosphorescence mode and observe the afterglow when UV is turned off
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Comparison visualization */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}>
              {/* Fluorescence side */}
              <div style={{
                background: '#050510',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📝</div>
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 12px',
                  borderRadius: '8px',
                  background: uvOn ? '#22ff22' : '#4b5563',
                  boxShadow: uvOn ? '0 0 30px #00ff00' : 'none',
                  transition: 'all 0.3s ease',
                }} />
                <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '4px' }}>Fluorescence</p>
                <p style={{ ...typo.small, color: uvOn ? colors.success : colors.error }}>
                  {uvOn ? 'Glowing!' : 'Dark (instant off)'}
                </p>
              </div>

              {/* Phosphorescence side */}
              <div style={{
                background: '#050510',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>⭐</div>
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 12px',
                  borderRadius: '8px',
                  background: showPhosphorescence
                    ? `rgba(34, 255, 34, ${uvOn ? 1 : decayOpacity})`
                    : (uvOn ? '#22ff22' : '#4b5563'),
                  boxShadow: (uvOn || (showPhosphorescence && decayOpacity > 0.1))
                    ? `0 0 ${30 * (uvOn ? 1 : decayOpacity)}px rgba(0, 255, 0, ${uvOn ? 1 : decayOpacity})`
                    : 'none',
                  transition: uvOn ? 'all 0.3s ease' : 'all 0.1s linear',
                }} />
                <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '4px' }}>Phosphorescence</p>
                <p style={{ ...typo.small, color: (uvOn || decayOpacity > 0.1) ? colors.success : colors.error }}>
                  {uvOn ? 'Glowing!' : showPhosphorescence && decayOpacity > 0.1 ? `Fading (${phosphorDecay}%)` : 'Dark'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={() => { playSound('click'); setUvOn(!uvOn); }}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${uvOn ? colors.accent : colors.border}`,
                  background: uvOn ? `${colors.accent}22` : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔦</div>
                <div style={{ ...typo.body, color: uvOn ? colors.accent : colors.textMuted, fontWeight: 600 }}>
                  UV Light {uvOn ? 'ON' : 'OFF'}
                </div>
              </button>
              <button
                onClick={() => { playSound('click'); setShowPhosphorescence(!showPhosphorescence); setPhosphorDecay(100); }}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: `2px solid ${showPhosphorescence ? colors.warning : colors.border}`,
                  background: showPhosphorescence ? `${colors.warning}22` : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>⭐</div>
                <div style={{ ...typo.body, color: showPhosphorescence ? colors.warning : colors.textMuted, fontWeight: 600 }}>
                  Phosphorescence {showPhosphorescence ? 'ON' : 'OFF'}
                </div>
              </button>
            </div>

            {/* Stokes shift demonstration */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Excitation Wavelength</span>
                <span style={{ ...typo.small, color: wavelengthToColor(excitationWavelength), fontWeight: 600 }}>{excitationWavelength} nm</span>
              </div>
              <input
                type="range"
                min="300"
                max="450"
                value={excitationWavelength}
                onChange={(e) => setExcitationWavelength(parseInt(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>UV (300 nm)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Violet (450 nm)</span>
              </div>
            </div>

            {/* Info cards */}
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
                <div style={{ ...typo.small, color: colors.success, fontWeight: 600, marginBottom: '4px' }}>
                  Fluorescence
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>
                  Nanoseconds - instant off when light removed
                </div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
              }}>
                <div style={{ ...typo.small, color: colors.warning, fontWeight: 600, marginBottom: '4px' }}>
                  Phosphorescence
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>
                  Seconds to hours - gradual afterglow
                </div>
              </div>
            </div>
          </div>

          {showPhosphorescence && !uvOn && phosphorDecay > 50 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                ✨ Watch the phosphorescent sample slowly fade! This is the forbidden triplet state slowly releasing energy.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Mechanism →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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

            {/* Got It button for within-app progression */}
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
              {completedApps[selectedApp] ? 'Got It!' : 'Got It'}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
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
          padding: '24px',
          paddingTop: '80px',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
                Complete Lesson →
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
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
                Next →
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

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
    );
  }

  return null;
};

export default FluorescenceRenderer;
