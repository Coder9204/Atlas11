/**
 * DROPLET BREAKUP (RAYLEIGH-PLATEAU INSTABILITY) RENDERER
 *
 * Complete physics game demonstrating the Rayleigh-Plateau instability.
 * Why liquid jets spontaneously break into droplets - surface tension
 * drives the system toward minimum surface area (spheres).
 *
 * FEATURES:
 * - Static graphic in predict phase showing water stream
 * - Interactive flow rate and viscosity controls
 * - Visualization of necking and droplet formation
 * - Rich transfer phase (inkjet, sprays, pharma, metal powder)
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
  textMuted: '#e2e8f0',

  border: '#334155',
  borderLight: '#475569',

  // Physics-specific
  water: '#38bdf8',
  waterDark: '#0284c7',
  stream: '#60a5fa',
  droplet: '#3b82f6',
  honey: '#fbbf24',
  honeyDark: '#d97706',
};

// ============================================================
// GAME CONFIGURATION
// ============================================================

const GAME_ID = 'droplet_breakup';

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
    scenario: "You watch water flowing from a faucet.",
    question: "Why does the smooth stream break into droplets?",
    options: [
      { id: 'gravity', label: "Gravity pulls the water apart" },
      { id: 'air', label: "Air resistance breaks it up" },
      { id: 'surface', label: "Surface tension drives toward minimum surface area (spheres)", correct: true },
      { id: 'evaporation', label: "The water evaporates and separates" }
    ],
    explanation: "Surface tension acts like a stretched membrane that wants to contract. Spheres have minimum surface area for a given volume, so the stream spontaneously breaks into droplets!"
  },
  {
    scenario: "A scientist measures the surface area of different shapes with the same volume.",
    question: "Which shape has the minimum surface area?",
    options: [
      { id: 'cylinder', label: "Cylinder" },
      { id: 'cube', label: "Cube" },
      { id: 'sphere', label: "Sphere", correct: true },
      { id: 'cone', label: "Cone" }
    ],
    explanation: "For any given volume, a sphere has the smallest possible surface area. This is why surface tension drives liquids to form spherical droplets - it minimizes the energy stored in the surface."
  },
  {
    scenario: "You observe a water jet breaking up into droplets.",
    question: "What determines the typical droplet size?",
    options: [
      { id: 'speed', label: "Only the speed of the water" },
      { id: 'temperature', label: "The temperature of the water" },
      { id: 'wavelength', label: "The wavelength of the instability (~9× jet radius)", correct: true },
      { id: 'random', label: "Random chance - all droplets are different" }
    ],
    explanation: "The most unstable wavelength is λ ≈ 9r (about 9 times the jet radius). This wavelength grows fastest and determines the spacing between droplets. Larger jets make larger droplets!"
  },
  {
    scenario: "You compare how water and honey break up when dripping.",
    question: "How does high viscosity affect jet breakup?",
    options: [
      { id: 'faster', label: "It makes breakup happen faster" },
      { id: 'slower', label: "It slows breakup, creating 'beads on a string' patterns", correct: true },
      { id: 'prevents', label: "It prevents any breakup from occurring" },
      { id: 'none', label: "It has no effect on breakup" }
    ],
    explanation: "Viscosity resists the pinch-off. High viscosity fluids can't thin fast enough, creating thin threads between forming droplets - the characteristic 'beads on a string' pattern seen with honey."
  },
  {
    scenario: "An inkjet printer needs to create precise droplets.",
    question: "How are precise ink droplets created?",
    options: [
      { id: 'random', label: "Random breakup of a continuous stream" },
      { id: 'piezo', label: "Piezoelectric pulses that trigger controlled breakup", correct: true },
      { id: 'heating', label: "Heating the ink until it evaporates" },
      { id: 'magnetic', label: "Magnetic fields that shape the ink" }
    ],
    explanation: "Inkjet printers use piezoelectric elements to create precise pressure pulses that trigger the Rayleigh-Plateau instability at exactly the right moment, producing uniformly-sized droplets."
  },
  {
    scenario: "A perturbation (tiny wave) forms on a liquid jet.",
    question: "When does the perturbation grow and cause breakup?",
    options: [
      { id: 'always', label: "All perturbations grow and cause breakup" },
      { id: 'longer', label: "Only when wavelength > jet circumference", correct: true },
      { id: 'shorter', label: "Only when wavelength < jet circumference" },
      { id: 'never', label: "Perturbations never grow" }
    ],
    explanation: "Only perturbations with wavelength longer than the jet circumference (λ > πd) will grow. Shorter wavelengths are damped by surface tension. This is why the stream breaks into droplets of a characteristic size."
  },
  {
    scenario: "You're designing a spray nozzle for agricultural use.",
    question: "Why is droplet uniformity important in sprays?",
    options: [
      { id: 'appearance', label: "It makes the spray look more appealing" },
      { id: 'coverage', label: "Uniform droplets ensure consistent coverage and dosing", correct: true },
      { id: 'cost', label: "It reduces the cost of the spray equipment" },
      { id: 'evaporation', label: "It prevents the spray from evaporating" }
    ],
    explanation: "Uniform droplets ensure each plant gets the right dose of pesticide or fertilizer. Too-small droplets drift away on wind; too-large droplets waste product. Consistent sizing is critical for effective application."
  },
  {
    scenario: "A metal powder manufacturer uses gas atomization.",
    question: "How does the Rayleigh-Plateau instability help make metal powder?",
    options: [
      { id: 'nothing', label: "It doesn't - metal powder is made by grinding" },
      { id: 'breaks', label: "Molten metal stream breaks into droplets that solidify into powder", correct: true },
      { id: 'melts', label: "It melts solid metal into liquid" },
      { id: 'shapes', label: "It shapes already-formed powder" }
    ],
    explanation: "Gas atomization shoots molten metal through nozzles with high-pressure gas jets. The Rayleigh-Plateau instability breaks the stream into droplets that solidify into spherical metal powder particles, perfect for 3D printing."
  },
  {
    scenario: "A pharmaceutical company is making drug microparticles.",
    question: "Why is controlled breakup important for drug delivery?",
    options: [
      { id: 'taste', label: "It only affects the taste of medicine" },
      { id: 'dosing', label: "Uniform particles ensure consistent dosing and release rate", correct: true },
      { id: 'color', label: "It changes the color of the medicine" },
      { id: 'cheaper', label: "It's only used to make production cheaper" }
    ],
    explanation: "Uniform drug particles ensure each pill or capsule contains the exact same dose. Particle size also controls release rate - smaller particles dissolve faster. This is critical for effective medication."
  },
  {
    scenario: "The Ohnesorge number (Oh) compares viscous to surface tension forces.",
    question: "What does a high Ohnesorge number indicate?",
    options: [
      { id: 'quick', label: "Quick, clean breakup into uniform droplets" },
      { id: 'complex', label: "Slow, complex breakup with thin filaments", correct: true },
      { id: 'none', label: "No breakup will occur" },
      { id: 'explosive', label: "Explosive fragmentation" }
    ],
    explanation: "High Oh means viscosity dominates over surface tension. The fluid resists pinch-off, creating thin connecting threads and 'satellite' droplets. Low Oh gives clean, fast breakup into uniform spheres."
  }
];

const realWorldApps = [
  {
    icon: '🖨️',
    title: 'Inkjet Printing',
    short: 'Inkjet printers',
    tagline: 'Precision Droplets on Demand',
    description: 'Inkjet printers use piezoelectric elements to create pressure waves that trigger controlled Rayleigh-Plateau breakup, producing precisely sized droplets that land exactly where needed.',
    connection: 'The same physics that breaks your faucet stream into droplets is precisely controlled to place millions of ink drops per second with micron accuracy.',
    howItWorks: 'A piezoelectric element flexes to create a pressure pulse in the ink chamber. This triggers the instability at exactly the right moment, ejecting a droplet of controlled size at speeds up to 10 m/s.',
    stats: [
      { value: '~20μm', label: 'Droplet diameter', icon: '💧' },
      { value: '20kHz', label: 'Firing frequency', icon: '⚡' },
      { value: '±1μm', label: 'Placement precision', icon: '🎯' }
    ],
    examples: [
      'Document printing with precise text and images',
      '3D printing using UV-curable ink droplets',
      'Electronics printing for flexible circuits',
      'Bioprinting for tissue engineering'
    ],
    companies: ['HP', 'Epson', 'Canon', 'Stratasys'],
    futureImpact: 'Inkjet technology is expanding to print electronics, solar cells, and even human tissue using controlled droplet formation.',
    color: colors.primary
  },
  {
    icon: '💨',
    title: 'Spray Nozzles',
    short: 'Agricultural sprays',
    tagline: 'Optimizing Coverage and Drift',
    description: 'Agricultural sprayers and industrial coating systems engineer nozzle geometries to control droplet size distribution, optimizing coverage while minimizing drift.',
    connection: 'Nozzle design exploits the Rayleigh-Plateau instability to create specific droplet sizes. Different shapes and pressures give different breakup patterns.',
    howItWorks: 'Liquid forced through shaped orifices forms jets or sheets that break up via surface tension. Flat fan, hollow cone, and full cone nozzles each create different spray patterns and droplet sizes.',
    stats: [
      { value: '150-300μm', label: 'Optimal droplet size', icon: '💧' },
      { value: '<150μm', label: 'Drift-prone size', icon: '💨' },
      { value: '>400μm', label: 'Poor coverage size', icon: '⬇️' }
    ],
    examples: [
      'Pesticide application with minimal drift',
      'Paint spraying for automotive finish',
      'Fire suppression sprinklers',
      'Fuel injection in engines'
    ],
    companies: ['TeeJet', 'Spraying Systems Co.', 'BETE', 'Lechler'],
    futureImpact: 'Smart nozzles with real-time droplet size adjustment based on wind and humidity conditions are being developed.',
    color: colors.success
  },
  {
    icon: '💊',
    title: 'Pharmaceutical Manufacturing',
    short: 'Drug microparticles',
    tagline: 'Consistent Dosing Through Physics',
    description: 'Drug microencapsulation and spray drying use controlled jet breakup to create uniform drug particles for consistent dosing and controlled release.',
    connection: 'The Rayleigh-Plateau instability creates uniformly sized droplets that dry into uniform drug particles. Particle size controls how fast the drug releases in your body.',
    howItWorks: 'Drug solutions are atomized into a hot drying chamber. Each droplet dries into a solid microsphere. Nozzle design and process parameters control final particle size distribution.',
    stats: [
      { value: '1-100μm', label: 'Particle size range', icon: '🔬' },
      { value: '±5%', label: 'Size uniformity', icon: '📏' },
      { value: '99%+', label: 'Drug encapsulation', icon: '💊' }
    ],
    examples: [
      'Inhaler powders with precise lung deposition',
      'Time-release medication coatings',
      'Taste-masked oral medications',
      'Injectable microsphere formulations'
    ],
    companies: ['Pfizer', 'GSK', 'Novartis', 'Capsugel'],
    futureImpact: 'Personalized medicine may use patient-specific particle sizes for optimal drug delivery based on individual physiology.',
    color: colors.warning
  },
  {
    icon: '⚙️',
    title: 'Metal Powder Production',
    short: 'Gas atomization',
    tagline: 'From Molten Stream to Perfect Spheres',
    description: 'Gas atomization produces metal powder for 3D printing and powder metallurgy by breaking molten metal streams into droplets that solidify in flight.',
    connection: 'The Rayleigh-Plateau instability breaks molten metal just like water, but at 1500°C! The droplets solidify into nearly perfect spheres before landing.',
    howItWorks: 'Molten metal streams through a nozzle into high-velocity gas jets. The gas creates turbulence that triggers breakup. Droplets solidify in milliseconds as they fall through the cooling chamber.',
    stats: [
      { value: '15-150μm', label: 'Powder size range', icon: '⚙️' },
      { value: '1500°C+', label: 'Melt temperature', icon: '🔥' },
      { value: '99.9%', label: 'Sphericity', icon: '⭕' }
    ],
    examples: [
      'Titanium powder for aerospace 3D printing',
      'Steel powder for automotive parts',
      'Aluminum powder for lightweight structures',
      'Superalloy powder for jet engine components'
    ],
    companies: ['Carpenter Technology', 'Höganäs', 'Sandvik', 'GE Additive'],
    futureImpact: 'Next-generation atomization techniques aim for even finer, more uniform powders to enable higher-resolution metal 3D printing.',
    color: colors.accent
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

interface DropletBreakupRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: { type: string; data: any }) => void;
  gamePhase?: string;
}

const DropletBreakupRenderer: React.FC<DropletBreakupRendererProps> = ({
  onComplete,
  onGameEvent,
  gamePhase
}) => {
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play phase state
  const [flowRate, setFlowRate] = useState(50);
  const [viscosity, setViscosity] = useState(1); // 1 = water, 10 = honey
  const [animTime, setAnimTime] = useState(0);

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

  // Typography responsive system
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
      setAnimTime(t => t + 0.02);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const emitGameEvent = useCallback((eventType: string, details: any) => {
    onGameEvent?.({ type: eventType, data: { ...details, phase, gameId: GAME_ID } });
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
    playSound('transition');
    emitGameEvent('phase_changed', { phase: p });
    if (p === 'test') {
      setTestQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setShowExplanation(false);
    }
  }, [emitGameEvent]);

  const calculateTestScore = () => testAnswers.reduce((score, ans, i) => {
    const correct = testQuestions[i].options.find(o => o.correct)?.id;
    return score + (ans === correct ? 1 : 0);
  }, 0);

  // ============================================================
  // VISUALIZATION
  // ============================================================

  const renderVisualization = (interactive: boolean = false, showViscosity: boolean = false) => {
    const width = isMobile ? 340 : 680;
    const height = isMobile ? 320 : 400;

    const currentFlowRate = interactive ? flowRate : 50;
    const currentViscosity = showViscosity ? viscosity : 1;
    const breakupSpeed = currentFlowRate / 30;
    const dropletSpacing = 35 - currentFlowRate / 4;
    const neckingAmplitude = 3 + Math.sin(animTime * 2) * 2;

    const legendItems = showViscosity ? [
      { color: colors.water, label: 'Water (low viscosity)' },
      { color: colors.honey, label: 'Honey (high viscosity)' },
      { color: colors.textMuted, label: 'Necking region' },
    ] : [
      { color: colors.stream, label: 'Continuous stream' },
      { color: colors.droplet, label: 'Droplets' },
      { color: colors.textMuted, label: 'Necking region' },
    ];

    // Labels for outside SVG
    const annotationLabels = showViscosity ? null : [
      { text: 'Stable stream', y: 120 },
      { text: 'Necking forms', y: 190 },
      { text: 'Droplets break off', y: 260 },
    ];

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
        {/* Title - moved outside SVG */}
        <div style={{ textAlign: 'center', marginBottom: typo.elementGap }}>
          <h3 style={{
            fontSize: typo.heading,
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0,
            marginBottom: '4px'
          }}>
            {showViscosity ? 'Viscosity Effect on Breakup' : 'Rayleigh-Plateau Instability'}
          </h3>
          <p style={{
            fontSize: typo.small,
            color: colors.textSecondary,
            margin: 0
          }}>
            {showViscosity ? 'Compare water vs honey breakup patterns' : 'Liquid jets break into droplets'}
          </p>
        </div>

        {/* Legend - moved outside SVG */}
        <div style={{
          position: 'absolute',
          top: isMobile ? '60px' : '70px',
          right: isMobile ? '8px' : '12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRadius: '8px',
          padding: isMobile ? '8px' : '12px',
          border: `1px solid ${colors.border}`,
          zIndex: 10
        }}>
          <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>Legend</p>
          {legendItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: typo.label, color: colors.textSecondary }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Annotation labels outside SVG (for main view only) */}
        {!showViscosity && annotationLabels && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '60px' : '70px',
            left: isMobile ? `${width * 0.5 + 50}px` : `${width * 0.5 + 70}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
            pointerEvents: 'none'
          }}>
            {annotationLabels.map((label, i) => (
              <div key={i} style={{
                fontSize: typo.small,
                color: colors.textMuted,
                marginTop: i === 0 ? '50px' : '55px'
              }}>
                ← {label.text}
              </div>
            ))}
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height - 50}`} role="img" aria-label="Droplet breakup visualization" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="dropLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Premium faucet metal gradient - 5 color stops */}
            <linearGradient id="dropFaucetMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="25%" stopColor="#52525b" />
              <stop offset="50%" stopColor="#3f3f46" />
              <stop offset="75%" stopColor="#52525b" />
              <stop offset="100%" stopColor="#27272a" />
            </linearGradient>

            {/* Faucet nozzle inner gradient */}
            <linearGradient id="dropFaucetNozzle" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="30%" stopColor="#27272a" />
              <stop offset="70%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            {/* Water stream gradient with 6 color stops for depth */}
            <linearGradient id="dropStreamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="20%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#0ea5e9" />
              <stop offset="60%" stopColor="#0284c7" />
              <stop offset="80%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>

            {/* Honey stream gradient with 5 color stops */}
            <linearGradient id="dropHoneyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Premium 3D water droplet gradient */}
            <radialGradient id="dropWaterDroplet" cx="35%" cy="30%" r="65%" fx="25%" fy="20%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="1" />
              <stop offset="15%" stopColor="#bae6fd" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#7dd3fc" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#0ea5e9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.75" />
            </radialGradient>

            {/* Premium 3D honey droplet gradient */}
            <radialGradient id="dropHoneyDroplet" cx="35%" cy="30%" r="65%" fx="25%" fy="20%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="20%" stopColor="#fde68a" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0.75" />
            </radialGradient>

            {/* Droplet highlight for 3D effect */}
            <radialGradient id="dropHighlight" cx="30%" cy="25%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* Surface tension visualization gradient */}
            <linearGradient id="dropSurfaceTension" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>

            {/* Air flow streamline gradient */}
            <linearGradient id="dropAirFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0" />
              <stop offset="20%" stopColor="#94a3b8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#94a3b8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
            </linearGradient>

            {/* Necking region gradient for breakup effect */}
            <linearGradient id="dropNeckingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
            </linearGradient>

            {/* Inset card gradient */}
            <linearGradient id="dropInsetBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Glow filter for droplets */}
            <filter id="dropGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for stream */}
            <filter id="dropStreamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle glow for surface tension lines */}
            <filter id="dropTensionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="dropInnerShadow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Fragmentation particle glow */}
            <filter id="dropFragmentGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern for lab background */}
            <pattern id="dropLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Premium dark lab background */}
          <rect x="0" y="0" width={width} height={height - 50} fill="url(#dropLabBg)" rx="12" />
          <rect x="0" y="0" width={width} height={height - 50} fill="url(#dropLabGrid)" rx="12" />

          {showViscosity ? (
            // Viscosity comparison view
            <>
              {/* Water column */}
              <g transform={`translate(${width * 0.25}, 0)`}>
                {/* Premium Faucet with metallic finish */}
                <rect x="-25" y="10" width="50" height="30" fill="url(#dropFaucetMetal)" rx="6" />
                <rect x="-25" y="10" width="50" height="4" fill="#a1a1aa" rx="2" opacity="0.5" />
                <rect x="-12" y="35" width="24" height="18" fill="url(#dropFaucetNozzle)" rx="3" />
                <ellipse cx="0" cy="53" rx="10" ry="2" fill="#18181b" />

                {/* Air flow streamlines around water */}
                {[0, 1, 2].map(i => (
                  <path
                    key={`water-air-${i}`}
                    d={`M ${-30 - i * 8} ${80 + i * 20} Q ${-20 - i * 5} ${100 + i * 25}, ${-25 - i * 6} ${130 + i * 30}`}
                    stroke="url(#dropAirFlow)"
                    strokeWidth="1.5"
                    fill="none"
                    opacity={0.3 + Math.sin(animTime + i) * 0.1}
                  />
                ))}
                {[0, 1, 2].map(i => (
                  <path
                    key={`water-air-r-${i}`}
                    d={`M ${30 + i * 8} ${80 + i * 20} Q ${20 + i * 5} ${100 + i * 25}, ${25 + i * 6} ${130 + i * 30}`}
                    stroke="url(#dropAirFlow)"
                    strokeWidth="1.5"
                    fill="none"
                    opacity={0.3 + Math.sin(animTime + i + 1) * 0.1}
                  />
                ))}

                {/* Continuous stream with glow */}
                <rect x="-6" y="53" width="12" height="40" fill="url(#dropStreamGradient)" rx="6" filter="url(#dropStreamGlow)" />

                {/* Surface tension visualization on stream */}
                <ellipse cx="0" cy="70" rx="8" ry="2" fill="none" stroke="url(#dropSurfaceTension)" strokeWidth="1" filter="url(#dropTensionGlow)" opacity={0.6 + Math.sin(animTime * 2) * 0.2} />
                <ellipse cx="0" cy="85" rx="7" ry="2" fill="none" stroke="url(#dropSurfaceTension)" strokeWidth="1" filter="url(#dropTensionGlow)" opacity={0.6 + Math.sin(animTime * 2 + 0.5) * 0.2} />

                {/* Necking region with breakup effect */}
                <rect x="-6" y="93" width="12" height="30" fill="url(#dropNeckingGradient)" filter="url(#dropStreamGlow)" rx="6" opacity={0.8 + Math.sin(animTime * 2) * 0.2} />

                {/* Fragmentation particles at breakup point */}
                {[0, 1, 2, 3].map(i => {
                  const angle = (animTime * 2 + i * 1.5) % (Math.PI * 2);
                  const px = Math.cos(angle) * (4 + Math.sin(animTime * 3) * 2);
                  const py = 118 + Math.sin(angle) * 3;
                  return (
                    <circle
                      key={`frag-w-${i}`}
                      cx={px}
                      cy={py}
                      r={1 + Math.sin(animTime + i) * 0.5}
                      fill="#7dd3fc"
                      filter="url(#dropFragmentGlow)"
                      opacity={0.4 + Math.sin(animTime * 2 + i) * 0.3}
                    />
                  );
                })}

                {/* Premium 3D Droplets - fast clean breakup */}
                {[0, 1, 2, 3, 4].map(i => {
                  const baseY = 133 + i * 28;
                  const y = baseY + ((animTime * breakupSpeed * 50) % 28);
                  if (y > height - 100) return null;
                  const dropletRadius = 10 - i * 0.3;
                  return (
                    <g key={`water-drop-${i}`} filter="url(#dropGlow)">
                      <circle
                        cx={0}
                        cy={y}
                        r={dropletRadius}
                        fill="url(#dropWaterDroplet)"
                      />
                      {/* Highlight for 3D effect */}
                      <circle
                        cx={-dropletRadius * 0.25}
                        cy={y - dropletRadius * 0.25}
                        r={dropletRadius * 0.4}
                        fill="url(#dropHighlight)"
                      />
                    </g>
                  );
                })}
              </g>

              {/* Honey column */}
              <g transform={`translate(${width * 0.75}, 0)`}>
                {/* Premium Faucet */}
                <rect x="-25" y="10" width="50" height="30" fill="url(#dropFaucetMetal)" rx="6" />
                <rect x="-25" y="10" width="50" height="4" fill="#a1a1aa" rx="2" opacity="0.5" />
                <rect x="-12" y="35" width="24" height="18" fill="url(#dropFaucetNozzle)" rx="3" />
                <ellipse cx="0" cy="53" rx="10" ry="2" fill="#18181b" />

                {/* Air flow streamlines around honey */}
                {[0, 1, 2].map(i => (
                  <path
                    key={`honey-air-${i}`}
                    d={`M ${-30 - i * 8} ${80 + i * 25} Q ${-15 - i * 4} ${120 + i * 30}, ${-20 - i * 5} ${170 + i * 35}`}
                    stroke="url(#dropAirFlow)"
                    strokeWidth="1.5"
                    fill="none"
                    opacity={0.3 + Math.sin(animTime + i + 2) * 0.1}
                  />
                ))}

                {/* Long continuous stream with beads forming - length depends on viscosity */}
                <rect x="-5" y="53" width={8 + currentViscosity * 0.4} height={60 + currentViscosity * 8 + Math.sin(animTime * 0.5) * 10} fill="url(#dropHoneyGradient)" rx="5" filter="url(#dropStreamGlow)" />

                {/* Surface tension rings on honey stream */}
                {[0, 1, 2, 3].map(i => (
                  <ellipse
                    key={`honey-tension-${i}`}
                    cx="0"
                    cy={70 + i * 25}
                    rx="7"
                    ry="2"
                    fill="none"
                    stroke="#fde68a"
                    strokeWidth="0.8"
                    opacity={0.4 + Math.sin(animTime + i * 0.5) * 0.2}
                    filter="url(#dropTensionGlow)"
                  />
                ))}

                {/* Beads on string with 3D effect */}
                {[0, 1, 2].map(i => {
                  const y = 90 + i * 35 + (animTime * 5 % 35);
                  if (y > 170) return null;
                  const size = 9 + Math.sin(animTime + i) * 2;
                  return (
                    <g key={`honey-bead-${i}`} filter="url(#dropGlow)">
                      <circle
                        cx={0}
                        cy={y}
                        r={size}
                        fill="url(#dropHoneyDroplet)"
                      />
                      <circle
                        cx={-size * 0.25}
                        cy={y - size * 0.25}
                        r={size * 0.35}
                        fill="url(#dropHighlight)"
                      />
                      {/* Thin connecting thread */}
                      <rect
                        x="-1.5"
                        y={y + size}
                        width="3"
                        height={20 - size}
                        fill="url(#dropHoneyGradient)"
                        opacity="0.7"
                      />
                    </g>
                  );
                })}

                {/* Eventual droplet with 3D effect */}
                {animTime % 3 > 1.5 && (
                  <g filter="url(#dropGlow)">
                    <circle
                      cx={0}
                      cy={195 + ((animTime * 10) % 50)}
                      r={13}
                      fill="url(#dropHoneyDroplet)"
                    />
                    <circle
                      cx={-3}
                      cy={192 + ((animTime * 10) % 50)}
                      r={5}
                      fill="url(#dropHighlight)"
                    />
                  </g>
                )}
              </g>

              {/* Labels outside SVG area - using absolute positioning in parent */}
            </>
          ) : (
            // Main breakup visualization
            <>
              {/* Premium Faucet with metallic gradient */}
              <rect x={width / 2 - 35} y="10" width="70" height="35" fill="url(#dropFaucetMetal)" rx="8" />
              {/* Highlight strip on faucet */}
              <rect x={width / 2 - 35} y="10" width="70" height="5" fill="#a1a1aa" rx="3" opacity="0.4" />
              {/* Faucet nozzle */}
              <rect x={width / 2 - 18} y="40" width="36" height="22" fill="url(#dropFaucetNozzle)" rx="4" />
              {/* Nozzle opening shadow */}
              <ellipse cx={width / 2} cy="62" rx="14" ry="3" fill="#09090b" />

              {/* Air flow streamlines */}
              {[0, 1, 2, 3].map(i => (
                <path
                  key={`air-left-${i}`}
                  d={`M ${width / 2 - 50 - i * 12} ${80 + i * 30} Q ${width / 2 - 30 - i * 8} ${120 + i * 35}, ${width / 2 - 40 - i * 10} ${170 + i * 40}`}
                  stroke="url(#dropAirFlow)"
                  strokeWidth="2"
                  fill="none"
                  opacity={0.25 + Math.sin(animTime * 0.8 + i) * 0.1}
                />
              ))}
              {[0, 1, 2, 3].map(i => (
                <path
                  key={`air-right-${i}`}
                  d={`M ${width / 2 + 50 + i * 12} ${80 + i * 30} Q ${width / 2 + 30 + i * 8} ${120 + i * 35}, ${width / 2 + 40 + i * 10} ${170 + i * 40}`}
                  stroke="url(#dropAirFlow)"
                  strokeWidth="2"
                  fill="none"
                  opacity={0.25 + Math.sin(animTime * 0.8 + i + 1) * 0.1}
                />
              ))}

              {/* Continuous stream section with premium gradient */}
              <rect
                x={width / 2 - 9}
                y="62"
                width="18"
                height="55"
                fill="url(#dropStreamGradient)"
                rx="9"
                filter="url(#dropStreamGlow)"
              />

              {/* Surface tension visualization - animated rings */}
              {[0, 1, 2].map(i => (
                <ellipse
                  key={`tension-ring-${i}`}
                  cx={width / 2}
                  cy={75 + i * 18}
                  rx={12 - i}
                  ry={3}
                  fill="none"
                  stroke="url(#dropSurfaceTension)"
                  strokeWidth="1.5"
                  filter="url(#dropTensionGlow)"
                  opacity={0.5 + Math.sin(animTime * 2 + i * 0.7) * 0.3}
                />
              ))}

              {/* Necking region with animated perturbations and premium gradient */}
              <rect
                x={width / 2 - 9}
                y={117}
                width={18}
                height={75}
                fill="url(#dropNeckingGradient)"
                filter="url(#dropStreamGlow)"
                rx="9"
                opacity={0.8 + Math.sin(animTime * 2) * 0.2}
              />

              {/* Fragmentation spray particles at pinch points */}
              {[0, 1, 2, 3, 4, 5].map(i => {
                const angle = (animTime * 2.5 + i * 1.0) % (Math.PI * 2);
                const radius = 5 + Math.sin(animTime * 3 + i) * 3;
                const px = width / 2 + Math.cos(angle) * radius;
                const py = 175 + Math.sin(angle) * 4;
                return (
                  <circle
                    key={`frag-${i}`}
                    cx={px}
                    cy={py}
                    r={1.5 + Math.sin(animTime + i) * 0.5}
                    fill="#7dd3fc"
                    filter="url(#dropFragmentGlow)"
                    opacity={0.3 + Math.sin(animTime * 2 + i * 0.8) * 0.3}
                  />
                );
              })}

              {/* Premium 3D Droplets */}
              {[0, 1, 2, 3].map(i => {
                const baseY = 207 + i * dropletSpacing;
                const y = baseY + ((animTime * breakupSpeed * 30) % dropletSpacing);
                if (y > height - 80) return null;
                const dropletSize = 11 - i * 0.6;
                return (
                  <g key={`droplet-${i}`} filter="url(#dropGlow)">
                    <circle
                      cx={width / 2}
                      cy={y}
                      r={dropletSize}
                      fill="url(#dropWaterDroplet)"
                    />
                    {/* 3D highlight */}
                    <circle
                      cx={width / 2 - dropletSize * 0.25}
                      cy={y - dropletSize * 0.25}
                      r={dropletSize * 0.4}
                      fill="url(#dropHighlight)"
                    />
                    {/* Subtle bottom shadow */}
                    <ellipse
                      cx={width / 2}
                      cy={y + dropletSize * 0.8}
                      rx={dropletSize * 0.6}
                      ry={dropletSize * 0.15}
                      fill="#0369a1"
                      opacity="0.3"
                    />
                  </g>
                );
              })}

              {/* Surface area comparison inset with premium styling */}
              <g transform={`translate(${isMobile ? 12 : 35}, ${height - 145})`}>
                <rect width={isMobile ? 95 : 115} height="80" fill="url(#dropInsetBg)" rx="10" stroke={colors.border} strokeWidth="1" />

                {/* Cylinder with gradient */}
                <rect x="14" y="30" width="28" height="16" fill={colors.textMuted} rx="4" opacity="0.8" />
                <rect x="14" y="30" width="28" height="3" fill="#94a3b8" rx="2" opacity="0.5" />
                <text x="28" y="55" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Cylinder</text>

                {/* Spheres with 3D effect */}
                <circle cx="22" cy="65" r="9" fill="url(#dropWaterDroplet)" />
                <circle cx="19" cy="62" r="3" fill="url(#dropHighlight)" />
                <circle cx="42" cy="68" r="7" fill="url(#dropWaterDroplet)" />
                <circle cx="40" cy="66" r="2.5" fill="url(#dropHighlight)" />
                <text x={isMobile ? 65 : 75} y="68" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Spheres</text>
              </g>

              {/* Direct labels on main visualization */}
              <text x={width / 2 + 40} y="85" fill={colors.textSecondary} fontSize="11" textAnchor="start">Stream</text>
              <text x={width / 2 + 40} y="165" fill={colors.textSecondary} fontSize="11" textAnchor="start">Necking</text>
              <text x={width / 2 + 40} y="230" fill={colors.textSecondary} fontSize="11" textAnchor="start">Droplets</text>

              {/* Growth Rate Chart - instability growth rate vs wavelength */}
              {interactive && (() => {
                const chartX = isMobile ? 10 : 35;
                const chartY = height - 280;
                const chartW = isMobile ? 130 : 170;
                const chartH = 120;
                const flowNorm = (currentFlowRate - 20) / 80;
                const peakX = 0.45 + flowNorm * 0.15;
                const peakH = 0.75 + flowNorm * 0.2;
                const pts: {x:number;y:number}[] = [];
                for (let i = 0; i <= 15; i++) {
                  const t = i / 15;
                  const g = t < 0.1 ? 0 : Math.sin((t - 0.1) * Math.PI / (1 - 0.1)) * peakH * (t < peakX ? (t / peakX) : ((1 - t) / (1 - peakX)));
                  pts.push({ x: chartX + t * chartW, y: chartY + chartH - g * chartH });
                }
                const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                const markerIdx = Math.round(peakX * 15);
                const marker = pts[Math.min(markerIdx, pts.length - 1)];
                return (
                  <g>
                    {/* Chart background */}
                    <rect x={chartX} y={chartY} width={chartW} height={chartH} fill="rgba(15,23,42,0.8)" rx="4" stroke={colors.border} strokeWidth="0.5" />
                    {/* Grid lines */}
                    <line x1={chartX} y1={chartY + chartH * 0.25} x2={chartX + chartW} y2={chartY + chartH * 0.25} stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
                    <line x1={chartX} y1={chartY + chartH * 0.5} x2={chartX + chartW} y2={chartY + chartH * 0.5} stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
                    <line x1={chartX} y1={chartY + chartH * 0.75} x2={chartX + chartW} y2={chartY + chartH * 0.75} stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
                    <line x1={chartX + chartW * 0.33} y1={chartY} x2={chartX + chartW * 0.33} y2={chartY + chartH} stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
                    <line x1={chartX + chartW * 0.66} y1={chartY} x2={chartX + chartW * 0.66} y2={chartY + chartH} stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
                    {/* Axes */}
                    <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke={colors.textSecondary} strokeWidth="1" />
                    <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke={colors.textSecondary} strokeWidth="1" />
                    {/* Axis labels */}
                    <text x={chartX + chartW / 2} y={chartY + chartH + 14} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Wavelength</text>
                    <text x={chartX - 6} y={chartY + chartH / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" transform={`rotate(-90, ${chartX - 6}, ${chartY + chartH / 2})`}>Growth Rate</text>
                    {/* Growth rate curve */}
                    <path d={pathD} fill="none" stroke={colors.primary} strokeWidth="2" />
                    {/* Interactive point */}
                    <circle cx={marker.x} cy={marker.y} r={8} fill={colors.primary} filter="url(#dropGlow)" stroke="#fff" strokeWidth={2} />
                  </g>
                );
              })()}
            </>
          )}
        </svg>

        {/* Bottom labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: showViscosity ? 'space-around' : 'space-between',
          alignItems: 'flex-start',
          padding: `${typo.elementGap} ${typo.pagePadding}`,
          marginTop: typo.elementGap
        }}>
          {showViscosity ? (
            <>
              {/* Water label */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: typo.body, fontWeight: 600, color: colors.water, margin: 0 }}>
                  Water (Low viscosity)
                </p>
                <p style={{ fontSize: typo.small, color: colors.textMuted, margin: 0 }}>
                  Clean, fast breakup
                </p>
              </div>
              {/* Honey label */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <p style={{ fontSize: typo.body, fontWeight: 600, color: colors.honey, margin: 0 }}>
                  Honey (High viscosity)
                </p>
                <p style={{ fontSize: typo.small, color: colors.textMuted, margin: 0 }}>
                  Beads on a string
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Surface area inset label */}
              <div style={{ maxWidth: isMobile ? '100px' : '120px' }}>
                <p style={{ fontSize: typo.small, fontWeight: 600, color: colors.textSecondary, margin: 0, marginBottom: '2px' }}>
                  Surface Area
                </p>
                <p style={{ fontSize: typo.label, color: colors.textMuted, margin: 0 }}>
                  Cylinder → Spheres
                </p>
                <p style={{ fontSize: typo.label, color: colors.success, margin: 0, fontWeight: 600 }}>
                  ↓ 15% less area!
                </p>
              </div>
              {/* Formula */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
                  Most unstable wavelength:
                </p>
                <p style={{ fontSize: typo.body, color: colors.primaryLight, margin: 0, fontWeight: 600 }}>
                  λ ≈ 9r <span style={{ color: colors.textMuted, fontWeight: 400 }}>(9× jet radius)</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // NAV DOTS
  // ============================================================

  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Completion'
  };

  const renderNavDots = () => {
    const currentIndex = validPhases.indexOf(phase);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', padding: '4px 0' }}>
        {validPhases.map((p, i) => (
          <button
            key={p}
            aria-label={phaseLabels[p]}
            onClick={() => goToPhase(p)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: i === currentIndex ? colors.primary : i < currentIndex ? colors.success : colors.bgCardLight,
              display: 'block',
              transition: 'background 0.3s ease'
            }} />
          </button>
        ))}
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
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', padding: '8px 20px 12px 20px',
        display: 'flex', flexDirection: 'column', gap: '4px'
      }}>
        {renderNavDots()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          {showBack ? (
            <button onClick={handleBack} style={{
              padding: '12px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`,
              backgroundColor: colors.bgCardLight, color: colors.textSecondary, fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '48px',
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
              color: colors.textMuted, fontSize: '14px', minHeight: '52px', display: 'flex', alignItems: 'center'
            }}>Select an option above</div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // PHASES
  // ============================================================

  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: isMobile ? '80px' : '120px', marginBottom: '20px' }}>🚿</div>
            <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 800, color: colors.textPrimary, marginBottom: '16px' }}>
              The Breaking Stream Mystery
            </h1>
            <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary, marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: 1.6 }}>
              Turn on a faucet and watch closely. The smooth water stream <strong style={{ color: colors.primaryLight }}>spontaneously breaks into droplets</strong>. What invisible force causes this?
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '20px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>💧</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Smooth stream</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>starts as cylinder</p>
                </div>
                <div style={{ textAlign: 'center', fontSize: '32px', color: colors.primary, paddingTop: '20px' }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>💦</div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Breaks into droplets</p>
                  <p style={{ color: colors.success, fontSize: '12px' }}>becomes spheres</p>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic', fontWeight: 400 }}>
              Discover the <strong style={{ color: colors.primaryLight }}>Rayleigh-Plateau instability</strong>
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, "Start Exploring →")}
      </div>
    );
  }

  if (phase === 'predict') {
    const predictions = [
      { id: 'cylinder', label: 'Cylinder has minimum surface area', icon: '▬' },
      { id: 'cube', label: 'Cube has minimum surface area', icon: '⬜' },
      { id: 'sphere', label: 'Sphere has minimum surface area', icon: '⚪' },
      { id: 'cone', label: 'Cone has minimum surface area', icon: '△' }
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 1 • Make a Prediction</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Water Stream Breakup</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', aspectRatio: '16/10', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderVisualization(false)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                A <strong style={{ color: colors.stream }}>water stream</strong> flows from a faucet. The <span style={{ color: colors.textMuted }}>necking region</span> shows where perturbations grow.
                Below that, <strong style={{ color: colors.droplet }}>droplets</strong> form and fall. Surface tension wants to minimize surface area — that's why this happens!
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 For the same volume, which shape has minimum surface area?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {predictions.map(p => (
                  <button key={p.id} onClick={() => { setPrediction(p.id); playSound('click'); }} style={{
                    padding: '16px', borderRadius: '12px',
                    border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                    backgroundColor: prediction === p.id ? `${colors.primary}20` : colors.bgCard,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px'
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
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.primary, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Step 2 • Experiment</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Adjust Flow Rate</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderVisualization(true)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🎮 Controls</h3>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '13px' }}>Slow (20%)</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>Flow Rate: {flowRate}%</span>
                  <span style={{ color: colors.primary, fontSize: '13px' }}>Fast (100%)</span>
                </div>
                <input type="range" min="20" max="100" step="5" value={flowRate} onChange={(e) => setFlowRate(Number(e.target.value))} onInput={(e) => setFlowRate(Number((e.target as HTMLInputElement).value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6', borderRadius: '4px', cursor: 'pointer' }} />
                <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                  {flowRate < 40 ? 'Slow flow - droplets form close together' : flowRate < 70 ? 'Medium flow - classic breakup pattern' : 'Fast flow - longer stream before breakup'}
                </p>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}40`, transition: 'all 0.3s ease' }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>👀 What the Visualization Displays:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                This visualization shows how a liquid stream breaks into droplets via the Rayleigh-Plateau instability.
                <strong style={{ color: colors.primary }}> Surface tension</strong> is defined as the energy per unit area of a liquid surface.
                It acts like a stretched membrane, always trying to minimize surface area.
                A cylinder has ~15% more surface area than spheres of the same total volume — so the stream <strong>spontaneously breaks up</strong>!
                When you increase the flow rate, observe how the breakup pattern changes.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginTop: '16px' }}>
              <div style={{ flex: 1, background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, transition: 'all 0.3s ease' }}>
                <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Why This Matters</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                  This is important because it is used in industry applications from inkjet printers to pharmaceutical manufacturing.
                  Engineers design nozzles to control droplet size using the relationship: λ = 9 × r (most unstable wavelength equals 9 times jet radius).
                </p>
              </div>
              <div style={{ flex: 1, background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}`, transition: 'all 0.3s ease' }}>
                <h4 style={{ color: colors.success, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Current vs Reference</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                  Compare how higher flow rates create longer stable streams before breakup.
                  The growth rate chart shows the relative instability at different wavelengths.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Results →')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'sphere';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', padding: '24px', background: wasCorrect ? `${colors.success}15` : `${colors.primary}15`, borderRadius: '16px', marginBottom: '24px', border: `1px solid ${wasCorrect ? colors.success : colors.primary}40` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{wasCorrect ? '🎯' : '💡'}</div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: wasCorrect ? colors.success : colors.primaryLight, marginBottom: '8px' }}>
                {wasCorrect ? 'Excellent Prediction!' : 'Great Learning Moment!'}
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                {wasCorrect ? 'Your prediction was correct!' : 'As you observed in the experiment,'} spheres have the minimum surface area for any given volume because surface tension demonstrates this principle!
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🔬 The Rayleigh-Plateau Instability</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { num: 1, title: 'Surface Tension Minimization', desc: 'Surface tension acts like a membrane trying to contract. Spheres have minimum surface area.', color: colors.primary },
                  { num: 2, title: 'Instability Growth', desc: 'Any tiny perturbation with wavelength > πd grows exponentially until breakup.', color: colors.accent },
                  { num: 3, title: 'Characteristic Scale', desc: 'The most unstable wavelength is λ ≈ 9r, determining droplet spacing.', color: colors.success }
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
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📐 The Math</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                For the same volume, a sphere has <strong style={{ color: colors.success }}>~15% less surface area</strong> than a cylinder.
                Surface tension energy E ∝ Area, so breaking into spheres <strong>releases energy</strong> — it's thermodynamically favored!
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
      { id: 'faster', label: 'Breakup happens much faster', icon: '⚡' },
      { id: 'same', label: 'Breakup happens exactly the same way', icon: '🟰' },
      { id: 'slower', label: 'Breakup is slower, creating "beads on a string"', icon: '🧵' },
      { id: 'never', label: 'No breakup occurs — it stays as a stream', icon: '❌' }
    ];

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🔄 Twist • Viscosity</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>What About Honey?</h2>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>💧</div>
                  <p style={{ color: colors.water, fontWeight: 600 }}>Water</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>η ≈ 1 cP</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🍯</div>
                  <p style={{ color: colors.honey, fontWeight: 600 }}>Honey</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>η ≈ 10,000 cP</p>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderVisualization(false, true)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                Watch the comparison above. How does a thick, viscous fluid like <strong style={{ color: colors.honey }}>honey</strong> break up compared to <strong style={{ color: colors.water }}>water</strong>?
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>🤔 How does viscosity affect breakup?</h3>
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
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.accent, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🔄 Twist • Compare</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: colors.textPrimary }}>Water vs Honey Breakup</h2>
            </div>

            <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto 20px auto', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {renderVisualization(false, true)}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🎮 Adjust Viscosity</h3>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: colors.water, fontSize: '13px' }}>Water (1 cP)</span>
                  <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700 }}>
                    {viscosity <= 3 ? 'Low' : viscosity <= 6 ? 'Medium' : 'High'} Viscosity
                  </span>
                  <span style={{ color: colors.honey, fontSize: '13px' }}>Honey (10000 cP)</span>
                </div>
                <input type="range" min="1" max="10" value={viscosity} onChange={(e) => setViscosity(Number(e.target.value))} onInput={(e) => setViscosity(Number((e.target as HTMLInputElement).value))} style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as any, accentColor: '#3b82f6', borderRadius: '4px', cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <div style={{ background: `${colors.water}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.water}40` }}>
                <h4 style={{ color: colors.water, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>💧 Low Viscosity (Water)</h4>
                <ul style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>Fast, clean breakup</li>
                  <li>Uniform droplets</li>
                  <li>No connecting threads</li>
                </ul>
              </div>
              <div style={{ background: `${colors.honey}15`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.honey}40` }}>
                <h4 style={{ color: colors.honey, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>🍯 High Viscosity (Honey)</h4>
                <ul style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, paddingLeft: '16px', lineHeight: 1.6 }}>
                  <li>Slow, complex breakup</li>
                  <li>"Beads on a string" pattern</li>
                  <li>Satellite droplets form</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Learn More →')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'slower';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', padding: '24px', background: wasCorrect ? `${colors.success}15` : `${colors.primary}15`, borderRadius: '16px', marginBottom: '24px', border: `1px solid ${wasCorrect ? colors.success : colors.primary}40` }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{wasCorrect ? '🎯' : '💡'}</div>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: wasCorrect ? colors.success : colors.primaryLight, marginBottom: '8px' }}>
                {wasCorrect ? 'Exactly Right!' : 'Now You Know!'}
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>High viscosity creates "beads on a string"!</p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🍯 Why Viscosity Matters</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { num: 1, title: 'Resists Pinch-off', desc: 'Viscosity resists the flow needed to thin the neck. The fluid can\'t thin fast enough.', color: colors.honey },
                  { num: 2, title: 'Creates Thin Threads', desc: 'Long thin filaments connect forming droplets — the "beads on a string" pattern.', color: colors.warning },
                  { num: 3, title: 'Satellite Droplets', desc: 'When threads eventually break, they form small "satellite" droplets between main ones.', color: colors.primary }
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
              <h4 style={{ color: colors.primaryLight, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📊 The Ohnesorge Number</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ fontFamily: 'monospace', color: colors.textPrimary }}>Oh = η / √(ρσr)</strong>
                <br /><br />
                This dimensionless number compares viscous forces to surface tension forces.
                <strong style={{ color: colors.water }}> Low Oh</strong> → clean breakup.
                <strong style={{ color: colors.honey }}> High Oh</strong> → slow breakup with filaments.
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
    const app = realWorldApps[selectedApp];
    const allCompleted = completedApps.every(c => c);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🌍 Real-World Applications</p>
              <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, color: colors.textPrimary }}>Rayleigh-Plateau in Action</h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, i) => (
                <button key={i} onClick={() => { setSelectedApp(i); playSound('click'); }} style={{
                  padding: '10px 16px', borderRadius: '12px',
                  border: selectedApp === i ? `2px solid ${a.color}` : `1px solid ${colors.border}`,
                  background: selectedApp === i ? `${a.color}20` : colors.bgCard,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0
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

              <div style={{ background: colors.bgDark, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>How It Works:</h4>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{app.howItWorks}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Key Examples:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, margin: 0, paddingLeft: '20px' }}>
                  {app.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                </ul>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                <strong style={{ color: app.color }}>Future Impact:</strong> {app.futureImpact}
              </p>

              <p style={{ color: colors.textSecondary, fontSize: '13px' }}>
                Companies: {app.companies.join(', ')} — Operating at scales of 1000s of droplets per second with precision down to 1 nm accuracy.
              </p>
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
              cursor: completedApps[selectedApp] ? 'default' : 'pointer', minHeight: '52px'
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

  // Test phase
  if (phase === 'test') {
    const currentQ = testQuestions[testQuestion];
    const selectedAnswer = testAnswers[testQuestion];
    const isCorrect = selectedAnswer === currentQ.options.find(o => o.correct)?.id;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, marginBottom: '8px' }}>{currentQ.scenario}</p>
              <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                Think about what you learned about the Rayleigh-Plateau instability and how surface tension drives liquid jets to break into droplets. Consider how wavelength, viscosity, and flow rate affect the breakup process. The physics of droplet formation is governed by the competition between surface tension (which drives breakup) and viscosity (which resists it).
              </p>
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
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>{passed ? '🏆' : '📚'}</div>
            <h2 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: passed ? colors.success : colors.primaryLight, marginBottom: '8px' }}>{passed ? 'Mastery Achieved!' : 'Keep Learning!'}</h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '32px' }}>{passed ? 'You understand the Rayleigh-Plateau instability!' : 'Review and try again.'}</p>

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
                <li>Surface tension drives jets to break into spheres (minimum surface area)</li>
                <li>The most unstable wavelength is λ ≈ 9r</li>
                <li>High viscosity creates "beads on a string" patterns</li>
                <li>The Ohnesorge number compares viscous to surface tension forces</li>
                <li>Applications: inkjets, sprays, pharmaceuticals, metal powder</li>
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

export default DropletBreakupRenderer;
