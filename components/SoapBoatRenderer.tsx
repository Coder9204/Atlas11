import React, { useState, useRef, useEffect } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '🧹',
    title: 'Detergents & Cleaning Products',
    short: 'Surfactants break surface tension to lift away dirt and grease',
    tagline: 'The chemistry of clean',
    description: 'All modern cleaning products rely on surfactants that reduce water\'s surface tension. This allows water to spread and penetrate fabrics, lift oils from surfaces, and suspend dirt particles for rinsing away.',
    connection: 'The soap boat demonstrates how reducing surface tension creates forces. Detergents use the same principle - surfactant molecules disrupt water\'s cohesive forces, allowing it to wet surfaces it would normally bead up on.',
    howItWorks: 'Surfactant molecules have water-loving (hydrophilic) heads and water-fearing (hydrophobic) tails. At surfaces, they orient with tails outward, reducing surface tension. In water, they form micelles that trap oil droplets for removal.',
    stats: [
      { value: '$150B', label: 'Global cleaning products market', icon: '🧴' },
      { value: '300%', label: 'Surface area increase when spread', icon: '📊' },
      { value: '50M tons', label: 'Surfactants produced yearly', icon: '🏭' }
    ],
    examples: ['Laundry detergent', 'Dish soap', 'Industrial degreasers', 'Hand sanitizers'],
    companies: ['P&G', 'Unilever', 'Henkel', 'Ecolab'],
    futureImpact: 'Bio-based surfactants and enzyme-enhanced cleaners are making products more effective while reducing environmental impact and water usage.',
    color: '#3B82F6'
  },
  {
    icon: '🫧',
    title: 'Lung Surfactant Medicine',
    short: 'Life-saving treatment reduces surface tension in premature infant lungs',
    tagline: 'Every breath easier',
    description: 'Premature babies often lack pulmonary surfactant, making breathing nearly impossible. Their alveoli collapse due to high surface tension. Artificial surfactant therapy has saved millions of lives since the 1980s.',
    connection: 'Just as soap reduces water\'s surface tension to propel the boat, lung surfactant reduces the surface tension in tiny alveoli, preventing them from collapsing and allowing gas exchange with minimal breathing effort.',
    howItWorks: 'Natural lung surfactant is 90% lipids and 10% proteins. It forms a monolayer at the air-water interface in alveoli, dramatically reducing surface tension from 70 to near 0 mN/m during exhalation, preventing collapse.',
    stats: [
      { value: '15M', label: 'Preterm births yearly', icon: '👶' },
      { value: '80%', label: 'Survival improvement', icon: '💚' },
      { value: '$2B', label: 'Surfactant therapy market', icon: '💊' }
    ],
    examples: ['Neonatal intensive care', 'ARDS treatment', 'Respiratory therapy', 'COVID-19 treatment research'],
    companies: ['AbbVie', 'Chiesi', 'ONY Biotech', 'Discovery Labs'],
    futureImpact: 'Synthetic surfactants and aerosol delivery methods are expanding treatment to adult respiratory distress and enabling targeted drug delivery to the lungs.',
    color: '#10B981'
  },
  {
    icon: '🌊',
    title: 'Oil Spill Remediation',
    short: 'Dispersants use surface tension science to break up oil slicks',
    tagline: 'Cleaning our oceans',
    description: 'When oil spills occur, dispersants are used to break thick slicks into tiny droplets that microbes can consume. These chemicals work by dramatically reducing the oil-water interfacial tension.',
    connection: 'The Marangoni effect that propels the soap boat is related to how dispersants work - creating surface tension gradients that break apart and spread oil into manageable droplets throughout the water column.',
    howItWorks: 'Dispersant surfactants concentrate at the oil-water interface, reducing tension from ~20 to ~1 mN/m. Wave energy then breaks the slick into microdroplets (<100μm) that disperse naturally and are biodegraded by marine bacteria.',
    stats: [
      { value: '7M gal', label: 'Dispersants used in BP spill', icon: '🛢️' },
      { value: '1000x', label: 'Faster biodegradation', icon: '⚡' },
      { value: '$1B+', label: 'Spill response industry', icon: '🚢' }
    ],
    examples: ['Deepwater Horizon response', 'Ship spill cleanup', 'Refinery accidents', 'Pipeline leaks'],
    companies: ['Nalco', 'COREXIT', 'Oil Spill Response', 'DESMI'],
    futureImpact: 'Biodegradable dispersants and oil-eating bacteria are making spill response more effective and environmentally friendly.',
    color: '#F59E0B'
  },
  {
    icon: '🦟',
    title: 'Insect Water Walking',
    short: 'Water striders and other insects exploit surface tension to walk on water',
    tagline: 'Nature\'s surface science',
    description: 'Water striders can walk on water because their legs are covered in microscopic hydrophobic hairs that prevent water penetration. They push down without breaking through, using surface tension as their floor.',
    connection: 'The soap boat shows what happens when surface tension is disrupted - movement occurs. Water striders work the opposite way - they carefully avoid breaking surface tension while using it to support their weight.',
    howItWorks: 'Strider legs have thousands of tiny grooved hairs coated in waxy secretions. These trap air and create a superhydrophobic surface. Each leg can support 15 times the insect\'s weight before breaking through the water surface.',
    stats: [
      { value: '15x', label: 'Body weight supported per leg', icon: '🦵' },
      { value: '100 cm/s', label: 'Walking speed on water', icon: '💨' },
      { value: '4M', label: 'Years of evolution', icon: '🧬' }
    ],
    examples: ['Water striders', 'Fishing spiders', 'Some ant species', 'Biomimetic robots'],
    companies: ['MIT Robotics', 'Harvard Microrobotics', 'Seoul National University', 'KAIST'],
    futureImpact: 'Bio-inspired water-walking robots could monitor water quality, perform search and rescue, and explore environments inaccessible to conventional craft.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────
// SoapBoatRenderer – Teach surface tension propulsion
// ─────────────────────────────────────────────────────────────
// Physics: Soap reduces surface tension, creating force imbalance
// Marangoni effect: Flow from low to high surface tension regions
// Water surface tension ≈ 0.072 N/m; soap reduces it significantly

// Game event types for analytics and progress tracking
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface SoapBoatRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

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

const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

function isValidPhase(p: string): p is Phase {
  return phaseOrder.includes(p as Phase);
}

const playSound = (soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete' = 'click') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; dur: number; type: OscillatorType; vol: number }> = {
      click: { freq: 330, dur: 0.1, type: 'sine', vol: 0.2 },
      success: { freq: 523, dur: 0.3, type: 'sine', vol: 0.3 },
      failure: { freq: 220, dur: 0.3, type: 'sine', vol: 0.3 },
      transition: { freq: 440, dur: 0.15, type: 'sine', vol: 0.2 },
      complete: { freq: 660, dur: 0.4, type: 'sine', vol: 0.3 }
    };
    const sound = sounds[soundType];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(sound.vol, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.dur);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.dur);
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SoapBoatRenderer({
  onGameEvent,
  gamePhase
}: SoapBoatRendererProps) {
  // Phase state - use gamePhase from props if valid, otherwise default to 'hook'
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  });

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeApp, setActiveApp] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [boatPosition, setBoatPosition] = useState(50); // x position
  const [boatVelocity, setBoatVelocity] = useState(0);
  const [soapAdded, setSoapAdded] = useState(false);
  const [soapSpread, setSoapSpread] = useState(0); // 0-100%
  const [waterContaminated, setWaterContaminated] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Interactive controls
  const [soapConcentration, setSoapConcentration] = useState(50); // % strength
  const [waterTemperature, setWaterTemperature] = useState(20); // Celsius
  const [boatMass, setBoatMass] = useState(5); // grams
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(true);

  // Twist state - different liquids
  const [liquidType, setLiquidType] = useState<'water' | 'soapyWater' | 'oil'>('water');
  const [twistBoatPosition, setTwistBoatPosition] = useState(50);
  const [twistSoapAdded, setTwistSoapAdded] = useState(false);
  const [twistAnimating, setTwistAnimating] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM DESIGN SYSTEM (matches WaveParticleDuality template)
  // ─────────────────────────────────────────────────────────────────────────
  const colors = {
    primary: '#06b6d4',       // cyan-500 (water theme)
    primaryDark: '#0891b2',   // cyan-600
    accent: '#a855f7',        // purple-500
    secondary: '#8b5cf6',     // violet-500
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
    elementGap: isMobile ? '8px' : '12px'
  };

  const goToPhase = (newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    setPhase(newPhase);
    onGameEvent?.({
      type: 'phase_change',
      data: { from: phase, to: newPhase }
    });
    playSound('transition');
  };

  // Surface tension values (N/m)
  const surfaceTensions: Record<string, number> = {
    water: 0.072,
    soapyWater: 0.025,
    oil: 0.032
  };

  // Calculate effective surface tension based on temperature
  const getEffectiveSurfaceTension = (base: number, temp: number) => {
    // Surface tension decreases with temperature (about 0.15% per degree C)
    const tempFactor = 1 - (temp - 20) * 0.0015;
    return base * Math.max(0.5, tempFactor);
  };

  // Calculate soap effectiveness based on concentration
  const getSoapReduction = () => {
    // Higher concentration = more reduction in surface tension
    return (soapConcentration / 100) * 0.65; // Max 65% reduction at 100%
  };

  // Add soap and animate boat
  const addSoap = () => {
    if (animating || soapAdded || waterContaminated) return;
    setSoapAdded(true);
    setAnimating(true);

    playSound('transition');

    // Soap spreads and boat accelerates
    let spread = 0;
    let pos = boatPosition;
    let vel = 0;

    const baseTension = getEffectiveSurfaceTension(surfaceTensions.water, waterTemperature);
    const soapReduction = getSoapReduction();
    const massEffect = 5 / boatMass; // Lighter boats move faster

    const interval = setInterval(() => {
      spread += 3 * (soapConcentration / 50); // Higher concentration spreads faster
      setSoapSpread(Math.min(spread, 100));

      // Force from surface tension difference
      if (spread < 80) {
        const tensionFront = baseTension;
        const tensionBack = baseTension * (1 - (spread / 100) * soapReduction);
        const force = (tensionFront - tensionBack) * 0.5 * massEffect;
        vel += force * 50;
      }

      // Drag slows boat
      vel *= 0.98;
      pos += vel;

      setBoatVelocity(vel);
      setBoatPosition(Math.min(Math.max(pos, 10), 350));

      if (spread >= 100) {
        clearInterval(interval);
        setWaterContaminated(true);
        setAnimating(false);
      }
    }, 50);
  };

  const resetSimulation = () => {
    setBoatPosition(50);
    setBoatVelocity(0);
    setSoapAdded(false);
    setSoapSpread(0);
    setWaterContaminated(false);
    setAnimating(false);
  };

  // Twist simulation
  const addTwistSoap = () => {
    if (twistAnimating || twistSoapAdded) return;
    setTwistSoapAdded(true);
    setTwistAnimating(true);

    playSound('transition');

    let pos = twistBoatPosition;
    let vel = 0;
    let steps = 0;

    const interval = setInterval(() => {
      steps++;

      // Different behavior based on liquid
      if (liquidType === 'water') {
        // Normal movement
        if (steps < 40) {
          vel += 0.3;
        }
        vel *= 0.97;
      } else if (liquidType === 'soapyWater') {
        // Already low surface tension, soap has minimal effect
        vel *= 0.99;
      } else if (liquidType === 'oil') {
        // Oil has different surface chemistry, soap doesn't work well
        vel += 0.02;
        vel *= 0.98;
      }

      pos += vel;
      setTwistBoatPosition(Math.min(Math.max(pos, 10), 350));

      if (steps >= 60) {
        clearInterval(interval);
        setTwistAnimating(false);
      }
    }, 50);
  };

  const resetTwistSimulation = () => {
    setTwistBoatPosition(50);
    setTwistSoapAdded(false);
    setTwistAnimating(false);
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    playSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    playSound('click');
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playSound('click');
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
        return acc + 1;
      }
      return acc;
    }, 0);
    onGameEvent?.({
      type: 'test_completed',
      data: { score, total: testQuestions.length }
    });
    if (score >= 7) {
      playSound('success');
    } else {
      playSound('failure');
    }
  };

  const testQuestions = [
    {
      question: "What is surface tension?",
      options: [
        { text: "Pressure inside a liquid", correct: false },
        { text: "Cohesive forces at the liquid surface", correct: true },
        { text: "Temperature of the surface layer", correct: false },
        { text: "Density variation at the surface", correct: false }
      ],
    },
    {
      question: "Why does a soap boat move forward when soap is added behind it?",
      options: [
        { text: "Soap pushes the boat", correct: false },
        { text: "Chemical reaction propels it", correct: false },
        { text: "Surface tension imbalance creates net force", correct: true },
        { text: "Soap is lighter than water", correct: false }
      ],
    },
    {
      question: "What happens if you try the soap boat experiment a second time in the same water?",
      options: [
        { text: "It works faster", correct: false },
        { text: "It doesn't work well - water is contaminated", correct: true },
        { text: "The boat sinks", correct: false },
        { text: "It works the same", correct: false }
      ],
    },
    {
      question: "What is the Marangoni effect?",
      options: [
        { text: "Soap dissolving in water", correct: false },
        { text: "Flow caused by surface tension gradients", correct: true },
        { text: "Evaporation from liquid surfaces", correct: false },
        { text: "Density-driven convection", correct: false }
      ],
    },
    {
      question: "What is the approximate surface tension of water at room temperature?",
      options: [
        { text: "0.0072 N/m", correct: false },
        { text: "0.072 N/m", correct: true },
        { text: "0.72 N/m", correct: false },
        { text: "7.2 N/m", correct: false }
      ],
    },
    {
      question: "How do surfactants (soaps) reduce surface tension?",
      options: [
        { text: "By increasing water temperature", correct: false },
        { text: "By breaking hydrogen bonds between water molecules", correct: true },
        { text: "By making water denser", correct: false },
        { text: "By adding pressure to the surface", correct: false }
      ],
    },
    {
      question: "Why does the soap boat work better with dish soap than with oil?",
      options: [
        { text: "Dish soap is heavier", correct: false },
        { text: "Dish soap is a surfactant that drastically lowers water's surface tension", correct: true },
        { text: "Oil floats on water", correct: false },
        { text: "Dish soap creates bubbles", correct: false }
      ],
    },
    {
      question: "What would happen if you tried the soap boat on mercury instead of water?",
      options: [
        { text: "Work the same way", correct: false },
        { text: "Work much better due to mercury's high surface tension", correct: false },
        { text: "Not work well - soap doesn't reduce mercury's surface tension", correct: true },
        { text: "The boat would sink", correct: false }
      ],
    },
    {
      question: "In the 'tears of wine' phenomenon, what causes the wine to climb the glass?",
      options: [
        { text: "Wine evaporates from the glass edge", correct: false },
        { text: "Alcohol evaporation creates surface tension gradients (Marangoni effect)", correct: true },
        { text: "Glass absorbs wine", correct: false },
        { text: "Wine is attracted to glass by static electricity", correct: false }
      ],
    },
    {
      question: "What shape does a soap film naturally form and why?",
      options: [
        { text: "Flat, due to gravity", correct: false },
        { text: "Spherical, because surface tension minimizes surface area", correct: true },
        { text: "Cubic, due to molecular structure", correct: false },
        { text: "Random shapes", correct: false }
      ],
    }
  ];

  const applications = [
    {
      title: "Insect Locomotion",
      description: "Water striders walking on water",
      detail: "Water striders can walk because their legs are coated with hydrophobic hairs. They use asymmetric leg movements to create surface tension gradients for propulsion.",
      icon: "🦟"
    },
    {
      title: "Lung Surfactant",
      description: "Breathing made possible",
      detail: "Pulmonary surfactant reduces surface tension in lung alveoli, preventing collapse. Premature babies lacking this surfactant develop respiratory distress syndrome.",
      icon: "🫁"
    },
    {
      title: "Tears of Wine",
      description: "Wine climbing the glass",
      detail: "Alcohol evaporating from wine creates surface tension gradients (Marangoni flow). Higher surface tension at the top pulls wine upward, forming 'tears' that roll back down.",
      icon: "🍷"
    },
    {
      title: "Self-Cleaning Surfaces",
      description: "Lotus leaf effect applications",
      detail: "Superhydrophobic surfaces manipulate surface tension to make water bead up and roll off, carrying dirt away. Used in self-cleaning glass and fabrics.",
      icon: "🌿"
    }
  ];

  const renderPhase = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────
      // HOOK
      // ───────────────────────────────────────────────────
      case 'hook':
        return (
          <div className="flex flex-col items-center" style={{ gap: '20px' }}>
            {/* Premium Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '9999px',
              marginBottom: '16px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                background: '#3b82f6',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
            </div>
            {/* Gradient Title */}
            <h1 style={{
              fontSize: '32px',
              marginBottom: '0.5rem',
              background: 'linear-gradient(to right, #f8fafc, #60a5fa, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800
            }}>
              The Soap-Powered Boat
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500, lineHeight: 1.6 }}>
              Can you power a boat with nothing but a tiny drop of soap?
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              <defs>
                {/* Premium water gradient with depth */}
                <linearGradient id="soapHookWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7dd3fc" />
                  <stop offset="25%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0ea5e9" />
                  <stop offset="75%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>

                {/* Water surface shimmer */}
                <linearGradient id="soapHookSurfaceShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.3" />
                  <stop offset="25%" stopColor="#bae6fd" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.8" />
                  <stop offset="75%" stopColor="#bae6fd" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.3" />
                </linearGradient>

                {/* Boat hull gradient for 3D effect */}
                <linearGradient id="soapHookHullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a16207" />
                  <stop offset="30%" stopColor="#854d0e" />
                  <stop offset="70%" stopColor="#713f12" />
                  <stop offset="100%" stopColor="#422006" />
                </linearGradient>

                {/* Boat deck gradient */}
                <linearGradient id="soapHookDeckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ca8a04" />
                  <stop offset="50%" stopColor="#a16207" />
                  <stop offset="100%" stopColor="#854d0e" />
                </linearGradient>

                {/* Soap drop gradient */}
                <radialGradient id="soapHookSoapGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#d8b4fe" />
                  <stop offset="40%" stopColor="#a855f7" />
                  <stop offset="80%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </radialGradient>

                {/* Motion glow filter */}
                <filter id="soapHookMotionGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Water ripple glow */}
                <filter id="soapHookRippleGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Water body with premium gradient */}
              <rect x="20" y="120" width="360" height="110" fill="url(#soapHookWaterGrad)" rx="8" />

              {/* Water surface shimmer overlay */}
              <ellipse cx="200" cy="125" rx="175" ry="8" fill="url(#soapHookSurfaceShimmer)">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
              </ellipse>

              {/* Surface ripples with glow */}
              {[0, 1, 2].map(i => (
                <ellipse
                  key={i}
                  cx="200"
                  cy="120"
                  rx={50 + i * 40}
                  ry={5 + i * 2}
                  fill="none"
                  stroke="#7dd3fc"
                  strokeWidth="1.5"
                  opacity={0.6 - i * 0.15}
                  filter="url(#soapHookRippleGlow)"
                >
                  <animate
                    attributeName="rx"
                    values={`${50 + i * 40};${70 + i * 40};${50 + i * 40}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              ))}

              {/* Boat with 3D appearance */}
              <g transform="translate(100, 100)">
                {/* Hull shadow */}
                <path
                  d="M 2,22 L 12,37 L 62,37 L 72,22 L 2,22"
                  fill="#1e293b"
                  opacity="0.3"
                />
                {/* Hull with gradient */}
                <path
                  d="M 0,20 L 10,35 L 60,35 L 70,20 L 0,20"
                  fill="url(#soapHookHullGrad)"
                  stroke="#422006"
                  strokeWidth="1.5"
                />
                {/* Hull highlight */}
                <path
                  d="M 5,22 L 12,32 L 58,32 L 65,22"
                  fill="none"
                  stroke="#ca8a04"
                  strokeWidth="1"
                  opacity="0.4"
                />
                {/* Deck with gradient */}
                <rect x="5" y="10" width="60" height="12" fill="url(#soapHookDeckGrad)" stroke="#713f12" strokeWidth="1" rx="2" />
                {/* Deck highlight */}
                <rect x="8" y="12" width="54" height="3" fill="#fbbf24" opacity="0.3" rx="1" />

                {/* Motion lines with glow */}
                <g filter="url(#soapHookMotionGlow)">
                  <line x1="75" y1="25" x2="95" y2="25" stroke="#4ade80" strokeWidth="3" strokeLinecap="round">
                    <animate attributeName="x2" values="95;110;95" dur="0.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="0.5s" repeatCount="indefinite" />
                  </line>
                  <line x1="75" y1="18" x2="90" y2="15" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                    <animate attributeName="x2" values="90;100;90" dur="0.5s" repeatCount="indefinite" />
                  </line>
                  <line x1="75" y1="32" x2="90" y2="35" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                    <animate attributeName="x2" values="90;100;90" dur="0.5s" repeatCount="indefinite" />
                  </line>
                </g>

                {/* Soap drop with premium gradient and glow */}
                <circle cx="-10" cy="25" r="10" fill="url(#soapHookSoapGrad)" filter="url(#soapHookMotionGlow)">
                  <animate attributeName="r" values="9;11;9" dur="1s" repeatCount="indefinite" />
                </circle>
                {/* Soap highlight */}
                <circle cx="-13" cy="22" r="3" fill="#f0abfc" opacity="0.6" />
              </g>
            </svg>

            {/* Labels moved outside SVG using typo system */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <p style={{
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                color: colors.textPrimary,
                marginBottom: '0.5rem'
              }}>
                A tiny soap drop makes the boat zoom!
              </p>
              <p style={{ fontSize: typo.body, color: colors.textSecondary }}>
                No motor, no wind, no paddle...
              </p>
              <p style={{ fontSize: typo.body, color: colors.primary }}>
                Just surface tension!
              </p>
            </div>

            <button
              onPointerDown={() => goToPhase('predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              Discover the Secret
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // PREDICT
      // ───────────────────────────────────────────────────
      case 'predict':
        return (
          <div className="flex flex-col items-center" style={{ gap: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Make Your Prediction
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              A small paper boat floats on water. When you add a drop of dish soap
              behind the boat, what happens?
            </p>

            <svg viewBox="0 0 400 140" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              <defs>
                {/* Water gradient */}
                <linearGradient id="soapPredictWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="40%" stopColor="#3b82f6" />
                  <stop offset="70%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>

                {/* Water surface highlight */}
                <linearGradient id="soapPredictSurface" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.2" />
                </linearGradient>

                {/* Boat hull gradient */}
                <linearGradient id="soapPredictHull" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a16207" />
                  <stop offset="50%" stopColor="#854d0e" />
                  <stop offset="100%" stopColor="#713f12" />
                </linearGradient>

                {/* Boat deck gradient */}
                <linearGradient id="soapPredictDeck" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#a16207" />
                </linearGradient>

                {/* Soap gradient */}
                <radialGradient id="soapPredictSoap" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#d8b4fe" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </radialGradient>

                {/* Soap glow filter */}
                <filter id="soapPredictGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow marker */}
                <marker id="soapPredictArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Water with gradient */}
              <rect x="20" y="70" width="360" height="50" fill="url(#soapPredictWater)" rx="6" />

              {/* Surface shimmer */}
              <ellipse cx="200" cy="72" rx="175" ry="4" fill="url(#soapPredictSurface)" />

              {/* Boat with 3D appearance */}
              <g transform="translate(180, 55)">
                {/* Hull shadow */}
                <path d="M 2,17 L 10,27 L 44,27 L 52,17" fill="#1e293b" opacity="0.3" />
                {/* Hull */}
                <path d="M 0,15 L 8,25 L 42,25 L 50,15 L 0,15" fill="url(#soapPredictHull)" stroke="#422006" strokeWidth="1.5" />
                {/* Hull highlight */}
                <path d="M 5,17 L 11,23 L 39,23 L 45,17" fill="none" stroke="#ca8a04" strokeWidth="0.5" opacity="0.5" />
                {/* Deck */}
                <rect x="5" y="7" width="40" height="10" fill="url(#soapPredictDeck)" stroke="#713f12" strokeWidth="1" rx="2" />
                {/* Deck highlight */}
                <rect x="7" y="9" width="36" height="2" fill="#fbbf24" opacity="0.3" rx="1" />
              </g>

              {/* Soap drop with gradient and glow */}
              <circle cx="120" cy="80" r="12" fill="url(#soapPredictSoap)" filter="url(#soapPredictGlow)">
                <animate attributeName="r" values="11;13;11" dur="1.5s" repeatCount="indefinite" />
              </circle>
              {/* Soap highlight */}
              <circle cx="115" cy="75" r="3" fill="#f0abfc" opacity="0.6" />

              {/* Question mark with glow */}
              <text x="330" y="90" fill={colors.accent} fontSize="28" fontWeight="bold" filter="url(#soapPredictGlow)">?</text>

              {/* Arrow */}
              <path d="M 145,80 L 170,80" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" markerEnd="url(#soapPredictArrow)" />
            </svg>

            {/* Label moved outside SVG */}
            <p style={{
              textAlign: 'center',
              fontSize: typo.small,
              color: colors.textMuted,
              marginBottom: '1rem'
            }}>
              Soap added behind the boat...
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Boat moves backward (toward the soap)' },
                { id: 'b', text: 'Boat moves forward (away from soap)' },
                { id: 'c', text: 'Boat stays still (soap has no effect)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onPointerDown={() => handlePrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: prediction === opt.id ? '#3b82f6' : 'white',
                    color: prediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${prediction === opt.id ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onPointerDown={() => goToPhase('play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // PLAY
      // ───────────────────────────────────────────────────
      case 'play':
        const currentTension = getEffectiveSurfaceTension(surfaceTensions.water, waterTemperature);
        const reducedTension = currentTension * (1 - getSoapReduction());

        return (
          <div className="flex flex-col items-center" style={{ gap: '20px' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f8fafc', fontWeight: 700 }}>
              Soap Boat Experiment
            </h1>
            <p style={{ color: '#cbd5e1', marginBottom: '0.5rem', textAlign: 'center', lineHeight: 1.6 }}>
              <strong>This visualization demonstrates</strong> how a surface tension gradient propels a boat.
              When soap reduces surface tension behind the boat, the higher tension in front creates
              a net force that pulls the boat forward - the <strong>Marangoni effect</strong>.
            </p>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', lineHeight: 1.5 }}>
              <strong>Why this matters:</strong> This same principle powers lung surfactants that save premature infants,
              cleaning products that remove grease, and biomimetic water-walking robots.
            </p>

            {/* Formula display */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 12,
              padding: '12px',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Driving Force</div>
              <div style={{ fontSize: '1.1rem', color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                F = Δγ × L
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
                Force = (surface tension difference) × (boat width)
              </div>
            </div>

            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', lineHeight: 1.5 }}>
              <strong>How sliders affect motion:</strong> Higher soap concentration creates a bigger tension difference (more force).
              Warmer water lowers base tension. Lighter boats accelerate faster for the same force.
            </p>

            {/* Interactive Controls Panel */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              width: '100%',
              maxWidth: 450,
              border: '1px solid rgba(71, 85, 105, 0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>⚙️ Experiment Controls</h4>
                <button
                  onClick={() => setShowPhysicsPanel(!showPhysicsPanel)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {showPhysicsPanel ? 'Hide' : 'Show'}
                </button>
              </div>

              {showPhysicsPanel && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Soap Concentration Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Soap Concentration</span>
                      <span style={{ color: '#a855f7', fontFamily: 'monospace' }}>{soapConcentration}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={soapConcentration}
                      onInput={(e) => setSoapConcentration(parseInt((e.target as HTMLInputElement).value))}
                      onChange={(e) => setSoapConcentration(parseInt(e.target.value))}
                      disabled={soapAdded}
                      style={{ width: '100%', accentColor: '#3b82f6', touchAction: 'pan-y', height: '20px', WebkitAppearance: 'none' as const }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>Weak (10%)</span>
                      <span>Strong (100%)</span>
                    </div>
                  </div>

                  {/* Water Temperature Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Water Temperature</span>
                      <span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>{waterTemperature}°C</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={waterTemperature}
                      onInput={(e) => setWaterTemperature(parseInt((e.target as HTMLInputElement).value))}
                      onChange={(e) => setWaterTemperature(parseInt(e.target.value))}
                      disabled={soapAdded}
                      style={{ width: '100%', accentColor: '#3b82f6', touchAction: 'pan-y', height: '20px', WebkitAppearance: 'none' as const }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>Cold (5°C)</span>
                      <span>Hot (60°C)</span>
                    </div>
                  </div>

                  {/* Boat Mass Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Boat Mass</span>
                      <span style={{ color: '#22c55e', fontFamily: 'monospace' }}>{boatMass}g</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={boatMass}
                      onInput={(e) => setBoatMass(parseInt((e.target as HTMLInputElement).value))}
                      onChange={(e) => setBoatMass(parseInt(e.target.value))}
                      disabled={soapAdded}
                      style={{ width: '100%', accentColor: '#3b82f6', touchAction: 'pan-y', height: '20px', WebkitAppearance: 'none' as const }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>Light (1g)</span>
                      <span>Heavy (15g)</span>
                    </div>
                  </div>

                  {/* Real-time Physics Display */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(71, 85, 105, 0.5)'
                  }}>
                    <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Water γ</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3b82f6' }}>{(currentTension * 1000).toFixed(1)}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>mN/m</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Soap γ</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#a855f7' }}>{(reducedTension * 1000).toFixed(1)}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>mN/m</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '0.5rem', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Δγ Force</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#22c55e' }}>{((currentTension - reducedTension) * 1000).toFixed(1)}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>mN/m</div>
                    </div>
                  </div>
                </div>
              )}
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
            <svg viewBox="0 0 400 300" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              <defs>
                {/* Container gradient (tank walls) */}
                <linearGradient id="soapPlayContainerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a5f" />
                  <stop offset="30%" stopColor="#1e40af" />
                  <stop offset="70%" stopColor="#1e3a8a" />
                  <stop offset="100%" stopColor="#172554" />
                </linearGradient>

                {/* Water gradient with depth */}
                <linearGradient id="soapPlayWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="25%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="75%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>

                {/* Water surface shimmer */}
                <linearGradient id="soapPlaySurfaceShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.2" />
                  <stop offset="30%" stopColor="#93c5fd" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#93c5fd" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.2" />
                </linearGradient>

                {/* Boat hull gradient */}
                <linearGradient id="soapPlayHullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#b45309" />
                  <stop offset="30%" stopColor="#92400e" />
                  <stop offset="70%" stopColor="#78350f" />
                  <stop offset="100%" stopColor="#451a03" />
                </linearGradient>

                {/* Boat deck gradient */}
                <linearGradient id="soapPlayDeckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="50%" stopColor="#b45309" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>

                {/* Flag gradient */}
                <linearGradient id="soapPlayFlagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>

                {/* Soap dispersal gradient */}
                <radialGradient id="soapPlaySoapSpread" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#a855f7" stopOpacity="0.4" />
                  <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </radialGradient>

                {/* Soap bottle gradient */}
                <linearGradient id="soapPlayBottleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="30%" stopColor="#a855f7" />
                  <stop offset="70%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>

                {/* Bottle cap gradient */}
                <linearGradient id="soapPlayCapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>

                {/* Surface tension arrow glow */}
                <filter id="soapPlayArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Water ripple glow */}
                <filter id="soapPlayRippleGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Soap glow */}
                <filter id="soapPlaySoapGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Axis labels */}
              <text x="200" y="245" fontSize="11" fill="#94a3b8" textAnchor="middle" fontWeight="600">Position →</text>
              <text x="5" y="155" fontSize="11" fill="#94a3b8" textAnchor="start" transform="rotate(-90, 5, 155)" fontWeight="600">Boat</text>

              {/* Distance markers */}
              <text x="30" y="235" fontSize="11" fill="#64748b" textAnchor="middle">Start</text>
              <text x="370" y="235" fontSize="11" fill="#64748b" textAnchor="middle">End</text>

              {/* Dynamic tension indicator - changes with sliders */}
              <g transform="translate(20, 250)">
                <text x="0" y="0" fontSize="11" fill="#94a3b8">γ water: {(currentTension * 1000).toFixed(1)} mN/m</text>
                <text x="200" y="0" fontSize="11" fill="#a855f7">γ soap: {(reducedTension * 1000).toFixed(1)} mN/m</text>
              </g>

              {/* Container with gradient */}
              <rect x="10" y="80" width="380" height="150" fill="url(#soapPlayContainerGrad)" rx="10" />
              {/* Inner water body */}
              <rect x="15" y="85" width="370" height="140" fill="url(#soapPlayWaterGrad)" rx="6" />

              {/* Water surface shimmer effect */}
              <ellipse cx="200" cy="88" rx="180" ry="6" fill="url(#soapPlaySurfaceShimmer)">
                <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
              </ellipse>

              {/* Surface tension visualization (subtle lines) */}
              {!waterContaminated && (
                <g opacity="0.3">
                  {[0, 1, 2, 3].map(i => (
                    <line key={i} x1={50 + i * 80} y1="88" x2={90 + i * 80} y2="88" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="2,4" />
                  ))}
                </g>
              )}

              {/* Soap spread visualization with gradient */}
              {soapAdded && (
                <g>
                  <ellipse
                    cx={boatPosition - 10}
                    cy="105"
                    rx={soapSpread * 1.8}
                    ry={soapSpread * 0.4}
                    fill="url(#soapPlaySoapSpread)"
                    filter="url(#soapPlaySoapGlow)"
                  />
                  {/* Spreading ripples with glow */}
                  {[0, 1, 2].map(i => (
                    <ellipse
                      key={i}
                      cx={boatPosition - 10}
                      cy="105"
                      rx={Math.min(soapSpread * (1.2 + i * 0.4), 180)}
                      ry={Math.min(soapSpread * 0.25, 25)}
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="1.5"
                      opacity={0.6 - i * 0.18}
                      filter="url(#soapPlayRippleGlow)"
                    />
                  ))}
                </g>
              )}

              {/* Boat with 3D appearance */}
              <g transform={`translate(${boatPosition}, 85)`}>
                {/* Hull shadow */}
                <path
                  d="M2,17 L10,32 L54,32 L62,17"
                  fill="#0f172a"
                  opacity="0.4"
                />
                {/* Hull with gradient */}
                <path
                  d="M0,15L8,30L52,30L60,15Z"
                  fill="url(#soapPlayHullGrad)"
                  stroke="#451a03"
                  strokeWidth="1.5"
                />
                {/* Hull highlight */}
                <path
                  d="M5,17L11,27L49,27L55,17"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="0.8"
                  opacity="0.4"
                />
                {/* Deck with gradient */}
                <rect x="5" y="5" width="50" height="12" fill="url(#soapPlayDeckGrad)" stroke="#78350f" strokeWidth="1" rx="3" />
                {/* Deck highlight */}
                <rect x="8" y="7" width="44" height="3" fill="#fbbf24" opacity="0.25" rx="1" />

                {/* Flag pole */}
                <line x1="30" y1="5" x2="30" y2="-18" stroke="#78350f" strokeWidth="2.5" />
                <line x1="30" y1="5" x2="30" y2="-18" stroke="#92400e" strokeWidth="1.5" />
                {/* Flag with gradient */}
                <path d="M 30,-18 L 48,-12 L 30,-6" fill="url(#soapPlayFlagGrad)" />
                {/* Flag highlight */}
                <path d="M 32,-16 L 42,-12 L 32,-8" fill="#fca5a5" opacity="0.3" />
              </g>

              {/* Surface tension arrows - before soap */}
              {!waterContaminated && !soapAdded && (
                <g opacity="0.7" filter="url(#soapPlayArrowGlow)">
                  {/* Front arrow (pull) */}
                  <line x1={boatPosition + 68} y1="100" x2={boatPosition + 90} y2="100" stroke="#4ade80" strokeWidth="2.5" />
                  <polygon points={`${boatPosition + 90},100 ${boatPosition + 82},96 ${boatPosition + 82},104`} fill="#4ade80" />
                  <text x={boatPosition + 95} y="103" fontSize="11" fill="#4ade80" fontWeight="600">γ₁</text>
                  {/* Back arrow (pull) */}
                  <line x1={boatPosition - 8} y1="100" x2={boatPosition - 30} y2="100" stroke="#4ade80" strokeWidth="2.5" />
                  <polygon points={`${boatPosition - 30},100 ${boatPosition - 22},96 ${boatPosition - 22},104`} fill="#4ade80" />
                  <text x={boatPosition - 40} y="103" fontSize="11" fill="#4ade80" fontWeight="600">γ₁</text>
                </g>
              )}

              {/* After soap - force imbalance visualization */}
              {soapAdded && soapSpread > 20 && (
                <g filter="url(#soapPlayArrowGlow)">
                  {/* Strong front pull */}
                  <line
                    x1={boatPosition + 68}
                    y1="100"
                    x2={boatPosition + 105}
                    y2="100"
                    stroke="#22c55e"
                    strokeWidth="4"
                  />
                  <polygon
                    points={`${boatPosition + 105},100 ${boatPosition + 95},94 ${boatPosition + 95},106`}
                    fill="#22c55e"
                  />
                  <text x={boatPosition + 110} y="103" fontSize="11" fill="#22c55e" fontWeight="600">γ₁ (HIGH)</text>

                  {/* Weak back pull */}
                  <line
                    x1={boatPosition - 8}
                    y1="100"
                    x2={boatPosition - 25}
                    y2="100"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="4,3"
                  />
                  <text x={boatPosition - 65} y="103" fontSize="11" fill="#fbbf24" fontWeight="600">γ₂ (LOW)</text>
                </g>
              )}

              {/* Soap bottle with premium styling */}
              {!waterContaminated && (
                <g
                  transform="translate(20, 8)"
                  style={{ cursor: soapAdded ? 'default' : 'pointer' }}
                  onPointerDown={addSoap}
                >
                  {/* Bottle shadow */}
                  <rect x="12" y="22" width="30" height="50" fill="#1e1b4b" opacity="0.3" rx="6" />
                  {/* Bottle body */}
                  <rect x="10" y="20" width="30" height="50" fill="url(#soapPlayBottleGrad)" rx="6" />
                  {/* Bottle highlight */}
                  <rect x="12" y="22" width="8" height="40" fill="#e9d5ff" opacity="0.2" rx="3" />
                  {/* Cap */}
                  <rect x="15" y="5" width="20" height="18" fill="url(#soapPlayCapGrad)" rx="4" />
                  {/* Cap highlight */}
                  <rect x="17" y="7" width="5" height="12" fill="#a78bfa" opacity="0.3" rx="2" />
                  {/* Label */}
                  {!soapAdded && <text x="25" y="75" fontSize="11" fill="#cbd5e1" textAnchor="middle" fontWeight="600">SOAP</text>}
                </g>
              )}

              {/* Boat label */}
              <text x={boatPosition + 30} y="72" fontSize="11" fill="#fbbf24" textAnchor="middle" fontWeight="600">Boat</text>

              {/* Surface tension profile graph spanning full vertical space */}
              <path
                d={soapAdded
                  ? `M 15,270 L ${Math.max(15, boatPosition - 10)},270 L ${Math.max(15, boatPosition)},160 L ${Math.min(385, boatPosition + 10)},50 L 385,50`
                  : `M 15,50 L 100,270 L 200,50 L 300,270 L 385,50`}
                stroke="#60a5fa"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              <text x="18" y="45" fontSize="11" fill="#94a3b8">High γ</text>
              <text x="18" y="285" fontSize="11" fill="#94a3b8">Low γ</text>
            </svg>

            {/* Labels and status moved outside SVG */}
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              {/* Soap bottle label */}
              {!waterContaminated && !soapAdded && (
                <p style={{
                  fontSize: typo.small,
                  color: colors.accent,
                  fontWeight: 600,
                  marginBottom: '0.5rem'
                }}>
                  Click the soap bottle to add soap behind the boat!
                </p>
              )}

              {/* Tension labels */}
              {soapAdded && soapSpread > 20 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: typo.small, color: '#fbbf24', fontWeight: 600 }}>LOW tension (back)</span>
                  <span style={{ fontSize: typo.small, color: '#22c55e', fontWeight: 600 }}>HIGH tension (front)</span>
                </div>
              )}

              {/* Balance info before soap */}
              {!waterContaminated && !soapAdded && (
                <p style={{ fontSize: typo.small, color: colors.textSecondary }}>
                  Equal surface tension on all sides = no movement
                </p>
              )}

              {/* Status message */}
              <p style={{
                fontSize: typo.body,
                color: waterContaminated ? colors.warning : colors.textSecondary,
                fontWeight: waterContaminated ? 600 : 400
              }}>
                {waterContaminated
                  ? 'Water contaminated - soap spread everywhere!'
                  : soapAdded
                  ? `Soap spreading... ${Math.round(soapSpread)}%`
                  : ''}
              </p>

              {/* Velocity indicator */}
              {animating && (
                <p style={{
                  fontSize: typo.bodyLarge,
                  color: colors.primary,
                  fontWeight: 700,
                  marginTop: '0.25rem'
                }}>
                  Speed: {(boatVelocity * 10).toFixed(1)} cm/s
                </p>
              )}
            </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {waterContaminated && (
                <button
                  onPointerDown={resetSimulation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔄 Fresh Water
                </button>
              )}
            </div>

            {waterContaminated && (
              <button
                onPointerDown={() => {
                  setShowResult(true);
                  if (prediction === 'b') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: prediction === 'b' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'b' ? '#166534' : '#92400e' }}>
                  {prediction === 'b' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The boat moves <strong>forward</strong>! Soap reduces surface tension behind the boat,
                  creating an imbalance. The higher surface tension at the front pulls the boat forward!
                </p>
                <button
                  onPointerDown={() => goToPhase('review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Learn the Physics
                </button>
              </div>
            )}
            </div>
            </div>
          </div>
        );

      // ───────────────────────────────────────────────────
      // REVIEW
      // ───────────────────────────────────────────────────
      case 'review':
        return (
          <div className="flex flex-col items-center" style={{ gap: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f8fafc', fontWeight: 700 }}>
              The Physics of Surface Tension
            </h2>

            {/* Connect to prediction */}
            {prediction && (
              <div style={{
                background: prediction === 'b' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                border: `1px solid ${prediction === 'b' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                borderRadius: 12,
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {prediction === 'b'
                    ? '✓ You correctly predicted the boat would move forward!'
                    : `You predicted: ${prediction === 'a' ? 'backward movement' : prediction === 'c' ? 'sideways' : 'no movement'}. Let's explore why it actually moves forward.`}
                </p>
              </div>
            )}

            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center', lineHeight: 1.6 }}>
              As you observed in the experiment, the boat moved forward. <strong>Why does this happen?</strong> The key insight and principle is the <em>imbalance</em> of surface tension forces.
              Surface tension pulls equally in all directions... until soap disrupts it. The result is a net forward force.
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>What is Surface Tension?</h3>

              <svg viewBox="0 0 300 100" style={{ width: '100%', marginBottom: '1rem' }}>
                <defs>
                  {/* Bulk molecule gradient */}
                  <radialGradient id="soapReviewBulkMol" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </radialGradient>

                  {/* Surface molecule gradient */}
                  <radialGradient id="soapReviewSurfMol" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </radialGradient>

                  {/* Force arrow glow */}
                  <filter id="soapReviewForceGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Surface line gradient */}
                  <linearGradient id="soapReviewSurfaceLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* Bulk molecules */}
                <g transform="translate(50, 50)">
                  <circle cx="0" cy="0" r="12" fill="url(#soapReviewBulkMol)" />
                  {/* Highlight */}
                  <circle cx="-3" cy="-3" r="3" fill="#93c5fd" opacity="0.5" />
                  {/* Force arrows with glow */}
                  <g filter="url(#soapReviewForceGlow)">
                    <line x1="0" y1="-12" x2="0" y2="-26" stroke="#4ade80" strokeWidth="2.5" />
                    <polygon points="0,-26 -4,-20 4,-20" fill="#4ade80" />
                    <line x1="12" y1="0" x2="26" y2="0" stroke="#4ade80" strokeWidth="2.5" />
                    <polygon points="26,0 20,-4 20,4" fill="#4ade80" />
                    <line x1="0" y1="12" x2="0" y2="26" stroke="#4ade80" strokeWidth="2.5" />
                    <polygon points="0,26 -4,20 4,20" fill="#4ade80" />
                    <line x1="-12" y1="0" x2="-26" y2="0" stroke="#4ade80" strokeWidth="2.5" />
                    <polygon points="-26,0 -20,-4 -20,4" fill="#4ade80" />
                  </g>
                </g>

                {/* Surface molecule */}
                <g transform="translate(200, 50)">
                  {/* Surface line */}
                  <rect x="-55" y="-30" width="110" height="4" fill="url(#soapReviewSurfaceLine)" rx="2" />
                  <circle cx="0" cy="0" r="12" fill="url(#soapReviewSurfMol)" />
                  {/* Highlight */}
                  <circle cx="-3" cy="-3" r="3" fill="#fca5a5" opacity="0.5" />
                  {/* Force arrows - no upward! */}
                  <g filter="url(#soapReviewForceGlow)">
                    <line x1="12" y1="0" x2="26" y2="0" stroke="#4ade80" strokeWidth="2.5" />
                    <polygon points="26,0 20,-4 20,4" fill="#4ade80" />
                    <line x1="0" y1="12" x2="0" y2="26" stroke="#4ade80" strokeWidth="2.5" />
                    <polygon points="0,26 -4,20 4,20" fill="#4ade80" />
                    <line x1="-12" y1="0" x2="-26" y2="0" stroke="#4ade80" strokeWidth="2.5" />
                    <polygon points="-26,0 -20,-4 -20,4" fill="#4ade80" />
                  </g>
                  {/* X mark where upward arrow would be */}
                  <g transform="translate(0, -22)">
                    <line x1="-4" y1="-4" x2="4" y2="4" stroke="#ef4444" strokeWidth="2" />
                    <line x1="4" y1="-4" x2="-4" y2="4" stroke="#ef4444" strokeWidth="2" />
                  </g>
                </g>
              </svg>

              {/* Labels moved outside SVG */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', maxWidth: '120px' }}>
                  <p style={{ fontSize: typo.small, color: colors.primary, fontWeight: 600 }}>Inside Water</p>
                  <p style={{ fontSize: typo.label, color: colors.textMuted }}>Pulled equally in all directions</p>
                </div>
                <div style={{ textAlign: 'center', maxWidth: '120px' }}>
                  <p style={{ fontSize: typo.small, color: colors.danger, fontWeight: 600 }}>At Surface</p>
                  <p style={{ fontSize: typo.label, color: colors.textMuted }}>No pull from above!</p>
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  Surface molecules have <strong>no neighbors above</strong>, so they're pulled
                  inward and sideways more strongly. This creates a "skin" on the water surface.
                </p>

                <div style={{
                  background: 'white',
                  padding: '0.75rem',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#1d4ed8' }}>
                    Water surface tension: γ ≈ 0.072 N/m
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Strong enough to support small insects!
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#7c3aed', marginBottom: '0.75rem' }}>How Soap Propels the Boat</h3>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Soap is a <strong>surfactant</strong> - it breaks hydrogen bonds</li>
                  <li>Behind the boat, surface tension drops (~0.025 N/m)</li>
                  <li>Front still has high tension (~0.072 N/m)</li>
                  <li>Net force: <strong>F = Δγ × L</strong> (tension difference × boat width)</li>
                  <li>Boat accelerates forward until soap spreads everywhere!</li>
                </ol>

                <p style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#fef3c7',
                  borderRadius: 8,
                  fontSize: '0.85rem'
                }}>
                  <strong>Marangoni Effect:</strong> Flow from low surface tension to high surface tension
                  regions. This drives the soap boat and many other phenomena!
                </p>
              </div>
            </div>

            <button
              onPointerDown={() => goToPhase('twist_predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Try a Twist! 🔄
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PREDICT
      // ───────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center" style={{ gap: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Liquid Challenge
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              What if we try the soap boat on water that's <strong>already soapy</strong>?
              Or on <strong>cooking oil</strong>?
            </p>

            <svg viewBox="0 0 400 90" style={{ width: '100%', maxWidth: 400, marginBottom: '1rem' }}>
              <defs>
                {/* Clean water gradient */}
                <linearGradient id="soapTwistWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="40%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                {/* Soapy water gradient */}
                <linearGradient id="soapTwistSoapyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="40%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>

                {/* Oil gradient */}
                <linearGradient id="soapTwistOilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="40%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>

                {/* Container shadow */}
                <filter id="soapTwistContainerShadow" x="-10%" y="-10%" width="120%" height="130%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                </filter>

                {/* Surface shimmer */}
                <linearGradient id="soapTwistShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="white" stopOpacity="0" />
                  <stop offset="50%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Three containers */}
              <g transform="translate(30, 15)" filter="url(#soapTwistContainerShadow)">
                <rect x="0" y="30" width="80" height="50" fill="url(#soapTwistWaterGrad)" rx="6" />
                <ellipse cx="40" cy="33" rx="38" ry="4" fill="url(#soapTwistShimmer)" />
              </g>

              <g transform="translate(160, 15)" filter="url(#soapTwistContainerShadow)">
                <rect x="0" y="30" width="80" height="50" fill="url(#soapTwistSoapyGrad)" rx="6" />
                <ellipse cx="40" cy="33" rx="38" ry="4" fill="url(#soapTwistShimmer)" />
              </g>

              <g transform="translate(290, 15)" filter="url(#soapTwistContainerShadow)">
                <rect x="0" y="30" width="80" height="50" fill="url(#soapTwistOilGrad)" rx="6" />
                <ellipse cx="40" cy="33" rx="38" ry="4" fill="url(#soapTwistShimmer)" />
              </g>
            </svg>

            {/* Labels moved outside SVG using typo system */}
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: typo.small, color: colors.primary, fontWeight: 600 }}>Clean Water</p>
                <p style={{ fontSize: typo.label, color: colors.textMuted, fontFamily: 'monospace' }}>gamma = 0.072 N/m</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: typo.small, color: colors.accent, fontWeight: 600 }}>Soapy Water</p>
                <p style={{ fontSize: typo.label, color: colors.textMuted, fontFamily: 'monospace' }}>gamma = 0.025 N/m</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: typo.small, color: colors.warning, fontWeight: 600 }}>Cooking Oil</p>
                <p style={{ fontSize: typo.label, color: colors.textMuted, fontFamily: 'monospace' }}>gamma = 0.032 N/m</p>
              </div>
            </div>

            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Where will the soap boat work best?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Works the same on all three' },
                { id: 'b', text: 'Works best on soapy water (lowest tension)' },
                { id: 'c', text: 'Only works well on clean water' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onPointerDown={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id ? '#f59e0b' : 'white',
                    color: twistPrediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${twistPrediction === opt.id ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onPointerDown={() => goToPhase('twist_play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test Each One!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        const liquidColors: Record<string, string> = {
          water: '#3b82f6',
          soapyWater: '#a855f7',
          oil: '#fbbf24'
        };

        const liquidLabels: Record<string, string> = {
          water: 'Clean Water',
          soapyWater: 'Soapy Water',
          oil: 'Cooking Oil'
        };

        return (
          <div className="flex flex-col items-center" style={{ gap: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Compare Different Liquids
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Select a liquid and try the soap boat!
            </p>

            {/* Liquid selector */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {(['water', 'soapyWater', 'oil'] as const).map(liquid => (
                <button
                  key={liquid}
                  onPointerDown={() => {
                    setLiquidType(liquid);
                    resetTwistSimulation();
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: liquidType === liquid ? liquidColors[liquid] : 'white',
                    color: liquidType === liquid ? 'white' : '#1e293b',
                    border: `2px solid ${liquidColors[liquid]}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {liquidLabels[liquid]}
                </button>
              ))}
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
            <svg viewBox="0 0 400 170" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              <defs>
                {/* Container gradient */}
                <linearGradient id="soapTwistPlayContainer" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="50%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                {/* Dynamic liquid gradients */}
                <linearGradient id="soapTwistPlayWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="40%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                <linearGradient id="soapTwistPlaySoapy" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="40%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>

                <linearGradient id="soapTwistPlayOil" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="40%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>

                {/* Surface shimmer */}
                <linearGradient id="soapTwistPlayShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="white" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="white" stopOpacity="0.1" />
                </linearGradient>

                {/* Boat hull gradient */}
                <linearGradient id="soapTwistPlayHull" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#b45309" />
                  <stop offset="50%" stopColor="#92400e" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>

                {/* Boat deck gradient */}
                <linearGradient id="soapTwistPlayDeck" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>

                {/* Flag gradient */}
                <linearGradient id="soapTwistPlayFlag" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>

                {/* Glow filter */}
                <filter id="soapTwistPlayGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Container */}
              <rect x="20" y="50" width="360" height="110" fill="url(#soapTwistPlayContainer)" rx="10" />
              {/* Liquid with dynamic gradient based on type */}
              <rect
                x="25"
                y="55"
                width="350"
                height="100"
                fill={liquidType === 'water' ? 'url(#soapTwistPlayWater)' : liquidType === 'soapyWater' ? 'url(#soapTwistPlaySoapy)' : 'url(#soapTwistPlayOil)'}
                rx="6"
              />
              {/* Surface shimmer */}
              <ellipse cx="200" cy="58" rx="170" ry="5" fill="url(#soapTwistPlayShimmer)">
                <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
              </ellipse>

              {/* Boat with 3D appearance */}
              <g transform={`translate(${twistBoatPosition}, 45)`}>
                {/* Hull shadow */}
                <path d="M2,17 L10,32 L54,32 L62,17" fill="#0f172a" opacity="0.4" />
                {/* Hull */}
                <path d="M0,15L8,30L52,30L60,15Z" fill="url(#soapTwistPlayHull)" stroke="#451a03" strokeWidth="1.5" />
                {/* Hull highlight */}
                <path d="M5,17L11,27L49,27L55,17" fill="none" stroke="#d97706" strokeWidth="0.8" opacity="0.4" />
                {/* Deck */}
                <rect x="5" y="5" width="50" height="12" fill="url(#soapTwistPlayDeck)" stroke="#78350f" strokeWidth="1" rx="3" />
                {/* Deck highlight */}
                <rect x="8" y="7" width="44" height="3" fill="#fbbf24" opacity="0.25" rx="1" />
                {/* Flag pole */}
                <line x1="30" y1="5" x2="30" y2="-15" stroke="#78350f" strokeWidth="2" />
                {/* Flag */}
                <path d="M 30,-15 L 45,-10 L 30,-5" fill="url(#soapTwistPlayFlag)" />
              </g>

              {/* Surface tension profile line spanning full height */}
              <path
                d={twistSoapAdded
                  ? `M 15,155 L ${Math.max(15, twistBoatPosition)},155 L ${Math.min(385, twistBoatPosition + 20)},20 L 385,20`
                  : `M 15,20 L 100,155 L 200,20 L 300,155 L 385,20`}
                stroke={liquidType === 'water' ? '#60a5fa' : liquidType === 'soapyWater' ? '#c084fc' : '#fbbf24'}
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                opacity="0.5"
              />
            </svg>

            {/* Result and info moved outside SVG */}
            {twistSoapAdded && !twistAnimating && (
              <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                background: liquidType === 'water' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                border: `1px solid ${liquidType === 'water' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                <p style={{
                  fontSize: typo.body,
                  fontWeight: 700,
                  color: liquidType === 'water' ? colors.success : colors.danger
                }}>
                  {liquidType === 'water'
                    ? 'Moved significantly!'
                    : liquidType === 'soapyWater'
                    ? 'Barely moved - already low tension!'
                    : 'Minimal effect - wrong chemistry!'}
                </p>
              </div>
            )}

            <p style={{
              textAlign: 'center',
              fontSize: typo.small,
              color: colors.textMuted,
              marginBottom: '1rem'
            }}>
              Surface tension: <span style={{ color: colors.textSecondary, fontFamily: 'monospace' }}>{surfaceTensions[liquidType]} N/m</span>
            </p>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onPointerDown={addTwistSoap}
                disabled={twistAnimating || twistSoapAdded}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: twistAnimating || twistSoapAdded
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: twistAnimating || twistSoapAdded ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                🧴 Add Soap
              </button>

              <button
                onPointerDown={resetTwistSimulation}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                🔄 Reset
              </button>
            </div>

            {twistSoapAdded && !twistAnimating && (
              <button
                onPointerDown={() => {
                  setShowTwistResult(true);
                  if (twistPrediction === 'c') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'c' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'c' ? '#166534' : '#92400e' }}>
                  {twistPrediction === 'c' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The soap boat only works well on <strong>clean water</strong>! Soapy water already
                  has low surface tension (no gradient to create), and oil has different chemistry
                  that soap doesn't affect the same way.
                </p>
                <button
                  onPointerDown={() => goToPhase('twist_review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Understand Why
                </button>
              </div>
            )}
            </div>
            </div>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST REVIEW
      // ───────────────────────────────────────────────────
      case 'twist_review':
        return (
          <div className="flex flex-col items-center" style={{ gap: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              It's About the Gradient!
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>The Key Insight</h3>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '1rem' }}>
                  The soap boat needs a <strong>surface tension gradient</strong> to work.
                  It's not about having high or low tension - it's about the <em>difference</em>!
                </p>

                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: 10,
                  marginBottom: '1rem'
                }}>
                  <p style={{ fontWeight: 'bold', textAlign: 'center', color: '#ca8a04' }}>
                    Force ∝ Δγ = γ<sub>front</sub> - γ<sub>back</sub>
                  </p>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#fef3c7' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Liquid</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Before Soap</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>After Soap</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Δγ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>Clean Water</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.072</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.025</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: '#22c55e', fontWeight: 'bold' }}>0.047 ✓</td>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: '0.5rem' }}>Soapy Water</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.025</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.025</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>0 ✗</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>Cooking Oil</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.032</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>~0.030</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: '#f59e0b', fontWeight: 'bold' }}>~0.002</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual diagram showing surface tension gradient */}
            <svg viewBox="0 0 500 200" style={{ width: '100%', maxWidth: 500, marginBottom: '1.5rem' }}>
              <defs>
                <linearGradient id="tensionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                </linearGradient>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
                </marker>
              </defs>

              {/* Water surface before soap */}
              <rect x="20" y="50" width="200" height="80" fill="#3b82f6" opacity="0.3" rx="4" />
              <text x="120" y="40" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="600">High Tension (γ = 0.072)</text>
              <line x1="40" y1="90" x2="200" y2="90" stroke="#3b82f6" strokeWidth="3" strokeDasharray="5,5" />

              {/* Boat */}
              <path d="M 100 70 L 120 70 L 125 85 L 95 85 Z" fill="#a16207" stroke="#854d0e" strokeWidth="2" />

              {/* Water surface after soap */}
              <rect x="280" y="50" width="200" height="80" fill="#a855f7" opacity="0.3" rx="4" />
              <text x="380" y="40" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="600">Low Tension (γ = 0.025)</text>
              <line x1="300" y1="90" x2="460" y2="90" stroke="#a855f7" strokeWidth="3" strokeDasharray="5,5" />

              {/* Force arrow showing movement */}
              <line x1="110" y1="100" x2="170" y2="100" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrowhead)" />
              <text x="140" y="120" textAnchor="middle" fill="#22c55e" fontSize="16" fontWeight="700">Force →</text>

              {/* Labels */}
              <text x="120" y="160" textAnchor="middle" fill="#94a3b8" fontSize="12">Front (pulling)</text>
              <text x="380" y="160" textAnchor="middle" fill="#94a3b8" fontSize="12">Back (soap added)</text>

              {/* Central explanation */}
              <text x="250" y="185" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="600">Δγ = Propulsive Force</text>
            </svg>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Why Oil Doesn't Work</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                Soap molecules work by having a <strong>water-loving head</strong> and
                <strong> water-fearing tail</strong>. Oil molecules don't interact with soap
                the same way - there's no hydrogen bonding to disrupt!
              </p>
            </div>

            <button
              onPointerDown={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              See Real Applications
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TRANSFER
      // ───────────────────────────────────────────────────

      case 'transfer': return (
          <TransferPhaseView
          conceptName="Soap Boat"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
      case 'test':
        const score = testQuestions.reduce((acc, tq, i) => {
          if (testAnswers[i] !== undefined && tq.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center" style={{ gap: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f8fafc', fontWeight: 700 }}>
              Surface Tension Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {testQuestions.map((tq, qi) => (
                <div
                  key={qi}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: 12,
                    padding: '1rem',
                    border: `2px solid ${
                      testSubmitted
                        ? tq.options[testAnswers[qi]]?.correct
                          ? '#22c55e'
                          : testAnswers[qi] !== undefined
                          ? '#ef4444'
                          : 'rgba(71, 85, 105, 0.5)'
                        : 'rgba(71, 85, 105, 0.5)'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                    Question {qi + 1} of {testQuestions.length}
                  </p>
                  <p style={{ color: '#cbd5e1', marginBottom: '0.75rem' }}>
                    {tq.question}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onPointerDown={() => handleTestAnswer(qi, oi)}
                        onClick={() => handleTestAnswer(qi, oi)}
                        disabled={testSubmitted}
                        style={{
                          padding: '0.6rem 1rem',
                          textAlign: 'left',
                          background: testSubmitted
                            ? opt.correct
                              ? 'rgba(34, 197, 94, 0.2)'
                              : testAnswers[qi] === oi
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(15, 23, 42, 0.5)'
                            : testAnswers[qi] === oi
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(15, 23, 42, 0.5)',
                          color: testSubmitted && opt.correct ? '#86efac' : '#e2e8f0',
                          border: `1px solid ${
                            testSubmitted
                              ? opt.correct
                                ? '#22c55e'
                                : testAnswers[qi] === oi
                                ? '#ef4444'
                                : 'rgba(71, 85, 105, 0.5)'
                              : testAnswers[qi] === oi
                              ? '#3b82f6'
                              : 'rgba(71, 85, 105, 0.5)'
                          }`,
                          borderRadius: 8,
                          cursor: testSubmitted ? 'default' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {testSubmitted && opt.correct && '✓ '}
                        {testSubmitted && !opt.correct && testAnswers[qi] === oi && '✗ '}
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!testSubmitted ? (
              <button
                onPointerDown={submitTest}
                disabled={Object.keys(testAnswers).length < testQuestions.length}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: Object.keys(testAnswers).length < testQuestions.length
                    ? '#475569'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: Object.keys(testAnswers).length < testQuestions.length ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  marginTop: '8px'
                }}
              >
                Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
              </button>
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: score >= 7 ? '#22c55e' : '#f59e0b',
                }}>
                  Score: {score}/{testQuestions.length} ({Math.round(score / testQuestions.length * 100)}%)
                </p>

                <div style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: 12,
                  padding: '16px',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  <h3 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '1rem', fontWeight: 600 }}>Answer Review</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                    {testQuestions.map((tq, qi) => {
                      const isCorrect = tq.options[testAnswers[qi]]?.correct;
                      return (
                        <div key={qi} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          borderRadius: 8,
                          border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          <span style={{ fontSize: '1.2rem' }}>{isCorrect ? '✓' : '✗'}</span>
                          <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                            Question {qi + 1}: <span style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onPointerDown={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Complete Journey
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // MASTERY
      // ───────────────────────────────────────────────────
      case 'mastery':
        const finalScore = testQuestions.reduce((acc, tq, i) => {
          if (testAnswers[i] !== undefined && tq.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center', gap: '20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚤💧🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Surface Tension Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You now understand the invisible force that lets insects walk on water
              and powers soap boats!
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 400,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '1rem' }}>Your Achievements</h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
                    {finalScore}/{testQuestions.length}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Test Score</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>4</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Applications</p>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'left'
              }}>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Key Takeaways:
                </p>
                <ul style={{ color: '#64748b', fontSize: '0.85rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Surface tension from cohesive forces</li>
                  <li>Surfactants break hydrogen bonds</li>
                  <li>Marangoni effect: flow toward high γ</li>
                  <li>Gradient matters, not absolute value!</li>
                </ul>
              </div>
            </div>

            {/* Confetti */}
            <svg viewBox="0 0 300 100" style={{ width: '100%', maxWidth: 300 }}>
              {[...Array(20)].map((_, i) => (
                <circle
                  key={i}
                  cx={Math.random() * 300}
                  cy={Math.random() * 100}
                  r={3 + Math.random() * 4}
                  fill={['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'][i % 5]}
                >
                  <animate
                    attributeName="cy"
                    values={`${Math.random() * 30};${70 + Math.random() * 30}`}
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            <button
              onPointerDown={() => {
                goToPhase('hook');
                setTestAnswers({});
                setTestSubmitted(false);
                setCompletedApps(new Set());
                resetSimulation();
                resetTwistSimulation();
              }}
              style={{
                marginTop: '1rem',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Play Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div style={{
      height: '100dvh',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #0a0f1a 0%, #0a1628 100%)',
      display: 'flex',
      flexDirection: 'column',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
      position: 'relative'
    }}>
      {/* Premium background gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, #0f172a, #0a1628, #0f172a)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: '25%', width: 384, height: 384, background: 'rgba(59, 130, 246, 0.05)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '25%', width: 384, height: 384, background: 'rgba(99, 102, 241, 0.05)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Progress bar at top */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: colors.bgCard,
        zIndex: 100,
      }}>
        <div style={{
          height: '100%',
          width: `${((currentIndex + 1) / phaseOrder.length) * 100}%`,
          background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
          transition: 'width 0.3s ease-out',
        }} />
      </div>

      {/* Header */}
      <div style={{
        position: 'fixed',
        top: 4,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(71, 85, 105, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          maxWidth: 1024,
          margin: '0 auto'
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.05em' }}>Soap Boat</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={(e) => { e.preventDefault(); goToPhase(p); }}
                style={{
                  height: 8,
                  width: phase === p ? 24 : 8,
                  borderRadius: 9999,
                  background: phase === p ? '#60a5fa' : currentIndex > i ? '#10b981' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-out',
                  boxShadow: phase === p ? '0 0 12px rgba(96, 165, 250, 0.5)' : 'none',
                  padding: 0
                }}
                title={p}
                aria-label={`Go to ${p} phase`}
              />
            ))}
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#60a5fa' }}>{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content - scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 64, paddingBottom: 80 }}>
        <div style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 700,
          margin: '0 auto',
          padding: isMobile ? '16px' : '24px'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.3)',
            backdropFilter: 'blur(12px)',
            borderRadius: 20,
            padding: isMobile ? '24px' : '32px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            {renderPhase()}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(71, 85, 105, 0.5)',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1024,
          margin: '0 auto',
          gap: 16
        }}>
          <button
            onClick={() => {
              const prevIndex = currentIndex - 1;
              if (prevIndex >= 0) {
                goToPhase(phaseOrder[prevIndex]);
              }
            }}
            disabled={currentIndex === 0}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              background: currentIndex === 0 ? 'rgba(71, 85, 105, 0.5)' : 'rgba(59, 130, 246, 0.2)',
              color: currentIndex === 0 ? '#64748b' : '#3b82f6',
              border: `1px solid ${currentIndex === 0 ? 'rgba(71, 85, 105, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`,
              borderRadius: 12,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1,
              transition: 'all 0.2s ease-out',
              minHeight: 44
            }}
          >
            ← Back
          </button>

          <div style={{ flex: 1, textAlign: 'center', color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>
            {currentIndex + 1} / {phaseOrder.length}
          </div>

          <button
            onClick={() => {
              const nextIndex = currentIndex + 1;
              if (nextIndex < phaseOrder.length) {
                goToPhase(phaseOrder[nextIndex]);
              }
            }}
            disabled={currentIndex === phaseOrder.length - 1 || (phase === 'test' && !testSubmitted)}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              background: (currentIndex === phaseOrder.length - 1 || (phase === 'test' && !testSubmitted)) ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: (currentIndex === phaseOrder.length - 1 || (phase === 'test' && !testSubmitted)) ? 'not-allowed' : 'pointer',
              opacity: (currentIndex === phaseOrder.length - 1 || (phase === 'test' && !testSubmitted)) ? 0.5 : 1,
              transition: 'all 0.2s ease-out',
              minHeight: 44
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
