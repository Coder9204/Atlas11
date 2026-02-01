/**
 * GALVANIC CORROSION RENDERER
 *
 * Complete physics game demonstrating galvanic corrosion - the electrochemical
 * process that occurs when two dissimilar metals are in electrical contact
 * in the presence of an electrolyte.
 *
 * FEATURES:
 * - Rich transfer phase with detailed real-world applications
 * - Sequential app progression (must complete each to proceed)
 * - Local answer validation with server fallback
 * - Dark theme matching other premium renderers
 * - Detailed SVG graphics with clear labels
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ============================================================
// THEME COLORS
// ============================================================

const colors = {
  // Backgrounds
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',

  // Primary colors
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',

  // Accent colors
  accent: '#8b5cf6',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  // Text colors
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Component specific - galvanic corrosion
  anode: '#ef4444',      // Corroding metal (red/rust)
  cathode: '#3b82f6',    // Protected metal (blue)
  electrolyte: '#22d3ee', // Solution (cyan)
  electrons: '#fbbf24',   // Electron flow (yellow)
  ions: '#a855f7',        // Ion flow (purple)
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'galvanic_corrosion';

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

// Questions with LOCAL correct answers for development fallback
const testQuestions = [
  {
    scenario: "A steel bolt is used to join two aluminum sheets on a boat hull exposed to seawater.",
    question: "Which metal will corrode preferentially in this galvanic couple?",
    options: [
      { id: 'steel', label: "Steel - it's more noble than aluminum" },
      { id: 'aluminum', label: "Aluminum - it's more anodic (active) than steel", correct: true },
      { id: 'both', label: "Both metals corrode equally" },
      { id: 'neither', label: "Neither - seawater prevents corrosion" }
    ],
    explanation: "Aluminum is more anodic (active) than steel in the galvanic series. When coupled in seawater, aluminum acts as the anode and corrodes to protect the steel cathode."
  },
  {
    scenario: "A copper pipe is directly connected to a steel pipe in a home plumbing system.",
    question: "What is the driving force behind galvanic corrosion?",
    options: [
      { id: 'temperature', label: "Temperature difference between the metals" },
      { id: 'potential', label: "Electrochemical potential difference between dissimilar metals", correct: true },
      { id: 'pressure', label: "Water pressure in the pipes" },
      { id: 'gravity', label: "Gravitational forces on the metals" }
    ],
    explanation: "Galvanic corrosion is driven by the electrochemical potential difference between two dissimilar metals. This voltage difference causes electrons to flow from the anode to the cathode."
  },
  {
    scenario: "An engineer wants to protect a steel structure from galvanic corrosion in a marine environment.",
    question: "What is cathodic protection using sacrificial anodes?",
    options: [
      { id: 'coating', label: "Coating the steel with paint to isolate it" },
      { id: 'sacrificial', label: "Attaching a more active metal (like zinc) that corrodes instead of the steel", correct: true },
      { id: 'insulation', label: "Using plastic insulators between all metal connections" },
      { id: 'drying', label: "Keeping the structure completely dry" }
    ],
    explanation: "Sacrificial anodes are made of more active metals (zinc, magnesium, aluminum alloys) that corrode preferentially, protecting the more noble steel structure which becomes the cathode."
  },
  {
    scenario: "A stainless steel screw is used to fasten a zinc bracket to a painted steel panel.",
    question: "What three elements are required for galvanic corrosion to occur?",
    options: [
      { id: 'three', label: "Two dissimilar metals, electrical contact, and an electrolyte", correct: true },
      { id: 'heat', label: "Two metals, heat source, and oxygen" },
      { id: 'acid', label: "One metal, acid, and sunlight" },
      { id: 'pressure', label: "Two metals, high pressure, and vacuum" }
    ],
    explanation: "Galvanic corrosion requires: (1) two metals with different electrochemical potentials, (2) electrical contact between them, and (3) an electrolyte (conductive solution) to complete the circuit."
  },
  {
    scenario: "In a galvanic cell formed by iron and copper in saltwater, electrons flow through the metallic connection.",
    question: "In which direction do electrons flow in a galvanic couple?",
    options: [
      { id: 'cathode_anode', label: "From cathode (more noble) to anode (more active)" },
      { id: 'anode_cathode', label: "From anode (more active) to cathode (more noble)", correct: true },
      { id: 'both', label: "In both directions equally" },
      { id: 'electrolyte', label: "Only through the electrolyte, not the metals" }
    ],
    explanation: "Electrons flow from the anode (more active metal) to the cathode (more noble metal) through the metallic pathway. The anode loses electrons (oxidizes) and corrodes."
  },
  {
    scenario: "A marine engineer is selecting materials to minimize galvanic corrosion on a ship hull.",
    question: "What effect does the anode-to-cathode area ratio have on corrosion rate?",
    options: [
      { id: 'no_effect', label: "Area ratio has no effect on corrosion rate" },
      { id: 'large_cathode', label: "Large cathode + small anode causes rapid anode corrosion", correct: true },
      { id: 'large_anode', label: "Large anode + small cathode causes rapid anode corrosion" },
      { id: 'equal', label: "Equal areas always produce the fastest corrosion" }
    ],
    explanation: "A large cathode area relative to a small anode area accelerates corrosion because the cathodic reaction is spread over a large area while the anodic reaction is concentrated, intensifying local attack."
  },
  {
    scenario: "An aircraft maintenance technician notices corrosion around aluminum rivets on a steel panel.",
    question: "Why is aluminum often preferred for aircraft skins despite being anodic?",
    options: [
      { id: 'cheap', label: "Aluminum is cheaper than other metals" },
      { id: 'oxide', label: "Aluminum forms a protective oxide layer and is lightweight", correct: true },
      { id: 'strong', label: "Aluminum is stronger than steel" },
      { id: 'noble', label: "Aluminum is actually more noble than most aircraft metals" }
    ],
    explanation: "Aluminum forms a tenacious aluminum oxide (Al2O3) passive layer that protects against further corrosion. Combined with its excellent strength-to-weight ratio, this makes it ideal for aerospace applications."
  },
  {
    scenario: "A pipeline engineer is designing corrosion protection for an underground steel gas pipeline.",
    question: "How does impressed current cathodic protection (ICCP) differ from sacrificial anodes?",
    options: [
      { id: 'coating', label: "ICCP uses special coatings while sacrificial anodes don't" },
      { id: 'external', label: "ICCP uses an external power source to drive protective current", correct: true },
      { id: 'no_power', label: "ICCP requires no external power while sacrificial anodes do" },
      { id: 'same', label: "They work exactly the same way" }
    ],
    explanation: "ICCP uses an external DC power source to force current onto the structure, making it the cathode. This allows protection over larger areas and longer distances than passive sacrificial anodes."
  },
  {
    scenario: "Seawater is a common electrolyte that promotes galvanic corrosion.",
    question: "Why does seawater accelerate galvanic corrosion compared to pure water?",
    options: [
      { id: 'salt', label: "Dissolved salts increase ionic conductivity of the electrolyte", correct: true },
      { id: 'cold', label: "Seawater is colder than pure water" },
      { id: 'pressure', label: "Ocean pressure compresses the metals together" },
      { id: 'organisms', label: "Marine organisms directly attack the metals" }
    ],
    explanation: "Seawater contains dissolved salts (mainly NaCl) that dramatically increase its ionic conductivity, allowing ions to flow more easily and accelerating the electrochemical corrosion reactions."
  },
  {
    scenario: "A car manufacturer is designing a vehicle with mixed aluminum and steel body panels.",
    question: "What is the most effective method to prevent galvanic corrosion between dissimilar metals?",
    options: [
      { id: 'insulation', label: "Electrically isolate the metals using non-conductive barriers", correct: true },
      { id: 'welding', label: "Weld the metals together for better contact" },
      { id: 'water', label: "Keep the joint constantly wet" },
      { id: 'heat', label: "Apply heat to equalize the metal potentials" }
    ],
    explanation: "Breaking the electrical path between dissimilar metals prevents electron flow and stops galvanic corrosion. This is achieved using insulating washers, coatings, sealants, or non-conductive gaskets."
  }
];

// ============================================================
// REAL-WORLD APPLICATIONS DATA
// ============================================================

const realWorldApps = [
  {
    icon: '🚢',
    title: 'Marine Engineering',
    short: 'Shipbuilding',
    tagline: 'Protecting vessels from the corrosive sea',
    description: 'Ships are floating galvanic cells, with hulls, propellers, and fittings made from different metals all immersed in highly conductive seawater. Marine engineers must carefully manage galvanic couples to prevent catastrophic hull failures.',
    connection: 'Just like our demonstration shows electron flow between dissimilar metals, ship hulls experience the same electrochemical attack. Steel hulls connected to bronze propellers create massive galvanic cells where the more active metal corrodes rapidly without protection.',
    howItWorks: 'Marine engineers attach zinc or aluminum sacrificial anodes to steel hulls. These anodes are more electrochemically active than the hull steel, so they corrode preferentially, sacrificing themselves to protect the ship. The anodes must be replaced periodically as they are consumed. For larger vessels, impressed current cathodic protection (ICCP) systems use rectifiers to supply protective current, with titanium or mixed metal oxide anodes that last much longer than sacrificial types.',
    stats: [
      { val: '$80B', label: 'Annual global marine corrosion cost' },
      { val: '15-25 yrs', label: 'Typical ship hull design life' },
      { val: '1-2 yrs', label: 'Sacrificial anode replacement cycle' }
    ],
    examples: [
      'Zinc anodes welded to steel ship hulls below waterline',
      'Bronze propellers isolated from steel shafts with phenolic sleeves',
      'ICCP systems on aircraft carriers protecting 4.5 acres of hull',
      'Aluminum anode bars in ballast tanks preventing internal corrosion'
    ],
    companies: ['Cathelco', 'Jotun Marine Coatings', 'Sherwin-Williams Marine', 'CORROSION Service Company', 'DNV Maritime'],
    futureImpact: 'Smart anode systems with embedded sensors will monitor real-time corrosion rates and remaining anode life, automatically adjusting ICCP current. Nano-structured coatings will provide multi-decade protection without anode replacement. Digital twins will simulate galvanic corrosion across entire vessel designs before construction begins.',
    color: '#0ea5e9'
  },
  {
    icon: '🚗',
    title: 'Automotive Design',
    short: 'Mixed Metals',
    tagline: 'Lightweight vehicles without the rust',
    description: 'Modern vehicles combine aluminum, magnesium, carbon fiber, and high-strength steel to reduce weight and improve fuel efficiency. Each material junction is a potential galvanic corrosion site that must be engineered for the 10+ year vehicle lifespan.',
    connection: 'Our galvanic corrosion demonstration shows exactly what happens at every aluminum-to-steel joint in a car body. Road salt spray acts as the electrolyte, turning joints into active galvanic cells. Without proper isolation, aluminum body panels would corrode within months.',
    howItWorks: 'Automotive engineers use multiple strategies: structural adhesives create insulating barriers between dissimilar metals, zinc-rich primers provide sacrificial protection, and e-coat (cathodic electrodeposition) applies uniform corrosion-resistant coatings even in hidden cavities. Self-piercing rivets with polymer coatings join aluminum to steel without creating bare metal contact. Computer simulations model corrosion rates for every material combination and joint design.',
    stats: [
      { val: '40%', label: 'Weight reduction with aluminum body panels' },
      { val: '12+ yrs', label: 'Corrosion perforation warranty' },
      { val: '$6B+', label: 'Annual automotive corrosion prevention spend' }
    ],
    examples: [
      'Ford F-150 aluminum body bolted to steel frame with isolation barriers',
      'Tesla Model S aluminum unibody with zinc-coated steel subframe connections',
      'BMW i3 carbon fiber passenger cell bonded to aluminum chassis',
      'Audi Space Frame multi-material joints using structural adhesives'
    ],
    companies: ['Henkel Adhesives', 'PPG Automotive Coatings', 'Novelis Aluminum', 'Alcoa', 'BASF Coatings'],
    futureImpact: 'Self-healing coatings will automatically repair scratches before galvanic corrosion initiates. Computational material design will optimize new alloys specifically for galvanic compatibility. Graphene-based barriers will provide atom-thin protection at dissimilar metal interfaces, enabling even more aggressive lightweighting strategies.',
    color: '#f59e0b'
  },
  {
    icon: '🛢️',
    title: 'Pipeline Protection',
    short: 'Oil and Gas',
    tagline: 'Safeguarding critical infrastructure underground',
    description: 'Millions of miles of steel pipelines transport oil, gas, and water underground, constantly threatened by soil corrosion. Cathodic protection systems form an invisible shield, using electrochemistry to keep pipelines intact for decades.',
    connection: 'Our demonstration shows how connecting a more active metal protects a less active one. Pipeline cathodic protection scales this principle to continental distances. The soil acts as the electrolyte, and strategically placed anodes or impressed current systems make the entire pipeline the cathode.',
    howItWorks: 'For short pipelines, magnesium or zinc sacrificial anode beds are buried near the pipe, connected by cables. The anodes corrode while protecting the pipe. For long-distance transmission lines, impressed current cathodic protection (ICCP) uses transformer-rectifiers to force current onto the pipe through deep groundbeds of graphite, high-silicon iron, or mixed metal oxide anodes. Coatings (fusion-bonded epoxy, polyethylene) provide primary protection, with CP handling holidays (coating defects).',
    stats: [
      { val: '2.6M mi', label: 'US pipeline network length' },
      { val: '99.999%', label: 'Required pipeline safety reliability' },
      { val: '-850 mV', label: 'Standard protection potential vs CSE' }
    ],
    examples: [
      'Trans-Alaska Pipeline 800-mile ICCP system protecting against permafrost corrosion',
      'Natural gas distribution networks using magnesium anode beds',
      'Offshore oil platforms with combined sacrificial and impressed current systems',
      'Water transmission mains protected by zinc ribbon anodes in trenches'
    ],
    companies: ['MATCOR Inc.', 'Corrpro Companies', 'Aegion Corporation', 'EONCOAT', 'Cathodic Technology Ltd'],
    futureImpact: 'Remote monitoring with IoT sensors will provide real-time corrosion data across entire pipeline networks. AI systems will predict corrosion hotspots and automatically adjust CP current levels. Advanced coatings incorporating conducting polymers will enable more efficient protection with lower current demands, extending anode life and reducing energy consumption.',
    color: '#22c55e'
  },
  {
    icon: '✈️',
    title: 'Aircraft Manufacturing',
    short: 'Aerospace',
    tagline: 'When corrosion prevention is life-critical',
    description: 'Aircraft structures combine aluminum alloys, titanium, carbon fiber composites, and steel fasteners in environments ranging from tropical humidity to sub-zero altitudes. A single corroded joint can ground an aircraft worth hundreds of millions of dollars.',
    connection: 'Our galvanic corrosion experiment demonstrates the exact failure mechanism that aerospace engineers fight constantly. When aluminum skin contacts steel fasteners in the presence of condensation, galvanic corrosion begins immediately. The potential difference we measure in our demonstration scales to real structural damage in aircraft.',
    howItWorks: 'Aerospace engineers use a multi-barrier approach: anodizing creates an aluminum oxide layer that electrically isolates the surface, chromate conversion coatings provide backup protection, and sealants fill gaps to exclude moisture. Titanium fasteners are used near carbon fiber (which is cathodic to aluminum) because titanium is more compatible. Cadmium-plated or zinc-nickel coated steel fasteners sacrifice themselves before the aluminum structure corrodes. Regular inspections using eddy current and ultrasonic testing detect hidden corrosion.',
    stats: [
      { val: '$2.2B', label: 'Annual aircraft corrosion maintenance cost' },
      { val: '30+ yrs', label: 'Typical commercial aircraft service life' },
      { val: '5000+', label: 'Fasteners in a single wing panel' }
    ],
    examples: [
      'Boeing 787 carbon fiber fuselage using titanium fasteners to prevent galvanic coupling with aluminum frames',
      'Airbus A380 wing box with cadmium-plated steel fasteners in anodized aluminum',
      'F-35 fighter multi-material airframe with specialty sealants at every dissimilar metal interface',
      'Helicopter rotor hubs using ceramic barrier coatings between steel and aluminum components'
    ],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'PPG Aerospace', 'Henkel Aerospace'],
    futureImpact: 'Embedded corrosion sensors will continuously monitor aircraft joints in real-time during flight, enabling condition-based maintenance instead of scheduled inspections. New aluminum-lithium alloys will offer better galvanic compatibility with carbon composites. Self-repairing nano-capsule coatings will release corrosion inhibitors automatically when damage occurs, dramatically extending time between maintenance intervals.',
    color: '#8b5cf6'
  }
];

// ============================================================
// SOUND UTILITY
// ============================================================

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

// ============================================================
// MAIN COMPONENT
// ============================================================

interface GalvanicCorrosionRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const GalvanicCorrosionRenderer: React.FC<GalvanicCorrosionRendererProps> = ({
  onComplete,
  onGameEvent,
  gamePhase
}) => {
  // Phase management
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

  // Play phase state
  const [anodeMetal, setAnodeMetal] = useState<'zinc' | 'aluminum' | 'iron'>('zinc');
  const [cathodeMetal, setCathodeMetal] = useState<'copper' | 'steel' | 'gold'>('copper');
  const [electrolyteStrength, setElectrolyteStrength] = useState(50);
  const [isRunning, setIsRunning] = useState(false);

  // Animation state
  const [corrosionLevel, setCorrosionLevel] = useState(0);
  const [electronFlow, setElectronFlow] = useState(0);
  const animationRef = useRef<number>();

  // Test phase state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer phase state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Viewport
  const [isMobile, setIsMobile] = useState(false);

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

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Calculate corrosion rate based on metal combination and electrolyte
  const corrosionRate = useMemo(() => {
    if (!isRunning) return 0;
    const metalPotentials: Record<string, number> = {
      zinc: -0.76, aluminum: -0.66, iron: -0.44,
      copper: 0.34, steel: -0.20, gold: 1.50
    };
    const anodePotential = metalPotentials[anodeMetal];
    const cathodePotential = metalPotentials[cathodeMetal];
    const voltageDiff = cathodePotential - anodePotential;
    return voltageDiff * (electrolyteStrength / 100) * 0.5;
  }, [isRunning, anodeMetal, cathodeMetal, electrolyteStrength]);

  // Animation loop
  useEffect(() => {
    if (corrosionRate > 0) {
      const animate = () => {
        setCorrosionLevel(prev => Math.min(prev + corrosionRate * 0.1, 100));
        setElectronFlow(prev => (prev + corrosionRate * 5) % 100);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [corrosionRate]);

  // Event emitter
  const emitGameEvent = useCallback((eventType: string, details: any) => {
    onGameEvent?.({ type: eventType, data: { ...details, phase, gameId: GAME_ID } });
  }, [onGameEvent, phase]);

  // Navigation
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    playSound('transition');
    emitGameEvent('phase_changed', { phase: p });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  // Test scoring (local validation)
  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // ============================================================
  // GALVANIC CELL VISUALIZATION
  // ============================================================

  const renderGalvanicVisualization = () => {
    const width = isMobile ? 340 : 680;
    const height = isMobile ? 300 : 380;

    const anodeX = width * 0.25;
    const cathodeX = width * 0.75;
    const electrodeY = height * 0.5;
    const electrodeHeight = height * 0.4;
    const electrodeWidth = width * 0.12;

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '680px', margin: '0 auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
          {/* Background */}
          <rect width={width} height={height} fill={colors.bgDark} rx="12" />

          {/* Electrolyte container */}
          <rect
            x={width * 0.1}
            y={height * 0.3}
            width={width * 0.8}
            height={height * 0.5}
            fill={`rgba(34, 211, 238, ${0.1 + electrolyteStrength * 0.003})`}
            stroke={colors.electrolyte}
            strokeWidth="2"
            rx="8"
          />

          {/* Anode (corroding metal) */}
          <rect
            x={anodeX - electrodeWidth / 2}
            y={electrodeY - electrodeHeight / 2}
            width={electrodeWidth}
            height={electrodeHeight * (1 - corrosionLevel / 200)}
            fill={colors.anode}
            stroke={colors.errorLight}
            strokeWidth="2"
            rx="4"
          />
          <text
            x={anodeX}
            y={height * 0.15}
            textAnchor="middle"
            fill={colors.textPrimary}
            fontSize={isMobile ? '12' : '14'}
            fontWeight="600"
          >
            Anode ({anodeMetal.toUpperCase()})
          </text>
          <text
            x={anodeX}
            y={height * 0.2}
            textAnchor="middle"
            fill={colors.textMuted}
            fontSize={isMobile ? '10' : '12'}
          >
            Corroding
          </text>

          {/* Cathode (protected metal) */}
          <rect
            x={cathodeX - electrodeWidth / 2}
            y={electrodeY - electrodeHeight / 2}
            width={electrodeWidth}
            height={electrodeHeight}
            fill={colors.cathode}
            stroke={colors.primaryLight}
            strokeWidth="2"
            rx="4"
          />
          <text
            x={cathodeX}
            y={height * 0.15}
            textAnchor="middle"
            fill={colors.textPrimary}
            fontSize={isMobile ? '12' : '14'}
            fontWeight="600"
          >
            Cathode ({cathodeMetal.toUpperCase()})
          </text>
          <text
            x={cathodeX}
            y={height * 0.2}
            textAnchor="middle"
            fill={colors.textMuted}
            fontSize={isMobile ? '10' : '12'}
          >
            Protected
          </text>

          {/* Wire connection */}
          <path
            d={`M ${anodeX} ${height * 0.28} L ${anodeX} ${height * 0.12} L ${cathodeX} ${height * 0.12} L ${cathodeX} ${height * 0.28}`}
            fill="none"
            stroke={colors.electrons}
            strokeWidth="3"
          />

          {/* Electron flow animation */}
          {isRunning && (
            <>
              <circle
                cx={anodeX + (cathodeX - anodeX) * (electronFlow / 100)}
                cy={height * 0.12}
                r="5"
                fill={colors.electrons}
              />
              <circle
                cx={anodeX + (cathodeX - anodeX) * ((electronFlow + 33) % 100 / 100)}
                cy={height * 0.12}
                r="5"
                fill={colors.electrons}
              />
              <circle
                cx={anodeX + (cathodeX - anodeX) * ((electronFlow + 66) % 100 / 100)}
                cy={height * 0.12}
                r="5"
                fill={colors.electrons}
              />
            </>
          )}

          {/* Ion flow in electrolyte */}
          {isRunning && (
            <>
              <circle
                cx={cathodeX - (cathodeX - anodeX) * (electronFlow / 100)}
                cy={electrodeY}
                r="4"
                fill={colors.ions}
              />
              <circle
                cx={cathodeX - (cathodeX - anodeX) * ((electronFlow + 50) % 100 / 100)}
                cy={electrodeY + 20}
                r="4"
                fill={colors.ions}
              />
            </>
          )}

          {/* Labels */}
          <text
            x={width / 2}
            y={height * 0.08}
            textAnchor="middle"
            fill={colors.electrons}
            fontSize={isMobile ? '10' : '12'}
          >
            e- flow
          </text>
          <text
            x={width / 2}
            y={height * 0.88}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize={isMobile ? '11' : '13'}
          >
            Electrolyte (saltwater)
          </text>

          {/* Voltage display */}
          <text
            x={width / 2}
            y={height * 0.95}
            textAnchor="middle"
            fill={colors.success}
            fontSize={isMobile ? '12' : '14'}
            fontWeight="600"
          >
            Cell Voltage: {(corrosionRate * 2).toFixed(2)}V | Corrosion: {corrosionLevel.toFixed(1)}%
          </text>
        </svg>
      </div>
    );
  };

  // ============================================================
  // PHASE RENDERERS
  // ============================================================

  const renderHook = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: typo.sectionGap,
      minHeight: '100%',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '64px',
        marginBottom: '8px'
      }}>
        🔋
      </div>
      <h1 style={{
        fontSize: typo.title,
        fontWeight: 700,
        color: colors.textPrimary,
        margin: 0
      }}>
        The Hidden Battery in Your Car
      </h1>
      <p style={{
        fontSize: typo.bodyLarge,
        color: colors.textSecondary,
        maxWidth: '600px',
        lineHeight: 1.6
      }}>
        What if every bolt, screw, and weld in your car was secretly generating electricity?
        When different metals touch in the presence of moisture, they form tiny batteries
        that slowly destroy themselves. This is <strong style={{ color: colors.error }}>galvanic corrosion</strong> -
        the same process that sank ships, grounded aircraft, and costs the world trillions each year.
      </p>
      <p style={{
        fontSize: typo.body,
        color: colors.textMuted,
        maxWidth: '500px'
      }}>
        Discover how engineers turn this destructive force into a powerful protection system.
      </p>
      <button
        onClick={() => goToPhase('predict')}
        style={{
          padding: '16px 48px',
          fontSize: typo.bodyLarge,
          fontWeight: 600,
          color: colors.textPrimary,
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginTop: '16px'
        }}
      >
        Start Exploring
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      gap: typo.sectionGap
    }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
        Make Your Prediction
      </h2>
      <p style={{ fontSize: typo.body, color: colors.textSecondary }}>
        A steel nail and a copper penny are both placed in a glass of saltwater, touching each other.
        What do you think will happen over the next few days?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'both', label: 'Both metals will corrode equally' },
          { id: 'steel', label: 'The steel nail will corrode faster than normal' },
          { id: 'copper', label: 'The copper penny will corrode faster than normal' },
          { id: 'neither', label: 'Neither will corrode - saltwater prevents rust' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => { setPrediction(option.id); playSound('click'); }}
            style={{
              padding: '16px',
              background: prediction === option.id ? colors.primary : colors.bgCard,
              border: `2px solid ${prediction === option.id ? colors.primaryLight : colors.border}`,
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body,
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {prediction && (
        <button
          onClick={() => goToPhase('play')}
          style={{
            padding: '16px 32px',
            fontSize: typo.body,
            fontWeight: 600,
            color: colors.textPrimary,
            background: colors.success,
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            alignSelf: 'center'
          }}
        >
          Test Your Prediction
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      gap: typo.sectionGap
    }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
        Galvanic Corrosion Lab
      </h2>

      {renderGalvanicVisualization()}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
        gap: typo.elementGap
      }}>
        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
          <label style={{ fontSize: typo.small, color: colors.textMuted }}>Anode Metal</label>
          <select
            value={anodeMetal}
            onChange={(e) => setAnodeMetal(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '8px',
              background: colors.bgCardLight,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px'
            }}
          >
            <option value="zinc">Zinc (most active)</option>
            <option value="aluminum">Aluminum</option>
            <option value="iron">Iron</option>
          </select>
        </div>

        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
          <label style={{ fontSize: typo.small, color: colors.textMuted }}>Cathode Metal</label>
          <select
            value={cathodeMetal}
            onChange={(e) => setCathodeMetal(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '8px',
              background: colors.bgCardLight,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px'
            }}
          >
            <option value="copper">Copper</option>
            <option value="steel">Stainless Steel</option>
            <option value="gold">Gold (most noble)</option>
          </select>
        </div>

        <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px' }}>
          <label style={{ fontSize: typo.small, color: colors.textMuted }}>
            Electrolyte Strength: {electrolyteStrength}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={electrolyteStrength}
            onChange={(e) => setElectrolyteStrength(Number(e.target.value))}
            style={{ width: '100%', marginTop: '8px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button
          onClick={() => { setIsRunning(!isRunning); playSound('click'); }}
          style={{
            padding: '12px 32px',
            fontSize: typo.body,
            fontWeight: 600,
            color: colors.textPrimary,
            background: isRunning ? colors.error : colors.success,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {isRunning ? 'Stop' : 'Start'} Reaction
        </button>
        <button
          onClick={() => { setCorrosionLevel(0); setIsRunning(false); }}
          style={{
            padding: '12px 32px',
            fontSize: typo.body,
            fontWeight: 600,
            color: colors.textPrimary,
            background: colors.bgCardLight,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      <button
        onClick={() => goToPhase('review')}
        style={{
          padding: '16px 32px',
          fontSize: typo.body,
          fontWeight: 600,
          color: colors.textPrimary,
          background: colors.primary,
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          alignSelf: 'center'
        }}
      >
        Continue to Review
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      gap: typo.sectionGap
    }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
        Understanding Galvanic Corrosion
      </h2>

      <div style={{
        background: colors.bgCard,
        padding: typo.cardPadding,
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: typo.bodyLarge, color: colors.success, margin: '0 0 12px 0' }}>
          What You Observed
        </h3>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.6 }}>
          When two dissimilar metals are connected in an electrolyte, the more <strong>active</strong> metal
          (anode) loses electrons and corrodes, while the more <strong>noble</strong> metal (cathode) is protected.
          This is exactly how batteries work - and how ships sink when not properly protected!
        </p>
      </div>

      <div style={{
        background: colors.bgCard,
        padding: typo.cardPadding,
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: typo.bodyLarge, color: colors.warning, margin: '0 0 12px 0' }}>
          The Galvanic Series
        </h3>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.6 }}>
          Metals can be ranked by their electrochemical potential. The further apart two metals are
          in this series, the greater the voltage difference and faster the corrosion:
        </p>
        <div style={{ marginTop: '12px', fontSize: typo.small, color: colors.textMuted }}>
          <strong>Active (Anodic):</strong> Magnesium → Zinc → Aluminum → Steel → Lead → Copper → Gold <strong>:Noble (Cathodic)</strong>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{
          padding: '16px 32px',
          fontSize: typo.body,
          fontWeight: 600,
          color: colors.textPrimary,
          background: colors.primary,
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          alignSelf: 'center'
        }}
      >
        Ready for a Twist?
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      gap: typo.sectionGap
    }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
        Twist: Sacrificial Protection
      </h2>
      <p style={{ fontSize: typo.body, color: colors.textSecondary }}>
        Engineers attach zinc blocks to steel ship hulls. Based on what you learned,
        what do you think happens?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { id: 'both_corrode', label: 'Both the zinc and steel corrode faster' },
          { id: 'zinc_protects', label: 'The zinc corrodes instead of the steel, protecting the hull' },
          { id: 'steel_corrodes', label: 'The steel corrodes faster because zinc is nearby' },
          { id: 'no_effect', label: 'The zinc has no effect on steel corrosion' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => { setTwistPrediction(option.id); playSound('click'); }}
            style={{
              padding: '16px',
              background: twistPrediction === option.id ? colors.accent : colors.bgCard,
              border: `2px solid ${twistPrediction === option.id ? colors.accent : colors.border}`,
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body,
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {twistPrediction && (
        <button
          onClick={() => goToPhase('twist_play')}
          style={{
            padding: '16px 32px',
            fontSize: typo.body,
            fontWeight: 600,
            color: colors.textPrimary,
            background: colors.success,
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            alignSelf: 'center'
          }}
        >
          See What Happens
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      gap: typo.sectionGap
    }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
        Sacrificial Anode Protection
      </h2>
      <p style={{ fontSize: typo.body, color: colors.textSecondary }}>
        Watch how zinc sacrifices itself to protect steel. Set the anode to Zinc and cathode to Steel
        to simulate cathodic protection.
      </p>

      {renderGalvanicVisualization()}

      <div style={{
        background: colors.bgCard,
        padding: typo.cardPadding,
        borderRadius: '12px'
      }}>
        <p style={{ fontSize: typo.body, color: colors.textSecondary }}>
          <strong style={{ color: colors.success }}>Key Insight:</strong> By deliberately creating a galvanic couple
          with a more active metal (zinc), engineers harness corrosion to protect valuable structures.
          The zinc "sacrifices" itself so the steel doesn't have to corrode.
        </p>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{
          padding: '16px 32px',
          fontSize: typo.body,
          fontWeight: 600,
          color: colors.textPrimary,
          background: colors.primary,
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          alignSelf: 'center'
        }}
      >
        Continue
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      gap: typo.sectionGap
    }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
        Cathodic Protection Explained
      </h2>

      <div style={{
        background: colors.bgCard,
        padding: typo.cardPadding,
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: typo.bodyLarge, color: colors.success, margin: '0 0 12px 0' }}>
          Two Types of Cathodic Protection
        </h3>
        <ul style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px' }}>
          <li><strong>Sacrificial Anodes:</strong> Attach more active metals (Zn, Mg, Al) that corrode instead of the structure</li>
          <li><strong>Impressed Current (ICCP):</strong> Use external power to force protective current onto the structure</li>
        </ul>
      </div>

      <div style={{
        background: colors.bgCard,
        padding: typo.cardPadding,
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: typo.bodyLarge, color: colors.warning, margin: '0 0 12px 0' }}>
          Real-World Applications
        </h3>
        <ul style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px' }}>
          <li>Ship hulls protected by zinc anodes</li>
          <li>Underground pipelines with ICCP systems</li>
          <li>Water heater tanks with magnesium rods</li>
          <li>Steel bridges and offshore platforms</li>
        </ul>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{
          padding: '16px 32px',
          fontSize: typo.body,
          fontWeight: 600,
          color: colors.textPrimary,
          background: colors.primary,
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          alignSelf: 'center'
        }}
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{
        padding: typo.pagePadding,
        display: 'flex',
        flexDirection: 'column',
        gap: typo.sectionGap
      }}>
        <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
          Real-World Applications
        </h2>

        {/* App selector tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => { setSelectedApp(i); playSound('click'); }}
              disabled={i > 0 && !completedApps[i - 1]}
              style={{
                padding: '12px 16px',
                background: selectedApp === i ? a.color : colors.bgCard,
                border: `2px solid ${selectedApp === i ? a.color : colors.border}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                fontSize: typo.small,
                cursor: i > 0 && !completedApps[i - 1] ? 'not-allowed' : 'pointer',
                opacity: i > 0 && !completedApps[i - 1] ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{a.icon}</span>
              <span>{a.short}</span>
              {completedApps[i] && <span>✓</span>}
            </button>
          ))}
        </div>

        {/* App content */}
        <div style={{
          background: colors.bgCard,
          padding: typo.cardPadding,
          borderRadius: '12px',
          borderLeft: `4px solid ${app.color}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px' }}>{app.icon}</span>
            <div>
              <h3 style={{ fontSize: typo.bodyLarge, color: colors.textPrimary, margin: 0 }}>
                {app.title}
              </h3>
              <p style={{ fontSize: typo.small, color: app.color, margin: '4px 0 0 0' }}>
                {app.tagline}
              </p>
            </div>
          </div>

          <p style={{ fontSize: typo.body, color: colors.textSecondary, lineHeight: 1.6 }}>
            {app.description}
          </p>

          <h4 style={{ fontSize: typo.body, color: colors.warning, margin: '16px 0 8px 0' }}>
            Connection to Our Experiment
          </h4>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.6 }}>
            {app.connection}
          </p>

          <h4 style={{ fontSize: typo.body, color: colors.success, margin: '16px 0 8px 0' }}>
            How It Works
          </h4>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.6 }}>
            {app.howItWorks}
          </p>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            margin: '16px 0'
          }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{
                background: colors.bgCardLight,
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: typo.heading, color: app.color, fontWeight: 700 }}>
                  {stat.val}
                </div>
                <div style={{ fontSize: typo.label, color: colors.textMuted }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <h4 style={{ fontSize: typo.body, color: colors.primary, margin: '16px 0 8px 0' }}>
            Examples
          </h4>
          <ul style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px' }}>
            {app.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>

          {/* Companies */}
          <div style={{ margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {app.companies.map((company, i) => (
              <span key={i} style={{
                padding: '4px 12px',
                background: colors.bgCardLight,
                borderRadius: '16px',
                fontSize: typo.label,
                color: colors.textMuted
              }}>
                {company}
              </span>
            ))}
          </div>

          {/* Future Impact */}
          <h4 style={{ fontSize: typo.body, color: colors.accent, margin: '16px 0 8px 0' }}>
            Future Impact
          </h4>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, lineHeight: 1.6 }}>
            {app.futureImpact}
          </p>

          {!completedApps[selectedApp] && (
            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');
              }}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                fontSize: typo.body,
                fontWeight: 600,
                color: colors.textPrimary,
                background: app.color,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Mark as Complete
            </button>
          )}
        </div>

        {allCompleted && (
          <button
            onClick={() => goToPhase('test')}
            style={{
              padding: '16px 32px',
              fontSize: typo.body,
              fontWeight: 600,
              color: colors.textPrimary,
              background: colors.success,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              alignSelf: 'center'
            }}
          >
            Ready for the Test!
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const q = testQuestions[testQuestion];

    if (testSubmitted) {
      const score = calculateTestScore();
      const passed = score >= 7;

      return (
        <div style={{
          padding: typo.pagePadding,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: typo.sectionGap,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '72px' }}>{passed ? '🏆' : '📚'}</div>
          <h2 style={{ fontSize: typo.title, color: colors.textPrimary, margin: 0 }}>
            {passed ? 'Excellent Work!' : 'Keep Learning!'}
          </h2>
          <p style={{ fontSize: typo.heading, color: passed ? colors.success : colors.warning }}>
            Score: {score}/10 ({(score * 10)}%)
          </p>
          <button
            onClick={() => {
              if (passed) {
                goToPhase('mastery');
                onComplete?.();
              } else {
                setTestQuestion(0);
                setTestAnswers(Array(10).fill(null));
                setTestSubmitted(false);
              }
            }}
            style={{
              padding: '16px 32px',
              fontSize: typo.body,
              fontWeight: 600,
              color: colors.textPrimary,
              background: passed ? colors.success : colors.primary,
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            {passed ? 'Complete Course' : 'Try Again'}
          </button>
        </div>
      );
    }

    return (
      <div style={{
        padding: typo.pagePadding,
        display: 'flex',
        flexDirection: 'column',
        gap: typo.sectionGap
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, margin: 0 }}>
            Knowledge Test
          </h2>
          <span style={{ fontSize: typo.body, color: colors.textMuted }}>
            {testQuestion + 1} / 10
          </span>
        </div>

        <div style={{
          background: colors.bgCard,
          padding: typo.cardPadding,
          borderRadius: '12px'
        }}>
          <p style={{ fontSize: typo.small, color: colors.textMuted, marginBottom: '12px' }}>
            {q.scenario}
          </p>
          <p style={{ fontSize: typo.body, color: colors.textPrimary, fontWeight: 600 }}>
            {q.question}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {q.options.map(option => (
            <button
              key={option.id}
              onClick={() => {
                const newAnswers = [...testAnswers];
                newAnswers[testQuestion] = option.id;
                setTestAnswers(newAnswers);
                playSound('click');
              }}
              style={{
                padding: '16px',
                background: testAnswers[testQuestion] === option.id ? colors.primary : colors.bgCard,
                border: `2px solid ${testAnswers[testQuestion] === option.id ? colors.primaryLight : colors.border}`,
                borderRadius: '12px',
                color: colors.textPrimary,
                fontSize: typo.body,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {testQuestion > 0 && (
            <button
              onClick={() => setTestQuestion(prev => prev - 1)}
              style={{
                padding: '12px 24px',
                fontSize: typo.body,
                color: colors.textPrimary,
                background: colors.bgCardLight,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Previous
            </button>
          )}
          {testQuestion < 9 ? (
            <button
              onClick={() => setTestQuestion(prev => prev + 1)}
              disabled={!testAnswers[testQuestion]}
              style={{
                padding: '12px 24px',
                fontSize: typo.body,
                fontWeight: 600,
                color: colors.textPrimary,
                background: testAnswers[testQuestion] ? colors.primary : colors.bgCardLight,
                border: 'none',
                borderRadius: '8px',
                cursor: testAnswers[testQuestion] ? 'pointer' : 'not-allowed'
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                setTestScore(calculateTestScore());
                setTestSubmitted(true);
                playSound('complete');
              }}
              disabled={testAnswers.some(a => a === null)}
              style={{
                padding: '12px 24px',
                fontSize: typo.body,
                fontWeight: 600,
                color: colors.textPrimary,
                background: testAnswers.every(a => a !== null) ? colors.success : colors.bgCardLight,
                border: 'none',
                borderRadius: '8px',
                cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed'
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: typo.sectionGap,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '96px' }}>🎓</div>
      <h1 style={{ fontSize: typo.title, color: colors.textPrimary, margin: 0 }}>
        Galvanic Corrosion Master!
      </h1>
      <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary, maxWidth: '600px' }}>
        You now understand the electrochemistry behind one of the most important engineering challenges
        in materials science. From protecting ships and pipelines to designing lightweight vehicles,
        your knowledge of galvanic corrosion and cathodic protection is the foundation of modern
        infrastructure protection.
      </p>
      <div style={{
        background: colors.bgCard,
        padding: '24px',
        borderRadius: '16px',
        maxWidth: '500px'
      }}>
        <h3 style={{ color: colors.success, margin: '0 0 12px 0' }}>Key Concepts Mastered:</h3>
        <ul style={{
          textAlign: 'left',
          fontSize: typo.body,
          color: colors.textSecondary,
          lineHeight: 1.8
        }}>
          <li>Galvanic series and electrochemical potentials</li>
          <li>Anode/cathode behavior in dissimilar metal couples</li>
          <li>Sacrificial anode cathodic protection</li>
          <li>Impressed current cathodic protection (ICCP)</li>
          <li>Area ratio effects on corrosion rates</li>
          <li>Electrical isolation strategies</li>
        </ul>
      </div>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

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
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.bgGradientStart}, ${colors.bgGradientEnd})`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: colors.textPrimary
    }}>
      {/* Phase indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '16px',
        gap: '4px',
        background: colors.bgDark,
        borderBottom: `1px solid ${colors.border}`
      }}>
        {validPhases.map((p, i) => (
          <div
            key={p}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i <= validPhases.indexOf(phase) ? colors.primary : colors.bgCardLight
            }}
          />
        ))}
      </div>

      {renderPhase()}
    </div>
  );
};

export default GalvanicCorrosionRenderer;
