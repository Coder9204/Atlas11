import React, { useState, useEffect, useCallback, useRef } from 'react';

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'prediction_correct'
  | 'prediction_incorrect'
  | 'simulation_started'
  | 'simulation_paused'
  | 'simulation_reset'
  | 'parameter_changed'
  | 'twist_predicted'
  | 'twist_revealed'
  | 'app_explored'
  | 'app_completed'
  | 'test_started'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved'
  | 'sound_played'
  | 'navigation_clicked'
  | 'temperature_changed'
  | 'emissivity_changed'
  | 'surface_changed';

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
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

interface Props {
  onGameEvent?: (event: { type: GameEventType; data?: Record<string, unknown> }) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const RadiationHeatTransferRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation states
  const [temperature, setTemperature] = useState(800); // Kelvin
  const [emissivity, setEmissivity] = useState(0.8);
  const [surfaceArea, setSurfaceArea] = useState(1); // m²
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Stefan-Boltzmann constant
  const STEFAN_BOLTZMANN = 5.67e-8; // W/(m²·K⁴)

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (currentPhase && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const playSound = useCallback((soundType: 'success' | 'failure' | 'complete' | 'transition' | 'heat') => {
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
        success: [523, 659, 784],
        failure: [200, 150],
        complete: [523, 659, 784, 1047],
        transition: [440, 550],
        heat: [100, 150, 200]
      };

      const freqs = frequencies[soundType] || [440];
      oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
      freqs.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      });

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      if (onGameEvent) {
        onGameEvent({ type: 'sound_played', data: { soundType } });
      }
    } catch {
      // Audio not supported
    }
  }, [onGameEvent]);

  // Phase sync with external control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, phase, onGameEvent, onPhaseComplete]);

  // Animation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => (t + 0.05) % (2 * Math.PI));
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Calculate radiated power using Stefan-Boltzmann law
  const calculatePower = useCallback(() => {
    return emissivity * STEFAN_BOLTZMANN * surfaceArea * Math.pow(temperature, 4);
  }, [temperature, emissivity, surfaceArea]);

  // Calculate peak wavelength using Wien's displacement law
  const calculatePeakWavelength = useCallback(() => {
    const WIEN_CONSTANT = 2.898e-3; // m·K
    return WIEN_CONSTANT / temperature; // in meters
  }, [temperature]);

  // Get color based on temperature
  const getTemperatureColor = useCallback((temp: number) => {
    if (temp < 500) return '#1a1a1a';
    if (temp < 700) return '#4a1a1a';
    if (temp < 900) return '#8B0000';
    if (temp < 1100) return '#FF4500';
    if (temp < 1400) return '#FF6B00';
    if (temp < 1800) return '#FFD700';
    if (temp < 2500) return '#FFFACD';
    return '#FFFFFF';
  }, []);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'success' : 'failure');
    if (onGameEvent) {
      onGameEvent({
        type: isCorrect ? 'prediction_correct' : 'prediction_incorrect',
        data: { prediction, correct: 'C' }
      });
    }
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'success' : 'failure');
    if (onGameEvent) {
      onGameEvent({ type: 'twist_predicted', data: { prediction, correct: 'B' } });
    }
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    if (onGameEvent) {
      onGameEvent({ type: 'test_answered', data: { questionIndex, answerIndex } });
    }
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    if (onGameEvent) {
      onGameEvent({ type: 'app_completed', data: { appIndex } });
    }
  }, [playSound, onGameEvent]);

  const testQuestions: TestQuestion[] = [
    {
      scenario: "A blacksmith heats an iron bar in a forge. As the temperature rises from 400°C to 800°C, the bar's appearance changes from invisible glow to bright red.",
      question: "How does the radiated power change when the absolute temperature doubles?",
      options: [
        { text: "It doubles (2×)", correct: false },
        { text: "It quadruples (4×)", correct: false },
        { text: "It increases by 16 times (16×)", correct: true },
        { text: "It increases by 8 times (8×)", correct: false }
      ],
      explanation: "The Stefan-Boltzmann law states P = εσAT⁴. When temperature doubles, power increases by 2⁴ = 16 times. This T⁴ dependence makes radiation extremely sensitive to temperature changes."
    },
    {
      scenario: "A thermos flask keeps coffee hot for hours. It has a silvery inner lining that reflects infrared radiation.",
      question: "Why does the shiny surface help retain heat?",
      options: [
        { text: "Shiny surfaces conduct heat better", correct: false },
        { text: "Low emissivity reduces radiation heat loss", correct: true },
        { text: "It blocks visible light only", correct: false },
        { text: "The silver reacts chemically with heat", correct: false }
      ],
      explanation: "Emissivity (ε) determines how much radiation an object emits. Polished metals have very low emissivity (ε ≈ 0.02-0.1), so they radiate very little heat. They also reflect incoming radiation, preventing absorption."
    },
    {
      scenario: "The desert can be scorching hot during the day (45°C) but freezing at night (0°C), while humid coastal areas have much smaller temperature swings.",
      question: "Why do desert temperatures drop so dramatically at night?",
      options: [
        { text: "Sand cools faster than water", correct: false },
        { text: "Dry air allows more radiative heat loss to space", correct: true },
        { text: "The sun heats deserts more intensely", correct: false },
        { text: "Desert winds cool the surface", correct: false }
      ],
      explanation: "Clear, dry desert air is transparent to infrared radiation. At night, the ground radiates heat directly into space with minimal atmospheric absorption. Water vapor in humid air absorbs and re-radiates infrared, acting like a thermal blanket."
    },
    {
      scenario: "An astronomer observes a star and measures its peak radiation wavelength at 500 nm (visible green-yellow light).",
      question: "Using Wien's displacement law (λ_max × T = 2.898 × 10⁻³ m·K), what is the star's surface temperature?",
      options: [
        { text: "About 3,000 K", correct: false },
        { text: "About 5,800 K", correct: true },
        { text: "About 10,000 K", correct: false },
        { text: "About 1,000 K", correct: false }
      ],
      explanation: "Wien's law: T = (2.898 × 10⁻³)/(500 × 10⁻⁹) ≈ 5,800 K. This is approximately the Sun's surface temperature. Hotter stars appear blue (shorter wavelength), cooler stars appear red (longer wavelength)."
    },
    {
      scenario: "A building has a white roof and a black roof section. On a sunny day, a thermal camera shows very different surface temperatures.",
      question: "Why does the black roof get much hotter?",
      options: [
        { text: "Black materials have higher heat capacity", correct: false },
        { text: "Black surfaces have higher absorptivity", correct: true },
        { text: "White surfaces convert sunlight to electricity", correct: false },
        { text: "Black materials conduct heat from the sun better", correct: false }
      ],
      explanation: "According to Kirchhoff's law, a good absorber is also a good emitter. Black surfaces have high absorptivity (α ≈ 0.95) so they absorb most incoming solar radiation. White surfaces reflect most visible light (low absorptivity)."
    },
    {
      scenario: "A thermal imaging camera detects infrared radiation from objects to create temperature maps. It can 'see' people in complete darkness.",
      question: "At body temperature (37°C or 310 K), what type of radiation do humans emit most strongly?",
      options: [
        { text: "Visible light", correct: false },
        { text: "Ultraviolet radiation", correct: false },
        { text: "Infrared radiation (around 9-10 μm)", correct: true },
        { text: "Radio waves", correct: false }
      ],
      explanation: "Using Wien's law: λ_max = (2.898 × 10⁻³)/310 ≈ 9.3 × 10⁻⁶ m = 9.3 μm. This is in the far-infrared range, invisible to the human eye but detectable by thermal cameras. That's why we 'glow' in infrared."
    },
    {
      scenario: "The Sun has a surface temperature of about 5,800 K and radiates enormous power. If the Sun's temperature suddenly doubled to 11,600 K...",
      question: "How much more power would it radiate?",
      options: [
        { text: "2 times more", correct: false },
        { text: "4 times more", correct: false },
        { text: "8 times more", correct: false },
        { text: "16 times more", correct: true }
      ],
      explanation: "P ∝ T⁴ means if temperature doubles (×2), power increases by 2⁴ = 16×. The Stefan-Boltzmann law's fourth-power dependence is why stellar radiation varies so dramatically with temperature."
    },
    {
      scenario: "A spacecraft needs to radiate away waste heat in space. The engineers can either double the radiator surface area or increase its temperature by 40%.",
      question: "Which option radiates more heat away?",
      options: [
        { text: "Doubling area (2× power)", correct: false },
        { text: "Increasing temperature by 40% (about 3.8× power)", correct: true },
        { text: "Both options give the same result", correct: false },
        { text: "Neither option significantly changes radiation", correct: false }
      ],
      explanation: "Doubling area doubles power (P ∝ A). But temperature increase: (1.4)⁴ = 3.84×. The T⁴ relationship makes temperature changes very effective. However, spacecraft often can't run hotter, so large radiators are used."
    },
    {
      scenario: "A person stands in front of a campfire. They feel warm even though they're not touching the flames and there's no significant wind blowing heat toward them.",
      question: "How is heat primarily reaching the person?",
      options: [
        { text: "Conduction through the air", correct: false },
        { text: "Convection currents", correct: false },
        { text: "Electromagnetic radiation (infrared)", correct: true },
        { text: "Sound waves carrying energy", correct: false }
      ],
      explanation: "Radiation transfers heat through electromagnetic waves, requiring no medium. Infrared radiation from the fire travels at the speed of light directly to your skin, which absorbs it and warms up. This works even in vacuum."
    },
    {
      scenario: "Earth receives solar radiation and radiates heat back to space. The average surface temperature is about 288 K (15°C).",
      question: "If Earth's temperature rose by just 4 K (4°C), by what percentage would its radiation to space increase?",
      options: [
        { text: "About 1.4%", correct: false },
        { text: "About 5.7%", correct: true },
        { text: "About 16%", correct: false },
        { text: "About 0.4%", correct: false }
      ],
      explanation: "Ratio = (292/288)⁴ ≈ 1.057, a 5.7% increase. This shows how sensitive Earth's energy balance is to temperature. This 'Stefan-Boltzmann feedback' helps stabilize climate but can't fully compensate for large forcing changes."
    }
  ];

  const transferApps: TransferApp[] = [
    {
      icon: "🛰️",
      title: "Spacecraft Thermal Control",
      short: "Spacecraft",
      tagline: "Managing heat in the void of space",
      description: "In space, radiation is the ONLY way to reject waste heat. Spacecraft use specialized radiators, multi-layer insulation (MLI), and surface coatings to maintain proper temperatures.",
      connection: "The Stefan-Boltzmann law P = εσAT⁴ governs all spacecraft thermal design. High-emissivity radiators dump heat while low-emissivity MLI blankets prevent unwanted absorption.",
      howItWorks: "Spacecraft radiators are large panels with high emissivity (ε ≈ 0.9) pointing toward deep space (3 K). Heat pipes transport waste heat to radiators. MLI blankets have many thin, reflective layers to minimize radiation between them.",
      stats: [
        { value: "250°C", label: "ISS radiator hot side" },
        { value: "160 kW", label: "ISS thermal rejection" },
        { value: "0.03", label: "MLI effective ε" },
        { value: "±2°C", label: "Payload temperature control" }
      ],
      examples: [
        "International Space Station thermal radiators",
        "James Webb Space Telescope sunshield",
        "Mars rover heat rejection systems",
        "Satellite thermal control coatings"
      ],
      companies: ["NASA", "SpaceX", "Northrop Grumman", "Ball Aerospace"],
      futureImpact: "Advanced radiator technologies using droplet generators and phase-change materials will enable larger space stations and long-duration crewed missions to Mars.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "🌍",
      title: "Climate & Greenhouse Effect",
      short: "Climate",
      tagline: "Earth's radiative energy balance",
      description: "Earth absorbs solar radiation and emits infrared radiation to space. Greenhouse gases absorb outgoing IR, re-radiating some back down, warming the surface beyond what the Stefan-Boltzmann law alone would predict.",
      connection: "Without atmosphere, Earth would be about -18°C. The greenhouse effect adds ~33°C of warming. The radiation balance equation determines global temperature.",
      howItWorks: "Sun emits mostly visible light (passes through atmosphere). Earth's surface absorbs it and re-radiates as infrared. CO₂, H₂O, and CH₄ absorb specific IR wavelengths, trapping heat. More greenhouse gases = more trapped radiation = warming.",
      stats: [
        { value: "340", label: "W/m² solar input" },
        { value: "240", label: "W/m² radiated to space" },
        { value: "33°C", label: "Greenhouse warming" },
        { value: "15°C", label: "Average surface temp" }
      ],
      examples: [
        "Global temperature monitoring satellites",
        "Climate models predicting warming",
        "Albedo effects of ice sheets",
        "Urban heat island measurements"
      ],
      companies: ["NOAA", "NASA GISS", "ESA", "IPCC"],
      futureImpact: "Understanding radiative forcing is crucial for predicting climate change impacts and developing mitigation strategies like carbon capture or solar radiation management.",
      color: "from-green-600 to-emerald-600"
    },
    {
      icon: "🏭",
      title: "Industrial Furnaces & Kilns",
      short: "Furnaces",
      tagline: "Extreme heat processing",
      description: "High-temperature industrial processes rely on radiation as the dominant heat transfer mode. Steel mills, glass furnaces, and ceramic kilns are designed around radiative heat transfer principles.",
      connection: "At furnace temperatures (1000-2000 K), radiation dominates over conduction and convection. The T⁴ dependence means furnace efficiency is very temperature-sensitive.",
      howItWorks: "Furnace walls are lined with refractory materials that absorb radiation and reach high temperatures. Products inside are heated by radiation from walls and flames. Surface emissivity of materials affects heating rates.",
      stats: [
        { value: "1500°C", label: "Steel furnace temp" },
        { value: "92%", label: "Radiation contribution" },
        { value: "0.85", label: "Molten steel ε" },
        { value: "50 MW", label: "Large furnace power" }
      ],
      examples: [
        "Electric arc furnaces for steel",
        "Glass melting tanks",
        "Ceramic firing kilns",
        "Aluminum smelting pots"
      ],
      companies: ["Primetals", "Siemens", "Danieli", "SMS Group"],
      futureImpact: "Electric furnaces powered by renewable energy and advanced thermal management are key to decarbonizing heavy industry.",
      color: "from-orange-600 to-red-600"
    },
    {
      icon: "🔬",
      title: "Thermal Imaging & Sensing",
      short: "Thermal Imaging",
      tagline: "Seeing heat in the dark",
      description: "Thermal cameras detect infrared radiation emitted by objects, creating temperature maps without contact. Applications range from building inspections to medical diagnostics to military surveillance.",
      connection: "Every object above 0 K emits thermal radiation following the Stefan-Boltzmann and Wien's laws. Cameras calibrated to these laws convert detected IR to accurate temperature readings.",
      howItWorks: "Microbolometers or cooled semiconductor detectors absorb IR radiation, causing temperature changes or electrical signals. The intensity at each pixel maps to object temperature using Planck's radiation law.",
      stats: [
        { value: "0.05°C", label: "Temperature resolution" },
        { value: "7-14 μm", label: "Detection wavelength" },
        { value: "640×480", label: "Typical resolution" },
        { value: "30+ Hz", label: "Frame rate" }
      ],
      examples: [
        "Building envelope inspections",
        "Fever screening during pandemics",
        "Electrical fault detection",
        "Search and rescue operations"
      ],
      companies: ["FLIR", "Seek Thermal", "Hikvision", "InfraTec"],
      futureImpact: "Miniaturized thermal sensors in smartphones and vehicles will enable new applications in autonomous driving, health monitoring, and smart building systems.",
      color: "from-purple-600 to-pink-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Render radiation visualization
  const renderRadiationSimulation = (size: number = 300) => {
    const power = calculatePower();
    const wavelength = calculatePeakWavelength();
    const wavelengthNm = wavelength * 1e9;
    const color = getTemperatureColor(temperature);
    const glowIntensity = Math.min(1, (temperature - 400) / 2000);

    return (
      <svg width={size} height={size} className="mx-auto">
        <defs>
          {/* Background gradient */}
          <linearGradient id="bgGradRad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Heated object glow */}
          <radialGradient id="objectGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity={glowIntensity} />
            <stop offset="60%" stopColor={color} stopOpacity={glowIntensity * 0.5} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>

          {/* Radiation wave effect */}
          <filter id="radiationBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={size} height={size} fill="url(#bgGradRad)" rx="12" />

        {/* Grid for reference */}
        {[1, 2, 3, 4].map(i => (
          <React.Fragment key={i}>
            <line x1={size * i / 5} y1="0" x2={size * i / 5} y2={size} stroke="#334155" strokeWidth="0.5" />
            <line x1="0" y1={size * i / 5} x2={size} y2={size * i / 5} stroke="#334155" strokeWidth="0.5" />
          </React.Fragment>
        ))}

        {/* Glow effect behind object */}
        <circle cx={size / 2} cy={size / 2} r={70 + glowIntensity * 30} fill="url(#objectGlow)" filter="url(#radiationBlur)" />

        {/* Central heated object */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r="50"
          fill={color}
          stroke={temperature > 900 ? '#fbbf24' : '#64748b'}
          strokeWidth="2"
        />

        {/* Radiation waves emanating from object */}
        {isSimulating && temperature > 500 && [1, 2, 3, 4].map(i => {
          const phase = (animationTime + i * Math.PI / 2) % (2 * Math.PI);
          const radius = 60 + Math.sin(phase) * 50 + i * 25;
          const opacity = Math.max(0, 1 - (radius - 60) / 100) * glowIntensity;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={wavelengthNm < 700 ? color : '#ef4444'}
              strokeWidth="2"
              strokeOpacity={opacity}
              strokeDasharray="8 4"
            />
          );
        })}

        {/* IR wave indicators pointing outward */}
        {temperature > 500 && [0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
          const rad = angle * Math.PI / 180;
          const startR = 55;
          const endR = 90 + glowIntensity * 30;
          const x1 = size / 2 + startR * Math.cos(rad);
          const y1 = size / 2 + startR * Math.sin(rad);
          const x2 = size / 2 + endR * Math.cos(rad);
          const y2 = size / 2 + endR * Math.sin(rad);

          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="2"
              strokeOpacity={glowIntensity}
              markerEnd="url(#arrowHead)"
            />
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={color} opacity={glowIntensity} />
          </marker>
        </defs>

        {/* Temperature indicator */}
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={temperature > 1200 ? '#1e293b' : '#fff'} fontSize="18" fontWeight="bold">
          {temperature} K
        </text>

        {/* Labels */}
        <text x={size - 10} y="20" textAnchor="end" fill="#94a3b8" fontSize="10">
          P = {power.toExponential(2)} W
        </text>
        <text x={size - 10} y="35" textAnchor="end" fill="#94a3b8" fontSize="10">
          λ_max = {(wavelengthNm).toFixed(0)} nm
        </text>
        <text x={size - 10} y="50" textAnchor="end" fill="#94a3b8" fontSize="10">
          {wavelengthNm < 400 ? 'UV' : wavelengthNm < 700 ? 'Visible' : wavelengthNm < 1000 ? 'Near-IR' : 'Far-IR'}
        </text>
      </svg>
    );
  };

  // Render spectrum visualization
  const renderSpectrum = (size: number = 280) => {
    const wavelength = calculatePeakWavelength();
    const wavelengthNm = wavelength * 1e9;
    const peakPosition = Math.max(10, Math.min(size - 10, (1 - (wavelengthNm - 100) / 10000) * size));

    return (
      <svg width={size} height="60" className="mx-auto">
        <defs>
          {/* Visible spectrum gradient */}
          <linearGradient id="spectrum" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b00ff" />
            <stop offset="17%" stopColor="#0000ff" />
            <stop offset="33%" stopColor="#00ff00" />
            <stop offset="50%" stopColor="#ffff00" />
            <stop offset="67%" stopColor="#ff7f00" />
            <stop offset="75%" stopColor="#ff0000" />
            <stop offset="100%" stopColor="#3d0000" />
          </linearGradient>
        </defs>

        {/* UV region */}
        <rect x="0" y="15" width={size * 0.15} height="20" fill="#4c1d95" />
        <text x={size * 0.075} y="45" textAnchor="middle" fill="#a78bfa" fontSize="8">UV</text>

        {/* Visible spectrum */}
        <rect x={size * 0.15} y="15" width={size * 0.25} height="20" fill="url(#spectrum)" />
        <text x={size * 0.275} y="45" textAnchor="middle" fill="#94a3b8" fontSize="8">Visible</text>

        {/* Infrared region */}
        <rect x={size * 0.4} y="15" width={size * 0.6} height="20" fill="linear-gradient(to right, #7f1d1d, #1c1917)" />
        <rect x={size * 0.4} y="15" width={size * 0.6} height="20" fill="#7f1d1d" />
        <text x={size * 0.7} y="45" textAnchor="middle" fill="#fca5a5" fontSize="8">Infrared</text>

        {/* Peak wavelength marker */}
        <line x1={peakPosition} y1="5" x2={peakPosition} y2="40" stroke="#22c55e" strokeWidth="2" />
        <polygon points={`${peakPosition - 5},5 ${peakPosition + 5},5 ${peakPosition},12`} fill="#22c55e" />
        <text x={peakPosition} y="55" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold">
          λ_max
        </text>

        {/* Scale labels */}
        <text x="0" y="10" fill="#64748b" fontSize="7">100nm</text>
        <text x={size} y="10" textAnchor="end" fill="#64748b" fontSize="7">10μm+</text>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        The Invisible Heat Transfer
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how heat travels through empty space
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />

        <div className="relative">
          <svg width="280" height="160" className="mx-auto mb-6">
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#dc2626" />
              </radialGradient>
              <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="50%" stopColor="#020617" />
                <stop offset="100%" stopColor="#1e3a5f" />
              </linearGradient>
            </defs>

            {/* Space background */}
            <rect x="0" y="0" width="280" height="160" fill="url(#spaceGrad)" rx="12" />

            {/* Stars */}
            {[...Array(15)].map((_, i) => (
              <circle key={i} cx={(i * 19) % 260 + 10} cy={(i * 11) % 140 + 10} r="1" fill="white" opacity="0.6" />
            ))}

            {/* Sun */}
            <circle cx="40" cy="80" r="30" fill="url(#sunGlow)" />
            <circle cx="40" cy="80" r="35" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />

            {/* Radiation waves */}
            {[1, 2, 3, 4, 5].map(i => (
              <path
                key={i}
                d={`M ${40 + i * 20} 80 Q ${60 + i * 20} ${60 + (i % 2) * 40} ${80 + i * 20} 80`}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeOpacity={1 - i * 0.15}
              />
            ))}

            {/* Earth */}
            <circle cx="220" cy="80" r="25" fill="#3b82f6" />
            <ellipse cx="220" cy="80" rx="25" ry="25" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="20 10" />

            {/* Arrow */}
            <path d="M150 80 L190 80" stroke="#fbbf24" strokeWidth="3" markerEnd="url(#sunArrow)" />
            <defs>
              <marker id="sunArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
              </marker>
            </defs>

            {/* Labels */}
            <text x="40" y="130" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">Sun</text>
            <text x="140" y="65" textAnchor="middle" fill="#94a3b8" fontSize="10">150 million km</text>
            <text x="140" y="75" textAnchor="middle" fill="#94a3b8" fontSize="10">of empty space!</text>
            <text x="220" y="130" textAnchor="middle" fill="#60a5fa" fontSize="12" fontWeight="bold">Earth</text>
          </svg>

          <p className="text-xl text-white/90 font-medium leading-relaxed mb-4">
            The Sun heats Earth across 150 million kilometers of empty space. No air, no matter—just emptiness!
          </p>
          <p className="text-lg text-orange-400 font-semibold">
            How can heat travel through nothing at all?
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Mystery
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">✦</span>
          10 Phases
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Heat can travel from the Sun to Earth through 150 million km of vacuum. Unlike conduction (needs touching) or convection (needs fluid), this works through empty space.
        </p>
        <p className="text-cyan-400 font-medium">
          What physical mechanism allows this heat transfer?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Invisible heat particles floating through space' },
          { id: 'B', text: 'Sound waves carrying energy' },
          { id: 'C', text: 'Electromagnetic waves (radiation) traveling at light speed' },
          { id: 'D', text: 'Quantum tunneling of heat energy' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! All objects emit <span className="text-orange-400">electromagnetic radiation</span> based on their temperature!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is called thermal radiation or blackbody radiation. The Stefan-Boltzmann law describes how power scales with temperature.
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Radiation Heat Transfer Lab</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderRadiationSimulation(isMobile ? 260 : 300)}

        <div className="mt-4">
          {renderSpectrum(isMobile ? 240 : 280)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-4">
        <div className="bg-slate-800/70 rounded-xl p-4">
          <label className="text-sm text-slate-400 block mb-2">Temperature (K)</label>
          <input
            type="range"
            min="300"
            max="6000"
            value={temperature}
            onChange={(e) => {
              setTemperature(Number(e.target.value));
              if (onGameEvent) {
                onGameEvent({ type: 'temperature_changed', data: { temperature: Number(e.target.value) } });
              }
            }}
            className="w-full accent-orange-500"
          />
          <div className="text-center text-orange-400 font-bold mt-1">{temperature} K</div>
          <div className="text-center text-slate-500 text-xs">({(temperature - 273).toFixed(0)}°C)</div>
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4">
          <label className="text-sm text-slate-400 block mb-2">Emissivity (ε)</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={emissivity}
            onChange={(e) => {
              setEmissivity(Number(e.target.value));
              if (onGameEvent) {
                onGameEvent({ type: 'emissivity_changed', data: { emissivity: Number(e.target.value) } });
              }
            }}
            className="w-full accent-cyan-500"
          />
          <div className="text-center text-cyan-400 font-bold mt-1">{emissivity.toFixed(1)}</div>
          <div className="text-center text-slate-500 text-xs">
            {emissivity < 0.3 ? 'Polished metal' : emissivity < 0.6 ? 'Oxidized metal' : emissivity < 0.9 ? 'Painted surface' : 'Blackbody'}
          </div>
        </div>

        <div className="bg-slate-800/70 rounded-xl p-4">
          <label className="text-sm text-slate-400 block mb-2">Surface Area (m²)</label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={surfaceArea}
            onChange={(e) => {
              setSurfaceArea(Number(e.target.value));
              if (onGameEvent) {
                onGameEvent({ type: 'surface_changed', data: { surfaceArea: Number(e.target.value) } });
              }
            }}
            className="w-full accent-emerald-500"
          />
          <div className="text-center text-emerald-400 font-bold mt-1">{surfaceArea.toFixed(1)} m²</div>
        </div>
      </div>

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          setIsSimulating(!isSimulating);
          if (onGameEvent) {
            onGameEvent({ type: isSimulating ? 'simulation_paused' : 'simulation_started' });
          }
        }}
        className={`px-6 py-3 rounded-xl font-semibold transition-colors mb-4 ${
          isSimulating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
        } text-white`}
      >
        {isSimulating ? '⏸️ Pause Animation' : '▶️ Animate Radiation'}
      </button>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-orange-400 mb-3">Stefan-Boltzmann Law: P = εσAT⁴</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-slate-300">
            <p><span className="text-cyan-400">P</span> = Radiated power</p>
            <p className="text-2xl font-bold text-orange-400">{calculatePower().toExponential(2)} W</p>
          </div>
          <div className="text-slate-300">
            <p><span className="text-cyan-400">λ_max</span> = Peak wavelength</p>
            <p className="text-2xl font-bold text-purple-400">{(calculatePeakWavelength() * 1e9).toFixed(0)} nm</p>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-3">
          σ = 5.67 × 10⁻⁸ W/(m²·K⁴) (Stefan-Boltzmann constant)
        </p>
        <p className="text-amber-400 text-sm mt-2">
          ⚠️ Notice how doubling temperature increases power by 16× (T⁴)!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
      >
        Review Key Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Thermal Radiation</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">☀️ Stefan-Boltzmann Law</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>P = εσAT⁴</strong> - Power radiated by an object</li>
            <li>• Power increases with the FOURTH power of temperature</li>
            <li>• Double temperature → 16× more radiation!</li>
            <li>• σ = 5.67 × 10⁻⁸ W/(m²·K⁴)</li>
            <li>• Works in vacuum—no medium needed!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">🌈 Wien's Displacement Law</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• <strong>λ_max × T = 2.898 × 10⁻³ m·K</strong></li>
            <li>• Hotter objects emit at shorter wavelengths</li>
            <li>• Sun (5800K) → visible light (500 nm)</li>
            <li>• Human body (310K) → far IR (9.3 μm)</li>
            <li>• Explains why stars have different colors!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">🪞 Emissivity (ε)</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• ε = 1: Perfect blackbody (absorbs/emits all)</li>
            <li>• ε = 0: Perfect reflector (absorbs/emits nothing)</li>
            <li>• Polished metal: ε ≈ 0.02-0.1</li>
            <li>• Painted surface: ε ≈ 0.9</li>
            <li>• Good absorbers are good emitters (Kirchhoff's law)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">⚡ Key Insights</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• All objects above 0 K emit radiation</li>
            <li>• Radiation travels at speed of light</li>
            <li>• No medium required (works in space)</li>
            <li>• Net transfer: hot → cold (2nd law)</li>
            <li>• Dominates at high temperatures (&gt;500°C)</li>
          </ul>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg width="260" height="120" className="mx-auto mb-4">
          {/* Night sky */}
          <rect x="0" y="0" width="260" height="120" fill="#0f172a" rx="8" />
          {[...Array(10)].map((_, i) => (
            <circle key={i} cx={(i * 27) % 250 + 5} cy={(i * 13) % 100 + 10} r="1" fill="white" opacity="0.5" />
          ))}

          {/* Ground */}
          <rect x="0" y="90" width="260" height="30" fill="#422006" />

          {/* Ice cube 1 - white */}
          <rect x="40" y="55" width="35" height="35" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" rx="2" />
          <text x="57" y="105" textAnchor="middle" fill="#f8fafc" fontSize="10">White</text>

          {/* Ice cube 2 - black */}
          <rect x="140" y="55" width="35" height="35" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="2" />
          <text x="157" y="105" textAnchor="middle" fill="#94a3b8" fontSize="10">Black</text>

          {/* Radiation arrows from both */}
          <path d="M57,50 L57,25" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#irArrow)" />
          <path d="M157,50 L157,25" stroke="#ef4444" strokeWidth="2" markerEnd="url(#irArrow)" />

          <defs>
            <marker id="irArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* IR label */}
          <text x="205" y="35" fill="#ef4444" fontSize="10">IR radiation</text>
        </svg>

        <p className="text-lg text-slate-300 mb-4">
          Two identical ice cubes are placed outside on a clear, cold night. One is painted white, the other black. Both start at 0°C.
        </p>
        <p className="text-lg text-purple-400 font-medium">
          Which ice cube melts first?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The white ice cube (reflects less heat away)' },
          { id: 'B', text: 'The black ice cube (radiates more heat away, so it stays colder)' },
          { id: 'C', text: 'They melt at the same rate (color doesn\'t affect melting)' },
          { id: 'D', text: 'Neither melts (too cold outside)' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Counter-intuitive! The black ice cube radiates heat faster and stays frozen longer!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Good emitters are also good absorbers—but at night, there's no sun to absorb from. The black cube just loses heat faster!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See Why →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">The Night Radiation Paradox</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-orange-400 mb-2 text-center">☀️ Daytime</h3>
          <svg width="180" height="120" className="mx-auto">
            {/* Sun */}
            <circle cx="90" cy="20" r="15" fill="#fbbf24" />

            {/* Arrows down */}
            <line x1="60" y1="35" x2="60" y2="60" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#downArrow)" />
            <line x1="90" y1="35" x2="90" y2="60" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#downArrow)" />
            <line x1="120" y1="35" x2="120" y2="60" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#downArrow)" />

            {/* Ground */}
            <rect x="30" y="70" width="60" height="30" fill="#f8fafc" stroke="#94a3b8" rx="2" />
            <rect x="100" y="70" width="60" height="30" fill="#1e293b" stroke="#475569" rx="2" />

            <text x="60" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">Absorbs less</text>
            <text x="130" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">Absorbs more</text>

            <defs>
              <marker id="downArrow" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
                <path d="M0,0 L6,0 L3,6 z" fill="#fbbf24" />
              </marker>
            </defs>
          </svg>
          <p className="text-sm text-slate-400 mt-2 text-center">Black absorbs solar radiation, heats up faster</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-purple-400 mb-2 text-center">🌙 Nighttime</h3>
          <svg width="180" height="120" className="mx-auto">
            {/* Stars */}
            {[...Array(5)].map((_, i) => (
              <circle key={i} cx={30 + i * 35} cy={15 + (i % 2) * 10} r="2" fill="white" />
            ))}

            {/* Ground */}
            <rect x="30" y="70" width="60" height="30" fill="#f8fafc" stroke="#94a3b8" rx="2" />
            <rect x="100" y="70" width="60" height="30" fill="#1e293b" stroke="#475569" rx="2" />

            {/* Arrows up (radiation out) */}
            <line x1="60" y1="65" x2="60" y2="40" stroke="#ef4444" strokeWidth="1" markerEnd="url(#upArrowSmall)" />
            <line x1="130" y1="65" x2="130" y2="35" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#upArrowBig)" />

            <text x="60" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">Emits less</text>
            <text x="130" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">Emits more!</text>

            <defs>
              <marker id="upArrowSmall" markerWidth="4" markerHeight="4" refX="2" refY="1" orient="auto">
                <path d="M0,4 L4,4 L2,0 z" fill="#ef4444" />
              </marker>
              <marker id="upArrowBig" markerWidth="6" markerHeight="6" refX="3" refY="1" orient="auto">
                <path d="M0,6 L6,6 L3,0 z" fill="#ef4444" />
              </marker>
            </defs>
          </svg>
          <p className="text-sm text-slate-400 mt-2 text-center">Black radiates more heat to cold sky!</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Why This Matters:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>Kirchhoff's law:</strong> Good absorbers = Good emitters (same ε for both)</li>
          <li>• During the day: absorption dominates (sunlight is intense)</li>
          <li>• At night: emission dominates (no incoming radiation to absorb)</li>
          <li>• The black ice radiates heat to the cold night sky (3 K!) faster</li>
          <li>• This is why frost forms on car windshields facing the sky first</li>
        </ul>
        <p className="text-amber-400 mt-4 text-sm">
          💡 Real application: Radiative sky cooling uses high-emissivity surfaces to cool buildings below ambient temperature at night!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Radiation Works Both Ways!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The same property (emissivity) controls both absorption AND emission:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-orange-400 font-semibold">High ε (black)</p>
              <p>• Absorbs more radiation</p>
              <p>• Emits more radiation</p>
              <p className="text-slate-400 mt-2">Day: gets hotter</p>
              <p className="text-slate-400">Night: cools faster</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-cyan-400 font-semibold">Low ε (shiny)</p>
              <p>• Reflects more radiation</p>
              <p>• Emits less radiation</p>
              <p className="text-slate-400 mt-2">Day: stays cooler</p>
              <p className="text-slate-400">Night: retains heat</p>
            </div>
          </div>
          <p className="text-emerald-400 font-medium mt-4">
            This is why thermos flasks are shiny inside—they minimize ALL radiative transfer!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => {
              e.preventDefault();
              setActiveAppTab(index);
              if (onGameEvent) {
                onGameEvent({ type: 'app_explored', data: { appIndex: index, title: app.title } });
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index
                ? `bg-gradient-to-r ${app.color} text-white`
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {isMobile ? '' : app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{transferApps[activeAppTab].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppTab].title}</h3>
            <p className="text-sm text-slate-400">{transferApps[activeAppTab].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 my-4">{transferApps[activeAppTab].description}</p>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-orange-400 mb-2">Physics Connection</h4>
          <p className="text-sm text-slate-300">{transferApps[activeAppTab].connection}</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">How It Works</h4>
          <p className="text-sm text-slate-300">{transferApps[activeAppTab].howItWorks}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {transferApps[activeAppTab].stats.map((stat, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Examples</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            {transferApps[activeAppTab].examples.map((ex, i) => (
              <li key={i}>• {ex}</li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-2">Key Players</h4>
          <div className="flex flex-wrap gap-2">
            {transferApps[activeAppTab].companies.map((company, i) => (
              <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{company}</span>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-semibold text-amber-400 mb-1">Future Impact</h4>
          <p className="text-sm text-slate-300">{transferApps[activeAppTab].futureImpact}</p>
        </div>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/{transferApps.length}</span>
      </div>

      {completedApps.size >= transferApps.length && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                <p className="text-slate-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowTestResults(true);
              if (onGameEvent) {
                onGameEvent({ type: 'test_completed', data: { score: calculateScore(), total: testQuestions.length } });
              }
            }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          <div className="bg-slate-800/50 rounded-2xl p-6 text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300 mb-6">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered radiation heat transfer!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>

            {calculateScore() >= 7 ? (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToPhase(9);
                  if (onGameEvent) {
                    onGameEvent({ type: 'mastery_achieved', data: { score: calculateScore() } });
                  }
                }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
              >
                Claim Your Mastery Badge →
              </button>
            ) : (
              <button
                onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all duration-300"
              >
                Review & Try Again
              </button>
            )}
          </div>

          {/* Show explanations */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Review Answers:</h4>
            {testQuestions.map((q, i) => {
              const isCorrect = q.options[testAnswers[i]]?.correct;
              return (
                <div key={i} className={`p-4 rounded-xl ${isCorrect ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-red-900/30 border border-red-700'}`}>
                  <p className="text-sm text-slate-300 mb-2">{i + 1}. {q.question}</p>
                  <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCorrect ? '✓ Correct!' : `✗ Your answer: ${q.options[testAnswers[i]]?.text}`}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-emerald-400 mt-1">
                      Correct answer: {q.options.find(o => o.correct)?.text}
                    </p>
                  )}
                  <p className="text-sm text-slate-400 mt-2">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-red-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">☀️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Radiation Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered thermal radiation and the Stefan-Boltzmann law!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📐</div>
            <p className="text-sm text-slate-300">Stefan-Boltzmann Law</p>
            <p className="text-xs text-orange-400">P = εσAT⁴</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🌈</div>
            <p className="text-sm text-slate-300">Wien's Law</p>
            <p className="text-xs text-purple-400">λT = const</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🪞</div>
            <p className="text-sm text-slate-300">Emissivity</p>
            <p className="text-xs text-cyan-400">ε: 0→1</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm text-slate-300">T⁴ Power</p>
            <p className="text-xs text-amber-400">2× temp = 16× power</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            ↺ Explore Again
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Radiation Heat Transfer</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        {renderPhase()}
      </div>
    </div>
  );
};

export default RadiationHeatTransferRenderer;
