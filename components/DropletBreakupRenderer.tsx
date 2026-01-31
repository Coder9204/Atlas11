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
  textMuted: '#94a3b8',

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
            <linearGradient id="streamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.stream} />
              <stop offset="100%" stopColor={colors.droplet} />
            </linearGradient>
            <linearGradient id="honeyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.honey} />
              <stop offset="100%" stopColor={colors.honeyDark} />
            </linearGradient>
            <radialGradient id="dropletGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={colors.primaryLight} />
              <stop offset="100%" stopColor={colors.droplet} />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={width} height={height} fill={colors.bgDark} rx="12" />

          <text x={width / 2} y="28" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? 16 : 20} fontWeight="bold">
            {showViscosity ? 'Viscosity Effect on Breakup' : 'Rayleigh-Plateau Instability'}
          </text>
          <text x={width / 2} y="48" textAnchor="middle" fill={colors.textSecondary} fontSize={isMobile ? 11 : 14}>
            {showViscosity ? 'Compare water vs honey breakup patterns' : 'Liquid jets break into droplets'}
          </text>

          {showViscosity ? (
            // Viscosity comparison view
            <>
              {/* Water column */}
              <g transform={`translate(${width * 0.25}, 0)`}>
                {/* Faucet */}
                <rect x="-20" y="60" width="40" height="25" fill="#64748b" rx="4" />
                <rect x="-10" y="80" width="20" height="15" fill="#475569" rx="2" />

                {/* Continuous stream */}
                <rect x="-5" y="95" width="10" height="35" fill="url(#streamGradient)" rx="5" />

                {/* Necking region */}
                <path
                  d={`M -5 130 Q -3 ${140 + neckingAmplitude}, -5 150 L 5 150 Q 7 ${140 - neckingAmplitude}, 5 130 Z`}
                  fill="url(#streamGradient)"
                />

                {/* Droplets - fast clean breakup */}
                {[0, 1, 2, 3, 4].map(i => {
                  const baseY = 160 + i * 28;
                  const y = baseY + ((animTime * breakupSpeed * 50) % 28);
                  if (y > height - 60) return null;
                  return (
                    <circle
                      key={i}
                      cx={0}
                      cy={y}
                      r={10}
                      fill="url(#dropletGradient)"
                    />
                  );
                })}

                <text x="0" y={height - 25} textAnchor="middle" fill={colors.water} fontSize="12" fontWeight="600">
                  Water (Low η)
                </text>
                <text x="0" y={height - 10} textAnchor="middle" fill={colors.textMuted} fontSize="10">
                  Clean, fast breakup
                </text>
              </g>

              {/* Honey column */}
              <g transform={`translate(${width * 0.75}, 0)`}>
                {/* Faucet */}
                <rect x="-20" y="60" width="40" height="25" fill="#64748b" rx="4" />
                <rect x="-10" y="80" width="20" height="15" fill="#475569" rx="2" />

                {/* Long continuous stream with beads forming */}
                <rect x="-4" y="95" width="8" height={100 + Math.sin(animTime * 0.5) * 10} fill="url(#honeyGradient)" rx="4" />

                {/* Beads on string */}
                {[0, 1, 2].map(i => {
                  const y = 120 + i * 40 + (animTime * 5 % 40);
                  if (y > 195) return null;
                  const size = 8 + Math.sin(animTime + i) * 2;
                  return (
                    <circle
                      key={i}
                      cx={0}
                      cy={y}
                      r={size}
                      fill="url(#honeyGradient)"
                    />
                  );
                })}

                {/* Eventual droplet */}
                <circle
                  cx={0}
                  cy={220 + ((animTime * 10) % 50)}
                  r={12}
                  fill="url(#honeyGradient)"
                  opacity={animTime % 3 > 1.5 ? 1 : 0}
                />

                <text x="0" y={height - 25} textAnchor="middle" fill={colors.honey} fontSize="12" fontWeight="600">
                  Honey (High η)
                </text>
                <text x="0" y={height - 10} textAnchor="middle" fill={colors.textMuted} fontSize="10">
                  Beads on a string
                </text>
              </g>
            </>
          ) : (
            // Main breakup visualization
            <>
              {/* Faucet */}
              <rect x={width / 2 - 30} y="60" width="60" height="30" fill="#64748b" rx="6" />
              <rect x={width / 2 - 15} y="85" width="30" height="20" fill="#475569" rx="3" />

              {/* Continuous stream section */}
              <rect
                x={width / 2 - 8}
                y="105"
                width="16"
                height="50"
                fill="url(#streamGradient)"
                rx="8"
              />

              {/* Necking region with animated perturbations */}
              <path
                d={`M ${width / 2 - 8} 155
                    Q ${width / 2 - 6 + Math.sin(animTime * 3) * neckingAmplitude} 175, ${width / 2 - 8} 195
                    Q ${width / 2 - 10 - Math.sin(animTime * 3 + 1) * neckingAmplitude} 215, ${width / 2 - 6} 230
                    L ${width / 2 + 6} 230
                    Q ${width / 2 + 10 + Math.sin(animTime * 3 + 1) * neckingAmplitude} 215, ${width / 2 + 8} 195
                    Q ${width / 2 + 6 - Math.sin(animTime * 3) * neckingAmplitude} 175, ${width / 2 + 8} 155
                    Z`}
                fill="url(#streamGradient)"
              />

              {/* Droplets */}
              {[0, 1, 2, 3].map(i => {
                const baseY = 245 + i * dropletSpacing;
                const y = baseY + ((animTime * breakupSpeed * 30) % dropletSpacing);
                if (y > height - 40) return null;
                const dropletSize = 10 - i * 0.5;
                return (
                  <circle
                    key={i}
                    cx={width / 2}
                    cy={y}
                    r={dropletSize}
                    fill="url(#dropletGradient)"
                  />
                );
              })}

              {/* Labels */}
              <g transform={`translate(${width / 2 + 60}, 120)`}>
                <text fill={colors.textMuted} fontSize="11">← Stable stream</text>
              </g>
              <g transform={`translate(${width / 2 + 60}, 190)`}>
                <text fill={colors.textMuted} fontSize="11">← Necking forms</text>
              </g>
              <g transform={`translate(${width / 2 + 60}, 260)`}>
                <text fill={colors.textMuted} fontSize="11">← Droplets break off</text>
              </g>

              {/* Surface area comparison inset */}
              <g transform={`translate(${isMobile ? 15 : 40}, ${height - 100})`}>
                <rect width={isMobile ? 90 : 110} height="75" fill={colors.bgCard} rx="8" />
                <text x={isMobile ? 45 : 55} y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="10" fontWeight="600">
                  Surface Area
                </text>

                {/* Cylinder */}
                <rect x="12" y="28" width="25" height="14" fill={colors.textMuted} rx="3" />
                <text x="50" y="38" fill={colors.textMuted} fontSize="9">Cylinder</text>

                {/* Arrow */}
                <text x={isMobile ? 45 : 55} y="55" textAnchor="middle" fill={colors.success} fontSize="11">↓ less!</text>

                {/* Spheres */}
                <circle cx="20" cy="62" r="8" fill={colors.droplet} />
                <circle cx="40" cy="65" r="6" fill={colors.droplet} />
                <text x="55" y="66" fill={colors.droplet} fontSize="9">Spheres</text>
              </g>
            </>
          )}

          {/* Formula */}
          <g transform={`translate(${isMobile ? 15 : 25}, ${height - 25})`}>
            <text fill={colors.textSecondary} fontSize={isMobile ? 9 : 11}>
              Most unstable wavelength: <tspan fill={colors.primaryLight}>λ ≈ 9r</tspan> (9× jet radius)
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
            backgroundColor: colors.bgCardLight, color: colors.textSecondary, fontSize: '14px', fontWeight: 600, cursor: 'pointer', minHeight: '48px'
          }}>← Back</button>
        ) : <div />}

        {canProceed ? (
          <button onClick={handleNext} style={{
            padding: '14px 28px', borderRadius: '12px', border: 'none',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', minHeight: '52px', minWidth: '160px',
            boxShadow: `0 4px 15px ${colors.primary}40`
          }}>{nextLabel}</button>
        ) : (
          <div style={{
            padding: '14px 28px', borderRadius: '12px', backgroundColor: colors.bgCardLight,
            color: colors.textMuted, fontSize: '14px', minHeight: '52px', display: 'flex', alignItems: 'center'
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
            <p style={{ fontSize: '14px', color: colors.textMuted, fontStyle: 'italic' }}>
              Discover the <strong style={{ color: colors.primaryLight }}>Rayleigh-Plateau instability</strong>
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, "Let's Explore →")}
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
                <input type="range" min="20" max="100" step="5" value={flowRate} onChange={(e) => setFlowRate(Number(e.target.value))} style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }} />
                <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                  {flowRate < 40 ? 'Slow flow - droplets form close together' : flowRate < 70 ? 'Medium flow - classic breakup pattern' : 'Fast flow - longer stream before breakup'}
                </p>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.bgCard} 100%)`, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.primary}40` }}>
              <h4 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>👀 What's Happening:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: colors.primary }}>Surface tension</strong> acts like a stretched membrane, always trying to minimize surface area.
                A cylinder has ~15% more surface area than spheres of the same total volume — so the stream <strong>spontaneously breaks up</strong>!
              </p>
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
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Spheres have the minimum surface area for any given volume!</p>
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

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                How does a thick, viscous fluid like <strong style={{ color: colors.honey }}>honey</strong> break up compared to <strong style={{ color: colors.water }}>water</strong>?
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
                <input type="range" min="1" max="10" value={viscosity} onChange={(e) => setViscosity(Number(e.target.value))} style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }} />
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
