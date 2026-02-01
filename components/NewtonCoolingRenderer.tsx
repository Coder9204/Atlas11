'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// NEWTON'S LAW OF COOLING RENDERER - GAME 135
// Physics: dT/dt = -k(T - T_ambient) - Exponential decay to ambient temperature
// Hook: "Does cooling happen at a constant rate?"
// ============================================================================

// Real-world applications for Newton's Law of Cooling
const realWorldApps = [
  {
    icon: '🔍',
    title: 'Forensic Time of Death',
    short: 'Estimating when someone died',
    tagline: 'Body temperature tells the story',
    description: 'Forensic investigators use Newton\'s Law of Cooling to estimate time of death. By measuring body temperature and ambient conditions, they calculate how long since death based on the exponential cooling curve.',
    connection: 'The game demonstrated how cooling rate depends on temperature difference. Forensic pathologists use this directly - a body at 32°C in a 22°C room cools slower than one at 37°C because the temperature difference is smaller.',
    howItWorks: 'Normal body temp: 37°C. Death stops metabolic heating. Body cools following dT/dt = -k(T - T_ambient). Measure current temp and ambient. Calculate k from body mass and conditions. Solve for time since death.',
    stats: [
      { value: '1-2°C/hr', label: 'Typical cooling rate', icon: '📉' },
      { value: '±2hrs', label: 'Time estimation accuracy', icon: '⏱️' },
      { value: '100K+', label: 'Death investigations/year (US)', icon: '📊' }
    ],
    examples: ['Homicide investigation', 'Unattended deaths', 'Accident reconstruction', 'Insurance claims'],
    companies: ['FBI', 'Medical Examiner offices', 'Forensic pathology labs', 'Law enforcement'],
    futureImpact: 'AI-enhanced thermal modeling will account for clothing, posture, and environment for more accurate time-of-death estimation.',
    color: '#ef4444'
  },
  {
    icon: '🍳',
    title: 'Food Safety & HACCP',
    short: 'Keeping food in safe temperature zones',
    tagline: 'Bacteria don\'t wait for linear cooling',
    description: 'Food safety protocols use Newton\'s Law to calculate how long food can be at dangerous temperatures. The exponential nature means hot food stays in the bacterial growth zone (40-140°F) longer than intuition suggests.',
    connection: 'The simulation showed exponential cooling curves. Food safety professionals use these to design cooling protocols - rapid cooling from 135°F to 70°F within 2 hours is required precisely because of Newton\'s Law.',
    howItWorks: 'Hot food must cool through danger zone (40-140°F) quickly. Cooling rate depends on (T - T_ambient). Larger batches cool slower (smaller k). Ice baths increase k dramatically. Time in danger zone determines bacterial growth.',
    stats: [
      { value: '2hrs', label: 'Max time 135°F to 70°F', icon: '⏱️' },
      { value: '4hrs', label: 'Max time 70°F to 40°F', icon: '⏱️' },
      { value: '48M', label: 'Foodborne illness cases/year', icon: '⚠️' }
    ],
    examples: ['Restaurant kitchens', 'Hospital food service', 'Airline catering', 'Food manufacturing'],
    companies: ['FDA', 'Ecolab', 'NSF International', 'ServSafe'],
    futureImpact: 'Smart sensors will monitor cooling curves in real-time, automatically alerting when food safety protocols are at risk.',
    color: '#f59e0b'
  },
  {
    icon: '💻',
    title: 'Electronics Thermal Design',
    short: 'Cooling chips before they overheat',
    tagline: 'Every CPU follows Newton\'s Law',
    description: 'Every computer chip\'s thermal design uses Newton\'s Law of Cooling. Heat sinks, fans, and thermal interface materials all work to increase the cooling coefficient k, keeping silicon temperature below damage thresholds.',
    connection: 'The game explored how the cooling coefficient k affects temperature response. In electronics, heat sink design, fan speed, and thermal paste all modify k to achieve target junction temperatures.',
    howItWorks: 'CPU generates heat power P. Steady-state: P = k(T_junction - T_ambient). Larger k (better cooling) = lower T_junction. Transient response follows exponential. Thermal throttling kicks in if T exceeds limit.',
    stats: [
      { value: '100°C', label: 'Typical Tj max', icon: '🌡️' },
      { value: '250W', label: 'High-end CPU TDP', icon: '⚡' },
      { value: '$15B', label: 'Thermal management market', icon: '📈' }
    ],
    examples: ['CPU coolers', 'GPU thermal solutions', 'Data center cooling', 'Smartphone thermal design'],
    companies: ['Noctua', 'Cooler Master', 'Intel', 'NVIDIA'],
    futureImpact: 'Microfluidic cooling directly on die will enable 1000W processors by dramatically increasing effective k.',
    color: '#3b82f6'
  },
  {
    icon: '🏠',
    title: 'Building Energy Modeling',
    short: 'HVAC sizing from thermal physics',
    tagline: 'Newton\'s Law heats and cools your home',
    description: 'Building engineers use Newton\'s Law of Cooling to size HVAC systems. The rate of heat loss through walls depends on temperature difference - a principle that determines heating bills and comfort in every building.',
    connection: 'The simulation showed how temperature difference drives cooling rate. Buildings follow the same physics - heat flows out in winter proportional to (T_inside - T_outside). Insulation reduces k, lowering energy bills.',
    howItWorks: 'Heat loss rate: Q = U × A × ΔT (Newton\'s Law in disguise). U-value = thermal transmittance (like k). Better insulation = lower U. HVAC must replace lost heat to maintain comfort. Sizing based on design day ΔT.',
    stats: [
      { value: '40%', label: 'Building energy share', icon: '⚡' },
      { value: 'R-38', label: 'Recommended attic insulation', icon: '🏠' },
      { value: '$400B', label: 'Global HVAC market', icon: '📈' }
    ],
    examples: ['Passive house design', 'Energy Star buildings', 'District heating', 'Net-zero construction'],
    companies: ['Carrier', 'Trane', 'Daikin', 'Johnson Controls'],
    futureImpact: 'Digital twins will model building thermal behavior in real-time, optimizing HVAC for comfort and efficiency.',
    color: '#8b5cf6'
  }
];

// Test question interface with scenarios and explanations
interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

// Transfer application interface for real-world connections
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

// Props interface
interface NewtonCoolingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ============================================================================
// COMPREHENSIVE TEST QUESTIONS (10 questions with scenarios)
// ============================================================================
const testQuestions: TestQuestion[] = [
  {
    scenario: "A forensic investigator arrives at a crime scene and finds a body at 32°C. Room temperature is 22°C and normal body temperature is 37°C.",
    question: "Why is the cooling rate slower now than it was immediately after death?",
    options: [
      { text: "The body has lost most of its heat already", correct: false },
      { text: "The temperature difference from the room is smaller now", correct: true },
      { text: "Room temperature increased over time", correct: false },
      { text: "The body's mass decreased", correct: false }
    ],
    explanation: "Newton's Law of Cooling states cooling rate is proportional to temperature difference (dT/dt = -k(T - T_ambient)). At 32°C with room at 22°C, the difference is only 10°C. Right after death at 37°C, the difference was 15°C, causing faster cooling. This exponential decay is key to estimating time of death."
  },
  {
    scenario: "You pour coffee at 90°C. After 5 minutes it's 70°C. The room is at 20°C.",
    question: "What will the temperature approximately be after another 5 minutes?",
    options: [
      { text: "50°C (another 20° drop)", correct: false },
      { text: "About 56°C (exponential decay)", correct: true },
      { text: "40°C (faster cooling)", correct: false },
      { text: "60°C (linear cooling)", correct: false }
    ],
    explanation: "Cooling follows exponential decay, not linear. The initial ΔT was 70°C (90-20), dropping 20° in 5 min. Now ΔT is 50°C (70-20), so the drop rate is slower. Using Newton's Law: approximately 56°C after another 5 minutes. Each interval shows smaller absolute temperature changes."
  },
  {
    scenario: "A restaurant serves soup at 75°C. Health codes require it stay above 60°C for bacteria safety. Room temperature is 25°C.",
    question: "Why does a lid help keep soup safe longer?",
    options: [
      { text: "Lids reflect heat back into the soup", correct: false },
      { text: "Lids prevent bacterial contamination", correct: false },
      { text: "Lids reduce evaporative cooling and convective heat loss", correct: true },
      { text: "Lids insulate by trapping cold air", correct: false }
    ],
    explanation: "A lid reduces the heat transfer coefficient 'k' in Newton's Law by blocking evaporation (which carries away latent heat) and reducing convective air currents. This slows the exponential decay, keeping food in the safe temperature zone longer. Evaporation alone can account for 30-50% of heat loss!"
  },
  {
    scenario: "An engineer compares cooling a hot steel plate in still air versus with a fan blowing on it.",
    question: "How does the fan affect Newton's cooling equation dT/dt = -k(T - T_ambient)?",
    options: [
      { text: "It lowers T_ambient", correct: false },
      { text: "It increases the coefficient k (faster heat transfer)", correct: true },
      { text: "It changes T to cool faster initially only", correct: false },
      { text: "It has no effect - only temperature difference matters", correct: false }
    ],
    explanation: "The cooling coefficient 'k' depends on the heat transfer mechanism. Forced convection (fan) dramatically increases k compared to natural convection. The temperature difference (T - T_ambient) stays the same, but the rate constant k increases 5-10x, causing much faster cooling while maintaining exponential decay behavior."
  },
  {
    scenario: "A physicist notes that a cup of hot water and a cup of warm water both eventually reach room temperature (22°C).",
    question: "Which cup cools faster when both start their approach to room temperature?",
    options: [
      { text: "They cool at the same rate", correct: false },
      { text: "The hot cup cools faster because ΔT is larger", correct: true },
      { text: "The warm cup cools faster because it's closer to equilibrium", correct: false },
      { text: "It depends on the cup material only", correct: false }
    ],
    explanation: "Newton's Law shows cooling rate is directly proportional to temperature difference. The hot cup at 80°C has ΔT = 58°C, while warm cup at 40°C has ΔT = 18°C. The hot cup loses heat more than 3x faster initially! Both follow the same exponential curve but start at different points."
  },
  {
    scenario: "A building HVAC engineer notices a room at 30°C takes 2 hours to cool to 25°C when the AC produces 18°C air.",
    question: "If the AC is set colder to produce 15°C air instead, approximately how long to reach 25°C?",
    options: [
      { text: "Same time - only room temperature matters", correct: false },
      { text: "About 1.5 hours - larger ΔT means faster cooling", correct: true },
      { text: "2.5 hours - colder air is less efficient", correct: false },
      { text: "1 hour - proportional to temperature difference", correct: false }
    ],
    explanation: "With 18°C air, initial ΔT = 12°C. With 15°C air, initial ΔT = 15°C, which is 25% larger driving force. Newton's Law predicts cooling time roughly inversely proportional to this driving force, so about 1.5-1.6 hours. Real buildings have complex dynamics but this principle applies."
  },
  {
    scenario: "Hot coffee is served in a metal mug versus a ceramic mug, both uninsulated and at the same starting temperature.",
    question: "Why does coffee in the metal mug feel like it cools faster?",
    options: [
      { text: "Metal has higher heat capacity", correct: false },
      { text: "Metal conducts heat away faster, increasing effective k", correct: true },
      { text: "Metal reflects heat better", correct: false },
      { text: "It doesn't - they cool at the same rate", correct: false }
    ],
    explanation: "Metal's high thermal conductivity means heat transfers faster from coffee through the mug wall to the environment, effectively increasing the overall k value. Ceramic's lower conductivity acts as an insulator. The same Newton's Law applies, but the metal mug system has higher k, causing faster exponential decay."
  },
  {
    scenario: "A coroner uses the Glaister equation: Time (hours) ≈ (37 - body temp) / 1.5, which assumes constant cooling.",
    question: "Why is this simple formula only accurate for recently deceased bodies?",
    options: [
      { text: "Bodies cool linearly at first, then exponentially", correct: false },
      { text: "It assumes constant rate, but Newton's Law shows rate decreases as body approaches room temp", correct: true },
      { text: "Room temperature varies too much", correct: false },
      { text: "Body composition changes after death", correct: false }
    ],
    explanation: "The Glaister equation assumes linear cooling (~1.5°C/hour), but Newton's Law shows exponential decay. Early after death when body temp is high (large ΔT), cooling is relatively linear. As body approaches room temperature, the rate slows dramatically. Modern forensics uses exponential models for better accuracy."
  },
  {
    scenario: "An espresso machine engineer tests how quickly espresso cools from 70°C in a demitasse (30ml) versus a large latte in a mug (300ml).",
    question: "Why does the smaller espresso cool faster despite both starting at 70°C?",
    options: [
      { text: "Smaller volume means less thermal mass, faster cooling", correct: true },
      { text: "Espresso is hotter than latte initially", correct: false },
      { text: "The demitasse conducts heat better", correct: false },
      { text: "They cool at the same rate if both are 70°C", correct: false }
    ],
    explanation: "Newton's Law coefficient k depends on surface-to-volume ratio. The espresso's higher ratio (more surface per ml) means heat escapes faster per unit volume. Thermal mass (mass × specific heat) is also smaller, requiring less heat removal to change temperature. Both effects increase effective k."
  },
  {
    scenario: "A scientist monitors temperature of an object cooling from 100°C. At t=10 min it's 60°C, and the room is 20°C.",
    question: "What's the time constant of this cooling process?",
    options: [
      { text: "10 minutes", correct: false },
      { text: "About 14 minutes (using T = T_ambient + ΔT₀·e^(-t/τ))", correct: true },
      { text: "20 minutes", correct: false },
      { text: "Cannot be determined", correct: false }
    ],
    explanation: "Using T(t) = T_ambient + (T₀ - T_ambient)·e^(-t/τ): 60 = 20 + 80·e^(-10/τ). Solving: 40 = 80·e^(-10/τ), so e^(-10/τ) = 0.5. Taking ln: -10/τ = -0.693, thus τ ≈ 14.4 minutes. The time constant τ = 1/k is when 63% of cooling has occurred."
  }
];

// ============================================================================
// TRANSFER APPLICATIONS (4 real-world applications)
// ============================================================================
const transferApps: TransferApp[] = [
  {
    icon: "🔍",
    title: "Forensic Time of Death",
    short: "Forensics",
    tagline: "Solving crimes with thermodynamics",
    description: "Forensic investigators use body cooling rates to estimate time of death. By measuring body temperature and applying Newton's Law, they can work backward to determine when a victim died - crucial evidence in criminal investigations.",
    connection: "A body cools from 37°C toward room temperature following exponential decay. The rate depends on body size, clothing, ambient conditions, and position. Newton's Law provides the mathematical framework for these calculations.",
    howItWorks: "Measure body core temperature, record ambient temperature, and apply cooling models. More sophisticated methods account for the Henssge nomogram, which includes body weight and environmental factors for improved accuracy.",
    stats: [
      { value: "37°C", label: "Normal body temp" },
      { value: "~1.5°C/hr", label: "Initial cooling rate" },
      { value: "±2 hrs", label: "Estimation accuracy" },
      { value: "85%", label: "Cases using temp" }
    ],
    examples: [
      "Criminal investigations establishing timelines",
      "Mass casualty incident victim identification",
      "Medical examiner death certification",
      "Historical cold case re-examinations"
    ],
    companies: ["FBI Laboratory", "Medical Examiner Offices", "INTERPOL", "Forensic Science Services"],
    futureImpact: "AI-powered forensic models combining thermal imaging, environmental sensors, and machine learning will provide more accurate time-of-death estimates within minutes of crime scene arrival.",
    color: "#6366f1"
  },
  {
    icon: "🍽️",
    title: "Food Safety & HACCP",
    short: "Food Safety",
    tagline: "Keeping food in the safe zone",
    description: "Food safety regulations require keeping hot foods above 60°C and cold foods below 4°C. Newton's Law helps predict how long food stays safe during serving, transport, and storage - critical for preventing foodborne illness.",
    connection: "Hot food cooling toward room temperature passes through the 'danger zone' (4-60°C) where bacteria multiply rapidly. Understanding exponential cooling helps design holding equipment and set service time limits.",
    howItWorks: "HACCP plans use cooling curves to determine safe holding times. Commercial hot wells and steam tables slow the k coefficient, while blast chillers increase it. Monitoring temps ensures food stays safe.",
    stats: [
      { value: "60°C", label: "Hot holding minimum" },
      { value: "4°C", label: "Cold holding maximum" },
      { value: "2 hours", label: "Danger zone limit" },
      { value: "48M", label: "US foodborne illnesses/yr" }
    ],
    examples: [
      "Hospital food service temperature monitoring",
      "Airline catering cooling protocols",
      "Restaurant HACCP compliance systems",
      "Food truck temperature management"
    ],
    companies: ["Sysco", "Ecolab", "TempTraq", "ComplianceMate"],
    futureImpact: "IoT temperature sensors with predictive algorithms will automatically alert staff when food approaches unsafe temperatures, dramatically reducing foodborne illness outbreaks.",
    color: "#10b981"
  },
  {
    icon: "🏢",
    title: "Building Thermal Management",
    short: "HVAC Design",
    tagline: "Efficient heating and cooling systems",
    description: "HVAC engineers use Newton's cooling principles to size equipment, predict energy usage, and optimize comfort. Understanding how buildings lose heat to the environment enables efficient climate control design.",
    connection: "Buildings cool (or heat) toward outdoor temperature following Newton's Law. The building envelope's insulation, window area, and air infiltration all affect the k coefficient. Better insulation means lower k and slower heat loss.",
    howItWorks: "Engineers calculate building heat loss rate based on surface area, insulation R-values, and temperature difference. HVAC systems must supply heat faster than Newton's Law removes it in winter (or vice versa in summer).",
    stats: [
      { value: "40%", label: "Building energy for HVAC" },
      { value: "R-38", label: "Typical attic insulation" },
      { value: "25%", label: "Heat loss through windows" },
      { value: "$300B", label: "US HVAC market" }
    ],
    examples: [
      "Passive house design with minimal heating",
      "Data center thermal management",
      "Historic building energy retrofits",
      "Smart thermostat predictive heating"
    ],
    companies: ["Carrier", "Trane", "Honeywell", "Siemens Building Technologies"],
    futureImpact: "Predictive HVAC systems will learn building thermal dynamics and pre-condition spaces based on occupancy schedules, weather forecasts, and energy prices, reducing energy use by 30%.",
    color: "#3b82f6"
  },
  {
    icon: "💻",
    title: "Electronics Thermal Design",
    short: "Electronics Cooling",
    tagline: "Keeping chips from overheating",
    description: "Electronic components must dissipate heat to prevent failure. Newton's Law governs passive cooling, while active cooling (fans, liquid) increases k. Thermal design determines device reliability and performance.",
    connection: "A CPU generating 100W reaches equilibrium when heat dissipation rate equals generation rate. Newton's Law sets the temperature rise: ΔT = P/(k·A). Better heatsinks increase effective k, lowering operating temperature.",
    howItWorks: "Heatsinks increase surface area (A) and use materials with high thermal conductivity. Fans increase k through forced convection. The goal: keep junction temperature below maximum rating (typically 100-105°C).",
    stats: [
      { value: "100W+", label: "Modern CPU power" },
      { value: "105°C", label: "Max junction temp" },
      { value: "10-50x", label: "Fan vs passive k ratio" },
      { value: "15nm", label: "Transistor size" }
    ],
    examples: [
      "Gaming laptop thermal throttling prevention",
      "Server farm hot aisle containment",
      "Smartphone passive cooling design",
      "Electric vehicle battery thermal management"
    ],
    companies: ["Noctua", "Cooler Master", "Thermal Grizzly", "NVIDIA"],
    futureImpact: "Advanced phase-change cooling and microfluidic channels will enable 500W+ processors while maintaining safe temperatures, enabling next-generation AI computing.",
    color: "#f59e0b"
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const NewtonCoolingRenderer: React.FC<NewtonCoolingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationRef = useRef<number>(0);

  // Audio context for sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<number>(0);
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  // Simulation state
  const [initialTemp, setInitialTemp] = useState(90); // Initial coffee temperature
  const [roomTemp, setRoomTemp] = useState(22); // Ambient temperature
  const [kCoefficient, setKCoefficient] = useState(0.05); // Heat transfer coefficient
  const [currentTemp, setCurrentTemp] = useState(90);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasLid, setHasLid] = useState(false);
  const [isStirring, setIsStirring] = useState(false);
  const [tempHistory, setTempHistory] = useState<{time: number; temp: number}[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Initialize responsive detection
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

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sound effect helper
  const playSound = useCallback((type: 'steam' | 'pour' | 'success' | 'click') => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'steam':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'pour':
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'success':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
        break;
    }

      }, []);

  // Debounced navigation helper
  const handleNavigation = useCallback(() => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    lastNavigationRef.current = now;
    navigationTimeoutRef.current = setTimeout(() => {
      playSound('click');
      onPhaseComplete?.();
    }, 50);
  }, [onPhaseComplete, playSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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

    const simulate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      const dt = (timestamp - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = timestamp;

      // Increase time (1 second real = 1 minute simulation)
      setElapsedTime(prev => {
        const newTime = prev + dt * 60;
        return newTime;
      });

      // Newton's Law: T(t) = T_ambient + (T_0 - T_ambient) * e^(-kt)
      setCurrentTemp(prev => {
        const effectiveK = getEffectiveK();
        const newTemp = roomTemp + (prev - roomTemp) * Math.exp(-effectiveK * dt * 60);

        // Record history
        setTempHistory(h => {
          const newHistory = [...h, { time: elapsedTime + dt * 60, temp: newTemp }];
          // Keep last 100 points
          if (newHistory.length > 100) newHistory.shift();
          return newHistory;
        });

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
  }, [isSimulating, roomTemp, getEffectiveK, elapsedTime]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setCurrentTemp(initialTemp);
    setElapsedTime(0);
    setIsSimulating(false);
    setTempHistory([{ time: 0, temp: initialTemp }]);
    lastUpdateRef.current = 0;
  }, [initialTemp]);

  // Handle test answer
  const handleTestAnswer = useCallback((optionIndex: number) => {
    if (testAnswers[testIndex] !== null) return;

    const newAnswers = [...testAnswers];
    newAnswers[testIndex] = optionIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[testIndex].options[optionIndex].correct;
    if (isCorrect) {
      setTestScore(prev => prev + 1);
      playSound('success');
    } else {
      playSound('click');
    }

    setShowExplanation(true);
  }, [testIndex, testAnswers, testScore, playSound]);

  // Check if coffee is drinkable (between 50-70°C is ideal)
  const isDrinkable = currentTemp >= 50 && currentTemp <= 70;

  // ============================================================================
  // RENDER HELPER FUNCTIONS
  // ============================================================================

  // Render coffee cup with steam visualization
  const renderCoffeeCup = (): React.ReactNode => {
    const tempNormalized = (currentTemp - roomTemp) / (initialTemp - roomTemp);
    const steamIntensity = Math.max(0, (currentTemp - 60) / 40); // More steam when hotter

    return (
      <svg viewBox="0 0 300 280" style={{ width: '100%', height: '220px' }}>
        <defs>
          <linearGradient id="coffeeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B4513" />
            <stop offset="100%" stopColor="#3D1F0D" />
          </linearGradient>
          <linearGradient id="cupGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e0e0" />
          </linearGradient>
          <filter id="steamBlur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="300" height="280" fill="#1e293b" rx="12" />

        {/* Table surface */}
        <rect x="20" y="220" width="260" height="40" fill="#4a5568" rx="4" />

        {/* Cup saucer */}
        <ellipse cx="150" cy="225" rx="70" ry="12" fill="#e2e8f0" />
        <ellipse cx="150" cy="222" rx="65" ry="10" fill="#f1f5f9" />

        {/* Cup body */}
        <path
          d="M85 120 L90 215 Q150 225 210 215 L215 120 Z"
          fill="url(#cupGradient)"
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Cup handle */}
        <path
          d="M215 140 Q260 140 260 170 Q260 200 215 200"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M215 140 Q250 140 250 170 Q250 195 215 195"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Coffee surface */}
        <ellipse
          cx="150"
          cy="125"
          rx="60"
          ry="15"
          fill="url(#coffeeGradient)"
        />

        {/* Lid if enabled */}
        {hasLid && (
          <g>
            <ellipse cx="150" cy="115" rx="65" ry="12" fill="#64748b" />
            <ellipse cx="150" cy="112" rx="60" ry="10" fill="#94a3b8" />
            <rect x="145" y="95" width="10" height="20" fill="#475569" rx="3" />
          </g>
        )}

        {/* Steam wisps */}
        {!hasLid && steamIntensity > 0.1 && [...Array(5)].map((_, i) => (
          <path
            key={i}
            d={`M${110 + i * 20},${100 - i * 5} Q${115 + i * 20},${70 - i * 5} ${105 + i * 20},${40 - i * 5}`}
            fill="none"
            stroke="white"
            strokeWidth={2}
            opacity={steamIntensity * (0.3 + (i % 2) * 0.2)}
            filter="url(#steamBlur)"
          >
            <animate
              attributeName="d"
              values={
                `M${110 + i * 20},${100 - i * 5} Q${115 + i * 20},${70 - i * 5} ${105 + i * 20},${40 - i * 5};` +
                `M${110 + i * 20},${100 - i * 5} Q${105 + i * 20},${65 - i * 5} ${115 + i * 20},${35 - i * 5};` +
                `M${110 + i * 20},${100 - i * 5} Q${115 + i * 20},${70 - i * 5} ${105 + i * 20},${40 - i * 5}`
              }
              dur={`${2 + i * 0.3}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={`${steamIntensity * 0.4};${steamIntensity * 0.15};${steamIntensity * 0.4}`}
              dur={`${2 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}

        {/* Stirring indicator */}
        {isStirring && (
          <g>
            <ellipse cx="150" cy="125" rx="30" ry="8" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.6">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 150 125"
                to="360 150 125"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </ellipse>
            <line x1="150" y1="90" x2="150" y2="180" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" />
          </g>
        )}

        {/* Temperature display */}
        <rect x="20" y="20" width="100" height="50" fill="rgba(0,0,0,0.5)" rx="8" />
        <text x="70" y="45" textAnchor="middle" fill={currentTemp > 70 ? '#ef4444' : currentTemp > 50 ? '#22c55e' : '#3b82f6'} fontSize="18" fontWeight="bold">
          {currentTemp.toFixed(1)}°C
        </text>
        <text x="70" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10">
          {currentTemp > 70 ? 'Too Hot' : currentTemp > 50 ? 'Perfect!' : 'Too Cold'}
        </text>

        {/* Time display */}
        <rect x="180" y="20" width="100" height="50" fill="rgba(0,0,0,0.5)" rx="8" />
        <text x="230" y="45" textAnchor="middle" fill="#f59e0b" fontSize="18" fontWeight="bold">
          {elapsedTime.toFixed(0)} min
        </text>
        <text x="230" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10">
          Elapsed Time
        </text>
      </svg>
    );
  };

  // Render temperature vs time graph
  const renderCoolingCurve = (): React.ReactNode => {
    const graphWidth = 280;
    const graphHeight = 120;
    const padding = 30;

    // Generate theoretical curve points
    const theoreticalPoints: string[] = [];
    for (let t = 0; t <= 60; t += 1) {
      const T = roomTemp + (initialTemp - roomTemp) * Math.exp(-getEffectiveK() * t);
      const x = padding + (t / 60) * (graphWidth - 2 * padding);
      const y = graphHeight - padding - ((T - roomTemp) / (initialTemp - roomTemp)) * (graphHeight - 2 * padding);
      theoreticalPoints.push(`${t === 0 ? 'M' : 'L'}${x},${y}`);
    }

    // Actual measured points from simulation
    const actualPath = tempHistory.map((point, i) => {
      const x = padding + (point.time / 60) * (graphWidth - 2 * padding);
      const y = graphHeight - padding - ((point.temp - roomTemp) / (initialTemp - roomTemp)) * (graphHeight - 2 * padding);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} style={{ width: '100%', height: '140px' }}>
        {/* Background */}
        <rect x="0" y="0" width={graphWidth} height={graphHeight} fill="#1e293b" rx="8" />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + frac * (graphHeight - 2 * padding)}
            x2={graphWidth - padding}
            y2={padding + frac * (graphHeight - 2 * padding)}
            stroke="#374151"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Drinkable zone */}
        <rect
          x={padding}
          y={graphHeight - padding - ((70 - roomTemp) / (initialTemp - roomTemp)) * (graphHeight - 2 * padding)}
          width={graphWidth - 2 * padding}
          height={((70 - 50) / (initialTemp - roomTemp)) * (graphHeight - 2 * padding)}
          fill="#22c55e"
          opacity="0.15"
        />

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={graphHeight - padding} stroke="#64748b" strokeWidth="2" />
        <line x1={padding} y1={graphHeight - padding} x2={graphWidth - padding} y2={graphHeight - padding} stroke="#64748b" strokeWidth="2" />

        {/* Theoretical curve (dashed) */}
        <path
          d={theoreticalPoints.join(' ')}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity="0.5"
        />

        {/* Actual measured curve */}
        {tempHistory.length > 1 && (
          <path
            d={actualPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
        )}

        {/* Current point */}
        {tempHistory.length > 0 && (
          <circle
            cx={padding + (elapsedTime / 60) * (graphWidth - 2 * padding)}
            cy={graphHeight - padding - ((currentTemp - roomTemp) / (initialTemp - roomTemp)) * (graphHeight - 2 * padding)}
            r="5"
            fill="#ef4444"
            stroke="white"
            strokeWidth="2"
          />
        )}

        {/* Labels */}
        <text x={padding - 5} y={padding + 5} textAnchor="end" fill="#94a3b8" fontSize="8">{initialTemp}°C</text>
        <text x={padding - 5} y={graphHeight - padding + 3} textAnchor="end" fill="#94a3b8" fontSize="8">{roomTemp}°C</text>
        <text x={graphWidth / 2} y={graphHeight - 5} textAnchor="middle" fill="#94a3b8" fontSize="9">Time (minutes)</text>
        <text x={padding + 5} y={graphHeight - padding - ((65 - roomTemp) / (initialTemp - roomTemp)) * (graphHeight - 2 * padding)} fill="#22c55e" fontSize="8">Drinkable</text>
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // Hook phase - engaging opening
  const renderHook = (): React.ReactNode => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '24px', textAlign: 'center' }}>
      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '9999px', marginBottom: '24px' }}>
        <span style={{ width: '8px', height: '8px', backgroundColor: '#fbbf24', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#fbbf24', letterSpacing: '0.05em' }}>THERMODYNAMICS</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: 'bold', marginBottom: '12px', background: 'linear-gradient(to right, #fbbf24, #f59e0b, #ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        The Impatient Coffee Drinker
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '32px' }}>
        Does cooling happen at a constant rate?
      </p>

      {/* Coffee animation */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '16px', padding: '24px', maxWidth: '400px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <svg viewBox="0 0 200 150" style={{ width: '100%', height: '150px' }}>
          {/* Cup */}
          <path d="M50 50 L55 120 Q100 130 145 120 L150 50 Z" fill="#f5f5f5" stroke="#d1d5db" strokeWidth="2" />
          <ellipse cx="100" cy="55" rx="50" ry="12" fill="#8B4513" />

          {/* Steam */}
          {[0, 1, 2].map(i => (
            <path
              key={i}
              d={`M${80 + i * 20},40 Q${85 + i * 20},20 ${75 + i * 20},0`}
              fill="none"
              stroke="white"
              strokeWidth="2"
              opacity="0.5"
            >
              <animate
                attributeName="d"
                values={`M${80 + i * 20},40 Q${85 + i * 20},20 ${75 + i * 20},0;M${80 + i * 20},40 Q${75 + i * 20},15 ${85 + i * 20},-5;M${80 + i * 20},40 Q${85 + i * 20},20 ${75 + i * 20},0`}
                dur={`${2 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </path>
          ))}

          {/* Clock */}
          <circle cx="170" cy="30" r="20" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
          <line x1="170" y1="30" x2="170" y2="18" stroke="#f59e0b" strokeWidth="2" />
          <line x1="170" y1="30" x2="178" y2="35" stroke="#f59e0b" strokeWidth="2">
            <animateTransform attributeName="transform" type="rotate" from="0 170 30" to="360 170 30" dur="10s" repeatCount="indefinite" />
          </line>
        </svg>

        <p style={{ color: '#e2e8f0', marginTop: '16px', lineHeight: '1.6' }}>
          Your fresh coffee is <span style={{ color: '#ef4444', fontWeight: 'bold' }}>90°C</span> - way too hot!
          <br />
          When will it reach the perfect <span style={{ color: '#22c55e', fontWeight: 'bold' }}>60°C</span>?
        </p>
      </div>

      {/* CTA */}
      <button
        onMouseDown={() => handleNavigation()}
        style={{ padding: '16px 32px', background: 'linear-gradient(to right, #f59e0b, #ea580c)', color: 'white', fontSize: '18px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)' }}
      >
        Predict the Cooling Rate
      </button>
      <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Newton's Law of Cooling</p>
    </div>
  );

  // Predict phase
  const renderPredict = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Make Your Prediction</h2>
        <p style={{ color: '#94a3b8' }}>
          Coffee starts at 90°C, room is 22°C. How will it cool?
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '20px' }}>
        <svg viewBox="0 0 200 80" style={{ width: '100%', height: '80px' }}>
          {/* Three possible curves */}
          <line x1="20" y1="70" x2="180" y2="70" stroke="#475569" strokeWidth="1" />
          <line x1="20" y1="10" x2="20" y2="70" stroke="#475569" strokeWidth="1" />

          {/* Linear (wrong) */}
          <path d="M20,15 L180,65" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />

          {/* Exponential (correct) */}
          <path d="M20,15 Q60,45 100,55 T180,68" fill="none" stroke="#22c55e" strokeWidth="2" />

          {/* Labels */}
          <text x="100" y="78" textAnchor="middle" fill="#64748b" fontSize="8">Time</text>
          <text x="8" y="45" textAnchor="middle" fill="#64748b" fontSize="8" transform="rotate(-90 8 45)">Temp</text>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'A', text: 'Constant rate - same degrees per minute', desc: 'Linear cooling curve' },
          { id: 'B', text: 'Faster at first, then slower', desc: 'Exponential decay curve' },
          { id: 'C', text: 'Slower at first, then faster', desc: 'Accelerating cooling' },
          { id: 'D', text: 'Same rate until suddenly reaching room temp', desc: 'Step function' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setPrediction(option.id);
              playSound('click');
                          }}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id ? '2px solid #f59e0b' : '2px solid #374151',
              backgroundColor: prediction === option.id ? 'rgba(251, 191, 36, 0.1)' : 'rgba(30, 41, 59, 0.5)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                backgroundColor: prediction === option.id ? '#f59e0b' : '#374151',
                color: prediction === option.id ? '#1e293b' : '#94a3b8'
              }}>
                {option.id}
              </span>
              <div>
                <p style={{ fontWeight: '500', color: '#e2e8f0' }}>{option.text}</p>
                <p style={{ fontSize: '14px', color: '#64748b' }}>{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onMouseDown={() => handleNavigation()}
          style={{ width: '100%', marginTop: '20px', padding: '16px', background: 'linear-gradient(to right, #22c55e, #10b981)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Test Your Prediction
        </button>
      )}
    </div>
  );

  // Play phase - interactive simulation
  const renderPlay = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Coffee Cooling Lab</h2>
        <p style={{ color: '#94a3b8' }}>Watch the exponential cooling in real-time</p>
      </div>

      {/* Coffee visualization */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        {renderCoffeeCup()}
      </div>

      {/* Cooling curve */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Temperature vs Time</h3>
        {renderCoolingCurve()}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Cooling Rate</p>
          <p style={{ fontWeight: 'bold', color: '#ef4444' }}>{((currentTemp - roomTemp) * getEffectiveK()).toFixed(2)}°C/min</p>
        </div>
        <div style={{ backgroundColor: isDrinkable ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Status</p>
          <p style={{ fontWeight: 'bold', color: isDrinkable ? '#22c55e' : '#3b82f6' }}>{isDrinkable ? 'Drinkable!' : currentTemp > 70 ? 'Too Hot' : 'Too Cold'}</p>
        </div>
        <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Room Temp</p>
          <p style={{ fontWeight: 'bold', color: '#8b5cf6' }}>{roomTemp}°C</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onMouseDown={() => {
            if (!isSimulating) {
              resetSimulation();
              setIsSimulating(true);
              playSound('pour');
                          } else {
              setIsSimulating(false);
            }
          }}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: isSimulating ? '#f59e0b' : '#22c55e',
            color: 'white'
          }}
        >
          {isSimulating ? 'Pause' : 'Start Cooling'}
        </button>
        <button
          onMouseDown={() => {
            resetSimulation();
            playSound('click');
          }}
          style={{ padding: '12px 20px', backgroundColor: '#374151', color: '#e2e8f0', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '500' }}
        >
          Reset
        </button>
      </div>

      {/* Physics insight */}
      <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
        <h4 style={{ fontWeight: '600', color: '#fbbf24', marginBottom: '8px' }}>Newton's Law of Cooling:</h4>
        <p style={{ fontFamily: 'monospace', fontSize: '16px', color: '#e2e8f0', textAlign: 'center', marginBottom: '8px' }}>
          dT/dt = -k(T - T<sub>room</sub>)
        </p>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          Cooling rate is proportional to temperature difference. Hotter = faster cooling!
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        Review the Concepts
      </button>
    </div>
  );

  // Review phase
  const renderReview = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Understanding Exponential Cooling</h2>
        <p style={{ color: '#94a3b8' }}>
          {prediction === 'B'
            ? "You predicted correctly! Cooling is faster when hotter."
            : "The answer was B - cooling follows exponential decay!"}
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '12px' }}>The Physics</h3>
        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0', textAlign: 'center' }}>
            T(t) = T<sub>room</sub> + (T<sub>0</sub> - T<sub>room</sub>)e<sup>-kt</sup>
          </p>
        </div>
        <ul style={{ color: '#94a3b8', fontSize: '14px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '4px' }}><strong style={{ color: '#e2e8f0' }}>T(t)</strong> = temperature at time t</li>
          <li style={{ marginBottom: '4px' }}><strong style={{ color: '#e2e8f0' }}>T<sub>room</sub></strong> = ambient temperature (asymptote)</li>
          <li style={{ marginBottom: '4px' }}><strong style={{ color: '#e2e8f0' }}>T<sub>0</sub></strong> = initial temperature</li>
          <li><strong style={{ color: '#e2e8f0' }}>k</strong> = cooling coefficient (depends on surface area, insulation, etc.)</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <h4 style={{ fontWeight: '600', color: '#22c55e', marginBottom: '8px' }}>Why Exponential?</h4>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Heat transfer is driven by temperature difference. As the object cools, the driving force decreases, so cooling slows down - a self-limiting process.
          </p>
        </div>
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h4 style={{ fontWeight: '600', color: '#3b82f6', marginBottom: '8px' }}>Time Constant</h4>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            τ = 1/k is the time for temperature difference to drop to 37% (1/e) of initial value. After 5τ, object is within 1% of room temperature.
          </p>
        </div>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #ec4899)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Twist predict phase
  const renderTwistPredict = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>The Lid & Stir Paradox</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
          Your coffee is too hot. You want it drinkable ASAP.
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '20px' }}>
        <p style={{ fontSize: '18px', textAlign: 'center', fontWeight: '500', color: '#e2e8f0' }}>
          Should you put a lid on or stir it?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'A', text: 'Add a lid - traps heat to cool faster', desc: 'Insulation speeds cooling?' },
          { id: 'B', text: 'Stir it - increases heat loss through convection', desc: 'Movement helps cooling' },
          { id: 'C', text: 'Leave it alone - both would slow cooling', desc: 'Let nature work' },
          { id: 'D', text: 'Add lid AND stir - combined effect is best', desc: 'Maximum intervention' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setTwistPrediction(option.id);
              playSound('click');
                          }}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: twistPrediction === option.id ? '2px solid #ec4899' : '2px solid #374151',
              backgroundColor: twistPrediction === option.id ? 'rgba(236, 72, 153, 0.1)' : 'rgba(30, 41, 59, 0.5)',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                backgroundColor: twistPrediction === option.id ? '#ec4899' : '#374151',
                color: twistPrediction === option.id ? 'white' : '#94a3b8'
              }}>
                {option.id}
              </span>
              <div>
                <p style={{ fontWeight: '500', color: '#e2e8f0' }}>{option.text}</p>
                <p style={{ fontSize: '14px', color: '#64748b' }}>{option.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onMouseDown={() => handleNavigation()}
          style={{ width: '100%', marginTop: '20px', padding: '16px', background: 'linear-gradient(to right, #ec4899, #8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Test the Twist
        </button>
      )}
    </div>
  );

  // Twist play phase
  const renderTwistPlay = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Lid & Stir Lab</h2>
        <p style={{ color: '#94a3b8' }}>See how lid and stirring affect the cooling coefficient k</p>
      </div>

      {/* Coffee visualization */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        {renderCoffeeCup()}
      </div>

      {/* Toggle controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <button
          onMouseDown={() => {
            setHasLid(!hasLid);
            playSound('click');
                      }}
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: hasLid ? '2px solid #f59e0b' : '2px solid #374151',
            backgroundColor: hasLid ? 'rgba(251, 191, 36, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '24px', marginBottom: '4px' }}>{hasLid ? '🔒' : '☕'}</p>
          <p style={{ fontWeight: '600', color: hasLid ? '#fbbf24' : '#94a3b8' }}>Lid: {hasLid ? 'ON' : 'OFF'}</p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>k × 0.5</p>
        </button>
        <button
          onMouseDown={() => {
            setIsStirring(!isStirring);
            playSound('click');
                      }}
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: isStirring ? '2px solid #22c55e' : '2px solid #374151',
            backgroundColor: isStirring ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '24px', marginBottom: '4px' }}>{isStirring ? '🔄' : '🥄'}</p>
          <p style={{ fontWeight: '600', color: isStirring ? '#22c55e' : '#94a3b8' }}>Stir: {isStirring ? 'ON' : 'OFF'}</p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>k × 1.3</p>
        </button>
      </div>

      {/* k value display */}
      <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>Effective Cooling Coefficient</p>
        <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#a78bfa' }}>k = {getEffectiveK().toFixed(3)}</p>
        <p style={{ fontSize: '12px', color: '#64748b' }}>Base k = {kCoefficient.toFixed(2)} × lid factor × stir factor</p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onMouseDown={() => {
            if (!isSimulating) {
              resetSimulation();
              setIsSimulating(true);
              playSound('pour');
            } else {
              setIsSimulating(false);
            }
          }}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: isSimulating ? '#f59e0b' : '#22c55e',
            color: 'white'
          }}
        >
          {isSimulating ? 'Pause' : 'Start Cooling'}
        </button>
        <button
          onMouseDown={() => {
            resetSimulation();
            playSound('click');
          }}
          style={{ padding: '12px 20px', backgroundColor: '#374151', color: '#e2e8f0', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #ec4899)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        Understand the Effects
      </button>
    </div>
  );

  // Twist review phase
  const renderTwistReview = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>The Cooling Factors Revealed</h2>
        <p style={{ color: '#94a3b8' }}>
          {twistPrediction === 'B'
            ? "Correct! Stirring increases cooling by boosting convection."
            : "The answer was B - stirring helps by increasing convective heat transfer!"}
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '600', color: '#ec4899', marginBottom: '12px' }}>What Affects k?</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>1</span>
            <p style={{ color: '#e2e8f0' }}><strong>Lid:</strong> Blocks evaporative cooling (30-50% of heat loss!) and reduces convection. SLOWS cooling.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#22c55e', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>2</span>
            <p style={{ color: '#e2e8f0' }}><strong>Stirring:</strong> Breaks up thermal boundary layer, increases convection. SPEEDS cooling.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>3</span>
            <p style={{ color: '#e2e8f0' }}><strong>Surface area:</strong> Wider mugs cool faster. Spreading coffee on a plate cools it quickest!</p>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.2)', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: '600', color: '#22c55e', marginBottom: '8px' }}>Pro Tip for Hot Coffee</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Want drinkable coffee fast? Stir it without a lid, or pour a small amount into a saucer.
          Want to keep it hot? Add a lid and don't stir. The math of Newton's Law explains both strategies!
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #6366f1, #8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        See Real-World Applications
      </button>
    </div>
  );

  // Transfer phase
  const renderTransfer = (): React.ReactNode => {
    const app = transferApps[selectedApp];

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Newton's Law in Action</h2>
          <p style={{ color: '#94a3b8' }}>From forensics to food safety</p>
        </div>

        {/* App selector */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
          {transferApps.map((a, i) => (
            <button
              key={i}
              onMouseDown={() => {
                setSelectedApp(i);
                playSound('click');
                              }}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                borderRadius: '9999px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedApp === i ? a.color : '#374151',
                color: selectedApp === i ? 'white' : '#94a3b8',
                transition: 'all 0.2s'
              }}
            >
              {a.icon} {a.short}
            </button>
          ))}
        </div>

        {/* Selected app details */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #374151', overflow: 'hidden' }}>
          <div style={{ padding: '16px', backgroundColor: app.color }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '36px' }}>{app.icon}</span>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{app.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{app.tagline}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            <p style={{ color: '#94a3b8', marginBottom: '12px', lineHeight: '1.6' }}>{app.description}</p>

            <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <h4 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>Newton's Law Connection</h4>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>{app.connection}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '16px', color: app.color }}>{stat.value}</p>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>Examples:</h4>
              <ul style={{ color: '#94a3b8', fontSize: '14px', paddingLeft: '20px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button
          onMouseDown={() => handleNavigation()}
          style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'linear-gradient(to right, #22c55e, #10b981)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
        >
          Test Your Knowledge
        </button>
      </div>
    );
  };

  // Test phase
  const renderTest = (): React.ReactNode => {
    const question = testQuestions[testIndex];
    const answered = testAnswers[testIndex] !== null;

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e2e8f0' }}>Knowledge Check</h2>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            Question {testIndex + 1} of {testQuestions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '8px', backgroundColor: '#374151', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(to right, #f59e0b, #ea580c)',
              transition: 'width 0.3s',
              width: `${((testIndex + (answered ? 1 : 0)) / testQuestions.length) * 100}%`
            }}
          />
        </div>

        {/* Scenario */}
        <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.2)', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '500', marginBottom: '4px' }}>Scenario:</p>
          <p style={{ color: '#e2e8f0', lineHeight: '1.5' }}>{question.scenario}</p>
        </div>

        {/* Question */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #374151', marginBottom: '16px' }}>
          <p style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '16px' }}>{question.question}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options.map((option, i) => {
              const isSelected = testAnswers[testIndex] === i;
              const isCorrect = option.correct;
              const showResult = answered;

              let bgColor = 'rgba(30, 41, 59, 0.5)';
              let borderColor = '#374151';

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'rgba(34, 197, 94, 0.2)';
                  borderColor = '#22c55e';
                } else if (isSelected) {
                  bgColor = 'rgba(239, 68, 68, 0.2)';
                  borderColor = '#ef4444';
                }
              } else if (isSelected) {
                bgColor = 'rgba(251, 191, 36, 0.2)';
                borderColor = '#fbbf24';
              }

              return (
                <button
                  key={i}
                  onMouseDown={() => !answered && handleTestAnswer(i)}
                  disabled={answered}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${borderColor}`,
                    backgroundColor: bgColor,
                    textAlign: 'left',
                    cursor: answered ? 'default' : 'pointer',
                    opacity: answered && !isCorrect && !isSelected ? 0.5 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: showResult && isCorrect ? '#22c55e' : showResult && isSelected ? '#ef4444' : '#374151',
                      color: showResult && (isCorrect || isSelected) ? 'white' : '#94a3b8'
                    }}>
                      {showResult && isCorrect ? '✓' : showResult && isSelected ? '✗' : String.fromCharCode(65 + i)}
                    </span>
                    <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{option.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '16px' }}>
            <h4 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '8px' }}>Explanation</h4>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6' }}>{question.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        {answered && (
          <button
            onMouseDown={() => {
              if (testIndex < testQuestions.length - 1) {
                setTestIndex(prev => prev + 1);
                setShowExplanation(false);
                playSound('click');
              } else {
                                handleNavigation();
              }
            }}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #f59e0b, #ea580c)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            {testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}

        {/* Score indicator */}
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '14px', color: '#64748b' }}>
          Current Score: {testScore} / {testIndex + (answered ? 1 : 0)}
        </div>
      </div>
    );
  };

  // Call onCorrectAnswer when mastery is achieved
  useEffect(() => {
    if (phase === 'mastery') {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      if (percentage >= 70 && onCorrectAnswer) {
        onCorrectAnswer();
      }
    }
  }, [phase, testScore, onCorrectAnswer]);

  // Mastery phase
  const renderMastery = (): React.ReactNode => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            {passed ? '☕' : '📚'}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '12px' }}>
            {passed ? "Newton's Law Mastered!" : 'Keep Learning!'}
          </h2>
          <div style={{ display: 'inline-block', background: 'linear-gradient(to right, #f59e0b, #ea580c)', color: 'white', fontSize: '28px', fontWeight: 'bold', padding: '12px 24px', borderRadius: '12px' }}>
            {testScore} / {testQuestions.length} ({percentage}%)
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(251, 191, 36, 0.2)', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: '600', color: '#fbbf24', marginBottom: '12px' }}>Key Concepts Mastered</h3>
          <ul style={{ color: '#94a3b8' }}>
            {[
              'Cooling rate is proportional to temperature difference',
              'Exponential decay: T(t) = T_room + (T_0 - T_room)e^(-kt)',
              'Lid reduces k (slows cooling), stirring increases k',
              'Time constant τ = 1/k determines cooling speed',
              'Applications: forensics, food safety, HVAC, electronics'
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: '#22c55e' }}>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #374151', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '12px' }}>The Physics Formula</h3>
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#fbbf24', marginBottom: '8px' }}>
              dT/dt = -k(T - T<sub>ambient</sub>)
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Rate of cooling = coefficient × temperature difference
            </p>
          </div>
        </div>

        {!passed && (
          <button
            onMouseDown={() => {
              setTestIndex(0);
              setTestScore(0);
              setTestAnswers(new Array(10).fill(null));
              setShowExplanation(false);
              handleNavigation();
            }}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #f59e0b, #ea580c)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            Try Again
          </button>
        )}

        {passed && (
          <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: '600', fontSize: '16px' }}>
            Congratulations! You understand Newton's Law of Cooling!
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  const renderPhase = (): React.ReactNode => {
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

  const phaseIndex = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].indexOf(phase);
  const phaseNumber = phaseIndex >= 0 ? phaseIndex : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f1a', color: 'white', position: 'relative', overflow: 'hidden' }}>
      {/* Background gradients */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)' }} />
      <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(251, 191, 36, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(234, 88, 12, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

      {/* Fixed header with progress */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', maxWidth: '896px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#fbbf24' }}>Newton's Cooling</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  transition: 'all 0.3s',
                  backgroundColor: phaseNumber === i ? '#fbbf24' : phaseNumber > i ? '#22c55e' : '#475569',
                  width: phaseNumber === i ? '24px' : '8px',
                  boxShadow: phaseNumber === i ? '0 0 8px rgba(251, 191, 36, 0.5)' : 'none'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>Phase {phaseNumber + 1}/10</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: '64px', paddingBottom: '32px', maxWidth: '672px', margin: '0 auto', padding: isMobile ? '64px 16px 32px' : '64px 24px 32px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default NewtonCoolingRenderer;
