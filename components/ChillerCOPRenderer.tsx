'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Chiller COP (Coefficient of Performance) - Complete 10-Phase Game
// Understanding how chillers work and what affects their efficiency
// ─────────────────────────────────────────────────────────────────────────────

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

interface ChillerCOPRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A building's chiller is running with a COP of 5.0, meaning it produces 5 units of cooling for every 1 unit of electricity consumed. The facilities manager wants to understand the efficiency.",
    question: "What does a COP of 5.0 tell us about energy usage?",
    options: [
      { id: 'a', label: "The chiller wastes 5 times more energy than it uses" },
      { id: 'b', label: "The chiller moves 5 units of heat for every 1 unit of electrical work input", correct: true },
      { id: 'c', label: "The chiller is 500% efficient, violating thermodynamics" },
      { id: 'd', label: "The chiller uses 5 kW to produce 1 kW of cooling" }
    ],
    explanation: "COP measures the ratio of useful cooling (heat removed) to work input. A COP of 5 means for every 1 kW of electricity, the chiller moves 5 kW of heat from inside to outside. This doesn't violate thermodynamics because we're moving heat, not creating it."
  },
  {
    scenario: "On a hot summer day (35°C outdoor temperature), a chiller struggles to maintain its usual COP. The condenser temperature rises to 45°C while the evaporator stays at 7°C.",
    question: "Why does hot weather reduce chiller efficiency?",
    options: [
      { id: 'a', label: "The refrigerant evaporates too quickly in hot weather" },
      { id: 'b', label: "Higher condenser temperature increases the temperature lift, requiring more compressor work", correct: true },
      { id: 'c', label: "The electricity supply becomes less stable in summer" },
      { id: 'd', label: "Air conditioning units draw too much power from the grid" }
    ],
    explanation: "Temperature lift (Tcond - Tevap) is the key factor. Higher outdoor temps mean the condenser must operate at higher temperature to reject heat. Greater temperature lift = more compressor work = lower COP. This is why chillers are less efficient on the hottest days when cooling is most needed."
  },
  {
    scenario: "A chiller plant has two options: run one large chiller at 100% capacity, or run two smaller chillers at 50% capacity each. Both provide the same total cooling.",
    question: "Which configuration typically achieves better COP?",
    options: [
      { id: 'a', label: "One large chiller - economies of scale improve efficiency" },
      { id: 'b', label: "Two smaller chillers at 50% - partial load operation often improves COP", correct: true },
      { id: 'c', label: "Both are identical since they provide the same cooling" },
      { id: 'd', label: "Depends entirely on the outdoor temperature" }
    ],
    explanation: "Many chillers operate more efficiently at partial load (40-70%) than at full load. This is due to reduced compressor work and better heat transfer at lower loads. Running two chillers at 50% often achieves 10-20% better combined COP than one at 100%."
  },
  {
    scenario: "An engineer proposes raising the chilled water supply temperature from 6°C to 8°C. Building occupants won't notice the difference because the building's cooling coils are oversized.",
    question: "How will this change affect chiller COP?",
    options: [
      { id: 'a', label: "COP will decrease because the water is warmer" },
      { id: 'b', label: "COP will increase because a higher evaporator temperature reduces the temperature lift", correct: true },
      { id: 'c', label: "COP will stay the same since the cooling load hasn't changed" },
      { id: 'd', label: "COP will fluctuate unpredictably with warmer water" }
    ],
    explanation: "Raising chilled water temperature increases evaporator temperature, which reduces the temperature lift. Every 1°C increase in evaporator temperature can improve COP by 2-4%. This is a key optimization strategy called 'chilled water reset.'"
  },
  {
    scenario: "A data center chiller operates with condenser water at 32°C. During winter, the cooling tower can produce 18°C water instead.",
    question: "What happens to chiller COP when using the colder condenser water?",
    options: [
      { id: 'a', label: "COP decreases because the chiller works harder against cold water" },
      { id: 'b', label: "COP increases dramatically because lower condenser temperature reduces temperature lift", correct: true },
      { id: 'c', label: "COP stays the same because refrigerant properties don't change" },
      { id: 'd', label: "The chiller should be shut off and free cooling used instead" }
    ],
    explanation: "Lower condenser water temperature directly reduces the temperature lift, improving COP. Dropping from 32°C to 18°C condenser water can improve COP by 50% or more. This is why condenser water reset and free cooling strategies are so valuable."
  },
  {
    scenario: "A hospital's chiller system shows COP dropping from 5.5 to 4.2 over several months. Cooling capacity remains adequate, but energy bills have increased.",
    question: "What is the most likely cause of this efficiency degradation?",
    options: [
      { id: 'a', label: "The refrigerant is wearing out and needs replacement" },
      { id: 'b', label: "Fouling in the condenser or evaporator tubes is reducing heat transfer", correct: true },
      { id: 'c', label: "The compressor motor is consuming less power" },
      { id: 'd', label: "Outdoor temperatures have increased year-round" }
    ],
    explanation: "Tube fouling (scale, biofilm, or debris) reduces heat transfer efficiency, forcing the chiller to work with larger temperature differences. This increases compressor work and reduces COP. Regular tube cleaning can restore 10-20% of lost efficiency."
  },
  {
    scenario: "A centrifugal chiller operates at 30% of its design capacity during mild weather. The operator notices the COP is lower than expected.",
    question: "Why might efficiency suffer at very low loads?",
    options: [
      { id: 'a', label: "The refrigerant charge becomes insufficient at low loads" },
      { id: 'b', label: "Compressor efficiency drops when operating far from its design point; surge or cycling may occur", correct: true },
      { id: 'c', label: "The evaporator freezes at low loads" },
      { id: 'd', label: "Chilled water flow rate becomes too high" }
    ],
    explanation: "Centrifugal chillers have an optimal operating range (typically 40-80% load). At very low loads, they may approach surge conditions, require excessive guide vane closure, or cycle on/off, all of which reduce efficiency. VFD-equipped chillers handle low loads better."
  },
  {
    scenario: "Two identical buildings in different cities have the same cooling load. Building A is in Phoenix (hot, dry) and Building B is in Miami (hot, humid). Both use water-cooled chillers.",
    question: "Which building's chiller likely achieves better COP?",
    options: [
      { id: 'a', label: "Building A in Phoenix - dry air cools the condenser better" },
      { id: 'b', label: "Building B in Miami - humidity helps the cooling process" },
      { id: 'c', label: "Building A in Phoenix - lower wet-bulb temperature allows lower condenser water temperature", correct: true },
      { id: 'd', label: "Both achieve the same COP since they have the same cooling load" }
    ],
    explanation: "Cooling tower performance depends on wet-bulb temperature, not dry-bulb. Phoenix's dry climate means lower wet-bulb temperatures, allowing the cooling tower to produce colder condenser water. This reduces temperature lift and improves chiller COP."
  },
  {
    scenario: "A facilities manager is comparing two chiller options: an air-cooled chiller (COP 3.0) and a water-cooled chiller (COP 5.5). The water-cooled system costs more and requires a cooling tower.",
    question: "Why is the water-cooled chiller more efficient?",
    options: [
      { id: 'a', label: "Water conducts heat better than air, enabling lower condenser temperatures and smaller temperature lift", correct: true },
      { id: 'b', label: "Water-cooled systems use larger compressors that are inherently more efficient" },
      { id: 'c', label: "Air-cooled systems waste energy running condenser fans" },
      { id: 'd', label: "Water-cooled chillers use more refrigerant, which increases capacity" }
    ],
    explanation: "Water-cooled condensers can operate at temperatures closer to ambient wet-bulb (often 27-32°C) versus air-cooled at dry-bulb + 10-15°C (often 40-50°C on hot days). The lower condenser temperature dramatically reduces temperature lift and improves COP."
  },
  {
    scenario: "A building automation system shows that reducing chiller load from 80% to 60% improved COP from 5.0 to 5.8, but further reducing to 40% dropped COP to 5.2.",
    question: "What explains this non-linear relationship between load and efficiency?",
    options: [
      { id: 'a', label: "Measurement error in the building automation system" },
      { id: 'b', label: "Chillers have an optimal efficiency point; too high or too low load reduces COP", correct: true },
      { id: 'c', label: "The refrigerant works best at exactly 60% load" },
      { id: 'd', label: "Building occupancy affects chiller efficiency directly" }
    ],
    explanation: "Chillers have part-load efficiency curves that peak around 40-70% load. At high loads, greater heat transfer rates require larger temperature differences. At very low loads, compressor efficiency drops and parasitic losses become proportionally larger. The sweet spot is in between."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏢',
    title: 'Commercial Building HVAC',
    short: 'Keeping offices comfortable efficiently',
    tagline: 'Where comfort meets cost control',
    description: 'Large commercial buildings rely on central chiller plants to provide cooling. Understanding COP is crucial for managing millions of dollars in annual energy costs while maintaining occupant comfort.',
    connection: 'Building operators use COP monitoring to optimize chiller staging, implement chilled water reset strategies, and schedule maintenance. A 10% improvement in COP can save $50,000-200,000 annually in a large building.',
    howItWorks: 'Chiller plants typically include multiple chillers that stage on/off based on load. Building automation systems monitor COP in real-time and adjust setpoints, sequences, and schedules to maximize efficiency while meeting cooling demands.',
    stats: [
      { value: '40%', label: 'Of building energy is HVAC', icon: '⚡' },
      { value: '5-7', label: 'Typical chiller COP range', icon: '📊' },
      { value: '$0.10/ton-hr', label: 'Typical cooling cost', icon: '💰' }
    ],
    examples: ['Empire State Building', 'Taipei 101', 'Burj Khalifa', 'Marina Bay Sands'],
    companies: ['Trane', 'Carrier', 'York', 'Daikin'],
    futureImpact: 'AI-driven predictive optimization will continuously adjust chiller operations based on weather forecasts, occupancy patterns, and electricity prices.',
    color: '#10B981'
  },
  {
    icon: '🖥️',
    title: 'Data Center Cooling',
    short: 'Removing megawatts of heat',
    tagline: 'Where efficiency is measured in PUE',
    description: 'Data centers are among the most energy-intensive buildings on Earth, with cooling consuming 30-50% of total facility power. Chiller COP directly impacts Power Usage Effectiveness (PUE).',
    connection: 'Data center operators obsess over chiller COP because every point of improvement reduces operating costs and carbon footprint. A hyperscale data center might save $10 million annually from a 0.5 COP improvement.',
    howItWorks: 'Modern data centers use multiple cooling strategies: raised floor cooling, hot/cold aisle containment, economizers, and high-efficiency chillers. Chilled water temperatures are carefully optimized (often 12-18°C) to balance IT equipment needs with chiller efficiency.',
    stats: [
      { value: '1.1-1.4', label: 'Target PUE range', icon: '📈' },
      { value: '100MW+', label: 'Hyperscale DC cooling load', icon: '❄️' },
      { value: '3-5%', label: 'Global electricity for data centers', icon: '🌍' }
    ],
    examples: ['Google data centers', 'Microsoft Azure', 'Amazon AWS', 'Meta AI clusters'],
    companies: ['Vertiv', 'Schneider Electric', 'Stulz', 'Emerson'],
    futureImpact: 'Liquid cooling and direct chip cooling will reduce chiller loads, while AI will optimize the remaining air cooling for maximum efficiency.',
    color: '#3B82F6'
  },
  {
    icon: '🏥',
    title: 'Healthcare Facilities',
    short: 'Critical cooling for patient care',
    tagline: 'Where reliability meets efficiency',
    description: 'Hospitals require precise temperature and humidity control for patient comfort, infection control, and medical equipment operation. Chiller systems must be efficient while maintaining 24/7 reliability.',
    connection: 'Healthcare facilities have strict environmental requirements that limit aggressive efficiency strategies. However, proper COP optimization through staging, reset strategies, and maintenance can achieve 15-25% energy savings without compromising care.',
    howItWorks: 'Hospital chiller plants typically feature N+1 redundancy with multiple chillers. Load varies significantly by zone (operating rooms vs. patient rooms) and time of day, requiring sophisticated staging and control strategies.',
    stats: [
      { value: '2.5x', label: 'More energy than office buildings', icon: '⚡' },
      { value: '24/7', label: 'Critical cooling requirement', icon: '🏥' },
      { value: '68-75°F', label: 'Typical OR temperature range', icon: '🌡️' }
    ],
    examples: ['Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins Hospital', 'Singapore General Hospital'],
    companies: ['Johnson Controls', 'Siemens', 'Honeywell', 'Daikin'],
    futureImpact: 'Predictive maintenance and real-time optimization will reduce energy costs while maintaining the reliability critical for patient care.',
    color: '#EF4444'
  },
  {
    icon: '🏭',
    title: 'Industrial Process Cooling',
    short: 'Precision cooling for manufacturing',
    tagline: 'Where process quality depends on temperature',
    description: 'Industrial facilities use chillers for process cooling in manufacturing, food processing, and pharmaceuticals. Precise temperature control is often more critical than in comfort cooling applications.',
    connection: 'Industrial chillers often operate at lower temperatures than comfort cooling, which increases temperature lift and reduces COP. However, the high continuous loads make efficiency improvements extremely valuable.',
    howItWorks: 'Process chillers may operate at very low temperatures (-10°C to 7°C) depending on the application. Multiple chillers often serve different temperature requirements, with sophisticated controls optimizing the overall plant efficiency.',
    stats: [
      { value: '-40°C to 20°C', label: 'Process temperature range', icon: '🌡️' },
      { value: '2-4', label: 'Low-temp chiller COP', icon: '📊' },
      { value: '20-50%', label: 'Of factory energy for cooling', icon: '🏭' }
    ],
    examples: ['Pharmaceutical manufacturing', 'Semiconductor fabs', 'Food processing plants', 'Chemical production'],
    companies: ['GEA', 'Carrier', 'Bitzer', 'Mayekawa'],
    futureImpact: 'Natural refrigerants and magnetic bearing compressors will enable higher efficiency at low temperatures while reducing environmental impact.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ChillerCOPRenderer: React.FC<ChillerCOPRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [condenserTemp, setCondenserTemp] = useState(35); // °C
  const [evaporatorTemp, setEvaporatorTemp] = useState(7); // °C
  const [loadPercentage, setLoadPercentage] = useState(80); // %
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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for cooling
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    cold: '#3B82F6',
    hot: '#EF4444',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
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
    twist_predict: 'Partial Load',
    twist_play: 'Load Lab',
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
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate COP based on conditions
  const calculateCOP = useCallback((Tcond: number, Tevap: number, load: number) => {
    // Ideal Carnot COP = Tevap / (Tcond - Tevap)
    // Convert to Kelvin
    const TcondK = Tcond + 273.15;
    const TevapK = Tevap + 273.15;
    const carnotCOP = TevapK / (TcondK - TevapK);

    // Real chillers achieve 50-70% of Carnot COP
    // Efficiency varies with load (peaks around 50-70% load)
    const loadFactor = 1 - 0.3 * Math.pow((load - 60) / 60, 2); // Peaks at 60% load
    const realCOP = carnotCOP * 0.6 * Math.max(0.5, loadFactor);

    return Math.max(2, Math.min(8, realCOP));
  }, []);

  // Current COP and related values
  const temperatureLift = condenserTemp - evaporatorTemp;
  const currentCOP = calculateCOP(condenserTemp, evaporatorTemp, loadPercentage);
  const coolingCapacity = loadPercentage * 10; // kW (baseline 1000 kW at 100%)
  const compressorPower = coolingCapacity / currentCOP;

  // Chiller Cycle Visualization Component
  const ChillerCycleVisualization = ({ showFlow = true }) => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 280 : 350;

    // Animation for refrigerant flow
    const flowOffset = (animationFrame * 2) % 40;

    return (
      <svg width={width} height={height} viewBox="0 0 450 350" style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Background */}
        <rect x="0" y="0" width="450" height="350" fill={colors.bgCard} rx="12" />

        {/* Evaporator (left side - cold) */}
        <rect x="30" y="120" width="100" height="110" rx="8" fill={`${colors.cold}22`} stroke={colors.cold} strokeWidth="2" />
        <text x="80" y="145" fill={colors.cold} fontSize="12" fontWeight="600" textAnchor="middle">EVAPORATOR</text>
        <text x="80" y="165" fill={colors.textSecondary} fontSize="11" textAnchor="middle">{evaporatorTemp}°C</text>
        {/* Cooling coils */}
        <path d="M 45 180 Q 55 185 65 180 Q 75 175 85 180 Q 95 185 105 180 Q 115 175 115 180" fill="none" stroke={colors.cold} strokeWidth="2" />
        <path d="M 45 200 Q 55 205 65 200 Q 75 195 85 200 Q 95 205 105 200 Q 115 195 115 200" fill="none" stroke={colors.cold} strokeWidth="2" />
        <text x="80" y="220" fill={colors.textMuted} fontSize="10" textAnchor="middle">Absorbs heat</text>

        {/* Condenser (right side - hot) */}
        <rect x="320" y="120" width="100" height="110" rx="8" fill={`${colors.hot}22`} stroke={colors.hot} strokeWidth="2" />
        <text x="370" y="145" fill={colors.hot} fontSize="12" fontWeight="600" textAnchor="middle">CONDENSER</text>
        <text x="370" y="165" fill={colors.textSecondary} fontSize="11" textAnchor="middle">{condenserTemp}°C</text>
        {/* Heat rejection fins */}
        <path d="M 335 180 Q 345 185 355 180 Q 365 175 375 180 Q 385 185 395 180 Q 405 175 405 180" fill="none" stroke={colors.hot} strokeWidth="2" />
        <path d="M 335 200 Q 345 205 355 200 Q 365 195 375 200 Q 385 205 395 200 Q 405 195 405 200" fill="none" stroke={colors.hot} strokeWidth="2" />
        <text x="370" y="220" fill={colors.textMuted} fontSize="10" textAnchor="middle">Rejects heat</text>

        {/* Compressor (top) */}
        <circle cx="225" cy="60" r="35" fill={`${colors.warning}22`} stroke={colors.warning} strokeWidth="2" />
        <text x="225" y="55" fill={colors.warning} fontSize="12" fontWeight="600" textAnchor="middle">COMPRESSOR</text>
        <text x="225" y="72" fill={colors.textSecondary} fontSize="10" textAnchor="middle">{compressorPower.toFixed(0)} kW</text>

        {/* Expansion valve (bottom) */}
        <rect x="200" y="280" width="50" height="30" rx="4" fill={`${colors.accent}22`} stroke={colors.accent} strokeWidth="2" />
        <text x="225" y="300" fill={colors.accent} fontSize="10" fontWeight="600" textAnchor="middle">EXP VALVE</text>

        {/* Refrigerant flow lines */}
        {/* Evaporator to Compressor (low pressure gas - blue) */}
        <path d="M 130 150 L 190 95" fill="none" stroke={colors.cold} strokeWidth="3" strokeDasharray={showFlow ? "8,4" : "0"} strokeDashoffset={showFlow ? -flowOffset : 0} />
        <polygon points="185,100 195,90 190,105" fill={colors.cold} />

        {/* Compressor to Condenser (high pressure gas - red) */}
        <path d="M 260 95 L 320 150" fill="none" stroke={colors.hot} strokeWidth="3" strokeDasharray={showFlow ? "8,4" : "0"} strokeDashoffset={showFlow ? -flowOffset : 0} />
        <polygon points="315,145 325,155 310,155" fill={colors.hot} />

        {/* Condenser to Expansion Valve (high pressure liquid) */}
        <path d="M 370 230 L 370 260 L 250 295" fill="none" stroke={colors.warning} strokeWidth="3" strokeDasharray={showFlow ? "8,4" : "0"} strokeDashoffset={showFlow ? -flowOffset : 0} />
        <polygon points="255,290 245,300 255,300" fill={colors.warning} />

        {/* Expansion Valve to Evaporator (low pressure liquid - cyan) */}
        <path d="M 200 295 L 80 295 L 80 230" fill="none" stroke={colors.accent} strokeWidth="3" strokeDasharray={showFlow ? "8,4" : "0"} strokeDashoffset={showFlow ? -flowOffset : 0} />
        <polygon points="75,235 85,235 80,225" fill={colors.accent} />

        {/* Temperature lift indicator */}
        <line x1="225" y1="130" x2="225" y2="180" stroke={colors.textSecondary} strokeWidth="1" strokeDasharray="4,4" />
        <text x="225" y="160" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Lift: {temperatureLift}°C</text>

        {/* COP display */}
        <rect x="175" y="200" width="100" height="50" rx="8" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="2" />
        <text x="225" y="220" fill={colors.textSecondary} fontSize="10" textAnchor="middle">COP</text>
        <text x="225" y="240" fill={colors.success} fontSize="18" fontWeight="700" textAnchor="middle">{currentCOP.toFixed(2)}</text>

        {/* Heat flow arrows */}
        <g transform="translate(10, 175)">
          <text x="0" y="0" fill={colors.cold} fontSize="18">❄️</text>
          <text x="0" y="15" fill={colors.textMuted} fontSize="9">Q_cold</text>
        </g>
        <g transform="translate(425, 175)">
          <text x="0" y="0" fill={colors.hot} fontSize="18">🔥</text>
          <text x="0" y="15" fill={colors.textMuted} fontSize="9">Q_hot</text>
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
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

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

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ❄️⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Chiller Coefficient of Performance
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "A chiller uses 1 kW of electricity to remove 5 kW of heat. That's not magic—it's <span style={{ color: colors.accent }}>thermodynamics</span>. Understanding COP reveals why some chillers cost twice as much to operate as others."
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
            "The key to efficient cooling isn't working harder—it's working smarter by minimizing the temperature lift."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — HVAC Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Chiller Efficiency →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'COP stays the same—it depends only on the chiller design' },
      { id: 'b', text: 'COP increases because there\'s less difference between hot and cold sides' },
      { id: 'c', text: 'COP decreases because the condenser can\'t reject heat as effectively' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
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
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A chiller operates with a COP of 5.5 when outdoor temperature is 25°C. If outdoor temperature rises to 40°C, what happens to COP?
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
              <div style={{ fontSize: '48px' }}>🌤️</div>
              <p style={{ ...typo.small, color: colors.textPrimary }}>25°C Outdoor</p>
              <p style={{ ...typo.h3, color: colors.success }}>COP = 5.5</p>
            </div>
            <div style={{ fontSize: '32px', color: colors.textMuted }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px' }}>☀️🔥</div>
              <p style={{ ...typo.small, color: colors.textPrimary }}>40°C Outdoor</p>
              <p style={{ ...typo.h3, color: colors.textMuted }}>COP = ?</p>
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
            >
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Chiller Cycle
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            The Refrigeration Cycle
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust temperatures and watch how COP changes
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ChillerCycleVisualization showFlow={true} />
            </div>

            {/* Condenser temperature slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>🔥 Condenser Temperature</span>
                <span style={{
                  ...typo.small,
                  color: condenserTemp > 40 ? colors.error : condenserTemp > 32 ? colors.warning : colors.success,
                  fontWeight: 600
                }}>
                  {condenserTemp}°C
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="50"
                value={condenserTemp}
                onChange={(e) => setCondenserTemp(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Cool Day</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Hot Day</span>
              </div>
            </div>

            {/* Evaporator temperature slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>❄️ Evaporator Temperature</span>
                <span style={{ ...typo.small, color: colors.cold, fontWeight: 600 }}>{evaporatorTemp}°C</span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                value={evaporatorTemp}
                onChange={(e) => setEvaporatorTemp(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Very Cold</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Warmer</span>
              </div>
            </div>

            {/* Results display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                borderTop: `3px solid ${colors.warning}`,
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Temperature Lift</div>
                <div style={{ ...typo.h3, color: colors.warning }}>{temperatureLift}°C</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                borderTop: `3px solid ${colors.success}`,
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>COP</div>
                <div style={{ ...typo.h3, color: colors.success }}>{currentCOP.toFixed(2)}</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                borderTop: `3px solid ${colors.accent}`,
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Efficiency</div>
                <div style={{ ...typo.h3, color: colors.accent }}>{(currentCOP / 6 * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Discovery insight */}
          {temperatureLift < 25 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                💡 Lower temperature lift = higher COP! You found the efficiency sweet spot.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Science of COP
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>COP = Q_cooling / W_compressor</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.accent}`,
                }}>
                  <h4 style={{ color: colors.accent, margin: '0 0 8px 0' }}>What is COP?</h4>
                  <p style={{ margin: 0, color: colors.textSecondary }}>
                    Coefficient of Performance measures how much cooling you get for each unit of electricity used. A COP of 5 means you get 5 kW of cooling for every 1 kW of power consumed.
                  </p>
                </div>

                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.warning}`,
                }}>
                  <h4 style={{ color: colors.warning, margin: '0 0 8px 0' }}>Temperature Lift Matters</h4>
                  <p style={{ margin: 0, color: colors.textSecondary }}>
                    The difference between condenser and evaporator temperature (lift) directly affects efficiency. Smaller lift = less work for the compressor = higher COP.
                  </p>
                </div>

                <div style={{
                  background: colors.bgSecondary,
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <h4 style={{ color: colors.success, margin: '0 0 8px 0' }}>The Carnot Limit</h4>
                  <p style={{ margin: 0, color: colors.textSecondary }}>
                    Thermodynamics sets a maximum possible COP (Carnot COP). Real chillers achieve 50-70% of this theoretical maximum due to real-world losses.
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
              💡 Key Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Chillers don't create cooling from electricity—they <strong>move heat</strong> from inside to outside. COP &gt; 1 is possible because we're leveraging thermodynamics, not violating it!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Partial Load Effects →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'COP decreases—running at partial load wastes energy' },
      { id: 'b', text: 'COP stays the same—efficiency is constant regardless of load' },
      { id: 'c', text: 'COP often increases at moderate partial loads (40-70%)' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
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
              📊 New Variable: Partial Load Operation
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A chiller runs at 60% of its rated capacity instead of 100%. What happens to its COP?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `conic-gradient(${colors.accent} 100%, ${colors.border} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: colors.bgCard,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: colors.accent,
                }}>100%</div>
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>Full Load</p>
            </div>
            <div style={{ fontSize: '24px', color: colors.textMuted }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `conic-gradient(${colors.success} 60%, ${colors.border} 60%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: colors.bgCard,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: colors.success,
                }}>60%</div>
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>Partial Load</p>
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
              style={primaryButtonStyle}
            >
              See the Load Curve →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Calculate part-load efficiency curve
    const loadPoints = [20, 30, 40, 50, 60, 70, 80, 90, 100];
    const copValues = loadPoints.map(load => calculateCOP(condenserTemp, evaporatorTemp, load));
    const maxCOP = Math.max(...copValues);
    const optimalLoad = loadPoints[copValues.indexOf(maxCOP)];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Part-Load Efficiency Curve
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how COP varies with cooling load
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Part-load curve visualization */}
            <div style={{ marginBottom: '24px' }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}>
                {/* Grid */}
                {[0, 25, 50, 75, 100].map(x => (
                  <line key={`v${x}`} x1={50 + x * 3} y1="20" x2={50 + x * 3} y2="170" stroke={colors.border} strokeDasharray="3,3" />
                ))}
                {[0, 25, 50, 75, 100].map((_, i) => (
                  <line key={`h${i}`} x1="50" y1={20 + i * 37.5} x2="350" y2={20 + i * 37.5} stroke={colors.border} strokeDasharray="3,3" />
                ))}

                {/* Axes */}
                <line x1="50" y1="170" x2="350" y2="170" stroke={colors.textSecondary} strokeWidth="2" />
                <line x1="50" y1="20" x2="50" y2="170" stroke={colors.textSecondary} strokeWidth="2" />

                {/* Axis labels */}
                <text x="200" y="195" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Load (%)</text>
                <text x="15" y="100" fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform="rotate(-90, 15, 100)">COP</text>

                {/* COP curve */}
                <path
                  d={loadPoints.map((load, i) => {
                    const x = 50 + (load - 20) * (300 / 80);
                    const y = 170 - ((copValues[i] - 2) / 6) * 150;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="3"
                />

                {/* Data points */}
                {loadPoints.map((load, i) => {
                  const x = 50 + (load - 20) * (300 / 80);
                  const y = 170 - ((copValues[i] - 2) / 6) * 150;
                  return (
                    <circle
                      key={load}
                      cx={x}
                      cy={y}
                      r={load === loadPercentage ? 8 : 4}
                      fill={load === optimalLoad ? colors.success : load === loadPercentage ? colors.warning : colors.accent}
                    />
                  );
                })}

                {/* Current operating point */}
                <line
                  x1={50 + (loadPercentage - 20) * (300 / 80)}
                  y1="20"
                  x2={50 + (loadPercentage - 20) * (300 / 80)}
                  y2="170"
                  stroke={colors.warning}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>
            </div>

            {/* Load slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Cooling Load</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{loadPercentage}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={loadPercentage}
                onChange={(e) => setLoadPercentage(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Results */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current Load</div>
                <div style={{ ...typo.h3, color: colors.accent }}>{loadPercentage}%</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current COP</div>
                <div style={{ ...typo.h3, color: colors.success }}>{currentCOP.toFixed(2)}</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted }}>Optimal Load</div>
                <div style={{ ...typo.h3, color: colors.warning }}>{optimalLoad}%</div>
              </div>
            </div>
          </div>

          {/* Insight */}
          {loadPercentage >= 50 && loadPercentage <= 70 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                💡 You're in the sweet spot! This is why running 2 chillers at 50% is often better than 1 at 100%.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why →
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Optimizing Chiller Efficiency
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
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Part-Load Efficiency</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Chillers often achieve <strong>peak efficiency at 40-70% load</strong>. At full load, larger temperature differentials reduce COP. At very low loads, compressor efficiency drops and parasitic losses dominate.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Temperature Reset Strategies</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Chilled water reset:</strong> Raise supply temp when possible (2-4% COP gain per °C).
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                <strong>Condenser water reset:</strong> Lower condenser temp when cooling towers allow (3-5% COP gain per °C).
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Staging Strategy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Run multiple chillers at partial load rather than fewer at full load. Two chillers at 50% can use <strong>10-20% less energy</strong> than one at 100% for the same cooling output.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
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
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                How COP Optimization Applies:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test →
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
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed ? 'You\'ve mastered Chiller COP!' : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryButtonStyle}>
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
                style={primaryButtonStyle}
              >
                Review & Try Again
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
                  background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

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

          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

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
          Chiller COP Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the thermodynamics behind chiller efficiency and how to optimize cooling systems for maximum performance.
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
              'COP = Cooling / Work input',
              'Lower temperature lift = higher COP',
              'Part-load efficiency optimization',
              'Temperature reset strategies',
              'Real-world chiller applications',
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
          <a href="/" style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}>
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ChillerCOPRenderer;
