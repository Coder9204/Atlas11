'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const audioContext = new AudioCtx();
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
    scenario: "A forensic investigator arrives at a crime scene and finds a body at 32C. Room temperature is 22C and normal body temperature is 37C. The body has been cooling for several hours.",
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
    scenario: "You pour coffee at 90C into a mug on your kitchen counter. After 5 minutes it's 70C. The room is at 20C. You want to predict the next 5 minutes of cooling.",
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
    scenario: "A restaurant serves soup at 75C. Health codes require it stay above 60C for bacteria safety. Room temperature is 25C. The head chef wants to maximize safe serving time.",
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
    scenario: "An engineer is testing industrial cooling methods. She compares cooling a hot steel plate at 200C in still air versus with a powerful fan blowing on it at the same ambient temperature of 25C.",
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
    scenario: "A physicist places two cups of water side by side: one hot at 80C and one warm at 40C. Both are in a room at 22C. She observes both cups for the next 30 minutes.",
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
    scenario: "A building HVAC engineer is troubleshooting an office. The room at 30C takes 2 hours to cool to 25C when the AC produces 18C air. Management wants to speed this up.",
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
    scenario: "A barista tests coffee temperature in two different containers: a thin metal mug and a thick ceramic mug. Both hold the same coffee at 85C in the same environment at 22C.",
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
    scenario: "A coroner uses the Glaister equation: Time (hours) = (37 - body temp) / 1.5, which assumes constant cooling at 1.5C per hour. A detective questions the accuracy of this formula for old cases.",
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
    scenario: "An espresso machine engineer tests beverage cooling. She compares a demitasse espresso (30ml) to a large latte in a mug (300ml), both starting at 70C in the same 22C environment.",
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
    scenario: "A scientist monitors temperature of an object cooling from 100C in a laboratory. At t=10 min it's 60C, and the room is 20C. She wants to calculate the exact cooling constant.",
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
    description: 'Forensic investigators use body cooling rates to estimate time of death. By measuring body temperature and applying Newton\'s Law, they can work backward to determine when a victim died - crucial evidence in criminal investigations. The technique relies on the fact that a human body at 37C cools exponentially toward room temperature following the same mathematical curve we studied.',
    connection: 'A body cools from 37C toward room temperature following exponential decay. The rate depends on body size, clothing, ambient conditions, and position. Newton\'s Law provides the mathematical framework for these calculations, with the cooling constant k varying based on environmental factors.',
    howItWorks: 'Measure body core temperature, record ambient temperature, and apply cooling models. More sophisticated methods account for the Henssge nomogram, which includes body weight and environmental factors for improved accuracy.',
    stats: [
      { value: '85%', label: 'Cases using temp evidence', icon: '📊' },
      { value: '14 million', label: 'Forensic cases globally', icon: '🔍' },
      { value: '10x', label: 'Accuracy vs linear model', icon: '🌡️' }
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
    description: 'Food safety regulations require keeping hot foods above 60C and cold foods below 4C. Newton\'s Law helps predict how long food stays safe during serving, transport, and storage - critical for preventing foodborne illness. Each year in the US, 48 million people suffer foodborne illnesses, many of which are preventable with proper temperature management based on cooling physics.',
    connection: 'Hot food cooling toward room temperature passes through the \'danger zone\' (4-60C) where bacteria multiply rapidly. Understanding exponential cooling helps design holding equipment and set service time limits to keep food safe throughout service.',
    howItWorks: 'HACCP plans use cooling curves to determine safe holding times. Commercial hot wells and steam tables slow the k coefficient by 50-70%, while blast chillers increase k dramatically. Monitoring temps ensures food stays safe.',
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
    description: 'HVAC engineers use Newton\'s cooling principles to size equipment, predict energy usage, and optimize comfort. Understanding how buildings lose heat to the environment enables efficient climate control design. Buildings account for 40% of total US energy consumption, and HVAC represents the largest single energy use in most commercial buildings, making Newton\'s Law directly relevant to billions of dollars in energy costs.',
    connection: 'Buildings cool (or heat) toward outdoor temperature following Newton\'s Law. The building envelope\'s insulation, window area, and air infiltration all affect the k coefficient. Better insulation means lower k and slower heat loss, directly reducing heating costs.',
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
    description: 'Electronic components must dissipate heat to prevent failure. Newton\'s Law governs passive cooling, while active cooling (fans, liquid) increases k. Thermal design determines device reliability and performance. Modern CPUs can generate over 100W of heat in a chip smaller than a postage stamp, and without proper thermal management following Newton\'s Law principles, they would reach destructive temperatures within seconds.',
    connection: 'A CPU generating 100W reaches equilibrium when heat dissipation rate equals generation rate. Newton\'s Law sets the temperature rise: delta T = P/(k*A). Better heatsinks increase effective k, lowering operating temperature and extending component life by 10x.',
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

  // Slider-controlled physics parameters
  const [initialTempSlider, setInitialTempSlider] = useState(65); // Initial coffee temperature (60-100C)
  const [kSlider, setKSlider] = useState(5); // Cooling coefficient slider (1-10, maps to 0.01-0.10)
  const [hasLid, setHasLid] = useState(false);
  const [isStirring, setIsStirring] = useState(false);

  // Simulation state
  const initialTemp = initialTempSlider;
  const roomTemp = 22;
  const kCoefficient = kSlider / 100; // maps 1-10 -> 0.01-0.10
  const [currentTemp, setCurrentTemp] = useState(65);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [viewedApps, setViewedApps] = useState<boolean[]>([true, false, false, false]);

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
    if (hasLid) k *= 0.5;
    if (isStirring) k *= 1.3;
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

      setElapsedTime(prev => prev + dt * 60);

      setCurrentTemp(prev => {
        const effectiveK = getEffectiveK();
        const newTemp = roomTemp + (prev - roomTemp) * Math.exp(-effectiveK * dt * 60);
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

  // Reset currentTemp when slider changes
  useEffect(() => {
    setCurrentTemp(initialTempSlider);
    setElapsedTime(0);
    setIsSimulating(false);
  }, [initialTempSlider]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textMuted: '#94a3b8',
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
    twist_play: 'Explore Factors',
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
        gameTitle: "Newton's Law of Cooling",
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
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
      padding: '0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            minHeight: '44px',
            padding: '18px 0',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            display: 'block',
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
            transition: 'all 0.3s ease',
          }} />
        </button>
      ))}
    </div>
  );

  // Bottom navigation bar with Back and Next buttons
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;
    // Disable Next during active test phase (quiz in progress)
    const isTestPhase = phase === 'test';
    const nextDisabled = !canGoNext || isTestPhase;
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
      }}>
        <button
          onClick={prevPhase}
          disabled={!canGoBack}
          style={{
            padding: '10px 20px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${canGoBack ? colors.border : 'transparent'}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : 'transparent',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            opacity: canGoBack ? 1 : 0.4,
          }}
          aria-label="Back"
        >
          ← Back
        </button>
        {renderNavDots()}
        <button
          onClick={nextDisabled ? undefined : nextPhase}
          disabled={nextDisabled}
          style={{
            padding: '10px 20px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: !nextDisabled ? colors.accent : 'transparent',
            color: !nextDisabled ? 'white' : 'transparent',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: nextDisabled ? 0.4 : 1,
          }}
          aria-label="Next"
        >
          Next →
        </button>
      </div>
    );
  };

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

  // Main container wrapper with scroll
  const renderWithScrollContainer = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh',
      background: colors.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '16px',
      }}>
        {content}
      </div>
      {renderNavBar()}
    </div>
  );

  // ---------------------------------------------------------------------------
  // SVG COOLING CURVE VISUALIZATION
  // ---------------------------------------------------------------------------
  // Compute the cooling curve path using useMemo for performance
  const coolingCurvePath = useMemo(() => {
    const svgWidth = isMobile ? 240 : 300;
    const svgHeight = 200;
    const tMax = isMobile ? 30 : 60; // minutes displayed
    const tempMin = 15; // room temp display min
    const tempMax = 100; // display max
    const points: string[] = [];
    const effectiveK = getEffectiveK();
    // Generate 60 points for a smooth curve
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * tMax;
      const temp = roomTemp + (initialTemp - roomTemp) * Math.exp(-effectiveK * t);
      const x = (i / 60) * svgWidth;
      const y = svgHeight - ((temp - tempMin) / (tempMax - tempMin)) * svgHeight;
      points.push(i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return { path: points.join(' '), svgWidth, svgHeight, tMax, tempMin, tempMax };
  }, [isMobile, initialTemp, roomTemp, getEffectiveK]);

  // Current point position on the curve
  const currentPointPos = useMemo(() => {
    const { svgWidth, svgHeight, tMax, tempMin, tempMax } = coolingCurvePath;
    const t = Math.min(elapsedTime, tMax);
    const x = (t / tMax) * svgWidth;
    const y = svgHeight - ((currentTemp - tempMin) / (tempMax - tempMin)) * svgHeight;
    return { x, y };
  }, [coolingCurvePath, elapsedTime, currentTemp]);

  // Static cooling curve (for predict phase - no sliders, shows the curve)
  const StaticCoolingCurve = ({ showCurve = true }: { showCurve?: boolean }) => {
    const svgWidth = isMobile ? 260 : 340;
    const svgHeight = 200;
    const leftMargin = 50;
    const topMargin = 20;
    const bottomMargin = 40;
    const rightMargin = 20;
    const plotW = svgWidth - leftMargin - rightMargin;
    const plotH = svgHeight - topMargin - bottomMargin;
    const tMax = 60;
    const tempMin = 20;
    const tempMax = 95;
    const k = 0.05;
    const T0 = 90;
    const Tamb = 22;

    // Build path with 60 points for smoothness (use space separator)
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * tMax;
      const temp = Tamb + (T0 - Tamb) * Math.exp(-k * t);
      const x = leftMargin + (i / 60) * plotW;
      const y = topMargin + plotH - ((temp - tempMin) / (tempMax - tempMin)) * plotH;
      pts.push(i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Reference points for annotation
    const refY_90 = topMargin + plotH - ((90 - tempMin) / (tempMax - tempMin)) * plotH;
    const refY_22 = topMargin + plotH - ((22 - tempMin) / (tempMax - tempMin)) * plotH;
    const refY_mid = topMargin + plotH - ((56 - tempMin) / (tempMax - tempMin)) * plotH;

    const totalSvgH = svgHeight + 10;

    return (
      <svg
        width={svgWidth}
        height={totalSvgH}
        viewBox={`0 0 ${svgWidth} ${totalSvgH}`}
        style={{ background: colors.bgCard, borderRadius: '12px', width: '100%', maxWidth: `${svgWidth}px` }}
      >
        <defs>
          <linearGradient id="coolingGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Grid group */}
        <g id="static-grid">
          {[0, 1, 2, 3, 4].map(i => {
            const yg = topMargin + (i / 4) * plotH;
            return (
              <line key={`grid-h-${i}`}
                x1={leftMargin} y1={yg}
                x2={leftMargin + plotW} y2={yg}
                stroke="rgba(148,163,184,0.7)" strokeWidth="1"
                strokeDasharray="4 4" opacity="0.3"
              />
            );
          })}
          {[0, 1, 2, 3].map(i => {
            const xg = leftMargin + (i / 3) * plotW;
            return (
              <line key={`grid-v-${i}`}
                x1={xg} y1={topMargin}
                x2={xg} y2={topMargin + plotH}
                stroke="rgba(148,163,184,0.7)" strokeWidth="1"
                strokeDasharray="4 4" opacity="0.3"
              />
            );
          })}
        </g>

        {/* Axes group */}
        <g id="static-axes">
          <line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={topMargin + plotH} stroke={colors.textSecondary} strokeWidth="2" />
          <line x1={leftMargin} y1={topMargin + plotH} x2={leftMargin + plotW} y2={topMargin + plotH} stroke={colors.textSecondary} strokeWidth="2" />
          {/* Room temperature reference line */}
          <line
            x1={leftMargin} y1={refY_22}
            x2={leftMargin + plotW} y2={refY_22}
            stroke={colors.success} strokeWidth="2"
            strokeDasharray="6 3"
          />
        </g>

        {/* Labels group */}
        <g id="static-labels">
          {/* Y-axis labels - well-spaced to avoid overlap */}
          <text x={leftMargin - 6} y={refY_90 + 4} textAnchor="end" fill={colors.textPrimary} fontSize="11" fontWeight="600">90°C</text>
          <text x={leftMargin - 6} y={refY_mid + 4} textAnchor="end" fill={colors.textPrimary} fontSize="11">55°C</text>
          <text x={leftMargin - 6} y={refY_22 - 8} textAnchor="end" fill={colors.success} fontSize="11" fontWeight="600">22°C</text>

          {/* Y-axis title */}
          <text
            x={12}
            y={topMargin + plotH / 2}
            textAnchor="middle"
            fill={colors.accent}
            fontSize="11"
            fontWeight="700"
            transform={`rotate(-90, 12, ${topMargin + plotH / 2})`}
          >
            Temp °C
          </text>

          {/* X-axis labels */}
          <text x={leftMargin} y={topMargin + plotH + 16} textAnchor="middle" fill={colors.textPrimary} fontSize="11">0</text>
          <text x={leftMargin + plotW / 2} y={topMargin + plotH + 16} textAnchor="middle" fill={colors.textPrimary} fontSize="11">30 min</text>
          <text x={leftMargin + plotW} y={topMargin + plotH + 16} textAnchor="middle" fill={colors.textPrimary} fontSize="11">60 min</text>

          {/* X-axis title */}
          <text
            x={leftMargin + plotW / 2}
            y={topMargin + plotH + 30}
            textAnchor="middle"
            fill={colors.accent}
            fontSize="11"
            fontWeight="700"
          >
            Time (minutes)
          </text>

          {/* Room temp label - above the dashed line to avoid axis overlap */}
          <text x={leftMargin + plotW} y={refY_22 - 14} textAnchor="end" fill={colors.success} fontSize="11" fontWeight="600">Room Temp</text>
        </g>

        {/* Curve group */}
        <g id="static-curve">
          {/* Cooling curve */}
          {showCurve && (
            <path
              d={pts.join(' ')}
              fill="none"
              stroke="url(#coolingGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Start point marker */}
          <circle
            cx={leftMargin}
            cy={refY_90}
            r="8"
            fill={colors.error}
            filter="url(#glowFilter)"
          />
          <circle cx={leftMargin} cy={refY_90} r="4" fill="white" />
        </g>
      </svg>
    );
  };

  // Interactive cooling curve with slider-controlled parameters
  const InteractiveCoolingCurve = () => {
    const svgWidth = isMobile ? 260 : 340;
    const svgHeight = 220;
    const leftMargin = 52;
    const topMargin = 20;
    const bottomMargin = 44;
    const rightMargin = 20;
    const plotW = svgWidth - leftMargin - rightMargin;
    const plotH = svgHeight - topMargin - bottomMargin;
    const tMax = 60;
    const tempMin = 15;
    const tempMax = 105;
    const effectiveK = getEffectiveK();
    const totalH = svgHeight + 14;

    // Build path with 60 points (use space as separator for extractPathPoints regex)
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * tMax;
      const temp = roomTemp + (initialTemp - roomTemp) * Math.exp(-effectiveK * t);
      const x = leftMargin + (i / 60) * plotW;
      const y = topMargin + plotH - ((temp - tempMin) / (tempMax - tempMin)) * plotH;
      pts.push(i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`);
    }

    // Current point position
    const tCur = Math.min(elapsedTime, tMax);
    const tempCur = roomTemp + (initialTemp - roomTemp) * Math.exp(-effectiveK * tCur);
    const cx = leftMargin + (tCur / tMax) * plotW;
    const cy = topMargin + plotH - ((tempCur - tempMin) / (tempMax - tempMin)) * plotH;

    // Reference starting point
    const startY = topMargin + plotH - ((initialTemp - tempMin) / (tempMax - tempMin)) * plotH;
    // Room temp line
    const roomY = topMargin + plotH - ((roomTemp - tempMin) / (tempMax - tempMin)) * plotH;

    // Y-axis ticks
    const yTicks = [20, 40, 60, 80, 100];

    return (
      <svg
        width={svgWidth}
        height={totalH}
        viewBox={`0 0 ${svgWidth} ${totalH}`}
        style={{ background: colors.bgCard, borderRadius: '12px', width: '100%', maxWidth: `${svgWidth}px` }}
      >
        <defs>
          <linearGradient id="coolingGradient2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="1" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="1" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
          </linearGradient>
          <filter id="ptGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Grid group */}
        <g id="grid-group">
          {yTicks.map(temp => {
            const yg = topMargin + plotH - ((temp - tempMin) / (tempMax - tempMin)) * plotH;
            if (yg < topMargin || yg > topMargin + plotH) return null;
            return (
              <line key={`grid-y-${temp}`}
                x1={leftMargin} y1={yg}
                x2={leftMargin + plotW} y2={yg}
                stroke="rgba(148,163,184,0.7)" strokeWidth="1"
                strokeDasharray="4 4" opacity="0.3"
              />
            );
          })}
          {[0, 1, 2, 3].map(i => {
            const xg = leftMargin + (i / 3) * plotW;
            return (
              <line key={`grid-x-${i}`}
                x1={xg} y1={topMargin}
                x2={xg} y2={topMargin + plotH}
                stroke="rgba(148,163,184,0.7)" strokeWidth="1"
                strokeDasharray="4 4" opacity="0.3"
              />
            );
          })}
        </g>

        {/* Axes group */}
        <g id="axes-group">
          <line x1={leftMargin} y1={topMargin} x2={leftMargin} y2={topMargin + plotH} stroke={colors.textSecondary} strokeWidth="2" />
          <line x1={leftMargin} y1={topMargin + plotH} x2={leftMargin + plotW} y2={topMargin + plotH} stroke={colors.textSecondary} strokeWidth="2" />
          {/* Room temperature reference line */}
          <line
            x1={leftMargin} y1={roomY}
            x2={leftMargin + plotW} y2={roomY}
            stroke={colors.success} strokeWidth="2"
            strokeDasharray="6 3"
          />
        </g>

        {/* Labels group */}
        <g id="labels-group">
          {/* Y-axis labels - spaced to avoid overlap */}
          {yTicks.map(temp => {
            const yg = topMargin + plotH - ((temp - tempMin) / (tempMax - tempMin)) * plotH;
            if (yg < topMargin - 5 || yg > topMargin + plotH + 5) return null;
            return (
              <text key={`label-y-${temp}`} x={leftMargin - 6} y={yg + 4} textAnchor="end" fill={colors.textPrimary} fontSize="11">{temp}</text>
            );
          })}

          {/* Y-axis title - positioned at x=8, short text to avoid overlap with tick labels */}
          <text
            x={8}
            y={topMargin + plotH / 2}
            textAnchor="middle"
            fill={colors.accent}
            fontSize="11"
            fontWeight="700"
            transform={`rotate(-90, 8, ${topMargin + plotH / 2})`}
          >
            T(°C)
          </text>

          {/* X-axis labels */}
          <text x={leftMargin} y={topMargin + plotH + 16} textAnchor="middle" fill={colors.textPrimary} fontSize="11">0</text>
          <text x={leftMargin + plotW / 2} y={topMargin + plotH + 16} textAnchor="middle" fill={colors.textPrimary} fontSize="11">30m</text>
          <text x={leftMargin + plotW} y={topMargin + plotH + 16} textAnchor="middle" fill={colors.textPrimary} fontSize="11">60m</text>

          {/* X-axis title */}
          <text
            x={leftMargin + plotW / 2}
            y={topMargin + plotH + 30}
            textAnchor="middle"
            fill={colors.accent}
            fontSize="11"
            fontWeight="700"
          >
            Time (min)
          </text>

          {/* Room temp label - positioned above room line on the left side to avoid x-axis label overlap */}
          <text x={leftMargin + 4} y={roomY - 5} textAnchor="start" fill={colors.success} fontSize="11" fontWeight="600">Room</text>
        </g>

        {/* Curve group */}
        <g id="curve-group">
          {/* Reference/baseline starting point */}
          <circle
            cx={leftMargin}
            cy={startY}
            r="5"
            fill={colors.error}
            opacity="0.6"
          />

          {/* Cooling curve */}
          <path
            d={pts.join(' ')}
            fill="none"
            stroke="url(#coolingGradient2)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current temperature point (interactive, r>=8) */}
          <circle
            cx={cx}
            cy={cy}
            r="10"
            fill={colors.accent}
            filter="url(#ptGlow)"
            opacity="0.9"
          />
          <circle cx={cx} cy={cy} r="5" fill="white" />

          {/* Current temp label */}
          <text x={cx + 14} y={Math.max(cy - 5, topMargin + 10)} fill={colors.accent} fontSize="12" fontWeight="700">
            {Math.round(tempCur)}°C
          </text>
        </g>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return renderWithScrollContainer(
      <div style={{
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

    return renderWithScrollContainer(
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
        <div style={{
          background: `${colors.accent}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.accent}44`,
        }}>
          <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
            🔮 Make Your Prediction — observe before you experiment!
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Hot coffee at 90°C is placed in a 22°C room.
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
          Look at the chart below. How do you think the temperature will change over time? The curve is hidden — make your prediction first!
        </p>

        {/* Static SVG graphic (no sliders, no start button) */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px' }}>
            The coffee starts at 90°C and the room is at 22°C.
          </p>
          <StaticCoolingCurve showCurve={false} />
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
            The red dot shows the starting point. What happens next?
          </p>
        </div>

        {/* Prediction options */}
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
    );
  }

  // PLAY PHASE - Interactive Coffee Cooling Simulator with sliders
  if (phase === 'play') {
    return renderWithScrollContainer(
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '24px',
      }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Coffee Cooling Lab
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
          Adjust the sliders to change the physics parameters and observe how the cooling curve changes in real-time.
        </p>

        {/* Why this matters */}
        <div style={{
          background: `${colors.accent}11`,
          border: `1px solid ${colors.accent}33`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
            🌍 Real-world relevance: Newton's Law of Cooling governs everything from forensic time-of-death calculations to how your electronics avoid overheating!
          </p>
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
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <InteractiveCoolingCurve />
              </div>
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
            }}>
              {/* Slider: Initial Temperature */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                    Init Temp: <span style={{ color: colors.error }}>{initialTempSlider}°C</span>
                  </label>
                </div>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={1}
                  value={initialTempSlider}
                  onChange={e => {
                    setInitialTempSlider(Number(e.target.value));
                    if (onGameEvent) onGameEvent({ eventType: 'slider_changed', gameType: 'newton-cooling', gameTitle: "Newton's Law of Cooling", details: { slider: 'initialTemp', value: Number(e.target.value) }, timestamp: Date.now() });
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                  }}
                  aria-label="Initial temperature slider"
                />
              </div>

              {/* Slider: Cooling Coefficient */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
                    k: <span style={{ color: colors.accent }}>{(kSlider / 100).toFixed(2)}</span>
                  </label>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={kSlider}
                  onChange={e => {
                    setKSlider(Number(e.target.value));
                    if (onGameEvent) onGameEvent({ eventType: 'slider_changed', gameType: 'newton-cooling', gameTitle: "Newton's Law of Cooling", details: { slider: 'k', value: Number(e.target.value) }, timestamp: Date.now() });
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    touchAction: 'pan-y',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    accentColor: '#3b82f6',
                    cursor: 'pointer',
                  }}
                  aria-label="Cooling coefficient slider"
                />
              </div>

              {/* Stats display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '8px',
                marginBottom: '16px',
              }}>
                <div style={{
                  background: colors.bgPrimary,
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.error, fontSize: '16px' }}>
                    {((currentTemp - roomTemp) * getEffectiveK()).toFixed(2)} °C/min
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Cooling Rate</div>
                </div>
                <div style={{
                  background: colors.bgPrimary,
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent, fontSize: '16px' }}>
                    {(currentTemp - roomTemp).toFixed(1)} °C
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Delta T</div>
                </div>
                <div style={{
                  background: colors.bgPrimary,
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success, fontSize: '16px' }}>
                    {Math.round(currentTemp)}°C
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Current Temp</div>
                </div>
              </div>

              {/* Simulate buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          Understand the Physics →
        </button>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return renderWithScrollContainer(
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          The Physics of Cooling
        </h2>

        <div style={{
            background: `${colors.accent}22`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              {prediction
                ? `You predicted option ${prediction.toUpperCase()} — ${prediction === 'b'
                    ? '✓ Correct! As you saw in the experiment, cooling is faster at first, then slows.'
                    : 'What you observed: cooling is exponential — faster at first, then slower as the temperature difference shrinks.'}`
                : 'As you observed in the experiment: cooling is exponential — faster at first, then slower as the temperature difference shrinks toward room temperature.'}
            </p>
          </div>

        {/* SVG diagram showing the physics */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <StaticCoolingCurve showCurve={true} />
        </div>

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
              <p style={{ fontFamily: 'monospace', fontSize: '20px', color: colors.accent, margin: 0 }}>
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
            The solution is: T(t) = T_room + (T_0 - T_room) × e^(-kt)
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
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Add a lid - trapping heat helps it cool faster' },
      { id: 'b', text: 'Stir it - increases heat loss through convection', correct: true },
      { id: 'c', text: 'Both would slow cooling - leave it alone' },
    ];

    return renderWithScrollContainer(
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
        <div style={{
          background: `${colors.warning}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.warning}44`,
        }}>
          <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
            🔄 New Variable: Physical interventions that change the k coefficient
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Your coffee is too hot. What should you do to cool it faster?
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
          This is a NEW question about controlling the cooling coefficient k — different from just waiting!
        </p>

        {/* Static SVG graphic showing cooling options (no sliders) */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            Two options for cooling your 90°C coffee — which changes k more?
          </p>
          {/* Static SVG comparing lid vs stirring cooling options */}
          <svg width="300" height="160" viewBox="0 0 300 160" style={{ background: colors.bgSecondary, borderRadius: '8px', width: '100%', maxWidth: '300px' }}>
            <defs>
              <linearGradient id="twistGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Left: Lid option */}
            <g id="lid-option">
              <rect x="20" y="20" width="100" height="100" rx="8" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
              <rect x="30" y="24" width="80" height="8" rx="3" fill="#9CA3AF" />
              <text x="70" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">Lid On</text>
              <ellipse cx="70" cy="90" rx="30" ry="20" fill="url(#twistGrad1)" opacity="0.7" />
              <text x="70" y="93" textAnchor="middle" fill="white" fontSize="11">90°C</text>
              <text x="70" y="140" textAnchor="middle" fill={colors.error} fontSize="11">k × 0.5?</text>
            </g>
            {/* Right: Stir option */}
            <g id="stir-option">
              <rect x="180" y="20" width="100" height="100" rx="8" fill={colors.bgCard} stroke={colors.border} strokeWidth="1" />
              <line x1="230" y1="30" x2="230" y2="110" stroke="#9CA3AF" strokeWidth="2" />
              <text x="230" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">Stirring</text>
              <ellipse cx="230" cy="90" rx="30" ry="20" fill="url(#twistGrad1)" opacity="0.7" />
              <text x="230" y="93" textAnchor="middle" fill="white" fontSize="11">90°C</text>
              <text x="230" y="140" textAnchor="middle" fill={colors.success} fontSize="11">k × 1.3?</text>
            </g>
            {/* Center question */}
            <text x="150" y="80" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">?</text>
          </svg>
          <p style={{ ...typo.small, color: colors.accent, marginTop: '16px' }}>
            How does each action change k in dT/dt = -k(T - T_ambient)?
          </p>
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
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderWithScrollContainer(
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Lid & Stirring Lab
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
          See how lid and stirring affect the cooling coefficient k
        </p>

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
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <InteractiveCoolingCurve />
              </div>
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
            }}>
              {/* Toggle controls */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <button
                  onClick={() => { setHasLid(!hasLid); playSound('click'); }}
                  style={{
                    padding: '16px 8px',
                    borderRadius: '12px',
                    border: hasLid ? `2px solid ${colors.accent}` : `2px solid ${colors.border}`,
                    background: hasLid ? `${colors.accent}22` : colors.bgSecondary,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{hasLid ? '🔒' : '☕'}</div>
                  <div style={{ color: hasLid ? colors.accent : colors.textSecondary, fontWeight: 600, fontSize: '13px' }}>
                    Lid: {hasLid ? 'ON' : 'OFF'}
                  </div>
                </button>
                <button
                  onClick={() => { setIsStirring(!isStirring); playSound('click'); }}
                  style={{
                    padding: '16px 8px',
                    borderRadius: '12px',
                    border: isStirring ? `2px solid ${colors.success}` : `2px solid ${colors.border}`,
                    background: isStirring ? `${colors.success}22` : colors.bgSecondary,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{isStirring ? '🔄' : '🥄'}</div>
                  <div style={{ color: isStirring ? colors.success : colors.textSecondary, fontWeight: 600, fontSize: '13px' }}>
                    Stir: {isStirring ? 'ON' : 'OFF'}
                  </div>
                </button>
              </div>

              {/* k value display */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center',
                marginBottom: '20px',
              }}>
                <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                  Effective k
                </div>
                <div style={{ ...typo.h3, color: colors.accent }}>
                  {getEffectiveK().toFixed(4)}
                </div>
              </div>

              {/* Simulate buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          </div>
        </div>

        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          style={{ ...primaryButtonStyle, width: '100%' }}
        >
          Understand the Effects
        </button>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return renderWithScrollContainer(
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          What Affects Cooling Rate
        </h2>

        {/* SVG diagram showing effect of lid vs stirring */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <svg width={320} height={160} viewBox="0 0 320 160"
            style={{ background: colors.bgSecondary, borderRadius: '8px', width: '100%', maxWidth: '320px' }}>
            <defs>
              <linearGradient id="kCompareGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            {/* Base k curve */}
            {(() => {
              const pts: string[] = [];
              for (let i = 0; i <= 40; i++) {
                const t = (i / 40) * 60;
                const temp = 22 + (90 - 22) * Math.exp(-0.05 * t);
                const x = 20 + (i / 40) * 240;
                const y = 10 + 120 - ((temp - 20) / 70) * 120;
                pts.push(i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`);
              }
              return (
                <>
                  <path d={pts.join(' ')} fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 2" />
                  <text x={270} y={125} fill="#9CA3AF" fontSize="11">Base k</text>
                </>
              );
            })()}
            {/* Stirring curve (k*1.3) */}
            {(() => {
              const pts: string[] = [];
              for (let i = 0; i <= 40; i++) {
                const t = (i / 40) * 60;
                const temp = 22 + (90 - 22) * Math.exp(-0.05 * 1.3 * t);
                const x = 20 + (i / 40) * 240;
                const y = 10 + 120 - ((temp - 20) / 70) * 120;
                pts.push(i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`);
              }
              return (
                <>
                  <path d={pts.join(' ')} fill="none" stroke="#10B981" strokeWidth="2.5" />
                  <text x={270} y={108} fill="#10B981" fontSize="11">Stirred</text>
                </>
              );
            })()}
            {/* Lid curve (k*0.5) */}
            {(() => {
              const pts: string[] = [];
              for (let i = 0; i <= 40; i++) {
                const t = (i / 40) * 60;
                const temp = 22 + (90 - 22) * Math.exp(-0.05 * 0.5 * t);
                const x = 20 + (i / 40) * 240;
                const y = 10 + 120 - ((temp - 20) / 70) * 120;
                pts.push(i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`);
              }
              return (
                <>
                  <path d={pts.join(' ')} fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="6 2" />
                  <text x={270} y={48} fill="#EF4444" fontSize="11">With Lid</text>
                </>
              );
            })()}
            <text x={160} y={155} textAnchor="middle" fill="#9CA3AF" fontSize="11">Time →</text>
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>🔒</span>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Lid (k × 0.5)</h3>
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A lid blocks evaporative cooling (which can be 30-50% of heat loss!) and reduces convective air currents. This <span style={{ color: colors.error }}>SLOWS cooling</span> — great for keeping coffee hot, bad if you want to drink it quickly.
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
              <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Stirring (k × 1.3)</h3>
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Stirring breaks up the thermal boundary layer at the surface, increasing convective heat transfer. This <span style={{ color: colors.success }}>SPEEDS cooling</span> — the answer to getting drinkable coffee faster!
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
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Newton Cooling"
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
    const allAppsViewed = viewedApps.every(v => v);
    const appsViewedCount = viewedApps.filter(v => v).length;

    return renderWithScrollContainer(
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Real-World Applications
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
          Newton's Law of Cooling appears in everyday life — explore each application!
        </p>

        {/* Progress indicator: App X of Y */}
        <div style={{
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          <span style={{ ...typo.small, color: colors.textMuted }}>
            App {selectedApp + 1} of {realWorldApps.length} — {appsViewedCount}/{realWorldApps.length} explored
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            {realWorldApps.map((_, i) => (
              <div key={i} style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: viewedApps[i] ? colors.success : colors.border,
                border: `2px solid ${i === selectedApp ? colors.accent : 'transparent'}`,
              }} />
            ))}
          </div>
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
                const newViewed = [...viewedApps];
                newViewed[i] = true;
                setViewedApps(newViewed);
                const newCompleted = [...completedApps];
                newCompleted[i] = true;
                setCompletedApps(newCompleted);
              }}
              style={{
                background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                border: `2px solid ${selectedApp === i ? a.color : viewedApps[i] ? colors.success : colors.border}`,
                borderRadius: '12px',
                padding: '16px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {viewedApps[i] && (
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

          <p style={{ ...typo.small, color: colors.textMuted, fontStyle: 'italic', marginBottom: '16px' }}>
            {app.futureImpact}
          </p>

          {/* "Got It" / continue button for this app */}
          <button
            onClick={() => {
              playSound('click');
              const newViewed = [...viewedApps];
              const nextIndex = (selectedApp + 1) % realWorldApps.length;
              newViewed[nextIndex] = false;
              // Mark current as viewed
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              if (selectedApp < realWorldApps.length - 1) {
                setSelectedApp(selectedApp + 1);
                const nv = [...viewedApps];
                nv[selectedApp + 1] = true;
                setViewedApps(nv);
              }
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${app.color}`,
              background: `${app.color}22`,
              color: app.color,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {selectedApp < realWorldApps.length - 1 ? `Got It → Next App (${selectedApp + 2}/${realWorldApps.length})` : 'Got It! ✓'}
          </button>
        </div>

        {allAppsViewed && (
          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return renderWithScrollContainer(
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>
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
              ? "You understand Newton's Law of Cooling!"
              : 'Review the concepts and try again.'}
          </p>

          {/* Answer review breakdown */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'left',
            overflowY: 'auto',
            maxHeight: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Answer Review
            </h3>
            {testQuestions.map((q, i) => {
              const correctOpt = q.options.find(o => o.correct);
              const userAns = testAnswers[i];
              const isCorrect = userAns === correctOpt?.id;
              return (
                <div key={i} style={{
                  marginBottom: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                  border: `1px solid ${isCorrect ? colors.success : colors.error}33`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>
                      Q{i + 1}: {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  {!isCorrect && (
                    <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                      Correct: {correctOpt?.label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0);
                setTestScore(0);
                goToPhase('hook');
              }}
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
            {passed && (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            )}
            <a
              href="/"
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Dashboard
            </a>
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return renderWithScrollContainer(
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
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
          {question.options.map(opt => {
            const selected = testAnswers[currentQuestion] === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: selected ? `${colors.accent}33` : colors.bgCard,
                  border: `2px solid ${selected ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: selected ? `2px solid ${colors.accent}` : 'none',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: selected ? colors.accent : colors.bgSecondary,
                  color: selected ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: selected ? colors.textPrimary : colors.textSecondary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
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
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderWithScrollContainer(
      <div style={{
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
          You now understand Newton's Law of Cooling — the fundamental principle behind forensics, food safety, HVAC design, and electronics thermal management.
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
              "Newton's Law applies from forensics to chip design",
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

      </div>
    );
  }

  return null;
};

export default NewtonCoolingRenderer;
