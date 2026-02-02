'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Fracture Mechanics - Complete 10-Phase Game
// Why sharp corners fail: stress concentration and crack propagation
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

interface FractureMechanicsRendererProps {
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
    scenario: "A pressure vessel has a small scratch on its inner surface. Under repeated pressurization cycles, engineers notice the scratch has grown into a visible crack.",
    question: "Why does stress concentrate at the tip of a crack or sharp defect?",
    options: [
      { id: 'a', label: "The material is weaker at those locations due to manufacturing defects" },
      { id: 'b', label: "Stress flow lines crowd together at sharp features, amplifying local stress", correct: true },
      { id: 'c', label: "Cracks absorb heat which weakens the surrounding material" },
      { id: 'd', label: "Sharp corners reflect stress waves back into the material" }
    ],
    explanation: "Stress flows through a material like fluid through a channel. When it encounters a sharp feature like a crack tip, the stress flow lines must crowd together to go around the obstacle. This crowding effect dramatically amplifies the local stress at the tip, often by factors of 5-10x or more for sharp cracks."
  },
  {
    scenario: "A glass window in a skyscraper develops a tiny edge chip during installation. Six months later, during a cold snap, the entire pane suddenly shatters.",
    question: "According to the Griffith criterion, what causes a crack to propagate?",
    options: [
      { id: 'a', label: "The crack reaches a critical length regardless of applied stress" },
      { id: 'b', label: "Temperature changes always cause crack growth in brittle materials" },
      { id: 'c', label: "Energy released by crack growth exceeds energy needed to create new surfaces", correct: true },
      { id: 'd', label: "Vibrations from wind cause resonance at the crack tip" }
    ],
    explanation: "Griffith showed that cracks propagate when the strain energy released by crack extension exceeds the surface energy required to create new crack surfaces. Below this threshold, cracks remain stable. The cold snap increased thermal stresses enough to tip the energy balance, causing catastrophic propagation."
  },
  {
    scenario: "Two identical steel components fail under the same load. Component A shows a rough, grainy fracture surface with shear lips at the edges. Component B has a smooth, mirror-like fracture surface with no plastic deformation.",
    question: "Which component experienced brittle fracture and why is this distinction important?",
    options: [
      { id: 'a', label: "Component A; rough surfaces indicate rapid crack propagation" },
      { id: 'b', label: "Component B; smooth surface and no plastic deformation indicate brittle failure", correct: true },
      { id: 'c', label: "Both experienced brittle fracture at different temperatures" },
      { id: 'd', label: "Neither; steel always fails in a ductile manner" }
    ],
    explanation: "Brittle fracture occurs with little to no plastic deformation, producing smooth, often mirror-like fracture surfaces. Ductile fracture involves significant plastic deformation before failure, creating rough surfaces with shear lips. This distinction matters because brittle failures are sudden and catastrophic with no warning, while ductile failures show visible deformation first."
  },
  {
    scenario: "An aircraft wing undergoes approximately 10,000 pressurization cycles per year. After 15 years of service, routine inspection discovers small cracks emanating from rivet holes, despite the wing never experiencing loads above 60% of its design limit.",
    question: "What mechanism caused these cracks to form below the yield strength?",
    options: [
      { id: 'a', label: "Hydrogen embrittlement from atmospheric moisture" },
      { id: 'b', label: "Fatigue failure from repeated cyclic loading below yield strength", correct: true },
      { id: 'c', label: "Creep deformation from sustained loading over time" },
      { id: 'd', label: "Galvanic corrosion between dissimilar metals" }
    ],
    explanation: "Fatigue failure occurs when materials are subjected to repeated cyclic stresses well below their yield strength. Each cycle causes microscopic damage accumulation at stress concentrators like rivet holes. Over thousands of cycles, these micro-cracks coalesce and grow into visible cracks. This is why aircraft have mandatory inspection intervals based on flight cycles."
  },
  {
    scenario: "An engineer is analyzing a cracked pipeline and calculates the stress intensity factor K to be 45 MPa-sqrt(m). The pipeline material has a fracture toughness KIC of 50 MPa-sqrt(m).",
    question: "What does the stress intensity factor K represent and what should the engineer conclude?",
    options: [
      { id: 'a', label: "K measures crack length; the crack is 90% of critical size" },
      { id: 'b', label: "K measures stress field intensity at crack tip; crack is near critical - immediate action needed", correct: true },
      { id: 'c', label: "K measures material hardness; the pipe needs heat treatment" },
      { id: 'd', label: "K measures average stress; the pipe is operating safely within limits" }
    ],
    explanation: "The stress intensity factor K characterizes the magnitude of the stress field around a crack tip, combining effects of applied stress and crack geometry. When K approaches the material's fracture toughness KIC, unstable crack propagation occurs. At K = 45 vs KIC = 50, the crack is at 90% of critical - the engineer should immediately reduce pressure and schedule repair."
  },
  {
    scenario: "A materials testing lab needs to determine the fracture toughness (KIC) of a new aluminum alloy for aerospace applications. They must choose an appropriate test specimen geometry.",
    question: "Why do fracture toughness tests require specific specimen thickness requirements?",
    options: [
      { id: 'a', label: "Thicker specimens are easier to machine with precise crack geometries" },
      { id: 'b', label: "Thin specimens give artificially high toughness due to plane stress conditions", correct: true },
      { id: 'c', label: "Specimen thickness must match the intended application thickness exactly" },
      { id: 'd', label: "Testing equipment can only grip specimens above a minimum thickness" }
    ],
    explanation: "Fracture toughness depends on the stress state at the crack tip. Thin specimens experience plane stress (triaxial stress relieved at free surfaces), allowing more plastic deformation and higher apparent toughness. Thick specimens develop plane strain conditions, giving lower, more conservative KIC values. Standards specify minimum thickness to ensure plane strain and reproducible results."
  },
  {
    scenario: "A ceramic furnace lining repeatedly cracks after rapid temperature changes during startup, even though the material easily withstands the maximum operating temperature when heated slowly.",
    question: "What causes thermal shock fracture in ceramics?",
    options: [
      { id: 'a', label: "Chemical reactions with furnace gases at high temperature" },
      { id: 'b', label: "Differential expansion creates internal stresses exceeding fracture strength", correct: true },
      { id: 'c', label: "Thermal radiation damages the crystal structure" },
      { id: 'd', label: "Phase transformations occur only during rapid heating" }
    ],
    explanation: "During rapid temperature change, the surface and interior of a ceramic heat at different rates. This temperature gradient causes differential thermal expansion - the hot surface wants to expand while the cooler interior constrains it. These internal stresses can exceed the material's fracture strength, causing cracking. Slow heating allows temperature equalization, preventing thermal shock."
  },
  {
    scenario: "A pipeline weld passes visual inspection but fails catastrophically during a pressure test. Post-failure analysis reveals a lack-of-fusion defect hidden at the weld root.",
    question: "Why are internal weld defects like lack-of-fusion particularly dangerous from a fracture mechanics perspective?",
    options: [
      { id: 'a', label: "They reduce the total cross-sectional area of the weld" },
      { id: 'b', label: "They create sharp crack-like flaws with high stress concentration factors", correct: true },
      { id: 'c', label: "They trap corrosive gases that weaken the weld metal" },
      { id: 'd', label: "They indicate the welder was not properly certified" }
    ],
    explanation: "Lack-of-fusion defects create planar, crack-like discontinuities within the weld. These sharp-tipped flaws act as pre-existing cracks with very high stress concentration factors. Unlike rounded pores that have Kt around 2-3, lack-of-fusion defects can have Kt approaching infinity at their tips, making them far more likely to initiate catastrophic fracture under load."
  },
  {
    scenario: "A carbon fiber composite wing skin shows visible whitening (stress whitening) along a line after a hard landing. Ultrasonic inspection reveals the layers have separated in that region.",
    question: "What is delamination in composite materials and why is it a critical failure mode?",
    options: [
      { id: 'a', label: "Surface paint damage that exposes fibers to UV degradation" },
      { id: 'b', label: "Separation between composite layers that propagates under load and reduces strength", correct: true },
      { id: 'c', label: "Chemical breakdown of the resin matrix at high temperatures" },
      { id: 'd', label: "Fiber breakage that occurs during manufacturing" }
    ],
    explanation: "Delamination is the separation of adjacent layers in a laminated composite, typically occurring at the weak resin-rich interface between plies. Once initiated, delamination can propagate rapidly under continued loading, especially under compression or cyclic loads. This dramatically reduces the load-carrying capacity of the composite structure and is difficult to detect visually, making it a critical failure mode."
  },
  {
    scenario: "Engineers designing a large ship hull incorporate 'crack arrestor strakes' - thick steel strips welded perpendicular to the hull plating at regular intervals. During service, a crack initiates but stops when it reaches an arrestor.",
    question: "How do crack arrestor features prevent catastrophic failure?",
    options: [
      { id: 'a', label: "They chemically bond with the crack surfaces to seal them shut" },
      { id: 'b', label: "They provide tougher material and geometry changes that reduce crack driving force", correct: true },
      { id: 'c', label: "They create electrical barriers that prevent electrochemical crack growth" },
      { id: 'd', label: "They absorb vibrations that would otherwise drive crack propagation" }
    ],
    explanation: "Crack arrestors work through multiple mechanisms: the thicker, tougher material requires more energy to crack through, the geometry change disrupts the stress field at the crack tip reducing the stress intensity factor, and the material transition can blunt the crack tip. Together, these effects reduce the crack driving force below the critical value, arresting propagation and preventing a local crack from becoming a catastrophic hull failure."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '✈️',
    title: 'Aircraft Structural Integrity',
    short: 'Why airplane windows have rounded corners',
    tagline: 'The shape that saved aviation',
    description: 'After the de Havilland Comet disasters in 1954, engineers discovered that square window corners created stress concentrations up to 6x normal levels. Rounded corners distribute stress evenly, preventing crack initiation.',
    connection: 'The stress concentration factor (Kt) you learned about explains why sharp corners are deadly: local stress = Kt x average stress, and sharp corners have Kt > 3.',
    howItWorks: 'Sharp corners create geometric discontinuities where stress flow lines crowd together. Rounded corners allow stress to flow smoothly. Aircraft undergo regular inspection for microscopic fatigue cracks before they can propagate.',
    stats: [
      { value: '3-6x', label: 'Stress at corners', icon: '📐' },
      { value: '30,000+', label: 'Flight cycles', icon: '✈️' },
      { value: '$15B', label: 'MRO market', icon: '💰' }
    ],
    examples: ['Boeing 737 window design', 'Airbus fuselage stress analysis', 'De Havilland Comet investigations', 'Spacecraft hatch design'],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'SpaceX'],
    futureImpact: 'Composite materials with designed crack-arrest features will enable self-healing aircraft structures that stop cracks before they propagate.',
    color: '#3B82F6'
  },
  {
    icon: '🔧',
    title: 'Stop-Drill Crack Arrest',
    short: 'Drilling holes to stop cracks',
    tagline: 'The counterintuitive repair that works',
    description: 'When a crack forms in metal structures, engineers often drill a circular hole at the crack tip. This counterintuitive technique reduces stress concentration from near-infinite at a sharp crack tip to manageable levels.',
    connection: 'You learned that crack tips have extreme stress concentration. A drilled hole has Kt of about 3, while a sharp crack tip approaches infinity. The hole converts a dangerous crack into a manageable stress raiser.',
    howItWorks: 'The sharp crack tip concentrates stress to fracture-inducing levels. Drilling a hole blunts the tip, distributing stress over a larger area. The crack effectively becomes a hole with finite, manageable stress concentration.',
    stats: [
      { value: 'Infinity to 3', label: 'Kt reduction', icon: '📉' },
      { value: '80%', label: 'Life extension', icon: '⏰' },
      { value: '$500M', label: 'Annual savings', icon: '💰' }
    ],
    examples: ['Aircraft fuselage repairs', 'Ship hull maintenance', 'Bridge girder cracks', 'Pressure vessel repairs'],
    companies: ['Textron Aviation', 'General Dynamics', 'Newport News Shipbuilding', 'AECOM'],
    futureImpact: 'Laser-drilled precision holes with crack-monitoring sensors will enable autonomous structural health monitoring.',
    color: '#EF4444'
  },
  {
    icon: '💎',
    title: 'Diamond Cutting & Scoring',
    short: 'Using stress concentration to cut the hardest material',
    tagline: 'Controlled fracture is precise cutting',
    description: 'Glass and diamonds are cut by creating controlled stress concentrations. A score line creates a crack initiation point with extreme stress concentration, allowing fracture along a precise path with minimal force.',
    connection: 'The scorer creates a V-notch - the highest stress concentration shape you studied. When bent, all fracture energy focuses at this notch, making the material break exactly where intended.',
    howItWorks: 'A hard point (diamond tip) creates a shallow scratch with a sharp V-bottom. When force is applied, stress concentrates at the scratch tip (Kt approaches infinity). The material fractures along this pre-determined path.',
    stats: [
      { value: '10 GPa', label: 'Diamond hardness', icon: '💎' },
      { value: '< 1 mm', label: 'Score depth', icon: '📏' },
      { value: '$85B', label: 'Diamond market', icon: '💰' }
    ],
    examples: ['Diamond cleaving', 'Glass cutting', 'Silicon wafer dicing', 'Ceramic tile cutting'],
    companies: ['De Beers', 'Rio Tinto', 'Corning', 'Schott'],
    futureImpact: 'Laser-induced controlled fracture will enable precise cutting of advanced materials like synthetic sapphire and silicon carbide.',
    color: '#8B5CF6'
  },
  {
    icon: '🏗️',
    title: 'Fatigue-Resistant Design',
    short: 'Engineering structures to survive billions of cycles',
    tagline: 'Design for the millionth load, not the first',
    description: 'Bridges, engines, and aircraft experience millions of stress cycles. Fatigue failure occurs far below yield strength when repeated loading grows microscopic cracks. Engineers design for fatigue life, not static strength.',
    connection: 'Fatigue cracks initiate at stress concentrations you studied. Each load cycle grows the crack slightly until it reaches critical size and causes sudden catastrophic failure.',
    howItWorks: 'S-N curves show stress vs. cycles to failure. Below the fatigue limit, infinite life is possible. Above it, life is finite. Designs minimize stress concentrations, use shot peening to compress surfaces, and specify inspection intervals.',
    stats: [
      { value: '10^7', label: 'Cycles for infinite life', icon: '🔄' },
      { value: '50%', label: 'Of failures', icon: '⚠️' },
      { value: '$100B', label: 'Annual costs', icon: '💰' }
    ],
    examples: ['Jet engine turbine blades', 'Suspension bridge cables', 'Automobile crankshafts', 'Railroad wheel axles'],
    companies: ['GE Aviation', 'Rolls-Royce', 'ANSYS', 'Siemens PLM'],
    futureImpact: 'Digital twins with real-time fatigue tracking will predict exact remaining life, enabling just-in-time maintenance.',
    color: '#22C55E'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const FractureMechanicsRenderer: React.FC<FractureMechanicsRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - main play
  const [notchType, setNotchType] = useState<'none' | 'round' | 'vsharp' | 'crack'>('none');
  const [appliedStress, setAppliedStress] = useState(30);
  const [isFractured, setIsFractured] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist phase - crack stop hole
  const [hasCrackStopHole, setHasCrackStopHole] = useState(false);
  const [crackLength, setCrackLength] = useState(20);
  const [twistStress, setTwistStress] = useState(20);

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

  // Stress concentration factors
  const getStressConcentration = (type: string): number => {
    switch (type) {
      case 'none': return 1;
      case 'round': return 2.5;
      case 'vsharp': return 5;
      case 'crack': return 10;
      default: return 1;
    }
  };

  const getFractureStress = (type: string): number => {
    const kt = getStressConcentration(type);
    return 100 / kt;
  };

  // Check for fracture
  useEffect(() => {
    const fractureThreshold = getFractureStress(notchType);
    if (appliedStress > fractureThreshold && !isFractured) {
      setIsFractured(true);
      playSound('failure');
    }
  }, [appliedStress, notchType, isFractured]);

  // Twist - crack propagation
  useEffect(() => {
    if (phase !== 'twist_play') return;

    const effectiveKt = hasCrackStopHole ? 2.5 : 10;
    const criticalStress = 100 / effectiveKt;

    if (twistStress > criticalStress && !hasCrackStopHole) {
      const interval = setInterval(() => {
        setCrackLength(l => {
          if (l >= 180) return 180;
          return l + 3;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase, twistStress, hasCrackStopHole]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red for fracture theme
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    secondary: '#F97316', // Orange
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
    twist_play: 'Crack Arrest',
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
        gameType: 'fracture-mechanics',
        gameTitle: 'Fracture Mechanics',
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.secondary})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
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

  // Stress Concentration Visualization SVG
  const StressVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 260 : 320;
    const kt = getStressConcentration(notchType);
    const localStress = Math.min(appliedStress * kt, 250);
    const stretch = appliedStress / 15;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="steelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="25%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="75%" stopColor="#374151" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="fracturedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="50%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
          <linearGradient id="stressArrow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          <radialGradient id="stressZone" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
            <stop offset="40%" stopColor={colors.secondary} stopOpacity="0.4" />
            <stop offset="100%" stopColor={colors.warning} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid pattern */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke={colors.border} strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Stress arrows - top */}
        {appliedStress > 5 && (
          <g filter="url(#glow)">
            {[...Array(5)].map((_, i) => (
              <g key={`top-${i}`} transform={`translate(${60 + i * 80}, 20)`}>
                <line x1="0" y1={30 + stretch} x2="0" y2="10" stroke="url(#stressArrow)" strokeWidth="4" strokeLinecap="round" />
                <polygon points="-6,14 6,14 0,2" fill="url(#stressArrow)" />
              </g>
            ))}
            {/* Bottom arrows */}
            {[...Array(5)].map((_, i) => (
              <g key={`bot-${i}`} transform={`translate(${60 + i * 80}, ${height - 20})`}>
                <line x1="0" y1={-30 - stretch} x2="0" y2="-10" stroke="url(#stressArrow)" strokeWidth="4" strokeLinecap="round" />
                <polygon points="-6,-14 6,-14 0,-2" fill="url(#stressArrow)" />
              </g>
            ))}
          </g>
        )}

        {/* Material specimen */}
        <g transform={`translate(${width / 2 - 100}, 50)`}>
          {/* Shadow */}
          <rect x="5" y={-stretch + 5} width="200" height={height - 100 + stretch * 2} rx="4" fill="#000" opacity="0.3" />
          {/* Main body */}
          <rect
            x="0"
            y={-stretch}
            width="200"
            height={height - 100 + stretch * 2}
            rx="4"
            fill={isFractured ? 'url(#fracturedGrad)' : 'url(#steelGrad)'}
            stroke={isFractured ? colors.accent : '#9ca3af'}
            strokeWidth="2"
          />

          {/* Notch visualizations */}
          {notchType === 'round' && (
            <g transform={`translate(100, ${(height - 100) / 2})`}>
              <circle r="18" fill={colors.bgCard} stroke={colors.border} />
            </g>
          )}
          {notchType === 'vsharp' && (
            <g transform={`translate(100, ${(height - 100) / 2})`}>
              <polygon points="0,-20 -18,0 0,20 18,0" fill={colors.bgCard} stroke={colors.border} />
            </g>
          )}
          {notchType === 'crack' && (
            <g transform={`translate(50, ${(height - 100) / 2})`}>
              <line x1="0" y1="0" x2="55" y2="0" stroke={colors.bgCard} strokeWidth="6" strokeLinecap="round" />
              <line x1="2" y1="0" x2="52" y2="0" stroke={colors.border} strokeWidth="3" strokeLinecap="round" />
            </g>
          )}

          {/* Stress concentration zone */}
          {appliedStress > 10 && notchType !== 'none' && !isFractured && (
            <g transform={`translate(100, ${(height - 100) / 2})`} filter="url(#glow)">
              <circle r={12 + localStress / 10} fill="url(#stressZone)" opacity={0.5 + appliedStress / 200} />
              {[1, 2, 3, 4].map(r => (
                <circle
                  key={r}
                  r={8 + r * 6 + Math.sin(animationFrame * 0.1 + r) * 2}
                  fill="none"
                  stroke={r % 2 === 0 ? colors.accent : colors.secondary}
                  strokeWidth={2 - r * 0.3}
                  opacity={0.6 - r * 0.1}
                />
              ))}
            </g>
          )}

          {/* Fracture line */}
          {isFractured && (
            <g transform={`translate(0, ${(height - 100) / 2})`} filter="url(#glow)">
              <line x1="0" y1="0" x2="200" y2="0" stroke={colors.accent} strokeWidth="5" strokeDasharray="15,8" />
              {[...Array(6)].map((_, i) => (
                <circle
                  key={i}
                  cx={20 + i * 35 + Math.sin(animationFrame * 0.15 + i) * 5}
                  cy={Math.cos(animationFrame * 0.2 + i) * 10}
                  r={2 + Math.sin(animationFrame * 0.3 + i)}
                  fill={colors.warning}
                  opacity={0.6 + Math.sin(animationFrame * 0.1 + i) * 0.4}
                />
              ))}
            </g>
          )}
        </g>

        {/* Info panel */}
        <g transform={`translate(${width - 100}, 60)`}>
          <rect x="0" y="0" width="85" height="100" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="42" y="25" textAnchor="middle" fill={colors.textMuted} fontSize="11">Applied</text>
          <text x="42" y="42" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">{appliedStress} MPa</text>
          <text x="42" y="60" textAnchor="middle" fill={colors.textMuted} fontSize="11">Kt</text>
          <text x="42" y="77" textAnchor="middle" fill={colors.warning} fontSize="16" fontWeight="bold">x{kt}</text>
          <text x="42" y="94" textAnchor="middle" fill={colors.accent} fontSize="10">Local: {localStress.toFixed(0)}</text>
        </g>

        {/* Fractured label */}
        {isFractured && (
          <text x={width / 2} y="40" textAnchor="middle" fill={colors.accent} fontSize="24" fontWeight="bold" filter="url(#glow)">
            FRACTURED!
          </text>
        )}

        {/* Notch type label */}
        <text x={width / 2} y={height - 15} textAnchor="middle" fill={colors.textMuted} fontSize="12">
          {notchType === 'none' ? 'Solid material' :
            notchType === 'round' ? 'Circular hole (Kt = 2-3)' :
              notchType === 'vsharp' ? 'Sharp V-notch (Kt = 5+)' :
                'Crack (Kt very high!)'}
        </text>
      </svg>
    );
  };

  // Crack Stop Visualization SVG
  const CrackStopVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 220 : 260;
    const crackTipX = 80 + crackLength;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <radialGradient id="stopHoleGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.3" />
          </radialGradient>
          <radialGradient id="crackTipStress" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.9" />
            <stop offset="40%" stopColor={colors.secondary} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors.warning} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Grid */}
        <pattern id="crackGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke={colors.border} strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width={width} height={height} fill="url(#crackGrid)" />

        {/* Stress arrows */}
        {twistStress > 5 && (
          <g filter="url(#glow)">
            {[...Array(4)].map((_, i) => (
              <g key={i}>
                <line x1={80 + i * 90} y1="25" x2={80 + i * 90} y2="45" stroke="url(#stressArrow)" strokeWidth="4" strokeLinecap="round" />
                <polygon points={`${74 + i * 90},40 ${86 + i * 90},40 ${80 + i * 90},22`} fill="url(#stressArrow)" />
                <line x1={80 + i * 90} y1={height - 25} x2={80 + i * 90} y2={height - 45} stroke="url(#stressArrow)" strokeWidth="4" strokeLinecap="round" />
                <polygon points={`${74 + i * 90},${height - 40} ${86 + i * 90},${height - 40} ${80 + i * 90},${height - 22}`} fill="url(#stressArrow)" />
              </g>
            ))}
          </g>
        )}

        {/* Metal plate */}
        <rect x="50" y="55" width={width - 100} height={height - 110} rx="4" fill="url(#plateGrad)" stroke="#6b7280" strokeWidth="2" />

        {/* Crack */}
        <line x1="48" y1={height / 2} x2={crackTipX} y2={height / 2} stroke={colors.bgPrimary} strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1={height / 2} x2={crackTipX - 2} y2={height / 2} stroke={crackLength >= 180 ? colors.accent : colors.border} strokeWidth="4" strokeLinecap="round" />

        {/* Crack tip stress field */}
        {twistStress > 10 && !hasCrackStopHole && crackLength < 180 && (
          <g transform={`translate(${crackTipX}, ${height / 2})`} filter="url(#glow)">
            <circle r={15 + twistStress / 4} fill="url(#crackTipStress)" />
            {[1, 2, 3].map(r => (
              <circle
                key={r}
                r={r * 8 + Math.sin(animationFrame * 0.12 + r) * 3}
                fill="none"
                stroke={r % 2 === 0 ? colors.secondary : colors.accent}
                strokeWidth={2.5 - r * 0.5}
                opacity={0.7 - r * 0.15}
              />
            ))}
          </g>
        )}

        {/* Stop hole */}
        {hasCrackStopHole && (
          <g transform={`translate(${crackTipX + 18}, ${height / 2})`}>
            <circle r="20" fill="url(#stopHoleGrad)" filter="url(#glow)" />
            <circle r="14" fill={colors.bgPrimary} stroke={colors.success} strokeWidth="2" />
          </g>
        )}

        {/* Info panel */}
        <g transform={`translate(${width - 95}, 60)`}>
          <rect x="0" y="0" width="80" height="55" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="40" y="22" textAnchor="middle" fill={colors.textMuted} fontSize="11">Kt at tip</text>
          <text x="40" y="44" textAnchor="middle" fill={hasCrackStopHole ? colors.success : colors.accent} fontSize="20" fontWeight="bold">
            {hasCrackStopHole ? '~3' : '~10+'}
          </text>
        </g>

        {/* Status messages */}
        {crackLength >= 180 && (
          <text x={width / 2} y="40" textAnchor="middle" fill={colors.accent} fontSize="18" fontWeight="bold">
            Complete Fracture!
          </text>
        )}
        {hasCrackStopHole && twistStress > 15 && crackLength < 180 && (
          <text x={width / 2} y="40" textAnchor="middle" fill={colors.success} fontSize="18" fontWeight="bold">
            Crack Arrested!
          </text>
        )}

        {/* Labels */}
        {hasCrackStopHole && (
          <text x={crackTipX + 18} y={height / 2 - 28} textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">
            Stop hole
          </text>
        )}
        <text x={width / 2} y={height - 12} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          {hasCrackStopHole ? 'Hole converts sharp crack to rounded edge - lower Kt' : 'Sharp crack tip has extreme stress concentration'}
        </text>
      </svg>
    );
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
          ✈️💥
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Why Airplane Windows Have Rounded Corners
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          In 1954, three de Havilland Comet jets broke apart mid-flight. The cause? <span style={{ color: colors.accent }}>Square windows</span>. Sharp corners created stress concentrations that grew into catastrophic cracks.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, fontStyle: 'italic' }}>
            "Stress flows through material like water through a pipe. At sharp corners, it crowds together - amplifying local stress by 3x, 5x, even 10x the average. That's where fractures begin."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Fracture Mechanics Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Investigate Stress Concentration
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Sharp V-notch - stress concentrates more at sharp corners', correct: true },
      { id: 'b', text: 'Circular hole - it removes more material from the plate' },
      { id: 'c', text: 'Both fail at the same load - any defect equally weakens the material' },
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
            You have two identical metal plates under the same tensile load. One has a circular hole, one has a sharp V-notch. Which breaks first?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '120px',
                  background: `linear-gradient(to bottom, #6b7280, #4b5563)`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: colors.bgCard,
                    border: `2px solid ${colors.border}`,
                  }} />
                </div>
                <p style={{ ...typo.small, color: colors.textSecondary }}>Circular Hole</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '120px',
                  background: `linear-gradient(to bottom, #6b7280, #4b5563)`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    width: '0',
                    height: '0',
                    borderLeft: '15px solid transparent',
                    borderRight: '15px solid transparent',
                    borderBottom: `30px solid ${colors.bgCard}`,
                  }} />
                </div>
                <p style={{ ...typo.small, color: colors.textSecondary }}>Sharp V-Notch</p>
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

  // PLAY PHASE - Interactive Stress Concentration Simulator
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
            Stress Concentration Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Change the defect type and applied stress to see how geometry affects fracture behavior.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <StressVisualization />
            </div>

            {/* Defect type selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                Defect Type:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'none', label: 'None' },
                  { id: 'round', label: 'Round Hole' },
                  { id: 'vsharp', label: 'V-Notch' },
                  { id: 'crack', label: 'Crack' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      playSound('click');
                      setNotchType(opt.id as typeof notchType);
                      setAppliedStress(30);
                      setIsFractured(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${notchType === opt.id ? colors.accent : colors.border}`,
                      background: notchType === opt.id ? `${colors.accent}22` : 'transparent',
                      color: notchType === opt.id ? colors.accent : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stress slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Applied Stress</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{appliedStress} MPa</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={appliedStress}
                onChange={(e) => setAppliedStress(parseInt(e.target.value))}
                disabled={isFractured}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${appliedStress}%, ${colors.border} ${appliedStress}%)`,
                  cursor: isFractured ? 'not-allowed' : 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>0</span>
                <span style={{ ...typo.small, color: colors.warning }}>Fracture threshold: {getFractureStress(notchType).toFixed(0)} MPa</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>100</span>
              </div>
            </div>

            {/* Reset button */}
            {isFractured && (
              <button
                onClick={() => {
                  playSound('click');
                  setIsFractured(false);
                  setAppliedStress(30);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                Reset Experiment
              </button>
            )}

            {/* Info box */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Stress Concentration Factor (Kt):</strong> The ratio of maximum local stress to average stress. Sharper features have higher Kt values and fracture at lower applied loads!
              </p>
            </div>
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
    const wasCorrect = prediction === 'a';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Prediction result */}
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasCorrect ? 'Correct! Sharp corners create the highest stress concentration.' : 'The V-notch actually fails first due to higher stress concentration.'}
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Sharp Corners Fail
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.accent,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>1</div>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Stress Flow Lines</h3>
                  <p style={{ ...typo.body, color: colors.textSecondary, margin: '4px 0 0' }}>
                    Stress "flows" through material like water. It must go around obstacles and crowd together at sharp features.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.secondary,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>2</div>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Concentration at Corners</h3>
                  <p style={{ ...typo.body, color: colors.textSecondary, margin: '4px 0 0' }}>
                    Sharp corners force stress into a tiny area. Local stress can be 3-10x the average applied stress.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.warning,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>3</div>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Crack Initiation</h3>
                  <p style={{ ...typo.body, color: colors.textSecondary, margin: '4px 0 0' }}>
                    When local stress exceeds material strength, cracks begin. Once started, they propagate rapidly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>
              Engineering Rule
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Always use fillets (rounded transitions) at corners. A fillet radius of just 1-2mm can reduce stress concentration by 50%!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            But Wait... A Twist!
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The hole blunts the sharp crack tip, reducing stress concentration', correct: true },
      { id: 'b', text: 'It drains moisture that would otherwise cause corrosion cracking' },
      { id: 'c', text: 'It makes welding the crack easier for permanent repair' },
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
            background: `${colors.secondary}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.secondary}44`,
          }}>
            <p style={{ ...typo.small, color: colors.secondary, margin: 0 }}>
              The Twist: Counterintuitive Repair
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A ship hull develops a crack. Surprisingly, the repair involves <span style={{ color: colors.success }}>drilling a HOLE</span> at the crack tip! Why would making the defect bigger help?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <div>
                <div style={{
                  width: '120px',
                  height: '60px',
                  background: '#475569',
                  borderRadius: '4px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: '40px',
                    height: '3px',
                    background: colors.bgCard,
                    marginLeft: '-5px',
                  }} />
                </div>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>Crack with sharp tip</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.success }}>+</div>
              <div>
                <div style={{
                  width: '120px',
                  height: '60px',
                  background: '#475569',
                  borderRadius: '4px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: '40px',
                    height: '3px',
                    background: colors.bgCard,
                    marginLeft: '-5px',
                  }} />
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: colors.bgCard,
                    border: `2px solid ${colors.success}`,
                    marginLeft: '-8px',
                  }} />
                </div>
                <p style={{ ...typo.small, color: colors.success, marginTop: '8px' }}>Crack with stop-drill hole</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.secondary}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.secondary : colors.border}`,
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
                  background: twistPrediction === opt.id ? colors.secondary : colors.bgSecondary,
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
              Test the Crack-Stop Hole
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
            Crack-Stop Hole Simulation
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how a drilled hole can arrest crack propagation
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <CrackStopVisualization />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setHasCrackStopHole(!hasCrackStopHole);
                  setCrackLength(20);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: hasCrackStopHole ? colors.success : colors.bgSecondary,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {hasCrackStopHole ? 'Stop Hole Added' : 'Add Stop Hole'}
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setCrackLength(20);
                  setTwistStress(20);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>

            {/* Stress slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Applied Stress</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistStress} MPa</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={twistStress}
                onChange={(e) => setTwistStress(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Info box */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>The Crack-Stop Hole</strong> converts an infinitely sharp crack tip (Kt very high) into a rounded edge (Kt of about 3). This dramatically reduces stress concentration and arrests crack growth!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why This Works
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'a';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Prediction result */}
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${wasCorrect ? colors.success : colors.warning}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: wasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {wasCorrect ? 'Correct! The hole blunts the sharp crack tip.' : 'The key is that the hole blunts the sharp crack tip, reducing Kt.'}
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Fighting Cracks with Holes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>Sharp Crack Tip</span>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Kt approaches infinity. The crack grows under any stress because energy release exceeds surface energy.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>After Stop Hole</span>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Kt drops to about 2-3 (like a circular hole). The crack is arrested because stress no longer exceeds fracture threshold!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>Real Applications</span>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Ship hulls, aircraft fuselages, bridges, and pressure vessels all use this technique. Drill and fill for permanent repair!
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
                    OK
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
                Connection to Stress Concentration:
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
                ? 'You understand fracture mechanics and stress concentration!'
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
          Fracture Mechanics Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why airplane windows have rounded corners and how engineers prevent catastrophic failures.
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
              'Stress concentration at defects and sharp corners',
              'Why Kt determines fracture threshold',
              'The Griffith criterion for crack propagation',
              'How crack-stop holes arrest fracture',
              'Real-world applications in aircraft and ships',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>OK</span>
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

export default FractureMechanicsRenderer;
