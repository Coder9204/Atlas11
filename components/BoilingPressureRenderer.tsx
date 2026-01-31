'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Game event interface for AI coach integration
interface GameEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
  phase: string;
}

// String-based phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface BoilingPressureRendererProps {
  onBack?: () => void;
  onPhaseComplete?: (phase: Phase) => void;
}

const TEST_QUESTIONS = [
  {
    question: 'Why does water boil at a lower temperature on Mount Everest?',
    options: [
      { text: 'The air is colder', correct: false },
      { text: 'There is less atmospheric pressure', correct: true },
      { text: 'There is less oxygen', correct: false },
      { text: 'The water is different at high altitude', correct: false }
    ]
  },
  {
    question: 'What does a pressure cooker do to cooking temperature?',
    options: [
      { text: 'Lowers it by removing air', correct: false },
      { text: 'Keeps it exactly at 100C', correct: false },
      { text: 'Raises it by increasing pressure', correct: true },
      { text: 'Has no effect on temperature', correct: false }
    ]
  },
  {
    question: 'At what pressure can water boil at room temperature (25C)?',
    options: [
      { text: '1 atmosphere', correct: false },
      { text: '2 atmospheres', correct: false },
      { text: 'About 0.03 atmospheres (vacuum)', correct: true },
      { text: 'Water cannot boil at 25C', correct: false }
    ]
  },
  {
    question: 'Why do pressure cookers cook food faster?',
    options: [
      { text: 'Higher pressure pushes heat into food', correct: false },
      { text: 'Higher boiling point means hotter water', correct: true },
      { text: 'Steam moves faster at high pressure', correct: false },
      { text: 'Pressure cookers use less water', correct: false }
    ]
  },
  {
    question: 'What is vapor pressure?',
    options: [
      { text: 'The pressure inside a sealed container', correct: false },
      { text: 'The pressure exerted by a vapor in equilibrium with its liquid', correct: true },
      { text: 'The weight of water vapor in the air', correct: false },
      { text: 'The force needed to compress a gas', correct: false }
    ]
  },
  {
    question: 'According to the Clausius-Clapeyron relation, what happens to boiling point when pressure doubles?',
    options: [
      { text: 'Boiling point doubles', correct: false },
      { text: 'Boiling point increases, but not by double', correct: true },
      { text: 'Boiling point stays the same', correct: false },
      { text: 'Boiling point decreases', correct: false }
    ]
  },
  {
    question: 'Why is vacuum cooking (sous vide at low pressure) useful for delicate ingredients?',
    options: [
      { text: 'It removes bacteria more effectively', correct: false },
      { text: 'It allows boiling at lower temperatures, preserving texture', correct: true },
      { text: 'It makes food cook faster', correct: false },
      { text: 'It adds more flavor to the food', correct: false }
    ]
  },
  {
    question: 'In Denver (altitude ~1600m), water boils at approximately what temperature?',
    options: [
      { text: '100C - altitude does not matter', correct: false },
      { text: '95C - slightly lower due to reduced pressure', correct: true },
      { text: '85C - significantly lower', correct: false },
      { text: '105C - higher due to thinner air', correct: false }
    ]
  },
  {
    question: 'What happens to the boiling point of water if you add salt?',
    options: [
      { text: 'It decreases significantly', correct: false },
      { text: 'It increases slightly (boiling point elevation)', correct: true },
      { text: 'It stays exactly the same', correct: false },
      { text: 'It becomes unpredictable', correct: false }
    ]
  },
  {
    question: 'Why do geysers erupt with such force?',
    options: [
      { text: 'Underground volcanic gases push the water out', correct: false },
      { text: 'Superheated water under pressure rapidly boils when reaching lower pressure at surface', correct: true },
      { text: 'Earthquakes force the water upward', correct: false },
      { text: 'The water is heated by the sun', correct: false }
    ]
  }
];

// Scenario-based test questions with enhanced format
const testQuestions = [
  {
    scenario: "A hiker is camping at 14,000 feet elevation in the Rocky Mountains. She tries to boil water for her instant coffee but notices the water starts bubbling at a surprisingly low temperature.",
    question: "Why does water boil at a lower temperature at high altitude?",
    options: [
      { id: 'a', label: "The air is colder at high altitude, which cools the water faster" },
      { id: 'b', label: "There is less atmospheric pressure pushing down on the water surface, so molecules escape more easily", correct: true },
      { id: 'c', label: "The oxygen content is lower, which changes water's chemical properties" },
      { id: 'd', label: "UV radiation from the sun breaks apart water molecules at lower temperatures" }
    ],
    explanation: "At higher altitudes, atmospheric pressure decreases because there is less air above pushing down. Water boils when its vapor pressure equals the surrounding atmospheric pressure. With less pressure to overcome, water molecules can escape into the gas phase at lower temperatures. At 14,000 feet, water boils at about 86C (187F) instead of 100C (212F)."
  },
  {
    scenario: "A home cook uses a pressure cooker to prepare dried beans. At sea level, the beans would normally take 2 hours to soften in boiling water, but in the pressure cooker they're ready in just 25 minutes.",
    question: "How does a pressure cooker dramatically reduce cooking time?",
    options: [
      { id: 'a', label: "The sealed environment traps heat better and prevents energy loss" },
      { id: 'b', label: "The increased pressure raises the boiling point of water, allowing it to reach higher temperatures", correct: true },
      { id: 'c', label: "Pressure forces water molecules into the food, hydrating it faster" },
      { id: 'd', label: "The lack of oxygen prevents oxidation that slows cooking" }
    ],
    explanation: "A pressure cooker seals in steam, raising the internal pressure to about 2 atmospheres. This increases water's boiling point from 100C to approximately 120C (250F). The 20-degree temperature increase dramatically speeds up the chemical reactions that break down tough proteins and starches, reducing cooking time by 70% or more."
  },
  {
    scenario: "A climbing expedition on Denali (20,310 feet) attempts to cook pasta for dinner. Despite the water rolling at a vigorous boil, the pasta remains hard and undercooked even after 20 minutes.",
    question: "Why does pasta fail to cook properly at extreme altitudes even in boiling water?",
    options: [
      { id: 'a', label: "The cold air temperature constantly removes heat from the pot" },
      { id: 'b', label: "The water is boiling at only 80C, too cool to properly gelatinize the starches", correct: true },
      { id: 'c', label: "Pasta requires oxygen dissolved in water to cook, which is scarce at altitude" },
      { id: 'd', label: "The dry air causes the water to evaporate before cooking is complete" }
    ],
    explanation: "At 20,000+ feet, atmospheric pressure is only about 0.46 atm, causing water to boil at roughly 80C (176F). Pasta requires temperatures above 90C to properly gelatinize starches and denature proteins. The boiling is vigorous because molecules are escaping rapidly, but the actual temperature is too low for effective cooking. Climbers often use pressure cookers or pre-cooked foods at extreme altitudes."
  },
  {
    scenario: "A pharmaceutical company needs to purify a heat-sensitive medication compound. At normal atmospheric pressure, the compound would decompose before reaching its boiling point of 180C.",
    question: "How does vacuum distillation solve this problem?",
    options: [
      { id: 'a', label: "The vacuum removes air that would react with and decompose the compound" },
      { id: 'b', label: "Reducing pressure lowers the boiling point, allowing purification at safe temperatures", correct: true },
      { id: 'c', label: "The vacuum increases molecular movement, speeding up evaporation without heat" },
      { id: 'd', label: "Without air resistance, molecules evaporate with less energy input" }
    ],
    explanation: "Vacuum distillation reduces the surrounding pressure, which lowers the boiling point of all liquids. By reducing pressure to 0.01 atm or less, a compound with a normal boiling point of 180C might boil at only 80C. This allows heat-sensitive pharmaceuticals, essential oils, and other delicate compounds to be purified without thermal decomposition."
  },
  {
    scenario: "A commercial airline flying at 35,000 feet maintains cabin pressure equivalent to about 8,000 feet altitude (0.75 atm). A flight attendant heats water for tea using the onboard galley.",
    question: "At what approximate temperature will the water boil in the aircraft cabin?",
    options: [
      { id: 'a', label: "100C - cabin heating systems compensate for altitude effects" },
      { id: 'b', label: "92C - the reduced cabin pressure lowers the boiling point", correct: true },
      { id: 'c', label: "85C - aircraft use special pressurized kettles" },
      { id: 'd', label: "110C - the pressurized cabin increases the boiling point" }
    ],
    explanation: "Although aircraft fly at 35,000 feet where pressure is extremely low, cabins are pressurized to a comfortable level equivalent to about 8,000 feet (0.75 atm). At this pressure, water boils at approximately 92C (198F). This is why airline coffee and tea often taste different - the water never reaches 100C, affecting extraction and flavor development."
  },
  {
    scenario: "A power plant engineer is designing a steam turbine system. The boiler operates at 100 atmospheres of pressure to generate superheated steam for maximum efficiency.",
    question: "What is the approximate boiling point of water at 100 atmospheres pressure?",
    options: [
      { id: 'a', label: "200C - pressure has a modest effect on boiling point" },
      { id: 'b', label: "311C - extremely high pressure dramatically raises the boiling point", correct: true },
      { id: 'c', label: "100C - boiling point is a fixed property of water" },
      { id: 'd', label: "500C - the relationship between pressure and boiling point is linear" }
    ],
    explanation: "At 100 atmospheres, water's boiling point rises to approximately 311C (592F). Modern power plants use these extreme conditions because higher-temperature steam carries more energy, improving thermodynamic efficiency. The relationship between pressure and boiling point follows a logarithmic curve (Clausius-Clapeyron equation), not a linear one, which is why 100x pressure doesn't mean 100x temperature increase."
  },
  {
    scenario: "A food scientist is developing freeze-dried astronaut ice cream. The process involves freezing the ice cream solid, then placing it in a vacuum chamber where the ice transitions directly to vapor without melting.",
    question: "What pressure and temperature conditions enable this freeze-drying process?",
    options: [
      { id: 'a', label: "Very high pressure forces ice to evaporate at sub-zero temperatures" },
      { id: 'b', label: "Below 0.006 atm (triple point pressure), ice sublimes directly to vapor at low temperatures", correct: true },
      { id: 'c', label: "Near-vacuum conditions cause ice to melt instantaneously into gas" },
      { id: 'd', label: "The vacuum removes air that normally prevents sublimation" }
    ],
    explanation: "Water's triple point occurs at 0.006 atm and 0.01C. Below this pressure, liquid water cannot exist - ice can only sublimate directly to vapor. Freeze-drying exploits this by reducing pressure below the triple point while keeping temperature low. The ice in the frozen food sublimes away, leaving behind a dried product that retains its structure and can be rehydrated later."
  },
  {
    scenario: "NASA engineers are designing water systems for a Mars habitat. Mars's atmospheric pressure is only 0.006 atm (about 600 Pascals), similar to Earth's triple point pressure.",
    question: "What unique challenge does Mars's low pressure create for handling liquid water?",
    options: [
      { id: 'a', label: "Water would freeze instantly in the cold Martian environment" },
      { id: 'b', label: "Water cannot exist as a stable liquid - it would boil and freeze simultaneously", correct: true },
      { id: 'c', label: "The low gravity would cause water to float away as droplets" },
      { id: 'd', label: "Solar radiation would break water into hydrogen and oxygen" }
    ],
    explanation: "At Mars's surface pressure (0.006 atm), we're at water's triple point. Any exposed liquid water would simultaneously boil (because pressure is too low for liquid at most temperatures) and freeze (because the rapid evaporation removes heat). Liquid water can only exist on Mars in pressurized habitats or temporarily in very specific conditions. This is why Mars missions require completely sealed water systems."
  },
  {
    scenario: "A chemical plant produces synthetic flavoring compounds using reactive distillation. The process must carefully control temperature to prevent unwanted side reactions while separating products.",
    question: "Why might the plant operate the distillation column at 0.5 atmospheres instead of normal pressure?",
    options: [
      { id: 'a', label: "Lower pressure reduces energy costs by requiring less heating fuel" },
      { id: 'b', label: "Lower pressure reduces boiling points, allowing separation at temperatures that prevent decomposition", correct: true },
      { id: 'c', label: "Reduced pressure increases the purity of separated compounds" },
      { id: 'd', label: "The vacuum removes reactive oxygen that would contaminate products" }
    ],
    explanation: "Many organic compounds are thermally unstable and decompose or undergo unwanted reactions at high temperatures. By operating at reduced pressure (vacuum distillation), the boiling points of all components decrease proportionally. A mixture that would require 200C to separate at 1 atm might only need 140C at 0.5 atm, allowing successful separation without thermal damage to the products."
  },
  {
    scenario: "A student is studying a phase diagram of water showing solid, liquid, and gas regions. The diagram shows three lines meeting at a single point, with pressure on the y-axis and temperature on the x-axis.",
    question: "On this phase diagram, what happens if you start with liquid water at 1 atm and 50C, then reduce pressure while keeping temperature constant?",
    options: [
      { id: 'a', label: "The water remains liquid because temperature hasn't changed" },
      { id: 'b', label: "The water will eventually cross into the gas region and boil", correct: true },
      { id: 'c', label: "The water will first freeze, then sublimate to gas" },
      { id: 'd', label: "Nothing changes until you reach absolute zero pressure" }
    ],
    explanation: "On a phase diagram, moving vertically downward (decreasing pressure at constant temperature) from the liquid region will eventually cross the liquid-gas boundary line. At this boundary, the liquid boils. For water at 50C, this transition occurs at about 0.12 atm. Below this pressure, water at 50C exists only as vapor. This is why vacuum chambers can cause room-temperature water to boil - you're crossing the phase boundary by reducing pressure rather than increasing temperature."
  }
];

const TRANSFER_APPS = [
  {
    title: 'Pressure Cookers',
    description: 'At 2 atm, water boils at ~120C. The extra 20C dramatically speeds cooking - beans in 20 min instead of 2 hours!',
    icon: 'pot'
  },
  {
    title: 'High Altitude Cooking',
    description: 'Denver (1.6km): water boils at 95C. Everest base camp: 85C. Food takes longer because the water is cooler.',
    icon: 'mountain'
  },
  {
    title: 'Vacuum Distillation',
    description: 'Reduce pressure to boil liquids at lower temps. Used to purify heat-sensitive compounds without destroying them.',
    icon: 'beaker'
  },
  {
    title: 'Geysers',
    description: 'Underground water under high pressure stays liquid above 100C. When it reaches the surface - instant explosive boiling!',
    icon: 'geyser'
  }
];

// Antoine equation approximation for water boiling point
function getBoilingPoint(pressureAtm: number): number {
  if (pressureAtm <= 0.01) return 7;
  return 100 + 28.7 * Math.log(pressureAtm);
}

function getWaterState(temp: number, boilingPoint: number): 'solid' | 'liquid' | 'boiling' | 'gas' {
  if (temp <= 0) return 'solid';
  if (temp < boilingPoint - 1) return 'liquid';
  if (temp <= boilingPoint + 5) return 'boiling';
  return 'gas';
}

export default function BoilingPressureRenderer({ onBack, onPhaseComplete }: BoilingPressureRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  // Simulation state
  const [pressure, setPressure] = useState(1.0);
  const [temperature, setTemperature] = useState(25);
  const [heating, setHeating] = useState(false);
  const [bubbles, setBubbles] = useState<{id: number; x: number; y: number; size: number}[]>([]);

  // Twist state - altitude comparison
  const [twistLocation, setTwistLocation] = useState<'sea' | 'denver' | 'everest'>('sea');
  const [twistTemp, setTwistTemp] = useState(25);
  const [twistHeating, setTwistHeating] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const bubbleIdRef = useRef(0);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#06b6d4',       // cyan-500
    primaryDark: '#0891b2',   // cyan-600
    accent: '#f97316',        // orange-500 (for heat)
    secondary: '#3b82f6',     // blue-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    heat: '#ef4444',          // red-500
    cold: '#3b82f6',          // blue-500
    steam: '#e5e7eb',         // gray-200
    water: '#60a5fa',         // blue-400
  };

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

  // Sound utility
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
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

  // Emit game events (for logging/analytics)
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      // Event logging placeholder - can be connected to analytics
      console.debug('Game event:', { type, data, timestamp: Date.now(), phase: phaseLabels[phase] });
    },
    [phase]
  );

  // Navigate to phase
  const goToPhase = useCallback(
    (newPhase: Phase) => {
      if (navigationLockRef.current) return;
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;

      navigationLockRef.current = true;
      playSound('transition');
      setPhase(newPhase);
      onPhaseComplete?.(newPhase);

      setTimeout(() => {
        navigationLockRef.current = false;
      }, 400);
    },
    [playSound, onPhaseComplete]
  );

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const getLocationPressure = (loc: 'sea' | 'denver' | 'everest'): number => {
    switch (loc) {
      case 'sea': return 1.0;
      case 'denver': return 0.83;
      case 'everest': return 0.33;
    }
  };

  // Heating effect
  useEffect(() => {
    if (!heating) return;

    const boilingPoint = getBoilingPoint(pressure);
    const interval = setInterval(() => {
      setTemperature(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [heating, pressure]);

  // Bubble generation
  useEffect(() => {
    const boilingPoint = getBoilingPoint(pressure);
    const state = getWaterState(temperature, boilingPoint);

    if (state !== 'boiling') {
      setBubbles([]);
      return;
    }

    const interval = setInterval(() => {
      setBubbles(prev => {
        const updated = prev
          .map(b => ({ ...b, y: b.y - 3 }))
          .filter(b => b.y > 120);

        if (Math.random() > 0.3) {
          const nearBoiling = temperature >= boilingPoint;
          const intensity = nearBoiling ? 3 : 1;
          for (let i = 0; i < intensity; i++) {
            updated.push({
              id: bubbleIdRef.current++,
              x: 100 + Math.random() * 200,
              y: 220 + Math.random() * 20,
              size: 3 + Math.random() * 6
            });
          }
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [temperature, pressure]);

  // Twist heating effect
  useEffect(() => {
    if (!twistHeating) return;

    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    const interval = setInterval(() => {
      setTwistTemp(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [twistHeating, twistLocation]);

  // Reset when returning to play/twist_play
  useEffect(() => {
    if (phase === 'play') {
      setTemperature(25);
      setHeating(false);
      setPressure(1.0);
    }
    if (phase === 'twist_play') {
      setTwistTemp(25);
      setTwistHeating(false);
      setTwistLocation('sea');
    }
  }, [phase]);

  // Render premium beaker visualization with SVG defs
  const renderBeaker = (temp: number, pres: number, currentBubbles: typeof bubbles) => {
    const boilingPoint = getBoilingPoint(pres);
    const state = getWaterState(temp, boilingPoint);
    const isBoiling = state === 'boiling';
    const isGas = state === 'gas';

    return (
      <div>
        <svg viewBox="0 0 400 280" className="w-full h-56">
          <defs>
            {/* Premium water gradient - deep blue with depth */}
            <linearGradient id="boilWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#1d4ed8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.9" />
            </linearGradient>

            {/* Boiling water gradient - warmer tones */}
            <linearGradient id="boilWaterBoiling" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.85" />
              <stop offset="20%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#1d4ed8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.9" />
            </linearGradient>

            {/* Steam/gas gradient */}
            <linearGradient id="boilSteamGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#bae6fd" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>

            {/* Bubble gradient with shine */}
            <radialGradient id="boilBubbleGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#bae6fd" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.3" />
            </radialGradient>

            {/* Glass beaker gradient - realistic glass effect */}
            <linearGradient id="boilGlassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#cbd5e1" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.3" />
              <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
            </linearGradient>

            {/* Burner metal gradient */}
            <linearGradient id="boilBurnerMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="70%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Heat/flame gradient */}
            <radialGradient id="boilFlameGradient" cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="25%" stopColor="#fde047" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#facc15" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Heat outer glow */}
            <radialGradient id="boilHeatGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
            </radialGradient>

            {/* Pressure gauge gradient */}
            <linearGradient id="boilGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Gauge bezel gradient */}
            <linearGradient id="boilGaugeBezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#334155" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Steam wisp gradient */}
            <linearGradient id="boilSteamWisp" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#f3f4f6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#f9fafb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Glow filter for bubbles */}
            <filter id="boilBubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat glow filter */}
            <filter id="boilHeatGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Steam glow filter */}
            <filter id="boilSteamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glass reflection filter */}
            <filter id="boilGlassShine">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Lab background gradient */}
            <linearGradient id="boilLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Gauge needle gradient */}
            <linearGradient id="boilNeedleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Premium lab background */}
          <rect width="400" height="280" fill="url(#boilLabBg)" />

          {/* Subtle grid pattern */}
          <pattern id="boilLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
          <rect width="400" height="280" fill="url(#boilLabGrid)" />

          {/* === PRESSURE GAUGE (LEFT) === */}
          <g transform="translate(20, 15)">
            {/* Gauge body */}
            <rect x="0" y="0" width="90" height="55" rx="10" fill="url(#boilGaugeGradient)" stroke="url(#boilGaugeBezel)" strokeWidth="2" />
            {/* Inner shadow */}
            <rect x="3" y="3" width="84" height="49" rx="8" fill="none" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            {/* Gauge dial arc */}
            <path d="M 20 42 A 25 25 0 0 1 70 42" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            {/* Pressure level arc */}
            <path
              d={`M 20 42 A 25 25 0 0 1 ${20 + 50 * Math.min(pres / 3, 1)} ${42 - 20 * Math.sin(Math.PI * Math.min(pres / 3, 1))}`}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle cx="45" cy="42" r="4" fill="#475569" />
            <circle cx="45" cy="42" r="2" fill="#22d3ee" />
          </g>

          {/* === TEMPERATURE GAUGE (RIGHT) === */}
          <g transform="translate(290, 15)">
            {/* Gauge body */}
            <rect x="0" y="0" width="90" height="55" rx="10" fill="url(#boilGaugeGradient)" stroke="url(#boilGaugeBezel)" strokeWidth="2" />
            <rect x="3" y="3" width="84" height="49" rx="8" fill="none" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            {/* Thermometer bar */}
            <rect x="15" y="15" width="60" height="8" rx="4" fill="#1f2937" />
            <rect x="15" y="15" width={Math.min((temp / 150) * 60, 60)} height="8" rx="4" fill={isBoiling ? '#fb923c' : '#f97316'} />
            {/* Temperature markers */}
            <line x1="15" y1="26" x2="15" y2="30" stroke="#64748b" strokeWidth="1" />
            <line x1="45" y1="26" x2="45" y2="30" stroke="#64748b" strokeWidth="1" />
            <line x1="75" y1="26" x2="75" y2="30" stroke="#64748b" strokeWidth="1" />
          </g>

          {/* === BOILING POINT DISPLAY (CENTER) === */}
          <g transform="translate(155, 15)">
            <rect x="0" y="0" width="90" height="55" rx="10" fill="url(#boilGaugeGradient)" stroke="url(#boilGaugeBezel)" strokeWidth="2" />
            <rect x="3" y="3" width="84" height="49" rx="8" fill="none" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            {/* Boiling indicator circle */}
            <circle cx="45" cy="28" r="12" fill="none" stroke={isBoiling ? '#f87171' : '#475569'} strokeWidth="2" />
            {isBoiling && (
              <circle cx="45" cy="28" r="8" fill="#f87171" opacity="0.6">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
              </circle>
            )}
          </g>

          {/* === PREMIUM GLASS BEAKER === */}
          <g>
            {/* Beaker shadow */}
            <path
              d="M 105 95 L 105 242 Q 105 262 125 262 L 275 262 Q 295 262 295 242 L 295 95"
              fill="none"
              stroke="#0f172a"
              strokeWidth="8"
              strokeOpacity="0.3"
            />

            {/* Water fill - using gradient based on state */}
            <path
              d="M 104 120 L 104 238 Q 104 258 124 258 L 276 258 Q 296 258 296 238 L 296 120 Z"
              fill={isGas ? 'url(#boilSteamGradient)' : isBoiling ? 'url(#boilWaterBoiling)' : 'url(#boilWaterGradient)'}
            />

            {/* Water surface highlight */}
            <path
              d="M 108 120 L 292 120"
              stroke="#bae6fd"
              strokeWidth="2"
              strokeOpacity={isGas ? 0.2 : 0.4}
            />

            {/* Premium bubbles with glow */}
            {currentBubbles.map(b => (
              <g key={b.id} filter="url(#boilBubbleGlow)">
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.size}
                  fill="url(#boilBubbleGradient)"
                />
                {/* Bubble highlight */}
                <circle
                  cx={b.x - b.size * 0.3}
                  cy={b.y - b.size * 0.3}
                  r={b.size * 0.25}
                  fill="white"
                  fillOpacity="0.8"
                />
              </g>
            ))}

            {/* Glass beaker outline with gradient */}
            <path
              d="M 100 90 L 100 240 Q 100 262 122 262 L 278 262 Q 300 262 300 240 L 300 90"
              fill="none"
              stroke="url(#boilGlassGradient)"
              strokeWidth="4"
              filter="url(#boilGlassShine)"
            />

            {/* Glass rim highlight */}
            <path
              d="M 100 90 L 100 95"
              stroke="#e2e8f0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
            <path
              d="M 300 90 L 300 95"
              stroke="#e2e8f0"
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />

            {/* Glass reflection line */}
            <path
              d="M 106 100 L 106 230"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.15"
            />
          </g>

          {/* === STEAM WISPS === */}
          {isBoiling && (
            <g filter="url(#boilSteamGlow)">
              <path d="M 150 85 Q 145 65 155 45 Q 160 30 150 15" fill="none" stroke="url(#boilSteamWisp)" strokeWidth="4" strokeLinecap="round">
                <animate attributeName="d" values="M 150 85 Q 145 65 155 45 Q 160 30 150 15;M 150 85 Q 155 65 145 45 Q 140 30 150 15;M 150 85 Q 145 65 155 45 Q 160 30 150 15" dur="2s" repeatCount="indefinite" />
              </path>
              <path d="M 200 85 Q 210 60 195 40 Q 185 25 200 5" fill="none" stroke="url(#boilSteamWisp)" strokeWidth="5" strokeLinecap="round">
                <animate attributeName="d" values="M 200 85 Q 210 60 195 40 Q 185 25 200 5;M 200 85 Q 190 60 205 40 Q 215 25 200 5;M 200 85 Q 210 60 195 40 Q 185 25 200 5" dur="2.5s" repeatCount="indefinite" />
              </path>
              <path d="M 250 85 Q 255 65 245 45 Q 240 30 250 15" fill="none" stroke="url(#boilSteamWisp)" strokeWidth="4" strokeLinecap="round">
                <animate attributeName="d" values="M 250 85 Q 255 65 245 45 Q 240 30 250 15;M 250 85 Q 245 65 255 45 Q 260 30 250 15;M 250 85 Q 255 65 245 45 Q 240 30 250 15" dur="1.8s" repeatCount="indefinite" />
              </path>
            </g>
          )}

          {/* === PREMIUM BURNER === */}
          <g>
            {/* Burner base with metal gradient */}
            <rect x="115" y="264" width="170" height="16" rx="4" fill="url(#boilBurnerMetal)" />
            {/* Burner top surface */}
            <rect x="115" y="264" width="170" height="3" rx="1" fill="#4b5563" />
            {/* Burner grate lines */}
            {[135, 165, 195, 225, 255].map(x => (
              <rect key={x} x={x} y="267" width="4" height="10" rx="1" fill="#1f2937" />
            ))}

            {/* Heat/Flame effect when heating */}
            {heating && (
              <g filter="url(#boilHeatGlowFilter)">
                {/* Outer heat glow */}
                <ellipse cx="200" cy="262" rx="70" ry="8" fill="url(#boilHeatGlow)">
                  <animate attributeName="opacity" values="0.5;0.8;0.5" dur="0.3s" repeatCount="indefinite" />
                </ellipse>
                {/* Main flame */}
                <ellipse cx="200" cy="262" rx="50" ry="6" fill="url(#boilFlameGradient)">
                  <animate attributeName="rx" values="50;55;50" dur="0.2s" repeatCount="indefinite" />
                </ellipse>
                {/* Inner hot core */}
                <ellipse cx="200" cy="261" rx="30" ry="3" fill="#fef9c3" fillOpacity="0.9">
                  <animate attributeName="fillOpacity" values="0.9;1;0.9" dur="0.15s" repeatCount="indefinite" />
                </ellipse>
              </g>
            )}
          </g>

          {/* === STATE INDICATOR BADGE === */}
          <g>
            <rect x="140" y="175" width="120" height="35" rx="10" fill="url(#boilGaugeGradient)" stroke={
              isBoiling ? '#fb923c' : isGas ? '#f87171' : '#60a5fa'
            } strokeWidth="2" />
            {/* Glow effect for active state */}
            {isBoiling && (
              <rect x="140" y="175" width="120" height="35" rx="10" fill="none" stroke="#fb923c" strokeWidth="1" strokeOpacity="0.5">
                <animate attributeName="strokeOpacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
              </rect>
            )}
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '-260px',
          padding: '0 20px',
          position: 'relative',
          pointerEvents: 'none'
        }}>
          {/* Pressure label */}
          <div style={{
            width: '90px',
            textAlign: 'center',
            marginTop: '25px'
          }}>
            <div style={{ fontSize: typo.label, color: colors.textSecondary, marginBottom: '2px' }}>Pressure</div>
            <div style={{ fontSize: typo.body, color: colors.primary, fontWeight: 'bold' }}>{pres.toFixed(2)} atm</div>
          </div>

          {/* Boiling point label */}
          <div style={{
            width: '90px',
            textAlign: 'center',
            marginTop: '25px'
          }}>
            <div style={{ fontSize: typo.label, color: colors.textSecondary, marginBottom: '2px' }}>Boils at</div>
            <div style={{ fontSize: typo.body, color: colors.danger, fontWeight: 'bold' }}>{boilingPoint.toFixed(0)}°C</div>
          </div>

          {/* Temperature label */}
          <div style={{
            width: '90px',
            textAlign: 'center',
            marginTop: '25px'
          }}>
            <div style={{ fontSize: typo.label, color: colors.textSecondary, marginBottom: '2px' }}>Temperature</div>
            <div style={{ fontSize: typo.body, color: colors.accent, fontWeight: 'bold' }}>{temp.toFixed(0)}°C</div>
          </div>
        </div>

        {/* State indicator label */}
        <div style={{
          position: 'relative',
          marginTop: '78px',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            display: 'inline-block',
            fontSize: typo.bodyLarge,
            fontWeight: 'bold',
            color: isBoiling ? colors.accent : isGas ? colors.danger : colors.water,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {state}
          </div>
        </div>
      </div>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHASE TRANSITIONS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Why Is Mountain Cooking So Tricky?
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how pressure controls the boiling point of water
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">
            <span className="inline-block">&#127956;&#65039;</span>
            <span className="mx-2">&#9749;</span>
            <span className="inline-block">&#10067;</span>
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Climbers on Mount Everest can't make a proper cup of tea. The water "boils"
              but the tea doesn't steep properly.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              What's going on? At Everest base camp, water boils at only 71C (160F)...
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                The answer involves pressure and phase changes!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">&#10022;</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">&#10022;</span>
          Phase Diagrams
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">&#10022;</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          If you reduce the air pressure around water, what happens to its boiling point?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          'The boiling point increases',
          'The boiling point decreases',
          'The boiling point stays the same',
          'Water can no longer boil'
        ].map((option, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setPrediction(option);
              emitEvent('prediction_made', { prediction: option });
            }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option
                ? i === 1 ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-cyan-600/40 border-2 border-cyan-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${prediction === 'The boiling point decreases' ? "text-emerald-400" : "text-cyan-400"}`}>
            {prediction === 'The boiling point decreases'
              ? "Correct! Lower pressure means water boils at lower temperatures!"
              : "Not quite - lower pressure actually decreases the boiling point!"}
          </p>
          <button
            onMouseDown={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
          >
            Test Your Prediction
          </button>
        </div>
      )}
    </div>
  );

  // Render play phase
  const renderPlay = () => {
    const boilingPoint = getBoilingPoint(pressure);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Pressure and Boiling Point</h2>
        <p className="text-slate-400 mb-6 text-center max-w-md">
          Adjust the pressure and heat the water to see how boiling point changes!
        </p>

        <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 w-full max-w-lg">
          {renderBeaker(temperature, pressure, bubbles)}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-cyan-400 font-medium mb-2">
                Pressure: {pressure.toFixed(2)} atm
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={pressure}
                onChange={(e) => {
                  setPressure(Number(e.target.value));
                  setTemperature(25);
                }}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Vacuum (0.1)</span>
                <span>Sea Level (1.0)</span>
                <span>Pressure Cooker (3.0)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
            <p className="text-slate-300 text-center">
              At <span className="text-cyan-400 font-bold">{pressure.toFixed(2)} atm</span>, water boils at{' '}
              <span className="text-orange-400 font-bold">{boilingPoint.toFixed(0)}C</span>
            </p>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onMouseDown={() => {
                playSound('click');
                setHeating(!heating);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                heating
                  ? 'bg-red-600 text-white'
                  : 'bg-orange-600 text-white'
              }`}
            >
              {heating ? '&#128293; Stop Heating' : '&#128293; Heat Water'}
            </button>
            <button
              onMouseDown={() => {
                playSound('click');
                setTemperature(25);
                setHeating(false);
              }}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg font-bold"
            >
              &#128260; Reset
            </button>
          </div>
        </div>

        <button
          onMouseDown={() => { setHeating(false); goToNextPhase(); }}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
        >
          Understand the Physics
        </button>
      </div>
    );
  };

  // Render review phase
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Why Pressure Changes Boiling Point</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Molecular Battle</h3>
          <p className="text-slate-300 text-sm">
            Boiling occurs when water molecules have enough energy to escape into the air.
            <span className="text-yellow-400 font-bold"> Higher pressure pushes back</span> on the
            surface, requiring more energy (higher temperature) to escape.
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/40 to-teal-900/40 rounded-2xl p-6 border border-cyan-600/30">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Pressure vs Temperature</h3>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <div className="text-lg mb-1">&#127956;&#65039;</div>
              <p className="text-xs text-slate-400">Everest</p>
              <p className="text-cyan-400 font-bold text-sm">0.33 atm</p>
              <p className="text-orange-400 text-sm">71C</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <div className="text-lg mb-1">&#127958;&#65039;</div>
              <p className="text-xs text-slate-400">Sea Level</p>
              <p className="text-cyan-400 font-bold text-sm">1.0 atm</p>
              <p className="text-orange-400 text-sm">100C</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <div className="text-lg mb-1">&#127858;</div>
              <p className="text-xs text-slate-400">Pressure Cooker</p>
              <p className="text-cyan-400 font-bold text-sm">2.0 atm</p>
              <p className="text-orange-400 text-sm">120C</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-2xl p-6 border border-yellow-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">&#128161; Key Insight</h3>
          <p className="text-slate-300">
            The boiling point isn't a fixed property of water - it depends on the surrounding pressure!
            The Clausius-Clapeyron equation describes this relationship mathematically.
          </p>
        </div>
      </div>

      <button
        onMouseDown={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Render twist predict phase
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Cooking Challenge</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You need to cook pasta in boiling water. At high altitude where water boils at 85C
          instead of 100C, how will cooking time change?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          'Faster - boiling is boiling',
          'About the same time',
          'Longer - the water is cooler',
          'Impossible - pasta needs 100C water'
        ].map((option, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setTwistPrediction(option);
              emitEvent('twist_prediction_made', { prediction: option });
            }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option
                ? i === 2 ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-purple-600/40 border-2 border-purple-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${twistPrediction === 'Longer - the water is cooler' ? "text-emerald-400" : "text-amber-400"}`}>
            {twistPrediction === 'Longer - the water is cooler'
              ? "Correct! Lower boiling point means cooler water, so cooking takes longer!"
              : "Not quite - the cooler water temperature means longer cooking time!"}
          </p>
          <button
            onMouseDown={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            See the Difference
          </button>
        </div>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => {
    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Altitude Cooking Comparison</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 w-full max-w-lg">
          <div className="flex justify-center gap-2 mb-6">
            {(['sea', 'denver', 'everest'] as const).map(loc => (
              <button
                key={loc}
                onMouseDown={() => {
                  playSound('click');
                  setTwistLocation(loc);
                  setTwistTemp(25);
                  setTwistHeating(false);
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  twistLocation === loc
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {loc === 'sea' ? '&#127958;&#65039; Sea Level' : loc === 'denver' ? '&#127961;&#65039; Denver' : '&#127956;&#65039; Everest'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Altitude</p>
              <p className="text-white font-bold">
                {twistLocation === 'sea' ? '0m' : twistLocation === 'denver' ? '1,600m' : '5,400m'}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Pressure</p>
              <p className="text-cyan-400 font-bold">{twistPressure.toFixed(2)} atm</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Boils at</p>
              <p className="text-orange-400 font-bold">{boilingPoint.toFixed(0)}C</p>
            </div>
          </div>

          <div className="h-32 bg-slate-900/50 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {twistTemp >= boilingPoint ? '&#128168;' : '&#129749;'}
              </div>
              <p className={`font-bold ${twistTemp >= boilingPoint ? 'text-orange-400' : 'text-blue-400'}`}>
                {twistTemp.toFixed(0)}C
              </p>
              <p className="text-slate-400 text-sm">
                {twistTemp >= boilingPoint ? 'BOILING!' : 'Heating...'}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onMouseDown={() => {
                playSound('click');
                setTwistHeating(!twistHeating);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                twistHeating ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
              }`}
            >
              {twistHeating ? '&#9632; Stop' : '&#128293; Heat'}
            </button>
          </div>

          {twistTemp >= boilingPoint && (
            <div className={`mt-4 p-4 rounded-lg border ${
              twistLocation === 'everest'
                ? 'bg-yellow-900/30 border-yellow-600'
                : twistLocation === 'denver'
                  ? 'bg-orange-900/30 border-orange-600'
                  : 'bg-emerald-900/30 border-emerald-600'
            }`}>
              <p className={`text-center ${
                twistLocation === 'everest'
                  ? 'text-yellow-300'
                  : twistLocation === 'denver'
                    ? 'text-orange-300'
                    : 'text-emerald-300'
              }`}>
                {twistLocation === 'everest'
                  ? '&#9888;&#65039; Water boiling at only 71C - pasta will take 50% longer!'
                  : twistLocation === 'denver'
                    ? '&#9888;&#65039; Water at 95C - add ~20% more cooking time'
                    : '&#10003; Perfect 100C for standard cooking times'}
              </p>
            </div>
          )}
        </div>

        <button
          onMouseDown={() => { setTwistHeating(false); goToNextPhase(); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
        >
          Understand the Impact
        </button>
      </div>
    );
  };

  // Render twist review phase
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Cooking Temperature Matters!</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 rounded-2xl p-6 border border-orange-600/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">The Temperature-Time Tradeoff</h3>
          <p className="text-slate-300 text-sm">
            Cooking speed depends on <span className="text-yellow-400 font-bold">temperature, not just boiling</span>.
            At lower boiling points, chemical reactions in food happen slower -
            so cooking takes longer even though the water is "boiling."
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-900/40 to-pink-900/40 rounded-2xl p-6 border border-red-600/30">
          <h4 className="text-lg font-bold text-red-400 mb-2">High Altitude Problems</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Pasta undercooked despite boiling</li>
            <li>Eggs take longer to hardboil</li>
            <li>Baked goods rise too fast, then collapse</li>
            <li>Beans may never fully soften</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Pressure Cooker Solution</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Raises boiling point to 120C</li>
            <li>Beans in 20 min (vs 2 hours)</li>
            <li>Tough meats become tender fast</li>
            <li>Works at any altitude!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-2xl p-6 border border-yellow-600/30">
          <p className="text-yellow-300 text-sm">
            &#128161; <strong>Fun Fact:</strong> On Mars (0.006 atm), water would boil at body temperature!
            Astronauts will need pressure cookers - or they'll eat very undercooked food.
          </p>
        </div>
      </div>

      <button
        onMouseDown={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        See Real Applications
      </button>
    </div>
  );

  // Render transfer phase
  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-slate-400 text-center mb-6">Explore how pressure affects phase changes</p>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, i]));
              emitEvent('explore_app', { app: app.title });
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              completedApps.has(i)
                ? 'bg-emerald-900/30 border-2 border-emerald-600'
                : 'bg-slate-800/50 border-2 border-slate-700 hover:border-blue-500'
            }`}
          >
            <div className="text-3xl mb-2">
              {app.icon === 'pot' && '&#127858;'}
              {app.icon === 'mountain' && '&#127956;&#65039;'}
              {app.icon === 'beaker' && '&#9879;&#65039;'}
              {app.icon === 'geyser' && '&#128168;'}
            </div>
            <h3 className="text-white font-bold mb-1">{app.title}</h3>
            <p className="text-slate-400 text-sm">{app.description}</p>
            {completedApps.has(i) && (
              <div className="mt-2 text-emerald-400 text-sm">&#10003; Explored</div>
            )}
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={() => { playSound('complete'); goToNextPhase(); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          Take the Test
        </button>
      )}

      {completedApps.size < 4 && (
        <p className="mt-6 text-center text-slate-500">
          Explore all {4 - completedApps.size} remaining applications to continue
        </p>
      )}
    </div>
  );

  // Render test phase
  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= TEST_QUESTIONS.length;

    if (isComplete) {
      const score = testAnswers.reduce(
        (acc, answer, i) => acc + (TEST_QUESTIONS[i].options[answer]?.correct ? 1 : 0),
        0
      );
      const passed = score >= 3;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Test Complete!</h2>
          <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <p className="text-slate-300 mb-6">
            {passed ? 'Excellent understanding of pressure and phase changes!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={() => {
              if (passed) {
                playSound('complete');
                goToNextPhase();
              } else {
                playSound('click');
                setTestAnswers([]);
              }
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg ${
              passed
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
            }`}
          >
            {passed ? 'Complete Lesson' : 'Try Again'}
          </button>
        </div>
      );
    }

    const question = TEST_QUESTIONS[currentQuestion];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Check</h2>
        <div className="flex justify-center gap-2 mb-6">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentQuestion
                  ? TEST_QUESTIONS[i].options[testAnswers[i]]?.correct
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                  : i === currentQuestion
                    ? 'bg-blue-500'
                    : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-xl w-full">
          <p className="text-white text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  playSound(option.correct ? 'success' : 'failure');
                  setTestAnswers([...testAnswers, i]);
                  emitEvent('test_answer', {
                    questionIndex: currentQuestion,
                    correct: option.correct
                  });
                }}
                className="w-full p-4 bg-slate-700/50 text-slate-300 rounded-xl text-left hover:bg-slate-600/50 transition-all"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render mastery phase
  const renderMastery = () => {
    if (!showConfetti) {
      setShowConfetti(true);
      playSound('complete');
      emitEvent('mastery_achieved', {});
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center relative">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  fontSize: `${12 + Math.random() * 12}px`,
                }}
              >
                {["&#127858;", "&#127956;&#65039;", "&#128168;", "&#11088;", "&#10024;"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="relative bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl border border-cyan-600/30">
          <div className="text-8xl mb-6">&#127942;</div>
          <h1 className="text-3xl font-bold text-white mb-4">Phase Diagram Master!</h1>

          <p className="text-xl text-slate-300 mb-6">You've mastered pressure and phase changes!</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#127958;&#65039;</div>
              <p className="text-sm text-slate-300">Pressure-boiling point</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#127956;&#65039;</div>
              <p className="text-sm text-slate-300">Altitude effects</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128200;</div>
              <p className="text-sm text-slate-300">Phase diagrams</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#127858;</div>
              <p className="text-sm text-slate-300">Pressure cooker physics</p>
            </div>
          </div>

          <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-600/30 mb-6">
            <p className="text-blue-300">
              &#127777;&#65039; Key Insight: Boiling point isn't fixed - it's a battle between molecular escape energy and atmospheric pressure!
            </p>
          </div>

          {onBack && (
            <button
              onMouseDown={onBack}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
            >
              Back to Games
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render
  const renderPhase = () => {
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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Boiling Point Physics</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, i) => {
              const currentIndex = PHASE_ORDER.indexOf(phase);
              return (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase === p
                      ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                      : currentIndex > i
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-700 w-2 hover:bg-slate-600'
                  }`}
                  title={phaseLabels[p]}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
