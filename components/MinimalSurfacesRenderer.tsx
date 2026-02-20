/**
 * MINIMAL SURFACES (SOAP FILMS) RENDERER
 *
 * Complete physics game demonstrating minimal surfaces.
 * Soap films naturally find the surface of minimum area
 * connecting given boundaries - nature's optimization!
 *
 * FEATURES:
 * - Static graphic in predict phase showing wire frames
 * - Interactive frame shape selection
 * - Visualization of soap film formation
 * - Rich transfer phase (architecture, networks, biology)
 * - Full compliance with GAME_EVALUATION_SYSTEM.md
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================
// THEME COLORS
// ============================================================

const colors = {
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#0c4a6e',
  bgGradientEnd: '#0f172a',

  primary: '#06b6d4',
  primaryLight: '#22d3ee',
  primaryDark: '#0891b2',

  accent: '#3b82f6',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',

  border: '#334155',
  borderLight: '#475569',

  // Physics-specific
  soapFilm: '#a78bfa',
  soapFilmLight: '#c4b5fd',
  soapFilmDark: '#7c3aed',
  wire: '#94a3b8',
  wireHighlight: '#e2e8f0',
  iridescent1: '#f472b6',
  iridescent2: '#38bdf8',
  iridescent3: '#34d399',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'minimal_surfaces';

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

const testQuestions = [
  {
    scenario: "You are doing a science demonstration for your class. You take a wire frame shaped like a square, dip it carefully into a bowl of soap solution, and slowly pull it straight up. The film catches the light with rainbow colors. Everyone leans in to see what happens next.",
    question: "What shape does the soap film form?",
    options: [
      { id: 'random', label: "A random bumpy surface" },
      { id: 'flat', label: "Always a flat plane" },
      { id: 'minimal', label: "The surface with minimum area for that boundary", correct: true },
      { id: 'maximum', label: "The surface with maximum area" }
    ],
    explanation: "Soap films naturally minimize their surface area because surface tension creates energy proportional to area. The film 'finds' the minimum area surface that spans the wire frame boundary!"
  },
  {
    scenario: "A soap film forms between two parallel circular rings.",
    question: "What shape does the soap film form between the rings?",
    options: [
      { id: 'cylinder', label: "A cylinder" },
      { id: 'cone', label: "A cone" },
      { id: 'catenoid', label: "A catenoid (hourglass-like shape)", correct: true },
      { id: 'sphere', label: "A sphere" }
    ],
    explanation: "The catenoid is the minimal surface between two circles. It curves inward because this actually has less area than a cylinder! The catenoid is the surface of revolution of a catenary curve."
  },
  {
    scenario: "You want to connect three cities with the shortest total road network.",
    question: "At what angle do roads meet at an optimal junction?",
    options: [
      { id: '90', label: "90° (right angles)" },
      { id: '60', label: "60° (forming a Y shape)" },
      { id: '120', label: "120° (evenly distributed)", correct: true },
      { id: '180', label: "180° (straight line)" }
    ],
    explanation: "Soap films meeting at junctions always form 120° angles! This is because three equal forces (surface tensions) balance when evenly distributed. This gives the shortest total network - called a Steiner tree."
  },
  {
    scenario: "An architect wants to design a roof covering an irregular boundary.",
    question: "Why might soap film models be useful?",
    options: [
      { id: 'cheap', label: "Soap is cheaper than computer simulations" },
      { id: 'pretty', label: "Soap films look pretty in presentations" },
      { id: 'optimal', label: "Soap films naturally find structurally efficient shapes", correct: true },
      { id: 'tradition', label: "It's an old architectural tradition" }
    ],
    explanation: "Soap films find minimal surfaces that are naturally efficient for tension structures. Frei Otto famously used soap film models to design the Munich Olympic Stadium's roof - a minimal surface structure!"
  },
  {
    scenario: "You blow a soap bubble.",
    question: "Why is a soap bubble spherical?",
    options: [
      { id: 'wind', label: "Wind shapes it into a sphere" },
      { id: 'gravity', label: "Gravity pulls it into a sphere" },
      { id: 'minimal', label: "A sphere has minimum surface area for a given volume", correct: true },
      { id: 'easy', label: "It's easiest to blow a sphere" }
    ],
    explanation: "A sphere has the smallest surface area for any given volume. Since surface tension minimizes area while containing a fixed volume of air, the bubble becomes spherical - nature's perfect packaging!"
  },
  {
    scenario: "You observe where soap films in a frame meet each other.",
    question: "How many films can meet along an edge (line)?",
    options: [
      { id: 'any', label: "Any number of films can meet" },
      { id: 'two', label: "Only two films can meet" },
      { id: 'three', label: "Exactly three films meet at 120° angles", correct: true },
      { id: 'four', label: "Four or more films always meet" }
    ],
    explanation: "Plateau's laws state that exactly three soap films meet at any edge, always at 120° angles. This is the stable configuration - any other arrangement will quickly rearrange to satisfy this rule."
  },
  {
    scenario: "A cell biologist studies the shape of cell membranes.",
    question: "How do minimal surfaces relate to biology?",
    options: [
      { id: 'none', label: "They don't - biology doesn't follow physics" },
      { id: 'membranes', label: "Cell membranes and organelles often form minimal surface shapes", correct: true },
      { id: 'bones', label: "Only bones follow minimal surface principles" },
      { id: 'leaves', label: "Only plant leaves form minimal surfaces" }
    ],
    explanation: "Lipid membranes behave like soap films! The endoplasmic reticulum, mitochondrial inner membranes, and even the structure of foam cells follow minimal surface principles due to surface tension."
  },
  {
    scenario: "A helicoid is a surface that looks like a spiral staircase.",
    question: "What's special about the helicoid?",
    options: [
      { id: 'pretty', label: "It's just decorative" },
      { id: 'minimal', label: "It's a minimal surface - it can be formed by soap films", correct: true },
      { id: 'maximum', label: "It has maximum surface area" },
      { id: 'unstable', label: "Soap films can't form helicoids" }
    ],
    explanation: "The helicoid is one of only two ruled minimal surfaces (the other is the catenoid). DNA helices, spiral staircases, and parking garages often approximate this shape because it efficiently connects levels."
  },
  {
    scenario: "Foam made of many soap bubbles fills a container.",
    question: "Why do foam cells tend toward specific shapes?",
    options: [
      { id: 'random', label: "Foam shapes are completely random" },
      { id: 'spheres', label: "All cells try to be perfect spheres" },
      { id: 'minimal', label: "Cells minimize total surface area while filling space", correct: true },
      { id: 'cubes', label: "Cells try to become cubes" }
    ],
    explanation: "Foam cells minimize total surface area while filling space. The ideal shape is the Weaire-Phelan structure - even better than Kelvin's tetrakaidecahedra! This appears in metal foams, biological tissues, and was used in the Beijing Water Cube."
  },
  {
    scenario: "Two soap bubbles of different sizes share a common wall.",
    question: "Which way does the shared wall curve?",
    options: [
      { id: 'flat', label: "The wall is always flat" },
      { id: 'larger', label: "It bulges into the larger bubble" },
      { id: 'smaller', label: "It bulges into the smaller bubble (higher pressure)", correct: true },
      { id: 'random', label: "The direction is random" }
    ],
    explanation: "The smaller bubble has higher internal pressure (P ∝ 1/r by the Young-Laplace equation). This higher pressure pushes the shared wall to bulge into the larger, lower-pressure bubble."
  }
];

const realWorldApps = [
  {
    icon: '🏛️',
    title: 'Tensile Architecture',
    short: 'Roof structures',
    tagline: 'Nature-Inspired Building Design',
    description: 'Architects use minimal surface principles to design highly efficient tensile structures like stadium roofs, airport canopies, and membrane buildings that naturally distribute stress across their entire surface. These structures use far less material than conventional roofs while spanning enormous distances — making them both economical and beautiful. The key insight is that soap film models physically solve the optimization problem: what is the minimum-area surface that spans a given boundary?',
    connection: 'Soap films find the same minimal surfaces that make optimal tension structures. Dip a wire frame model in soap solution, and you get the ideal roof shape immediately — no computer simulation needed. Architect Frei Otto pioneered this technique, physically dipping wire frames into soap solution to design Germany\'s Olympic Stadium rooftops.',
    howItWorks: "Minimal surfaces have zero mean curvature at every point, meaning they're in perfect tension equilibrium. This makes them ideal for fabric roofs held in tension by cables. The roof acts like a giant soap film: every point is in perfect equilibrium with its neighbors, creating a structure that distributes loads efficiently.",
    stats: [
      { value: '74,000m²', label: 'Munich roof area', icon: '📐' },
      { value: '~13.4%', label: 'Material savings', icon: '💰' },
      { value: '50 million €', label: 'Construction cost saved', icon: '⏳' }
    ],
    examples: [
      'Munich Olympic Stadium (Frei Otto)',
      'Denver International Airport tent roof',
      'Millennium Dome, London',
      'Khan Shatyr Entertainment Center, Kazakhstan'
    ],
    companies: ['Buro Happold', 'Schlaich Bergermann', 'FTL Design', 'Tensys'],
    futureImpact: 'Adaptive minimal surface structures that can change shape based on weather and load conditions.',
    color: colors.soapFilm
  },
  {
    icon: '🔗',
    title: 'Network Optimization',
    short: 'Steiner trees',
    tagline: 'Finding Shortest Connections',
    description: 'The Steiner tree problem asks: how do you connect points with minimum total wire length. Soap films between pins naturally solve this NP-hard problem.',
    connection: 'Place pins between parallel plates, dip in soap solution, and the film forms the shortest network connecting all pins - 120° junctions included.',
    howItWorks: 'Soap films minimize total surface area. For a thin film between pins, this equals minimizing total edge length. The 120° angles arise from balancing three equal surface tensions.',
    stats: [
      { value: '13.4%', label: 'Savings vs direct', icon: '📉' },
      { value: '120°', label: 'Junction angles', icon: '📐' },
      { value: 'NP-hard', label: 'Problem complexity', icon: '🧮' }
    ],
    examples: [
      'Telecommunications network layout',
      'Pipeline routing optimization',
      'Circuit board trace routing',
      'Road and rail network design'
    ],
    companies: ['VLSI design tools', 'Network planning software', 'Logistics optimization'],
    futureImpact: 'Quantum computing may finally solve large Steiner problems exactly, but soap films remain an elegant analog computer.',
    color: colors.success
  },
  {
    icon: '🧬',
    title: 'Biological Membranes',
    short: 'Cell structures',
    tagline: 'Life at the Surface',
    description: 'Lipid membranes behave like soap films, forming minimal surfaces. The endoplasmic reticulum, mitochondria, and cell organelles often adopt minimal surface geometries.',
    connection: 'Biological membranes minimize free energy, just like soap films minimize area. Evolution discovered minimal surfaces billions of years before mathematicians.',
    howItWorks: 'Lipid bilayers have surface tension that drives them toward minimal area configurations. Complex organelle shapes balance this with functional requirements like increased surface area for reactions.',
    stats: [
      { value: '5-10nm', label: 'Membrane thickness', icon: '🔬' },
      { value: '10⁵ km²', label: 'ER surface/cell', icon: '📊' },
      { value: '~50%', label: 'Cell volume is membrane', icon: '🧫' }
    ],
    examples: [
      'Endoplasmic reticulum sheets and tubes',
      'Mitochondrial cristae',
      'Nuclear envelope pores',
      'Golgi apparatus stacks'
    ],
    companies: ['Cell biology research', 'Pharmaceutical design', 'Synthetic biology'],
    futureImpact: 'Understanding membrane geometry helps design drug delivery systems and artificial organelles.',
    color: colors.primary
  },
  {
    icon: '🫧',
    title: 'Foam Science',
    short: 'Bubble structures',
    tagline: 'The Geometry of Foam',
    description: 'Foams minimize total surface area while filling space. The Weaire-Phelan structure beats Kelvin\'s 1887 conjecture and inspired the Beijing Water Cube architecture.',
    connection: 'Every foam obeys Plateau\'s laws: films meet in threes at 120 degrees, edges meet in fours at approximately 109.5 degrees. These rules emerge from surface tension minimization.',
    howItWorks: 'Foam cells balance surface tension (minimizing area) with the constraint of filling space. Computer simulations found the Weaire-Phelan structure has 0.3% less surface area than Kelvin cells.',
    stats: [
      { value: '1993', label: 'Weaire-Phelan discovery', icon: '🎯' },
      { value: '0.3%', label: 'Better than Kelvin', icon: '📈' },
      { value: '2008', label: 'Water Cube Olympics', icon: '🏊' }
    ],
    examples: [
      'Beijing Water Cube structure',
      'Aluminum foam for crash absorption',
      'Bread and cake structure',
      'Beer and champagne foam'
    ],
    companies: ['PTW Architects', 'Cymat Technologies', 'ERG Aerospace', 'Food science'],
    futureImpact: 'Engineered foams with specific minimal surface geometries for filtration, insulation, and lightweight structures.',
    color: colors.warning
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

interface MinimalSurfacesRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const MinimalSurfacesRenderer: React.FC<MinimalSurfacesRendererProps> = ({
  onComplete,
  onGameEvent,
  gamePhase
}) => {
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play phase state
  const [selectedFrame, setSelectedFrame] = useState<'square' | 'triangle' | 'circle' | 'cube'>('square');
  const [showFilm, setShowFilm] = useState(false);
  const [animTime, setAnimTime] = useState(0);
  const [filmThickness, setFilmThickness] = useState(50);
  const [twistProgress, setTwistProgress] = useState(30);

  // Test phase state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  // Transfer phase state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  const [isMobile, setIsMobile] = useState(false);
  const animationRef = useRef<number>();

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

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  useEffect(() => {
    const animate = () => {
      setAnimTime(t => t + 0.015);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const emitGameEvent = useCallback((eventType: string, details: any) => {
    onGameEvent?.({ type: eventType, data: { ...details, phase, gameId: GAME_ID } });
  }, [onGameEvent, phase]);

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    playSound('transition');
    emitGameEvent('phase_changed', { phase: p });
    if (p === 'test') {
      setTestQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setShowExplanation(false);
    }
    if (p === 'play') {
      setShowFilm(false);
    }
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  const calculateTestScore = () => testAnswers.reduce((score, ans, i) => {
    const correct = testQuestions[i].options.find(o => o.correct)?.id;
    return score + (ans === correct ? 1 : 0);
  }, 0);

  // ============================================================
  // VISUALIZATION
  // ============================================================

  const renderVisualization = (interactive: boolean = false, showSteiner: boolean = false) => {
    const width = isMobile ? 340 : 680;
    const height = isMobile ? 300 : 380;
    const centerX = width / 2;
    const centerY = height / 2;

    const iridescentOffset = Math.sin(animTime * 2) * 20;
    const filmOpacity = 0.6 + Math.sin(animTime * 3) * 0.1;

    const legendItems = showSteiner ? [
      { color: colors.wire, label: 'City pins' },
      { color: colors.soapFilm, label: 'Soap film (shortest path)' },
      { color: colors.success, label: '120° junction angles' },
    ] : [
      { color: colors.wire, label: 'Wire frame' },
      { color: colors.soapFilm, label: 'Soap film' },
      { color: colors.iridescent1, label: 'Thin-film interference' },
    ];

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{
          position: 'absolute',
          top: isMobile ? '8px' : '12px',
          right: isMobile ? '8px' : '12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '8px',
          padding: isMobile ? '8px' : '12px',
          border: `1px solid ${colors.border}`,
          zIndex: 10
        }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Legend</p>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: colors.textSecondary }}>{item.label}</span>
            </div>
          ))}
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="filmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.iridescent1} stopOpacity={filmOpacity} />
              <stop offset={`${30 + iridescentOffset}%`} stopColor={colors.iridescent2} stopOpacity={filmOpacity} />
              <stop offset={`${60 + iridescentOffset}%`} stopColor={colors.iridescent3} stopOpacity={filmOpacity} />
              <stop offset="100%" stopColor={colors.soapFilm} stopOpacity={filmOpacity} />
            </linearGradient>
            <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.wire} />
              <stop offset="50%" stopColor={colors.wireHighlight} />
              <stop offset="100%" stopColor={colors.wire} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

          {/* Decorative corner group for complexity */}
          <g id="corner-decor" opacity="0.7">
            <circle cx="30" cy="30" r="5" fill={colors.primary} opacity="0.3" />
            <circle cx={width - 30} cy="30" r="5" fill={colors.accent} opacity="0.3" />
            <circle cx="30" cy={height - 30} r="5" fill={colors.soapFilm} opacity="0.3" />
            <circle cx={width - 30} cy={height - 30} r="5" fill={colors.success} opacity="0.3" />
            <line x1="20" y1="60" x2="40" y2="60" stroke={colors.border} strokeWidth="1" opacity="0.5" />
            <line x1={width - 40} y1="60" x2={width - 20} y2="60" stroke={colors.border} strokeWidth="1" opacity="0.5" />
          </g>

          <text x={width / 2} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
            {showSteiner ? 'Steiner Network Problem' : 'Minimal Surface Formation'}
          </text>
          <text x={width / 2} y="48" textAnchor="middle" fill={colors.textSecondary} fontSize={isMobile ? 11 : 14}>
            {showSteiner ? 'Soap films find shortest connection paths' : 'Surface tension minimizes area'}
          </text>

          {showSteiner ? (
            // Steiner tree visualization
            <>
              {/* Three cities forming a triangle */}
              <g transform={`translate(${centerX}, ${centerY + 20})`}>
                {/* City positions */}
                {[
                  { x: 0, y: -80, label: 'A' },
                  { x: -70, y: 60, label: 'B' },
                  { x: 70, y: 60, label: 'C' }
                ].map((city, i) => (
                  <g key={i}>
                    <circle cx={city.x} cy={city.y} r="12" fill={colors.bgCard} stroke={colors.wire} strokeWidth="3" />
                    <text x={city.x} y={city.y + 5} textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">{city.label}</text>
                  </g>
                ))}

                {/* Direct connections (faded) */}
                <line x1="0" y1="-80" x2="-70" y2="60" stroke={colors.textMuted} strokeWidth="1" strokeDasharray="5,5" opacity="0.3" />
                <line x1="0" y1="-80" x2="70" y2="60" stroke={colors.textMuted} strokeWidth="1" strokeDasharray="5,5" opacity="0.3" />
                <line x1="-70" y1="60" x2="70" y2="60" stroke={colors.textMuted} strokeWidth="1" strokeDasharray="5,5" opacity="0.3" />

                {/* Steiner point and optimal network */}
                <circle cx="0" cy="10" r="8" fill={colors.success} filter="url(#glow)" />

                {/* Optimal connections */}
                <line x1="0" y1="-80" x2="0" y2="10" stroke={colors.soapFilm} strokeWidth="4" />
                <line x1="-70" y1="60" x2="0" y2="10" stroke={colors.soapFilm} strokeWidth="4" />
                <line x1="70" y1="60" x2="0" y2="10" stroke={colors.soapFilm} strokeWidth="4" />

                {/* 120° angle indicators */}
                <path d="M -15 5 A 20 20 0 0 1 15 5" fill="none" stroke={colors.success} strokeWidth="2" />
                <text x="0" y="-10" textAnchor="middle" fill={colors.success} fontSize="11">120°</text>
              </g>

              {/* Comparison */}
              <g transform={`translate(${isMobile ? 30 : 60}, ${height - 70})`}>
                <rect width={isMobile ? 120 : 160} height="50" fill={colors.bgCard} rx="8" />
                <text x={isMobile ? 60 : 80} y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
                  Savings vs Direct
                </text>
                <text x={isMobile ? 60 : 80} y="38" textAnchor="middle" fill={colors.success} fontSize="16" fontWeight="700">
                  ~13.4% shorter!
                </text>
              </g>
            </>
          ) : (
            // Main soap film visualization
            <>
              {interactive ? (
                // Interactive mode - show selected frame with thickness visualization
                <>
                  <g transform={`translate(${centerX}, ${centerY + 10})`}>
                    {selectedFrame === 'square' && (
                      <>
                        {/* Square wire frame */}
                        <rect x="-80" y="-80" width="160" height="160" fill="none" stroke="url(#wireGradient)" strokeWidth="6" rx="2" />
                        {/* Soap film with thickness-based opacity */}
                        {showFilm && (
                          <rect x="-80" y="-80" width="160" height="160" fill="url(#filmGradient)" rx="2" opacity={0.2 + filmThickness * 0.006} />
                        )}
                        <text x="0" y="110" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Square frame → Flat film</text>
                      </>
                    )}
                    {selectedFrame === 'triangle' && (
                      <>
                        {/* Triangle wire frame */}
                        <polygon points="0,-90 -78,60 78,60" fill="none" stroke="url(#wireGradient)" strokeWidth="6" />
                        {/* Soap film with thickness-based opacity */}
                        {showFilm && (
                          <polygon points="0,-90 -78,60 78,60" fill="url(#filmGradient)" opacity={0.2 + filmThickness * 0.006} />
                        )}
                        <text x="0" y="100" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Triangle frame → Flat film</text>
                      </>
                    )}
                    {selectedFrame === 'circle' && (
                      <>
                        {/* Two circular rings (catenoid setup) */}
                        <ellipse cx="0" cy="-60" rx="60" ry="15" fill="none" stroke="url(#wireGradient)" strokeWidth="6" />
                        <ellipse cx="0" cy="60" rx="60" ry="15" fill="none" stroke="url(#wireGradient)" strokeWidth="6" />
                        {/* Catenoid soap film */}
                        {showFilm && (
                          <>
                            <path d={`M -60 -60 Q -40 0 -60 60`} fill="none" stroke="url(#filmGradient)" strokeWidth={20 + filmThickness * 0.3} opacity={0.3 + filmThickness * 0.003} />
                            <path d={`M 60 -60 Q 40 0 60 60`} fill="none" stroke="url(#filmGradient)" strokeWidth={20 + filmThickness * 0.3} opacity={0.3 + filmThickness * 0.003} />
                            <ellipse cx="0" cy="0" rx={40 + filmThickness * 0.05} ry="60" fill="url(#filmGradient)" opacity={0.2 + filmThickness * 0.003} />
                          </>
                        )}
                        <text x="0" y="105" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Two rings → Catenoid</text>
                      </>
                    )}
                    {selectedFrame === 'cube' && (
                      <>
                        <rect x="-40" y="-80" width="80" height="80" fill="none" stroke={colors.wire} strokeWidth="3" opacity="0.5" />
                        <rect x="-60" y="-60" width="80" height="80" fill="none" stroke="url(#wireGradient)" strokeWidth="5" />
                        <line x1="-60" y1="-60" x2="-40" y2="-80" stroke={colors.wire} strokeWidth="3" />
                        <line x1="20" y1="-60" x2="40" y2="-80" stroke={colors.wire} strokeWidth="3" />
                        <line x1="-60" y1="20" x2="-40" y2="0" stroke={colors.wire} strokeWidth="3" />
                        <line x1="20" y1="20" x2="40" y2="0" stroke={colors.wire} strokeWidth="3" />
                        {showFilm && (
                          <>
                            <rect x="-15" y="-60" width="30" height="80" fill="url(#filmGradient)" opacity={0.2 + filmThickness * 0.004} />
                            <rect x="-60" y="-15" width="80" height="30" fill="url(#filmGradient)" opacity={0.2 + filmThickness * 0.004} />
                          </>
                        )}
                        <text x="0" y="55" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Cube frame → 13 films!</text>
                      </>
                    )}
                  </g>
                  {/* Thickness gauge at bottom - changes substantially with slider */}
                  <rect x="20" y={height - 70} width={width - 40} height="55" rx="8" fill="#0f172a" stroke={colors.border} strokeWidth="1" />
                  <text x="30" y={height - 54} fill={colors.textMuted} fontSize="11">Film thickness gauge — Axis Y: thickness, X: position</text>
                  <rect x="30" y={height - 44} width={((width - 60) * filmThickness) / 100} height="18" rx="4" fill={colors.soapFilm} opacity="0.8" filter="url(#glow)" />
                  <circle cx={30 + ((width - 60) * filmThickness) / 100} cy={height - 35} r="9" fill={colors.primaryLight} filter="url(#glow)" />
                  <text x="30" y={height - 22} fill={colors.primaryLight} fontSize="11" fontWeight="bold">Thickness: {filmThickness}% | Surface energy: {(filmThickness * 0.24).toFixed(1)} mN/m | Interference: {filmThickness < 40 ? 'visible colors' : filmThickness < 70 ? 'partial' : 'opaque white'}</text>
                </>
              ) : (
                // Static prediction view
                <g transform={`translate(${centerX}, ${centerY})`}>
                  {/* Show wire frame being dipped */}
                  <rect x="-80" y="-40" width="160" height="120" fill="none" stroke="url(#wireGradient)" strokeWidth="6" rx="2" />

                  {/* Soap solution "bath" at bottom */}
                  <rect x="-120" y="60" width="240" height="60" fill={colors.soapFilm} opacity="0.3" rx="8" />
                  <text x="0" y="95" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Soap Solution</text>

                  {/* Partial film forming (animated) */}
                  <rect
                    x="-80"
                    y={-40 + (1 - Math.min(1, animTime % 3)) * 160}
                    width="160"
                    height={Math.min(1, animTime % 3) * 160}
                    fill="url(#filmGradient)"
                    opacity={0.5}
                  />

                  <text x="0" y="-60" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
                    Wire frame dipped in soap
                  </text>
                </g>
              )}

              {/* Formula - only in non-interactive mode to avoid overlap with thickness gauge */}
              {!interactive && (
                <text x={isMobile ? 15 : 25} y={height - 18} fill={colors.textSecondary} fontSize={isMobile ? 9 : 11}>
                  Minimal surface: <tspan fill={colors.primaryLight}>H = 0</tspan> (zero mean curvature everywhere)
                </text>
              )}
            </>
          )}
        </svg>
      </div>
    );
  };

  // ============================================================
  // BOTTOM BAR
  // ============================================================

  const renderBottomBar = (showBack: boolean, canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const handleNext = () => {
      if (!canProceed) return;
      playSound('click');
      if (onNext) onNext();
      else {
        const currentIndex = validPhases.indexOf(phase);
        if (currentIndex < validPhases.length - 1) goToPhase(validPhases[currentIndex + 1]);
      }
    };

    const handleBack = () => {
      playSound('click');
      const currentIndex = validPhases.indexOf(phase);
      if (currentIndex > 0) goToPhase(validPhases[currentIndex - 1]);
    };

    const dotIdx = validPhases.indexOf(phase);
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, minHeight: '72px',
        background: colors.bgCard, borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
      }}>
        {showBack ? (
          <button onClick={handleBack} style={{
            padding: '12px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgCardLight, color: colors.textSecondary, fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '48px',
            transition: 'all 0.2s ease'
          }}>← Back</button>
        ) : <div />}

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {validPhases.map((p, i) => (
            <div
              key={p}
              onClick={() => i < dotIdx && goToPhase(p)}
              style={{
                height: '8px',
                width: i === dotIdx ? '20px' : '8px',
                borderRadius: '4px',
                backgroundColor: i < dotIdx ? colors.primary : i === dotIdx ? colors.accent : colors.border,
                cursor: i < dotIdx ? 'pointer' : 'default',
                transition: 'all 0.3s',
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        {canProceed ? (
          <button onClick={handleNext} style={{
            padding: '14px 28px', borderRadius: '12px', border: 'none',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', minHeight: '52px', minWidth: '160px',
            boxShadow: `0 4px 15px ${colors.primary}40`, transition: 'all 0.2s ease'
          }}>{nextLabel}</button>
        ) : (
          <div style={{
            padding: '14px 28px', borderRadius: '12px', backgroundColor: colors.bgCardLight,
            color: colors.textMuted, fontSize: '14px', fontWeight: 400, minHeight: '52px', display: 'flex', alignItems: 'center'
          }}>Select an option above</div>
        )}
      </div>
    );
  };

  // ============================================================
  // PHASES
  // ============================================================

  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden', transition: 'all 0.3s ease' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: isMobile ? '80px' : '120px', marginBottom: '20px' }}>🫧</div>
            <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>
              Nature's Optimizer
            </h1>
            <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary, marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: 1.6, fontWeight: 400 }}>
              Soap films <strong style={{ color: colors.soapFilm }}>automatically find the smallest surface</strong> that spans a boundary. They're solving calculus problems in real-time!
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏛️</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Stadium roofs</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>designed with soap</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🧬</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Cell membranes</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>follow same rules</p>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic' }}>
              Discover <strong style={{ color: colors.primaryLight }}>minimal surfaces</strong>
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, "Start Exploring →")}
      </div>
    );
  }

  if (phase === 'predict') {
    const predictions = [
      { id: 'random', label: 'A random, lumpy surface forms', icon: '🌊' },
      { id: 'maximum', label: 'The largest possible surface forms', icon: '📈' },
      { id: 'minimal', label: 'The smallest possible surface forms', icon: '📉' },
      { id: 'none', label: 'No film forms at all', icon: '❌' }
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden', transition: 'all 0.3s ease' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 1 • Make a Prediction</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Soap Film Formation</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', aspectRatio: '16/10', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderVisualization(false)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                A <strong style={{ color: colors.wire }}>wire frame</strong> is being dipped into <span style={{ color: colors.soapFilm }}>soap solution</span>.
                When you pull it out, a thin <strong style={{ color: colors.soapFilmLight }}>soap film</strong> will form spanning the frame's boundary.
                The film's shape is determined by surface tension forces.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 What shape will the soap film take?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button key={p.id} onClick={() => { setPrediction(p.id); playSound('click'); }} style={{
                    padding: '16px', borderRadius: '12px',
                    border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                    backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                    minHeight: '44px', transition: 'all 0.2s ease'
                  }}>
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {prediction === p.id && <span style={{ color: colors.primary, fontSize: '20px', fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {prediction && (
              <div style={{ background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}30` }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>💭 Why do you think this? <span style={{ color: colors.textMuted }}>(Optional)</span></p>
                <textarea placeholder="Share your reasoning..." style={{ width: '100%', minHeight: '60px', padding: '12px', borderRadius: '8px', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: '14px', resize: 'vertical' }} />
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden', transition: 'all 0.3s ease' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 2 • Experiment</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Try Different Frames</h2>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ width: '100%', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  {renderVisualization(true)}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Controls</h3>

                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>Frame shape:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'square', label: 'Square', icon: '⬜' },
                        { id: 'triangle', label: 'Triangle', icon: '△' },
                        { id: 'circle', label: '2 Rings', icon: '◎' },
                        { id: 'cube', label: 'Cube', icon: '⬛' }
                      ].map(frame => (
                        <button key={frame.id} onClick={() => { setSelectedFrame(frame.id as any); setShowFilm(false); playSound('click'); }} style={{
                          padding: '10px 8px', borderRadius: '8px',
                          border: selectedFrame === frame.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                          background: selectedFrame === frame.id ? `${colors.primary}20` : colors.bgDark,
                          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          transition: 'all 0.2s ease'
                        }}>
                          <span style={{ fontSize: '20px' }}>{frame.icon}</span>
                          <span style={{ color: colors.textSecondary, fontSize: '11px' }}>{frame.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
                        Thickness: <strong style={{ color: colors.primaryLight }}>{filmThickness}%</strong>
                      </label>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={filmThickness}
                      onChange={(e) => setFilmThickness(Number(e.target.value))}
                      onInput={(e) => setFilmThickness(Number((e.target as HTMLInputElement).value))}
                      style={{ width: '100%', accentColor: colors.primary, touchAction: 'pan-y' }}
                      aria-label="Film thickness slider"
                    />
                    <p style={{ color: colors.textMuted, fontSize: '11px', marginTop: '6px' }}>
                      Energy: {(filmThickness * 0.24).toFixed(1)} mN/m
                    </p>
                  </div>

                  <button onClick={() => { setShowFilm(true); playSound('success'); }} style={{
                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                    background: showFilm ? colors.bgCardLight : `linear-gradient(135deg, ${colors.soapFilm} 0%, ${colors.primary} 100%)`,
                    color: showFilm ? colors.textMuted : 'white', fontSize: '16px', fontWeight: 700, cursor: showFilm ? 'default' : 'pointer',
                    transition: 'all 0.3s ease', minHeight: '44px'
                  }}>
                    {showFilm ? 'Film Formed!' : 'Dip in Soap'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.soapFilm}15 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.soapFilm}40`, marginBottom: '16px' }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>👀 Observe — Watch What the Visualization Shows:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                The graphic displays the soap film surface forming on the selected wire frame.
                <strong style={{ color: colors.soapFilm }}>Surface tension</strong> pulls the film to minimize its total area.
                When you change the film thickness slider, the film opacity and surface energy update in real-time.
                Flat frames show flat minimal films. Two rings demonstrate a <strong>catenoid</strong> (hourglass shape).
                A cube frame produces <strong>13 different films</strong> all meeting at 120° angles!
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📐 The Physics Formula:</h4>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', marginBottom: '8px', color: colors.textSecondary }}>
                <span style={{ color: colors.primaryLight, fontWeight: 700 }}>E</span>
                <span> = γ × </span>
                <span style={{ color: colors.accent, fontWeight: 700 }}>A</span>
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.8 }}>
                <div><span style={{ color: colors.primaryLight, fontWeight: 700 }}>E</span> = Surface energy (J)</div>
                <div>γ = Surface tension (~72 mN/m for soap)</div>
                <div><span style={{ color: colors.accent, fontWeight: 700 }}>A</span> = Surface area (m²)</div>
                <div>Current energy: <strong style={{ color: colors.success }}>{(filmThickness * 0.24).toFixed(1)} mN/m</strong></div>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
              <h4 style={{ color: colors.success, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🌍 Real-World Relevance:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                This principle is used in <strong style={{ color: colors.primaryLight }}>architecture</strong> (stadium roofs like the Munich Olympic Stadium),
                <strong style={{ color: colors.primaryLight }}> network optimization</strong> (finding shortest cable routes),
                and <strong style={{ color: colors.primaryLight }}>biology</strong> (cell membrane shapes). Engineers use soap films as analog computers to solve complex optimization problems!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, showFilm, 'See the Results →')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'minimal';
    const predictionLabels: Record<string, string> = {
      'random': 'a random, lumpy surface',
      'maximum': 'the largest possible surface',
      'minimal': 'the smallest possible surface',
      'none': 'no film at all'
    };
    const userPredictionText = prediction ? predictionLabels[prediction] : 'unknown';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden', transition: 'all 0.3s ease' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', padding: '24px', background: wasCorrect ? `${colors.success}15` : `${colors.primary}15`, borderRadius: '16px', marginBottom: '24px', border: `1px solid ${wasCorrect ? colors.success : colors.primary}40` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{wasCorrect ? '🎯' : '💡'}</div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: wasCorrect ? colors.success : colors.primaryLight, marginBottom: '8px' }}>
                {wasCorrect ? 'Excellent Prediction!' : 'Great Learning Moment!'}
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
                You predicted {userPredictionText}.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Soap films form the surface with minimum area!</p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🔬 Why Minimal Surfaces?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { num: 1, title: 'Surface Tension Energy', desc: 'Surface tension creates energy proportional to area. Less area = less energy.', color: colors.soapFilm },
                  { num: 2, title: 'Energy Minimization', desc: 'Physical systems naturally move to lowest energy states. Soap films find minimum area.', color: colors.primary },
                  { num: 3, title: 'Zero Mean Curvature', desc: 'Minimal surfaces have H = 0 everywhere - balanced curvature in all directions.', color: colors.success }
                ].map(item => (
                  <div key={item.num} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${item.color} 0%, ${colors.primaryDark} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>{item.num}</div>
                    <div>
                      <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{item.title}</h4>
                      <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.soapFilm}20 0%, ${colors.accent}20 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.soapFilm}40` }}>
              <h4 style={{ color: colors.soapFilmLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📐 Plateau's Laws</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Joseph Plateau discovered that soap films always obey these rules:
                <br />• <strong>Three films</strong> meet at any edge at exactly <strong style={{ color: colors.success }}>120°</strong>
                <br />• <strong>Four edges</strong> meet at any vertex at exactly <strong style={{ color: colors.success }}>109.47°</strong>
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Try a Twist →')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    const predictions = [
      { id: 'direct', label: 'Connect cities directly with straight roads', icon: '📏' },
      { id: 'central', label: 'All roads meet at one central point', icon: '🎯' },
      { id: 'steiner', label: 'Add extra junction points meeting at 120°', icon: '🔀' },
      { id: 'circular', label: 'Connect cities in a circular loop', icon: '⭕' }
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🔄 Twist • Optimization</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Connecting Three Cities</h2>
            </div>

            {/* Static SVG graphic — no sliders */}
            <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              <svg viewBox="0 0 400 220" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id="cityBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e1b4b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <filter id="cityGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect x="0" y="0" width="400" height="220" fill="url(#cityBg)" rx="12" />
                <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Three Cities — Which Road Network is Shortest?</text>
                {/* Grid lines (axes) */}
                <line x1="40" y1="20" x2="40" y2="200" stroke="#334155" strokeDasharray="3,4" opacity="0.5" />
                <line x1="40" y1="200" x2="380" y2="200" stroke="#334155" strokeDasharray="3,4" opacity="0.5" />
                <text x="200" y="215" textAnchor="middle" fill="#64748b" fontSize="11">X axis — East-West distance</text>
                <text x="22" y="110" textAnchor="middle" fill="#64748b" fontSize="11" transform="rotate(-90,22,110)">Y axis</text>
                {/* City A (top center) */}
                <circle cx="200" cy="50" r="16" fill={colors.bgCard} stroke={colors.wire} strokeWidth="3" filter="url(#cityGlow)" />
                <text x="200" y="55" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">A</text>
                {/* City B (bottom left) */}
                <circle cx="90" cy="175" r="16" fill={colors.bgCard} stroke={colors.wire} strokeWidth="3" filter="url(#cityGlow)" />
                <text x="90" y="180" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">B</text>
                {/* City C (bottom right) */}
                <circle cx="310" cy="175" r="16" fill={colors.bgCard} stroke={colors.wire} strokeWidth="3" filter="url(#cityGlow)" />
                <text x="310" y="180" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">C</text>
                {/* Dashed direct connections */}
                <line x1="200" y1="66" x2="106" y2="159" stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="5,5" opacity="0.4" />
                <line x1="200" y1="66" x2="294" y2="159" stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="5,5" opacity="0.4" />
                <line x1="106" y1="175" x2="294" y2="175" stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="5,5" opacity="0.4" />
                {/* Question mark at center */}
                <circle cx="200" cy="120" r="22" fill={`${colors.accent}30`} stroke={colors.accent} strokeWidth="2" />
                <text x="200" y="127" textAnchor="middle" fill={colors.accent} fontSize="20" fontWeight="bold">?</text>
              </svg>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, textAlign: 'center' }}>
                You need to build roads connecting three cities (A, B, C) arranged in a triangle.
                <br />What network uses the <strong style={{ color: colors.success }}>least total road length</strong>?
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 The Steiner Problem:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Named after mathematician Jakob Steiner, this asks: what's the shortest network connecting given points?
                You can add extra junction points if it helps!
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 What's the optimal road network?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button key={p.id} onClick={() => { setTwistPrediction(p.id); playSound('click'); }} style={{
                    padding: '16px', borderRadius: '12px',
                    border: twistPrediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    backgroundColor: twistPrediction === p.id ? `${colors.accent}20` : colors.bgCard,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {twistPrediction === p.id && <span style={{ color: colors.accent, fontSize: '20px', fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'See the Answer →')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    // steinerProgress: 0=direct connection, 100=full Steiner tree with junction
    const steinerProgress = twistProgress;
    const savings = (steinerProgress / 100 * 13.4).toFixed(1);
    const junctionAngle = Math.round(90 + steinerProgress * 0.3);
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🔄 Twist • The Solution</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Soap Films Solve It!</h2>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '20px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                {/* Interactive Steiner tree visualization */}
                <div style={{ width: '100%', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  <svg viewBox="0 0 400 220" style={{ width: '100%', height: 'auto', display: 'block' }}>
                    <defs>
                      <linearGradient id="steinerBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e1b4b" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <filter id="steinerGlow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <rect x="0" y="0" width="400" height="220" fill="url(#steinerBg)" rx="12" />
                    <text x="200" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">Steiner Junction -- Drag slider to optimize</text>
                    <text x="200" y="212" textAnchor="middle" fill="#64748b" fontSize="11">X axis -- optimization progress (0% direct, 100% Steiner)</text>
                    <circle cx="200" cy="45" r="14" fill={colors.bgCard} stroke={colors.wire} strokeWidth="2" filter="url(#steinerGlow)" />
                    <text x="200" y="50" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">A</text>
                    <circle cx="80" cy="175" r="14" fill={colors.bgCard} stroke={colors.wire} strokeWidth="2" filter="url(#steinerGlow)" />
                    <text x="80" y="180" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">B</text>
                    <circle cx="320" cy="175" r="14" fill={colors.bgCard} stroke={colors.wire} strokeWidth="2" filter="url(#steinerGlow)" />
                    <text x="320" y="180" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">C</text>
                    <line x1="200" y1="59" x2="94" y2="161" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="5,4" opacity={Math.max(0, 1 - steinerProgress / 60)} />
                    <line x1="200" y1="59" x2="306" y2="161" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="5,4" opacity={Math.max(0, 1 - steinerProgress / 60)} />
                    <line x1="94" y1="175" x2="306" y2="175" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="5,4" opacity={Math.max(0, 1 - steinerProgress / 60)} />
                    {steinerProgress > 10 && (
                      <>
                        <circle cx="200" cy={175 - steinerProgress * 0.85} r={6 + steinerProgress * 0.06} fill={colors.success} filter="url(#steinerGlow)" opacity={steinerProgress / 100} />
                        <line x1="200" y1="59" x2="200" y2={175 - steinerProgress * 0.85} stroke={colors.soapFilm} strokeWidth="3" opacity={steinerProgress / 100} />
                        <line x1="80" y1="175" x2="200" y2={175 - steinerProgress * 0.85} stroke={colors.soapFilm} strokeWidth="3" opacity={steinerProgress / 100} />
                        <line x1="320" y1="175" x2="200" y2={175 - steinerProgress * 0.85} stroke={colors.soapFilm} strokeWidth="3" opacity={steinerProgress / 100} />
                        <text x="200" y={175 - steinerProgress * 0.85 - 12} textAnchor="middle" fill={colors.success} fontSize="11">{junctionAngle}</text>
                      </>
                    )}
                    <rect x="10" y="190" width="380" height="20" rx="4" fill="#0f172a" opacity="0.8" />
                    <text x="200" y="204" textAnchor="middle" fill={colors.primaryLight} fontSize="11" fontWeight="bold">
                      Progress: {steinerProgress}% | Angle: {junctionAngle} | Savings: {savings}%
                    </text>
                  </svg>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Interactive slider */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Optimize the Network</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ color: colors.textSecondary, fontSize: '13px' }}>Optimization: <strong style={{ color: colors.primaryLight }}>{steinerProgress}%</strong></label>
                  </div>
                  <input
                    type="range" min="0" max="100" value={steinerProgress}
                    onChange={(e) => setTwistProgress(Number(e.target.value))}
                    onInput={(e) => setTwistProgress(Number((e.target as HTMLInputElement).value))}
                    style={{ width: '100%', accentColor: colors.success, touchAction: 'pan-y' }}
                    aria-label="Steiner optimization slider"
                  />
                  <p style={{ color: colors.success, fontSize: '13px', marginTop: '8px', fontWeight: 600 }}>
                    Saving: {savings}%
                  </p>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
                    Drag to see how adding a Steiner junction saves road length. At 120 junction angles you get maximum 13.4% savings!
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.soapFilm}15 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.soapFilm}40` }}>
              <h4 style={{ color: colors.soapFilmLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🫧 Soap Film Analog Computer</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Place pins at city locations between parallel plates, dip in soap solution, and the film <strong>instantly finds the optimal network</strong>.
                The 120° angles emerge naturally from balancing three equal surface tensions!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Learn More →')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'steiner';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', padding: '24px', background: wasCorrect ? `${colors.success}15` : `${colors.primary}15`, borderRadius: '16px', marginBottom: '24px', border: `1px solid ${wasCorrect ? colors.success : colors.primary}40` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{wasCorrect ? '🎯' : '💡'}</div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: wasCorrect ? colors.success : colors.primaryLight, marginBottom: '8px' }}>
                {wasCorrect ? 'You Got It!' : 'Interesting Discovery!'}
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Adding a Steiner point with 120° junctions is optimal!</p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🔀 The Steiner Tree Solution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { num: 1, title: '120° Junctions', desc: 'When three equal forces (surface tensions) balance, they form 120° angles.', color: colors.success },
                  { num: 2, title: 'NP-Hard Problem', desc: 'Finding optimal Steiner trees is computationally hard, but soap films solve it instantly!', color: colors.warning },
                  { num: 3, title: '13.4% Savings', desc: 'For an equilateral triangle, the Steiner solution is ~13.4% shorter than direct connection.', color: colors.primary }
                ].map(item => (
                  <div key={item.num} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${item.color} 0%, ${colors.primaryDark} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>{item.num}</div>
                    <div>
                      <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{item.title}</h4>
                      <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}20 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}40` }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🧮 Analog Computing</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Soap films are <strong>analog computers</strong> that solve optimization problems through physics.
                Before digital computers, engineers used soap film models to design everything from road networks to telecommunications systems!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // Transfer phase
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Minimal Surfaces"
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
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden', transition: 'all 0.3s ease' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🌍 Real-World Applications</p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>Minimal Surfaces Everywhere</h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, i) => (
                <button key={i} onClick={() => { setSelectedApp(i); playSound('click'); }} style={{
                  padding: '10px 16px', borderRadius: '12px',
                  border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                  background: selectedApp === i ? `${a.color}20` : colors.bgCard,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0,
                  minHeight: '44px', transition: 'all 0.2s ease'
                }}>
                  <span style={{ fontSize: '20px' }}>{a.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600 }}>{a.short}</span>
                  {completedApps[i] && <span style={{ color: colors.success, fontSize: '16px' }}>✓</span>}
                </button>
              ))}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${app.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{app.icon}</div>
                <div>
                  <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700, margin: 0 }}>{app.title}</h3>
                  <p style={{ color: app.color, fontSize: '14px', fontWeight: 600, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>{app.description}</p>
              <div style={{ background: `${app.color}15`, borderRadius: '12px', padding: '16px', marginBottom: '20px', borderLeft: `4px solid ${app.color}` }}>
                <h4 style={{ color: app.color, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔗 Connection:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>{app.connection}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{ background: colors.bgDark, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ color: app.color, fontSize: '18px', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => {
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              playSound('success');
              const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
              if (nextIncomplete !== -1) setSelectedApp(nextIncomplete);
              else { const first = newCompleted.findIndex(c => !c); if (first !== -1) setSelectedApp(first); }
            }} disabled={completedApps[selectedApp]} style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              background: completedApps[selectedApp] ? colors.bgCardLight : `linear-gradient(135deg, ${app.color} 0%, ${colors.accent} 100%)`,
              color: completedApps[selectedApp] ? colors.textMuted : 'white', fontSize: '16px', fontWeight: 700,
              cursor: completedApps[selectedApp] ? 'default' : 'pointer', minHeight: '52px', transition: 'all 0.2s ease'
            }}>
              {completedApps[selectedApp] ? 'Completed' : 'Got It'}
            </button>
            <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '13px', marginTop: '12px' }}>
              {completedApps.filter(c => c).length} of 4 completed {allCompleted && '— Ready for test!'}
            </p>
          </div>
        </div>
        {renderBottomBar(true, completedApps.some(c => c), 'Take the Test →')}
      </div>
    );
  }

  // Test phase
  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const selectedAnswer = testAnswers[testQuestion];
    const isCorrect = selectedAnswer === currentQ.options.find(o => o.correct)?.id;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>Question {testQuestion + 1} of 10</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i === testQuestion ? colors.primary : testAnswers[i] !== null ? colors.success : colors.bgCardLight }} />
                ))}
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.border}` }}>
              <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SCENARIO</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>{currentQ.scenario}</p>
            </div>

            <h3 style={{ color: colors.textPrimary, fontSize: isMobile ? '18px' : '20px', fontWeight: 700, marginBottom: '20px' }}>{currentQ.question}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {currentQ.options.map((opt) => {
                const isSelected = selectedAnswer === opt.id;
                const showCorrect = showExplanation && opt.correct;
                const showWrong = showExplanation && isSelected && !opt.correct;
                return (
                  <button key={opt.id} onClick={() => { if (!showExplanation) { const a = [...testAnswers]; a[testQuestion] = opt.id; setTestAnswers(a); playSound('click'); } }} disabled={showExplanation} style={{
                    padding: '16px', borderRadius: '12px',
                    border: showCorrect ? `2px solid ${colors.success}` : showWrong ? `2px solid ${colors.error}` : isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                    backgroundColor: showCorrect ? `${colors.success}15` : showWrong ? `${colors.error}15` : isSelected ? `${colors.primary}20` : colors.bgCard,
                    cursor: showExplanation ? 'default' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{opt.label}</span>
                    {showCorrect && <span style={{ color: colors.success, fontSize: '20px' }}>✓</span>}
                    {showWrong && <span style={{ color: colors.error, fontSize: '20px' }}>✗</span>}
                    {!showExplanation && isSelected && <span style={{ color: colors.primary, fontSize: '20px' }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {selectedAnswer && !showExplanation && (
              <button onClick={() => { setShowExplanation(true); playSound(isCorrect ? 'success' : 'failure'); }} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Check Answer</button>
            )}

            {showExplanation && (
              <div style={{ background: isCorrect ? `${colors.success}15` : `${colors.primary}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${isCorrect ? colors.success : colors.primary}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '💡'}</span>
                  <span style={{ color: isCorrect ? colors.success : colors.primaryLight, fontSize: '16px', fontWeight: 700 }}>{isCorrect ? 'Correct!' : 'Explanation'}</span>
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>{currentQ.explanation}</p>
              </div>
            )}
          </div>
        </div>

        {showExplanation ? (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, minHeight: '72px', background: colors.bgCard, borderTop: `1px solid ${colors.border}`, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', padding: '12px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={() => { if (testQuestion < 9) { setTestQuestion(testQuestion + 1); setShowExplanation(false); playSound('click'); } else { goToPhase('mastery'); } }} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', minHeight: '52px', minWidth: '200px' }}>
              {testQuestion < 9 ? 'Next Question →' : 'See Results →'}
            </button>
          </div>
        ) : renderBottomBar(true, false, 'Select an answer')}
      </div>
    );
  }

  if (phase === 'mastery') {
    const score = calculateTestScore();
    const percentage = score * 10;
    const passed = percentage >= 70;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '16px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🏆' : '📚'}</div>
            <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: passed ? colors.success : colors.primaryLight, marginBottom: '8px' }}>{passed ? 'Mastery Achieved!' : 'Keep Learning!'}</h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '32px' }}>{passed ? 'You understand minimal surfaces!' : 'Review and try again.'}</p>

            <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '32px', marginBottom: '24px', border: `1px solid ${passed ? colors.success : colors.border}40` }}>
              <div style={{ fontSize: '64px', fontWeight: 800, color: passed ? colors.success : colors.primaryLight, marginBottom: '8px' }}>{percentage}%</div>
              <p style={{ color: colors.textSecondary, fontSize: '16px', margin: 0 }}>{score} of 10 correct</p>
              <div style={{ height: '8px', background: colors.bgDark, borderRadius: '4px', marginTop: '20px', overflow: 'hidden' }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: passed ? `linear-gradient(90deg, ${colors.success} 0%, ${colors.successLight} 100%)` : `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)`, borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🎓 What You Learned:</h3>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 2, margin: 0, paddingLeft: '20px' }}>
                <li>Soap films minimize surface area (H = 0 everywhere)</li>
                <li>Plateau's laws: 3 films meet at 120°, 4 edges at 109.47°</li>
                <li>Steiner trees use 120° junctions to minimize total length</li>
                <li>Catenoids form between circular rings</li>
                <li>Applications: architecture, networks, biology, foam</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!passed && <button onClick={() => goToPhase('predict')} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>🔄 Try Again</button>}
              <button onClick={() => { onComplete?.(); playSound('complete'); }} style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.textPrimary, fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>← Return to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MinimalSurfacesRenderer;
