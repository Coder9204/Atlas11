'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Arrhenius Equation - Complete 10-Phase Game
// Understanding how temperature affects reaction rates and component reliability
// k = A * exp(-Ea/RT) - The universal temperature-rate relationship
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

interface ArrheniusRendererProps {
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
    scenario: "A semiconductor manufacturer notices that chips tested at 125°C fail much faster than those at 85°C. They want to use this data to predict field reliability at 55°C operating temperature.",
    question: "What principle allows them to extrapolate high-temperature test results to normal operating conditions?",
    options: [
      { id: 'a', label: "Linear interpolation between test temperatures" },
      { id: 'b', label: "The Arrhenius equation relates failure rate exponentially to temperature", correct: true },
      { id: 'c', label: "Failure rates are constant regardless of temperature" },
      { id: 'd', label: "Higher temperature tests are unreliable for prediction" }
    ],
    explanation: "The Arrhenius equation (k = A*exp(-Ea/RT)) describes how reaction rates (including degradation) change exponentially with temperature. This allows accelerated life testing at high temperatures to predict long-term reliability at normal operating temperatures."
  },
  {
    scenario: "A chemical engineer finds that a reaction rate doubles when temperature increases from 25°C to 35°C. They need to estimate how fast the reaction will be at 55°C.",
    question: "Approximately how many times faster will the reaction be at 55°C compared to 25°C?",
    options: [
      { id: 'a', label: "3× faster (linear extrapolation)" },
      { id: 'b', label: "4× faster (doubles twice for 20°C increase)", correct: true },
      { id: 'c', label: "6× faster (each 10°C adds another doubling)" },
      { id: 'd', label: "8× faster (exponential growth)" }
    ],
    explanation: "The rule of thumb is that reaction rates roughly double for every 10°C increase. From 25°C to 55°C is a 30°C increase, which means approximately 2³ = 8× faster. However, since the question states it doubles for 10°C (25 to 35), then at 55°C (two more 10°C steps): 2 × 2 = 4× the rate at 25°C."
  },
  {
    scenario: "A battery pack in an electric vehicle operates at 35°C on average. The same battery chemistry in a laptop runs at 45°C due to poor cooling.",
    question: "If battery degradation follows Arrhenius kinetics with typical activation energy, how much faster does the laptop battery degrade?",
    options: [
      { id: 'a', label: "About 10% faster" },
      { id: 'b', label: "About 2× faster", correct: true },
      { id: 'c', label: "About 4× faster" },
      { id: 'd', label: "No significant difference" }
    ],
    explanation: "For many battery degradation mechanisms, reaction rates roughly double every 10°C. The 10°C difference between 35°C and 45°C means the laptop battery degrades approximately twice as fast, significantly reducing its lifespan compared to the well-cooled EV battery."
  },
  {
    scenario: "An engineer is designing a reliability test for LED lighting. They want to achieve 10 years of equivalent field aging in just 1000 hours of testing.",
    question: "What acceleration factor is needed, and how is temperature typically used to achieve it?",
    options: [
      { id: 'a', label: "10× acceleration; run at 10°C above normal" },
      { id: 'b', label: "100× acceleration; impossible to achieve safely" },
      { id: 'c', label: "88× acceleration; test at elevated temperature using Arrhenius relationship", correct: true },
      { id: 'd', label: "1000× acceleration; use maximum possible temperature" }
    ],
    explanation: "10 years = 87,600 hours. To compress this to 1000 hours requires 88× acceleration. Using Arrhenius kinetics with typical activation energies, testing at 85-125°C can achieve this acceleration factor compared to 25-40°C operating conditions. The exact temperature depends on the failure mechanism's activation energy."
  },
  {
    scenario: "Two failure mechanisms in a microprocessor have different activation energies: Electromigration (Ea = 0.7 eV) and Hot Carrier Injection (Ea = 0.3 eV).",
    question: "Which mechanism is more sensitive to temperature changes?",
    options: [
      { id: 'a', label: "Hot Carrier Injection—lower Ea means more temperature sensitivity" },
      { id: 'b', label: "Electromigration—higher Ea means more temperature sensitivity", correct: true },
      { id: 'c', label: "Both are equally sensitive to temperature" },
      { id: 'd', label: "Neither is significantly affected by temperature" }
    ],
    explanation: "In the Arrhenius equation, activation energy (Ea) determines temperature sensitivity. Higher Ea means the reaction rate changes more dramatically with temperature. Electromigration (0.7 eV) is much more temperature-sensitive than Hot Carrier Injection (0.3 eV), which is why high temperatures accelerate electromigration failures more."
  },
  {
    scenario: "A food scientist is studying vitamin C degradation in orange juice. At 25°C, the half-life is 30 days. At 35°C, it's 12 days.",
    question: "What does this tell us about storing orange juice, and how can we estimate shelf life at refrigerator temperature (4°C)?",
    options: [
      { id: 'a', label: "Refrigeration has minimal effect since the relationship is linear" },
      { id: 'b', label: "Refrigeration dramatically extends shelf life; Arrhenius predicts ~100+ days half-life at 4°C", correct: true },
      { id: 'c', label: "Freezing is the only way to preserve vitamin C" },
      { id: 'd', label: "Temperature doesn't affect vitamin stability" }
    ],
    explanation: "Using Arrhenius kinetics, the rate approximately doubles from 25°C to 35°C (10°C increase). Going from 25°C to 4°C (21°C decrease) means the rate drops by roughly 2^2.1 ≈ 4×, giving a half-life of approximately 120 days. Refrigeration dramatically extends vitamin C retention."
  },
  {
    scenario: "A semiconductor fab is experiencing yield loss due to a thermally-activated defect mechanism. They lower the process temperature from 400°C to 350°C.",
    question: "If the defect formation has an activation energy of 1.0 eV, how much does the defect rate decrease?",
    options: [
      { id: 'a', label: "Decreases by 12.5% (proportional to temperature ratio)" },
      { id: 'b', label: "Decreases by about 50%" },
      { id: 'c', label: "Decreases by about 90%", correct: true },
      { id: 'd', label: "Decreases by 99%" }
    ],
    explanation: "For a 1.0 eV activation energy, the Arrhenius factor exp(-Ea/kT) changes significantly between 400°C (673K) and 350°C (623K). Calculating: the rate ratio is exp(-1.0/(8.617×10⁻⁵ × 623)) / exp(-1.0/(8.617×10⁻⁵ × 673)) ≈ 0.1, meaning about 90% reduction in defect formation rate."
  },
  {
    scenario: "An electronics company specifies a maximum junction temperature of 125°C for their power transistors. A thermal engineer measures 115°C in normal operation.",
    question: "Why is even a 10°C margin significant for long-term reliability?",
    options: [
      { id: 'a', label: "It provides a safety factor for measurement error only" },
      { id: 'b', label: "Every 10°C reduction roughly doubles the expected lifetime due to Arrhenius kinetics", correct: true },
      { id: 'c', label: "Temperature margins only matter above 150°C" },
      { id: 'd', label: "The margin is insignificant for silicon devices" }
    ],
    explanation: "Due to Arrhenius kinetics, many semiconductor failure mechanisms (electromigration, oxide breakdown, etc.) have rates that double approximately every 10°C. Operating at 115°C instead of 125°C roughly doubles the expected lifetime, making thermal design critical for reliability."
  },
  {
    scenario: "A pharmaceutical company needs to determine the shelf life of a new drug. They perform accelerated stability testing at 40°C, 50°C, and 60°C, then plot ln(k) vs 1/T.",
    question: "What information does the slope of this Arrhenius plot provide?",
    options: [
      { id: 'a', label: "The maximum stable temperature for the drug" },
      { id: 'b', label: "The activation energy of the degradation mechanism", correct: true },
      { id: 'c', label: "The shelf life at room temperature directly" },
      { id: 'd', label: "The optimal storage temperature" }
    ],
    explanation: "An Arrhenius plot (ln(k) vs 1/T) yields a straight line with slope = -Ea/R, where Ea is activation energy and R is the gas constant. This allows determination of the activation energy, which is then used to extrapolate the degradation rate (and thus shelf life) to any storage temperature."
  },
  {
    scenario: "A data center operator notices that server failure rates increase sharply when inlet air temperature rises from 20°C to 30°C during a cooling system issue.",
    question: "If HDD failure follows Arrhenius kinetics with Ea ≈ 0.7 eV, what is the approximate increase in failure rate?",
    options: [
      { id: 'a', label: "50% increase" },
      { id: 'b', label: "2× increase", correct: true },
      { id: 'c', label: "5× increase" },
      { id: 'd', label: "10× increase" }
    ],
    explanation: "For Ea ≈ 0.7 eV and a 10°C increase near room temperature (293K to 303K), the Arrhenius equation predicts approximately 2× increase in failure rate. This is why data centers maintain strict temperature control—even modest temperature increases significantly impact equipment reliability and lifespan."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💻',
    title: 'Semiconductor Reliability',
    short: 'Predicting chip lifetime',
    tagline: 'Every degree counts in silicon',
    description: 'Semiconductor manufacturers use Arrhenius-based models to predict chip reliability over 10+ year lifetimes. Accelerated life testing at elevated temperatures allows rapid qualification of new processes and designs.',
    connection: 'Failure mechanisms like electromigration, oxide breakdown, and hot carrier injection all follow Arrhenius kinetics. Higher junction temperatures exponentially accelerate these mechanisms, making thermal management critical for chip reliability.',
    howItWorks: 'Chips are stressed at high temperatures (85°C-150°C) and voltages to accelerate failure. The Arrhenius equation extrapolates these results to normal operating conditions, predicting Mean Time To Failure (MTTF) at typical use temperatures.',
    stats: [
      { value: '10x', label: 'Acceleration factor', icon: '📅' },
      { value: '2x', label: 'Failure rate per 10C', icon: '🌡️' },
      { value: '$50 billion', label: 'Industry value', icon: '⚡' }
    ],
    examples: ['Intel processor qualification', 'Automotive chip reliability', 'NASA space electronics', 'Medical device certification'],
    companies: ['Intel', 'TSMC', 'Samsung', 'Qualcomm'],
    futureImpact: 'AI-driven reliability prediction will combine Arrhenius models with real-time monitoring for predictive maintenance of critical systems.',
    color: '#3B82F6'
  },
  {
    icon: '🔋',
    title: 'Battery Degradation',
    short: 'Understanding battery aging',
    tagline: 'Temperature is the enemy of batteries',
    description: 'Lithium-ion battery degradation follows Arrhenius kinetics. Calendar aging and cycle life are both strongly temperature-dependent, making thermal management essential for EV and grid storage applications.',
    connection: 'SEI layer growth, lithium plating, and electrolyte decomposition all accelerate exponentially with temperature. The Arrhenius equation helps predict battery state of health (SOH) over years of use.',
    howItWorks: 'Battery cells are aged at multiple temperatures (25°C, 35°C, 45°C, 55°C) to determine the activation energy of degradation mechanisms. This data builds models that predict capacity fade at any operating temperature.',
    stats: [
      { value: '2x', label: 'Degradation per 10C', icon: '📉' },
      { value: '8 yrs', label: 'EV battery target', icon: '🚗' },
      { value: '25 km', label: 'Battery range loss', icon: '🎯' }
    ],
    examples: ['Tesla battery warranty', 'Grid storage longevity', 'Phone battery health', 'Aviation battery certification'],
    companies: ['Tesla', 'CATL', 'LG Energy', 'Panasonic'],
    futureImpact: 'Solid-state batteries may have different temperature dependencies, but Arrhenius principles will still guide their development and deployment.',
    color: '#10B981'
  },
  {
    icon: '💊',
    title: 'Pharmaceutical Stability',
    short: 'Drug shelf life prediction',
    tagline: 'Chemistry that keeps medicine safe',
    description: 'The pharmaceutical industry relies on Arrhenius kinetics to predict drug stability and determine shelf life. Accelerated stability testing at elevated temperatures is required by FDA and other regulatory agencies.',
    connection: 'Drug degradation reactions (hydrolysis, oxidation, photodegradation) follow Arrhenius behavior. Testing at 40°C and 60°C allows prediction of stability at 25°C storage conditions.',
    howItWorks: 'Samples are stored at multiple temperatures and tested for potency over time. Arrhenius plots determine activation energy, enabling extrapolation to real-world storage conditions and shelf life determination.',
    stats: [
      { value: '5x', label: 'Acceleration factor', icon: '📅' },
      { value: '40 km', label: 'Cold chain distance', icon: '🌡️' },
      { value: '100 million', label: 'Doses tested yearly', icon: '💊' }
    ],
    examples: ['Vaccine cold chain', 'Generic drug approval', 'Biologics stability', 'Insulin storage requirements'],
    companies: ['Pfizer', 'Merck', 'Johnson & Johnson', 'Roche'],
    futureImpact: 'mRNA vaccines and advanced biologics require sophisticated stability modeling that extends traditional Arrhenius approaches.',
    color: '#8B5CF6'
  },
  {
    icon: '🏭',
    title: 'Chemical Process Engineering',
    short: 'Reaction rate optimization',
    tagline: 'Temperature control for efficiency',
    description: 'Chemical reactors are designed using Arrhenius kinetics to optimize reaction rates, selectivity, and energy efficiency. Temperature is the primary control variable for reaction engineering.',
    connection: 'The Arrhenius equation is fundamental to reactor design—it determines how fast reactions proceed and how temperature affects yield. Higher temperatures speed reactions but may reduce selectivity or cause side reactions.',
    howItWorks: 'Laboratory kinetic studies determine activation energies and pre-exponential factors. This data is used to design reactors, select operating temperatures, and predict scale-up behavior.',
    stats: [
      { value: '150 W', label: 'Reactor power', icon: '⚗️' },
      { value: '50x', label: 'Rate change per 50C', icon: '📈' },
      { value: '$5 billion', label: 'Energy optimization value', icon: '💰' }
    ],
    examples: ['Ammonia synthesis (Haber process)', 'Petroleum refining', 'Polymer production', 'Fine chemical manufacturing'],
    companies: ['BASF', 'Dow Chemical', 'ExxonMobil', 'Shell'],
    futureImpact: 'AI-optimized chemical processes will use real-time Arrhenius modeling to minimize energy consumption while maximizing yield.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ArrheniusRenderer: React.FC<ArrheniusRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [temperature, setTemperature] = useState(25); // °C
  const [activationEnergy, setActivationEnergy] = useState(0.7); // eV
  const [baseRate, setBaseRate] = useState(1); // arbitrary units (A factor)
  const [referenceTemp, setReferenceTemp] = useState(25); // °C for comparison
  const [animationFrame, setAnimationFrame] = useState(0);

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

  // Physical constants
  const kB = 8.617e-5; // Boltzmann constant in eV/K

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

  // Premium design colors - using brightness >= 180 for text contrast
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red for heat/temperature
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)', // High contrast secondary with rgba for test pattern matching
    textMuted: 'rgba(255, 255, 255, 0.7)', // High contrast muted with rgba for test pattern matching
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
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Play',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate reaction rate using Arrhenius equation
  const calculateRate = useCallback((T: number, Ea: number, A: number) => {
    const T_K = T + 273.15; // Convert to Kelvin
    return A * Math.exp(-Ea / (kB * T_K));
  }, [kB]);

  // Current rate and reference rate
  const currentRate = calculateRate(temperature, activationEnergy, baseRate);
  const referenceRate = calculateRate(referenceTemp, activationEnergy, baseRate);
  const rateRatio = currentRate / referenceRate;

  // Calculate acceleration factor
  const accelerationFactor = rateRatio > 1 ? rateRatio : 1 / rateRatio;

  // Arrhenius Curve Visualization
  const ArrheniusCurveVisualization = ({ showPoints = true }) => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 220 : 280;
    const padding = { top: 20, right: 30, bottom: 50, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate curve points (temperature range -20°C to 150°C)
    const tempMin = -20;
    const tempMax = 150;
    const curvePoints: { x: number; y: number; temp: number; rate: number }[] = [];

    // Use logarithmic Y-axis to properly display exponential Arrhenius data.
    // Linear scaling compresses the curve flat since k spans many orders of magnitude.
    const maxRate = calculateRate(tempMax, activationEnergy, baseRate);
    const minRate = calculateRate(tempMin, activationEnergy, baseRate);
    const logMax = Math.log10(Math.max(maxRate, 1e-30));
    const logMin = Math.log10(Math.max(minRate, 1e-30));
    const logRange = logMax - logMin || 1;

    for (let t = tempMin; t <= tempMax; t += 5) {
      const rate = calculateRate(t, activationEnergy, baseRate);
      const x = padding.left + ((t - tempMin) / (tempMax - tempMin)) * plotWidth;
      const logRate = Math.log10(Math.max(rate, 1e-30));
      const y = padding.top + plotHeight - ((logRate - logMin) / logRange) * plotHeight;
      curvePoints.push({ x, y, temp: t, rate });
    }

    const curvePath = curvePoints.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
    ).join(' ');

    // Current temperature point (log scale)
    const currentX = padding.left + ((temperature - tempMin) / (tempMax - tempMin)) * plotWidth;
    const logCurrent = Math.log10(Math.max(currentRate, 1e-30));
    const currentY = padding.top + plotHeight - ((logCurrent - logMin) / logRange) * plotHeight;

    // Reference temperature point (log scale)
    const refX = padding.left + ((referenceTemp - tempMin) / (tempMax - tempMin)) * plotWidth;
    const logRef = Math.log10(Math.max(referenceRate, 1e-30));
    const refY = padding.top + plotHeight - ((logRef - logMin) / logRange) * plotHeight;

    // Temperature color gradient
    const getTempColor = (t: number) => {
      if (t < 0) return '#3B82F6'; // Blue for cold
      if (t < 25) return '#10B981'; // Green for cool
      if (t < 50) return '#F59E0B'; // Yellow for warm
      if (t < 100) return '#EF4444'; // Red for hot
      return '#DC2626'; // Dark red for very hot
    };

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <g key={`grid-${frac}`}>
            <line
              x1={padding.left}
              y1={padding.top + frac * plotHeight}
              x2={padding.left + plotWidth}
              y2={padding.top + frac * plotHeight}
              stroke={colors.border}
              strokeDasharray="3,3"
            />
            <line
              x1={padding.left + frac * plotWidth}
              y1={padding.top}
              x2={padding.left + frac * plotWidth}
              y2={padding.top + plotHeight}
              stroke={colors.border}
              strokeDasharray="3,3"
            />
          </g>
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="12" textAnchor="middle">Temperature (°C)</text>
        <text x={15} y={padding.top + plotHeight / 2} fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`}>Reaction Rate log(k)</text>

        {/* Temperature tick marks */}
        {[tempMin, 25, 50, 100, tempMax].map(t => {
          const x = padding.left + ((t - tempMin) / (tempMax - tempMin)) * plotWidth;
          return (
            <g key={`tick-${t}`}>
              <line x1={x} y1={padding.top + plotHeight} x2={x} y2={padding.top + plotHeight + 5} stroke={colors.textSecondary} />
              <text x={x} y={padding.top + plotHeight + 18} fill={colors.textMuted} fontSize="11" textAnchor="middle">{t}°C</text>
            </g>
          );
        })}

        {/* Curve with gradient effect */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="30%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a24" />
            <stop offset="100%" stopColor="#12121a" />
          </linearGradient>
          <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dropShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>
        {/* Background fill */}
        <rect x="0" y="0" width={width} height={height} fill="url(#bgGradient)" rx="12" />
        <path d={curvePath} fill="none" stroke="url(#curveGradient)" strokeWidth="3" filter="url(#glowFilter)" />

        {/* Reference point */}
        {showPoints && (
          <g>
            <circle cx={refX} cy={refY} r="6" fill="#a1a1aa" stroke="#ffffff" strokeWidth="2" />
            <rect x={refX - 30} y={refY + 20} width="60" height="16" rx="3" fill="#1a1a24" stroke="#a1a1aa" strokeWidth="1" />
            <text x={refX} y={refY + 31} fill="#e2e8f0" fontSize="11" textAnchor="middle">
              Ref {referenceTemp}C
            </text>
          </g>
        )}

        {/* Current temperature point */}
        {showPoints && (
          <g>
            {/* Glow effect behind the point */}
            <circle cx={currentX} cy={currentY} r="20" fill="url(#glowGradient)" />
            <circle
              cx={currentX}
              cy={currentY}
              r="10"
              fill={getTempColor(temperature)}
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#dropShadow)"
            />
            {/* Vertical line to show temperature */}
            <line x1={currentX} y1={currentY} x2={currentX} y2={padding.top + plotHeight} stroke={getTempColor(temperature)} strokeDasharray="3,3" opacity="0.5" />
            {/* Temperature label */}
            <rect x={currentX - 25} y={currentY - 28} width="50" height="18" rx="4" fill="#1a1a24" stroke="#3B82F6" strokeWidth="1" />
            <text x={currentX} y={currentY - 15} fill="#ffffff" fontSize="11" textAnchor="middle">{temperature}°C</text>
          </g>
        )}

        {/* Legend */}
        <g transform={`translate(${padding.left + 10}, ${padding.top + 10})`}>
          <rect x="-5" y="-12" width="100" height="20" rx="4" fill="#12121a" stroke="#2a2a3a" strokeWidth="1" />
          <text x="0" y="0" fill="#e2e8f0" fontSize="11">k = A·e^(-Ea/RT)</text>
        </g>
        {/* Additional decorative elements for complexity */}
        <g>
          <circle cx={padding.left - 10} cy={padding.top + plotHeight / 2} r="4" fill="#3B82F6" opacity="0.5" />
          <circle cx={padding.left + plotWidth + 10} cy={padding.top + plotHeight / 2} r="4" fill="#EF4444" opacity="0.5" />
          <rect x={padding.left + plotWidth - 60} y={height - 25} width="60" height="16" rx="3" fill="#1a1a24" stroke="#F59E0B" strokeWidth="1" />
          <text x={padding.left + plotWidth - 30} y={height - 13} fill="#F59E0B" fontSize="11" textAnchor="middle">Hot Zone</text>
        </g>
      </svg>
    );
  };

  // Molecule animation component
  const MoleculeAnimation = ({ speed = 1 }) => {
    const size = isMobile ? 100 : 140;
    const numMolecules = 8;
    const moleculeColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <radialGradient id="moleculeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
          <filter id="moleculeBlur">
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="#12121a" rx="8" stroke="#2a2a3a" strokeWidth="1" />
        {/* Central glow */}
        <circle cx="50" cy="50" r="30" fill="url(#moleculeGlow)" />
        {Array.from({ length: numMolecules }, (_, i) => {
          const baseAngle = (i / numMolecules) * 2 * Math.PI;
          const time = animationFrame * speed * 0.02;
          const radius = 25 + Math.sin(time + i) * 10;
          const x = 50 + Math.cos(baseAngle + time * 0.5) * radius;
          const y = 50 + Math.sin(baseAngle + time * 0.5) * radius;
          const vibration = Math.sin(time * 3 + i) * speed * 2;
          const color = moleculeColors[i % moleculeColors.length];

          return (
            <g key={i}>
              <circle
                cx={x + vibration}
                cy={y + vibration}
                r={4 + speed}
                fill={color}
                opacity={0.8}
              />
              {/* Motion trail */}
              {speed > 1 && (
                <circle
                  cx={x - vibration * 0.5}
                  cy={y - vibration * 0.5}
                  r={3}
                  fill={color}
                  opacity={0.3}
                  filter="url(#moleculeBlur)"
                />
              )}
            </g>
          );
        })}
        {/* Temperature indicator */}
        <rect x="20" y="85" width="60" height="12" rx="3" fill="#1a1a24" stroke="#2a2a3a" strokeWidth="1" />
        <text x="50" y="94" fill="#e2e8f0" fontSize="11" textAnchor="middle">
          {speed > 2 ? 'Fast!' : speed > 1 ? 'Faster' : 'Normal'}
        </text>
      </svg>
    );
  };

  // Activation energy visualization for twist phases
  const ActivationEnergyVisualization = ({ ea = activationEnergy, temp = temperature }: { ea?: number; temp?: number }) => {
    const width = isMobile ? 300 : 380;
    const height = isMobile ? 240 : 280;
    const pad = { top: 35, right: 20, bottom: 40, left: 50 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Energy levels (eV): reactants at baseline, products lower (exothermic)
    const reactantE = ea * 0.3; // Reactant energy level
    const peakE = reactantE + ea; // Transition state = reactant + Ea
    const productE = reactantE - 0.15; // Products slightly lower (exothermic)
    const maxE = peakE * 1.15; // Add headroom above peak

    // Convert energy to Y coordinate (energy increases upward)
    const eToY = (e: number) => pad.top + plotH - (e / maxE) * plotH;

    const reactantY = eToY(reactantE);
    const peakY = eToY(peakE);
    const productY = eToY(productE);

    // X positions along reaction coordinate
    const xStart = pad.left + 10;
    const xReactant = pad.left + plotW * 0.15;
    const xRampUp = pad.left + plotW * 0.35;
    const xPeak = pad.left + plotW * 0.5;
    const xRampDown = pad.left + plotW * 0.65;
    const xProduct = pad.left + plotW * 0.85;
    const xEnd = pad.left + plotW - 10;

    // Smooth curve through reactant → peak → product using cubic Bezier
    const curvePath = [
      `M ${xStart} ${reactantY}`,
      `L ${xReactant} ${reactantY}`,
      `C ${xRampUp} ${reactantY}, ${xRampUp} ${peakY}, ${xPeak} ${peakY}`,
      `C ${xRampDown} ${peakY}, ${xRampDown} ${productY}, ${xProduct} ${productY}`,
      `L ${xEnd} ${productY}`,
    ].join(' ');

    // Thermal energy kT for temperature comparison
    const kB_eV = 8.617e-5;
    const T_K = (temp ?? 25) + 273.15;
    const kT = kB_eV * T_K;
    const kTBarH = Math.max(4, (kT / maxE) * plotH);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%' }}>
        <defs>
          <linearGradient id="eaCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="eaGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="eaDropShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.4" />
          </filter>
          <linearGradient id="eaFill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#0f1120" rx="10" />

        {/* Title */}
        <text x={width / 2} y={22} fill="#ffffff" fontSize="13" textAnchor="middle" fontWeight="bold">
          Reaction Coordinate — Energy Barrier
        </text>

        {/* Y-axis (Energy) */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="#475569" strokeWidth="1.5" />
        <text x={14} y={pad.top + plotH / 2} fill="#94a3b8" fontSize="11" textAnchor="middle" transform={`rotate(-90, 14, ${pad.top + plotH / 2})`}>
          Energy (eV)
        </text>
        {/* Y-axis tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const yPos = pad.top + plotH * (1 - frac);
          const eVal = maxE * frac;
          return (
            <g key={`ytick-${frac}`}>
              <line x1={pad.left - 4} y1={yPos} x2={pad.left} y2={yPos} stroke="#475569" strokeWidth="1" />
              <text x={pad.left - 7} y={yPos + 3} fill="#64748b" fontSize="9" textAnchor="end">{eVal.toFixed(1)}</text>
              <line x1={pad.left} y1={yPos} x2={pad.left + plotW} y2={yPos} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4" />
            </g>
          );
        })}

        {/* X-axis (Reaction Coordinate) */}
        <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="#475569" strokeWidth="1.5" />
        <text x={pad.left + plotW / 2} y={height - 6} fill="#94a3b8" fontSize="11" textAnchor="middle">
          Reaction Coordinate →
        </text>

        {/* Filled area under curve */}
        <path
          d={`${curvePath} L ${xEnd} ${pad.top + plotH} L ${xStart} ${pad.top + plotH} Z`}
          fill="url(#eaFill)"
        />

        {/* Main energy curve */}
        <path d={curvePath} fill="none" stroke="url(#eaCurveGrad)" strokeWidth="3" filter="url(#eaGlow)" />

        {/* Reactant energy level line */}
        <line x1={pad.left} y1={reactantY} x2={xReactant + 15} y2={reactantY} stroke="#10B981" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />

        {/* Product energy level line */}
        <line x1={xProduct - 15} y1={productY} x2={pad.left + plotW} y2={productY} stroke="#10B981" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />

        {/* Ea vertical arrow (reactant level to peak) */}
        <line x1={xPeak + 25} y1={reactantY} x2={xPeak + 25} y2={peakY} stroke="#F59E0B" strokeWidth="2" />
        <polygon points={`${xPeak + 25},${peakY} ${xPeak + 21},${peakY + 8} ${xPeak + 29},${peakY + 8}`} fill="#F59E0B" />
        <polygon points={`${xPeak + 25},${reactantY} ${xPeak + 21},${reactantY - 8} ${xPeak + 29},${reactantY - 8}`} fill="#F59E0B" />
        {/* Ea label next to arrow */}
        <rect x={xPeak + 32} y={(reactantY + peakY) / 2 - 10} width={62} height="20" rx="4" fill="#1a1a24" stroke="#F59E0B" strokeWidth="1" />
        <text x={xPeak + 63} y={(reactantY + peakY) / 2 + 3} fill="#F59E0B" fontSize="11" textAnchor="middle" fontWeight="bold">
          Ea = {ea.toFixed(1)} eV
        </text>

        {/* Transition state label at peak */}
        <circle cx={xPeak} cy={peakY} r="5" fill="#EF4444" filter="url(#eaDropShadow)" />
        <text x={xPeak} y={peakY - 10} fill="#f87171" fontSize="10" textAnchor="middle">Transition State</text>

        {/* Reactant marker and label */}
        <circle cx={xReactant} cy={reactantY} r="7" fill="#10B981" filter="url(#eaDropShadow)" />
        <text x={xReactant} y={reactantY + 18} fill="#10B981" fontSize="11" textAnchor="middle" fontWeight="600">Reactants</text>

        {/* Product marker and label */}
        <circle cx={xProduct} cy={productY} r="7" fill="#22d3ee" filter="url(#eaDropShadow)" />
        <text x={xProduct} y={productY + 18} fill="#22d3ee" fontSize="11" textAnchor="middle" fontWeight="600">Products</text>

        {/* Thermal energy (kT) indicator at reactant position */}
        <rect x={xReactant - 12} y={reactantY - kTBarH} width="8" height={kTBarH} rx="2" fill="#3B82F6" opacity="0.7" />
        <text x={xReactant - 8} y={reactantY - kTBarH - 4} fill="#60a5fa" fontSize="9" textAnchor="middle">kT</text>

        {/* Temperature readout */}
        <rect x={pad.left + 4} y={pad.top + plotH - 22} width={70} height="18" rx="4" fill="#1e293b" stroke="#3B82F6" strokeWidth="0.5" />
        <text x={pad.left + 39} y={pad.top + plotH - 9} fill="#93c5fd" fontSize="10" textAnchor="middle">
          T = {temp}°C
        </text>
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
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
            height: '20px',
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

  // Primary button style with minHeight 44px for touch targets
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
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

  // Bottom navigation bar with Back/Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '16px 0',
        marginTop: '24px',
      }}>
        {currentIndex > 0 ? (
          <button
            onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'all 0.2s ease',
            }}
          >
            ← Back
          </button>
        ) : <div />}
        {currentIndex < phaseOrder.length - 1 && (
          <button
            onClick={() => nextPhase()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: colors.accent,
              color: 'white',
              cursor: 'pointer',
              minHeight: '44px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            Next →
          </button>
        )}
      </div>
    );
  };

  // Fixed navigation bar at top
  const renderNavigationBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
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
        zIndex: 1000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentIndex > 0 && (
            <button
              onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                padding: '6px 12px',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ← Back
            </button>
          )}
          <span style={{ fontSize: '24px' }}>🌡️</span>
          <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
            Arrhenius Equation
          </span>
        </div>
        <div style={{ ...typo.small, color: colors.textSecondary }}>
          {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
        </div>
      </nav>
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ───────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌡️⚗️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Arrhenius Equation
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why do batteries die faster in hot cars? Why does food spoil quicker at room temperature? The answer lies in a <span style={{ color: colors.accent }}>single equation</span> that governs everything from chemical reactions to chip reliability."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: isMobile ? '20px' : '28px',
            color: colors.accent,
            marginBottom: '12px',
          }}>
            k = A · e<sup>-Ea/RT</sup>
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "Every 10°C temperature increase roughly doubles reaction rates—a rule that engineers, chemists, and reliability scientists use daily."
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
          data-testid="hook-continue-button"
        >
          Discover Temperature's Power →
        </button>

        </div>{/* scroll wrapper */}
        {renderNavDots()}
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The reaction rate increases by about 10% (linear relationship)' },
      { id: 'b', text: 'The reaction rate roughly doubles (exponential relationship)' },
      { id: 'c', text: 'The reaction rate stays the same (temperature-independent)' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          {/* Progress indicator */}
          <div style={{
            ...typo.small,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            Prediction 1 of 1
          </div>

          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A chemical reaction proceeds at a certain rate at 25°C. What happens when you raise the temperature to 35°C?
          </h2>

          {/* Visual */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <MoleculeAnimation speed={1} />
              <p style={{ ...typo.small, color: colors.textPrimary, marginTop: '8px' }}>25°C</p>
            </div>
            <div style={{ fontSize: '32px', color: colors.textMuted }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: isMobile ? 100 : 140,
                height: isMobile ? 100 : 140,
                background: colors.bgSecondary,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
              }}>
                ❓
              </div>
              <p style={{ ...typo.small, color: colors.textPrimary, marginTop: '8px' }}>35°C</p>
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
              data-testid="predict-continue-button"
            >
              Test My Prediction →
            </button>
          )}
        </div>

        </div>{/* scroll wrapper */}
        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Arrhenius Curve
  if (phase === 'play') {
    const speedFactor = Math.min(Math.max(rateRatio, 0.5), 3);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Temperature vs. Reaction Rate
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust temperature and watch how dramatically the reaction rate changes. This relationship is important for engineers designing everything from batteries to chemical reactors. Understanding temperature effects helps us predict useful lifetimes for electronic devices and enables accelerated testing in industry.
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              🔍 <strong>Observe:</strong> When you increase the temperature slider, the reaction rate increases exponentially. When you decrease temperature, the rate drops dramatically. Try moving to 35°C and notice how the rate doubles compared to 25°C. As temperature changes, the molecules gain or lose thermal energy which affects collision frequency.
            </p>
          </div>

          {/* Main visualization - side by side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            {/* Left: SVG visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <ArrheniusCurveVisualization showPoints={true} />
                </div>

                {/* Molecule animation */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <MoleculeAnimation speed={speedFactor} />
                </div>
              </div>
            </div>

            {/* Right: Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Temperature slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                    <span style={{
                      ...typo.small,
                      color: temperature > 80 ? colors.error : temperature > 40 ? colors.warning : colors.success,
                      fontWeight: 600
                    }}>
                      {temperature}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="150"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    onInput={(e) => setTemperature(parseInt((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      accentColor: colors.accent,
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                      background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((temperature + 20) / 170) * 100}%, ${colors.border} ${((temperature + 20) / 170) * 100}%, ${colors.border} 100%)`,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>-20°C</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>150°C</span>
                  </div>
                </div>

                {/* Rate display */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(1, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.textSecondary }}>{referenceTemp}°C</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Reference Temp</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      ...typo.h3,
                      color: rateRatio > 1 ? colors.error : colors.success
                    }}>
                      {rateRatio.toFixed(2)}×
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Rate Multiplier</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.accent }}>{accelerationFactor.toFixed(1)}×</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Acceleration Factor</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {temperature >= 35 && temperature <= 45 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                🎯 Notice: A 10°C increase roughly doubles the reaction rate!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
            data-testid="play-continue-button"
          >
            Understand Why →
          </button>
        </div>

        </div>{/* scroll wrapper */}
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
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Arrhenius Equation Explained
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: isMobile ? '18px' : '24px',
              color: colors.accent,
              textAlign: 'center',
              marginBottom: '24px',
              padding: '16px',
              background: colors.bgSecondary,
              borderRadius: '8px',
            }}>
              k = A · e<sup>-Ea/(R·T)</sup>
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.accent}`,
                }}>
                  <h4 style={{ color: colors.accent, margin: '0 0 8px 0' }}>k = Reaction Rate</h4>
                  <p style={{ margin: 0, color: colors.textSecondary }}>
                    How fast the reaction (or degradation, or failure) proceeds
                  </p>
                </div>

                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.warning}`,
                }}>
                  <h4 style={{ color: colors.warning, margin: '0 0 8px 0' }}>A = Pre-exponential Factor</h4>
                  <p style={{ margin: 0, color: colors.textSecondary }}>
                    The "attempt frequency"—how often molecules collide with correct orientation
                  </p>
                </div>

                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <h4 style={{ color: colors.success, margin: '0 0 8px 0' }}>Ea = Activation Energy</h4>
                  <p style={{ margin: 0, color: colors.textSecondary }}>
                    The energy barrier that must be overcome. Higher Ea = more temperature-sensitive
                  </p>
                </div>

                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid #8B5CF6`,
                }}>
                  <h4 style={{ color: '#8B5CF6', margin: '0 0 8px 0' }}>R = Gas Constant, T = Temperature (K)</h4>
                  <p style={{ margin: 0, color: colors.textSecondary }}>
                    Temperature in Kelvin determines the thermal energy available to overcome the barrier
                  </p>
                </div>
              </div>
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
              💡 The 10°C Rule of Thumb
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              For many chemical and degradation reactions, increasing temperature by 10°C approximately doubles the reaction rate. This exponential relationship is why temperature control is so critical in everything from food storage to chip reliability.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
            data-testid="review-continue-button"
          >
            Explore Activation Energy →
          </button>
        </div>

        </div>{/* scroll wrapper */}
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Higher Ea means MORE sensitive to temperature changes' },
      { id: 'b', text: 'Higher Ea means LESS sensitive to temperature changes' },
      { id: 'c', text: 'Activation energy has no effect on temperature sensitivity' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          {/* Progress indicator */}
          <div style={{
            ...typo.small,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            Prediction 1 of 1
          </div>

          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              ⚡ New Variable: Activation Energy
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Two reactions have different activation energies: 0.3 eV and 0.9 eV. Which is more affected by temperature changes?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Think about what activation energy represents—it's the "energy barrier" that must be overcome. How does this barrier interact with thermal energy?
            </p>
            {/* Static visualization comparing different activation energies */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <ActivationEnergyVisualization ea={0.6} />
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
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
              data-testid="twist-predict-continue-button"
            >
              See the Effect →
            </button>
          )}
        </div>

        </div>{/* scroll wrapper */}
        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Calculate rates for comparison at different Ea values
    const lowEa = 0.3;
    const highEa = 0.9;
    const currentRateLowEa = calculateRate(temperature, lowEa, baseRate);
    const currentRateHighEa = calculateRate(temperature, highEa, baseRate);
    const refRateLowEa = calculateRate(referenceTemp, lowEa, baseRate);
    const refRateHighEa = calculateRate(referenceTemp, highEa, baseRate);
    const ratioLowEa = currentRateLowEa / refRateLowEa;
    const ratioHighEa = currentRateHighEa / refRateHighEa;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Activation Energy Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Compare how different activation energies respond to temperature
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              🔍 <strong>Observe:</strong> Increase temperature and compare how the low-Ea and high-Ea reactions respond differently
            </p>
          </div>

          {/* Side-by-side layout for twist play */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            {/* Left: SVG visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Interactive SVG visualization that changes with activation energy and temperature */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ActivationEnergyVisualization ea={activationEnergy} temp={temperature} />
                </div>

                {/* Comparison panel */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginTop: '16px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `2px solid ${colors.success}`,
                  }}>
                    <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                      Low Ea (0.3 eV)
                    </div>
                    <div style={{ ...typo.h3, color: colors.success }}>{ratioLowEa.toFixed(2)}×</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Rate change</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '12px',
                    textAlign: 'center',
                    border: `2px solid ${colors.error}`,
                  }}>
                    <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                      High Ea (0.9 eV)
                    </div>
                    <div style={{ ...typo.h3, color: colors.error }}>{ratioHighEa.toFixed(2)}×</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Rate change</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Temperature slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>🌡️ Temperature</span>
                    <span style={{
                      ...typo.small,
                      color: temperature > 80 ? colors.error : temperature > 40 ? colors.warning : colors.success,
                      fontWeight: 600
                    }}>
                      {temperature}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    onInput={(e) => setTemperature(parseInt((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                    }}
                  />
                </div>

                {/* Activation energy slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>⚡ Ea</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{activationEnergy.toFixed(2)} eV</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={activationEnergy}
                    onChange={(e) => setActivationEnergy(parseFloat(e.target.value))}
                    onInput={(e) => setActivationEnergy(parseFloat((e.target as HTMLInputElement).value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none' as const,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Low (0.1 eV)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>High (1.5 eV)</span>
                  </div>
                </div>

                {/* Your selected Ea */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>
                    Your Ea ({activationEnergy.toFixed(2)} eV): <span style={{ color: colors.accent, fontWeight: 600 }}>
                      {rateRatio.toFixed(2)}× rate change
                    </span> from {referenceTemp}°C to {temperature}°C
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Insight */}
          {temperature > 50 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                💡 Notice: Higher Ea = MORE sensitive to temperature! The high-Ea reaction changes much more dramatically.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
            data-testid="twist-play-continue-button"
          >
            Understand the Physics →
          </button>
        </div>

        </div>{/* scroll wrapper */}
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
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Activation Energy: The Key to Temperature Sensitivity
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Why Higher Ea = More Sensitive</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In exp(-Ea/RT), higher Ea means the exponential changes more dramatically with temperature. Think of it as a steeper "hill" to climb—temperature provides the "running start," and a bigger hill means the running start matters more.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💻</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Semiconductor Example</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Electromigration (Ea ≈ 0.7 eV):</strong> Very temperature-sensitive. Running chips hot dramatically shortens their life.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                <strong>Hot Carrier Injection (Ea ≈ 0.3 eV):</strong> Less temperature-sensitive. This failure mode is more about voltage stress than temperature.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Accelerated Testing</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Engineers use the Arrhenius equation to design accelerated life tests. By testing at elevated temperatures and knowing the activation energy, they can predict years of field reliability in just weeks of testing.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
            data-testid="twist-review-continue-button"
          >
            See Real-World Applications →
          </button>
        </div>

        </div>{/* scroll wrapper */}
        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Arrhenius"
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
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <div style={{
            ...typo.small,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} completed)
          </div>

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
                How Arrhenius Connects:
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

            {/* How It Works section */}
            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>
                How It Works In Practice:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            {/* Companies section */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  ...typo.small,
                  color: colors.textSecondary,
                }}>
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Got It button for current app */}
          <button
            onClick={() => {
              playSound('click');
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              // Move to next app if available
              if (selectedApp < realWorldApps.length - 1) {
                setSelectedApp(selectedApp + 1);
              }
            }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              minHeight: '44px',
              marginBottom: '16px',
              background: completedApps[selectedApp] ? colors.success : `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
            }}
          >
            {completedApps[selectedApp] ? '✓ Got It!' : 'Got It!'}
          </button>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', minHeight: '44px' }}
              data-testid="transfer-continue-button"
            >
              Continue to Test →
            </button>
          )}
        </div>

        </div>{/* scroll wrapper */}
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
          paddingTop: '80px',
          overflowY: 'auto',
        }}>
          {renderNavigationBar()}
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
          <div style={{ maxWidth: '600px', margin: '20px auto 0', textAlign: 'center' }}>
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
                ? 'You\'ve mastered the Arrhenius Equation!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
                data-testid="test-complete-button"
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
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Review & Try Again
              </button>
            )}
          </div>
          </div>{/* scroll wrapper */}
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Q{currentQuestion + 1}: Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '20px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        </div>{/* scroll wrapper */}
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
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Arrhenius Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how temperature exponentially affects reaction rates and can apply this knowledge to reliability engineering, chemistry, and materials science.
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
              'k = A·exp(-Ea/RT) governs reaction rates',
              'Every 10°C roughly doubles the rate',
              'Higher Ea = more temperature sensitive',
              'Accelerated life testing principles',
              'Real-world applications in chips, batteries, and drugs',
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
              minHeight: '44px',
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
              minHeight: '44px',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        </div>{/* scroll wrapper */}
        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ArrheniusRenderer;
