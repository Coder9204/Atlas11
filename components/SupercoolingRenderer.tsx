'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// SUPERCOOLING RENDERER - Game 139
// Physics: Water below freezing that stays liquid without nucleation sites
// Metastable liquid region on phase diagram, instant freezing upon seeding
// ============================================================================

interface SupercoolingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const realWorldApps = [
  {
    icon: '🩸',
    title: 'Organ Preservation',
    short: 'Supercooling for transplant medicine',
    tagline: 'Life-saving cold without ice',
    description: 'Donor organs can be preserved longer using supercooling than traditional ice storage. By keeping tissue below freezing without ice crystal formation, cells remain viable for transplantation.',
    connection: 'Supercooling prevents the ice crystal damage that occurs during conventional freezing. The metastable liquid state preserves cell structure while slowing metabolic decay.',
    howItWorks: 'Organs are cooled in specialized solutions that suppress nucleation. Precise temperature control maintains the supercooled state. Antifreeze proteins from arctic fish further prevent ice formation.',
    stats: [
      { value: '27hr', label: 'Liver preservation (3x longer)', icon: '⏰' },
      { value: '-6°C', label: 'Supercooling temperature', icon: '❄️' },
      { value: '30%', label: 'More viable organs', icon: '📈' }
    ],
    examples: ['Liver transplants', 'Heart preservation', 'Kidney banking', 'Limb reattachment'],
    companies: ['OrganOx', 'TransMedics', 'Paragonix', 'Harvard MGH Research'],
    futureImpact: 'Reliable supercooling will enable organ banking and shipping worldwide, dramatically reducing the 17 people who die daily waiting for transplants in the US alone.',
    color: '#ef4444'
  },
  {
    icon: '🔥',
    title: 'Hand Warmers',
    short: 'Instant heat from supersaturated solutions',
    tagline: 'Click and feel the warmth',
    description: 'Reusable hand warmers use supersaturated sodium acetate that crystallizes instantly when triggered, releasing heat. The supercooled solution can be reset by boiling.',
    connection: 'Sodium acetate solutions can be supercooled far below their melting point. Mechanical activation provides nucleation sites, triggering rapid crystallization and exothermic heat release.',
    howItWorks: 'Supersaturated solution is prepared by dissolving excess salt in hot water. A metal disc click provides nucleation. Crystallization releases latent heat. Boiling re-dissolves crystals to reset.',
    stats: [
      { value: '54°C', label: 'Operating temperature', icon: '🌡️' },
      { value: '2hr', label: 'Heat duration', icon: '⏰' },
      { value: '500+', label: 'Reuse cycles', icon: '🔄' }
    ],
    examples: ['Hand warmers', 'Hot packs for therapy', 'Food warming pads', 'Heat storage systems'],
    companies: ['HotSnapz', 'Hothands (disposable)', 'Zippo', 'Various consumer brands'],
    futureImpact: 'Phase change materials using controlled supercooling will enable on-demand thermal energy storage for buildings and vehicles.',
    color: '#f59e0b'
  },
  {
    icon: '☁️',
    title: 'Cloud Seeding',
    short: 'Making rain from supercooled clouds',
    tagline: 'Engineering weather with nucleation',
    description: 'Cloud seeding introduces nucleation particles into supercooled clouds to trigger precipitation. Silver iodide crystals mimic ice structure, catalyzing the transition from supercooled droplets to snow.',
    connection: 'Clouds can contain water droplets supercooled to -40°C. Adding nucleation sites triggers rapid ice crystal formation, which grow and fall as precipitation.',
    howItWorks: 'Aircraft or ground generators release silver iodide smoke into clouds. The hexagonal crystal structure matches ice, providing perfect nucleation sites. Ice crystals grow at the expense of supercooled droplets.',
    stats: [
      { value: '10-15%', label: 'Precipitation increase', icon: '🌧️' },
      { value: '-5°C', label: 'Minimum cloud temp', icon: '❄️' },
      { value: '60yr', label: 'Technology history', icon: '📅' }
    ],
    examples: ['Drought mitigation', 'Snowpack enhancement', 'Hail suppression', 'Fog dispersal'],
    companies: ['Weather Modification Inc.', 'North American Weather Consultants', 'Snowy Hydro', 'China Weather Bureau'],
    futureImpact: 'Climate adaptation will rely on controlled precipitation to manage water resources, with AI-optimized seeding operations maximizing effectiveness.',
    color: '#3b82f6'
  },
  {
    icon: '🍦',
    title: 'Food Science',
    short: 'Texture through controlled crystallization',
    tagline: 'The science of smooth ice cream',
    description: 'Premium ice cream stays smooth because small ice crystals form during rapid freezing. Supercooling control and added stabilizers prevent the large crystals that create icy texture.',
    connection: 'Ice cream quality depends on preventing nucleation during storage temperature fluctuations. Supercooling and controlled crystallization keep crystals small for creamy texture.',
    howItWorks: 'Flash freezing creates many small nucleation sites. Stabilizers like guar gum slow crystal growth. Sugar and fat lower the freezing point. Storage temperature cycling must be minimized.',
    stats: [
      { value: '<50um', label: 'Ideal crystal size', icon: '🔬' },
      { value: '-18°C', label: 'Storage temperature', icon: '❄️' },
      { value: '35%', label: 'Overrun (air content)', icon: '💨' }
    ],
    examples: ['Premium ice cream', 'Frozen desserts', 'Sorbet production', 'Frozen yogurt'],
    companies: ['Haagen-Dazs', 'Ben & Jerrys', 'Unilever', 'Nestle'],
    futureImpact: 'Novel freezing techniques and plant-based stabilizers will enable lactose-free and vegan frozen desserts with traditional texture and mouthfeel.',
    color: '#8b5cf6'
  }
];

const SupercoolingRenderer: React.FC<SupercoolingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);

  // Game-specific state
  const [temperature, setTemperature] = useState(20);
  const [waterState, setWaterState] = useState<'liquid' | 'supercooled' | 'crystallizing' | 'frozen'>('liquid');
  const [crystalProgress, setCrystalProgress] = useState(0);
  const [seedAdded, setSeedAdded] = useState(false);
  const [seedPosition, setSeedPosition] = useState({ x: 150, y: 100 });
  const [crystalPoints, setCrystalPoints] = useState<{ x: number; y: number; size: number; id: number }[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const crystalIdRef = useRef(0);

  // Twist state - sodium acetate hand warmer
  const [twistState, setTwistState] = useState<'solution' | 'triggered' | 'crystallized'>('solution');
  const [twistTemp, setTwistTemp] = useState(25);
  const [twistCrystalProgress, setTwistCrystalProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const lastClickRef = useRef(0);

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

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'freeze') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (type === 'freeze') {
        // Crackling freeze sound
        const bufferSize = audioContext.sampleRate * 0.5;
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.3) * 0.4;
        }
        const noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        noise.connect(filter);
        filter.connect(audioContext.destination);
        noise.start();
        return;
      }

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
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Crystallization effect when seed is added
  useEffect(() => {
    if (waterState !== 'crystallizing') return;

    const interval = setInterval(() => {
      setCrystalProgress(prev => {
        if (prev >= 100) {
          setWaterState('frozen');
          return 100;
        }
        return prev + 3;
      });

      // Add crystal points spreading from seed
      if (crystalProgress < 100) {
        const angle = Math.random() * Math.PI * 2;
        const distance = crystalProgress * 1.5 + Math.random() * 20;
        setCrystalPoints(prev => [
          ...prev.slice(-100),
          {
            x: seedPosition.x + Math.cos(angle) * distance,
            y: seedPosition.y + Math.sin(angle) * distance,
            size: 3 + Math.random() * 6,
            id: crystalIdRef.current++
          }
        ]);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [waterState, crystalProgress, seedPosition]);

  // Twist crystallization effect
  useEffect(() => {
    if (twistState !== 'triggered') return;

    const interval = setInterval(() => {
      setTwistCrystalProgress(prev => {
        if (prev >= 100) {
          setTwistState('crystallized');
          return 100;
        }
        return prev + 2;
      });

      // Heat release during crystallization
      setTwistTemp(prev => Math.min(54, prev + 0.5));
    }, 100);

    return () => clearInterval(interval);
  }, [twistState, twistCrystalProgress]);

  // Temperature change handler
  const handleTemperatureChange = useCallback((newTemp: number) => {
    setTemperature(newTemp);

    if (newTemp < 0 && waterState === 'liquid') {
      setWaterState('supercooled');
    } else if (newTemp >= 0 && (waterState === 'supercooled')) {
      setWaterState('liquid');
    }
  }, [waterState]);

  // Add nucleation seed
  const addSeed = useCallback(() => {
    if (waterState !== 'supercooled') return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    setSeedAdded(true);
    setSeedPosition({ x: 150, y: 100 });
    playSound('freeze');

    setTimeout(() => {
      setWaterState('crystallizing');
      setCrystalProgress(0);
      setCrystalPoints([]);
    }, 300);
  }, [waterState, playSound]);

  // Reset experiment
  const resetExperiment = useCallback(() => {
    setTemperature(20);
    setWaterState('liquid');
    setCrystalProgress(0);
    setSeedAdded(false);
    setCrystalPoints([]);
    playSound('click');
  }, [playSound]);

  // Reset twist
  const resetTwist = useCallback(() => {
    setTwistState('solution');
    setTwistTemp(25);
    setTwistCrystalProgress(0);
    playSound('click');
  }, [playSound]);

  // Trigger twist crystallization
  const triggerTwist = useCallback(() => {
    if (twistState !== 'solution') return;
    setTwistState('triggered');
    playSound('freeze');
  }, [twistState, playSound]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    if (prediction === 'C') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    if (prediction === 'B') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  // Get water color based on state
  const getWaterColor = (state: string): string => {
    switch (state) {
      case 'liquid': return '#3b82f6';
      case 'supercooled': return '#06b6d4';
      case 'crystallizing': return '#60a5fa';
      case 'frozen': return '#e0f2fe';
      default: return '#3b82f6';
    }
  };

  const testQuestions = [
    { question: "What is supercooling?", options: [
      { text: "Extremely cold freezing", correct: false },
      { text: "A liquid cooled below its freezing point without solidifying", correct: true },
      { text: "Rapid cooling process", correct: false },
      { text: "Cooling with superconductors", correct: false }
    ]},
    { question: "Why can water stay liquid below 0C?", options: [
      { text: "It's a different type of water", correct: false },
      { text: "Without nucleation sites, ice crystals can't form", correct: true },
      { text: "Water doesn't freeze at 0C", correct: false },
      { text: "The thermometer is wrong", correct: false }
    ]},
    { question: "What triggers instant freezing in supercooled water?", options: [
      { text: "More cooling", correct: false },
      { text: "Adding salt", correct: false },
      { text: "A nucleation site (like a seed crystal or impurity)", correct: true },
      { text: "Shaking violently", correct: false }
    ]},
    { question: "The freezing point on a phase diagram represents:", options: [
      { text: "The coldest a liquid can get", correct: false },
      { text: "Temperature where solid and liquid phases are in equilibrium", correct: true },
      { text: "When water becomes a gas", correct: false },
      { text: "Maximum supercooling", correct: false }
    ]},
    { question: "A 'metastable' state means:", options: [
      { text: "Completely stable", correct: false },
      { text: "Temporarily stable but can change with a small trigger", correct: true },
      { text: "Completely unstable", correct: false },
      { text: "Cannot change state", correct: false }
    ]},
    { question: "When supercooled water freezes, it releases:", options: [
      { text: "Energy (latent heat)", correct: true },
      { text: "Bubbles", correct: false },
      { text: "Sound waves only", correct: false },
      { text: "Nothing", correct: false }
    ]},
    { question: "Supercooled water is most likely to freeze spontaneously:", options: [
      { text: "At exactly 0C", correct: false },
      { text: "At around -40C (homogeneous nucleation limit)", correct: true },
      { text: "At any temperature below 0C", correct: false },
      { text: "Never without a seed", correct: false }
    ]},
    { question: "Which of these would trigger nucleation?", options: [
      { text: "Adding more water", correct: false },
      { text: "Heating the water", correct: false },
      { text: "Tapping the container or adding an ice crystal", correct: true },
      { text: "Covering the container", correct: false }
    ]},
    { question: "In nature, supercooled clouds produce:", options: [
      { text: "Normal rain", correct: false },
      { text: "Freezing rain and ice storms", correct: true },
      { text: "Only snow", correct: false },
      { text: "No precipitation", correct: false }
    ]},
    { question: "Reusable hand warmers using sodium acetate exploit:", options: [
      { text: "Chemical combustion", correct: false },
      { text: "Supercooling and triggered crystallization", correct: true },
      { text: "Nuclear reactions", correct: false },
      { text: "Electric heating", correct: false }
    ]}
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => {
    if (answer !== null && testQuestions[index].options[answer].correct) {
      return score + 1;
    }
    return score;
  }, 0);

  const applications = [
    {
      title: "Ice Cream Making",
      icon: "🍦",
      description: "Premium ice cream uses supercooling to create smaller ice crystals, resulting in smoother texture. Rapid freezing with liquid nitrogen achieves extreme supercooling.",
      details: "The faster the freezing, the smaller the crystals. Artisanal ice cream makers manipulate this for texture control."
    },
    {
      title: "Weather & Aviation",
      icon: "✈️",
      description: "Supercooled water droplets in clouds cause dangerous aircraft icing. When disturbed by aircraft wings, they freeze instantly.",
      details: "Aircraft de-icing systems are critical because supercooled droplets can freeze on contact with cold surfaces, adding dangerous weight and disrupting airflow."
    },
    {
      title: "Cryopreservation",
      icon: "🧬",
      description: "Biological samples use controlled supercooling and cryoprotectants to minimize ice crystal damage during freezing.",
      details: "Sperm, eggs, embryos, and organs are preserved by avoiding large ice crystals that would rupture cell membranes."
    },
    {
      title: "Sodium Acetate Hand Warmers",
      icon: "🔥",
      description: "Reusable hand warmers contain supersaturated sodium acetate solution. A metal disc triggers crystallization, releasing latent heat instantly.",
      details: "The crystallization releases 264 kJ/kg, heating the pack to 54C. Boiling resets the metastable liquid state."
    }
  ];

  // Render phase diagram with premium SVG graphics
  const renderPhaseDiagram = () => {
    const tempX = (temperature + 50) / 150 * 220 + 50; // Map -50 to 100C to x position

    return (
      <svg viewBox="0 0 320 220" style={{ width: '100%', maxWidth: '320px' }}>
        <defs>
          {/* Premium diagram background */}
          <linearGradient id="scoolDiagramBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Solid phase gradient - ice blue */}
          <linearGradient id="scoolSolidPhase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
          </linearGradient>

          {/* Liquid phase gradient - deep blue */}
          <linearGradient id="scoolLiquidPhase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
          </linearGradient>

          {/* Gas phase gradient - green */}
          <linearGradient id="scoolGasPhase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.25" />
          </linearGradient>

          {/* Supercooled metastable region - cyan highlight */}
          <linearGradient id="scoolMetastableRegion" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
          </linearGradient>

          {/* State indicator glow */}
          <radialGradient id="scoolStateIndicator" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>

          {/* Phase boundary gradient */}
          <linearGradient id="scoolPhaseBoundary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#fb923c" stopOpacity="1" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.6" />
          </linearGradient>

          {/* Axis gradient */}
          <linearGradient id="scoolAxisGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Indicator glow filter */}
          <filter id="scoolIndicatorGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Metastable region glow */}
          <filter id="scoolMetastableGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Premium background */}
        <rect width="320" height="220" fill="url(#scoolDiagramBg)" rx="12" />

        {/* Subtle grid */}
        <pattern id="scoolDiagramGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.4" />
        </pattern>
        <rect x="50" y="30" width="240" height="150" fill="url(#scoolDiagramGrid)" />

        {/* === PHASE REGIONS === */}
        {/* Solid region */}
        <path d="M 55 35 L 55 175 L 115 175 L 115 85 L 55 35" fill="url(#scoolSolidPhase)" />
        <text x="75" y="125" fontSize="12" fill="#7dd3fc" fontWeight="bold" opacity="0.9">SOLID</text>
        <text x="75" y="138" fontSize="8" fill="#7dd3fc" opacity="0.6">(Ice)</text>

        {/* Liquid region */}
        <path d="M 115 85 L 115 175 L 205 175 L 205 55 L 115 85" fill="url(#scoolLiquidPhase)" />
        <text x="155" y="105" fontSize="12" fill="#60a5fa" fontWeight="bold" opacity="0.9">LIQUID</text>
        <text x="155" y="118" fontSize="8" fill="#60a5fa" opacity="0.6">(Water)</text>

        {/* Gas region */}
        <path d="M 205 55 L 205 175 L 290 175 L 290 35 L 205 55" fill="url(#scoolGasPhase)" />
        <text x="245" y="105" fontSize="12" fill="#4ade80" fontWeight="bold" opacity="0.9">GAS</text>
        <text x="245" y="118" fontSize="8" fill="#4ade80" opacity="0.6">(Vapor)</text>

        {/* Metastable supercooled region with highlight */}
        <g filter="url(#scoolMetastableGlow)">
          <path
            d="M 55 175 L 115 175 L 115 135 L 75 135 L 55 175"
            fill="url(#scoolMetastableRegion)"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeDasharray="6,3"
          />
        </g>
        <text x="85" y="162" fontSize="8" fill="#22d3ee" fontWeight="bold">SUPERCOOLED</text>
        <text x="85" y="172" fontSize="7" fill="#06b6d4" opacity="0.8">(Metastable)</text>

        {/* === PHASE BOUNDARIES === */}
        {/* Solid-Liquid boundary (melting/freezing line) */}
        <line x1="115" y1="85" x2="115" y2="175" stroke="url(#scoolPhaseBoundary)" strokeWidth="3" />

        {/* Liquid-Gas boundary (vaporization line) */}
        <line x1="115" y1="85" x2="205" y2="55" stroke="url(#scoolPhaseBoundary)" strokeWidth="3" />

        {/* Triple point indicator */}
        <circle cx="115" cy="85" r="5" fill="#f97316" stroke="#fbbf24" strokeWidth="2" />
        <text x="130" y="82" fontSize="8" fill="#f97316" fontWeight="bold">Triple Point</text>

        {/* === AXES === */}
        {/* X-axis (Temperature) */}
        <line x1="50" y1="180" x2="295" y2="180" stroke="url(#scoolAxisGrad)" strokeWidth="2" />
        <polygon points="295,180 288,176 288,184" fill="#64748b" />
        <text x="175" y="205" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="500">Temperature (°C)</text>

        {/* Y-axis (Pressure) */}
        <line x1="50" y1="185" x2="50" y2="30" stroke="url(#scoolAxisGrad)" strokeWidth="2" />
        <polygon points="50,30 46,37 54,37" fill="#64748b" />
        <text x="20" y="110" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="500" transform="rotate(-90, 20, 110)">Pressure</text>

        {/* Temperature scale markers */}
        {[-40, 0, 50, 100].map((temp, i) => {
          const x = 55 + ((temp + 50) / 150) * 235;
          return (
            <g key={temp}>
              <line x1={x} y1="180" x2={x} y2="185" stroke={temp === 0 ? '#ef4444' : '#64748b'} strokeWidth={temp === 0 ? 2 : 1} />
              <text x={x} y="195" fontSize="8" fill={temp === 0 ? '#ef4444' : '#94a3b8'} textAnchor="middle">
                {temp}°C
              </text>
            </g>
          );
        })}

        {/* Freezing point emphasis line */}
        <line x1="115" y1="30" x2="115" y2="175" stroke="#ef4444" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.5" />

        {/* === CURRENT STATE INDICATOR === */}
        <g filter="url(#scoolIndicatorGlow)">
          <circle
            cx={Math.min(Math.max(tempX, 60), 285)}
            cy={135}
            r="10"
            fill="url(#scoolStateIndicator)"
          >
            <animate attributeName="r" values="10;12;10" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={Math.min(Math.max(tempX, 60), 285)}
            cy={135}
            r="5"
            fill="#fbbf24"
            stroke="#fef3c7"
            strokeWidth="2"
          />
        </g>

        {/* Current temperature label */}
        <rect
          x={Math.min(Math.max(tempX, 60), 285) - 22}
          y={105}
          width="44"
          height="18"
          rx="9"
          fill="rgba(251, 191, 36, 0.2)"
          stroke="#fbbf24"
          strokeWidth="1"
        />
        <text
          x={Math.min(Math.max(tempX, 60), 285)}
          y={118}
          fontSize="10"
          fill="#fbbf24"
          textAnchor="middle"
          fontWeight="bold"
        >
          {temperature}°C
        </text>

        {/* === LEGEND === */}
        <g transform="translate(220, 30)">
          <rect x="0" y="0" width="90" height="55" rx="6" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />
          <text x="45" y="14" fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="bold">LEGEND</text>

          <rect x="8" y="22" width="10" height="10" rx="2" fill="url(#scoolMetastableRegion)" stroke="#22d3ee" strokeWidth="1" />
          <text x="22" y="30" fontSize="7" fill="#94a3b8">Metastable Zone</text>

          <circle cx="13" cy="42" r="5" fill="#fbbf24" />
          <text x="22" y="45" fontSize="7" fill="#94a3b8">Current State</text>
        </g>
      </svg>
    );
  };

  // Render water container with premium SVG graphics
  const renderWaterContainer = () => {
    return (
      <svg viewBox="0 0 340 280" style={{ width: '100%', maxWidth: '340px' }}>
        <defs>
          {/* Premium lab background gradient */}
          <linearGradient id="scoolLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Glass bottle gradient with depth */}
          <linearGradient id="scoolGlassBottle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.4" />
            <stop offset="15%" stopColor="#94a3b8" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#cbd5e1" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#94a3b8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#64748b" stopOpacity="0.4" />
          </linearGradient>

          {/* Liquid water gradient - warm state */}
          <linearGradient id="scoolWaterWarm" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#2563eb" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.7" />
            <stop offset="75%" stopColor="#1e40af" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.85" />
          </linearGradient>

          {/* Supercooled water gradient - cyan metastable */}
          <linearGradient id="scoolWaterSupercooled" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="20%" stopColor="#0891b2" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#0e7490" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#155e75" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#164e63" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#083344" stopOpacity="0.85" />
          </linearGradient>

          {/* Crystallizing water gradient */}
          <linearGradient id="scoolWaterCrystallizing" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
          </linearGradient>

          {/* Frozen ice gradient */}
          <linearGradient id="scoolIceFrozen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#bae6fd" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
          </linearGradient>

          {/* Ice crystal radial glow */}
          <radialGradient id="scoolCrystalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#bae6fd" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </radialGradient>

          {/* Seed crystal glow */}
          <radialGradient id="scoolSeedGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>

          {/* Crystallization front glow */}
          <radialGradient id="scoolCrystallizationFront" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="60%" stopColor="#e0f2fe" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#bae6fd" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.8" />
          </radialGradient>

          {/* Water surface shimmer */}
          <linearGradient id="scoolWaterSurface" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Thermometer gradient - cold */}
          <linearGradient id="scoolThermoCold" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="30%" stopColor="#06b6d4" />
            <stop offset="60%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>

          {/* Thermometer gradient - warm */}
          <linearGradient id="scoolThermoWarm" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="30%" stopColor="#ef4444" />
            <stop offset="60%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          {/* Thermometer bulb gradient */}
          <radialGradient id="scoolThermoBulb" cx="50%" cy="70%" r="60%">
            <stop offset="0%" stopColor={temperature < 0 ? '#67e8f9' : '#fca5a5'} />
            <stop offset="50%" stopColor={temperature < 0 ? '#06b6d4' : '#ef4444'} />
            <stop offset="100%" stopColor={temperature < 0 ? '#0891b2' : '#dc2626'} />
          </radialGradient>

          {/* Glow filters */}
          <filter id="scoolCrystalBlur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" />
          </filter>

          <filter id="scoolCrystalGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="scoolSeedGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="scoolWaterShimmer" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="scoolFrostEffect" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Premium dark lab background */}
        <rect width="340" height="280" fill="url(#scoolLabBg)" rx="12" />

        {/* Subtle grid pattern */}
        <pattern id="scoolLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width="340" height="280" fill="url(#scoolLabGrid)" rx="12" />

        {/* Lab table surface */}
        <rect x="10" y="220" width="230" height="50" rx="4" fill="#111827" />
        <rect x="10" y="220" width="230" height="3" fill="#1f2937" />

        {/* === GLASS BOTTLE === */}
        <g transform="translate(50, 30)">
          {/* Bottle neck */}
          <path
            d="M 55 0 L 55 25 Q 55 35 45 40 L 45 40 L 105 40 Q 95 35 95 25 L 95 0"
            fill="url(#scoolGlassBottle)"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* Bottle body outline */}
          <path
            d="M 20 40 L 20 165 Q 20 185 40 185 L 110 185 Q 130 185 130 165 L 130 40"
            fill="url(#scoolGlassBottle)"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeOpacity="0.7"
          />

          {/* Glass reflection highlight */}
          <path
            d="M 25 50 L 25 160 Q 25 175 35 175"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Water fill based on state */}
          <rect
            x="24"
            y="55"
            width="102"
            height="126"
            rx="3"
            fill={
              waterState === 'liquid' ? 'url(#scoolWaterWarm)' :
              waterState === 'supercooled' ? 'url(#scoolWaterSupercooled)' :
              waterState === 'crystallizing' ? 'url(#scoolWaterCrystallizing)' :
              'url(#scoolIceFrozen)'
            }
          />

          {/* Water surface with shimmer effect */}
          {(waterState === 'liquid' || waterState === 'supercooled') && (
            <g filter="url(#scoolWaterShimmer)">
              <ellipse
                cx={75 + Math.sin(animationFrame / 12) * 15}
                cy={70}
                rx={35}
                ry={8}
                fill="url(#scoolWaterSurface)"
              />
              <ellipse
                cx={75 - Math.sin(animationFrame / 18) * 12}
                cy={100 + Math.cos(animationFrame / 15) * 8}
                rx={25}
                ry={6}
                fill="url(#scoolWaterSurface)"
                opacity="0.7"
              />
              <ellipse
                cx={75 + Math.cos(animationFrame / 20) * 10}
                cy={140}
                rx={30}
                ry={7}
                fill="url(#scoolWaterSurface)"
                opacity="0.5"
              />
            </g>
          )}

          {/* Supercooled state - add metastable shimmer */}
          {waterState === 'supercooled' && (
            <g>
              <rect
                x="24"
                y="55"
                width="102"
                height="126"
                rx="3"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1"
                strokeOpacity={0.3 + Math.sin(animationFrame / 10) * 0.2}
              />
              {/* Pulsing metastable indicator */}
              <circle
                cx="75"
                cy="120"
                r={15 + Math.sin(animationFrame / 8) * 3}
                fill="none"
                stroke="#67e8f9"
                strokeWidth="1"
                strokeOpacity={0.2 + Math.sin(animationFrame / 6) * 0.15}
                strokeDasharray="4,4"
              />
            </g>
          )}

          {/* Crystal growth during crystallization */}
          {(waterState === 'crystallizing' || waterState === 'frozen') && (
            <g filter="url(#scoolCrystalGlowFilter)">
              {crystalPoints.map(cp => {
                // Constrain crystal points to bottle interior
                const constrainedX = Math.max(30, Math.min(120, cp.x - 50));
                const constrainedY = Math.max(60, Math.min(175, cp.y));
                return (
                  <g key={cp.id} transform={`translate(${constrainedX}, ${constrainedY})`}>
                    {/* Hexagonal ice crystal */}
                    <polygon
                      points={`0,${-cp.size} ${cp.size * 0.866},${-cp.size / 2} ${cp.size * 0.866},${cp.size / 2} 0,${cp.size} ${-cp.size * 0.866},${cp.size / 2} ${-cp.size * 0.866},${-cp.size / 2}`}
                      fill="url(#scoolCrystalGlow)"
                      stroke="#bae6fd"
                      strokeWidth="0.5"
                    />
                    {/* Crystal inner detail */}
                    <polygon
                      points={`0,${-cp.size * 0.5} ${cp.size * 0.433},${-cp.size * 0.25} ${cp.size * 0.433},${cp.size * 0.25} 0,${cp.size * 0.5} ${-cp.size * 0.433},${cp.size * 0.25} ${-cp.size * 0.433},${-cp.size * 0.25}`}
                      fill="none"
                      stroke="#e0f2fe"
                      strokeWidth="0.3"
                      strokeOpacity="0.6"
                    />
                  </g>
                );
              })}

              {/* Crystallization front wave */}
              {waterState === 'crystallizing' && (
                <circle
                  cx={seedPosition.x - 50 + 75}
                  cy={seedPosition.y}
                  r={crystalProgress * 1.2}
                  fill="url(#scoolCrystallizationFront)"
                  stroke="#7dd3fc"
                  strokeWidth="2"
                  strokeOpacity={0.6}
                />
              )}
            </g>
          )}

          {/* Frozen ice texture overlay */}
          {waterState === 'frozen' && (
            <g opacity="0.4" filter="url(#scoolFrostEffect)">
              {/* Ice fracture lines */}
              {[...Array(5)].map((_, i) => (
                <path
                  key={`h${i}`}
                  d={`M 30 ${70 + i * 22} Q ${55 + i * 5} ${75 + i * 22} 120 ${68 + i * 22}`}
                  stroke="#e0f2fe"
                  strokeWidth="0.8"
                  fill="none"
                />
              ))}
              {[...Array(4)].map((_, i) => (
                <path
                  key={`v${i}`}
                  d={`M ${40 + i * 25} 60 Q ${45 + i * 25} 120 ${38 + i * 25} 175`}
                  stroke="#e0f2fe"
                  strokeWidth="0.8"
                  fill="none"
                />
              ))}
            </g>
          )}

          {/* Seed crystal with glow */}
          {seedAdded && waterState !== 'liquid' && (
            <g filter="url(#scoolSeedGlowFilter)">
              <circle
                cx={seedPosition.x - 50 + 75}
                cy={seedPosition.y}
                r="8"
                fill="url(#scoolSeedGlow)"
              />
              <circle
                cx={seedPosition.x - 50 + 75}
                cy={seedPosition.y}
                r="4"
                fill="#fbbf24"
                stroke="#fcd34d"
                strokeWidth="1"
              />
              <text
                x={seedPosition.x - 50 + 75}
                y={seedPosition.y - 15}
                textAnchor="middle"
                fontSize="9"
                fill="#fbbf24"
                fontWeight="bold"
              >
                SEED
              </text>
            </g>
          )}
        </g>

        {/* === PREMIUM THERMOMETER === */}
        <g transform="translate(270, 35)">
          {/* Thermometer background tube */}
          <rect x="-12" y="0" width="24" height="130" rx="12" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />

          {/* Temperature scale markings */}
          {[-40, -20, 0, 20].map((temp, i) => {
            const y = 115 - ((temp + 50) / 150) * 100;
            return (
              <g key={temp}>
                <line x1="-18" y1={y} x2="-12" y2={y} stroke={temp === 0 ? '#ef4444' : '#64748b'} strokeWidth={temp === 0 ? 2 : 1} />
                <text x="-22" y={y + 3} textAnchor="end" fontSize="8" fill={temp === 0 ? '#ef4444' : '#94a3b8'}>
                  {temp}
                </text>
              </g>
            );
          })}

          {/* Freezing point indicator line */}
          <line x1="-12" y1={115 - (50 / 150) * 100} x2="12" y2={115 - (50 / 150) * 100} stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />

          {/* Mercury/liquid column */}
          <rect
            x="-6"
            y={115 - Math.max(0, (temperature + 50) / 150) * 100}
            width="12"
            height={Math.max(8, (temperature + 50) / 150 * 100)}
            rx="6"
            fill={temperature < 0 ? 'url(#scoolThermoCold)' : 'url(#scoolThermoWarm)'}
          />

          {/* Thermometer bulb */}
          <circle cx="0" cy="125" r="15" fill="url(#scoolThermoBulb)" />
          <circle cx="-4" cy="121" r="4" fill="rgba(255,255,255,0.3)" />

          {/* Current temperature display */}
          <rect x="-25" y="-25" width="50" height="22" rx="6" fill="#0f172a" stroke={temperature < 0 ? '#06b6d4' : '#ef4444'} strokeWidth="1.5" />
          <text x="0" y="-9" textAnchor="middle" fontSize="14" fill={temperature < 0 ? '#22d3ee' : '#f87171'} fontWeight="bold">
            {temperature}°C
          </text>
        </g>

        {/* === STATE LABELS === */}
        <g transform="translate(125, 248)">
          {/* State indicator badge */}
          <rect
            x="-80"
            y="-12"
            width="160"
            height="24"
            rx="12"
            fill={
              waterState === 'liquid' ? 'rgba(59, 130, 246, 0.2)' :
              waterState === 'supercooled' ? 'rgba(6, 182, 212, 0.3)' :
              waterState === 'crystallizing' ? 'rgba(251, 191, 36, 0.3)' :
              'rgba(224, 242, 254, 0.2)'
            }
            stroke={
              waterState === 'liquid' ? '#3b82f6' :
              waterState === 'supercooled' ? '#06b6d4' :
              waterState === 'crystallizing' ? '#fbbf24' :
              '#bae6fd'
            }
            strokeWidth="1.5"
          />
          <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={
            waterState === 'liquid' ? '#60a5fa' :
            waterState === 'supercooled' ? '#22d3ee' :
            waterState === 'crystallizing' ? '#fbbf24' :
            '#bae6fd'
          }>
            {waterState === 'liquid' ? 'LIQUID WATER' :
              waterState === 'supercooled' ? 'SUPERCOOLED (Metastable!)' :
              waterState === 'crystallizing' ? `CRYSTALLIZING ${crystalProgress.toFixed(0)}%` :
              'FROZEN SOLID'}
          </text>
        </g>

        {/* Instruction text for supercooled state */}
        {waterState === 'supercooled' && (
          <text x="125" y="268" textAnchor="middle" fontSize="10" fill="#f59e0b" fontWeight="500">
            Add a seed crystal to trigger instant freezing!
          </text>
        )}
      </svg>
    );
  };

  // Render sodium acetate hand warmer for twist with premium SVG graphics
  const renderSodiumAcetateWarmer = () => {
    return (
      <svg viewBox="0 0 340 220" style={{ width: '100%', maxWidth: '340px' }}>
        <defs>
          {/* Premium background gradient */}
          <linearGradient id="scoolWarmerBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="25%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Solution state gradient - clear blue liquid */}
          <radialGradient id="scoolSolutionGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#2563eb" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
          </radialGradient>

          {/* Triggered state gradient - warming orange */}
          <radialGradient id="scoolTriggeredGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.9" />
          </radialGradient>

          {/* Crystallized state gradient - white/grey solid */}
          <radialGradient id="scoolCrystallizedGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#e2e8f0" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#64748b" stopOpacity="0.95" />
          </radialGradient>

          {/* Pouch plastic edge gradient */}
          <linearGradient id="scoolPouchEdge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="30%" stopColor="#475569" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Metal disc gradient */}
          <radialGradient id="scoolMetalDisc" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>

          {/* Heat wave gradient */}
          <linearGradient id="scoolHeatWave" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fb923c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
          </linearGradient>

          {/* Crystal glow for triggered state */}
          <radialGradient id="scoolWarmerCrystalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#fef3c7" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#fde68a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
          </radialGradient>

          {/* Temperature display background */}
          <linearGradient id="scoolTempDisplayBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Solution shimmer effect */}
          <linearGradient id="scoolSolutionShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="scoolDiscGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="scoolHeatGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="scoolCrystalSparkle" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Premium background */}
        <rect width="340" height="220" fill="url(#scoolWarmerBg)" rx="12" />

        {/* Subtle pattern */}
        <pattern id="scoolWarmerGrid" width="15" height="15" patternUnits="userSpaceOnUse">
          <rect width="15" height="15" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
        </pattern>
        <rect width="340" height="220" fill="url(#scoolWarmerGrid)" rx="12" />

        {/* === HAND WARMER POUCH === */}
        <g transform="translate(130, 95)">
          {/* Pouch shadow */}
          <ellipse cx="5" cy="8" rx="95" ry="58" fill="rgba(0,0,0,0.3)" />

          {/* Main pouch body */}
          <ellipse
            cx="0"
            cy="0"
            rx="95"
            ry="55"
            fill={
              twistState === 'solution' ? 'url(#scoolSolutionGrad)' :
              twistState === 'triggered' ? 'url(#scoolTriggeredGrad)' :
              'url(#scoolCrystallizedGrad)'
            }
            stroke="url(#scoolPouchEdge)"
            strokeWidth="4"
          />

          {/* Pouch highlight */}
          <ellipse
            cx="-30"
            cy="-25"
            rx="50"
            ry="25"
            fill="url(#scoolSolutionShimmer)"
            opacity={twistState === 'solution' ? 0.6 : 0.3}
          />

          {/* Solution shimmer animation */}
          {twistState === 'solution' && (
            <g>
              <ellipse
                cx={-20 + Math.sin(animationFrame / 12) * 15}
                cy={-15 + Math.cos(animationFrame / 18) * 8}
                rx={45}
                ry={20}
                fill="url(#scoolSolutionShimmer)"
                opacity={0.4 + Math.sin(animationFrame / 10) * 0.2}
              />
              <ellipse
                cx={15 + Math.cos(animationFrame / 15) * 12}
                cy={10}
                rx={30}
                ry={15}
                fill="url(#scoolSolutionShimmer)"
                opacity={0.3 + Math.cos(animationFrame / 12) * 0.15}
              />
            </g>
          )}

          {/* Crystal growth during trigger and after crystallization */}
          {(twistState === 'triggered' || twistState === 'crystallized') && (
            <g filter="url(#scoolCrystalSparkle)">
              {[...Array(Math.floor(twistCrystalProgress / 4))].map((_, i) => {
                const angle = (i / 25) * Math.PI * 2 + i * 0.3;
                const dist = 8 + i * 2.5;
                const x = Math.cos(angle) * dist * (1 + Math.sin(i) * 0.3);
                const y = Math.sin(angle) * dist * 0.55 * (1 + Math.cos(i) * 0.2);
                const size = 3 + (i % 3);
                return (
                  <g key={i} transform={`translate(${x}, ${y})`}>
                    {/* Hexagonal crystal */}
                    <polygon
                      points={`0,${-size} ${size * 0.866},${-size / 2} ${size * 0.866},${size / 2} 0,${size} ${-size * 0.866},${size / 2} ${-size * 0.866},${-size / 2}`}
                      fill="url(#scoolWarmerCrystalGlow)"
                      stroke={twistState === 'triggered' ? '#fef3c7' : '#e2e8f0'}
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Metal disc trigger */}
          <g
            filter={twistState === 'solution' ? 'url(#scoolDiscGlow)' : undefined}
            style={{ cursor: twistState === 'solution' ? 'pointer' : 'default' }}
            onPointerDown={twistState === 'solution' ? triggerTwist : undefined}
          >
            {/* Outer ring */}
            <circle
              cx="0"
              cy="0"
              r="18"
              fill="url(#scoolMetalDisc)"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* Middle ring */}
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Inner disc */}
            <circle
              cx="0"
              cy="0"
              r="6"
              fill="#94a3b8"
            />
            {/* Highlight */}
            <circle
              cx="-4"
              cy="-4"
              r="3"
              fill="rgba(255,255,255,0.4)"
            />

            {/* Click indicator for solution state */}
            {twistState === 'solution' && (
              <circle
                cx="0"
                cy="0"
                r={20 + Math.sin(animationFrame / 8) * 3}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeOpacity={0.4 + Math.sin(animationFrame / 6) * 0.3}
                strokeDasharray="6,4"
              />
            )}
          </g>
        </g>

        {/* Heat waves rising during crystallization */}
        {twistState === 'triggered' && (
          <g filter="url(#scoolHeatGlow)">
            {[0, 1, 2, 3, 4].map(i => {
              const phase = (animationFrame + i * 18) % 60;
              const y = 35 - phase;
              const opacity = Math.max(0, 1 - phase / 50);
              return (
                <path
                  key={i}
                  d={`M ${95 + i * 18} ${y + 35} Q ${100 + i * 18} ${y + 25} ${95 + i * 18} ${y + 15} Q ${90 + i * 18} ${y + 5} ${95 + i * 18} ${y - 5}`}
                  fill="none"
                  stroke="url(#scoolHeatWave)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity={opacity}
                />
              );
            })}
          </g>
        )}

        {/* === TEMPERATURE DISPLAY === */}
        <g transform="translate(285, 50)">
          {/* Display background */}
          <rect x="-35" y="-5" width="70" height="60" rx="8" fill="url(#scoolTempDisplayBg)" stroke="#374151" strokeWidth="1.5" />

          {/* Temperature value */}
          <text x="0" y="25" textAnchor="middle" fontSize="24" fontWeight="bold" fill={
            twistState === 'triggered' ? '#fbbf24' :
            twistState === 'crystallized' ? '#f97316' :
            '#60a5fa'
          }>
            {twistTemp.toFixed(0)}°C
          </text>

          {/* Label */}
          <text x="0" y="45" textAnchor="middle" fontSize="10" fill="#94a3b8">
            Temperature
          </text>

          {/* Heat indicator */}
          {(twistState === 'triggered' || twistState === 'crystallized') && (
            <g transform="translate(0, -15)">
              <text x="0" y="0" textAnchor="middle" fontSize="12" fill="#f97316">
                {twistState === 'triggered' ? 'HEATING' : 'HOT'}
              </text>
            </g>
          )}
        </g>

        {/* === STATE LABEL === */}
        <g transform="translate(170, 190)">
          <rect
            x="-120"
            y="-12"
            width="240"
            height="24"
            rx="12"
            fill={
              twistState === 'solution' ? 'rgba(59, 130, 246, 0.2)' :
              twistState === 'triggered' ? 'rgba(251, 191, 36, 0.3)' :
              'rgba(249, 115, 22, 0.3)'
            }
            stroke={
              twistState === 'solution' ? '#3b82f6' :
              twistState === 'triggered' ? '#fbbf24' :
              '#f97316'
            }
            strokeWidth="1.5"
          />
          <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="bold" fill={
            twistState === 'solution' ? '#60a5fa' :
            twistState === 'triggered' ? '#fbbf24' :
            '#fb923c'
          }>
            {twistState === 'solution' ? 'Supersaturated Solution - Click the disc!' :
              twistState === 'triggered' ? `Crystallizing... ${twistCrystalProgress.toFixed(0)}% - Releasing Heat!` :
              'Crystallized at 54°C - Reusable Hand Warmer!'}
          </text>
        </g>
      </svg>
    );
  };

  // Fixed footer navigation
  const renderFooter = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      minHeight: '72px',
      background: 'rgba(30, 41, 59, 0.98)',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ color: '#94a3b8', fontSize: '14px' }}>
        Supercooling
      </div>
      <button
        onClick={onPhaseComplete}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(to right, #06b6d4, #0891b2)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#64748b',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px'
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Render hook phase
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '9999px',
            marginBottom: '32px'
          }}>
            <span style={{ width: '8px', height: '8px', background: '#06b6d4', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#06b6d4', letterSpacing: '0.05em' }}>PHASE PHYSICS</span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(to right, #ffffff, #67e8f9, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Can Water Be Below 0C and Not Freeze?
          </h1>

          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '40px' }}>
            Discover the mysterious world of supercooled liquids
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '24px' }}>
              💧 ❄️ → 🤔
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', fontWeight: '500', lineHeight: '1.6' }}>
                Pure water can be cooled to <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>-40C</span> and still remain liquid!
              </p>
              <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.6' }}>
                It's waiting... perfectly still... until something tiny disturbs it. Then INSTANT ice!
              </p>
              <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '600' }}>
                What keeps it liquid below freezing? And what triggers the freeze?
              </p>
            </div>
          </div>

          <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#06b6d4' }}>✦</span>
              Phase Diagrams
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#06b6d4' }}>✦</span>
              Nucleation Triggers
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#06b6d4' }}>✦</span>
              Real Applications
            </div>
          </div>
        </div>
        {renderFooter(true, 'Make a Prediction →')}
      </div>
    );
  }

  // Render predict phase
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              You carefully cool very pure water below 0C. It stays liquid! Now you drop a tiny ice crystal into it.
            </p>
            <p style={{ fontSize: '18px', color: '#06b6d4', fontWeight: '500' }}>
              What happens?
            </p>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'Nothing - the ice crystal just melts' },
              { id: 'B', text: 'The water slowly starts to freeze from the bottom' },
              { id: 'C', text: 'Instant freezing spreads rapidly from the crystal' },
              { id: 'D', text: 'The water temperature rises to exactly 0C' }
            ].map(option => (
              <button
                key={option.id}
                onPointerDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                disabled={showPredictionFeedback}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'C' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showPredictionFeedback && option.id === 'C' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'C' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showPredictionFeedback && option.id === 'C' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showPredictionFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showPredictionFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! The ice crystal provides a "nucleation site" - a template for other water molecules to attach to. Freezing spreads like a chain reaction, releasing latent heat!
              </p>
            </div>
          )}
        </div>
        {renderFooter(showPredictionFeedback, 'Try It Yourself →')}
      </div>
    );
  }

  // Render play phase
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Supercooling Lab</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Cool the water below 0C, then add a seed crystal!</p>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Water container */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
              {renderWaterContainer()}

              {/* Controls */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Temperature: {temperature}C
                </label>
                <input
                  type="range"
                  min="-40"
                  max="20"
                  value={temperature}
                  onChange={(e) => handleTemperatureChange(parseInt(e.target.value))}
                  disabled={waterState === 'crystallizing' || waterState === 'frozen'}
                  style={{ width: '100%', accentColor: '#06b6d4' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>-40C</span>
                  <span style={{ color: '#ef4444' }}>0C (Freezing)</span>
                  <span>20C</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onPointerDown={(e) => { e.preventDefault(); addSeed(); }}
                  disabled={waterState !== 'supercooled'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: waterState !== 'supercooled' ? 'not-allowed' : 'pointer',
                    background: waterState === 'supercooled' ? 'linear-gradient(to right, #f59e0b, #d97706)' : '#475569',
                    color: waterState === 'supercooled' ? 'white' : '#94a3b8'
                  }}
                >
                  ❄️ Add Seed Crystal
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); resetExperiment(); }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#374151',
                    color: 'white'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Phase diagram */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>Phase Diagram</h3>
              {renderPhaseDiagram()}
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '12px',
            background: waterState === 'supercooled' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            border: waterState === 'supercooled' ? '2px solid #06b6d4' : '2px solid transparent',
            maxWidth: '640px',
            width: '100%'
          }}>
            {waterState === 'liquid' && (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                Water is above 0C - stable liquid state. Cool it below freezing to see supercooling!
              </p>
            )}
            {waterState === 'supercooled' && (
              <p style={{ color: '#06b6d4', fontSize: '14px' }}>
                <strong>Supercooled!</strong> The water is below freezing but has no nucleation sites for ice crystals to form. It's metastable - add a seed to trigger instant freezing!
              </p>
            )}
            {waterState === 'crystallizing' && (
              <p style={{ color: '#f59e0b', fontSize: '14px' }}>
                <strong>Crystallization cascade!</strong> Ice crystals are spreading from the seed point. Each new crystal provides more nucleation sites!
              </p>
            )}
            {waterState === 'frozen' && (
              <p style={{ color: '#93c5fd', fontSize: '14px' }}>
                <strong>Frozen solid!</strong> The water released latent heat (334 J/g) during crystallization. Notice it happened almost instantly!
              </p>
            )}
          </div>
        </div>
        {renderFooter(true, 'Learn the Science →')}
      </div>
    );
  }

  // Render review phase
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>The Science of Supercooling</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(34, 211, 238, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#06b6d4', marginBottom: '12px' }}>What is Supercooling?</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Supercooling occurs when a liquid is cooled below its freezing point without solidifying. The liquid is in a <strong>metastable state</strong> - it "wants" to freeze but can't start without help.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>Nucleation Sites</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Ice formation needs a "seed" - a surface for molecules to organize into crystal structure. This can be: an existing ice crystal, dust particles, container scratches, or vibrations.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.2), rgba(96, 165, 250, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(147, 197, 253, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '12px' }}>The Phase Diagram</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px' }}>
                The equilibrium phase diagram shows where each state is <strong>thermodynamically stable</strong>. Below 0C, ice is stable and liquid is not - but liquid can persist in the <strong>metastable supercooled region</strong>.
              </p>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                At -40C, water will freeze spontaneously even without seeds (homogeneous nucleation limit).
              </p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Discover a Twist →')}
      </div>
    );
  }

  // Render twist predict phase
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Hand Warmer Twist</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              Reusable hand warmers contain sodium acetate solution that can be supercooled (actually "supersaturated").
              When you click the metal disc, crystals form instantly and the pack heats to 54C!
            </p>
            <p style={{ fontSize: '18px', color: '#f59e0b', fontWeight: '500' }}>
              Where does the heat come from?
            </p>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'A battery hidden inside the pack' },
              { id: 'B', text: 'Latent heat released during crystallization' },
              { id: 'C', text: 'Chemical reaction with air' },
              { id: 'D', text: 'Friction from the metal disc clicking' }
            ].map(option => (
              <button
                key={option.id}
                onPointerDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                disabled={showTwistFeedback}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'B' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showTwistFeedback && option.id === 'B' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'B' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showTwistFeedback && option.id === 'B' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showTwistFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showTwistFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! Crystallization releases latent heat (264 kJ/kg for sodium acetate). The supercooled/supersaturated state stores this energy, releasing it when crystals form!
              </p>
            </div>
          )}
        </div>
        {renderFooter(showTwistFeedback, 'Try the Hand Warmer →')}
      </div>
    );
  }

  // Render twist play phase
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>Sodium Acetate Hand Warmer</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Click the metal disc to trigger crystallization!</p>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            {renderSodiumAcetateWarmer()}

            <button
              onPointerDown={(e) => { e.preventDefault(); resetTwist(); }}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                background: '#374151',
                color: 'white'
              }}
            >
              Reset (Simulates boiling)
            </button>
          </div>

          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: twistState === 'crystallized' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            border: twistState === 'crystallized' ? '2px solid #f97316' : '2px solid transparent',
            maxWidth: '500px',
            width: '100%'
          }}>
            {twistState === 'solution' && (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                The supersaturated sodium acetate solution is stable at room temperature. It "wants" to crystallize but needs a trigger!
              </p>
            )}
            {twistState === 'triggered' && (
              <p style={{ color: '#f59e0b', fontSize: '14px' }}>
                Crystallization spreads rapidly! The latent heat of fusion (264 kJ/kg) is being released, heating the solution!
              </p>
            )}
            {twistState === 'crystallized' && (
              <p style={{ color: '#f97316', fontSize: '14px' }}>
                <strong>54C!</strong> The hand warmer is now hot and will stay warm for 30-60 minutes. Boiling it will redissolve the crystals and reset it.
              </p>
            )}
          </div>
        </div>
        {renderFooter(true, 'See Full Explanation →')}
      </div>
    );
  }

  // Render twist review phase
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>Supercooling in Action: Hand Warmers</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '12px' }}>Supersaturation = Supercooling for Solutions</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Sodium acetate dissolves much better in hot water than cold. When cooled, the solution holds MORE solute than it "should" - it's supersaturated, similar to how supercooled water is below its freezing point.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>The Metal Disc Trigger</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                The disc is a convex piece of metal. When clicked, it creates tiny crystal nuclei that trigger the chain reaction. Each crystal creates more nucleation sites!
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>Reusability</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Unlike chemical hand warmers that oxidize iron irreversibly, sodium acetate hand warmers can be reset! Boiling the crystallized pack redissolves the crystals. When cooled carefully (no vibrations!), it returns to the supersaturated state - ready to use again!
              </p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Explore Applications →')}
      </div>
    );
  }

  // Render transfer phase
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Real-World Applications</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {applications.map((app, index) => (
              <button
                key={index}
                onPointerDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  background: activeAppTab === index ? '#06b6d4' : completedApps.has(index) ? 'rgba(16, 185, 129, 0.3)' : '#374151',
                  border: completedApps.has(index) ? '1px solid #10b981' : '1px solid transparent',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {app.icon} {app.title.split(' ')[0]}
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{applications[activeAppTab].icon}</span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{applications[activeAppTab].title}</h3>
            </div>
            <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '12px' }}>{applications[activeAppTab].description}</p>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{applications[activeAppTab].details}</p>

            {!completedApps.has(activeAppTab) && (
              <button
                onPointerDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Mark as Understood
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#94a3b8' }}>Progress:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {applications.map((_, i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#10b981' : '#475569' }} />
              ))}
            </div>
            <span style={{ color: '#94a3b8' }}>{completedApps.size}/4</span>
          </div>
        </div>
        {renderFooter(completedApps.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // Render test phase
  if (phase === 'test') {
    const score = calculateScore();

    if (showTestResults) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
            <div style={{
              background: score >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '640px',
              width: '100%',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 8 ? '🎉' : '📚'}</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Score: {score}/10</h3>
              <p style={{ color: '#cbd5e1' }}>
                {score >= 8 ? 'Excellent! You\'ve mastered supercooling!' : 'Keep studying! Review and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  maxWidth: '640px',
                  width: '100%',
                  borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                }}>
                  <p style={{ color: 'white', fontWeight: '500', marginBottom: '12px' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#10b981' : userAnswer === oIndex ? '#ef4444' : '#94a3b8'
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderFooter(score >= 8, score >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%', maxWidth: '640px' }}>
            <h2 style={{ color: 'white', fontSize: '20px' }}>Knowledge Test</h2>
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', width: '100%', maxWidth: '640px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? '#06b6d4' : i === currentTestQuestion ? '#64748b' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', maxWidth: '640px', width: '100%' }}>
            <p style={{ color: 'white', fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '640px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', width: '100%', maxWidth: '640px', marginTop: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #64748b',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#64748b' : 'white',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#06b6d4',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowTestResults(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? '#64748b' : '#10b981',
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer'
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render mastery phase
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2), rgba(249, 115, 22, 0.2))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '640px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Supercooling Master!</h1>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '24px' }}>
              You've mastered the physics of metastable liquids and nucleation!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>❄️</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Supercooling</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔮</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Nucleation</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Phase Diagrams</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Hand Warmers</p>
              </div>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default SupercoolingRenderer;
