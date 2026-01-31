/**
 * SHEAR-THINNING RENDERER (Ketchup Physics)
 *
 * Complete physics game demonstrating shear-thinning fluids.
 * Viscosity DECREASES with shear rate due to structure breakdown.
 *
 * FEATURES:
 * - Static graphic in predict phase with explanation below
 * - Interactive shake/shear controls in play phase
 * - Network structure animation showing breakdown
 * - Rich transfer phase with real-world applications
 * - Full compliance with GAME_EVALUATION_SYSTEM.md
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ============================================================
// THEME COLORS (matching evaluation framework requirements)
// ============================================================

const colors = {
  // Backgrounds
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',

  // Primary colors - Red theme for ketchup
  primary: '#dc2626',
  primaryLight: '#f87171',
  primaryDark: '#b91c1c',

  // Accent colors
  accent: '#f97316',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  // Text colors - CRITICAL: Must meet contrast requirements
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Physics-specific colors
  ketchup: '#dc2626',
  ketchupDark: '#991b1b',
  ketchupLight: '#f87171',
  polymer: '#fbbf24',
  network: '#a855f7',
  broken: '#22c55e',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'shear_thinning';

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
    scenario: "You're trying to get ketchup out of a glass bottle.",
    question: "What happens to a shear-thinning fluid when you apply stress?",
    options: [
      { id: 'thicker', label: "It becomes thicker and more resistant" },
      { id: 'thinner', label: "It becomes thinner and flows more easily", correct: true },
      { id: 'same', label: "It remains unchanged" },
      { id: 'solid', label: "It solidifies completely" }
    ],
    explanation: "Shear-thinning fluids like ketchup become LESS viscous (thinner) when stress is applied. The internal structure breaks down under shear, allowing easier flow."
  },
  {
    scenario: "You tip a ketchup bottle but nothing comes out at first.",
    question: "Why does ketchup often refuse to flow initially?",
    options: [
      { id: 'frozen', label: "It is frozen inside the bottle" },
      { id: 'vacuum', label: "The cap creates a vacuum seal" },
      { id: 'viscosity', label: "At rest, it has high viscosity like a thick gel", correct: true },
      { id: 'opening', label: "The bottle opening is too small" }
    ],
    explanation: "At rest, ketchup has a yield stress — it behaves like a gel with high viscosity. It won't flow until enough force is applied to break its internal structure."
  },
  {
    scenario: "You want to understand why ketchup behaves this way.",
    question: "What molecular mechanism causes shear-thinning behavior?",
    options: [
      { id: 'freeze', label: "Molecules freeze and lock together under stress" },
      { id: 'align', label: "Polymer chains or particles align and untangle under shear", correct: true },
      { id: 'heat', label: "Heat from friction melts the fluid" },
      { id: 'air', label: "Air bubbles form and reduce viscosity" }
    ],
    explanation: "Shear-thinning occurs because polymer chains or suspended particles become aligned and untangled when sheared, reducing resistance to flow."
  },
  {
    scenario: "Your friend claims oobleck (cornstarch water) is shear-thinning.",
    question: "Which of these is NOT a shear-thinning fluid?",
    options: [
      { id: 'ketchup', label: "Ketchup" },
      { id: 'paint', label: "Paint" },
      { id: 'oobleck', label: "Cornstarch and water (oobleck)", correct: true },
      { id: 'toothpaste', label: "Toothpaste" }
    ],
    explanation: "Oobleck is shear-THICKENING — it becomes MORE viscous under stress. Ketchup, paint, and toothpaste are all shear-thinning: they flow easier when stirred or squeezed."
  },
  {
    scenario: "You're painting a wall with latex paint.",
    question: "Why is shear-thinning important for paint application?",
    options: [
      { id: 'dry', label: "It makes paint dry faster" },
      { id: 'flow', label: "It allows paint to flow smoothly when brushed but stay put when done", correct: true },
      { id: 'color', label: "It makes paint more colorful" },
      { id: 'wash', label: "It prevents paint from being washed off" }
    ],
    explanation: "Shear-thinning lets paint flow easily during brushing (low viscosity), then become thick again to prevent drips and sags once you stop (high viscosity)."
  },
  {
    scenario: "A doctor is explaining how blood flows through your body.",
    question: "How does blood demonstrate shear-thinning properties?",
    options: [
      { id: 'clot', label: "Blood clots immediately when stressed" },
      { id: 'freeze', label: "Blood cells freeze under pressure" },
      { id: 'deform', label: "Red blood cells deform and align to flow through narrow capillaries", correct: true },
      { id: 'evaporate', label: "Blood evaporates when sheared" }
    ],
    explanation: "Red blood cells are flexible and can deform under shear. In narrow capillaries, high shear rates cause cells to align and deform, reducing blood's apparent viscosity."
  },
  {
    scenario: "You notice shampoo flows easily when squeezed but stays on your palm.",
    question: "Why does shampoo exhibit shear-thinning behavior?",
    options: [
      { id: 'water', label: "It's mostly water anyway" },
      { id: 'surfactant', label: "Surfactant molecules form networks that break under shear", correct: true },
      { id: 'fragrance', label: "The fragrance oils change viscosity" },
      { id: 'plastic', label: "The plastic bottle squeezes it thinner" }
    ],
    explanation: "Shampoo contains surfactant molecules that form loose networks. Squeezing breaks these networks temporarily, making it flow. At rest, the networks reform."
  },
  {
    scenario: "An engineer is designing a new printing ink.",
    question: "Why would an engineer want ink to be shear-thinning?",
    options: [
      { id: 'cheap', label: "It's cheaper to manufacture" },
      { id: 'jets', label: "It flows through tiny print nozzles but doesn't spread on paper", correct: true },
      { id: 'color', label: "It produces brighter colors" },
      { id: 'fast', label: "It dries instantly on contact with air" }
    ],
    explanation: "Ink needs to flow through microscopic nozzles (high shear = low viscosity) but not spread or bleed on the paper surface (low shear = high viscosity)."
  },
  {
    scenario: "You're comparing honey and ketchup's flow behavior.",
    question: "How does honey differ from ketchup in terms of flow?",
    options: [
      { id: 'both', label: "Both are shear-thinning, just different thicknesses" },
      { id: 'newtonian', label: "Honey is Newtonian — its viscosity stays constant regardless of shear", correct: true },
      { id: 'thickening', label: "Honey is shear-thickening" },
      { id: 'temperature', label: "Temperature affects ketchup but not honey" }
    ],
    explanation: "Honey is a Newtonian fluid — its viscosity depends only on temperature, not on shear rate. Stirring honey doesn't make it thinner. Ketchup's viscosity drops dramatically when sheared."
  },
  {
    scenario: "A materials scientist is studying yield stress fluids.",
    question: "What is yield stress in the context of ketchup?",
    options: [
      { id: 'breaking', label: "The stress at which the bottle breaks" },
      { id: 'minimum', label: "The minimum stress needed to make it start flowing", correct: true },
      { id: 'maximum', label: "The maximum stress the ketchup can withstand" },
      { id: 'temperature', label: "The temperature at which it liquefies" }
    ],
    explanation: "Yield stress is the minimum force needed to initiate flow. Below this threshold, ketchup behaves like a solid gel. Above it, the structure breaks and it flows."
  }
];

const realWorldApps = [
  {
    icon: '🎨',
    title: 'Paint Technology',
    short: 'Drip-free coatings',
    tagline: 'Flow When Brushed, Stay When Done',
    description: 'Modern latex paints are engineered to be shear-thinning. They flow smoothly onto surfaces during brushing, then instantly thicken to prevent drips, runs, and sags.',
    connection: 'Just like shaking ketchup makes it flow, brush strokes temporarily thin the paint. When you stop, it becomes thick again and holds its position on vertical surfaces.',
    howItWorks: 'Paint contains polymer chains and particles that form a loose network. Brushing breaks this network, lowering viscosity. Once brushing stops, the network reforms in milliseconds.',
    stats: [
      { value: '100x', label: 'Viscosity change', icon: '📉' },
      { value: '<1 sec', label: 'Recovery time', icon: '⏱️' },
      { value: '$160B', label: 'Global paint market', icon: '💰' }
    ],
    examples: [
      'Latex house paints that don\'t drip',
      'Automotive clear coats for even coverage',
      'Anti-fouling marine coatings',
      'Artist acrylics for precise brushwork'
    ],
    companies: ['Sherwin-Williams', 'PPG Industries', 'AkzoNobel', 'Benjamin Moore'],
    futureImpact: 'Smart paints could automatically adjust their viscosity based on application method and environmental conditions.',
    color: colors.accent
  },
  {
    icon: '🩸',
    title: 'Blood Flow Physics',
    short: 'Life-saving rheology',
    tagline: 'Your Body\'s Smart Fluid',
    description: 'Blood is shear-thinning! This property is critical for circulation — blood flows easily through large arteries but can still navigate through capillaries narrower than red blood cells.',
    connection: 'Like ketchup flowing faster when shaken, blood becomes less viscous in high-shear environments (narrow vessels), allowing efficient delivery of oxygen to every cell.',
    howItWorks: 'Red blood cells are flexible biconcave discs. In narrow capillaries, high shear rates cause them to align and deform into bullet shapes, dramatically reducing flow resistance.',
    stats: [
      { value: '5L', label: 'Blood pumped/min', icon: '❤️' },
      { value: '60,000', label: 'Miles of vessels', icon: '🩸' },
      { value: '7 μm', label: 'Smallest capillary', icon: '🔬' }
    ],
    examples: [
      'Red blood cells squeeze through tiny capillaries',
      'Blood thinners alter shear-thinning properties',
      'Sickle cell disease disrupts normal flow behavior',
      'Artificial blood must match natural rheology'
    ],
    companies: ['Medical research institutions', 'Pharmaceutical companies', 'Biomedical device manufacturers'],
    futureImpact: 'Understanding blood rheology leads to better treatments for cardiovascular disease and improved artificial blood products.',
    color: '#dc2626'
  },
  {
    icon: '🧴',
    title: 'Personal Care Products',
    short: 'Squeeze and spread',
    tagline: 'Engineered for the Perfect Flow',
    description: 'Shampoo, lotion, and toothpaste are all designed to be shear-thinning. They squeeze out easily but don\'t run off your hand or out of the tube.',
    connection: 'The same physics that lets ketchup flow when shaken makes your shampoo come out smoothly when squeezed, then stay put in your palm.',
    howItWorks: 'Surfactants and polymers create weak gel networks. Squeezing provides shear that breaks these networks temporarily. When the stress is removed, the networks reform.',
    stats: [
      { value: '$500B', label: 'Global cosmetics market', icon: '💄' },
      { value: '90%', label: 'Products use this tech', icon: '📊' },
      { value: '5-50x', label: 'Typical viscosity drop', icon: '📉' }
    ],
    examples: [
      'Toothpaste that holds its shape on the brush',
      'Shampoo that doesn\'t slide off your palm',
      'Sunscreen that spreads evenly but doesn\'t drip',
      'Hair gel that\'s easy to work with but sets firm'
    ],
    companies: ['Procter & Gamble', 'Unilever', 'L\'Oréal', 'Colgate-Palmolive'],
    futureImpact: 'Sustainable formulations using natural shear-thinning agents are replacing synthetic polymers in eco-friendly products.',
    color: colors.primary
  },
  {
    icon: '🖨️',
    title: 'Printing & Inks',
    short: 'Precision deposition',
    tagline: 'Flow Through Nozzles, Stay on Paper',
    description: 'Inkjet inks must flow through microscopic nozzles (high shear) but not spread or bleed on paper (low shear). Shear-thinning makes this possible.',
    connection: 'Like ketchup that flows when shaken but holds shape at rest, ink becomes thin to jet through tiny holes, then thick to form crisp dots on paper.',
    howItWorks: 'Ink formulations contain polymers that align under high shear in the nozzle, reducing viscosity. On paper, the polymers relax back to a tangled state, preventing spreading.',
    stats: [
      { value: '1 pL', label: 'Droplet volume', icon: '💧' },
      { value: '4800', label: 'DPI resolution', icon: '🎯' },
      { value: '50,000', label: 'Drops/second', icon: '⚡' }
    ],
    examples: [
      'High-resolution inkjet printing',
      '3D printing with viscous materials',
      'Printed electronics and circuits',
      'Bioprinting living tissues'
    ],
    companies: ['HP', 'Epson', 'Canon', 'Fujifilm'],
    futureImpact: 'Advanced shear-thinning inks enable 3D printing of complex structures including organs and electronic devices.',
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

interface ShearThinningRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const ShearThinningRenderer: React.FC<ShearThinningRendererProps> = ({
  onComplete,
  onGameEvent,
  gamePhase
}) => {
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
  const [shearRate, setShearRate] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [networkIntegrity, setNetworkIntegrity] = useState(100);

  // Animation state
  const animationRef = useRef<number>();
  const [animTime, setAnimTime] = useState(0);

  // Test phase state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

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

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimTime(t => t + 0.016);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Network breakdown simulation
  useEffect(() => {
    if (isShaking || shearRate > 20) {
      const breakdownRate = Math.max(shearRate, isShaking ? 80 : 0) / 20;
      setNetworkIntegrity(prev => Math.max(10, prev - breakdownRate));
    } else {
      // Recovery when not shearing
      setNetworkIntegrity(prev => Math.min(100, prev + 0.5));
    }
  }, [isShaking, shearRate, animTime]);

  // Calculate viscosity based on network integrity
  const viscosity = useMemo(() => {
    // High network integrity = high viscosity
    // Low network integrity = low viscosity (shear-thinning)
    return 10 + (networkIntegrity / 100) * 90;
  }, [networkIntegrity]);

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
    playSound('transition');
    emitGameEvent('phase_changed', { phase: p });

    if (p === 'test') {
      setTestQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setTestSubmitted(false);
      setShowExplanation(false);
    }

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // ============================================================
  // KETCHUP VISUALIZATION
  // ============================================================

  const renderKetchupVisualization = (interactive: boolean = false) => {
    const width = isMobile ? 340 : 680;
    const height = isMobile ? 300 : 380;
    const cx = width / 2;

    // Network visualization
    const networkNodes = useMemo(() => {
      const nodes = [];
      const gridSize = isMobile ? 4 : 6;
      const spacing = width / (gridSize + 2);
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const baseX = spacing * (i + 1.5);
          const baseY = 120 + spacing * j * 0.6;
          // Add some randomness based on network integrity
          const chaos = interactive ? (100 - networkIntegrity) / 100 : 0;
          const offsetX = Math.sin(animTime * 2 + i + j) * 10 * chaos;
          const offsetY = Math.cos(animTime * 2 + i * j) * 10 * chaos;
          nodes.push({
            x: baseX + offsetX,
            y: baseY + offsetY,
            id: `${i}-${j}`
          });
        }
      }
      return nodes;
    }, [width, isMobile, networkIntegrity, animTime, interactive]);

    // Legend items
    const legendItems = [
      { color: colors.ketchup, label: 'Ketchup (tomato paste)' },
      { color: colors.polymer, label: 'Polymer chains' },
      { color: colors.network, label: 'Network connections' },
      { color: colors.broken, label: 'Broken bonds (flowing)' },
    ];

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
        {/* Legend */}
        <div style={{
          position: 'absolute',
          top: isMobile ? '8px' : '12px',
          right: isMobile ? '8px' : '12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '8px',
          padding: isMobile ? '8px' : '12px',
          border: `1px solid ${colors.border}`,
          zIndex: 10,
          maxWidth: isMobile ? '130px' : '170px'
        }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>
            Legend
          </p>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: colors.textSecondary, lineHeight: 1.2 }}>{item.label}</span>
            </div>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="ketchupBottle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.ketchupLight} />
              <stop offset="50%" stopColor={colors.ketchup} />
              <stop offset="100%" stopColor={colors.ketchupDark} />
            </linearGradient>
            <linearGradient id="ketchupInside" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.ketchupDark} />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

          {/* Title */}
          <text x={cx} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
            Shear-Thinning Fluid: Ketchup
          </text>
          <text x={cx} y="48" textAnchor="middle" fill={colors.textSecondary} fontSize={isMobile ? 11 : 14} fontWeight="500">
            Polymer networks break under shear stress
          </text>

          {/* Ketchup bottle */}
          <g transform={`translate(${cx - 40}, 60) ${interactive && isShaking ? `rotate(${Math.sin(animTime * 20) * 8}, 40, 80)` : ''}`}>
            {/* Bottle body */}
            <path
              d="M 20 50 L 20 140 Q 20 160, 40 160 Q 60 160, 60 140 L 60 50 Q 60 30, 40 30 Q 20 30, 20 50"
              fill="url(#ketchupBottle)"
              stroke={colors.ketchupDark}
              strokeWidth="2"
            />
            {/* Bottle neck */}
            <rect x="32" y="5" width="16" height="28" fill={colors.ketchup} />
            {/* Cap */}
            <rect x="28" y="0" width="24" height="10" fill={colors.warningLight} rx="3" />
            {/* Label */}
            <rect x="25" y="65" width="30" height="45" fill="#fef3c7" rx="3" />
            <text x="40" y="85" textAnchor="middle" fill={colors.ketchupDark} fontSize="7" fontWeight="bold">
              KETCHUP
            </text>
            {/* Ketchup inside - level based on flow */}
            <path
              d={`M 22 ${interactive ? 145 - (100 - networkIntegrity) * 0.3 : 145} L 22 138 Q 22 155, 40 155 Q 58 155, 58 138 L 58 ${interactive ? 145 - (100 - networkIntegrity) * 0.3 : 145} Z`}
              fill="url(#ketchupInside)"
            />
          </g>

          {/* Molecular network visualization */}
          <g transform={`translate(${cx + (isMobile ? 60 : 100)}, 70)`}>
            <rect x="-10" y="-10" width={isMobile ? 120 : 200} height={isMobile ? 160 : 200} fill={colors.bgCard} rx="8" stroke={colors.border} />
            <text x={isMobile ? 50 : 90} y="10" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
              Molecular Structure
            </text>

            {/* Draw network connections */}
            {networkNodes.map((node, i) => {
              const neighbors = networkNodes.filter((n, j) =>
                j !== i && Math.abs(networkNodes.indexOf(n) - i) < 3
              );
              return neighbors.slice(0, 2).map((neighbor, k) => {
                const distance = Math.sqrt(
                  Math.pow(node.x - neighbor.x - (cx + (isMobile ? 60 : 100)), 2) +
                  Math.pow(node.y - neighbor.y - 70, 2)
                );
                const isIntact = interactive ? (networkIntegrity / 100) > Math.random() * 0.5 : true;
                return (
                  <line
                    key={`${node.id}-${k}`}
                    x1={node.x - (cx + (isMobile ? 60 : 100)) + 10}
                    y1={node.y - 50}
                    x2={neighbor.x - (cx + (isMobile ? 60 : 100)) + 10}
                    y2={neighbor.y - 50}
                    stroke={isIntact ? colors.network : colors.broken}
                    strokeWidth={isIntact ? 2 : 1}
                    strokeDasharray={isIntact ? '0' : '4,4'}
                    opacity={isIntact ? 0.7 : 0.4}
                  />
                );
              });
            })}

            {/* Draw nodes (polymer particles) */}
            {networkNodes.map((node, i) => (
              <circle
                key={node.id}
                cx={node.x - (cx + (isMobile ? 60 : 100)) + 10}
                cy={node.y - 50}
                r={isMobile ? 4 : 6}
                fill={colors.polymer}
                opacity={0.9}
              />
            ))}
          </g>

          {/* Viscosity meter (interactive only) */}
          {interactive && (
            <g transform={`translate(${isMobile ? 20 : 40}, ${height - 80})`}>
              <rect x="0" y="0" width={isMobile ? 100 : 140} height="60" fill={colors.bgCard} rx="8" stroke={colors.border} />
              <text x={isMobile ? 50 : 70} y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
                Viscosity
              </text>
              <rect x="10" y="28" width={isMobile ? 80 : 120} height="12" fill={colors.bgDark} rx="4" />
              <rect
                x="10"
                y="28"
                width={Math.max(10, (viscosity / 100) * (isMobile ? 80 : 120))}
                height="12"
                fill={viscosity > 50 ? colors.primary : colors.success}
                rx="4"
              />
              <text x={isMobile ? 50 : 70} y="54" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
                {Math.round(viscosity)} Pa·s
              </text>
            </g>
          )}

          {/* Network integrity meter (interactive only) */}
          {interactive && (
            <g transform={`translate(${width - (isMobile ? 120 : 180)}, ${height - 80})`}>
              <rect x="0" y="0" width={isMobile ? 100 : 140} height="60" fill={colors.bgCard} rx="8" stroke={colors.border} />
              <text x={isMobile ? 50 : 70} y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
                Network
              </text>
              <rect x="10" y="28" width={isMobile ? 80 : 120} height="12" fill={colors.bgDark} rx="4" />
              <rect
                x="10"
                y="28"
                width={(networkIntegrity / 100) * (isMobile ? 80 : 120)}
                height="12"
                fill={networkIntegrity > 50 ? colors.network : colors.broken}
                rx="4"
              />
              <text x={isMobile ? 50 : 70} y="54" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
                {Math.round(networkIntegrity)}% Intact
              </text>
            </g>
          )}

          {/* Physics formula */}
          <g transform={`translate(${isMobile ? 15 : 25}, ${height - (isMobile ? 35 : 30)})`}>
            <text fill={colors.textSecondary} fontSize={isMobile ? 10 : 12} fontWeight="600">
              <tspan fill={colors.primaryLight}>η</tspan> = η₀ × (1 + (λ × <tspan fill={colors.accent}>γ̇</tspan>)<tspan baselineShift="super" fontSize="8">n-1</tspan>)
            </text>
            <text y="14" fill={colors.textMuted} fontSize={isMobile ? 8 : 10}>
              Viscosity decreases with shear rate (n &lt; 1)
            </text>
          </g>
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
      if (onNext) {
        onNext();
      } else {
        const currentIndex = validPhases.indexOf(phase);
        if (currentIndex < validPhases.length - 1) {
          goToPhase(validPhases[currentIndex + 1]);
        }
      }
    };

    const handleBack = () => {
      playSound('click');
      const currentIndex = validPhases.indexOf(phase);
      if (currentIndex > 0) {
        goToPhase(validPhases[currentIndex - 1]);
      }
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        minHeight: '72px',
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        {showBack ? (
          <button
            onClick={handleBack}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bgCardLight,
              color: colors.textSecondary,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            ← Back
          </button>
        ) : <div />}

        {canProceed ? (
          <button
            onClick={handleNext}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '52px',
              minWidth: '160px',
              boxShadow: `0 4px 15px ${colors.primary}40`
            }}
          >
            {nextLabel}
          </button>
        ) : (
          <div style={{
            padding: '14px 28px',
            borderRadius: '12px',
            backgroundColor: colors.bgCardLight,
            color: colors.textMuted,
            fontSize: '14px',
            fontWeight: 500,
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center'
          }}>
            Select an option above
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // HOOK PHASE
  // ============================================================

  if (phase === 'hook') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: isMobile ? '80px' : '120px', marginBottom: '20px' }}>
              🍅
            </div>

            <h1 style={{
              fontSize: isMobile ? '28px' : '40px',
              fontWeight: 800,
              color: colors.textPrimary,
              marginBottom: '16px',
              lineHeight: 1.2
            }}>
              Why Does Shaking Help?
            </h1>

            <p style={{
              fontSize: isMobile ? '16px' : '20px',
              color: colors.textSecondary,
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6
            }}>
              Ketchup won't come out... then suddenly it <strong style={{ color: colors.primaryLight }}>gushes everywhere</strong>.
              What changed?
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🍾</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Tip bottle...</p>
                  <p style={{ color: colors.primary, fontSize: '16px', fontWeight: 600 }}>Nothing!</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🫨</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Shake it...</p>
                  <p style={{ color: colors.success, fontSize: '16px', fontWeight: 600 }}>It flows!</p>
                </div>
              </div>
            </div>

            <p style={{
              fontSize: '14px',
              color: colors.textMuted,
              fontStyle: 'italic'
            }}>
              The opposite of oobleck... this is <strong style={{ color: colors.primaryLight }}>shear-thinning!</strong>
            </p>
          </div>
        </div>

        {renderBottomBar(false, true, "Let's Investigate →")}
      </div>
    );
  }

  // ============================================================
  // PREDICT PHASE
  // ============================================================

  if (phase === 'predict') {
    const predictions = [
      { id: 'thicker', label: 'It gets thicker and harder to pour', icon: '🧱' },
      { id: 'thinner', label: 'It gets thinner and flows easily', icon: '💧' },
      { id: 'same', label: 'It stays exactly the same', icon: '➡️' },
      { id: 'solid', label: 'It turns completely solid', icon: '🧊' }
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 1 • Make a Prediction
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Ketchup Bottle Setup
              </h2>
            </div>

            {/* STATIC GRAPHIC */}
            <div style={{
              width: '100%',
              maxWidth: '700px',
              margin: '0 auto 20px auto',
              aspectRatio: '16/10',
              background: colors.bgCard,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden'
            }}>
              {renderKetchupVisualization(false)}
            </div>

            {/* What You're Looking At */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                📋 What You're Looking At:
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                A <strong style={{ color: colors.primary }}>ketchup bottle</strong> and its internal molecular structure.
                The <span style={{ color: colors.polymer }}>yellow dots</span> are polymer particles (from tomatoes).
                The <span style={{ color: colors.network }}>purple lines</span> show how these particles form a tangled network.
                This network gives ketchup its thick, gel-like consistency at rest.
              </p>
            </div>

            {/* Prediction Question */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 What happens when you shake/squeeze the bottle?
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPrediction(p.id);
                      playSound('click');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {prediction === p.id && (
                      <span style={{ color: colors.primary, fontSize: '20px', fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {prediction && (
              <div style={{
                background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.primary}30`
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                  💭 Why do you think this happens? <span style={{ color: colors.textMuted }}>(Optional)</span>
                </p>
                <textarea
                  placeholder="Share your reasoning..."
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // ============================================================
  // PLAY PHASE
  // ============================================================

  if (phase === 'play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 2 • Experiment
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Shake the Ketchup!
              </h2>
            </div>

            {/* INTERACTIVE GRAPHIC */}
            <div style={{
              width: '100%',
              maxWidth: '700px',
              margin: '0 auto 20px auto',
              background: colors.bgCard,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden'
            }}>
              {renderKetchupVisualization(true)}
            </div>

            {/* Controls */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                🎮 Controls: Apply Shear Stress
              </h3>

              {/* Shear rate slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '13px', fontWeight: 600 }}>Rest</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>
                    Shear Rate: {shearRate}%
                  </span>
                  <span style={{ color: colors.primary, fontSize: '13px', fontWeight: 600 }}>Max Stress</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={shearRate}
                  onChange={(e) => setShearRate(Number(e.target.value))}
                  onInput={(e) => setShearRate(Number((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: colors.primary
                  }}
                />
              </div>

              {/* Shake button */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onMouseDown={() => setIsShaking(true)}
                  onMouseUp={() => setIsShaking(false)}
                  onMouseLeave={() => setIsShaking(false)}
                  onTouchStart={() => setIsShaking(true)}
                  onTouchEnd={() => setIsShaking(false)}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isShaking
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`
                      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minWidth: '150px',
                    transform: isShaking ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.1s'
                  }}
                >
                  {isShaking ? '🫨 Shaking...' : '🍅 Hold to Shake'}
                </button>
              </div>
            </div>

            {/* What's Happening */}
            <div style={{
              background: `linear-gradient(135deg, ${networkIntegrity < 50 ? colors.success : colors.primary}15 0%, ${colors.bgCard} 100%)`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${networkIntegrity < 50 ? colors.success : colors.primary}40`
            }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                👀 What's Happening:
              </h4>
              {networkIntegrity > 70 ? (
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  The polymer network is <strong style={{ color: colors.network }}>mostly intact</strong>.
                  Ketchup behaves like a thick gel — high viscosity, won't flow easily.
                </p>
              ) : networkIntegrity > 30 ? (
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  The network is <strong style={{ color: colors.warning }}>breaking down!</strong>
                  Polymer chains are aligning and untangling. Viscosity is dropping.
                </p>
              ) : (
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  Network is <strong style={{ color: colors.success }}>mostly broken!</strong>
                  Polymers are aligned — ketchup flows easily like a liquid. Low viscosity!
                </p>
              )}
            </div>

            {/* Formula */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                📐 The Physics:
              </h4>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', marginBottom: '12px' }}>
                <span style={{ color: colors.primaryLight, fontWeight: 700 }}>η</span>
                <span style={{ color: colors.textSecondary }}> = η₀ × (1 + (λ × </span>
                <span style={{ color: colors.accent, fontWeight: 700 }}>γ̇</span>
                <span style={{ color: colors.textSecondary }}>)</span>
                <span style={{ color: colors.textSecondary, fontSize: '12px' }}><sup>n-1</sup></span>
                <span style={{ color: colors.textSecondary }}>) where </span>
                <span style={{ color: colors.success, fontWeight: 700 }}>n &lt; 1</span>
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.8 }}>
                <div><span style={{ color: colors.primaryLight, fontWeight: 700 }}>η</span> = Viscosity (resistance to flow)</div>
                <div><span style={{ color: colors.accent, fontWeight: 700 }}>γ̇</span> = Shear rate (stress applied)</div>
                <div><span style={{ color: colors.success, fontWeight: 700 }}>n &lt; 1</span> = Shear-thinning (viscosity DECREASES with shear)</div>
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(true, true, 'See the Results →')}
      </div>
    );
  }

  // ============================================================
  // REVIEW PHASE
  // ============================================================

  if (phase === 'review') {
    const wasCorrect = prediction === 'thinner';

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: wasCorrect ? `${colors.success}15` : `${colors.primary}15`,
              borderRadius: '16px',
              marginBottom: '24px',
              border: `1px solid ${wasCorrect ? colors.success : colors.primary}40`
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                {wasCorrect ? '🎯' : '💡'}
              </div>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: 700,
                color: wasCorrect ? colors.success : colors.primaryLight,
                marginBottom: '8px'
              }}>
                {wasCorrect ? 'Excellent Prediction!' : 'Great Learning Moment!'}
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                {wasCorrect
                  ? 'You correctly predicted that ketchup gets thinner when shaken!'
                  : 'The answer is: It gets thinner and flows easily'
                }
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                🔬 Why This Happens: Network Breakdown
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>1</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      At Rest: Tangled Network
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      Polymer molecules form a tangled, interconnected network. This creates high viscosity.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.warning} 0%, ${colors.accent} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>2</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      Under Shear: Breaking Bonds
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      Shaking/squeezing applies stress that breaks the weak bonds holding the network together.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.success} 0%, #16a34a 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>3</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      Flowing: Aligned Polymers
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      With broken network, polymers align with flow direction. Much lower resistance = low viscosity!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}20 100%)`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.primary}40`
            }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                💡 Key Insight
              </h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                This is <strong style={{ color: colors.textPrimary }}>shear-thinning</strong> behavior —
                the <strong>opposite</strong> of oobleck! Ketchup gets <em>thinner</em> under stress,
                while oobleck gets <em>thicker</em>. Both are non-Newtonian, but in opposite directions.
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(true, true, 'Try a Twist →')}
      </div>
    );
  }

  // ============================================================
  // TWIST PREDICT PHASE
  // ============================================================

  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'same_both', label: 'Both behave the same — they\'re both thick liquids', icon: '🟰' },
      { id: 'honey_thin', label: 'Honey also gets thinner when stirred', icon: '🍯' },
      { id: 'honey_constant', label: 'Honey\'s viscosity stays constant (Newtonian)', icon: '✓' },
      { id: 'honey_thick', label: 'Honey gets thicker when stirred', icon: '⬆️' }
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                🔄 Twist • Comparison
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Ketchup vs Honey
              </h2>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '50px', marginBottom: '8px' }}>🍅</div>
                  <p style={{ color: colors.primary, fontWeight: 600 }}>Ketchup</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>Shear-thinning</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '50px', marginBottom: '8px' }}>🍯</div>
                  <p style={{ color: colors.warning, fontWeight: 600 }}>Honey</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>???</p>
                </div>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                📋 The Question:
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Both ketchup and honey are thick liquids. Does honey also get thinner when you stir it,
                or does it behave differently?
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 How does honey respond to stirring?
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {twistPredictions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setTwistPrediction(p.id);
                      playSound('click');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: twistPrediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                      backgroundColor: twistPrediction === p.id ? `${colors.accent}20` : colors.bgCard,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{p.icon}</span>
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>{p.label}</span>
                    {twistPrediction === p.id && (
                      <span style={{ color: colors.accent, fontSize: '20px', fontWeight: 700 }}>✓</span>
                    )}
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

  // ============================================================
  // TWIST PLAY PHASE
  // ============================================================

  if (phase === 'twist_play') {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                🔄 Twist Comparison
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Newtonian vs Non-Newtonian
              </h2>
            </div>

            {/* Comparison visualization */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Ketchup */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${colors.primary}40`
              }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🍅</div>
                  <h3 style={{ color: colors.primary, fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Ketchup</h3>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>Non-Newtonian (Shear-Thinning)</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px' }}>
                    Viscosity vs Shear Rate:
                  </p>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📉</div>
                  <p style={{ color: colors.success, fontWeight: 600 }}>Decreases with stirring!</p>
                </div>
              </div>

              {/* Honey */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${colors.warning}40`
              }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🍯</div>
                  <h3 style={{ color: colors.warning, fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Honey</h3>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>Newtonian Fluid</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '12px' }}>
                    Viscosity vs Shear Rate:
                  </p>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>➡️</div>
                  <p style={{ color: colors.warning, fontWeight: 600 }}>Stays constant!</p>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.warning}10 100%)`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
                🍯 Why Honey is Different:
              </h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                Honey is a <strong style={{ color: colors.warning }}>Newtonian fluid</strong> — its viscosity depends
                <em> only on temperature</em>, not on how fast you stir it. It's thick because of its sugar concentration,
                not because of polymer networks. Stirring doesn't break any structure, so the viscosity stays the same.
                <br /><br />
                Warm honey? Thinner. Cold honey? Thicker. But stirred honey? <strong>Same viscosity.</strong>
              </p>
            </div>

            {/* Chart/comparison */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                📊 Fluid Behavior Chart:
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'left', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>Fluid</th>
                    <th style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>Type</th>
                    <th style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', padding: '8px', borderBottom: `1px solid ${colors.border}` }}>Stir Effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: colors.textPrimary, fontSize: '13px', padding: '8px' }}>🍅 Ketchup</td>
                    <td style={{ color: colors.success, fontSize: '13px', padding: '8px', textAlign: 'center' }}>Shear-thinning</td>
                    <td style={{ color: colors.success, fontSize: '13px', padding: '8px', textAlign: 'center' }}>↓ Thinner</td>
                  </tr>
                  <tr>
                    <td style={{ color: colors.textPrimary, fontSize: '13px', padding: '8px' }}>🍯 Honey</td>
                    <td style={{ color: colors.warning, fontSize: '13px', padding: '8px', textAlign: 'center' }}>Newtonian</td>
                    <td style={{ color: colors.warning, fontSize: '13px', padding: '8px', textAlign: 'center' }}>→ No change</td>
                  </tr>
                  <tr>
                    <td style={{ color: colors.textPrimary, fontSize: '13px', padding: '8px' }}>🥣 Oobleck</td>
                    <td style={{ color: colors.primary, fontSize: '13px', padding: '8px', textAlign: 'center' }}>Shear-thickening</td>
                    <td style={{ color: colors.primary, fontSize: '13px', padding: '8px', textAlign: 'center' }}>↑ Thicker</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {renderBottomBar(true, true, 'Review Results →')}
      </div>
    );
  }

  // ============================================================
  // TWIST REVIEW PHASE
  // ============================================================

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'honey_constant';

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: wasCorrect ? `${colors.success}15` : `${colors.accent}15`,
              borderRadius: '16px',
              marginBottom: '24px',
              border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                {wasCorrect ? '🎯' : '💡'}
              </div>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: 700,
                color: colors.textPrimary,
                marginBottom: '8px'
              }}>
                Honey is Newtonian!
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Unlike ketchup, honey's viscosity doesn't change with stirring.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                📊 Three Types of Fluids
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  background: `${colors.success}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.success}`
                }}>
                  <strong style={{ color: colors.success }}>Shear-Thinning (Ketchup, Paint):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Viscosity ↓ decreases with shear → flows easier when stressed
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: `${colors.warning}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.warning}`
                }}>
                  <strong style={{ color: colors.warning }}>Newtonian (Honey, Water, Oil):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Viscosity → stays constant regardless of shear rate
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: `${colors.primary}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.primary}`
                }}>
                  <strong style={{ color: colors.primary }}>Shear-Thickening (Oobleck):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Viscosity ↑ increases with shear → resists when stressed
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}20 100%)`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.primary}40`
            }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                🌍 Why This Matters
              </h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Engineers choose fluids based on their rheological properties. Paints are shear-thinning
                so they spread easily but don't drip. Blood is shear-thinning so it can flow through tiny
                capillaries. Understanding these differences is crucial for designing products from cosmetics
                to industrial coatings!
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // ============================================================
  // TRANSFER PHASE
  // ============================================================

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                🌍 Real-World Applications
              </p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
                Shear-Thinning in Action
              </h2>
            </div>

            {/* App tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
              overflowX: 'auto',
              paddingBottom: '8px'
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedApp(i);
                    playSound('click');
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                    background: selectedApp === i ? `${a.color}20` : colors.bgCard,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{a.icon}</span>
                  <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 600 }}>
                    {a.short}
                  </span>
                  {completedApps[i] && (
                    <span style={{ color: colors.success, fontSize: '16px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* App content */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background: `${app.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px'
                }}>
                  {app.icon}
                </div>
                <div>
                  <h3 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700, margin: 0 }}>
                    {app.title}
                  </h3>
                  <p style={{ color: app.color, fontSize: '14px', fontWeight: 600, margin: 0 }}>
                    {app.tagline}
                  </p>
                </div>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>
                {app.description}
              </p>

              <div style={{
                background: `${app.color}15`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                borderLeft: `4px solid ${app.color}`
              }}>
                <h4 style={{ color: app.color, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                  🔗 Connection to Ketchup Physics:
                </h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                  ⚙️ How It Works:
                </h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    background: colors.bgDark,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ color: app.color, fontSize: '18px', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                  📋 Real Examples:
                </h4>
                <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.8, margin: 0, paddingLeft: '20px' }}>
                  {app.examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>

              <div style={{
                background: `linear-gradient(135deg, ${colors.bgDark} 0%, ${app.color}10 100%)`,
                borderRadius: '12px',
                padding: '16px'
              }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                  🚀 Future Impact:
                </h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {app.futureImpact}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');

                const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                if (nextIncomplete !== -1) {
                  setSelectedApp(nextIncomplete);
                } else {
                  const firstIncomplete = newCompleted.findIndex(c => !c);
                  if (firstIncomplete !== -1) {
                    setSelectedApp(firstIncomplete);
                  }
                }
              }}
              disabled={completedApps[selectedApp]}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: completedApps[selectedApp]
                  ? colors.bgCardLight
                  : `linear-gradient(135deg, ${app.color} 0%, ${colors.accent} 100%)`,
                color: completedApps[selectedApp] ? colors.textMuted : 'white',
                fontSize: '16px',
                fontWeight: 700,
                cursor: completedApps[selectedApp] ? 'default' : 'pointer',
                minHeight: '52px'
              }}
            >
              {completedApps[selectedApp] ? '✓ Completed' : 'Got It! Continue →'}
            </button>

            <p style={{
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: '13px',
              marginTop: '12px'
            }}>
              {completedApps.filter(c => c).length} of 4 applications completed
              {allCompleted && ' — Ready for the test!'}
            </p>
          </div>
        </div>

        {renderBottomBar(true, allCompleted, 'Take the Test →')}
      </div>
    );
  }

  // ============================================================
  // TEST PHASE
  // ============================================================

  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const selectedAnswer = testAnswers[testQuestion];
    const isCorrect = selectedAnswer === currentQ.options.find(o => o.correct)?.id;

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Progress */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>
                  Question {testQuestion + 1} of 10
                </span>
                <span style={{ color: colors.textMuted, fontSize: '14px' }}>
                  {testAnswers.filter(a => a !== null).length} answered
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {testQuestions.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: i === testQuestion
                        ? colors.primary
                        : testAnswers[i] !== null
                          ? colors.success
                          : colors.bgCardLight
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              border: `1px solid ${colors.border}`
            }}>
              <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                SCENARIO
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{
              color: colors.textPrimary,
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 700,
              marginBottom: '20px',
              lineHeight: 1.4
            }}>
              {currentQ.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {currentQ.options.map((opt) => {
                const isSelected = selectedAnswer === opt.id;
                const showCorrect = showExplanation && opt.correct;
                const showWrong = showExplanation && isSelected && !opt.correct;

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!showExplanation) {
                        const newAnswers = [...testAnswers];
                        newAnswers[testQuestion] = opt.id;
                        setTestAnswers(newAnswers);
                        playSound('click');
                      }
                    }}
                    disabled={showExplanation}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: showCorrect
                        ? `2px solid ${colors.success}`
                        : showWrong
                          ? `2px solid ${colors.error}`
                          : isSelected
                            ? `2px solid ${colors.primary}`
                            : `1px solid ${colors.border}`,
                      backgroundColor: showCorrect
                        ? `${colors.success}15`
                        : showWrong
                          ? `${colors.error}15`
                          : isSelected
                            ? `${colors.primary}20`
                            : colors.bgCard,
                      cursor: showExplanation ? 'default' : 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: showCorrect ? `0 0 20px ${colors.success}30` : 'none'
                    }}
                  >
                    <span style={{ color: colors.textPrimary, fontSize: '14px', flex: 1 }}>
                      {opt.label}
                    </span>
                    {showCorrect && <span style={{ color: colors.success, fontSize: '20px' }}>✓</span>}
                    {showWrong && <span style={{ color: colors.error, fontSize: '20px' }}>✗</span>}
                    {!showExplanation && isSelected && (
                      <span style={{ color: colors.primary, fontSize: '20px' }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedAnswer && !showExplanation && (
              <button
                onClick={() => {
                  setShowExplanation(true);
                  playSound(isCorrect ? 'success' : 'failure');
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
              >
                Check Answer
              </button>
            )}

            {showExplanation && (
              <div style={{
                background: isCorrect ? `${colors.success}15` : `${colors.primary}15`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                border: `1px solid ${isCorrect ? colors.success : colors.primary}40`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '💡'}</span>
                  <span style={{
                    color: isCorrect ? colors.success : colors.primaryLight,
                    fontSize: '16px',
                    fontWeight: 700
                  }}>
                    {isCorrect ? 'Correct!' : 'Explanation'}
                  </span>
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {currentQ.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {showExplanation ? (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            minHeight: '72px',
            background: colors.bgCard,
            borderTop: `1px solid ${colors.border}`,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <button
              onClick={() => {
                if (testQuestion < 9) {
                  setTestQuestion(testQuestion + 1);
                  setShowExplanation(false);
                  playSound('click');
                } else {
                  setTestSubmitted(true);
                  goToPhase('mastery');
                }
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: 'white',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '52px',
                minWidth: '200px'
              }}
            >
              {testQuestion < 9 ? 'Next Question →' : 'See Results →'}
            </button>
          </div>
        ) : (
          renderBottomBar(true, false, 'Select an answer')
        )}
      </div>
    );
  }

  // ============================================================
  // MASTERY PHASE
  // ============================================================

  if (phase === 'mastery') {
    const score = calculateTestScore();
    const percentage = score * 10;
    const passed = percentage >= 70;

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>
              {passed ? '🏆' : '📚'}
            </div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px',
              fontWeight: 800,
              color: passed ? colors.success : colors.primaryLight,
              marginBottom: '8px'
            }}>
              {passed ? 'Mastery Achieved!' : 'Keep Learning!'}
            </h2>

            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered shear-thinning fluids!'
                : 'Review the concepts and try again.'
              }
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '24px',
              border: `1px solid ${passed ? colors.success : colors.border}40`
            }}>
              <div style={{
                fontSize: '64px',
                fontWeight: 800,
                color: passed ? colors.success : colors.primaryLight,
                marginBottom: '8px'
              }}>
                {percentage}%
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '16px', margin: 0 }}>
                {score} of 10 correct
              </p>

              <div style={{
                height: '8px',
                background: colors.bgDark,
                borderRadius: '4px',
                marginTop: '20px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: passed
                    ? `linear-gradient(90deg, ${colors.success} 0%, ${colors.successLight} 100%)`
                    : `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  borderRadius: '4px'
                }} />
              </div>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                70% required to pass
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                🎓 What You Learned:
              </h3>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 2, margin: 0, paddingLeft: '20px' }}>
                <li>Shear-thinning fluids become LESS viscous under stress</li>
                <li>Polymer networks break down and align under shear</li>
                <li>Honey is Newtonian (constant viscosity), not shear-thinning</li>
                <li>Applications: paint, blood, cosmetics, inks</li>
                <li>Opposite behavior to shear-thickening (oobleck)</li>
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!passed && (
                <button
                  onClick={() => goToPhase('predict')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🔄 Try Again
                </button>
              )}
              <button
                onClick={() => {
                  onComplete?.();
                  playSound('complete');
                }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: colors.bgCard,
                  color: colors.textPrimary,
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ← Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ShearThinningRenderer;
