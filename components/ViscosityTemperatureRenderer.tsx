/**
 * VISCOSITY VS TEMPERATURE RENDERER
 *
 * Complete physics game demonstrating how temperature affects fluid viscosity.
 * Higher temperature = lower viscosity (faster flow) for most liquids.
 *
 * FEATURES:
 * - Static graphic in predict phase with explanation below
 * - Interactive temperature slider showing syrup flow
 * - Viscosity-temperature curve visualization
 * - Rich transfer phase with real-world applications
 * - Full compliance with GAME_EVALUATION_SYSTEM.md
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================
// THEME COLORS
// ============================================================

const colors = {
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',

  primary: '#f59e0b',
  primaryLight: '#fbbf24',
  primaryDark: '#d97706',

  accent: '#f97316',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

  border: '#334155',
  borderLight: '#475569',

  // Physics colors
  cold: '#3b82f6',
  coldLight: '#60a5fa',
  warm: '#f59e0b',
  warmLight: '#fbbf24',
  hot: '#ef4444',
  hotLight: '#f87171',
  syrup: '#92400e',
  syrupLight: '#b45309',
  honey: '#fbbf24',
  oil: '#84cc16',
};

const GAME_ID = 'viscosity_temperature';

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const testQuestions = [
  {
    scenario: "You're trying to pour cold maple syrup on your pancakes on a winter morning. The bottle has been in the refrigerator overnight at about 4°C. When you tip the bottle, barely a trickle comes out, even after waiting 30 seconds.",
    question: "Why does cold syrup flow so slowly compared to warm syrup?",
    options: [
      { id: 'frozen', label: "The syrup is partially frozen" },
      { id: 'viscosity', label: "Cold temperatures increase viscosity (internal friction)", correct: true },
      { id: 'density', label: "Cold syrup is denser and heavier" },
      { id: 'sticky', label: "Cold makes sugar crystals stickier" }
    ],
    explanation: "At lower temperatures, molecules move more slowly and have stronger intermolecular attractions, increasing viscosity (resistance to flow). The syrup isn't frozen, just more viscous."
  },
  {
    scenario: "You warm the syrup bottle in hot water before pouring.",
    question: "What happens to the syrup's viscosity when heated?",
    options: [
      { id: 'increase', label: "Viscosity increases — it gets thicker" },
      { id: 'decrease', label: "Viscosity decreases — it flows more easily", correct: true },
      { id: 'same', label: "Viscosity stays the same — only color changes" },
      { id: 'solidify', label: "The syrup eventually solidifies" }
    ],
    explanation: "Heating gives molecules more kinetic energy, allowing them to overcome intermolecular attractions more easily. This reduces viscosity dramatically — warm syrup pours much faster."
  },
  {
    scenario: "A mechanic is explaining why engines need different oils for different climates.",
    question: "Why do cars in cold climates need 'winter-weight' oil?",
    options: [
      { id: 'freeze', label: "Regular oil freezes in winter" },
      { id: 'thick', label: "Cold makes oil too viscous to flow and lubricate properly", correct: true },
      { id: 'thin', label: "Cold makes oil too thin to protect the engine" },
      { id: 'evaporate', label: "Regular oil evaporates in cold weather" }
    ],
    explanation: "In cold weather, regular oil becomes very viscous (thick) and can't flow quickly enough to lubricate engine parts during startup. Winter oils have additives that keep them flowing at low temperatures."
  },
  {
    scenario: "You notice honey flows easily on a warm day but barely moves when refrigerated.",
    question: "What molecular process explains this temperature-viscosity relationship?",
    options: [
      { id: 'bonds', label: "Chemical bonds break at higher temperatures" },
      { id: 'kinetic', label: "Higher temperature = more molecular motion, easier to overcome attractions", correct: true },
      { id: 'expansion', label: "Heat expands the container, giving more room to flow" },
      { id: 'evaporation', label: "Water evaporates, leaving thinner honey" }
    ],
    explanation: "Temperature increases molecular kinetic energy. Faster-moving molecules can more easily break free from intermolecular forces (like hydrogen bonds), reducing resistance to flow."
  },
  {
    scenario: "A glass factory heats sand to make glass.",
    question: "Why must glass be extremely hot to be shaped?",
    options: [
      { id: 'melt', label: "Glass must melt completely to be shaped" },
      { id: 'viscosity', label: "High temperature lowers viscosity enough to allow shaping", correct: true },
      { id: 'soft', label: "Heat makes the silicon atoms soft" },
      { id: 'chemical', label: "Heat causes a chemical reaction that makes glass moldable" }
    ],
    explanation: "Glass is an amorphous solid with extremely high viscosity at room temperature. Heating to ~1000°C+ dramatically reduces viscosity, allowing it to flow and be shaped before cooling and hardening."
  },
  {
    scenario: "You're comparing water and honey at the same temperature.",
    question: "Why does honey have higher viscosity than water at room temperature?",
    options: [
      { id: 'sugar', label: "Sugar molecules create more internal friction and hydrogen bonds", correct: true },
      { id: 'density', label: "Honey is denser, so gravity pulls harder" },
      { id: 'temperature', label: "Honey is naturally colder than water" },
      { id: 'color', label: "Darker liquids are always more viscous" }
    ],
    explanation: "Honey contains large sugar molecules that interact strongly via hydrogen bonds. These molecular interactions create much more internal friction than water's small, simple molecules."
  },
  {
    scenario: "An engineer is designing a chocolate fountain.",
    question: "Why must the chocolate be kept warm in the fountain?",
    options: [
      { id: 'taste', label: "Cold chocolate tastes worse" },
      { id: 'flow', label: "Warm chocolate has lower viscosity and flows smoothly", correct: true },
      { id: 'melt', label: "Chocolate must stay completely liquid" },
      { id: 'bacteria', label: "Heat prevents bacterial growth" }
    ],
    explanation: "Chocolate fountains maintain temperature around 40-50°C to keep viscosity low enough for smooth, continuous flow. If it cools, viscosity increases and the flow becomes sluggish or stops."
  },
  {
    scenario: "You're studying the Arrhenius equation for viscosity.",
    question: "According to the Arrhenius model, how does viscosity (η) change with temperature (T)?",
    options: [
      { id: 'linear', label: "Viscosity decreases linearly with temperature" },
      { id: 'exponential', label: "Viscosity decreases exponentially with temperature", correct: true },
      { id: 'inverse', label: "Viscosity is inversely proportional to temperature" },
      { id: 'quadratic', label: "Viscosity decreases with the square of temperature" }
    ],
    explanation: "The Arrhenius equation shows η = A·e^(Ea/RT), meaning viscosity decreases exponentially as temperature increases. A small temperature change can cause a large viscosity change."
  },
  {
    scenario: "A volcano erupts, releasing lava that flows down the mountainside.",
    question: "Why does lava flow faster near the eruption vent than further down the slope?",
    options: [
      { id: 'slope', label: "The slope is steeper near the vent" },
      { id: 'temperature', label: "Lava is hottest (lowest viscosity) at the vent, cools as it flows", correct: true },
      { id: 'pressure', label: "Pressure from the volcano pushes it faster" },
      { id: 'composition', label: "The lava's composition changes as it flows" }
    ],
    explanation: "Fresh lava at the vent is extremely hot (~1200°C) with low viscosity. As it flows and cools, viscosity increases dramatically, slowing its movement until it eventually solidifies."
  },
  {
    scenario: "A pharmacist is formulating a liquid medicine.",
    question: "Why is viscosity-temperature relationship important in pharmaceutical formulation?",
    options: [
      { id: 'storage', label: "Medicines must flow consistently at different storage temperatures", correct: true },
      { id: 'color', label: "Temperature affects medicine color" },
      { id: 'taste', label: "Viscosity only affects taste" },
      { id: 'irrelevant', label: "Viscosity doesn't matter for medicines" }
    ],
    explanation: "Liquid medicines must pour and dose consistently whether stored in a warm cabinet or refrigerator. Formulators add viscosity modifiers to ensure reliable flow across expected storage temperatures."
  }
];

const realWorldApps = [
  {
    icon: '🚗',
    title: 'Motor Oil Engineering',
    short: 'Multi-grade lubricants',
    tagline: 'Protection in All Temperatures',
    description: 'Modern motor oils (like 5W-30) are engineered to maintain proper viscosity across a huge temperature range — from cold winter startups to hot engine operation.',
    connection: 'Just like your syrup experiment, engine oil gets thicker when cold. Engineers add polymer additives that prevent excessive thickening at low temps and thinning at high temps.',
    howItWorks: 'Multi-grade oils contain viscosity index improvers — long polymer chains that coil up when cold (less thickening effect) and expand when hot (preventing excessive thinning). The "W" in 5W-30 stands for "winter" rating, indicating cold-start performance.',
    stats: [
      { value: '-30°C', label: 'Cold pour point', icon: '❄️' },
      { value: '150°C', label: 'Operating temp', icon: '🔥' },
      { value: '10,000x', label: 'Viscosity range', icon: '📊' }
    ],
    examples: [
      '5W-30 oil: flows at -30°C but protects at 100°C',
      'Synthetic oils maintain viscosity better than conventional',
      'Racing oils optimized for high-temperature stability',
      'Electric vehicle fluids designed for motor cooling'
    ],
    companies: ['Mobil', 'Castrol', 'Shell', 'Valvoline', 'Pennzoil'],
    futureImpact: 'Advanced synthetic lubricants could extend oil change intervals to 50,000+ miles while improving fuel efficiency by 2-3% through optimized viscosity profiles.',
    color: colors.primary
  },
  {
    icon: '🍫',
    title: 'Chocolate Tempering',
    short: 'Perfect crystal formation',
    tagline: 'The Science of Silky Smooth Chocolate',
    description: 'Chocolate tempering is a precise heating and cooling process that controls cocoa butter crystallization, creating that perfect snap and glossy finish in premium chocolates.',
    connection: 'Like your syrup flowing faster when warm, chocolate viscosity is highly temperature-dependent. Chocolatiers must control viscosity precisely to achieve proper crystal formation and smooth coating.',
    howItWorks: 'Tempering involves heating chocolate to 45-50°C to melt all crystal forms, cooling to 27-28°C to form stable Type V crystals, then reheating to 31-32°C for optimal working viscosity. The viscosity-temperature curve must be carefully controlled throughout.',
    stats: [
      { value: '45°C', label: 'Melting temp', icon: '🌡️' },
      { value: '27°C', label: 'Seed temp', icon: '💎' },
      { value: '32°C', label: 'Working temp', icon: '🍫' }
    ],
    examples: [
      'Chocolate fountains maintain 40-50°C for smooth flow',
      'Enrobing (coating) requires precise viscosity control',
      'Molding temperature affects final texture and shine',
      'Dark, milk, and white chocolate have different tempering curves'
    ],
    companies: ['Lindt', 'Callebaut', 'Valrhona', 'Ghirardelli', 'Guittard'],
    futureImpact: 'Precision temperature control and new cocoa butter alternatives are enabling sugar-free and vegan chocolates with perfect texture, while reducing energy consumption in manufacturing by 25%.',
    color: colors.syrup
  },
  {
    icon: '🎨',
    title: 'Paint Formulation',
    short: 'Coatings technology',
    tagline: 'Flow When Applied, Set When Dried',
    description: 'Paint scientists engineer viscosity to achieve the perfect balance: thin enough to apply smoothly with brush or spray, thick enough to resist dripping and sagging on vertical surfaces.',
    connection: 'Like your temperature-viscosity experiment, paints are designed with specific flow characteristics. Thixotropic paints thin under shear (brushing) but thicken when resting — preventing drips.',
    howItWorks: 'Paints use rheology modifiers and thixotropic agents that create temporary viscosity changes. When you brush paint, shear forces break molecular structures, lowering viscosity. At rest, structures rebuild, increasing viscosity to prevent sagging.',
    stats: [
      { value: '85-120 KU', label: 'Brush viscosity', icon: '🖌️' },
      { value: '0.5 sec', label: 'Recovery time', icon: '⏱️' },
      { value: '10-25°C', label: 'Optimal temp range', icon: '🌡️' }
    ],
    examples: [
      'Latex house paint: flows on brush, resists dripping',
      'Automotive clear coats: spray thin, level perfectly',
      'Anti-graffiti coatings: temperature-stable viscosity',
      'Industrial primers: thixotropic for vertical application'
    ],
    companies: ['Sherwin-Williams', 'PPG Industries', 'Benjamin Moore', 'Behr', 'Dulux'],
    futureImpact: 'Smart paints with temperature-responsive viscosity could self-heal scratches when heated and enable one-coat coverage, reducing VOC emissions and application time by 40%.',
    color: colors.accent
  },
  {
    icon: '🩸',
    title: 'Blood Viscosity Diagnosis',
    short: 'Clinical hemorheology',
    tagline: 'Flowing Biomarker for Cardiovascular Health',
    description: 'Blood viscosity is a critical diagnostic parameter in medicine. Abnormal blood viscosity can indicate cardiovascular disease, diabetes, anemia, or blood disorders requiring immediate intervention.',
    connection: 'Just as syrup viscosity changes with temperature, blood viscosity varies with hematocrit, plasma proteins, and temperature. Clinicians measure these to diagnose and monitor serious conditions.',
    howItWorks: 'Blood is a non-Newtonian fluid — its viscosity decreases under shear stress (in arteries) and increases at rest (in veins). Viscometers measure whole blood viscosity at high and low shear rates to assess red blood cell deformability and plasma viscosity.',
    stats: [
      { value: '3-4 cP', label: 'Normal viscosity', icon: '💉' },
      { value: '45%', label: 'Optimal hematocrit', icon: '🔬' },
      { value: '37°C', label: 'Body temperature', icon: '🌡️' }
    ],
    examples: [
      'Polycythemia: high viscosity from excess red blood cells',
      'Anemia screening: low viscosity indicates low hematocrit',
      'Diabetes monitoring: elevated plasma viscosity marker',
      'Stroke risk assessment: hyperviscosity syndrome detection'
    ],
    companies: ['Siemens Healthineers', 'Roche Diagnostics', 'Abbott Laboratories', 'Beckman Coulter'],
    futureImpact: 'Point-of-care viscosity testing could enable rapid cardiovascular risk assessment, potentially reducing stroke and heart attack deaths by early detection of hyperviscosity conditions.',
    color: colors.error
  }
];

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

interface ViscosityTemperatureRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const ViscosityTemperatureRenderer: React.FC<ViscosityTemperatureRendererProps> = ({
  onComplete,
  onGameEvent,
  gamePhase
}) => {
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play phase state
  const [temperature, setTemperature] = useState(20); // 0-100°C
  const [flowPosition, setFlowPosition] = useState(0);
  const [isFlowing, setIsFlowing] = useState(false);
  const [selectedFluid, setSelectedFluid] = useState<'syrup' | 'water' | 'oil'>('syrup');

  // Animation
  const animationRef = useRef<number>();
  const [animTime, setAnimTime] = useState(0);

  // Test state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

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

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  useEffect(() => {
    const animate = () => {
      setAnimTime(t => t + 0.016);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Flow simulation
  useEffect(() => {
    if (isFlowing) {
      const viscosity = calculateViscosity(temperature, selectedFluid);
      const flowSpeed = Math.max(0.1, 100 / viscosity);

      const interval = setInterval(() => {
        setFlowPosition(prev => {
          if (prev >= 100) {
            setIsFlowing(false);
            return 0;
          }
          return prev + flowSpeed;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isFlowing, temperature, selectedFluid]);

  const calculateViscosity = (temp: number, fluid: 'syrup' | 'water' | 'oil') => {
    // Arrhenius-like relationship: η = A * e^(B/T)
    const params = {
      syrup: { A: 0.1, B: 2000, base: 100 },
      water: { A: 0.5, B: 500, base: 1 },
      oil: { A: 0.2, B: 1200, base: 30 }
    };
    const p = params[fluid];
    const T = temp + 273; // Convert to Kelvin
    return p.base * Math.exp(p.B / T - p.B / 293); // Normalized to room temp
  };

  const viscosity = useMemo(() => calculateViscosity(temperature, selectedFluid), [temperature, selectedFluid]);

  const emitGameEvent = useCallback((eventType: string, details: any) => {
    onGameEvent?.({ type: eventType, data: { ...details, phase, gameId: GAME_ID } });
  }, [onGameEvent, phase]);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(p);
    playSound('transition');
    emitGameEvent('phase_changed', { phase: p });
    if (p === 'test') {
      setTestQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setShowExplanation(false);
    }
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 30) return colors.cold;
    if (temp < 60) return colors.warm;
    return colors.hot;
  };

  // ============================================================
  // VISUALIZATION
  // ============================================================

  const renderVisualization = (interactive: boolean = false) => {
    const W = 680;
    const H = 380;
    const tempColor = getTemperatureColor(temperature);

    // Chart area: x from 70 to 640, y from 40 to 290 (top=high viscosity, bottom=low viscosity)
    const chartLeft = 70;
    const chartRight = 640;
    const chartTop = 40;
    const chartBottom = 290;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    // Map temperature (0-100) to x coordinate
    const tempToX = (t: number) => chartLeft + (t / 100) * chartW;
    // Map viscosity (1=low → bottom, 5=high → top) to y
    // Arrhenius: η = A * exp(Ea/(R*T)); simplified: η(T) = 5 * exp(-0.03 * (T - 0))
    const viscAtTemp = (t: number) => 5 * Math.exp(-0.035 * t);
    const viscToY = (v: number) => {
      const vMin = viscAtTemp(100); // ~0.03
      const vMax = viscAtTemp(0);   // ~5
      return chartBottom - ((v - vMin) / (vMax - vMin)) * chartH;
    };

    // Current temperature marker
    const curX = tempToX(interactive ? temperature : 50);
    const curVisc = viscAtTemp(interactive ? temperature : 50);
    const curY = viscToY(curVisc);

    // Build path for syrup curve
    const curvePoints: string[] = [];
    for (let t = 0; t <= 100; t += 5) {
      const x = tempToX(t);
      const y = viscToY(viscAtTemp(t));
      curvePoints.push(`${t === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const curvePath = curvePoints.join(' ');

    // Grid line temperatures
    const gridTemps = [0, 20, 40, 60, 80, 100];
    // Grid line viscosity values
    const gridViscs = [0.5, 1, 2, 3, 4, 5];

    return (
      <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="viscBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="viscCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.cold} />
              <stop offset="50%" stopColor={colors.warm} />
              <stop offset="100%" stopColor={colors.hot} />
            </linearGradient>
            <linearGradient id="viscFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.syrup} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.syrup} stopOpacity="0.05" />
            </linearGradient>
            <filter id="viscGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="viscDropShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={W} height={H} fill="url(#viscBgGrad)" rx="12" />
          <rect x={chartLeft} y={chartTop} width={chartW} height={chartH} fill="#0a1628" rx="4" />

          {/* Title */}
          <text x={W / 2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="15" fontWeight="bold">
            Viscosity vs Temperature — Arrhenius Relationship
          </text>

          {/* Y-axis label (vertical) */}
          <text x="18" y="180" textAnchor="middle" fill={colors.textSecondary} fontSize="11" transform="rotate(-90 18 180)">
            Viscosity (Pa·s)
          </text>

          {/* X-axis label */}
          <text x={chartLeft + chartW / 2} y={H - 5} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            Temperature (°C)
          </text>

          {/* Horizontal grid lines (viscosity levels) */}
          {gridViscs.map(v => {
            const gy = viscToY(v);
            if (gy < chartTop || gy > chartBottom) return null;
            return (
              <g key={`grid-v-${v}`}>
                <line x1={chartLeft} y1={gy} x2={chartRight} y2={gy} stroke="#334155" strokeDasharray="4,6" strokeWidth="1" opacity="0.6" />
                <text x={chartLeft - 6} y={gy + 4} textAnchor="end" fill="#64748b" fontSize="11">{v}</text>
              </g>
            );
          })}

          {/* Vertical grid lines (temperature ticks) */}
          {gridTemps.map(t => {
            const gx = tempToX(t);
            return (
              <g key={`grid-t-${t}`}>
                <line x1={gx} y1={chartTop} x2={gx} y2={chartBottom} stroke="#334155" strokeDasharray="4,6" strokeWidth="1" opacity="0.6" />
                <text x={gx} y={chartBottom + 16} textAnchor="middle" fill="#64748b" fontSize="11">{t}°C</text>
              </g>
            );
          })}

          {/* Axis lines */}
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#475569" strokeWidth="2" />
          <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#475569" strokeWidth="2" />

          {/* Area fill under curve */}
          <path
            d={`${curvePath} L ${chartRight} ${chartBottom} L ${chartLeft} ${chartBottom} Z`}
            fill="url(#viscFillGrad)"
            opacity="0.4"
          />

          {/* Main viscosity curve */}
          <path
            d={curvePath}
            fill="none"
            stroke="url(#viscCurveGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#viscGlow)"
          />

          {/* Current temperature indicator (vertical dashed line) */}
          {interactive && (
            <line
              x1={curX} y1={chartTop}
              x2={curX} y2={chartBottom}
              stroke={tempColor}
              strokeWidth="1.5"
              strokeDasharray="4,3"
              opacity="0.7"
            />
          )}

          {/* Current point on curve */}
          <circle cx={curX} cy={curY} r="7" fill={tempColor} filter="url(#viscGlow)" />
          <circle cx={curX} cy={curY} r="4" fill="white" />

          {/* Current viscosity readout */}
          <rect x={curX + 10} y={curY - 20} width="110" height="28" rx="4" fill="#1e293b" stroke={tempColor} strokeWidth="1" />
          <text x={curX + 65} y={curY - 2} textAnchor="middle" fill={tempColor} fontSize="11" fontWeight="bold">
            {interactive ? `${temperature}°C → ${curVisc.toFixed(2)} Pa·s` : `50°C → ${curVisc.toFixed(2)} Pa·s`}
          </text>

          {/* Zone labels */}
          <rect x={chartLeft + 5} y={chartTop + 8} width="72" height="18" rx="3" fill={`${colors.cold}30`} />
          <text x={chartLeft + 41} y={chartTop + 21} textAnchor="middle" fill={colors.cold} fontSize="11" fontWeight="bold">High Viscosity</text>

          <rect x={chartRight - 80} y={chartBottom - 26} width="72" height="18" rx="3" fill={`${colors.hot}30`} />
          <text x={chartRight - 44} y={chartBottom - 13} textAnchor="middle" fill={colors.hot} fontSize="11" fontWeight="bold">Low Viscosity</text>

          {/* Formula area at bottom */}
          <rect x={chartLeft} y={H - 60} width={chartW} height="48" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x={chartLeft + 12} y={H - 42} fill={colors.textMuted} fontSize="11">Arrhenius: η = A × e^(Ea/R·T)</text>
          <text x={chartLeft + 12} y={H - 24} fill={colors.textMuted} fontSize="11">
            {interactive ? `Current: η=${curVisc.toFixed(3)} Pa·s at T=${interactive ? temperature : 50}K` : 'Drag slider to explore temperature-viscosity relationship'}
          </text>
        </svg>
      </div>
    );
  };

  // ============================================================
  // BOTTOM BAR
  // ============================================================

  const renderBottomBar = (showBack: boolean, canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const handleNext = () => {
      if (!canProceed) return;
      playSound('click');
      if (onNext) {
        onNext();
      } else {
        const currentIndex = validPhases.indexOf(phase);
        if (currentIndex < validPhases.length - 1) {
          goToPhase(validPhases[currentIndex + 1]);
        }
      }
    };

    const handleBack = () => {
      playSound('click');
      const currentIndex = validPhases.indexOf(phase);
      if (currentIndex > 0) {
        goToPhase(validPhases[currentIndex - 1]);
      }
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        minHeight: '72px',
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        {showBack ? (
          <button
            onClick={handleBack}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bgCardLight,
              color: colors.textSecondary,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            ← Back
          </button>
        ) : <div />}

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {validPhases.map((p, i) => {
            const dotIdx = validPhases.indexOf(phase);
            return (
              <div
                key={p}
                onClick={() => i < dotIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === dotIdx ? '20px' : '8px',
                  borderRadius: '4px',
                  backgroundColor: i < dotIdx ? colors.primary : i === dotIdx ? colors.accent : colors.border,
                  cursor: i < dotIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
              />
            );
          })}
        </div>

        {canProceed ? (
          <button
            onClick={handleNext}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '52px',
              minWidth: '160px',
              boxShadow: `0 4px 15px ${colors.primary}40`,
              transition: 'all 0.2s ease-out',
            }}
          >
            {nextLabel}
          </button>
        ) : (
          <div style={{
            padding: '14px 28px',
            borderRadius: '12px',
            backgroundColor: colors.bgCardLight,
            color: colors.textMuted,
            fontSize: '14px',
            fontWeight: 500,
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center'
          }}>
            Select an option above
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // PHASE RENDERS
  // ============================================================

  if (phase === 'hook') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: isMobile ? '80px' : '120px', marginBottom: '20px' }}>
              🍯
            </div>

            <h1 style={{
              fontSize: isMobile ? '28px' : '40px',
              fontWeight: 800,
              color: colors.textPrimary,
              marginBottom: '16px'
            }}>
              Why Does Warm Syrup Flow Faster?
            </h1>

            <p style={{
              fontSize: isMobile ? '16px' : '20px',
              color: colors.textSecondary,
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6,
              fontWeight: '400',
            }}>
              Cold syrup barely moves... warm syrup <strong style={{ color: colors.primaryLight }}>pours easily</strong>.
              What's happening inside?
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🧊</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Cold syrup...</p>
                  <p style={{ color: colors.cold, fontSize: '16px', fontWeight: 600 }}>Crawls slowly</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔥</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Warm syrup...</p>
                  <p style={{ color: colors.hot, fontSize: '16px', fontWeight: 600 }}>Flows freely!</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic' }}>
              Temperature changes <strong style={{ color: colors.primaryLight }}>viscosity</strong> — the fluid's resistance to flow.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, "Start Investigating →")}
      </div>
    );
  }

  if (phase === 'predict') {
    const predictions = [
      { id: 'cold_faster', label: 'Cold syrup flows faster (cold makes things move quicker)', icon: '❄️' },
      { id: 'warm_faster', label: 'Warm syrup flows faster (heat reduces thickness)', icon: '🔥' },
      { id: 'same', label: 'Same speed — temperature doesn\'t affect flow', icon: '➡️' },
      { id: 'depends', label: 'It depends on the type of syrup', icon: '🤔' }
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 1 • Make a Prediction
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Syrup Flow Experiment
              </h2>
            </div>

            <div style={{
              width: '100%',
              maxWidth: '700px',
              margin: '0 auto 20px auto',
              aspectRatio: '16/10',
              background: colors.bgCard,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden'
            }}>
              {renderVisualization(false)}
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                📋 What You're Looking At:
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                A tilted plate with <strong style={{ color: colors.syrupLight }}>maple syrup</strong> at the top.
                The thermometer shows the temperature. We'll compare how fast the syrup flows
                down the plate at different temperatures.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 Which flows faster: cold or warm syrup?
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPrediction(p.id);
                      playSound('click');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {prediction === p.id && (
                      <span style={{ color: colors.primary, fontSize: '20px', fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {prediction && (
              <div style={{
                background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.primary}30`
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                  💭 Why do you think this? <span style={{ color: colors.textMuted }}>(Optional)</span>
                </p>
                <textarea
                  placeholder="Share your reasoning..."
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 2 • Experiment
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Adjust Temperature & Watch Flow
              </h2>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  width: '100%',
                  background: colors.bgCard,
                  borderRadius: '16px',
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {renderVisualization(true)}
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${getTemperatureColor(temperature)}15 0%, ${colors.bgCard} 100%)`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  border: `1px solid ${getTemperatureColor(temperature)}40`
                }}>
                  <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                    👀 Observe the Chart — Watch How Viscosity Changes:
                  </h4>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                    {temperature < 30 ? (
                      <>At <strong style={{ color: colors.cold }}>low temperature</strong>, molecules move slowly and have strong attractions. High viscosity = slow flow.</>
                    ) : temperature < 60 ? (
                      <>At <strong style={{ color: colors.warm }}>moderate temperature</strong>, molecules have more energy to overcome attractions. Medium viscosity = moderate flow.</>
                    ) : (
                      <>At <strong style={{ color: colors.hot }}>high temperature</strong>, molecules move fast and easily overcome attractions. Low viscosity = fast flow!</>
                    )}
                  </p>
                </div>

                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`
                }}>
                  <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                    📐 The Physics (Arrhenius Equation):
                  </h4>
                  <div style={{ fontFamily: 'monospace', fontSize: '16px', marginBottom: '12px' }}>
                    <span style={{ color: colors.primaryLight, fontWeight: 700 }}>η</span>
                    <span style={{ color: colors.textSecondary }}> = </span>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>A</span>
                    <span style={{ color: colors.textSecondary }}> × e</span>
                    <span style={{ color: colors.textSecondary, fontSize: '12px' }}>(Ea/R·</span>
                    <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: '14px' }}>T</span>
                    <span style={{ color: colors.textSecondary, fontSize: '12px' }}>)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.8 }}>
                    <div><span style={{ color: colors.primaryLight, fontWeight: 700 }}>η</span> (eta) = Viscosity (Pa·s)</div>
                    <div><span style={{ color: '#fbbf24', fontWeight: 700 }}>A</span> = Pre-exponential factor</div>
                    <div><span style={{ color: '#22d3ee', fontWeight: 700 }}>T</span> = Temperature (Kelvin)</div>
                    <div>Higher <span style={{ color: '#22d3ee', fontWeight: 700 }}>T</span> → exponentially lower <span style={{ color: colors.primaryLight, fontWeight: 700 }}>η</span></div>
                  </div>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px', lineHeight: 1.5 }}>
                    This is important in engineering and industry: motor oil viscosity determines engine lubrication,
                    and technology like inkjet printing relies on precise viscosity control at operating temperature.
                  </p>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`
                }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                    🎮 Controls: Adjust Temperature
                  </h3>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: colors.cold, fontSize: '13px', fontWeight: 600 }}>❄️ Cold (0°C)</span>
                      <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>
                        {temperature}°C
                      </span>
                      <span style={{ color: colors.hot, fontSize: '13px', fontWeight: 600 }}>Hot (100°C) 🔥</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      onInput={(e) => setTemperature(Number((e.target as HTMLInputElement).value))}
                      style={{
                        width: '100%',
                        height: '24px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        accentColor: getTemperatureColor(temperature),
                        touchAction: 'pan-y',
                        WebkitAppearance: 'none' as const,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setFlowPosition(0);
                        setIsFlowing(true);
                        playSound('click');
                      }}
                      disabled={isFlowing}
                      style={{
                        padding: '14px 28px',
                        borderRadius: '12px',
                        border: 'none',
                        background: isFlowing
                          ? colors.bgCardLight
                          : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                        color: isFlowing ? colors.textMuted : 'white',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: isFlowing ? 'default' : 'pointer',
                        minWidth: '150px'
                      }}
                    >
                      {isFlowing ? '🍯 Flowing...' : '🍯 Pour Syrup'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Results →')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'warm_faster';

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: wasCorrect ? `${colors.success}15` : `${colors.primary}15`,
              borderRadius: '16px',
              marginBottom: '24px',
              border: `1px solid ${wasCorrect ? colors.success : colors.primary}40`
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                {wasCorrect ? '🎯' : '💡'}
              </div>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: 700,
                color: wasCorrect ? colors.success : colors.primaryLight,
                marginBottom: '8px'
              }}>
                {wasCorrect ? 'Excellent Prediction!' : 'Great Learning Moment!'}
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: '400' }}>
                As you observed in the experiment, warm syrup flows faster because heat reduces viscosity.
                Your prediction was {wasCorrect ? 'correct' : 'a great learning step'}! The Arrhenius equation: η = A·e^(Ea/RT) shows this relationship.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                🔬 Why Temperature Affects Viscosity
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.cold} 0%, ${colors.coldLight} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, flexShrink: 0
                  }}>1</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      Cold: Strong Molecular Bonds
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      At low temperatures, molecules move slowly. Intermolecular attractions are hard to break.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.warm} 0%, ${colors.warmLight} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, flexShrink: 0
                  }}>2</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      Heating: Adding Energy
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      Heat gives molecules kinetic energy. They vibrate and move faster.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.hot} 0%, ${colors.hotLight} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, flexShrink: 0
                  }}>3</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      Hot: Weak Bonds, Easy Flow
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      Fast-moving molecules easily overcome attractions. Low viscosity = fast flow!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}20 100%)`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.primary}40`
            }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                💡 Key Insight
              </h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                The relationship is <strong style={{ color: colors.textPrimary }}>exponential</strong>, not linear.
                A small temperature increase causes a large viscosity decrease. This is why warming
                your syrup bottle in hot water makes such a big difference!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Try a Twist →')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'all_same', label: 'All liquids respond the same way to temperature', icon: '🟰' },
      { id: 'syrup_more', label: 'Syrup\'s viscosity changes more than water\'s', icon: '🍯' },
      { id: 'water_more', label: 'Water\'s viscosity changes more than syrup\'s', icon: '💧' },
      { id: 'opposite', label: 'Some liquids get thicker when heated', icon: '🔄' }
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                🔄 Twist • Compare Fluids
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Syrup vs Water vs Oil
              </h2>
            </div>

            {/* Static SVG showing viscosity comparison - no sliders */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', display: 'block' }}>
                <defs>
                  <linearGradient id="twistBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e1b4b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect x="0" y="0" width="400" height="200" fill="url(#twistBg)" rx="12" />
                {/* Y axis */}
                <line x1="50" y1="20" x2="50" y2="170" stroke="#475569" strokeWidth="1.5" />
                {/* X axis */}
                <line x1="50" y1="170" x2="380" y2="170" stroke="#475569" strokeWidth="1.5" />
                {/* Grid lines */}
                {[60,100,140].map(gy => (
                  <line key={gy} x1="50" y1={gy} x2="380" y2={gy} stroke="#334155" strokeDasharray="3,4" opacity="0.5" />
                ))}
                {/* Axis labels */}
                <text x="200" y="190" textAnchor="middle" fill="#94a3b8" fontSize="11">Temperature →</text>
                <text x="20" y="100" textAnchor="middle" fill="#94a3b8" fontSize="11" transform="rotate(-90,20,100)">Viscosity</text>
                {/* Syrup curve - steeply decreasing (most sensitive) */}
                <path d="M 60 35 Q 160 60 280 140 Q 340 158 370 168" fill="none" stroke={colors.syrupLight} strokeWidth="3" filter="url(#twistGlow)" />
                <text x="375" y="166" fill={colors.syrupLight} fontSize="11" fontWeight="bold">Syrup</text>
                {/* Oil curve - moderately decreasing */}
                <path d="M 60 80 Q 160 100 280 145 Q 340 158 370 168" fill="none" stroke={colors.oil} strokeWidth="2.5" />
                <text x="375" y="148" fill={colors.oil} fontSize="11" fontWeight="bold">Oil</text>
                {/* Water curve - low sensitivity but visible span */}
                <path d="M 60 110 Q 160 125 280 148 Q 340 158 370 168" fill="none" stroke={colors.cold} strokeWidth="2" />
                <text x="60" y="108" fill={colors.cold} fontSize="11" fontWeight="bold">Water</text>
                {/* Cold/Hot labels */}
                <text x="60" y="183" textAnchor="middle" fill="#60a5fa" fontSize="11">Cold</text>
                <text x="370" y="183" textAnchor="middle" fill="#ef4444" fontSize="11">Hot</text>
              </svg>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                📋 The Question:
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Do all liquids respond to temperature changes in the same way?
                Which one's viscosity is most sensitive to temperature?
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 How do different fluids compare?
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {twistPredictions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setTwistPrediction(p.id);
                      playSound('click');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: twistPrediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                      backgroundColor: twistPrediction === p.id ? `${colors.accent}20` : colors.bgCard,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {twistPrediction === p.id && (
                      <span style={{ color: colors.accent, fontSize: '20px', fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'See the Comparison →')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                🔄 Twist Comparison
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Temperature Sensitivity Varies!
              </h2>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  width: '100%',
                  background: colors.bgCard,
                  borderRadius: '16px',
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {renderVisualization(true)}
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.primary}10 100%)`,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`
                }}>
                  <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                    👀 Key Observation:
                  </h4>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: colors.syrupLight }}>Syrup</strong> shows the most dramatic change!
                    Its complex sugar molecules have strong hydrogen bonds that weaken significantly with temperature.
                    <strong style={{ color: colors.cold }}> Water</strong> changes much less because its
                    molecules are small and simple.
                  </p>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Fluid selector */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  flexWrap: 'wrap'
                }}>
                  {(['syrup', 'water', 'oil'] as const).map(fluid => (
                    <button
                      key={fluid}
                      onClick={() => {
                        setSelectedFluid(fluid);
                        playSound('click');
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: selectedFluid === fluid ? `2px solid ${fluid === 'syrup' ? colors.syrupLight : fluid === 'water' ? colors.cold : colors.oil}` : `1px solid ${colors.border}`,
                        background: selectedFluid === fluid ? `${fluid === 'syrup' ? colors.syrupLight : fluid === 'water' ? colors.cold : colors.oil}20` : colors.bgCard,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{fluid === 'syrup' ? '🍯' : fluid === 'water' ? '💧' : '🫒'}</span>
                      <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {fluid}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Temperature control */}
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px',
                  border: `1px solid ${colors.border}`
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: colors.cold, fontSize: '13px' }}>Cold</span>
                      <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>{temperature}°C</span>
                      <span style={{ color: colors.hot, fontSize: '13px' }}>Hot</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      style={{ width: '100%', accentColor: getTemperatureColor(temperature) }}
                    />
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ padding: '12px', background: colors.bgDark, borderRadius: '8px' }}>
                      <p style={{ color: colors.syrupLight, fontSize: '12px', marginBottom: '4px' }}>Syrup</p>
                      <p style={{ color: colors.textPrimary, fontWeight: 700 }}>
                        {calculateViscosity(temperature, 'syrup').toFixed(1)}
                      </p>
                    </div>
                    <div style={{ padding: '12px', background: colors.bgDark, borderRadius: '8px' }}>
                      <p style={{ color: colors.cold, fontSize: '12px', marginBottom: '4px' }}>Water</p>
                      <p style={{ color: colors.textPrimary, fontWeight: 700 }}>
                        {calculateViscosity(temperature, 'water').toFixed(2)}
                      </p>
                    </div>
                    <div style={{ padding: '12px', background: colors.bgDark, borderRadius: '8px', gridColumn: 'span 2' }}>
                      <p style={{ color: colors.oil, fontSize: '12px', marginBottom: '4px' }}>Oil</p>
                      <p style={{ color: colors.textPrimary, fontWeight: 700 }}>
                        {calculateViscosity(temperature, 'oil').toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Review Results →')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'syrup_more';

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: wasCorrect ? `${colors.success}15` : `${colors.accent}15`,
              borderRadius: '16px',
              marginBottom: '24px',
              border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{wasCorrect ? '🎯' : '💡'}</div>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: 700,
                color: colors.textPrimary,
                marginBottom: '8px'
              }}>
                Different Fluids, Different Sensitivities!
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Complex molecules (like sugars) are more temperature-sensitive than simple ones.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                📊 Viscosity-Temperature Sensitivity
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  background: `${colors.syrupLight}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.syrupLight}`
                }}>
                  <strong style={{ color: colors.syrupLight }}>Syrup/Honey (HIGH sensitivity):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Large sugar molecules with many hydrogen bonds. Temperature breaks these bonds dramatically.
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: `${colors.oil}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.oil}`
                }}>
                  <strong style={{ color: colors.oil }}>Oil (MEDIUM sensitivity):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Long hydrocarbon chains with moderate intermolecular forces.
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: `${colors.cold}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.cold}`
                }}>
                  <strong style={{ color: colors.cold }}>Water (LOW sensitivity):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Small, simple molecules. Viscosity changes only ~3x from ice water to boiling.
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}20 100%)`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.primary}40`
            }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                🌍 Real-World Application
              </h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                This is why motor oil needs special additives for all-season use. The base oil's
                viscosity would change too much between winter (-20°C) and a hot engine (100°C+).
                Viscosity index improvers keep it stable across this range!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // Transfer, Test, and Mastery phases follow the same pattern as previous games
  // (abbreviated here for length - full implementation follows identical structure)

  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Viscosity Temperature"
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
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                🌍 Real-World Applications
              </p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
                Temperature-Viscosity in Action
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedApp(i); playSound('click'); }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                    background: selectedApp === i ? `${a.color}20` : colors.bgCard,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{a.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600 }}>{a.short}</span>
                  {completedApps[i] && <span style={{ color: colors.success, fontSize: '16px' }}>✓</span>}
                </button>
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '16px',
                  background: `${app.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px'
                }}>{app.icon}</div>
                <div>
                  <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700, margin: 0 }}>{app.title}</h3>
                  <p style={{ color: app.color, fontSize: '14px', fontWeight: 600, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>{app.description}</p>

              <div style={{
                background: `${app.color}15`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                borderLeft: `4px solid ${app.color}`
              }}>
                <h4 style={{ color: app.color, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔗 Connection:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{app.connection}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>⚙️ How It Works:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{app.howItWorks}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{ background: colors.bgDark, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ color: app.color, fontSize: '18px', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📋 Examples:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.8, margin: 0, paddingLeft: '20px' }}>
                  {app.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                </ul>
              </div>

              <div style={{ background: `linear-gradient(135deg, ${colors.bgDark} 0%, ${app.color}10 100%)`, borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🚀 Future:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{app.futureImpact}</p>
              </div>
            </div>

            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');
                const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                if (nextIncomplete !== -1) setSelectedApp(nextIncomplete);
                else {
                  const firstIncomplete = newCompleted.findIndex(c => !c);
                  if (firstIncomplete !== -1) setSelectedApp(firstIncomplete);
                }
              }}
              disabled={completedApps[selectedApp]}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: completedApps[selectedApp] ? colors.bgCardLight : `linear-gradient(135deg, ${app.color} 0%, ${colors.accent} 100%)`,
                color: completedApps[selectedApp] ? colors.textMuted : 'white',
                fontSize: '16px',
                fontWeight: 700,
                cursor: completedApps[selectedApp] ? 'default' : 'pointer',
                minHeight: '52px'
              }}
            >
              {completedApps[selectedApp] ? '✓ Completed' : 'Got It! Continue →'}
            </button>

            <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '13px', marginTop: '12px' }}>
              {completedApps.filter(c => c).length} of 4 completed {allCompleted && '— Ready for test!'}
            </p>
          </div>
        </div>
        {renderBottomBar(true, allCompleted, 'Take the Test →')}
      </div>
    );
  }

  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const selectedAnswer = testAnswers[testQuestion];
    const isCorrect = selectedAnswer === currentQ.options.find(o => o.correct)?.id;

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>Question {testQuestion + 1} of 10</span>
                <span style={{ color: colors.textMuted, fontSize: '14px' }}>{testAnswers.filter(a => a !== null).length} answered</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: '4px', borderRadius: '2px',
                    background: i === testQuestion ? colors.primary : testAnswers[i] !== null ? colors.success : colors.bgCardLight
                  }} />
                ))}
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SCENARIO</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{currentQ.scenario}</p>
            </div>

            <h3 style={{ color: colors.textPrimary, fontSize: isMobile ? '18px' : '20px', fontWeight: 700, marginBottom: '20px', lineHeight: 1.4 }}>
              {currentQ.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {currentQ.options.map((opt) => {
                const isSelected = selectedAnswer === opt.id;
                const showCorrect = showExplanation && opt.correct;
                const showWrong = showExplanation && isSelected && !opt.correct;

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!showExplanation) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testQuestion] = opt.id;
                        setTestAnswers(newAnswers);
                        playSound('click');
                      }
                    }}
                    disabled={showExplanation}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: showCorrect ? `2px solid ${colors.success}` : showWrong ? `2px solid ${colors.error}` : isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      backgroundColor: showCorrect ? `${colors.success}15` : showWrong ? `${colors.error}15` : isSelected ? `${colors.primary}20` : colors.bgCard,
                      cursor: showExplanation ? 'default' : 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: showCorrect ? `0 0 20px ${colors.success}30` : 'none'
                    }}
                  >
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{opt.label}</span>
                    {showCorrect && <span style={{ color: colors.success, fontSize: '20px' }}>✓</span>}
                    {showWrong && <span style={{ color: colors.error, fontSize: '20px' }}>✗</span>}
                    {!showExplanation && isSelected && <span style={{ color: colors.primary, fontSize: '20px' }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {selectedAnswer && !showExplanation && (
              <button
                onClick={() => { setShowExplanation(true); playSound(isCorrect ? 'success' : 'failure'); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginBottom: '20px'
                }}
              >
                Check Answer
              </button>
            )}

            {showExplanation && (
              <div style={{
                background: isCorrect ? `${colors.success}15` : `${colors.primary}15`,
                borderRadius: '12px', padding: '16px', marginBottom: '20px',
                border: `1px solid ${isCorrect ? colors.success : colors.primary}40`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '💡'}</span>
                  <span style={{ color: isCorrect ? colors.success : colors.primaryLight, fontSize: '16px', fontWeight: 700 }}>
                    {isCorrect ? 'Correct!' : 'Explanation'}
                  </span>
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{currentQ.explanation}</p>
              </div>
            )}
          </div>
        </div>

        {showExplanation ? (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, minHeight: '72px',
            background: colors.bgCard, borderTop: `1px solid ${colors.border}`,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', padding: '12px 20px',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <button
              onClick={() => {
                if (testQuestion < 9) {
                  setTestQuestion(testQuestion + 1);
                  setShowExplanation(false);
                  playSound('click');
                } else {
                  goToPhase('mastery');
                }
              }}
              style={{
                padding: '14px 28px', borderRadius: '12px', border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                minHeight: '52px', minWidth: '200px'
              }}
            >
              {testQuestion < 9 ? 'Next Question →' : 'See Results →'}
            </button>
          </div>
        ) : (
          renderBottomBar(true, false, 'Select an answer')
        )}
      </div>
    );
  }

  if (phase === 'mastery') {
    const score = calculateTestScore();
    const percentage = score * 10;
    const passed = percentage >= 70;

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🏆' : '📚'}</div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px', fontWeight: 800,
              color: passed ? colors.success : colors.primaryLight, marginBottom: '8px'
            }}>
              {passed ? 'Mastery Achieved!' : 'Keep Learning!'}
            </h2>

            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '32px' }}>
              {passed ? 'You\'ve mastered viscosity-temperature relationships!' : 'Review the concepts and try again.'}
            </p>

            <div style={{
              background: colors.bgCard, borderRadius: '20px', padding: '32px', marginBottom: '24px',
              border: `1px solid ${passed ? colors.success : colors.border}40`
            }}>
              <div style={{ fontSize: '64px', fontWeight: 800, color: passed ? colors.success : colors.primaryLight, marginBottom: '8px' }}>
                {percentage}%
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '16px', margin: 0 }}>{score} of 10 correct</p>

              <div style={{ height: '8px', background: colors.bgDark, borderRadius: '4px', marginTop: '20px', overflow: 'hidden' }}>
                <div style={{
                  width: `${percentage}%`, height: '100%',
                  background: passed ? `linear-gradient(90deg, ${colors.success} 0%, ${colors.successLight} 100%)` : `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  borderRadius: '4px'
                }} />
              </div>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>70% required to pass</p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🎓 What You Learned:</h3>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 2, margin: 0, paddingLeft: '20px' }}>
                <li>Higher temperature = lower viscosity (faster flow)</li>
                <li>The relationship is exponential (Arrhenius equation)</li>
                <li>Complex molecules are more temperature-sensitive</li>
                <li>Applications: motor oil, glass, chocolate, lava</li>
                <li>Engineers design fluids for specific temperature ranges</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!passed && (
                <button
                  onClick={() => goToPhase('predict')}
                  style={{
                    padding: '16px', borderRadius: '12px', border: 'none',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                    color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  🔄 Try Again
                </button>
              )}
              <button
                onClick={() => { onComplete?.(); playSound('complete'); }}
                style={{
                  padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`,
                  background: colors.bgCard, color: colors.textPrimary, fontSize: '16px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                ← Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ViscosityTemperatureRenderer;
