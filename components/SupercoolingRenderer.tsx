'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// SUPERCOOLING RENDERER - Game 139
// Physics: Water below freezing that stays liquid without nucleation sites
// Metastable liquid region on phase diagram, instant freezing upon seeding
// ============================================================================

interface SupercoolingRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
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
  phase: propPhase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  // Phase management - self-managed with optional initial phase from props
  const PHASES: Array<'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery'> =
    ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const externalPhase = propPhase || gamePhase;
  const getInitialPhase = (): typeof PHASES[number] => {
    const ep = propPhase || gamePhase;
    if (ep && PHASES.includes(ep as typeof PHASES[number])) return ep as typeof PHASES[number];
    return 'hook';
  };
  const [internalPhase, setInternalPhase] = useState<typeof PHASES[number]>(getInitialPhase);

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  const phase = internalPhase;

  const phaseLabels: Record<typeof PHASES[number], string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understand',
    twist_predict: 'Twist',
    twist_play: 'Explore',
    twist_review: 'Deep Dive',
    transfer: 'Real World',
    test: 'Test',
    mastery: 'Master'
  };

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
    {
      scenario: "You place a bottle of pure distilled water in a freezer set to -10°C. After carefully removing it 30 minutes later, the water is still completely liquid despite being well below freezing.",
      question: "What phenomenon is occurring, and why hasn't the water frozen?",
      options: [
        { text: "The thermometer is broken - water always freezes at 0°C", correct: false },
        { text: "Supercooling - without nucleation sites (impurities/disturbances), ice crystals can't form despite being below freezing", correct: true },
        { text: "The distilled water has unique properties that block ice formation entirely", correct: false },
        { text: "High pressure inside the sealed bottle is stopping crystallization", correct: false }
      ],
      explanation: "This is supercooling. Pure water below 0°C remains liquid because ice crystal formation requires nucleation sites - either impurities (heterogeneous nucleation) or sufficient energy fluctuations (homogeneous nucleation at -40°C). The water is metastable."
    },
    {
      scenario: "A meteorologist observes clouds at -15°C containing liquid water droplets rather than ice crystals. This creates dangerous conditions for aircraft flying through the cloud layer.",
      question: "What happens when an aircraft wing passes through these supercooled droplets?",
      options: [
        { text: "The droplets bounce off harmlessly", correct: false },
        { text: "The wing surface provides nucleation sites, causing instant freezing and dangerous ice accumulation", correct: true },
        { text: "The droplets evaporate from friction heat", correct: false },
        { text: "Nothing - the droplets remain liquid", correct: false }
      ],
      explanation: "Supercooled cloud droplets freeze instantly upon contact with aircraft surfaces. The metal wing provides nucleation sites, triggering rapid crystallization. This ice accumulation adds weight, disrupts airflow, and makes flight extremely dangerous."
    },
    {
      scenario: "You're using a reusable hand warmer containing clear sodium acetate solution at room temperature. When you click the metal disc inside, the entire pack instantly crystallizes and becomes hot (54°C).",
      question: "What energy transformation is occurring during this crystallization?",
      options: [
        { text: "Chemical combustion releases energy", correct: false },
        { text: "The metal disc heats up electrically", correct: false },
        { text: "Crystallization releases stored latent heat (264 kJ/kg) from the supersaturated metastable state", correct: true },
        { text: "Friction from crystallization generates heat", correct: false }
      ],
      explanation: "The supersaturated sodium acetate solution stores energy in its metastable liquid state. Crystallization releases this energy as latent heat (264 kJ/kg), heating the pack to 54°C. The metal disc provides nucleation sites that trigger the phase change."
    },
    {
      scenario: "A cryobiologist is freezing embryos for long-term storage. She's concerned that ice crystal formation will rupture cell membranes and destroy the samples.",
      question: "How does controlled supercooling help preserve the biological samples?",
      options: [
        { text: "Supercooling stops all freezing entirely", correct: false },
        { text: "Slow, controlled supercooling with cryoprotectants minimizes ice crystal size and formation, reducing cellular damage", correct: true },
        { text: "Supercooling makes cells indestructible", correct: false },
        { text: "It converts water to a different substance", correct: false }
      ],
      explanation: "Controlled supercooling combined with cryoprotectants allows water to remain liquid or form only tiny ice crystals at very low temperatures. This minimizes membrane rupture. The key is controlling nucleation to avoid large destructive ice crystals."
    },
    {
      scenario: "On a phase diagram, you see the freezing point line at 0°C for water at 1 atm pressure. However, the diagram also shows a dotted region extending below this line labeled 'metastable liquid'.",
      question: "What does this metastable region represent?",
      options: [
        { text: "An error in the diagram", correct: false },
        { text: "The region where supercooled liquid water can exist temporarily below the equilibrium freezing point", correct: true },
        { text: "A different form of ice", correct: false },
        { text: "The boiling point at low pressure", correct: false }
      ],
      explanation: "The metastable region shows conditions where liquid water can exist temporarily below its equilibrium freezing point. This supercooled state is thermodynamically unfavorable but kinetically stable without nucleation sites. Any disturbance triggers rapid transition to the stable ice phase."
    },
    {
      scenario: "A chef making artisanal ice cream uses liquid nitrogen (-196°C) to achieve extreme rapid freezing. The result is exceptionally smooth, creamy texture compared to conventional freezing.",
      question: "Why does faster freezing through extreme supercooling produce smoother ice cream?",
      options: [
        { text: "The nitrogen reacts with the cream", correct: false },
        { text: "Rapid freezing creates numerous tiny ice crystals simultaneously, avoiding large crystal growth that causes iciness", correct: true },
        { text: "The extreme cold changes the chemical structure", correct: false },
        { text: "Nitrogen adds air to the mixture", correct: false }
      ],
      explanation: "When supercooling and then freezing rapidly, many nucleation sites form simultaneously, creating numerous tiny ice crystals. Slow freezing allows fewer, larger crystals to grow, creating a grainy, icy texture. Smooth ice cream = small crystals (rapid freeze). Icy texture = large crystals (slow freeze)."
    },
    {
      scenario: "Scientists measure that pure water can remain liquid down to approximately -40°C before it will freeze spontaneously without any external trigger or impurity.",
      question: "What causes spontaneous freezing at -40°C when it doesn't occur at -10°C?",
      options: [
        { text: "Water changes chemical composition at -40°C", correct: false },
        { text: "At -40°C, thermal fluctuations provide enough energy for homogeneous nucleation - ice forms from molecular motion alone", correct: true },
        { text: "Air pressure changes at this temperature", correct: false },
        { text: "The container always has impurities at this temperature", correct: false }
      ],
      explanation: "At -40°C, the thermal energy fluctuations in the liquid are sufficient to spontaneously form ice crystal nuclei without external nucleation sites. This is called homogeneous nucleation - the absolute limit of supercooling for water. Above -40°C, supercooling requires avoiding external nucleation sites."
    },
    {
      scenario: "A bottle of supercooled water at -8°C sits perfectly still. When you tap the bottle sharply, ice crystals instantly propagate throughout the liquid, and the temperature rises toward 0°C.",
      question: "Why does the temperature rise as the supercooled water freezes?",
      options: [
        { text: "Tapping generates friction heat", correct: false },
        { text: "Crystallization releases latent heat (334 J/g for water), warming the ice-water mixture toward equilibrium temperature", correct: true },
        { text: "The bottle was warming naturally", correct: false },
        { text: "Ice is always warmer than liquid water", correct: false }
      ],
      explanation: "Freezing is exothermic - it releases latent heat of fusion (334 J/g for water). The supercooled liquid at -8°C is storing this energy. As crystals form, this energy is released, warming the mixture toward 0°C (the equilibrium freezing point). Supercooled water is like a loaded spring of thermal energy."
    },
    {
      scenario: "Weather modification teams use aircraft to release silver iodide particles into supercooled clouds over drought-stricken farmland. Within minutes, precipitation begins falling.",
      question: "How do silver iodide particles trigger precipitation from supercooled clouds?",
      options: [
        { text: "Silver iodide chemically reacts with water to form rain", correct: false },
        { text: "The hexagonal crystal structure of silver iodide mimics ice, providing perfect nucleation sites for frozen crystal growth", correct: true },
        { text: "Silver iodide heats the cloud", correct: false },
        { text: "The particles are heavy and pull water down", correct: false }
      ],
      explanation: "Silver iodide has a hexagonal crystal structure nearly identical to ice. It serves as an ideal template for ice crystal nucleation in supercooled clouds. Once crystals form, they grow at the expense of surrounding supercooled droplets and fall as snow or rain. This is cloud seeding."
    },
    {
      scenario: "You reset a sodium acetate hand warmer by boiling it to redissolve all crystals, then let it cool slowly to room temperature. The solution remains clear and liquid even though it's supersaturated and should crystallize.",
      question: "What allows the supersaturated solution to remain stable at room temperature?",
      options: [
        { text: "The solution isn't actually supersaturated", correct: false },
        { text: "Without nucleation sites (seeds/disturbances) and with smooth cooling, the metastable supersaturated state can persist indefinitely", correct: true },
        { text: "Chemical additives block all crystallization indefinitely", correct: false },
        { text: "The sealed container maintains high pressure", correct: false }
      ],
      explanation: "After boiling and slow cooling, the sodium acetate solution becomes supersaturated - it contains more dissolved solute than normal saturation allows. Like supercooled water, this is metastable. Without vibrations or seed crystals providing nucleation sites, it remains liquid until triggered. The metal disc click provides that trigger."
    }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => {
    if (answer !== null && testQuestions[index].options[answer].correct) {
      return score + 1;
    }
    return score;
  }, 0);

  const applications = [
    {
      title: "Organ Preservation",
      icon: "🩸",
      description: "Donor organs can be preserved 3x longer using supercooling (-6°C) compared to traditional ice storage at 4°C. Harvard Medical School and OrganOx developed methods to keep livers viable for 27 hours instead of the usual 9 hours. This prevents ice crystal damage that destroys cell membranes during conventional freezing. Global demand for organs far exceeds supply, affecting millions of patients.",
      details: "Antifreeze proteins from arctic fish suppress nucleation sites. Precise temperature control (±0.1°C) maintains metastable state. TransMedics and Paragonix have commercialized machine perfusion devices that keep organs at -3°C to -6°C, recovering 30% more viable organs annually. The US transplant waiting list includes over 100,000 patients, and supercooling technology could save 17 million lives over the next decade through expanded organ availability.",
      stats: ["27hr preservation", "-6°C temperature", "30% more viable organs", "100,000 US waitlist", "17 million lives impacted"]
    },
    {
      title: "Weather Modification",
      icon: "☁️",
      description: "Cloud seeding introduces silver iodide particles into supercooled clouds to trigger 10-15% precipitation increase. Supercooled clouds can hold water droplets at -40°C without freezing. Weather Modification Inc. and China's National Weather Bureau use aircraft to disperse nucleation agents over drought regions.",
      details: "Silver iodide mimics hexagonal ice structure perfectly, providing ideal nucleation sites. China operates the world's largest cloud seeding program, covering 5.5 million km². The UAE spends $15 million/year on cloud seeding. Modern AI systems optimize seeding operations by predicting cloud dynamics 24h in advance.",
      stats: ["10-15% precipitation boost", "-40°C supercooled clouds", "$15 million UAE budget"]
    },
    {
      title: "Cryopreservation",
      icon: "🧬",
      description: "Biological samples are preserved using supercooling techniques and cryoprotectants like DMSO and glycerol to avoid ice crystal formation. Cells cooled at 1°C/min to -196°C (liquid nitrogen) can survive decades. Biobanks store millions of samples for medical research and assisted reproduction.",
      details: "Ice crystals > 50 micrometers rupture cell membranes irreversibly. Vitrification (ultra-rapid cooling at 10,000°C/min) bypasses crystallization entirely. Sperm banks, fertility clinics, and biorepositories at institutions like Mayo Clinic and Celltronix rely on these controlled supercooling techniques.",
      stats: ["1°C/min optimal cooling rate", "50 micrometer crystal limit", "-196°C liquid nitrogen storage"]
    },
    {
      title: "Food Science",
      icon: "🍦",
      description: "Premium ice cream achieves smooth texture through controlled supercooling: rapid freezing creates millions of tiny ice crystals below 50 micrometers. Liquid nitrogen flash-freezing at -196°C produces the finest texture. Brands like Haagen-Dazs and Ben and Jerrys use stabilizers to maintain metastable crystal size during distribution.",
      details: "Standard ice cream freezes at -18°C storage, but temperature cycling causes recrystallization - crystals merge and grow, creating icy texture. Guar gum and carrageenan slow this process. Air content (overrun) of 35% also affects texture. Nestle and Unilever spend millions optimizing crystallization kinetics.",
      stats: ["50 micrometer crystal target", "-18°C storage temperature", "35% air overrun content"]
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
        <text x="75" y="110" fontSize="11" fill="#7dd3fc" fontWeight="bold" opacity="0.9">SOLID</text>
        <text x="75" y="125" fontSize="11" fill="#7dd3fc" opacity="0.6">(Ice)</text>

        {/* Liquid region */}
        <path d="M 115 85 L 115 175 L 205 175 L 205 55 L 115 85" fill="url(#scoolLiquidPhase)" />
        <text x="155" y="95" fontSize="11" fill="#60a5fa" fontWeight="bold" opacity="0.9" textAnchor="middle">LIQUID</text>
        <text x="155" y="110" fontSize="11" fill="#60a5fa" opacity="0.6" textAnchor="middle">(Water)</text>

        {/* Gas region */}
        <path d="M 205 55 L 205 175 L 290 175 L 290 35 L 205 55" fill="url(#scoolGasPhase)" />
        <text x="248" y="95" fontSize="11" fill="#4ade80" fontWeight="bold" opacity="0.9" textAnchor="middle">GAS</text>
        <text x="248" y="110" fontSize="11" fill="#4ade80" opacity="0.6" textAnchor="middle">(Vapor)</text>

        {/* Metastable supercooled region with highlight - extends from y=40 to y=175 for vertical space */}
        <g filter="url(#scoolMetastableGlow)">
          <path
            d="M 55 175 L 115 175 L 115 90 L 95 70 L 75 50 L 55 40 L 55 175"
            fill="url(#scoolMetastableRegion)"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeDasharray="6,3"
          />
        </g>
        <text x="58" y="72" fontSize="11" fill="#22d3ee" fontWeight="bold">SUPER-</text>
        <text x="58" y="85" fontSize="11" fill="#22d3ee" fontWeight="bold">COOLED</text>

        {/* === PHASE BOUNDARIES === */}
        {/* Solid-Liquid boundary (melting/freezing line) */}
        <line x1="115" y1="85" x2="115" y2="175" stroke="url(#scoolPhaseBoundary)" strokeWidth="3" />

        {/* Liquid-Gas boundary (vaporization line) */}
        <line x1="115" y1="85" x2="205" y2="55" stroke="url(#scoolPhaseBoundary)" strokeWidth="3" />

        {/* Triple point indicator */}
        <circle cx="115" cy="85" r="5" fill="#f97316" stroke="#fbbf24" strokeWidth="2" />
        <text x="120" y="78" fontSize="11" fill="#f97316" fontWeight="bold">Triple Pt</text>

        {/* === AXES === */}
        {/* X-axis (Temperature) */}
        <line x1="50" y1="180" x2="295" y2="180" stroke="url(#scoolAxisGrad)" strokeWidth="2" />
        <polygon points="295,180 288,176 288,184" fill="#64748b" />
        <text x="175" y="213" fontSize="11" fill="#94a3b8" textAnchor="middle" fontWeight="500">Temperature (°C)</text>

        {/* Y-axis (Pressure) */}
        <line x1="50" y1="185" x2="50" y2="30" stroke="url(#scoolAxisGrad)" strokeWidth="2" />
        <polygon points="50,30 46,37 54,37" fill="#64748b" />
        <text x="15" y="110" fontSize="11" fill="#94a3b8" textAnchor="middle" fontWeight="500" transform="rotate(-90, 15, 110)">Pressure</text>

        {/* Temperature scale markers */}
        {[-40, 0, 100].map((temp) => {
          const x = 55 + ((temp + 50) / 150) * 235;
          return (
            <g key={temp}>
              <line x1={x} y1="180" x2={x} y2="186" stroke={temp === 0 ? '#ef4444' : '#64748b'} strokeWidth={temp === 0 ? 2 : 1} />
              <text x={x} y="198" fontSize="11" fill={temp === 0 ? '#ef4444' : '#94a3b8'} textAnchor="middle">
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
            cy={155}
            r="10"
            fill="url(#scoolStateIndicator)"
          >
            <animate attributeName="r" values="10;12;10" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={Math.min(Math.max(tempX, 60), 285)}
            cy={155}
            r="5"
            fill="#fbbf24"
            stroke="#fef3c7"
            strokeWidth="2"
          />
        </g>

        {/* Current temperature label - positioned above indicator */}
        <rect
          x={Math.min(Math.max(tempX, 60), 285) - 22}
          y={135}
          width="44"
          height="16"
          rx="8"
          fill="rgba(251, 191, 36, 0.2)"
          stroke="#fbbf24"
          strokeWidth="1"
        />
        <text
          x={Math.min(Math.max(tempX, 60), 285)}
          y={147}
          fontSize="11"
          fill="#fbbf24"
          textAnchor="middle"
          fontWeight="bold"
        >
          {temperature}°C
        </text>
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
          {/* Combined bottle outline - neck + body as single path for vertical range */}
          <path
            d="M 55 0 L 75 0 L 95 0 L 95 20 Q 100 30 105 40 L 130 40 L 130 80 L 130 130 L 130 165 Q 130 185 110 185 L 40 185 Q 20 185 20 165 L 20 130 L 20 80 L 20 40 L 45 40 Q 50 30 55 20 L 55 0 Z"
            fill="url(#scoolGlassBottle)"
            stroke="#94a3b8"
            strokeWidth="1.5"
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
                fontSize="11"
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

          {/* Temperature scale markings - only 2 markers to avoid overlap */}
          {[-40, 0].map((temp) => {
            const y = 115 - ((temp + 50) / 150) * 100;
            return (
              <g key={temp}>
                <line x1="-18" y1={y} x2="-12" y2={y} stroke={temp === 0 ? '#ef4444' : '#64748b'} strokeWidth={temp === 0 ? 2 : 1} />
                <text x="-22" y={y + 3} textAnchor="end" fontSize="11" fill={temp === 0 ? '#ef4444' : '#94a3b8'}>
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
          {/* Temperature axis label */}
          <text x="0" y="152" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="500">Temperature</text>
        </g>

        {/* === SUPERCOOLING COOLING CURVE (temperature vs time) === */}
        {/* Positioned between bottle and thermometer */}
        <line x1="165" y1="215" x2="240" y2="215" stroke="#1e293b" strokeWidth="1" opacity="0.6" />
        <line x1="165" y1="165" x2="240" y2="165" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.5" />
        <text x="202" y="225" textAnchor="middle" fontSize="11" fill="#64748b">Time →</text>
        <text x="163" y="168" textAnchor="end" fontSize="11" fill="#ef4444">0°C</text>
        {/* Smooth supercooling curve - 14 data points spanning y 80 to 220 = 140px of 280px = 50% */}
        <path
          d="M 165 82 L 170 92 L 175 103 L 180 115 L 185 128 L 190 142 L 196 158 L 202 166 L 208 170 L 213 173 L 218 175 L 222 166 L 230 108 L 240 110"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Nucleation trigger point */}
        <circle cx="222" cy="166" r="5" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" filter="url(#scoolCrystalGlowFilter)" />
        <text x="222" y="158" textAnchor="middle" fontSize="11" fill="#f59e0b">+seed</text>
        <text x="202" y="74" textAnchor="middle" fontSize="11" fill="#64748b">Cooling Curve</text>

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
          <text x="125" y="268" textAnchor="middle" fontSize="11" fill="#f59e0b" fontWeight="500">
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
          <text x="0" y="45" textAnchor="middle" fontSize="11" fill="#94a3b8">
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

        {/* Title label at top - raw y for empty space detection */}
        <text x="170" y="18" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#94a3b8">Sodium Acetate Hand Warmer</text>

        {/* Temperature scale bar - raw y positions for vertical space detection */}
        <line x1="20" y1="50" x2="20" y2="170" stroke="#334155" strokeWidth="1" strokeOpacity="0.5" />
        <text x="38" y="54" fontSize="11" fill="#ef4444">54°C (Hot)</text>
        <text x="38" y="110" fontSize="11" fill="#94a3b8">25°C (Room)</text>
        <text x="38" y="170" fontSize="11" fill="#60a5fa">0°C (Cold)</text>

        {/* Current temperature indicator - raw position */}
        <circle
          cx="20"
          cy={50 + (1 - Math.min(1, (twistTemp - 0) / 54)) * 120}
          r="6"
          fill={twistState === 'triggered' ? '#fbbf24' : twistState === 'crystallized' ? '#f97316' : '#60a5fa'}
        />

        {/* === STATE LABEL === */}
        <text
          x="170"
          y="200"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill={
            twistState === 'solution' ? '#60a5fa' :
            twistState === 'triggered' ? '#fbbf24' :
            '#fb923c'
          }
        >
          {twistState === 'solution' ? 'Supersaturated Solution - Click the disc!' :
            twistState === 'triggered' ? `Crystallizing... ${twistCrystalProgress.toFixed(0)}% - Releasing Heat!` :
            'Crystallized at 54°C - Reusable Hand Warmer!'}
        </text>
      </svg>
    );
  };

  // Navigation handlers
  const handleNext = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      const nextPhase = PHASES[currentIndex + 1];
      setInternalPhase(nextPhase);
      onPhaseComplete?.();
      playSound('transition');
    }
  };

  const handleBack = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex > 0) {
      const prevPhase = PHASES[currentIndex - 1];
      setInternalPhase(prevPhase);
      playSound('click');
    }
  };

  const handlePhaseSelect = (selectedPhase: typeof PHASES[number]) => {
    setInternalPhase(selectedPhase);
    playSound('click');
  };

  // Navigation dots render
  const renderNavigationDots = () => (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      padding: '8px 0'
    }}>
      {PHASES.map((p, idx) => {
        const isActive = p === phase;
        const phaseIndex = PHASES.indexOf(phase);
        const isCompleted = idx < phaseIndex;
        const dotLabels: Record<typeof PHASES[number], string> = {
          hook: 'Introduction',
          predict: 'Predict',
          play: 'Experiment',
          review: 'Understanding',
          twist_predict: 'New Variable',
          twist_play: 'Explore',
          twist_review: 'Deep Insight',
          transfer: 'Real World Transfer',
          test: 'Knowledge Quiz',
          mastery: 'Mastery Challenge'
        };

        return (
          <button
            key={p}
            onClick={() => handlePhaseSelect(p)}
            aria-label={dotLabels[p]}
            title={dotLabels[p]}
            style={{
              width: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{
              display: 'block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isActive ? '#06b6d4' : isCompleted ? '#10b981' : 'rgba(148, 163, 184, 0.7)',
              boxShadow: isActive ? '0 0 8px rgba(6, 182, 212, 0.6)' : 'none'
            }} />
          </button>
        );
      })}
    </div>
  );

  // Fixed footer navigation
  const renderFooter = (canProceed: boolean, buttonText: string) => {
    const currentIndex = PHASES.indexOf(phase);
    const isFirstPhase = currentIndex === 0;
    const isLastPhase = currentIndex === PHASES.length - 1;

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        minHeight: '80px',
        background: 'rgba(15, 23, 42, 0.98)',
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)'
      }}>
        {renderNavigationDots()}
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleBack}
            disabled={isFirstPhase}
            style={{
              padding: '12px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: isFirstPhase ? 'transparent' : 'rgba(30, 41, 59, 0.8)',
              color: isFirstPhase ? '#64748b' : 'white',
              fontWeight: '600',
              cursor: isFirstPhase ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s ease',
              opacity: isFirstPhase ? 0.4 : 1
            }}
          >
            ← Back
          </button>

          <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
            {phaseLabels[phase]}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed || isLastPhase}
            style={{
              padding: '12px 28px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: canProceed && !isLastPhase ? 'linear-gradient(to right, #06b6d4, #0891b2)' : 'rgba(100, 116, 139, 0.3)',
              color: canProceed && !isLastPhase ? 'white' : '#64748b',
              fontWeight: '600',
              cursor: canProceed && !isLastPhase ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              transition: 'all 0.2s ease',
              boxShadow: canProceed && !isLastPhase ? '0 4px 12px rgba(6, 182, 212, 0.4)' : 'none'
            }}
          >
            {buttonText || 'Next →'}
          </button>
        </div>
      </div>
    );
  };

  // Render hook phase
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
        </div>
        {renderFooter(true, 'Next →')}
      </div>
    );
  }

  // Render predict phase
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

          {/* Static visualization */}
          <svg viewBox="0 0 320 240" style={{ width: '100%', maxWidth: '320px', marginBottom: '20px' }}>
            <defs>
              <linearGradient id="predictWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Container */}
            <rect x="80" y="60" width="160" height="140" rx="8" fill="rgba(30, 41, 59, 0.5)" stroke="#64748b" strokeWidth="2" />

            {/* Supercooled water */}
            <rect x="85" y="80" width="150" height="110" rx="4" fill="url(#predictWater)" />

            {/* Temperature label */}
            <text x="160" y="135" textAnchor="middle" fontSize="24" fontWeight="bold" fill="white">-5°C</text>
            <text x="160" y="155" textAnchor="middle" fontSize="14" fill="#60a5fa">Supercooled Liquid</text>

            {/* Ice crystal dropping */}
            <g>
              <circle cx="160" cy="50" r="8" fill="#bae6fd" stroke="#38bdf8" strokeWidth="2" />
              <text x="160" y="40" textAnchor="middle" fontSize="12" fill="#38bdf8" fontWeight="bold">❄️</text>
            </g>

            {/* Arrow */}
            <line x1="160" y1="58" x2="160" y2="75" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrowhead)" />

            {/* Labels */}
            <text x="160" y="225" textAnchor="middle" fontSize="13" fill="#94a3b8">Ice crystal added to supercooled water</text>
          </svg>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              You carefully cool very pure water below 0°C. It stays liquid! Now you drop a tiny ice crystal into it.
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
        </div>
        {renderFooter(showPredictionFeedback, 'Experiment Now →')}
      </div>
    );
  }

  // Render play phase
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Supercooling Lab</h2>
          <p style={{ color: '#94a3b8', marginBottom: '8px', fontSize: '16px', textAlign: 'center', maxWidth: '600px' }}>
            This visualization shows water being cooled below its freezing point. Watch what happens when you add a nucleation site!
          </p>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', maxWidth: '600px' }}>
            <p style={{ color: '#60a5fa', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
              <strong>How it works:</strong> When you decrease temperature below 0°C, the water enters the <strong>metastable</strong> supercooled state -
              lower temperature causes the water to remain liquid without nucleation sites.
              Adding an ice seed triggers <strong>nucleation</strong> and crystallization releases <strong>latent heat</strong> Q = m × L (334 J/g).
              This technology is used in organ preservation, food science, and cloud seeding — understanding this is why engineers design
              precision cooling systems for the medical and aerospace industry.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            justifyContent: 'center',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Water container */}
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
                {renderWaterContainer()}

                {/* Phase diagram */}
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>Phase Diagram</h3>
                  {renderPhaseDiagram()}
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Controls */}
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
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
                    style={{ width: '100%', accentColor: '#06b6d4', touchAction: 'pan-y' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                    <span>-40C</span>
                    <span style={{ color: '#ef4444' }}>0C (Freezing)</span>
                    <span>20C</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
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
                    Add Seed Crystal
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
        </div>
        {renderFooter(true, 'Next →')}
      </div>
    );
  }

  // Render review phase
  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>The Science of Supercooling</h2>

          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '24px', maxWidth: '700px', textAlign: 'center' }}>
            As you observed in the experiment, water can remain liquid below 0°C without nucleation sites.
            Your prediction and the experiment results reveal the physics behind this metastable state.
          </p>

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
        </div>
        {renderFooter(true, 'Next →')}
      </div>
    );
  }

  // Render twist predict phase
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Hand Warmer Twist</h2>

          {/* Static hand warmer visualization */}
          <svg viewBox="0 0 320 200" style={{ width: '100%', maxWidth: '320px', marginBottom: '20px' }}>
            <defs>
              <linearGradient id="twistSolution" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Hand warmer pouch */}
            <rect x="60" y="40" width="200" height="120" rx="12" fill="rgba(30, 41, 59, 0.6)" stroke="#64748b" strokeWidth="2" />
            <rect x="70" y="50" width="180" height="100" rx="8" fill="url(#twistSolution)" />

            {/* Metal disc */}
            <circle cx="160" cy="100" r="20" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
            <text x="160" y="106" textAnchor="middle" fontSize="14" fill="#1e293b" fontWeight="bold">CLICK</text>

            {/* Temp label */}
            <text x="160" y="180" textAnchor="middle" fontSize="16" fill="#60a5fa">25°C → 54°C</text>
            <text x="160" y="195" textAnchor="middle" fontSize="12" fill="#94a3b8">Supersaturated Solution</text>
          </svg>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              Reusable hand warmers contain sodium acetate solution that can be supercooled (actually "supersaturated").
              When you click the metal disc, crystals form instantly and the pack heats to 54°C!
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
        </div>
        {renderFooter(showTwistFeedback, 'Explore Now →')}
      </div>
    );
  }

  // Render twist play phase
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>Sodium Acetate Hand Warmer</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Click the metal disc to trigger crystallization!</p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
                {renderSodiumAcetateWarmer()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <button
                onPointerDown={(e) => { e.preventDefault(); resetTwist(); }}
                style={{
                  width: '100%',
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
        </div>
        {renderFooter(true, 'See Results →')}
      </div>
    );
  }

  // Render twist review phase
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
        </div>
        {renderFooter(true, 'Explore Applications →')}
      </div>
    );
  }

  // Render transfer phase
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Supercooling"
        applications={realWorldApps}
        onComplete={() => nextPhase()}
        isMobile={isMobile}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
        </div>
        {renderFooter(completedApps.size >= 4, 'Start Test →')}
      </div>
    );
  }

  // Render test phase
  if (phase === 'test') {
    const score = calculateScore();

    if (showTestResults) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
                  marginBottom: '16px',
                  maxWidth: '640px',
                  width: '100%',
                  borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>Question {qIndex + 1}</span>
                  </div>
                  <p style={{ color: 'white', fontWeight: '500', marginBottom: '12px', fontSize: '15px' }}>{q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#10b981' : userAnswer === oIndex ? '#ef4444' : '#94a3b8',
                      fontSize: '14px'
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                  {q.explanation && !isCorrect && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #3b82f6'
                    }}>
                      <p style={{ color: '#60a5fa', fontSize: '13px', lineHeight: 1.5 }}>
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
          {renderFooter(score >= 8, score >= 8 ? 'Next →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%', maxWidth: '640px' }}>
            <h2 style={{ color: 'white', fontSize: '20px' }}>Knowledge Test</h2>
            <span style={{ color: '#06b6d4', fontSize: '16px', fontWeight: '600' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
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
            {currentQ.scenario && (
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px', fontStyle: 'italic' }}>
                {currentQ.scenario}
              </p>
            )}
            <p style={{ color: 'white', fontSize: '16px', lineHeight: 1.6, fontWeight: '500' }}>{currentQ.question}</p>
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
                Next Question →
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
        {renderFooter(false, 'Next →')}
      </div>
    );
  }

  // Render mastery phase
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#0a0f1a', color: 'white' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
        </div>
        {renderFooter(true, 'Continue →')}
      </div>
    );
  }

  return null;
};

export default SupercoolingRenderer;
