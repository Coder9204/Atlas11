'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Galvanic Corrosion - Complete 10-Phase Game
// Electrochemical corrosion between dissimilar metals in an electrolyte
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

interface GalvanicCorrosionRendererProps {
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
    scenario: "A steel bolt is used to join two aluminum sheets on a boat hull exposed to seawater.",
    question: "Which metal will corrode preferentially in this galvanic couple?",
    options: [
      { id: 'a', label: "Steel - it's more noble than aluminum" },
      { id: 'b', label: "Aluminum - it's more anodic (active) than steel", correct: true },
      { id: 'c', label: "Both metals corrode equally" },
      { id: 'd', label: "Neither - seawater prevents corrosion" }
    ],
    explanation: "Aluminum is more anodic (active) than steel in the galvanic series. When coupled in seawater, aluminum acts as the anode and corrodes to protect the steel cathode."
  },
  {
    scenario: "A copper pipe is directly connected to a steel pipe in a home plumbing system.",
    question: "What is the driving force behind galvanic corrosion?",
    options: [
      { id: 'a', label: "Temperature difference between the metals" },
      { id: 'b', label: "Electrochemical potential difference between dissimilar metals", correct: true },
      { id: 'c', label: "Water pressure in the pipes" },
      { id: 'd', label: "Gravitational forces on the metals" }
    ],
    explanation: "Galvanic corrosion is driven by the electrochemical potential difference between two dissimilar metals. This voltage difference causes electrons to flow from the anode to the cathode."
  },
  {
    scenario: "An engineer wants to protect a steel structure from galvanic corrosion in a marine environment.",
    question: "What is cathodic protection using sacrificial anodes?",
    options: [
      { id: 'a', label: "Coating the steel with paint to isolate it" },
      { id: 'b', label: "Attaching a more active metal (like zinc) that corrodes instead of the steel", correct: true },
      { id: 'c', label: "Using plastic insulators between all metal connections" },
      { id: 'd', label: "Keeping the structure completely dry" }
    ],
    explanation: "Sacrificial anodes are made of more active metals (zinc, magnesium, aluminum alloys) that corrode preferentially, protecting the more noble steel structure which becomes the cathode."
  },
  {
    scenario: "A stainless steel screw is used to fasten a zinc bracket to a painted steel panel.",
    question: "What three elements are required for galvanic corrosion to occur?",
    options: [
      { id: 'a', label: "Two dissimilar metals, electrical contact, and an electrolyte", correct: true },
      { id: 'b', label: "Two metals, heat source, and oxygen" },
      { id: 'c', label: "One metal, acid, and sunlight" },
      { id: 'd', label: "Two metals, high pressure, and vacuum" }
    ],
    explanation: "Galvanic corrosion requires: (1) two metals with different electrochemical potentials, (2) electrical contact between them, and (3) an electrolyte (conductive solution) to complete the circuit."
  },
  {
    scenario: "In a galvanic cell formed by iron and copper in saltwater, electrons flow through the metallic connection.",
    question: "In which direction do electrons flow in a galvanic couple?",
    options: [
      { id: 'a', label: "From cathode (more noble) to anode (more active)" },
      { id: 'b', label: "From anode (more active) to cathode (more noble)", correct: true },
      { id: 'c', label: "In both directions equally" },
      { id: 'd', label: "Only through the electrolyte, not the metals" }
    ],
    explanation: "Electrons flow from the anode (more active metal) to the cathode (more noble metal) through the metallic pathway. The anode loses electrons (oxidizes) and corrodes."
  },
  {
    scenario: "A marine engineer is selecting materials to minimize galvanic corrosion on a ship hull.",
    question: "What effect does the anode-to-cathode area ratio have on corrosion rate?",
    options: [
      { id: 'a', label: "Area ratio has no effect on corrosion rate" },
      { id: 'b', label: "Large cathode + small anode causes rapid anode corrosion", correct: true },
      { id: 'c', label: "Large anode + small cathode causes rapid anode corrosion" },
      { id: 'd', label: "Equal areas always produce the fastest corrosion" }
    ],
    explanation: "A large cathode area relative to a small anode area accelerates corrosion because the cathodic reaction is spread over a large area while the anodic reaction is concentrated, intensifying local attack."
  },
  {
    scenario: "An aircraft maintenance technician notices corrosion around aluminum rivets on a steel panel.",
    question: "Why is aluminum often preferred for aircraft skins despite being anodic?",
    options: [
      { id: 'a', label: "Aluminum is cheaper than other metals" },
      { id: 'b', label: "Aluminum forms a protective oxide layer and is lightweight", correct: true },
      { id: 'c', label: "Aluminum is stronger than steel" },
      { id: 'd', label: "Aluminum is actually more noble than most aircraft metals" }
    ],
    explanation: "Aluminum forms a tenacious aluminum oxide (Al2O3) passive layer that protects against further corrosion. Combined with its excellent strength-to-weight ratio, this makes it ideal for aerospace applications."
  },
  {
    scenario: "A pipeline engineer is designing corrosion protection for an underground steel gas pipeline.",
    question: "How does impressed current cathodic protection (ICCP) differ from sacrificial anodes?",
    options: [
      { id: 'a', label: "ICCP uses special coatings while sacrificial anodes don't" },
      { id: 'b', label: "ICCP uses an external power source to drive protective current", correct: true },
      { id: 'c', label: "ICCP requires no external power while sacrificial anodes do" },
      { id: 'd', label: "They work exactly the same way" }
    ],
    explanation: "ICCP uses an external DC power source to force current onto the structure, making it the cathode. This allows protection over larger areas and longer distances than passive sacrificial anodes."
  },
  {
    scenario: "Seawater is a common electrolyte that promotes galvanic corrosion.",
    question: "Why does seawater accelerate galvanic corrosion compared to pure water?",
    options: [
      { id: 'a', label: "Dissolved salts increase ionic conductivity of the electrolyte", correct: true },
      { id: 'b', label: "Seawater is colder than pure water" },
      { id: 'c', label: "Ocean pressure compresses the metals together" },
      { id: 'd', label: "Marine organisms directly attack the metals" }
    ],
    explanation: "Seawater contains dissolved salts (mainly NaCl) that dramatically increase its ionic conductivity, allowing ions to flow more easily and accelerating the electrochemical corrosion reactions."
  },
  {
    scenario: "A car manufacturer is designing a vehicle with mixed aluminum and steel body panels.",
    question: "What is the most effective method to prevent galvanic corrosion between dissimilar metals?",
    options: [
      { id: 'a', label: "Electrically isolate the metals using non-conductive barriers", correct: true },
      { id: 'b', label: "Weld the metals together for better contact" },
      { id: 'c', label: "Keep the joint constantly wet" },
      { id: 'd', label: "Apply heat to equalize the metal potentials" }
    ],
    explanation: "Breaking the electrical path between dissimilar metals prevents electron flow and stops galvanic corrosion. This is achieved using insulating washers, coatings, sealants, or non-conductive gaskets."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🚢',
    title: 'Marine Engineering',
    short: 'Ships & Offshore',
    tagline: 'Protecting vessels from the corrosive sea',
    description: 'Ships are floating galvanic cells, with hulls, propellers, and fittings made from different metals all immersed in highly conductive seawater. Marine engineers must carefully manage galvanic couples to prevent catastrophic hull failures.',
    connection: 'Just like our demonstration shows electron flow between dissimilar metals, ship hulls experience the same electrochemical attack. Steel hulls connected to bronze propellers create massive galvanic cells where the more active metal corrodes rapidly without protection.',
    howItWorks: 'Marine engineers attach zinc or aluminum sacrificial anodes to steel hulls. These anodes are more electrochemically active than the hull steel, so they corrode preferentially, sacrificing themselves to protect the ship. The anodes must be replaced periodically as they are consumed.',
    stats: [
      { value: '$80 billion', label: 'Annual corrosion cost globally', icon: '💰' },
      { value: '25%', label: 'Hull thickness lost without protection', icon: '🚢' },
      { value: '850 V', label: 'Protection potential target', icon: '🔄' }
    ],
    examples: ['Zinc anodes welded to steel ship hulls', 'Bronze propellers isolated from steel shafts', 'ICCP systems on aircraft carriers', 'Aluminum anode bars in ballast tanks'],
    companies: ['Cathelco', 'Jotun Marine Coatings', 'DNV Maritime', 'CORROSION Service'],
    futureImpact: 'Smart anode systems with embedded sensors will monitor real-time corrosion rates and remaining anode life, automatically adjusting ICCP current.',
    color: '#0ea5e9'
  },
  {
    icon: '🚗',
    title: 'Automotive Design',
    short: 'Mixed Metals',
    tagline: 'Lightweight vehicles without the rust',
    description: 'Modern vehicles combine aluminum, magnesium, carbon fiber, and high-strength steel to reduce weight and improve fuel efficiency. Each material junction is a potential galvanic corrosion site that must be engineered for the 10+ year vehicle lifespan.',
    connection: 'Our galvanic corrosion demonstration shows exactly what happens at every aluminum-to-steel joint in a car body. Road salt spray acts as the electrolyte, turning joints into active galvanic cells.',
    howItWorks: 'Automotive engineers use multiple strategies: structural adhesives create insulating barriers, zinc-rich primers provide sacrificial protection, and e-coat applies uniform corrosion-resistant coatings. Self-piercing rivets with polymer coatings join aluminum to steel without creating bare metal contact.',
    stats: [
      { value: '40%', label: 'Weight reduction target', icon: '⚖️' },
      { value: '12 yrs', label: 'Corrosion warranty period', icon: '📜' },
      { value: '$6 billion', label: 'Annual prevention spend', icon: '💵' }
    ],
    examples: ['Ford F-150 aluminum body on steel frame', 'Tesla Model S multi-material design', 'BMW i3 carbon fiber chassis', 'Audi Space Frame joints'],
    companies: ['Henkel Adhesives', 'PPG Automotive', 'Novelis Aluminum', 'BASF Coatings'],
    futureImpact: 'Self-healing coatings will automatically repair scratches before galvanic corrosion initiates. Graphene-based barriers will enable even more aggressive lightweighting.',
    color: '#f59e0b'
  },
  {
    icon: '🛢️',
    title: 'Pipeline Protection',
    short: 'Oil and Gas',
    tagline: 'Safeguarding critical infrastructure underground',
    description: 'Millions of miles of steel pipelines transport oil, gas, and water underground, constantly threatened by soil corrosion. Cathodic protection systems form an invisible shield, using electrochemistry to keep pipelines intact for decades.',
    connection: 'Our demonstration shows how connecting a more active metal protects a less active one. Pipeline cathodic protection scales this principle to continental distances.',
    howItWorks: 'For short pipelines, magnesium or zinc sacrificial anode beds are buried near the pipe. For long-distance lines, impressed current cathodic protection (ICCP) uses transformer-rectifiers to force current onto the pipe through deep groundbeds.',
    stats: [
      { value: '4200000 km', label: 'US pipeline network total', icon: '📏' },
      { value: '99%', label: 'Required reliability level', icon: '✅' },
      { value: '850 mV', label: 'Protection potential target', icon: '⚡' }
    ],
    examples: ['Trans-Alaska Pipeline ICCP system', 'Natural gas distribution networks', 'Offshore platform protection', 'Water transmission mains'],
    companies: ['MATCOR Inc.', 'Corrpro Companies', 'Aegion Corporation', 'Cathodic Technology'],
    futureImpact: 'Remote monitoring with IoT sensors will provide real-time corrosion data across entire pipeline networks. AI systems will predict corrosion hotspots.',
    color: '#22c55e'
  },
  {
    icon: '✈️',
    title: 'Aircraft Manufacturing',
    short: 'Aerospace',
    tagline: 'When corrosion prevention is life-critical',
    description: 'Aircraft structures combine aluminum alloys, titanium, carbon fiber composites, and steel fasteners in environments ranging from tropical humidity to sub-zero altitudes. A single corroded joint can ground an aircraft.',
    connection: 'Our galvanic corrosion experiment demonstrates the exact failure mechanism that aerospace engineers fight constantly. When aluminum skin contacts steel fasteners in condensation, galvanic corrosion begins immediately.',
    howItWorks: 'Aerospace engineers use a multi-barrier approach: anodizing creates an aluminum oxide layer, chromate conversion coatings provide backup, and sealants exclude moisture. Titanium fasteners are used near carbon fiber because titanium is more compatible.',
    stats: [
      { value: '$2 billion', label: 'Annual maintenance cost globally', icon: '🔧' },
      { value: '30 yrs', label: 'Aircraft service life target', icon: '✈️' },
      { value: '5000 kg', label: 'Fasteners per wing section', icon: '🔩' }
    ],
    examples: ['Boeing 787 titanium fasteners with CFRP', 'Airbus A380 cadmium-plated fasteners', 'F-35 multi-material airframe', 'Helicopter rotor hub protection'],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'PPG Aerospace'],
    futureImpact: 'Embedded corrosion sensors will continuously monitor joints in real-time during flight. Self-repairing nano-capsule coatings will release inhibitors when damage occurs.',
    color: '#8b5cf6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GalvanicCorrosionRenderer: React.FC<GalvanicCorrosionRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [anodeMetal, setAnodeMetal] = useState<'zinc' | 'aluminum' | 'magnesium'>('zinc');
  const [cathodeMetal, setCathodeMetal] = useState<'copper' | 'steel' | 'gold'>('copper');
  const [electrolyteStrength, setElectrolyteStrength] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [corrosionLevel, setCorrosionLevel] = useState(0);
  const [electronFlow, setElectronFlow] = useState(0);
  const animationRef = useRef<number>();

  // Twist phase state
  const [areaRatio, setAreaRatio] = useState(70); // Anode:Cathode ratio
  const [hasCoating, setHasCoating] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [confirmedAnswers, setConfirmedAnswers] = useState<boolean[]>(Array(10).fill(false));
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

  // Metal potentials for corrosion calculation
  const metalPotentials: Record<string, number> = {
    magnesium: -2.37,
    zinc: -0.76,
    aluminum: -0.66,
    iron: -0.44,
    steel: -0.20,
    copper: 0.34,
    gold: 1.50
  };

  // Calculate corrosion rate
  const getCorrosionRate = useCallback(() => {
    if (!isRunning) return 0;
    const anodePotential = metalPotentials[anodeMetal];
    const cathodePotential = metalPotentials[cathodeMetal];
    const voltageDiff = cathodePotential - anodePotential;
    const areaFactor = phase === 'twist_play' ? (100 - areaRatio) / 50 : 1;
    const coatingFactor = phase === 'twist_play' && hasCoating ? 0.2 : 1;
    return voltageDiff * (electrolyteStrength / 100) * areaFactor * coatingFactor * 0.5;
  }, [isRunning, anodeMetal, cathodeMetal, electrolyteStrength, areaRatio, hasCoating, phase]);

  // Animation loop
  useEffect(() => {
    const rate = getCorrosionRate();
    if (rate > 0) {
      const animate = () => {
        setCorrosionLevel(prev => Math.min(prev + rate * 0.1, 100));
        setElectronFlow(prev => (prev + rate * 5) % 100);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getCorrosionRate]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#ef4444', // Rust red for corrosion theme
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    secondary: '#3b82f6', // Blue for cathode
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
    anode: '#ef4444',
    cathode: '#3b82f6',
    electrolyte: '#22d3ee',
    electrons: '#fbbf24',
    ions: '#a855f7',
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
    twist_play: 'Explore Ratio',
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
        gameType: 'galvanic-corrosion',
        gameTitle: 'Galvanic Corrosion',
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

  // Calculate voltage for display
  const getVoltage = useCallback(() => {
    const anodePotential = metalPotentials[anodeMetal];
    const cathodePotential = metalPotentials[cathodeMetal];
    return cathodePotential - anodePotential;
  }, [anodeMetal, cathodeMetal]);

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.warning})`,
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

  // Bottom navigation bar with Back and Next
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestActive = phase === 'test' && !testSubmitted;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderTop: `1px solid ${colors.border}`,
        background: colors.bgPrimary,
      }}>
        <button
          onClick={prevPhase}
          disabled={currentIndex === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIndex === 0 ? colors.border : colors.textSecondary,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          ← Back
        </button>
        {renderNavDots()}
        <button
          onClick={nextPhase}
          disabled={currentIndex === phaseOrder.length - 1 || isTestActive}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: (currentIndex === phaseOrder.length - 1 || isTestActive) ? colors.border : colors.accent,
            color: 'white',
            cursor: (currentIndex === phaseOrder.length - 1 || isTestActive) ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: (currentIndex === phaseOrder.length - 1 || isTestActive) ? 0.4 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #dc2626)`,
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

  // Galvanic Cell Visualization - used in play, predict, twist phases
  const renderGalvanicCellSVG = (showMarker?: boolean, markerValue?: number) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;
    const anodeX = width * 0.25;
    const cathodeX = width * 0.75;
    const electrodeY = height * 0.55;
    const electrodeHeight = height * 0.35;
    const aw = phase === 'twist_play' ? width * 0.08 * (areaRatio / 50) : width * 0.1;
    const cw = phase === 'twist_play' ? width * 0.08 * ((100 - areaRatio) / 50) : width * 0.1;

    // Corrosion rate curve path (voltage vs electrolyte for current metals)
    const curvePoints: string[] = [];
    const plotX0 = width * 0.1;
    const plotW = width * 0.8;
    const plotY0 = height * 0.35;
    const plotH = height * 0.5;
    const voltage = getVoltage();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const eStr = t * 100;
      const rate = voltage * (eStr / 100) * 0.5;
      const px = plotX0 + t * plotW;
      const py = Math.max(plotY0, plotY0 + plotH - (rate / 0.65) * plotH);
      curvePoints.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    const curvePath = curvePoints.join(' ');

    // Interactive marker position
    const markerT = (markerValue ?? electrolyteStrength) / 100;
    const markerPx = plotX0 + markerT * plotW;
    const markerRate = voltage * markerT * 0.5;
    const markerPy = Math.max(plotY0, plotY0 + plotH - (markerRate / 0.65) * plotH);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: width, background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="electrolyteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.electrolyte} stopOpacity="0.1" />
            <stop offset="100%" stopColor={colors.electrolyte} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="100%" stopColor={colors.error} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines for reference */}
        <g>
          <line x1={plotX0} y1={plotY0} x2={plotX0 + plotW} y2={plotY0} stroke={colors.border} strokeDasharray="4 4" opacity="0.5" />
          <line x1={plotX0} y1={plotY0 + plotH * 0.25} x2={plotX0 + plotW} y2={plotY0 + plotH * 0.25} stroke={colors.border} strokeDasharray="4 4" opacity="0.4" />
          <line x1={plotX0} y1={plotY0 + plotH * 0.5} x2={plotX0 + plotW} y2={plotY0 + plotH * 0.5} stroke={colors.border} strokeDasharray="4 4" opacity="0.4" />
          <line x1={plotX0} y1={plotY0 + plotH * 0.75} x2={plotX0 + plotW} y2={plotY0 + plotH * 0.75} stroke={colors.border} strokeDasharray="4 4" opacity="0.4" />
          <line x1={plotX0} y1={plotY0 + plotH} x2={plotX0 + plotW} y2={plotY0 + plotH} stroke={colors.border} strokeDasharray="4 4" opacity="0.5" />
        </g>

        {/* Electrolyte container */}
        <g>
          <rect
            x={width * 0.1}
            y={height * 0.35}
            width={width * 0.8}
            height={height * 0.5}
            fill="url(#electrolyteGrad)"
            stroke={colors.electrolyte}
            strokeWidth="2"
            rx="8"
          />
          <text x={width / 2} y={height * 0.9} textAnchor="middle" fill={colors.electrolyte} fontSize="12">
            Electrolyte ({electrolyteStrength}% concentration)
          </text>
        </g>

        {/* Anode (corroding metal) */}
        <g>
          <rect
            x={anodeX - aw / 2}
            y={electrodeY - electrodeHeight / 2 + (corrosionLevel / 200) * electrodeHeight}
            width={aw}
            height={electrodeHeight * (1 - corrosionLevel / 100)}
            fill={colors.anode}
            stroke={colors.error}
            strokeWidth="2"
            rx="4"
            filter={isRunning ? "url(#glow)" : ""}
          />
          {isRunning && corrosionLevel > 10 && (
            <>
              <circle cx={anodeX + 15} cy={electrodeY + 20} r="3" fill={colors.anode} opacity="0.6" />
              <circle cx={anodeX - 12} cy={electrodeY + 35} r="2" fill={colors.anode} opacity="0.5" />
              <circle cx={anodeX + 8} cy={electrodeY + 45} r="2.5" fill={colors.anode} opacity="0.4" />
            </>
          )}
          <text x={anodeX} y={height * 0.18} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
            Anode
          </text>
          <text x={anodeX} y={height * 0.24} textAnchor="middle" fill={colors.anode} fontSize="11">
            {anodeMetal.toUpperCase()}
          </text>
          <text x={anodeX} y={height * 0.29} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            (Corroding)
          </text>
        </g>

        {/* Cathode (protected metal) */}
        <g>
          <rect
            x={cathodeX - cw / 2}
            y={electrodeY - electrodeHeight / 2}
            width={cw}
            height={electrodeHeight}
            fill={colors.cathode}
            stroke={colors.secondary}
            strokeWidth="2"
            rx="4"
          />
          <text x={cathodeX} y={height * 0.18} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
            Cathode
          </text>
          <text x={cathodeX} y={height * 0.24} textAnchor="middle" fill={colors.cathode} fontSize="11">
            {cathodeMetal.toUpperCase()}
          </text>
          <text x={cathodeX} y={height * 0.29} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            (Protected)
          </text>
        </g>

        {/* Wire connection */}
        <g>
          <line x1={anodeX} y1={height * 0.35} x2={anodeX} y2={height * 0.05} stroke={colors.electrons} strokeWidth="3" />
          <line x1={anodeX} y1={height * 0.05} x2={cathodeX} y2={height * 0.05} stroke={colors.electrons} strokeWidth="3" />
          <line x1={cathodeX} y1={height * 0.05} x2={cathodeX} y2={height * 0.35} stroke={colors.electrons} strokeWidth="3" />

          {/* Electron flow animation */}
          {isRunning && (
            <>
              <circle cx={anodeX + (cathodeX - anodeX) * (electronFlow / 100)} cy={height * 0.05} r="5" fill={colors.electrons} filter="url(#glow)" />
              <circle cx={anodeX + (cathodeX - anodeX) * ((electronFlow + 33) % 100 / 100)} cy={height * 0.05} r="5" fill={colors.electrons} filter="url(#glow)" />
              <circle cx={anodeX + (cathodeX - anodeX) * ((electronFlow + 66) % 100 / 100)} cy={height * 0.05} r="5" fill={colors.electrons} filter="url(#glow)" />
            </>
          )}
        </g>

        {/* Ion flow in electrolyte */}
        {isRunning && (
          <g>
            <circle cx={cathodeX - (cathodeX - anodeX) * (electronFlow / 100)} cy={electrodeY} r="4" fill={colors.ions} opacity="0.8" />
            <circle cx={cathodeX - (cathodeX - anodeX) * ((electronFlow + 50) % 100 / 100)} cy={electrodeY + 20} r="4" fill={colors.ions} opacity="0.6" />
          </g>
        )}

        {/* Corrosion rate curve */}
        <g>
          <path d={curvePath} fill="none" stroke="url(#curveGrad)" strokeWidth="2.5" />
        </g>

        {/* Interactive marker */}
        {showMarker && (
          <circle cx={markerPx} cy={markerPy} r="7" fill={colors.warning} stroke="white" strokeWidth="2" />
        )}

        {/* Labels */}
        <g>
          <text x={width / 2} y={height * 0.04} textAnchor="middle" fill={colors.electrons} fontSize="11">
            e⁻ flow →
          </text>
        </g>

        {/* Voltage display */}
        <g>
          <rect x={width / 2 - 55} y={height * 0.38} width="110" height="36" rx="6" fill={colors.bgSecondary} stroke={colors.border} />
          <text x={width / 2} y={height * 0.44} textAnchor="middle" fill={colors.warning} fontSize="16" fontWeight="bold">
            {getVoltage().toFixed(2)} V
          </text>
          <text x={width / 2} y={height * 0.49} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Cell Voltage
          </text>
        </g>

        {/* Corrosion meter */}
        <g>
          <rect x={width - 40} y={height * 0.35} width="20" height={height * 0.5} rx="4" fill={colors.bgSecondary} stroke={colors.border} />
          <rect
            x={width - 38}
            y={height * 0.35 + height * 0.5 * (1 - corrosionLevel / 100)}
            width="16"
            height={height * 0.5 * (corrosionLevel / 100)}
            rx="3"
            fill={corrosionLevel > 70 ? colors.error : corrosionLevel > 40 ? colors.warning : colors.success}
          />
          <text x={width - 30} y={height * 0.92} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            {corrosionLevel.toFixed(0)}%
          </text>
        </g>
      </svg>
    );
  };

  // Shared page wrapper with scroll support - implemented as a function, NOT a component,
  // to avoid React reconciliation issues (inline components cause unmount/remount on every render)
  const wrapPage = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh',
      background: colors.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '16px',
      }}>
        {children}
      </div>
      {renderBottomNav()}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return wrapPage(
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          minHeight: '60vh',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🔋⚡
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            The Hidden Battery in Your Car
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            What if every bolt, screw, and weld in your car was secretly generating electricity?
            When different metals touch in the presence of moisture, they form tiny batteries
            that slowly <span style={{ color: colors.accent }}>destroy themselves</span>.
            This is galvanic corrosion — the same process that sank ships and costs the world trillions each year.
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
              &quot;Galvanic corrosion occurs when two dissimilar metals are electrically connected in an electrolyte. The more active metal becomes the anode and corrodes, while the noble metal is protected as the cathode.&quot;
            </p>
            <p style={{ ...typo.small, color: 'rgba(156, 163, 175, 0.7)', marginTop: '8px' }}>
              — Corrosion Engineering
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Discover Galvanic Corrosion →
          </button>
        </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Both metals will corrode at the same rate' },
      { id: 'b', text: 'The steel nail will corrode much faster than normal', correct: true },
      { id: 'c', text: 'The copper penny will corrode faster than normal' },
      { id: 'd', text: 'Neither will corrode - saltwater prevents rust' },
    ];

    return wrapPage(
        <div style={{ maxWidth: '700px', margin: '20px auto 0', padding: '0 24px' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A steel nail and a copper penny are placed in a glass of saltwater, touching each other. What happens over the next few days?
          </h2>

          {/* Static galvanic cell diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            {renderGalvanicCellSVG()}
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
                  transition: 'all 0.2s ease',
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
              Test My Prediction →
            </button>
          )}
        </div>
    );
  }

  // PLAY PHASE - Interactive Galvanic Cell Simulator
  if (phase === 'play') {
    return wrapPage(
        <div style={{ maxWidth: '800px', margin: '20px auto 0', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Galvanic Corrosion Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            Create a galvanic cell and observe how different metals corrode at different rates.
            When you increase the electrolyte concentration, notice how the corrosion rate changes because the ionic conductivity increases.
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            The corrosion rate is calculated as: V = (E_cathode - E_anode) × concentration. This is important in engineering applications where dissimilar metals must be joined.
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
                  {renderGalvanicCellSVG(true, electrolyteStrength)}
                </div>

                {/* Comparison info row */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around', marginBottom: '20px', gap: '12px' }}>
                  <div style={{ textAlign: 'center', flex: 1, background: colors.bgSecondary, borderRadius: '8px', padding: '8px' }}>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Reference Voltage</div>
                    <div style={{ ...typo.h3, color: colors.warning }}>{getVoltage().toFixed(2)} V</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1, background: colors.bgSecondary, borderRadius: '8px', padding: '8px' }}>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Current Rate</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{(getVoltage() * electrolyteStrength / 100 * 0.5).toFixed(3)} V</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1, background: colors.bgSecondary, borderRadius: '8px', padding: '8px' }}>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Corrosion</div>
                    <div style={{ ...typo.h3, color: corrosionLevel > 70 ? colors.error : corrosionLevel > 40 ? colors.warning : colors.success }}>{corrosionLevel.toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Anode selector */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Anode Metal (Active)</span>
                    <span style={{ ...typo.small, color: colors.anode, fontWeight: 600 }}>{anodeMetal}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['magnesium', 'zinc', 'aluminum'] as const).map(metal => (
                      <button
                        key={metal}
                        onClick={() => { setAnodeMetal(metal); setCorrosionLevel(0); }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${anodeMetal === metal ? colors.anode : colors.border}`,
                          background: anodeMetal === metal ? `${colors.anode}22` : 'transparent',
                          color: colors.textPrimary,
                          cursor: 'pointer',
                          fontSize: '13px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {metal.charAt(0).toUpperCase() + metal.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cathode selector */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Cathode Metal (Noble)</span>
                    <span style={{ ...typo.small, color: colors.cathode, fontWeight: 600 }}>{cathodeMetal}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['copper', 'steel', 'gold'] as const).map(metal => (
                      <button
                        key={metal}
                        onClick={() => { setCathodeMetal(metal); setCorrosionLevel(0); }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: `2px solid ${cathodeMetal === metal ? colors.cathode : colors.border}`,
                          background: cathodeMetal === metal ? `${colors.cathode}22` : 'transparent',
                          color: colors.textPrimary,
                          cursor: 'pointer',
                          fontSize: '13px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {metal.charAt(0).toUpperCase() + metal.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Electrolyte slider */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Electrolyte Strength</span>
                    <span style={{ ...typo.small, color: colors.electrolyte, fontWeight: 600 }}>{electrolyteStrength}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={electrolyteStrength}
                    onChange={(e) => setElectrolyteStrength(Number(e.target.value))}
                    style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.electrolyte, touchAction: 'pan-y' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>10 (Min)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>100 (Max)</span>
                  </div>
                </div>

                {/* Control buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => { setIsRunning(!isRunning); playSound('click'); }}
                    style={{
                      padding: '14px 32px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isRunning ? colors.error : colors.success,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isRunning ? 'Stop Reaction' : 'Start Reaction'}
                  </button>
                  <button
                    onClick={() => { setCorrosionLevel(0); setIsRunning(false); }}
                    style={{
                      padding: '14px 32px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {corrosionLevel > 50 && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice how the {anodeMetal} anode is dissolving while the {cathodeMetal} cathode stays protected!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Science →
          </button>
        </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return wrapPage(
        <div style={{ maxWidth: '700px', margin: '20px auto 0', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Galvanic Series
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>What You Observed:</strong> Because two dissimilar metals are connected in an electrolyte, the more <span style={{ color: colors.anode }}>active</span> metal loses electrons and corrodes, while the more <span style={{ color: colors.cathode }}>noble</span> metal is protected. This demonstrates the principle of galvanic corrosion.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Why It Happens:</strong> Each metal has a characteristic <span style={{ color: colors.warning }}>electrochemical potential</span>. The voltage difference between two metals drives electron flow from anode to cathode. This is the key insight that explains galvanic corrosion.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Galvanic Series:</strong> Metals ranked from most active (anodic) to most noble (cathodic):
              </p>
            </div>

            {/* Galvanic series visualization */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              margin: '16px 0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.anode, fontWeight: 600 }}>ACTIVE (Anodic)</span>
                <span style={{ ...typo.small, color: colors.cathode, fontWeight: 600 }}>NOBLE (Cathodic)</span>
              </div>
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '12px 0',
              }}>
                {['Mg', 'Zn', 'Al', 'Fe', 'Ni', 'Sn', 'Pb', 'Cu', 'Ag', 'Au'].map((metal, i) => (
                  <div
                    key={metal}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      background: `linear-gradient(135deg, ${colors.anode}, ${colors.cathode})`,
                      backgroundPosition: `${i * 11}% 0`,
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'white',
                      fontWeight: 600,
                    }}
                  >
                    {metal}
                  </div>
                ))}
              </div>
              <div style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center' }}>
                Greater separation = Higher voltage = Faster corrosion
              </div>
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
              Three Requirements for Galvanic Corrosion
            </h3>
            <ol style={{ ...typo.body, color: colors.textSecondary, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong>Two dissimilar metals</strong> with different electrochemical potentials</li>
              <li style={{ marginBottom: '8px' }}><strong>Electrical contact</strong> between the metals (direct or through a conductor)</li>
              <li><strong>An electrolyte</strong> (conductive solution) to complete the ionic circuit</li>
            </ol>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Area Ratio Effects →
          </button>
        </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Large anode + small cathode: fastest corrosion' },
      { id: 'b', text: 'Small anode + large cathode: fastest corrosion', correct: true },
      { id: 'c', text: 'Equal areas: fastest corrosion' },
      { id: 'd', text: 'Area ratio does not affect corrosion rate' },
    ];

    return wrapPage(
        <div style={{ maxWidth: '700px', margin: '20px auto 0', padding: '0 24px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
              New Variable: Area Ratio
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A small steel rivet holds a large copper sheet. Compare this to a large steel plate with a small copper fastener. Which arrangement causes faster steel corrosion?
          </h2>

          {/* Static SVG for twist predict */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            {renderGalvanicCellSVG()}
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
              Test Area Ratio Effects →
            </button>
          )}
        </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return wrapPage(
        <div style={{ maxWidth: '800px', margin: '20px auto 0', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Area Ratio & Coating Effects
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            See how electrode area ratio and protective coatings affect corrosion rate
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
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  {renderGalvanicCellSVG(true, areaRatio)}
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Area ratio slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Anode:Cathode Area Ratio</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{areaRatio}:{100 - areaRatio}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={areaRatio}
                    onChange={(e) => { setAreaRatio(Number(e.target.value)); setCorrosionLevel(0); }}
                    style={{ width: '100%', height: '20px', cursor: 'pointer', accentColor: colors.warning, touchAction: 'pan-y' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.anode }}>10 (Min)</span>
                    <span style={{ ...typo.small, color: colors.cathode }}>90 (Max)</span>
                  </div>
                </div>

                {/* Coating toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>No Coating</span>
                  <button
                    onClick={() => { setHasCoating(!hasCoating); setCorrosionLevel(0); }}
                    style={{
                      width: '60px',
                      height: '30px',
                      borderRadius: '15px',
                      border: 'none',
                      background: hasCoating ? colors.success : colors.border,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.3s ease',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: hasCoating ? '33px' : '3px',
                      transition: 'left 0.3s ease',
                    }} />
                  </button>
                  <span style={{ ...typo.small, color: hasCoating ? colors.success : colors.textSecondary, fontWeight: hasCoating ? 600 : 400 }}>
                    Insulating Coating
                  </span>
                </div>

                {/* Control buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => { setIsRunning(!isRunning); playSound('click'); }}
                    style={{
                      padding: '14px 32px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isRunning ? colors.error : colors.success,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isRunning ? 'Stop' : 'Start'} Reaction
                  </button>
                  <button
                    onClick={() => { setCorrosionLevel(0); setIsRunning(false); }}
                    style={{
                      padding: '14px 32px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Insight prompts */}
          {areaRatio < 30 && !hasCoating && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                DANGER! Small anode + large cathode = concentrated corrosion attack!
              </p>
            </div>
          )}

          {hasCoating && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Insulating coatings block the ionic pathway, dramatically reducing corrosion!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Protection Strategies →
          </button>
        </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return wrapPage(
        <div style={{ maxWidth: '700px', margin: '20px auto 0', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Corrosion Protection Strategies
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Sacrificial Anodes</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Attach a more active metal (Zn, Mg, Al) that corrodes instead of the protected structure. The sacrificial anode becomes the anode, making your valuable structure the protected cathode.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Impressed Current (ICCP)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Use an external DC power source to force protective current onto the structure, making it the cathode. ICCP systems protect longer distances and larger structures than sacrificial anodes.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔌</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Electrical Isolation</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Break the electrical path using insulating washers, gaskets, coatings, or sealants. No electrical contact = no galvanic corrosion.
              </p>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Area Ratio Rule</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Never use a small anode with a large cathode!</strong> The corrosion current concentrates on the small anode, causing rapid local attack. Always design with a large anode area relative to the cathode.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Galvanic Corrosion"
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
    const allAppsCompleted = completedApps.every(c => c);

    return wrapPage(
        <div style={{ maxWidth: '800px', margin: '20px auto 0', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>

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
                <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>{app.tagline}</p>
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
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Connection to Galvanic Corrosion:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                How Protection Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
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
                  <div style={{ ...typo.h3, color: colors.textPrimary }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Examples:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.examples.map((ex, i) => (
                  <span key={i} style={{
                    background: colors.bgSecondary,
                    padding: '6px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: colors.textSecondary,
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          {/* Got It / Continue button */}
          <button
            onClick={() => {
              playSound('click');
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              if (selectedApp < realWorldApps.length - 1) {
                setSelectedApp(selectedApp + 1);
              }
            }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginBottom: '12px',
            }}
          >
            Got It — Continue →
          </button>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', background: `linear-gradient(135deg, ${colors.success}, #059669)` }}
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
      return wrapPage(
          <div style={{ maxWidth: '600px', margin: '20px auto 0', textAlign: 'center', padding: '0 24px' }}>
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
                ? 'You understand galvanic corrosion and protection strategies!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer review indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
              {testAnswers.map((ans, i) => {
                const correct = testQuestions[i].options.find(o => o.correct)?.id;
                return (
                  <div key={i} style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: ans === correct ? colors.success : colors.error,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '24px',
                    fontWeight: 600,
                  }}>
                    {i + 1}
                  </div>
                );
              })}
            </div>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setConfirmedAnswers(Array(10).fill(false));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review & Try Again
              </button>
            )}

            <div style={{ marginTop: '16px' }}>
              <a
                href="/"
                style={{
                  color: colors.textSecondary,
                  textDecoration: 'none',
                  ...typo.small,
                }}
              >
                Return to Dashboard
              </a>
            </div>
          </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return wrapPage(
        <div style={{ maxWidth: '700px', margin: '20px auto 0', padding: '0 24px' }}>
          <h2 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Galvanic Corrosion Knowledge Test
          </h2>
          <p style={{ ...typo.small, color: 'rgba(156, 163, 175, 0.7)', textAlign: 'center', marginBottom: '16px' }}>
            Apply your understanding of electrochemical corrosion, galvanic series, and protection strategies to real-world engineering scenarios.
          </p>
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
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Scenario:</strong> {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => {
              const isConfirmed = confirmedAnswers[currentQuestion];
              const correctId = question.options.find(o => o.correct)?.id;
              const isCorrect = opt.id === correctId;
              const isSelected = testAnswers[currentQuestion] === opt.id;
              let optBg = colors.bgCard;
              let optBorder = colors.border;
              if (isConfirmed) {
                if (isCorrect) { optBg = `${colors.success}22`; optBorder = colors.success; }
                else if (isSelected) { optBg = `${colors.error}22`; optBorder = colors.error; }
              } else if (isSelected) {
                optBg = `${colors.accent}22`; optBorder = colors.accent;
              }
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (isConfirmed) return;
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: optBg,
                    border: `2px solid ${optBorder}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: isConfirmed ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isSelected ? colors.accent : colors.bgSecondary,
                    color: isSelected ? 'white' : colors.textSecondary,
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
              );
            })}
          </div>

          {/* Feedback after confirming */}
          {confirmedAnswers[currentQuestion] && (
            <div style={{
              background: testAnswers[currentQuestion] === question.options.find(o => o.correct)?.id ? `${colors.success}22` : `${colors.error}22`,
              border: `1px solid ${testAnswers[currentQuestion] === question.options.find(o => o.correct)?.id ? colors.success : colors.error}`,
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: testAnswers[currentQuestion] === question.options.find(o => o.correct)?.id ? colors.success : colors.error, margin: 0, fontWeight: 600, marginBottom: '4px' }}>
                {testAnswers[currentQuestion] === question.options.find(o => o.correct)?.id ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.explanation}
              </p>
            </div>
          )}

          {/* Confirm / Next Question / Submit */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {!confirmedAnswers[currentQuestion] ? (
              <button
                onClick={() => {
                  if (!testAnswers[currentQuestion]) return;
                  playSound('click');
                  const newConfirmed = [...confirmedAnswers];
                  newConfirmed[currentQuestion] = true;
                  setConfirmedAnswers(newConfirmed);
                }}
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
                  transition: 'all 0.2s ease',
                }}
              >
                Confirm Answer
              </button>
            ) : currentQuestion < 9 ? (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                Next Question
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
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
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
    return wrapPage(
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          minHeight: '60vh',
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
            Galvanic Corrosion Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand the electrochemistry behind one of the most important engineering challenges in materials science.
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
                'Galvanic series and electrochemical potentials',
                'Three requirements for galvanic corrosion',
                'Electron and ion flow in galvanic cells',
                'Area ratio effects on corrosion rate',
                'Sacrificial anode protection',
                'Impressed current cathodic protection',
                'Electrical isolation strategies',
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
                transition: 'all 0.2s ease',
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

export default GalvanicCorrosionRenderer;
