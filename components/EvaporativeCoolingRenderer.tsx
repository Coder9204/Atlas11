'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Evaporative Cooling - Complete 10-Phase Game
// Teaching how evaporation removes heat through phase change
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

interface EvaporativeCoolingRendererProps {
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
    scenario: "After a morning swim at the beach, you step out of the water on a breezy day. Despite the air being warm at 28°C, you immediately start shivering.",
    question: "What physical process is causing you to feel so cold?",
    options: [
      { id: 'a', label: "The ocean water was colder than your body temperature" },
      { id: 'b', label: "Evaporating water absorbs latent heat from your skin, rapidly cooling you", correct: true },
      { id: 'c', label: "The wind is colder than the air temperature indicates" },
      { id: 'd', label: "Salt from the ocean water creates a cooling chemical reaction" }
    ],
    explanation: "When water evaporates from your skin, each gram that transitions from liquid to vapor absorbs 2,260 joules of heat energy (the latent heat of vaporization). This energy comes directly from your skin, causing rapid cooling. The breeze accelerates evaporation by removing the humid air layer near your skin."
  },
  {
    scenario: "A marathon runner in Phoenix, Arizona (10% humidity) feels comfortable running at 35°C. Another runner in Miami (90% humidity) struggles at just 28°C and risks heat exhaustion.",
    question: "Why does humidity make such a dramatic difference in heat tolerance?",
    options: [
      { id: 'a', label: "Humid air is heavier and harder to breathe" },
      { id: 'b', label: "High humidity reduces sweat evaporation, preventing the body from cooling itself", correct: true },
      { id: 'c', label: "Humidity increases the actual temperature of the air" },
      { id: 'd', label: "Desert air contains minerals that help cool the body" }
    ],
    explanation: "At 90% humidity, the air is nearly saturated with water vapor and cannot accept much more. Sweat stays liquid on the skin instead of evaporating, so the body cannot use its primary cooling mechanism. In dry air, sweat evaporates rapidly, providing powerful cooling even at higher temperatures."
  },
  {
    scenario: "A wet-bulb thermometer (covered with wet cloth) reads 20°C while a dry-bulb thermometer next to it reads 32°C. Meteorologists issue a heat warning.",
    question: "What does the 12°C difference between these readings indicate?",
    options: [
      { id: 'a', label: "The thermometers are malfunctioning" },
      { id: 'b', label: "Low humidity allowing significant evaporative cooling potential", correct: true },
      { id: 'c', label: "The wet cloth is adding moisture to the air" },
      { id: 'd', label: "Solar radiation is affecting the dry thermometer" }
    ],
    explanation: "The wet-bulb temperature shows how much evaporative cooling is possible. A large difference means low humidity and good conditions for sweating to work. When wet-bulb approaches dry-bulb (small difference), humidity is high and evaporative cooling fails. A wet-bulb above 35°C is potentially fatal for humans."
  },
  {
    scenario: "Your dog pants heavily after a run while you're sweating. Dogs have very few sweat glands but can still cool down effectively through panting.",
    question: "How does panting achieve the same cooling effect as sweating?",
    options: [
      { id: 'a', label: "Panting brings cold air into the lungs" },
      { id: 'b', label: "Evaporation from the tongue and respiratory tract removes heat", correct: true },
      { id: 'c', label: "The rapid breathing cools the blood directly" },
      { id: 'd', label: "Dogs' saliva contains cooling compounds" }
    ],
    explanation: "Panting moves large volumes of air across the wet surfaces of the tongue, mouth, and respiratory tract. Water evaporates from these surfaces, absorbing latent heat and cooling the blood flowing through them. The same physics applies - it's just evaporation from internal surfaces instead of external skin."
  },
  {
    scenario: "A nurse applies rubbing alcohol to a patient's skin before an injection. The patient comments that it feels much colder than water would.",
    question: "Why does alcohol feel colder than water when applied to skin?",
    options: [
      { id: 'a', label: "Alcohol is stored at a lower temperature than water" },
      { id: 'b', label: "Alcohol evaporates faster, removing heat more quickly", correct: true },
      { id: 'c', label: "Alcohol triggers cold receptors in the skin directly" },
      { id: 'd', label: "The chemical reaction between alcohol and skin generates cold" }
    ],
    explanation: "Isopropyl alcohol has a lower latent heat of vaporization (about 665 J/g vs water's 2,260 J/g) but evaporates much faster due to higher vapor pressure. The faster evaporation rate means heat is removed more quickly, creating a stronger sensation of cold even though each gram removes less total energy."
  },
  {
    scenario: "A swamp cooler in Las Vegas reduces indoor temperature from 40°C to 25°C using only water and fans. The same device in Houston barely drops temperature by 3°C.",
    question: "What fundamental physical limitation explains this difference?",
    options: [
      { id: 'a', label: "The Houston device must be defective" },
      { id: 'b', label: "Evaporative cooling is limited by the humidity - dry air can accept more vapor", correct: true },
      { id: 'c', label: "Houston's air contains pollutants that prevent cooling" },
      { id: 'd', label: "The water in Houston is warmer than in Las Vegas" }
    ],
    explanation: "Evaporative coolers can only lower air temperature to the wet-bulb temperature. In Las Vegas (10% humidity), the wet-bulb might be 18°C when air is 40°C, allowing a 22°C drop. In Houston (80% humidity), wet-bulb might be 25°C when air is 28°C, allowing only a 3°C drop. Physics sets the limit."
  },
  {
    scenario: "A power plant cooling tower evaporates 5,000 gallons of water per minute. Engineers say this removes 1.1 gigawatts of heat from the power plant.",
    question: "How is evaporating water removing such enormous amounts of heat?",
    options: [
      { id: 'a', label: "The water falls from a great height, converting potential energy" },
      { id: 'b', label: "Each kilogram of water that evaporates absorbs 2.26 MJ of latent heat", correct: true },
      { id: 'c', label: "The tower fans do the work of removing heat" },
      { id: 'd', label: "Chemical reactions in the tower generate cooling" }
    ],
    explanation: "5,000 gallons/minute = about 19,000 kg/minute of water. At 2.26 MJ/kg latent heat, evaporating this much water absorbs 43,000 MJ/minute = 720 MW of heat. Only partial evaporation occurs (maybe 1-2%), which matches the 1.1 GW figure. This is pure phase-change physics at industrial scale."
  },
  {
    scenario: "Ancient Egyptians used porous clay jars to keep water cool in the desert. Even without ice, the water inside would be 10-15°C cooler than air temperature.",
    question: "What physical mechanism made this passive cooling technology work?",
    options: [
      { id: 'a', label: "Clay is a natural insulator that blocks heat" },
      { id: 'b', label: "Water seeping through porous clay evaporates, absorbing heat from the jar's contents", correct: true },
      { id: 'c', label: "Underground water naturally stayed cold" },
      { id: 'd', label: "The clay absorbed heat during the day and released it at night" }
    ],
    explanation: "Porous clay allows water to slowly seep through to the outer surface. In dry desert air, this water evaporates readily, absorbing latent heat from the jar and its contents. This ancient technology demonstrates the same evaporative cooling physics used in modern swamp coolers and cooling towers."
  },
  {
    scenario: "An athlete loses 1.5 liters of sweat during intense exercise. Their body successfully prevented dangerous overheating during this time.",
    question: "How much thermal energy did this sweat remove from the athlete's body?",
    options: [
      { id: 'a', label: "About 150 kilojoules" },
      { id: 'b', label: "About 3.4 megajoules (enough to run a 1,000W heater for nearly an hour)", correct: true },
      { id: 'c', label: "About 1.5 megajoules" },
      { id: 'd', label: "About 500 kilojoules" }
    ],
    explanation: "1.5 liters = 1.5 kg of water. The latent heat of vaporization is 2.26 MJ/kg, so complete evaporation would remove 1.5 × 2.26 = 3.39 MJ of heat. This is equivalent to a 1,000W space heater running for 56 minutes - demonstrating why sweating is such an effective cooling mechanism."
  },
  {
    scenario: "A data center in Iceland uses free air cooling most of the year, but a data center in Singapore requires energy-intensive air conditioning year-round despite both having similar IT loads.",
    question: "How could evaporative cooling principles help the Singapore facility?",
    options: [
      { id: 'a', label: "It cannot - evaporative cooling is useless in humid climates" },
      { id: 'b', label: "Indirect evaporative cooling with heat exchangers can help without adding humidity", correct: true },
      { id: 'c', label: "Using colder water would make evaporative cooling work" },
      { id: 'd', label: "Running fans faster would overcome the humidity problem" }
    ],
    explanation: "Indirect evaporative cooling uses a heat exchanger - outside air is cooled by water evaporation, then that cooled air cools the indoor air without mixing. While less effective than direct evaporative cooling, it still provides significant energy savings. Modern systems combine this with traditional cooling for best efficiency."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏠',
    title: 'Residential Swamp Coolers',
    short: 'Desert home cooling',
    tagline: 'Ancient physics for modern comfort',
    description: 'Evaporative coolers (swamp coolers) pass hot dry air through water-saturated pads. As water evaporates from the pads, it absorbs heat from the air, dropping temperatures by 15-40 degrees Fahrenheit. This ancient cooling technique uses up to 75% less electricity than traditional air conditioning.',
    connection: 'The same physics that cools your wet skin after swimming powers these home cooling systems. Water molecules absorbing latent heat from the air is identical to sweat absorbing heat from your body - both rely on the 2,260 J/g latent heat of vaporization.',
    howItWorks: 'A pump circulates water over absorbent cellulose or aspen fiber pads while a fan pulls hot outside air through the wet media. As water evaporates, it absorbs heat from the air (about 8,000 BTU per gallon evaporated). The cooled, humidified air is then distributed throughout the home. Continuous airflow through open windows expels warm air.',
    stats: [
      { value: '75%', label: 'Less energy than AC', icon: '⚡' },
      { value: '15-40°F', label: 'Temperature drop possible', icon: '🌡️' },
      { value: '$150-400', label: 'Annual operating cost', icon: '💵' }
    ],
    examples: ['Portable swamp coolers for single rooms', 'Whole-house ducted evaporative systems', 'Rooftop down-draft coolers', 'Two-stage indirect/direct hybrid coolers'],
    companies: ['Mastercool', 'Hessaire', 'Portacool', 'Breezair', 'Honeywell'],
    futureImpact: 'As energy costs rise and climate change intensifies, next-generation evaporative coolers use recycled water and advanced materials. Hybrid systems combining evaporative pre-cooling with minimal refrigeration could reduce residential cooling energy by 50-70% in arid climates, saving billions globally.',
    color: '#06B6D4'
  },
  {
    icon: '🏭',
    title: 'Industrial Cooling Towers',
    short: 'Power plant heat rejection',
    tagline: 'The giants that keep civilization running',
    description: 'Cooling towers are massive heat rejection devices that use evaporative cooling to remove waste heat from power plants, refineries, and factories. A single large cooling tower can evaporate millions of gallons daily, rejecting over 1 gigawatt of thermal energy to the atmosphere.',
    connection: 'Just like sweat evaporating from skin, water droplets in cooling towers absorb latent heat as they evaporate. The physics is identical - phase change from liquid to vapor requires 2,260 joules per gram, which comes from the water being cooled.',
    howItWorks: 'Hot water (35-45°C) from condensers sprays through nozzles or cascades over fill media inside the tower. Ambient air flows through naturally (hyperbolic towers) or via large fans (mechanical draft). Approximately 1-2% of the water evaporates, absorbing enough heat to cool the remaining 98% by 10-20°C. Cooled water collects in a basin and recirculates.',
    stats: [
      { value: '1-2%', label: 'Water lost to evaporation', icon: '💧' },
      { value: '10-20°C', label: 'Water temperature drop', icon: '🌡️' },
      { value: '1+ GW', label: 'Heat rejection capacity', icon: '🔥' }
    ],
    examples: ['Natural draft hyperboloid towers at power plants', 'Mechanical draft crossflow towers', 'Counterflow induced-draft towers', 'Hybrid wet-dry cooling towers'],
    companies: ['SPX Cooling Technologies', 'Evapco', 'Baltimore Aircoil Company', 'Hamon', 'Paharpur'],
    futureImpact: 'Water scarcity is driving cooling tower innovation. Advanced designs use treated wastewater, capture and recycle drift, and employ hybrid systems that switch between wet and dry operation. Some facilities are exploring direct air cooling despite lower efficiency, while others locate in regions with abundant water resources.',
    color: '#F59E0B'
  },
  {
    icon: '🏃',
    title: 'Human Thermoregulation',
    short: 'Your built-in AC system',
    tagline: 'Evolution\'s masterpiece of cooling',
    description: 'Human sweating is the most sophisticated biological cooling system on Earth. Our 2-4 million eccrine sweat glands can produce 2-4 liters of sweat per hour during intense exercise, removing up to 580 calories of heat per gram evaporated. This gives humans unparalleled endurance in hot conditions.',
    connection: 'This IS the original evaporative cooling. Every industrial application mimics what your body does naturally. The latent heat of vaporization that cools power plants is the same physics cooling your forehead on a hot day.',
    howItWorks: 'When core temperature rises above 37°C, the hypothalamus signals eccrine glands to secrete hypotonic saline onto the skin. Blood vessels dilate to bring warm blood near the surface. As sweat evaporates, it absorbs 2,426 joules per gram from the skin. Cooled blood returns to lower core temperature. This system can reject 600-1000 watts of heat during exercise.',
    stats: [
      { value: '2-4 L/hr', label: 'Maximum sweat production', icon: '💧' },
      { value: '580 cal/g', label: 'Heat removed per gram', icon: '🔥' },
      { value: '600-1000W', label: 'Cooling capacity during exercise', icon: '⚡' }
    ],
    examples: ['Marathon running in extreme heat', 'Desert survival and adaptation', 'High-intensity interval training', 'Fever-breaking thermoregulation'],
    companies: ['Under Armour (moisture-wicking)', 'Nike (Dri-FIT technology)', 'Columbia (Omni-Freeze)', 'Gatorade (electrolyte replacement)', 'CamelBak (hydration systems)'],
    futureImpact: 'Understanding sweat is revolutionizing wearable tech and sports science. Sweat sensors now monitor glucose, lactate, cortisol, and electrolytes in real-time. Biomimetic cooling fabrics enhance natural evaporation, while personalized hydration algorithms optimize athletic performance and prevent heat-related illness.',
    color: '#10B981'
  },
  {
    icon: '🖥️',
    title: 'Data Center Cooling',
    short: 'Keeping the cloud cool',
    tagline: 'Where evaporation meets the digital age',
    description: 'Data centers consume 1-2% of global electricity, with cooling accounting for 30-40% of that. Tech giants are deploying massive evaporative cooling systems that save 50-90% of cooling energy compared to traditional air conditioning, enabling more sustainable cloud computing.',
    connection: 'Server racks generate intense heat just like your body during exercise. Evaporative cooling removes this heat the same way sweat cools you - water absorbing latent heat and carrying it away as vapor. The physics scales from skin to megawatts.',
    howItWorks: 'Hot air from server rooms (35-40°C) passes through evaporative media or misting systems. Water evaporates, dropping air temperature by 10-20°C. Direct systems inject this cooled air into server rooms. Indirect systems use heat exchangers to cool a separate air loop, preventing humidity issues with sensitive electronics. Outside air economizers use evaporative cooling when ambient conditions permit.',
    stats: [
      { value: '50-90%', label: 'Cooling energy reduction', icon: '⚡' },
      { value: 'PUE 1.1', label: 'Best efficiency achieved', icon: '📊' },
      { value: '40%', label: 'Typical cooling load share', icon: '❄️' }
    ],
    examples: ['Google evaporative-cooled data centers', 'Facebook Prineville facility', 'Microsoft Azure desert locations', 'Adiabatic pre-cooling for chillers'],
    companies: ['Google (data center efficiency pioneers)', 'Microsoft (Project Natick underwater)', 'Meta (evaporative-cooled facilities)', 'Munters (industrial evaporative systems)'],
    futureImpact: 'As AI computing explodes, data center cooling becomes critical. Evaporative cooling in arid regions, combined with renewable energy and water recycling, could make data centers nearly carbon-neutral. Some hyperscalers are exploring underwater data centers where ocean water provides free cooling.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EvaporativeCoolingRenderer: React.FC<EvaporativeCoolingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [transferAppIndex, setTransferAppIndex] = useState(0);

  // Simulation state
  const [humidity, setHumidity] = useState(30);
  const [skinWet, setSkinWet] = useState(false);
  const [windSpeed, setWindSpeed] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [waterDroplets, setWaterDroplets] = useState<{ x: number; y: number; id: number }[]>([]);
  const [evaporatingDroplets, setEvaporatingDroplets] = useState<number[]>([]);
  const dropletIdRef = useRef(0);

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

  // Constants
  const bodyTempNormal = 37;

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
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors - using high contrast colors (brightness >= 180)
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for cooling theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    hot: '#EF4444',
    cold: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast - brightness ~230
    textMuted: '#cbd5e1', // High contrast - brightness ~200
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
    twist_play: 'Wind Lab',
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

  // Calculate evaporation rate
  const calculateEvaporationRate = useCallback((humid: number, wind: number = 0): number => {
    const baseRate = (100 - humid) / 100;
    const windFactor = 1 + wind / 10;
    return Math.min(baseRate * windFactor, 1);
  }, []);

  // Calculate cooling effect
  const calculateCooling = useCallback((evapRate: number): number => {
    return evapRate * 3;
  }, []);

  // Calculate temperatures
  const evapRate = calculateEvaporationRate(humidity, windSpeed);
  const skinTemp = skinWet ? bodyTempNormal - calculateCooling(evapRate) : bodyTempNormal;

  // Evaporation simulation effect
  useEffect(() => {
    if (!skinWet || waterDroplets.length === 0) return;

    const interval = setInterval(() => {
      if (Math.random() < evapRate * 0.3) {
        const droplet = waterDroplets[Math.floor(Math.random() * waterDroplets.length)];
        if (droplet && !evaporatingDroplets.includes(droplet.id)) {
          setEvaporatingDroplets((prev) => [...prev, droplet.id]);
          setTimeout(() => {
            setWaterDroplets((prev) => prev.filter((d) => d.id !== droplet.id));
            setEvaporatingDroplets((prev) => prev.filter((id) => id !== droplet.id));
          }, 500);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [skinWet, waterDroplets, evapRate, evaporatingDroplets]);

  // Add water droplets
  const wetTheSkin = () => {
    setSkinWet(true);
    const newDroplets: { x: number; y: number; id: number }[] = [];
    for (let i = 0; i < 20; i++) {
      newDroplets.push({
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 150,
        id: dropletIdRef.current++,
      });
    }
    setWaterDroplets(newDroplets);
    playSound('click');
  };

  // Get skin color based on temperature
  const getSkinColor = (temp: number): string => {
    if (temp >= 37) return "#e8b4a0";
    if (temp >= 35) return "#d4a090";
    if (temp >= 33) return "#c09080";
    return "#b08878";
  };

  // Skin Visualization Component
  const SkinVisualization = ({ showWind = false }: { showWind?: boolean }) => {
    const width = isMobile ? 340 : 450;
    const height = isMobile ? 280 : 320;
    const currentEvapRate = calculateEvaporationRate(humidity, showWind ? windSpeed : 0);
    const currentSkinTemp = skinWet ? bodyTempNormal - calculateCooling(currentEvapRate) : bodyTempNormal;

    return (
      <svg width={width} height={height} viewBox="0 0 450 320" style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="airGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1929" />
            <stop offset="50%" stopColor="#152238" />
            <stop offset="100%" stopColor="#234668" />
          </linearGradient>
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={getSkinColor(currentSkinTemp)} />
            <stop offset="100%" stopColor="#b88070" />
          </linearGradient>
          <radialGradient id="dropletGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.6" />
          </radialGradient>
          <radialGradient id="vaporGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Air background */}
        <rect width="450" height="100" fill="url(#airGradient)" />

        {/* Humidity particles in air */}
        {[...Array(Math.round(humidity / 10))].map((_, i) => (
          <circle
            key={`hum-${i}`}
            cx={50 + i * 40 + Math.sin(animationFrame / 10 + i) * 15}
            cy={35 + Math.cos(animationFrame / 15 + i) * 20}
            r={5}
            fill={colors.cold}
            opacity="0.3"
          />
        ))}

        {/* Wind streaks */}
        {showWind && windSpeed > 0 && (
          <g>
            {[...Array(Math.round(windSpeed / 2))].map((_, i) => {
              const x = 30 + ((animationFrame * 3 + i * 60) % 400);
              return (
                <g key={`wind-${i}`}>
                  <line
                    x1={x}
                    y1={25 + i * 20}
                    x2={x + 40}
                    y2={25 + i * 20}
                    stroke={colors.cold}
                    strokeWidth="2"
                    opacity="0.4"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${x + 45},${25 + i * 20} ${x + 35},${20 + i * 20} ${x + 35},${30 + i * 20}`}
                    fill={colors.cold}
                    opacity="0.4"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Skin surface */}
        <rect y="100" width="450" height="220" fill="url(#skinGradient)" />

        {/* Skin texture lines */}
        {[...Array(10)].map((_, i) => (
          <path
            key={`texture-${i}`}
            d={`M ${i * 45 + 22} 100 Q ${i * 45 + 35} 160 ${i * 45 + 22} 220`}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Water droplets */}
        {skinWet && waterDroplets.map((droplet) => {
          const isEvaporating = evaporatingDroplets.includes(droplet.id);
          return (
            <g key={droplet.id}>
              <ellipse
                cx={droplet.x}
                cy={droplet.y}
                rx={isEvaporating ? 4 : 7}
                ry={isEvaporating ? 2 : 4}
                fill={isEvaporating ? "url(#vaporGradient)" : "url(#dropletGradient)"}
                filter={isEvaporating ? "url(#glow)" : undefined}
              />
              {!isEvaporating && (
                <ellipse
                  cx={droplet.x - 2}
                  cy={droplet.y - 1}
                  rx={2}
                  ry={1}
                  fill="rgba(255,255,255,0.4)"
                />
              )}
              {/* Rising vapor */}
              {isEvaporating && [...Array(3)].map((_, j) => {
                const yOffset = (animationFrame + j * 8) % 30;
                return (
                  <circle
                    key={`vapor-${j}`}
                    cx={droplet.x + (j - 1) * 10}
                    cy={droplet.y - 10 - yOffset}
                    r={4 + j * 0.5}
                    fill="url(#vaporGradient)"
                    opacity={0.6 * (1 - yOffset / 30)}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Rising vapor when wet */}
        {skinWet && currentEvapRate > 0.3 && (
          <g filter="url(#glow)">
            {[...Array(Math.round(currentEvapRate * 5))].map((_, i) => {
              const x = 80 + i * 60 + Math.sin(animationFrame / 20 + i) * 20;
              const yProgress = ((animationFrame * 1.2 + i * 20) % 50);
              return (
                <circle
                  key={`rise-${i}`}
                  cx={x}
                  cy={95 - yProgress}
                  r={5}
                  fill="url(#vaporGradient)"
                  opacity={0.5 * (1 - yProgress / 50)}
                />
              );
            })}
          </g>
        )}

        {/* Thermometer */}
        <g transform="translate(380, 130)">
          <rect x="0" y="0" width="50" height="120" rx="6" fill="#1f2937" stroke="#4b5563" strokeWidth="1" />
          <rect x="8" y="8" width="34" height="104" rx="4" fill="#111827" />
          <rect
            x="12"
            y={108 - (currentSkinTemp - 30) * 12}
            width="26"
            height={(currentSkinTemp - 30) * 12}
            rx="3"
            fill={currentSkinTemp >= 36 ? colors.hot : currentSkinTemp >= 34 ? colors.warning : colors.cold}
          />
          <circle cx="25" cy="115" r="7" fill={currentSkinTemp >= 36 ? colors.hot : currentSkinTemp >= 34 ? colors.warning : colors.cold} />
        </g>

        {/* Labels */}
        <text x="20" y="25" fill={colors.textSecondary} fontSize="12">Humidity: <tspan fill={colors.accent}>{humidity}%</tspan></text>
        <text x="20" y="45" fill={colors.textSecondary} fontSize="12">Evap Rate: <tspan fill={colors.success}>{(currentEvapRate * 100).toFixed(0)}%</tspan></text>
        {showWind && windSpeed > 0 && (
          <text x="20" y="65" fill={colors.textSecondary} fontSize="12">Wind: <tspan fill={colors.cold}>{windSpeed} m/s</tspan></text>
        )}
        <text x="380" y="270" fill={colors.textPrimary} fontSize="14" fontWeight="600">{currentSkinTemp.toFixed(1)}°C</text>
        <text x="380" y="288" fill={colors.textMuted} fontSize="10">Skin Temp</text>
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
            minWidth: '44px',
            height: '8px',
            minHeight: '44px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
          }} />
        </button>
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
    minHeight: '44px',
  };

  // Navigation bar component - fixed at top
  const renderNavBar = () => (
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
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <button
        onClick={() => {
          const currentIndex = phaseOrder.indexOf(phase);
          if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
        }}
        disabled={phase === 'hook'}
        style={{
          background: phase === 'hook' ? 'transparent' : colors.bgCard,
          border: `1px solid ${colors.border}`,
          color: phase === 'hook' ? colors.textMuted : colors.textSecondary,
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          minHeight: '44px',
          transition: 'all 0.2s ease',
        }}
      >
        ← Back
      </button>
      <span style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '14px' }}>
        {phaseLabels[phase]}
      </span>
      <button
        onClick={() => {
          const currentIndex = phaseOrder.indexOf(phase);
          if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
        }}
        disabled={phase === 'mastery'}
        style={{
          background: phase === 'mastery' ? 'transparent' : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
          border: 'none',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: phase === 'mastery' ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          minHeight: '44px',
          transition: 'all 0.2s ease',
        }}
      >
        Next →
      </button>
    </nav>
  );

  // Fixed bottom footer with navigation
  const renderBottomNav = () => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 16px',
      zIndex: 1000,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
    }}>
      {renderNavDots()}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        height: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            💧🌡️❄️
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Evaporative Cooling
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            You step out of a swimming pool on a warm day, and despite the heat, you feel <span style={{ color: colors.cold }}>suddenly cold</span>. Your wet skin loses heat rapidly as water evaporates. But where does that cooling power come from?
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
              "Water doesn't just disappear - evaporation requires <span style={{ color: colors.accent }}>enormous energy</span>. Every gram that evaporates absorbs 2,260 joules of heat. That's why sweating keeps you alive in the desert."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — Thermodynamics of Phase Change
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore Evaporative Cooling
          </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The surrounding air provides the energy - warm air heats the water' },
      { id: 'b', text: 'Your skin provides the energy - water "steals" heat from your body' },
      { id: 'c', text: 'The water itself has stored energy that gets released' },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Step 1 of 3: Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Your skin is wet with water. As the water evaporates, where does the energy come from to change liquid water into vapor?
            </h2>

            {/* Static Preview Graphic for Predict Phase */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                What to Watch: Observe the diagram showing evaporation from wet skin
              </p>
              <SkinVisualization />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
                <div style={{ padding: '12px 20px', background: '#3B82F633', borderRadius: '8px', border: '2px solid #3B82F6' }}>
                  <span style={{ color: '#3B82F6', fontWeight: 600 }}>Liquid Water</span>
                </div>
                <div style={{ fontSize: '24px' }}>➡️ + Energy ➡️</div>
                <div style={{ padding: '12px 20px', background: '#06B6D433', borderRadius: '8px', border: '2px solid #06B6D4' }}>
                  <span style={{ color: '#06B6D4', fontWeight: 600 }}>Water Vapor</span>
                </div>
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
                Phase change requires 2,260 J/g - where does this energy come from?
              </p>
            </div>

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
                    transition: 'all 0.2s ease',
                    minHeight: '44px',
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
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Skin Cooling
  if (phase === 'play') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Evaporative Cooling Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              What to Watch: Observe how humidity affects evaporation rate and skin temperature
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              Try adjusting the humidity slider below to see how different environments affect cooling
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <SkinVisualization />
              </div>

              {/* Wet skin button */}
              <button
                onClick={wetTheSkin}
                disabled={skinWet && waterDroplets.length > 0}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: skinWet && waterDroplets.length > 0 ? colors.border : colors.cold,
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: skinWet && waterDroplets.length > 0 ? 'not-allowed' : 'pointer',
                  marginBottom: '24px',
                  minHeight: '44px',
                }}
              >
                {skinWet && waterDroplets.length > 0 ? 'Water Evaporating...' : 'Wet the Skin'}
              </button>

              {/* Humidity slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Air Humidity</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{humidity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={humidity}
                  onChange={(e) => setHumidity(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', touchAction: 'pan-y' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Desert (10%)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Normal (50%)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Jungle (95%)</span>
                </div>
              </div>

              {/* Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.cold }}>{skinTemp.toFixed(1)}°C</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Skin Temp</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{(37 - skinTemp).toFixed(1)}°C</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Cooling</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{(evapRate * 100).toFixed(0)}%</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Evap Rate</div>
                </div>
              </div>
            </div>

            {/* Real-world relevance */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0, textAlign: 'center' }}>
                <span style={{ color: colors.accent, fontWeight: 600 }}>Real-world connection:</span> This is exactly how <span style={{ color: colors.success }}>sweating</span> cools your body. The same physics powers <span style={{ color: colors.warning }}>swamp coolers</span> and <span style={{ color: colors.cold }}>industrial cooling towers</span>.
              </p>
            </div>

            {/* Discovery feedback */}
            {skinWet && humidity < 50 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0, textAlign: 'center' }}>
                  Fast evaporation! Your skin is losing heat rapidly - that's why you feel cold.
                </p>
              </div>
            )}

            {skinWet && humidity > 80 && (
              <div style={{
                background: `${colors.warning}22`,
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ ...typo.body, color: colors.warning, margin: 0, textAlign: 'center' }}>
                  High humidity! Evaporation is slow - the air is too saturated to accept more vapor.
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
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionLabels: Record<string, string> = {
      'a': 'the surrounding air provides the energy',
      'b': 'your skin provides the energy - water "steals" heat from your body',
      'c': 'the water itself has stored energy',
    };

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Physics of Evaporative Cooling
            </h2>

            {/* Reference user's prediction */}
            {prediction && (
              <div style={{
                background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
                border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
                  {prediction === 'b'
                    ? `You predicted correctly that ${predictionLabels[prediction]}! The experiment confirmed your intuition.`
                    : `You predicted that ${predictionLabels[prediction] || 'something else'}. The experiment showed that your skin actually provides the energy - water absorbs heat as it evaporates!`
                  }
                </p>
              </div>
            )}

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                Latent Heat of Vaporization
              </h3>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <code style={{ fontSize: '20px', color: colors.textPrimary }}>Lv = 2,260 J/g (water)</code>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Converting liquid water to vapor requires enormous energy - 2,260 joules per gram. This energy comes from whatever is in contact with the water. When sweat evaporates, that energy comes from <span style={{ color: colors.accent }}>your skin</span>.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '16px' }}>
                Why Fast Molecules Escape First
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                In liquid water, molecules move at different speeds. Only the <span style={{ color: colors.hot }}>fastest-moving</span> (hottest) molecules have enough energy to escape as vapor. They leave behind the <span style={{ color: colors.cold }}>slower-moving</span> (cooler) molecules. This is why evaporation cools!
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Humidity's Role
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                  <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Low Humidity (Desert)</p>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>Lots of "room" for vapor - fast evaporation - strong cooling</p>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px' }}>
                  <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>High Humidity (Jungle)</p>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>Air already "full" - slow evaporation - weak cooling</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Discover a Surprising Twist
            </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Cooling increases - wind speeds up evaporation' },
      { id: 'b', text: 'Cooling decreases - wind "blows away" the cool' },
      { id: 'c', text: 'No change - only humidity affects evaporation rate' },
    ];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Wind Speed
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              You have wet skin. Someone starts blowing air across it (like a fan). Humidity stays the same. What happens to the cooling effect?
            </h2>

            {/* Static Preview Graphic for Twist Predict Phase */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
                What to Watch: Observe how wind affects evaporation
              </p>
              <SkinVisualization showWind={true} />
              <div style={{ fontSize: '48px', margin: '16px 0 8px' }}>💨 ➡️ 💧</div>
              <p style={{ ...typo.small, color: colors.textMuted }}>Wind blowing across wet skin</p>
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
                    transition: 'all 0.2s ease',
                    minHeight: '44px',
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
                See Wind Effect in Action
              </button>
            )}
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const noWindEvapRate = calculateEvaporationRate(humidity, 0);
    const withWindEvapRate = calculateEvaporationRate(humidity, windSpeed);
    const noWindTemp = bodyTempNormal - calculateCooling(noWindEvapRate);
    const withWindTemp = bodyTempNormal - calculateCooling(withWindEvapRate);

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '8px', textAlign: 'center' }}>
              Wind & Evaporative Cooling
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              What to Watch: Observe how wind affects evaporation rate and cooling
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              Adjust the wind speed slider to see the effect on skin temperature
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <SkinVisualization showWind={true} />
              </div>

              {/* Make skin wet for this phase */}
              {!skinWet && (
                <button
                  onClick={wetTheSkin}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.cold,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '20px',
                    minHeight: '44px',
                  }}
                >
                  Wet the Skin
                </button>
              )}

              {/* Wind speed slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Wind Speed</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{windSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', touchAction: 'pan-y' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Still Air</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Light Breeze</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Strong Wind</span>
                </div>
              </div>

              {/* Comparison */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>No Wind</div>
                  <div style={{ ...typo.h3, color: colors.cold }}>{noWindTemp.toFixed(1)}°C</div>
                </div>
                <div style={{
                  background: windSpeed > 0 ? `${colors.warning}22` : colors.bgSecondary,
                  border: windSpeed > 0 ? `1px solid ${colors.warning}` : 'none',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>With Wind</div>
                  <div style={{ ...typo.h3, color: colors.cold }}>{withWindTemp.toFixed(1)}°C</div>
                  {windSpeed > 0 && (
                    <div style={{ ...typo.small, color: colors.warning, marginTop: '4px' }}>
                      {(noWindTemp - withWindTemp).toFixed(1)}°C extra cooling!
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Deep Principles
            </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.warning, marginBottom: '24px', textAlign: 'center' }}>
              The Boundary Layer Effect
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>🌫️</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Saturated Layer Problem</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Right above wet skin, a thin layer of air becomes nearly saturated with water vapor. This "boundary layer" is at near 100% humidity, slowing further evaporation even when ambient humidity is low.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>💨</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Wind Sweeps It Away</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Wind continuously replaces this saturated boundary layer with drier ambient air. Fresh dry air contacts the wet surface, allowing rapid evaporation. Result: <span style={{ color: colors.accent }}>more cooling at the same humidity!</span>
                </p>
              </div>

              <div style={{
                background: `${colors.warning}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.warning}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>🌡️</span>
                  <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Wind Chill Effect</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  This is why wind feels colder than still air at the same temperature. It's not that the air is colder - wind removes heat faster by:
                </p>
                <ul style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', paddingLeft: '20px' }}>
                  <li>Increasing evaporation from wet surfaces</li>
                  <li>Breaking up the insulating air layer near skin</li>
                  <li>Faster convective heat transfer</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Real-World Applications
            </button>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[transferAppIndex];
    const allAppsCompleted = completedApps.every(c => c);

    const handleGotIt = () => {
      playSound('success');
      const newCompleted = [...completedApps];
      newCompleted[transferAppIndex] = true;
      setCompletedApps(newCompleted);
      if (transferAppIndex < realWorldApps.length - 1) {
        setTransferAppIndex(transferAppIndex + 1);
      }
    };

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ ...typo.body, color: colors.textSecondary }}>
                Application {transferAppIndex + 1} of {realWorldApps.length}
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                {realWorldApps.map((_, i) => (
                  <div key={i} style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: completedApps[i] ? colors.success : i === transferAppIndex ? colors.accent : colors.border,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }} onClick={() => setTransferAppIndex(i)} />
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
                    setTransferAppIndex(i);
                    setSelectedApp(i);
                  }}
                  style={{
                    background: transferAppIndex === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${transferAppIndex === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
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

              {/* Physics connection */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  Physics Connection:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              {/* How it works */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                  How It Works:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              {/* Stats */}
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

              {/* Examples */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
                  Examples:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {app.examples.map((ex, i) => (
                    <span key={i} style={{
                      background: colors.bgSecondary,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      ...typo.small,
                      color: colors.textSecondary,
                    }}>
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              {/* Companies */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
                  Key Companies:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {app.companies.map((co, i) => (
                    <span key={i} style={{
                      background: `${app.color}22`,
                      border: `1px solid ${app.color}44`,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      ...typo.small,
                      color: app.color,
                    }}>
                      {co}
                    </span>
                  ))}
                </div>
              </div>

              {/* Future Impact */}
              <div style={{
                background: `${colors.success}11`,
                border: `1px solid ${colors.success}33`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                  Future Impact:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.futureImpact}
                </p>
              </div>

              {/* Got It button */}
              {!completedApps[transferAppIndex] && (
                <button
                  onClick={handleGotIt}
                  style={{
                    ...primaryButtonStyle,
                    width: '100%',
                    background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  }}
                >
                  Got It! {transferAppIndex < realWorldApps.length - 1 ? '→ Next Application' : ''}
                </button>
              )}
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
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          height: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}
          {renderNavBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '80px 24px 100px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
                  ? 'You\'ve mastered Evaporative Cooling!'
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
                  Review & Try Again
                </button>
              )}
            </div>
          </div>
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        height: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        height: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        {renderNavBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '80px 24px 100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
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
            You've mastered evaporative cooling - one of nature's most powerful heat transfer mechanisms. From sweating to swamp coolers to power plant cooling towers, this physics shapes our world.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Mastered:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Latent heat of vaporization (2,260 J/g)',
                'Why humidity limits evaporative cooling',
                'The wind chill effect and boundary layers',
                'Human thermoregulation via sweating',
                'Industrial cooling tower physics',
                'Data center evaporative cooling',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            {[
              { icon: '💧', label: 'Latent Heat' },
              { icon: '💨', label: 'Wind Chill' },
              { icon: '🌡️', label: 'Humidity' },
              { icon: '❄️', label: 'Phase Change' },
            ].map((badge, i) => (
              <div key={i} style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px 8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{badge.icon}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{badge.label}</div>
              </div>
            ))}
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
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default EvaporativeCoolingRenderer;
