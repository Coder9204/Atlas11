import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// GAME 109: BOTTLE TORNADO (VORTEX)
// The water vortex when draining a spinning bottle
// Demonstrates angular momentum conservation and vortex dynamics
// ============================================================================

interface BottleTornadoRendererProps {
  phase?: string;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette with proper contrast
const colors = {
  // Text colors - HIGH CONTRAST
  textPrimary: '#ffffff',  // Pure white for maximum contrast
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Water colors
  water: '#38bdf8',
  waterDeep: '#0284c7',
  waterLight: '#7dd3fc',
  waterBubble: '#bae6fd',

  // Vortex colors
  vortexCore: '#1e3a8a',
  vortexEdge: '#60a5fa',
  vortexHighlight: '#93c5fd',

  // Bottle colors
  bottle: 'rgba(200, 220, 255, 0.3)',
  bottleEdge: 'rgba(200, 220, 255, 0.6)',

  // Air colors
  airCore: 'rgba(255, 255, 255, 0.1)',

  // UI colors
  accent: '#22d3ee',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Phase sequence for navigation
const PHASE_SEQUENCE = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const BottleTornadoRenderer: React.FC<BottleTornadoRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // Internal phase management - default to 'hook'
  const [internalPhase, setInternalPhase] = useState('hook');

  // Determine effective phase: prop takes precedence, then internal state
  const effectivePhase = phaseProp || gamePhase || internalPhase;
  const phase = PHASE_SEQUENCE.includes(effectivePhase) ? effectivePhase : 'hook';
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

  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [spinSpeed, setSpinSpeed] = useState(40); // 0-100
  const [bottleAngle, setBottleAngle] = useState(180); // 180 = upside down
  const [neckWidth, setNeckWidth] = useState(50); // 0-100

  // Simulation state
  const [waterLevel, setWaterLevel] = useState(100);
  const [isDraining, setIsDraining] = useState(false);

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateVortexStrength = useCallback(() => {
    // Vortex forms when angular momentum is conserved as water drains
    // Stronger vortex with more spin and narrower neck
    const spinFactor = spinSpeed / 100;
    const neckFactor = 1 - (neckWidth / 200); // Narrower = stronger
    const vortexStrength = spinFactor * (1 + neckFactor);
    return Math.min(1, vortexStrength);
  }, [spinSpeed, neckWidth]);

  const calculateDrainRate = useCallback(() => {
    // With vortex: air enters through center, water drains faster
    // Without vortex: water and air compete at opening = slower
    const vortexStrength = calculateVortexStrength();
    const baseRate = 0.3; // Without vortex
    const vortexBonus = vortexStrength * 0.5;
    const angleEffect = Math.sin((bottleAngle * Math.PI) / 180);

    return baseRate + vortexBonus * angleEffect;
  }, [calculateVortexStrength, bottleAngle]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);

      if (isDraining && waterLevel > 0) {
        const drainRate = calculateDrainRate();
        setWaterLevel(prev => Math.max(0, prev - drainRate));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, isDraining, calculateDrainRate, waterLevel]);

  // Reset water for demonstration
  const resetWater = () => {
    setWaterLevel(100);
    setIsDraining(false);
  };

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const vortexStrength = calculateVortexStrength();
    const drainRate = calculateDrainRate();

    // Vortex core radius (air column in center)
    const coreRadius = 5 + vortexStrength * 15;

    // Calculate bottle rotation
    const bottleRotation = bottleAngle - 180;

    // Generate vortex velocity profile curve (>= 10 L points, space-separated)
    // Shows tangential velocity vs radius from center
    const velocityCurvePoints: string[] = [];
    const curveSteps = 20;
    for (let i = 0; i <= curveSteps; i++) {
      const t = i / curveSteps;
      const cx = 20 + t * 140;
      const radiusFraction = t;
      const velocity = radiusFraction < 0.05
        ? 0
        : vortexStrength * (1 / (radiusFraction + 0.1)) * 0.15;
      const cy = 250 - Math.min(velocity, 1) * 180;
      velocityCurvePoints.push(`${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`);
    }

    // Interactive marker position on the curve (tracks spinSpeed)
    const markerFrac = spinSpeed / 100;
    const markerX = 20 + 0.3 * 140; // fixed x position near center
    const markerRadiusFrac = 0.3;
    const markerVelocity = (spinSpeed / 100) * (1 / (markerRadiusFrac + 0.1)) * 0.15;
    const markerY = 250 - Math.min(markerVelocity, 1) * 180;

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 380"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
          data-spin-speed={spinSpeed}
          data-neck-width={neckWidth}
          data-bottle-angle={bottleAngle}
          data-vortex-strength={vortexStrength.toFixed(2)}
        >
          <defs>
            {/* Water gradient */}
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.waterLight} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.waterDeep} stopOpacity="0.9" />
            </linearGradient>

            {/* Bottle gradient */}
            <linearGradient id="bottleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.bottleEdge} />
              <stop offset="50%" stopColor={colors.bottle} />
              <stop offset="100%" stopColor={colors.bottleEdge} />
            </linearGradient>

            {/* Filter for interactive marker */}
            <filter id="markerGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines for visual reference (dashed) */}
          <line x1="20" y1="70" x2="160" y2="70" stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />
          <line x1="20" y1="130" x2="160" y2="130" stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />
          <line x1="20" y1="190" x2="160" y2="190" stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />
          <line x1="20" y1="250" x2="160" y2="250" stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />

          {/* Title */}
          <text x="90" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">
            Velocity Profile
          </text>

          {/* Axis labels */}
          <text x="90" y="36" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            v = L / (r + r0) - current vs reference
          </text>

          {/* Velocity profile curve with >= 10 L points */}
          <path
            d={velocityCurvePoints.join(' ')}
            fill="none"
            stroke={colors.accent}
            strokeWidth="2.5"
          />

          {/* Interactive marker circle - moves vertically with spinSpeed */}
          <circle
            cx={markerX}
            cy={markerY}
            r={8}
            fill={colors.accent}
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#markerGlow)"
          />

          {/* Axis endpoint labels */}
          <text x="20" y="268" fill={colors.textMuted} fontSize="11">
            Center
          </text>
          <text x="160" y="268" textAnchor="end" fill={colors.textMuted} fontSize="11">
            Edge
          </text>

          {/* Bottle container (right side, rotated) */}
          <g transform={`rotate(${bottleRotation}, 300, 170)`}>
            <path
              d="M 250,50 L 350,50 L 350,200 Q 350,220 330,220 L 330,280 Q 330,290 300,290 Q 270,290 270,280 L 270,220 Q 250,220 250,200 Z"
              fill="url(#bottleGradient)"
              stroke={colors.bottleEdge}
              strokeWidth="2"
            />

            {/* Water level inside bottle */}
            <rect
              x="250"
              y={50 + (100 - waterLevel) * 2.4}
              width="100"
              height={waterLevel * 2.4}
              fill="url(#waterGradient)"
              opacity="0.7"
            />

            {/* Neck opening indicator */}
            <ellipse
              cx="300"
              cy="290"
              rx={10 + neckWidth / 10}
              ry="3"
              fill={colors.bottleEdge}
            />
          </g>

          {/* Bottle label */}
          <text x="300" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">
            Bottle Tornado
          </text>

          {/* Info panel - bottom area */}
          <g>
            <rect x="10" y="300" width="180" height="70" fill={colors.bgCard} rx="6" />
            <text x="20" y="320" fill={colors.textMuted} fontSize="11">Vortex Strength:</text>
            <rect x="20" y="326" width="150" height="6" fill="rgba(71, 85, 105, 0.5)" rx="3" />
            <rect x="20" y="326" width={150 * vortexStrength} height="6" fill={colors.accent} rx="3" />
            <text x="20" y="350" fill={colors.textMuted} fontSize="11">Drain Rate:</text>
            <text x="20" y="365" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
              {(drainRate * 100).toFixed(0)}%
            </text>
          </g>

          {/* Water level indicator */}
          <g>
            <rect x="200" y="300" width="70" height="70" fill={colors.bgCard} rx="6" />
            <text x="235" y="320" textAnchor="middle" fill={colors.textMuted} fontSize="11">Water</text>
            <rect x="215" y="326" width="40" height="30" fill="rgba(71, 85, 105, 0.5)" rx="3" />
            <rect
              x="215"
              y={326 + (100 - waterLevel) * 0.3}
              width="40"
              height={waterLevel * 0.3}
              fill={colors.water}
              rx="3"
            />
            <text x="235" y="365" textAnchor="middle" fill={colors.textPrimary} fontSize="11">
              {Math.round(waterLevel)}%
            </text>
          </g>

          {/* Physics state */}
          <g>
            <rect x="280" y="300" width="110" height="70" fill={colors.bgCard} rx="6" />
            <text x="335" y="320" textAnchor="middle" fill={colors.textMuted} fontSize="11">State</text>
            <text x="335" y="345" textAnchor="middle" fill={vortexStrength > 0.3 ? colors.success : colors.warning} fontSize="12" fontWeight="bold">
              {vortexStrength > 0.3 ? 'Vortex' : 'Glugging'}
            </text>
            <text x="335" y="365" textAnchor="middle" fill={colors.textPrimary} fontSize="11">
              {(vortexStrength * 100).toFixed(0)}% strength
            </text>
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
      boxShadow: '0 4px 20px rgba(34, 211, 238, 0.15)',
    }}>
      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
        🎮 Control the Tornado:
      </div>

      {/* Drain Button */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => {
            if (waterLevel <= 5) {
              resetWater();
            } else {
              setIsDraining(!isDraining);
            }
          }}
          style={{
            flex: 1,
            padding: '14px',
            background: isDraining
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #22d3ee, #06b6d4)',
            border: 'none',
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {waterLevel <= 5 ? '🔄 Refill' : isDraining ? '⏸️ Pause' : '▶️ Start Draining'}
        </button>
      </div>

      {/* Spin Speed Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
            Spin Speed
          </label>
          <span style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>
            {spinSpeed}%
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: colors.textMuted, fontSize: '11px', marginBottom: '4px' }}>Spin Speed: {spinSpeed}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={spinSpeed}
            onChange={(e) => setSpinSpeed(Number(e.target.value))}
            style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#3b82f6' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>No Spin (glugging)</span>
          <span>Fast Spin (vortex!)</span>
        </div>
      </div>

      {/* Bottle Angle Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Bottle Angle: {bottleAngle}°
        </label>
        <input
          type="range"
          min="90"
          max="180"
          value={bottleAngle}
          onChange={(e) => setBottleAngle(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#3b82f6' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Sideways (90°)</span>
          <span>Upside Down (180°)</span>
        </div>
      </div>

      {/* Neck Width Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          ⚪ Neck Opening: {neckWidth}%
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={neckWidth}
          onChange={(e) => setNeckWidth(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#3b82f6' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Narrow</span>
          <span>Wide</span>
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'faster', text: 'The spinning water drains FASTER', correct: true },
    { id: 'slower', text: 'The spinning water drains SLOWER' },
    { id: 'same', text: 'Same speed, spinning makes no difference' },
    { id: 'stops', text: 'The spin prevents draining entirely' },
  ];

  const twistPredictions = [
    { id: 'clockwise', text: 'Yes - clockwise in the Northern Hemisphere' },
    { id: 'counter', text: 'Yes - counter-clockwise in the Northern Hemisphere' },
    { id: 'depends', text: 'It depends on the initial motion you give it', correct: true },
    { id: 'random', text: 'It spins randomly every time' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'Why does a spinning vortex help water drain faster?',
      options: [
        { id: 'a', text: 'The spin pushes water down harder' },
        { id: 'b', text: 'Air enters through the center while water exits around it', correct: true },
        { id: 'c', text: 'The vortex creates suction' },
        { id: 'd', text: 'Centrifugal force increases gravity' },
      ],
    },
    {
      id: 2,
      question: 'What physical principle keeps the vortex spinning?',
      options: [
        { id: 'a', text: 'Gravity' },
        { id: 'b', text: 'Conservation of angular momentum', correct: true },
        { id: 'c', text: 'Magnetic fields' },
        { id: 'd', text: 'Air pressure' },
      ],
    },
    {
      id: 3,
      question: 'What happens when you try to drain without any spin?',
      options: [
        { id: 'a', text: 'Water drains faster' },
        { id: 'b', text: 'The bottle explodes' },
        { id: 'c', text: 'Air and water compete at the opening, causing glugging', correct: true },
        { id: 'd', text: 'Nothing - water won\'t drain' },
      ],
    },
    {
      id: 4,
      question: 'As water spirals toward the center of the vortex, what happens to its speed?',
      options: [
        { id: 'a', text: 'It slows down' },
        { id: 'b', text: 'It speeds up (angular momentum conservation)', correct: true },
        { id: 'c', text: 'Speed stays constant' },
        { id: 'd', text: 'Speed becomes zero' },
      ],
    },
    {
      id: 5,
      question: 'Does the Coriolis effect determine which way bathtub water spins?',
      options: [
        { id: 'a', text: 'Yes - clockwise in Northern Hemisphere' },
        { id: 'b', text: 'Yes - counter-clockwise in Northern Hemisphere' },
        { id: 'c', text: 'No - at small scales, initial conditions dominate', correct: true },
        { id: 'd', text: 'Only near the equator' },
      ],
    },
    {
      id: 6,
      question: 'How does a narrower bottle neck affect the vortex?',
      options: [
        { id: 'a', text: 'Weakens the vortex' },
        { id: 'b', text: 'Strengthens the vortex (water spins faster)', correct: true },
        { id: 'c', text: 'No effect' },
        { id: 'd', text: 'Prevents vortex formation' },
      ],
    },
    {
      id: 7,
      question: 'What creates the characteristic funnel shape of the vortex?',
      options: [
        { id: 'a', text: 'The shape of the bottle' },
        { id: 'b', text: 'Air pressure is lower in the fast-spinning center', correct: true },
        { id: 'c', text: 'Water is heavier at the edges' },
        { id: 'd', text: 'Magnetic forces' },
      ],
    },
    {
      id: 8,
      question: 'Why do ice skaters spin faster when they pull their arms in?',
      options: [
        { id: 'a', text: 'Less air resistance' },
        { id: 'b', text: 'They push harder against the ice' },
        { id: 'c', text: 'Conservation of angular momentum - smaller radius = faster spin', correct: true },
        { id: 'd', text: 'They become lighter' },
      ],
    },
    {
      id: 9,
      question: 'Where is the water moving FASTEST in the vortex?',
      options: [
        { id: 'a', text: 'At the outer edge' },
        { id: 'b', text: 'Near the center of the funnel', correct: true },
        { id: 'c', text: 'At the top of the bottle' },
        { id: 'd', text: 'Speed is the same everywhere' },
      ],
    },
    {
      id: 10,
      question: 'Real tornadoes and the bottle vortex share which property?',
      options: [
        { id: 'a', text: 'Both are caused by the Coriolis effect' },
        { id: 'b', text: 'Both have low pressure cores with inward-spiraling flow', correct: true },
        { id: 'c', text: 'Both rotate the same direction' },
        { id: 'd', text: 'Both require water' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '🌪️ Real Tornadoes',
      description: 'Tornadoes form when rotating air stretches vertically. Just like the bottle vortex speeds up as water moves inward, tornado winds accelerate as air spirals toward the low-pressure core.',
      insight: 'The same angular momentum conservation that makes your bottle drain faster creates 300 mph tornado winds.',
      stats: '300 mph winds, 1,200+ tornadoes/year in US, 100x faster rotation than bottle',
    },
    {
      id: 1,
      title: '⛸️ Figure Skating Spins',
      description: 'When skaters pull their arms in during a spin, they rotate faster - same principle as water accelerating toward the vortex center. This is conservation of angular momentum in action.',
      insight: 'A skater can go from 2 rotations per second to over 6 just by changing arm position!',
      stats: '2 to 6 rotations/sec, 3x speed increase, 90% arm pull for max spin',
    },
    {
      id: 2,
      title: '🛁 Bathtub Drains',
      description: 'The famous question: does water always drain clockwise/counter-clockwise based on hemisphere? At household scales, the Coriolis effect is negligible - initial conditions and drain shape dominate.',
      insight: 'You\'d need a perfectly still, symmetric drain and hours of waiting for Coriolis to matter. Your hand motion determines the spin!',
      stats: '0.00001g Coriolis force, 10,000x weaker than hand motion, 0% effect at sink scale',
    },
    {
      id: 3,
      title: '🌀 Centrifugal Separators',
      description: 'Industrial centrifuges use vortex principles to separate materials. In cream separators, cyclone dust collectors, and blood centrifuges, spinning creates density-based separation.',
      insight: 'The same physics that makes your bottle drain faster is used to separate uranium isotopes in enrichment facilities.',
      stats: '10,000g force in centrifuges, 99% separation efficiency, 50% energy savings',
    },
  ];

  // ==================== REAL-WORLD APPLICATIONS ====================
  const realWorldApps = [
    {
      icon: '🌀',
      title: 'Cyclone Dust Separators',
      short: 'Industrial Filtration',
      tagline: 'Spinning air cleans itself',
      description: 'Cyclone separators use vortex physics to remove dust and particles from air streams without filters. Dirty air enters tangentially, creating a powerful vortex that flings heavier particles to the walls while clean air exits through the center.',
      connection: 'The same vortex dynamics that create the bottle tornado funnel are used to separate particles by density. Heavy particles spiral outward while lighter air escapes through the low-pressure center.',
      howItWorks: 'Air enters the cylindrical chamber at high speed tangentially, creating a spinning vortex. Centrifugal forces push heavier dust particles to the outer walls where they spiral down and collect. Clean air, being lighter, moves to the low-pressure center and exits upward through a central tube.',
      stats: [
        { value: '99%', label: 'Particle removal efficiency', icon: '✨' },
        { value: '10,000+', label: 'Operating hours without maintenance', icon: '⚙️' },
        { value: '50%', label: 'Energy savings vs. bag filters', icon: '⚡' },
      ],
      examples: [
        'Dyson vacuum cleaners',
        'Sawdust collection in woodshops',
        'Cement plant dust control',
        'Grain elevator air cleaning',
      ],
      companies: ['Dyson', 'Donaldson', 'AAF International', 'Camfil', 'Nederman'],
      futureImpact: 'Next-generation cyclone separators with AI-optimized geometries could achieve near-perfect particle capture while using 70% less energy, revolutionizing air quality in factories and cities.',
      color: '#06b6d4',
    },
    {
      icon: '🌪️',
      title: 'Tornado Research and Prediction',
      short: 'Weather Forecasting',
      tagline: 'Understanding nature\'s most violent storms',
      description: 'Meteorologists study vortex dynamics to predict tornado formation and intensity. By understanding how rotating air columns intensify through angular momentum conservation, they can issue earlier and more accurate warnings.',
      connection: 'Tornadoes are massive versions of the bottle vortex. As rotating air is stretched vertically, it spins faster due to angular momentum conservation - the same principle that makes water accelerate toward the drain.',
      howItWorks: 'Supercell thunderstorms create rotating updrafts called mesocyclones. When this rotating air is stretched vertically by the storm\'s updraft, it intensifies dramatically. Doppler radar detects the rotation velocity, while computer models simulate vortex dynamics to predict tornado formation.',
      stats: [
        { value: '13 min', label: 'Average warning lead time', icon: '⏱️' },
        { value: '300 mph', label: 'Maximum recorded wind speed', icon: '💨' },
        { value: '75%', label: 'Detection rate with modern radar', icon: '📡' },
      ],
      examples: [
        'Doppler radar velocity analysis',
        'Storm chaser research vehicles',
        'Tornado wind tunnel experiments',
        'Numerical weather prediction models',
      ],
      companies: ['NOAA', 'National Weather Service', 'NCAR', 'Vaisala', 'Baron Weather'],
      futureImpact: 'Phased-array radar systems and machine learning could extend tornado warning times to 30+ minutes, potentially saving thousands of lives annually through earlier evacuations.',
      color: '#8b5cf6',
    },
    {
      icon: '❄️',
      title: 'Vortex Tubes for Cooling',
      short: 'Industrial Cooling',
      tagline: 'Cold air from a spinning tube',
      description: 'Vortex tubes use compressed air to produce extreme cold without refrigerants or moving parts. Compressed air entering tangentially creates a vortex that separates into hot and cold streams through angular momentum effects.',
      connection: 'The Ranque-Hilsch vortex tube exploits the same rotational physics as the bottle tornado. Fast-spinning air in the center becomes cold while slower outer air becomes hot, creating temperature separation without any refrigeration.',
      howItWorks: 'Compressed air enters a cylindrical chamber tangentially at high velocity, creating an intense vortex. The outer layers slow down and heat up from friction with the walls, while the inner core accelerates and cools dramatically. A valve separates the hot outer flow from the cold inner flow.',
      stats: [
        { value: '-50°C', label: 'Minimum achievable temperature', icon: '🥶' },
        { value: '100°C', label: 'Temperature differential possible', icon: '🌡️' },
        { value: '0', label: 'Moving parts required', icon: '🔧' },
      ],
      examples: [
        'CNC machine tool cooling',
        'Electronic enclosure cooling',
        'Laboratory sample cooling',
        'Plastic injection mold cooling',
      ],
      companies: ['Vortec', 'Exair', 'ITW Vortec', 'Nex Flow', 'Meech'],
      futureImpact: 'Vortex tube technology could enable portable, eco-friendly cooling systems for remote locations and developing nations, providing refrigeration without electricity or harmful refrigerants.',
      color: '#0ea5e9',
    },
    {
      icon: '⛏️',
      title: 'Hydrocyclones in Mining',
      short: 'Mineral Separation',
      tagline: 'Spinning slurry reveals treasure',
      description: 'Hydrocyclones use vortex action to separate valuable minerals from waste rock in water slurries. Heavy mineral particles spiral outward while lighter material exits through the center, enabling efficient ore processing.',
      connection: 'Like water spiraling in the bottle tornado, mineral slurries in hydrocyclones experience centrifugal separation. Dense particles move outward in the vortex while lighter particles follow the low-pressure core upward.',
      howItWorks: 'Mineral-laden water enters the conical hydrocyclone tangentially, creating a powerful vortex. Centrifugal forces thousands of times stronger than gravity push heavy ore particles to the walls, where they spiral down to the underflow. Lighter gangue material moves to the center and exits through the overflow at the top.',
      stats: [
        { value: '3000g', label: 'Centrifugal force generated', icon: '💫' },
        { value: '10μm', label: 'Minimum particle size separated', icon: '🔬' },
        { value: '500+', label: 'Tons per hour throughput', icon: '⚖️' },
      ],
      examples: [
        'Gold ore concentration',
        'Iron ore beneficiation',
        'Coal washing and cleaning',
        'Diamond recovery operations',
      ],
      companies: ['Weir Minerals', 'FLSmidth', 'Metso Outotec', 'Krebs', 'Multotec'],
      futureImpact: 'Smart hydrocyclones with real-time sensors and AI control could recover 30% more valuable minerals from tailings, reducing mining waste while extracting critical materials for renewable energy technology.',
      color: '#f59e0b',
    },
  ];

  // Get current phase index for navigation
  const getCurrentPhaseIndex = () => PHASE_SEQUENCE.indexOf(phase);

  // Navigate to next phase
  const goToNextPhase = () => {
    const currentIdx = getCurrentPhaseIndex();
    if (currentIdx < PHASE_SEQUENCE.length - 1) {
      const nextPhase = PHASE_SEQUENCE[currentIdx + 1];
      setInternalPhase(nextPhase);
      onPhaseComplete?.();
    }
  };

  // Navigate to previous phase
  const goToPrevPhase = () => {
    const currentIdx = getCurrentPhaseIndex();
    if (currentIdx > 0) {
      const prevPhase = PHASE_SEQUENCE[currentIdx - 1];
      setInternalPhase(prevPhase);
    }
  };

  // ==================== TOP NAVIGATION BAR ====================
  const renderTopNavBar = () => {
    const currentIdx = getCurrentPhaseIndex();
    const progress = ((currentIdx + 1) / PHASE_SEQUENCE.length) * 100;

    return (
      <nav
        aria-label="Game navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          zIndex: 1000,
          padding: '8px 16px',
        }}
      >
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${Math.round(progress)}%`}
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(71, 85, 105, 0.5)',
            borderRadius: '2px',
            marginBottom: '8px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #22d3ee, #06b6d4)',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={goToPrevPhase}
            disabled={currentIdx === 0}
            aria-label="Back"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              background: currentIdx === 0 ? 'rgba(71, 85, 105, 0.3)' : 'rgba(71, 85, 105, 0.7)',
              border: 'none',
              borderRadius: '8px',
              color: currentIdx === 0 ? colors.textMuted : colors.textPrimary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Back
          </button>

          {/* Phase dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {PHASE_SEQUENCE.map((p, idx) => (
              <button
                key={p}
                onClick={() => idx <= currentIdx && setInternalPhase(p)}
                disabled={idx > currentIdx}
                aria-label={`Phase ${idx + 1}: ${p}`}
                title={p}
                style={{
                  width: idx === currentIdx ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: idx < currentIdx
                    ? colors.success
                    : idx === currentIdx
                      ? colors.accent
                      : 'rgba(71, 85, 105, 0.5)',
                  cursor: idx <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <button
            onClick={(phase === 'test' && !testSubmitted) ? undefined : goToNextPhase}
            disabled={phase === 'test' && !testSubmitted}
            aria-label="Next"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              background: (phase === 'test' && !testSubmitted)
                ? 'rgba(71, 85, 105, 0.5)'
                : 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              border: 'none',
              borderRadius: '8px',
              color: (phase === 'test' && !testSubmitted) ? colors.textMuted : colors.textPrimary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: (phase === 'test' && !testSubmitted) ? 'not-allowed' : 'pointer',
              opacity: (phase === 'test' && !testSubmitted) ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Next
          </button>
        </div>
      </nav>
    );
  };

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
          onClick={goToNextPhase}
          disabled={!buttonEnabled}
          style={{
            width: '100%',
            minHeight: '44px',
            padding: '14px 24px',
            background: buttonEnabled
              ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
              The Bottle Tornado
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              Game 109: Vortex Dynamics
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
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px', fontWeight: 700 }}>
                The Magic Trick
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 400 }}>
                Want to empty a water bottle <strong>twice as fast</strong>? Just give it a swirl!
                The spinning water creates a <strong style={{ color: colors.vortexHighlight }}>tornado-like
                vortex</strong> that drains way faster than regular "glugging."
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px', fontWeight: 700 }}>
                Same physics as <span style={{ color: colors.accent }}>real tornadoes</span>!
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 400 }}>
                The bottle vortex demonstrates angular momentum conservation - the same principle
                that makes tornado winds accelerate to 300 mph and lets ice skaters spin faster
                when they pull their arms in!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore!")}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          {/* Progress indicator */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Step 1 of 2: Make your prediction
            </p>
          </div>

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
              What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              This is an <strong>upside-down water bottle</strong> draining. When you give the
              water a spin before flipping, it creates a vortex - a spinning funnel with an
              <span style={{ color: colors.textPrimary }}> air core</span> in the center and
              <span style={{ color: colors.water }}> water spiraling</span> around the edges.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px' }}>
              Without spin, the water "glugs" as air bubbles fight their way up through the water.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              Compared to no spin, what happens when you spin the water?
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
                    minHeight: '44px',
                    padding: '16px',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #67e8f9' : '2px solid transparent',
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              Create Your Tornado!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust spin speed and watch how it affects draining
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(34, 211, 238, 0.1)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch how changing spin speed affects the vortex formation and drain rate. Notice the difference between glugging (low spin) and smooth vortex flow (high spin).
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              The Physics Formula:
            </h3>
            <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              L = m × v × r (angular momentum is a measure of rotational motion)
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              Angular momentum describes how the relationship between mass, velocity, and radius
              determines vortex strength. As radius decreases, v = L / (m × r) means velocity increases proportionally.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              Try These Experiments:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Set spin to 0% - watch the slow "glugging"</li>
              <li>Increase spin - see the vortex form and drain speed up</li>
              <li>Try different bottle angles</li>
              <li>Narrow the neck - stronger vortex!</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(6, 182, 212, 0.05))',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(34, 211, 238, 0.2)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '14px', marginBottom: '8px' }}>
              Why This Matters:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', margin: 0, fontWeight: 'normal' }}>
              This same vortex physics is used in <strong>industrial cyclone separators</strong> to clean air,
              <strong>tornado prediction</strong> to save lives, and even <strong>blood centrifuges</strong> in hospitals.
              Understanding vortex dynamics helps engineers design more efficient systems worldwide.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See What I Learned')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Excellent Prediction!' : 'Interesting Thinking!'}
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              You predicted: "{selectedPrediction?.text || 'No prediction'}"
            </p>
          </div>

          {/* Visual diagram for review */}
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              The Physics Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              The vortex creates a <strong style={{ color: colors.accent }}>central air column</strong>
              surrounded by <strong style={{ color: colors.water }}>spiraling water</strong>.
              This solves the "competition problem" - air enters through the center while water
              exits around it. No more glugging!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Without spin, air and water must take turns at the opening. Air bubble goes up,
              water glug goes down, repeat. This is much slower!
            </p>
            <div style={{
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Formula:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                L = m × v × r (angular momentum). As r decreases, v = L/(m×r) increases.
                Conservation of angular momentum: as water spirals inward, it speeds up
                (like a spinning skater pulling arms in), maintaining the vortex.
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
              Low Pressure Core:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The fast-spinning water creates <strong>low pressure in the center</strong> - this is
              why the air column forms there. It's the same physics that creates the "eye" of
              a hurricane!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The Coriolis Question - Step 1 of 2
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
              The Famous Question:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              You've probably heard that water drains clockwise in one hemisphere and counter-clockwise
              in the other, due to Earth's rotation (the <strong>Coriolis effect</strong>).
              Does this actually determine which way the vortex spins in your bottle or bathtub?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              Does the Coriolis effect determine your bathtub's spin direction?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                  }}
                  style={{
                    minHeight: '44px',
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
        {renderBottomBar(true, !!twistPrediction, 'See The Truth')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              Scale Matters!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See why Coriolis doesn't matter at small scales
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.warning }}>Observe:</strong> Try changing the spin direction - notice how YOU control which way the vortex spins, not the Earth's rotation. The Coriolis effect is negligible at this scale.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>You control the spin direction by how YOU swirl it</li>
              <li>There's no preferred direction at this scale</li>
              <li>Coriolis is only ~0.00001 g at sink scales</li>
              <li>Your hand motion is billions of times stronger</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Learn The Truth')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'You Busted the Myth!' : 'Common Misconception!'}
            </h2>
          </div>

          {/* Visual diagram for twist_review */}
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              The Coriolis Myth:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              At household scales, the Coriolis effect is <strong style={{ color: colors.error }}>
              completely negligible</strong>! The force is proportional to the scale of the
              rotation. For a bathtub, it's about 0.00001 g - a billion times weaker than the
              force from how you pulled the plug!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              <strong style={{ color: colors.accent }}>Initial conditions dominate</strong>: how the
              water was moving before you opened the drain, asymmetries in the drain shape, even
              air currents in the room all matter far more than Earth's rotation.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              When Coriolis DOES Matter:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              For large-scale systems like hurricanes (hundreds of kilometers), ocean currents,
              and atmospheric circulation, the Coriolis effect absolutely matters. It's why
              hurricanes spin counter-clockwise in the Northern Hemisphere. But for your
              bathtub? <strong style={{ color: colors.warning }}>Not even close.</strong>
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Bottle Tornado"
        applications={realWorldApps}
        onComplete={() => nextPhase()}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Application {Math.min(transferCompleted.size + 1, transferApplications.length)} of {transferApplications.length}
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
                minHeight: '44px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '18px' }}>Completed</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(34, 211, 238, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>
                  {app.insight}
                </p>
              </div>
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '6px',
                padding: '8px 10px',
                marginTop: '8px',
              }}>
                <p style={{ color: colors.warning, fontSize: '11px', margin: 0, fontWeight: 'normal' }}>
                  📊 {app.stats}
                </p>
              </div>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Continue to Test' : `Got It - Explore ${4 - transferCompleted.size} More`)}
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderTopNavBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 400 }}>
                Test Complete! You Scored:
              </p>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {correctCount}/10 Correct
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px', fontWeight: 400 }}>
                {score}% - {score >= 70 ? 'Great job!' : 'Keep learning!'}
              </p>
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '12px', padding: '0 16px 16px 16px' }}>
              <button
                onClick={() => {
                  setTestAnswers({});
                  setTestSubmitted(false);
                }}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  padding: '12px',
                  background: 'rgba(51, 65, 85, 0.7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🔄 Replay Quiz
              </button>
              <button
                onClick={goToNextPhase}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  padding: '12px',
                  background: 'rgba(51, 65, 85, 0.7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                📊 Dashboard
              </button>
            </div>

            {/* Answer review with icons */}
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
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '14px', fontWeight: 'bold' }}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                    <span style={{ color: colors.textMuted, fontSize: '13px', fontWeight: 'normal' }}>
                      Q{idx + 1}/{testQuestions.length}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0', fontWeight: 'normal' }}>
                    {q.question}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: colors.success, fontSize: '11px', margin: 0 }}>
                      ✓ Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Complete!' : 'Review and Continue')}
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Question 1 of {testQuestions.length} - {answeredCount} answered
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
                Q{idx + 1} of {testQuestions.length}: {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((option, optIdx) => (
                  <button
                    key={option.id}
                    onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: option.id }))}
                    style={{
                      minHeight: '44px',
                      padding: '10px 14px',
                      background: testAnswers[q.id] === option.id
                        ? 'rgba(34, 211, 238, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(34, 211, 238, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: colors.textPrimary,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: 400,
                    }}
                  >
                    {String.fromCharCode(65 + optIdx)}) {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
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
              minHeight: '44px',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              border: 'none',
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Submit Answers ({answeredCount}/10)
          </button>
          </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderTopNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Vortex Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered angular momentum and vortex dynamics
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>
              What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Vortices create separate paths for air and water</li>
              <li>Angular momentum conservation accelerates the spin</li>
              <li>Fast-spinning cores have low pressure</li>
              <li>Coriolis effect is negligible at household scales</li>
              <li>Same physics applies to tornadoes and hurricanes</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(34, 211, 238, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              Try It At Home:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Grab two identical bottles, fill them with water, and race them! Flip one normally
              (glugging) and give the other a good swirl first (vortex). The vortex bottle will
              empty in about half the time. You've just demonstrated conservation of angular
              momentum!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game')}
      </div>
    );
  }

  // Default fallback - render hook phase
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {renderTopNavBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '100px' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            The Bottle Tornado
          </h1>
          <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
            Game 109: Vortex Dynamics
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
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px', fontWeight: 700 }}>
              The Magic Trick
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 400 }}>
              Want to empty a water bottle <strong>twice as fast</strong>? Just give it a swirl!
              The spinning water creates a <strong style={{ color: colors.vortexHighlight }}>tornado-like
              vortex</strong> that drains way faster than regular "glugging."
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              Same physics as <span style={{ color: colors.accent }}>real tornadoes</span>!
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              The bottle vortex demonstrates angular momentum conservation - the same principle
              that makes tornado winds accelerate to 300 mph and lets ice skaters spin faster
              when they pull their arms in!
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, true, "Let's Explore!")}
    </div>
  );
};

export default BottleTornadoRenderer;
