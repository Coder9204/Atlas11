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
    explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(500,000 mm)(60°C) = 360 mm = 36 cm. This is why bridges have expansion joints - without them, the thermal stress would crack the structure!"
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
    explanation: "When constrained expansion is prevented, enormous thermal stress builds up: σ = EαΔT. For steel with ΔT = 40°C: σ ≈ 96 MPa - enough to buckle rails! This is called 'sun kink' and causes derailments."
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
    explanation: "Most metals have higher α than glass (α_metal ≈ 12-23 vs α_glass ≈ 8.5 ×10⁻⁶/°C). Heating the lid makes it expand faster than the glass rim, breaking the seal."
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
    explanation: "The brass expands more, becoming longer than the steel. Since they're bonded, the brass 'outer' surface forces the strip to curve with brass on the outside, steel on the inside. This is how mechanical thermostats work!"
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
    explanation: "When part of glass heats faster than another, differential expansion creates stress. Lower α means less stress difference. Pyrex's low expansion makes it resistant to thermal shock."
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
    explanation: "Water's anomalous expansion means 4°C water is densest and sinks. Colder water (0-4°C) rises, eventually freezing on the surface. This insulates deeper water, allowing fish to survive winter."
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
    explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(300,000 mm)(35°C) = 126 mm ≈ 12-15 cm. The tower is measurably taller in summer!"
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
    explanation: "If concrete and steel had different α values, temperature changes would create shear stress at the interface, causing cracking. Their matched expansion allows reinforced concrete to work as a unified material."
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
    explanation: "When you apply heat locally, the bolt heats up faster than the surrounding block. The bolt expands before the block can 'catch up', temporarily creating clearance."
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
    explanation: "Invar (64% Fe, 36% Ni) exhibits the 'Invar effect' - magnetic ordering changes with temperature in a way that contracts the lattice, counteracting normal thermal expansion. This Nobel Prize-winning discovery enabled precision instruments."
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
    description: 'Large bridges can expand several feet between winter and summer. Expansion joints allow controlled movement, preventing the enormous forces that would crack concrete and buckle steel.',
    connection: 'The formula ΔL = αL₀ΔT explains why the Golden Gate Bridge is 18cm longer in summer than winter.',
    howItWorks: 'Finger joints, sliding plates, and modular systems create gaps that close in summer and open in winter. Bearings allow bridge sections to slide freely while supporting massive loads.',
    stats: [
      { value: '18cm', label: 'Golden Gate expansion', icon: '🌉' },
      { value: '12ppm/C', label: 'Steel expansion rate', icon: '📏' },
      { value: '50C', label: 'Typical temp range', icon: '🌡️' }
    ],
    examples: ['Golden Gate Bridge', 'Sydney Harbour Bridge', 'Highway overpasses', 'Railway bridges'],
    companies: ['Mageba', 'Freyssinet', 'D.S. Brown', 'Watson Bowman'],
    futureImpact: 'Shape-memory alloy joints will self-adjust to temperature changes, eliminating maintenance needs.',
    color: '#3B82F6'
  },
  {
    icon: '🚂',
    title: 'Railway Engineering',
    short: 'Managing thermal stress in continuous welded rail',
    tagline: 'Miles of steel that cannot be allowed to buckle',
    description: 'Rails expand 12mm per 100m for every 10C rise. Modern continuously welded rail is pre-stressed to handle temperature extremes without gaps or buckling.',
    connection: 'Rail buckling occurs when thermal stress (σ = EαΔT) exceeds the lateral resistance of the track bed - demonstrating thermal expansion forces dramatically.',
    howItWorks: 'Rails are welded at a neutral temperature (~25C) while stretched. They are in tension when cold and compression when hot, but never buckle because stresses are controlled.',
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
    description: 'Scientific instruments use ultra-low expansion materials like Invar and Zerodur. A temperature change of 0.1C could ruin measurements at the nanometer scale.',
    connection: 'Invar coefficient is just 1.2 ppm/C - 10× lower than steel - because its magnetic properties counteract thermal expansion.',
    howItWorks: 'Low-expansion alloys, temperature-controlled enclosures, and symmetric designs minimize dimensional changes. Critical components use materials that expand in opposite directions to cancel out.',
    stats: [
      { value: '1.2ppm/C', label: 'Invar expansion', icon: '🎯' },
      { value: '0ppm/C', label: 'Zerodur at 20C', icon: '🔬' },
      { value: 'nm', label: 'Measurement precision', icon: '📏' }
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
    description: 'Supersonic aircraft skins heat to over 300C from air friction. The Concorde grew 25cm longer in flight. Engineers must account for dramatic expansion while maintaining structural integrity.',
    connection: 'Different materials expanding at different rates create thermal stress. Aircraft use matching alloys and flexible joints to prevent cracking.',
    howItWorks: 'Titanium frames with aluminum skins use similar expansion coefficients. Overlapping panels slide past each other. Fuel tanks use the thermal expansion for cabin pressurization.',
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

// -----------------------------------------------------------------------------
// Material properties for simulation
// -----------------------------------------------------------------------------
interface Material {
  name: string;
  alpha: number; // Linear expansion coefficient (per °C) × 10^-6
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
  const [temperature, setTemperature] = useState(20); // Celsius
  const [baseTemperature] = useState(20);
  const [selectedMaterial, setSelectedMaterial] = useState(1); // Steel by default
  const [initialLength, setInitialLength] = useState(1000); // mm

  // Twist phase - constrained expansion scenario
  const [bridgeLength, setBridgeLength] = useState(200); // meters
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

  // Animation state
  const [animationPhase, setAnimationPhase] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation for atomic view
  useEffect(() => {
    const animate = () => {
      setAnimationPhase(prev => (prev + 0.05) % (2 * Math.PI));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate expansion: ΔL = αL₀ΔT
  const calculateExpansion = (tempC: number, alphaE6: number, lengthMm: number) => {
    const deltaT = tempC - baseTemperature;
    const alpha = alphaE6 * 1e-6;
    const deltaL = alpha * lengthMm * deltaT;
    return deltaL;
  };

  // Calculate thermal stress when constrained: σ = EαΔT (MPa)
  const calculateStress = (deltaT: number, alphaE6: number, youngsModulusGPa: number = 200) => {
    const alpha = alphaE6 * 1e-6;
    const stress = youngsModulusGPa * 1000 * alpha * deltaT; // MPa
    return stress;
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316', // Orange for thermal
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
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
    twist_play: 'Thermal Stress',
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
  };

  // Current material
  const currentMaterial = materials[selectedMaterial];
  const expansion = calculateExpansion(temperature, currentMaterial.alpha, initialLength);
  const finalLength = initialLength + expansion;

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
        }}>
          "Every day, the <span style={{ color: colors.hot }}>Eiffel Tower grows 15cm taller</span> in summer heat. Railroad tracks can buckle into dangerous curves. How much does a 500m bridge really expand?"
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
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Structural Engineering Fundamentals
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Thermal Expansion
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Less than 1 cm (about 5mm) - barely noticeable' },
      { id: 'b', text: 'About 5 cm (48mm) - length of a finger', correct: true },
      { id: 'c', text: 'About 50 cm (half a meter) - length of an arm' },
      { id: 'd', text: 'About 5 meters - a whole car length' },
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
            A 100-meter steel bridge heats from 20°C to 60°C (a 40°C rise). How much longer does it become?
          </h2>

          {/* Visual diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '120px',
                  height: '20px',
                  background: 'linear-gradient(90deg, #6b7280, #9ca3af)',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }} />
                <p style={{ ...typo.small, color: colors.cold }}>Cool: 20°C</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>100.000 m</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.warning }}>→ +40°C →</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '125px',
                  height: '20px',
                  background: 'linear-gradient(90deg, #ef4444, #f87171)',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  boxShadow: '0 0 10px rgba(239,68,68,0.5)'
                }} />
                <p style={{ ...typo.small, color: colors.hot }}>Hot: 60°C</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>100.??? m</p>
              </div>
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
              Steel: α = 12 × 10⁻⁶ per °C
            </p>
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

  // PLAY PHASE - Interactive Thermal Expansion Simulator
  if (phase === 'play') {
    const tempColorHue = ((temperature + 40) / 140) * 240;
    const barColor = `hsl(${240 - tempColorHue}, 70%, 50%)`;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Thermal Expansion Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust temperature and material to see how length changes
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
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
                  {temperature}°C ({temperature > 20 ? '+' : ''}{temperature - 20}°C from reference)
                </span>
              </div>
              <input
                type="range"
                min="-40"
                max="100"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.cold }}>-40°C</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>20°C (ref)</span>
                <span style={{ ...typo.small, color: colors.hot }}>100°C</span>
              </div>
            </div>

            {/* Visual bar representation */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px', textAlign: 'center' }}>
                Initial Length: {initialLength}mm at 20°C (reference)
              </p>

              {/* Reference bar */}
              <div style={{
                width: '100%',
                height: '20px',
                background: '#4b5563',
                borderRadius: '4px',
                marginBottom: '12px',
                opacity: 0.5,
              }} />

              {/* Expanded/contracted bar */}
              <div style={{
                width: `${Math.max(50, Math.min(150, 100 * (finalLength / initialLength)))}%`,
                height: '30px',
                background: barColor,
                borderRadius: '4px',
                transition: 'all 0.3s ease',
                boxShadow: temperature > 50 ? `0 0 15px ${colors.hot}50` : temperature < -10 ? `0 0 15px ${colors.cold}50` : 'none',
              }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                alignItems: 'center'
              }}>
                <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
                  Final: {finalLength.toFixed(3)}mm
                </span>
                <span style={{
                  ...typo.body,
                  color: expansion > 0 ? colors.hot : expansion < 0 ? colors.cold : colors.textMuted,
                  fontWeight: 700
                }}>
                  {expansion > 0 ? '+' : ''}{expansion.toFixed(3)}mm
                </span>
              </div>
            </div>

            {/* Stats grid */}
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
                <div style={{ ...typo.h3, color: colors.accent }}>{(temperature - baseTemperature).toFixed(0)}°C</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>ΔT (temp change)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{currentMaterial.alpha}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>α (×10⁻⁶/°C)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: expansion > 0 ? colors.hot : colors.cold }}>
                  {((expansion / initialLength) * 100).toFixed(4)}%
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Strain (ΔL/L₀)</div>
              </div>
            </div>
          </div>

          {/* Formula callout */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', margin: 0 }}>
              ΔL = α × L₀ × ΔT = {currentMaterial.alpha}×10⁻⁶ × {initialLength}mm × {temperature - baseTemperature}°C = {expansion.toFixed(3)}mm
            </p>
          </div>

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
            The Physics of Thermal Expansion
          </h2>

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
                The change in length equals the <span style={{ color: colors.accent }}>expansion coefficient (α)</span> times the <span style={{ color: colors.success }}>original length (L₀)</span> times the <span style={{ color: colors.hot }}>temperature change (ΔT)</span>.
              </p>
              <p style={{ marginBottom: '16px' }}>
                For our 100m steel bridge with ΔT = 40°C:
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
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              At the atomic level, heat makes atoms vibrate more energetically. These larger vibrations push atoms slightly farther apart on average - causing the material to expand.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>❄️</div>
                <p style={{ ...typo.small, color: colors.cold }}>Cold: Small vibrations</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>Atoms closer together</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
                <p style={{ ...typo.small, color: colors.hot }}>Hot: Large vibrations</p>
                <p style={{ ...typo.small, color: colors.textMuted }}>Atoms pushed apart</p>
              </div>
            </div>
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

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Nothing - the steel is strong enough to stay in place' },
      { id: 'b', text: 'Enormous thermal stress builds up, potentially cracking or buckling', correct: true },
      { id: 'c', text: 'The bridge contracts instead of expanding' },
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
              🔄 New Variable: Constrained Expansion
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens if a bridge CANNOT expand - if both ends are rigidly fixed?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Imagine a steel beam bolted at both ends, then heated:
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '20px',
                height: '40px',
                background: '#6b7280',
                borderRadius: '4px',
              }} />
              <div style={{
                width: '150px',
                height: '20px',
                background: 'linear-gradient(90deg, #ef4444, #f97316)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ ...typo.small, color: 'white' }}>🔥 HEATING 🔥</span>
              </div>
              <div style={{
                width: '20px',
                height: '40px',
                background: '#6b7280',
                borderRadius: '4px',
              }} />
            </div>
            <p style={{ ...typo.small, color: colors.textMuted }}>
              The beam WANTS to expand, but the rigid supports prevent it...
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
              See Thermal Stress
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE - Thermal Stress Calculator
  if (phase === 'twist_play') {
    const deltaT = maxTemp - minTemp;
    const steelAlpha = 12;
    const totalExpansion = calculateExpansion(maxTemp, steelAlpha, bridgeLength * 1000) - calculateExpansion(minTemp, steelAlpha, bridgeLength * 1000);
    const thermalStress = calculateStress(deltaT, steelAlpha);
    const yieldStrength = 250; // MPa for mild steel

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
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
                  style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
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
                  style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Results */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{deltaT}°C</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Temperature Range</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
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

          {/* Insight */}
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              {totalExpansion > 100
                ? `A ${bridgeLength}m bridge needs ${(totalExpansion/10).toFixed(1)}cm of expansion capacity - that's visible movement!`
                : `Even a ${bridgeLength}m bridge needs ${totalExpansion.toFixed(0)}mm of expansion room.`}
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Thermal Stress
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
            The Hidden Force: Thermal Stress
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Stress Equation</h3>
              </div>
              <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>
                σ = E × α × ΔT
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When expansion is prevented, stress = Young's modulus × expansion coefficient × temperature change.
                For steel with ΔT = 50°C: σ = 200GPa × 12×10⁻⁶ × 50 = <strong>120 MPa</strong> - nearly half the yield strength!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌉</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Expansion Joints</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Engineers solve this by allowing controlled movement. Expansion joints, sliding bearings, and flexible connections let structures breathe with temperature changes instead of fighting them.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛤️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Rail Buckling</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Modern continuously welded rail is pre-stressed at a "neutral temperature" (~25°C). It's in tension when cold and compression when hot, but anchored firmly enough to never buckle. On extremely hot days, speed restrictions protect against "sun kinks."
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
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Big Picture</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Thermal expansion is invisible but powerful. Engineers must either accommodate movement or design for the enormous forces that develop when expansion is constrained. There's no ignoring physics!
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
                Physics Connection:
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
                ? 'You understand thermal expansion and its engineering implications!'
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
              'Water has anomalous expansion (max density at 4°C)',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
            Your Score: {testScore}/10
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            {testScore === 10 ? 'Perfect! You are a thermal expansion expert!' :
             testScore >= 8 ? 'Excellent understanding of the physics!' :
             testScore >= 6 ? 'Good grasp of thermal expansion concepts!' :
             'Keep exploring to deepen your understanding!'}
          </p>
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

export default ThermalExpansionRenderer;
