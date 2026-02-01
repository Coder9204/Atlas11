'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface InfraredEmissivityRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const realWorldApps = [
  {
    icon: '🔥',
    title: 'Thermal Imaging Cameras',
    short: 'Seeing heat in darkness',
    tagline: 'Making the invisible visible',
    description: 'Thermal cameras detect infrared radiation emitted by objects based on their temperature and emissivity. Used in building inspections, firefighting, medical diagnostics, and security, these cameras convert IR radiation into visible images showing temperature variations across surfaces.',
    connection: 'Understanding emissivity is crucial for accurate thermal imaging. A shiny metal surface may appear cool on camera not because it is cool, but because its low emissivity means it emits less IR radiation and reflects ambient temperatures instead.',
    howItWorks: 'Thermal cameras use microbolometer arrays sensitive to IR wavelengths (8-14 μm). Each pixel absorbs IR radiation, causing temperature changes that alter electrical resistance. Software converts resistance values to temperatures, applying emissivity corrections for accurate readings.',
    stats: [
      { value: '0.01°C', label: 'Sensitivity', icon: '⚡' },
      { value: '$8.7B', label: 'Market size', icon: '📈' },
      { value: '640x480', label: 'Resolution', icon: '🚀' }
    ],
    examples: ['Building energy audits finding insulation gaps', 'Electrical inspections detecting hot spots', 'Medical fever screening', 'Night vision for security'],
    companies: ['FLIR Systems', 'Fluke', 'Hikvision', 'Seek Thermal'],
    futureImpact: 'Smartphone-integrated thermal cameras will make IR imaging ubiquitous for home energy audits, health monitoring, and DIY repairs, democratizing a technology once reserved for professionals.',
    color: '#EF4444'
  },
  {
    icon: '🌡️',
    title: 'Spacecraft Thermal Control',
    short: 'Surviving space extremes',
    tagline: 'Engineering survival in the cosmic void',
    description: 'Spacecraft must carefully manage thermal radiation to survive temperature extremes from -270°C in shadow to +120°C in sunlight. Surface coatings with precisely engineered emissivity values control how much heat is radiated to space or absorbed from the sun.',
    connection: 'The Stefan-Boltzmann law (P = εσAT⁴) governs spacecraft thermal balance. By selecting surface emissivity values, engineers control the equilibrium temperature. High-emissivity surfaces radiate heat effectively; low-emissivity surfaces retain heat.',
    howItWorks: 'Multi-layer insulation (MLI) uses low-emissivity metal foils to minimize radiative heat transfer. Radiator panels with high emissivity reject waste heat. Specialized coatings balance solar absorptivity and thermal emissivity for optimal temperature control.',
    stats: [
      { value: '0.02', label: 'MLI emissivity', icon: '⚡' },
      { value: '400°C', label: 'Temp range', icon: '📈' },
      { value: '$2.1B', label: 'Market size', icon: '🚀' }
    ],
    examples: ['James Webb Space Telescope sunshield', 'ISS radiator panels', 'Mars rover thermal blankets', 'Satellite bus thermal coatings'],
    companies: ['NASA', 'SpaceX', 'Lockheed Martin', 'Northrop Grumman'],
    futureImpact: 'Variable-emissivity surfaces using electrochromic or phase-change materials will allow spacecraft to dynamically adjust thermal properties, reducing heating power requirements and extending mission life.',
    color: '#3B82F6'
  },
  {
    icon: '🏠',
    title: 'Low-E Window Coatings',
    short: 'Keeping buildings comfortable',
    tagline: 'Invisible energy savings',
    description: 'Low-emissivity (Low-E) window coatings are thin metal oxide layers that reduce heat transfer through windows. These coatings reflect infrared radiation while allowing visible light through, keeping buildings warmer in winter and cooler in summer.',
    connection: 'Low-E coatings exploit the relationship between emissivity and reflectivity. A surface with low emissivity has high IR reflectivity, bouncing thermal radiation back rather than absorbing and re-emitting it.',
    howItWorks: 'Sputtered coatings of silver or tin oxide are applied in layers just nanometers thick. The coating reflects long-wave IR (room heat) while transmitting visible light. Different coating configurations optimize for heating-dominated or cooling-dominated climates.',
    stats: [
      { value: '30%', label: 'Energy savings', icon: '⚡' },
      { value: '$4.2B', label: 'Market size', icon: '📈' },
      { value: '0.04', label: 'Low-E emissivity', icon: '🚀' }
    ],
    examples: ['Double-pane residential windows', 'Commercial building facades', 'Skylight glazing', 'Refrigerator door glass'],
    companies: ['Guardian Glass', 'PPG Industries', 'Saint-Gobain', 'AGC'],
    futureImpact: 'Switchable Low-E coatings will dynamically adjust emissivity based on outdoor conditions, maximizing solar gain in winter and rejection in summer, approaching the efficiency of smart building envelopes.',
    color: '#10B981'
  },
  {
    icon: '🍳',
    title: 'Cookware Surface Engineering',
    short: 'Optimizing heat transfer',
    tagline: 'The science of perfect cooking',
    description: 'Cookware surfaces are engineered with specific emissivity properties for optimal heat distribution. Matte black surfaces on cast iron radiate heat effectively for baking, while polished stainless interiors minimize radiative losses for efficient stovetop cooking.',
    connection: 'High-emissivity surfaces radiate more thermal energy at a given temperature. A dark pizza stone radiates heat to the dough more effectively than a shiny metal pan, creating better crusts through radiative heat transfer.',
    howItWorks: 'Cast iron develops a high-emissivity patina through seasoning. Enameled coatings provide consistent emissivity. Anodized aluminum creates a controlled oxide layer. Pizza ovens use refractory surfaces with emissivity near 0.9 for maximum radiant heating.',
    stats: [
      { value: '0.95', label: 'Cast iron ε', icon: '⚡' },
      { value: '$12B', label: 'Cookware market', icon: '📈' },
      { value: '40%', label: 'Better browning', icon: '🚀' }
    ],
    examples: ['Seasoned cast iron skillets', 'Stone pizza ovens', 'Infrared grills', 'Convection oven interiors'],
    companies: ['Lodge', 'Le Creuset', 'All-Clad', 'Staub'],
    futureImpact: 'Smart cookware with temperature-sensing coatings will provide real-time feedback, while engineered surface textures will optimize emissivity patterns for specific cooking techniques.',
    color: '#F59E0B'
  }
];

const TEST_QUESTIONS = [
  {
    question: 'Why do all warm objects emit infrared radiation?',
    options: [
      { text: 'They have special IR emitting chemicals', correct: false },
      { text: 'Thermal motion of molecules produces electromagnetic radiation', correct: true },
      { text: 'They absorb IR from the sun and re-emit it', correct: false },
      { text: 'Only metal objects emit IR', correct: false }
    ]
  },
  {
    question: 'A shiny metal cup and a matte black cup are the same temperature. On an IR camera:',
    options: [
      { text: 'They look the same - same temperature means same IR', correct: false },
      { text: 'The shiny cup appears COOLER because it reflects surroundings instead of emitting', correct: true },
      { text: 'The shiny cup appears HOTTER because metal conducts better', correct: false },
      { text: 'IR cameras cannot see metal objects', correct: false }
    ]
  },
  {
    question: 'What is emissivity?',
    options: [
      { text: 'How hot an object is', correct: false },
      { text: 'How much IR radiation a surface emits compared to a perfect blackbody', correct: true },
      { text: 'The color of an object under normal light', correct: false },
      { text: 'How reflective a surface is to visible light', correct: false }
    ]
  },
  {
    question: 'To get accurate temperature readings with an IR camera, you should:',
    options: [
      { text: 'Always use a shiny surface', correct: false },
      { text: 'Set the emissivity value to match the surface, or apply high-emissivity tape', correct: true },
      { text: 'Only measure on cloudy days', correct: false },
      { text: 'Point the camera at the sun first to calibrate', correct: false }
    ]
  },
  {
    question: 'What is a "blackbody" in physics?',
    options: [
      { text: 'Any object that is painted black', correct: false },
      { text: 'An ideal object that absorbs all radiation and emits maximum IR for its temperature', correct: true },
      { text: 'A black hole in space', correct: false },
      { text: 'A material that reflects all light', correct: false }
    ]
  },
  {
    question: 'According to the Stefan-Boltzmann law, if you double an object\'s absolute temperature, the radiated power:',
    options: [
      { text: 'Doubles (2x)', correct: false },
      { text: 'Quadruples (4x)', correct: false },
      { text: 'Increases 16 times (2^4)', correct: true },
      { text: 'Stays the same', correct: false }
    ]
  },
  {
    question: 'Why does matte black paint radiate heat better than shiny metal at the same temperature?',
    options: [
      { text: 'Black paint is hotter', correct: false },
      { text: 'Matte black has high emissivity, efficiently converting thermal energy to IR radiation', correct: true },
      { text: 'Metal blocks all radiation', correct: false },
      { text: 'Paint conducts heat better', correct: false }
    ]
  },
  {
    question: 'In thermal imaging, what does a "false color" image mean?',
    options: [
      { text: 'The image is fake or manipulated', correct: false },
      { text: 'Colors are assigned to represent temperatures, not actual visible colors', correct: true },
      { text: 'The camera is malfunctioning', correct: false },
      { text: 'The object is transparent to IR', correct: false }
    ]
  },
  {
    question: 'Why can thermal cameras see people in complete darkness?',
    options: [
      { text: 'They use special flashlights', correct: false },
      { text: 'Human bodies emit IR radiation due to body heat, no external light needed', correct: true },
      { text: 'They amplify tiny amounts of visible light', correct: false },
      { text: 'They detect sound waves from breathing', correct: false }
    ]
  },
  {
    question: 'What happens to emissivity and reflectivity for most surfaces?',
    options: [
      { text: 'Both can be high at the same time', correct: false },
      { text: 'They are independent of each other', correct: false },
      { text: 'High emissivity means low reflectivity, and vice versa (they sum to ~1)', correct: true },
      { text: 'Reflectivity is always higher', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Building Inspections',
    description: 'Find heat leaks, missing insulation, and moisture damage by seeing temperature differences.',
    icon: '🏠'
  },
  {
    title: 'Medical Imaging',
    description: 'Detect inflammation, blood flow issues, and fever screening by measuring skin temperature.',
    icon: '🏥'
  },
  {
    title: 'Electrical Maintenance',
    description: 'Find hot spots in electrical panels that indicate loose connections or overloaded circuits.',
    icon: '⚡'
  },
  {
    title: 'Night Vision',
    description: 'Military and wildlife observation use thermal imaging to see warm bodies in total darkness.',
    icon: '🌙'
  }
];

const InfraredEmissivityRenderer: React.FC<InfraredEmissivityRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showTestResults, setShowTestResults] = useState(false);

  // Simulation state
  const [viewMode, setViewMode] = useState<'visible' | 'infrared'>('visible');
  const [selectedObject, setSelectedObject] = useState<'hand' | 'cup_matte' | 'cup_shiny' | 'ice'>('hand');
  const [objectTemp, setObjectTemp] = useState(37);
  const [ambientTemp] = useState(22);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state
  const [twistViewMode, setTwistViewMode] = useState<'visible' | 'infrared'>('visible');

  const lastClickRef = useRef(0);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
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

  // Object properties
  const getObjectProps = (obj: string) => {
    const props: Record<string, { emissivity: number; name: string; actualTemp: number; color: string }> = {
      hand: { emissivity: 0.98, name: 'Human Hand', actualTemp: 37, color: '#e8b4a0' },
      cup_matte: { emissivity: 0.95, name: 'Matte Black Cup', actualTemp: objectTemp, color: '#1f2937' },
      cup_shiny: { emissivity: 0.1, name: 'Polished Metal Cup', actualTemp: objectTemp, color: '#9ca3af' },
      ice: { emissivity: 0.96, name: 'Ice Cube', actualTemp: 0, color: '#e0f2fe' }
    };
    return props[obj] || props.hand;
  };

  // Temperature to IR color
  const tempToIRColor = (temp: number, emissivity: number) => {
    const apparentTemp = emissivity * temp + (1 - emissivity) * ambientTemp;
    const normalizedTemp = Math.max(0, Math.min(1, (apparentTemp + 10) / 60));

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

  // Animation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setViewMode('visible');
      setSelectedObject('hand');
      setObjectTemp(37);
    }
    if (phase === 'twist_play') {
      setTwistViewMode('visible');
    }
  }, [phase]);

  const renderIRScene = (object: string, infrared: boolean) => {
    const props = getObjectProps(object);
    const irColor = tempToIRColor(props.actualTemp, props.emissivity);
    const apparentTemp = props.emissivity * props.actualTemp + (1 - props.emissivity) * ambientTemp;

    return (
      <svg viewBox="0 0 500 320" className="w-full h-64">
        {/* === COMPREHENSIVE DEFS SECTION === */}
        <defs>
          {/* Premium temperature scale gradient (6 color stops for depth) */}
          <linearGradient id="ireTempScale" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="20%" stopColor="#6366f1" />
            <stop offset="40%" stopColor="#22d3ee" />
            <stop offset="60%" stopColor="#facc15" />
            <stop offset="80%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Lab background gradient */}
          <linearGradient id="ireLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a1628" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* IR view dark background */}
          <linearGradient id="ireIRViewBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="50%" stopColor="#0c1222" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Radial gradient for heat radiation effect - hot center */}
          <radialGradient id="ireHeatRadiation" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>

          {/* Radial gradient for cold objects */}
          <radialGradient id="ireColdRadiation" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#1e3a8a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#172554" stopOpacity="0" />
          </radialGradient>

          {/* Warm body temperature gradient */}
          <radialGradient id="ireBodyHeat" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
            <stop offset="75%" stopColor="#ea580c" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
          </radialGradient>

          {/* Metallic surface gradient for shiny cup */}
          <linearGradient id="ireMetalSurface" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="20%" stopColor="#d1d5db" />
            <stop offset="40%" stopColor="#e5e7eb" />
            <stop offset="60%" stopColor="#d1d5db" />
            <stop offset="80%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>

          {/* Matte black surface gradient */}
          <linearGradient id="ireMatteBlack" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="30%" stopColor="#1f2937" />
            <stop offset="70%" stopColor="#111827" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Skin tone gradient */}
          <linearGradient id="ireSkinTone" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd5ce" />
            <stop offset="25%" stopColor="#f5cac3" />
            <stop offset="50%" stopColor="#e8b4a0" />
            <stop offset="75%" stopColor="#d4a292" />
            <stop offset="100%" stopColor="#c99a88" />
          </linearGradient>

          {/* Ice crystal gradient */}
          <linearGradient id="ireIceCrystal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="25%" stopColor="#e0f2fe" />
            <stop offset="50%" stopColor="#bae6fd" />
            <stop offset="75%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>

          {/* IR wave emission glow filter */}
          <filter id="ireWaveGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Heat emission glow */}
          <filter id="ireHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft inner glow for objects */}
          <filter id="ireInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Cold object glow */}
          <filter id="ireColdGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Temperature indicator gradient for display */}
          <linearGradient id="ireTempIndicator" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="25%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Reflection gradient for shiny surfaces */}
          <radialGradient id="ireReflection" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* === PREMIUM BACKGROUND === */}
        <rect width="500" height="320" fill={infrared ? 'url(#ireIRViewBg)' : 'url(#ireLabBg)'} />

        {/* Subtle grid pattern for lab feel */}
        <pattern id="ireLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke={infrared ? '#1e293b' : '#1e293b'} strokeWidth="0.3" strokeOpacity="0.3" />
        </pattern>
        <rect width="500" height="320" fill="url(#ireLabGrid)" />

        {/* === HEADER SECTION === */}
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="500" height="32" fill={infrared ? '#0f172a' : '#111827'} fillOpacity="0.8" />
          <text x="250" y="21" textAnchor="middle" className="text-sm font-bold" fill={infrared ? '#f97316' : '#e2e8f0'}>
            {infrared ? 'THERMAL IMAGING VIEW' : 'VISIBLE LIGHT VIEW'} - {props.name}
          </text>
          {infrared && (
            <circle cx="35" cy="16" r="5" fill="#ef4444">
              <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
            </circle>
          )}
          {infrared && (
            <text x="50" y="20" className="text-xs font-medium" fill="#ef4444">REC</text>
          )}
        </g>

        {/* === TEMPERATURE SCALE (IR View) === */}
        {infrared && (
          <g transform="translate(440, 45)">
            <rect x="-5" y="-10" width="55" height="220" rx="4" fill="#111827" stroke="#334155" strokeWidth="1" />
            <text x="22" y="5" textAnchor="middle" className="text-xs font-bold" fill="#94a3b8">TEMP</text>

            {/* Temperature gradient bar */}
            <rect x="5" y="15" width="18" height="170" rx="2" fill="url(#ireTempScale)" />
            <rect x="5" y="15" width="18" height="170" rx="2" fill="none" stroke="#475569" strokeWidth="1" />

            {/* Temperature labels */}
            <text x="28" y="25" className="text-xs" fill="#fca5a5">60C</text>
            <text x="28" y="58" className="text-xs" fill="#fdba74">45C</text>
            <text x="28" y="91" className="text-xs" fill="#fde047">30C</text>
            <text x="28" y="124" className="text-xs" fill="#67e8f9">15C</text>
            <text x="28" y="157" className="text-xs" fill="#818cf8">0C</text>
            <text x="28" y="190" className="text-xs" fill="#6366f1">-15C</text>

            {/* Tick marks */}
            {[15, 48, 82, 116, 150, 185].map((y, i) => (
              <line key={i} x1="23" y1={y} x2="26" y2={y} stroke="#64748b" strokeWidth="1" />
            ))}
          </g>
        )}

        {/* === MAIN VISUALIZATION AREA === */}
        <g transform="translate(100, 50)">
          {/* Object visualization */}
          {object === 'hand' && (
            <g>
              {/* Hand shape with premium gradients */}
              <g filter={infrared ? 'url(#ireHeatGlow)' : undefined}>
                {/* Palm */}
                <ellipse cx="100" cy="120" rx="55" ry="75"
                  fill={infrared ? irColor : 'url(#ireSkinTone)'}
                  filter={infrared ? 'url(#ireInnerGlow)' : undefined}
                />
                {/* Thumb */}
                <ellipse cx="45" cy="90" rx="22" ry="12"
                  fill={infrared ? irColor : 'url(#ireSkinTone)'}
                  transform="rotate(-35, 45, 90)"
                />
                {/* Fingers */}
                <ellipse cx="75" cy="40" rx="10" ry="35" fill={infrared ? irColor : 'url(#ireSkinTone)'} />
                <ellipse cx="100" cy="32" rx="9" ry="40" fill={infrared ? irColor : 'url(#ireSkinTone)'} />
                <ellipse cx="125" cy="38" rx="8" ry="36" fill={infrared ? irColor : 'url(#ireSkinTone)'} />
                <ellipse cx="147" cy="52" rx="7" ry="28" fill={infrared ? irColor : 'url(#ireSkinTone)'} />
              </g>

              {/* IR radiation waves emanating from hand */}
              {infrared && (
                <g filter="url(#ireWaveGlow)">
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * Math.PI / 6) + animPhase;
                    const baseRadius = 70;
                    const waveAmplitude = 15 + Math.sin(animPhase * 2 + i) * 8;
                    return (
                      <g key={i}>
                        {/* Wavy IR radiation lines */}
                        <path
                          d={`M ${100 + Math.cos(angle) * baseRadius} ${100 + Math.sin(angle) * baseRadius}
                              Q ${100 + Math.cos(angle) * (baseRadius + waveAmplitude)} ${100 + Math.sin(angle) * (baseRadius + waveAmplitude)}
                              ${100 + Math.cos(angle) * (baseRadius + waveAmplitude * 2)} ${100 + Math.sin(angle) * (baseRadius + waveAmplitude * 2)}`}
                          stroke={irColor}
                          strokeWidth="2"
                          fill="none"
                          opacity={0.4 + Math.sin(animPhase + i) * 0.2}
                        />
                        {/* Small heat particles */}
                        <circle
                          cx={100 + Math.cos(angle) * (baseRadius + waveAmplitude * 1.5 + Math.sin(animPhase * 3 + i) * 10)}
                          cy={100 + Math.sin(angle) * (baseRadius + waveAmplitude * 1.5 + Math.sin(animPhase * 3 + i) * 10)}
                          r="2"
                          fill={irColor}
                          opacity={0.6}
                        />
                      </g>
                    );
                  })}
                  {/* Central heat glow */}
                  <ellipse cx="100" cy="100" rx="45" ry="60" fill="url(#ireBodyHeat)" opacity="0.4" />
                </g>
              )}

              {/* Visible light details */}
              {!infrared && (
                <g>
                  <ellipse cx="85" cy="100" rx="8" ry="20" fill="rgba(255,255,255,0.15)" />
                  {/* Subtle lines for fingers */}
                  <line x1="75" y1="50" x2="75" y2="75" stroke="#c99a88" strokeWidth="0.5" opacity="0.5" />
                  <line x1="100" y1="45" x2="100" y2="72" stroke="#c99a88" strokeWidth="0.5" opacity="0.5" />
                  <line x1="125" y1="50" x2="125" y2="74" stroke="#c99a88" strokeWidth="0.5" opacity="0.5" />
                </g>
              )}
            </g>
          )}

          {(object === 'cup_matte' || object === 'cup_shiny') && (
            <g>
              {/* Cup body with premium gradients */}
              <g filter={infrared && props.emissivity > 0.5 ? 'url(#ireHeatGlow)' : undefined}>
                <path
                  d="M 55 45 L 65 175 L 135 175 L 145 45 Z"
                  fill={infrared ? irColor : (object === 'cup_shiny' ? 'url(#ireMetalSurface)' : 'url(#ireMatteBlack)')}
                  stroke={object === 'cup_shiny' ? '#e5e7eb' : 'none'}
                  strokeWidth="2"
                />
                {/* Cup rim */}
                <ellipse cx="100" cy="45" rx="45" ry="14"
                  fill={infrared ? irColor : (object === 'cup_shiny' ? '#9ca3af' : '#374151')}
                />
                {/* Cup handle */}
                <path
                  d="M 145 70 Q 185 85 185 120 Q 185 155 145 165"
                  fill="none"
                  stroke={infrared ? irColor : (object === 'cup_shiny' ? 'url(#ireMetalSurface)' : 'url(#ireMatteBlack)')}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </g>

              {/* Shiny cup reflections in visible mode */}
              {object === 'cup_shiny' && !infrared && (
                <g>
                  <ellipse cx="85" cy="100" rx="12" ry="35" fill="url(#ireReflection)" />
                  <ellipse cx="120" cy="90" rx="6" ry="20" fill="rgba(255,255,255,0.2)" />
                </g>
              )}

              {/* Steam/heat visualization in visible mode */}
              {!infrared && objectTemp > 40 && (
                <g opacity="0.5">
                  {[...Array(4)].map((_, i) => (
                    <path
                      key={i}
                      d={`M ${75 + i * 15} 35 Q ${78 + i * 15} ${20 - Math.sin(animPhase + i) * 8} ${75 + i * 15} ${5 - Math.sin(animPhase + i) * 5}`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  ))}
                </g>
              )}

              {/* IR radiation for high emissivity objects */}
              {infrared && props.emissivity > 0.5 && (
                <g filter="url(#ireWaveGlow)">
                  {[...Array(10)].map((_, i) => {
                    const angle = (i * Math.PI / 5) + animPhase;
                    const baseRadius = 60;
                    const waveAmplitude = 12 + Math.sin(animPhase * 2 + i) * 6;
                    return (
                      <path
                        key={i}
                        d={`M ${100 + Math.cos(angle) * baseRadius} ${110 + Math.sin(angle) * baseRadius * 0.8}
                            Q ${100 + Math.cos(angle) * (baseRadius + waveAmplitude)} ${110 + Math.sin(angle) * (baseRadius + waveAmplitude) * 0.8}
                            ${100 + Math.cos(angle) * (baseRadius + waveAmplitude * 2)} ${110 + Math.sin(angle) * (baseRadius + waveAmplitude * 2) * 0.8}`}
                        stroke={irColor}
                        strokeWidth="2"
                        fill="none"
                        opacity={0.5 + Math.sin(animPhase + i) * 0.2}
                      />
                    );
                  })}
                  {/* Heat glow overlay */}
                  <ellipse cx="100" cy="110" rx="50" ry="65" fill="url(#ireHeatRadiation)" opacity="0.3" />
                </g>
              )}

              {/* Low emissivity - show reflected environment */}
              {infrared && props.emissivity < 0.5 && (
                <g>
                  {/* Show reflected room temperature (cooler appearance) */}
                  <ellipse cx="100" cy="110" rx="35" ry="50" fill="url(#ireColdRadiation)" opacity="0.4" />
                  <text x="100" y="225" textAnchor="middle" className="text-xs" fill="#60a5fa" opacity="0.8">
                    Reflecting ~{ambientTemp}C environment
                  </text>
                </g>
              )}
            </g>
          )}

          {object === 'ice' && (
            <g>
              {/* Ice cube with crystal gradient */}
              <g filter={infrared ? 'url(#ireColdGlow)' : undefined}>
                <polygon
                  points="55,70 115,45 155,90 155,160 100,185 35,160 35,90"
                  fill={infrared ? irColor : 'url(#ireIceCrystal)'}
                  stroke={infrared ? 'none' : '#60a5fa'}
                  strokeWidth="2"
                />
                {/* Top face highlight */}
                <polygon
                  points="55,70 115,45 155,90 95,115"
                  fill={infrared ? irColor : '#e0f2fe'}
                  opacity="0.7"
                />
              </g>

              {/* Ice crystal patterns in visible mode */}
              {!infrared && (
                <g opacity="0.4">
                  <line x1="70" y1="100" x2="85" y2="140" stroke="#ffffff" strokeWidth="1" />
                  <line x1="110" y1="90" x2="125" y2="145" stroke="#ffffff" strokeWidth="1" />
                  <line x1="90" y1="110" x2="90" y2="155" stroke="#ffffff" strokeWidth="0.5" />
                  {/* Frost sparkles */}
                  {[...Array(5)].map((_, i) => (
                    <circle key={i} cx={60 + i * 20} cy={100 + (i % 3) * 25} r="2" fill="#ffffff" opacity={0.3 + Math.sin(animPhase + i) * 0.3} />
                  ))}
                </g>
              )}

              {/* Cold radiation visualization */}
              {infrared && (
                <g filter="url(#ireWaveGlow)">
                  {[...Array(6)].map((_, i) => {
                    const angle = (i * Math.PI / 3) + animPhase * 0.5;
                    return (
                      <circle
                        key={i}
                        cx={95 + Math.cos(angle) * (55 + Math.sin(animPhase + i) * 10)}
                        cy={115 + Math.sin(angle) * (55 + Math.sin(animPhase + i) * 10)}
                        r="3"
                        fill={irColor}
                        opacity={0.4 + Math.sin(animPhase + i) * 0.2}
                      />
                    );
                  })}
                  {/* Cold glow overlay */}
                  <ellipse cx="95" cy="115" rx="50" ry="60" fill="url(#ireColdRadiation)" opacity="0.3" />
                </g>
              )}
            </g>
          )}
        </g>

        {/* === INFORMATION PANEL === */}
        <g transform="translate(15, 260)">
          <rect x="0" y="0" width="410" height="55" rx="6" fill="#111827" stroke="#334155" strokeWidth="1" />

          {/* Temperature display */}
          <g transform="translate(15, 12)">
            <text className="text-xs font-bold" fill="#94a3b8">
              {infrared ? 'APPARENT TEMP' : 'ACTUAL TEMP'}
            </text>
            <text y="22" className="text-lg font-bold" fill={infrared ? '#f97316' : '#22d3ee'}>
              {infrared ? `${apparentTemp.toFixed(1)}` : `${props.actualTemp}`}C
            </text>
          </g>

          {/* Emissivity display */}
          <g transform="translate(130, 12)">
            <text className="text-xs font-bold" fill="#94a3b8">EMISSIVITY</text>
            <text y="22" className="text-lg font-bold" fill="#a855f7">
              e = {props.emissivity.toFixed(2)}
            </text>
          </g>

          {/* Status indicator */}
          <g transform="translate(240, 12)">
            <text className="text-xs font-bold" fill="#94a3b8">STATUS</text>
            <text y="22" className="text-sm font-medium" fill={props.emissivity > 0.5 ? '#10b981' : '#eab308'}>
              {props.emissivity > 0.5 ? 'High IR Emission' : 'Low Emission / Reflective'}
            </text>
          </g>

          {/* Warning for low emissivity */}
          {infrared && props.emissivity < 0.5 && (
            <g transform="translate(15, 42)">
              <text className="text-xs font-medium" fill="#fbbf24">
                Warning: Reading may not reflect true temperature
              </text>
            </g>
          )}
        </g>

        {/* === IR RADIATION WAVELENGTH INDICATOR === */}
        {infrared && (
          <g transform="translate(15, 45)">
            <rect x="0" y="0" width="70" height="40" rx="4" fill="#111827" stroke="#334155" strokeWidth="1" />
            <text x="35" y="15" textAnchor="middle" className="text-xs font-bold" fill="#94a3b8">IR BAND</text>
            <text x="35" y="32" textAnchor="middle" className="text-xs font-medium" fill="#f97316">8-14 um</text>
          </g>
        )}
      </svg>
    );
  };

  const renderTwistScene = (infrared: boolean) => {
    const matteIRColor = tempToIRColor(60, 0.95);
    const shinyIRColor = tempToIRColor(60, 0.1);
    const shinyApparent = 0.1 * 60 + 0.9 * ambientTemp;

    return (
      <svg viewBox="0 0 500 300" className="w-full h-56">
        {/* === COMPREHENSIVE DEFS SECTION === */}
        <defs>
          {/* Lab background gradient */}
          <linearGradient id="ireTwistLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a1628" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* IR view dark background */}
          <linearGradient id="ireTwistIRBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="50%" stopColor="#0c1222" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Hot radiation glow for matte cup */}
          <radialGradient id="ireTwistHotGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#dc2626" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>

          {/* Cold reflection for shiny cup */}
          <radialGradient id="ireTwistColdReflect" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#172554" stopOpacity="0" />
          </radialGradient>

          {/* Matte black surface gradient */}
          <linearGradient id="ireTwistMatte" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="30%" stopColor="#1f2937" />
            <stop offset="70%" stopColor="#111827" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Metallic surface gradient */}
          <linearGradient id="ireTwistMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="20%" stopColor="#d1d5db" />
            <stop offset="40%" stopColor="#e5e7eb" />
            <stop offset="60%" stopColor="#d1d5db" />
            <stop offset="80%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>

          {/* Heat wave glow filter */}
          <filter id="ireTwistWaveGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Heat emission glow */}
          <filter id="ireTwistHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Cold glow filter */}
          <filter id="ireTwistColdGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Reflection gradient */}
          <radialGradient id="ireTwistReflection" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Comparison temperature scale */}
          <linearGradient id="ireTwistTempScale" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="25%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="75%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* === BACKGROUND === */}
        <rect width="500" height="300" fill={infrared ? 'url(#ireTwistIRBg)' : 'url(#ireTwistLabBg)'} />

        {/* Grid pattern */}
        <pattern id="ireTwistGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
        </pattern>
        <rect width="500" height="300" fill="url(#ireTwistGrid)" />

        {/* === HEADER === */}
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="500" height="35" fill={infrared ? '#0f172a' : '#111827'} fillOpacity="0.9" />
          <text x="250" y="14" textAnchor="middle" className="text-xs font-bold" fill="#94a3b8">EMISSIVITY COMPARISON</text>
          <text x="250" y="28" textAnchor="middle" className="text-sm font-bold" fill={infrared ? '#f97316' : '#22d3ee'}>
            Both cups contain 60C hot water
          </text>
          {infrared && (
            <>
              <circle cx="25" cy="18" r="4" fill="#ef4444">
                <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
              </circle>
              <text x="38" y="22" className="text-xs font-medium" fill="#ef4444">IR</text>
            </>
          )}
        </g>

        {/* === MATTE BLACK CUP (LEFT) === */}
        <g transform="translate(50, 55)">
          {/* Cup body */}
          <g filter={infrared ? 'url(#ireTwistHeatGlow)' : undefined}>
            <path
              d="M 35 35 L 45 155 L 115 155 L 125 35 Z"
              fill={infrared ? matteIRColor : 'url(#ireTwistMatte)'}
            />
            <ellipse cx="80" cy="35" rx="45" ry="14"
              fill={infrared ? matteIRColor : '#374151'}
            />
            <path
              d="M 125 55 Q 165 70 165 100 Q 165 130 125 140"
              fill="none"
              stroke={infrared ? matteIRColor : 'url(#ireTwistMatte)'}
              strokeWidth="10"
              strokeLinecap="round"
            />
          </g>

          {/* Steam in visible mode */}
          {!infrared && (
            <g>
              {[...Array(4)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${60 + i * 15} 28 Q ${64 + i * 15} ${12 - Math.sin(animPhase + i) * 6} ${60 + i * 15} ${-5 - Math.sin(animPhase + i) * 5}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              ))}
            </g>
          )}

          {/* IR radiation waves for matte cup */}
          {infrared && (
            <g filter="url(#ireTwistWaveGlow)">
              {[...Array(8)].map((_, i) => {
                const angle = (i * Math.PI / 4) + animPhase;
                const baseRadius = 50;
                const waveAmplitude = 12 + Math.sin(animPhase * 2 + i) * 6;
                return (
                  <path
                    key={i}
                    d={`M ${80 + Math.cos(angle) * baseRadius} ${95 + Math.sin(angle) * baseRadius * 0.7}
                        Q ${80 + Math.cos(angle) * (baseRadius + waveAmplitude)} ${95 + Math.sin(angle) * (baseRadius + waveAmplitude) * 0.7}
                        ${80 + Math.cos(angle) * (baseRadius + waveAmplitude * 2)} ${95 + Math.sin(angle) * (baseRadius + waveAmplitude * 2) * 0.7}`}
                    stroke={matteIRColor}
                    strokeWidth="2"
                    fill="none"
                    opacity={0.5 + Math.sin(animPhase + i) * 0.2}
                  />
                );
              })}
              {/* Heat glow overlay */}
              <ellipse cx="80" cy="95" rx="45" ry="55" fill="url(#ireTwistHotGlow)" opacity="0.4" />
            </g>
          )}

          {/* Labels */}
          <rect x="25" y="170" width="110" height="40" rx="4" fill="#111827" stroke="#334155" strokeWidth="1" />
          <text x="80" y="187" textAnchor="middle" className="text-xs font-bold" fill="#e2e8f0">Matte Black</text>
          <text x="80" y="203" textAnchor="middle" className="text-xs font-medium" fill={infrared ? '#f97316' : '#a855f7'}>
            {infrared ? '~58C apparent' : 'Emissivity: 0.95'}
          </text>
        </g>

        {/* === POLISHED METAL CUP (RIGHT) === */}
        <g transform="translate(280, 55)">
          {/* Cup body */}
          <g filter={infrared ? 'url(#ireTwistColdGlow)' : undefined}>
            <path
              d="M 35 35 L 45 155 L 115 155 L 125 35 Z"
              fill={infrared ? shinyIRColor : 'url(#ireTwistMetal)'}
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            <ellipse cx="80" cy="35" rx="45" ry="14"
              fill={infrared ? shinyIRColor : '#9ca3af'}
            />
            <path
              d="M 125 55 Q 165 70 165 100 Q 165 130 125 140"
              fill="none"
              stroke={infrared ? shinyIRColor : 'url(#ireTwistMetal)'}
              strokeWidth="10"
              strokeLinecap="round"
            />
          </g>

          {/* Reflections in visible mode */}
          {!infrared && (
            <g>
              <ellipse cx="65" cy="90" rx="10" ry="30" fill="url(#ireTwistReflection)" />
              <ellipse cx="100" cy="80" rx="5" ry="18" fill="rgba(255,255,255,0.2)" />
            </g>
          )}

          {/* Steam in visible mode */}
          {!infrared && (
            <g>
              {[...Array(4)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${60 + i * 15} 28 Q ${64 + i * 15} ${12 - Math.sin(animPhase + i) * 6} ${60 + i * 15} ${-5 - Math.sin(animPhase + i) * 5}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              ))}
            </g>
          )}

          {/* Cold reflection visualization in IR mode */}
          {infrared && (
            <g>
              {/* Show it's reflecting the cold room */}
              <ellipse cx="80" cy="95" rx="40" ry="50" fill="url(#ireTwistColdReflect)" opacity="0.5" />
              {/* Reflection arrows showing environment */}
              {[...Array(5)].map((_, i) => {
                const angle = (i * Math.PI / 2.5) - Math.PI / 2;
                return (
                  <line
                    key={i}
                    x1={80 + Math.cos(angle) * 60}
                    y1={95 + Math.sin(angle) * 45}
                    x2={80 + Math.cos(angle) * 45}
                    y2={95 + Math.sin(angle) * 35}
                    stroke="#60a5fa"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    opacity={0.4 + Math.sin(animPhase + i) * 0.2}
                  />
                );
              })}
            </g>
          )}

          {/* Labels */}
          <rect x="25" y="170" width="110" height="40" rx="4" fill="#111827" stroke="#334155" strokeWidth="1" />
          <text x="80" y="187" textAnchor="middle" className="text-xs font-bold" fill="#e2e8f0">Polished Metal</text>
          <text x="80" y="203" textAnchor="middle" className="text-xs font-medium" fill={infrared ? '#60a5fa' : '#a855f7'}>
            {infrared ? `~${shinyApparent.toFixed(0)}C apparent` : 'Emissivity: 0.10'}
          </text>
        </g>

        {/* === COMPARISON INDICATOR === */}
        {infrared && (
          <g transform="translate(215, 100)">
            <text x="35" y="0" textAnchor="middle" className="text-2xl font-bold" fill="#fbbf24">VS</text>
            {/* Arrow showing temperature difference */}
            <path d="M 15 20 L 55 20" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2" />
          </g>
        )}

        {/* === BOTTOM EXPLANATION PANEL === */}
        <g transform="translate(15, 255)">
          <rect x="0" y="0" width="470" height="40" rx="6" fill="#111827" stroke={infrared ? '#f97316' : '#334155'} strokeWidth="1" />
          {infrared ? (
            <g>
              <text x="235" y="17" textAnchor="middle" className="text-xs font-bold" fill="#fbbf24">
                SAME ACTUAL TEMPERATURE - DIFFERENT IR READINGS!
              </text>
              <text x="235" y="32" textAnchor="middle" className="text-xs" fill="#94a3b8">
                Shiny surface reflects the cold room (~{ambientTemp}C) instead of emitting its true 60C
              </text>
            </g>
          ) : (
            <g>
              <text x="235" y="17" textAnchor="middle" className="text-xs font-bold" fill="#22d3ee">
                Both cups at 60C - Steam rising from both
              </text>
              <text x="235" y="32" textAnchor="middle" className="text-xs" fill="#94a3b8">
                Switch to IR view to see how emissivity affects thermal camera readings
              </text>
            </g>
          )}
        </g>

        {/* === MINI TEMPERATURE SCALE (IR mode only) === */}
        {infrared && (
          <g transform="translate(460, 50)">
            <rect x="-5" y="-5" width="35" height="145" rx="3" fill="#111827" stroke="#334155" strokeWidth="1" />
            <rect x="3" y="5" width="12" height="115" rx="2" fill="url(#ireTwistTempScale)" />
            <text x="20" y="15" className="text-xs" fill="#fca5a5">60C</text>
            <text x="20" y="65" className="text-xs" fill="#67e8f9">30C</text>
            <text x="20" y="115" className="text-xs" fill="#818cf8">0C</text>
          </g>
        )}
      </svg>
    );
  };

  const handlePrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(pred);
    playSound(pred === 'temp' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(pred);
    playSound(pred === 'shiny_cold' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    const currentQuestion = testAnswers.length;
    playSound(TEST_QUESTIONS[currentQuestion].options[answerIndex].correct ? 'success' : 'failure');
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

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        The Invisible Heat Vision
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how thermal cameras reveal hidden temperatures
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🌡️📷</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Thermal cameras can &quot;see&quot; heat! Every warm object glows with invisible
              <span className="text-orange-400 font-semibold"> infrared light</span>.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But here&apos;s a trick: some hot objects appear <span className="text-blue-400 font-semibold">cold</span> on thermal cameras!
            </p>
            <div className="pt-2">
              <p className="text-base text-orange-400 font-semibold">
                How can a hot cup appear cold on a thermal camera?
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
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
          You point a thermal camera at your hand. What determines how bright it appears on the camera?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'color', text: 'The color of your skin (darker = more heat)', icon: '🎨' },
          { id: 'temp', text: 'Your body temperature creates infrared radiation', icon: '🌡️' },
          { id: 'motion', text: 'How fast you move your hand', icon: '👋' },
          { id: 'light', text: 'How much visible light is hitting your hand', icon: '💡' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={prediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? option.id === 'temp' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : prediction !== null && option.id === 'temp'
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
            {prediction === 'temp' ? 'Correct!' : 'Not quite.'} Your body temperature creates infrared radiation!
          </p>
          <button
            onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
          >
            Test It!
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Experiment: Thermal Imaging</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderIRScene(selectedObject, viewMode === 'infrared')}
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-4">
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Object:</label>
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value as typeof selectedObject)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
          >
            <option value="hand">Human Hand (37C)</option>
            <option value="cup_matte">Matte Black Cup</option>
            <option value="cup_shiny">Shiny Metal Cup</option>
            <option value="ice">Ice Cube (0C)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-gray-400 text-sm">View Mode:</label>
          <button
            onPointerDown={(e) => { e.preventDefault(); playSound('click'); setViewMode(viewMode === 'visible' ? 'infrared' : 'visible'); }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'infrared'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {viewMode === 'infrared' ? '📷 IR Camera' : '👁️ Normal View'}
          </button>
        </div>
      </div>

      {(selectedObject === 'cup_matte' || selectedObject === 'cup_shiny') && (
        <div className="max-w-lg w-full mb-4">
          <label className="text-gray-400 text-sm">Cup Temperature: {objectTemp}C</label>
          <input
            type="range"
            min="20"
            max="80"
            value={objectTemp}
            onChange={(e) => setObjectTemp(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
        </div>
      )}

      {viewMode === 'infrared' && (
        <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-orange-300 text-sm">
            <strong>Thermal imaging:</strong> All warm objects emit IR radiation. The camera detects this and
            creates a false-color image showing temperature differences.
            Emissivity (e) = how well a surface emits IR compared to a perfect &quot;blackbody&quot;.
          </p>
        </div>
      )}

      <button
        onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
      >
        Continue
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">How Thermal Imaging Works</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Thermal Motion</h3>
              <p className="text-gray-400 text-sm">All matter above absolute zero has vibrating molecules</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">IR Emission</h3>
              <p className="text-gray-400 text-sm">These vibrations emit electromagnetic radiation (infrared)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Camera Detection</h3>
              <p className="text-gray-400 text-sm">IR sensors measure the radiation and map it to colors</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-orange-900/30 rounded-xl p-4 max-w-lg w-full mb-6 text-center">
        <p className="text-orange-300 font-semibold">Stefan-Boltzmann Law</p>
        <p className="text-gray-400 text-sm mt-1">
          Power radiated = e * sigma * A * T^4<br />
          Hotter objects radiate exponentially more IR!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-orange-400 font-semibold">{prediction === 'temp' ? 'Correct!' : 'Not quite'}</span></p>
        <button
          onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
        >
          But wait...
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-red-400 mb-6">🔄 The Twist!</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          You fill TWO cups with the same 60C hot water. One is <span className="text-gray-400">matte black</span>,
          one is <span className="text-gray-300">polished metal</span>. On the thermal camera:
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'same', text: 'Both appear the same temperature (60C)', icon: '=' },
          { id: 'shiny_cold', text: 'Shiny cup appears COOLER than the matte cup', icon: '❄️' },
          { id: 'shiny_hot', text: 'Shiny cup appears HOTTER (metal conducts better)', icon: '🔥' },
          { id: 'invisible', text: 'Shiny cup is invisible to IR cameras', icon: '👻' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? option.id === 'shiny_cold' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : twistPrediction !== null && option.id === 'shiny_cold'
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
            {twistPrediction === 'shiny_cold' ? 'Correct!' : 'Not quite.'} Low emissivity surfaces reflect surroundings!
          </p>
          <button
            onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Test It!
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-red-400 mb-4">The Emissivity Trick</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderTwistScene(twistViewMode === 'infrared')}
      </div>

      <div className="flex justify-center gap-4 mb-4">
        <button
          onPointerDown={(e) => { e.preventDefault(); playSound('click'); setTwistViewMode('visible'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            twistViewMode === 'visible'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          👁️ Normal View
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); playSound('click'); setTwistViewMode('infrared'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            twistViewMode === 'infrared'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          📷 IR Camera
        </button>
      </div>

      {twistViewMode === 'infrared' && (
        <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-red-300 text-sm text-center">
            <strong>Low emissivity = reflects surroundings!</strong><br />
            The shiny cup reflects the cold room (~22C) instead of emitting its own 60C IR.
          </p>
        </div>
      )}

      <button
        onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
        className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-pink-500 transition-all"
      >
        Continue
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-red-400 mb-6">Emissivity Explained</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <p className="text-gray-300 text-center mb-4">
          <span className="text-orange-400 font-semibold">Emissivity (e)</span> is the ratio of IR emitted vs a perfect &quot;blackbody&quot;
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-orange-400 font-semibold">High Emissivity (e = 1)</div>
            <div className="text-gray-500">Skin, matte paint, paper</div>
            <div className="text-gray-400 text-xs mt-1">Emits true temperature</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Low Emissivity (e = 0.1)</div>
            <div className="text-gray-500">Polished metal, mirrors</div>
            <div className="text-gray-400 text-xs mt-1">Reflects surroundings</div>
          </div>
        </div>

        <p className="text-yellow-300 text-sm mt-4 text-center">
          💡 Pro tip: Put electrical tape (e=0.95) on shiny surfaces for accurate readings!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-red-400 font-semibold">{twistPrediction === 'shiny_cold' ? 'Correct!' : 'Not quite'}</span></p>
        <button
          onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-pink-500 transition-all"
        >
          See Applications
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
            onPointerDown={(e) => { e.preventDefault(); handleAppComplete(index); }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-orange-500 bg-orange-900/30'
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
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-orange-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
        >
          Take the Quiz
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
          <div className="text-6xl mb-4">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-gray-300 mb-6">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              if (score >= 3) {
                playSound('complete');
                onCorrectAnswer?.();
                onPhaseComplete?.();
              } else {
                setTestAnswers([]);
                setShowTestResults(false);
                onIncorrectAnswer?.();
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
          >
            {score >= 3 ? 'Complete!' : 'Review & Try Again'}
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
              onPointerDown={(e) => { e.preventDefault(); handleTestAnswer(i); }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-orange-500 transition-all text-left text-gray-200"
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
      <div className="bg-gradient-to-br from-orange-900/50 via-red-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-4">Thermal Imaging Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered the physics of infrared imaging!</p>
        <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-xl p-6 mb-6">
          <p className="text-orange-300 font-medium mb-4">You now understand:</p>
          <ul className="text-gray-300 text-sm space-y-2 text-left">
            <li>All warm objects emit infrared radiation</li>
            <li>Emissivity determines how much IR a surface emits</li>
            <li>Shiny surfaces reflect surroundings, appearing cooler</li>
            <li>Real-world thermal imaging applications</li>
          </ul>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Next time you see thermal footage, you&apos;ll know the physics behind it!
        </p>
        <button
          onPointerDown={(e) => { e.preventDefault(); onPhaseComplete?.(); }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          Complete
        </button>
      </div>
    </div>
  );

  // Scenario-based test questions for comprehensive assessment
  const testQuestions = [
    {
      scenario: "You're learning about thermal radiation in physics class. Your teacher asks you to define a key property of surfaces.",
      question: "What is emissivity?",
      options: [
        { id: 'a', label: "The temperature at which an object starts to glow visibly", correct: false },
        { id: 'b', label: "A measure of how efficiently a surface emits thermal radiation compared to an ideal blackbody", correct: true },
        { id: 'c', label: "The amount of heat an object can absorb before melting", correct: false },
        { id: 'd', label: "The color of an object when viewed under infrared light", correct: false }
      ],
      explanation: "Emissivity is a dimensionless ratio (0 to 1) comparing how much thermal radiation a real surface emits versus a perfect blackbody at the same temperature. A blackbody has emissivity of 1.0, while polished metals can have emissivity as low as 0.02."
    },
    {
      scenario: "A building inspector uses a thermal camera to check a warehouse for heat leaks. She points the camera at two pipes carrying hot steam at 150°C - one is painted matte black, the other is bare polished copper.",
      question: "What will the thermal camera display show?",
      options: [
        { id: 'a', label: "Both pipes appear at 150°C since they contain the same temperature steam", correct: false },
        { id: 'b', label: "The copper pipe appears hotter because metal conducts heat better", correct: false },
        { id: 'c', label: "The matte black pipe appears much hotter than the copper pipe despite identical actual temperatures", correct: true },
        { id: 'd', label: "Neither pipe is visible because steam blocks infrared radiation", correct: false }
      ],
      explanation: "The matte black pipe has high emissivity (~0.95) and emits IR radiation efficiently, showing close to its true temperature. The polished copper has very low emissivity (~0.03) and mostly reflects the cooler surroundings, appearing much colder than its actual temperature on the thermal camera."
    },
    {
      scenario: "An engineer is designing a cooling system and needs to maximize heat dissipation from a metal heat sink. She's considering different surface treatments.",
      question: "Why does a matte black surface radiate heat more effectively than a shiny metallic surface at the same temperature?",
      options: [
        { id: 'a', label: "Black surfaces absorb more light and therefore must release more heat", correct: false },
        { id: 'b', label: "Matte black has high emissivity, allowing it to convert thermal energy into infrared radiation more efficiently", correct: true },
        { id: 'c', label: "Shiny surfaces are better conductors so they keep heat inside", correct: false },
        { id: 'd', label: "The black paint adds extra thermal mass that stores more heat", correct: false }
      ],
      explanation: "High emissivity surfaces like matte black (ε ≈ 0.95) efficiently convert thermal energy into electromagnetic radiation. Shiny metals have low emissivity (ε ≈ 0.05-0.1) and reflect rather than emit IR. By Kirchhoff's law, good absorbers are good emitters - the black surface both absorbs and emits radiation well."
    },
    {
      scenario: "An architect is specifying windows for an energy-efficient office building in a hot climate. The glass manufacturer offers standard glass and 'low-e' coated glass options.",
      question: "How do low-emissivity (low-e) window coatings help reduce energy costs?",
      options: [
        { id: 'a', label: "They block visible light to keep rooms darker and cooler", correct: false },
        { id: 'b', label: "They reflect infrared radiation, reducing heat transfer through the glass while allowing visible light to pass", correct: true },
        { id: 'c', label: "They absorb UV rays and convert them to electricity", correct: false },
        { id: 'd', label: "They make windows thicker to provide better insulation", correct: false }
      ],
      explanation: "Low-e coatings are thin metallic or metallic oxide layers that have low emissivity for infrared radiation but high transmissivity for visible light. They reflect thermal radiation back toward its source - keeping heat inside during winter and outside during summer - while still allowing natural daylight to enter."
    },
    {
      scenario: "A maintenance technician is using a handheld infrared thermometer to check motor bearing temperatures. The motor housing is unpainted aluminum with a shiny surface. The display reads 45°C but she suspects the reading is wrong.",
      question: "What should the technician do to get an accurate temperature reading?",
      options: [
        { id: 'a', label: "Move closer to the surface to reduce atmospheric interference", correct: false },
        { id: 'b', label: "Wait for the motor to cool down before taking measurements", correct: false },
        { id: 'c', label: "Apply a piece of high-emissivity tape or adjust the emissivity setting on the thermometer to match the surface", correct: true },
        { id: 'd', label: "Use a higher-powered infrared thermometer with a stronger laser", correct: false }
      ],
      explanation: "Low-emissivity surfaces like polished aluminum (ε ≈ 0.05) give inaccurate IR readings because they reflect ambient temperature rather than emit their own. The solution is to either apply high-emissivity tape/paint to create a known emissivity surface, or adjust the thermometer's emissivity setting. The laser in IR thermometers is only for aiming - it doesn't affect measurements."
    },
    {
      scenario: "A hiker gets lost in cold mountains. Search and rescue teaches that emergency space blankets (thin reflective Mylar) can be life-saving. The blanket has a shiny silver side and a colored side.",
      question: "Why are emergency space blankets effective at preventing hypothermia?",
      options: [
        { id: 'a', label: "The shiny material generates heat through a chemical reaction with air", correct: false },
        { id: 'b', label: "The low-emissivity reflective surface reflects the body's infrared radiation back, reducing radiative heat loss", correct: true },
        { id: 'c', label: "The blanket blocks wind, which is the only significant source of heat loss", correct: false },
        { id: 'd', label: "The material absorbs moisture from the air to keep the person dry", correct: false }
      ],
      explanation: "Space blankets work primarily by reflecting infrared radiation. The human body constantly emits IR radiation (we lose ~40% of body heat this way). The low-emissivity metallic coating (ε ≈ 0.05) reflects up to 97% of radiated body heat back toward the person, dramatically reducing radiative heat loss in cold environments."
    },
    {
      scenario: "A metallurgist needs to monitor the temperature of molten steel at 1500°C using a non-contact optical pyrometer. The steel surface is oxidized with a layer of slag.",
      question: "Why must the pyrometer be calibrated for the specific emissivity of the target surface?",
      options: [
        { id: 'a', label: "Different metals have different melting points that affect the reading", correct: false },
        { id: 'b', label: "The pyrometer calculates temperature from detected IR intensity, which depends on both temperature and emissivity", correct: true },
        { id: 'c', label: "Higher emissivity materials conduct heat faster to the sensor", correct: false },
        { id: 'd', label: "Emissivity only matters for temperatures below 500°C", correct: false }
      ],
      explanation: "Pyrometers measure infrared radiation intensity and use the Stefan-Boltzmann law (P = εσAT⁴) to calculate temperature. Since detected radiation depends on BOTH temperature AND emissivity, an incorrect emissivity setting causes systematic temperature errors. Molten steel with slag (ε ≈ 0.9) vs clean molten steel (ε ≈ 0.4) would give drastically different readings at the same actual temperature."
    },
    {
      scenario: "A building energy auditor is using thermal imaging to inspect a commercial building's exterior walls on a cold winter night. She notices that some wall sections appear warmer than others in the IR image.",
      question: "What could cause different apparent temperatures on the building exterior?",
      options: [
        { id: 'a', label: "Warm spots always indicate missing insulation or thermal bridges allowing heat to escape", correct: false },
        { id: 'b', label: "Heat leaks, different surface materials with varying emissivities, or reflected thermal radiation from nearby sources", correct: true },
        { id: 'c', label: "The thermal camera is malfunctioning due to cold weather", correct: false },
        { id: 'd', label: "Differences in paint color affect how the building absorbs solar heat", correct: false }
      ],
      explanation: "Apparent temperature variations can have multiple causes: actual heat loss through poor insulation, different surface materials (glass, metal trim, brick) with different emissivities showing different apparent temperatures, or reflections of thermal radiation from nearby warm objects. A skilled thermographer must consider all factors - checking material emissivities and scanning for reflection sources before concluding heat loss."
    },
    {
      scenario: "NASA engineers are designing the thermal control system for a Mars rover. The rover experiences extreme temperature swings from -125°C at night to +20°C during the day.",
      question: "How might engineers use emissivity to manage the rover's temperature?",
      options: [
        { id: 'a', label: "Paint everything white to reflect sunlight and keep cool", correct: false },
        { id: 'b', label: "Use selective surfaces with low IR emissivity to reduce radiative heat loss at night and high solar reflectivity to prevent overheating during the day", correct: true },
        { id: 'c', label: "Cover the rover in high-emissivity black coating to maximize heat absorption", correct: false },
        { id: 'd', label: "Emissivity doesn't matter in space because there's no air to conduct heat", correct: false }
      ],
      explanation: "Spacecraft thermal control uses selective surfaces with carefully chosen optical properties. Multi-layer insulation (MLI) with low-emissivity metallic layers reduces radiative heat loss to cold space. Surfaces can be engineered with different properties for different wavelengths - high solar reflectivity to reject sunlight while having specific IR emissivity to manage thermal radiation exchange."
    },
    {
      scenario: "A quality control engineer monitors steel parts during heat treatment. The parts must reach exactly 850°C for proper hardening. Some parts have oxide scale while others are freshly machined with shiny surfaces.",
      question: "What challenge does varying surface condition create for non-contact temperature measurement during heat treatment?",
      options: [
        { id: 'a', label: "Shiny parts heat up faster than oxidized parts due to better heat conduction", correct: false },
        { id: 'b', label: "Parts with different emissivities will show different apparent temperatures even at the same actual temperature, requiring compensation or consistent surface preparation", correct: true },
        { id: 'c', label: "Oxide scale blocks all infrared radiation so those parts cannot be measured", correct: false },
        { id: 'd', label: "The magnetic properties of steel change with temperature, interfering with IR sensors", correct: false }
      ],
      explanation: "Oxidized steel (ε ≈ 0.8-0.9) and bright machined steel (ε ≈ 0.3-0.4) have very different emissivities. At 850°C actual temperature, a pyrometer calibrated for ε = 0.85 would read ~850°C for oxidized parts but might show only ~700°C for shiny parts. Solutions include using blackbody cavities, consistent surface preparation, or multi-wavelength pyrometers that can compensate for unknown emissivity."
    }
  ];

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
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      <div className="relative pt-8 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default InfraredEmissivityRenderer;
