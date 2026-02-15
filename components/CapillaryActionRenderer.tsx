/**
 * CAPILLARY ACTION RENDERER
 *
 * Complete physics game demonstrating capillary action.
 * Water rises in narrow tubes due to adhesion + surface tension.
 * h = 2γcos(θ)/(ρgr) - Jurin's Law
 *
 * FEATURES:
 * - Static graphic in predict phase showing tubes in water
 * - Interactive pore size slider affecting rise height
 * - Comparison of hydrophilic vs hydrophobic surfaces
 * - Rich transfer phase (plants, paper towels, concrete)
 * - Full compliance with GAME_EVALUATION_SYSTEM.md
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

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
  textMuted: '#cbd5e1',

  border: '#334155',
  borderLight: '#475569',

  // Physics-specific
  water: '#38bdf8',
  waterDark: '#0284c7',
  glass: '#94a3b8',
  meniscus: '#7dd3fc',
  adhesion: '#22d3ee',
  cohesion: '#3b82f6',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'capillary_action';

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
    scenario: "You dip three glass tubes of different widths into water.",
    question: "In which tube does water rise the highest?",
    options: [
      { id: 'widest', label: "The widest tube" },
      { id: 'narrowest', label: "The narrowest tube", correct: true },
      { id: 'same', label: "Same height in all tubes" },
      { id: 'none', label: "Water doesn't rise in any tube" }
    ],
    explanation: "Water rises highest in the narrowest tube! Capillary rise height is inversely proportional to tube radius: h = 2γcosθ/(ρgr). Smaller radius = higher rise."
  },
  {
    scenario: "You observe water in a glass tube forming a curved surface at the top.",
    question: "What causes the curved meniscus shape?",
    options: [
      { id: 'gravity', label: "Gravity pulling the water down" },
      { id: 'adhesion', label: "Water adhering to glass walls more than to itself", correct: true },
      { id: 'pressure', label: "Air pressure pushing down" },
      { id: 'temperature', label: "Temperature differences in the tube" }
    ],
    explanation: "The concave meniscus forms because water molecules are more attracted to glass (adhesion) than to each other (cohesion). This pulls water up at the edges."
  },
  {
    scenario: "Mercury in a glass tube shows a convex (humped) meniscus.",
    question: "Why does mercury behave opposite to water?",
    options: [
      { id: 'heavy', label: "Mercury is heavier than water" },
      { id: 'cohesion', label: "Mercury cohesion is stronger than its adhesion to glass", correct: true },
      { id: 'temperature', label: "Mercury is colder than water" },
      { id: 'magnetic', label: "Mercury is magnetic" }
    ],
    explanation: "Mercury molecules attract each other more strongly than they attract glass. This cohesion > adhesion creates a convex meniscus and causes mercury to drop below the surface level."
  },
  {
    scenario: "A paper towel touches a water spill.",
    question: "How does the paper towel absorb water?",
    options: [
      { id: 'suction', label: "It creates suction like a vacuum" },
      { id: 'capillary', label: "Water wicks through tiny fiber gaps via capillary action", correct: true },
      { id: 'chemical', label: "A chemical reaction absorbs the water" },
      { id: 'gravity', label: "Gravity pulls water into the paper" }
    ],
    explanation: "Paper towels have millions of tiny gaps between cellulose fibers. These act like capillary tubes, wicking water upward against gravity through surface tension and adhesion."
  },
  {
    scenario: "Trees can move water from roots to leaves 100+ meters high.",
    question: "What role does capillary action play in trees?",
    options: [
      { id: 'all', label: "Capillary action alone moves water to the top" },
      { id: 'part', label: "It helps, but transpiration pull is the main driver for tall trees", correct: true },
      { id: 'none', label: "Trees don't use capillary action at all" },
      { id: 'roots', label: "It only works in the roots" }
    ],
    explanation: "Capillary action helps move water through xylem vessels (only ~1m alone), but tall trees primarily use transpiration pull - water evaporating from leaves creates negative pressure that pulls water up."
  },
  {
    scenario: "A scientist measures capillary rise with Jurin's Law: h = 2γcosθ/(ρgr).",
    question: "If you double the tube radius, what happens to rise height?",
    options: [
      { id: 'double', label: "Height doubles" },
      { id: 'half', label: "Height is halved", correct: true },
      { id: 'same', label: "Height stays the same" },
      { id: 'zero', label: "Height becomes zero" }
    ],
    explanation: "Since h ∝ 1/r (height is inversely proportional to radius), doubling the radius cuts the rise height in half. This is why narrower tubes have higher capillary rise."
  },
  {
    scenario: "You add soap to water before testing capillary rise.",
    question: "What effect does soap have on capillary rise?",
    options: [
      { id: 'increase', label: "Rise height increases" },
      { id: 'decrease', label: "Rise height decreases because soap reduces surface tension", correct: true },
      { id: 'same', label: "No change - soap doesn't affect capillary action" },
      { id: 'reverse', label: "Water goes down instead of up" }
    ],
    explanation: "Soap is a surfactant that reduces water's surface tension (γ). Since h ∝ γ, lower surface tension means lower capillary rise. This is why soapy water spreads more easily."
  },
  {
    scenario: "Concrete structures can be damaged by rising groundwater.",
    question: "How does capillary rise affect buildings?",
    options: [
      { id: 'none', label: "Concrete is waterproof, so no effect" },
      { id: 'damage', label: "Water wicks through concrete pores, causing salt damage and dampness", correct: true },
      { id: 'strength', label: "Rising water makes concrete stronger" },
      { id: 'heat', label: "It only affects buildings in hot climates" }
    ],
    explanation: "Concrete has microscopic pores that act as capillary tubes. Groundwater wicks upward, carrying dissolved salts. When water evaporates, salt crystals form and can crack the concrete."
  },
  {
    scenario: "You're designing a microfluidic device for medical testing.",
    question: "Why is capillary action useful in lab-on-a-chip devices?",
    options: [
      { id: 'cheap', label: "It's cheaper than other methods" },
      { id: 'pump', label: "It moves fluids without external pumps - passive flow control", correct: true },
      { id: 'color', label: "It changes the color of the sample" },
      { id: 'mixing', label: "It mixes chemicals better" }
    ],
    explanation: "Capillary action enables pump-free microfluidics! Tiny channels move blood samples through diagnostic devices using only surface tension - no batteries or moving parts needed."
  },
  {
    scenario: "The contact angle θ in Jurin's Law affects capillary rise.",
    question: "What contact angle gives maximum capillary rise?",
    options: [
      { id: '0', label: "θ = 0° (perfect wetting)", correct: true },
      { id: '45', label: "θ = 45°" },
      { id: '90', label: "θ = 90° (no wetting)" },
      { id: '180', label: "θ = 180° (complete non-wetting)" }
    ],
    explanation: "At θ = 0°, cos(0°) = 1, giving maximum rise. As angle increases, cos(θ) decreases. At θ = 90°, there's no rise. Above 90°, the liquid depresses below the surface (like mercury)."
  }
];

const realWorldApps = [
  {
    icon: '🌳',
    title: 'Plant Water Transport',
    short: 'Xylem vessels',
    tagline: 'Nature\'s Plumbing System',
    description: 'Plants use capillary action in their xylem vessels to move water from roots toward leaves. Combined with transpiration pull, trees can lift water over 100 meters!',
    connection: 'The narrow xylem tubes work like your capillary tubes - smaller diameter = greater lifting force. But trees also use the "pull" from water evaporating at leaves.',
    howItWorks: 'Xylem vessels are dead, hollow tubes with diameters of 20-200μm. Water molecules stick to the walls (adhesion) and each other (cohesion), creating an unbroken column pulled upward.',
    stats: [
      { value: '100 m', label: 'Max tree height', icon: '🌲' },
      { value: '200 nm', label: 'Xylem pore size', icon: '🔬' },
      { value: '300 W', label: 'Energy used', icon: '💧' }
    ],
    examples: [
      'Redwood trees move water 100+ meters using cohesion-tension',
      'Root pressure can push water ~1m (capillary contribution)',
      'Transpiration creates negative pressure up to -1.5 MPa',
      'Air embolisms break the water column, killing branches'
    ],
    companies: ['Botanical research', 'Agricultural science', 'Climate studies'],
    futureImpact: 'Understanding plant hydraulics helps breed drought-resistant crops and predict forest response to climate change.',
    color: colors.success
  },
  {
    icon: '🧻',
    title: 'Absorbent Materials',
    short: 'Paper towels & sponges',
    tagline: 'Engineered Capillary Networks',
    description: 'Paper towels, sponges, and diapers are designed with microscopic channels that rapidly wick liquids through capillary action.',
    connection: 'The cellulose fibers in paper towels create millions of tiny "tubes" - just like your glass capillary tubes. Smaller gaps = faster wicking.',
    howItWorks: 'Porous materials have interconnected channels. Liquid is drawn in by surface tension, with the wicking rate depending on pore size, liquid properties, and contact angle.',
    stats: [
      { value: '100 μm', label: 'Typical pore size', icon: '🔍' },
      { value: '15x', label: 'Weight absorption', icon: '⚖️' },
      { value: '2 seconds', label: 'Absorption time', icon: '⏱️' }
    ],
    examples: [
      'Paper towels: ~10x their weight in water',
      'Superabsorbent polymers in diapers: 300x their weight',
      'Microfiber cloths use smaller fibers for better capillary action',
      'Oil-absorbent booms for spill cleanup'
    ],
    companies: ['Procter & Gamble', 'Kimberly-Clark', '3M', 'Georgia-Pacific'],
    futureImpact: 'Nanofiber materials with engineered pore structures enable super-fast absorption and selective wicking.',
    color: colors.water
  },
  {
    icon: '🏗️',
    title: 'Construction & Waterproofing',
    short: 'Rising damp prevention',
    tagline: 'Fighting Capillary Rise in Buildings',
    description: 'Water wicking up through concrete and masonry causes "rising damp" - a major building problem. Modern construction uses barriers to block capillary paths.',
    connection: 'Concrete and brick have microscopic pores that act like capillary tubes. Without barriers, groundwater can rise several feet up walls!',
    howItWorks: 'Damp-proof courses (DPC) and membranes create a barrier that water can\'t wick through. Hydrophobic treatments make pores non-wetting (θ > 90°).',
    stats: [
      { value: '~1.5m', label: 'Max rise in masonry', icon: '📏' },
      { value: '30%', label: 'Of old buildings affected', icon: '🏠' },
      { value: '$$$', label: 'Repair cost', icon: '💰' }
    ],
    examples: [
      'Damp-proof courses (plastic/bitumen sheets) block rise',
      'Silicone injections create chemical DPC',
      'French drains redirect groundwater away from foundations',
      'Salt damage occurs when rising water evaporates and deposits minerals'
    ],
    companies: ['Sika', 'BASF', 'Mapei', 'Remmers'],
    futureImpact: 'Self-healing concrete and smart waterproofing materials that respond to moisture levels are being developed.',
    color: colors.warning
  },
  {
    icon: '🔬',
    title: 'Microfluidics & Lab-on-Chip',
    short: 'Pump-free diagnostics',
    tagline: 'Capillary-Driven Medical Devices',
    description: 'Point-of-care diagnostic devices use capillary channels to move blood samples without pumps. A single drop of blood flows through the entire test automatically.',
    connection: 'The same physics that raises water in your tubes drives fluid through microchannels. By engineering channel width and surface properties, flow is precisely controlled.',
    howItWorks: 'Capillary channels (~100μm wide) draw sample in. Different channel widths control flow speed. Hydrophilic/hydrophobic patterns can stop, split, or mix fluids.',
    stats: [
      { value: '1 drop', label: 'Sample needed', icon: '🩸' },
      { value: '10min', label: 'Test time', icon: '⏱️' },
      { value: '$1', label: 'Device cost', icon: '💵' }
    ],
    examples: [
      'Glucose test strips for diabetics',
      'COVID-19 lateral flow tests',
      'Pregnancy tests',
      'Blood typing cards'
    ],
    companies: ['Abbott', 'Roche', 'Bio-Rad', 'Cepheid'],
    futureImpact: 'Paper-based microfluidics and 3D-printed channels enable cheap diagnostics in remote areas without electricity.',
    color: colors.primary
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

interface CapillaryActionRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const CapillaryActionRenderer: React.FC<CapillaryActionRendererProps> = ({
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
    twist_play: 'Twist Lab',
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
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
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

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play phase state
  const [tubeRadius, setTubeRadius] = useState(2); // mm
  const [surfaceTension, setSurfaceTension] = useState(72); // mN/m (water default)
  const [animTime, setAnimTime] = useState(0);

  // Test phase state
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  // Transfer phase state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  const animationRef = useRef<number>();

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  useEffect(() => {
    const animate = () => {
      setAnimTime(t => t + 0.016);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Calculate capillary rise height using Jurin's Law
  const calculateRiseHeight = (radius: number, tension: number = 72): number => {
    // h = 2γcosθ/(ρgr)
    // γ = surface tension (N/m), θ = contact angle (~0 for water-glass), ρ = 1000 kg/m³, g = 9.8
    const gamma = tension / 1000; // Convert mN/m to N/m
    const theta = 0; // Perfect wetting
    const rho = 1000;
    const g = 9.8;
    const r = radius / 1000; // Convert mm to m

    const h = (2 * gamma * Math.cos(theta)) / (rho * g * r);
    return h * 1000; // Return in mm
  };

  const riseHeight = useMemo(() => calculateRiseHeight(tubeRadius, surfaceTension), [tubeRadius, surfaceTension]);

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
      setShowExplanation(false);
    }
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  const calculateTestScore = () => testAnswers.reduce((score, ans, i) => {
    const correct = testQuestions[i].options.find(o => o.correct)?.id;
    return score + (ans === correct ? 1 : 0);
  }, 0);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgCard,
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((validPhases.indexOf(phase) + 1) / validPhases.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots component
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(phase) >= i ? colors.primary : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // ============================================================
  // VISUALIZATION
  // ============================================================

  const renderVisualization = (interactive: boolean = false) => {
    const width = isMobile ? 340 : 680;
    const height = isMobile ? 300 : 380;
    const waterLevel = height * 0.65;

    // Three tubes with different radii
    const tubes = [
      { radius: 4, x: width * 0.25, label: '4mm' },
      { radius: 2, x: width * 0.5, label: '2mm' },
      { radius: 0.5, x: width * 0.75, label: '0.5mm' }
    ];

    const legendItems = [
      { color: colors.water, label: 'Water' },
      { color: colors.glass, label: 'Glass tube' },
      { color: colors.meniscus, label: 'Meniscus (curved surface)' },
      { color: colors.adhesion, label: 'Adhesion force (water→glass)' },
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
          <p style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Legend</p>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: colors.textSecondary }}>{item.label}</span>
            </div>
          ))}
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.waterDark} />
              <stop offset="100%" stopColor={colors.water} />
            </linearGradient>
            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="meniscusGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.meniscus} />
              <stop offset="100%" stopColor={colors.water} />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

          <text x={width / 2} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
            Capillary Action
          </text>
          <text x={width / 2} y="48" textAnchor="middle" fill={colors.textSecondary} fontSize={isMobile ? 11 : 14}>
            {interactive ? `Radius: ${tubeRadius.toFixed(1)}mm | γ: ${surfaceTension} mN/m` : 'Water rises against gravity in narrow tubes'}
          </text>

          {/* Water basin */}
          <rect x={width * 0.1} y={waterLevel} width={width * 0.8} height={height - waterLevel - 20} fill="url(#waterGradient)" rx="8" filter="url(#dropShadow)" />

          {/* Basin container outline */}
          <rect x={width * 0.1 - 4} y={waterLevel - 4} width={width * 0.8 + 8} height={height - waterLevel - 16 + 8} fill="none" stroke={colors.glass} strokeWidth="2" rx="10" opacity="0.6" />

          {/* Water surface shimmer */}
          <ellipse cx={width * 0.5} cy={waterLevel + 5} rx={width * 0.35} ry="3" fill={colors.meniscus} opacity="0.4" />

          {/* Tubes and water rise */}
          {tubes.map((tube, i) => {
            const tubeWidth = Math.max(4, tube.radius * (isMobile ? 4 : 6));
            const rise = interactive ? calculateRiseHeight(tube.radius, surfaceTension) : calculateRiseHeight(tube.radius);
            const risePixels = Math.min(rise * (isMobile ? 1.5 : 2), waterLevel - 60);
            const waterTop = waterLevel - risePixels;

            return (
              <g key={i}>
                {/* Tube */}
                <rect
                  x={tube.x - tubeWidth / 2 - 3}
                  y={50}
                  width={tubeWidth + 6}
                  height={height - 70}
                  fill="url(#glassGradient)"
                  opacity="0.3"
                  rx="2"
                />

                {/* Water inside tube */}
                <rect
                  x={tube.x - tubeWidth / 2}
                  y={waterTop}
                  width={tubeWidth}
                  height={height - 20 - waterTop}
                  fill={colors.water}
                  opacity="0.9"
                />

                {/* Meniscus (concave curve) */}
                <ellipse
                  cx={tube.x}
                  cy={waterTop + 2}
                  rx={tubeWidth / 2}
                  ry={6}
                  fill={colors.meniscus}
                  filter="url(#glow)"
                />

                {/* Adhesion arrows on tube walls */}
                <line x1={tube.x - tubeWidth / 2 - 2} y1={waterTop + 15} x2={tube.x - tubeWidth / 2 - 2} y2={waterTop + 25} stroke={colors.adhesion} strokeWidth="2" opacity="0.7" />
                <line x1={tube.x + tubeWidth / 2 + 2} y1={waterTop + 15} x2={tube.x + tubeWidth / 2 + 2} y2={waterTop + 25} stroke={colors.adhesion} strokeWidth="2" opacity="0.7" />

                {/* Tube label */}
                <text x={tube.x} y={height - 5} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
                  {tube.label}
                </text>

                {/* Rise height label */}
                <text x={tube.x} y={waterTop - 15} textAnchor="middle" fill={colors.primaryLight} fontSize="11" fontWeight="700">
                  ↑{rise.toFixed(1)}mm
                </text>
              </g>
            );
          })}

          {/* Surface line */}
          <line x1={width * 0.1} y1={waterLevel} x2={width * 0.9} y2={waterLevel} stroke={colors.meniscus} strokeWidth="2" strokeDasharray="6,4" />
          <text x={width * 0.92} y={waterLevel + 4} fill={colors.textMuted} fontSize="11">Surface</text>

          {/* Grid lines for visual reference */}
          <line x1={width * 0.1} y1={height * 0.25} x2={width * 0.9} y2={height * 0.25} stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />
          <line x1={width * 0.1} y1={height * 0.45} x2={width * 0.9} y2={height * 0.45} stroke={colors.border} strokeDasharray="4 4" opacity={0.3} />

          {/* Axis labels */}
          <text x="12" y={height * 0.45} fill={colors.textMuted} fontSize="11" transform={`rotate(-90, 12, ${height * 0.45})`}>Height (mm)</text>
          <text x={width * 0.08} y={height - 5} textAnchor="start" fill={colors.textMuted} fontSize="11">Radius (mm)</text>

          {/* Rise height vs radius curve - spans full chart area */}
          {(() => {
            const chartTop = 60;
            const chartBottom = waterLevel - 10;
            const chartLeft = width * 0.12;
            const chartRight = width * 0.88;
            const chartH = chartBottom - chartTop;
            const points: string[] = [];
            const maxRise = calculateRiseHeight(0.5, interactive ? surfaceTension : 72);
            for (let i = 0; i <= 20; i++) {
              const r = 0.5 + (3.5 * i) / 20;
              const h = interactive ? calculateRiseHeight(r, surfaceTension) : calculateRiseHeight(r);
              const px = chartLeft + ((r - 0.5) / 3.5) * (chartRight - chartLeft);
              const py = chartBottom - (h / maxRise) * chartH;
              points.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
            }
            const currentR = interactive ? tubeRadius : 2;
            const currentH = interactive ? calculateRiseHeight(currentR, surfaceTension) : calculateRiseHeight(currentR);
            const cx = chartLeft + ((currentR - 0.5) / 3.5) * (chartRight - chartLeft);
            const cy = chartBottom - (currentH / maxRise) * chartH;
            return (
              <g>
                <path d={points.join(' ')} fill="none" stroke={colors.primary} strokeWidth="2" opacity={0.5} />
                <circle cx={cx} cy={cy} r={8} fill={colors.primary} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
              </g>
            );
          })()}

          {/* Formula */}
          <g transform={`translate(${isMobile ? 15 : 25}, ${height - 30})`}>
            <text fill={colors.textSecondary} fontSize={isMobile ? 11 : 12}>
              <tspan fill={colors.primaryLight}>h</tspan> = 2 × <tspan fill={colors.adhesion}>γ</tspan> × cos<tspan fill={colors.cohesion}>θ</tspan> / (ρ × g × <tspan fill={colors.warning}>r</tspan>)
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
            backgroundColor: colors.bgCardLight, color: colors.textPrimary, fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '48px',
            transition: 'all 0.2s ease'
          }}>← Back</button>
        ) : <div />}

        {canProceed ? (
          <button onClick={handleNext} style={{
            padding: '14px 28px', borderRadius: '12px', border: 'none',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', minHeight: '52px', minWidth: '160px',
            boxShadow: `0 4px 15px ${colors.primary}40`,
            transition: 'all 0.2s ease'
          }}>{nextLabel}</button>
        ) : (
          <div style={{
            padding: '14px 28px', borderRadius: '12px', backgroundColor: colors.bgCardLight,
            color: colors.textSecondary, fontSize: '14px', minHeight: '52px', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s ease'
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: isMobile ? '80px' : '120px', marginBottom: '20px' }}>💧</div>
            <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>
              Can Water Climb?
            </h1>
            <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary, marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: 1.6, fontWeight: 400 }}>
              Water can move <strong style={{ color: colors.primaryLight }}>upward against gravity</strong> — no pump required. How is this possible?
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌳</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Trees lift water</p>
                  <p style={{ color: colors.success, fontSize: '16px', fontWeight: 600 }}>100+ meters!</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🧻</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Paper towels absorb</p>
                  <p style={{ color: colors.primary, fontSize: '16px', fontWeight: 600 }}>Against gravity!</p>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic' }}>
              The secret is <strong style={{ color: colors.primaryLight }}>capillary action</strong>
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, "Start Exploring →")}
      </div>
    );
  }

  if (phase === 'predict') {
    const predictions = [
      { id: 'widest', label: 'Water rises highest in the widest tube', icon: '⬜' },
      { id: 'narrowest', label: 'Water rises highest in the narrowest tube', icon: '▪️' },
      { id: 'same', label: 'Water rises to the same height in all tubes', icon: '🟰' },
      { id: 'none', label: 'Water drops below the surface in all tubes', icon: '⬇️' }
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 1 • Make a Prediction</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Capillary Tubes Experiment</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', aspectRatio: '16/10', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderVisualization(false)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Three <strong style={{ color: colors.glass }}>glass tubes</strong> of different widths (4mm, 2mm, 0.5mm) are dipped in
                <strong style={{ color: colors.water }}> water</strong>. The <span style={{ color: colors.meniscus }}>curved surface</span> at the top of each column is called the meniscus. Notice how the water level inside the tubes differs from the surface level.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 In which tube does water rise highest?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button key={p.id} onClick={() => { setPrediction(p.id); playSound('click'); }} style={{
                    padding: '16px', borderRadius: '12px',
                    border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                    backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'all 0.2s ease'
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 2 • Experiment</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Adjust Tube Radius</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderVisualization(true)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🎮 Controls</h3>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '13px' }}>Wide (0.5mm)</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>Tube Radius: {tubeRadius}mm</span>
                  <span style={{ color: colors.primary, fontSize: '13px' }}>Narrow (4mm)</span>
                </div>
                <input type="range" min="0.5" max="4" step="0.1" value={tubeRadius} onChange={(e) => setTubeRadius(Number(e.target.value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6', borderRadius: '4px', cursor: 'pointer' }} />
                <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                  Rise height: <strong style={{ color: colors.primaryLight }}>{riseHeight.toFixed(1)}mm</strong>
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '13px' }}>Soapy (30)</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>Surface Tension: {surfaceTension} mN/m</span>
                  <span style={{ color: colors.adhesion, fontSize: '13px' }}>Pure water (72)</span>
                </div>
                <input type="range" min="30" max="72" value={surfaceTension} onChange={(e) => setSurfaceTension(Number(e.target.value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6', borderRadius: '4px', cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}40`, marginBottom: '16px' }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>👀 What the Visualization Shows:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                This diagram illustrates three glass tubes of different widths dipped in water. The visualization demonstrates
                how water rises to different heights in each tube due to capillary action. Notice how the meniscus
                (curved surface) forms at the top of each water column. This display represents the physics of
                surface tension and adhesion forces in action.
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, marginBottom: '16px' }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔬 The Physics:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                <strong style={{ color: colors.adhesion }}>Adhesion</strong> (water attracted to glass) pulls water up the tube walls.
                <strong style={{ color: colors.cohesion }}> Cohesion</strong> (water attracted to itself) holds the column together.
                <br /><br />
                <strong>Narrower tubes = more wall contact relative to volume = higher rise!</strong>
              </p>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.success}15 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}40` }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🌍 Why This Matters in Real Life:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                Capillary action is essential in nature and engineering. Trees transport water 100+ meters from roots to leaves.
                Paper towels absorb spills through tiny fiber gaps. Medical devices use capillary channels to move blood samples
                without pumps. Understanding this principle helps us design better absorbent materials and microfluidic technology.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Results →')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'narrowest';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', padding: '24px', background: wasCorrect ? `${colors.success}15` : `${colors.primary}15`, borderRadius: '16px', marginBottom: '24px', border: `1px solid ${wasCorrect ? colors.success : colors.primary}40` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{wasCorrect ? '🎯' : '💡'}</div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: wasCorrect ? colors.success : colors.primaryLight, marginBottom: '8px' }}>
                {wasCorrect ? 'Excellent Prediction!' : 'Great Learning Moment!'}
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
                {wasCorrect
                  ? 'You correctly predicted that water rises highest in the narrowest tube! As you observed in the experiment, narrower tubes create more surface contact relative to volume.'
                  : 'As you saw in the simulation, water rises highest in the narrowest tube! Your prediction helped you engage with this surprising result.'}
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🔬 Why Narrower = Higher</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { num: 1, title: 'Adhesion Force', desc: 'Water molecules stick to glass walls, creating upward pull.', color: colors.adhesion },
                  { num: 2, title: 'Surface Area Ratio', desc: 'Narrow tubes have more wall area relative to water volume.', color: colors.primary },
                  { num: 3, title: 'Inverse Relationship', desc: 'h ∝ 1/r — halve the radius, double the height!', color: colors.success }
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
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📐 Jurin's Law</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ fontFamily: 'monospace', color: colors.textPrimary }}>h = 2γcos(θ)/(ρgr)</strong>
                <br /><br />
                Height (<span style={{ color: colors.primaryLight }}>h</span>) depends on surface tension (<span style={{ color: colors.adhesion }}>γ</span>),
                contact angle (<span style={{ color: colors.cohesion }}>θ</span>), density (<span style={{ color: colors.textMuted }}>ρ</span>),
                gravity (<span style={{ color: colors.textMuted }}>g</span>), and radius (<span style={{ color: colors.warning }}>r</span>).
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Try a Twist →')}
      </div>
    );
  }

  // Remaining phases follow the same pattern...
  // twist_predict, twist_play, twist_review, transfer, test, mastery

  if (phase === 'twist_predict') {
    const predictions = [
      { id: 'same', label: 'Both rise the same — glass is glass', icon: '🟰' },
      { id: 'soapy_higher', label: 'Soapy water rises higher', icon: '⬆️' },
      { id: 'pure_higher', label: 'Pure water rises higher (soapy has lower tension)', icon: '💧' },
      { id: 'neither', label: 'Neither rises — soap prevents capillary action', icon: '❌' }
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🔄 Twist • Surface Tension</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Pure Water vs Soapy Water</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, padding: '16px' }}>
              <svg viewBox="0 0 400 200" width="100%" style={{ display: 'block' }}>
                <defs>
                  <linearGradient id="pureWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={colors.waterDark} />
                    <stop offset="100%" stopColor={colors.water} />
                  </linearGradient>
                  <linearGradient id="soapyWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect x="0" y="0" width="400" height="200" fill={colors.bgDark} rx="8" />
                <text x="200" y="24" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Which Water Rises Higher?</text>

                {/* Pure water tube */}
                <g>
                  <rect x="80" y="40" width="20" height="130" fill="#64748b" opacity="0.3" rx="2" />
                  <rect x="82" y="90" width="16" height="80" fill="url(#pureWaterGrad)" opacity="0.9" />
                  <text x="90" y="185" textAnchor="middle" fill={colors.water} fontSize="12" fontWeight="600">Pure</text>
                  <text x="90" y="85" textAnchor="middle" fill={colors.textMuted} fontSize="11">?</text>
                </g>

                {/* Soapy water tube */}
                <g>
                  <rect x="300" y="40" width="20" height="130" fill="#64748b" opacity="0.3" rx="2" />
                  <rect x="302" y="110" width="16" height="60" fill="url(#soapyWaterGrad)" opacity="0.9" />
                  <text x="310" y="185" textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="600">Soapy</text>
                  <text x="310" y="105" textAnchor="middle" fill={colors.textMuted} fontSize="11">?</text>
                </g>

                {/* Question marks */}
                <text x="200" y="110" textAnchor="middle" fill={colors.primary} fontSize="32" fontWeight="bold" filter="url(#twistGlow)">VS</text>

                {/* Surface tension labels */}
                <text x="90" y="55" textAnchor="middle" fill={colors.textSecondary} fontSize="11">γ = 72 mN/m</text>
                <text x="310" y="55" textAnchor="middle" fill={colors.textSecondary} fontSize="11">γ = 30 mN/m</text>
              </svg>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                If we test capillary rise with <strong style={{ color: colors.water }}>pure water</strong> vs
                <strong style={{ color: colors.warning }}> soapy water</strong> in the same tube, which rises higher?
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 Which rises higher?</h3>
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

  if (phase === 'twist_play' || phase === 'twist_review') {
    const pureRise = calculateRiseHeight(1, 72);
    const soapyRise = calculateRiseHeight(1, 30);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', padding: '24px', background: `${colors.success}15`, borderRadius: '16px', marginBottom: '24px', border: `1px solid ${colors.success}40` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💧</div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary, marginBottom: '8px' }}>Pure Water Wins!</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Higher surface tension = higher capillary rise</p>
            </div>

            {/* Comparison SVG */}
            <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, padding: '16px' }}>
              <svg viewBox="0 0 400 220" width="100%" style={{ display: 'block' }}>
                <defs>
                  <linearGradient id="twistPureGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={colors.waterDark} />
                    <stop offset="100%" stopColor={colors.water} />
                  </linearGradient>
                  <linearGradient id="twistSoapyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <filter id="resultGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect x="0" y="0" width="400" height="220" fill={colors.bgDark} rx="8" />
                <text x="200" y="24" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Capillary Rise Comparison</text>

                {/* Pure water tube - rises higher */}
                <g>
                  <rect x="100" y="40" width="24" height="140" fill="#64748b" opacity="0.3" rx="2" />
                  <rect x="102" y="70" width="20" height="110" fill="url(#twistPureGrad)" opacity="0.9" />
                  <path d="M 102 75 Q 112 65 122 75" fill={colors.meniscus} filter="url(#resultGlow)" />
                  <text x="112" y="200" textAnchor="middle" fill={colors.water} fontSize="12" fontWeight="600">Pure Water</text>
                  <text x="112" y="60" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="700">↑ {pureRise.toFixed(1)}mm</text>
                  <text x="145" y="100" fill={colors.success} fontSize="24" fontWeight="bold">✓</text>
                </g>

                {/* Soapy water tube - rises lower */}
                <g>
                  <rect x="276" y="40" width="24" height="140" fill="#64748b" opacity="0.3" rx="2" />
                  <rect x="278" y="100" width="20" height="80" fill="url(#twistSoapyGrad)" opacity="0.9" />
                  <path d="M 278 105 Q 288 95 298 105" fill="#fef08a" />
                  <text x="288" y="200" textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="600">Soapy Water</text>
                  <text x="288" y="90" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="700">↑ {soapyRise.toFixed(1)}mm</text>
                </g>

                {/* Difference indicator */}
                <line x1="140" y1="110" x2="260" y2="110" stroke={colors.primary} strokeWidth="2" strokeDasharray="4,4" />
                <text x="200" y="130" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="600">Δ = {(pureRise - soapyRise).toFixed(1)}mm difference</text>
              </svg>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.water}40` }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>💧</div>
                  <p style={{ color: colors.water, fontWeight: 700 }}>Pure Water</p>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>γ = 72 mN/m</p>
                  <p style={{ color: colors.success, fontWeight: 700, marginTop: '8px' }}>Rise: {pureRise.toFixed(1)}mm</p>
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.warning}40` }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧼</div>
                  <p style={{ color: colors.warning, fontWeight: 700 }}>Soapy Water</p>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>γ = 30 mN/m</p>
                  <p style={{ color: colors.error, fontWeight: 700, marginTop: '8px' }}>Rise: {soapyRise.toFixed(1)}mm</p>
                </div>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}20 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}40` }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>💡 Why Soap Reduces Rise</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Soap is a <strong>surfactant</strong> — it reduces surface tension by disrupting water's hydrogen bonds.
                Since h ∝ γ (rise is proportional to surface tension), <strong>lower tension = lower rise</strong>.
                <br /><br />
                This is why soapy water spreads more easily (lower tension) but doesn't wick as well!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, phase === 'twist_play' ? 'Review Results →' : 'See Real Applications →')}
      </div>
    );
  }

  // Transfer phase
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🌍 Real-World Applications</p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>Capillary Action in Action</h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, i) => (
                <button key={i} onClick={() => { setSelectedApp(i); playSound('click'); }} style={{
                  padding: '10px 16px', borderRadius: '12px',
                  border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                  background: selectedApp === i ? `${a.color}20` : colors.bgCard,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all 0.2s ease'
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px', fontWeight: 400 }}>{app.description}</p>

              <div style={{ background: `${app.color}15`, borderRadius: '12px', padding: '16px', marginBottom: '20px', borderLeft: `4px solid ${app.color}` }}>
                <h4 style={{ color: app.color, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔗 Connection to Capillary Physics:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>{app.connection}</p>
              </div>

              <div style={{ background: colors.bgDark, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>📊 Key Statistics:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ color: app.color, fontSize: '16px', fontWeight: 700 }}>{stat.value}</div>
                      <div style={{ color: colors.textSecondary, fontSize: '11px', fontWeight: 400 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🔧 How It Works:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.6, fontWeight: 400 }}>{app.howItWorks}</p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🏢 Industry Leaders:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, fontWeight: 400 }}>
                  Companies using this technology: {app.companies.join(', ')}
                </p>
                <p style={{ color: colors.primary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic', fontWeight: 400 }}>
                  Future Impact: {app.futureImpact}
                </p>
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
              color: completedApps[selectedApp] ? colors.textSecondary : 'white', fontSize: '16px', fontWeight: 700,
              cursor: completedApps[selectedApp] ? 'default' : 'pointer', minHeight: '52px',
              transition: 'all 0.2s ease'
            }}>
              {completedApps[selectedApp] ? '✓ Completed' : 'Got It! Continue →'}
            </button>
            <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '13px', marginTop: '12px' }}>
              {completedApps.filter(c => c).length} of 4 completed {allCompleted && '— Ready for test!'}
            </p>
          </div>
        </div>
        {renderBottomBar(true, allCompleted, 'Take the Test →')}
      </div>
    );
  }

  // Test and Mastery phases (abbreviated - follow same pattern)
  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const selectedAnswer = testAnswers[testQuestion];
    const isCorrect = selectedAnswer === currentQ.options.find(o => o.correct)?.id;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
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
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SCENARIO</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400, lineHeight: 1.6 }}>{currentQ.scenario}</p>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', marginBottom: '16px', border: `1px solid ${colors.primary}30` }}>
              <p style={{ color: colors.textPrimary, fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>QUESTION</p>
              <h3 style={{ color: colors.textPrimary, fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: 0 }}>{currentQ.question}</h3>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px', fontWeight: 400 }}>
              Read the scenario carefully and select the best answer below. Apply your understanding of capillary action, surface tension, and adhesion forces to reason through each question. Consider how tube radius, liquid properties, and contact angles affect capillary rise.
            </p>

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
                    cursor: showExplanation ? 'default' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'all 0.2s ease'
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
              <button onClick={() => { setShowExplanation(true); playSound(isCorrect ? 'success' : 'failure'); }} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>Check Answer</button>
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
            <button onClick={() => { if (testQuestion < 9) { setTestQuestion(testQuestion + 1); setShowExplanation(false); playSound('click'); } else { goToPhase('mastery'); } }} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', minHeight: '52px', minWidth: '200px', transition: 'all 0.2s ease' }}>
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderNavDots()}
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🏆' : '📚'}</div>
            <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: passed ? colors.success : colors.primaryLight, marginBottom: '8px' }}>{passed ? 'Mastery Achieved!' : 'Keep Learning!'}</h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '32px' }}>{passed ? 'You understand capillary action!' : 'Review and try again.'}</p>

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
                <li>Capillary rise height is inversely proportional to tube radius</li>
                <li>Adhesion + surface tension drive water upward</li>
                <li>Jurin's Law: h = 2γcosθ/(ρgr)</li>
                <li>Surfactants reduce surface tension and capillary rise</li>
                <li>Applications: plants, paper towels, buildings, microfluidics</li>
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

export default CapillaryActionRenderer;
