'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Infrared Emissivity - Complete 10-Phase Game
// Why shiny objects can appear cold on thermal cameras
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

interface InfraredEmissivityRendererProps {
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
    scenario: "A building inspector uses a thermal camera to check a warehouse for heat leaks. She points the camera at two pipes carrying hot steam at 150C - one is painted matte black, the other is bare polished copper.",
    question: "What will the thermal camera display show?",
    options: [
      { id: 'a', label: "Both pipes appear at 150C since they contain the same temperature steam" },
      { id: 'b', label: "The copper pipe appears hotter because metal conducts heat better" },
      { id: 'c', label: "The matte black pipe appears much hotter than the copper pipe despite identical actual temperatures", correct: true },
      { id: 'd', label: "Neither pipe is visible because steam blocks infrared radiation" }
    ],
    explanation: "The matte black pipe has high emissivity (~0.95) and emits IR radiation efficiently, showing close to its true temperature. The polished copper has very low emissivity (~0.03) and mostly reflects the cooler surroundings."
  },
  {
    scenario: "An engineer is designing a cooling system and needs to maximize heat dissipation from a metal heat sink. She's considering different surface treatments.",
    question: "Why does a matte black surface radiate heat more effectively than a shiny metallic surface at the same temperature?",
    options: [
      { id: 'a', label: "Black surfaces absorb more light and therefore must release more heat" },
      { id: 'b', label: "Matte black has high emissivity, allowing it to convert thermal energy into infrared radiation more efficiently", correct: true },
      { id: 'c', label: "Shiny surfaces are better conductors so they keep heat inside" },
      { id: 'd', label: "The black paint adds extra thermal mass that stores more heat" }
    ],
    explanation: "High emissivity surfaces like matte black efficiently convert thermal energy into electromagnetic radiation. By Kirchhoff's law, good absorbers are good emitters."
  },
  {
    scenario: "An architect is specifying windows for an energy-efficient office building in a hot climate. The glass manufacturer offers standard glass and 'low-e' coated glass options.",
    question: "How do low-emissivity (low-e) window coatings help reduce energy costs?",
    options: [
      { id: 'a', label: "They block visible light to keep rooms darker and cooler" },
      { id: 'b', label: "They reflect infrared radiation, reducing heat transfer through the glass while allowing visible light to pass", correct: true },
      { id: 'c', label: "They absorb UV rays and convert them to electricity" },
      { id: 'd', label: "They make windows thicker to provide better insulation" }
    ],
    explanation: "Low-e coatings are thin metallic layers that have low emissivity for infrared radiation but high transmissivity for visible light. They reflect thermal radiation back toward its source."
  },
  {
    scenario: "A maintenance technician is using a handheld infrared thermometer to check motor bearing temperatures. The motor housing is unpainted aluminum with a shiny surface.",
    question: "What should the technician do to get an accurate temperature reading?",
    options: [
      { id: 'a', label: "Move closer to the surface to reduce atmospheric interference" },
      { id: 'b', label: "Wait for the motor to cool down before taking measurements" },
      { id: 'c', label: "Apply a piece of high-emissivity tape or adjust the emissivity setting on the thermometer", correct: true },
      { id: 'd', label: "Use a higher-powered infrared thermometer with a stronger laser" }
    ],
    explanation: "Low-emissivity surfaces like polished aluminum give inaccurate IR readings because they reflect ambient temperature rather than emit their own."
  },
  {
    scenario: "A hiker gets lost in cold mountains. Search and rescue teaches that emergency space blankets (thin reflective Mylar) can be life-saving.",
    question: "Why are emergency space blankets effective at preventing hypothermia?",
    options: [
      { id: 'a', label: "The shiny material generates heat through a chemical reaction with air" },
      { id: 'b', label: "The low-emissivity reflective surface reflects the body's infrared radiation back, reducing radiative heat loss", correct: true },
      { id: 'c', label: "The blanket blocks wind, which is the only significant source of heat loss" },
      { id: 'd', label: "The material absorbs moisture from the air to keep the person dry" }
    ],
    explanation: "Space blankets work by reflecting infrared radiation. The low-emissivity metallic coating reflects up to 97% of radiated body heat back toward the person."
  },
  {
    scenario: "A metallurgist needs to monitor the temperature of molten steel at 1500C using a non-contact optical pyrometer. The steel surface has varying oxide layers.",
    question: "Why must the pyrometer be calibrated for the specific emissivity of the target surface?",
    options: [
      { id: 'a', label: "Different metals have different melting points that affect the reading" },
      { id: 'b', label: "The pyrometer calculates temperature from detected IR intensity, which depends on both temperature and emissivity", correct: true },
      { id: 'c', label: "Higher emissivity materials conduct heat faster to the sensor" },
      { id: 'd', label: "Emissivity only matters for temperatures below 500C" }
    ],
    explanation: "Pyrometers use the Stefan-Boltzmann law (P = eAT^4) to calculate temperature. Since detected radiation depends on BOTH temperature AND emissivity, an incorrect emissivity setting causes systematic temperature errors."
  },
  {
    scenario: "A building energy auditor is using thermal imaging to inspect a commercial building's exterior walls on a cold winter night.",
    question: "What could cause different apparent temperatures on the building exterior?",
    options: [
      { id: 'a', label: "Warm spots always indicate missing insulation or thermal bridges" },
      { id: 'b', label: "Heat leaks, different surface materials with varying emissivities, or reflected thermal radiation from nearby sources", correct: true },
      { id: 'c', label: "The thermal camera is malfunctioning due to cold weather" },
      { id: 'd', label: "Differences in paint color affect how the building absorbs solar heat" }
    ],
    explanation: "Apparent temperature variations can have multiple causes: actual heat loss through poor insulation, different surface materials with different emissivities, or reflections of thermal radiation."
  },
  {
    scenario: "NASA engineers are designing the thermal control system for a Mars rover. The rover experiences extreme temperature swings from -125C at night to +20C during the day.",
    question: "How might engineers use emissivity to manage the rover's temperature?",
    options: [
      { id: 'a', label: "Paint everything white to reflect sunlight and keep cool" },
      { id: 'b', label: "Use selective surfaces with low IR emissivity to reduce radiative heat loss at night and high solar reflectivity to prevent overheating during the day", correct: true },
      { id: 'c', label: "Cover the rover in high-emissivity black coating to maximize heat absorption" },
      { id: 'd', label: "Emissivity doesn't matter in space because there's no air to conduct heat" }
    ],
    explanation: "Spacecraft thermal control uses selective surfaces with carefully chosen optical properties. Multi-layer insulation with low-emissivity metallic layers reduces radiative heat loss to cold space."
  },
  {
    scenario: "A quality control engineer monitors steel parts during heat treatment. The parts must reach exactly 850C for proper hardening.",
    question: "What challenge does varying surface condition create for non-contact temperature measurement?",
    options: [
      { id: 'a', label: "Shiny parts heat up faster than oxidized parts due to better heat conduction" },
      { id: 'b', label: "Parts with different emissivities will show different apparent temperatures even at the same actual temperature", correct: true },
      { id: 'c', label: "Oxide scale blocks all infrared radiation so those parts cannot be measured" },
      { id: 'd', label: "The magnetic properties of steel change with temperature, interfering with IR sensors" }
    ],
    explanation: "Oxidized steel and bright machined steel have very different emissivities. A pyrometer calibrated for one surface type will give incorrect readings for the other."
  },
  {
    scenario: "A firefighter is using a thermal imaging camera to search for people in a smoke-filled building. The camera shows different colors for different temperatures.",
    question: "Why can thermal cameras 'see' through smoke when visible light cameras cannot?",
    options: [
      { id: 'a', label: "Thermal cameras use X-rays that penetrate smoke particles" },
      { id: 'b', label: "Smoke particles are smaller than infrared wavelengths, so IR radiation passes through while visible light scatters", correct: true },
      { id: 'c', label: "The heat from the fire burns away the smoke in front of the camera" },
      { id: 'd', label: "Thermal cameras amplify tiny amounts of visible light" }
    ],
    explanation: "Infrared wavelengths (8-14 micrometers for thermal cameras) are much longer than smoke particle sizes, allowing IR to pass through. Visible light wavelengths (0.4-0.7 micrometers) are scattered by smoke particles."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔥',
    title: 'Thermal Imaging Cameras',
    short: 'Seeing heat in darkness',
    tagline: 'Making the invisible visible',
    description: 'Thermal cameras detect infrared radiation emitted by objects based on their temperature and emissivity. Used in building inspections, firefighting, medical diagnostics, and security.',
    connection: 'Understanding emissivity is crucial for accurate thermal imaging. A shiny metal surface may appear cool on camera not because it is cool, but because its low emissivity means it emits less IR and reflects ambient temperatures instead.',
    howItWorks: 'Thermal cameras use microbolometer arrays sensitive to IR wavelengths (8-14 um). Each pixel absorbs IR radiation, causing temperature changes that alter electrical resistance. Software converts resistance values to temperatures.',
    stats: [
      { value: '8-14μm', label: 'IR wavelength', icon: '🎯' },
      { value: '$8.7B', label: 'Market size', icon: '📈' },
      { value: '640x480', label: 'Resolution', icon: '📷' },
      { value: '30%', label: 'Cost reduction', icon: '💰' }
    ],
    examples: ['Building energy audits', 'Electrical hot spot detection', 'Medical fever screening', 'Night vision security'],
    companies: ['FLIR Systems', 'Fluke', 'Hikvision', 'Seek Thermal'],
    futureImpact: 'Smartphone-integrated thermal cameras will make IR imaging ubiquitous for home energy audits and health monitoring.',
    color: '#EF4444'
  },
  {
    icon: '🛰️',
    title: 'Spacecraft Thermal Control',
    short: 'Surviving space extremes',
    tagline: 'Engineering survival in the cosmic void',
    description: 'Spacecraft must carefully manage thermal radiation to survive temperature extremes from -270C in shadow to +120C in sunlight. Surface coatings with precisely engineered emissivity values control heat balance.',
    connection: 'The Stefan-Boltzmann law (P = eAT^4) governs spacecraft thermal balance. By selecting surface emissivity values, engineers control equilibrium temperature. High-emissivity surfaces radiate heat; low-emissivity surfaces retain it.',
    howItWorks: 'Multi-layer insulation (MLI) uses low-emissivity metal foils to minimize radiative heat transfer. Radiator panels with high emissivity reject waste heat. Specialized coatings balance solar absorptivity and thermal emissivity.',
    stats: [
      { value: '0.02', label: 'MLI emissivity', icon: '🛡️' },
      { value: '400C', label: 'Temp range', icon: '🌡️' },
      { value: '$2.1B', label: 'Market size', icon: '💰' }
    ],
    examples: ['James Webb Space Telescope sunshield', 'ISS radiator panels', 'Mars rover thermal blankets', 'Satellite thermal coatings'],
    companies: ['NASA', 'SpaceX', 'Lockheed Martin', 'Northrop Grumman'],
    futureImpact: 'Variable-emissivity surfaces using electrochromic materials will allow spacecraft to dynamically adjust thermal properties.',
    color: '#3B82F6'
  },
  {
    icon: '🏠',
    title: 'Low-E Window Coatings',
    short: 'Keeping buildings comfortable',
    tagline: 'Invisible energy savings',
    description: 'Low-emissivity window coatings are thin metal oxide layers that reduce heat transfer through windows. They reflect infrared radiation while allowing visible light through, improving building efficiency.',
    connection: 'Low-E coatings exploit the relationship between emissivity and reflectivity. A surface with low emissivity has high IR reflectivity, bouncing thermal radiation back rather than absorbing and re-emitting it.',
    howItWorks: 'Sputtered coatings of silver or tin oxide are applied in layers just nanometers thick. The coating reflects long-wave IR (room heat) while transmitting visible light. Different configurations optimize for different climates.',
    stats: [
      { value: '30%', label: 'Energy savings', icon: '⚡' },
      { value: '$4.2B', label: 'Market size', icon: '📈' },
      { value: '0.04', label: 'Low-E emissivity', icon: '🪟' }
    ],
    examples: ['Double-pane residential windows', 'Commercial building facades', 'Skylight glazing', 'Refrigerator door glass'],
    companies: ['Guardian Glass', 'PPG Industries', 'Saint-Gobain', 'AGC'],
    futureImpact: 'Switchable Low-E coatings will dynamically adjust emissivity based on outdoor conditions, maximizing efficiency.',
    color: '#10B981'
  },
  {
    icon: '🍳',
    title: 'Cookware Surface Engineering',
    short: 'Optimizing heat transfer',
    tagline: 'The science of perfect cooking',
    description: 'Cookware surfaces are engineered with specific emissivity properties for optimal heat distribution. Matte black surfaces radiate heat effectively for baking, while polished interiors minimize radiative losses.',
    connection: 'High-emissivity surfaces radiate more thermal energy at a given temperature. A dark pizza stone radiates heat to the dough more effectively than a shiny metal pan, creating better crusts through radiative heat transfer.',
    howItWorks: 'Cast iron develops a high-emissivity patina through seasoning. Enameled coatings provide consistent emissivity. Pizza ovens use refractory surfaces with emissivity near 0.9 for maximum radiant heating.',
    stats: [
      { value: '0.95', label: 'Cast iron e', icon: '🔥' },
      { value: '$12B', label: 'Cookware market', icon: '📈' },
      { value: '40%', label: 'Better browning', icon: '🥧' }
    ],
    examples: ['Seasoned cast iron skillets', 'Stone pizza ovens', 'Infrared grills', 'Convection oven interiors'],
    companies: ['Lodge', 'Le Creuset', 'All-Clad', 'Staub'],
    futureImpact: 'Smart cookware with temperature-sensing coatings will provide real-time feedback for specific cooking techniques.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const InfraredEmissivityRenderer: React.FC<InfraredEmissivityRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Play phase state
  const [viewMode, setViewMode] = useState<'visible' | 'infrared'>('visible');
  const [selectedObject, setSelectedObject] = useState<'hand' | 'cup_matte' | 'cup_shiny' | 'ice'>('cup_matte');
  const [objectTemp, setObjectTemp] = useState(60);
  const [ambientTemp] = useState(22);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist phase state
  const [twistViewMode, setTwistViewMode] = useState<'visible' | 'infrared'>('visible');

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

  // Animation for IR visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Object properties - all use objectTemp for reactivity
  const getObjectProps = (obj: string) => {
    const props: Record<string, { emissivity: number; name: string; actualTemp: number; color: string }> = {
      hand: { emissivity: 0.98, name: 'Human Hand', actualTemp: objectTemp, color: '#e8b4a0' },
      cup_matte: { emissivity: 0.95, name: 'Matte Black Cup', actualTemp: objectTemp, color: '#1f2937' },
      cup_shiny: { emissivity: 0.1, name: 'Polished Metal Cup', actualTemp: objectTemp, color: '#9ca3af' },
      ice: { emissivity: 0.96, name: 'Ice Cube', actualTemp: objectTemp, color: '#e0f2fe' }
    };
    return props[obj] || props.hand;
  };

  // Temperature to IR color
  const tempToIRColor = (temp: number, emissivity: number) => {
    const apparentTemp = emissivity * temp + (1 - emissivity) * ambientTemp;
    const normalizedTemp = Math.max(0, Math.min(1, (apparentTemp + 10) / 70));

    if (normalizedTemp < 0.25) {
      return `rgb(${Math.floor(normalizedTemp * 4 * 100)}, ${Math.floor(normalizedTemp * 4 * 50)}, ${150 + Math.floor(normalizedTemp * 4 * 105)})`;
    } else if (normalizedTemp < 0.5) {
      return `rgb(${100 + Math.floor((normalizedTemp - 0.25) * 4 * 155)}, ${50 + Math.floor((normalizedTemp - 0.25) * 4 * 200)}, ${255 - Math.floor((normalizedTemp - 0.25) * 4 * 155)})`;
    } else if (normalizedTemp < 0.75) {
      return `rgb(255, ${250 - Math.floor((normalizedTemp - 0.5) * 4 * 100)}, ${100 - Math.floor((normalizedTemp - 0.5) * 4 * 100)})`;
    } else {
      return `rgb(255, ${150 - Math.floor((normalizedTemp - 0.75) * 4 * 150)}, 0)`;
    }
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316', // Orange for heat/thermal
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    hot: '#EF4444',
    cold: '#3B82F6',
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
    hook: 'Explore Introduction',
    predict: 'Predict',
    play: 'Experiment Play',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Experiment Emissivity',
    twist_review: 'Deep Insight',
    transfer: 'Apply Transfer',
    test: 'Quiz Knowledge',
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
        gameType: 'infrared-emissivity',
        gameTitle: 'Infrared Emissivity',
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

  // IR Scene Visualization SVG Component
  const IRSceneVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const props = getObjectProps(selectedObject);
    const irColor = tempToIRColor(props.actualTemp, props.emissivity);
    const apparentTemp = props.emissivity * props.actualTemp + (1 - props.emissivity) * ambientTemp;
    const infrared = viewMode === 'infrared';

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="irTempScale" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="25%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="heatGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="coldGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="30%" stopColor="#e5e7eb" />
            <stop offset="70%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
          <linearGradient id="matteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd5ce" />
            <stop offset="50%" stopColor="#e8b4a0" />
            <stop offset="100%" stopColor="#c99a88" />
          </linearGradient>
          <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="50%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill={infrared ? '#020617' : '#0f172a'} rx="12" />

        {/* Header */}
        <rect x="0" y="0" width={width} height="35" fill={infrared ? '#0f172a' : '#111827'} rx="12" />
        <text x={width/2} y="22" textAnchor="middle" fill={infrared ? '#f97316' : '#e2e8f0'} fontSize="13" fontWeight="600">
          {infrared ? 'THERMAL IMAGING VIEW' : 'VISIBLE LIGHT VIEW'} - {props.name}
        </text>
        {infrared && (
          <>
            <circle cx="25" cy="17" r="4" fill="#ef4444">
              <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
            </circle>
            <text x="38" y="21" fill="#ef4444" fontSize="11" fontWeight="600">REC</text>
          </>
        )}

        {/* Grid lines - spanning full width */}
        {[50, 90, 130, 170, 210, 250].map(y => (
          <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
        ))}
        {/* Y axis - Temperature label */}
        <text x="4" y="46" fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">Temperature</text>
        {/* Formula overlay - right side */}
        <text x={width - 8} y={height - 78} textAnchor="end" fill="rgba(148,163,184,0.7)" fontSize="11">P = ε·σ·A·T⁴</text>
        {/* Temperature bar - spans full width, interactive point moves with temperature */}
        <text x="10" y={height - 170} fill="rgba(148,163,184,0.7)" fontSize="11">Temperature (°C):</text>
        <rect x="10" y={height - 155} width={width - 20} height="6" rx="3" fill="#1e293b" />
        <rect x="10" y={height - 155} width={Math.max(6, (width - 20) * (props.actualTemp / 90))} height="6" rx="3" fill={irColor} />
        <circle cx={10 + Math.max(6, (width - 20) * (props.actualTemp / 90))} cy={height - 152} r="9" fill={irColor} stroke="#ffffff" strokeWidth="2" filter="url(#heatGlow)" />

        {/* Temperature scale (IR mode only) */}
        {infrared && (
          <g transform={`translate(${width - 55}, 50)`}>
            <rect x="0" y="0" width="50" height="155" rx="4" fill="#111827" stroke="#334155" strokeWidth="1" />
            <text x="25" y="14" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">TEMP</text>
            <rect x="5" y="22" width="12" height="110" rx="2" fill="url(#irTempScale)" />
            <text x="22" y="32" fill="#ef4444" fontSize="11">60°C</text>
            <text x="22" y="75" fill="#fbbf24" fontSize="11">30°C</text>
            <text x="22" y="125" fill="#3b82f6" fontSize="11">0°C</text>
          </g>
        )}

        {/* Main object visualization */}
        <g transform={`translate(${width/2 - 60}, 55)`}>
          {selectedObject === 'hand' && (
            <g filter="url(#heatGlow)">
              {/* Palm */}
              <ellipse cx="60" cy="100" rx="45" ry="60"
                fill={infrared ? irColor : 'url(#skinGrad)'} />
              {/* Thumb */}
              <ellipse cx="15" cy="75" rx="18" ry="10"
                fill={infrared ? irColor : 'url(#skinGrad)'}
                transform="rotate(-35, 15, 75)" />
              {/* Fingers */}
              <ellipse cx="40" cy="35" rx="8" ry="28" fill={infrared ? irColor : 'url(#skinGrad)'} />
              <ellipse cx="60" cy="28" rx="7" ry="32" fill={infrared ? irColor : 'url(#skinGrad)'} />
              <ellipse cx="80" cy="32" rx="7" ry="30" fill={infrared ? irColor : 'url(#skinGrad)'} />
              <ellipse cx="98" cy="45" rx="6" ry="24" fill={infrared ? irColor : 'url(#skinGrad)'} />

              {/* IR radiation waves */}
              {infrared && [...Array(8)].map((_, i) => {
                const angle = (i * Math.PI / 4) + animPhase;
                const baseRadius = 55;
                return (
                  <path
                    key={i}
                    d={`M ${60 + Math.cos(angle) * baseRadius} ${80 + Math.sin(angle) * baseRadius * 0.8}
                        Q ${60 + Math.cos(angle) * (baseRadius + 15)} ${80 + Math.sin(angle) * (baseRadius + 15) * 0.8}
                        ${60 + Math.cos(angle) * (baseRadius + 30)} ${80 + Math.sin(angle) * (baseRadius + 30) * 0.8}`}
                    stroke={irColor}
                    strokeWidth="2"
                    fill="none"
                    opacity={0.4 + Math.sin(animPhase + i) * 0.2}
                  />
                );
              })}
            </g>
          )}

          {(selectedObject === 'cup_matte' || selectedObject === 'cup_shiny') && (
            <g filter={infrared && props.emissivity > 0.5 ? 'url(#heatGlow)' : 'url(#heatGlow)'}>
              {/* Cup body - tall to use vertical space */}
              <path
                d="M 15 20 L 28 190 L 112 190 L 125 20 Z"
                fill={infrared ? irColor : (selectedObject === 'cup_shiny' ? 'url(#metalGrad)' : 'url(#matteGrad)')}
                stroke={selectedObject === 'cup_shiny' && !infrared ? '#e5e7eb' : 'none'}
                strokeWidth="2"
              />
              {/* Cup rim */}
              <ellipse cx="70" cy="20" rx="55" ry="13"
                fill={infrared ? irColor : (selectedObject === 'cup_shiny' ? '#9ca3af' : '#374151')} />
              {/* Cup handle - tall span to ensure vertical space >= 25% */}
              <path
                d="M 125 40 Q 175 55 175 105 Q 175 155 125 175"
                fill="none"
                stroke={infrared ? irColor : (selectedObject === 'cup_shiny' ? '#9ca3af' : '#374151')}
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* Steam (visible mode only, hot objects) - tall paths for vertical space */}
              {!infrared && objectTemp > 40 && [...Array(3)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${50 + i * 20} 15 Q ${60 + i * 20} ${-20 - Math.sin(animPhase + i) * 25} ${50 + i * 20} ${-55 - Math.sin(animPhase + i) * 30}`}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              ))}

              {/* Reflections (shiny cup, visible mode) */}
              {selectedObject === 'cup_shiny' && !infrared && (
                <ellipse cx="55" cy="85" rx="10" ry="30" fill="rgba(255,255,255,0.3)" />
              )}

              {/* IR radiation waves (high emissivity only) */}
              {infrared && props.emissivity > 0.5 && [...Array(6)].map((_, i) => {
                const angle = (i * Math.PI / 3) + animPhase;
                const baseRadius = 50;
                return (
                  <path
                    key={i}
                    d={`M ${70 + Math.cos(angle) * baseRadius} ${90 + Math.sin(angle) * baseRadius * 0.7}
                        Q ${70 + Math.cos(angle) * (baseRadius + 12)} ${90 + Math.sin(angle) * (baseRadius + 12) * 0.7}
                        ${70 + Math.cos(angle) * (baseRadius + 25)} ${90 + Math.sin(angle) * (baseRadius + 25) * 0.7}`}
                    stroke={irColor}
                    strokeWidth="2"
                    fill="none"
                    opacity={0.5 + Math.sin(animPhase + i) * 0.2}
                  />
                );
              })}

              {/* Temperature indicator circle - interactive, highlighted */}
              <circle cx="70" cy="105" r="10" fill={irColor} stroke="#ffffff" strokeWidth="2" filter="url(#heatGlow)" opacity="0.85" />
              <text x="70" y="109" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">{props.actualTemp}°</text>

              {/* Low emissivity reflection indicator */}
              {infrared && props.emissivity < 0.5 && (
                <text x="70" y="210" textAnchor="middle" fill="#60a5fa" fontSize="11">
                  ↩ Reflects {ambientTemp}°C room
                </text>
              )}
            </g>
          )}

          {selectedObject === 'ice' && (
            <g filter={infrared ? 'url(#coldGlow)' : undefined}>
              {/* Ice cube shape */}
              <polygon
                points="30,50 90,30 120,70 120,130 70,150 10,130 10,70"
                fill={infrared ? irColor : 'url(#iceGrad)'}
                stroke={infrared ? 'none' : '#60a5fa'}
                strokeWidth="2"
              />
              {/* Top face */}
              <polygon
                points="30,50 90,30 120,70 60,90"
                fill={infrared ? irColor : '#e0f2fe'}
                opacity="0.8"
              />
              {/* Ice crystal patterns (visible mode) */}
              {!infrared && (
                <>
                  <line x1="50" y1="80" x2="60" y2="120" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
                  <line x1="80" y1="70" x2="90" y2="115" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
                </>
              )}
            </g>
          )}
        </g>

        {/* Info panel - placed below main content area, using absolute coordinates */}
        <rect x="8" y={height - 62} width={width - 16} height="55" rx="6" fill="#111827" stroke="#334155" strokeWidth="1" />
        {/* Column 1: Temperature */}
        <text x="20" y={height - 47} fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">
          {infrared ? 'APPARENT' : 'ACTUAL TEMP'}
        </text>
        <text x="20" y={height - 24} fill={infrared ? '#f97316' : '#22d3ee'} fontSize="15" fontWeight="700">
          {infrared ? `${apparentTemp.toFixed(1)}°C` : `${props.actualTemp}°C`}
        </text>
        {/* Column 2: Emissivity */}
        <text x="163" y={height - 47} fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">EMISSIVITY</text>
        <text x="163" y={height - 24} fill="#a855f7" fontSize="15" fontWeight="700">
          ε = {props.emissivity.toFixed(2)}
        </text>
        {/* Column 3: Status */}
        <text x="298" y={height - 47} fill="rgba(148,163,184,0.7)" fontSize="11" fontWeight="600">STATUS</text>
        <text x="298" y={height - 24} fill={props.emissivity > 0.5 ? '#10b981' : '#eab308'} fontSize="11" fontWeight="600">
          {props.emissivity > 0.5 ? '↑ Emitting' : '↓ Reflecting'}
        </text>
      </svg>
    );
  };

  // Twist comparison visualization
  const TwistComparisonVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 260 : 300;
    const infrared = twistViewMode === 'infrared';
    const matteIRColor = tempToIRColor(60, 0.95);
    const shinyIRColor = tempToIRColor(60, 0.1);
    const shinyApparent = 0.1 * 60 + 0.9 * ambientTemp;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="twistTempScale" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="twistHeatGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="twistMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="40%" stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
          <linearGradient id="twistMatteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill={infrared ? '#020617' : '#0f172a'} rx="12" />

        {/* Header */}
        <rect x="0" y="0" width={width} height="35" fill={infrared ? '#0f172a' : '#111827'} rx="12" />
        <text x={width/2} y="14" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">
          EMISSIVITY COMPARISON
        </text>
        <text x={width/2} y="28" textAnchor="middle" fill={infrared ? '#f97316' : '#22d3ee'} fontSize="12" fontWeight="600">
          Both cups contain 60C hot water
        </text>
        {infrared && (
          <>
            <circle cx="20" cy="17" r="4" fill="#ef4444">
              <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
            </circle>
            <text x="30" y="21" fill="#ef4444" fontSize="11">IR</text>
          </>
        )}

        {/* Matte Black Cup (Left) */}
        <g transform="translate(40, 50)">
          <g filter={infrared ? 'url(#twistHeatGlow)' : undefined}>
            <path
              d="M 20 25 L 28 120 L 88 120 L 96 25 Z"
              fill={infrared ? matteIRColor : 'url(#twistMatteGrad)'}
            />
            <ellipse cx="58" cy="25" rx="38" ry="10"
              fill={infrared ? matteIRColor : '#374151'} />
            <path
              d="M 96 30 Q 140 50 140 80 Q 140 110 96 135"
              fill="none"
              stroke={infrared ? matteIRColor : '#374151'}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>

          {/* Steam (visible mode) */}
          {!infrared && [...Array(3)].map((_, i) => (
            <path
              key={i}
              d={`M ${40 + i * 15} 15 Q ${50 + i * 15} ${-20 - Math.sin(animPhase + i) * 30} ${40 + i * 15} ${-60 - Math.sin(animPhase + i) * 30}`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
          ))}

          {/* IR waves (infrared mode) */}
          {infrared && [...Array(5)].map((_, i) => {
            const angle = (i * Math.PI / 2.5) + animPhase - Math.PI / 2;
            return (
              <path
                key={i}
                d={`M ${58 + Math.cos(angle) * 40} ${72 + Math.sin(angle) * 35}
                    Q ${58 + Math.cos(angle) * 52} ${72 + Math.sin(angle) * 45}
                    ${58 + Math.cos(angle) * 65} ${72 + Math.sin(angle) * 55}`}
                stroke={matteIRColor}
                strokeWidth="2"
                fill="none"
                opacity={0.5 + Math.sin(animPhase + i) * 0.2}
              />
            );
          })}

          {/* Label */}
          <rect x="8" y="130" width="100" height="35" rx="4" fill="#111827" stroke="#334155" strokeWidth="1" />
          <text x="58" y="147" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">Matte Black</text>
          <text x="58" y="162" textAnchor="middle" fill={infrared ? '#f97316' : '#a855f7'} fontSize="11">
            {infrared ? '~58°C apparent' : 'ε = 0.95'}
          </text>
        </g>

        {/* VS indicator */}
        {infrared && (
          <text x={width/2} y="100" textAnchor="middle" fill="#fbbf24" fontSize="18" fontWeight="700">VS</text>
        )}

        {/* Polished Metal Cup (Right) */}
        <g transform={`translate(${width - 160}, 50)`}>
          <g>
            <path
              d="M 20 25 L 28 120 L 88 120 L 96 25 Z"
              fill={infrared ? shinyIRColor : 'url(#twistMetalGrad)'}
              stroke={infrared ? 'none' : '#e5e7eb'}
              strokeWidth="2"
            />
            <ellipse cx="58" cy="25" rx="38" ry="10"
              fill={infrared ? shinyIRColor : '#9ca3af'} />
            <path
              d="M 96 30 Q 140 50 140 80 Q 140 110 96 135"
              fill="none"
              stroke={infrared ? shinyIRColor : '#9ca3af'}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>

          {/* Reflections (visible mode) */}
          {!infrared && (
            <ellipse cx="45" cy="70" rx="8" ry="25" fill="rgba(255,255,255,0.3)" />
          )}

          {/* Steam (visible mode) */}
          {!infrared && [...Array(3)].map((_, i) => (
            <path
              key={i}
              d={`M ${40 + i * 15} 15 Q ${50 + i * 15} ${-20 - Math.sin(animPhase + i) * 30} ${40 + i * 15} ${-60 - Math.sin(animPhase + i) * 30}`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
          ))}

          {/* Label */}
          <rect x="8" y="130" width="100" height="35" rx="4" fill="#111827" stroke="#334155" strokeWidth="1" />
          <text x="58" y="147" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">Polished Metal</text>
          <text x="58" y="162" textAnchor="middle" fill={infrared ? '#60a5fa' : '#a855f7'} fontSize="11">
            {infrared ? `~${shinyApparent.toFixed(0)}°C apparent` : 'ε = 0.10'}
          </text>
        </g>

        {/* Grid lines for twist visualization */}
        {[60, 100, 140, 180].map(y => (
          <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
        ))}
        {/* Axis labels */}
        <text x="6" y="45" fill="rgba(148,163,184,0.7)" fontSize="11">°C</text>
        <text x={width/2} y={height - 3} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Surface Type</text>

        {/* Bottom explanation */}
        <g transform={`translate(15, ${height - 50})`}>
          <rect x="0" y="0" width={width - 30} height="40" rx="6" fill="#111827" stroke={infrared ? '#f97316' : '#334155'} strokeWidth="1" />
          {infrared ? (
            <>
              <text x={(width-30)/2} y="15" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">
                SAME TEMP — DIFFERENT IR READINGS!
              </text>
              <text x={(width-30)/2} y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11">
                Shiny reflects room (~{ambientTemp}°C) instead of emitting 60°C
              </text>
            </>
          ) : (
            <>
              <text x={(width-30)/2} y="15" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="600">
                Both cups at 60°C — Steam rising from both
              </text>
              <text x={(width-30)/2} y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11">
                Switch to IR view to see how emissivity affects thermal camera readings
              </text>
            </>
          )}
        </g>
      </svg>
    );
  };

  // Navigation bar component
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentIndex > 0 && (
            <button
              onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
              aria-label="Back"
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.textSecondary,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ← Back
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#e2e8f0', fontSize: '13px' }}>🌡️ Infrared Emissivity</span>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>({currentIndex + 1}/{phaseOrder.length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentIndex < phaseOrder.length - 1 && (
            <button
              onClick={() => goToPhase(phaseOrder[currentIndex + 1])}
              aria-label="Next"
              style={{
                background: colors.accent,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Next →
            </button>
          )}
        </div>
      </nav>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.hot})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.hot})`,
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '48px',
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌡️📷
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Infrared Emissivity
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why do some <span style={{ color: colors.hot }}>hot objects</span> appear <span style={{ color: colors.cold }}>cold</span> on thermal cameras? The secret lies in a property called emissivity."
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
            "A polished metal cup filled with hot coffee can appear cold on a thermal camera, while your hand appears to glow brightly. Same room, vastly different IR readings. Why?"
          </p>
          <p className="text-muted" style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '8px' }}>
            - Thermal Imaging Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Infrared Vision
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The color of your skin determines how bright it appears' },
      { id: 'b', text: 'Your body temperature creates infrared radiation that the camera detects', correct: true },
      { id: 'c', text: 'The camera measures how fast heat conducts from your body' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '48px',
        paddingBottom: '16px',
        overflowY: 'auto',
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
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            You point a thermal camera at your hand. What determines how bright it appears on the camera?
          </h2>

          {/* Predict SVG diagram */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <svg width="460" height="220" viewBox="0 0 460 220" style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <defs>
                <filter id="predictGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
                </marker>
              </defs>
              {/* Grid lines */}
              {[40, 80, 120, 160, 200].map(y => (
                <line key={y} x1="10" y1={y} x2="450" y2={y} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
              ))}
              {/* Y axis label */}
              <text x="14" y="14" fill="rgba(148,163,184,0.7)" fontSize="11">IR Output</text>
              {/* X axis */}
              <line x1="20" y1="200" x2="440" y2="200" stroke="#334155" strokeWidth="1" />
              <text x="230" y="216" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Surface Properties</text>

              {/* Hand / body */}
              <ellipse cx="80" cy="120" rx="40" ry="55" fill="#e8b4a0" filter="url(#predictGlow)" />
              <ellipse cx="80" cy="85" rx="8" ry="20" fill="#e8b4a0" />
              <ellipse cx="93" cy="80" rx="7" ry="22" fill="#e8b4a0" />
              <ellipse cx="106" cy="83" rx="7" ry="20" fill="#e8b4a0" />
              <text x="80" y="188" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Hand 37°C</text>
              <text x="80" y="202" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">High emissivity</text>

              {/* Arrow */}
              <line x1="140" y1="110" x2="200" y2="110" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <text x="170" y="103" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">emits IR</text>

              {/* Camera */}
              <rect x="200" y="85" width="60" height="50" rx="6" fill="#1e293b" stroke={colors.accent} strokeWidth="2" />
              <circle cx="230" cy="110" r="14" fill="#0f172a" stroke={colors.accent} strokeWidth="2" />
              <circle cx="230" cy="110" r="8" fill="#1e3a5f" />
              <text x="230" y="148" textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">IR Camera</text>

              {/* Arrow 2 */}
              <line x1="260" y1="110" x2="320" y2="110" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
              <text x="290" y="103" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">detects</text>

              {/* Display */}
              <rect x="320" y="75" width="100" height="70" rx="6" fill="#0f172a" stroke="#f97316" strokeWidth="2" />
              <rect x="330" y="83" width="80" height="54" rx="3" fill="#1e293b" />
              <ellipse cx="370" cy="110" rx="25" ry="20" fill="#f97316" opacity="0.8" />
              <text x="370" y="115" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">37°</text>
              <text x="370" y="156" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Display</text>
              <text x="370" y="170" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">???</text>
            </svg>
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
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive IR Camera Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '48px',
        paddingBottom: '16px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Thermal Camera Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Switch between visible and IR views to see how different objects appear.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <IRSceneVisualization />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Object selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Select Object</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'hand', label: 'Hand (37C)', icon: '✋' },
                    { id: 'cup_matte', label: 'Matte Cup', icon: '☕' },
                    { id: 'cup_shiny', label: 'Shiny Cup', icon: '🥤' },
                    { id: 'ice', label: 'Ice (0C)', icon: '🧊' },
                  ].map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => { playSound('click'); setSelectedObject(obj.id as typeof selectedObject); }}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${selectedObject === obj.id ? colors.accent : colors.border}`,
                        background: selectedObject === obj.id ? `${colors.accent}22` : colors.bgSecondary,
                        color: colors.textPrimary,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '24px' }}>{obj.icon}</div>
                      <div style={{ ...typo.small }}>{obj.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature slider */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{objectTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={objectTemp}
                  onChange={(e) => { setObjectTemp(parseInt(e.target.value)); }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              {/* View mode toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => { playSound('click'); setViewMode('visible'); }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === 'visible' ? colors.cold : colors.bgSecondary,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Normal View
                </button>
                <button
                  onClick={() => { playSound('click'); setViewMode('infrared'); }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === 'infrared' ? colors.accent : colors.bgSecondary,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  IR Camera
                </button>
              </div>
            </div>
          </div>

          {/* Observation guidance - always visible */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: '0 0 4px', fontWeight: 600 }}>
              🔍 What to watch for:
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Compare the Normal View vs IR Camera view for each object. Notice how the <strong style={{ color: colors.textPrimary }}>Polished Metal Cup</strong> appears much cooler on the IR camera than its actual temperature — this is the emissivity effect. Surface finish determines how much infrared radiation is emitted vs reflected.
            </p>
          </div>

          {/* Discovery prompt for shiny cup */}
          {viewMode === 'infrared' && selectedObject === 'cup_shiny' && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                ⚠️ Notice: The shiny cup appears cooler than its actual temperature! Why might that be?
              </p>
            </div>
          )}

          {/* Real-world relevance */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Real-World Application:</strong> Thermal cameras are used in building inspections, firefighting, and medical diagnostics. Understanding emissivity is essential for accurate temperature readings in the field.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '48px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            How Thermal Imaging Works
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>All warm objects emit infrared radiation</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                Molecules in all matter above absolute zero are constantly vibrating. This thermal motion causes atoms to emit electromagnetic radiation in the <span style={{ color: colors.accent }}>infrared spectrum</span>.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Stefan-Boltzmann Law: P = e * A * T^4</strong>
              </p>
              <p>
                The power radiated increases with the <span style={{ color: colors.hot }}>fourth power</span> of temperature. Double the temperature, and radiation increases 16x!
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
              Key Insight: Your Prediction
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              You predicted: "{prediction === 'a' ? 'The color of your skin determines brightness' : prediction === 'b' ? 'Body temperature creates IR radiation' : 'Heat conduction speed'}".
              {prediction === 'b' ? ' You were correct!' : ' The correct answer was B.'} Your body temperature creates infrared radiation that the camera detects. The warmer you are, the more IR you emit.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              But wait... if temperature determines IR emission, why would two objects at the <em>same</em> temperature look different on a thermal camera?
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Both appear at 60C - same temperature means same IR' },
      { id: 'b', text: 'The shiny cup appears COOLER than the matte cup', correct: true },
      { id: 'c', text: 'The shiny cup appears HOTTER because metal conducts heat better' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '48px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.hot}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.hot}44`,
          }}>
            <p style={{ ...typo.small, color: colors.hot, margin: 0 }}>
              New Variable: Surface Emissivity
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            You fill TWO cups with 60C hot water. One is matte black, one is polished metal. On a thermal camera:
          </h2>

          {/* Twist predict SVG - static, no sliders */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="460" height="220" viewBox="0 0 460 220" style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <defs>
                <filter id="twistPredictGlowA">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <linearGradient id="tpMatteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="100%" stopColor="#111827" />
                </linearGradient>
                <linearGradient id="tpMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="50%" stopColor="#e5e7eb" />
                  <stop offset="100%" stopColor="#6b7280" />
                </linearGradient>
              </defs>
              {/* Background */}
              <rect width="460" height="220" fill="#0f172a" rx="12" />
              {/* Grid lines */}
              {[40, 80, 120, 160, 200].map(y => (
                <line key={y} x1="0" y1={y} x2="460" y2={y} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
              ))}
              {/* Y axis - Temperature */}
              <text x="6" y="36" fill="rgba(148,163,184,0.7)" fontSize="11">Temperature</text>
              {/* Title */}
              <text x="230" y="18" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">Both Cups at 60°C</text>
              {/* VS Divider */}
              <line x1="230" y1="30" x2="230" y2="190" stroke="#334155" strokeDasharray="6 4" strokeWidth="1" />
              <text x="230" y="120" textAnchor="middle" fill="#fbbf24" fontSize="18" fontWeight="800">vs</text>
              {/* Matte cup left */}
              <path d="M 70 60 L 78 155 L 138 155 L 146 60 Z" fill="url(#tpMatteGrad)" />
              <ellipse cx="108" cy="60" rx="38" ry="10" fill="#374151" />
              <path d="M 146 75 Q 170 90 170 110 Q 170 130 146 145" fill="none" stroke="#374151" strokeWidth="8" strokeLinecap="round" />
              {/* Temperature label matte */}
              <text x="108" y="178" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Matte Black</text>
              <text x="108" y="194" textAnchor="middle" fill="#f97316" fontSize="11">ε = 0.95</text>
              <text x="108" y="210" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Actual: 60°C</text>
              {/* Polished metal cup right */}
              <path d="M 310 60 L 318 155 L 378 155 L 386 60 Z" fill="url(#tpMetalGrad)" stroke="#e5e7eb" strokeWidth="1" />
              <ellipse cx="348" cy="60" rx="38" ry="10" fill="#9ca3af" />
              <path d="M 386 75 Q 410 90 410 110 Q 410 130 386 145" fill="none" stroke="#9ca3af" strokeWidth="8" strokeLinecap="round" />
              <ellipse cx="330" cy="105" rx="7" ry="25" fill="rgba(255,255,255,0.3)" />
              {/* Temperature label metal */}
              <text x="348" y="178" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Polished Metal</text>
              <text x="348" y="194" textAnchor="middle" fill="#60a5fa" fontSize="11">ε = 0.10</text>
              <text x="348" y="210" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">Actual: 60°C</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.hot}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.hot : colors.border}`,
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
                  background: twistPrediction === opt.id ? colors.hot : colors.bgSecondary,
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
              See the Comparison
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
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '48px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            The Emissivity Effect
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare matte black vs polished metal at the same temperature
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <TwistComparisonVisualization />
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* View mode toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => { playSound('click'); setTwistViewMode('visible'); }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: twistViewMode === 'visible' ? colors.cold : colors.bgSecondary,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Normal View
                </button>
                <button
                  onClick={() => { playSound('click'); setTwistViewMode('infrared'); }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: twistViewMode === 'infrared' ? colors.accent : colors.bgSecondary,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  IR Camera
                </button>
              </div>
            </div>
          </div>

          {twistViewMode === 'infrared' && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                The shiny cup appears much cooler! It reflects the room temperature instead of emitting its own heat.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Emissivity
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '48px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Understanding Emissivity
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>e</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>What is Emissivity?</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Emissivity (e) is how efficiently a surface emits thermal radiation compared to an ideal "blackbody" (e=1). <span style={{ color: colors.accent }}>High emissivity surfaces</span> emit their true temperature. <span style={{ color: colors.cold }}>Low emissivity surfaces</span> reflect their surroundings instead.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}>
              <div style={{
                background: `${colors.hot}22`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.hot}44`,
              }}>
                <h4 style={{ ...typo.small, color: colors.hot, marginBottom: '8px', fontWeight: 600 }}>
                  High Emissivity (e = 0.9-1.0)
                </h4>
                <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                  <li>Human skin</li>
                  <li>Matte black paint</li>
                  <li>Paper, wood</li>
                  <li>Concrete, brick</li>
                </ul>
              </div>
              <div style={{
                background: `${colors.cold}22`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.cold}44`,
              }}>
                <h4 style={{ ...typo.small, color: colors.cold, marginBottom: '8px', fontWeight: 600 }}>
                  Low Emissivity (e = 0.02-0.2)
                </h4>
                <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                  <li>Polished metals</li>
                  <li>Mirrors</li>
                  <li>Aluminum foil</li>
                  <li>Shiny steel</li>
                </ul>
              </div>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Accurate Readings</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                To get accurate temperature readings on shiny surfaces, apply a piece of high-emissivity electrical tape (e=0.95) and measure that instead. Or adjust your IR thermometer's emissivity setting to match the surface.
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
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Infrared Emissivity"
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
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '48px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} - Explore all applications to continue
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
                How Emissivity Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            {/* Stats comparison - flex row */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  flex: 1,
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

            {/* Future impact */}
            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '8px',
            }}>
              <p style={{ ...typo.small, color: app.color, margin: 0, fontWeight: 600 }}>
                🔮 Future Impact:
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: '4px 0 0' }}>
                {app.futureImpact}
              </p>
            </div>

            {/* Got It button for current app */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Auto-advance to next uncompleted app
                const nextUncompleted = completedApps.findIndex((c, i) => !c && i > selectedApp);
                if (nextUncompleted !== -1) {
                  setSelectedApp(nextUncompleted);
                } else {
                  const firstUncompleted = completedApps.findIndex((c, i) => !c && i !== selectedApp);
                  if (firstUncompleted !== -1) {
                    setSelectedApp(firstUncompleted);
                  }
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginTop: '16px',
                background: completedApps[selectedApp] ? colors.success : `linear-gradient(135deg, ${colors.accent}, ${colors.hot})`,
              }}
            >
              {completedApps[selectedApp] ? 'Got It!' : 'Got It - Mark Complete'}
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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📖'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand infrared emissivity and thermal imaging!'
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
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
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
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
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
          Thermal Imaging Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand infrared emissivity and why some hot objects appear cold on thermal cameras.
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
              'All warm objects emit infrared radiation',
              'Emissivity determines how much IR a surface emits',
              'Low emissivity surfaces reflect surroundings',
              'Temperature readings need emissivity correction',
              'Real-world thermal imaging applications',
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

export default InfraredEmissivityRenderer;
