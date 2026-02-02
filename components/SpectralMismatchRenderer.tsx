'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Spectral Mismatch - Complete 10-Phase Game
// Why two equally bright lights can produce very different solar panel power
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

interface SpectralMismatchRendererProps {
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
    scenario: "A solar panel test lab uses a halogen lamp that appears as bright as sunlight. However, the measured panel efficiency is 20% lower than outdoor tests.",
    question: "What is the most likely cause of this discrepancy?",
    options: [
      { id: 'a', label: "The panel is damaged from indoor testing" },
      { id: 'b', label: "Halogen lamps emit mostly infrared, which silicon cannot fully convert", correct: true },
      { id: 'c', label: "Indoor temperature is different from outdoor" },
      { id: 'd', label: "The panel needs direct sunlight to activate" }
    ],
    explanation: "Halogen lamps emit approximately 85% of their energy as infrared radiation. While this appears bright to human eyes (which are sensitive to visible light), silicon solar cells cannot efficiently convert wavelengths beyond 1127nm, resulting in lower power output despite similar perceived brightness."
  },
  {
    scenario: "An engineer notices that a solar-powered calculator works great under fluorescent office lights but barely functions under a 100W incandescent desk lamp at the same distance.",
    question: "Why does the calculator perform so differently under these similar-brightness lights?",
    options: [
      { id: 'a', label: "Incandescent bulbs produce more heat that damages the calculator" },
      { id: 'b', label: "Fluorescent lights emit more usable visible wavelengths while incandescent is mostly infrared", correct: true },
      { id: 'c', label: "The calculator is designed only for fluorescent light" },
      { id: 'd', label: "Incandescent light flickers too fast for the solar cell" }
    ],
    explanation: "Fluorescent lights emit primarily in the visible spectrum (400-700nm) where amorphous silicon cells in calculators work efficiently. Incandescent bulbs waste 87% of energy as infrared heat, producing very little usable light for the cell despite appearing equally bright to our eyes."
  },
  {
    scenario: "A multi-junction solar cell designed for space achieves 47% efficiency under AM0 sunlight, but only 42% under a standard xenon solar simulator.",
    question: "What causes this efficiency difference?",
    options: [
      { id: 'a', label: "The xenon simulator is not bright enough" },
      { id: 'b', label: "Space radiation damages the cell on Earth" },
      { id: 'c', label: "The xenon spectrum differs from actual sunlight, causing current mismatch between junctions", correct: true },
      { id: 'd', label: "The cell works better in a vacuum" }
    ],
    explanation: "Multi-junction cells have multiple layers optimized for different wavelengths. Each junction must produce matching current for optimal efficiency. Even small spectral differences between a xenon simulator and actual sunlight can cause current mismatch, reducing overall efficiency."
  },
  {
    scenario: "A photon with wavelength 500nm (green) strikes a silicon solar cell with 1.1eV bandgap. The photon has energy of 2.48eV.",
    question: "What happens to the extra 1.38eV of energy beyond the bandgap?",
    options: [
      { id: 'a', label: "It creates additional electrons for more current" },
      { id: 'b', label: "It is stored in the cell for later use" },
      { id: 'c', label: "It is converted to heat through thermalization", correct: true },
      { id: 'd', label: "It reflects back out of the cell" }
    ],
    explanation: "When a photon has more energy than the bandgap, only the bandgap energy can be converted to electrical energy. The excess energy (1.38eV in this case) is lost as heat through a process called thermalization, as the excited electron releases energy to reach the conduction band edge."
  },
  {
    scenario: "An agrivoltaic system uses semi-transparent solar panels over crops. The panels absorb UV and green light but transmit red and blue light.",
    question: "Why is this spectral selection advantageous for both power generation and plant growth?",
    options: [
      { id: 'a', label: "Plants need UV light to grow properly" },
      { id: 'b', label: "Green light provides the most energy for solar cells" },
      { id: 'c', label: "Plants primarily use red and blue light for photosynthesis while reflecting green", correct: true },
      { id: 'd', label: "Transparent panels are cheaper to manufacture" }
    ],
    explanation: "Plants reflect green light (why they appear green) and primarily use red and blue wavelengths for photosynthesis. By absorbing green and UV light for electricity while transmitting photosynthetically active radiation (PAR), agrivoltaic panels can generate power without significantly impacting crop yields."
  },
  {
    scenario: "A solar panel rated at 300W under AM1.5 conditions produces only 250W when tested under a Class C solar simulator with spectral mismatch of 0.75-1.25.",
    question: "What does the spectral mismatch factor tell us about this test?",
    options: [
      { id: 'a', label: "The simulator is 17% less bright than the sun" },
      { id: 'b', label: "The simulator spectrum deviates up to 25% from reference spectrum in certain bands", correct: true },
      { id: 'c', label: "The panel has degraded by 17%" },
      { id: 'd', label: "Temperature compensation was not applied" }
    ],
    explanation: "Solar simulator classes (A, B, C) specify spectral match tolerances. A 0.75-1.25 range means the simulator output can be 25% lower or higher than the AM1.5 reference spectrum in each wavelength band. This mismatch directly affects measured panel performance, especially for cells sensitive to specific wavelengths."
  },
  {
    scenario: "An indoor light-harvesting PV cell is designed with a 1.9eV bandgap instead of silicon's 1.1eV bandgap.",
    question: "Why would a higher bandgap be better for indoor light harvesting?",
    options: [
      { id: 'a', label: "Higher bandgap cells are more durable" },
      { id: 'b', label: "Indoor LED lights emit at higher energy wavelengths, reducing thermalization losses", correct: true },
      { id: 'c', label: "Indoor cells need to work faster than outdoor cells" },
      { id: 'd', label: "Higher bandgap materials are cheaper" }
    ],
    explanation: "Indoor LED lights emit primarily in the 400-700nm range (1.8-3.1eV). A silicon cell (1.1eV) would waste significant energy as heat through thermalization. A 1.9eV bandgap better matches LED emission peaks, capturing more energy with less thermalization loss and achieving up to 30% indoor efficiency."
  },
  {
    scenario: "A research team compares perovskite (1.6eV bandgap) and silicon (1.1eV bandgap) cells under the same light. The perovskite produces higher voltage but lower current.",
    question: "What fundamental trade-off explains this behavior?",
    options: [
      { id: 'a', label: "Perovskite material is more expensive and thus more efficient" },
      { id: 'b', label: "Higher bandgap gives higher voltage but absorbs fewer photons (less current)", correct: true },
      { id: 'c', label: "Perovskite cells are newer technology with better design" },
      { id: 'd', label: "Silicon cells have worse electrical contacts" }
    ],
    explanation: "The bandgap determines both the voltage (proportional to Eg) and which photons are absorbed (only those with E > Eg). Higher bandgap materials produce higher voltage but can't absorb lower-energy infrared photons that silicon can, resulting in lower current. This is the fundamental bandgap-efficiency trade-off."
  },
  {
    scenario: "The AM1.5 solar spectrum has peaks around 500nm (visible) but significant power extends to 1100nm (near-IR). Human eyes perceive most light as coming from the visible portion.",
    question: "Why might two light sources with equal perceived brightness have very different solar cell outputs?",
    options: [
      { id: 'a', label: "Solar cells are calibrated for human vision" },
      { id: 'b', label: "Human eyes weight green-yellow heavily while solar cells respond to the full spectrum differently", correct: true },
      { id: 'c', label: "Perceived brightness is measured incorrectly" },
      { id: 'd', label: "Solar cells only work with invisible light" }
    ],
    explanation: "Human photopic vision peaks at 555nm (green-yellow) and is nearly blind to infrared. Solar cells respond to photon counts across their absorption range, not perceived brightness. An incandescent bulb may seem as bright as an LED while producing far less usable photons for PV conversion."
  },
  {
    scenario: "A six-junction solar cell achieves 47.1% efficiency by using materials with bandgaps of 2.2, 1.9, 1.6, 1.2, 1.0, and 0.7 eV stacked on top of each other.",
    question: "How does this multi-junction approach reduce spectral mismatch losses?",
    options: [
      { id: 'a', label: "More junctions means more total area for light absorption" },
      { id: 'b', label: "Each junction absorbs a portion of the spectrum at nearly optimal energy, minimizing thermalization", correct: true },
      { id: 'c', label: "The junctions create a stronger electric field" },
      { id: 'd', label: "Multi-junction cells work better in space than on Earth" }
    ],
    explanation: "Each junction absorbs photons in a specific energy range just above its bandgap. Blue photons are absorbed by high-bandgap top layers, red by middle layers, and IR by bottom layers. This captures each photon at nearly optimal energy, dramatically reducing thermalization losses compared to single-junction cells."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Solar Panel Testing',
    short: 'Standardized spectrum for accurate measurements',
    tagline: 'The sun simulator challenge',
    description: 'Solar panel manufacturers must test panels under standardized AM1.5 spectrum conditions. Using the wrong light source gives inaccurate efficiency ratings that mislead customers and fail certification.',
    connection: 'Spectral mismatch directly affects measured efficiency - a panel tested under tungsten light will show lower output than under actual sunlight because the spectrum differs significantly.',
    howItWorks: 'Solar simulators use xenon lamps with filters to match the AM1.5 solar spectrum. Multi-source simulators combine LEDs and arc lamps to achieve Class AAA spectral match within 0.75-1.25x of reference at each wavelength band.',
    stats: [
      { value: '0.25%', label: 'Allowed spectral deviation', icon: '📊' },
      { value: '$15B', label: 'Annual PV testing market', icon: '💰' },
      { value: '25%+', label: 'Efficiency overestimate risk', icon: '⚠️' }
    ],
    examples: ['NREL certification testing', 'Factory quality control', 'Research cell characterization', 'Outdoor performance prediction'],
    companies: ['Newport', 'Abet Technologies', 'Pasan', 'Eternal Sun'],
    futureImpact: 'As multi-junction cells with 3-6 junctions become standard, spectral matching requirements will become even more stringent to properly evaluate each sub-cell.',
    color: '#F59E0B'
  },
  {
    icon: '🌱',
    title: 'Agrivoltaics',
    short: 'Optimizing spectrum for crops and power',
    tagline: 'Growing food under solar panels',
    description: 'Agrivoltaics combines farming with solar power generation. Special panels can be tuned to absorb certain wavelengths for electricity while transmitting the spectrum plants need for photosynthesis.',
    connection: 'Understanding spectral mismatch helps design semi-transparent panels that capture UV and non-photosynthetic wavelengths while letting through red and blue light that plants actually use.',
    howItWorks: 'Wavelength-selective PV uses organic or perovskite cells tuned to absorb green light (which plants reflect anyway) and UV, while transmitting photosynthetically active radiation (PAR) in red and blue bands.',
    stats: [
      { value: '30%', label: 'Higher land efficiency', icon: '🌍' },
      { value: '160%', label: 'Combined crop+energy value', icon: '📈' },
      { value: '20%', label: 'Water savings from shade', icon: '💧' }
    ],
    examples: ['Vineyard overhead solar', 'Berry farm shade panels', 'Greenhouse integrated PV', 'Pollinator habitat corridors'],
    companies: ['Sun Agri', 'Insolight', 'BayWa r.e.', 'Silicon Ranch'],
    futureImpact: 'Spectrally-tuned agrivoltaics could provide 10% of global electricity while increasing crop yields in warming climates through strategic shading.',
    color: '#22C55E'
  },
  {
    icon: '🏠',
    title: 'Indoor Light Harvesting',
    short: 'Powering IoT devices from ambient light',
    tagline: 'Every lamp is a power source',
    description: 'Indoor photovoltaics power billions of IoT sensors, smart labels, and wearables using artificial light. But indoor spectra differ dramatically from sunlight, requiring specially designed cells.',
    connection: 'Indoor light sources like LEDs and fluorescents have narrow spectral peaks. Cells optimized for sunlight waste most indoor light energy - spectral mismatch can reduce efficiency by 80%.',
    howItWorks: 'Indoor-optimized cells use materials like amorphous silicon, organic semiconductors, or perovskites with bandgaps tuned to match LED emission peaks around 450nm and 600nm rather than the broad solar spectrum.',
    stats: [
      { value: '30%', label: 'Indoor cell efficiency', icon: '⚡' },
      { value: '50B', label: 'IoT devices by 2030', icon: '📱' },
      { value: '10+', label: 'Year battery-free lifetime', icon: '🔋' }
    ],
    examples: ['Self-powered sensors', 'Electronic shelf labels', 'Smart home devices', 'Wearable health monitors'],
    companies: ['Ambient Photonics', 'Dracula Technologies', 'Exeger', 'Ricoh'],
    futureImpact: 'Indoor light harvesting will eliminate billions of disposable batteries annually, enabling truly maintenance-free smart buildings and wearables.',
    color: '#3B82F6'
  },
  {
    icon: '🛰️',
    title: 'Multi-Junction Space Cells',
    short: 'Maximum efficiency through spectrum splitting',
    tagline: 'Every photon counts in orbit',
    description: 'Spacecraft use multi-junction cells that split the solar spectrum between 3-6 different semiconductor layers, each optimized for a specific wavelength range to minimize spectral mismatch losses.',
    connection: 'Each junction in a multi-junction cell has a different bandgap, capturing photons at nearly optimal energy. This reduces both sub-bandgap transmission losses and thermalization losses from excess photon energy.',
    howItWorks: 'Stacked junctions with decreasing bandgaps (InGaP/GaAs/Ge or similar) absorb high-energy blue photons first, then green, then red/IR. Current matching between junctions requires precise spectral tuning.',
    stats: [
      { value: '47%', label: 'Record cell efficiency', icon: '🏆' },
      { value: '$250k', label: 'Cost per square meter', icon: '💎' },
      { value: '15yr', label: 'Space mission lifetime', icon: '🚀' }
    ],
    examples: ['Mars rovers', 'GPS satellites', 'Space station arrays', 'Deep space probes'],
    companies: ['SpectroLab', 'Azur Space', 'SolAero', 'Sharp'],
    futureImpact: 'Six-junction cells approaching 50% efficiency will enable more powerful spacecraft with smaller arrays, crucial for deep space exploration and satellite megaconstellations.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const SpectralMismatchRenderer: React.FC<SpectralMismatchRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [lightSource, setLightSource] = useState<'incandescent' | 'led' | 'sunlight'>('sunlight');
  const [hasUVFilter, setHasUVFilter] = useState(false);
  const [hasIRFilter, setHasIRFilter] = useState(false);
  const [cellBandgap, setCellBandgap] = useState(1.1); // Silicon bandgap in eV

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

  // Light source spectra (simplified model)
  const lightSources = {
    incandescent: {
      name: 'Incandescent (2700K)',
      color: '#ffb347',
      uvContent: 0.01,
      visibleContent: 0.12,
      irContent: 0.87,
      humanBrightness: 85,
      pvPower: 35,
      description: 'Warm, mostly infrared',
    },
    led: {
      name: 'LED (5000K)',
      color: '#f0f8ff',
      uvContent: 0.0,
      visibleContent: 0.95,
      irContent: 0.05,
      humanBrightness: 90,
      pvPower: 78,
      description: 'Cool, mostly visible',
    },
    sunlight: {
      name: 'Sunlight (AM1.5)',
      color: '#fffacd',
      uvContent: 0.05,
      visibleContent: 0.43,
      irContent: 0.52,
      humanBrightness: 100,
      pvPower: 100,
      description: 'Full spectrum',
    },
  };

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const source = lightSources[lightSource];

    let uvRemaining = hasUVFilter ? source.uvContent * 0.1 : source.uvContent;
    let irRemaining = hasIRFilter ? source.irContent * 0.2 : source.irContent;
    let visibleRemaining = source.visibleContent;

    const usableUV = uvRemaining * 1.0;
    const usableVisible = visibleRemaining * 1.0;
    const usableIR = irRemaining * 0.4;

    const totalUsable = usableUV + usableVisible + usableIR;

    const uvLoss = uvRemaining * 0.6;
    const visibleLoss = visibleRemaining * 0.3;
    const irLoss = usableIR * 0.1;

    const effectivePower = totalUsable - uvLoss - visibleLoss - irLoss;
    const current = effectivePower * source.pvPower * 0.4;
    const voltage = cellBandgap * 0.7;
    const power = voltage * current;
    const spectralMismatch = effectivePower / (source.uvContent + source.visibleContent + source.irContent * 0.4);

    return {
      current,
      voltage,
      power,
      spectralMismatch: spectralMismatch * 100,
      uvContent: uvRemaining * 100,
      visibleContent: visibleRemaining * 100,
      irContent: irRemaining * 100,
      humanBrightness: source.humanBrightness,
    };
  }, [lightSource, hasUVFilter, hasIRFilter, cellBandgap]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    incandescent: '#ffb347',
    led: '#f0f8ff',
    sunlight: '#fffacd',
    uv: '#7c3aed',
    ir: '#991b1b',
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
    twist_play: 'Filters',
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
        gameType: 'spectral-mismatch',
        gameTitle: 'Spectral Mismatch',
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

  // Spectral Visualization SVG Component
  const SpectralVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 340 : 400;
    const output = calculateOutput();
    const source = lightSources[lightSource];

    const getLightSourcePath = () => {
      let points: { nm: number; power: number }[] = [];
      if (lightSource === 'incandescent') {
        points = [
          { nm: 300, power: 0.01 }, { nm: 400, power: 0.05 }, { nm: 500, power: 0.12 },
          { nm: 600, power: 0.22 }, { nm: 700, power: 0.35 }, { nm: 800, power: 0.55 },
          { nm: 900, power: 0.75 }, { nm: 1000, power: 0.90 }, { nm: 1100, power: 0.98 },
          { nm: 1200, power: 1.0 },
        ];
      } else if (lightSource === 'led') {
        points = [
          { nm: 300, power: 0.0 }, { nm: 400, power: 0.15 }, { nm: 450, power: 0.95 },
          { nm: 500, power: 0.70 }, { nm: 550, power: 0.85 }, { nm: 600, power: 0.75 },
          { nm: 650, power: 0.45 }, { nm: 700, power: 0.10 }, { nm: 800, power: 0.02 },
          { nm: 1000, power: 0.0 }, { nm: 1200, power: 0.0 },
        ];
      } else {
        points = [
          { nm: 300, power: 0.05 }, { nm: 400, power: 0.35 }, { nm: 500, power: 0.85 },
          { nm: 550, power: 1.0 }, { nm: 600, power: 0.95 }, { nm: 700, power: 0.75 },
          { nm: 800, power: 0.55 }, { nm: 900, power: 0.40 }, { nm: 1000, power: 0.30 },
          { nm: 1100, power: 0.20 }, { nm: 1200, power: 0.10 },
        ];
      }
      const xScale = (width - 80) / 900;
      return points.map((p, i) => {
        const x = 40 + (p.nm - 300) * xScale;
        const y = 160 - p.power * 100;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    const getCellResponsePath = () => {
      const points = [
        { nm: 300, qe: 0.2 }, { nm: 400, qe: 0.65 }, { nm: 500, qe: 0.85 },
        { nm: 600, qe: 0.90 }, { nm: 700, qe: 0.88 }, { nm: 800, qe: 0.82 },
        { nm: 900, qe: 0.70 }, { nm: 1000, qe: 0.45 }, { nm: 1100, qe: 0.15 },
        { nm: 1200, qe: 0.0 },
      ];
      const xScale = (width - 80) / 900;
      return points.map((p, i) => {
        const x = 40 + (p.nm - 300) * xScale;
        const y = 160 - p.qe * 100;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="spectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="15%" stopColor="#3b82f6" />
            <stop offset="30%" stopColor="#06b6d4" />
            <stop offset="45%" stopColor="#22c55e" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="90%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Spectral Power Distribution
        </text>

        {/* Graph area background */}
        <rect x="40" y="50" width={width - 80} height="120" fill={colors.bgSecondary} rx="4" />

        {/* Spectrum color band */}
        <rect x="40" y="175" width={width - 80} height="12" rx="2" fill="url(#spectrumGrad)" opacity="0.8" />

        {/* Wavelength labels */}
        <text x="40" y="200" fill={colors.textMuted} fontSize="9" textAnchor="middle">300nm</text>
        <text x={40 + (width - 80) * 0.33} y="200" fill={colors.textMuted} fontSize="9" textAnchor="middle">600nm</text>
        <text x={40 + (width - 80) * 0.66} y="200" fill={colors.textMuted} fontSize="9" textAnchor="middle">900nm</text>
        <text x={width - 40} y="200" fill={colors.textMuted} fontSize="9" textAnchor="middle">1200nm</text>

        {/* UV/VIS/IR labels */}
        <text x="60" y="145" fill={colors.uv} fontSize="8" fontWeight="bold">UV</text>
        <text x={width / 2 - 30} y="145" fill="#22c55e" fontSize="8" fontWeight="bold">VISIBLE</text>
        <text x={width - 80} y="145" fill={colors.ir} fontSize="8" fontWeight="bold">IR</text>

        {/* Light source spectrum curve */}
        <path d={getLightSourcePath()} fill="none" stroke={source.color} strokeWidth="3" filter="url(#glowFilter)" />

        {/* Cell response curve */}
        <path d={getCellResponsePath()} fill="none" stroke={colors.success} strokeWidth="2" strokeDasharray="6 3" opacity="0.8" />

        {/* Bandgap limit line */}
        <line x1={40 + (1127 - 300) * (width - 80) / 900} y1="50" x2={40 + (1127 - 300) * (width - 80) / 900} y2="170" stroke={colors.error} strokeWidth="2" strokeDasharray="4 2" />
        <text x={40 + (1127 - 300) * (width - 80) / 900 + 5} y="65" fill={colors.error} fontSize="8">1127nm</text>

        {/* Filter overlays */}
        {hasUVFilter && (
          <rect x="40" y="50" width={(400 - 300) * (width - 80) / 900} height="120" fill={colors.uv} opacity="0.3" />
        )}
        {hasIRFilter && (
          <rect x={40 + (800 - 300) * (width - 80) / 900} y="50" width={(1200 - 800) * (width - 80) / 900} height="120" fill={colors.ir} opacity="0.3" />
        )}

        {/* Legend */}
        <g transform="translate(50, 65)">
          <line x1="0" y1="0" x2="20" y2="0" stroke={source.color} strokeWidth="3" />
          <text x="25" y="4" fill={colors.textSecondary} fontSize="9">Light Source</text>
          <line x1="100" y1="0" x2="120" y2="0" stroke={colors.success} strokeWidth="2" strokeDasharray="4 2" />
          <text x="125" y="4" fill={colors.textSecondary} fontSize="9">Cell Response</text>
        </g>

        {/* Output comparison bars */}
        <g transform={`translate(40, ${height - 130})`}>
          <text x={(width - 80) / 2} y="0" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">OUTPUT COMPARISON</text>

          {/* Human brightness bar */}
          <text x="0" y="28" fill={colors.textSecondary} fontSize="10">Perceived Brightness:</text>
          <rect x="120" y="18" width={width - 200} height="14" rx="3" fill={colors.bgSecondary} />
          <rect x="120" y="18" width={(width - 200) * output.humanBrightness / 100} height="14" rx="3" fill={colors.led} opacity="0.8" />
          <text x={width - 75} y="29" fill={colors.textPrimary} fontSize="11" fontWeight="600">{output.humanBrightness}%</text>

          {/* PV Power bar */}
          <text x="0" y="53" fill={colors.textSecondary} fontSize="10">Electrical Output:</text>
          <rect x="120" y="43" width={width - 200} height="14" rx="3" fill={colors.bgSecondary} />
          <rect x="120" y="43" width={(width - 200) * Math.min(100, output.power / 30 * 100) / 100} height="14" rx="3" fill={colors.success} />
          <text x={width - 75} y="54" fill={colors.success} fontSize="11" fontWeight="600">{output.power.toFixed(1)} mW</text>

          {/* Mismatch indicator */}
          <rect x="0" y="70" width={width - 80} height="40" rx="8" fill={output.spectralMismatch > 70 ? 'rgba(16, 185, 129, 0.15)' : output.spectralMismatch > 40 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'} />
          <text x={(width - 80) / 2} y="88" textAnchor="middle" fill={colors.textMuted} fontSize="10">Spectral Match</text>
          <text x={(width - 80) / 2} y="103" textAnchor="middle" fill={output.spectralMismatch > 70 ? colors.success : output.spectralMismatch > 40 ? colors.warning : colors.error} fontSize="14" fontWeight="700">
            {output.spectralMismatch.toFixed(0)}% - {output.spectralMismatch > 70 ? 'EXCELLENT' : output.spectralMismatch > 40 ? 'MODERATE' : 'POOR'}
          </text>
        </g>
      </svg>
    );
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
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Controls for play phases
  const renderControls = () => (
    <div style={{
      background: colors.bgCard,
      borderRadius: '16px',
      padding: '20px',
      marginTop: '20px',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '10px' }}>Light Source:</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(lightSources).map(([key, src]) => (
            <button
              key={key}
              onClick={() => { playSound('click'); setLightSource(key as 'incandescent' | 'led' | 'sunlight'); }}
              style={{
                padding: '12px 18px',
                borderRadius: '8px',
                border: lightSource === key ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                background: lightSource === key ? `${colors.accent}22` : 'transparent',
                color: src.color,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {src.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <label style={{ ...typo.small, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasUVFilter} onChange={(e) => setHasUVFilter(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          UV Blocking Filter
        </label>
        <label style={{ ...typo.small, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={hasIRFilter} onChange={(e) => setHasIRFilter(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          IR Blocking Filter
        </label>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

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
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
          ☀️🌈
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Spectral Mismatch
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px' }}>
          "Two lights look <span style={{ color: colors.accent }}>equally bright</span> to your eyes, but one produces <span style={{ color: colors.success }}>3x more power</span> from a solar panel. Why? The secret is in the spectrum."
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
            "A solar panel doesn't care how bright you think the light is - it only cares about photon energies. An incandescent bulb and an LED might look the same to you, but the panel tells the truth about the spectrum."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Photovoltaic Engineering Principles
          </p>
        </div>

        <button onClick={() => { playSound('click'); nextPhase(); }} style={primaryButtonStyle}>
          Explore the Spectrum
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Similar output - brightness determines power' },
      { id: 'b', text: 'Incandescent gives more power because it feels warmer/more intense' },
      { id: 'c', text: 'LED gives more power because its spectrum better matches what solar cells can use', correct: true },
      { id: 'd', text: 'No difference - all light is the same to a solar cell' },
    ];

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            An incandescent bulb and an LED appear equally bright to your eyes. Which produces more power from a silicon solar panel?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', color: colors.incandescent }}>💡</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Incandescent</p>
                <p style={{ ...typo.small, color: colors.incandescent }}>Warm glow</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', color: colors.led }}>💡</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>LED</p>
                <p style={{ ...typo.small, color: colors.led }}>Cool white</p>
              </div>
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
              Both appear equally bright to human eyes
            </p>
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
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {prediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Compare Light Sources
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Switch between light sources to see how spectrum affects power output.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <SpectralVisualization />
          </div>

          {renderControls()}

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginTop: '20px',
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              Experiments to Try:
            </h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Compare incandescent vs LED - which gives more PV power despite similar brightness?</li>
              <li>Notice how much of incandescent output is infrared (beyond silicon's range)</li>
              <li>See why sunlight is the reference standard for solar testing</li>
            </ul>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}>
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'c';

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.error}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not quite!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              LED light produces significantly more solar panel power than incandescent light of equal perceived brightness because its spectrum better matches what silicon can convert.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            The Physics of Spectral Mismatch
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ ...typo.h3, color: colors.incandescent, marginBottom: '8px' }}>Incandescent Bulbs (2700K)</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                87% of output is <strong>infrared</strong> - heat you can feel but can't see. Most IR wavelengths are beyond silicon's 1127nm absorption limit, so they pass through the cell unused. Only 12% is visible light the cell can partially use.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ ...typo.h3, color: colors.led, marginBottom: '8px' }}>LED Lights (5000K)</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                95% of output is <strong>visible light</strong> (400-700nm) which silicon absorbs efficiently. Almost no infrared waste. The spectrum closely matches what solar cells can convert, giving 2-3x more power than incandescent at equal brightness.
              </p>
            </div>

            <div style={{ background: `${colors.accent}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.accent}33` }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>The Key Insight</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Photon Energy E = hc/lambda</strong> - shorter wavelengths have more energy. Silicon (1.1eV bandgap) absorbs wavelengths below 1127nm. Beyond that limit, photons pass through without generating any current. Our eyes evolved for daylight, weighting green heavily - but solar cells respond to the full spectrum differently.
              </p>
            </div>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            Explore a New Variable
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'UV filter increases power by reducing cell damage' },
      { id: 'b', text: 'IR filter increases power by reducing thermal stress' },
      { id: 'c', text: 'Both filters reduce power because they block usable photons', correct: true },
      { id: 'd', text: 'Filters have no effect on power output' },
    ];

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Optical Filters
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens when you add UV-blocking or IR-blocking filters in front of a solar panel?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              UV filters block high-energy ultraviolet radiation (300-400nm). IR filters block infrared heat (700nm+). Both are commonly used in windows and some solar applications.
            </p>
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
                <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryButtonStyle}>
              Test the Filters
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Test Optical Filters
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Toggle UV and IR filters to see their effect on power output.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <SpectralVisualization />
          </div>

          {renderControls()}

          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '16px',
            marginTop: '20px',
          }}>
            <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
              Key Observations:
            </h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>UV filter: Blocks usable high-energy photons - reduces current</li>
              <li>IR filter: Blocks usable near-IR photons (up to 1127nm) - reduces current</li>
              <li>Both contribute to power even if they seem like "waste" energy</li>
            </ul>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}>
            Understand the Trade-offs
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'c';

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.error}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly right!' : 'Counterintuitive but true!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Both UV and IR filters reduce power output because they block photons that silicon can actually use. Even "excess" energy photons contribute to current generation.
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Filter Trade-offs Explained
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: colors.uv }}>UV</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>UV Filters</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                UV photons have MORE energy than needed (2.5-4eV vs 1.1eV bandgap). The excess becomes heat through <strong>thermalization</strong>, but they still generate current. Blocking UV loses ~5% of power but can extend cell lifetime by reducing degradation. Trade-off depends on application.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: colors.ir }}>IR</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>IR Filters</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Silicon uses near-IR photons up to 1127nm (1.1eV). Only far-IR beyond this limit is truly unusable. IR filters block both usable and unusable IR, causing significant power loss. Blocking "heat" isn't always beneficial!
              </p>
            </div>

            <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>✨</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Smart Coatings</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Advanced solar cells use <strong>selective coatings</strong> that enhance usable wavelengths while only blocking truly unusable far-IR. Anti-reflection coatings also boost efficiency by reducing surface reflection losses across the usable spectrum.
              </p>
            </div>
          </div>

          <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
            See Real-World Applications
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
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* App selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
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

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>{app.description}</p>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Spectral Mismatch Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
            </div>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '6px' }}>Companies:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.companies.join(' | ')}</p>
            </div>
          </div>

          {allAppsCompleted && (
            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
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
        <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🏆' : '📚'}</div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>{testScore} / 10</p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed ? 'You understand spectral mismatch and its applications!' : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
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
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ minHeight: '100vh', background: colors.bgPrimary, padding: '24px' }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
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
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>{question.question}</h3>

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
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
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
                Previous
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
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Spectral Mismatch Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why the spectrum of light matters more than its perceived brightness for solar energy conversion.
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
              'Light spectrum varies dramatically by source type',
              'PV response depends on photon energy, not brightness',
              'Incandescent light is mostly unusable infrared',
              'Thermalization wastes excess photon energy as heat',
              'Multi-junction cells minimize spectral mismatch',
              'Indoor light harvesting needs spectrum-matched cells',
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
            style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}
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

export default SpectralMismatchRenderer;
