'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// JAR LID EXPANSION RENDERER - GAME 136 (Thermal Expansion for Jars)
// Physics: ΔL = αL₀ΔT - Differential expansion between metal and glass
// Hook: "Why does heating the lid help open a jar?"
// ============================================================================

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

// Material properties
interface Material {
  name: string;
  alpha: number; // Coefficient of thermal expansion (10^-6 /°C)
  color: string;
  description: string;
}

// Props interface
interface JarLidExpansionRendererProps {
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
    scenario: "You're trying to open a tight jar lid. Your grandmother suggests running hot water over just the metal lid, not the glass jar.",
    question: "Why would heating only the lid help open it?",
    options: [
      { text: "Hot water lubricates the threads", correct: false },
      { text: "Metal expands more than glass, loosening the seal", correct: true },
      { text: "Heat weakens the metal", correct: false },
      { text: "Steam pressure pushes the lid off", correct: false }
    ],
    explanation: "Metal (α ≈ 17×10⁻⁶/°C for steel) expands about twice as much as glass (α ≈ 8.5×10⁻⁶/°C). Heating the lid makes it expand faster than the glass rim, breaking the seal. This is differential thermal expansion in action!"
  },
  {
    scenario: "A bridge engineer notices expansion joints every 50 meters along a 500-meter steel bridge. Temperature varies from -20°C to +40°C annually.",
    question: "How much does each 50m section expand between temperature extremes?",
    options: [
      { text: "About 3.6 cm", correct: true },
      { text: "About 3.6 mm", correct: false },
      { text: "About 36 cm", correct: false },
      { text: "About 0.36 mm", correct: false }
    ],
    explanation: "Using ΔL = αL₀ΔT with α_steel = 12×10⁻⁶/°C, L₀ = 50m = 50,000mm, ΔT = 60°C: ΔL = 12×10⁻⁶ × 50,000 × 60 = 36 mm = 3.6 cm. Without expansion joints, this force would crack concrete and buckle steel!"
  },
  {
    scenario: "On a hot summer day, overhead power lines appear to sag more than usual between poles.",
    question: "What causes this increased sagging?",
    options: [
      { text: "The poles are leaning more in heat", correct: false },
      { text: "Aluminum wires expand and lengthen in heat", correct: true },
      { text: "The wind is pushing the lines down", correct: false },
      { text: "Electricity makes the lines heavier", correct: false }
    ],
    explanation: "Aluminum (α ≈ 23×10⁻⁶/°C) has high thermal expansion. A 100m span can lengthen by 10+ cm on a hot day! Power line engineers account for this 'sag' to ensure minimum clearance even in extreme temperatures."
  },
  {
    scenario: "Railroad tracks are installed with small gaps between sections. On an extremely hot day, you notice the gaps are nearly closed.",
    question: "What could happen if gaps were eliminated completely?",
    options: [
      { text: "Trains would run smoother", correct: false },
      { text: "Tracks could buckle and cause derailments", correct: true },
      { text: "The metal would cool faster", correct: false },
      { text: "Nothing - steel is strong enough", correct: false }
    ],
    explanation: "When expansion is constrained, enormous thermal stress builds up: σ = EαΔT. For steel with E = 200 GPa, α = 12×10⁻⁶/°C, and ΔT = 40°C, stress reaches ~96 MPa! This can exceed buckling strength, causing dangerous 'sun kinks' that derail trains."
  },
  {
    scenario: "A bimetallic strip made of brass (α = 19×10⁻⁶/°C) bonded to steel (α = 12×10⁻⁶/°C) is heated uniformly.",
    question: "Which way does the strip bend?",
    options: [
      { text: "Toward the brass side (brass on inside of curve)", correct: false },
      { text: "Toward the steel side (steel on inside of curve)", correct: true },
      { text: "It stays straight", correct: false },
      { text: "It twists into a spiral", correct: false }
    ],
    explanation: "Brass expands more than steel when heated. Since they're bonded together, the brass side becomes longer, forcing the strip to curve with brass on the outside (longer path) and steel on the inside. This is how mechanical thermostats work!"
  },
  {
    scenario: "An engineer selects Invar (α ≈ 1.2×10⁻⁶/°C) for precision measuring instruments instead of regular steel (α ≈ 12×10⁻⁶/°C).",
    question: "Why is low thermal expansion critical for measurement tools?",
    options: [
      { text: "Invar is more magnetic", correct: false },
      { text: "Small temperature changes won't change the tool's dimensions", correct: true },
      { text: "Invar is cheaper to manufacture", correct: false },
      { text: "Invar is harder than steel", correct: false }
    ],
    explanation: "A 1-meter steel ruler would change by 12 micrometers per degree C, but an Invar ruler changes only 1.2 micrometers! For precision measurements to micrometers, this 10x difference is critical. Invar's special nickel-iron alloy has magnetic properties that counteract thermal expansion."
  },
  {
    scenario: "Pyrex glass (α ≈ 3.3×10⁻⁶/°C) is used for laboratory glassware instead of regular glass (α ≈ 9×10⁻⁶/°C).",
    question: "Why is low thermal expansion important for lab equipment?",
    options: [
      { text: "It makes the glass clearer", correct: false },
      { text: "It resists cracking from thermal shock when heated unevenly", correct: true },
      { text: "It's lighter weight", correct: false },
      { text: "It's cheaper to produce", correct: false }
    ],
    explanation: "When glass is heated unevenly (like pouring hot liquid into a cold beaker), the hot part expands while the cold part doesn't. This creates stress that can crack regular glass. Pyrex's lower α means less stress difference, making it thermal shock resistant."
  },
  {
    scenario: "Concrete and reinforcing steel rebar both have α ≈ 12×10⁻⁶/°C, almost identical thermal expansion coefficients.",
    question: "Why is this match important for reinforced concrete structures?",
    options: [
      { text: "It makes the concrete stronger", correct: false },
      { text: "It prevents internal cracking from differential expansion", correct: true },
      { text: "It reduces the amount of steel needed", correct: false },
      { text: "It's just a coincidence with no importance", correct: false }
    ],
    explanation: "If concrete and steel had different α values, temperature changes would cause them to expand differently, creating shear stress at the interface. This would crack the concrete and weaken the bond. The natural match of expansion coefficients allows reinforced concrete to work as a single material!"
  },
  {
    scenario: "A machinist needs to fit a steel bushing (α = 12×10⁻⁶/°C) tightly into an aluminum housing (α = 23×10⁻⁶/°C).",
    question: "What's the best approach for a shrink-fit assembly?",
    options: [
      { text: "Heat the bushing and cool the housing", correct: false },
      { text: "Heat the housing to expand it, insert bushing, let cool", correct: true },
      { text: "Force the bushing in with a press", correct: false },
      { text: "Cool both parts equally", correct: false }
    ],
    explanation: "Heating the aluminum housing (higher α) makes it expand more than the steel bushing would. Insert the bushing while the housing is expanded, then let it cool. The housing shrinks around the bushing, creating a tight interference fit without damaging either part."
  },
  {
    scenario: "In winter, the Eiffel Tower (iron, α ≈ 12×10⁻⁶/°C, 300m tall) is measurably shorter than in summer. Temperature varies by 35°C seasonally.",
    question: "How much does the tower's height change between seasons?",
    options: [
      { text: "About 1.3 cm", correct: false },
      { text: "About 12.6 cm (roughly 5 inches)", correct: true },
      { text: "About 1.26 m", correct: false },
      { text: "Less than 1 mm", correct: false }
    ],
    explanation: "Using ΔL = αL₀ΔT: ΔL = 12×10⁻⁶ × 300,000mm × 35°C = 126 mm = 12.6 cm. The Eiffel Tower literally grows and shrinks by about 5 inches (12-15 cm) depending on temperature! All large structures must account for this."
  }
];

// ============================================================================
// TRANSFER APPLICATIONS (4 real-world applications)
// ============================================================================
const transferApps: TransferApp[] = [
  {
    icon: "🌉",
    title: "Bridge Expansion Joints",
    short: "Bridges",
    tagline: "Designing structures that breathe",
    description: "Bridges must accommodate significant thermal expansion. Without proper expansion joints and sliding bearings, the enormous forces from restrained expansion would crack concrete and buckle steel beams.",
    connection: "A 500m steel bridge expands ~36cm with 60°C temperature swing. The formula ΔL = αL₀ΔT governs design of expansion joints, which allow movement while maintaining a smooth driving surface.",
    howItWorks: "Expansion joints use interlocking fingers or modular rubber segments that compress and extend. One end of each span is typically fixed while the other rests on sliding bearings that allow horizontal movement.",
    stats: [
      { value: "36 cm", label: "500m bridge expansion" },
      { value: "12×10⁻⁶/°C", label: "Steel α value" },
      { value: "60°C", label: "Typical temp range" },
      { value: "50+ yrs", label: "Joint lifespan" }
    ],
    examples: [
      "Golden Gate Bridge finger joints",
      "Highway overpass modular joints",
      "Railway bridge sliding bearings",
      "Long-span suspension bridge expansion"
    ],
    companies: ["Mageba", "Watson Bowman Acme", "MAURER", "Freyssinet"],
    futureImpact: "Smart expansion joints with embedded strain sensors will monitor bridge health in real-time, predicting maintenance needs and detecting earthquake damage automatically.",
    color: "#f97316"
  },
  {
    icon: "🚂",
    title: "Railroad Track Design",
    short: "Railroads",
    tagline: "Miles of steel that must stay straight",
    description: "Modern continuously welded rail (CWR) deliberately prevents expansion, relying on massive anchor forces to resist thermal stress. Understanding thermal expansion is critical to prevent dangerous track buckling.",
    connection: "Rail laid at 20°C that heats to 60°C develops thermal stress σ = EαΔT ≈ 96 MPa. This force must be resisted by rail anchors and ballast friction, or the track will buckle in a 'sun kink'.",
    howItWorks: "CWR is installed at 'neutral temperature' (stress-free temp). Heavy concrete ties and ballast anchor the rail. When temperatures exceed design limits, speed restrictions are imposed to reduce dynamic forces.",
    stats: [
      { value: "96 MPa", label: "40°C thermal stress" },
      { value: "1 kN/m", label: "Required anchor force" },
      { value: "65°C", label: "Buckling danger temp" },
      { value: "30+", label: "Annual US derailments" }
    ],
    examples: [
      "High-speed rail thermal management",
      "Summer 'slow orders' on tracks",
      "Winter rail break prevention",
      "Switch heaters in cold climates"
    ],
    companies: ["Union Pacific", "BNSF", "Network Rail", "Pandrol", "Vossloh"],
    futureImpact: "Thermal imaging drones and AI systems will continuously monitor rail temperature and predict buckling risk, automatically adjusting train speeds in real-time.",
    color: "#ef4444"
  },
  {
    icon: "📏",
    title: "Bimetallic Strips & Thermostats",
    short: "Thermostats",
    tagline: "When metals disagree on size",
    description: "By bonding two metals with different expansion coefficients, temperature changes cause bending. This simple principle powers everything from old thermostats to safety switches in electrical equipment.",
    connection: "The differential expansion between two metals (Δα × ΔT × L) creates a bending moment. The radius of curvature depends on the thickness of each layer and the α difference between metals.",
    howItWorks: "Brass (α ≈ 19) bonded to steel (α ≈ 12) bends toward steel when heated. At a set temperature, the strip makes or breaks an electrical contact, turning heating/cooling on or off with hysteresis.",
    stats: [
      { value: "7×10⁻⁶/°C", label: "Typical Δα" },
      { value: "±1°C", label: "Switching accuracy" },
      { value: "5-10°C", label: "Hysteresis range" },
      { value: "millions", label: "Cycle lifetime" }
    ],
    examples: [
      "Traditional room thermostats",
      "Toaster browning controls",
      "Electric kettle auto-shutoff",
      "Circuit breaker thermal trips"
    ],
    companies: ["Honeywell", "Emerson", "Sensata", "Texas Instruments"],
    futureImpact: "While digital thermostats replace many applications, bimetallic technology remains critical for fail-safe thermal protection where electronics could fail.",
    color: "#8b5cf6"
  },
  {
    icon: "⚡",
    title: "Power Line Engineering",
    short: "Power Lines",
    tagline: "Hanging cables that grow and shrink",
    description: "Overhead power transmission lines must be tensioned to account for thermal expansion. On hot days, lines sag more and can contact trees or other objects, causing outages or fires.",
    connection: "Aluminum conductor (α ≈ 23×10⁻⁶/°C) with steel core. A 300m span can lengthen 20cm on a 30°C hot day! Sag calculations use catenary equations combined with thermal expansion formulas.",
    howItWorks: "Lines are tensioned at installation accounting for expected temperature range. Minimum ground clearance must be maintained even at maximum sag (hottest day + maximum current heating). Sag-tension tables govern installation.",
    stats: [
      { value: "23×10⁻⁶/°C", label: "Aluminum α" },
      { value: "20+ cm", label: "300m span sag change" },
      { value: "75°C", label: "Max conductor temp" },
      { value: "9+ m", label: "Min ground clearance" }
    ],
    examples: [
      "High-voltage transmission lines",
      "Distribution feeders in urban areas",
      "Emergency load limits on hot days",
      "Helicopter patrol for sag violations"
    ],
    companies: ["Southwire", "Prysmian", "Nexans", "General Cable"],
    futureImpact: "Dynamic line rating systems using real-time temperature monitoring will allow higher power transmission on cool days while protecting infrastructure on hot days.",
    color: "#3b82f6"
  }
];

// Materials for simulation
const materials: Material[] = [
  { name: "Steel Lid", alpha: 12, color: "#6b7280", description: "Common jar lid material" },
  { name: "Aluminum Lid", alpha: 23, color: "#94a3b8", description: "Lighter, expands more" },
  { name: "Brass Lid", alpha: 19, color: "#fbbf24", description: "Traditional material" },
  { name: "Glass Jar", alpha: 8.5, color: "#06b6d4", description: "Lower expansion than metals" }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const JarLidExpansionRenderer: React.FC<JarLidExpansionRendererProps> = ({
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
  const [temperature, setTemperature] = useState(20); // Current temperature in °C
  const [baseTemp] = useState(20); // Reference temperature
  const [selectedLidMaterial, setSelectedLidMaterial] = useState(0);
  const [lidDiameter] = useState(70); // mm
  const [glassDiameter] = useState(70); // mm
  const [isAnimating, setIsAnimating] = useState(false);
  const [showChillFirst, setShowChillFirst] = useState(false);

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
  const playSound = useCallback((type: 'pop' | 'heat' | 'success' | 'click') => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'pop':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'heat':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(80, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
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
    };
  }, []);

  // Calculate expansion
  const calculateExpansion = useCallback((alpha: number, diameter: number, deltaT: number) => {
    // ΔD = α × D₀ × ΔT (in mm, with α in 10^-6/°C)
    return (alpha * 1e-6) * diameter * deltaT;
  }, []);

  // Get lid and glass expansions
  const lidExpansion = calculateExpansion(materials[selectedLidMaterial].alpha, lidDiameter, temperature - baseTemp);
  const glassExpansion = calculateExpansion(materials[3].alpha, glassDiameter, temperature - baseTemp);
  const gapChange = lidExpansion - glassExpansion; // Positive means lid grows more than glass

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

  // ============================================================================
  // RENDER HELPER FUNCTIONS
  // ============================================================================

  // Render jar with lid visualization
  const renderJarVisualization = (): React.ReactNode => {
    const lidMaterial = materials[selectedLidMaterial];
    const expansionScale = 100; // Visual scale factor for expansion
    const visualLidExpansion = gapChange * expansionScale;
    const tempNormalized = Math.min(1, Math.max(0, (temperature - 20) / 80));

    return (
      <svg viewBox="0 0 300 320" style={{ width: '100%', height: '280px' }}>
        <defs>
          <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="lidMetal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lidMaterial.color} />
            <stop offset="100%" stopColor={lidMaterial.color} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="heatGlow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={tempNormalized * 0.5} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="300" height="320" fill="#1e293b" rx="12" />

        {/* Heat indicator */}
        {temperature > 30 && (
          <rect x="80" y="200" width="140" height="100" fill="url(#heatGlow)" rx="4" />
        )}

        {/* Glass jar body */}
        <path
          d="M90 100 L90 270 Q90 290 110 290 L190 290 Q210 290 210 270 L210 100"
          fill="url(#jarGlass)"
          stroke="#67e8f9"
          strokeWidth="3"
        />

        {/* Jar contents (preserves) */}
        <rect x="95" y="150" width="110" height="135" fill="#f59e0b" opacity="0.6" rx="2" />
        <rect x="95" y="140" width="110" height="30" fill="#fbbf24" opacity="0.4" rx="2" />

        {/* Glass jar rim */}
        <rect
          x={85 + glassExpansion * expansionScale / 2}
          y="85"
          width={130 - glassExpansion * expansionScale}
          height="20"
          fill="#67e8f9"
          stroke="#22d3ee"
          strokeWidth="2"
          rx="2"
        />

        {/* Metal lid - expands with temperature */}
        <rect
          x={80 - visualLidExpansion / 2}
          y="60"
          width={140 + visualLidExpansion}
          height="30"
          fill="url(#lidMetal)"
          stroke={temperature > 60 ? '#fbbf24' : '#475569'}
          strokeWidth={temperature > 60 ? 3 : 2}
          rx="3"
          filter={temperature > 60 ? 'url(#glow)' : 'none'}
        />

        {/* Lid texture lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <line
            key={i}
            x1={95 + i * 15 - visualLidExpansion / 2}
            y1="65"
            x2={95 + i * 15 - visualLidExpansion / 2}
            y2="85"
            stroke={lidMaterial.color}
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Gap indicator */}
        {temperature > 30 && (
          <g>
            {/* Left gap arrow */}
            <line x1={82 - visualLidExpansion / 2} y1="75" x2={87} y2="75" stroke="#22c55e" strokeWidth="2" />
            <polygon points={`${82 - visualLidExpansion / 2},75 ${86 - visualLidExpansion / 2},72 ${86 - visualLidExpansion / 2},78`} fill="#22c55e" />

            {/* Right gap arrow */}
            <line x1={218 + visualLidExpansion / 2} y1="75" x2={213} y2="75" stroke="#22c55e" strokeWidth="2" />
            <polygon points={`${218 + visualLidExpansion / 2},75 ${214 + visualLidExpansion / 2},72 ${214 + visualLidExpansion / 2},78`} fill="#22c55e" />
          </g>
        )}

        {/* Heat source (hot water representation) */}
        {temperature > 30 && (
          <g>
            {[0, 1, 2].map(i => (
              <path
                key={i}
                d={`M${100 + i * 40},50 Q${105 + i * 40},30 ${100 + i * 40},10`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                opacity={0.3 + tempNormalized * 0.5}
              >
                <animate
                  attributeName="d"
                  values={`M${100 + i * 40},50 Q${105 + i * 40},30 ${100 + i * 40},10;M${100 + i * 40},50 Q${95 + i * 40},25 ${100 + i * 40},5;M${100 + i * 40},50 Q${105 + i * 40},30 ${100 + i * 40},10`}
                  dur={`${1.5 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </path>
            ))}
          </g>
        )}

        {/* Temperature display */}
        <rect x="10" y="10" width="80" height="40" fill="rgba(0,0,0,0.5)" rx="6" />
        <text x="50" y="30" textAnchor="middle" fill={temperature > 60 ? '#ef4444' : temperature > 30 ? '#fbbf24' : '#22d3ee'} fontSize="16" fontWeight="bold">
          {temperature}°C
        </text>
        <text x="50" y="44" textAnchor="middle" fill="#64748b" fontSize="10">Temperature</text>

        {/* Expansion info */}
        <rect x="210" y="10" width="80" height="40" fill="rgba(0,0,0,0.5)" rx="6" />
        <text x="250" y="28" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
          {gapChange > 0 ? '+' : ''}{(gapChange * 1000).toFixed(1)} μm
        </text>
        <text x="250" y="44" textAnchor="middle" fill="#64748b" fontSize="10">Gap Change</text>

        {/* Material labels */}
        <text x="150" y="305" textAnchor="middle" fill="#94a3b8" fontSize="12">
          {lidMaterial.name} on Glass Jar
        </text>
      </svg>
    );
  };

  // Render expansion comparison chart
  const renderExpansionChart = (): React.ReactNode => {
    const deltaT = temperature - baseTemp;

    return (
      <svg viewBox="0 0 280 140" style={{ width: '100%', height: '120px' }}>
        <rect x="0" y="0" width="280" height="140" fill="#1e293b" rx="8" />

        {/* Bars for each material */}
        {materials.map((mat, i) => {
          const expansion = calculateExpansion(mat.alpha, 70, deltaT);
          const barWidth = Math.abs(expansion) * 8000; // Scale for visibility
          const barColor = i === selectedLidMaterial ? '#22c55e' : i === 3 ? '#06b6d4' : '#64748b';

          return (
            <g key={i}>
              {/* Label */}
              <text x="10" y={25 + i * 30} fill="#94a3b8" fontSize="10">{mat.name}</text>
              {/* Bar background */}
              <rect x="80" y={15 + i * 30} width="180" height="16" fill="#374151" rx="2" />
              {/* Bar */}
              <rect
                x="80"
                y={15 + i * 30}
                width={Math.min(barWidth, 180)}
                height="16"
                fill={barColor}
                rx="2"
              />
              {/* Value */}
              <text x={265} y={27 + i * 30} textAnchor="end" fill={barColor} fontSize="9">
                α={mat.alpha}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  // Hook phase
  const renderHook = (): React.ReactNode => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '24px', textAlign: 'center' }}>
      {/* Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '9999px', marginBottom: '24px' }}>
        <span style={{ width: '8px', height: '8px', backgroundColor: '#06b6d4', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#06b6d4', letterSpacing: '0.05em' }}>THERMAL EXPANSION</span>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: 'bold', marginBottom: '12px', background: 'linear-gradient(to right, #06b6d4, #22d3ee, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        The Stuck Jar Lid Mystery
      </h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '32px' }}>
        Why does heating the lid help open a jar?
      </p>

      {/* Jar animation */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '16px', padding: '24px', maxWidth: '350px', marginBottom: '24px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <svg viewBox="0 0 200 180" style={{ width: '100%', height: '160px' }}>
          {/* Jar */}
          <path d="M60 60 L60 150 Q60 165 75 165 L125 165 Q140 165 140 150 L140 60" fill="rgba(6, 182, 212, 0.2)" stroke="#22d3ee" strokeWidth="2" />
          {/* Jar contents */}
          <rect x="65" y="90" width="70" height="70" fill="#f59e0b" opacity="0.5" rx="2" />
          {/* Rim */}
          <rect x="55" y="50" width="90" height="15" fill="#22d3ee" opacity="0.5" rx="2" />
          {/* Lid */}
          <rect x="50" y="35" width="100" height="20" fill="#6b7280" stroke="#94a3b8" strokeWidth="2" rx="3">
            <animate attributeName="width" values="100;105;100" dur="2s" repeatCount="indefinite" />
            <animate attributeName="x" values="50;47.5;50" dur="2s" repeatCount="indefinite" />
          </rect>
          {/* Hot water drops */}
          {[0, 1, 2].map(i => (
            <circle key={i} cx={70 + i * 30} cy="20" r="5" fill="#ef4444" opacity="0.6">
              <animate attributeName="cy" values="5;30;5" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          ))}
          {/* Arrow showing expansion */}
          <path d="M155 45 L170 45" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowhead)" />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <p style={{ color: '#e2e8f0', marginTop: '16px', lineHeight: '1.6' }}>
          The metal lid <span style={{ color: '#22c55e', fontWeight: 'bold' }}>expands more</span> than the glass jar when heated,
          <span style={{ color: '#fbbf24', fontWeight: 'bold' }}> loosening the seal</span>!
        </p>
      </div>

      {/* CTA */}
      <button
        onMouseDown={() => handleNavigation()}
        style={{ padding: '16px 32px', background: 'linear-gradient(to right, #06b6d4, #0891b2)', color: 'white', fontSize: '18px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(6, 182, 212, 0.3)' }}
      >
        Explore Differential Expansion
      </button>
      <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>ΔL = αL₀ΔT</p>
    </div>
  );

  // Predict phase
  const renderPredict = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Make Your Prediction</h2>
        <p style={{ color: '#94a3b8' }}>
          A metal lid is stuck on a glass jar. You run hot water over the lid.
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(6, 182, 212, 0.2)', marginBottom: '20px' }}>
        <p style={{ textAlign: 'center', color: '#22d3ee', fontWeight: '500' }}>
          Why does this help open the jar?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'A', text: 'Hot water lubricates the lid threads', desc: 'Reduced friction' },
          { id: 'B', text: 'Metal expands more than glass, creating a gap', desc: 'Differential expansion' },
          { id: 'C', text: 'Heat weakens the metal seal', desc: 'Material softening' },
          { id: 'D', text: 'The glass contracts when heated', desc: 'Glass shrinkage' }
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
              border: prediction === option.id ? '2px solid #06b6d4' : '2px solid #374151',
              backgroundColor: prediction === option.id ? 'rgba(6, 182, 212, 0.1)' : 'rgba(30, 41, 59, 0.5)',
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
                backgroundColor: prediction === option.id ? '#06b6d4' : '#374151',
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

  // Play phase
  const renderPlay = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Differential Expansion Lab</h2>
        <p style={{ color: '#94a3b8' }}>Watch how the metal lid expands more than the glass jar</p>
      </div>

      {/* Jar visualization */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        {renderJarVisualization()}
      </div>

      {/* Expansion comparison */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Expansion Coefficients (α × 10⁻⁶/°C)</h3>
        {renderExpansionChart()}
      </div>

      {/* Temperature control */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#94a3b8' }}>Temperature:</span>
          <span style={{ fontWeight: '600', color: temperature > 60 ? '#ef4444' : '#22d3ee' }}>{temperature}°C</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          value={temperature}
          onChange={(e) => {
            setTemperature(Number(e.target.value));
            if (Number(e.target.value) > 60) playSound('heat');
                      }}
          style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
          <span>Room (20°C)</span>
          <span>Hot Water (100°C)</span>
        </div>
      </div>

      {/* Material selector */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: '#94a3b8', marginBottom: '8px' }}>Lid Material:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {materials.slice(0, 3).map((mat, i) => (
            <button
              key={i}
              onMouseDown={() => {
                setSelectedLidMaterial(i);
                playSound('click');
                              }}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: selectedLidMaterial === i ? `2px solid ${mat.color}` : '2px solid #374151',
                backgroundColor: selectedLidMaterial === i ? 'rgba(30, 41, 59, 0.8)' : 'rgba(30, 41, 59, 0.3)',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: mat.color, margin: '0 auto 4px' }} />
              <p style={{ fontSize: '12px', color: '#e2e8f0' }}>{mat.name.split(' ')[0]}</p>
              <p style={{ fontSize: '10px', color: '#64748b' }}>α={mat.alpha}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Lid Expansion</p>
          <p style={{ fontWeight: 'bold', color: '#22d3ee' }}>{(lidExpansion * 1000).toFixed(1)} μm</p>
        </div>
        <div style={{ backgroundColor: 'rgba(103, 232, 249, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Glass Expansion</p>
          <p style={{ fontWeight: 'bold', color: '#67e8f9' }}>{(glassExpansion * 1000).toFixed(1)} μm</p>
        </div>
        <div style={{ backgroundColor: gapChange > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Gap Change</p>
          <p style={{ fontWeight: 'bold', color: gapChange > 0 ? '#22c55e' : '#ef4444' }}>{gapChange > 0 ? '+' : ''}{(gapChange * 1000).toFixed(1)} μm</p>
        </div>
      </div>

      {/* Physics insight */}
      <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
        <h4 style={{ fontWeight: '600', color: '#22d3ee', marginBottom: '8px' }}>The Physics:</h4>
        <p style={{ fontFamily: 'monospace', fontSize: '16px', color: '#e2e8f0', textAlign: 'center', marginBottom: '8px' }}>
          ΔL = α × L₀ × ΔT
        </p>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          The gap change = (α_lid - α_glass) × diameter × ΔT. Metal always wins!
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
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Understanding Differential Expansion</h2>
        <p style={{ color: '#94a3b8' }}>
          {prediction === 'B'
            ? "Correct! Metal's higher expansion coefficient is the key."
            : "The answer was B - metal expands more than glass!"}
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '12px' }}>Why Different Materials Expand Differently</h3>
        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#e2e8f0', textAlign: 'center' }}>
            ΔL = α × L₀ × ΔT
          </p>
        </div>
        <ul style={{ color: '#94a3b8', fontSize: '14px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: '#e2e8f0' }}>α (alpha)</strong> - Thermal expansion coefficient, varies by material</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: '#e2e8f0' }}>Steel:</strong> α ≈ 12 × 10⁻⁶/°C</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ color: '#e2e8f0' }}>Aluminum:</strong> α ≈ 23 × 10⁻⁶/°C</li>
          <li><strong style={{ color: '#e2e8f0' }}>Glass:</strong> α ≈ 8.5 × 10⁻⁶/°C (lower!)</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <h4 style={{ fontWeight: '600', color: '#22c55e', marginBottom: '8px' }}>Why Metals Expand More</h4>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Metallic bonds allow atoms to vibrate more freely. Heat increases atomic motion, pushing atoms apart. Glass has stronger covalent/ionic bonds that resist expansion.
          </p>
        </div>
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h4 style={{ fontWeight: '600', color: '#3b82f6', marginBottom: '8px' }}>The Jar Trick</h4>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Heat only the lid (not the jar) to maximize the effect. The lid grows while the glass stays the same size, breaking the vacuum seal.
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
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>The Thermal Shock Trick</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
          Some people first chill the jar in ice water, THEN run hot water on the lid.
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '20px' }}>
        <p style={{ fontSize: '18px', textAlign: 'center', fontWeight: '500', color: '#e2e8f0' }}>
          Why would chilling first make hot water more effective?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'A', text: 'Cold makes the lid sticky, hot releases it', desc: 'Adhesion effect' },
          { id: 'B', text: 'Bigger total temperature change = bigger expansion difference', desc: 'Enhanced differential expansion' },
          { id: 'C', text: 'Ice water loosens the seal already', desc: 'Pre-loosening' },
          { id: 'D', text: 'It doesn\'t help - just a myth', desc: 'No scientific basis' }
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
          See the Effect
        </button>
      )}
    </div>
  );

  // Twist play phase
  const renderTwistPlay = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Thermal Shock Lab</h2>
        <p style={{ color: '#94a3b8' }}>Compare normal heating vs. chill-then-heat</p>
      </div>

      {/* Toggle for chill first mode */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          onMouseDown={() => {
            setShowChillFirst(false);
            setTemperature(20);
            playSound('click');
          }}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: '12px',
            border: !showChillFirst ? '2px solid #f59e0b' : '2px solid #374151',
            backgroundColor: !showChillFirst ? 'rgba(251, 191, 36, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '20px', marginBottom: '4px' }}>🔥</p>
          <p style={{ fontWeight: '600', color: !showChillFirst ? '#fbbf24' : '#94a3b8' }}>Direct Heat</p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>20°C → 80°C</p>
          <p style={{ fontSize: '14px', color: '#fbbf24', marginTop: '4px' }}>ΔT = 60°C</p>
        </button>
        <button
          onMouseDown={() => {
            setShowChillFirst(true);
            setTemperature(0);
            playSound('click');
          }}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: '12px',
            border: showChillFirst ? '2px solid #3b82f6' : '2px solid #374151',
            backgroundColor: showChillFirst ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '20px', marginBottom: '4px' }}>❄️🔥</p>
          <p style={{ fontWeight: '600', color: showChillFirst ? '#3b82f6' : '#94a3b8' }}>Chill Then Heat</p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>0°C → 80°C</p>
          <p style={{ fontSize: '14px', color: '#3b82f6', marginTop: '4px' }}>ΔT = 80°C</p>
        </button>
      </div>

      {/* Jar visualization */}
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        {renderJarVisualization()}
      </div>

      {/* Temperature slider */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#94a3b8' }}>Temperature:</span>
          <span style={{ fontWeight: '600', color: temperature > 50 ? '#ef4444' : temperature < 10 ? '#3b82f6' : '#22d3ee' }}>{temperature}°C</span>
        </div>
        <input
          type="range"
          min={showChillFirst ? 0 : 20}
          max="100"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
        />
      </div>

      {/* Comparison */}
      <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '12px' }}>Expansion Comparison</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Direct Heat (ΔT=60°C)</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>
              +{((materials[selectedLidMaterial].alpha - 8.5) * 1e-6 * 70 * 60 * 1000).toFixed(1)} μm
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Chill+Heat (ΔT=80°C)</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
              +{((materials[selectedLidMaterial].alpha - 8.5) * 1e-6 * 70 * 80 * 1000).toFixed(1)} μm
            </p>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '12px', color: '#22c55e', fontWeight: '600' }}>
          33% more gap from chill-then-heat!
        </p>
      </div>

      <button
        onMouseDown={() => handleNavigation()}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #8b5cf6, #ec4899)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
      >
        Understand the Effect
      </button>
    </div>
  );

  // Twist review phase
  const renderTwistReview = (): React.ReactNode => (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>Thermal Shock Explained</h2>
        <p style={{ color: '#94a3b8' }}>
          {twistPrediction === 'B'
            ? "Correct! Bigger ΔT means bigger differential expansion."
            : "The answer was B - maximizing ΔT maximizes the effect!"}
        </p>
      </div>

      <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(236, 72, 153, 0.2)', marginBottom: '16px' }}>
        <h3 style={{ fontWeight: '600', color: '#ec4899', marginBottom: '12px' }}>The Math Behind the Trick</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#fbbf24', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>1</span>
            <p style={{ color: '#e2e8f0' }}><strong>Direct heat:</strong> Room temp (20°C) to hot water (80°C) = ΔT of 60°C</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>2</span>
            <p style={{ color: '#e2e8f0' }}><strong>Chill first:</strong> Ice water (0°C) to hot water (80°C) = ΔT of 80°C</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ backgroundColor: '#22c55e', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>3</span>
            <p style={{ color: '#e2e8f0' }}><strong>Result:</strong> 33% more expansion = easier opening!</p>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(251, 191, 36, 0.2)', marginBottom: '16px' }}>
        <h4 style={{ fontWeight: '600', color: '#fbbf24', marginBottom: '8px' }}>Caution: Thermal Shock</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Extreme temperature changes can crack glass! The chill-then-heat trick works because you're heating the metal lid, not shocking the glass body. Never pour boiling water directly on cold glass.
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
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>Thermal Expansion in Engineering</h2>
          <p style={{ color: '#94a3b8' }}>From bridges to power lines</p>
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
                color: selectedApp === i ? 'white' : '#94a3b8'
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
              <h4 style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>Physics Connection</h4>
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
              background: 'linear-gradient(to right, #06b6d4, #22d3ee)',
              transition: 'width 0.3s',
              width: `${((testIndex + (answered ? 1 : 0)) / testQuestions.length) * 100}%`
            }}
          />
        </div>

        {/* Scenario */}
        <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(6, 182, 212, 0.2)', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: '#22d3ee', fontWeight: '500', marginBottom: '4px' }}>Scenario:</p>
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
                bgColor = 'rgba(6, 182, 212, 0.2)';
                borderColor = '#22d3ee';
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
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #06b6d4, #22d3ee)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
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
            {passed ? '🫙' : '📚'}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '12px' }}>
            {passed ? "Thermal Expansion Mastered!" : 'Keep Learning!'}
          </h2>
          <div style={{ display: 'inline-block', background: 'linear-gradient(to right, #06b6d4, #22d3ee)', color: 'white', fontSize: '28px', fontWeight: 'bold', padding: '12px 24px', borderRadius: '12px' }}>
            {testScore} / {testQuestions.length} ({percentage}%)
          </div>
        </div>

        <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(6, 182, 212, 0.2)', marginBottom: '16px' }}>
          <h3 style={{ fontWeight: '600', color: '#22d3ee', marginBottom: '12px' }}>Key Concepts Mastered</h3>
          <ul style={{ color: '#94a3b8' }}>
            {[
              'Materials expand proportionally: ΔL = αL₀ΔT',
              'Metals expand more than glass (higher α values)',
              'Differential expansion creates gaps or stress',
              'Thermal shock technique maximizes ΔT',
              'Engineers design for expansion: joints, gaps, matched materials'
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
            <p style={{ fontFamily: 'monospace', fontSize: '18px', color: '#22d3ee', marginBottom: '8px' }}>
              ΔL = α × L₀ × ΔT
            </p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Change in length = expansion coefficient × original length × temperature change
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
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #06b6d4, #22d3ee)', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
          >
            Try Again
          </button>
        )}

        {passed && (
          <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: '600', fontSize: '16px' }}>
            Congratulations! You understand differential thermal expansion!
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
      <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(6, 182, 212, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', backgroundColor: 'rgba(34, 211, 238, 0.05)', borderRadius: '50%', filter: 'blur(48px)' }} />

      {/* Fixed header with progress */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(71, 85, 105, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', maxWidth: '896px', margin: '0 auto' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#22d3ee' }}>Jar Lid Expansion</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  transition: 'all 0.3s',
                  backgroundColor: phaseNumber === i ? '#22d3ee' : phaseNumber > i ? '#22c55e' : '#475569',
                  width: phaseNumber === i ? '24px' : '8px',
                  boxShadow: phaseNumber === i ? '0 0 8px rgba(34, 211, 238, 0.5)' : 'none'
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

export default JarLidExpansionRenderer;
