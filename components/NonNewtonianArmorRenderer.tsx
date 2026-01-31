/**
 * NON-NEWTONIAN ARMOR RENDERER
 *
 * Complete physics game demonstrating shear-thickening fluids (oobleck).
 * Viscosity increases with shear rate due to particle jamming.
 *
 * FEATURES:
 * - Static graphic in predict phase with explanation below
 * - Interactive shear-rate slider in play phase
 * - Rich transfer phase with real-world applications
 * - Local answer validation with server fallback
 * - Dark theme matching evaluation framework
 * - Full compliance with GAME_EVALUATION_SYSTEM.md
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ============================================================
// THEME COLORS (matching evaluation framework requirements)
// Primary text: #f8fafc, Secondary: #e2e8f0 minimum
// ============================================================

const colors = {
  // Backgrounds
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',

  // Primary colors
  primary: '#f59e0b',
  primaryLight: '#fbbf24',
  primaryDark: '#d97706',

  // Accent colors
  accent: '#f97316',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  // Text colors - CRITICAL: Must meet contrast requirements
  textPrimary: '#f8fafc',     // Primary text - white
  textSecondary: '#e2e8f0',   // Secondary - light gray (NOT #94a3b8)
  textMuted: '#94a3b8',       // Only for non-essential text

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Physics-specific colors
  oobleck: '#d4a574',
  oobleckLight: '#e8c9a0',
  water: '#60a5fa',
  starch: '#fbbf24',
  finger: '#fca5a5',
  jammedParticles: '#ef4444',
  flowingParticles: '#22c55e',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'non_newtonian_armor';

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
    scenario: "You have a bowl of oobleck made from cornstarch and water.",
    question: "What is a non-Newtonian fluid?",
    options: [
      { id: 'space', label: "A fluid that only flows in space (zero gravity)" },
      { id: 'viscosity', label: "A fluid whose viscosity changes with applied stress", correct: true },
      { id: 'solid', label: "A fluid that is always solid at room temperature" },
      { id: 'newton', label: "A fluid discovered by Isaac Newton" }
    ],
    explanation: "Non-Newtonian fluids have viscosity that changes with applied stress or shear rate. Unlike water (Newtonian), oobleck's resistance to flow depends on how fast you try to move it."
  },
  {
    scenario: "You slowly push your finger into a bowl of oobleck.",
    question: "What happens when you slowly poke oobleck?",
    options: [
      { id: 'shatter', label: "It shatters like glass" },
      { id: 'heat', label: "It heats up significantly" },
      { id: 'sink', label: "Your finger sinks in easily like a liquid", correct: true },
      { id: 'harden', label: "It immediately hardens into a solid" }
    ],
    explanation: "At low shear rates (slow movement), oobleck behaves like a liquid. The starch particles have time to flow around each other, allowing your finger to sink in easily."
  },
  {
    scenario: "You quickly punch the surface of oobleck.",
    question: "Why does oobleck become solid-like when hit quickly?",
    options: [
      { id: 'evaporate', label: "The water evaporates instantly from the heat" },
      { id: 'jam', label: "The starch particles jam together, unable to move past each other", correct: true },
      { id: 'bonds', label: "Chemical bonds form between the particles" },
      { id: 'electric', label: "The impact creates an electric charge that freezes motion" }
    ],
    explanation: "Under sudden stress, starch particles don't have time to flow past each other. They jam together like people trying to rush through a door, creating a temporary solid structure."
  },
  {
    scenario: "Oobleck exhibits a specific type of non-Newtonian behavior.",
    question: "What type of non-Newtonian behavior does oobleck exhibit?",
    options: [
      { id: 'thinning', label: "Shear-thinning (viscosity decreases with stress)" },
      { id: 'thickening', label: "Shear-thickening (viscosity increases with stress)", correct: true },
      { id: 'thixotropic', label: "Thixotropic (viscosity decreases over time)" },
      { id: 'rheopectic', label: "Rheopectic (viscosity increases over time)" }
    ],
    explanation: "Oobleck is shear-thickening: its viscosity INCREASES when you apply more stress (faster movement). This is the opposite of ketchup, which is shear-thinning."
  },
  {
    scenario: "You try to walk across a pool filled with oobleck.",
    question: "What determines whether you sink into oobleck?",
    options: [
      { id: 'weight', label: "Only your total weight matters" },
      { id: 'color', label: "The color of the oobleck" },
      { id: 'speed', label: "How quickly you shift your weight - slow movements let you sink", correct: true },
      { id: 'temp', label: "The temperature of the room" }
    ],
    explanation: "It's all about speed! If you move quickly (run, jump), the oobleck supports you. If you stand still or move slowly, you'll sink. This is why you can run across oobleck but not stand on it."
  },
  {
    scenario: "You're making oobleck at home.",
    question: "What gives cornstarch-water its special properties?",
    options: [
      { id: 'salt', label: "Salt dissolved in the water" },
      { id: 'granules', label: "Microscopic starch granules suspended in water", correct: true },
      { id: 'air', label: "Air bubbles trapped in the mixture" },
      { id: 'heat', label: "Heat from the mixing process" }
    ],
    explanation: "The special behavior comes from microscopic starch granules suspended in water. These particles are large enough to jam together under stress but small enough to flow when moved slowly."
  },
  {
    scenario: "Military researchers are developing new body armor.",
    question: "How might shear-thickening fluids be used in body armor?",
    options: [
      { id: 'cooling', label: "As a cooling system for the wearer" },
      { id: 'flexible', label: "The fluid stays flexible normally but hardens on impact", correct: true },
      { id: 'lighter', label: "It makes the armor lighter by replacing metal" },
      { id: 'shock', label: "It conducts electricity to shock attackers" }
    ],
    explanation: "Shear-thickening fluid (STF) armor is flexible for comfort and movement, but instantly hardens when hit by a bullet or shrapnel. The impact causes particle jamming, distributing force across a wider area."
  },
  {
    scenario: "You want to make the perfect oobleck for a demonstration.",
    question: "What ratio of cornstarch to water creates the best oobleck?",
    options: [
      { id: 'equal', label: "Equal parts (1:1)" },
      { id: 'morewater', label: "More water than cornstarch (1:2)" },
      { id: 'morestarch', label: "About 2 parts cornstarch to 1 part water", correct: true },
      { id: 'tiny', label: "Only a tiny bit of cornstarch in water" }
    ],
    explanation: "The ideal ratio is approximately 2 parts cornstarch to 1 part water (by volume). This creates enough particle density for the jamming effect while maintaining the liquid base."
  },
  {
    scenario: "You place a bowl of oobleck on a speaker playing bass tones.",
    question: "What happens to oobleck on a vibrating speaker?",
    options: [
      { id: 'melt', label: "It melts from the sound energy" },
      { id: 'dance', label: "It forms tendrils and fingers that dance with the vibration", correct: true },
      { id: 'separate', label: "It separates into water and powder" },
      { id: 'solid', label: "It becomes permanently solid" }
    ],
    explanation: "The vibrations create rapid alternating stress, causing some parts to solidify briefly while others flow. This creates mesmerizing tentacle-like structures that dance with the sound waves!"
  },
  {
    scenario: "Engineers are studying non-Newtonian fluids for various applications.",
    question: "Why is understanding non-Newtonian fluids important for engineering?",
    options: [
      { id: 'kitchen', label: "Only for making kitchen gadgets" },
      { id: 'design', label: "It helps design protective gear, dampers, and smart materials", correct: true },
      { id: 'none', label: "Non-Newtonian fluids don't exist in real applications" },
      { id: 'toys', label: "Only for entertainment and toys" }
    ],
    explanation: "Non-Newtonian fluids are crucial for designing body armor, athletic gear, shock absorbers, vibration dampers, and smart materials that adapt to conditions. Many everyday products use these principles."
  }
];

// Rich transfer phase applications
const realWorldApps = [
  {
    icon: '🛡️',
    title: 'Liquid Body Armor',
    short: 'STF-enhanced Kevlar',
    tagline: 'Flexible Protection That Hardens on Impact',
    description: 'Military and police armor uses Shear-Thickening Fluid (STF) infused into Kevlar fabric. The armor remains flexible for movement but instantly hardens when struck by bullets or shrapnel.',
    connection: 'Just like your oobleck experiment - slow movements pass through, but fast impacts (bullets) cause the particles to jam, distributing the force across a wide area.',
    howItWorks: 'Kevlar fibers are soaked in STF (similar chemistry to oobleck). Under normal conditions, the fluid allows flexibility. On impact, particles jam in microseconds, creating a rigid shield that absorbs energy.',
    stats: [
      { value: '45%', label: 'Thinner than traditional armor', icon: '📏' },
      { value: '<1ms', label: 'Hardening time on impact', icon: '⚡' },
      { value: '40%', label: 'Better stab resistance', icon: '🔪' }
    ],
    examples: [
      'US Army Research Lab developed STF-Kevlar composites',
      'Police tactical vests with improved mobility',
      'Motorcycle gear with D3O smart material',
      'Sports equipment for extreme sports'
    ],
    companies: ['BAE Systems', 'D3O (Smart materials)', 'Dow Chemical', 'US Army Research Lab'],
    futureImpact: 'Future armor could be as comfortable as regular clothing but provide military-grade protection when needed.',
    color: colors.error
  },
  {
    icon: '🚗',
    title: 'Smart Speed Bumps',
    short: 'Adaptive traffic control',
    tagline: 'Speed-Sensitive Road Safety',
    description: 'Speed bumps filled with shear-thickening fluid remain flat for vehicles traveling at safe speeds, but become rigid obstacles for speeding cars.',
    connection: 'Your oobleck acts the same way! Cars going slowly (like your slow poke) pass over easily. Speeding cars (like your fast punch) hit a solid barrier.',
    howItWorks: 'A sealed chamber of STF under the road surface. At low speeds, tires slowly compress the fluid. At high speeds, the fluid jams instantly, creating an effective speed bump.',
    stats: [
      { value: '30 mph', label: 'Threshold speed', icon: '🚗' },
      { value: '0%', label: 'Discomfort for slow drivers', icon: '😊' },
      { value: '40%', label: 'Speed reduction for fast cars', icon: '⬇️' }
    ],
    examples: [
      'School zones with adaptive speed control',
      'Hospital entrances requiring slow approach',
      'Parking garages with speed-sensitive bumps',
      'Emergency vehicle routes (they can pass fast)'
    ],
    companies: ['Badennova (Germany)', 'Traffic Logix', 'Municipal research projects'],
    futureImpact: 'Intelligent roads that enforce speed limits physically, not just with signs.',
    color: colors.primary
  },
  {
    icon: '⛑️',
    title: 'Impact-Absorbing Sports Gear',
    short: 'D3O and similar technologies',
    tagline: 'Soft Comfort, Hard Protection',
    description: 'Modern sports equipment uses non-Newtonian materials that remain soft and flexible during normal use but harden instantly on impact to protect athletes.',
    connection: 'Like your oobleck! Athletes need freedom of movement (slow, controlled motions), but when they crash or get hit (fast impact), the material becomes a protective shield.',
    howItWorks: 'D3O and similar materials contain molecular chains that flow freely under normal conditions. On impact, the chains lock together, absorbing and distributing energy before returning to their flexible state.',
    stats: [
      { value: '5x', label: 'More protection than foam', icon: '🛡️' },
      { value: '50%', label: 'Thinner than alternatives', icon: '📏' },
      { value: '100%', label: 'Reusable after impact', icon: '♻️' }
    ],
    examples: [
      'Ski and snowboard gear (helmets, back protectors)',
      'Motorcycle jackets with D3O inserts',
      'Professional sports padding (football, hockey)',
      'Phone cases that protect against drops'
    ],
    companies: ['D3O', 'G-Form', 'POC Sports', 'Under Armour'],
    futureImpact: 'Athletes could wear protection so thin and flexible they barely notice it, yet be protected from serious injuries.',
    color: colors.success
  },
  {
    icon: '⚙️',
    title: 'Industrial Shock Absorbers',
    short: 'Adaptive damping systems',
    tagline: 'Smart Response to Variable Forces',
    description: 'Industrial machinery and vehicles use shear-thickening fluids in dampers that automatically adjust their resistance based on the force applied.',
    connection: 'Your oobleck naturally adjusts! Small vibrations pass through easily, but sudden jolts are absorbed. Industrial dampers use this same principle.',
    howItWorks: 'STF-filled cylinders replace traditional hydraulic dampers. During normal operation, the fluid allows smooth motion. During sudden impacts or vibrations, viscosity increases dramatically, absorbing energy.',
    stats: [
      { value: '10x', label: 'Range of damping force', icon: '💪' },
      { value: '0', label: 'Electronics needed', icon: '🔌' },
      { value: '50%', label: 'Energy dissipation improvement', icon: '⚡' }
    ],
    examples: [
      'Earthquake-resistant building foundations',
      'Helicopter rotor dampers',
      'Industrial robot collision protection',
      'Automotive suspension systems'
    ],
    companies: ['LORD Corporation', 'BWI Group', 'Tenneco', 'ZF Friedrichshafen'],
    futureImpact: 'Machines and buildings that automatically protect themselves from unexpected shocks without complex electronics or maintenance.',
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

interface NonNewtonianArmorRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const NonNewtonianArmorRenderer: React.FC<NonNewtonianArmorRendererProps> = ({
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
  const [shearRate, setShearRate] = useState(0); // 0-100: 0=slow, 100=fast
  const [isPoking, setIsPoking] = useState(false);
  const [pokeDepth, setPokeDepth] = useState(0);
  const [starchRatio, setStarchRatio] = useState(67); // For twist: 67% is ideal 2:1 ratio

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

  // Sync phase with gamePhase prop
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

  // Poke animation
  useEffect(() => {
    if (isPoking) {
      const targetDepth = shearRate < 50 ? 80 : 15; // Slow = deep sink, Fast = shallow (resisted)
      const speed = shearRate < 50 ? 2 : 30; // Slow poke = gradual, Fast = instant

      const animate = () => {
        setPokeDepth(prev => {
          const diff = targetDepth - prev;
          if (Math.abs(diff) < 1) return targetDepth;
          return prev + diff * (speed / 100);
        });
      };

      const interval = setInterval(animate, 16);
      return () => clearInterval(interval);
    } else {
      setPokeDepth(0);
    }
  }, [isPoking, shearRate]);

  // Calculate viscosity based on shear rate
  const viscosity = useMemo(() => {
    // Shear-thickening: viscosity increases dramatically with shear rate
    const baseViscosity = 10;
    const jamThreshold = 40; // Above this, particles start jamming

    if (shearRate < jamThreshold) {
      return baseViscosity + shearRate * 0.5; // Gradual increase
    } else {
      // Exponential increase after jamming threshold
      return baseViscosity + jamThreshold * 0.5 + Math.pow(shearRate - jamThreshold, 1.8) * 0.5;
    }
  }, [shearRate]);

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

    // Reset test state when entering test phase
    if (p === 'test') {
      setTestQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setTestSubmitted(false);
      setShowExplanation(false);
    }

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  // Test scoring
  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = testQuestions[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
  };

  // ============================================================
  // OOBLECK VISUALIZATION
  // ============================================================

  const renderOobleckVisualization = (interactive: boolean = false) => {
    const width = isMobile ? 340 : 680;
    const height = isMobile ? 280 : 360;
    const cx = width / 2;
    const bowlY = height * 0.55;
    const bowlWidth = isMobile ? 200 : 350;
    const bowlHeight = isMobile ? 80 : 120;

    // Calculate particle behavior based on shear rate
    const particleJamming = Math.min(1, Math.max(0, (shearRate - 40) / 60));
    const particleSpacing = 1 - particleJamming * 0.4;

    // Generate particles
    const particles = useMemo(() => {
      const result = [];
      const numParticles = isMobile ? 30 : 60;
      for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2 + animTime * 0.5;
        const radiusVar = 0.3 + Math.sin(i * 1.5 + animTime) * 0.1;
        result.push({
          x: cx + Math.cos(angle) * bowlWidth * radiusVar * 0.4,
          y: bowlY + Math.sin(angle * 0.5) * bowlHeight * 0.3 + (i % 3) * 8,
          size: 4 + (i % 3) * 2,
          color: i % 2 === 0 ? colors.starch : colors.oobleckLight
        });
      }
      return result;
    }, [cx, bowlY, bowlWidth, bowlHeight, isMobile, animTime]);

    // Legend items
    const legendItems = [
      { color: colors.oobleck, label: 'Oobleck (cornstarch + water)' },
      { color: colors.starch, label: 'Starch particles' },
      { color: colors.water, label: 'Water between particles' },
      { color: colors.finger, label: 'Finger/impact point' },
      { color: colors.jammedParticles, label: 'Jammed particles (high shear)' },
      { color: colors.flowingParticles, label: 'Flowing particles (low shear)' },
    ];

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
        {/* Legend - positioned in corner */}
        <div style={{
          position: 'absolute',
          top: isMobile ? '8px' : '12px',
          right: isMobile ? '8px' : '12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '8px',
          padding: isMobile ? '8px' : '12px',
          border: `1px solid ${colors.border}`,
          zIndex: 10,
          maxWidth: isMobile ? '140px' : '180px'
        }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>
            Legend
          </p>
          {legendItems.slice(0, isMobile ? 4 : 6).map((item, i) => (
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
            {/* Bowl gradient */}
            <linearGradient id="bowlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Oobleck gradient */}
            <radialGradient id="oobleckGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor={colors.oobleckLight} />
              <stop offset="100%" stopColor={colors.oobleck} />
            </radialGradient>

            {/* Finger gradient */}
            <linearGradient id="fingerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Glow filter for impacts */}
            <filter id="impactGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

          {/* Title */}
          <text x={cx} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
            Non-Newtonian Fluid: Oobleck
          </text>
          <text x={cx} y="48" textAnchor="middle" fill={colors.textSecondary} fontSize={isMobile ? 11 : 14} fontWeight="500">
            Cornstarch + Water = Shear-Thickening Fluid
          </text>

          {/* Bowl */}
          <ellipse
            cx={cx}
            cy={bowlY + bowlHeight * 0.3}
            rx={bowlWidth / 2 + 15}
            ry={bowlHeight * 0.5}
            fill="url(#bowlGradient)"
            stroke={colors.borderLight}
            strokeWidth="2"
          />

          {/* Oobleck surface */}
          <ellipse
            cx={cx}
            cy={bowlY}
            rx={bowlWidth / 2}
            ry={bowlHeight * 0.35}
            fill="url(#oobleckGradient)"
          />

          {/* Particles visualization */}
          {particles.map((p, i) => {
            const isJammed = interactive && shearRate > 40 && Math.abs(p.x - cx) < 60;
            return (
              <circle
                key={i}
                cx={p.x + (isJammed ? 0 : Math.sin(animTime * 2 + i) * 3)}
                cy={p.y + (isJammed ? 0 : Math.cos(animTime * 2 + i) * 2)}
                r={p.size * (isJammed ? 0.9 : 1)}
                fill={isJammed ? colors.jammedParticles : p.color}
                opacity={0.7}
              />
            );
          })}

          {/* Finger/poker (in interactive mode) */}
          {interactive && (
            <g transform={`translate(${cx}, ${bowlY - 60 + pokeDepth})`}>
              {/* Finger */}
              <ellipse cx="0" cy="0" rx="15" ry="8" fill="url(#fingerGradient)" />
              <rect x="-15" y="-50" width="30" height="50" fill="url(#fingerGradient)" rx="15" />

              {/* Impact indicator */}
              {shearRate > 40 && pokeDepth > 5 && (
                <g filter="url(#impactGlow)">
                  <circle cx="0" cy="8" r={20 + (shearRate - 40) * 0.3} fill="none" stroke={colors.jammedParticles} strokeWidth="3" opacity="0.6" />
                  <text x="0" y="35" textAnchor="middle" fill={colors.jammedParticles} fontSize="12" fontWeight="bold">
                    JAMMED!
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Water molecules indicator */}
          <g transform={`translate(${width - (isMobile ? 70 : 100)}, ${bowlY - 30})`}>
            <rect x="-30" y="-20" width="60" height="50" fill={colors.bgCard} rx="6" stroke={colors.border} />
            <circle cx="-10" cy="0" r="6" fill={colors.water} opacity="0.8" />
            <circle cx="10" cy="5" r="5" fill={colors.water} opacity="0.6" />
            <circle cx="0" cy="12" r="4" fill={colors.water} opacity="0.7" />
            <text x="0" y="35" textAnchor="middle" fill={colors.textSecondary} fontSize="9">H₂O</text>
          </g>

          {/* Viscosity meter (in interactive mode) */}
          {interactive && (
            <g transform={`translate(${isMobile ? 30 : 50}, ${height - 80})`}>
              <rect x="0" y="0" width={isMobile ? 100 : 140} height="60" fill={colors.bgCard} rx="8" stroke={colors.border} />
              <text x={isMobile ? 50 : 70} y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
                Viscosity
              </text>
              {/* Meter bar */}
              <rect x="10" y="28" width={isMobile ? 80 : 120} height="12" fill={colors.bgDark} rx="4" />
              <rect
                x="10"
                y="28"
                width={Math.min((isMobile ? 80 : 120), (viscosity / 100) * (isMobile ? 80 : 120))}
                height="12"
                fill={viscosity > 50 ? colors.jammedParticles : colors.flowingParticles}
                rx="4"
              />
              <text x={isMobile ? 50 : 70} y="52" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
                {Math.round(viscosity)} Pa·s
              </text>
            </g>
          )}

          {/* Physics formula */}
          <g transform={`translate(${isMobile ? 15 : 25}, ${height - (isMobile ? 35 : 45)})`}>
            <text fill={colors.textSecondary} fontSize={isMobile ? 10 : 12} fontWeight="600">
              <tspan fill={colors.primaryLight}>η</tspan> = η₀ × (1 + (λ × <tspan fill={colors.accent}>γ̇</tspan>)ⁿ)
            </text>
            <text y="14" fill={colors.textMuted} fontSize={isMobile ? 8 : 10}>
              Viscosity increases with shear rate (γ̇)
            </text>
          </g>
        </svg>
      </div>
    );
  };

  // ============================================================
  // BOTTOM BAR (Fixed navigation - evaluation requirement)
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
            {/* Hook visual */}
            <div style={{
              fontSize: isMobile ? '80px' : '120px',
              marginBottom: '20px',
              animation: 'pulse 2s infinite'
            }}>
              🥣
            </div>

            <h1 style={{
              fontSize: isMobile ? '28px' : '40px',
              fontWeight: 800,
              color: colors.textPrimary,
              marginBottom: '16px',
              lineHeight: 1.2
            }}>
              Is It Liquid or Solid?
            </h1>

            <p style={{
              fontSize: isMobile ? '16px' : '20px',
              color: colors.textSecondary,
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6
            }}>
              What if a substance could <strong style={{ color: colors.primaryLight }}>switch instantly</strong> between
              liquid and solid... without changing temperature?
            </p>

            {/* Teaser image */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🐌</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Slow touch...</p>
                  <p style={{ color: colors.flowingParticles, fontSize: '16px', fontWeight: 600 }}>Sinks in!</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>👊</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Fast punch...</p>
                  <p style={{ color: colors.jammedParticles, fontSize: '16px', fontWeight: 600 }}>Solid wall!</p>
                </div>
              </div>
            </div>

            <p style={{
              fontSize: '14px',
              color: colors.textMuted,
              fontStyle: 'italic'
            }}>
              You might have played with this at school... it's called <strong style={{ color: colors.primaryLight }}>oobleck!</strong>
            </p>
          </div>
        </div>

        {renderBottomBar(false, true, "Let's Explore →")}
      </div>
    );
  }

  // ============================================================
  // PREDICT PHASE - Critical: Static graphic FIRST, then prediction below
  // ============================================================

  if (phase === 'predict') {
    const predictions = [
      { id: 'same', label: 'Same result whether slow or fast — it\'s just a liquid', icon: '💧' },
      { id: 'slow_resist', label: 'Slow poke meets resistance; fast poke goes through', icon: '🐌' },
      { id: 'fast_resist', label: 'Fast poke meets resistance; slow poke sinks in', icon: '⚡' },
      { id: 'always_solid', label: 'Always solid — cornstarch makes it firm', icon: '🧱' }
    ];

    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
        overflow: 'hidden'
      }}>
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '100px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 1 • Make a Prediction
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Oobleck Experiment Setup
              </h2>
            </div>

            {/* STATIC GRAPHIC - No controls, just the visualization */}
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
              {renderOobleckVisualization(false)}
            </div>

            {/* What You're Looking At - CRITICAL for educational clarity */}
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
                This is <strong style={{ color: colors.primaryLight }}>oobleck</strong> — a mixture of
                <strong style={{ color: colors.starch }}> cornstarch</strong> and
                <strong style={{ color: colors.water }}> water</strong>. The
                <span style={{ color: colors.starch }}> yellow particles</span> are starch granules
                suspended in water. They can either flow past each other (liquid behavior) or
                jam together (solid behavior).
              </p>
            </div>

            {/* Prediction Question - BELOW the graphic */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 What happens when you poke the oobleck?
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

            {/* Optional "Why?" question - shown after selection */}
            {prediction && (
              <div style={{
                background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}15 100%)`,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.primary}30`
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                  💭 Why do you think this will happen? <span style={{ color: colors.textMuted }}>(Optional)</span>
                </p>
                <textarea
                  placeholder="Share your reasoning... (skip if you prefer)"
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

        {/* Fixed bottom bar */}
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // ============================================================
  // PLAY PHASE - Interactive controls now available
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
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Step 2 • Experiment
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Poke the Oobleck!
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
              {renderOobleckVisualization(true)}
            </div>

            {/* Controls Section - clearly separated */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                🎮 Controls: Adjust Poke Speed
              </h3>

              {/* Shear rate slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.flowingParticles, fontSize: '13px', fontWeight: 600 }}>🐌 Slow</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>
                    Speed: {shearRate}%
                  </span>
                  <span style={{ color: colors.jammedParticles, fontSize: '13px', fontWeight: 600 }}>Fast 👊</span>
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
                    accentColor: shearRate > 50 ? colors.jammedParticles : colors.flowingParticles
                  }}
                />
                <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                  ↑ Higher speed = higher shear rate = particles jam together
                </p>
              </div>

              {/* Poke buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onMouseDown={() => setIsPoking(true)}
                  onMouseUp={() => setIsPoking(false)}
                  onMouseLeave={() => setIsPoking(false)}
                  onTouchStart={() => setIsPoking(true)}
                  onTouchEnd={() => setIsPoking(false)}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isPoking
                      ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`
                      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minWidth: '150px',
                    transform: isPoking ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.1s'
                  }}
                >
                  {isPoking ? '👇 Poking...' : '👆 Hold to Poke'}
                </button>
              </div>
            </div>

            {/* What's Happening - real-time explanation */}
            <div style={{
              background: `linear-gradient(135deg, ${shearRate > 50 ? colors.jammedParticles : colors.flowingParticles}15 0%, ${colors.bgCard} 100%)`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${shearRate > 50 ? colors.jammedParticles : colors.flowingParticles}40`
            }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                👀 What's Happening:
              </h4>
              {shearRate < 40 ? (
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  At <strong style={{ color: colors.flowingParticles }}>low shear rate</strong>, particles have
                  time to <strong>flow past each other</strong>. The oobleck behaves like a liquid — your
                  finger sinks right in!
                </p>
              ) : (
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  At <strong style={{ color: colors.jammedParticles }}>high shear rate</strong>, particles
                  <strong> jam together</strong> — they don't have time to flow! The oobleck acts like a
                  solid, resisting your impact.
                </p>
              )}
            </div>

            {/* Formula breakdown */}
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
                <span style={{ color: colors.textSecondary }}>)ⁿ)</span>
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.8 }}>
                <div><span style={{ color: colors.primaryLight, fontWeight: 700 }}>η</span> = Viscosity (resistance to flow)</div>
                <div><span style={{ color: colors.accent, fontWeight: 700 }}>γ̇</span> = Shear rate (how fast you move)</div>
                <div><span style={{ color: colors.textMuted }}>n &gt; 1</span> = Shear-thickening behavior</div>
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
    const wasCorrect = prediction === 'fast_resist';

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
            {/* Result feedback */}
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
                  ? 'You correctly predicted that fast impacts meet resistance!'
                  : 'The answer is: Fast poke meets resistance; slow poke sinks in'
                }
              </p>
            </div>

            {/* The science explanation */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                🔬 Why This Happens: Particle Jamming
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
                      Particle Suspension
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      Cornstarch particles float in water, able to slide past each other freely.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.flowingParticles} 0%, #16a34a 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>2</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      Slow Movement = Flowing
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      With gentle force, particles have time to rearrange and flow around obstacles.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.jammedParticles} 0%, #dc2626 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>3</div>
                  <div>
                    <h4 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                      Fast Impact = Jamming!
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                      Sudden force doesn't give particles time to move — they jam together like a traffic jam!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key insight */}
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
                This is called <strong style={{ color: colors.textPrimary }}>shear-thickening behavior</strong>.
                The viscosity (thickness) <strong>increases</strong> with shear rate (speed).
                It's the opposite of ketchup, which gets thinner when shaken!
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
      { id: 'more_water', label: 'More water makes it flow easier at ALL speeds', icon: '💧' },
      { id: 'less_armor', label: 'More water = less "armor" effect (weaker jamming)', icon: '⬇️' },
      { id: 'more_starch', label: 'More starch makes it solid all the time', icon: '🧱' },
      { id: 'no_change', label: 'The ratio doesn\'t matter much', icon: '🤷' }
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
                🔄 Twist • New Variable
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                What If We Change the Recipe?
              </h2>
            </div>

            {/* Static graphic showing ratio concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🥣</div>
                  <p style={{ color: colors.starch, fontWeight: 600 }}>Standard (2:1)</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>67% starch</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>💧</div>
                  <p style={{ color: colors.water, fontWeight: 600 }}>More Water</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>50% starch</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🌾</div>
                  <p style={{ color: colors.primaryLight, fontWeight: 600 }}>More Starch</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>80% starch</p>
                </div>
              </div>
            </div>

            {/* Explanation */}
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
                If we add <strong style={{ color: colors.water }}>more water</strong> (diluting the mixture) or
                <strong style={{ color: colors.starch }}> more starch</strong> (thickening it), how will the
                "armor" effect change?
              </p>
            </div>

            {/* Prediction options */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                🤔 What happens when we change the ratio?
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

        {renderBottomBar(true, !!twistPrediction, 'Test the Twist →')}
      </div>
    );
  }

  // ============================================================
  // TWIST PLAY PHASE
  // ============================================================

  if (phase === 'twist_play') {
    // Calculate effectiveness based on starch ratio
    const effectiveness = useMemo(() => {
      // Optimal is around 67% (2:1 ratio)
      const optimal = 67;
      const diff = Math.abs(starchRatio - optimal);
      return Math.max(0, 100 - diff * 2);
    }, [starchRatio]);

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
                🔄 Twist Experiment
              </p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>
                Adjust the Starch Ratio
              </h2>
            </div>

            {/* Ratio visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              {/* Ratio bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.water, fontSize: '13px', fontWeight: 600 }}>💧 More Water</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>
                    Starch: {starchRatio}%
                  </span>
                  <span style={{ color: colors.starch, fontSize: '13px', fontWeight: 600 }}>More Starch 🌾</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="85"
                  value={starchRatio}
                  onChange={(e) => setStarchRatio(Number(e.target.value))}
                  onInput={(e) => setStarchRatio(Number((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: starchRatio > 60 && starchRatio < 75 ? `${colors.success}20` : `${colors.warning}20`,
                  borderRadius: '8px'
                }}>
                  <span style={{
                    color: starchRatio > 60 && starchRatio < 75 ? colors.success : colors.warning,
                    fontWeight: 600,
                    fontSize: '14px'
                  }}>
                    {starchRatio < 50 ? '💧 Too runny - flows like water' :
                     starchRatio < 60 ? '💧 Weak effect - low jamming' :
                     starchRatio < 75 ? '✅ Optimal! Strong armor effect' :
                     starchRatio < 80 ? '🌾 Very thick - hard to work with' :
                     '🧱 Too thick - nearly solid always'}
                  </span>
                </div>
              </div>

              {/* Effectiveness meter */}
              <div>
                <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>
                  Armor Effectiveness
                </p>
                <div style={{
                  height: '20px',
                  background: colors.bgDark,
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${effectiveness}%`,
                    height: '100%',
                    background: effectiveness > 70
                      ? `linear-gradient(90deg, ${colors.success} 0%, ${colors.successLight} 100%)`
                      : `linear-gradient(90deg, ${colors.warning} 0%, ${colors.warningLight} 100%)`,
                    borderRadius: '10px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, textAlign: 'center', marginTop: '8px' }}>
                  {effectiveness}% Effective
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.primary}10 100%)`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                👀 What's Happening:
              </h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                {starchRatio < 50
                  ? "Too much water! Particles are too spread out to jam effectively. The mixture flows easily at all speeds."
                  : starchRatio < 60
                  ? "Getting better, but still not enough particles. Jamming occurs but the effect is weak."
                  : starchRatio < 75
                  ? "Perfect balance! Enough particles to jam under stress, but enough water to flow when slow. Maximum armor effect!"
                  : starchRatio < 80
                  ? "Very dense. Strong jamming, but it's getting hard to work with even at slow speeds."
                  : "Too much starch! The mixture is nearly solid even without impact. No flexibility."
                }
              </p>
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
    const wasCorrect = twistPrediction === 'less_armor';

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
            {/* Result */}
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
                The Ratio Matters!
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                More water = weaker jamming. More starch = stronger (to a point)!
              </p>
            </div>

            {/* Summary */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
                📊 Ratio Effects Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  background: `${colors.water}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.water}`
                }}>
                  <strong style={{ color: colors.water }}>More Water (diluted):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Particles too spread out → weak or no jamming → poor armor
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: `${colors.success}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.success}`
                }}>
                  <strong style={{ color: colors.success }}>Optimal (~2:1 starch:water):</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Perfect density → strong jamming under stress → maximum armor
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: `${colors.starch}15`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.starch}`
                }}>
                  <strong style={{ color: colors.starch }}>Too Much Starch:</strong>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', margin: '4px 0 0 0' }}>
                    Always thick → no flexibility → not useful as smart material
                  </p>
                </div>
              </div>
            </div>

            {/* Real-world connection */}
            <div style={{
              background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}20 100%)`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.primary}40`
            }}>
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                🌍 Real-World Application
              </h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Engineers carefully tune the particle concentration in STF armor to maximize protection
                while maintaining flexibility. Too thin = no protection. Too thick = no mobility.
                The sweet spot is where science meets practicality!
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // ============================================================
  // TRANSFER PHASE - Rich real-world applications
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
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                🌍 Real-World Applications
              </p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>
                Non-Newtonian Fluids in Action
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

            {/* Selected app content */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`
            }}>
              {/* App header */}
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

              {/* Description */}
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>
                {app.description}
              </p>

              {/* Connection to experiment */}
              <div style={{
                background: `${app.color}15`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                borderLeft: `4px solid ${app.color}`
              }}>
                <h4 style={{ color: app.color, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                  🔗 Connection to Your Experiment:
                </h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              {/* How it works */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                  ⚙️ How It Works:
                </h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              {/* Stats */}
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

              {/* Examples */}
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

              {/* Future impact */}
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

            {/* Got it button */}
            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');

                // Auto-advance to next incomplete app
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

            {/* Progress indicator */}
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

            {/* Check answer button */}
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

            {/* Explanation */}
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

        {/* Bottom bar */}
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
            {/* Result celebration */}
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
                ? 'You\'ve demonstrated solid understanding of non-Newtonian fluids!'
                : 'Review the concepts and try again to achieve mastery.'
              }
            </p>

            {/* Score display */}
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

              {/* Progress bar */}
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

            {/* What you learned */}
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
                <li>Non-Newtonian fluids change viscosity with applied stress</li>
                <li>Shear-thickening fluids (like oobleck) become MORE viscous under stress</li>
                <li>Particle jamming creates the solid-like response</li>
                <li>The starch:water ratio affects the armor effect</li>
                <li>Real applications include body armor, sports gear, and smart dampers</li>
              </ul>
            </div>

            {/* Actions */}
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

  // Fallback
  return null;
};

export default NonNewtonianArmorRenderer;
