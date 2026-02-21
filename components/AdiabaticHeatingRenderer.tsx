'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// =============================================================================
// ADIABATIC HEATING RENDERER - Compression Heats, Expansion Cools
// =============================================================================
// Game 133: Explore how compressing gas heats it without adding heat energy,
// and how expansion cools it - the thermodynamic magic of adiabatic processes.
// =============================================================================

interface AdiabaticHeatingRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface TestQuestion {
  id: number;
  scenario: string;
  question: string;
  options: { id: string; text: string; correct?: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const realWorldApps = [
  {
    icon: '🚗',
    title: 'Diesel Engine Ignition',
    short: 'Diesel compression ignition',
    tagline: 'Igniting fuel without spark plugs',
    description: 'Diesel engines achieve combustion through extreme adiabatic compression, heating air to over 500°C where fuel spontaneously ignites. This compression-ignition process is more efficient than spark ignition.',
    connection: 'When the piston rapidly compresses air (20:1 ratio), there is no time for heat to escape. The work done on the gas converts directly to internal energy, raising temperature from ~300K to ~900K - hot enough to ignite diesel fuel.',
    howItWorks: 'The piston compresses air so quickly that the process is nearly adiabatic. Using PV^γ = constant, a 20:1 compression ratio with γ=1.4 raises temperature by factor of ~3, reaching autoignition temperature.',
    stats: [
      { value: '20:1', label: 'Compression ratio', icon: '⚡' },
      { value: '900K', label: 'Peak temperature', icon: '🔥' },
      { value: '45%', label: 'Thermal efficiency', icon: '📈' }
    ],
    examples: ['Semi-trucks', 'Ships', 'Locomotives', 'Construction equipment'],
    companies: ['Cummins', 'Detroit Diesel', 'MAN', 'Caterpillar'],
    futureImpact: 'Advanced diesel technology with precise injection timing and exhaust treatment continues to power global freight, while hybrid-diesel systems improve urban efficiency.',
    color: '#F59E0B'
  },
  {
    icon: '❄️',
    title: 'Refrigeration & Heat Pumps',
    short: 'Cooling through expansion',
    tagline: 'Moving heat uphill with thermodynamics',
    description: 'Refrigerators and heat pumps exploit adiabatic compression and expansion to transfer heat from cold to hot regions, seemingly defying the natural direction of heat flow.',
    connection: 'Compressing refrigerant adiabatically heats it above room temperature (so it can dump heat). Expanding it adiabatically cools it below the target temperature (so it can absorb heat).',
    howItWorks: 'The compressor rapidly compresses refrigerant gas, heating it adiabatically. Hot gas releases heat in the condenser. Liquid passes through expansion valve, cooling adiabatically. Cold refrigerant absorbs heat in evaporator.',
    stats: [
      { value: '300%', label: 'COP efficiency', icon: '⚡' },
      { value: '-40°C', label: 'Min temperature', icon: '❄️' },
      { value: '20%', label: 'Global electricity use', icon: '🌍' }
    ],
    examples: ['Home refrigerators', 'Air conditioners', 'Heat pumps', 'Industrial chillers'],
    companies: ['Carrier', 'Daikin', 'Trane', 'LG'],
    futureImpact: 'Heat pumps are 3-5x more efficient than resistive heating. As grids decarbonize, heat pumps will replace gas furnaces for sustainable home heating.',
    color: '#06B6D4'
  },
  {
    icon: '🌤️',
    title: 'Weather & Cloud Formation',
    short: 'Atmospheric thermodynamics',
    tagline: 'How pressure creates weather',
    description: 'Rising air parcels cool adiabatically as atmospheric pressure decreases with altitude. This cooling triggers cloud formation, precipitation, and drives global weather patterns.',
    connection: 'As air rises and pressure drops, it expands adiabatically. With no heat input, expansion reduces internal energy, cooling the air. When temperature drops below dew point, water condenses into clouds.',
    howItWorks: 'Dry air cools at 10°C/km (dry adiabatic lapse rate). Once saturated, latent heat release slows cooling to 6°C/km (moist adiabatic rate). This drives convection, thunderstorms, and mountain weather.',
    stats: [
      { value: '10°C/km', label: 'Dry lapse rate', icon: '📉' },
      { value: '6°C/km', label: 'Moist lapse rate', icon: '💧' },
      { value: '100%', label: 'Cloud formation driver', icon: '☁️' }
    ],
    examples: ['Thunderstorm formation', 'Mountain clouds', 'Foehn winds', 'Hurricanes'],
    companies: ['NOAA', 'ECMWF', 'Met Office', 'AccuWeather'],
    futureImpact: 'Better understanding of adiabatic processes improves climate models and severe weather prediction, potentially saving thousands of lives annually.',
    color: '#3B82F6'
  },
  {
    icon: '✈️',
    title: 'Aircraft Cabin Pressurization',
    short: 'Breathing at 35,000 feet',
    tagline: 'Compressed air for passenger comfort',
    description: 'Jet engines bleed compressed air for cabin pressurization. This air undergoes adiabatic heating during compression and must be cooled before entering the cabin.',
    connection: 'Engine compressors achieve 30:1 pressure ratios, heating bleed air adiabatically to over 500°C. Air conditioning packs use expansion turbines (adiabatic cooling) to bring temperature to comfortable levels.',
    howItWorks: 'Hot compressed air from the engine passes through heat exchangers, then expands through turbines. The adiabatic expansion dramatically cools the air. Mixing valves blend hot and cold air for precise temperature control.',
    stats: [
      { value: '500°C', label: 'Bleed air temp', icon: '🔥' },
      { value: '8000ft', label: 'Cabin altitude', icon: '⛰️' },
      { value: '30:1', label: 'Compression ratio', icon: '📊' }
    ],
    examples: ['Commercial aircraft', 'Business jets', 'Military transports', 'Spacecraft'],
    companies: ['Boeing', 'Airbus', 'Collins Aerospace', 'Honeywell'],
    futureImpact: 'Electric aircraft will require new pressurization approaches. Current designs use electrically-driven compressors with adiabatic cooling for efficiency.',
    color: '#8B5CF6'
  }
];

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const AdiabaticHeatingRenderer: React.FC<AdiabaticHeatingRendererProps> = ({
  phase: inputPhase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Normalize phase - default to hook for invalid phases
  // Accept both 'phase' and 'gamePhase' props for compatibility
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const externalPhase = gamePhase || inputPhase;
  const normalizedInputPhase: Phase | null = externalPhase && validPhases.includes(externalPhase as Phase) ? externalPhase as Phase : null;

  // Internal phase management for self-managing navigation
  const [internalPhase, setInternalPhase] = useState<Phase>('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  // Use external prop if explicitly provided (for testing), otherwise use internal state
  const currentPhase = normalizedInputPhase || internalPhase;

  // Phase labels for navigation dots
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Lab',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = (p: Phase) => {
    setInternalPhase(p);
  };

  const nextPhase = () => {
    const currentIndex = validPhases.indexOf(currentPhase);
    if (currentIndex < validPhases.length - 1) {
      goToPhase(validPhases[currentIndex + 1]);
    }
    if (onPhaseComplete) onPhaseComplete();
  };

  const prevPhase = () => {
    const currentIndex = validPhases.indexOf(currentPhase);
    if (currentIndex > 0) {
      goToPhase(validPhases[currentIndex - 1]);
    }
  };
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const { isMobile } = useViewport();
// Simulation states
  const [compressionRatio, setCompressionRatio] = useState(1);
  const [processSpeed, setProcessSpeed] = useState(100);
  const [temperature, setTemperature] = useState(300);
  const [pressure, setPressure] = useState(1);
  const [volume, setVolume] = useState(100);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [pvHistory, setPvHistory] = useState<{p: number, v: number}[]>([]);
  const [showHeatFlow, setShowHeatFlow] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
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

  // Initialize molecules
  useEffect(() => {
    const initMolecules: Molecule[] = Array.from({ length: 30 }, () => ({
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4
    }));
    setMolecules(initMolecules);
  }, []);

  // Molecule animation with temperature-dependent speed
  useEffect(() => {
    const animate = () => {
      setMolecules(prev => {
        const speedFactor = Math.sqrt(temperature / 300);
        const containerWidth = 50 + (volume / 100) * 200;

        return prev.map(mol => {
          let newX = mol.x + mol.vx * speedFactor;
          let newY = mol.y + mol.vy * speedFactor;
          let newVx = mol.vx;
          let newVy = mol.vy;

          if (newX < 50 || newX > containerWidth) {
            newVx = -newVx;
            newX = Math.max(50, Math.min(containerWidth, newX));
          }
          if (newY < 50 || newY > 150) {
            newVy = -newVy;
            newY = Math.max(50, Math.min(150, newY));
          }

          newVx += (Math.random() - 0.5) * 0.2;
          newVy += (Math.random() - 0.5) * 0.2;

          const maxSpeed = 5 * speedFactor;
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speed > maxSpeed) {
            newVx = (newVx / speed) * maxSpeed;
            newVy = (newVy / speed) * maxSpeed;
          }

          return { x: newX, y: newY, vx: newVx, vy: newVy };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [temperature, volume]);

  // Calculate thermodynamic state
  useEffect(() => {
    const gamma = 1.4;
    const baseVolume = 100 / compressionRatio;
    const adiabaticFactor = processSpeed / 100;

    const adiabaticTempRatio = Math.pow(compressionRatio, (gamma - 1) * adiabaticFactor);
    const newTemp = 300 * adiabaticTempRatio;

    const adiabaticPressureRatio = Math.pow(compressionRatio, gamma * adiabaticFactor);
    const isothermalPressureRatio = compressionRatio;
    const effectivePressureRatio = isothermalPressureRatio + (adiabaticPressureRatio - isothermalPressureRatio) * adiabaticFactor;

    setVolume(baseVolume);
    setTemperature(newTemp);
    setPressure(effectivePressureRatio);
    setShowHeatFlow(processSpeed < 50);

    setPvHistory(prev => {
      const newPoint = { p: effectivePressureRatio, v: baseVolume };
      const history = [...prev, newPoint].slice(-50);
      return history;
    });
  }, [compressionRatio, processSpeed]);

  const playSound = useCallback((soundType: 'correct' | 'incorrect' | 'complete' | 'transition' | 'compress') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const frequencies: Record<string, number[]> = {
        correct: [523, 659, 784],
        incorrect: [200, 150],
        complete: [523, 659, 784, 1047],
        transition: [440, 550],
        compress: [200, 300, 400, 300, 200]
      };

      const freqs = frequencies[soundType] || [440];
      oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      });

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not supported
    }
  }, []);

  const handlePredictionSelect = (prediction: string) => {
    setSelectedPrediction(prediction);
  };

  const confirmPrediction = () => {
    if (!selectedPrediction) return;
    setShowPredictionFeedback(true);
    const isCorrect = selectedPrediction === 'B';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect && onCorrectAnswer) onCorrectAnswer();
    if (!isCorrect && onIncorrectAnswer) onIncorrectAnswer();
  };

  const handleTwistPredictionSelect = (prediction: string) => {
    setTwistPrediction(prediction);
  };

  const confirmTwistPrediction = () => {
    if (!twistPrediction) return;
    setShowTwistFeedback(true);
    const isCorrect = twistPrediction === 'C';
    playSound(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect && onCorrectAnswer) onCorrectAnswer();
    if (!isCorrect && onIncorrectAnswer) onIncorrectAnswer();
  };

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setShowTestResults(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const handleAppComplete = (appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  };

  const testQuestions: TestQuestion[] = [
    {
      id: 1,
      scenario: "You use a bicycle pump to inflate a tire. After pumping vigorously, you notice the pump barrel feels hot.",
      question: "What is the primary cause of this heating?",
      options: [
        { id: 'a', text: 'Friction between the piston and barrel' },
        { id: 'b', text: 'Work done on the gas compresses it adiabatically, converting work to internal energy', correct: true },
        { id: 'c', text: 'Heat conducted from your hands' },
        { id: 'd', text: 'Chemical reactions in the air' }
      ],
      explanation: "When you compress air quickly, there's no time for heat to escape. The work you do on the gas increases its internal energy (and temperature) directly - this is adiabatic heating."
    },
    {
      id: 2,
      scenario: "A diesel engine compresses air with a compression ratio of 20:1 before fuel is injected.",
      question: "Why does this compression ignite the fuel without a spark plug?",
      options: [
        { id: 'a', text: 'The fuel is highly volatile' },
        { id: 'b', text: 'Friction generates sparks' },
        { id: 'c', text: 'Adiabatic compression raises air temperature above fuel ignition point (~500C)', correct: true },
        { id: 'd', text: 'Electric discharge from static buildup' }
      ],
      explanation: "In diesel engines, 20:1 compression raises air temperature to about 700-900C through adiabatic heating, exceeding diesel fuel's autoignition temperature."
    },
    {
      id: 3,
      scenario: "A weather balloon rises from sea level to high altitude.",
      question: "What happens to the air inside the balloon as it rises?",
      options: [
        { id: 'a', text: 'It heats up because it is closer to the sun' },
        { id: 'b', text: 'Temperature stays constant' },
        { id: 'c', text: 'It cools as it expands due to lower external pressure', correct: true },
        { id: 'd', text: 'The air inside doesn\'t change' }
      ],
      explanation: "As the balloon rises, external pressure drops. The air inside expands to equalize pressure, doing work on the balloon. This adiabatic expansion cools the gas."
    },
    {
      id: 4,
      scenario: "A scuba diver descends rapidly from the surface to 30 meters depth.",
      question: "What happens to air in the diver's buoyancy compensator (BC) during descent?",
      options: [
        { id: 'a', text: 'It expands and cools' },
        { id: 'b', text: 'It compresses and heats slightly', correct: true },
        { id: 'c', text: 'Temperature remains constant because water absorbs heat' },
        { id: 'd', text: 'Air liquefies under pressure' }
      ],
      explanation: "At 30m, pressure is 4 atm. Air in the BC compresses, and if fast enough, heats adiabatically."
    },
    {
      id: 5,
      scenario: "You're comparing slow compression and fast compression of the same amount of gas to the same final volume.",
      question: "Which process results in higher final pressure?",
      options: [
        { id: 'a', text: 'Slow compression (isothermal)' },
        { id: 'b', text: 'Fast compression (adiabatic)', correct: true },
        { id: 'c', text: 'Both give the same pressure' },
        { id: 'd', text: 'It depends on the type of gas' }
      ],
      explanation: "Adiabatic compression gives higher final pressure because temperature rises too. From PV = nRT, higher T at same V means higher P."
    },
    {
      id: 6,
      scenario: "Foehn winds occur when moist air rises over a mountain, loses moisture, then descends on the other side.",
      question: "Why are foehn winds warm and dry on the lee side?",
      options: [
        { id: 'a', text: 'The mountain absorbs moisture and releases heat' },
        { id: 'b', text: 'Rising air cools adiabatically (dropping rain), descending air heats adiabatically (now dry)', correct: true },
        { id: 'c', text: 'Friction with the mountain heats the air' },
        { id: 'd', text: 'The sun heats the lee side more' }
      ],
      explanation: "As moist air rises, it cools adiabatically (~6C/km when saturated). Water condenses. On descent, now-dry air warms faster (~10C/km)."
    },
    {
      id: 7,
      scenario: "A refrigerator uses a compressor to compress refrigerant gas.",
      question: "What role does adiabatic heating play in the refrigeration cycle?",
      options: [
        { id: 'a', text: 'It makes the refrigerator less efficient (waste heat)' },
        { id: 'b', text: 'Compression heats the refrigerant so it can reject heat to the room', correct: true },
        { id: 'c', text: 'It has no role - refrigerators work by magic' },
        { id: 'd', text: 'It cools the inside directly' }
      ],
      explanation: "Compressing refrigerant heats it above room temperature, allowing it to dump heat via the condenser coils."
    },
    {
      id: 8,
      scenario: "You open a pressurized can of compressed air used for cleaning electronics.",
      question: "Why does the can get cold when you use it?",
      options: [
        { id: 'a', text: 'The propellant is already cold' },
        { id: 'b', text: 'Chemical reactions absorb heat' },
        { id: 'c', text: 'Rapid expansion of gas cools it adiabatically', correct: true },
        { id: 'd', text: 'Evaporating liquid absorbs heat' }
      ],
      explanation: "As compressed gas escapes, it expands rapidly. This adiabatic expansion converts internal energy to kinetic energy, cooling the remaining gas."
    },
    {
      id: 9,
      scenario: "The First Law of Thermodynamics states: ΔU = Q - W",
      question: "For an adiabatic process (Q = 0), what determines the change in internal energy?",
      options: [
        { id: 'a', text: 'Temperature change' },
        { id: 'b', text: 'Pressure change' },
        { id: 'c', text: 'Work done on or by the gas (ΔU = -W)', correct: true },
        { id: 'd', text: 'Volume change' }
      ],
      explanation: "When Q = 0, the First Law becomes ΔU = -W. Compression (W < 0) increases internal energy; expansion (W > 0) decreases it."
    },
    {
      id: 10,
      scenario: "Two identical containers of ideal gas are compressed from V to V/2. One is insulated (adiabatic), the other is in contact with a heat bath (isothermal).",
      question: "Which process requires more work input?",
      options: [
        { id: 'a', text: 'Isothermal compression' },
        { id: 'b', text: 'Adiabatic compression', correct: true },
        { id: 'c', text: 'Both require the same work' },
        { id: 'd', text: 'Depends on the gas type' }
      ],
      explanation: "Adiabatic compression requires more work because the gas heats up, increasing pressure faster. The adiabatic curve is steeper on a PV diagram."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🚗",
      title: "Diesel Engines",
      short: "Diesel",
      tagline: "Compression ignition without spark plugs",
      description: "Diesel engines use extreme compression (15-25:1) to heat air above fuel's autoignition temperature.",
      connection: "Adiabatic compression raises air from ~300K to ~900K. At these temperatures, injected diesel fuel spontaneously combusts.",
      howItWorks: "Intake draws air. Compression heats air adiabatically. Fuel injection causes combustion. Power stroke extracts work.",
      stats: [
        { value: "20x", label: "Compression ratio" },
        { value: "45%", label: "Thermal efficiency" },
        { value: "25%", label: "Fuel savings vs gasoline" },
        { value: "300 billion gallons", label: "Annual diesel use" }
      ],
      examples: ["Heavy trucks", "Ships", "Construction equipment", "Some cars"],
      companies: ["Cummins", "Detroit Diesel", "MAN", "Volvo"],
      futureImpact: "Advanced diesel with exhaust treatment remains crucial for freight.",
      color: "from-amber-600 to-orange-600"
    },
    {
      icon: "🌤",
      title: "Weather Systems",
      short: "Weather",
      tagline: "Adiabatic processes drive atmospheric dynamics",
      description: "Rising and falling air parcels change temperature adiabatically, creating clouds and wind patterns.",
      connection: "Air rising cools at ~10C/km (dry) or ~6C/km (saturated). Cooling causes condensation; descent causes warming.",
      howItWorks: "Solar heating creates convection. Rising air expands and cools. Condensation forms clouds. Descending air warms.",
      stats: [
        { value: "10C/km", label: "Dry adiabatic rate" },
        { value: "6C/km", label: "Moist rate" },
        { value: "100%", label: "Cloud driver" },
        { value: "Global", label: "Scale" }
      ],
      examples: ["Mountain rainfall", "Foehn winds", "Thunderstorms", "Trade winds"],
      companies: ["NOAA", "Met Office", "ECMWF", "AccuWeather"],
      futureImpact: "Better understanding improves climate models and weather prediction.",
      color: "from-sky-600 to-blue-600"
    },
    {
      icon: "❄️",
      title: "Refrigeration",
      short: "Cooling",
      tagline: "Moving heat uphill with compression and expansion",
      description: "Refrigerators use adiabatic compression and expansion to move heat from cold to hot regions.",
      connection: "Compressing refrigerant heats it above ambient. Expanding it cools it below target temperature.",
      howItWorks: "Compressor raises pressure/temperature. Condenser rejects heat. Expansion valve cools refrigerant. Evaporator absorbs heat.",
      stats: [
        { value: "3-5", label: "COP" },
        { value: "300%+", label: "Efficiency" },
        { value: "20%", label: "Of electricity" },
        { value: "-40C", label: "Minimum" }
      ],
      examples: ["Refrigerators", "Air conditioning", "Heat pumps", "Industrial chillers"],
      companies: ["Carrier", "Daikin", "LG", "Trane"],
      futureImpact: "Heat pumps are 3-5x more efficient than electric heating.",
      color: "from-cyan-600 to-teal-600"
    },
    {
      icon: "🤿",
      title: "Scuba Diving",
      short: "Diving",
      tagline: "Pressure changes affect divers at depth",
      description: "Divers experience adiabatic effects when breathing compressed air and during pressure changes.",
      connection: "Rapidly filling tanks causes adiabatic heating. Gas expanding in regulators cools.",
      howItWorks: "Air is compressed into tanks (heating). At depth, regulators deliver air at ambient pressure. Ascending, dissolved gases expand.",
      stats: [
        { value: "4 atm", label: "At 30m" },
        { value: "200 bar", label: "Tank pressure" },
        { value: "18m/min", label: "Max ascent" },
        { value: "50C+", label: "Tank heat" }
      ],
      examples: ["Recreational diving", "Commercial diving", "Underwater construction", "Research diving"],
      companies: ["PADI", "Aqualung", "Scubapro", "Mares"],
      futureImpact: "Better understanding improves dive computers and decompression schedules.",
      color: "from-blue-600 to-indigo-600"
    }
  ];

  const renderPVDiagram = () => {
    const width = 320;
    const height = 220;
    const padding = 50;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: '350px', height: 'auto' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Adiabatic Heating visualization">
        <defs>
          <linearGradient id="pvBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="pvGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="curveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <g id="pv-background">
          <rect width={width} height={height} fill="url(#pvBg)" rx="8" />
        </g>

        {/* Grid lines */}
        <g id="pv-grid">
          {[1, 2, 3, 4].map(i => (
            <React.Fragment key={i}>
              <line x1={padding + i * 40} y1={padding} x2={padding + i * 40} y2={height - padding} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.5" />
              <line x1={padding} y1={padding + i * 25} x2={width - padding} y2={padding + i * 25} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.5" />
            </React.Fragment>
          ))}
        </g>

        {/* Axes */}
        <g id="pv-axes">
          <line x1={padding} y1={padding} x2={padding} y2={height - padding + 10} stroke="#64748b" strokeWidth="2" />
          <line x1={padding - 10} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#64748b" strokeWidth="2" />
          <text x={padding - 5} y={padding - 10} fill="#e2e8f0" fontSize="11" textAnchor="middle">Pressure (atm)</text>
          <text x={width - padding + 10} y={height - padding + 5} fill="#e2e8f0" fontSize="11">Volume (%)</text>
          <text x={padding - 15} y={padding + 10} fill="#e2e8f0" fontSize="11">High</text>
          <text x={padding - 15} y={height - padding - 5} fill="#e2e8f0" fontSize="11">Low</text>
        </g>

        {/* Reference curves */}
        <g id="pv-curves" filter="url(#curveGlow)">
          <path
            d={`M${padding + 160},${padding + 10} Q${padding + 100},${padding + 50} ${padding + 20},${padding + 100}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4 2"
            opacity="0.5"
          />
          <path
            d={`M${padding + 160},${padding + 5} Q${padding + 90},${padding + 35} ${padding + 20},${padding + 100}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
        </g>

        {/* Legend */}
        <g id="pv-legend">
          <text x={padding + 165} y={padding + 20} fill="#3b82f6" fontSize="11" opacity="0.7">Isothermal</text>
          <text x={padding + 165} y={padding + 5} fill="#ef4444" fontSize="11">Adiabatic</text>
        </g>

        {/* Current state indicator */}
        <g id="pv-state" filter="url(#pvGlow)">
          <circle
            cx={padding + (100 - volume) * 1.6 + 20}
            cy={padding + 100 - pressure * 9}
            r="6"
            fill={processSpeed > 50 ? '#ef4444' : '#3b82f6'}
            stroke="white"
            strokeWidth="2"
          />
          <text x={padding + (100 - volume) * 1.6 + 30} y={padding + 100 - pressure * 9 + 4} fill="#e2e8f0" fontSize="11">State</text>
        </g>

        {/* History path */}
        <g id="pv-history">
          {pvHistory.length > 1 && (
            <path
              d={`M${pvHistory.map((pt, i) =>
                `${i === 0 ? '' : 'L'}${padding + (100 - pt.v) * 1.6 + 20},${padding + 100 - pt.p * 9}`
              ).join(' ')}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth="1.5"
              opacity="0.7"
            />
          )}
        </g>
      </svg>
    );
  };

  const renderPistonVisualization = () => {
    const containerWidth = 50 + (volume / 100) * 200;
    const tempColor = temperature < 350 ? '#3b82f6' : temperature < 500 ? '#f59e0b' : '#ef4444';

    return (
      <svg viewBox="0 0 320 200" style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="piston" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="cylinder" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="gasGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tempColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={tempColor} stopOpacity="0.1" />
          </linearGradient>
          <filter id="moleculeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pistonShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Background */}
        <g id="background-layer">
          <rect width="320" height="200" fill="#020617" rx="8" />
        </g>

        {/* Cylinder container */}
        <g id="cylinder-layer">
          <rect x="40" y="40" width="230" height="120" fill="url(#cylinder)" stroke="#475569" strokeWidth="2" rx="4" />
          <text x="45" y="170" fill="#e2e8f0" fontSize="11">Cylinder</text>
        </g>

        {/* Gas region */}
        <g id="gas-layer">
          <rect
            x="45"
            y="45"
            width={containerWidth - 45}
            height="110"
            fill="url(#gasGlow)"
            rx="2"
          />
          <text x={50 + (containerWidth - 50) / 2} y="175" fill={tempColor} fontSize="11" textAnchor="middle">Gas</text>
        </g>

        {/* Molecules with glow effect */}
        <g id="molecules-layer" filter="url(#moleculeGlow)">
          {molecules.map((mol, i) => (
            <circle
              key={i}
              cx={Math.min(mol.x, containerWidth - 5)}
              cy={mol.y}
              r="4"
              fill={tempColor}
              opacity="0.9"
            />
          ))}
        </g>

        {/* Piston */}
        <g id="piston-layer" filter="url(#pistonShadow)">
          <rect
            x={containerWidth - 5}
            y="43"
            width="20"
            height="114"
            fill="url(#piston)"
            stroke="#64748b"
            strokeWidth="1"
            rx="2"
          />
          <text x={containerWidth + 5} y="175" fill="#e2e8f0" fontSize="11" textAnchor="middle">Piston</text>
        </g>

        {/* Piston rod */}
        <g id="rod-layer">
          <rect
            x={containerWidth + 15}
            y="90"
            width={280 - containerWidth}
            height="20"
            fill="#64748b"
            rx="2"
          />
        </g>

        {/* Heat flow indicators */}
        {showHeatFlow && (
          <g id="heat-flow-layer">
            <path d="M160,165 L160,185" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#heatArrow)" />
            <path d="M180,165 L180,185" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#heatArrow)" />
            <text x="170" y="198" fill="#3b82f6" fontSize="11" textAnchor="middle">Heat escapes</text>
            <defs>
              <marker id="heatArrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
              </marker>
            </defs>
          </g>
        )}

        {/* Legend/Labels */}
        <g id="legend-layer">
          <text x="160" y="18" fill="#e2e8f0" fontSize="12" textAnchor="middle" fontWeight="600">
            {processSpeed > 50 ? 'Fast (Adiabatic)' : 'Slow (Isothermal)'}
          </text>
          <circle cx="280" cy="50" r="6" fill={tempColor} />
          <text x="280" y="65" fill="#e2e8f0" fontSize="11" textAnchor="middle">Molecule</text>
        </g>
      </svg>
    );
  };

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '80px 16px 24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#ef4444', letterSpacing: '0.05em' }}>THERMODYNAMICS</span>
      </div>

      <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 700, marginBottom: '16px', background: 'linear-gradient(to right, #ffffff, #fca5a5, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Adiabatic Heating
      </h1>
      <p style={{ fontSize: '18px', color: '#e2e8f0', maxWidth: '400px', marginBottom: '32px' }}>
        Can squeezing air change temperature without <span style={{ color: '#ef4444', fontWeight: 600 }}>"adding heat"</span>?
      </p>

      <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))', borderRadius: '24px', padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid rgba(71, 85, 105, 0.5)', marginBottom: '32px' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
          Pump up a bicycle tire and the <span style={{ color: '#ef4444' }}>pump gets HOT</span> - but you're not adding any heat source!
        </p>
        <p style={{ fontSize: '14px', color: '#cbd5e1' }}>
          Where does this heat come from? And why do diesel engines ignite fuel just by squeezing air?
        </p>
      </div>

      <div style={{
        background: 'rgba(239, 68, 68, 0.2)',
        padding: '16px',
        borderRadius: '8px',
        borderLeft: '3px solid #ef4444',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
          Click "Start Discovery" below to discover the physics!
        </p>
      </div>

      <button
        onClick={nextPhase}
        style={{
          marginTop: '24px',
          padding: '16px 32px',
          minHeight: '44px',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          fontWeight: 700,
          fontSize: '16px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Start Discovery
      </button>
    </div>
  );

  // Static SVG for predict phase
  const renderPredictDiagram = () => (
    <svg viewBox="0 0 300 180" style={{ width: '100%', maxWidth: '320px', height: 'auto', display: 'block', margin: '0 auto' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="predictCylinder" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="predictPiston" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      <rect width="300" height="180" fill="#0f172a" rx="8" />

      {/* Cylinder */}
      <rect x="30" y="40" width="180" height="100" fill="url(#predictCylinder)" stroke="#475569" strokeWidth="2" rx="4" />

      {/* Gas molecules (blue for cold) */}
      {[
        { cx: 60, cy: 70 }, { cx: 90, cy: 60 }, { cx: 120, cy: 80 },
        { cx: 70, cy: 100 }, { cx: 100, cy: 110 }, { cx: 130, cy: 90 },
        { cx: 80, cy: 75 }, { cx: 110, cy: 95 }, { cx: 55, cy: 115 }
      ].map((mol, i) => (
        <circle key={i} cx={mol.cx} cy={mol.cy} r="5" fill="#3b82f6" opacity="0.8" />
      ))}

      {/* Piston */}
      <rect x="150" y="43" width="20" height="94" fill="url(#predictPiston)" stroke="#64748b" strokeWidth="1" rx="2" />

      {/* Arrow showing compression */}
      <path d="M200,90 L170,90" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowRed)" />
      <defs>
        <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
        </marker>
      </defs>

      {/* Label: Compress */}
      <text x="220" y="80" fill="#ef4444" fontSize="11" fontWeight="600">Compress</text>
      <text x="220" y="95" fill="#e2e8f0" fontSize="11">rapidly</text>

      {/* Insulation symbols */}
      <text x="30" y="160" fill="#cbd5e1" fontSize="11">Insulated (Q = 0)</text>

      {/* Question mark */}
      <text x="90" y="30" fill="#f59e0b" fontSize="14" fontWeight="700">Temperature = ?</text>
    </svg>
  );

  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 24px' }}>
      <div style={{ marginBottom: '16px', color: '#e2e8f0', fontSize: '14px' }}>Step 2 of 10</div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>

      {/* Static SVG diagram */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '20px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        {renderPredictDiagram()}
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
          You rapidly compress a gas to half its volume in an insulated container (no heat can enter or leave).
        </p>
        <p style={{ fontSize: '16px', color: '#ef4444', fontWeight: 500 }}>
          What happens to the temperature of the gas?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'Temperature stays the same (no heat added)' },
          { id: 'B', text: 'Temperature increases (work converts to internal energy)' },
          { id: 'C', text: 'Temperature decreases (compression cools things)' },
          { id: 'D', text: 'Temperature becomes undefined (gas liquefies)' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePredictionSelect(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              minHeight: '44px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              background: showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showPredictionFeedback && option.id === 'B'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : selectedPrediction === option.id
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(51, 65, 85, 0.5)',
              border: showPredictionFeedback && (selectedPrediction === option.id || option.id === 'B')
                ? option.id === 'B' ? '2px solid #22c55e' : '2px solid #ef4444'
                : selectedPrediction === option.id
                  ? '2px solid #3b82f6'
                  : '2px solid transparent',
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {/* Confirm button - shown when an option is selected but not yet confirmed */}
      {selectedPrediction && !showPredictionFeedback && (
        <button
          onClick={confirmPrediction}
          style={{
            marginTop: '24px',
            padding: '16px 32px',
            minHeight: '44px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            fontWeight: 700,
            fontSize: '16px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Confirm Answer
        </button>
      )}

      {showPredictionFeedback && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '500px' }}>
          <p style={{ color: '#22c55e', fontWeight: 600 }}>
            {selectedPrediction === 'B' ? 'Correct!' : 'Surprising!'} Temperature INCREASES!
          </p>
          <p style={{ color: '#cbd5e1', fontSize: '14px', marginTop: '8px' }}>
            From the First Law: ΔU = Q - W. With Q = 0 (adiabatic) and W &lt; 0 (work done ON gas), we get ΔU &gt; 0. More internal energy means higher temperature!
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Adiabatic Lab</h2>
      <p style={{ color: '#e2e8f0', marginBottom: '16px' }}>Explore compression and expansion with PV diagrams</p>

      {/* Observation guidance */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '12px',
        padding: '12px 20px',
        marginBottom: '24px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        maxWidth: '700px',
        width: '100%'
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>
          <strong>What to observe:</strong> Adjust the sliders to see how compression ratio and process speed affect temperature. Watch the PV diagram trace your path!
        </p>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px', width: '100%' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
              {renderPVDiagram()}
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
              {renderPistonVisualization()}
            </div>
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Compression Ratio</span>
                <span style={{ height: '20px', color: '#ef4444', fontWeight: 700 }}>{compressionRatio}:1</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={compressionRatio}
                onChange={(e) => setCompressionRatio(Number(e.target.value))}
                style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#ef4444' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>1:1</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>10:1</span>
              </div>
            </div>

            <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Process Speed</span>
                <span style={{ color: processSpeed > 50 ? '#ef4444' : '#3b82f6', fontWeight: 700 }}>
                  {processSpeed > 50 ? 'Fast (Adiabatic)' : 'Slow (Isothermal)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={processSpeed}
                onChange={(e) => setProcessSpeed(Number(e.target.value))}
                style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: processSpeed > 50 ? '#ef4444' : '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Slow (Isothermal)</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Fast (Adiabatic)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '24px' }}>{temperature.toFixed(0)} K</div>
          <div style={{ color: '#cbd5e1', fontSize: '12px' }}>Temperature</div>
        </div>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '24px' }}>{pressure.toFixed(1)} atm</div>
          <div style={{ color: '#cbd5e1', fontSize: '12px' }}>Pressure</div>
        </div>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '24px' }}>{volume.toFixed(0)}%</div>
          <div style={{ color: '#cbd5e1', fontSize: '12px' }}>Volume</div>
        </div>
      </div>
        </div>
      </div>

      {/* Key formula */}
      <div style={{
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        maxWidth: '500px',
        width: '100%',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Adiabatic Process Formula</p>
        <div style={{ fontFamily: 'monospace', fontSize: '20px', color: 'white', marginBottom: '8px' }}>
          PV^&#947; = constant
        </div>
        <p style={{ color: '#e2e8f0', fontSize: '13px', margin: 0 }}>
          An adiabatic process is defined as a thermodynamic process where no heat is exchanged with the surroundings (Q = 0). The relationship between pressure and volume follows PV^&#947; = constant, where &#947; is the ratio of specific heats (&#947; = 1.4 for air). Temperature varies as T&#8321;V&#8321;^(&#947;-1) = T&#8322;V&#8322;^(&#947;-1).
        </p>
      </div>

      {/* Real-world relevance */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <p style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Real-World Connection</p>
        <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>
          This is exactly how diesel engines work! They compress air to 20:1 ratio, heating it to over 500C - hot enough to ignite fuel without a spark plug. Refrigerators use the reverse: adiabatic expansion to cool.
        </p>
      </div>
    </div>
  );

  // Review phase SVG diagram
  const renderReviewDiagram = () => (
    <svg viewBox="0 0 320 160" style={{ width: '100%', maxWidth: '350px', height: 'auto', display: 'block', margin: '0 auto 16px' }} preserveAspectRatio="xMidYMid meet">
      <rect width="320" height="160" fill="#0f172a" rx="8" />

      {/* PV Diagram axes */}
      <line x1="50" y1="20" x2="50" y2="130" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="50" y1="130" x2="280" y2="130" stroke="#e2e8f0" strokeWidth="2" />

      {/* Axis labels */}
      <text x="30" y="75" fill="#e2e8f0" fontSize="12" fontWeight="600">P</text>
      <text x="165" y="150" fill="#e2e8f0" fontSize="12" fontWeight="600">V</text>

      {/* Isothermal curve (blue, dashed) */}
      <path d="M80,40 Q140,60 250,110" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" />
      <text x="255" y="105" fill="#3b82f6" fontSize="11">Isothermal</text>

      {/* Adiabatic curve (red, solid) */}
      <path d="M80,30 Q130,50 250,115" fill="none" stroke="#ef4444" strokeWidth="3" />
      <text x="255" y="120" fill="#ef4444" fontSize="11">Adiabatic</text>

      {/* Start point */}
      <circle cx="80" cy="35" r="5" fill="#f59e0b" />
      <text x="65" y="28" fill="#f59e0b" fontSize="11">Start</text>

      {/* End points */}
      <circle cx="250" cy="112" r="4" fill="#3b82f6" />
      <circle cx="250" cy="117" r="4" fill="#ef4444" />

      {/* Key insight */}
      <text x="160" y="15" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">Adiabatic = Steeper curve = Higher final P</text>
    </svg>
  );

  const renderReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Why Adiabatic Heating Works</h2>

      {/* Reference user's prediction - always show even without selection */}
      <div style={{
        background: selectedPrediction === 'B' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        border: selectedPrediction === 'B' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
        width: '100%',
        maxWidth: '600px'
      }}>
        <p style={{ color: selectedPrediction === 'B' ? '#22c55e' : '#f59e0b', fontWeight: 600, marginBottom: '8px' }}>
          {selectedPrediction === 'B' ? 'Your prediction was correct!' : selectedPrediction ? 'Your prediction helped you learn!' : 'What you observed in the experiment'}
        </p>
        <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0 }}>
          {selectedPrediction ? (
            <>
              You predicted that temperature would {selectedPrediction === 'A' ? 'stay the same' : selectedPrediction === 'B' ? 'increase' : selectedPrediction === 'C' ? 'decrease' : 'cause liquefaction'}.
              {selectedPrediction === 'B'
                ? ' Indeed, when work is done on the gas with no heat exchange, all energy converts to internal energy, raising temperature!'
                : ' The key insight is that work done ON the gas increases its internal energy when heat cannot escape.'}
            </>
          ) : (
            'As you observed, compressing gas rapidly causes its temperature to rise. This is because work done on the gas converts directly to internal energy.'
          )}
        </p>
      </div>

      {/* SVG Diagram */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', width: '100%', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        {renderReviewDiagram()}
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <h3 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '12px' }}>First Law of Thermodynamics</h3>
        <div style={{ fontFamily: 'monospace', fontSize: '24px', color: 'white', marginBottom: '12px' }}>
          ΔU = Q - W
        </div>
        <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
          Change in internal energy = Heat added - Work done by gas
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', width: '100%', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '12px' }}>Adiabatic (Q = 0)</h3>
          <div style={{ fontFamily: 'monospace', color: 'white', marginBottom: '12px' }}>ΔU = -W</div>
          <ul style={{ color: '#e2e8f0', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>No heat exchange (fast or insulated)</li>
            <li style={{ marginBottom: '8px' }}>Compression: Temperature RISES</li>
            <li>Expansion: Temperature FALLS</li>
          </ul>
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <h3 style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '12px' }}>Isothermal (ΔT = 0)</h3>
          <div style={{ fontFamily: 'monospace', color: 'white', marginBottom: '12px' }}>Q = W</div>
          <ul style={{ color: '#e2e8f0', fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>Heat flows in/out as needed</li>
            <li style={{ marginBottom: '8px' }}>ΔU = 0 (constant temperature)</li>
            <li>Requires slow process for heat transfer</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Twist predict SVG diagram
  const renderTwistPredictDiagram = () => (
    <svg viewBox="0 0 320 140" style={{ width: '100%', maxWidth: '350px', height: 'auto', display: 'block', margin: '0 auto' }} preserveAspectRatio="xMidYMid meet">
      <rect width="320" height="140" fill="#0f172a" rx="8" />

      {/* Fast compression (left) */}
      <rect x="20" y="30" width="120" height="80" fill="#1e293b" stroke="#ef4444" strokeWidth="2" rx="4" />
      <text x="80" y="22" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="600">FAST</text>

      {/* Molecules moving fast */}
      {[{ cx: 45, cy: 60 }, { cx: 70, cy: 55 }, { cx: 95, cy: 70 }, { cx: 55, cy: 85 }, { cx: 85, cy: 80 }].map((m, i) => (
        <circle key={i} cx={m.cx} cy={m.cy} r="6" fill="#ef4444" opacity="0.9" />
      ))}
      <text x="80" y="125" textAnchor="middle" fill="#ef4444" fontSize="11">T = HIGH</text>

      {/* Slow compression (right) */}
      <rect x="180" y="30" width="120" height="80" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" rx="4" />
      <text x="240" y="22" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="600">SLOW</text>

      {/* Molecules moving slow */}
      {[{ cx: 205, cy: 60 }, { cx: 230, cy: 55 }, { cx: 255, cy: 70 }, { cx: 215, cy: 85 }, { cx: 245, cy: 80 }].map((m, i) => (
        <circle key={i} cx={m.cx} cy={m.cy} r="5" fill="#3b82f6" opacity="0.8" />
      ))}
      <text x="240" y="125" textAnchor="middle" fill="#3b82f6" fontSize="11">T = LOW</text>

      {/* Heat arrows for slow side */}
      <path d="M300,55 L310,55" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowBlue)" />
      <path d="M300,85 L310,85" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowBlue)" />
      <defs>
        <marker id="arrowBlue" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
        </marker>
      </defs>

      {/* VS label */}
      <text x="160" y="75" textAnchor="middle" fill="#f59e0b" fontSize="14" fontWeight="700">VS</text>
    </svg>
  );

  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 24px' }}>
      <div style={{ marginBottom: '16px', color: '#e2e8f0', fontSize: '14px' }}>Step 5 of 10</div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>The Twist: Speed Matters!</h2>

      {/* SVG Diagram */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        {renderTwistPredictDiagram()}
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '600px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <p style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>
          You compress gas to half volume two different ways: very fast and very slow.
        </p>
        <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: 500 }}>
          How do the final temperatures compare?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
        {[
          { id: 'A', text: 'Same final temperature (same compression)' },
          { id: 'B', text: 'Slow compression gives higher temperature (more time to heat)' },
          { id: 'C', text: 'Fast compression gives higher temperature (heat can\'t escape)' },
          { id: 'D', text: 'Temperature depends on gas type, not speed' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPredictionSelect(option.id)}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              minHeight: '44px',
              borderRadius: '12px',
              textAlign: 'left',
              transition: 'all 0.3s',
              background: showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                : showTwistFeedback && option.id === 'C'
                  ? 'rgba(34, 197, 94, 0.3)'
                  : twistPrediction === option.id
                    ? 'rgba(139, 92, 246, 0.3)'
                    : 'rgba(51, 65, 85, 0.5)',
              border: showTwistFeedback && (twistPrediction === option.id || option.id === 'C')
                ? option.id === 'C' ? '2px solid #22c55e' : '2px solid #ef4444'
                : twistPrediction === option.id
                  ? '2px solid #8b5cf6'
                  : '2px solid transparent',
              cursor: showTwistFeedback ? 'default' : 'pointer',
              color: '#e2e8f0'
            }}
          >
            <span style={{ fontWeight: 700, color: 'white' }}>{option.id}.</span>
            <span style={{ marginLeft: '8px' }}>{option.text}</span>
          </button>
        ))}
      </div>

      {/* Confirm button - shown when an option is selected but not yet confirmed */}
      {twistPrediction && !showTwistFeedback && (
        <button
          onClick={confirmTwistPrediction}
          style={{
            marginTop: '24px',
            padding: '16px 32px',
            minHeight: '44px',
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: 'white',
            fontWeight: 700,
            fontSize: '16px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Confirm Answer
        </button>
      )}

      {showTwistFeedback && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '500px' }}>
          <p style={{ color: '#22c55e', fontWeight: 600 }}>
            {twistPrediction === 'C' ? 'Exactly!' : 'That\'s the key insight!'} Fast = Hotter!
          </p>
          <p style={{ color: '#cbd5e1', fontSize: '14px', marginTop: '8px' }}>
            Fast compression is adiabatic - all work becomes internal energy. Slow compression allows heat to leak out to surroundings.
          </p>
        </div>
      )}
    </div>
  );

  // Twist play visualization comparing fast vs slow compression
  const renderTwistPlayVisualization = () => {
    const fastTemp = 300 * Math.pow(compressionRatio, 0.4); // Adiabatic
    const slowTemp = 300; // Isothermal stays constant
    const fastTempColor = fastTemp < 350 ? '#3b82f6' : fastTemp < 500 ? '#f59e0b' : '#ef4444';

    return (
      <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '450px', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="twistBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#twistBg)" rx="8" />

        {/* Fast compression side */}
        <text x="100" y="25" fill="#ef4444" fontSize="14" fontWeight="600" textAnchor="middle">FAST (Adiabatic)</text>
        <rect x="40" y="40" width={80 / compressionRatio + 40} height="60" fill={fastTempColor} opacity="0.3" stroke="#ef4444" strokeWidth="2" rx="4" />
        {[...Array(8)].map((_, i) => (
          <circle
            key={`fast-${i}`}
            cx={50 + (i % 4) * (20 / compressionRatio)}
            cy={55 + Math.floor(i / 4) * 25}
            r="5"
            fill={fastTempColor}
          />
        ))}
        <text x="100" y="120" fill="#e2e8f0" fontSize="11" textAnchor="middle">T = {fastTemp.toFixed(0)} K</text>
        <text x="100" y="135" fill="#ef4444" fontSize="11" textAnchor="middle">Heat trapped</text>

        {/* Slow compression side */}
        <text x="300" y="25" fill="#3b82f6" fontSize="14" fontWeight="600" textAnchor="middle">SLOW (Isothermal)</text>
        <rect x="240" y="40" width={80 / compressionRatio + 40} height="60" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="2" rx="4" />
        {[...Array(8)].map((_, i) => (
          <circle
            key={`slow-${i}`}
            cx={250 + (i % 4) * (20 / compressionRatio)}
            cy={55 + Math.floor(i / 4) * 25}
            r="5"
            fill="#3b82f6"
          />
        ))}
        <text x="300" y="120" fill="#e2e8f0" fontSize="11" textAnchor="middle">T = {slowTemp} K</text>
        <text x="300" y="135" fill="#3b82f6" fontSize="11" textAnchor="middle">Heat escapes</text>

        {/* Heat arrows for slow side */}
        <path d="M340,55 L360,55" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#heatArrow2)" />
        <path d="M340,75 L360,75" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#heatArrow2)" />
        <defs>
          <marker id="heatArrow2" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Comparison */}
        <text x="200" y="165" fill="#f59e0b" fontSize="12" fontWeight="600" textAnchor="middle">
          {compressionRatio > 1 ? `Fast is ${(fastTemp - slowTemp).toFixed(0)}K hotter!` : 'Adjust compression ratio'}
        </text>
        <text x="200" y="185" fill="#e2e8f0" fontSize="11" textAnchor="middle">
          Same compression, different final states
        </text>
      </svg>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>Fast vs Slow Compression Lab</h2>
      <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>See how speed affects the final state</p>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {/* Interactive SVG visualization */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '24px', width: '100%', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            {renderTwistPlayVisualization()}
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Compression ratio slider */}
          <div style={{ width: '100%', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(51, 65, 85, 0.5)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Compression Ratio</span>
                <span style={{ height: '20px', color: '#8b5cf6', fontWeight: 700 }}>{compressionRatio}:1</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={compressionRatio}
                onChange={(e) => setCompressionRatio(Number(e.target.value))}
                style={{ touchAction: 'pan-y', width: '100%', accentColor: '#8b5cf6' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', width: '100%', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>Fast (Adiabatic)</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#e2e8f0' }}>Heat transfer:</span>
              <span style={{ color: '#ef4444' }}>Q = 0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#e2e8f0' }}>Temperature:</span>
              <span style={{ color: '#ef4444' }}>RISES</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#e2e8f0' }}>Final pressure:</span>
              <span style={{ color: '#ef4444' }}>Higher</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <h3 style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '12px', textAlign: 'center' }}>Slow (Isothermal)</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#e2e8f0' }}>Heat transfer:</span>
              <span style={{ color: '#3b82f6' }}>Q = W (escapes)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#e2e8f0' }}>Temperature:</span>
              <span style={{ color: '#3b82f6' }}>CONSTANT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#e2e8f0' }}>Final pressure:</span>
              <span style={{ color: '#3b82f6' }}>Lower</span>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );

  // Twist review SVG diagram
  const renderTwistReviewDiagram = () => (
    <svg viewBox="0 0 320 120" style={{ width: '100%', maxWidth: '350px', height: 'auto', display: 'block', margin: '0 auto 16px' }} preserveAspectRatio="xMidYMid meet">
      <rect width="320" height="120" fill="#0f172a" rx="8" />

      {/* Energy flow diagram */}
      <text x="160" y="18" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">Energy Conservation</text>

      {/* Work arrow */}
      <rect x="30" y="45" width="60" height="30" fill="#f59e0b" rx="4" />
      <text x="60" y="65" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">WORK</text>

      {/* Arrow to internal energy */}
      <path d="M95,60 L130,60" stroke="#e2e8f0" strokeWidth="2" markerEnd="url(#arrowWhite)" />
      <defs>
        <marker id="arrowWhite" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <path d="M0,0 L0,4 L6,2 z" fill="#e2e8f0" />
        </marker>
      </defs>

      {/* Internal energy box */}
      <rect x="135" y="35" width="70" height="50" fill="#8b5cf6" rx="4" />
      <text x="170" y="55" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Internal</text>
      <text x="170" y="70" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Energy</text>

      {/* Heat escape arrow */}
      <path d="M210,60 L245,60" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,2" markerEnd="url(#arrowBlue2)" />
      <defs>
        <marker id="arrowBlue2" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <path d="M0,0 L0,4 L6,2 z" fill="#3b82f6" />
        </marker>
      </defs>

      {/* Heat escape label */}
      <rect x="250" y="45" width="60" height="30" fill="#3b82f6" rx="4" />
      <text x="280" y="65" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">HEAT</text>

      {/* Labels */}
      <text x="170" y="105" textAnchor="middle" fill="#ef4444" fontSize="11">Fast: No heat escape = Hot</text>
    </svg>
  );

  const renderTwistReview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 24px', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '24px' }}>Key Discovery</h2>

      {/* SVG Diagram */}
      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', width: '100%', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        {renderTwistReviewDiagram()}
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(239, 68, 68, 0.1))', borderRadius: '16px', padding: '24px', width: '100%', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <h3 style={{ color: 'white', fontWeight: 700, fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>
          Heat Leakage Changes Everything
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>⚡</div>
            <div>
              <p style={{ color: '#ef4444', fontWeight: 600 }}>Fast Compression</p>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>No time for heat to escape → All work becomes internal energy → Hot!</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '32px' }}>🐌</div>
            <div>
              <p style={{ color: '#3b82f6', fontWeight: 600 }}>Slow Compression</p>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>Heat escapes as fast as it's generated → Temperature stays constant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Real-World Applications</h2>
      <p style={{ color: '#e2e8f0', marginBottom: '16px' }}>Adiabatic processes power modern technology</p>

      {/* Progress indicator */}
      <div style={{ marginBottom: '24px', color: '#e2e8f0', fontSize: '14px' }}>
        Application {activeAppTab + 1} of {transferApps.length}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {transferApps.map((app, index) => (
          <button
            key={index}
            onClick={() => {
              setActiveAppTab(index);
              setCompletedApps(prev => new Set([...prev, index]));
            }}
            style={{
              padding: '8px 16px',
              minHeight: '44px',
              borderRadius: '8px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: activeAppTab === index
                ? 'linear-gradient(to right, #ef4444, #dc2626)'
                : completedApps.has(index)
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(51, 65, 85, 0.5)',
              color: 'white',
              transition: 'all 0.3s'
            }}
          >
            {app.icon} {isMobile ? app.short : app.title}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px' }}>{transferApps[activeAppTab].icon}</span>
          <div>
            <h3 style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>{transferApps[activeAppTab].title}</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '14px' }}>{transferApps[activeAppTab].description}</p>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Physics Connection</h4>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>{transferApps[activeAppTab].connection}</p>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>How It Works</h4>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>{transferApps[activeAppTab].howItWorks}</p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '16px' }}>{stat.value}</div>
              <div style={{ color: '#cbd5e1', fontSize: '11px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Companies */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Key Companies &amp; Organizations</h4>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>{transferApps[activeAppTab].companies.join(', ')}</p>
        </div>

        {/* Examples */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Real-World Examples</h4>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>{transferApps[activeAppTab].examples.join(', ')}</p>
        </div>

        {/* Future Impact */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>Future Impact</h4>
          <p style={{ color: '#cbd5e1', fontSize: '13px' }}>{transferApps[activeAppTab].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ width: '100%', padding: '12px', minHeight: '44px', background: 'linear-gradient(to right, #ef4444, #dc2626)', color: 'white', fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Got It
          </button>
        )}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Progress:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {transferApps.map((_, i) => (
            <div
              key={i}
              style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#22c55e' : '#475569' }}
            />
          ))}
        </div>
        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{completedApps.size}/{transferApps.length}</span>
      </div>
    </div>
  );

  const renderTest = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px 24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '24px' }}>Knowledge Test</h2>

      {!showTestResults ? (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {testQuestions.map((q, qIndex) => (
            <div key={q.id} style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
              {/* Question number header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '14px' }}>Question {qIndex + 1} of {testQuestions.length}</span>
                <span style={{ color: '#e2e8f0', fontSize: '12px' }}>Q{qIndex + 1}</span>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <p style={{ color: '#cbd5e1', fontSize: '13px', fontStyle: 'italic' }}>{q.scenario}</p>
              </div>
              <p style={{ color: 'white', fontWeight: 500, marginBottom: '12px' }}>{q.question}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((opt, oIndex) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{
                      padding: '12px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      background: testAnswers[qIndex] === oIndex ? 'rgba(239, 68, 68, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                      color: '#e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={submitTest}
            style={{
              width: '100%',
              padding: '16px',
              minHeight: '44px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(to right, #ef4444, #dc2626)',
              color: 'white',
              marginTop: '16px'
            }}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{testScore >= 8 ? '🎉' : '📚'}</div>
            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
              Score: {testScore}/10
            </h3>
            <p style={{ color: '#e2e8f0' }}>
              {testScore >= 8 ? 'Excellent! You understand adiabatic processes!' : 'Keep learning! Review and try again.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testQuestions.map((q, i) => {
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={q.id} style={{ padding: '16px', borderRadius: '12px', background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: isCorrect ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p style={{ color: '#e2e8f0', fontSize: '13px', marginBottom: '8px' }}>{i + 1}. {q.question}</p>
                  <p style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 500, fontSize: '14px' }}>
                    {isCorrect ? 'Correct!' : `Incorrect. Correct: ${q.options.find(o => o.correct)?.text}`}
                  </p>
                  <p style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '8px' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))', borderRadius: '24px', padding: '32px', maxWidth: '500px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔥</div>
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Thermodynamics Master!</h1>
        <p style={{ color: '#e2e8f0', fontSize: '16px', marginBottom: '24px' }}>
          You've mastered adiabatic heating and the First Law of Thermodynamics!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>PV Diagrams</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Mastered</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>Adiabatic</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Processes</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚗</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>Diesel Engines</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Understood</p>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>❄️</div>
            <p style={{ color: '#e2e8f0', fontSize: '12px' }}>Refrigeration</p>
            <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>Cycles</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'rgba(30, 41, 59, 0.8)',
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((validPhases.indexOf(currentPhase) + 1) / validPhases.length) * 100}%`,
        background: 'linear-gradient(90deg, #ef4444, #22c55e)',
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
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: currentPhase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(currentPhase) >= i ? '#ef4444' : '#475569',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'sticky',
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
      <button
        onClick={prevPhase}
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: '1px solid rgba(71, 85, 105, 0.5)',
          background: 'transparent',
          color: '#e2e8f0',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Back
      </button>
      <button
        onClick={nextPhase}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#64748b',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Phase routing
  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 'hook':
        return renderHook();
      case 'predict':
        return renderPredict();
      case 'play':
        return renderPlay();
      case 'review':
        return renderReview();
      case 'twist_predict':
        return renderTwistPredict();
      case 'twist_play':
        return renderTwistPlay();
      case 'twist_review':
        return renderTwistReview();
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Adiabatic Heating"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer':
        return renderTransfer();
      case 'test':
        return renderTest();
      case 'mastery':
        return renderMastery();
      default:
        return renderHook();
    }
  };

  const getButtonText = () => {
    switch (currentPhase) {
      case 'hook': return 'Make a Prediction';
      case 'predict': return 'Test My Prediction';
      case 'play': return 'Continue to Review';
      case 'review': return 'Next: A Twist!';
      case 'twist_predict': return 'Test My Prediction';
      case 'twist_play': return 'See the Explanation';
      case 'twist_review': return 'Apply This Knowledge';
      case 'transfer': return 'Take the Test';
      case 'test': return showTestResults ? (testScore >= 8 ? 'Complete Mastery' : 'Review & Retry') : 'Submit Test';
      case 'mastery': return 'Complete Game';
      default: return 'Continue';
    }
  };

  const canProceed = () => {
    switch (currentPhase) {
      case 'predict': return !!selectedPrediction;
      case 'twist_predict': return !!twistPrediction;
      case 'transfer': return completedApps.size >= 1;
      case 'test': return showTestResults ? testScore >= 8 : !testAnswers.includes(null);
      default: return true;
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1a', lineHeight: 1.6 }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        {renderPhaseContent()}
        {renderNavDots()}
      </div>
      {renderBottomBar(canProceed(), getButtonText())}
    </div>
  );
};

export default AdiabaticHeatingRenderer;
