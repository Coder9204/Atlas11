'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// NEWTON'S LAW OF COOLING - Complete 10-Phase Game
// Physics: dT/dt = -k(T - T_ambient) - Exponential decay to ambient temperature
// Hook: "Does cooling happen at a constant rate?"
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

interface NewtonCoolingRendererProps {
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
    scenario: "A forensic investigator arrives at a crime scene and finds a body at 32C. Room temperature is 22C and normal body temperature is 37C.",
    question: "Why is the cooling rate slower now than it was immediately after death?",
    options: [
      { id: 'a', label: "The body has lost most of its heat already" },
      { id: 'b', label: "The temperature difference from the room is smaller now", correct: true },
      { id: 'c', label: "Room temperature increased over time" },
      { id: 'd', label: "The body's mass decreased" }
    ],
    explanation: "Newton's Law of Cooling states cooling rate is proportional to temperature difference (dT/dt = -k(T - T_ambient)). At 32C with room at 22C, the difference is only 10C. Right after death at 37C, the difference was 15C, causing faster cooling."
  },
  {
    scenario: "You pour coffee at 90C. After 5 minutes it's 70C. The room is at 20C.",
    question: "What will the temperature approximately be after another 5 minutes?",
    options: [
      { id: 'a', label: "50C (another 20 degree drop)" },
      { id: 'b', label: "About 56C (exponential decay)", correct: true },
      { id: 'c', label: "40C (faster cooling)" },
      { id: 'd', label: "60C (linear cooling)" }
    ],
    explanation: "Cooling follows exponential decay, not linear. The initial delta T was 70C (90-20), dropping 20 degrees in 5 min. Now delta T is 50C (70-20), so the drop rate is slower. Using Newton's Law: approximately 56C after another 5 minutes."
  },
  {
    scenario: "A restaurant serves soup at 75C. Health codes require it stay above 60C for bacteria safety. Room temperature is 25C.",
    question: "Why does a lid help keep soup safe longer?",
    options: [
      { id: 'a', label: "Lids reflect heat back into the soup" },
      { id: 'b', label: "Lids prevent bacterial contamination" },
      { id: 'c', label: "Lids reduce evaporative cooling and convective heat loss", correct: true },
      { id: 'd', label: "Lids insulate by trapping cold air" }
    ],
    explanation: "A lid reduces the heat transfer coefficient 'k' in Newton's Law by blocking evaporation (which carries away latent heat) and reducing convective air currents. This slows the exponential decay, keeping food in the safe temperature zone longer."
  },
  {
    scenario: "An engineer compares cooling a hot steel plate in still air versus with a fan blowing on it.",
    question: "How does the fan affect Newton's cooling equation dT/dt = -k(T - T_ambient)?",
    options: [
      { id: 'a', label: "It lowers T_ambient" },
      { id: 'b', label: "It increases the coefficient k (faster heat transfer)", correct: true },
      { id: 'c', label: "It changes T to cool faster initially only" },
      { id: 'd', label: "It has no effect - only temperature difference matters" }
    ],
    explanation: "The cooling coefficient 'k' depends on the heat transfer mechanism. Forced convection (fan) dramatically increases k compared to natural convection. The temperature difference stays the same, but the rate constant k increases 5-10x."
  },
  {
    scenario: "A physicist notes that a cup of hot water and a cup of warm water both eventually reach room temperature (22C).",
    question: "Which cup cools faster when both start their approach to room temperature?",
    options: [
      { id: 'a', label: "They cool at the same rate" },
      { id: 'b', label: "The hot cup cools faster because delta T is larger", correct: true },
      { id: 'c', label: "The warm cup cools faster because it's closer to equilibrium" },
      { id: 'd', label: "It depends on the cup material only" }
    ],
    explanation: "Newton's Law shows cooling rate is directly proportional to temperature difference. The hot cup at 80C has delta T = 58C, while warm cup at 40C has delta T = 18C. The hot cup loses heat more than 3x faster initially!"
  },
  {
    scenario: "A building HVAC engineer notices a room at 30C takes 2 hours to cool to 25C when the AC produces 18C air.",
    question: "If the AC is set colder to produce 15C air instead, approximately how long to reach 25C?",
    options: [
      { id: 'a', label: "Same time - only room temperature matters" },
      { id: 'b', label: "About 1.5 hours - larger delta T means faster cooling", correct: true },
      { id: 'c', label: "2.5 hours - colder air is less efficient" },
      { id: 'd', label: "1 hour - proportional to temperature difference" }
    ],
    explanation: "With 18C air, initial delta T = 12C. With 15C air, initial delta T = 15C, which is 25% larger driving force. Newton's Law predicts cooling time roughly inversely proportional to this driving force, so about 1.5-1.6 hours."
  },
  {
    scenario: "Hot coffee is served in a metal mug versus a ceramic mug, both uninsulated and at the same starting temperature.",
    question: "Why does coffee in the metal mug feel like it cools faster?",
    options: [
      { id: 'a', label: "Metal has higher heat capacity" },
      { id: 'b', label: "Metal conducts heat away faster, increasing effective k", correct: true },
      { id: 'c', label: "Metal reflects heat better" },
      { id: 'd', label: "It doesn't - they cool at the same rate" }
    ],
    explanation: "Metal's high thermal conductivity means heat transfers faster from coffee through the mug wall to the environment, effectively increasing the overall k value. Ceramic's lower conductivity acts as an insulator."
  },
  {
    scenario: "A coroner uses the Glaister equation: Time (hours) = (37 - body temp) / 1.5, which assumes constant cooling.",
    question: "Why is this simple formula only accurate for recently deceased bodies?",
    options: [
      { id: 'a', label: "Bodies cool linearly at first, then exponentially" },
      { id: 'b', label: "It assumes constant rate, but Newton's Law shows rate decreases as body approaches room temp", correct: true },
      { id: 'c', label: "Room temperature varies too much" },
      { id: 'd', label: "Body composition changes after death" }
    ],
    explanation: "The Glaister equation assumes linear cooling (~1.5C/hour), but Newton's Law shows exponential decay. Early after death when body temp is high (large delta T), cooling is relatively linear. As body approaches room temperature, the rate slows dramatically."
  },
  {
    scenario: "An espresso machine engineer tests how quickly espresso cools from 70C in a demitasse (30ml) versus a large latte in a mug (300ml).",
    question: "Why does the smaller espresso cool faster despite both starting at 70C?",
    options: [
      { id: 'a', label: "Smaller volume means less thermal mass, faster cooling", correct: true },
      { id: 'b', label: "Espresso is hotter than latte initially" },
      { id: 'c', label: "The demitasse conducts heat better" },
      { id: 'd', label: "They cool at the same rate if both are 70C" }
    ],
    explanation: "Newton's Law coefficient k depends on surface-to-volume ratio. The espresso's higher ratio (more surface per ml) means heat escapes faster per unit volume. Thermal mass is also smaller, requiring less heat removal to change temperature."
  },
  {
    scenario: "A scientist monitors temperature of an object cooling from 100C. At t=10 min it's 60C, and the room is 20C.",
    question: "What's the time constant of this cooling process?",
    options: [
      { id: 'a', label: "10 minutes" },
      { id: 'b', label: "About 14 minutes (using T = T_ambient + delta T * e^(-t/tau))", correct: true },
      { id: 'c', label: "20 minutes" },
      { id: 'd', label: "Cannot be determined" }
    ],
    explanation: "Using T(t) = T_ambient + (T_0 - T_ambient)*e^(-t/tau): 60 = 20 + 80*e^(-10/tau). Solving: 40 = 80*e^(-10/tau), so e^(-10/tau) = 0.5. Taking ln: -10/tau = -0.693, thus tau = 14.4 minutes."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔍',
    title: 'Forensic Time of Death',
    short: 'Forensics',
    tagline: 'Solving crimes with thermodynamics',
    description: 'Forensic investigators use body cooling rates to estimate time of death. By measuring body temperature and applying Newton\'s Law, they can work backward to determine when a victim died - crucial evidence in criminal investigations.',
    connection: 'A body cools from 37C toward room temperature following exponential decay. The rate depends on body size, clothing, ambient conditions, and position. Newton\'s Law provides the mathematical framework for these calculations.',
    howItWorks: 'Measure body core temperature, record ambient temperature, and apply cooling models. More sophisticated methods account for the Henssge nomogram, which includes body weight and environmental factors for improved accuracy.',
    stats: [
      { value: '37C', label: 'Normal body temp', icon: '🌡️' },
      { value: '~1.5C/hr', label: 'Initial cooling rate', icon: '📉' },
      { value: '85%', label: 'Cases using temp', icon: '📊' }
    ],
    examples: ['Criminal investigations establishing timelines', 'Mass casualty incident victim identification', 'Medical examiner death certification', 'Historical cold case re-examinations'],
    companies: ['FBI Laboratory', 'Medical Examiner Offices', 'INTERPOL', 'Forensic Science Services'],
    futureImpact: 'AI-powered forensic models combining thermal imaging, environmental sensors, and machine learning will provide more accurate time-of-death estimates within minutes of crime scene arrival.',
    color: '#6366f1'
  },
  {
    icon: '🍽️',
    title: 'Food Safety & HACCP',
    short: 'Food Safety',
    tagline: 'Keeping food in the safe zone',
    description: 'Food safety regulations require keeping hot foods above 60C and cold foods below 4C. Newton\'s Law helps predict how long food stays safe during serving, transport, and storage - critical for preventing foodborne illness.',
    connection: 'Hot food cooling toward room temperature passes through the \'danger zone\' (4-60C) where bacteria multiply rapidly. Understanding exponential cooling helps design holding equipment and set service time limits.',
    howItWorks: 'HACCP plans use cooling curves to determine safe holding times. Commercial hot wells and steam tables slow the k coefficient, while blast chillers increase it. Monitoring temps ensures food stays safe.',
    stats: [
      { value: '60C', label: 'Hot holding minimum', icon: '🔥' },
      { value: '4C', label: 'Cold holding maximum', icon: '❄️' },
      { value: '48M', label: 'US foodborne illnesses/yr', icon: '⚠️' }
    ],
    examples: ['Hospital food service temperature monitoring', 'Airline catering cooling protocols', 'Restaurant HACCP compliance systems', 'Food truck temperature management'],
    companies: ['Sysco', 'Ecolab', 'TempTraq', 'ComplianceMate'],
    futureImpact: 'IoT temperature sensors with predictive algorithms will automatically alert staff when food approaches unsafe temperatures, dramatically reducing foodborne illness outbreaks.',
    color: '#10b981'
  },
  {
    icon: '🏢',
    title: 'Building Thermal Management',
    short: 'HVAC Design',
    tagline: 'Efficient heating and cooling systems',
    description: 'HVAC engineers use Newton\'s cooling principles to size equipment, predict energy usage, and optimize comfort. Understanding how buildings lose heat to the environment enables efficient climate control design.',
    connection: 'Buildings cool (or heat) toward outdoor temperature following Newton\'s Law. The building envelope\'s insulation, window area, and air infiltration all affect the k coefficient. Better insulation means lower k and slower heat loss.',
    howItWorks: 'Engineers calculate building heat loss rate based on surface area, insulation R-values, and temperature difference. HVAC systems must supply heat faster than Newton\'s Law removes it in winter (or vice versa in summer).',
    stats: [
      { value: '40%', label: 'Building energy for HVAC', icon: '⚡' },
      { value: 'R-38', label: 'Typical attic insulation', icon: '🏠' },
      { value: '$300B', label: 'US HVAC market', icon: '💰' }
    ],
    examples: ['Passive house design with minimal heating', 'Data center thermal management', 'Historic building energy retrofits', 'Smart thermostat predictive heating'],
    companies: ['Carrier', 'Trane', 'Honeywell', 'Siemens Building Technologies'],
    futureImpact: 'Predictive HVAC systems will learn building thermal dynamics and pre-condition spaces based on occupancy schedules, weather forecasts, and energy prices, reducing energy use by 30%.',
    color: '#3b82f6'
  },
  {
    icon: '💻',
    title: 'Electronics Thermal Design',
    short: 'Electronics Cooling',
    tagline: 'Keeping chips from overheating',
    description: 'Electronic components must dissipate heat to prevent failure. Newton\'s Law governs passive cooling, while active cooling (fans, liquid) increases k. Thermal design determines device reliability and performance.',
    connection: 'A CPU generating 100W reaches equilibrium when heat dissipation rate equals generation rate. Newton\'s Law sets the temperature rise: delta T = P/(k*A). Better heatsinks increase effective k, lowering operating temperature.',
    howItWorks: 'Heatsinks increase surface area (A) and use materials with high thermal conductivity. Fans increase k through forced convection. The goal: keep junction temperature below maximum rating (typically 100-105C).',
    stats: [
      { value: '100W+', label: 'Modern CPU power', icon: '🔥' },
      { value: '105C', label: 'Max junction temp', icon: '🌡️' },
      { value: '10-50x', label: 'Fan vs passive k ratio', icon: '💨' }
    ],
    examples: ['Gaming laptop thermal throttling prevention', 'Server farm hot aisle containment', 'Smartphone passive cooling design', 'Electric vehicle battery thermal management'],
    companies: ['Noctua', 'Cooler Master', 'Thermal Grizzly', 'NVIDIA'],
    futureImpact: 'Advanced phase-change cooling and microfluidic channels will enable 500W+ processors while maintaining safe temperatures, enabling next-generation AI computing.',
    color: '#f59e0b'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const NewtonCoolingRenderer: React.FC<NewtonCoolingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [initialTemp] = useState(90); // Initial coffee temperature
  const [roomTemp] = useState(22); // Ambient temperature
  const [kCoefficient] = useState(0.05); // Heat transfer coefficient
  const [currentTemp, setCurrentTemp] = useState(90);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasLid, setHasLid] = useState(false);
  const [isStirring, setIsStirring] = useState(false);
  const animationRef = useRef<number | null>(null);

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

  // Calculate effective k based on lid and stirring
  const getEffectiveK = useCallback(() => {
    let k = kCoefficient;
    if (hasLid) k *= 0.5; // Lid reduces heat loss
    if (isStirring) k *= 1.3; // Stirring increases convection
    return k;
  }, [kCoefficient, hasLid, isStirring]);

  // Simulation animation
  useEffect(() => {
    if (!isSimulating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastTime = performance.now();

    const simulate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setElapsedTime(prev => prev + dt * 60); // 1 second real = 1 minute simulation

      setCurrentTemp(prev => {
        const effectiveK = getEffectiveK();
        const newTemp = roomTemp + (prev - roomTemp) * Math.exp(-effectiveK * dt * 60);

        // Stop if close to room temp
        if (Math.abs(newTemp - roomTemp) < 0.5) {
          setIsSimulating(false);
        }

        return newTemp;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, roomTemp, getEffectiveK]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setCurrentTemp(initialTemp);
    setElapsedTime(0);
    setIsSimulating(false);
  }, [initialTemp]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber/Orange for thermal
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
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
    twist_predict: 'New Variable',
    twist_play: 'Factors',
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
        gameType: 'newton-cooling',
        gameTitle: 'Newton\'s Law of Cooling',
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

  // Coffee Cup Visualization
  const CoffeeCupVisualization = () => {
    const steamIntensity = Math.max(0, (currentTemp - 50) / 40);
    const coffeeColor = currentTemp > 70 ? '#8B4513' : currentTemp > 50 ? '#A0522D' : '#5D3A1A';

    return (
      <svg width={isMobile ? 280 : 360} height={isMobile ? 220 : 280} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Title */}
        <text x="50%" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Coffee Cooling Simulation
        </text>

        {/* Cup body */}
        <path
          d={isMobile
            ? "M80 80 L90 180 Q140 195 190 180 L200 80 Z"
            : "M100 90 L115 220 Q180 240 245 220 L260 90 Z"
          }
          fill="#FFFFFF"
          stroke="#E5E5E5"
          strokeWidth="3"
        />

        {/* Coffee */}
        <ellipse
          cx={isMobile ? 140 : 180}
          cy={isMobile ? 90 : 100}
          rx={isMobile ? 55 : 75}
          ry={isMobile ? 12 : 15}
          fill={coffeeColor}
        />

        {/* Lid if enabled */}
        {hasLid && (
          <g>
            <ellipse
              cx={isMobile ? 140 : 180}
              cy={isMobile ? 75 : 85}
              rx={isMobile ? 60 : 80}
              ry={isMobile ? 10 : 12}
              fill="#64748b"
            />
            <rect
              x={isMobile ? 130 : 170}
              y={isMobile ? 55 : 60}
              width={isMobile ? 20 : 20}
              height={isMobile ? 20 : 25}
              rx="4"
              fill="#475569"
            />
          </g>
        )}

        {/* Steam wisps (when no lid and hot) */}
        {!hasLid && steamIntensity > 0.1 && [0, 1, 2].map(i => (
          <path
            key={i}
            d={isMobile
              ? `M${120 + i * 20},${70} Q${125 + i * 20},${40} ${115 + i * 20},${20}`
              : `M${150 + i * 30},${80} Q${160 + i * 30},${40} ${145 + i * 30},${10}`
            }
            fill="none"
            stroke="white"
            strokeWidth="2"
            opacity={steamIntensity * (0.4 - i * 0.1)}
          >
            <animate
              attributeName="d"
              values={isMobile
                ? `M${120 + i * 20},70 Q${125 + i * 20},40 ${115 + i * 20},20;M${120 + i * 20},70 Q${115 + i * 20},35 ${130 + i * 20},15;M${120 + i * 20},70 Q${125 + i * 20},40 ${115 + i * 20},20`
                : `M${150 + i * 30},80 Q${160 + i * 30},40 ${145 + i * 30},10;M${150 + i * 30},80 Q${140 + i * 30},35 ${165 + i * 30},5;M${150 + i * 30},80 Q${160 + i * 30},40 ${145 + i * 30},10`
              }
              dur={`${2 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}

        {/* Stirring indicator */}
        {isStirring && (
          <g>
            <ellipse
              cx={isMobile ? 140 : 180}
              cy={isMobile ? 90 : 100}
              rx={isMobile ? 25 : 35}
              ry={isMobile ? 6 : 8}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              opacity="0.7"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={isMobile ? "0 140 90" : "0 180 100"}
                to={isMobile ? "360 140 90" : "360 180 100"}
                dur="0.5s"
                repeatCount="indefinite"
              />
            </ellipse>
          </g>
        )}

        {/* Cup handle */}
        <path
          d={isMobile
            ? "M200 100 Q240 100 240 130 Q240 160 200 160"
            : "M260 110 Q310 110 310 150 Q310 190 260 190"
          }
          fill="none"
          stroke="#E5E5E5"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Temperature display */}
        <rect
          x={isMobile ? 10 : 15}
          y={isMobile ? 40 : 45}
          width={isMobile ? 65 : 80}
          height={isMobile ? 50 : 60}
          rx="8"
          fill="rgba(0,0,0,0.6)"
        />
        <text
          x={isMobile ? 42 : 55}
          y={isMobile ? 65 : 80}
          textAnchor="middle"
          fill={currentTemp > 70 ? colors.error : currentTemp > 50 ? colors.success : '#3b82f6'}
          fontSize={isMobile ? '16' : '20'}
          fontWeight="700"
        >
          {currentTemp.toFixed(1)}C
        </text>
        <text
          x={isMobile ? 42 : 55}
          y={isMobile ? 82 : 98}
          textAnchor="middle"
          fill={colors.textMuted}
          fontSize="10"
        >
          {currentTemp > 70 ? 'Too Hot' : currentTemp > 50 ? 'Perfect!' : 'Too Cold'}
        </text>

        {/* Time display */}
        <rect
          x={isMobile ? 205 : 265}
          y={isMobile ? 40 : 45}
          width={isMobile ? 65 : 80}
          height={isMobile ? 50 : 60}
          rx="8"
          fill="rgba(0,0,0,0.6)"
        />
        <text
          x={isMobile ? 237 : 305}
          y={isMobile ? 65 : 80}
          textAnchor="middle"
          fill={colors.accent}
          fontSize={isMobile ? '16' : '20'}
          fontWeight="700"
        >
          {elapsedTime.toFixed(0)}m
        </text>
        <text
          x={isMobile ? 237 : 305}
          y={isMobile ? 82 : 98}
          textAnchor="middle"
          fill={colors.textMuted}
          fontSize="10"
        >
          Elapsed
        </text>
      </svg>
    );
  };

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

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ☕🌡️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Newton's Law of Cooling
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Does your hot coffee cool at a <span style={{ color: colors.accent }}>constant rate</span>? Or does the <span style={{ color: colors.error }}>cooling slow down</span> as it gets closer to room temperature?"
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
            "The rate of heat loss of a body is directly proportional to the difference in temperatures between the body and its surroundings."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Sir Isaac Newton, 1701
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Cooling Physics
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Constant rate - same degrees per minute throughout' },
      { id: 'b', text: 'Faster at first, then slower as it approaches room temperature', correct: true },
      { id: 'c', text: 'Slower at first, then faster as it gets colder' },
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
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Hot coffee at 90C is placed in a 22C room. How will it cool over time?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>☕</div>
                <p style={{ ...typo.small, color: colors.error }}>90C</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>---&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>?</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Cooling pattern?</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>---&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🏠</div>
                <p style={{ ...typo.small, color: colors.success }}>22C</p>
              </div>
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
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Coffee Cooling Simulator
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
            Coffee Cooling Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Watch the exponential cooling in real-time
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CoffeeCupVisualization />
            </div>

            {/* Simulate buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  if (!isSimulating) {
                    resetSimulation();
                    setIsSimulating(true);
                  } else {
                    setIsSimulating(false);
                  }
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSimulating ? colors.warning : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSimulating ? 'Pause' : 'Start Cooling'}
              </button>
              <button
                onClick={() => {
                  resetSimulation();
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>
                  {((currentTemp - roomTemp) * getEffectiveK()).toFixed(2)} C/min
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cooling Rate</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>
                  {(currentTemp - roomTemp).toFixed(1)} C
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Temp Difference</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>
                  {currentTemp >= 50 && currentTemp <= 70 ? 'Yes!' : 'Not yet'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Drinkable? (50-70C)</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {elapsedTime > 5 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how the cooling rate decreases as the coffee approaches room temperature!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
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
            The Physics of Cooling
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Newton's Law of Cooling:</strong>
              </p>
              <div style={{
                background: colors.bgSecondary,
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <p style={{ fontFamily: 'monospace', fontSize: '20px', color: colors.accent }}>
                  dT/dt = -k(T - T_ambient)
                </p>
              </div>
              <p style={{ marginBottom: '16px' }}>
                The <span style={{ color: colors.accent }}>rate of cooling</span> is proportional to the <span style={{ color: colors.error }}>temperature difference</span> between the object and its surroundings.
              </p>
              <p>
                This means: <strong style={{ color: colors.success }}>Hotter objects cool faster!</strong> As the object approaches room temperature, cooling slows down exponentially.
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
              Key Insight: Exponential Decay
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              The solution is: T(t) = T_room + (T_0 - T_room) * e^(-kt)
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>T_0 is initial temperature</li>
              <li>T_room is ambient temperature</li>
              <li>k is the cooling coefficient (depends on surface area, material, etc.)</li>
              <li>Temperature asymptotically approaches T_room</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover What Affects Cooling
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Add a lid - trapping heat helps it cool faster' },
      { id: 'b', text: 'Stir it - increases heat loss through convection', correct: true },
      { id: 'c', text: 'Both would slow cooling - leave it alone' },
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
              New Variable: Lid and Stirring
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Your coffee is too hot. What should you do to cool it faster?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              You want to drink your 90C coffee but it's too hot. You have two options:
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '48px' }}>🔒</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Add lid</p>
              </div>
              <div>
                <div style={{ fontSize: '48px' }}>🥄</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Stir it</p>
              </div>
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
              See the Effect
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Lid & Stirring Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how lid and stirring affect the cooling coefficient k
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CoffeeCupVisualization />
            </div>

            {/* Toggle controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <button
                onClick={() => { setHasLid(!hasLid); playSound('click'); }}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: hasLid ? `2px solid ${colors.accent}` : `2px solid ${colors.border}`,
                  background: hasLid ? `${colors.accent}22` : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{hasLid ? '🔒' : '☕'}</div>
                <div style={{ color: hasLid ? colors.accent : colors.textSecondary, fontWeight: 600 }}>
                  Lid: {hasLid ? 'ON' : 'OFF'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>k x 0.5</div>
              </button>
              <button
                onClick={() => { setIsStirring(!isStirring); playSound('click'); }}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: isStirring ? `2px solid ${colors.success}` : `2px solid ${colors.border}`,
                  background: isStirring ? `${colors.success}22` : colors.bgSecondary,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{isStirring ? '🔄' : '🥄'}</div>
                <div style={{ color: isStirring ? colors.success : colors.textSecondary, fontWeight: 600 }}>
                  Stir: {isStirring ? 'ON' : 'OFF'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>k x 1.3</div>
              </button>
            </div>

            {/* k value display */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                Effective Cooling Coefficient
              </div>
              <div style={{ ...typo.h2, color: colors.accent }}>
                k = {getEffectiveK().toFixed(4)}
              </div>
              <div style={{ ...typo.small, color: colors.textMuted }}>
                Base k = 0.05 x lid factor x stir factor
              </div>
            </div>

            {/* Simulate buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => {
                  if (!isSimulating) {
                    resetSimulation();
                    setIsSimulating(true);
                  } else {
                    setIsSimulating(false);
                  }
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSimulating ? colors.warning : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSimulating ? 'Pause' : 'Start Cooling'}
              </button>
              <button
                onClick={() => {
                  resetSimulation();
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Effects
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
            What Affects Cooling Rate
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔒</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Lid (k x 0.5)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A lid blocks evaporative cooling (which can be 30-50% of heat loss!) and reduces convective air currents. This <span style={{ color: colors.error }}>SLOWS cooling</span> - great for keeping coffee hot, bad if you want to drink it quickly.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🥄</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Stirring (k x 1.3)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Stirring breaks up the thermal boundary layer at the surface, increasing convective heat transfer. This <span style={{ color: colors.success }}>SPEEDS cooling</span> - the answer to getting drinkable coffee faster!
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
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Pro Tip</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Want coffee drinkable fast? Stir without a lid, or pour into a saucer (more surface area). Want to keep it hot? Add a lid and don't stir. The math of Newton's Law explains both strategies!
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
                  {a.short}
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
                How Newton's Law Connects:
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
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand Newton\'s Law of Cooling!'
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Cooling Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand Newton's Law of Cooling - the fundamental principle behind forensics, food safety, HVAC design, and electronics thermal management.
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
              'Cooling rate is proportional to temperature difference',
              'Temperature follows exponential decay toward ambient',
              'The cooling coefficient k depends on multiple factors',
              'Lids slow cooling, stirring speeds it up',
              'Newton\'s Law applies from forensics to chip design',
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

export default NewtonCoolingRenderer;
