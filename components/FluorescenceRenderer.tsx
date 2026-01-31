'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// String phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface Props {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    question: 'Why does a highlighter glow under UV light but appear normal under regular light?',
    options: [
      { text: 'Highlighters have tiny LEDs inside', correct: false },
      { text: 'UV light chemically changes the ink', correct: false },
      { text: 'Fluorescent molecules absorb UV and re-emit visible light', correct: true },
      { text: 'Regular light is too weak to activate the glow', correct: false }
    ]
  },
  {
    question: 'Why is the emitted light a different color (longer wavelength) than the absorbed UV light?',
    options: [
      { text: 'Some energy is lost as heat during the process (Stokes shift)', correct: true },
      { text: 'The molecules change color when hit by light', correct: false },
      { text: 'UV light bounces off and changes color', correct: false },
      { text: 'The eye perceives UV as a different color', correct: false }
    ]
  },
  {
    question: 'Why doesn\'t regular white paper fluoresce much?',
    options: [
      { text: 'White paper is too bright already', correct: false },
      { text: 'Paper lacks special fluorescent molecules', correct: true },
      { text: 'Paper absorbs all UV light completely', correct: false },
      { text: 'Paper is too thick for light to penetrate', correct: false }
    ]
  },
  {
    question: 'A mineral glows red under UV light. What wavelength is the UV light?',
    options: [
      { text: 'Longer than red (infrared)', correct: false },
      { text: 'The same as red (~700nm)', correct: false },
      { text: 'Shorter than red, shorter than all visible light (~365nm)', correct: true },
      { text: 'It depends on the room temperature', correct: false }
    ]
  },
  {
    question: 'What is the main difference between fluorescence and phosphorescence?',
    options: [
      { text: 'Fluorescence uses UV light, phosphorescence uses visible light', correct: false },
      { text: 'Fluorescence stops immediately when light source is removed, phosphorescence continues glowing', correct: true },
      { text: 'They are exactly the same phenomenon', correct: false },
      { text: 'Phosphorescence only occurs in living organisms', correct: false }
    ]
  },
  {
    question: 'What is GFP (Green Fluorescent Protein) used for in biology?',
    options: [
      { text: 'Making plants grow faster', correct: false },
      { text: 'Tagging and tracking proteins/cells in living organisms', correct: true },
      { text: 'Killing bacteria with UV light', correct: false },
      { text: 'Protecting skin from sunburn', correct: false }
    ]
  },
  {
    question: 'Why do blacklights appear purple to our eyes?',
    options: [
      { text: 'They only emit purple visible light', correct: false },
      { text: 'They emit mostly UV with a small amount of visible violet light', correct: true },
      { text: 'Our eyes convert UV directly to purple', correct: false },
      { text: 'The glass filter is painted purple', correct: false }
    ]
  },
  {
    question: 'Why does tonic water glow blue under UV light?',
    options: [
      { text: 'It contains blue food coloring', correct: false },
      { text: 'The quinine in tonic water is fluorescent', correct: true },
      { text: 'The carbonation bubbles reflect UV as blue', correct: false },
      { text: 'The water itself is naturally fluorescent', correct: false }
    ]
  },
  {
    question: 'Some diamonds fluoresce blue under UV light. What causes this?',
    options: [
      { text: 'The carbon atoms themselves fluoresce', correct: false },
      { text: 'Nitrogen impurities in the diamond crystal structure', correct: true },
      { text: 'The diamond cutting pattern reflects UV', correct: false },
      { text: 'Oil residue on the diamond surface', correct: false }
    ]
  },
  {
    question: 'Why do laundry detergents contain optical brighteners (fluorescent compounds)?',
    options: [
      { text: 'To kill bacteria on clothes', correct: false },
      { text: 'To make whites appear brighter by converting UV to visible blue light', correct: true },
      { text: 'To make the detergent smell better', correct: false },
      { text: 'To help the detergent dissolve faster', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Currency Security',
    description: 'Banknotes have fluorescent inks that glow under UV to prevent counterfeiting.',
    icon: '💵'
  },
  {
    title: 'Forensics',
    description: 'Body fluids fluoresce under UV, helping investigators find evidence at crime scenes.',
    icon: '🔍'
  },
  {
    title: 'Fluorescent Lights',
    description: 'UV from mercury vapor hits phosphor coating, which fluoresces white light!',
    icon: '💡'
  },
  {
    title: 'Scorpion Detection',
    description: 'Scorpion exoskeletons contain fluorescent compounds - they glow bright cyan under UV!',
    icon: '🦂'
  }
];

// Fluorophore data with emission/excitation wavelengths
const FLUOROPHORES = {
  gfp: { name: 'GFP (Green Fluorescent Protein)', excitation: 395, emission: 509, color: '#00ff88', description: 'Nobel Prize 2008 - revolutionized cell biology' },
  rhodamine: { name: 'Rhodamine B', excitation: 543, emission: 565, color: '#ff6b6b', description: 'Common red/pink dye used in microscopy' },
  quantum_dot_525: { name: 'Quantum Dot (525nm)', excitation: 350, emission: 525, color: '#22ff22', description: 'Semiconductor nanocrystal with tunable emission' },
  quantum_dot_605: { name: 'Quantum Dot (605nm)', excitation: 350, emission: 605, color: '#ff8800', description: 'Larger quantum dot, longer emission wavelength' },
  dapi: { name: 'DAPI (DNA stain)', excitation: 358, emission: 461, color: '#4488ff', description: 'Used to stain cell nuclei in microscopy' },
  fluorescein: { name: 'Fluorescein', excitation: 494, emission: 521, color: '#88ff00', description: 'Classic green fluorescent dye' }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FluorescenceRenderer: React.FC<Props> = ({ currentPhase, onPhaseComplete }) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showTestResults, setShowTestResults] = useState(false);

  // Play phase simulation state
  const [uvOn, setUvOn] = useState(false);
  const [regularLightOn, setRegularLightOn] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<'highlighter' | 'paper' | 'tonic' | 'mineral'>('highlighter');
  const [animPhase, setAnimPhase] = useState(0);

  // Interactive control state for play phase
  const [excitationWavelength, setExcitationWavelength] = useState(365); // UV default
  const [lightIntensity, setLightIntensity] = useState(70);
  const [fluorophoreConcentration, setFluorophoreConcentration] = useState(50);

  // Twist play phase state
  const [twistMaterial, setTwistMaterial] = useState<'highlighter_yellow' | 'highlighter_pink' | 'highlighter_green' | 'laundry_detergent'>('highlighter_yellow');
  const [selectedFluorophore, setSelectedFluorophore] = useState<keyof typeof FLUOROPHORES>('gfp');
  const [showPhosphorescence, setShowPhosphorescence] = useState(false);
  const [phosphorescenceDecay, setPhosphorescenceDecay] = useState(100);
  const [showJablonskiAnimation, setShowJablonskiAnimation] = useState(true);
  const [jablonskiStep, setJablonskiStep] = useState(0);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Material fluorescence properties
  const getMaterialProps = (mat: string) => {
    const props: Record<string, { fluorescent: boolean; emitColor: string; emitGlow: string; name: string; emissionWavelength: number }> = {
      highlighter: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter', emissionWavelength: 520 },
      paper: { fluorescent: false, emitColor: '#f5f5dc', emitGlow: '#f5f5dc', name: 'Plain Paper', emissionWavelength: 0 },
      tonic: { fluorescent: true, emitColor: '#00ccff', emitGlow: '#00ffff', name: 'Tonic Water (Quinine)', emissionWavelength: 450 },
      mineral: { fluorescent: true, emitColor: '#ff4444', emitGlow: '#ff0000', name: 'Fluorite Mineral', emissionWavelength: 620 },
      highlighter_yellow: { fluorescent: true, emitColor: '#22ff22', emitGlow: '#00ff00', name: 'Yellow Highlighter', emissionWavelength: 520 },
      highlighter_pink: { fluorescent: true, emitColor: '#ff66cc', emitGlow: '#ff00ff', name: 'Pink Highlighter', emissionWavelength: 580 },
      highlighter_green: { fluorescent: true, emitColor: '#00ffaa', emitGlow: '#00ff88', name: 'Green Highlighter', emissionWavelength: 510 },
      laundry_detergent: { fluorescent: true, emitColor: '#6666ff', emitGlow: '#0000ff', name: 'Laundry Detergent', emissionWavelength: 440 }
    };
    return props[mat] || props.highlighter;
  };

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Jablonski diagram animation
  useEffect(() => {
    if (showJablonskiAnimation && uvOn) {
      const interval = setInterval(() => {
        setJablonskiStep(s => (s + 1) % 4);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [showJablonskiAnimation, uvOn]);

  // Phosphorescence decay
  useEffect(() => {
    if (showPhosphorescence && !uvOn && phosphorescenceDecay > 0) {
      const interval = setInterval(() => {
        setPhosphorescenceDecay(d => Math.max(0, d - 2));
      }, 100);
      return () => clearInterval(interval);
    } else if (uvOn) {
      setPhosphorescenceDecay(100);
    }
  }, [showPhosphorescence, uvOn, phosphorescenceDecay]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setUvOn(false);
      setRegularLightOn(true);
      setSelectedMaterial('highlighter');
      setExcitationWavelength(365);
      setLightIntensity(70);
      setFluorophoreConcentration(50);
    }
    if (phase === 'twist_play') {
      setTwistMaterial('highlighter_yellow');
      setSelectedFluorophore('gfp');
      setShowPhosphorescence(false);
      setPhosphorescenceDecay(100);
    }
  }, [phase]);

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

  // Calculate emission wavelength based on excitation (Stokes shift)
  const calculateStokesShift = (excitation: number, material: string): number => {
    const baseShift = getMaterialProps(material).emissionWavelength - 365; // Base shift from 365nm UV
    return Math.max(excitation + 50 + (baseShift / 3), excitation + 30); // Minimum 30nm Stokes shift
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────────

  // Animated Jablonski Diagram
  const renderJablonskiDiagram = () => {
    const fluorophore = FLUOROPHORES[selectedFluorophore];
    const excitationColor = wavelengthToColor(excitationWavelength);
    const emissionColor = fluorophore.color;

    return (
      <svg viewBox="0 0 300 200" className="w-full h-40">
        <defs>
          <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,8 L4,0 L8,8" fill="none" stroke={excitationColor} strokeWidth="1.5" />
          </marker>
          <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L4,8 L8,0" fill="none" stroke={emissionColor} strokeWidth="1.5" />
          </marker>
          <filter id="jabGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="300" height="200" fill="#0f172a" rx="8" />

        {/* Title */}
        <text x="150" y="20" textAnchor="middle" className="fill-violet-300 text-xs font-bold">Jablonski Diagram</text>

        {/* Ground state S0 */}
        <rect x="40" y="160" width="80" height="8" fill="#374151" rx="2" />
        <text x="80" y="180" textAnchor="middle" className="fill-gray-400 text-xs">S0 (Ground)</text>

        {/* Excited vibrational levels */}
        <rect x="40" y="80" width="80" height="4" fill="#4b5563" rx="1" />
        <rect x="40" y="70" width="80" height="4" fill="#4b5563" rx="1" />
        <rect x="40" y="60" width="80" height="4" fill="#6b7280" rx="1" />
        <text x="80" y="50" textAnchor="middle" className="fill-gray-400 text-xs">S1 (Excited)</text>

        {/* Triplet state (for phosphorescence) */}
        {showPhosphorescence && (
          <>
            <rect x="180" y="100" width="80" height="4" fill="#9333ea" rx="1" />
            <text x="220" y="120" textAnchor="middle" className="fill-purple-400 text-xs">T1 (Triplet)</text>
          </>
        )}

        {/* Absorption arrow */}
        {uvOn && (jablonskiStep === 0 || jablonskiStep === 1) && (
          <g filter="url(#jabGlow)">
            <line
              x1="60"
              y1="155"
              x2="60"
              y2="65"
              stroke={excitationColor}
              strokeWidth="3"
              markerEnd="url(#arrowUp)"
              opacity={jablonskiStep === 0 ? 1 : 0.5}
            />
            <text x="30" y="110" className="fill-violet-400 text-xs font-semibold" transform="rotate(-90, 30, 110)">Absorb</text>
          </g>
        )}

        {/* Vibrational relaxation (heat loss) */}
        {uvOn && jablonskiStep === 1 && (
          <g>
            <path
              d="M 80 65 Q 90 72 80 80"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <text x="95" y="75" className="fill-yellow-400 text-xs">Heat</text>
          </g>
        )}

        {/* Emission arrow (fluorescence) */}
        {uvOn && (jablonskiStep === 2 || jablonskiStep === 3) && !showPhosphorescence && (
          <g filter="url(#jabGlow)">
            <line
              x1="100"
              y1="85"
              x2="100"
              y2="155"
              stroke={emissionColor}
              strokeWidth="3"
              markerEnd="url(#arrowDown)"
              opacity={jablonskiStep === 2 ? 1 : 0.5}
            />
            <text x="130" y="120" className="text-xs font-semibold" style={{ fill: emissionColor }}>Emit</text>
          </g>
        )}

        {/* ISC and Phosphorescence for triplet state */}
        {uvOn && showPhosphorescence && jablonskiStep >= 1 && (
          <>
            {/* Intersystem crossing */}
            <path
              d="M 120 80 Q 150 90 180 100"
              fill="none"
              stroke="#9333ea"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <text x="145" y="85" className="fill-purple-400 text-xs">ISC</text>

            {/* Phosphorescence emission (slower, from T1) */}
            {jablonskiStep >= 2 && (
              <g filter="url(#jabGlow)" opacity={phosphorescenceDecay / 100}>
                <line
                  x1="220"
                  y1="105"
                  x2="220"
                  y2="155"
                  stroke="#c084fc"
                  strokeWidth="3"
                  markerEnd="url(#arrowDown)"
                />
                <text x="240" y="130" className="fill-purple-400 text-xs">Phos.</text>
              </g>
            )}
          </>
        )}

        {/* Energy labels */}
        <text x="10" y="60" className="fill-gray-500 text-xs">High E</text>
        <text x="10" y="165" className="fill-gray-500 text-xs">Low E</text>

        {/* Stokes shift indicator */}
        <g transform="translate(200, 160)">
          <text x="0" y="0" className="fill-gray-400 text-xs">Stokes Shift:</text>
          <text x="0" y="15" className="fill-emerald-400 text-xs font-bold">
            {fluorophore.emission - fluorophore.excitation}nm
          </text>
        </g>
      </svg>
    );
  };

  // Emission spectrum visualization
  const renderEmissionSpectrum = () => {
    const matProps = getMaterialProps(selectedMaterial);
    const emissionWl = calculateStokesShift(excitationWavelength, selectedMaterial);
    const intensityFactor = (lightIntensity / 100) * (fluorophoreConcentration / 100);

    return (
      <svg viewBox="0 0 300 120" className="w-full h-28">
        <defs>
          <linearGradient id="spectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="20%" stopColor="#3b82f6" />
            <stop offset="35%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="65%" stopColor="#eab308" />
            <stop offset="80%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        <rect width="300" height="120" fill="#0f172a" rx="8" />

        {/* Spectrum bar */}
        <rect x="20" y="80" width="260" height="15" fill="url(#spectrumGrad)" rx="2" />

        {/* Wavelength labels */}
        <text x="20" y="108" className="fill-gray-500 text-xs">380nm</text>
        <text x="145" y="108" textAnchor="middle" className="fill-gray-500 text-xs">550nm</text>
        <text x="270" y="108" textAnchor="end" className="fill-gray-500 text-xs">700nm</text>

        {/* Excitation marker */}
        {uvOn && (
          <g transform={`translate(${20 + ((excitationWavelength - 300) / 500) * 260}, 0)`}>
            <line x1="0" y1="25" x2="0" y2="78" stroke={wavelengthToColor(excitationWavelength)} strokeWidth="3" />
            <text x="0" y="20" textAnchor="middle" className="fill-violet-400 text-xs font-bold">Excitation</text>
            <text x="0" y="35" textAnchor="middle" className="fill-violet-300 text-xs">{excitationWavelength}nm</text>
          </g>
        )}

        {/* Emission peak */}
        {uvOn && matProps.fluorescent && (
          <g transform={`translate(${20 + ((emissionWl - 300) / 500) * 260}, 0)`}>
            {/* Emission curve */}
            <path
              d={`M -30 75 Q 0 ${75 - 40 * intensityFactor} 30 75`}
              fill={matProps.emitColor}
              opacity={0.5}
            />
            <line x1="0" y1="25" x2="0" y2="78" stroke={matProps.emitColor} strokeWidth="3" />
            <text x="0" y="20" textAnchor="middle" style={{ fill: matProps.emitColor }} className="text-xs font-bold">Emission</text>
            <text x="0" y="35" textAnchor="middle" style={{ fill: matProps.emitColor }} className="text-xs">{Math.round(emissionWl)}nm</text>
          </g>
        )}

        {/* Stokes shift arrow */}
        {uvOn && matProps.fluorescent && (
          <g>
            <line
              x1={20 + ((excitationWavelength - 300) / 500) * 260 + 5}
              y1="55"
              x2={20 + ((emissionWl - 300) / 500) * 260 - 5}
              y2="55"
              stroke="#22c55e"
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
            <text
              x={(20 + ((excitationWavelength - 300) / 500) * 260 + 20 + ((emissionWl - 300) / 500) * 260) / 2}
              y="50"
              textAnchor="middle"
              className="fill-emerald-400 text-xs"
            >
              Stokes Shift
            </text>
          </g>
        )}
      </svg>
    );
  };

  const renderFluorescenceScene = (material: string, uvActive: boolean, regularLight: boolean) => {
    const props = getMaterialProps(material);
    const isGlowing = uvActive && props.fluorescent;
    const ambientLight = regularLight ? 0.8 : (uvActive ? 0.2 : 0.05);
    const glowIntensity = (lightIntensity / 100) * (fluorophoreConcentration / 100);

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Background - dark room when UV only */}
        <rect width="400" height="280" fill={regularLight ? '#1e293b' : '#0a0a15'} />

        {/* UV Light Source */}
        <g transform="translate(320, 30)">
          <rect x="-25" y="0" width="50" height="80" rx="5" fill="#1f2937" />
          <rect x="-20" y="70" width="40" height="30" rx="3" fill={uvActive ? '#7c3aed' : '#374151'} />
          {uvActive && (
            <>
              {/* UV beam cone */}
              <path
                d="M -20 100 L -60 260 L 60 260 L 20 100 Z"
                fill="url(#uvGradient)"
                opacity={0.4 * (lightIntensity / 100)}
              />
              {/* UV rays */}
              {[...Array(Math.ceil(lightIntensity / 20))].map((_, i) => (
                <line
                  key={i}
                  x1={-15 + i * 8}
                  y1="100"
                  x2={-45 + i * 25}
                  y2="250"
                  stroke={wavelengthToColor(excitationWavelength)}
                  strokeWidth="2"
                  opacity={0.3 + Math.sin(animPhase + i) * 0.2}
                />
              ))}
            </>
          )}
        </g>

        {/* Gradient definitions */}
        <defs>
          <radialGradient id="uvGradient" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor={wavelengthToColor(excitationWavelength)} stopOpacity="0.6" />
            <stop offset="100%" stopColor={wavelengthToColor(excitationWavelength)} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={props.emitGlow} stopOpacity={0.9 * glowIntensity} />
            <stop offset="50%" stopColor={props.emitGlow} stopOpacity={0.4 * glowIntensity} />
            <stop offset="100%" stopColor={props.emitGlow} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Material/Object */}
        <g transform="translate(120, 140)">
          {/* Glow effect when fluorescent and UV active */}
          {isGlowing && (
            <ellipse
              cx="50"
              cy="60"
              rx={70 + Math.sin(animPhase) * 5 * glowIntensity}
              ry={50 + Math.sin(animPhase) * 5 * glowIntensity}
              fill="url(#glowGradient)"
              className="animate-pulse"
            />
          )}

          {/* Object base */}
          {material.includes('highlighter') && (
            <g>
              <rect x="20" y="30" width="60" height="60" rx="4" fill={isGlowing ? props.emitColor : '#fef08a'} filter={isGlowing ? 'url(#glow)' : ''} opacity={ambientLight} />
              <text x="50" y="70" textAnchor="middle" className="fill-gray-800 text-xs font-bold">TEXT</text>
            </g>
          )}
          {material === 'paper' && (
            <rect x="10" y="20" width="80" height="80" rx="2" fill={`rgba(245, 245, 220, ${ambientLight})`} />
          )}
          {material === 'tonic' && (
            <g>
              <rect x="30" y="10" width="40" height="90" rx="3" fill="#374151" />
              <rect x="35" y="25" width="30" height="70" rx="2" fill={isGlowing ? props.emitColor : `rgba(200, 230, 255, ${ambientLight})`} filter={isGlowing ? 'url(#glow)' : ''} />
              {/* Bubbles */}
              {[...Array(5)].map((_, i) => (
                <circle
                  key={i}
                  cx={40 + (i % 3) * 10}
                  cy={80 - ((animPhase * 10 + i * 15) % 50)}
                  r={2}
                  fill={isGlowing ? '#00ffff' : '#ffffff'}
                  opacity={0.5}
                />
              ))}
            </g>
          )}
          {material === 'mineral' && (
            <g>
              {/* Crystal shape */}
              <polygon
                points="50,10 80,40 70,90 30,90 20,40"
                fill={isGlowing ? props.emitColor : '#8b7355'}
                filter={isGlowing ? 'url(#glow)' : ''}
                opacity={ambientLight}
              />
              <polygon
                points="50,10 65,35 50,50 35,35"
                fill={isGlowing ? '#ff8888' : '#a0896b'}
                opacity={ambientLight * 0.8}
              />
            </g>
          )}
          {material === 'laundry_detergent' && (
            <g>
              <rect x="25" y="20" width="50" height="70" rx="5" fill="#2563eb" />
              <rect x="30" y="30" width="40" height="20" rx="2" fill={isGlowing ? props.emitColor : '#60a5fa'} filter={isGlowing ? 'url(#glow)' : ''} />
              <text x="50" y="75" textAnchor="middle" className="fill-white text-xs">SOAP</text>
            </g>
          )}
        </g>

        {/* Energy diagram (small) */}
        {uvActive && props.fluorescent && (
          <g transform="translate(20, 180)">
            <text x="0" y="0" className="fill-violet-400 text-xs">UV ({excitationWavelength}nm)</text>
            <line x1="0" y1="10" x2="30" y2="10" stroke={wavelengthToColor(excitationWavelength)} strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="0" y="40" className="fill-gray-400 text-xs">-&gt;</text>
            <text x="15" y="55" style={{ fill: props.emitColor }} className="text-xs">Visible ({props.emissionWavelength}nm)</text>
            <line x1="0" y1="65" x2="30" y2="65" stroke={props.emitColor} strokeWidth="2" />
          </g>
        )}

        {/* Labels */}
        <text x="200" y="270" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {props.name}
        </text>

        {/* Light status */}
        <g transform="translate(10, 20)">
          <circle cx="10" cy="10" r="8" fill={regularLight ? '#fbbf24' : '#374151'} />
          <text x="25" y="14" className="fill-gray-400 text-xs">Room Light</text>
          <circle cx="10" cy="35" r="8" fill={uvActive ? wavelengthToColor(excitationWavelength) : '#374151'} />
          <text x="25" y="39" className="fill-gray-400 text-xs">UV Light ({excitationWavelength}nm)</text>
        </g>

        {/* Arrow marker */}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill={wavelengthToColor(excitationWavelength)} />
          </marker>
        </defs>
      </svg>
    );
  };

  // Twist scene with fluorophore comparison and phosphorescence
  const renderTwistScene = () => {
    const currentFluorophore = FLUOROPHORES[selectedFluorophore];
    const decayOpacity = showPhosphorescence && !uvOn ? phosphorescenceDecay / 100 : 1;

    return (
      <svg viewBox="0 0 400 300" className="w-full h-64">
        <rect width="400" height="300" fill="#0a0a15" />

        {/* UV light indicator */}
        {uvOn && (
          <rect x="0" y="0" width="400" height="300" fill="#1a0a2e" opacity="0.5" />
        )}

        {/* Fluorophore display */}
        <g transform="translate(50, 50)">
          {/* Sample container */}
          <rect x="0" y="0" width="120" height="150" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />

          {/* Fluorescent sample */}
          {(uvOn || (showPhosphorescence && phosphorescenceDecay > 0)) && (
            <g>
              <rect
                x="15"
                y="20"
                width="90"
                height="110"
                rx="4"
                fill={currentFluorophore.color}
                opacity={decayOpacity * (lightIntensity / 100)}
                filter="url(#glow)"
              />
              {/* Glow effect */}
              <ellipse
                cx="60"
                cy="75"
                rx={50 + Math.sin(animPhase) * 5}
                ry={40 + Math.sin(animPhase) * 5}
                fill={currentFluorophore.color}
                opacity={0.3 * decayOpacity}
              />
            </g>
          )}

          {/* Sample when off */}
          {!uvOn && (!showPhosphorescence || phosphorescenceDecay === 0) && (
            <rect x="15" y="20" width="90" height="110" rx="4" fill="#374151" />
          )}

          <text x="60" y="180" textAnchor="middle" className="fill-gray-300 text-xs font-semibold">
            {currentFluorophore.name.split('(')[0]}
          </text>
        </g>

        {/* Info panel */}
        <g transform="translate(200, 50)">
          <rect x="0" y="0" width="180" height="150" rx="8" fill="#1f2937" stroke="#374151" />

          <text x="90" y="25" textAnchor="middle" className="fill-white text-sm font-bold">Properties</text>

          <text x="15" y="50" className="fill-gray-400 text-xs">Excitation:</text>
          <text x="165" y="50" textAnchor="end" className="fill-violet-400 text-xs font-semibold">{currentFluorophore.excitation}nm</text>

          <text x="15" y="70" className="fill-gray-400 text-xs">Emission:</text>
          <text x="165" y="70" textAnchor="end" style={{ fill: currentFluorophore.color }} className="text-xs font-semibold">{currentFluorophore.emission}nm</text>

          <text x="15" y="90" className="fill-gray-400 text-xs">Stokes Shift:</text>
          <text x="165" y="90" textAnchor="end" className="fill-emerald-400 text-xs font-semibold">{currentFluorophore.emission - currentFluorophore.excitation}nm</text>

          <text x="15" y="115" className="fill-gray-500 text-xs" style={{ fontSize: '9px' }}>
            {currentFluorophore.description}
          </text>

          {/* Decay indicator for phosphorescence */}
          {showPhosphorescence && (
            <g transform="translate(15, 130)">
              <text x="0" y="0" className="fill-purple-400 text-xs">Decay: {phosphorescenceDecay}%</text>
              <rect x="60" y="-8" width="100" height="8" fill="#374151" rx="2" />
              <rect x="60" y="-8" width={phosphorescenceDecay} height="8" fill="#9333ea" rx="2" />
            </g>
          )}
        </g>

        {/* Fluorescence vs Phosphorescence comparison */}
        <g transform="translate(50, 220)">
          <rect x="0" y="0" width="300" height="60" rx="8" fill={showPhosphorescence ? '#3b0764' : '#1f2937'} stroke={showPhosphorescence ? '#9333ea' : '#374151'} />

          <text x="150" y="20" textAnchor="middle" className="fill-white text-xs font-bold">
            {showPhosphorescence ? 'Phosphorescence Mode' : 'Fluorescence Mode'}
          </text>
          <text x="150" y="38" textAnchor="middle" className="fill-gray-400 text-xs">
            {showPhosphorescence
              ? 'Triplet state - slow decay (ms to hours)'
              : 'Singlet state - instant emission (ns)'}
          </text>
          <text x="150" y="52" textAnchor="middle" className={showPhosphorescence ? 'fill-purple-400' : 'fill-cyan-400'} style={{ fontSize: '9px' }}>
            {showPhosphorescence
              ? 'Turn off UV to see glow-in-dark effect'
              : 'Emission stops instantly when UV stops'}
          </text>
        </g>

        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    );
  };

  const handlePrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(pred);
    playSound(pred === 'absorb' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(pred);
    playSound(pred === 'different' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    const currentQuestion = testAnswers.length;
    const isCorrect = TEST_QUESTIONS[currentQuestion].options[answerIndex]?.correct;
    playSound(isCorrect ? 'success' : 'failure');
    setTestAnswers([...testAnswers, answerIndex]);
  }, [testAnswers, playSound]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const calculateScore = () => testAnswers.filter((a, i) => TEST_QUESTIONS[i].options[a]?.correct).length;

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-violet-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-transparent">
        The Glowing Highlighter Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how invisible light creates visible glow
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🖍️🔦</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You&apos;ve seen highlighters glow bright under a blacklight at parties.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But here&apos;s the mystery: <span className="text-fuchsia-400 font-semibold">UV light is invisible</span>, yet the highlighter
              glows <span className="text-green-400 font-semibold">visible green</span>!
            </p>
            <div className="pt-2">
              <p className="text-base text-violet-400 font-semibold">
                How does invisible light create visible glow?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => { playSound('click'); goToNextPhase(); }}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-violet-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">*</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-violet-400">*</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          You shine an invisible UV light on a yellow highlighter. What will happen?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'reflect', text: 'The UV bounces back as UV (still invisible)', icon: '↩️' },
          { id: 'absorb', text: 'The highlighter absorbs UV and re-emits VISIBLE light', icon: '*' },
          { id: 'nothing', text: 'Nothing - UV passes right through transparent ink', icon: '->' },
          { id: 'heat', text: 'The highlighter heats up but doesn\'t glow', icon: '~' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { handlePrediction(option.id); }}
            style={{ zIndex: 10 }}
            disabled={prediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? option.id === 'absorb' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : prediction !== null && option.id === 'absorb'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {prediction === 'absorb' ? 'Correct!' : 'Not quite.'} Fluorescent molecules absorb UV and re-emit visible light!
          </p>
          <button
            onClick={() => { playSound('click'); goToNextPhase(); }}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl"
          >
            Test It! -&gt;
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Experiment: UV Fluorescence</h2>

      {/* Main visualization */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderFluorescenceScene(selectedMaterial, uvOn, regularLightOn)}
      </div>

      {/* Jablonski Diagram */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-violet-300">Animated Jablonski Diagram</h3>
          <button
            onClick={() => setShowJablonskiAnimation(!showJablonskiAnimation)}
            style={{ zIndex: 10 }}
            className={`text-xs px-3 py-1 rounded-full ${showJablonskiAnimation ? 'bg-violet-600' : 'bg-gray-700'} text-white`}
          >
            {showJablonskiAnimation ? 'ON' : 'OFF'}
          </button>
        </div>
        {renderJablonskiDiagram()}
      </div>

      {/* Emission Spectrum */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        <h3 className="text-sm font-semibold text-violet-300 mb-2">Emission Spectrum & Stokes Shift</h3>
        {renderEmissionSpectrum()}
      </div>

      {/* Interactive Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full mb-4">
        <div className="space-y-4">
          {/* Excitation Wavelength Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Excitation Wavelength: {excitationWavelength}nm</label>
            <input
              type="range"
              min="300"
              max="500"
              value={excitationWavelength}
              onChange={(e) => setExcitationWavelength(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-400 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: wavelengthToColor(excitationWavelength) }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>UV (300nm)</span>
              <span>Visible (500nm)</span>
            </div>
          </div>

          {/* Light Intensity Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Light Intensity: {lightIntensity}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-gray-700 to-yellow-400 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Dim</span>
              <span>Bright</span>
            </div>
          </div>

          {/* Fluorophore Concentration Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Fluorophore Concentration: {fluorophoreConcentration}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={fluorophoreConcentration}
              onChange={(e) => setFluorophoreConcentration(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-gray-700 to-green-400 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-gray-400 text-sm">Material:</label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value as typeof selectedMaterial)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
          >
            <option value="highlighter">Yellow Highlighter</option>
            <option value="paper">Plain Paper</option>
            <option value="tonic">Tonic Water</option>
            <option value="mineral">Fluorite Crystal</option>
          </select>

          <button
            onClick={() => { playSound('click'); setRegularLightOn(!regularLightOn); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              regularLightOn
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Room Light: {regularLightOn ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => { playSound('click'); setUvOn(!uvOn); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              uvOn
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            UV Light: {uvOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {uvOn && getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-fuchsia-300 text-sm">
            <strong>Fluorescence!</strong> UV photons ({excitationWavelength}nm, high energy) are absorbed.
            The molecule re-emits light at a <em>longer wavelength</em> ({getMaterialProps(selectedMaterial).emissionWavelength}nm) - visible!
          </p>
          <p className="text-emerald-400 text-xs mt-2">
            Stokes Shift: {getMaterialProps(selectedMaterial).emissionWavelength - excitationWavelength}nm (energy lost as heat)
          </p>
        </div>
      )}

      {uvOn && !getMaterialProps(selectedMaterial).fluorescent && (
        <div className="bg-gray-800/50 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-gray-400 text-sm">
            <strong>No fluorescence.</strong> This material lacks the special molecules
            that can absorb UV and re-emit visible light.
          </p>
        </div>
      )}

      <button
        onClick={() => { playSound('click'); goToNextPhase(); }}
        style={{ zIndex: 10 }}
        className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
      >
        Continue -&gt;
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">What&apos;s Really Happening</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">UV Absorption</h3>
              <p className="text-gray-400 text-sm">High-energy UV photon excites electron to higher state</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-fuchsia-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Energy Loss</h3>
              <p className="text-gray-400 text-sm">Some energy lost as heat (vibrational relaxation)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Visible Emission</h3>
              <p className="text-gray-400 text-sm">Lower-energy photon emitted - longer wavelength = visible!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-violet-900/30 rounded-xl p-4 max-w-lg w-full mb-6 text-center">
        <p className="text-violet-300 font-semibold">Stokes Shift</p>
        <p className="text-gray-400 text-sm mt-1">
          The wavelength difference between absorbed (UV ~365nm) and emitted (green ~520nm) light.
          Named after physicist George Stokes.
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-violet-400 font-semibold">{prediction === 'absorb' ? 'Correct!' : 'Not quite'}</span></p>
        <button
          onClick={() => { playSound('click'); goToNextPhase(); }}
          style={{ zIndex: 10 }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          But wait... -&gt;
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">~ The Twist!</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          Different highlighter colors (yellow, pink, green) all absorb the <span className="text-violet-400">same UV light</span>.
          What color will they each glow?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'same', text: 'They all glow the same color (UV is UV)', icon: 'O' },
          { id: 'different', text: 'They each glow their own DIFFERENT visible color', icon: '~' },
          { id: 'white', text: 'They all glow white when fluorescent', icon: '[]' },
          { id: 'none', text: 'Only yellow highlighters can fluoresce', icon: '*' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => { handleTwistPrediction(option.id); }}
            style={{ zIndex: 10 }}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? option.id === 'different' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : twistPrediction !== null && option.id === 'different'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'different' ? 'Correct!' : 'Not quite.'} Each molecule has its own energy levels!
          </p>
          <button
            onClick={() => { playSound('click'); goToNextPhase(); }}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Test It! -&gt;
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">Advanced Fluorescence Lab</h2>

      {/* Main visualization */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-lg">
        {renderTwistScene()}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full mb-4">
        <div className="space-y-3">
          {/* Fluorophore Selection */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Fluorophore Type:</label>
            <select
              value={selectedFluorophore}
              onChange={(e) => setSelectedFluorophore(e.target.value as keyof typeof FLUOROPHORES)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
            >
              {Object.entries(FLUOROPHORES).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>

          {/* Intensity slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <label className="text-gray-400 text-sm block mb-2">Excitation Intensity: {lightIntensity}%</label>
            <input
              type="range"
              min="10"
              max="100"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-gray-700 to-violet-400 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-3">
          {/* UV Toggle */}
          <button
            onClick={() => { playSound('click'); setUvOn(!uvOn); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
              uvOn
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            UV Light: {uvOn ? 'ON' : 'OFF'}
          </button>

          {/* Phosphorescence Toggle */}
          <button
            onClick={() => { playSound('click'); setShowPhosphorescence(!showPhosphorescence); }}
            style={{ zIndex: 10 }}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
              showPhosphorescence
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Phosphorescence Mode: {showPhosphorescence ? 'ON' : 'OFF'}
          </button>

          {/* Reset decay button */}
          {showPhosphorescence && (
            <button
              onClick={() => { setPhosphorescenceDecay(100); setUvOn(false); }}
              style={{ zIndex: 10 }}
              className="w-full px-4 py-2 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Test Glow-in-Dark Effect
            </button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 max-w-lg w-full mb-4">
        <div className="bg-cyan-900/30 rounded-xl p-3 border border-cyan-500/30">
          <p className="text-cyan-300 text-xs font-semibold">Fluorescence</p>
          <p className="text-gray-400 text-xs mt-1">Instant emission (~ns)</p>
          <p className="text-gray-500 text-xs">Singlet to singlet transition</p>
        </div>
        <div className="bg-purple-900/30 rounded-xl p-3 border border-purple-500/30">
          <p className="text-purple-300 text-xs font-semibold">Phosphorescence</p>
          <p className="text-gray-400 text-xs mt-1">Delayed emission (ms-hrs)</p>
          <p className="text-gray-500 text-xs">Triplet to singlet (forbidden)</p>
        </div>
      </div>

      {/* Fluorophore comparison info */}
      <div className="bg-gradient-to-r from-fuchsia-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
        <p className="text-fuchsia-300 text-sm text-center">
          <strong>Different fluorophores = Different emission colors!</strong><br />
          Each molecule has unique energy levels determining its Stokes shift.
        </p>
        <div className="flex justify-center gap-4 mt-3">
          {Object.entries(FLUOROPHORES).slice(0, 4).map(([key, val]) => (
            <div key={key} className="text-center">
              <div
                className="w-4 h-4 rounded-full mx-auto mb-1"
                style={{ backgroundColor: val.color }}
              />
              <p className="text-gray-400 text-xs">{val.emission}nm</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => { playSound('click'); goToNextPhase(); }}
        style={{ zIndex: 10 }}
        className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
      >
        Continue -&gt;
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">The Molecular Fingerprint</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <p className="text-gray-300 text-center mb-4">
          Each fluorescent molecule has <span className="text-fuchsia-400 font-semibold">unique energy levels</span>.
          The Stokes shift varies by molecule!
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-green-400 font-semibold">GFP</div>
            <div className="text-gray-500">Emits 509nm (green)</div>
            <div className="text-gray-600 text-xs">Stokes: 114nm</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-red-400 font-semibold">Rhodamine B</div>
            <div className="text-gray-500">Emits 565nm (red)</div>
            <div className="text-gray-600 text-xs">Stokes: 22nm</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">DAPI</div>
            <div className="text-gray-500">Emits 461nm (blue)</div>
            <div className="text-gray-600 text-xs">Stokes: 103nm</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-orange-400 font-semibold">Quantum Dots</div>
            <div className="text-gray-500">Tunable emission</div>
            <div className="text-gray-600 text-xs">Size-dependent!</div>
          </div>
        </div>
      </div>

      <div className="bg-purple-900/30 rounded-xl p-4 max-w-lg w-full mb-6">
        <p className="text-purple-300 font-semibold text-center mb-2">Fluorescence vs Phosphorescence</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-cyan-400">Fluorescence</p>
            <ul className="text-gray-400 text-xs list-disc pl-4">
              <li>Nanosecond lifetime</li>
              <li>Spin-allowed transition</li>
              <li>Stops immediately</li>
            </ul>
          </div>
          <div>
            <p className="text-purple-400">Phosphorescence</p>
            <ul className="text-gray-400 text-xs list-disc pl-4">
              <li>Milliseconds to hours</li>
              <li>Spin-forbidden (triplet)</li>
              <li>Glow-in-dark effect</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-fuchsia-400 font-semibold">{twistPrediction === 'different' ? 'Correct!' : 'Not quite'}</span></p>
        <button
          onClick={() => { playSound('click'); goToNextPhase(); }}
          style={{ zIndex: 10 }}
          className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl text-white font-semibold hover:from-fuchsia-500 hover:to-pink-500 transition-all"
        >
          See Applications -&gt;
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-gray-400 mb-4">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-6">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onClick={() => { handleAppComplete(index); }}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-violet-500 bg-violet-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-violet-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onClick={() => { playSound('click'); goToNextPhase(); }}
          style={{ zIndex: 10 }}
          className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          Take the Quiz -&gt;
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question || showTestResults) {
      const score = calculateScore();
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-4">{score >= 3 ? '+' : '#'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-gray-300 mb-6">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onClick={() => {
              if (score >= 3) {
                playSound('complete');
                goToNextPhase();
              } else {
                setTestAnswers([]);
                setShowTestResults(false);
                goToPhase('review');
              }
            }}
            style={{ zIndex: 10 }}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            {score >= 3 ? 'Complete! +' : 'Review & Try Again'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mb-6">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => { handleTestAnswer(i); }}
              style={{ zIndex: 10 }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-violet-500 transition-all text-left text-gray-200"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-violet-900/50 via-fuchsia-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">+</div>
        <h1 className="text-3xl font-bold text-white mb-4">Fluorescence Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered the physics of fluorescence!</p>
        <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 rounded-xl p-6 mb-6">
          <p className="text-violet-300 font-medium mb-4">You now understand:</p>
          <ul className="text-gray-300 text-sm space-y-2 text-left">
            <li>- UV absorption by fluorescent molecules</li>
            <li>- Re-emission at longer wavelength (Stokes shift)</li>
            <li>- Different molecules = different emission colors</li>
            <li>- Fluorescence vs phosphorescence (lifetime difference)</li>
            <li>- Real-world applications from security to forensics</li>
          </ul>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Next time you see a blacklight party, you&apos;ll know the physics of that glow!
        </p>
        <button
          onClick={() => { playSound('click'); goToPhase('hook'); }}
          style={{ zIndex: 10 }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          ~ Explore Again
        </button>
      </div>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Fluorescence</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, index) => (
              <button
                key={p}
                onClick={() => { playSound('click'); goToPhase(p); }}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-violet-400 w-6 shadow-lg shadow-violet-400/30'
                    : PHASE_ORDER.indexOf(phase) > index
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-violet-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default FluorescenceRenderer;
