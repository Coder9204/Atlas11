'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// BUOYANCY RENDERER - PREMIUM PHYSICS GAME
// Archimedes' Principle: Why things float or sink
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

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

interface BuoyancyRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Real-World Applications Data
const applications = [
  {
    id: 'ships',
    icon: '🚢',
    title: 'Ships',
    subtitle: 'Naval Architecture',
    color: '#3B82F6',
    description: 'A massive steel ship floats because its hull displaces an enormous volume of water. The key is shape, not material - the same steel rolled into a ball would sink immediately.',
    physics: 'Ships are designed so total weight < buoyant force. A ship\'s "displacement" refers to the weight of water it pushes aside, which equals its own weight when floating.',
    insight: 'The Plimsoll line on ships marks the maximum safe loading depth. In denser saltwater, ships float higher, so load limits differ by water type.',
    stats: [
      { value: '228k tons', label: 'Largest Ship' },
      { value: '400m', label: 'Symphony Length' },
      { value: '1.025', label: 'Seawater ρ' },
    ],
  },
  {
    id: 'submarines',
    icon: '🛥️',
    title: 'Submarines',
    subtitle: 'Underwater Engineering',
    color: '#06B6D4',
    description: 'Submarines control depth by adjusting buoyancy using ballast tanks. Fill tanks with water to dive (heavier), pump out water to surface (lighter).',
    physics: 'At neutral buoyancy, weight exactly equals buoyant force. Submarines fine-tune with trim tanks and can hover at any depth. Compressed air systems evacuate ballast for emergency surfacing.',
    insight: 'Modern submarines can dive to 600+ meters. The crush depth depends on hull strength vs. water pressure (which increases by 1 atm per 10m).',
    stats: [
      { value: '600m', label: 'Max Depth' },
      { value: '240', label: 'Days Submerged' },
      { value: '25 knots', label: 'Speed' },
    ],
  },
  {
    id: 'hotair',
    icon: '🎈',
    title: 'Hot Air Balloons',
    subtitle: 'Atmospheric Buoyancy',
    color: '#F59E0B',
    description: 'Hot air balloons use buoyancy in air! Heating air inside the balloon makes it less dense than surrounding cool air, creating an upward buoyant force.',
    physics: 'Same principle as water: F_buoyancy = ρ_air × V × g. Hot air (100°C) has ρ ≈ 0.95 kg/m³ vs cold air at 1.2 kg/m³. A 2800 m³ balloon can lift ~600 kg.',
    insight: 'Altitude control is through temperature - burn propane to rise, let air cool to descend. Morning flights are best due to stable, cool air conditions.',
    stats: [
      { value: '2800 m³', label: 'Envelope Vol' },
      { value: '100°C', label: 'Hot Air Temp' },
      { value: '600 kg', label: 'Lift Capacity' },
    ],
  },
  {
    id: 'lifejackets',
    icon: '🦺',
    title: 'Life Jackets',
    subtitle: 'Personal Flotation',
    color: '#10B981',
    description: 'Life jackets contain foam or inflatable chambers filled with air, dramatically lowering your average density to ensure you float face-up even when unconscious.',
    physics: 'The foam or air pockets have very low density (~0.03 kg/L for air). Combined with your body, the average density becomes less than water, guaranteeing flotation.',
    insight: 'Life jackets are rated by buoyancy force in Newtons. A Type I offshore jacket provides 150+ N, enough to keep an adult\'s head above water in rough seas.',
    stats: [
      { value: '150 N', label: 'Offshore Rating' },
      { value: '0.03', label: 'Air Density' },
      { value: '35 lbs', label: 'Min Buoyancy' },
    ],
  },
];

// Test Questions
const testQuestions = [
  {
    question: 'A 5 kg object displaces 3 liters of water when fully submerged. What is the buoyant force? (g = 10 m/s²)',
    options: [
      { text: '50 N', correct: false },
      { text: '30 N', correct: true },
      { text: '20 N', correct: false },
      { text: '15 N', correct: false },
    ],
    explanation: 'F_b = ρ_water × V × g = 1000 × 0.003 × 10 = 30 N',
  },
  {
    question: 'An object floats with 40% of its volume above water. What is its density relative to water?',
    options: [
      { text: '0.4', correct: false },
      { text: '0.6', correct: true },
      { text: '1.0', correct: false },
      { text: '1.4', correct: false },
    ],
    explanation: 'If 40% above, 60% below. At equilibrium, ρ_object/ρ_water = fraction submerged = 0.6',
  },
  {
    question: 'A steel ship floats but a steel ball sinks. Why?',
    options: [
      { text: 'Ship steel is lighter', correct: false },
      { text: 'Ship shape displaces more water', correct: true },
      { text: 'Water pressure is different', correct: false },
      { text: 'Ships have special coatings', correct: false },
    ],
    explanation: 'The hollow ship shape displaces much more water than a ball of the same mass, creating greater buoyant force.',
  },
  {
    question: 'What happens to a floating object if you move it from fresh water (ρ=1.0) to salt water (ρ=1.025)?',
    options: [
      { text: 'Sinks lower', correct: false },
      { text: 'Floats higher', correct: true },
      { text: 'No change', correct: false },
      { text: 'Depends on object density', correct: false },
    ],
    explanation: 'Denser water provides more buoyant force per volume displaced, so less volume needs to be submerged.',
  },
  {
    question: 'A submarine wants to dive deeper. It should:',
    options: [
      { text: 'Pump air into ballast tanks', correct: false },
      { text: 'Pump water into ballast tanks', correct: true },
      { text: 'Heat the hull', correct: false },
      { text: 'Spin its propeller faster', correct: false },
    ],
    explanation: 'Adding water increases weight without changing volume, making weight > buoyant force, so it sinks.',
  },
  {
    question: 'A 60 kg person feels they weigh only 6 kg in a swimming pool. The buoyant force is:',
    options: [
      { text: '60 N', correct: false },
      { text: '540 N', correct: true },
      { text: '600 N', correct: false },
      { text: '6 N', correct: false },
    ],
    explanation: 'Apparent weight = True weight - Buoyant force. 60 N apparent means F_b = 600 - 60 = 540 N.',
  },
  {
    question: 'Two objects have the same mass. Object A floats, Object B sinks. Which has greater volume?',
    options: [
      { text: 'Object A', correct: true },
      { text: 'Object B', correct: false },
      { text: 'They have equal volume', correct: false },
      { text: 'Cannot determine', correct: false },
    ],
    explanation: 'Same mass but A floats means A has lower density, therefore greater volume (ρ = m/V).',
  },
  {
    question: 'A hot air balloon rises because:',
    options: [
      { text: 'Hot air is less dense than cold air', correct: true },
      { text: 'Heat creates upward convection', correct: false },
      { text: 'Fire produces lift gas', correct: false },
      { text: 'Thermal radiation pushes up', correct: false },
    ],
    explanation: 'Hot air has lower density than surrounding cold air, creating buoyancy in the atmosphere.',
  },
  {
    question: 'An ice cube floats with 90% of its volume underwater. When it melts, the water level:',
    options: [
      { text: 'Rises', correct: false },
      { text: 'Falls', correct: false },
      { text: 'Stays exactly the same', correct: true },
      { text: 'Depends on temperature', correct: false },
    ],
    explanation: 'The melted ice takes exactly the same volume as the water it was displacing while floating.',
  },
  {
    question: 'Archimedes\' principle states that buoyant force equals:',
    options: [
      { text: 'Weight of submerged object', correct: false },
      { text: 'Weight of displaced fluid', correct: true },
      { text: 'Volume of object × density of object', correct: false },
      { text: 'Pressure × surface area', correct: false },
    ],
    explanation: 'Buoyant force = weight of the fluid displaced by the submerged part of the object.',
  },
];

export default function BuoyancyRenderer({ onComplete, onGameEvent, gamePhase, onPhaseComplete }: BuoyancyRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<number | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Simulation state
  const [objectDensity, setObjectDensity] = useState(0.8); // kg/L (less than water = floats)
  const [fluidDensity, setFluidDensity] = useState(1.0); // kg/L (water)
  const [objectVolume, setObjectVolume] = useState(10); // liters
  const [submersionDepth, setSubmersionDepth] = useState(0); // 0-100%
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation ref
  const animationRef = useRef<number | null>(null);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#06b6d4',       // cyan-500
    primaryDark: '#0891b2',   // cyan-600
    accent: '#10b981',        // emerald-500 (for floating objects)
    secondary: '#3b82f6',     // blue-500 (for water)
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500 (for sinking objects)
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    water: '#3b82f6',         // blue-500
    floatColor: '#10b981',    // emerald-500
    sinkColor: '#ef4444',     // red-500
  };

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

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' = 'click') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

  // Emit events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [phase, playSound, onPhaseComplete, emitEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculate buoyancy values
  const calculateBuoyancy = useCallback(() => {
    const g = 10; // m/s²
    const volumeM3 = objectVolume / 1000; // liters to m³
    const fluidDensityKgM3 = fluidDensity * 1000; // kg/L to kg/m³
    const objectDensityKgM3 = objectDensity * 1000; // kg/L to kg/m³

    const objectMass = objectDensityKgM3 * volumeM3; // kg
    const weight = objectMass * g; // N
    const maxBuoyancy = fluidDensityKgM3 * volumeM3 * g; // N (fully submerged)
    const currentBuoyancy = maxBuoyancy * (submersionDepth / 100);

    const floats = objectDensity < fluidDensity;
    const equilibriumSubmersion = floats ? (objectDensity / fluidDensity) * 100 : 100;

    const apparentWeight = weight - currentBuoyancy;

    return {
      weight,
      maxBuoyancy,
      currentBuoyancy,
      apparentWeight,
      objectDensity,
      floats,
      equilibriumSubmersion,
      objectMass,
    };
  }, [objectDensity, objectVolume, fluidDensity, submersionDepth]);

  // Animation to equilibrium
  const animateToEquilibrium = useCallback(() => {
    const values = calculateBuoyancy();
    const targetSubmersion = Math.min(100, values.equilibriumSubmersion);

    setIsAnimating(true);

    let current = 0;
    const animate = () => {
      current += 2;
      const progress = Math.min(current / 50, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setSubmersionDepth(targetSubmersion * eased);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    setSubmersionDepth(0);
    animationRef.current = requestAnimationFrame(animate);
  }, [calculateBuoyancy]);

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Water tank visualization - Premium graphics
  const WaterTankVisualization = ({ isStatic = false }: { isStatic?: boolean }) => {
    const values = calculateBuoyancy();
    const displaySubmersion = isStatic ? values.equilibriumSubmersion : submersionDepth;
    const objectTop = 20 + (100 - displaySubmersion) * 0.6;
    const waterTop = 80;
    const buoyancyScale = Math.min(1, values.currentBuoyancy / Math.max(values.weight, 1));

    return (
      <div style={{
        background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgDark} 100%)`,
        borderRadius: '16px',
        padding: typo.cardPadding,
        border: `1px solid ${colors.border}`,
      }}>
        <svg
          viewBox="0 0 300 200"
          style={{
            width: '100%',
            height: isMobile ? 200 : 260,
            borderRadius: '12px',
          }}
        >
          {/* Premium gradients and filters */}
          <defs>
            {/* Water gradient - realistic depth effect */}
            <linearGradient id="buoyWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#0284c7" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#0369a1" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.6" />
            </linearGradient>

            {/* Tank glass effect */}
            <linearGradient id="buoyTankGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.8" />
              <stop offset="10%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.1" />
              <stop offset="90%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.8" />
            </linearGradient>

            {/* Object gradient - 3D effect */}
            <linearGradient id="buoyObjectFloat" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="buoyObjectSink" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Force arrow gradients */}
            <linearGradient id="buoyWeightArrow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="buoyBuoyancyArrow" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="buoyGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="buoyGlowRed" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="buoyObjectGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Water surface shimmer */}
            <linearGradient id="buoyWaterSurface" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#7dd3fc" stopOpacity="1" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#7dd3fc" stopOpacity="1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="300" height="200" fill="#0f172a" rx="8" />

          {/* Subtle grid pattern */}
          <g opacity="0.1">
            {[60, 90, 120, 150].map(y => (
              <line key={y} x1="52" y1={y} x2="248" y2={y} stroke="#64748b" strokeWidth="0.5" strokeDasharray="2,4" />
            ))}
          </g>

          {/* Tank - glass effect */}
          <rect x="50" y="20" width="200" height="160" fill="url(#buoyTankGrad)" rx="6" />
          <rect x="50" y="20" width="200" height="160" fill="none" stroke="#64748b" strokeWidth="2" rx="6" />

          {/* Water body */}
          <rect x="52" y={waterTop} width="196" height="98" fill="url(#buoyWaterGrad)" rx="2" />

          {/* Water surface with shimmer */}
          <line x1="52" y1={waterTop} x2="248" y2={waterTop} stroke="url(#buoyWaterSurface)" strokeWidth="3" />

          {/* Depth markers */}
          <g opacity="0.6">
            <text x="46" y={waterTop + 25} textAnchor="end" fill="#64748b" fontSize="8">25%</text>
            <text x="46" y={waterTop + 50} textAnchor="end" fill="#64748b" fontSize="8">50%</text>
            <text x="46" y={waterTop + 75} textAnchor="end" fill="#64748b" fontSize="8">75%</text>
          </g>

          {/* Object with 3D effect and glow */}
          <g transform={`translate(125, ${objectTop})`} filter="url(#buoyObjectGlow)">
            <rect
              x="0" y="0" width="50" height="50" rx="6"
              fill={values.floats ? 'url(#buoyObjectFloat)' : 'url(#buoyObjectSink)'}
            />
            {/* Object highlight */}
            <rect x="5" y="5" width="20" height="8" rx="2" fill="rgba(255,255,255,0.3)" />
            {/* Mass label on object */}
            <text x="25" y="32" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {values.objectMass.toFixed(1)}
            </text>
            <text x="25" y="44" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10">
              kg
            </text>
          </g>

          {/* Weight arrow (down) with glow */}
          <g transform={`translate(195, ${objectTop + 25})`} filter="url(#buoyGlowRed)">
            <line x1="0" y1="0" x2="0" y2={Math.min(40, values.weight / 3)} stroke="url(#buoyWeightArrow)" strokeWidth="4" strokeLinecap="round" />
            <polygon points="-6,32 6,32 0,42" fill="#ef4444" />
          </g>

          {/* Buoyancy arrow (up) with glow - only when in water */}
          {displaySubmersion > 0 && (
            <g transform={`translate(105, ${objectTop + 25})`} filter="url(#buoyGlowCyan)">
              <line x1="0" y1={Math.min(40, values.currentBuoyancy / 3)} x2="0" y2="0" stroke="url(#buoyBuoyancyArrow)" strokeWidth="4" strokeLinecap="round" />
              <polygon points="-6,8 6,8 0,-2" fill="#06b6d4" />
            </g>
          )}

          {/* Status indicator - moved outside SVG clutter zone */}
          <g transform="translate(150, 12)">
            <rect x="-45" y="-8" width="90" height="16" rx="8" fill={values.floats ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} />
            <text x="0" y="4" textAnchor="middle" fill={values.floats ? '#34d399' : '#f87171'} fontSize="11" fontWeight="600">
              {values.floats ? '● FLOATS' : '● SINKS'}
            </text>
          </g>
        </svg>

        {/* Force labels - moved outside SVG for better readability */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: typo.elementGap,
          padding: `0 ${typo.elementGap}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
            <span style={{ fontSize: typo.small, color: '#67e8f9', fontWeight: 600 }}>
              F_b = {values.currentBuoyancy.toFixed(0)} N
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: typo.small, color: '#fca5a5', fontWeight: 600 }}>
              W = {values.weight.toFixed(0)} N
            </span>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
          </div>
        </div>

        {/* Force comparison bars - Premium design */}
        {!isStatic && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: typo.elementGap,
            marginTop: typo.sectionGap,
          }}>
            {[
              { label: 'Weight', value: values.weight, max: Math.max(values.weight, values.maxBuoyancy), color: '#ef4444', glow: '#fca5a5' },
              { label: 'Buoyancy', value: values.currentBuoyancy, max: Math.max(values.weight, values.maxBuoyancy), color: '#06b6d4', glow: '#67e8f9' },
              { label: 'Apparent', value: Math.max(0, values.apparentWeight), max: values.weight, color: '#3b82f6', glow: '#93c5fd' },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: typo.label, fontWeight: 600, color: item.glow }}>{item.label}</span>
                  <span style={{ fontSize: typo.label, fontWeight: 600, color: item.glow }}>{item.value.toFixed(0)}N</span>
                </div>
                <div style={{
                  height: '8px',
                  background: colors.bgCardLight,
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(item.value / item.max) * 100}%`,
                    background: `linear-gradient(90deg, ${item.color}, ${item.glow})`,
                    borderRadius: '4px',
                    transition: 'width 0.15s ease-out',
                    boxShadow: `0 0 8px ${item.color}40`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Buoyancy & Archimedes' Principle
      </h1>

      <p className="text-lg text-slate-400 max-w-lg mb-10">
        Discover why some objects float while others sink. Learn about Archimedes' principle: the buoyant force on an object equals the weight of the fluid it displaces.
      </p>

      {/* Visual Preview */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div className="text-5xl mb-3">🪨</div>
            <div className="text-2xl font-bold text-red-400">Sinks</div>
            <div className="text-sm text-slate-400">Dense objects</div>
          </div>
          <div className="text-3xl text-slate-500">vs</div>
          <div className="text-center">
            <div className="text-5xl mb-3">🚢</div>
            <div className="text-2xl font-bold text-emerald-400">Floats</div>
            <div className="text-sm text-slate-400">Less dense objects</div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Learning
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 0, label: 'Its density compared to the fluid', icon: '📊', description: 'Object density vs fluid density' },
      { id: 1, label: 'Its weight alone', icon: '⚖️', description: 'Heavier objects always sink' },
      { id: 2, label: 'Its shape', icon: '🔷', description: 'Only the shape matters' },
      { id: 3, label: 'Its color', icon: '🎨', description: 'Dark objects sink faster' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Static visualization */}
          <div className="mb-6">
            <WaterTankVisualization isStatic={true} />
          </div>

          {/* Question */}
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-2 block">
              YOUR PREDICTION
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              What determines if an object floats or sinks?
            </h2>
            <p className="text-slate-400">
              Look at the object in the water. What property decides its fate?
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-8">
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{ zIndex: 10 }}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  prediction === p.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-3xl">{p.icon}</span>
                <div>
                  <div className={`font-semibold ${prediction === p.id ? 'text-cyan-400' : 'text-white'}`}>
                    {p.label}
                  </div>
                  <div className="text-sm text-slate-400">
                    {p.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (prediction !== null) {
                  emitEvent('prediction_made', { prediction });
                  goToPhase('play');
                }
              }}
              disabled={prediction === null}
              style={{ zIndex: 10 }}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                prediction !== null
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Experiment
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPlay = () => {
    const values = calculateBuoyancy();

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-2 block">
              BUOYANCY LAB
            </span>
            <h2 className="text-2xl font-bold text-white mb-1">
              Sink or Float?
            </h2>
            <p className="text-slate-400">
              Adjust object density, fluid density, and volume to see what happens
            </p>
          </div>

          {/* Visualization */}
          <WaterTankVisualization />

          {/* Controls */}
          <div className={`grid gap-3 mt-4 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {/* Object Density */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-400">Object Density</span>
                <span className="text-lg font-bold text-white">{objectDensity.toFixed(2)} kg/L</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={objectDensity}
                onChange={(e) => setObjectDensity(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Fluid Density */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-blue-400">Fluid Density</span>
                <span className="text-lg font-bold text-white">{fluidDensity.toFixed(2)} kg/L</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={fluidDensity}
                onChange={(e) => setFluidDensity(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Volume */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-cyan-400">Object Volume</span>
                <span className="text-lg font-bold text-white">{objectVolume} L</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={objectVolume}
                onChange={(e) => setObjectVolume(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Drop button */}
          <div className="flex gap-3 justify-center mb-4">
            <button
              onClick={animateToEquilibrium}
              disabled={isAnimating}
              style={{ zIndex: 10 }}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                isAnimating
                  ? 'bg-slate-700 text-slate-400 cursor-default'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              {isAnimating ? 'Dropping...' : 'Drop in Water'}
            </button>
            <button
              onClick={() => setSubmersionDepth(0)}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Density comparison */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
            <div className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3">
              DENSITY COMPARISON
            </div>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className={`text-2xl font-bold ${values.floats ? 'text-emerald-400' : 'text-red-400'}`}>
                  {objectDensity.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400">Object (kg/L)</div>
              </div>
              <div className={`text-3xl font-bold ${values.floats ? 'text-emerald-400' : 'text-red-400'}`}>
                {values.floats ? '<' : '>'}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{fluidDensity.toFixed(2)}</div>
                <div className="text-xs text-slate-400">Fluid (kg/L)</div>
              </div>
            </div>
            <div className={`text-center mt-3 font-semibold ${values.floats ? 'text-emerald-400' : 'text-red-400'}`}>
              {values.floats ? 'Object floats!' : 'Object sinks!'}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={goNext}
              style={{ zIndex: 10 }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Continue to Review
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReview = () => {
    const userWasRight = prediction === 0;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Result */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {userWasRight ? '🎯' : '💡'}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {userWasRight ? 'Exactly Right!' : 'The Key is Density!'}
            </h2>
            <p className="text-slate-400">
              Archimedes discovered this over 2000 years ago
            </p>
          </div>

          {/* Core Concept */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Archimedes' Principle
            </h3>

            <div className="bg-slate-900/60 rounded-lg p-4 text-center mb-4">
              <p className="text-xl font-bold text-cyan-400 mb-1">
                Buoyant Force = Weight of Displaced Fluid
              </p>
              <p className="text-lg font-mono text-slate-300">
                F<sub>b</sub> = ρ<sub>fluid</sub> × V<sub>submerged</sub> × g
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <div className="font-semibold text-emerald-400 mb-1">If object density &lt; fluid density:</div>
                <div className="text-sm text-slate-300">Object floats! It only submerges enough to displace its weight in fluid.</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="font-semibold text-red-400 mb-1">If object density &gt; fluid density:</div>
                <div className="text-sm text-slate-300">Object sinks! Even fully submerged, buoyant force can't support its weight.</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={goNext}
              style={{ zIndex: 10 }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Try a Twist
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 0, label: 'Float higher in oil', icon: '⬆️', description: 'Less submerged than in water' },
      { id: 1, label: 'Float lower in oil', icon: '⬇️', description: 'More submerged than in water' },
      { id: 2, label: 'Float the same', icon: '⚖️', description: 'Oil vs water makes no difference' },
      { id: 3, label: 'Sink in oil', icon: '🫧', description: 'Oil can\'t support objects' },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Twist Introduction */}
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-2 block">
              TWIST SCENARIO
            </span>
            <h2 className="text-2xl font-bold text-white mb-2">
              Water vs Oil
            </h2>
            <p className="text-slate-400">
              An object floats in water (density 1.0 kg/L). What happens if you put it in oil (density 0.9 kg/L)?
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-8">
            {twistOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTwistPrediction(opt.id)}
                style={{ zIndex: 10 }}
                className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  twistPrediction === opt.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-3xl">{opt.icon}</span>
                <div>
                  <div className={`font-semibold ${twistPrediction === opt.id ? 'text-amber-400' : 'text-white'}`}>
                    {opt.label}
                  </div>
                  <div className="text-sm text-slate-400">
                    {opt.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (twistPrediction !== null) {
                  emitEvent('twist_prediction_made', { prediction: twistPrediction });
                  goToPhase('twist_play');
                }
              }}
              disabled={twistPrediction === null}
              style={{ zIndex: 10 }}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                twistPrediction !== null
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Test It
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTwistPlay = () => {
    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-2 block">
              TWIST EXPERIMENT
            </span>
            <h2 className="text-2xl font-bold text-white">
              Compare Different Fluids
            </h2>
          </div>

          {/* Visualization */}
          <WaterTankVisualization />

          {/* Fluid presets */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mt-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-blue-400">
                Fluid Type
              </span>
              <span className="text-xl font-bold text-blue-400">
                {fluidDensity.toFixed(2)} kg/L
              </span>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {[
                { label: 'Oil', value: 0.9, color: 'amber' },
                { label: 'Fresh Water', value: 1.0, color: 'blue' },
                { label: 'Salt Water', value: 1.025, color: 'cyan' },
                { label: 'Dead Sea', value: 1.24, color: 'emerald' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setFluidDensity(preset.value);
                    setSubmersionDepth(0);
                  }}
                  style={{ zIndex: 10 }}
                  className={`px-5 py-2 rounded-lg font-semibold transition-all border-2 ${
                    fluidDensity === preset.value
                      ? `border-${preset.color}-500 bg-${preset.color}-500/15 text-${preset.color}-400`
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Object presets */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-emerald-400">
                Object Type
              </span>
              <span className="text-xl font-bold text-emerald-400">
                {objectDensity.toFixed(2)} kg/L
              </span>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {[
                { label: 'Wood', value: 0.6 },
                { label: 'Ice', value: 0.92 },
                { label: 'Plastic', value: 0.95 },
                { label: 'Human', value: 1.06 },
                { label: 'Steel', value: 7.8 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setObjectDensity(preset.value);
                    setSubmersionDepth(0);
                  }}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 ${
                    objectDensity === preset.value
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drop button */}
          <div className="flex gap-3 justify-center mb-6">
            <button
              onClick={animateToEquilibrium}
              disabled={isAnimating}
              style={{ zIndex: 10 }}
              className={`px-8 py-3 rounded-xl font-semibold transition-all ${
                isAnimating
                  ? 'bg-slate-700 text-slate-400 cursor-default'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              {isAnimating ? 'Dropping...' : 'Drop Object'}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={goNext}
              style={{ zIndex: 10 }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              See the Insight
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => {
    const userWasRight = twistPrediction === 1;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Result */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {userWasRight ? '🎯' : '⬇️'}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${userWasRight ? 'text-emerald-400' : 'text-amber-400'}`}>
              {userWasRight ? 'Correct!' : 'You Float Lower in Less Dense Fluids!'}
            </h2>
          </div>

          {/* Core Insight */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Density Relationships
            </h3>

            <div className="bg-slate-900/60 rounded-lg p-4 text-center mb-4">
              <p className="text-cyan-400">
                Less dense fluid = Less buoyant force per volume
              </p>
              <p className="text-slate-400 text-sm mt-2">
                You need to displace MORE fluid to support the same weight
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-blue-400">Water</div>
                <div className="text-slate-400">ρ = 1.0 kg/L</div>
                <div className="text-xs text-slate-500 mt-2">
                  Less submersion needed
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-amber-400">Oil</div>
                <div className="text-slate-400">ρ = 0.9 kg/L</div>
                <div className="text-xs text-slate-500 mt-2">
                  More submersion needed
                </div>
              </div>
            </div>
          </div>

          {/* Fun Fact */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-amber-400 font-semibold mb-2">
              Practical Example
            </p>
            <p className="text-slate-300 text-sm">
              This is why ships ride higher in saltwater than freshwater! The Plimsoll line on ships marks different loading limits for different water types.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={goNext}
              style={{ zIndex: 10 }}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Real World Applications
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTransfer = () => {
    const app = applications[activeApp];
    const allRead = completedApps.size >= applications.length;

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-2xl w-full">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-sm text-slate-400">
              {completedApps.size} of {applications.length} applications read
            </span>
            <div className="flex gap-1.5">
              {applications.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4 flex-wrap justify-center">
            {applications.map((a, i) => {
              const isCompleted = completedApps.has(i);
              return (
                <button
                  key={a.id}
                  onClick={() => setActiveApp(i)}
                  style={{ zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    activeApp === i
                      ? 'text-white'
                      : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }`}
                  style={activeApp === i ? { background: a.color, zIndex: 10 } : { zIndex: 10 }}
                >
                  {isCompleted ? '✓' : a.icon} {a.title}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{ background: `${app.color}20` }}
              >
                {app.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{app.title}</h2>
                <p className="text-sm font-medium" style={{ color: app.color }}>{app.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-slate-300 mb-4 leading-relaxed">{app.description}</p>

            {/* Physics Connection */}
            <div
              className="rounded-lg p-4 mb-4 border"
              style={{ background: `${app.color}10`, borderColor: `${app.color}30` }}
            >
              <p className="font-semibold mb-1" style={{ color: app.color }}>Physics Connection</p>
              <p className="text-sm text-slate-300">{app.physics}</p>
            </div>

            {/* Insight */}
            <div className="bg-slate-900/60 rounded-lg p-4 mb-4 border border-slate-700/50">
              <p className="font-semibold text-white mb-1">Key Insight</p>
              <p className="text-sm text-slate-400">{app.insight}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {app.stats.map((stat, i) => (
                <div key={i} className="bg-slate-900/60 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold" style={{ color: app.color }}>{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mark as Read Button */}
            {!completedApps.has(activeApp) ? (
              <button
                onClick={() => {
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  emitEvent('app_explored', { app: app.id });
                  playSound('complete');
                  if (activeApp < applications.length - 1) {
                    setTimeout(() => setActiveApp(activeApp + 1), 300);
                  }
                }}
                style={{ zIndex: 10 }}
                className="w-full py-3 rounded-lg font-semibold bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
              >
                Mark "{app.title}" as Read
              </button>
            ) : (
              <div className="w-full py-3 rounded-lg font-semibold text-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                Completed
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={goBack}
              style={{ zIndex: 10 }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => goToPhase('test')}
              disabled={!allRead}
              style={{ zIndex: 10 }}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                allRead
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Take the Quiz
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const q = testQuestions[testIndex];
    const totalCorrect = testAnswers.reduce((sum, ans, i) => sum + (ans !== null && testQuestions[i].options[ans]?.correct ? 1 : 0), 0);

    if (testSubmitted) {
      const passed = totalCorrect >= 7;
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-4">{passed ? '🎉' : '📚'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>
            <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalCorrect}/10
            </div>
            <p className="text-slate-400 mb-8">
              {passed ? 'You\'ve mastered buoyancy!' : 'Review the concepts and try again.'}
            </p>
            <button
              onClick={() => {
                if (passed) {
                  setTestScore(totalCorrect);
                  goToPhase('mastery');
                } else {
                  goToPhase('review');
                }
              }}
              style={{ zIndex: 10 }}
              className={`px-8 py-4 rounded-xl font-semibold text-lg ${
                passed
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
              }`}
            >
              {passed ? 'Complete!' : 'Review Material'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center px-6 py-8">
        <div className="max-w-xl w-full">
          {/* Question Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
              QUESTION {testIndex + 1} OF 10
            </span>
            <div className="flex gap-1">
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    testAnswers[i] !== null
                      ? testQuestions[i].options[testAnswers[i] as number]?.correct ? 'bg-emerald-500' : 'bg-red-500'
                      : i === testIndex ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question */}
          <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">
            {q.question}
          </h2>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-6">
            {q.options.map((opt, i) => {
              const isSelected = testAnswers[testIndex] === i;
              const isCorrect = opt.correct;
              const showResult = testAnswers[testIndex] !== null;

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (testAnswers[testIndex] === null) {
                      const newAnswers = [...testAnswers];
                      newAnswers[testIndex] = i;
                      setTestAnswers(newAnswers);
                      emitEvent('test_answered', { questionIndex: testIndex, correct: opt.correct });
                    }
                  }}
                  style={{ zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all border-2 ${
                    showResult
                      ? isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500'
                        : isSelected
                          ? 'bg-red-500/10 border-red-500'
                          : 'bg-slate-800/50 border-slate-700'
                      : isSelected
                        ? 'bg-cyan-500/10 border-cyan-500'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                  }`}
                >
                  <span className={`font-bold mr-3 ${
                    showResult
                      ? isCorrect ? 'text-emerald-400' : isSelected ? 'text-red-400' : 'text-slate-500'
                      : 'text-cyan-400'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-white">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation (after answer) */}
          {testAnswers[testIndex] !== null && (
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
              <p className="font-semibold text-white mb-1">Explanation</p>
              <p className="text-sm text-slate-400">{q.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            {testIndex > 0 ? (
              <button
                onClick={() => setTestIndex(testIndex - 1)}
                style={{ zIndex: 10 }}
                className="px-6 py-3 rounded-xl font-semibold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
            ) : <div />}
            {testAnswers[testIndex] !== null && (
              testIndex < testQuestions.length - 1 ? (
                <button
                  onClick={() => setTestIndex(testIndex + 1)}
                  style={{ zIndex: 10 }}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTestSubmitted(true);
                    emitEvent('test_completed', { score: totalCorrect });
                  }}
                  style={{ zIndex: 10 }}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                >
                  See Results
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-12 text-center">
      <div className="max-w-md">
        {/* Trophy */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center mx-auto mb-8 text-6xl">
          🏆
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Congratulations!
        </h1>
        <h2 className="text-xl font-semibold text-cyan-400 mb-4">
          Buoyancy Master
        </h2>

        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
          You now understand Archimedes' principle and why objects float or sink. From ships to submarines to hot air balloons!
        </p>

        {/* Score */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 mb-6">
          <div className="text-sm text-slate-400 mb-1">Quiz Score</div>
          <div className="text-3xl font-bold text-emerald-400">{testScore}/10</div>
        </div>

        {/* Achievements */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: '🚢', label: 'Float/Sink' },
            { icon: '🧂', label: 'Density' },
            { icon: '⬆️', label: 'Archimedes' },
          ].map((achievement, i) => (
            <div key={i} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <div className="text-xs text-slate-400">{achievement.label}</div>
            </div>
          ))}
        </div>

        {/* Key Formula */}
        <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50 mb-8">
          <p className="text-xs font-bold text-cyan-400 tracking-widest uppercase mb-3">
            KEY FORMULA MASTERED
          </p>
          <p className="text-xl font-bold text-white">
            F<sub>b</sub> = ρ<sub>fluid</sub> × V × g
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            emitEvent('mastery_achieved', { game: 'buoyancy', score: testScore });
            if (onComplete) onComplete();
          }}
          style={{ zIndex: 10 }}
          className="px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
        >
          Complete Lesson
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // REAL-WORLD APPLICATIONS DATA
  // Comprehensive applications showcasing buoyancy principles in action
  // ============================================================================
  const realWorldApps = [
    {
      icon: '🛥️',
      title: 'Submarine Ballast Systems',
      short: 'Naval Engineering',
      tagline: 'Mastering depth through controlled buoyancy',
      description: 'Submarines achieve precise depth control by manipulating their buoyancy through ballast tanks. By filling tanks with seawater, the submarine becomes heavier and descends. By forcing water out with compressed air, it becomes lighter and ascends. This elegant application of Archimedes\' principle allows submarines to hover at any depth, transition between surface and submerged operations, and perform emergency surfacing maneuvers.',
      connection: 'The ballast system directly applies the buoyancy equation F_b = ρ_fluid × V × g. By changing the submarine\'s total mass while keeping volume constant, operators shift between positive buoyancy (floating), neutral buoyancy (hovering), and negative buoyancy (sinking). Fine-tuning with trim tanks allows for precise attitude control.',
      howItWorks: 'Main ballast tanks (MBT) handle large buoyancy changes for diving/surfacing. Variable ballast tanks (VBT) provide fine depth control. Trim tanks adjust fore-aft balance. Compressed air stored in flasks can rapidly evacuate ballast for emergency surfacing. Modern submarines also use pump-jet propulsion and hydroplanes for dynamic depth control during movement.',
      stats: [
        { value: '600m+', label: 'Operating Depth' },
        { value: '240 days', label: 'Submerged Duration' },
        { value: '99.7%', label: 'Buoyancy Precision' }
      ],
      examples: [
        'Virginia-class attack submarines use advanced ballast systems for stealth operations',
        'Research submersibles like Alvin reach 4,500m depths with precise buoyancy control',
        'Nuclear submarines maintain neutral buoyancy while stationary for months',
        'Rescue submarines adjust buoyancy to mate with distressed vessels'
      ],
      companies: [
        'General Dynamics Electric Boat',
        'BAE Systems Submarines',
        'ThyssenKrupp Marine Systems',
        'Naval Group'
      ],
      futureImpact: 'Next-generation submarines will feature automated buoyancy management systems using AI to optimize depth control, reduce noise signatures, and improve energy efficiency. Biomimetic designs inspired by fish swim bladders promise even more precise and silent depth adjustment.',
      color: '#06B6D4'
    },
    {
      icon: '🎈',
      title: 'Hot Air Balloons',
      short: 'Aviation',
      tagline: 'Riding the atmosphere through thermal buoyancy',
      description: 'Hot air balloons demonstrate buoyancy in a gaseous medium - the atmosphere. By heating air inside the envelope to approximately 100°C, its density drops to about 0.95 kg/m³ compared to ambient air at 1.2 kg/m³. This density difference creates an upward buoyant force. A typical balloon envelope of 2,800 m³ can generate enough lift to carry 600+ kg, including passengers, basket, and fuel.',
      connection: 'The same buoyancy principle applies: F_b = ρ_air × V × g. Hot air is less dense than cold air because heating causes gas molecules to move faster and spread apart. The weight of displaced cool air exceeds the weight of hot air inside, creating net upward force. Pilots control altitude by adjusting burner output.',
      howItWorks: 'Propane burners heat air inside the envelope, decreasing its density. Opening the parachute valve at the top releases hot air, allowing cooling and descent. Pilots use natural wind patterns at different altitudes for directional control. Morning flights preferred for stable atmospheric conditions and predictable thermal behavior.',
      stats: [
        { value: '2,800 m³', label: 'Typical Envelope Volume' },
        { value: '100°C', label: 'Operating Air Temp' },
        { value: '600 kg', label: 'Lifting Capacity' }
      ],
      examples: [
        'Tourist balloon rides over Cappadocia carry passengers using thermal buoyancy',
        'Scientific balloons reach stratosphere heights of 40+ km for research',
        'Balloon festivals demonstrate precise buoyancy control in formation flights',
        'Long-distance balloon races cross continents using altitude-based wind navigation'
      ],
      companies: [
        'Cameron Balloons',
        'Lindstrand Technologies',
        'Ultramagic',
        'Kubicek Balloons',
        'Aerostar International'
      ],
      futureImpact: 'Solar-powered hot air balloons using transparent envelopes are being developed for sustainable tourism. High-altitude pseudo-satellites (HAPS) use buoyancy principles to maintain position in the stratosphere for telecommunications and Earth observation.',
      color: '#F59E0B'
    },
    {
      icon: '🧪',
      title: 'Hydrometer Density Measurement',
      short: 'Chemistry',
      tagline: 'Precision measurement through equilibrium buoyancy',
      description: 'Hydrometers are elegant instruments that measure liquid density by exploiting buoyancy equilibrium. A weighted glass tube floats at different depths depending on fluid density - sinking deeper in less dense liquids and riding higher in denser ones. The scale on the stem directly reads density or related measurements like specific gravity, alcohol content, or sugar concentration.',
      connection: 'At equilibrium, buoyant force exactly equals the hydrometer\'s weight: ρ_liquid × V_submerged × g = m_hydrometer × g. Since the hydrometer\'s mass is constant, the submerged volume inversely relates to liquid density. More dense liquid means less volume submerged, so the instrument floats higher.',
      howItWorks: 'The hydrometer\'s weighted bulb provides stability and ensures it floats upright. The narrow stem amplifies small density differences into readable scale movements. Specialized hydrometers are calibrated for specific applications - saccharometers for sugar content, alcoholmeters for ethanol percentage, lactometers for milk quality.',
      stats: [
        { value: '0.001', label: 'Density Resolution' },
        { value: '±0.1%', label: 'Measurement Accuracy' },
        { value: '3000+ yrs', label: 'Technology Age' }
      ],
      examples: [
        'Winemakers measure sugar content to predict alcohol levels during fermentation',
        'Battery technicians check electrolyte density to assess charge state',
        'Dairy inspectors verify milk hasn\'t been diluted with water',
        'Petroleum engineers measure crude oil API gravity for classification'
      ],
      companies: [
        'Thermo Fisher Scientific',
        'Anton Paar',
        'METTLER TOLEDO',
        'Brannan Thermometers'
      ],
      futureImpact: 'Digital density meters using oscillating U-tube technology offer higher precision than traditional hydrometers. Integration with IoT enables real-time density monitoring in industrial processes, while microfluidic devices bring hydrometer principles to lab-on-a-chip applications.',
      color: '#8B5CF6'
    },
    {
      icon: '🦺',
      title: 'Life Jackets and Flotation Devices',
      short: 'Safety Equipment',
      tagline: 'Engineering survival through applied buoyancy',
      description: 'Life jackets save lives by dramatically reducing the wearer\'s effective density below that of water. Closed-cell foam or inflatable chambers filled with air (density ~0.03 kg/L) combine with the human body (density ~1.06 kg/L) to create an average density well below water\'s 1.0 kg/L. This guarantees flotation and, in advanced designs, automatically orients an unconscious person face-up.',
      connection: 'The combined system floats when average density < water density. A 70 kg person with 10 L of foam (mass ~0.3 kg) has average density = 70.3 kg / (66 + 10) L ≈ 0.92 kg/L. Since 0.92 < 1.0, the person floats. The buoyant force is distributed to keep airways above water.',
      howItWorks: 'Inherently buoyant jackets use closed-cell foam that cannot absorb water. Inflatable jackets use CO2 cartridges triggered manually or automatically by water contact. Type ratings indicate buoyancy force: Type I (150+ N) for offshore, Type II (100 N) for nearshore, Type III (100 N) for conscious swimmers. Placement of flotation material determines self-righting capability.',
      stats: [
        { value: '150 N', label: 'Offshore Buoyancy Rating' },
        { value: '35 lbs', label: 'Minimum Buoyancy Force' },
        { value: '< 5 sec', label: 'Self-Righting Time' }
      ],
      examples: [
        'Offshore workers wear auto-inflating jackets with integrated harnesses',
        'Pilots use survival vests combining flotation with emergency equipment',
        'Children\'s swim aids use graduated buoyancy for learning to swim',
        'Military personnel use tactical flotation devices compatible with equipment'
      ],
      companies: [
        'Survitec Group',
        'Mustang Survival',
        'Spinlock',
        'Stearns',
        'Kent Sporting Goods'
      ],
      futureImpact: 'Smart life jackets with GPS, AIS beacons, and biometric sensors are becoming standard. Research into thermally-activated inflation and self-deploying designs promises to save more lives. Sustainable materials are replacing petroleum-based foams in next-generation flotation devices.',
      color: '#10B981'
    }
  ];

  const renderPhase = () => {
    switch (phase) {
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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Buoyancy</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
