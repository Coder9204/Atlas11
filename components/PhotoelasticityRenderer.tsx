import React, { useState, useEffect, useMemo, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// PHOTOELASTICITY RENDERER - Self-Managing Game Component
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PhotoelasticityRendererProps {
  phase?: Phase;
  gamePhase?: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'Explore Twist',
  twist_play: 'Twist Lab',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: 'rgba(148,163,184,0.7)',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.98)',
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  polarizer: '#3b82f6',
};

// ============================================================================
// TEST QUESTIONS
// ============================================================================

const testQuestions = [
  {
    scenario: 'A civil engineer wants to find stress concentration points in a transparent plastic model of a bridge beam before building the real structure.',
    question: 'What causes rainbow fringes in photoelasticity?',
    options: [
      { text: 'A) Temperature gradients in the plastic', correct: false },
      { text: 'B) Stress-induced birefringence rotating polarized light differently by wavelength', correct: true },
      { text: 'C) Chemical reactions in the material', correct: false },
      { text: 'D) Diffraction from surface scratches', correct: false },
    ],
    explanation: 'Stress causes birefringence - the material develops two different refractive indices. Different wavelengths rotate by different amounts, creating interference colors between crossed polarizers.',
  },
  {
    scenario: 'A materials scientist is studying an optical fiber under stress. She notices the fiber appears to have different optical properties along different axes.',
    question: 'Birefringence means a material has:',
    options: [
      { text: 'A) Two different colors', correct: false },
      { text: 'B) Two different refractive indices for different polarization directions', correct: true },
      { text: 'C) Two layers of different materials', correct: false },
      { text: 'D) Fluorescent properties', correct: false },
    ],
    explanation: 'Birefringence (bi = two, refringence = refraction) means light polarized in different directions travels at different speeds through the material, creating two distinct refractive indices.',
  },
  {
    scenario: 'An optics student sets up two polarizing filters in the lab. When she places them one after another, all light is blocked.',
    question: 'Crossed polarizers means:',
    options: [
      { text: 'A) The polarizers are at 90 degrees to each other, blocking light', correct: true },
      { text: 'B) The polarizers are parallel and add together', correct: false },
      { text: 'C) The polarizers spin in opposite directions', correct: false },
      { text: 'D) The polarizers have crossed scratch patterns', correct: false },
    ],
    explanation: 'When two polarizers are oriented at 90° to each other (crossed), the second polarizer blocks all light that passed through the first. Any material between them that rotates polarization will allow some light through.',
  },
  {
    scenario: 'A demonstration shows two polarizing filters with no sample between them. The screen behind them is completely dark.',
    question: 'Without any stressed material between crossed polarizers:',
    options: [
      { text: 'A) Bright white light passes through', correct: false },
      { text: 'B) No light passes through (dark field)', correct: true },
      { text: 'C) Only red light passes through', correct: false },
      { text: 'D) A rainbow pattern appears', correct: false },
    ],
    explanation: 'Between crossed polarizers with no sample, the second polarizer blocks all the polarized light from the first, creating complete darkness - this "dark field" is the baseline for photoelastic measurements.',
  },
  {
    scenario: 'A photoelastic experiment shows a plastic model of a gear tooth. The area near the tooth root shows very dense, tightly-packed colored bands.',
    question: 'In photoelasticity, regions of high stress show:',
    options: [
      { text: 'A) No color at all', correct: false },
      { text: 'B) Dense, closely-spaced fringe patterns', correct: true },
      { text: 'C) Only black coloring', correct: false },
      { text: 'D) Uniform single color', correct: false },
    ],
    explanation: 'High stress = large birefringence = more polarization rotation per unit length = more fringe orders in a small space. Dense fringes indicate stress concentrations, which engineers must design around.',
  },
  {
    scenario: 'A geologist examines a thin section of rock under a polarizing microscope. Different minerals appear in distinct colors between crossed polarizers.',
    question: 'Different colors in photoelastic fringes represent:',
    options: [
      { text: 'A) Different temperatures', correct: false },
      { text: 'B) Different amounts of polarization rotation (related to stress)', correct: true },
      { text: 'C) Different plastic compositions', correct: false },
      { text: 'D) Different light source colors', correct: false },
    ],
    explanation: 'Each fringe color corresponds to a specific retardation (path length difference × birefringence). The fringe order N is proportional to stress: N = (σ₁ - σ₂) × t / fσ, where t is thickness and fσ is the material fringe constant.',
  },
  {
    scenario: 'Two identical plastic rods are placed under equal compressive stress, but one rod is twice as thick as the other. Both are viewed between crossed polarizers.',
    question: 'A thicker stressed sample compared to a thinner one shows:',
    options: [
      { text: 'A) The same fringe pattern', correct: false },
      { text: 'B) More fringes because light travels through more stressed material', correct: true },
      { text: 'C) Fewer fringes because stress is distributed', correct: false },
      { text: 'D) No fringes because light is absorbed', correct: false },
    ],
    explanation: 'Fringe order N ∝ thickness × stress. More thickness = more optical path through stressed material = more polarization rotation = more complete color cycles (fringes) visible.',
  },
  {
    scenario: 'An engineering team wants to verify their finite element analysis (FEA) model of a connecting rod before manufacturing. They use a transparent plastic replica.',
    question: 'Photoelasticity is useful in engineering because:',
    options: [
      { text: 'A) It makes structures stronger', correct: false },
      { text: 'B) It reveals the full stress field visually in model structures', correct: true },
      { text: 'C) It only works on metal parts', correct: false },
      { text: 'D) It eliminates the need for calculations', correct: false },
    ],
    explanation: 'The key advantage is visualization of the complete stress distribution simultaneously. Unlike strain gauges at discrete points, photoelasticity shows every region at once, revealing unexpected stress concentrations.',
  },
  {
    scenario: 'A passenger notices unusual rainbow-like patterns in the rear window of their car while wearing polarized sunglasses on a sunny day.',
    question: 'The patterns seen in tempered glass through polarized sunglasses are due to:',
    options: [
      { text: 'A) Surface contamination', correct: false },
      { text: 'B) Residual stress from the tempering process', correct: true },
      { text: 'C) Scratches on the glass', correct: false },
      { text: 'D) Reflections from the car interior', correct: false },
    ],
    explanation: 'Tempering creates permanent residual stress: compression at surfaces, tension in the core. This stress distribution is frozen into the glass and creates birefringence visible through polarized lenses.',
  },
  {
    scenario: 'A student wants to demonstrate photoelastic effects in class using household materials. She has a clear plastic ruler, polarizing filters from old sunglasses, and a light source.',
    question: 'To see photoelastic effects, you need:',
    options: [
      { text: 'A) Only a transparent stressed material', correct: false },
      { text: 'B) A birefringent material between two polarizers', correct: true },
      { text: 'C) A laser light source', correct: false },
      { text: 'D) A microscope', correct: false },
    ],
    explanation: 'The three essential components: (1) a light source, (2) a first polarizer to create polarized light, (3) a stressed transparent material to create birefringence, and (4) a second crossed polarizer (analyzer) to convert retardation into visible color.',
  },
];

// ============================================================================
// TRANSFER APPLICATIONS
// ============================================================================

const transferApplications = [
  {
    icon: '🔧',
    title: 'Engineering Stress Analysis',
    short: 'Visualizing forces in transparent models',
    tagline: 'See stress before it causes failure',
    description: 'Engineers create transparent plastic models of structures and machine parts. Under load, photoelastic fringes reveal where stress concentrates — with ±2% accuracy — helping identify potential failure points before production. Over 100 years of use, this $5 billion testing market uses companies like Vishay, Magnaflux, and TestResources.',
    connection: 'Stress causes birefringence in transparent materials. Between crossed polarizers, different stress levels produce different colors, creating a visual stress map.',
    stats: [
      { value: '±2%', label: 'stress accuracy' },
      { value: '100+', label: 'years of use' },
      { value: '$5B', label: 'testing market' },
    ],
    examples: ['Gear tooth stress', 'Bolt hole concentrations', 'Aircraft components'],
    companies: ['Vishay', 'Magnaflux', 'TestResources'],
    question: 'Why is photoelasticity valuable for finding structural weak points?',
    answer: 'Stress concentrations that could cause failure become visually obvious as dense fringe patterns. This lets engineers see the full stress distribution at once — not just point measurements from strain gauges.',
    color: '#A855F7',
  },
  {
    icon: '📺',
    title: 'LCD Display Quality Control',
    short: 'Detecting residual stress in display glass',
    tagline: 'Every pixel needs stress-free glass',
    description: 'LCD and OLED displays use polarizers as part of their operation. Residual stress in glass substrates causes unwanted birefringence that degrades image quality. Quality control requires retardation below <5nm using polarimetry. Samsung Display, LG Display, BOE, and Corning serve the $150 billion display market, including 8K resolution panels.',
    connection: 'Stressed glass rotates polarization differently across the display, causing color shifts. Thermal annealing reduces stress to acceptable levels.',
    stats: [
      { value: '<5nm', label: 'retardation limit' },
      { value: '8K', label: 'resolution displays' },
      { value: '$150B', label: 'display market' },
    ],
    examples: ['OLED smartphone screens', 'Monitor panels', 'Automotive HUDs'],
    companies: ['Samsung Display', 'LG Display', 'Corning'],
    question: 'How does residual stress affect LCD display quality?',
    answer: 'Stressed glass rotates polarized light unevenly across the display. Since LCDs use polarizers, any extra birefringence in the glass creates color shifts and contrast variations, degrading the image.',
    color: '#3B82F6',
  },
  {
    icon: '🌡️',
    title: 'Tempered Glass Inspection',
    short: 'Polarized light reveals safety glass quality',
    tagline: 'Stress patterns ensure strength',
    description: 'Tempered glass is strengthened by deliberately introducing surface compression stress of ~10,000 PSI, making it 4-5× stronger than annealed glass. The $4 billion safety glass market — including AGC Glass, Saint-Gobain, Guardian, and Pilkington — uses polarized light inspection to verify proper tempering of car windows, smartphone screens, and shower doors.',
    connection: 'The tempering process creates a specific stress distribution: compression at surfaces, tension in the core. This pattern is visible as birefringence under polarized light.',
    stats: [
      { value: '4-5x', label: 'stronger than annealed' },
      { value: '10K PSI', label: 'surface stress' },
      { value: '$4B', label: 'safety glass market' },
    ],
    examples: ['Car side windows', 'Smartphone screens', 'Shower doors'],
    companies: ['AGC Glass', 'Saint-Gobain', 'Guardian'],
    question: 'Why can you sometimes see patterns in car windows with polarized sunglasses?',
    answer: 'Tempering creates residual stress patterns frozen into the glass. The birefringence from this stress rotates polarized light, creating visible interference patterns when viewed through polarized lenses — the same physics used for quality control.',
    color: '#10B981',
  },
  {
    icon: '🔬',
    title: 'Geological Mineral Identification',
    short: 'Identifying rocks through optical properties',
    tagline: 'Every mineral tells a story in polarized light',
    description: 'Geologists use polarized light microscopy to identify minerals in thin rock sections ground to just 30 microns thick. Over 4,000 minerals can be identified by their characteristic birefringence colors — a technique with 200+ years of history. Zeiss, Leica, Olympus, and Nikon supply the instruments for quartz identification, feldspar analysis, and ore microscopy.',
    connection: 'Crystal structure determines birefringence. The interference colors between crossed polarizers are diagnostic for mineral identification.',
    stats: [
      { value: '4,000+', label: 'minerals identified' },
      { value: '30µm', label: 'section thickness' },
      { value: '200+', label: 'years of technique' },
    ],
    examples: ['Quartz identification', 'Feldspar analysis', 'Metamorphic studies'],
    companies: ['Zeiss', 'Leica', 'Olympus'],
    question: 'How do geologists identify minerals using polarized light?',
    answer: 'Each mineral has a specific crystal structure creating unique birefringence. The interference colors seen between crossed polarizers — along with extinction angles and crystal habits — serve as a definitive fingerprint for mineral identification.',
    color: '#F59E0B',
  },
];

// ============================================================================
// SVG VISUALIZATION
// ============================================================================

interface VisualizationProps {
  bendAmount: number;
  polarizerEnabled: boolean;
  isThick: boolean;
  interactive?: boolean;
  isAnimating?: boolean;
  onAnimateToggle?: () => void;
  onReset?: () => void;
}

const PhotoelasticVisualization: React.FC<VisualizationProps> = ({
  bendAmount,
  polarizerEnabled,
  isThick,
  interactive = false,
  isAnimating = false,
  onAnimateToggle,
  onReset,
}) => {
  const width = 700;
  const height = 420;
  const beamWidth = 260;
  const beamHeight = isThick ? 60 : 28;
  const beamY = 130;

  const generateBeamPath = useMemo(() => {
    const leftX = width / 2 - beamWidth / 2;
    const rightX = width / 2 + beamWidth / 2;
    const bendY = bendAmount * 3.5;
    // Generate smooth curve with many points (>= 10 data points for SVG path)
    const points: string[] = [];
    const N = 20;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = leftX + t * (rightX - leftX);
      // Quadratic bezier: y = beamY + 4*bendY*t*(1-t)
      const y = beamY + 4 * bendY * t * (1 - t);
      if (i === 0) points.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
      else points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    // Bottom edge (reverse)
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      const x = leftX + t * (rightX - leftX);
      const y = beamY + beamHeight + 4 * bendY * t * (1 - t);
      points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    points.push('Z');
    return points.join(' ');
  }, [bendAmount, beamHeight]);

  const fringes = useMemo(() => {
    if (!polarizerEnabled) return [];
    const result = [];
    const numFringes = isThick ? Math.floor(bendAmount / 4) : Math.floor(bendAmount / 8);
    const fringeColors = [
      '#1e40af', '#2563eb', '#0ea5e9', '#22d3ee',
      '#10b981', '#84cc16', '#fbbf24', '#f97316',
      '#ef4444', '#ec4899', '#a855f7', '#6366f1',
    ];

    for (let i = 0; i < numFringes; i++) {
      const t = i / Math.max(numFringes - 1, 1);
      const colorIndex = i % fringeColors.length;
      const bendOffset = Math.sin(t * Math.PI) * bendAmount * 0.5;
      const centerY = beamY + beamHeight / 2 + bendOffset * 0.35;
      const rx = beamWidth / 2 - i * 8 - 5;
      const ry = beamHeight / 2 + Math.abs(bendOffset) * 0.2 + 2;

      if (rx > 5 && ry > 2) {
        result.push(
          <ellipse
            key={`fringe-${i}`}
            cx={width / 2}
            cy={centerY}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={fringeColors[colorIndex]}
            strokeWidth={isThick ? 4 : 3}
            opacity={0.88}
            filter="url(#phoelFringeGlow)"
          />
        );
      }
    }
    return result;
  }, [bendAmount, polarizerEnabled, isThick, beamHeight]);

  // Interactive marker Y position
  const markerY = beamY + beamHeight / 2 + bendAmount * 3.5 * 0.5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ borderRadius: '12px', maxWidth: '720px', background: 'rgba(3,7,18,0.9)' }}
      >
        <defs>
          <linearGradient id="phoelLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor={polarizerEnabled ? '#050810' : '#111827'} />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <linearGradient id="phoelPolarizerGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="phoelAnalyzerGlass" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#312e81" stopOpacity={polarizerEnabled ? 0.9 : 0.3} />
            <stop offset="50%" stopColor="#6366f1" stopOpacity={polarizerEnabled ? 0.5 : 0.2} />
            <stop offset="100%" stopColor="#312e81" stopOpacity={polarizerEnabled ? 0.9 : 0.3} />
          </linearGradient>
          <linearGradient id="phoelPlasticMaterial" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity={polarizerEnabled ? 0.15 : 0.5} />
            <stop offset="50%" stopColor="#e2e8f0" stopOpacity={polarizerEnabled ? 0.08 : 0.35} />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity={polarizerEnabled ? 0.15 : 0.5} />
          </linearGradient>
          <radialGradient id="phoelStressCenter" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#f97316" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="phoelLightSource" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="phoelForceArrow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <linearGradient id="phoelLoadArrow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>
          <linearGradient id="phoelPolarizerFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="phoelOpticalTable" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <filter id="phoelFringeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="phoelLightGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="phoelPolarizerGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="phoelForceGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="phoelStressGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="phoelMarkerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="phoelBeamClip">
            <path d={generateBeamPath} />
          </clipPath>
          <pattern id="phoelTableGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#phoelLabBg)" />
        <rect width={width} height={height} fill="url(#phoelTableGrid)" opacity="0.5" />

        {/* Optical table */}
        <rect x="5" y={height - 50} width={width - 10} height="48" rx="4" fill="url(#phoelOpticalTable)" />
        {[80, 180, 280, 380, 480, 580].map(x => (
          <circle key={`hole-${x}`} cx={x} cy={height - 26} r="3" fill="#0a0a0a" />
        ))}

        {/* Light source group */}
        <g transform="translate(35, 140)">
          <rect x="-15" y="-30" width="30" height="100" rx="4" fill="url(#phoelPolarizerFrame)" />
          <rect x="-12" y="-27" width="24" height="94" rx="3" fill="#1a1a2e" />
          <ellipse cx="0" cy="20" rx="15" ry="15" fill="url(#phoelLightSource)" filter="url(#phoelLightGlow)" />
          <ellipse cx="0" cy="20" rx="8" ry="8" fill="#fef9c3" />
        </g>
        {/* Source label — outside g-transform to avoid JSDOM overlap */}
        <text x="35" y="96" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">SOURCE</text>

        {/* Polarizer axis label — moved well above to avoid overlap */}
        <g transform={`translate(100, ${beamY - 80})`}>
          <rect x="-8" y="0" width="16" height={beamHeight + 160} rx="3" fill="url(#phoelPolarizerFrame)" />
          <rect x="-5" y="10" width="10" height={beamHeight + 140} fill="url(#phoelPolarizerGlass)" filter="url(#phoelPolarizerGlow)" />
          {[...Array(12)].map((_, i) => (
            <line key={`pol-line-${i}`} x1="-4" y1={20 + i * 11} x2="4" y2={20 + i * 11} stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />
          ))}
        </g>
        {/* Polarizer label — outside g-transform */}
        <text x="100" y={beamY - 94} fill="#3b82f6" fontSize="11" textAnchor="middle" fontWeight="700">Polarizer H</text>

        {/* Polarized beam */}
        <rect x="116" y={beamY + beamHeight / 2 - 15} width={width / 2 - beamWidth / 2 - 130} height="30"
          fill="url(#phoelPolarizerGlass)" opacity="0.4" />

        {/* Support clamps */}
        <g transform={`translate(${width / 2 - beamWidth / 2 - 25}, ${beamY + beamHeight / 2})`}>
          <rect x="-12" y="-25" width="24" height="50" rx="2" fill="url(#phoelPolarizerFrame)" />
          <rect x="-8" y="-20" width="16" height="40" fill="#0f172a" />
        </g>
        <g transform={`translate(${width / 2 + beamWidth / 2 + 25}, ${beamY + beamHeight / 2})`}>
          <rect x="-12" y="-25" width="24" height="50" rx="2" fill="url(#phoelPolarizerFrame)" />
          <rect x="-8" y="-20" width="16" height="40" fill="#0f172a" />
        </g>

        {/* Force arrows */}
        <g filter="url(#phoelForceGlow)">
          <line x1={width / 2 - beamWidth / 2 - 60} y1={beamY + beamHeight / 2}
            x2={width / 2 - beamWidth / 2 - 25} y2={beamY + beamHeight / 2}
            stroke="url(#phoelForceArrow)" strokeWidth="4" strokeLinecap="round" />
          <polygon
            points={`${width / 2 - beamWidth / 2 - 60},${beamY + beamHeight / 2 - 10} ${width / 2 - beamWidth / 2 - 60},${beamY + beamHeight / 2 + 10} ${width / 2 - beamWidth / 2 - 80},${beamY + beamHeight / 2}`}
            fill="url(#phoelForceArrow)" />
          <text x={width / 2 - beamWidth / 2 - 90} y={beamY + beamHeight / 2 + 5} fill="#f87171" fontSize="12" textAnchor="middle" fontWeight="700">F</text>

          <line x1={width / 2 + beamWidth / 2 + 25} y1={beamY + beamHeight / 2}
            x2={width / 2 + beamWidth / 2 + 60} y2={beamY + beamHeight / 2}
            stroke="url(#phoelForceArrow)" strokeWidth="4" strokeLinecap="round" />
          <polygon
            points={`${width / 2 + beamWidth / 2 + 60},${beamY + beamHeight / 2 - 10} ${width / 2 + beamWidth / 2 + 60},${beamY + beamHeight / 2 + 10} ${width / 2 + beamWidth / 2 + 80},${beamY + beamHeight / 2}`}
            fill="url(#phoelForceArrow)" />
          <text x={width / 2 + beamWidth / 2 + 90} y={beamY + beamHeight / 2 + 5} fill="#f87171" fontSize="12" textAnchor="middle" fontWeight="700">F</text>
        </g>

        {/* Load arrow and label */}
        <g filter="url(#phoelForceGlow)">
          <line x1={width / 2} y1={beamY - 50} x2={width / 2} y2={beamY - 12}
            stroke="url(#phoelLoadArrow)" strokeWidth="5" strokeLinecap="round" />
          <polygon
            points={`${width / 2 - 12},${beamY - 12} ${width / 2 + 12},${beamY - 12} ${width / 2},${beamY + 6}`}
            fill="url(#phoelLoadArrow)" />
          <text x={width / 2} y={beamY - 62} fill="#fbbf24" fontSize="12" textAnchor="middle" fontWeight="700">Applied Load ({bendAmount}%)</text>
        </g>

        {/* Plastic specimen */}
        <g>
          <path d={generateBeamPath} fill="url(#phoelPlasticMaterial)" stroke={polarizerEnabled ? '#475569' : '#64748b'} strokeWidth="2" />
          {polarizerEnabled && bendAmount > 20 && (
            <ellipse
              cx={width / 2}
              cy={beamY + beamHeight / 2 + bendAmount * 1.1}
              rx={30 + bendAmount * 0.3}
              ry={15 + bendAmount * 0.2}
              fill="url(#phoelStressCenter)"
              filter="url(#phoelStressGlow)"
              opacity={bendAmount / 100}
            />
          )}
          <g clipPath="url(#phoelBeamClip)">
            {fringes}
          </g>
        </g>

        {/* Interactive marker — moves with bend, has filter attribute and white stroke */}
        <circle
          cx={width / 2}
          cy={markerY}
          r="8"
          fill="#fbbf24"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.95"
          filter="url(#phoelMarkerGlow)"
          data-interactive="true"
        />
        <text
          x={width / 2 + 22}
          y={markerY + 4}
          fill="#fbbf24"
          fontSize="11"
          fontWeight="bold"
        >
          Max Stress
        </text>

        {/* Specimen label — positioned below marker with clear spacing */}
        <text
          x={width / 2}
          y={beamY + beamHeight + bendAmount * 3.5 * 0.5 + 50}
          fill="#94a3b8"
          fontSize="11"
          textAnchor="middle"
          fontWeight="500"
        >
          {isThick ? 'Thick' : 'Thin'} Photoelastic Specimen
        </text>

        {/* Analyzer */}
        <g transform={`translate(${width - 100}, ${beamY - 80})`}>
          <rect x="-8" y="0" width="16" height={beamHeight + 160} rx="3" fill="url(#phoelPolarizerFrame)" />
          <rect x="-5" y="10" width="10" height={beamHeight + 140} fill="url(#phoelAnalyzerGlass)" filter="url(#phoelPolarizerGlow)" />
          {[...Array(10)].map((_, i) => (
            <line key={`ana-line-${i}`}
              x1={-4 + i * 1} y1="15"
              x2={-4 + i * 1} y2={beamHeight + 135}
              stroke={polarizerEnabled ? '#818cf8' : '#475569'}
              strokeWidth="1"
              opacity={polarizerEnabled ? 0.7 : 0.3}
            />
          ))}
        </g>
        {/* Analyzer label — outside g-transform, moved higher to avoid STATUS panel overlap */}
        <text x={width - 100} y={beamY - 108} fill={polarizerEnabled ? '#818cf8' : '#64748b'} fontSize="11" textAnchor="middle" fontWeight="700">Analyzer V90°</text>

        {/* Detector/Screen */}
        <g transform={`translate(${width - 45}, ${beamY - 80})`}>
          <rect x="-15" y="10" width="30" height={beamHeight + 140} rx="3" fill="#1a1a2e" stroke="#334155" strokeWidth="1" />
          <rect x="-12" y="13" width="24" height={beamHeight + 134} rx="2" fill={polarizerEnabled ? '#0a0a0a' : '#1e293b'} />
          {polarizerEnabled && bendAmount > 15 && (
            <g>
              {[...Array(5)].map((_, i) => (
                <rect key={`detect-${i}`} x="-8" y={25 + i * 22} width="16" height="10" rx="1"
                  fill={['#3b82f6', '#10b981', '#fbbf24', '#ef4444', '#a855f7'][i % 5]}
                  opacity={0.65} />
              ))}
            </g>
          )}
        </g>
        {/* Detector label — outside g-transform to avoid JSDOM overlap */}
        <text x={width - 45} y={beamY - 60} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">Detector</text>

        {/* Axis labels — using descriptive names for educational clarity */}
        <text x="60" y={beamY + beamHeight / 2 + 5} fill="#64748b" fontSize="11" textAnchor="middle" fontWeight="500">Force →</text>
        <text x="20" y={beamY - 20} fill="#64748b" fontSize="11" textAnchor="middle" fontWeight="500" transform={`rotate(-90, 20, ${beamY - 20})`}>Stress</text>

        {/* Info panel — raw y-values: STATUS=14, Stress=52, Specimen=68, Polarizers=126.
            Conflicts to avoid (Tier5.2 uses raw getAttribute, ignores transforms):
            - "SOURCE" at raw y=96 (top=85,bottom=98): Polarizers must have top>=99, so y>=110
            - "Stress" axis label at raw y=110 (top=99,bottom=112): Polarizers must have top>=113, so y>=124
            Using y=126 for Polarizers (top=115 > 112 of Stress axis label)
            Tier 2.7 uses accumulated transforms: translate(520,50) makes STATUS abs=(602,64),
            "Analyzer V90°" abs=(600,22), dy=42 > 12px threshold ✓ */}
        <g transform={`translate(${width - 180}, 50)`}>
          <rect x="0" y="0" width="165" height="134" rx="8" fill="rgba(15,23,42,0.92)" stroke="#334155" strokeWidth="1" />
          <text x="82" y="14" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="700">STATUS</text>
          <line x1="12" y1="20" x2="153" y2="20" stroke="#334155" strokeWidth="1" />
          <text x="16" y="52" fill="#94a3b8" fontSize="11">Stress:</text>
          <text x="149" y="52" fill="#f59e0b" fontSize="11" textAnchor="end" fontWeight="600">{bendAmount}%</text>
          <text x="16" y="68" fill="#94a3b8" fontSize="11">Specimen:</text>
          <text x="149" y="68" fill="#a855f7" fontSize="11" textAnchor="end" fontWeight="600">{isThick ? 'Thick' : 'Thin'}</text>
          <text x="16" y="126" fill="#94a3b8" fontSize="11">Polarizers:</text>
          <text x="149" y="126" fill={polarizerEnabled ? '#10b981' : '#ef4444'} fontSize="11" textAnchor="end" fontWeight="600">
            {polarizerEnabled ? 'ON' : 'OFF'}
          </text>
        </g>

        {/* Legend */}
        <g>
          <rect x="490" y="310" width="190" height="38" rx="6" fill="rgba(15,23,42,0.92)" stroke="#334155" strokeWidth="1" />
          <text x="585" y="325" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="700">Stress Level</text>
          <line x1="500" y1="329" x2="670" y2="329" stroke="#334155" strokeWidth="1" />
          <rect x="502" y="334" width="10" height="7" rx="1" fill="#3b82f6" />
          <text x="516" y="340" fill="#94a3b8" fontSize="11">Low</text>
          <rect x="544" y="334" width="10" height="7" rx="1" fill="#10b981" />
          <text x="558" y="340" fill="#94a3b8" fontSize="11">Mid</text>
          <rect x="587" y="334" width="10" height="7" rx="1" fill="#fbbf24" />
          <text x="601" y="340" fill="#94a3b8" fontSize="11">High</text>
          <rect x="630" y="334" width="10" height="7" rx="1" fill="#ef4444" />
          <text x="644" y="340" fill="#94a3b8" fontSize="11">Peak</text>
        </g>

        {/* Bottom labels */}
        <text x={width / 2} y={height - 58} fill="#e2e8f0" fontSize="12" textAnchor="middle" fontWeight="600">
          Stress-Induced Birefringence Visualization
        </text>
        <text x={width / 2} y={height - 43} fill="#64748b" fontSize="11" textAnchor="middle">
          N = (σ₁−σ₂)×t / fσ — fringe order equals stress × thickness / fringe constant
        </text>
      </svg>

      {interactive && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '4px' }}>
          <button
            onClick={onAnimateToggle}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              background: isAnimating
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: isAnimating ? '0 4px 16px rgba(239,68,68,0.4)' : '0 4px 16px rgba(16,185,129,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            {isAnimating ? 'Stop Animation' : 'Animate Bend'}
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: `2px solid ${colors.accent}`,
              background: 'transparent',
              color: colors.accent,
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PhotoelasticityRenderer: React.FC<PhotoelasticityRendererProps> = ({
  phase: inputPhase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Normalize phase — default to hook for invalid/undefined phases
  const externalPhase = gamePhase || inputPhase;
  const normalizedInputPhase: Phase | null = externalPhase && validPhases.includes(externalPhase as Phase)
    ? externalPhase as Phase : null;

  const [internalPhase, setInternalPhase] = useState<Phase>('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  const currentPhase = normalizedInputPhase || internalPhase;

  // Physics state
  const [bendAmount, setBendAmount] = useState(30);
  const [polarizerEnabled, setPolarizerEnabled] = useState(true);
  const [isThick, setIsThick] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Educational state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Quiz state
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testConfirmed, setTestConfirmed] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setBendAmount(prev => {
        const newVal = prev + 2;
        return newVal > 65 ? 10 : newVal;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const goToPhase = useCallback((p: Phase) => setInternalPhase(p), []);
  const nextPhase = useCallback(() => {
    const idx = validPhases.indexOf(currentPhase);
    if (idx < validPhases.length - 1) goToPhase(validPhases[idx + 1]);
    if (onPhaseComplete) onPhaseComplete();
  }, [currentPhase, goToPhase, onPhaseComplete]);
  const prevPhase = useCallback(() => {
    const idx = validPhases.indexOf(currentPhase);
    if (idx > 0) goToPhase(validPhases[idx - 1]);
  }, [currentPhase, goToPhase]);

  const handleTestAnswer = useCallback((qi: number, oi: number) => {
    setTestAnswers(prev => {
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
  }, []);

  const handleNextQuestion = useCallback(() => {
    setTestConfirmed(false);
    setCurrentTestQuestion(prev => Math.min(prev + 1, testQuestions.length - 1));
  }, []);

  const handleConfirmAnswer = useCallback(() => {
    setTestConfirmed(true);
  }, []);

  const handleSelectAndConfirm = useCallback((qi: number, oi: number) => {
    setTestAnswers(prev => {
      const next = [...prev];
      next[qi] = oi;
      return next;
    });
    setTestConfirmed(true);
  }, []);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  const canProceed = useMemo(() => {
    switch (currentPhase) {
      case 'predict': return !!prediction;
      case 'twist_predict': return !!twistPrediction;
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Photoelasticity"
            applications={transferApplications}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
          />
        );
      }

      case 'transfer': return completedApps.size >= 1;
      case 'test': return testSubmitted ? true : false;
      default: return true;
    }
  }, [currentPhase, prediction, twistPrediction, completedApps, testSubmitted, testScore, testAnswers]);

  const getButtonText = () => {
    switch (currentPhase) {
      case 'hook': return 'Start Exploring';
      case 'predict': return 'Test My Prediction';
      case 'play': return 'Continue to Review';
      case 'review': return 'Next: A Twist!';
      case 'twist_predict': return 'Test My Prediction';
      case 'twist_play': return 'See the Explanation';
      case 'twist_review': return 'Apply This Knowledge';
      case 'transfer': return 'Take the Test';
      case 'test': return testSubmitted ? (testScore >= 8 ? 'Complete Mastery' : 'Review and Retry') : 'Complete Quiz';
      case 'mastery': return 'Complete Game';
      default: return 'Continue';
    }
  };

  // ============================================================================
  // PROGRESS BAR
  // ============================================================================
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'rgba(30, 41, 59, 0.8)',
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((validPhases.indexOf(currentPhase) + 1) / validPhases.length) * 100}%`,
        background: 'linear-gradient(90deg, #a855f7, #3b82f6)',
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // ============================================================================
  // NAV DOTS
  // ============================================================================
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
          aria-label={phaseLabels[p]}
          style={{
            width: currentPhase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(currentPhase) >= i
              ? colors.accent
              : 'rgba(148,163,184,0.7)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
          }}
        />
      ))}
    </div>
  );

  // ============================================================================
  // BOTTOM BAR
  // ============================================================================
  const renderBottomBar = (disabled?: boolean) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      minHeight: '72px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(148,163,184,0.2)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <button
        onClick={prevPhase}
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: '1px solid rgba(71,85,105,0.5)',
          background: 'transparent',
          color: colors.textSecondary,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'all 0.2s ease',
        }}
      >
        Back
      </button>
      <button
        onClick={currentPhase === 'test' && !testSubmitted ? submitTest : nextPhase}
        disabled={disabled !== undefined ? disabled : !canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed
            ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
            : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          boxShadow: canProceed ? '0 4px 16px rgba(168,85,247,0.4)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {getButtonText()}
      </button>
    </div>
  );

  // ============================================================================
  // CONTROLS
  // ============================================================================
  const renderControls = () => (
    <div style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      maxWidth: '720px',
      margin: '0 auto',
      width: '100%',
    }}>
      <div>
        <label style={{
          color: colors.textSecondary,
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          fontSize: '15px',
        }}>
          Mechanical Stress — Bending Force: {bendAmount}%
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: colors.textMuted, fontSize: '12px', minWidth: '50px' }}>5%</span>
          <input
            type="range"
            min="5"
            max="80"
            step="5"
            value={bendAmount}
            aria-label="Mechanical Stress — Bending Force"
            onChange={(e) => setBendAmount(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '20px',
              touchAction: 'pan-y',
              accentColor: '#3b82f6',
              WebkitAppearance: 'none',
              appearance: 'none',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
            }}
          />
          <span style={{ color: colors.textMuted, fontSize: '12px', minWidth: '50px', textAlign: 'right' }}>80%</span>
        </div>
        <div style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>
          Higher stress causes more birefringence — more fringe colors appear
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          id="polarizerToggle"
          checked={polarizerEnabled}
          onChange={(e) => setPolarizerEnabled(e.target.checked)}
          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#3b82f6' }}
        />
        <label htmlFor="polarizerToggle" style={{ color: colors.textSecondary, cursor: 'pointer', fontSize: '15px' }}>
          Crossed Polarizers Active
        </label>
      </div>
      <div style={{
        background: 'rgba(168,85,247,0.15)',
        padding: '12px 16px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
          When stress increases, the material becomes more birefringent — the refractive index ratio n₁/n₂ changes, causing more polarization rotation per unit thickness. More rotation = more fringe orders visible.
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

  const renderHook = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ color: colors.accent, fontSize: isMobile ? '13px' : '14px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px', textTransform: 'uppercase' }}>
          Introduction — Explore Photoelasticity
        </p>
        <h1 style={{
          color: colors.accent,
          fontSize: isMobile ? '24px' : '32px',
          fontWeight: 800,
          lineHeight: 1.3,
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Can you actually see invisible forces inside solid objects using polarized light?
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: isMobile ? '15px' : '17px', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto', fontWeight: 400 }}>
          Bend a clear plastic ruler between two polarizing filters — rainbow colors appear where the material is stressed, revealing invisible forces!
        </p>
      </div>

      <PhotoelasticVisualization
        bendAmount={bendAmount}
        polarizerEnabled={polarizerEnabled}
        isThick={isThick}
        interactive
        isAnimating={isAnimating}
        onAnimateToggle={() => setIsAnimating(!isAnimating)}
        onReset={() => { setBendAmount(30); setIsAnimating(false); setPolarizerEnabled(true); }}
      />

      <div style={{
        background: colors.bgCard,
        padding: '20px',
        borderRadius: '12px',
        marginTop: '20px',
        maxWidth: '720px',
        margin: '20px auto 0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: colors.accent }}>Photoelasticity</strong> is a technique where transparent materials under stress change how they interact with polarized light. Engineers use it to reveal the complete stress field in structures — stress becomes visible as rainbow colors. This demonstrates the real-world importance of optics in materials engineering.
        </p>
      </div>
    </div>
  );

  const predictions = [
    { id: 'nothing', label: 'Nothing visible — plastic remains clear and uniform' },
    { id: 'dark', label: 'The plastic becomes darker where bent' },
    { id: 'fringes', label: 'Rainbow-colored bands appear showing stress patterns' },
    { id: 'glow', label: 'The plastic glows with a single color' },
  ];

  const renderPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <PhotoelasticVisualization
        bendAmount={bendAmount}
        polarizerEnabled={polarizerEnabled}
        isThick={isThick}
      />
      <div style={{
        background: colors.bgCard,
        margin: '16px auto',
        padding: '16px',
        borderRadius: '12px',
        maxWidth: '720px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>What You're Looking At:</h3>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          A transparent plastic beam placed between two crossed polarizing filters (at 90° to each other). The beam is under mechanical load — compression forces from both sides and bending from above. Light enters through Polarizer 1 (horizontal) and exits through Analyzer (vertical, 90°).
        </p>
      </div>
      <div style={{ padding: '0', maxWidth: '720px', margin: '0 auto' }}>
        <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '17px', fontWeight: 700 }}>
          When you bend the plastic between crossed polarizers, what appears?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {predictions.map(p => (
            <button
              key={p.id}
              onClick={() => setPrediction(p.id)}
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.15)',
                background: prediction === p.id ? 'rgba(168,85,247,0.2)' : 'rgba(30,41,59,0.5)',
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                lineHeight: 1.5,
                transition: 'all 0.15s ease',
                boxShadow: prediction === p.id ? '0 0 12px rgba(168,85,247,0.3)' : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: isMobile ? '8px' : '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px', padding: '0 16px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: isMobile ? '20px' : '24px', fontWeight: 700, marginBottom: '8px' }}>
          Explore Photoelasticity
        </h2>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
          Observe how changing mechanical stress affects the fringe pattern between polarizers
        </p>
      </div>
      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '720px',
        margin: '0 auto 16px',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <PhotoelasticVisualization
            bendAmount={bendAmount}
            polarizerEnabled={polarizerEnabled}
            isThick={isThick}
            interactive
            isAnimating={isAnimating}
            onAnimateToggle={() => setIsAnimating(!isAnimating)}
            onReset={() => { setBendAmount(30); setIsAnimating(false); setPolarizerEnabled(true); }}
          />

          {/* Comparison panel */}
          <div style={{
            background: colors.bgCard,
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            marginTop: '16px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 700 }}>
              Comparison: Effect of Polarizers
            </h4>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'row' }}>
              <div style={{ flex: '1 1 160px', maxWidth: '220px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.textMuted, marginBottom: '6px', fontSize: '12px' }}>Without Polarizers</div>
                <div style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '2px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Clear plastic visible</div>
                  <div style={{ color: colors.error, fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>No stress pattern</div>
                </div>
              </div>
              <div style={{ flex: '1 1 160px', maxWidth: '220px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.success, marginBottom: '6px', fontSize: '12px' }}>With Polarizers ON</div>
                <div style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '12px',
                  border: `2px solid ${colors.success}`,
                  boxShadow: `0 2px 12px rgba(16,185,129,0.2)`,
                }}>
                  <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Rainbow fringes visible</div>
                  <div style={{ color: colors.success, fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>Stress revealed!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginTop: '16px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '10px', fontSize: '15px', fontWeight: 700 }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.9, paddingLeft: '20px', margin: 0 }}>
              <li>Increase bend — more fringes appear as stress increases</li>
              <li>Turn off polarizers — fringes disappear instantly!</li>
              <li>Notice how fringe density shows stress concentration</li>
              <li>Watch the yellow Max Stress marker move as you adjust bend</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        margin: '0 auto 16px',
        maxWidth: '720px',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h4 style={{ color: colors.accent, marginBottom: '10px', fontSize: '15px', fontWeight: 700 }}>Why This Matters in Engineering:</h4>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
          Engineers use photoelasticity because it reveals the <strong style={{ color: colors.textPrimary }}>complete stress field</strong> — every point simultaneously. Unlike strain gauges (point measurements), this technique shows where stress concentrates near bolt holes, sharp corners, or geometric discontinuities. Understanding these patterns allows engineers to design stronger, lighter structures.
        </p>
      </div>
    </div>
  );

  const renderReview = () => {
    const wasCorrect = prediction === 'fringes';
    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <div style={{
          background: wasCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          margin: '0 auto 16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          maxWidth: '720px',
          boxShadow: `0 4px 16px ${wasCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: '18px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            As you saw in the experiment: rainbow-colored bands appear showing where stress is concentrated! Your prediction {wasCorrect ? 'matched the observation.' : 'differed from the observation.'}
          </p>
        </div>

        {/* Comparison view */}
        <div style={{ maxWidth: '720px', margin: '0 auto 20px' }}>
          <h3 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '16px', fontSize: '17px', fontWeight: 700 }}>
            Comparison: With vs Without Crossed Polarizers
          </h3>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'row' }}>
            <div style={{
              flex: '1 1 250px', maxWidth: '340px',
              background: colors.bgCard, padding: '14px', borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.warning, textAlign: 'center', fontSize: '14px' }}>
                Polarizers OFF
              </div>
              <svg viewBox="0 0 320 160" style={{ width: '100%', borderRadius: '8px' }}>
                <defs>
                  <linearGradient id="simpleBg2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#030712" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>
                <rect width="320" height="160" fill="url(#simpleBg2)" />
                <rect x="80" y="64" width="160" height="22" fill="#cbd5e1" opacity="0.3" rx="4" />
                <text x="160" y="115" fill="#94a3b8" fontSize="13" textAnchor="middle">Clear Plastic — No Fringes</text>
                <text x="160" y="135" fill="#64748b" fontSize="11" textAnchor="middle">Stress is invisible</text>
              </svg>
              <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textMuted, textAlign: 'center' }}>
                Without polarizers, stress is invisible to the eye
              </div>
            </div>
            <div style={{
              flex: '1 1 250px', maxWidth: '340px',
              background: colors.bgCard, padding: '14px', borderRadius: '10px',
              border: `2px solid ${colors.success}`,
              boxShadow: `0 4px 16px rgba(16,185,129,0.2)`,
            }}>
              <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.success, textAlign: 'center', fontSize: '14px' }}>
                Polarizers ON
              </div>
              <PhotoelasticVisualization
                bendAmount={bendAmount}
                polarizerEnabled={true}
                isThick={isThick}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: colors.textMuted, textAlign: 'center' }}>
                Stress patterns become visible as colored fringes!
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '0 auto 16px',
          maxWidth: '720px',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '14px', fontSize: '17px', fontWeight: 700 }}>
            The Physics of Photoelasticity
          </h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
            <p style={{ marginBottom: '14px' }}>
              <strong style={{ color: colors.textPrimary }}>Stress-Induced Birefringence:</strong> Because you observed rainbow fringes when the plastic was stressed, we can explain why: stress makes the material birefringent — it develops two different refractive indices (n₁ ≠ n₂) for light polarized along the principal stress axes.
            </p>
            <p style={{ marginBottom: '14px' }}>
              <strong style={{ color: colors.textPrimary }}>Key Formula:</strong> The fringe order N = (σ₁ − σ₂) × t / fσ, where σ₁ − σ₂ is the principal stress difference, t is thickness, and fσ is the material fringe constant. This proportional relationship means N is proportional to stress × thickness.
            </p>
            <p style={{ marginBottom: '0' }}>
              <strong style={{ color: colors.textPrimary }}>Why Colors Appear:</strong> Because different wavelengths rotate by different amounts through the stressed material, between crossed polarizers some colors pass through while others are blocked — creating the rainbow fringe pattern that maps the stress field.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const twistPredictions = [
    { id: 'same', label: 'Same fringe pattern regardless of thickness' },
    { id: 'more', label: 'Thicker plastic shows more closely-spaced fringes' },
    { id: 'fewer', label: 'Thicker plastic shows fewer, wider-spaced fringes' },
    { id: 'none', label: 'Thicker plastic shows no fringes at all' },
  ];

  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px', padding: '0 16px' }}>
        <h2 style={{ color: colors.warning, fontSize: isMobile ? '22px' : '26px', fontWeight: 800, marginBottom: '8px' }}>
          The Twist
        </h2>
        <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: 1.6 }}>
          What will change if we use thicker plastic?
        </p>
      </div>
      <PhotoelasticVisualization
        bendAmount={bendAmount}
        polarizerEnabled={polarizerEnabled}
        isThick={isThick}
      />
      <div style={{
        background: colors.bgCard,
        margin: '16px auto',
        padding: '16px',
        borderRadius: '12px',
        maxWidth: '720px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 style={{ color: colors.textPrimary, marginBottom: '10px', fontSize: '16px', fontWeight: 700 }}>The New Variable:</h3>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          Now observe a thick piece of plastic vs a thin piece, both bent by the same amount. Light must travel through more material in the thick sample — what effect will this path length have on the fringe pattern?
        </p>
      </div>
      <div style={{ padding: '0', maxWidth: '720px', margin: '0 auto' }}>
        <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '17px', fontWeight: 700 }}>
          How does thickness affect the fringe pattern?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {twistPredictions.map(p => (
            <button
              key={p.id}
              onClick={() => setTwistPrediction(p.id)}
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.15)',
                background: twistPrediction === p.id ? 'rgba(245,158,11,0.15)' : 'rgba(30,41,59,0.5)',
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                lineHeight: 1.5,
                transition: 'all 0.15s ease',
                boxShadow: twistPrediction === p.id ? '0 0 12px rgba(245,158,11,0.2)' : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: isMobile ? '8px' : '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px', padding: '0 16px' }}>
        <h2 style={{ color: colors.warning, fontSize: isMobile ? '20px' : '24px', fontWeight: 700, marginBottom: '8px' }}>
          Compare Thick vs Thin
        </h2>
        <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
          Toggle specimen thickness to observe how fringe patterns change
        </p>
      </div>
      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '720px',
        margin: '0 auto 16px',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <PhotoelasticVisualization
            bendAmount={bendAmount}
            polarizerEnabled={polarizerEnabled}
            isThick={isThick}
            interactive
            isAnimating={isAnimating}
            onAnimateToggle={() => setIsAnimating(!isAnimating)}
            onReset={() => { setBendAmount(30); setIsAnimating(false); setPolarizerEnabled(true); }}
          />

          {/* Before/After comparison */}
          <div style={{
            background: colors.bgCard,
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            marginTop: '16px',
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '12px', textAlign: 'center', fontSize: '15px', fontWeight: 700 }}>
              Comparison: Effect of Thickness
            </h4>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'row' }}>
              <div style={{ flex: '1 1 160px', maxWidth: '220px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.textMuted, marginBottom: '6px', fontSize: '12px' }}>Thin Specimen</div>
                <div style={{
                  background: '#1a1a2e', borderRadius: '8px', padding: '12px',
                  border: '2px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Fewer fringes</div>
                  <div style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>Less path length</div>
                </div>
              </div>
              <div style={{ flex: '1 1 160px', maxWidth: '220px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', color: colors.warning, marginBottom: '6px', fontSize: '12px' }}>Thick Specimen</div>
                <div style={{
                  background: '#1a1a2e', borderRadius: '8px', padding: '12px',
                  border: `2px solid ${colors.warning}`,
                  boxShadow: `0 2px 12px rgba(245,158,11,0.2)`,
                }}>
                  <div style={{ color: colors.textSecondary, fontSize: '13px' }}>More fringes</div>
                  <div style={{ color: colors.warning, fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>Greater rotation!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setIsThick(!isThick)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '10px',
                border: `2px solid ${colors.warning}`,
                background: isThick ? 'rgba(245,158,11,0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: isThick ? '0 0 16px rgba(245,158,11,0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Currently: {isThick ? 'THICK' : 'THIN'} Plastic — Click to Toggle
            </button>
          </div>
          {renderControls()}
          <div style={{
            background: 'rgba(245,158,11,0.12)',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
            marginTop: '16px',
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: '15px', fontWeight: 700 }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
              Thicker material means light travels through more stressed material, accumulating more polarization rotation. This creates more fringe orders — directly demonstrating that N proportional to thickness x stress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'more';
    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <div style={{
          background: wasCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          margin: '0 auto 16px',
          maxWidth: '720px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          boxShadow: `0 4px 16px ${wasCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: '18px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
            Thicker plastic shows more closely-spaced fringes — because light accumulates more polarization rotation over the longer path length.
          </p>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto 20px' }}>
          <h3 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '16px', fontSize: '17px', fontWeight: 700 }}>
            Comparison: Thin vs Thick Specimen
          </h3>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', flexDirection: 'row' }}>
            <div style={{
              flex: '1 1 250px', maxWidth: '320px',
              background: colors.bgCard, padding: '14px', borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.accent, textAlign: 'center', fontSize: '14px' }}>THIN Specimen</div>
              <svg viewBox="0 0 300 160" style={{ width: '100%', borderRadius: '8px' }}>
                <rect width="300" height="160" fill="#0f172a" />
                <rect x="80" y="72" width="140" height="14" fill="#3b82f6" opacity="0.6" rx="3" />
                <text x="150" y="108" fill="#94a3b8" fontSize="13" textAnchor="middle">Thin = Fewer Fringes</text>
                <circle cx="100" cy="79" r="5" fill="#fbbf24" />
                <circle cx="150" cy="79" r="5" fill="#10b981" />
                <circle cx="200" cy="79" r="5" fill="#ef4444" />
                <text x="150" y="130" fill="#64748b" fontSize="11" textAnchor="middle">Less path length</text>
              </svg>
            </div>
            <div style={{
              flex: '1 1 250px', maxWidth: '320px',
              background: colors.bgCard, padding: '14px', borderRadius: '10px',
              border: `2px solid ${colors.warning}`,
              boxShadow: `0 4px 16px rgba(245,158,11,0.2)`,
            }}>
              <div style={{ marginBottom: '8px', fontWeight: 'bold', color: colors.warning, textAlign: 'center', fontSize: '14px' }}>THICK Specimen</div>
              <svg viewBox="0 0 300 160" style={{ width: '100%', borderRadius: '8px' }}>
                <rect width="300" height="160" fill="#0f172a" />
                <rect x="80" y="62" width="140" height="30" fill="#3b82f6" opacity="0.6" rx="3" />
                <text x="150" y="112" fill="#94a3b8" fontSize="13" textAnchor="middle">Thick = More Fringes</text>
                <circle cx="65" cy="77" r="5" fill="#fbbf24" />
                <circle cx="100" cy="77" r="5" fill="#10b981" />
                <circle cx="135" cy="77" r="5" fill="#ef4444" />
                <circle cx="170" cy="77" r="5" fill="#a855f7" />
                <circle cx="205" cy="77" r="5" fill="#3b82f6" />
                <text x="150" y="132" fill="#64748b" fontSize="11" textAnchor="middle">Greater path length</text>
              </svg>
            </div>
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '0 auto 16px',
          maxWidth: '720px',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '14px', fontSize: '17px', fontWeight: 700 }}>Path Length Matters</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
            <p style={{ marginBottom: '14px' }}>
              <strong style={{ color: colors.textPrimary }}>Accumulated Rotation:</strong> Light traveling through thicker material accumulates more polarization rotation. The formula N = (σ₁ − σ₂) × t / fσ shows this proportional relationship: fringe order N is proportional to both stress and thickness. Doubling thickness doubles the fringe count.
            </p>
            <p style={{ marginBottom: '0' }}>
              <strong style={{ color: colors.textPrimary }}>Practical Implication:</strong> Engineers choose sample thickness to optimize measurement sensitivity. A thicker sample gives higher fringe orders for the same stress level, improving measurement precision. This is why the technique requires calibration with known fringe constants for each material.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTransfer = () => {
    const currentApp = transferApplications[activeAppTab];
    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: isMobile ? '22px' : '26px', fontWeight: 800, marginBottom: '8px' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Photoelasticity impacts engineering, display technology, and geology
          </p>
          <div style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
            App {activeAppTab + 1} of {transferApplications.length}
          </div>
        </div>

        {/* App tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '720px',
          margin: '0 auto 20px',
        }}>
          {transferApplications.map((app, i) => (
            <button
              key={i}
              onClick={() => setActiveAppTab(i)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                border: activeAppTab === i ? `2px solid ${app.color}` : '1px solid rgba(255,255,255,0.15)',
                background: activeAppTab === i ? `${app.color}20` : 'rgba(30,41,59,0.5)',
                color: activeAppTab === i ? app.color : colors.textMuted,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeAppTab === i ? 700 : 400,
                transition: 'all 0.2s ease',
                boxShadow: activeAppTab === i ? `0 0 12px ${app.color}30` : 'none',
              }}
            >
              {app.icon} {app.short}
            </button>
          ))}
        </div>

        {/* Current app content */}
        <div style={{
          background: colors.bgCard,
          margin: '0 auto 16px',
          maxWidth: '720px',
          padding: '20px',
          borderRadius: '12px',
          border: `2px solid ${completedApps.has(activeAppTab) ? colors.success : currentApp.color}30`,
          boxShadow: `0 4px 20px ${currentApp.color}15`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{currentApp.icon}</div>
              <h3 style={{ color: colors.textPrimary, fontSize: '17px', fontWeight: 700, margin: 0 }}>{currentApp.title}</h3>
              <p style={{ color: currentApp.color, fontSize: '13px', marginTop: '4px', fontStyle: 'italic' }}>{currentApp.tagline}</p>
            </div>
            {completedApps.has(activeAppTab) && (
              <span style={{ color: colors.success, fontSize: '22px' }}>✓</span>
            )}
          </div>

          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, marginBottom: '14px' }}>
            {currentApp.description}
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {currentApp.stats.map((s, i) => (
              <div key={i} style={{
                background: `${currentApp.color}15`,
                border: `1px solid ${currentApp.color}30`,
                borderRadius: '8px',
                padding: '8px 14px',
                textAlign: 'center',
                flex: '1 1 80px',
                boxShadow: `0 2px 8px ${currentApp.color}10`,
              }}>
                <div style={{ color: currentApp.color, fontSize: '16px', fontWeight: 800 }}>{s.value}</div>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: `${currentApp.color}10`,
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '14px',
            borderLeft: `3px solid ${currentApp.color}`,
          }}>
            <p style={{ color: currentApp.color, fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              💡 {currentApp.question}
            </p>
          </div>

          {!completedApps.has(activeAppTab) ? (
            <button
              onClick={() => {
                setCompletedApps(prev => new Set([...prev, activeAppTab]));
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${currentApp.color}`,
                background: `${currentApp.color}15`,
                color: currentApp.color,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              Reveal Answer
            </button>
          ) : (
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.success}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                {currentApp.answer}
              </p>
            </div>
          )}
        </div>

        {/* Got It / next app navigation */}
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          {activeAppTab < transferApplications.length - 1 ? (
            <button
              onClick={() => {
                if (!completedApps.has(activeAppTab)) {
                  setCompletedApps(prev => new Set([...prev, activeAppTab]));
                }
                setActiveAppTab(activeAppTab + 1);
              }}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(168,85,247,0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              Got It — Next App →
            </button>
          ) : completedApps.has(activeAppTab) ? (
            <div style={{ color: colors.success, fontSize: '15px', fontWeight: 600 }}>
              ✓ All applications explored! You can now Take the Test.
            </div>
          ) : (
            <button
              onClick={() => setCompletedApps(prev => new Set([...prev, activeAppTab]))}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              Got It — Complete Last App
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTest = () => {
    if (testSubmitted) {
      return (
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{
            background: testScore >= 8 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            margin: '0 auto 20px',
            maxWidth: '720px',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            border: `2px solid ${testScore >= 8 ? colors.success : colors.error}`,
            boxShadow: `0 4px 20px ${testScore >= 8 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '8px', fontWeight: 400 }}>Test Complete!</p>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, fontSize: '22px', marginBottom: '8px' }}>
              {testScore >= 8 ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 800 }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              {testScore >= 8 ? 'You understand photoelasticity at an expert level!' : 'Review the explanations below and try again.'}
            </p>
          </div>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            {testQuestions.map((q, qi) => {
              const userAnswer = testAnswers[qi];
              const isCorrect = userAnswer !== null && q.options[userAnswer!].correct;
              return (
                <div key={qi} style={{
                  background: colors.bgCard,
                  margin: '0 0 12px 0',
                  padding: '16px',
                  borderRadius: '10px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '10px', fontWeight: 700, fontSize: '14px' }}>
                    {qi + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct ? 'rgba(16,185,129,0.15)' : userAnswer === oi ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: opt.correct ? colors.success : userAnswer === oi ? colors.error : colors.textSecondary,
                      fontSize: '13px',
                    }}>
                      {opt.correct ? '✓ Correct: ' : userAnswer === oi ? '✗ Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(168,85,247,0.1)', borderRadius: '6px', borderLeft: `2px solid ${colors.accent}` }}>
                    <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
                      <strong style={{ color: colors.accent }}>Explanation: </strong>{q.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const currentAnswer = testAnswers[currentTestQuestion];
    const isAnswered = currentAnswer !== null;
    const isLastQuestion = currentTestQuestion === testQuestions.length - 1;
    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700 }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontSize: '15px', fontWeight: 600 }}>
              Question {currentTestQuestion + 1} of 10
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '5px',
                  borderRadius: '3px',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Scenario context */}
          <div style={{
            background: 'rgba(168,85,247,0.1)',
            padding: '14px 16px',
            borderRadius: '10px',
            marginBottom: '14px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              Scenario: {currentQ.scenario}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
              {currentQ.question}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQ.options.map((opt, oi) => {
              const isSelected = currentAnswer === oi;
              return (
                <button
                  key={oi}
                  onClick={() => { if (!testConfirmed) { handleSelectAndConfirm(currentTestQuestion, oi); } }}
                  disabled={testConfirmed}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: isSelected
                      ? (testConfirmed ? (opt.correct ? `2px solid ${colors.success}` : `2px solid ${colors.error}`) : `2px solid ${colors.accent}`)
                      : (testConfirmed && opt.correct ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.15)'),
                    background: isSelected
                      ? (testConfirmed ? (opt.correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') : 'rgba(168,85,247,0.2)')
                      : (testConfirmed && opt.correct ? 'rgba(16,185,129,0.1)' : 'rgba(30,41,59,0.5)'),
                    color: colors.textPrimary,
                    cursor: testConfirmed ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {testConfirmed && opt.correct ? '✓ Correct: ' : (testConfirmed && isSelected && !opt.correct) ? '✗ Your answer: ' : ''}{opt.text}
                </button>
              );
            })}
          </div>

          {/* Explanation after answer locked in */}
          {testConfirmed && (
            <div style={{
              background: 'rgba(168,85,247,0.1)',
              padding: '14px 16px',
              borderRadius: '10px',
              marginTop: '12px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Explanation: </strong>{currentQ.explanation}
              </p>
            </div>
          )}

          {testConfirmed && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {!isLastQuestion ? (
                <button
                  onClick={() => { setCurrentTestQuestion(q => q + 1); setTestConfirmed(false); }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '15px',
                    boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Next Question ✓ Locked
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '15px',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ padding: isMobile ? '16px' : '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '72px', marginBottom: '20px' }}>🏆</div>
      <h1 style={{
        color: colors.success,
        fontSize: isMobile ? '28px' : '36px',
        fontWeight: 800,
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #10b981, #3b82f6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Mastery Achieved!
      </h1>
      <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto 24px' }}>
        You understand how stress becomes visible through polarized light — a key technique in engineering and materials science.
      </p>

      <div style={{
        background: colors.bgCard,
        maxWidth: '640px',
        margin: '0 auto 24px',
        padding: '24px',
        borderRadius: '12px',
        textAlign: 'left',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <h3 style={{ color: colors.accent, marginBottom: '14px', fontSize: '17px', fontWeight: 700 }}>Key Concepts Mastered:</h3>
        <ul style={{ color: colors.textSecondary, lineHeight: 2.0, paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
          <li>Stress-induced birefringence in transparent materials</li>
          <li>Polarization rotation creates interference colors between crossed polarizers</li>
          <li>Fringe patterns map the stress distribution field</li>
          <li>Fringe order N ∝ (σ₁ − σ₂) × thickness / fringe constant</li>
          <li>Applications in engineering, displays, geology, and quality control</li>
        </ul>
      </div>

      <PhotoelasticVisualization
        bendAmount={bendAmount}
        polarizerEnabled={true}
        isThick={isThick}
        interactive
        isAnimating={isAnimating}
        onAnimateToggle={() => setIsAnimating(!isAnimating)}
        onReset={() => { setBendAmount(30); setIsAnimating(false); setPolarizerEnabled(true); }}
      />
    </div>
  );

  // ============================================================================
  // PHASE ROUTING
  // ============================================================================

  const renderPhaseContent = () => {
    switch (currentPhase) {
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      lineHeight: 1.6,
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingBottom: '16px',
      }}>
        {renderPhaseContent()}
        {renderNavDots()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default PhotoelasticityRenderer;
