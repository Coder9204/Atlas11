import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 111: STICK-SLIP EARTHQUAKES
// The sudden release of stored elastic energy when friction breaks
// Demonstrates static vs kinetic friction, energy storage, and seismic events
// ============================================================================

interface StickSlipRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette with proper contrast
const realWorldApps = [
  {
    icon: '🌍',
    title: 'Earthquake Prediction',
    short: 'Understanding seismic cycles through stick-slip',
    tagline: 'The earth builds up stress, then releases',
    description: 'Earthquakes occur when accumulated tectonic stress overcomes fault friction in a sudden slip event. Understanding the stick-slip cycle helps scientists assess seismic hazards and predict future earthquakes.',
    connection: 'Stick-slip mechanics directly model earthquake physics. Faults "stick" for decades as plates push against them, then "slip" catastrophically when stress exceeds static friction.',
    howItWorks: 'GPS and seismometers monitor ground deformation. Paleoseismology dates past earthquakes. Models use static friction to estimate stress accumulation and predict when faults might fail.',
    stats: [
      { value: '500yr', label: 'Major quake cycle', icon: '📅' },
      { value: 'M9.0', label: 'Max subduction quake', icon: '📊' },
      { value: '3cm/yr', label: 'Typical plate motion', icon: '🌏' }
    ],
    examples: ['San Andreas Fault', 'Japan Trench', 'Himalayan Front', 'Cascadia Subduction'],
    companies: ['USGS', 'Japan Meteorological Agency', 'GeoNet', 'UNAVCO'],
    futureImpact: 'Dense sensor networks and AI will enable better forecasting of earthquake probability, giving communities days to weeks of warning for potential major events.',
    color: '#ef4444'
  },
  {
    icon: '🎻',
    title: 'Bowed String Instruments',
    short: 'Creating music through controlled stick-slip',
    tagline: 'Making strings sing',
    description: 'Violins and cellos produce sound through stick-slip motion between bow and string. Rosin creates the right friction for the bow to alternately grip and release the string at the desired frequency.',
    connection: 'The bow sticks to the string, deflecting it until kinetic friction takes over and it slips back. This cycle repeats hundreds of times per second, driving the string vibration.',
    howItWorks: 'Rosin increases static friction between horsehair and string. The Helmholtz motion creates a kink that travels along the string. Bow pressure and speed control tone quality.',
    stats: [
      { value: '440Hz', label: 'A string frequency', icon: '🎵' },
      { value: '100g', label: 'Typical bow pressure', icon: '⚖️' },
      { value: '0.5m/s', label: 'Bow speed', icon: '🏃' }
    ],
    examples: ['Violin technique', 'Cello bowing', 'Bass fiddle', 'Chinese erhu'],
    companies: ['Stradivari', 'Pirastro', 'Thomastik-Infeld', 'D\'Addario'],
    futureImpact: 'Robotic bowing systems will enable new musical instruments and help train students by precisely reproducing the stick-slip dynamics of master musicians.',
    color: '#f59e0b'
  },
  {
    icon: '🚗',
    title: 'Brake Squeal',
    short: 'Unwanted stick-slip in braking systems',
    tagline: 'When friction makes noise',
    description: 'Brake squeal occurs when stick-slip motion between brake pads and rotors excites resonant frequencies in the brake assembly. Engineers work to eliminate this annoying phenomenon.',
    connection: 'The negative slope of friction vs. velocity can cause instability. When friction drops as speed increases, stick-slip oscillations grow into audible squealing.',
    howItWorks: 'Pad material alternates between sticking and slipping on the rotor. This self-excited vibration couples to structural resonances. Chamfers, shims, and special compounds reduce squeal.',
    stats: [
      { value: '1-16kHz', label: 'Squeal frequency', icon: '🔊' },
      { value: '-$1B', label: 'Annual warranty costs', icon: '💰' },
      { value: '0.35', label: 'Target friction coefficient', icon: '📊' }
    ],
    examples: ['Automotive disc brakes', 'Motorcycle brakes', 'Industrial machinery', 'Aircraft landing gear'],
    companies: ['Brembo', 'Akebono', 'Federal-Mogul', 'TMD Friction'],
    futureImpact: 'Active noise cancellation and smart brake materials will eliminate squeal by dynamically adjusting friction characteristics based on real-time vibration sensing.',
    color: '#3b82f6'
  },
  {
    icon: '🏔️',
    title: 'Glacier Movement',
    short: 'Ice stick-slip on continental scale',
    tagline: 'When ice rivers suddenly surge',
    description: 'Glaciers exhibit stick-slip behavior, alternating between periods of slow creep and sudden surges. Understanding this helps predict ice sheet collapse and sea level rise.',
    connection: 'Glacial ice sticks to bedrock through frozen debris and pressure, then slips when meltwater lubricates the base. This creates episodic motion similar to earthquake fault behavior.',
    howItWorks: 'Basal friction depends on temperature, water pressure, and sediment type. GPS measures surface velocity. Seismometers detect "icequakes" during slip events. Models predict future behavior.',
    stats: [
      { value: '10km/yr', label: 'Surge velocity', icon: '🏃' },
      { value: 'M7', label: 'Largest glacial quake', icon: '📊' },
      { value: '3m/yr', label: 'Potential sea rise', icon: '🌊' }
    ],
    examples: ['Antarctic ice streams', 'Greenland outlet glaciers', 'Alaskan tidewater glaciers', 'Himalayan surge glaciers'],
    companies: ['NASA', 'British Antarctic Survey', 'Alfred Wegener Institute', 'NOAA'],
    futureImpact: 'Satellite monitoring and improved friction models will help predict catastrophic glacier collapse events, providing critical input for climate adaptation planning.',
    color: '#8b5cf6'
  }
];

const colors = {
  // Text colors - HIGH CONTRAST
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Rock/earth colors
  rockLight: '#78716c',
  rockDark: '#44403c',
  rockHighlight: '#a8a29e',
  fault: '#dc2626',

  // Stress colors
  stressLow: '#22c55e',
  stressMedium: '#f59e0b',
  stressHigh: '#ef4444',

  // Energy colors
  stored: '#3b82f6',
  released: '#f97316',

  // UI colors
  accent: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const StickSlipRenderer: React.FC<StickSlipRendererProps> = ({
  phase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [drivingForce, setDrivingForce] = useState(50); // 0-100 (tectonic plate movement)
  const [frictionStrength, setFrictionStrength] = useState(50); // 0-100
  const [surfaceRoughness, setSurfaceRoughness] = useState(50); // 0-100

  // Simulation state
  const [stress, setStress] = useState(0);
  const [isSlipping, setIsSlipping] = useState(false);
  const [slipHistory, setSlipHistory] = useState<Array<{ time: number; magnitude: number }>>([]);
  const [displacement, setDisplacement] = useState(0);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
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

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateStaticFriction = useCallback(() => {
    // Static friction coefficient depends on surface roughness
    return 0.5 + (surfaceRoughness / 100) * 0.4 + (frictionStrength / 100) * 0.3;
  }, [surfaceRoughness, frictionStrength]);

  const calculateKineticFriction = useCallback(() => {
    // Kinetic friction is always less than static
    return calculateStaticFriction() * 0.7;
  }, [calculateStaticFriction]);

  const calculateBreakThreshold = useCallback(() => {
    // Stress level at which static friction breaks
    return calculateStaticFriction() * 100;
  }, [calculateStaticFriction]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);

      // Stress builds up from tectonic driving force
      const stressRate = (drivingForce / 100) * 0.5;
      const threshold = calculateBreakThreshold();

      setStress(prevStress => {
        const newStress = prevStress + stressRate;

        // Check for slip event
        if (newStress >= threshold && !isSlipping) {
          setIsSlipping(true);
          const magnitude = (newStress / threshold) * (0.5 + Math.random() * 0.5);
          setSlipHistory(prev => [...prev.slice(-9), { time: animationTime, magnitude }]);

          // Displacement during slip
          setDisplacement(prev => prev + magnitude * 5);

          // Release most (but not all) stress
          setTimeout(() => {
            setStress(threshold * 0.2 * Math.random());
            setIsSlipping(false);
          }, 200);

          return newStress;
        }

        return Math.min(newStress, threshold * 1.1);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, drivingForce, calculateBreakThreshold, isSlipping, animationTime]);

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const threshold = calculateBreakThreshold();
    const stressPercent = Math.min(100, (stress / threshold) * 100);
    const staticFriction = calculateStaticFriction();
    const kineticFriction = calculateKineticFriction();

    // Stress color
    const stressColor = stressPercent < 50 ? colors.stressLow
      : stressPercent < 80 ? colors.stressMedium
        : colors.stressHigh;

    // Displacement visualization
    const topBlockOffset = isSlipping ? (Math.sin(animationTime * 50) * 3) : 0;
    const bottomBlockOffset = isSlipping ? (-Math.sin(animationTime * 50) * 3) : 0;

    // Stored elastic energy visualization
    const storedEnergy = stress / threshold;

    // Spring compression calculation
    const springCompression = storedEnergy * 0.6;
    const springCoils = 8;
    const springBaseWidth = 60;
    const springCompressedWidth = springBaseWidth * (1 - springCompression * 0.5);

    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 500 420"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
        >
          <defs>
            {/* === PREMIUM BACKGROUND GRADIENT === */}
            <linearGradient id="stslLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a1628" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* === TOP ROCK BLOCK GRADIENT (Pacific Plate style) === */}
            <linearGradient id="stslTopRock" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="20%" stopColor="#78716c" />
              <stop offset="50%" stopColor="#57534e" />
              <stop offset="80%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>

            {/* === BOTTOM ROCK BLOCK GRADIENT (North American Plate style) === */}
            <linearGradient id="stslBottomRock" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#44403c" />
              <stop offset="20%" stopColor="#57534e" />
              <stop offset="50%" stopColor="#78716c" />
              <stop offset="80%" stopColor="#a8a29e" />
              <stop offset="100%" stopColor="#d6d3d1" />
            </linearGradient>

            {/* === ROCK TEXTURE OVERLAY === */}
            <linearGradient id="stslRockTexture" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="25%" stopColor="#000000" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.03" />
              <stop offset="75%" stopColor="#000000" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
            </linearGradient>

            {/* === FAULT LINE GRADIENT (Active) === */}
            <linearGradient id="stslFaultActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="20%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="80%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>

            {/* === FAULT LINE GRADIENT (Slipping - Earthquake) === */}
            <linearGradient id="stslFaultSlip" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="75%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
            </linearGradient>

            {/* === SPRING METAL GRADIENT === */}
            <linearGradient id="stslSpringMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* === SPRING STRESSED GRADIENT === */}
            <linearGradient id="stslSpringStressed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#fca5a5" />
            </linearGradient>

            {/* === FORCE ARROW GRADIENT === */}
            <linearGradient id="stslForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#93c5fd" />
              <stop offset="70%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* === STRESS METER GRADIENT === */}
            <linearGradient id="stslStressMeter" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#84cc16" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* === CONTACT POINT GLOW (Radial) === */}
            <radialGradient id="stslContactGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            {/* === SEISMIC WAVE GLOW (Radial) === */}
            <radialGradient id="stslSeismicGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#fb923c" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#fdba74" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fed7aa" stopOpacity="0" />
            </radialGradient>

            {/* === LOCKED STATE INDICATOR (Radial) === */}
            <radialGradient id="stslLockedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
              <stop offset="40%" stopColor="#16a34a" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#15803d" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#166534" stopOpacity="0" />
            </radialGradient>

            {/* === SLIPPING STATE INDICATOR (Radial) === */}
            <radialGradient id="stslSlippingGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="40%" stopColor="#dc2626" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTER (Gaussian Blur + Merge) === */}
            <filter id="stslGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* === STRONG GLOW FILTER === */}
            <filter id="stslStrongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* === SEISMIC WAVE FILTER === */}
            <filter id="stslWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* === INNER SHADOW FILTER === */}
            <filter id="stslInnerShadow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* === SUBTLE GRID PATTERN === */}
            <pattern id="stslLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* === ROCK GRAIN PATTERN === */}
            <pattern id="stslRockGrain" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.5" fill="#ffffff" opacity="0.05" />
              <circle cx="6" cy="6" r="0.3" fill="#000000" opacity="0.1" />
              <circle cx="4" cy="1" r="0.4" fill="#ffffff" opacity="0.03" />
            </pattern>

            {/* === CARD BACKGROUND GRADIENT === */}
            <linearGradient id="stslCardBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0c1322" />
            </linearGradient>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width="500" height="420" fill="url(#stslLabBg)" />
          <rect width="500" height="420" fill="url(#stslLabGrid)" />

          {/* === TITLE SECTION === */}
          <text x="250" y="28" textAnchor="middle" fill={colors.textPrimary} fontSize="18" fontWeight="bold" letterSpacing="0.5">
            Stick-Slip Fault Model
          </text>
          <text x="250" y="44" textAnchor="middle" fill={colors.textMuted} fontSize="10">
            Tectonic Plate Boundary Cross-Section
          </text>

          {/* === MAIN CROSS-SECTION VIEW === */}
          <g transform="translate(60, 60)">
            {/* Ground surface indicator */}
            <line x1="0" y1="0" x2="320" y2="0" stroke="#475569" strokeWidth="3" />
            <line x1="0" y1="0" x2="320" y2="0" stroke="#64748b" strokeWidth="1" />
            <text x="160" y="-10" textAnchor="middle" fill={colors.textMuted} fontSize="10" fontWeight="600">
              EARTH'S SURFACE
            </text>

            {/* === TOP BLOCK (Pacific Plate - Moving) === */}
            <g transform={`translate(${topBlockOffset + displacement * 0.3}, 0)`}>
              {/* Main rock body with premium gradient */}
              <rect
                x="0"
                y="5"
                width="320"
                height="75"
                fill="url(#stslTopRock)"
                stroke="#78716c"
                strokeWidth="1.5"
                rx="2"
              />
              {/* Texture overlay */}
              <rect x="0" y="5" width="320" height="75" fill="url(#stslRockTexture)" rx="2" />
              <rect x="0" y="5" width="320" height="75" fill="url(#stslRockGrain)" rx="2" />

              {/* Plate label */}
              <rect x="110" y="30" width="100" height="22" fill="rgba(0,0,0,0.4)" rx="4" />
              <text x="160" y="45" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">
                MOVING PLATE
              </text>

              {/* Direction arrow on plate */}
              <path d="M 280,42 L 305,42 L 298,36 M 305,42 L 298,48" fill="none" stroke="#94a3b8" strokeWidth="2" />
            </g>

            {/* === SPRING WITH FORCE INDICATOR === */}
            <g transform={`translate(${-70 + topBlockOffset + displacement * 0.3}, 25)`}>
              {/* Spring anchor block */}
              <rect x="-15" y="5" width="20" height="40" fill="#374151" stroke="#4b5563" strokeWidth="1" rx="3" />
              <text x="-5" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="7">FIXED</text>

              {/* Premium spring coils */}
              <g filter={stressPercent > 70 ? "url(#stslGlowFilter)" : undefined}>
                {Array.from({ length: springCoils }).map((_, i) => {
                  const coilWidth = springCompressedWidth / springCoils;
                  const x = 10 + i * coilWidth;
                  const amplitude = 12;
                  return (
                    <path
                      key={i}
                      d={`M ${x},${25 - amplitude} Q ${x + coilWidth / 2},${25 + amplitude} ${x + coilWidth},${25 - amplitude}`}
                      fill="none"
                      stroke={stressPercent > 70 ? "url(#stslSpringStressed)" : "url(#stslSpringMetal)"}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>

              {/* Force indicator arrow */}
              <g transform={`translate(${springCompressedWidth + 15}, 0)`}>
                <line
                  x1="0"
                  y1="25"
                  x2={20 + drivingForce / 4}
                  y2="25"
                  stroke="url(#stslForceArrow)"
                  strokeWidth="6"
                  filter="url(#stslGlowFilter)"
                />
                <polygon
                  points={`${25 + drivingForce / 4},25 ${15 + drivingForce / 4},18 ${15 + drivingForce / 4},32`}
                  fill="#3b82f6"
                  filter="url(#stslGlowFilter)"
                />
                <text x={(20 + drivingForce / 4) / 2} y="12" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold">
                  F = {(drivingForce / 10).toFixed(1)} kN
                </text>
              </g>

              {/* Stored energy indicator */}
              <text x={springCompressedWidth / 2 + 10} y="55" textAnchor="middle" fill={stressColor} fontSize="8">
                Elastic Energy: {(storedEnergy * 100).toFixed(0)}%
              </text>
            </g>

            {/* === FAULT LINE (The main event!) === */}
            <g filter={isSlipping ? "url(#stslStrongGlow)" : undefined}>
              <line
                x1="-10"
                y1="80"
                x2="330"
                y2="80"
                stroke={isSlipping ? "url(#stslFaultSlip)" : "url(#stslFaultActive)"}
                strokeWidth={isSlipping ? 8 : 4}
                strokeLinecap="round"
              />
              {!isSlipping && (
                <line
                  x1="-10"
                  y1="80"
                  x2="330"
                  y2="80"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="12,8"
                  opacity="0.6"
                />
              )}
            </g>

            {/* === FAULT LINE LABEL === */}
            <rect x="340" y="70" width="80" height="20" fill="rgba(239, 68, 68, 0.2)" rx="4" stroke="#ef4444" strokeWidth="1" />
            <text x="380" y="84" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="600">
              FAULT LINE
            </text>

            {/* === CONTACT POINTS / ASPERITIES === */}
            {!isSlipping && (
              <g>
                {[40, 100, 160, 220, 280].map((x, i) => (
                  <g key={i} transform={`translate(${x}, 80)`}>
                    {/* Asperity glow */}
                    <circle cx="0" cy="0" r="8" fill="url(#stslContactGlow)" />
                    {/* Asperity symbol (interlocking) */}
                    <path
                      d="M -4,-4 L 4,4 M 4,-4 L -4,4"
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                ))}
                <text x="160" y="100" textAnchor="middle" fill="#fbbf24" fontSize="8">
                  Asperities (Contact Points)
                </text>
              </g>
            )}

            {/* === SLIP INDICATOR AND SEISMIC WAVES === */}
            {isSlipping && (
              <g>
                {/* Seismic wave rings */}
                {[0, 1, 2, 3].map(i => {
                  const waveRadius = 15 + i * 25 + (animationTime % 1) * 40;
                  const opacity = 0.6 - i * 0.15;
                  return (
                    <circle
                      key={i}
                      cx="160"
                      cy="80"
                      r={waveRadius}
                      fill="none"
                      stroke="url(#stslFaultSlip)"
                      strokeWidth={3 - i * 0.5}
                      opacity={opacity}
                      filter="url(#stslWaveGlow)"
                    />
                  );
                })}

                {/* EARTHQUAKE label */}
                <rect x="110" y="95" width="100" height="24" fill="rgba(249, 115, 22, 0.3)" rx="6" stroke="#fb923c" strokeWidth="2">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite" />
                </rect>
                <text x="160" y="112" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">
                  SLIP EVENT!
                </text>
              </g>
            )}

            {/* === BOTTOM BLOCK (North American Plate - Stationary) === */}
            <g transform={`translate(${bottomBlockOffset}, 0)`}>
              {/* Main rock body */}
              <rect
                x="0"
                y="85"
                width="320"
                height="75"
                fill="url(#stslBottomRock)"
                stroke="#78716c"
                strokeWidth="1.5"
                rx="2"
              />
              {/* Texture overlay */}
              <rect x="0" y="85" width="320" height="75" fill="url(#stslRockTexture)" rx="2" />
              <rect x="0" y="85" width="320" height="75" fill="url(#stslRockGrain)" rx="2" />

              {/* Plate label */}
              <rect x="110" y="112" width="100" height="22" fill="rgba(0,0,0,0.4)" rx="4" />
              <text x="160" y="127" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">
                FIXED PLATE
              </text>

              {/* Anchor symbols */}
              <g transform="translate(-25, 120)">
                <circle cx="0" cy="0" r="10" fill="#1e293b" stroke="#374151" strokeWidth="2" />
                <path d="M 0,-5 L 0,5 M -4,2 L 0,7 L 4,2" fill="none" stroke="#64748b" strokeWidth="2" />
              </g>
            </g>
          </g>

          {/* === STRESS METER PANEL === */}
          <g transform="translate(20, 240)">
            <rect x="0" y="0" width="220" height="70" fill="url(#stslCardBg)" rx="8" stroke="#334155" strokeWidth="1" />

            {/* Title */}
            <text x="110" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
              STRESS ACCUMULATION
            </text>

            {/* Meter background */}
            <rect x="15" y="28" width="190" height="16" fill="#1e293b" rx="8" stroke="#334155" strokeWidth="1" />

            {/* Meter fill with gradient */}
            <rect
              x="15"
              y="28"
              width={190 * (stressPercent / 100)}
              height="16"
              fill="url(#stslStressMeter)"
              rx="8"
            />

            {/* Threshold marker */}
            <line x1="205" y1="25" x2="205" y2="47" stroke="#ef4444" strokeWidth="2" strokeDasharray="3,2" />
            <text x="205" y="55" textAnchor="middle" fill="#ef4444" fontSize="7">BREAK</text>

            {/* Percentage */}
            <text x="110" y="62" textAnchor="middle" fill={stressColor} fontSize="12" fontWeight="bold">
              {stressPercent.toFixed(0)}% of Threshold
            </text>
          </g>

          {/* === STICK/SLIP STATE INDICATOR === */}
          <g transform="translate(260, 240)">
            <rect x="0" y="0" width="220" height="70" fill="url(#stslCardBg)" rx="8" stroke="#334155" strokeWidth="1" />

            {/* Title */}
            <text x="110" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
              FAULT STATE
            </text>

            {/* State indicator with glow */}
            <g transform="translate(110, 42)">
              <circle
                cx="0"
                cy="0"
                r="16"
                fill={isSlipping ? "url(#stslSlippingGlow)" : "url(#stslLockedGlow)"}
                filter="url(#stslStrongGlow)"
              >
                {isSlipping && (
                  <animate attributeName="r" values="16;20;16" dur="0.2s" repeatCount="indefinite" />
                )}
              </circle>
              <circle
                cx="0"
                cy="0"
                r="10"
                fill={isSlipping ? "#ef4444" : "#22c55e"}
              />
            </g>

            {/* State label */}
            <text x="110" y="68" textAnchor="middle" fill={isSlipping ? "#fca5a5" : "#86efac"} fontSize="12" fontWeight="bold">
              {isSlipping ? "SLIPPING" : "LOCKED (Stick)"}
            </text>

            {/* Friction coefficients */}
            <text x="30" y="42" fill={colors.textMuted} fontSize="8">μs: {staticFriction.toFixed(2)}</text>
            <text x="170" y="42" fill={colors.textMuted} fontSize="8">μk: {kineticFriction.toFixed(2)}</text>
          </g>

          {/* === EARTHQUAKE HISTORY (Seismograph) === */}
          <g transform="translate(20, 320)">
            <rect x="0" y="0" width="460" height="90" fill="url(#stslCardBg)" rx="8" stroke="#334155" strokeWidth="1" />

            {/* Title */}
            <text x="20" y="18" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
              SEISMOGRAPH - Earthquake History
            </text>

            {/* Seismograph baseline */}
            <line x1="20" y1="60" x2="440" y2="60" stroke="#475569" strokeWidth="1" />

            {/* Grid lines */}
            {[0, 1, 2, 3].map(i => (
              <line key={i} x1="20" y1={45 + i * 10} x2="440" y2={45 + i * 10} stroke="#1e293b" strokeWidth="1" />
            ))}

            {/* Earthquake spikes */}
            {slipHistory.map((slip, i) => {
              const x = 40 + i * 42;
              const height = slip.magnitude * 25;
              return (
                <g key={i}>
                  {/* Spike glow */}
                  <line
                    x1={x}
                    y1={60}
                    x2={x}
                    y2={60 - height}
                    stroke="#f97316"
                    strokeWidth="6"
                    opacity="0.3"
                    filter="url(#stslGlowFilter)"
                  />
                  {/* Main spike */}
                  <line
                    x1={x}
                    y1={60}
                    x2={x}
                    y2={60 - height}
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Magnitude label */}
                  <text x={x} y={75} textAnchor="middle" fill={colors.textMuted} fontSize="8">
                    M{slip.magnitude.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {slipHistory.length === 0 && (
              <text x="230" y="58" textAnchor="middle" fill={colors.textMuted} fontSize="11">
                Monitoring... No earthquakes recorded yet
              </text>
            )}

            {/* Y-axis labels */}
            <text x="15" y="38" textAnchor="end" fill={colors.textMuted} fontSize="7">High</text>
            <text x="15" y="63" textAnchor="end" fill={colors.textMuted} fontSize="7">Low</text>
          </g>
        </svg>
      </div>
    );
  };

  // ==================== RENDER CONTROLS ====================
  const renderControls = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      background: colors.bgCard,
      borderRadius: '12px',
      margin: '16px',
    }}>
      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
        🎮 Control the Fault:
      </div>

      {/* Tectonic Driving Force */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🌍 Tectonic Force: {drivingForce}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={drivingForce}
          onChange={(e) => setDrivingForce(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Slow (rare quakes)</span>
          <span>Fast (frequent quakes)</span>
        </div>
      </div>

      {/* Friction Strength */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🔒 Friction Strength: {frictionStrength}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={frictionStrength}
          onChange={(e) => setFrictionStrength(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Weak (smaller quakes)</span>
          <span>Strong (bigger quakes)</span>
        </div>
      </div>

      {/* Surface Roughness */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Surface Roughness: {surfaceRoughness}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={surfaceRoughness}
          onChange={(e) => setSurfaceRoughness(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Smooth</span>
          <span>Rough</span>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={() => {
          setStress(0);
          setSlipHistory([]);
          setDisplacement(0);
        }}
        style={{
          padding: '10px',
          background: 'rgba(71, 85, 105, 0.5)',
          border: 'none',
          borderRadius: '8px',
          color: colors.textPrimary,
          cursor: 'pointer',
        }}
      >
        🔄 Reset Simulation
      </button>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'weak', text: 'The friction is always constant during an earthquake' },
    { id: 'stronger', text: 'More friction = smaller earthquakes because energy can\'t build up' },
    { id: 'threshold', text: 'Friction keeps plates locked until stress exceeds a threshold, then suddenly releases', correct: true },
    { id: 'none', text: 'Friction doesn\'t affect earthquakes at all' },
  ];

  const twistPredictions = [
    { id: 'random', text: 'They\'re completely random and unpredictable' },
    { id: 'regular', text: 'They follow a regular schedule like clockwork' },
    { id: 'pattern', text: 'They follow statistical patterns but timing of individual quakes is unpredictable', correct: true },
    { id: 'seasonal', text: 'They happen more during certain seasons' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What is the difference between static and kinetic friction?',
      options: [
        { id: 'a', text: 'They\'re the same thing' },
        { id: 'b', text: 'Static friction prevents motion; kinetic friction opposes existing motion', correct: true },
        { id: 'c', text: 'Static friction only applies to earthquakes' },
        { id: 'd', text: 'Kinetic friction is always greater' },
      ],
    },
    {
      id: 2,
      question: 'Why does the stress suddenly drop during an earthquake?',
      options: [
        { id: 'a', text: 'The rocks melt' },
        { id: 'b', text: 'Gravity decreases momentarily' },
        { id: 'c', text: 'Static friction breaks and kinetic friction is lower', correct: true },
        { id: 'd', text: 'The plates stop moving' },
      ],
    },
    {
      id: 3,
      question: 'What determines the magnitude of an earthquake?',
      options: [
        { id: 'a', text: 'Only the depth of the fault' },
        { id: 'b', text: 'The amount of stored elastic energy released', correct: true },
        { id: 'c', text: 'The time of day' },
        { id: 'd', text: 'The color of the rocks' },
      ],
    },
    {
      id: 4,
      question: 'Why do faults that have been quiet for a long time often produce larger earthquakes?',
      options: [
        { id: 'a', text: 'They don\'t - quiet faults produce smaller quakes' },
        { id: 'b', text: 'More time to accumulate stress = more energy to release', correct: true },
        { id: 'c', text: 'The rocks get harder over time' },
        { id: 'd', text: 'It\'s just random chance' },
      ],
    },
    {
      id: 5,
      question: 'What everyday phenomenon also demonstrates stick-slip friction?',
      options: [
        { id: 'a', text: 'A squeaking door hinge', correct: true },
        { id: 'b', text: 'Boiling water' },
        { id: 'c', text: 'Light bulb turning on' },
        { id: 'd', text: 'Radio waves' },
      ],
    },
    {
      id: 6,
      question: 'In the stick-slip cycle, what happens during the "stick" phase?',
      options: [
        { id: 'a', text: 'The fault is moving smoothly' },
        { id: 'b', text: 'Elastic strain energy is building up', correct: true },
        { id: 'c', text: 'An earthquake is occurring' },
        { id: 'd', text: 'The plates are moving apart' },
      ],
    },
    {
      id: 7,
      question: 'Why can\'t we predict exactly when an earthquake will occur?',
      options: [
        { id: 'a', text: 'We don\'t try to predict them' },
        { id: 'b', text: 'The breaking threshold varies and depends on microscopic details we can\'t measure', correct: true },
        { id: 'c', text: 'Earthquakes are caused by aliens' },
        { id: 'd', text: 'Technology isn\'t advanced enough to detect faults' },
      ],
    },
    {
      id: 8,
      question: 'How does a violin bow create sound using stick-slip friction?',
      options: [
        { id: 'a', text: 'It doesn\'t involve friction' },
        { id: 'b', text: 'Continuous smooth sliding vibrates the string' },
        { id: 'c', text: 'Repeated stick-slip cycles vibrate the string at audio frequencies', correct: true },
        { id: 'd', text: 'The bow hits the string like a drum' },
      ],
    },
    {
      id: 9,
      question: 'What is the role of asperities (bumps) on fault surfaces?',
      options: [
        { id: 'a', text: 'They have no effect' },
        { id: 'b', text: 'They smooth out over time' },
        { id: 'c', text: 'They interlock and resist sliding until they break', correct: true },
        { id: 'd', text: 'They cause the earth to heat up' },
      ],
    },
    {
      id: 10,
      question: 'If you could reduce the friction on a fault, what would likely happen?',
      options: [
        { id: 'a', text: 'Larger but less frequent earthquakes' },
        { id: 'b', text: 'More frequent but smaller earthquakes or smooth creeping', correct: true },
        { id: 'c', text: 'No change in earthquake patterns' },
        { id: 'd', text: 'The fault would stop completely' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '🎻 Violin Bowing',
      description: 'A violin bow creates sound through thousands of tiny stick-slip events per second! Rosin increases friction so the bow "sticks" to the string, then releases, vibrating the string at audible frequencies.',
      insight: 'Professional violinists control the speed and pressure to vary the stick-slip frequency - that\'s how they play different notes and dynamics.',
    },
    {
      id: 1,
      title: '🚗 Brake Squeal',
      description: 'That annoying squeal from car brakes is stick-slip friction between the brake pad and rotor. The pad catches, releases, catches, releases - thousands of times per second, creating high-pitched sound.',
      insight: 'Engineers design brake pads with specific materials to minimize stick-slip and prevent squealing while maintaining stopping power.',
    },
    {
      id: 2,
      title: '🚪 Squeaky Hinges',
      description: 'A squeaky door hinge demonstrates stick-slip perfectly. The metal surfaces catch and release, creating that characteristic sound. Oil smooths the motion, eliminating the stick-slip cycle.',
      insight: 'The squeak frequency tells you about the friction coefficient and contact pressure - you can "tune" a squeak by changing the door\'s weight!',
    },
    {
      id: 3,
      title: '🏔️ Induced Seismicity',
      description: 'Injecting fluids into the ground (for wastewater disposal or fracking) can trigger earthquakes by reducing friction on faults. Understanding stick-slip helps predict and manage this risk.',
      insight: 'The 2011 Prague, Oklahoma earthquake (M 5.7) was likely triggered by wastewater injection - showing how changing friction can release stored tectonic stress.',
    },
  ];

  // ==================== BOTTOM BAR RENDERER ====================
  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 20px',
      background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      zIndex: 1000,
    }}>
      {showButton && (
        <button
          onClick={() => onPhaseComplete?.()}
          disabled={!buttonEnabled}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: buttonEnabled
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '12px',
            color: buttonEnabled ? colors.textPrimary : colors.textMuted,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: buttonEnabled ? 'pointer' : 'not-allowed',
            opacity: buttonEnabled ? 1 : 0.5,
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              ⚡ The Earth's Stutter
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 111: Stick-Slip Earthquakes
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '20px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>
                🤯 Try This: Run Your Finger Across Glass
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Press your finger on a window and drag it slowly. Feel that stuttering vibration?
                Hear the squeak? That's <strong style={{ color: colors.fault }}>stick-slip friction</strong>
                - the exact same physics that causes earthquakes!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
                Same Physics, <span style={{ color: colors.accent }}>Different Scale</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                From squeaky door hinges to violin music to devastating earthquakes - they're all
                caused by friction that "sticks" until stress builds up, then suddenly "slips"
                and releases energy.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore! →")}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* 1. STATIC GRAPHIC FIRST */}
          {renderVisualization(false)}

          {/* 2. WHAT YOU'RE LOOKING AT */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📋 What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              This is a <strong>cross-section of a fault line</strong>. The top rock block is being
              pushed by tectonic forces (the driving force). Friction along the
              <span style={{ color: colors.fault }}> red fault line</span> resists motion. The
              <span style={{ color: colors.stored }}> spring</span> represents elastic strain energy
              building up in the rocks.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              <strong>μ (mu)</strong> is the friction coefficient. Static μ keeps things locked;
              kinetic μ applies once sliding begins.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 How does friction relate to earthquakes?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrediction(p.id);
                    onPredictionMade?.(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #f87171' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Create Your Own Earthquakes!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust parameters and watch the fault behavior
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              🎯 Try These Experiments:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>High driving force → frequent smaller quakes</li>
              <li>High friction → rare but larger quakes</li>
              <li>Watch the stress meter build up between slips</li>
              <li>Notice: kinetic friction {"<"} static friction</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See What I Learned →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '💡'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Excellent Understanding!' : 'Interesting Thinking!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📚 The Physics Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              <strong style={{ color: colors.stressLow }}>Static friction</strong> is like a lock -
              it keeps the fault plates stuck together while elastic strain energy builds up in
              the surrounding rock. When the stress exceeds the friction threshold...
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              <strong style={{ color: colors.released }}>SNAP!</strong> The fault breaks loose.
              But here's the key: <strong style={{ color: colors.accent }}>kinetic friction is
              lower than static friction</strong>. Once sliding starts, it takes less force to
              keep it going. This allows rapid, violent slip - an earthquake!
            </p>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                The earthquake magnitude depends on how much elastic energy was stored before
                the slip. Longer quiet periods = more stored energy = bigger potential earthquake.
              </p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🔄 The Stick-Slip Cycle:
            </h3>
            <ol style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li><strong>STICK:</strong> Plates lock, stress builds</li>
              <li><strong>BUILD:</strong> Elastic strain energy accumulates</li>
              <li><strong>BREAK:</strong> Stress exceeds static friction</li>
              <li><strong>SLIP:</strong> Rapid motion, energy released</li>
              <li><strong>STOP:</strong> Kinetic friction slows motion</li>
              <li><strong>REPEAT:</strong> Plates re-lock, cycle begins again</li>
            </ol>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              🌀 Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Can we predict earthquakes?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🔮 The Prediction Problem:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              If earthquakes follow a physical mechanism (stick-slip), shouldn't we be able to
              predict exactly when they'll occur? We know stress is building. We know where the
              faults are. So why can't seismologists predict earthquakes?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Why can't we predict exactly when earthquakes occur?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: twistPrediction === p.id
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: twistPrediction === p.id ? '2px solid #fbbf24' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Learn The Truth →')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Exploring Predictability
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch the earthquake timing patterns
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              💡 Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Watch the earthquake history - is timing regular?</li>
              <li>Notice the slight variation in magnitude</li>
              <li>The threshold varies slightly each time</li>
              <li>We know roughly when, but not exactly when</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See The Full Picture →')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '🤯'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Scientific Insight!' : 'The Prediction Paradox!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🎲 Statistical Patterns, Not Schedules:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Earthquakes follow statistical patterns - we can say things like "there's a 30%
              chance of a major earthquake in the next 30 years." But the <strong style={{ color: colors.warning }}>
              exact timing</strong> is unpredictable because:
            </p>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li>Fault surfaces have microscopic variations</li>
              <li>Stress isn't perfectly uniform</li>
              <li>Small earthquakes can trigger (or delay) larger ones</li>
              <li>We can't directly measure stress deep underground</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🏆 What We CAN Predict:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              • <strong>Where:</strong> We know fault locations well<br />
              • <strong>How big (maximum):</strong> Fault length limits magnitude<br />
              • <strong>Probability:</strong> Statistical likelihood over decades<br />
              • <strong>After first shake:</strong> Aftershock patterns are more predictable
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore all {transferApplications.length} applications to continue
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
            }}>
              {transferApplications.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: transferCompleted.has(i) ? colors.success : 'rgba(71, 85, 105, 0.5)',
                  }}
                />
              ))}
            </div>
          </div>

          {transferApplications.map((app) => (
            <div
              key={app.id}
              onClick={() => {
                setTransferCompleted(prev => new Set([...prev, app.id]));
              }}
              style={{
                background: transferCompleted.has(app.id)
                  ? 'rgba(16, 185, 129, 0.1)'
                  : colors.bgCard,
                border: transferCompleted.has(app.id)
                  ? '2px solid rgba(16, 185, 129, 0.3)'
                  : '2px solid transparent',
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '18px' }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>
                  💡 {app.insight}
                </p>
              </div>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => {
        const correctOption = q.options.find(o => o.correct);
        return testAnswers[q.id] === correctOption?.id;
      }).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '🏆' : score >= 60 ? '📚' : '💪'}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
                {correctCount} of {testQuestions.length} correct
              </p>
            </div>

            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const userAnswer = testAnswers[q.id];
              const isCorrect = userAnswer === correctOption?.id;

              return (
                <div
                  key={q.id}
                  style={{
                    background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    margin: '12px 16px',
                    padding: '14px',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                      Q{idx + 1}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0' }}>
                    {q.question}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: colors.success, fontSize: '11px', margin: 0 }}>
                      Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Complete! 🎉' : 'Review & Continue →')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              📝 Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {answeredCount} of {testQuestions.length} answered
            </p>
          </div>

          {testQuestions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                background: colors.bgCard,
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                {idx + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: option.id }))}
                    style={{
                      padding: '10px 14px',
                      background: testAnswers[q.id] === option.id
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(239, 68, 68, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: colors.textSecondary,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {allAnswered ? (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            zIndex: 1000,
          }}>
            <button
              onClick={() => setTestSubmitted(true)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none',
                borderRadius: '12px',
                color: colors.textPrimary,
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        ) : (
          renderBottomBar(false, false, '')
        )}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Seismology Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered earthquake physics
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>
              🎓 What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Static friction locks faults until threshold</li>
              <li>Kinetic friction {"<"} static friction = sudden slip</li>
              <li>Longer quiet periods = more stored energy</li>
              <li>Same physics: earthquakes to violin music</li>
              <li>Statistical prediction possible, exact timing isn't</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              🚀 Feel It Around You:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Run your finger across a window pane, listen to a squeaky door, or watch a violin
              bow - you're now seeing the same stick-slip physics that shapes our planet's
              surface! Next time you hear about an earthquake, you'll understand the fundamental
              mechanism that caused it.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ color: colors.textSecondary }}>Loading phase: {phase}...</p>
    </div>
  );
};

export default StickSlipRenderer;
