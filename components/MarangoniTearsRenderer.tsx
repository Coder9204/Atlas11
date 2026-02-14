import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 108: MARANGONI TEARS OF WINE
// The "wine legs" phenomenon caused by surface tension gradients
// Demonstrates Marangoni flow from alcohol evaporation
// ============================================================================

// Real-world applications for Marangoni effect
const realWorldApps = [
  {
    icon: '💧',
    title: 'Semiconductor Wafer Drying',
    short: 'Spot-free chip manufacturing',
    tagline: 'Surface tension gradients for perfect cleanliness',
    description: 'After chemical cleaning, silicon wafers must dry without water spots that would ruin circuits. Marangoni drying uses isopropyl alcohol vapor to create surface tension gradients that pull water off the wafer surface, leaving it perfectly clean.',
    connection: 'The same surface tension gradients that drive wine tears pull water from wafer surfaces. Lower surface tension of IPA creates flow toward the alcohol-rich region, carrying water away from the wafer.',
    howItWorks: 'Wafer slowly withdraws from water bath. IPA vapor condenses at water-air interface, lowering local surface tension. Marangoni flow pulls water down off wafer surface. Wafer emerges dry without heat or mechanical contact.',
    stats: [
      { value: '0', label: 'Water spots per wafer', icon: '💧' },
      { value: '<3nm', label: 'Surface particle spec', icon: '🔬' },
      { value: '$600B', label: 'Semiconductor market', icon: '📈' }
    ],
    examples: ['ASML lithography', 'Applied Materials cleaning', 'Lam Research processing', 'Screen wafer handling'],
    companies: ['Lam Research', 'SCREEN Holdings', 'Tokyo Electron', 'SEMES'],
    futureImpact: 'Sub-angstrom surface cleanliness for next-gen EUV lithography will rely on optimized Marangoni drying processes.',
    color: '#3b82f6'
  },
  {
    icon: '🎨',
    title: 'Coating & Painting Technology',
    short: 'Surface tension defects in films',
    tagline: 'Why paint crawls and coatings fail',
    description: 'Paint defects like "fisheyes" and "crawling" result from Marangoni flows caused by contaminants. Understanding surface tension gradients helps formulators design coatings that level uniformly, and helps painters identify contamination sources.',
    connection: 'The wine tears experiment shows how surface tension differences drive flow. In coatings, silicone contamination or solvent evaporation creates similar gradients that can pull wet paint into defects.',
    howItWorks: 'Contaminant with low surface tension creates local gradient. Marangoni flow pulls coating away from contaminated spot. Circular "fisheye" defect forms. Leveling additives reduce surface tension differences to prevent flow.',
    stats: [
      { value: '2%', label: 'Typical defect rate', icon: '⚠️' },
      { value: '$160B', label: 'Global coatings market', icon: '📈' },
      { value: '30mN/m', label: 'Typical paint surface tension', icon: '📊' }
    ],
    examples: ['Automotive clear coats', 'Architectural paints', 'Electronics conformal coating', 'Printing inks'],
    companies: ['PPG', 'Sherwin-Williams', 'Axalta', 'BASF Coatings'],
    futureImpact: 'Self-healing coatings will use controlled Marangoni flows to automatically repair scratches and defects.',
    color: '#f59e0b'
  },
  {
    icon: '🔬',
    title: 'Microfluidic Lab-on-Chip',
    short: 'Pumping without pumps',
    tagline: 'Moving liquids with chemistry',
    description: 'Microfluidic devices manipulate tiny liquid volumes for medical diagnostics, drug discovery, and chemical analysis. Marangoni flows driven by temperature or concentration gradients can pump fluids without mechanical parts, enabling simpler, cheaper devices.',
    connection: 'The game demonstrated how surface tension gradients drive fluid motion. In microfluidics, this effect moves droplets, mixes reagents, and separates samples - all without traditional pumps.',
    howItWorks: 'Heaters or surfactant gradients create local surface tension differences. Marangoni stress drives flow along interface. Liquid moves from low to high surface tension regions. Programmable heating patterns enable complex fluid handling.',
    stats: [
      { value: '1μL', label: 'Sample volumes', icon: '💧' },
      { value: '10mm/s', label: 'Flow velocities achieved', icon: '⚡' },
      { value: '$30B', label: 'Lab-on-chip market by 2030', icon: '📈' }
    ],
    examples: ['COVID rapid tests', 'Glucose monitors', 'DNA sequencers', 'Drug screening chips'],
    companies: ['Abbott', 'Roche', 'Illumina', 'Dolomite Microfluidics'],
    futureImpact: 'Marangoni-driven microfluidics will enable smartphone-based diagnostics for infectious diseases in resource-limited settings.',
    color: '#8b5cf6'
  },
  {
    icon: '🌌',
    title: 'Space Manufacturing',
    short: 'Fluid control in microgravity',
    tagline: 'When gravity disappears, surface tension rules',
    description: 'In space, surface tension dominates fluid behavior. Crystal growth, metal alloy mixing, and pharmaceutical production all exhibit strong Marangoni convection that affects product quality. Understanding and controlling these flows is essential for space manufacturing.',
    connection: 'The wine tears phenomenon becomes dramatically amplified in microgravity, where surface tension forces aren\'t overwhelmed by gravity. Space experiments reveal Marangoni effects impossible to study on Earth.',
    howItWorks: 'Temperature gradients across liquid pools drive Marangoni convection cells. Oscillatory instabilities can develop. Affects crystal growth uniformity and alloy segregation. Magnetic fields or vibration used for control.',
    stats: [
      { value: '0g', label: 'Gravity environment', icon: '🚀' },
      { value: '100x', label: 'Stronger Marangoni effect', icon: '📈' },
      { value: '$10B', label: 'Space manufacturing potential', icon: '💰' }
    ],
    examples: ['ZBLAN fiber production', 'Protein crystallization', 'Metal alloy research', 'Pharmaceutical synthesis'],
    companies: ['NASA', 'SpaceX', 'Axiom Space', 'Varda Space'],
    futureImpact: 'Orbital manufacturing facilities will produce materials impossible on Earth, with Marangoni control enabling defect-free crystals and alloys.',
    color: '#22c55e'
  }
];

interface MarangoniTearsRendererProps {
  phase?: string;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
  onBack?: () => void;
}

// Color palette with proper contrast
const colors = {
  // Text colors - HIGH CONTRAST (brightness >= 180)
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Wine colors
  wineRed: '#7c2d12',
  wineDeep: '#450a0a',
  wineLight: '#dc2626',
  wineHighlight: '#f87171',

  // Glass colors
  glass: 'rgba(200, 200, 220, 0.2)',
  glassEdge: 'rgba(200, 200, 220, 0.5)',
  glassHighlight: 'rgba(255, 255, 255, 0.3)',

  // Surface tension indicators
  highTension: '#3b82f6',
  lowTension: '#f59e0b',

  // UI colors
  accent: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

// Phase order for navigation
const PHASE_ORDER = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const MarangoniTearsRenderer: React.FC<MarangoniTearsRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onPredictionMade,
  onBack,
}) => {
  // Internal phase state for self-managed navigation
  const [internalPhase, setInternalPhase] = useState('hook');

  // Support both phase and gamePhase props, default to internal state
  const externalPhase = phaseProp || gamePhase;
  const currentPhase = externalPhase || internalPhase;
  // Normalize invalid phases to 'hook'
  const phase = PHASE_ORDER.includes(currentPhase) ? currentPhase : 'hook';

  // Sync internal phase with external when external changes
  useEffect(() => {
    if (externalPhase && PHASE_ORDER.includes(externalPhase)) {
      setInternalPhase(externalPhase);
    }
  }, [externalPhase]);
  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [alcoholContent, setAlcoholContent] = useState(14); // % ABV
  const [temperature, setTemperature] = useState(25); // Celsius
  const [glassAngle, setGlassAngle] = useState(0); // Tilt angle

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [expandedApp, setExpandedApp] = useState<number | null>(0); // Start with first app expanded

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionConfirmed, setQuestionConfirmed] = useState(false);

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
  const calculateTearFormation = useCallback(() => {
    // Tears form more prominently with higher alcohol content
    // and higher temperature (faster evaporation)
    const evaporationRate = (alcoholContent / 100) * (1 + (temperature - 20) / 40);
    const tearCount = Math.floor(4 + evaporationRate * 8);
    const tearSpeed = 0.5 + evaporationRate * 1.5;
    const tearSize = 2 + (alcoholContent / 20);

    return { tearCount, tearSpeed, tearSize, evaporationRate };
  }, [alcoholContent, temperature]);

  const calculateSurfaceTension = useCallback(() => {
    // Pure water: ~72 mN/m, Pure ethanol: ~22 mN/m
    // Wine is a mixture
    const waterTension = 72;
    const ethanolTension = 22;
    const bulkTension = waterTension - (alcoholContent / 100) * (waterTension - ethanolTension);

    // After evaporation (in the film), alcohol content is lower
    // so surface tension is higher. Temperature increases evaporation rate,
    // which amplifies the gradient
    const tempFactor = 1 + (temperature - 5) / 30; // 1.0 at 5C, 2.0 at 35C
    const filmTension = bulkTension + (alcoholContent / 100) * 20 * tempFactor;

    return { bulkTension, filmTension };
  }, [alcoholContent, temperature]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.03);
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const { tearCount, tearSpeed, tearSize, evaporationRate } = calculateTearFormation();
    const { bulkTension, filmTension } = calculateSurfaceTension();
    const tensionGradient = filmTension - bulkTension;

    // Generate tear positions
    const tears = [];
    for (let i = 0; i < tearCount; i++) {
      const angle = (i / tearCount) * 360;
      const phase = (animationTime * tearSpeed + i * 0.5) % 3;

      // Tear lifecycle: 0-1 forming, 1-2 falling, 2-3 merging
      let y, opacity, size;
      if (phase < 1) {
        // Forming at top
        y = 60 + phase * 20;
        opacity = 0.3 + phase * 0.5;
        size = tearSize * phase;
      } else if (phase < 2) {
        // Falling down
        y = 80 + (phase - 1) * 120;
        opacity = 0.8;
        size = tearSize;
      } else {
        // Merging back into pool
        y = 200 + (phase - 2) * 20;
        opacity = Math.max(0, 0.8 - (phase - 2));
        size = tearSize * (1 + (phase - 2) * 0.5);
      }

      tears.push({ angle, y, opacity, size, phase });
    }

    // Generate surface tension curve data points based on alcohol content
    // This shows how surface tension varies with position (from pool to film)
    // Use amplified visual scale to make the gradient clearly visible
    const curvePoints: {x: number; y: number}[] = [];
    const visualAmplitude = 80 + alcoholContent * 3 + temperature * 2; // 80-250 range
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = 30 + t * 150;
      // Visual curve showing the tension profile along the glass wall
      // Amplified for educational clarity - shows relative shape
      const yVal = 320 - visualAmplitude * Math.pow(t, 0.7);
      curvePoints.push({ x, y: Math.max(40, yVal) });
    }

    const pathD = curvePoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    // Interactive marker position (based on alcoholContent slider)
    const markerIdx = Math.min(Math.round((alcoholContent - 5) / 35 * 12), 12);
    const markerPoint = curvePoints[markerIdx] || curvePoints[0];

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 380"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Wine gradient */}
            <linearGradient id="wineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.wineLight} stopOpacity="0.7" />
              <stop offset="50%" stopColor={colors.wineRed} />
              <stop offset="100%" stopColor={colors.wineDeep} />
            </linearGradient>

            {/* Glass gradient */}
            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.glassHighlight} />
              <stop offset="50%" stopColor={colors.glass} />
              <stop offset="100%" stopColor={colors.glassHighlight} />
            </linearGradient>

            {/* Film gradient (thinner wine on glass) */}
            <linearGradient id="filmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.wineHighlight} stopOpacity="0.2" />
              <stop offset="100%" stopColor={colors.wineRed} stopOpacity="0.5" />
            </linearGradient>

            {/* Glow filter for interactive marker */}
            <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x="200" y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
            Surface Tension vs Position
          </text>

          {/* Grid lines for visual reference */}
          <line x1="30" y1="120" x2="180" y2="120" stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.3" />
          <line x1="30" y1="190" x2="180" y2="190" stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.3" />
          <line x1="30" y1="260" x2="180" y2="260" stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.3" />
          <line x1="30" y1="320" x2="180" y2="320" stroke={colors.textMuted} strokeWidth="0.5" strokeDasharray="4 3" opacity="0.3" />

          {/* Y-axis label */}
          <text x="14" y="220" textAnchor="middle" fill={colors.textMuted} fontSize="11" transform="rotate(-90, 14, 220)">
            Tension (mN/m)
          </text>

          {/* Y-axis tick labels */}
          <text x="27" y="124" textAnchor="end" fill={colors.textMuted} fontSize="11">70</text>
          <text x="27" y="194" textAnchor="end" fill={colors.textMuted} fontSize="11">50</text>
          <text x="27" y="264" textAnchor="end" fill={colors.textMuted} fontSize="11">30</text>

          {/* X-axis label */}
          <text x="105" y="348" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Position (Pool to Film)
          </text>

          {/* Surface tension curve path */}
          <path
            d={pathD}
            fill="none"
            stroke={colors.highTension}
            strokeWidth="2.5"
          />

          {/* Interactive marker circle on curve */}
          <circle
            cx={markerPoint.x}
            cy={markerPoint.y}
            r="8"
            fill={colors.accent}
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#markerGlow)"
          />

          {/* Marker value label */}
          <text x={Math.min(markerPoint.x, 160)} y={Math.max(markerPoint.y - 16, 45)} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">
            {(bulkTension + (filmTension - bulkTension) * Math.pow(markerIdx / 12, 0.7)).toFixed(1)} mN/m
          </text>

          {/* Formula: gamma = gamma_water - x*(gamma_water - gamma_ethanol) */}
          <text x="200" y="365" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
            F = dγ/dx × L (Marangoni force ∝ gradient²)
          </text>

          {/* Wine glass cross-section (right side of SVG) */}
          <g transform={`translate(${200 + glassAngle * 0.3}, 0)`}>
            {/* Glass body */}
            <path
              d="M 240 50 Q 210 120 220 220 L 225 280 L 355 280 L 360 220 Q 370 120 340 50"
              fill="url(#glassGradient)"
              stroke={colors.glassEdge}
              strokeWidth="2"
            />

            {/* Wine pool at bottom */}
            <ellipse
              cx="290"
              cy="240"
              rx="60"
              ry="18"
              fill="url(#wineGradient)"
            />

            {/* Thin film on glass (meniscus) */}
            <path
              d="M 225 210 Q 215 170 220 110"
              fill="none"
              stroke={colors.wineHighlight}
              strokeWidth="6"
              strokeOpacity="0.3"
              strokeLinecap="round"
            />
            <path
              d="M 355 210 Q 365 170 360 110"
              fill="none"
              stroke={colors.wineHighlight}
              strokeWidth="6"
              strokeOpacity="0.3"
              strokeLinecap="round"
            />

            {/* Tear drops on left side */}
            {tears.slice(0, Math.ceil(tearCount / 2)).map((tear, i) => {
              const tearY = 50 + (tear.y - 60) * (230 / 160);
              return (
                <g key={`left-${i}`}>
                  <ellipse
                    cx={222 + Math.sin(tear.phase * Math.PI) * 3}
                    cy={tearY}
                    rx={tear.size * 0.7}
                    ry={tear.size * 1.1}
                    fill={colors.wineRed}
                    opacity={tear.opacity}
                  />
                </g>
              );
            })}

            {/* Tear drops on right side */}
            {tears.slice(Math.ceil(tearCount / 2)).map((tear, i) => {
              const tearY = 50 + (tear.y - 60) * (230 / 160);
              return (
                <g key={`right-${i}`}>
                  <ellipse
                    cx={358 - Math.sin(tear.phase * Math.PI) * 3}
                    cy={tearY}
                    rx={tear.size * 0.7}
                    ry={tear.size * 1.1}
                    fill={colors.wineRed}
                    opacity={tear.opacity}
                  />
                </g>
              );
            })}

            {/* Flow direction arrows (Marangoni flow) */}
            {interactive && (
              <g>
                <line x1="226" y1="190" x2="226" y2="160" stroke={colors.highTension} strokeWidth="2" />
                <polygon points="226,155 221,165 231,165" fill={colors.highTension} />
                <line x1="354" y1="190" x2="354" y2="160" stroke={colors.highTension} strokeWidth="2" />
                <polygon points="354,155 349,165 359,165" fill={colors.highTension} />
              </g>
            )}

            {/* Evaporation indicators */}
            {interactive && (
              <g opacity={evaporationRate * 0.6}>
                {[0, 1].map(i => (
                  <path
                    key={`evap-left-${i}`}
                    d={`M ${210 - i * 4} ${100 + i * 35} q -4 ${-8 - Math.sin(animationTime * 2 + i) * 4} 0 -16 q 4 ${-8 - Math.sin(animationTime * 2 + i + 1) * 4} 0 -16`}
                    fill="none"
                    stroke={colors.lowTension}
                    strokeWidth="1.5"
                    strokeOpacity={0.5 - i * 0.15}
                  />
                ))}
              </g>
            )}
          </g>

          {/* Info box - bottom left */}
          <text x="35" y="295" fill={colors.textMuted} fontSize="11">
            Bulk: {bulkTension.toFixed(1)} mN/m
          </text>
          <text x="35" y="312" fill={colors.highTension} fontSize="11">
            Film: {filmTension.toFixed(1)} mN/m
          </text>
          <text x="35" y="329" fill={colors.accent} fontSize="11">
            Gradient: {tensionGradient.toFixed(1)} mN/m
          </text>

          {/* Reference marker for comparison */}
          <text x="220" y="295" fill={colors.textMuted} fontSize="11">
            (Reference: 25°C standard)
          </text>

          {/* Temperature indicator */}
          <text x="290" y="310" textAnchor="middle" fill={colors.lowTension} fontSize="11">
            Evaporation rate: {(evaporationRate * 100).toFixed(0)}%
          </text>
          <text x="290" y="328" textAnchor="middle" fill={colors.wineHighlight} fontSize="11">
            Tear count: ~{tearCount}
          </text>

          {/* Reference baseline circle for comparison at default position */}
          <circle cx="380" cy="240" r="4" fill={colors.textMuted} opacity="0.3" />
          <circle cx="20" cy="240" r="4" fill={colors.textMuted} opacity="0.3" />
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
        Adjust Parameters:
      </div>

      {/* Alcohol Content Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Alcohol Content: {alcoholContent}% ABV
        </label>
        <input
          type="range"
          min="5"
          max="40"
          value={alcoholContent}
          onChange={(e) => setAlcoholContent(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>5 (Min)</span>
          <span>40 (Max)</span>
        </div>
      </div>

      {/* Temperature Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Temperature: {temperature}°C
        </label>
        <input
          type="range"
          min="5"
          max="35"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>5 (Min)</span>
          <span>35 (Max)</span>
        </div>
      </div>

      {/* Glass Tilt Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Glass Tilt: {glassAngle}°
        </label>
        <input
          type="range"
          min="-15"
          max="15"
          value={glassAngle}
          onChange={(e) => setGlassAngle(Number(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>-15 (Min)</span>
          <span>15 (Max)</span>
        </div>
      </div>

      {/* Current measurements - comparison display */}
      <div style={{
        padding: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Tear Count:</div>
        <div style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: 'bold' }}>
          ~{calculateTearFormation().tearCount}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Evaporation Rate:</div>
        <div style={{ color: colors.lowTension, fontSize: '11px', fontWeight: 'bold' }}>
          {(calculateTearFormation().evaporationRate * 100).toFixed(0)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Tension Gradient:</div>
        <div style={{ color: colors.highTension, fontSize: '11px', fontWeight: 'bold' }}>
          {(calculateSurfaceTension().filmTension - calculateSurfaceTension().bulkTension).toFixed(1)} mN/m
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'more', text: 'MORE prominent tears (more "legs")', correct: true },
    { id: 'less', text: 'LESS prominent tears (fewer "legs")' },
    { id: 'same', text: 'The same amount of tears' },
    { id: 'none', text: 'No tears at all' },
  ];

  const twistPredictions = [
    { id: 'yes', text: 'Yes - it would still form tears from evaporation' },
    { id: 'no', text: 'No - without a free surface, no tears form', correct: true },
    { id: 'more', text: 'Even more tears due to pressure' },
    { id: 'different', text: 'Different pattern but still forms tears' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What causes the Marangoni effect in wine?',
      options: [
        { id: 'a', text: 'A) Gravity pulling the wine down' },
        { id: 'b', text: 'B) Surface tension gradients from alcohol evaporation', correct: true },
        { id: 'c', text: 'C) The shape of the wine glass' },
        { id: 'd', text: 'D) Temperature differences in the wine' },
      ],
    },
    {
      id: 2,
      question: 'Where is the surface tension HIGHER in a glass of wine?',
      options: [
        { id: 'a', text: 'A) In the bulk liquid at the bottom' },
        { id: 'b', text: 'B) On the thin film on the glass wall', correct: true },
        { id: 'c', text: 'C) Surface tension is the same everywhere' },
        { id: 'd', text: 'D) At the center of the wine surface' },
      ],
    },
    {
      id: 3,
      question: 'Why does alcohol evaporating increase surface tension in the film?',
      options: [
        { id: 'a', text: 'A) Alcohol has higher surface tension than water' },
        { id: 'b', text: 'B) Evaporation creates bubbles' },
        { id: 'c', text: 'C) Water has higher surface tension than alcohol', correct: true },
        { id: 'd', text: 'D) The glass surface creates friction' },
      ],
    },
    {
      id: 4,
      question: 'How does higher alcohol content affect tear formation?',
      options: [
        { id: 'a', text: 'A) Fewer, smaller tears' },
        { id: 'b', text: 'B) More prominent tears', correct: true },
        { id: 'c', text: 'C) No effect on tears' },
        { id: 'd', text: 'D) Tears form only at high alcohol content' },
      ],
    },
    {
      id: 5,
      question: 'If you cover a wine glass, what happens to the tears?',
      options: [
        { id: 'a', text: 'A) They form faster' },
        { id: 'b', text: 'B) They stop forming (evaporation blocked)', correct: true },
        { id: 'c', text: 'C) They form in the opposite direction' },
        { id: 'd', text: 'D) They become larger' },
      ],
    },
    {
      id: 6,
      question: 'Which liquid property drives Marangoni flow?',
      options: [
        { id: 'a', text: 'A) Density' },
        { id: 'b', text: 'B) Viscosity' },
        { id: 'c', text: 'C) Surface tension gradient', correct: true },
        { id: 'd', text: 'D) Temperature' },
      ],
    },
    {
      id: 7,
      question: 'In which direction does Marangoni flow move liquid?',
      options: [
        { id: 'a', text: 'A) From high to low surface tension' },
        { id: 'b', text: 'B) From low to high surface tension', correct: true },
        { id: 'c', text: 'C) Always downward due to gravity' },
        { id: 'd', text: 'D) Randomly in all directions' },
      ],
    },
    {
      id: 8,
      question: 'What is the surface tension of pure water compared to pure ethanol?',
      options: [
        { id: 'a', text: 'A) Water: ~22 mN/m, Ethanol: ~72 mN/m' },
        { id: 'b', text: 'B) Water: ~72 mN/m, Ethanol: ~22 mN/m', correct: true },
        { id: 'c', text: 'C) They are the same' },
        { id: 'd', text: 'D) Depends on temperature only' },
      ],
    },
    {
      id: 9,
      question: 'How does temperature affect tear formation?',
      options: [
        { id: 'a', text: 'A) Higher temperature = more tears (faster evaporation)', correct: true },
        { id: 'b', text: 'B) Higher temperature = fewer tears' },
        { id: 'c', text: 'C) Temperature has no effect' },
        { id: 'd', text: 'D) Only affects the taste, not the tears' },
      ],
    },
    {
      id: 10,
      question: 'Can the "quality" of wine be judged by its tears?',
      options: [
        { id: 'a', text: 'A) Yes - more tears means better wine' },
        { id: 'b', text: 'B) No - tears only indicate alcohol content, not quality', correct: true },
        { id: 'c', text: 'C) Yes - fewer tears means better wine' },
        { id: 'd', text: 'D) Tears indicate the age of the wine' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: 'Inkjet Printing',
      description: 'Marangoni flows can cause uneven drying in printed ink drops, leading to the "coffee ring effect" where pigment concentrates at edges. Printer manufacturers add surfactants to control these flows. Companies like HP, Epson, and Canon invest $2B annually in research to combat these surface tension artifacts. Modern inkjet heads operate at 30kHz firing rates.',
      insight: 'Understanding Marangoni flow helps engineers print circuits, solar cells, and biological samples with uniform coating.',
    },
    {
      id: 1,
      title: 'Oil Spill Dispersants',
      description: 'Dispersant chemicals work partly through Marangoni effects - they create surface tension gradients that help break up and spread oil slicks into smaller droplets. The Deepwater Horizon spill in 2010 used 7 million liters of Corexit dispersant. Research by NOAA and the EPA shows these chemicals reduce surface slick area by 60% within hours. The global dispersant market exceeds $1B per year and involves companies like Nalco Environmental Solutions.',
      insight: 'The same physics that makes wine climb a glass helps emergency responders manage environmental disasters on a massive industrial scale.',
    },
    {
      id: 2,
      title: 'Soap Boats',
      description: 'A classic science experiment: a small boat with soap at one end propels itself forward. The soap lowers surface tension behind it, and the higher tension in front pulls it along. This demonstration has been used in physics education for over 150 years. Modern versions can reach speeds of 10cm/s. Scientists at MIT measured the peak acceleration at 50 m/s squared.',
      insight: 'This simple toy demonstrates the same physics as the tears of wine - movement from low to high surface tension regions. Engineers at BASF use this principle in coating technology.',
    },
    {
      id: 3,
      title: 'Microfluidics',
      description: 'Researchers use temperature or chemical gradients to create Marangoni flows in tiny channels. This allows precise control of liquid movement without mechanical pumps. Companies like Dolomite and Illumina use these effects in devices processing 1000 samples per second. The global microfluidics market exceeds $25B.',
      insight: 'Lab-on-a-chip devices use Marangoni flow to mix reagents, separate cells, and perform medical diagnostics using just a drop of blood.',
    },
  ];

  // Get current phase index for progress
  const currentPhaseIndex = PHASE_ORDER.indexOf(phase);
  const progressPercent = ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;

  // ==================== NAV BAR RENDERER ====================
  const renderNavBar = (showNext: boolean, nextEnabled: boolean, nextText: string) => {
    const showBack = currentPhaseIndex > 0;

    return (
      <nav
        aria-label="Game navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
          borderTop: '1px solid rgba(148, 163, 184, 0.2)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          marginBottom: '4px',
        }}>
          {PHASE_ORDER.map((p, idx) => (
            <button
              key={p}
              aria-label={`Go to ${p} phase`}
              onClick={() => {
                // Navigate to that phase via a series of onPhaseComplete/onBack calls
                // For now, just indicate current position
              }}
              style={{
                width: '44px',
                height: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: idx <= currentPhaseIndex ? colors.accent : 'rgba(71, 85, 105, 0.5)',
              }} />
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={currentPhaseIndex + 1}
          aria-valuemin={1}
          aria-valuemax={PHASE_ORDER.length}
          aria-label={`Progress: step ${currentPhaseIndex + 1} of ${PHASE_ORDER.length}`}
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(71, 85, 105, 0.5)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                const prevIdx = PHASE_ORDER.indexOf(phase) - 1;
                if (prevIdx >= 0) setInternalPhase(PHASE_ORDER[prevIdx]);
              }
            }}
            disabled={!showBack}
            aria-label="Back"
            style={{
              flex: showNext ? '0 0 auto' : '1',
              minWidth: '80px',
              minHeight: '44px',
              padding: '12px 20px',
              background: showBack ? 'rgba(51, 65, 85, 0.8)' : 'rgba(51, 65, 85, 0.3)',
              border: 'none',
              borderRadius: '10px',
              color: showBack ? colors.textSecondary : 'rgba(148, 163, 184, 0.5)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: showBack ? 'pointer' : 'not-allowed',
              opacity: showBack ? 1 : 0.5,
              transition: 'all 0.2s ease',
            }}
          >
            Back
          </button>

          {showNext && (
            <button
              onClick={() => {
                if (onPhaseComplete) {
                  onPhaseComplete();
                } else {
                  const nextIdx = PHASE_ORDER.indexOf(phase) + 1;
                  if (nextIdx < PHASE_ORDER.length) setInternalPhase(PHASE_ORDER[nextIdx]);
                }
              }}
              disabled={!nextEnabled}
              aria-label="Next"
              style={{
                flex: '1',
                minHeight: '44px',
                padding: '12px 24px',
                background: nextEnabled
                  ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                  : 'rgba(71, 85, 105, 0.5)',
                border: 'none',
                borderRadius: '10px',
                color: nextEnabled ? colors.textPrimary : 'rgba(148, 163, 184, 0.5)',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: nextEnabled ? 'pointer' : 'not-allowed',
                opacity: nextEnabled ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              {nextText}
            </button>
          )}
        </div>
      </nav>
    );
  };

  // Legacy alias for compatibility
  const renderBottomBar = renderNavBar;

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: '#ffffff', fontSize: '28px', marginBottom: '8px' }}>
              The Crying Glass
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 108: Marangoni Tears of Wine
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
              <h2 style={{ color: '#ffffff', fontSize: '20px', marginBottom: '12px' }}>
                Have You Ever Noticed?
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 400 }}>
                Swirl a glass of wine and watch the inside of the glass. You'll see "legs" or "tears"
                of wine climbing up the glass, forming droplets, then streaming back down. Wine
                connoisseurs call these <strong style={{ color: colors.wineHighlight }}>"tears of wine"</strong> or
                <strong style={{ color: colors.wineHighlight }}>"wine legs"</strong>.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '12px' }}>
                This is the <span style={{ color: colors.accent }}>Marangoni Effect</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 400 }}>
                Named after Italian physicist Carlo Marangoni, this phenomenon occurs when liquids
                flow due to <strong>surface tension gradients</strong>. It's the same physics that
                powers soap boats, helps disperse oil spills, and enables precision microfluidic
                devices!
              </p>
            </div>
          </div>
        </div>
        {renderNavBar(true, true, "Start Exploring")}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
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
              This is a <strong>cross-section of a wine glass</strong>. After swirling, a thin film
              of wine coats the glass walls. Alcohol evaporates from this film (faster than water),
              leaving behind water-rich liquid with <span style={{ color: colors.highTension }}>
              higher surface tension</span>. This pulls more wine up from the pool below, forming
              the "tears" that then fall back down.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              <strong>gamma</strong> represents surface tension. Higher gamma in the film creates
              the upward pull that forms tears.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              If you pour STRONGER alcohol (higher %), what happens to the tears?
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
                    minHeight: '44px',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #a78bfa' : '2px solid transparent',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 400,
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
        {renderNavBar(true, true, prediction ? 'Test My Prediction' : 'Next')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              Experiment Time!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust alcohol content and temperature to see how tears change
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '10px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch how the tear droplets change as you adjust the sliders. Notice the relationship between alcohol content and tear formation speed.
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
              Try These Experiments:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Increase alcohol content to see more and faster tears</li>
              <li>Increase temperature for faster evaporation = more tears</li>
              <li>Tilt the glass to see how gravity affects tear flow</li>
              <li>Try "light beer" (5%) vs "whiskey" (40%)</li>
            </ul>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '14px', marginBottom: '8px' }}>
              Real-World Relevance:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              This same Marangoni effect is used in semiconductor wafer drying, inkjet printing,
              microfluidic devices, and even space manufacturing. Understanding surface tension
              gradients helps engineers control fluid flow at tiny scales.
            </p>
          </div>
        </div>
        {renderNavBar(true, true, 'See What I Learned')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '' : ''}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Excellent Prediction!' : 'Interesting Thinking!'}
            </h2>
          </div>

          {/* Reference user's prediction */}
          <div style={{
            background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '10px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.textPrimary }}>Your prediction:</strong> "{selectedPrediction ? selectedPrediction.text : 'No prediction made'}"
              {isCorrect ? (
                <span style={{ color: colors.success }}> - Correct! As you predicted, stronger alcohol creates more prominent tears.</span>
              ) : (
                <span style={{ color: colors.warning }}> - The experiment showed something different. Let's explore why the result differs from what you expected.</span>
              )}
            </p>
          </div>

          {/* Visual diagram SVG for review */}
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}>
              <defs>
                <marker id="arrowReview" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0 0 L0 6 L9 3 z" fill={colors.highTension} />
                </marker>
              </defs>
              {/* Title */}
              <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
                Marangoni Flow Direction
              </text>

              {/* Low tension region (bulk) */}
              <rect x="50" y="100" width="120" height="60" rx="8" fill="rgba(245, 158, 11, 0.2)" stroke={colors.lowTension} strokeWidth="2" />
              <text x="110" y="125" textAnchor="middle" fill={colors.lowTension} fontSize="12">Bulk Wine</text>
              <text x="110" y="148" textAnchor="middle" fill={colors.textMuted} fontSize="11">Low gamma (alcohol)</text>

              {/* High tension region (film) */}
              <rect x="230" y="100" width="120" height="60" rx="8" fill="rgba(59, 130, 246, 0.2)" stroke={colors.highTension} strokeWidth="2" />
              <text x="290" y="125" textAnchor="middle" fill={colors.highTension} fontSize="12">Thin Film</text>
              <text x="290" y="148" textAnchor="middle" fill={colors.textMuted} fontSize="11">High gamma (water)</text>

              {/* Flow arrow */}
              <line x1="175" y1="130" x2="220" y2="130" stroke={colors.highTension} strokeWidth="3" markerEnd="url(#arrowReview)" />
              <text x="197" y="80" textAnchor="middle" fill={colors.textPrimary} fontSize="11">Flow direction</text>
              <text x="197" y="55" textAnchor="middle" fill={colors.accent} fontSize="11">(Low to High gamma)</text>

              {/* Evaporation indicator */}
              <text x="290" y="185" textAnchor="middle" fill={colors.warning} fontSize="11">Alcohol evaporates upward</text>
            </svg>
          </div>

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
              Higher alcohol content means <strong>more evaporation</strong> and a <strong>larger
              surface tension gradient</strong>. This creates a stronger Marangoni flow, pulling
              more wine up the glass and forming <strong style={{ color: colors.accent }}>more
              prominent tears</strong>.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              The key observation: alcohol has <strong>lower surface tension</strong> than water. When
              alcohol evaporates from the thin film, what's left has higher surface tension. This
              high-tension region pulls liquid up from the lower-tension bulk.
            </p>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                Liquid flows from regions of LOW surface tension to regions of HIGH surface tension.
                This is the Marangoni effect - the result confirms what you observed in the experiment.
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
              Wine Quality Myth:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Many believe prominent "legs" indicate high-quality wine. In reality, legs only indicate
              <strong style={{ color: colors.warning }}> alcohol content</strong>, not quality!
              A cheap high-alcohol wine will have more legs than an expensive low-alcohol wine.
            </p>
          </div>
        </div>
        {renderNavBar(true, true, 'Ready for a Challenge')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              What if we sealed the glass?
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
              The Thought Experiment:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Imagine you put a tight lid on the wine glass, creating a <strong>sealed container</strong>.
              No air can get in or out. Would the tears of wine still form?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              In a sealed glass, would tears still form?
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
                    minHeight: '44px',
                    background: twistPrediction === p.id
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: twistPrediction === p.id ? '2px solid #fbbf24' : '2px solid transparent',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 400,
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
        {renderNavBar(true, true, twistPrediction ? 'See What Happens' : 'Next')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              Exploring Evaporation's Role
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See why a free surface is essential
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '10px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
              <strong style={{ color: colors.warning }}>Observe:</strong> Think about what would happen if evaporation stopped. Notice how the simulation shows ongoing evaporation driving the flow.
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
              Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Tears require ongoing evaporation</li>
              <li>Evaporation creates the surface tension gradient</li>
              <li>In a sealed container, vapor reaches equilibrium</li>
              <li>At equilibrium, no net evaporation = no gradient = no tears</li>
            </ul>
          </div>
        </div>
        {renderNavBar(true, true, 'Understand the Twist')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '' : ''}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'You Got It!' : 'Surprising Result!'}
            </h2>
          </div>

          {/* Reference user's twist prediction */}
          {selectedTwist && (
            <div style={{
              background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
              border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
              margin: '0 16px 16px 16px',
              padding: '12px 16px',
              borderRadius: '10px',
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Your prediction:</strong> "{selectedTwist.text}"
                {isCorrect ? (
                  <span style={{ color: colors.success }}> - Exactly right!</span>
                ) : (
                  <span style={{ color: colors.accent }}> - Here's the surprising truth.</span>
                )}
              </p>
            </div>
          )}

          {/* Visual diagram SVG for twist review */}
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}>
              {/* Title */}
              <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
                Sealed vs Open Container
              </text>

              {/* Open container */}
              <rect x="50" y="70" width="100" height="80" rx="4" fill="none" stroke={colors.glassEdge} strokeWidth="2" />
              <ellipse cx="100" cy="130" rx="40" ry="10" fill={colors.wineRed} />
              {/* Evaporation arrows */}
              <line x1="80" y1="95" x2="80" y2="75" stroke={colors.warning} strokeWidth="2" strokeDasharray="3 2" opacity="0.7" />
              <line x1="100" y1="90" x2="100" y2="70" stroke={colors.warning} strokeWidth="2" strokeDasharray="3 2" opacity="0.7" />
              <line x1="120" y1="95" x2="120" y2="75" stroke={colors.warning} strokeWidth="2" strokeDasharray="3 2" opacity="0.7" />
              <text x="100" y="58" textAnchor="middle" fill={colors.warning} fontSize="11">Evaporation</text>
              <text x="100" y="168" textAnchor="middle" fill={colors.success} fontSize="11">OPEN: Tears form</text>

              {/* Sealed container */}
              <rect x="250" y="70" width="100" height="80" rx="4" fill="none" stroke={colors.glassEdge} strokeWidth="2" />
              {/* Lid */}
              <rect x="245" y="65" width="110" height="8" rx="2" fill={colors.glassEdge} />
              <ellipse cx="300" cy="130" rx="40" ry="10" fill={colors.wineRed} />
              {/* Vapor equilibrium dots */}
              <circle cx="280" cy="95" r="3" fill="rgba(245, 158, 11, 0.5)" />
              <circle cx="300" cy="90" r="3" fill="rgba(245, 158, 11, 0.5)" />
              <circle cx="320" cy="95" r="3" fill="rgba(245, 158, 11, 0.5)" />
              <text x="300" y="168" textAnchor="middle" fill={colors.error} fontSize="11">SEALED: No tears</text>

              {/* Explanation */}
              <text x="200" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="11">
                Equilibrium vapor pressure stops net evaporation
              </text>
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              No Evaporation = No Tears!
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              In a sealed container, the air above the wine quickly becomes <strong>saturated</strong>
              with alcohol and water vapor. Once equilibrium is reached, there's no net evaporation
              from the film.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Without evaporation, there's <strong style={{ color: colors.accent }}>no surface tension
              gradient</strong> - the film has the same composition as the bulk. No gradient means
              no Marangoni flow, and no tears form!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              Try It Yourself:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Pour wine in a glass and swirl it - watch the tears form. Then cover the glass tightly
              with plastic wrap and swirl again. After the vapor saturates (a few minutes), you'll
              notice the tears stop forming or become much less prominent!
            </p>
          </div>
        </div>
        {renderNavBar(true, true, 'See Real Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= transferApplications.length;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '120px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The Marangoni effect powers technology from semiconductor manufacturing to space exploration.
              Surface tension gradients drive flows in systems worth over $600B globally.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              App {transferCompleted.size} of {transferApplications.length} explored
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

          {transferApplications.map((app, idx) => (
            <div
              key={app.id}
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
              }}
            >
              <div
                onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) ? (
                  <span style={{ color: colors.success, fontSize: '18px' }}>Done</span>
                ) : (
                  <span style={{ color: colors.textMuted, fontSize: '14px' }}>
                    {expandedApp === app.id ? 'v' : '>'}
                  </span>
                )}
              </div>

              {(expandedApp === app.id || transferCompleted.has(app.id) || true) && (
                <>
                  <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                    {app.description}
                  </p>
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    marginTop: '10px',
                  }}>
                    <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>
                      {app.insight}
                    </p>
                  </div>

                  {!transferCompleted.has(app.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferCompleted(prev => new Set([...prev, app.id]));
                        // Auto-expand next app
                        if (idx < transferApplications.length - 1) {
                          setExpandedApp(transferApplications[idx + 1].id);
                        } else {
                          setExpandedApp(null);
                        }
                      }}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px 16px',
                        minHeight: '44px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Got It
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Navigation to test phase is handled by the nav bar below */}
        </div>
        {renderNavBar(true, allCompleted, allCompleted ? 'Continue to Test' : `Explore ${transferApplications.length - transferCompleted.size} More`)}
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
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '' : score >= 60 ? '' : ''}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
                {correctCount}/{testQuestions.length} correct
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
                      {isCorrect ? 'Correct' : 'Wrong'}
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
          {renderNavBar(true, true, score >= 70 ? 'Complete!' : 'Review and Continue')}
        </div>
      );
    }

    const q = testQuestions[currentQuestion];
    const isLastQuestion = currentQuestion >= testQuestions.length - 1;
    const hasAnswer = q && testAnswers[q.id];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '120px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Question {currentQuestion + 1} of {testQuestions.length}
            </p>
          </div>

          {/* Context for the quiz */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '10px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
              Based on your exploration of the Marangoni effect and wine tears phenomenon, answer the following questions about surface tension gradients, alcohol evaporation, and the physics of fluid flow driven by concentration differences. Think about what you observed when adjusting the alcohol content, temperature, and glass tilt in the simulation.
            </p>
          </div>

          {q && (
            <div
              style={{
                background: colors.bgCard,
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: colors.accent, fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>
                Question {currentQuestion + 1} of {testQuestions.length}
              </p>
              <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setTestAnswers(prev => ({ ...prev, [q.id]: option.id }));
                      setQuestionConfirmed(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      minHeight: '44px',
                      background: testAnswers[q.id] === option.id
                        ? 'rgba(139, 92, 246, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(139, 92, 246, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {option.text}
                  </button>
                ))}
              </div>

              {hasAnswer && !questionConfirmed && (
                <button
                  onClick={() => setQuestionConfirmed(true)}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px 20px',
                    minHeight: '44px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Check Answer
                </button>
              )}

              {hasAnswer && questionConfirmed && (() => {
                const correctOpt = q.options.find(o => o.correct);
                const isCorrectAnswer = testAnswers[q.id] === correctOpt?.id;
                return (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: isCorrectAnswer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${isCorrectAnswer ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  }}>
                    <p style={{ color: isCorrectAnswer ? colors.success : colors.error, fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                      {isCorrectAnswer ? 'Correct!' : 'Not quite right.'}
                    </p>
                    {!isCorrectAnswer && correctOpt && (
                      <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                        The correct answer is: {correctOpt.text}. This is because the Marangoni effect depends on surface tension gradients created by differential evaporation of alcohol from the wine film.
                      </p>
                    )}
                  </div>
                );
              })()}

              {hasAnswer && questionConfirmed && !isLastQuestion && (
                <button
                  onClick={() => {
                    setCurrentQuestion(prev => prev + 1);
                    setQuestionConfirmed(false);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px 20px',
                    minHeight: '44px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Next Question
                </button>
              )}

              {hasAnswer && questionConfirmed && isLastQuestion && (
                <button
                  onClick={() => setTestSubmitted(true)}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px 20px',
                    minHeight: '44px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Submit Answers
                </button>
              )}
            </div>
          )}
        </div>
        {renderNavBar(false, false, '')}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}></div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Marangoni Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered surface tension flow
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
              <li>Liquid flows from low to high surface tension</li>
              <li>Alcohol evaporation creates tension gradients</li>
              <li>Wine tears indicate alcohol content, not quality</li>
              <li>Marangoni flow requires ongoing evaporation</li>
              <li>The effect is used in printing, microfluidics, and more</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              Keep Exploring:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Next time you have a glass of wine (or any alcoholic beverage), swirl it and watch
              the tears! Try comparing different alcohol percentages. You can even demonstrate
              the sealed-glass experiment to impress your friends with your physics knowledge!
            </p>
          </div>
        </div>
        {renderNavBar(true, true, 'Complete Game')}
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

export default MarangoniTearsRenderer;
