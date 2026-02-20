'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// THERMAL EXPANSION - Complete 10-Phase Game
// Why bridges grow, rails buckle, and precision demands temperature control
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

interface ThermalExpansionRendererProps {
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
    scenario: "A steel bridge is 500 meters long. The temperature ranges from -20C in winter to 40C in summer.",
    question: "How much does the bridge expand between extremes?",
    options: [
      { id: 'a', label: "About 36 cm (360 mm)", correct: true },
      { id: 'b', label: "About 3.6 cm (36 mm)" },
      { id: 'c', label: "About 3.6 meters" },
      { id: 'd', label: "Less than 1 cm" }
    ],
    explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(500,000 mm)(60°C) = 360 mm = 36 cm. This is why bridges have expansion joints!"
  },
  {
    scenario: "Railroad tracks are laid with small gaps between sections. On a hot summer day (40C), you notice the gaps are almost closed.",
    question: "What happens if tracks are laid without gaps on a cold day (0C)?",
    options: [
      { id: 'a', label: "They buckle and derail trains when heated", correct: true },
      { id: 'b', label: "Nothing - steel is strong enough" },
      { id: 'c', label: "They contract and break apart" },
      { id: 'd', label: "The train wheels grind them smooth" }
    ],
    explanation: "When constrained expansion is prevented, enormous thermal stress builds up: σ = EαΔT. For steel with ΔT = 40°C: σ ≈ 96 MPa - enough to buckle rails!"
  },
  {
    scenario: "A jar has a tight metal lid. Someone suggests running hot water over just the lid to open it.",
    question: "Why does this work?",
    options: [
      { id: 'a', label: "Metal expands more than glass, loosening the seal", correct: true },
      { id: 'b', label: "Hot water lubricates the threads" },
      { id: 'c', label: "Heat weakens the metal" },
      { id: 'd', label: "Steam pressure pushes the lid off" }
    ],
    explanation: "Most metals have higher α than glass (α_metal ≈ 12-23 vs α_glass ≈ 8.5 ×10⁻⁶/°C). Heating the lid makes it expand faster than the glass rim."
  },
  {
    scenario: "A bimetallic strip is made of brass (α = 19) bonded to steel (α = 12). When heated uniformly:",
    question: "Which way does it bend?",
    options: [
      { id: 'a', label: "Curves toward the steel (lower expansion) side", correct: true },
      { id: 'b', label: "Curves toward the brass (higher expansion) side" },
      { id: 'c', label: "Stays straight" },
      { id: 'd', label: "Twists into a spiral" }
    ],
    explanation: "The brass expands more, becoming longer than the steel. Since they're bonded, the strip curves with brass on the outside. This is how mechanical thermostats work!"
  },
  {
    scenario: "Pyrex glass (α ≈ 3.3) is used for cookware and lab glassware instead of regular glass (α ≈ 9).",
    question: "Why is low thermal expansion important for these applications?",
    options: [
      { id: 'a', label: "Resists cracking from uneven heating (thermal shock)", correct: true },
      { id: 'b', label: "Heats food more evenly" },
      { id: 'c', label: "Is more transparent" },
      { id: 'd', label: "Is cheaper to manufacture" }
    ],
    explanation: "When part of glass heats faster than another, differential expansion creates stress. Lower α means less stress difference."
  },
  {
    scenario: "Water is unique - it has maximum density at 4C, not at 0C. When a lake cools in winter:",
    question: "What happens to the water at 4C relative to colder water?",
    options: [
      { id: 'a', label: "It sinks to the bottom, so ice forms on top", correct: true },
      { id: 'b', label: "It rises to the surface, so lakes freeze from bottom up" },
      { id: 'c', label: "It stays evenly mixed" },
      { id: 'd', label: "It freezes first" }
    ],
    explanation: "Water's anomalous expansion means 4°C water is densest and sinks. Colder water rises, eventually freezing on the surface."
  },
  {
    scenario: "The Eiffel Tower (height 300m, iron α ≈ 12) experiences 35C temperature swings between seasons.",
    question: "How much does its height change?",
    options: [
      { id: 'a', label: "About 12-15 cm", correct: true },
      { id: 'b', label: "About 1-2 cm" },
      { id: 'c', label: "About 1 meter" },
      { id: 'd', label: "It doesn't change - iron is rigid" }
    ],
    explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(300,000 mm)(35°C) = 126 mm ≈ 12-15 cm."
  },
  {
    scenario: "Concrete and steel have nearly identical thermal expansion coefficients (both α ≈ 12 ×10⁻⁶/°C).",
    question: "Why is this coincidence critical for reinforced concrete?",
    options: [
      { id: 'a', label: "They expand together, preventing internal cracking", correct: true },
      { id: 'b', label: "It makes the concrete stronger" },
      { id: 'c', label: "It reduces the amount of steel needed" },
      { id: 'd', label: "It's just a coincidence with no practical importance" }
    ],
    explanation: "If concrete and steel had different α values, temperature changes would create shear stress at the interface, causing cracking."
  },
  {
    scenario: "A mechanic heats a stuck bolt with a torch to remove it from an aluminum engine block.",
    question: "Why does this help, even though both materials expand?",
    options: [
      { id: 'a', label: "The bolt heats faster and expands first, breaking the bond", correct: true },
      { id: 'b', label: "Aluminum expands more than steel" },
      { id: 'c', label: "Heat weakens the bolt threads" },
      { id: 'd', label: "It creates a vacuum" }
    ],
    explanation: "When you apply heat locally, the bolt heats up faster than the surrounding block, temporarily creating clearance."
  },
  {
    scenario: "Invar alloy (α ≈ 1.2 ×10⁻⁶/°C) is 10× more stable than steel. It's used in precision instruments.",
    question: "What makes Invar so unusual?",
    options: [
      { id: 'a', label: "Magnetic properties cancel normal thermal expansion", correct: true },
      { id: 'b', label: "It's extremely pure iron" },
      { id: 'c', label: "It's hollow inside" },
      { id: 'd', label: "It's kept at constant temperature" }
    ],
    explanation: "Invar (64% Fe, 36% Ni) exhibits the 'Invar effect' - magnetic ordering changes counteract normal thermal expansion."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🌉',
    title: 'Bridge Expansion Joints',
    short: 'Accommodating thermal movement in massive structures',
    tagline: 'Bridges that breathe with the seasons',
    description: 'Large bridges can expand several feet between winter and summer. Expansion joints allow controlled movement, preventing the enormous forces that would crack concrete and buckle steel. The Golden Gate Bridge expansion joints are designed to handle over 18cm of seasonal movement.',
    connection: 'The formula ΔL = αL₀ΔT explains why the Golden Gate Bridge is 18cm longer in summer than winter.',
    howItWorks: 'Finger joints, sliding plates, and modular systems create gaps that close in summer and open in winter.',
    stats: [
      { value: '18cm', label: 'Golden Gate expansion', icon: '🌉' },
      { value: '12ppm/C', label: 'Steel expansion rate', icon: '📏' },
      { value: '50C', label: 'Typical temp range', icon: '🌡️' }
    ],
    examples: ['Golden Gate Bridge', 'Sydney Harbour Bridge', 'Highway overpasses', 'Railway bridges'],
    companies: ['Mageba', 'Freyssinet', 'D.S. Brown', 'Watson Bowman'],
    futureImpact: 'Shape-memory alloy joints will self-adjust to temperature changes.',
    color: '#3B82F6'
  },
  {
    icon: '🚂',
    title: 'Railway Engineering',
    short: 'Managing thermal stress in continuous welded rail',
    tagline: 'Miles of steel that cannot be allowed to buckle',
    description: 'Rails expand 12mm per 100m for every 10C rise. Modern continuously welded rail is pre-stressed to handle temperature extremes without gaps or buckling. Network Rail manages over 32,000km of track across temperature ranges of 60C or more.',
    connection: 'Rail buckling occurs when thermal stress (σ = EαΔT) exceeds the lateral resistance of the track bed.',
    howItWorks: 'Rails are welded at a neutral temperature (~25C) while stretched.',
    stats: [
      { value: '12mm/100m', label: 'Expansion per 10C', icon: '📏' },
      { value: '1000km', label: 'Continuous rail lengths', icon: '🛤️' },
      { value: '±30C', label: 'Design temp range', icon: '🌡️' }
    ],
    examples: ['High-speed rail', 'Freight railways', 'Metro systems', 'Maglev tracks'],
    companies: ['Network Rail', 'SNCF', 'Deutsche Bahn', 'JR Central'],
    futureImpact: 'Active rail tensioning systems will automatically adjust stress based on real-time temperature monitoring.',
    color: '#EF4444'
  },
  {
    icon: '🔬',
    title: 'Precision Instruments',
    short: 'Ultra-low expansion materials for atomic-scale accuracy',
    tagline: 'Where nanometers matter',
    description: 'Scientific instruments use ultra-low expansion materials like Invar and Zerodur. A temperature change of 0.1C could ruin measurements at the nanometer scale. ASML lithography machines achieve 1nm precision using Zerodur stages that have near-zero thermal expansion.',
    connection: 'Invar coefficient is just 1.2 ppm/C - 10× lower than steel - because its magnetic properties counteract thermal expansion.',
    howItWorks: 'Low-expansion alloys and temperature-controlled enclosures minimize dimensional changes.',
    stats: [
      { value: '1.2ppm/C', label: 'Invar expansion', icon: '🎯' },
      { value: '0ppm/C', label: 'Zerodur at 20C', icon: '🔬' },
      { value: '1nm', label: 'Measurement precision', icon: '📏' }
    ],
    examples: ['LIGO gravitational wave detector', 'Hubble mirrors', 'Semiconductor steppers', 'Atomic clocks'],
    companies: ['Schott', 'Corning', 'ASML', 'Carl Zeiss'],
    futureImpact: 'Meta-materials with negative thermal expansion will create truly zero-expansion structures.',
    color: '#10B981'
  },
  {
    icon: '✈️',
    title: 'Aircraft Design',
    short: 'Managing thermal stress at supersonic speeds',
    tagline: 'When metal meets friction heat',
    description: 'Supersonic aircraft skins heat to over 300C from air friction. The Concorde grew 25cm longer in flight. Boeing and Airbus engineers must account for dramatic expansion while maintaining structural integrity across all operating conditions.',
    connection: 'Different materials expanding at different rates create thermal stress. Aircraft use matching alloys and flexible joints.',
    howItWorks: 'Titanium frames with aluminum skins use similar expansion coefficients.',
    stats: [
      { value: '300C', label: 'Supersonic skin temp', icon: '🔥' },
      { value: '25cm', label: 'Concorde expansion', icon: '✈️' },
      { value: '23ppm/C', label: 'Aluminum expansion', icon: '📐' }
    ],
    examples: ['Concorde', 'SR-71 Blackbird', 'Space Shuttle', 'Hypersonic vehicles'],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'Northrop Grumman'],
    futureImpact: 'Carbon-carbon composites with near-zero expansion will enable sustained Mach 5+ flight.',
    color: '#F59E0B'
  }
];

// Material properties for simulation
interface Material {
  name: string;
  alpha: number;
  color: string;
  description: string;
}

const materials: Material[] = [
  { name: 'Aluminum', alpha: 23.1, color: '#94a3b8', description: 'High expansion, lightweight' },
  { name: 'Steel', alpha: 12.0, color: '#6b7280', description: 'Moderate expansion, strong' },
  { name: 'Copper', alpha: 16.5, color: '#f97316', description: 'Good conductor, moderate expansion' },
  { name: 'Glass', alpha: 8.5, color: '#0ea5e9', description: 'Low expansion, brittle' },
  { name: 'Invar', alpha: 1.2, color: '#22c55e', description: 'Ultra-low expansion alloy' },
  { name: 'Concrete', alpha: 12.0, color: '#9ca3af', description: 'Similar to steel (reinforcement compatible)' }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ThermalExpansionRenderer: React.FC<ThermalExpansionRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [temperature, setTemperature] = useState(20);
  const [baseTemperature] = useState(20);
  const [selectedMaterial, setSelectedMaterial] = useState(1);
  const [initialLength] = useState(1000);

  // Twist phase - constrained expansion scenario
  const [bridgeLength, setBridgeLength] = useState(200);
  const [minTemp, setMinTemp] = useState(-30);
  const [maxTemp, setMaxTemp] = useState(50);

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

  // Calculate expansion: ΔL = αL₀ΔT
  const calculateExpansion = (tempC: number, alphaE6: number, lengthMm: number) => {
    const deltaT = tempC - baseTemperature;
    const alpha = alphaE6 * 1e-6;
    return alpha * lengthMm * deltaT;
  };

  // Calculate thermal stress when constrained: σ = EαΔT (MPa)
  const calculateStress = (deltaT: number, alphaE6: number, youngsModulusGPa: number = 200) => {
    const alpha = alphaE6 * 1e-6;
    return youngsModulusGPa * 1000 * alpha * deltaT;
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    hot: '#EF4444',
    cold: '#3B82F6',
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
    twist_play: 'Twist Exploration',
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
        gameType: 'thermal-expansion',
        gameTitle: 'Thermal Expansion',
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
  }, [phase, goToPhase]);

  // Current material
  const currentMaterial = materials[selectedMaterial];
  const expansion = calculateExpansion(temperature, currentMaterial.alpha, initialLength);
  const finalLength = initialLength + expansion;

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.hot})`,
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
          data-navigation-dot="true"
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.hot})`,
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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // Thermal Expansion SVG Visualization
  const ExpansionVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const tempNorm = (temperature + 40) / 140; // 0 to 1
    const barWidthRef = 280;
    const barWidthCurr = barWidthRef * (finalLength / initialLength);
    const clampedBarWidth = Math.max(200, Math.min(350, barWidthCurr));

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="coldBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="hotBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="220" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={28} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Thermal Expansion — {currentMaterial.name}
        </text>

        {/* Reference bar group */}
        <g>
          <text x={width / 2} y={55} fill="#94a3b8" fontSize="12" textAnchor="middle" fontWeight="400">
            Reference at 20°C: {initialLength}mm
          </text>
          <rect x={(width - barWidthRef) / 2} y={65} width={barWidthRef} height={22} rx="4" fill="url(#coldBarGrad)" opacity="0.4" />
          <text x={width / 2} y={82} fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="600">
            {initialLength.toFixed(1)}mm
          </text>
        </g>

        {/* Current bar group with glow on active bar */}
        <g>
          <text x={width / 2} y={115} fill={temperature > 20 ? colors.hot : temperature < 20 ? colors.cold : '#94a3b8'} fontSize="12" textAnchor="middle" fontWeight="400">
            Current at {temperature}°C: {finalLength.toFixed(3)}mm
          </text>
          <rect
            x={(width - clampedBarWidth) / 2}
            y={125}
            width={clampedBarWidth}
            height={28}
            rx="4"
            fill={temperature > 20 ? 'url(#hotBarGrad)' : 'url(#coldBarGrad)'}
            filter="url(#barGlow)"
          />
          <text x={width / 2} y={145} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="700">
            {expansion > 0 ? '+' : ''}{expansion.toFixed(3)}mm
          </text>
        </g>

        {/* Expansion response curve - path showing how expansion varies with temperature */}
        <g>
          <text x={width / 2} y={185} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
            Expansion vs Temperature Coefficient
          </text>
          <path
            d={`M 40 ${280 - currentMaterial.alpha * 1} L 80 ${280 - currentMaterial.alpha * 1.8} L 120 ${280 - currentMaterial.alpha * 2.6} L 160 ${280 - currentMaterial.alpha * 3.5} L 200 ${280 - currentMaterial.alpha * 4.4} L 240 ${280 - currentMaterial.alpha * 5.2} L 280 ${280 - currentMaterial.alpha * 6} L 320 ${280 - currentMaterial.alpha * 6.8} L 360 ${280 - currentMaterial.alpha * 7.5} L 400 ${280 - currentMaterial.alpha * 8.2} L 440 ${280 - currentMaterial.alpha * 8.8} L ${width - 40} ${280 - currentMaterial.alpha * 9.5}`}
            stroke={colors.accent}
            fill="none"
            strokeWidth="2"
            opacity="0.6"
          />
          {/* Interactive point on curve */}
          <circle
            cx={40 + (tempNorm * (width - 80))}
            cy={280 - currentMaterial.alpha * (1 + tempNorm * 8.5)}
            r="8"
            fill={colors.accent}
            stroke="white"
            strokeWidth="2"
            filter="url(#barGlow)"
          />
          <circle cx={width / 2} cy={280 - currentMaterial.alpha * 5.2} r="3" fill={colors.warning} opacity="0.5" />
        </g>

        {/* Legend */}
        <g>
          <rect x={30} y={height - 75} width="12" height="12" rx="2" fill="url(#coldBarGrad)" opacity="0.4" />
          <text x={47} y={height - 65} fill="#94a3b8" fontSize="11" fontWeight="400">Reference</text>
          <rect x={130} y={height - 75} width="12" height="12" rx="2" fill="url(#hotBarGrad)" />
          <text x={147} y={height - 65} fill="#94a3b8" fontSize="11" fontWeight="400">Expanded</text>
          <circle cx={240} cy={height - 69} r="4" fill={colors.accent} />
          <text x={250} y={height - 65} fill="#94a3b8" fontSize="11" fontWeight="400">Current Value</text>
        </g>

        {/* Formula */}
        <rect x={width / 2 - 120} y={height - 55} width="240" height="20" rx="4" fill="rgba(249, 115, 22, 0.1)" stroke="rgba(249, 115, 22, 0.3)" />
        <text x={width / 2} y={height - 41} fill={colors.accent} fontSize="11" fontWeight="600" textAnchor="middle">
          ΔL = α × L₀ × ΔT = {expansion.toFixed(3)}mm
        </text>

        {/* Axis label */}
        <text x={width / 2} y={height - 8} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
          Temperature Change (°C)
        </text>
      </svg>
    );
  };

  // Stress Visualization for twist_play
  const StressVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 300;
    const deltaT = maxTemp - minTemp;
    const steelAlpha = 12;
    const totalExpansion = calculateExpansion(maxTemp, steelAlpha, bridgeLength * 1000) - calculateExpansion(minTemp, steelAlpha, bridgeLength * 1000);
    const thermalStress = calculateStress(deltaT, steelAlpha);
    const yieldStrength = 250;
    const stressRatio = Math.min(1, thermalStress / yieldStrength);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="stressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="bridgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <filter id="stressGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="50" x2={width - 30} y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="120" x2={width - 30} y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="30" x2={width / 2} y2="180" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Bridge Thermal Stress Analysis
        </text>

        {/* Bridge diagram */}
        <g>
          {/* Fixed supports */}
          <rect x={40} y={55} width="15" height="50" rx="2" fill="#6b7280" />
          <rect x={width - 55} y={55} width="15" height="50" rx="2" fill="#6b7280" />
          {/* Bridge beam */}
          <rect x={55} y={70} width={width - 110} height={20} rx="3" fill="url(#bridgeGrad)" />
          <text x={width / 2} y={84} fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="600">
            {bridgeLength}m Bridge
          </text>
        </g>

        {/* Stress bar */}
        <g>
          <text x={width / 2} y={118} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
            Thermal Stress: {thermalStress.toFixed(0)} MPa / {yieldStrength} MPa Yield
          </text>
          <rect x={50} y={125} width={width - 100} height={16} rx="8" fill={colors.border} />
          <rect
            x={50}
            y={125}
            width={(width - 100) * stressRatio}
            height={16}
            rx="8"
            fill="url(#stressGrad)"
            filter={stressRatio > 0.8 ? 'url(#stressGlow)' : undefined}
          />
          <circle
            cx={50 + (width - 100) * stressRatio}
            cy={133}
            r="6"
            fill={stressRatio > 0.8 ? colors.error : colors.warning}
            stroke="white"
            strokeWidth="1.5"
            filter="url(#stressGlow)"
          />
        </g>

        {/* Expansion path curve */}
        <path
          d={`M 50 ${260 - 10 - (bridgeLength / 200) * 5} L 100 ${260 - 30 - (bridgeLength / 200) * 15} L 150 ${260 - 55 - (bridgeLength / 200) * 25} L 200 ${260 - 75 - (bridgeLength / 200) * 35} L 250 ${260 - 95 - (bridgeLength / 200) * 40} L 300 ${260 - 110 - (bridgeLength / 200) * 45} L 350 ${260 - 125 - (bridgeLength / 200) * 48} L 400 ${260 - 135 - (bridgeLength / 200) * 50} L ${width - 50} ${260 - 145 - (bridgeLength / 200) * 52}`}
          stroke={colors.warning}
          fill="none"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Results text */}
        <text x={width / 2} y={175} fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">
          Required Gap: {totalExpansion.toFixed(1)}mm | ΔT: {deltaT}°C
        </text>

        {/* Danger zone indicator */}
        <text x={width / 2} y={195} fill={thermalStress > yieldStrength * 0.8 ? colors.error : colors.success} fontSize="12" textAnchor="middle" fontWeight="700">
          {thermalStress > yieldStrength ? 'FAILURE — Stress exceeds yield strength!' : thermalStress > yieldStrength * 0.8 ? 'WARNING — Approaching yield strength' : 'Safe — Within design limits'}
        </text>

        {/* Axis label */}
        <text x={width / 2} y={height - 35} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="400">
          Temperature Range / Bridge Length
        </text>

        {/* Legend */}
        <g>
          <rect x={40} y={height - 25} width="12" height="12" rx="2" fill="url(#stressGrad)" />
          <text x={57} y={height - 15} fill="#94a3b8" fontSize="11">Stress Level</text>
          <rect x={160} y={height - 25} width="12" height="12" rx="2" fill="url(#bridgeGrad)" />
          <text x={177} y={height - 15} fill="#94a3b8" fontSize="11">Bridge</text>
          <circle cx={265} cy={height - 19} r="4" fill={colors.warning} />
          <text x={275} y={height - 15} fill="#94a3b8" fontSize="11">Expansion</text>
        </g>
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
            🌡️🌉
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Thermal Expansion
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            "Let's explore how the <span style={{ color: colors.hot }}>Eiffel Tower grows 15cm taller</span> in summer heat. How does temperature change the size of everything around us?"
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
              "Thermal expansion is the invisible force that shapes how we build everything - from bridges that must accommodate a foot of movement, to precision instruments where a nanometer matters."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Structural Engineering Fundamentals
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Less than 1 cm (about 5mm) - barely noticeable' },
      { id: 'b', text: 'About 5 cm (48mm) - length of a finger' },
      { id: 'c', text: 'About 50 cm (half a meter) - length of an arm' },
      { id: 'd', text: 'About 5 meters - a whole car length' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A 100-meter steel bridge heats from 20°C to 60°C (a 40°C rise). How much longer does it become?
            </h2>

            {/* Static SVG showing bridge expansion concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictColdGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#60A5FA" />
                  </linearGradient>
                  <linearGradient id="predictHotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F97316" />
                  </linearGradient>
                </defs>
                <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Steel Bridge: Before &amp; After Heating</text>
                <text x="200" y="55" textAnchor="middle" fill="#60A5FA" fontSize="12">At 20°C (Reference)</text>
                <rect x="60" y="65" width="280" height="24" rx="4" fill="url(#predictColdGrad)" opacity="0.6" />
                <text x="200" y="82" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">100.000m</text>
                <text x="200" y="120" textAnchor="middle" fill="#F97316" fontSize="12">At 60°C (+40°C)</text>
                <rect x="55" y="130" width="290" height="28" rx="4" fill="url(#predictHotGrad)" />
                <text x="200" y="150" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">??? mm longer</text>
                <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">How much does temperature change the length?</text>
              </svg>
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
                    transition: 'all 0.2s',
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive Thermal Expansion Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Thermal Expansion Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Thermal expansion is important in real-world industry and engineering — it determines how bridges, railways, aircraft, and precision instruments are designed. Engineers must account for it daily.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Thermal Expansion</strong> is defined as the tendency of matter to change in length, area, or volume in response to a change in temperature.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Expansion Coefficient (α)</strong> refers to the rate at which a material expands per degree of temperature change, measured in ppm/°C.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.hot }}>Thermal Stress</strong> describes the internal forces that develop when a material is prevented from expanding or contracting freely.
              </p>
            </div>

            {/* Visualization explanation and observation guidance */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows how different materials expand or contract as temperature changes. Watch how the bar grows when you increase temperature — observe the reference bar compared to the current expansion. Try adjusting the slider to see what happens when temperature increases or decreases.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <ExpansionVisualization />
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Material selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Material</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {currentMaterial.name} (α = {currentMaterial.alpha} ppm/°C)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {materials.map((mat, i) => (
                        <button
                          key={mat.name}
                          onClick={() => { playSound('click'); setSelectedMaterial(i); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: selectedMaterial === i ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                            background: selectedMaterial === i ? `${colors.accent}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            minHeight: '44px',
                          }}
                        >
                          {mat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Temperature slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                      <span style={{ ...typo.small, color: temperature > 20 ? colors.hot : colors.cold, fontWeight: 600 }}>
                        {temperature}°C ({temperature > 20 ? '+' : ''}{temperature - 20}°C)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="100"
                      value={temperature}
                      onChange={(e) => setTemperature(parseInt(e.target.value))}
                      onInput={(e) => setTemperature(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Temperature"
                      style={sliderStyle(colors.accent, temperature, -40, 100)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.cold }}>-40°C</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>20°C (ref)</span>
                      <span style={{ ...typo.small, color: colors.hot }}>100°C</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{(temperature - baseTemperature).toFixed(0)}°C</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>ΔT</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{currentMaterial.alpha}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>α (×10⁻⁶/°C)</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: expansion > 0 ? colors.hot : colors.cold }}>
                    {expansion > 0 ? '+' : ''}{expansion.toFixed(3)}mm
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>ΔL</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Thermal Expansion
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — as you observed in the experiment, steel expands about 48mm (5cm) for a 100m bridge with ΔT=40°C.'
                : 'As you observed in the experiment, your prediction revealed a key insight — steel expands precisely according to ΔL = αL₀ΔT. The result is about 48mm for our bridge scenario.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>ΔL = α × L₀ × ΔT</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  This is because the change in length equals the <span style={{ color: colors.accent }}>expansion coefficient (α)</span> times the <span style={{ color: colors.success }}>original length (L₀)</span> times the <span style={{ color: colors.hot }}>temperature change (ΔT)</span>. This relationship explains why larger structures and bigger temperature swings produce more dramatic effects.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  ΔL = 12×10⁻⁶ × 100,000mm × 40°C = <strong>48mm ≈ 5cm</strong>
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
                Why Materials Expand
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                At the atomic level, heat makes atoms vibrate more energetically. These larger vibrations push atoms slightly farther apart on average - causing the material to expand. Different materials expand at different rates because their atomic bonds have different strengths and structures.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Different Materials, Different α
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {materials.slice(0, 6).map(mat => (
                  <div key={mat.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{mat.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{mat.alpha}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>×10⁻⁶/°C</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Nothing - the steel is strong enough to stay in place' },
      { id: 'b', text: 'Enormous thermal stress builds up, potentially cracking or buckling' },
      { id: 'c', text: 'The bridge contracts instead of expanding' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
                New Variable: Constrained Expansion
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What happens if a bridge CANNOT expand - if both ends are rigidly fixed?
            </h2>

            {/* Static SVG showing constrained beam */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <rect x="30" y="30" width="15" height="60" rx="2" fill="#6b7280" />
                <rect x="355" y="30" width="15" height="60" rx="2" fill="#6b7280" />
                <rect x="45" y="45" width="310" height="30" rx="3" fill="url(#constrainedGrad)" />
                <defs>
                  <linearGradient id="constrainedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <text x="200" y="66" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">CONSTRAINED — Wants to expand!</text>
                <text x="200" y="110" textAnchor="middle" fill="#94a3b8" fontSize="11">Both ends rigidly fixed — no room to grow</text>
              </svg>
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Thermal Stress
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Thermal Stress Calculator
  if (phase === 'twist_play') {
    const deltaT = maxTemp - minTemp;
    const steelAlpha = 12;
    const totalExpansion = calculateExpansion(maxTemp, steelAlpha, bridgeLength * 1000) - calculateExpansion(minTemp, steelAlpha, bridgeLength * 1000);
    const thermalStress = calculateStress(deltaT, steelAlpha);
    const yieldStrength = 250;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Expansion Joint Designer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Calculate how much gap a bridge needs to survive temperature extremes
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Side-by-side layout */}
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  {/* SVG Visualization */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <StressVisualization />
                  </div>
                </div>
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Bridge length slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Bridge Length</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{bridgeLength} meters</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={bridgeLength}
                      onChange={(e) => setBridgeLength(parseInt(e.target.value))}
                      onInput={(e) => setBridgeLength(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Bridge length"
                      style={sliderStyle(colors.accent, bridgeLength, 50, 500)}
                    />
                  </div>

                  {/* Temperature range */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Min Temp (Winter)</span>
                    <span style={{ ...typo.small, color: colors.cold, fontWeight: 600 }}>{minTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="10"
                    value={minTemp}
                    onChange={(e) => setMinTemp(parseInt(e.target.value))}
                    onInput={(e) => setMinTemp(parseInt((e.target as HTMLInputElement).value))}
                    aria-label="Minimum temperature"
                    style={sliderStyle(colors.cold, minTemp, -40, 10)}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Max Temp (Summer)</span>
                    <span style={{ ...typo.small, color: colors.hot, fontWeight: 600 }}>{maxTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="70"
                    value={maxTemp}
                    onChange={(e) => setMaxTemp(parseInt(e.target.value))}
                    onInput={(e) => setMaxTemp(parseInt((e.target as HTMLInputElement).value))}
                    aria-label="Maximum temperature"
                    style={sliderStyle(colors.hot, maxTemp, 20, 70)}
                  />
                </div>
              </div>
                </div>
              </div>

              {/* Results */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{deltaT}°C</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Temperature Range</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{totalExpansion.toFixed(1)} mm</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Required Gap</div>
                </div>
              </div>

              {/* Stress warning */}
              <div style={{
                background: thermalStress > yieldStrength * 0.8 ? `${colors.error}22` : `${colors.warning}22`,
                border: `1px solid ${thermalStress > yieldStrength * 0.8 ? colors.error : colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  If constrained (no expansion joint):
                </p>
                <div style={{
                  ...typo.h2,
                  color: thermalStress > yieldStrength * 0.8 ? colors.error : colors.warning
                }}>
                  σ = {thermalStress.toFixed(0)} MPa
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Steel yield strength: ~{yieldStrength} MPa
                  {thermalStress > yieldStrength && ' - WOULD FAIL!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Thermal Stress
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Hidden Force: Thermal Stress
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Stress Equation</h3>
                <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>σ = E × α × ΔT</p>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When expansion is prevented, stress = Young's modulus × expansion coefficient × temperature change. For steel with ΔT = 50°C: σ = 200GPa × 12×10⁻⁶ × 50 = <strong>120 MPa</strong>.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Expansion Joints</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Engineers solve this by allowing controlled movement. Expansion joints, sliding bearings, and flexible connections let structures breathe with temperature changes.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Thermal expansion is invisible but powerful. Engineers must either accommodate movement or design for the enormous forces that develop when expansion is constrained.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              ← Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '48px',
            paddingBottom: '100px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
                {passed ? 'You understand thermal expansion and its engineering implications!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
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
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Thermal Expansion
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of thermal expansion to real-world engineering scenarios. Each question presents a practical situation where the physics of thermal expansion determines the outcome. Consider the expansion formula ΔL = αL₀ΔT, material properties, and the relationship between temperature change and dimensional change as you work through each problem.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
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
                  padding: '14px 24px',
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
                  padding: '14px 24px',
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
          {renderNavDots()}
        </NavigationBar>
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Thermal Expansion Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why bridges breathe, rails buckle, and precision demands temperature control.
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
                'Linear expansion: ΔL = αL₀ΔT',
                'Thermal stress: σ = EαΔT when constrained',
                'Expansion joints allow controlled movement',
                'Different materials have different α values',
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
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ThermalExpansionRenderer;
