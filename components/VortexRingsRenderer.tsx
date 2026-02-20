'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Observer Effect',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

interface VortexRingsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  vortexCore: '#3b82f6',
  vortexFlow: '#60a5fa',
  velocity: '#f59e0b',
  fog: 'rgba(200, 200, 200, 0.6)',
};

const realWorldApps = [
  {
    icon: '🐙',
    title: 'Squid & Jellyfish Propulsion',
    short: 'Nature\'s vortex-ring engines',
    tagline: 'Millions of years of optimization',
    description: 'Squid and jellyfish propel themselves by ejecting water in carefully formed vortex rings. This is remarkably efficient - each pulse carries maximum momentum for minimum expelled mass.',
    connection: 'Vortex rings transport momentum with minimal energy loss. The rotating toroidal structure maintains coherence over long distances.',
    howItWorks: 'Muscle contractions expel water through a siphon (squid) or bell margin (jellyfish). The resulting vortex ring carries impulse efficiently. Squid optimize ring formation for different speeds.',
    stats: [
      { value: '25mph', label: 'Squid burst speed', icon: '🚀' },
      { value: '50%', label: 'Jet efficiency', icon: '⚡' },
      { value: '500M yr', label: 'Evolution time', icon: '🧬' }
    ],
    examples: ['Giant squid', 'Box jellyfish', 'Nautilus', 'Cuttlefish'],
    companies: ['Marine biology research', 'Biomimetic robotics', 'Oceanography', 'DARPA'],
    futureImpact: 'Bio-inspired underwater robots will use vortex propulsion for efficient long-range exploration.',
    color: '#3B82F6'
  },
  {
    icon: '🌋',
    title: 'Volcanic Smoke Rings',
    short: 'Giant vortex rings from eruptions',
    tagline: 'Nature\'s largest vortex demonstrations',
    description: 'Some volcanic vents produce spectacular smoke rings hundreds of meters across. These demonstrate vortex ring physics at enormous scale, visible for miles.',
    connection: 'Hot gas pulses from circular vents create the same vortex dynamics as a toy cannon. Boundary layer friction at the vent edge initiates rotation.',
    howItWorks: 'A pressure pulse expels gas from the vent. Edge friction creates the rotational component. The resulting toroidal vortex rises and maintains shape until dissipated by wind.',
    stats: [
      { value: '200m', label: 'Ring diameter', icon: '⭕' },
      { value: '1km+', label: 'Travel distance', icon: '📏' },
      { value: 'Minutes', label: 'Ring lifetime', icon: '⏱️' }
    ],
    examples: ['Mount Etna', 'Stromboli', 'Eyjafjallajokull', 'Hawaiian volcanoes'],
    companies: ['USGS', 'Volcanology institutes', 'Documentary crews', 'Research universities'],
    futureImpact: 'Studying volcanic vortex rings helps predict eruption characteristics and hazards.',
    color: '#EF4444'
  },
  {
    icon: '❤️',
    title: 'Heart Blood Flow',
    short: 'Vortex rings in every heartbeat',
    tagline: 'Your heart is a vortex cannon',
    description: 'Blood entering the left ventricle forms a vortex ring that optimizes filling and ejection. Disrupted vortex formation indicates heart disease. Cardiologists study these patterns for diagnosis.',
    connection: 'The mitral valve opening creates a circular orifice. Incoming blood forms a toroidal vortex that aids complete ventricular filling and efficient ejection.',
    howItWorks: 'Diastolic filling creates an asymmetric vortex ring. The ring redirects flow toward the outflow tract. Systolic contraction ejects blood with minimal turbulence.',
    stats: [
      { value: '60-100', label: 'Beats per minute', icon: '💓' },
      { value: '5L/min', label: 'Cardiac output', icon: '🩸' },
      { value: '60%', label: 'Ejection fraction', icon: '📊' }
    ],
    examples: ['Normal heart function', 'Cardiomyopathy diagnosis', 'Heart valve disease', 'Echo imaging'],
    companies: ['GE Healthcare', 'Philips', 'Siemens Healthineers', 'CardioMEMS'],
    futureImpact: 'AI analysis of cardiac vortex patterns will enable early detection of heart disease.',
    color: '#8B5CF6'
  },
  {
    icon: '🏭',
    title: 'Industrial Mixing',
    short: 'Vortex rings for efficient blending',
    tagline: 'Controlled chaos for perfect mixes',
    description: 'Industrial mixers use pulsed jets to create vortex rings that efficiently blend tank contents. This approach uses less energy than continuous stirring while achieving better uniformity.',
    connection: 'Vortex rings entrain surrounding fluid as they travel, providing mixing far from the jet source. Multiple rings interact to distribute material throughout.',
    howItWorks: 'Submerged jet nozzles pulse to create vortex rings. Rings travel through the tank, entraining and mixing contents. Computer control optimizes pulse timing and energy.',
    stats: [
      { value: '50%', label: 'Energy savings vs stirring', icon: '⚡' },
      { value: '10x', label: 'Reach vs steady jets', icon: '📏' },
      { value: '±2%', label: 'Mixing uniformity', icon: '🎯' }
    ],
    examples: ['Chemical reactors', 'Water treatment', 'Food processing', 'Pharmaceutical mixing'],
    companies: ['GEA', 'Alfa Laval', 'SPX Flow', 'Pulsair'],
    futureImpact: 'Smart mixing systems will use real-time sensing to optimize vortex generation.',
    color: '#10B981'
  }
];

interface VortexRing {
  id: number;
  x: number;
  y: number;
  radius: number;
  velocity: number;
  rotation: number;
  opacity: number;
}

const VortexRingsRenderer: React.FC<VortexRingsRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  // Self-managed phase state
  const [currentPhase, setCurrentPhase] = useState<Phase>('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [currentPhase]);

  const rawPhase = (gamePhase as Phase) || currentPhase;
  const phase: Phase = phaseOrder.includes(rawPhase) ? rawPhase : 'hook';

  // Simulation state
  const [apertureSize, setApertureSize] = useState(30);
  const [tapStrength, setTapStrength] = useState(3);
  const [airViscosity, setAirViscosity] = useState<'low' | 'high'>('low');
  const [showFog, setShowFog] = useState(false);
  const [rings, setRings] = useState<VortexRing[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const ringIdRef = useRef(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Phase navigation
  const advancePhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[currentIndex + 1];
      setCurrentPhase(nextPhase);
      if (onGameEvent) {
        onGameEvent({ type: 'phase_change', data: { from: phase, to: nextPhase } });
      }
    }
  }, [phase, onGameEvent]);

  const goToPreviousPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      const prevPhase = phaseOrder[currentIndex - 1];
      setCurrentPhase(prevPhase);
    }
  }, [phase]);

  // Create a vortex ring
  const createRing = useCallback(() => {
    const baseVelocity = tapStrength * 0.5;
    const sizeMultiplier = apertureSize / 40;
    const newRing: VortexRing = {
      id: ringIdRef.current++,
      x: 100,
      y: 175,
      radius: apertureSize * 0.4,
      velocity: baseVelocity * (airViscosity === 'low' ? 1 : 0.6),
      rotation: 0,
      opacity: 1,
    };
    setRings(prev => [...prev, newRing]);
  }, [apertureSize, tapStrength, airViscosity]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating && rings.length === 0) return;

    const interval = setInterval(() => {
      setRings(prev => {
        const updated = prev.map(ring => ({
          ...ring,
          x: ring.x + ring.velocity,
          rotation: ring.rotation + 5,
          opacity: Math.max(0, ring.opacity - (airViscosity === 'high' ? 0.008 : 0.004)),
          velocity: ring.velocity * (airViscosity === 'high' ? 0.995 : 0.998),
        })).filter(ring => ring.x < 500 && ring.opacity > 0);
        return updated;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating, airViscosity, rings.length]);

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

  const predictions = [
    { id: 'nothing', label: 'Nothing visible happens - air is invisible' },
    { id: 'wave', label: 'A wave of air spreads out in all directions' },
    { id: 'ring', label: 'A donut-shaped ring of spinning air travels forward' },
    { id: 'turbulence', label: 'Random turbulent swirls fill the space' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The ring looks exactly the same' },
    { id: 'visible', label: 'You can see the ring\'s spiral structure with fog' },
    { id: 'disappear', label: 'The fog prevents the ring from forming' },
    { id: 'color', label: 'The ring changes color' },
  ];

  const transferApplications = [
    {
      title: 'Smoke Rings',
      description: 'Smokers can blow visible smoke rings by forming a circular mouth opening and pushing air with a quick tongue motion. Rings travel at 0.5m/s to 2m/s and maintain shape for 2s to 5s.',
      question: 'Why do smoke rings stay together instead of dispersing?',
      answer: 'The rotational flow of the vortex ring creates a self-contained structure. Smoke particles are trapped in the rotating air, making the ring visible while the stable vortex maintains its shape as it travels up to 3m.',
    },
    {
      title: 'Bubble Rings Underwater',
      description: 'Dolphins and skilled divers create toroidal air bubbles that travel through water, maintaining their ring shape for distances of 5m or more at speeds of 1m/s.',
      question: 'How can air form stable rings in water?',
      answer: 'The same vortex physics applies in water. The rotating flow creates a stable toroidal structure. In water, the higher density (1000 kg/m³ vs 1.2 kg/m³ for air) helps stabilize the ring initially.',
    },
    {
      title: 'Volcanic Eruptions',
      description: 'Some volcanic vents emit giant smoke rings 200m across, visible for 1km. Mount Etna produces rings lasting several minutes at heights above 500m.',
      question: 'What creates vortex rings in volcanic eruptions?',
      answer: 'When a pulse of hot gas exits a volcanic vent, the edges experience friction with surrounding air. This creates the rotational flow needed for a vortex ring, scaled up to 200m diameter by the massive energy release.',
    },
    {
      title: 'Squid Jet Propulsion',
      description: 'Squids and jellyfish create vortex rings when they jet water through their siphons for propulsion. Squids achieve burst speeds of 25mph with 50% jet efficiency over 500 million years of evolution.',
      question: 'Why is vortex ring propulsion efficient for sea creatures?',
      answer: 'Vortex rings transfer momentum very efficiently. The rotating structure carries energy with minimal dissipation. Squids optimize their siphon opening to create clean vortex rings, maximizing thrust per unit of expelled water.',
    },
  ];

  const testQuestions = [
    {
      question: 'A vortex cannon fires a ring of air across the room. Unlike a random puff of air, the ring maintains its donut shape and travels in a straight line over several meters. What physical mechanism gives a vortex ring its remarkable stability?',
      options: [
        { text: 'External pressure from surrounding air holds it together', correct: false },
        { text: 'The rotational flow creates a self-sustaining toroidal structure', correct: true },
        { text: 'Surface tension of air molecules at the boundary', correct: false },
        { text: 'Magnetic fields generated by moving air charges', correct: false },
      ],
    },
    {
      question: 'How does a vortex ring transport momentum?',
      options: [
        { text: 'By moving a large mass of air forward', correct: false },
        { text: 'Through the rotating flow pattern that carries impulse', correct: true },
        { text: 'By creating pressure differences', correct: false },
        { text: 'Through sound waves', correct: false },
      ],
    },
    {
      question: 'What happens to a vortex ring in high-viscosity fluid?',
      options: [
        { text: 'It travels faster', correct: false },
        { text: 'It grows larger', correct: false },
        { text: 'It slows down and dissipates more quickly', correct: true },
        { text: 'It splits into multiple rings', correct: false },
      ],
    },
    {
      question: 'A larger aperture creates vortex rings that are:',
      options: [
        { text: 'Smaller and faster', correct: false },
        { text: 'Larger in diameter', correct: true },
        { text: 'More colorful', correct: false },
        { text: 'Impossible to form', correct: false },
      ],
    },
    {
      question: 'The velocity of a vortex ring is related to:',
      options: [
        { text: 'Only the temperature of the air', correct: false },
        { text: 'The impulse given and the ring diameter', correct: true },
        { text: 'The color of smoke used', correct: false },
        { text: 'Gravity alone', correct: false },
      ],
    },
    {
      question: 'Vortex rings demonstrate energy transport because:',
      options: [
        { text: 'They glow in the dark', correct: false },
        { text: 'They carry kinetic energy without net mass flow', correct: true },
        { text: 'They create heat', correct: false },
        { text: 'They absorb light', correct: false },
      ],
    },
    {
      question: 'Why do smoke rings make vortex rings visible?',
      options: [
        { text: 'Smoke creates the vortex', correct: false },
        { text: 'Smoke particles are trapped in the rotating flow', correct: true },
        { text: 'Smoke changes the physics of the ring', correct: false },
        { text: 'Smoke reflects sound waves', correct: false },
      ],
    },
    {
      question: 'The cross-section of a vortex ring shows:',
      options: [
        { text: 'Static air with no motion', correct: false },
        { text: 'Two counter-rotating cores of circulation', correct: true },
        { text: 'A single point of rotation', correct: false },
        { text: 'Random turbulent motion', correct: false },
      ],
    },
    {
      question: 'Increasing tap strength (impulse) makes the vortex ring:',
      options: [
        { text: 'Move slower', correct: false },
        { text: 'Move faster initially', correct: true },
        { text: 'Change direction', correct: false },
        { text: 'Become invisible', correct: false },
      ],
    },
    {
      question: 'Dolphins create bubble rings by:',
      options: [
        { text: 'Blowing air through their blowholes with a quick pulse', correct: true },
        { text: 'Swimming in circles', correct: false },
        { text: 'Using echolocation', correct: false },
        { text: 'Heating the water', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (onGameEvent) {
      onGameEvent({ type: 'test_completed', data: { score, total: testQuestions.length } });
    }
  };

  const renderVisualization = (interactive: boolean, showTitle: boolean = false) => {
    const width = 400;
    const height = 350;

    // Draw velocity field streamlines around vortex ring
    const renderVelocityField = (ring: VortexRing) => {
      const { x, y, radius, rotation, opacity } = ring;
      const streamlines = [];
      const numStreamlines = 6;

      for (let i = 0; i < numStreamlines; i++) {
        const offsetY = (i - numStreamlines / 2) * 12;
        const startX = x - radius * 2;
        const midX = x;
        const endX = x + radius * 2;

        // Streamline bends around the vortex ring - always at least 2px bend
        const rawBend = Math.abs(offsetY) < radius * 0.8 ?
          (offsetY > 0 ? -8 : 8) * (1 - Math.abs(offsetY) / (radius * 1.5)) : 0;
        const minBend = offsetY >= 0 ? -2 : 2;
        const bendAmount = rawBend !== 0 ? rawBend : minBend;

        const pathD = `M ${startX} ${Math.round(y + offsetY)} Q ${midX} ${Math.round(y + offsetY + bendAmount)} ${endX} ${Math.round(y + offsetY)}`;

        streamlines.push(
          <path
            key={`stream-${ring.id}-${i}`}
            d={pathD}
            fill="none"
            stroke="url(#vrtxStreamlineGrad)"
            strokeWidth={1.5}
            opacity={opacity * 0.4}
            strokeDasharray="4,4"
            style={{ animation: `vrtxStreamFlow 2s linear infinite` }}
          />
        );
      }
      return streamlines;
    };

    // Draw vortex ring cross-section with premium graphics
    const renderVortexCrossSection = (ring: VortexRing) => {
      const { x, y, radius, rotation, opacity } = ring;
      const coreRadius = radius * 0.25;

      // Rotation indicators around cores
      const rotationIndicators = [];
      const numIndicators = 12;

      for (let i = 0; i < numIndicators; i++) {
        const angle = (i / numIndicators) * Math.PI * 2 + (rotation * Math.PI / 180);
        const nextAngle = ((i + 0.5) / numIndicators) * Math.PI * 2 + (rotation * Math.PI / 180);

        // Upper core rotation particles
        const uR = coreRadius * 0.8;
        const ux = x + Math.cos(angle) * uR;
        const uy = (y - radius * 0.6) + Math.sin(angle) * uR;

        // Lower core rotation particles (opposite direction)
        const lx = x + Math.cos(-angle) * uR;
        const ly = (y + radius * 0.6) + Math.sin(-angle) * uR;

        rotationIndicators.push(
          <circle
            key={`rot-upper-${ring.id}-${i}`}
            cx={ux}
            cy={uy}
            r={2}
            fill="url(#vrtxRotationParticle)"
            opacity={opacity * (0.5 + 0.5 * Math.sin(angle))}
            filter="url(#vrtxParticleGlow)"
          />,
          <circle
            key={`rot-lower-${ring.id}-${i}`}
            cx={lx}
            cy={ly}
            r={2}
            fill="url(#vrtxRotationParticle)"
            opacity={opacity * (0.5 + 0.5 * Math.cos(angle))}
            filter="url(#vrtxParticleGlow)"
          />
        );
      }

      // Spiral flow lines showing toroidal structure
      const spiralLines = [];
      const numSpirals = 4;
      for (let s = 0; s < numSpirals; s++) {
        const baseAngle = (s / numSpirals) * Math.PI * 2 + (rotation * Math.PI / 180);
        const points = [];
        for (let t = 0; t <= 1; t += 0.1) {
          const spiralAngle = baseAngle + t * Math.PI;
          const spiralR = radius * (0.3 + 0.3 * Math.sin(t * Math.PI));
          const sx = x + Math.cos(spiralAngle) * spiralR * 0.5;
          const sy = y + (t - 0.5) * radius * 3.0;
          points.push(`${t === 0 ? 'M' : 'L'} ${sx} ${sy}`);
        }
        spiralLines.push(
          <path
            key={`spiral-${ring.id}-${s}`}
            d={points.join(' ')}
            fill="none"
            stroke="url(#vrtxSpiralGrad)"
            strokeWidth={1.5}
            opacity={opacity * 0.6}
            strokeLinecap="round"
          />
        );
      }

      return (
        <g key={ring.id}>
          {/* Velocity field streamlines */}
          {renderVelocityField(ring)}

          {/* Fog visualization if enabled */}
          {showFog && (
            <>
              {/* Outer fog glow */}
              <ellipse
                cx={x}
                cy={y}
                rx={radius * 1.3}
                ry={radius * 1.5}
                fill="url(#vrtxFogOuterGrad)"
                opacity={opacity * 0.3}
                filter="url(#vrtxFogBlur)"
              />
              {/* Main fog ring */}
              <ellipse
                cx={x}
                cy={y}
                rx={radius}
                ry={radius * 1.2}
                fill="url(#vrtxFogGrad)"
                opacity={opacity * 0.6}
              />
              {/* Inner dark hole */}
              <ellipse
                cx={x}
                cy={y}
                rx={radius * 0.5}
                ry={radius * 0.6}
                fill="url(#vrtxFogHole)"
                opacity={opacity * 0.9}
              />
            </>
          )}

          {/* Vortex ring outline with gradient stroke */}
          <ellipse
            cx={x}
            cy={y}
            rx={radius}
            ry={radius * 1.2}
            fill="none"
            stroke="url(#vrtxRingOutline)"
            strokeWidth={3}
            opacity={opacity}
            filter="url(#vrtxRingGlow)"
          />

          {/* Inner structure ellipse */}
          <ellipse
            cx={x}
            cy={y}
            rx={radius * 0.7}
            ry={radius * 0.85}
            fill="none"
            stroke="url(#vrtxInnerRing)"
            strokeWidth={1.5}
            strokeDasharray="4,4"
            opacity={opacity * 0.5}
          />

          {/* Spiral flow visualization */}
          {spiralLines}

          {/* Upper vortex core with premium gradient */}
          <circle
            cx={x}
            cy={y - radius * 0.6}
            r={coreRadius * 1.3}
            fill="url(#vrtxCoreGlow)"
            opacity={opacity * 0.5}
            filter="url(#vrtxCoreBlur)"
          />
          <circle
            cx={x}
            cy={y - radius * 0.6}
            r={coreRadius}
            fill="url(#vrtxCoreGrad)"
            opacity={opacity}
            filter="url(#vrtxCoreGlowFilter)"
          />

          {/* Lower vortex core with premium gradient */}
          <circle
            cx={x}
            cy={y + radius * 0.6}
            r={coreRadius * 1.3}
            fill="url(#vrtxCoreGlow)"
            opacity={opacity * 0.5}
            filter="url(#vrtxCoreBlur)"
          />
          <circle
            cx={x}
            cy={y + radius * 0.6}
            r={coreRadius}
            fill="url(#vrtxCoreGrad)"
            opacity={opacity}
            filter="url(#vrtxCoreGlowFilter)"
          />

          {/* Rotation indicators */}
          {rotationIndicators}

          {/* Spin direction arrows on cores */}
          <g opacity={opacity}>
            {/* Upper core spin arrow (clockwise when viewed from right) */}
            <path
              d={`M ${x - coreRadius * 0.7} ${y - radius * 0.6 - coreRadius * 0.4}
                  A ${coreRadius * 0.7} ${coreRadius * 0.5} 0 1 1
                  ${x + coreRadius * 0.5} ${y - radius * 0.6 - coreRadius * 0.5}`}
              fill="none"
              stroke="url(#vrtxSpinArrowGrad)"
              strokeWidth={2}
              markerEnd="url(#vrtxSpinArrow)"
            />
            {/* Lower core spin arrow (counter-clockwise) */}
            <path
              d={`M ${x + coreRadius * 0.7} ${y + radius * 0.6 + coreRadius * 0.4}
                  A ${coreRadius * 0.7} ${coreRadius * 0.5} 0 1 1
                  ${x - coreRadius * 0.5} ${y + radius * 0.6 + coreRadius * 0.5}`}
              fill="none"
              stroke="url(#vrtxSpinArrowGrad)"
              strokeWidth={2}
              markerEnd="url(#vrtxSpinArrow)"
            />
          </g>

          {/* Velocity vector with premium styling */}
          <line
            x1={x + radius + 8}
            y1={y}
            x2={x + radius + 8 + ring.velocity * 5}
            y2={y}
            stroke="url(#vrtxVelocityGrad)"
            strokeWidth={3}
            opacity={opacity}
            strokeLinecap="round"
            markerEnd="url(#vrtxVelocityArrow)"
          />

          {/* Velocity magnitude label */}
          <text
            x={x + radius + 8 + ring.velocity * 2.5}
            y={y - 12}
            fill={colors.velocity}
            fontSize={11}
            textAnchor="middle"
            opacity={opacity * 0.8}
            fontWeight="bold"
          >
            v = {ring.velocity.toFixed(1)} m/s
          </text>
        </g>
      );
    };

    // Draw bottle with membrane - premium styling
    const renderBottle = () => (
      <g>
        {/* Bottle shadow */}
        <ellipse cx={60} cy={235} rx={35} ry={8} fill="url(#vrtxShadowGrad)" opacity={0.5} />

        {/* Bottle body with glass effect */}
        <rect x={30} y={120} width={60} height={110} rx={8} fill="url(#vrtxBottleGrad)" />
        <rect x={30} y={120} width={60} height={110} rx={8} fill="none" stroke="url(#vrtxBottleStroke)" strokeWidth={2} />

        {/* Glass reflection */}
        <rect x={35} y={125} width={8} height={90} rx={4} fill="url(#vrtxGlassReflection)" opacity={0.4} />

        {/* Bottle neck */}
        <rect x={45} y={100} width={30} height={25} rx={4} fill="url(#vrtxBottleGrad)" />
        <rect x={45} y={100} width={30} height={25} rx={4} fill="none" stroke="url(#vrtxBottleStroke)" strokeWidth={2} />

        {/* Aperture/opening with metal rim */}
        <rect x={48} y={93} width={apertureSize * 0.5 + 4} height={12} rx={3} fill="url(#vrtxApertureRim)" />
        <rect x={50} y={95} width={apertureSize * 0.5} height={8} fill={colors.bgPrimary} stroke="url(#vrtxApertureGlow)" strokeWidth={1.5} />

        {/* Membrane (back of bottle) with flex indicator */}
        <rect
          x={30} y={225} width={60} height={isAnimating ? 8 : 5}
          rx={2}
          fill="url(#vrtxMembraneGrad)"
          stroke={colors.warning}
          strokeWidth={1}
        />

        {/* Tap indicator with animation */}
        <g opacity={0.9}>
          <circle cx={60} cy={250} r={12} fill="url(#vrtxTapIndicator)" opacity={0.3} />
          <text x={60} y={254} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="600">TAP</text>
          <line x1={60} y1={265} x2={60} y2={275} stroke={colors.warning} strokeWidth={2} strokeLinecap="round" />
          <line x1={55} y1={270} x2={60} y2={275} stroke={colors.warning} strokeWidth={2} strokeLinecap="round" />
          <line x1={60} y1={275} x2={65} y2={270} stroke={colors.warning} strokeWidth={2} strokeLinecap="round" />
        </g>

        {/* Air pressure visualization inside bottle */}
        <text x={60} y={165} fill={colors.textMuted} fontSize={11} textAnchor="middle" fontWeight="500">AIR</text>
        {[0, 1, 2].map(i => (
          <circle
            key={`air-${i}`}
            cx={50 + i * 10}
            cy={180}
            r={3}
            fill="url(#vrtxAirParticle)"
            opacity={0.6}
          />
        ))}
      </g>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {showTitle && (
          <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', textAlign: 'center' }}>
            Vortex Ring Formation
          </h3>
        )}
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <title>Vortex Ring Visualization</title>
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* --- LINEAR GRADIENTS WITH 4-6 COLOR STOPS --- */}

            {/* Premium vortex core gradient */}
            <linearGradient id="vrtxCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Vortex ring outline gradient */}
            <linearGradient id="vrtxRingOutline" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="20%" stopColor="#60a5fa" />
              <stop offset="40%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="80%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>

            {/* Inner ring structure gradient */}
            <linearGradient id="vrtxInnerRing" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>

            {/* Velocity vector gradient */}
            <linearGradient id="vrtxVelocityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Spin arrow gradient */}
            <linearGradient id="vrtxSpinArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
            </linearGradient>

            {/* Spiral flow gradient */}
            <linearGradient id="vrtxSpiralGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.2" />
              <stop offset="25%" stopColor="#818cf8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#818cf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.2" />
            </linearGradient>

            {/* Streamline gradient for velocity field */}
            <linearGradient id="vrtxStreamlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0" />
              <stop offset="20%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#16a34a" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#22c55e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>

            {/* Bottle glass gradient */}
            <linearGradient id="vrtxBottleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" stopOpacity="0.15" />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.25" />
              <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.15" />
            </linearGradient>

            {/* Bottle stroke gradient */}
            <linearGradient id="vrtxBottleStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Glass reflection gradient */}
            <linearGradient id="vrtxGlassReflection" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Membrane gradient */}
            <linearGradient id="vrtxMembraneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Aperture rim metallic gradient */}
            <linearGradient id="vrtxApertureRim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#94a3b8" />
              <stop offset="80%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Shadow gradient */}
            <linearGradient id="vrtxShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            {/* --- RADIAL GRADIENTS FOR VORTEX EFFECTS --- */}

            {/* Vortex core glow */}
            <radialGradient id="vrtxCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
            </radialGradient>

            {/* Rotation particle gradient */}
            <radialGradient id="vrtxRotationParticle" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>

            {/* Air particle inside bottle */}
            <radialGradient id="vrtxAirParticle" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
            </radialGradient>

            {/* Tap indicator glow */}
            <radialGradient id="vrtxTapIndicator" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Aperture glow */}
            <radialGradient id="vrtxApertureGlow" cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="60%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>

            {/* Fog outer glow gradient */}
            <radialGradient id="vrtxFogOuterGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0" />
            </radialGradient>

            {/* Fog main gradient */}
            <radialGradient id="vrtxFogGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f3f4f6" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#e5e7eb" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#d1d5db" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.4" />
            </radialGradient>

            {/* Fog inner hole gradient */}
            <radialGradient id="vrtxFogHole" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#1e293b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.3" />
            </radialGradient>

            {/* --- GLOW FILTERS USING GAUSSIAN BLUR + MERGE --- */}

            {/* Vortex ring outer glow */}
            <filter id="vrtxRingGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Vortex core glow filter */}
            <filter id="vrtxCoreGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Core blur for outer glow */}
            <filter id="vrtxCoreBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" />
            </filter>

            {/* Particle glow filter */}
            <filter id="vrtxParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Fog blur filter */}
            <filter id="vrtxFogBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>

            {/* --- MARKERS FOR ARROWS --- */}

            {/* Premium velocity arrow marker */}
            <marker id="vrtxVelocityArrow" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
              <path d="M 0 0 L 12 4 L 0 8 L 3 4 Z" fill="#f59e0b" />
            </marker>

            {/* Spin direction arrow marker */}
            <marker id="vrtxSpinArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill="#fbbf24" />
            </marker>

            {/* Legacy markers for compatibility */}
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.velocity} />
            </marker>
            <marker id="smallArrow" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" fill={colors.velocity} />
            </marker>

            {/* --- CSS ANIMATIONS --- */}
            <style>{`
              @keyframes vrtxStreamFlow {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -16; }
              }
              @keyframes vrtxPulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
            `}</style>
          </defs>

          {/* Premium dark background with subtle gradient */}
          <rect width={width} height={height} fill="url(#vrtxBgGrad)" />
          <linearGradient id="vrtxBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Subtle grid pattern for depth */}
          <pattern id="vrtxGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.2" />
          </pattern>
          <rect width={width} height={height} fill="url(#vrtxGrid)" />

          {/* Horizontal grid lines for reference */}
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <line
              key={`hgrid-${i}`}
              x1={0}
              y1={50 + i * 50}
              x2={width}
              y2={50 + i * 50}
              stroke="#334155"
              strokeWidth={0.5}
              opacity={0.15}
              strokeDasharray="4,6"
            />
          ))}

          {/* Static velocity profile reference curve — shows ring speed vs. aperture */}
          {(() => {
            const curveX0 = 110;
            const curveY0 = 30;
            const curveW = 160;
            const curveH = 140;
            // 20 points: bell-curve velocity profile
            const pts = Array.from({ length: 20 }, (_, k) => {
              const t = k / 19;
              const apertureFrac = apertureSize / 60;
              // Bell curve that peaks at t=0.5; height scales with inverse of aperture
              const vNorm = (1 - apertureFrac * 0.5) * Math.exp(-Math.pow((t - 0.5) * 3, 2));
              const px = curveX0 + t * curveW;
              const py = curveY0 + curveH * (1 - Math.max(0, Math.min(1, vNorm)));
              return `${k === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
            });
            // Marker at current aperture position on the curve
            const markerT = (apertureSize - 20) / 40;
            const markerX = curveX0 + markerT * curveW;
            const apertureFrac = apertureSize / 60;
            const markerVNorm = (1 - apertureFrac * 0.5) * Math.exp(-Math.pow((markerT - 0.5) * 3, 2));
            const markerY = curveY0 + curveH * (1 - Math.max(0, Math.min(1, markerVNorm)));
            return (
              <g opacity={0.85}>
                {/* Axis baseline */}
                <line x1={curveX0} y1={curveY0 + curveH} x2={curveX0 + curveW} y2={curveY0 + curveH} stroke="#334155" strokeWidth={1} opacity={0.4} />
                {/* Velocity profile curve */}
                <path d={pts.join(' ')} fill="none" stroke="url(#vrtxVelocityGrad)" strokeWidth={2.5} strokeLinecap="round" />
                {/* Interactive aperture position marker */}
                <circle cx={markerX} cy={markerY} r={8} fill={colors.accent} stroke="#ffffff" strokeWidth={2} filter="url(#vrtxCoreGlowFilter)" />
                {/* Curve label */}
                <text x={curveX0 + curveW / 2} y={curveY0 + curveH + 14} textAnchor="middle" fill={colors.textMuted} fontSize={11}>Ring velocity profile</text>
              </g>
            );
          })()}

          {/* Background flow indicators */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`bgflow-${i}`}
              x1={100 + i * 35}
              y1={60}
              x2={100 + i * 35 + 20}
              y2={60}
              stroke="#334155"
              strokeWidth={1}
              strokeOpacity={0.3}
              markerEnd="url(#vrtxSmallFlowArrow)"
            />
          ))}
          <marker id="vrtxSmallFlowArrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <path d="M 0 0 L 6 2 L 0 4" fill="none" stroke="#334155" strokeWidth="1" />
          </marker>

          {/* Bottle */}
          {renderBottle()}

          {/* Vortex rings */}
          {rings.map(ring => renderVortexCrossSection(ring))}

          {/* Static demo ring when no rings exist */}
          {rings.length === 0 && !interactive && (
            renderVortexCrossSection({
              id: -1,
              x: 250,
              y: 175,
              radius: 30,
              velocity: 3,
              rotation: 0,
              opacity: 1,
            })
          )}

          {/* Premium info panel background */}
          <rect x={10} y={260} width={165} height={75} rx={8} fill="#0f172a" fillOpacity={0.8} stroke="#334155" strokeWidth={1} />

          {/* Labels with improved styling */}
          <text x={20} y={278} fill={colors.textSecondary} fontSize={11} fontWeight="600">
            Aperture: <tspan fill={colors.accent}>{apertureSize}mm</tspan>
          </text>
          <text x={20} y={297} fill={colors.textSecondary} fontSize={11} fontWeight="600">
            Tap strength: <tspan fill={colors.velocity}>{tapStrength}</tspan>
          </text>
          <text x={20} y={316} fill={colors.textSecondary} fontSize={11} fontWeight="600">
            Viscosity: <tspan fill={airViscosity === 'high' ? colors.error : colors.success}>{airViscosity}</tspan>
          </text>

          {/* Fog indicator */}
          {showFog && (
            <g>
              <rect x={width - 85} y={10} width={75} height={25} rx={6} fill="#0f172a" fillOpacity={0.8} stroke="#9ca3af" strokeWidth={1} />
              <circle cx={width - 70} cy={22} r={5} fill="#d1d5db" />
              <text x={width - 58} y={27} fill="#e5e7eb" fontSize={11} fontWeight="600">FOG ON</text>
            </g>
          )}

          {/* Legend with premium styling */}
          <g transform="translate(200, 260)">
            <rect x={-10} y={-5} width={190} height={55} rx={8} fill="#0f172a" fillOpacity={0.8} stroke="#334155" strokeWidth={1} />

            {/* Vortex core legend */}
            <circle cx={5} cy={12} r={6} fill="url(#vrtxCoreGrad)" filter="url(#vrtxCoreGlowFilter)" />
            <text x={18} y={16} fill={colors.textMuted} fontSize={11} fontWeight="500">Vortex Core</text>

            {/* Velocity legend */}
            <line x1={0} y1={35} x2={25} y2={35} stroke="url(#vrtxVelocityGrad)" strokeWidth={3} strokeLinecap="round" />
            <text x={32} y={39} fill={colors.textMuted} fontSize={11} fontWeight="500">Velocity</text>

            {/* Rotation legend */}
            <circle cx={100} cy={12} r={3} fill="url(#vrtxRotationParticle)" />
            <text x={108} y={16} fill={colors.textMuted} fontSize={11} fontWeight="500">Spin</text>

            {/* Flow legend */}
            <line x1={95} y1={35} x2={120} y2={35} stroke="url(#vrtxStreamlineGrad)" strokeWidth={2} strokeDasharray="4,2" />
            <text x={127} y={39} fill={colors.textMuted} fontSize={11} fontWeight="500">Flow</text>
          </g>

          {/* Cross-section label */}
          <text x={width / 2} y={height - 5} fill={colors.textMuted} fontSize={11} textAnchor="middle" fontStyle="italic">
            Cross-sectional view — vortex ring propagation
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => {
                createRing();
                setIsAnimating(true);
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: `0 4px 15px ${colors.accentGlow}`,
                transition: 'all 0.2s ease',
                minHeight: '44px',
              }}
            >
              Tap Membrane
            </button>
            <button
              onClick={() => { setRings([]); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(139, 92, 246, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minHeight: '44px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Aperture Size: {apertureSize}mm
        </label>
        <input
          type="range"
          min="20"
          max="60"
          step="5"
          value={apertureSize}
          onChange={(e) => setApertureSize(parseInt(e.target.value))}
          style={{ width: '100%', touchAction: 'pan-y', appearance: 'none', WebkitAppearance: 'none' } as React.CSSProperties}
        />
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Larger aperture = larger ring diameter
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Tap Strength: {tapStrength}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={tapStrength}
          onChange={(e) => setTapStrength(parseInt(e.target.value))}
          style={{ width: '100%', touchAction: 'pan-y', appearance: 'none', WebkitAppearance: 'none' } as React.CSSProperties}
        />
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Stronger tap = faster ring velocity
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Air Viscosity
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setAirViscosity('low')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: airViscosity === 'low' ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
              background: airViscosity === 'low' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Low (Normal Air)
          </button>
          <button
            onClick={() => setAirViscosity('high')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: airViscosity === 'high' ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
              background: airViscosity === 'high' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            High (Humid/Dense)
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Ring velocity ~ Impulse / Diameter
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Smaller rings travel faster; stronger taps give more impulse
        </div>
      </div>
    </div>
  );

  const renderNavBar = (showBack: boolean = true, canProceed: boolean = true, buttonText: string = 'Next') => {
    const currentIndex = phaseOrder.indexOf(phase);

    return (
      <nav
        aria-label="Game navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 24px',
          background: colors.bgDark,
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
          zIndex: 1001,
        }}
      >
        {/* Navigation dots */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => setCurrentPhase(p)}
              aria-label={phaseLabels[p]}
              title={phaseLabels[p]}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                background: i === currentIndex ? colors.accent : i < currentIndex ? colors.success : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                padding: 0,
                minHeight: 'unset',
              }}
            />
          ))}
        </div>

        {/* Back/Next buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {showBack ? (
            <button
              onClick={goToPreviousPhase}
              aria-label="Back"
              style={{
                padding: '10px 20px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: colors.textPrimary,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Back
            </button>
          ) : (
            <div style={{ width: '80px' }} />
          )}
          <button
            onClick={advancePhase}
            disabled={!canProceed}
            aria-label="Advance to next phase"
            style={{
              padding: '10px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)` : 'rgba(255,255,255,0.1)',
              color: canProceed ? 'white' : colors.textMuted,
              fontWeight: 'bold',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              boxShadow: canProceed ? `0 4px 15px ${colors.accentGlow}` : 'none',
            }}
          >
            {buttonText}
          </button>
        </div>
      </nav>
    );
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirstPhase = currentIndex === 0;
    return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1001,
    }}>
      <button
        onClick={goToPreviousPhase}
        disabled={isFirstPhase}
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: isFirstPhase ? 'rgba(255,255,255,0.3)' : colors.textPrimary,
          fontWeight: 'bold',
          cursor: isFirstPhase ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: isFirstPhase ? 0.4 : 1,
        }}
      >
        ← Back
      </button>
      <button
        onClick={advancePhase}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)` : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          transition: 'all 0.2s ease-in-out',
          boxShadow: canProceed ? `0 4px 15px ${colors.accentGlow}` : 'none',
        }}
      >
        Next →
      </button>
    </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(false, true, 'Make a Prediction')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Vortex Rings
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '8px' }}>
              Welcome! Explore how rings of spinning air travel through space.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '16px', fontWeight: 'normal' }}>
              Discover the physics behind "smoke donuts" and how they work in nature and technology.
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Cut a hole in a cardboard box, cover the back with plastic, and tap the membrane.
                You can blow out candles from across the room with an invisible "smoke donut" -
                even without the smoke!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                These are vortex rings - stable structures of rotating air that travel remarkably far.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Tap Membrane" to launch vortex rings and watch them travel!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, !!prediction, 'Test My Prediction')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A bottle with a flexible membrane at the back and a circular opening at the front.
              When you tap the membrane sharply, air is pushed out through the opening.
              The cross-section shows two vortex cores (the ring seen from the side) with
              arrows indicating the rotational flow.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you tap the membrane, what happens to the air?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, true, 'Continue to Review')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Vortex Rings</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust aperture, tap strength, and viscosity to see how rings behave
            </p>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch how ring size, speed, and persistence change as you adjust parameters. Notice the rotating vortex cores on either side of the ring.
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


              {renderVisualization(true, true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 'bold' }}>Comparison</h4>
            <div style={{ display: 'flex', gap: '16px', flexDirection: 'row', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '4px' }}>Current:</div>
                <div style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 'bold' }}>
                  {apertureSize}mm aperture<br/>
                  Strength: {tapStrength}
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '4px' }}>Ring velocity:</div>
                <div style={{ color: colors.velocity, fontSize: '16px', fontWeight: 'bold' }}>
                  {(tapStrength * 0.5 * (airViscosity === 'low' ? 1 : 0.6)).toFixed(1)} m/s
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Cause &amp; Effect:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li><strong>When you increase aperture</strong>, the ring becomes larger in diameter and slower</li>
              <li><strong>When you increase tap strength</strong>, higher impulse causes faster ring velocity</li>
              <li><strong>Higher viscosity results in</strong> more drag — the ring slows and fades faster</li>
              <li><strong>As rings interact</strong>, they affect each other's path and speed</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 'bold' }}>Why This Matters</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              Vortex rings appear everywhere in nature and technology. Squid use them for jet propulsion, achieving remarkable efficiency. Your heart creates vortex rings with every beat to optimize blood flow. Understanding vortex dynamics is crucial for designing efficient underwater vehicles, heart valve replacements, and industrial mixing systems.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'ring';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, true, 'Next: A Twist!')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              {wasCorrect
                ? 'You correctly predicted that a donut-shaped vortex ring would form! The circular aperture and sharp impulse create the perfect conditions for this rotating toroidal structure.'
                : `Your prediction was "${predictions.find(p => p.id === prediction)?.label}". Actually, a donut-shaped vortex ring forms and travels forward, carrying momentum efficiently! The circular aperture creates the conditions for this stable rotating structure.`}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Vortex Rings</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Ring Formation:</strong> When air exits
                the aperture, friction between the fast-moving jet and surrounding still air creates
                rotation at the edges. This curl rolls up into a toroidal (donut) shape.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Stability:</strong> The rotating flow
                creates a self-sustaining structure. Each part of the ring induces motion in adjacent
                parts, maintaining the shape as it travels.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Energy Transport:</strong> Vortex rings
                carry kinetic energy and momentum through the fluid without significant mass transfer -
                they're remarkably efficient at moving impulse over distance.
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.2)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
              }}>
                <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Ring Velocity Formula:
                </div>
                <div style={{ color: colors.accent, fontSize: '15px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  v ∝ Impulse / Diameter
                </div>
                <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
                  Smaller rings travel faster; stronger taps give more impulse
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, !!twistPrediction, 'Test My Prediction')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we add fog to see the invisible rings?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Fill the bottle with fog (from a fog machine or dry ice) before tapping.
              Now the vortex ring will carry fog particles with it as it travels.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              With fog added, what will you observe about the ring?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, true, 'See the Explanation')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Fog Visualization</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle fog to see the vortex ring structure revealed
            </p>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            margin: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.warning }}>Observe:</strong> Toggle fog ON and tap the membrane. Watch how the fog reveals the spiral structure inside the vortex ring as it travels.
            </p>
          </div>

          {renderVisualization(true, true)}

          <div style={{ padding: '16px' }}>
            <button
              onClick={() => setShowFog(!showFog)}
              style={{
                width: '100%',
                padding: '16px',
                minHeight: '44px',
                borderRadius: '8px',
                border: showFog ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: showFog ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {showFog ? 'Fog: ON - See the spiral!' : 'Fog: OFF - Toggle to see rings'}
            </button>
          </div>

          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              With fog, you can see the toroidal structure of the vortex ring! The fog particles
              are trapped in the rotating flow, making the invisible visible. Notice how the
              ring maintains its shape as it travels.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'visible';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, true, 'Apply This Knowledge')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Fog reveals the beautiful spiral structure of the vortex ring!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Fog Makes Rings Visible</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Particle Trapping:</strong> Fog
                particles are small and light. Once caught in the vortex ring's rotating flow,
                they stay trapped, carried along with the ring.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Structure Revealed:</strong> The
                fog shows the toroidal shape and internal rotation. You can see the spiraling
                motion within the ring's cross-section.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Classic "Smoke Rings":</strong> This
                is exactly how traditional smoke rings work - smoke particles visualize the
                vortex structure that would otherwise be invisible in air.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Vortex Rings"
        applications={realWorldApps}
        onComplete={() => setCurrentPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, transferCompleted.size >= 4, 'Take the Test')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Vortex rings appear throughout nature and technology
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test ({transferCompleted.size}/4 completed)
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              id={`transfer-app-${index}`}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', minHeight: '44px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                >
                  Got It - Reveal Answer
                </button>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  {index < transferApplications.length - 1 && !transferCompleted.has(index + 1) && (
                    <button
                      onClick={() => {
                        const nextCard = document.getElementById(`transfer-app-${index + 1}`);
                        nextCard?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        padding: '10px 20px',
                        minHeight: '44px',
                        borderRadius: '6px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                    >
                      Got It - Next Application
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderNavBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered vortex ring physics!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, false, 'Submit')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: '16px', fontWeight: 'bold' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', minHeight: '44px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(true, true, 'Complete Game')}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered vortex ring physics and fluid dynamics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Vortex ring stability from rotational flow</li>
              <li>Ring velocity related to impulse and diameter</li>
              <li>Energy transport without mass transport</li>
              <li>Visualization with fog/smoke particles</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Vortex rings are studied extensively in fluid dynamics. They appear in heart valves
              during blood flow, in jet engines, and in the wakes of aircraft. The mathematics
              of vortex dynamics connects to topology - vortex rings can link and knot in
              fascinating ways!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default VortexRingsRenderer;
