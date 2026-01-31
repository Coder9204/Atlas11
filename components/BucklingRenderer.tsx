'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// BUCKLING RENDERER - COLUMN COLLAPSE & EULER'S FORMULA
// Teaching: Slender columns fail by buckling, not crushing. Length² matters!
// ─────────────────────────────────────────────────────────────────────────────

interface GameEvent {
  type: 'prediction' | 'observation' | 'phase_change' | 'interaction' | 'completion';
  phase: string;
  data?: {
    prediction?: string;
    actual?: string;
    isCorrect?: boolean;
    score?: number;
    action?: string;
    details?: string;
  };
  timestamp: number;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Lab',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Twist Lab',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

const isValidPhase = (phase: string): phase is Phase => {
  return PHASES.includes(phase as Phase);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface BucklingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const BucklingRenderer: React.FC<BucklingRendererProps> = ({
  phase: propPhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
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

  const [currentPhase, setCurrentPhase] = useState<Phase>(propPhase || 'hook');
  const [showCoachMessage, setShowCoachMessage] = useState(true);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Column simulation - legacy discrete selection
  const [columnLength, setColumnLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [appliedLoad, setAppliedLoad] = useState(0);
  const [hasBuckled, setHasBuckled] = useState(false);
  const [buckleAmount, setBuckleAmount] = useState(0);
  const [bucklingLoads, setBucklingLoads] = useState<Record<string, number>>({});

  // Enhanced play phase - continuous sliders
  const [columnLengthContinuous, setColumnLengthContinuous] = useState(1.5); // meters (0.5 to 3)
  const [columnRadius, setColumnRadius] = useState(0.02); // meters (0.01 to 0.05)
  const [appliedForce, setAppliedForce] = useState(0); // Newtons

  // Material properties (Young's modulus in Pa)
  const materials: Record<string, { name: string; E: number; color: string }> = {
    steel: { name: 'Steel', E: 200e9, color: '#94A3B8' },
    aluminum: { name: 'Aluminum', E: 69e9, color: '#CBD5E1' },
    wood: { name: 'Wood (Oak)', E: 12e9, color: '#A16207' }
  };

  // End condition factors (K values for Euler buckling)
  const endConditions: Record<string, { name: string; K: number; desc: string }> = {
    'fixed-fixed': { name: 'Fixed-Fixed', K: 0.5, desc: 'Both ends rigidly fixed' },
    'pinned-pinned': { name: 'Pinned-Pinned', K: 1.0, desc: 'Both ends free to rotate' },
    'fixed-free': { name: 'Fixed-Free (Cantilever)', K: 2.0, desc: 'One end fixed, one free' },
    'fixed-pinned': { name: 'Fixed-Pinned', K: 0.7, desc: 'One fixed, one pinned' }
  };

  // Twist phase - material and end condition selection
  const [selectedMaterial, setSelectedMaterial] = useState<string>('steel');
  const [selectedEndCondition, setSelectedEndCondition] = useState<string>('pinned-pinned');
  const [twistColumnLength, setTwistColumnLength] = useState(1.5);
  const [twistColumnRadius, setTwistColumnRadius] = useState(0.02);
  const [twistAppliedForce, setTwistAppliedForce] = useState(0);

  // Twist: cross-section shape
  const [crossSection, setCrossSection] = useState<'solid' | 'hollow' | 'i-beam'>('solid');
  const [twistLoad, setTwistLoad] = useState(0);
  const [twistHasBuckled, setTwistHasBuckled] = useState(false);
  const [twistBuckleAmount, setTwistBuckleAmount] = useState(0);
  const [twistExperimentsRun, setTwistExperimentsRun] = useState(0);

  // Track experiments for play phase
  const [playExperimentsRun, setPlayExperimentsRun] = useState(0);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Phase sync
  useEffect(() => {
    if (propPhase && propPhase !== currentPhase) {
      setCurrentPhase(propPhase);
    }
  }, [propPhase, currentPhase]);

  // Sound system
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
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

  // Helper for phase navigation
  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(currentPhase);
    if (currentIndex < PHASES.length - 1) {
      setCurrentPhase(PHASES[currentIndex + 1]);
      onPhaseComplete?.();
    }
  }, [currentPhase, onPhaseComplete]);

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setCurrentPhase(newPhase);
    setShowCoachMessage(true);

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [playSound]);

  // ─────────────────────────────────────────────────────────────────────────
  // BUCKLING PHYSICS - EULER FORMULA
  // P_cr = π²EI / (KL)² where E=modulus, I=moment of inertia, K=end factor, L=length
  // ─────────────────────────────────────────────────────────────────────────

  // Calculate moment of inertia for circular cross-section: I = π*r⁴/4
  const getMomentOfInertia = (radius: number): number => {
    return (Math.PI * Math.pow(radius, 4)) / 4;
  };

  // Calculate critical buckling load using Euler's formula
  const calculateCriticalLoad = (
    length: number, // meters
    radius: number, // meters
    materialKey: string = 'steel',
    endConditionKey: string = 'pinned-pinned'
  ): number => {
    const E = materials[materialKey]?.E || materials.steel.E;
    const K = endConditions[endConditionKey]?.K || 1.0;
    const I = getMomentOfInertia(radius);
    const effectiveLength = K * length;

    // P_cr = π²EI / (KL)²
    const Pcr = (Math.PI * Math.PI * E * I) / (effectiveLength * effectiveLength);
    return Pcr;
  };

  // Get safety factor (applied load / critical load)
  const getSafetyFactor = (appliedLoad: number, criticalLoad: number): number => {
    if (appliedLoad === 0) return Infinity;
    return criticalLoad / appliedLoad;
  };

  // Legacy function for discrete length selection
  const getCriticalLoad = (length: 'short' | 'medium' | 'long', section: 'solid' | 'hollow' | 'i-beam' = 'solid') => {
    let baseLoad = 50;
    const lengthFactors = { short: 4, medium: 1, long: 0.25 };
    const sectionFactors = { solid: 1, hollow: 1.5, 'i-beam': 2.5 };
    return Math.round(baseLoad * lengthFactors[length] * sectionFactors[section]);
  };

  const handleLoadChange = (delta: number, istwist = false) => {
    if (istwist) {
      if (twistHasBuckled && delta > 0) return;
      const newLoad = Math.max(0, Math.min(200, twistLoad + delta));
      setTwistLoad(newLoad);

      const criticalLoad = getCriticalLoad('medium', crossSection);
      const loadRatio = newLoad / criticalLoad;

      if (loadRatio < 1) {
        setTwistBuckleAmount(loadRatio * 0.3);
        setTwistHasBuckled(false);
      } else {
        setTwistBuckleAmount(1);
        setTwistHasBuckled(true);
        playSound('failure');
        console.debug('observation', {
          details: `${crossSection} section buckled at ${newLoad}N`
        });
      }
    } else {
      if (hasBuckled && delta > 0) return;
      const newLoad = Math.max(0, Math.min(200, appliedLoad + delta));
      setAppliedLoad(newLoad);

      const criticalLoad = getCriticalLoad(columnLength);
      const loadRatio = newLoad / criticalLoad;

      if (loadRatio < 1) {
        setBuckleAmount(loadRatio * 0.3);
        setHasBuckled(false);
      } else {
        setBuckleAmount(1);
        setHasBuckled(true);
        playSound('failure');
        console.debug('observation', {
          details: `${columnLength} column buckled at ${newLoad}N`
        });
      }
    }
  };

  const resetColumn = (istwist = false) => {
    if (istwist) {
      setTwistLoad(0);
      setTwistHasBuckled(false);
      setTwistBuckleAmount(0);
    } else {
      setAppliedLoad(0);
      setHasBuckled(false);
      setBuckleAmount(0);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COACH MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

  const coachMessages: Record<Phase, string> = {
    hook: "Why does a yardstick break when you push down on it? It doesn't crush—it bends and snaps sideways!",
    predict: "Which holds more weight: a short thick column or a long thin one of the same material?",
    play: "Apply load to columns of different lengths. Watch for buckling!",
    review: "Euler discovered: doubling length makes a column 4x weaker to buckling!",
    twist_predict: "Engineers use I-beams and hollow tubes. Do they buckle differently than solid rods?",
    twist_play: "Test different cross-section shapes under load.",
    twist_review: "Shape matters! I-beams resist buckling far better than solid rods of equal weight!",
    transfer: "From bike frames to skyscrapers, buckling physics shapes our world!",
    test: "Let's test your understanding of buckling and column design!",
    mastery: "You've mastered structural buckling! Build stronger with less!"
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COLORS
  // ─────────────────────────────────────────────────────────────────────────

  const colors = {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
    neutral: '#64748B',
    column: '#475569',
    stressed: '#F59E0B',
    buckled: '#EF4444',
    load: '#3B82F6',
    steel: '#94A3B8'
  };

  // ─────────────────────────────────────────────────────────────────────────
  // COLUMN VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const renderColumnVisualization = (
    length: 'short' | 'medium' | 'long',
    load: number,
    buckleAmt: number,
    buckled: boolean,
    section?: 'solid' | 'hollow' | 'i-beam'
  ) => {
    const heights = { short: 80, medium: 140, long: 200 };
    const height = heights[length];
    const criticalLoad = getCriticalLoad(length, section);
    const buckleOffset = buckleAmt * 30;
    const stressRatio = load / criticalLoad;
    const columnColor = buckled ? colors.buckled :
                        stressRatio > 0.8 ? colors.stressed :
                        stressRatio > 0.5 ? colors.accent : colors.column;

    return (
      <svg viewBox="0 0 200 280" className="w-full h-56 md:h-64">
        <rect x="0" y="0" width="200" height="280" fill="#1e293b" rx="10" />
        <rect x="0" y="250" width="200" height="30" fill={colors.steel} />
        <line x1="80" y1="250" x2="120" y2="250" stroke={colors.column} strokeWidth="3" />

        <g transform={`translate(100, ${60 - height / 2})`}>
          <rect x="-30" y="-20" width="60" height="20" fill={colors.load} rx="3" />
          <text x="0" y="-5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
            {load}N
          </text>
          <polygon points="0,5 -8,-5 8,-5" fill={colors.load} />
        </g>

        <g transform={`translate(100, ${250 - height})`}>
          {buckled || buckleAmt > 0 ? (
            <path
              d={`M 0,0
                  Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${height * 0.25}
                    ${buckleOffset},${height * 0.5}
                  Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${height * 0.75}
                    0,${height}`}
              stroke={columnColor}
              strokeWidth={section === 'i-beam' ? 16 : section === 'hollow' ? 14 : 12}
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <rect
              x={section === 'i-beam' ? -8 : section === 'hollow' ? -7 : -6}
              y="0"
              width={section === 'i-beam' ? 16 : section === 'hollow' ? 14 : 12}
              height={height}
              fill={columnColor}
              rx="2"
            />
          )}

          {section && (
            <g transform={`translate(50, ${height / 2})`}>
              <text x="0" y="-20" textAnchor="middle" fill={colors.neutral} fontSize="9">Cross-section:</text>
              {section === 'solid' && (
                <circle cx="0" cy="0" r="10" fill={columnColor} />
              )}
              {section === 'hollow' && (
                <>
                  <circle cx="0" cy="0" r="12" fill={columnColor} />
                  <circle cx="0" cy="0" r="6" fill="#1e293b" />
                </>
              )}
              {section === 'i-beam' && (
                <g>
                  <rect x="-12" y="-10" width="24" height="4" fill={columnColor} />
                  <rect x="-12" y="6" width="24" height="4" fill={columnColor} />
                  <rect x="-3" y="-10" width="6" height="20" fill={columnColor} />
                </g>
              )}
            </g>
          )}
        </g>

        <g transform="translate(100, 25)">
          <rect
            x="-45"
            y="-15"
            width="90"
            height="25"
            fill={buckled ? colors.buckled : stressRatio > 0.8 ? colors.stressed : colors.success}
            rx="12"
          />
          <text x="0" y="5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
            {buckled ? 'BUCKLED!' : stressRatio > 0.8 ? 'CRITICAL' : 'STABLE'}
          </text>
        </g>

        <text x="100" y="270" textAnchor="middle" fill={colors.neutral} fontSize="10">
          Critical: {criticalLoad}N | Length: {length}
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-indigo-400 tracking-wide">STRUCTURAL MECHANICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
        The Buckling Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why do columns collapse sideways instead of crushing straight down?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
            <rect x="0" y="0" width="300" height="180" fill="#1e293b" rx="10" />
            <rect x="0" y="160" width="300" height="20" fill={colors.steel} />

            <g transform="translate(80, 160)">
              <rect x="-5" y="-100" width="10" height="100" fill={colors.column} rx="2" />
              <text x="0" y="-110" textAnchor="middle" fill={colors.neutral} fontSize="10">Before</text>
            </g>

            <text x="150" y="90" textAnchor="middle" fill={colors.primary} fontSize="16" fontWeight="bold">→</text>

            <g transform="translate(220, 160)">
              <path
                d="M 0,0 Q 30,-50 0,-100"
                stroke={colors.buckled}
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
              />
              <text x="0" y="-110" textAnchor="middle" fill={colors.buckled} fontSize="10">BUCKLED!</text>
              <polygon points="0,-100 -8,-85 8,-85" fill={colors.load} />
              <rect x="-10" y="-120" width="20" height="15" fill={colors.load} rx="2" />
            </g>

            <text x="150" y="25" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
              Push down on a yardstick...
            </text>
          </svg>

          <div className="mt-6 space-y-3">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A long thin column doesn't crush straight down
            </p>
            <p className="text-lg text-red-400 font-bold leading-relaxed">
              it bends and snaps sideways!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ zIndex: 10 }}
      >
        <span className="relative z-10 flex items-center gap-3">
          Make Your Prediction
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'linear', label: 'Double length = half the strength', icon: '📏' },
      { id: 'square', label: 'Double length = quarter the strength', icon: '📐' },
      { id: 'same', label: "Length doesn't affect buckling strength", icon: '=' },
      { id: 'stronger', label: 'Longer columns are actually stronger', icon: '💪' }
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>

        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 max-w-lg">
          <p className="text-slate-300">
            Imagine two identical steel rods—same thickness, same material.
            One is 1 meter long, one is 2 meters long.
          </p>
          <p className="text-indigo-400 font-semibold mt-3">
            How do their buckling strengths compare?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
          {predictionOptions.map(option => (
            <button
              key={option.id}
              onClick={() => {
                setPrediction(option.id);
                playSound('click');
                console.debug('prediction', { prediction: option.id });
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                prediction === option.id
                  ? 'border-indigo-500 bg-indigo-500/20 shadow-md'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="text-2xl">{option.icon}</span>
              <span className={prediction === option.id ? 'text-indigo-300 font-semibold' : 'text-slate-300'}>
                {option.label}
              </span>
              {prediction === option.id && (
                <span className="ml-auto text-indigo-400">✓</span>
              )}
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={() => goToPhase('play')}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            style={{ zIndex: 10 }}
          >
            Start Experiments →
          </button>
        )}
      </div>
    );
  };

  const renderPlay = () => {
    // Calculate critical load for current parameters
    const criticalLoad = calculateCriticalLoad(columnLengthContinuous, columnRadius, 'steel', 'pinned-pinned');
    const criticalLoadKN = criticalLoad / 1000; // Convert to kN for display
    const maxSliderForce = Math.min(criticalLoad * 1.2, 1000000); // Max slider is 120% of critical or 1MN
    const loadRatio = appliedForce / criticalLoad;
    const safetyFactor = getSafetyFactor(appliedForce, criticalLoad);
    const isBuckled = loadRatio >= 1;
    const buckleDeflection = isBuckled ? 1 : loadRatio * 0.3;

    // Visualization colors based on stress state
    const getColumnColor = () => {
      if (isBuckled) return colors.buckled;
      if (loadRatio > 0.8) return colors.stressed;
      if (loadRatio > 0.5) return colors.accent;
      return colors.column;
    };

    // Interactive column SVG
    const renderInteractiveColumn = () => {
      const svgHeight = 300;
      const columnVisualHeight = 50 + (columnLengthContinuous - 0.5) * 80; // Scale length visually
      const columnWidth = 8 + (columnRadius - 0.01) * 400; // Scale radius visually
      const buckleOffset = buckleDeflection * 40;

      return (
        <svg viewBox="0 0 300 320" className="w-full h-72 md:h-80">
          {/* Background */}
          <rect x="0" y="0" width="300" height="320" fill="#1e293b" rx="12" />

          {/* Ground/Base */}
          <rect x="0" y="280" width="300" height="40" fill={colors.steel} />
          <line x1="100" y1="280" x2="200" y2="280" stroke={colors.column} strokeWidth="4" />

          {/* Applied Force Arrow */}
          <g transform={`translate(150, ${40})`}>
            <rect x="-40" y="-25" width="80" height="25" fill={colors.load} rx="4" />
            <text x="0" y="-8" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {appliedForce >= 1000 ? `${(appliedForce / 1000).toFixed(1)} kN` : `${appliedForce.toFixed(0)} N`}
            </text>
            <polygon points="0,5 -12,-8 12,-8" fill={colors.load} />
            {/* Force direction arrows */}
            <line x1="0" y1="5" x2="0" y2="25" stroke={colors.load} strokeWidth="3" markerEnd="url(#arrowhead)" />
          </g>

          {/* Column */}
          <g transform={`translate(150, ${280 - columnVisualHeight})`}>
            {isBuckled || buckleDeflection > 0 ? (
              <path
                d={`M 0,0
                    Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${columnVisualHeight * 0.25}
                      ${buckleOffset},${columnVisualHeight * 0.5}
                    Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${columnVisualHeight * 0.75}
                      0,${columnVisualHeight}`}
                stroke={getColumnColor()}
                strokeWidth={columnWidth}
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <rect
                x={-columnWidth / 2}
                y="0"
                width={columnWidth}
                height={columnVisualHeight}
                fill={getColumnColor()}
                rx="2"
              />
            )}
          </g>

          {/* Status Badge */}
          <g transform="translate(150, 20)">
            <rect
              x="-55"
              y="-12"
              width="110"
              height="24"
              fill={isBuckled ? colors.buckled : loadRatio > 0.8 ? colors.stressed : colors.success}
              rx="12"
            />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {isBuckled ? 'BUCKLED!' : loadRatio > 0.8 ? 'NEAR CRITICAL!' : 'STABLE'}
            </text>
          </g>

          {/* Critical Load Indicator Line */}
          <g transform={`translate(250, ${280 - columnVisualHeight})`}>
            <line x1="0" y1="0" x2="0" y2={columnVisualHeight} stroke={colors.danger} strokeWidth="2" strokeDasharray="4,4" />
            <text x="5" y={columnVisualHeight / 2} fill={colors.danger} fontSize="9" transform={`rotate(90, 5, ${columnVisualHeight / 2})`}>
              P_cr = {criticalLoadKN.toFixed(1)} kN
            </text>
          </g>

          {/* Safety Factor Display */}
          <g transform="translate(40, 60)">
            <rect x="-30" y="-15" width="60" height="50" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="0" textAnchor="middle" fill={colors.neutral} fontSize="9">Safety</text>
            <text x="0" y="15" textAnchor="middle" fill={safetyFactor > 2 ? colors.success : safetyFactor > 1 ? colors.accent : colors.danger} fontSize="14" fontWeight="bold">
              {safetyFactor === Infinity ? '∞' : safetyFactor.toFixed(1)}
            </text>
            <text x="0" y="28" textAnchor="middle" fill={colors.neutral} fontSize="8">factor</text>
          </g>

          {/* Moment of Inertia Display */}
          <g transform="translate(260, 60)">
            <rect x="-30" y="-15" width="60" height="50" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="0" textAnchor="middle" fill={colors.neutral} fontSize="9">I (inertia)</text>
            <text x="0" y="15" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">
              {(getMomentOfInertia(columnRadius) * 1e9).toFixed(2)}
            </text>
            <text x="0" y="28" textAnchor="middle" fill={colors.neutral} fontSize="8">×10⁻⁹ m⁴</text>
          </g>

          {/* Info text */}
          <text x="150" y="305" textAnchor="middle" fill={colors.neutral} fontSize="10">
            L = {columnLengthContinuous.toFixed(2)}m | r = {(columnRadius * 100).toFixed(1)}cm | P_cr = {criticalLoadKN.toFixed(1)} kN
          </text>
        </svg>
      );
    };

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Interactive Buckling Lab</h2>
        <p className="text-slate-400 mb-6">Adjust parameters and observe real-time buckling behavior</p>

        {/* Interactive Visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 w-full max-w-lg">
          {renderInteractiveColumn()}
        </div>

        {/* Euler Formula Display */}
        <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-3 mb-6 w-full max-w-lg text-center">
          <p className="text-sm text-indigo-300 mb-1">Euler Buckling Formula:</p>
          <p className="text-lg font-mono text-indigo-400">P<sub>cr</sub> = π²EI / (KL)²</p>
        </div>

        {/* Range Sliders */}
        <div className="w-full max-w-lg space-y-5 mb-6">
          {/* Column Length Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Column Length (L)</label>
              <span className="text-lg font-bold text-indigo-400">{columnLengthContinuous.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={columnLengthContinuous}
              onChange={(e) => {
                setColumnLengthContinuous(parseFloat(e.target.value));
                setAppliedForce(0); // Reset force when changing parameters
              }}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              style={{ zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0.5m (short)</span>
              <span>3m (tall)</span>
            </div>
          </div>

          {/* Column Radius Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Column Radius (r)</label>
              <span className="text-lg font-bold text-purple-400">{(columnRadius * 100).toFixed(1)} cm</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.05"
              step="0.001"
              value={columnRadius}
              onChange={(e) => {
                setColumnRadius(parseFloat(e.target.value));
                setAppliedForce(0); // Reset force when changing parameters
              }}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              style={{ zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1cm (thin)</span>
              <span>5cm (thick)</span>
            </div>
          </div>

          {/* Applied Force Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Applied Force (P)</label>
              <span className={`text-lg font-bold ${isBuckled ? 'text-red-400' : loadRatio > 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {appliedForce >= 1000 ? `${(appliedForce / 1000).toFixed(1)} kN` : `${appliedForce.toFixed(0)} N`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={maxSliderForce}
              step={maxSliderForce / 100}
              value={appliedForce}
              onChange={(e) => {
                const newForce = parseFloat(e.target.value);
                setAppliedForce(newForce);
                if (newForce >= criticalLoad && !isBuckled) {
                  playSound('failure');
                  setPlayExperimentsRun(prev => prev + 1);
                }
              }}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              style={{ zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span>
              <span className="text-red-400">Critical: {criticalLoadKN.toFixed(1)} kN</span>
            </div>
            {/* Visual load bar */}
            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${isBuckled ? 'bg-red-500' : loadRatio > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(loadRatio * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => {
              setAppliedForce(0);
              playSound('click');
            }}
            className="px-6 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
            style={{ zIndex: 10 }}
          >
            Reset Force
          </button>
          <button
            onClick={() => {
              setColumnLengthContinuous(1.5);
              setColumnRadius(0.02);
              setAppliedForce(0);
              playSound('click');
            }}
            className="px-6 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
            style={{ zIndex: 10 }}
          >
            Reset All
          </button>
        </div>

        {/* Physics Insight Box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 w-full max-w-lg">
          <h4 className="font-bold text-amber-400 mb-2">Key Insight: The L² Effect</h4>
          <p className="text-sm text-slate-300">
            Notice how doubling the length <strong>quarters</strong> the critical load (1/L² relationship).
            Meanwhile, doubling the radius increases critical load by <strong>16×</strong> (r⁴ in moment of inertia)!
          </p>
        </div>

        {/* Progress to next phase */}
        {playExperimentsRun >= 2 && (
          <button
            onClick={() => goToPhase('review')}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            Understand the Physics →
          </button>
        )}

        {playExperimentsRun < 2 && (
          <p className="text-slate-500 text-sm">
            Buckle the column {2 - playExperimentsRun} more time{playExperimentsRun === 1 ? '' : 's'} to continue
          </p>
        )}
      </div>
    );
  };

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Euler's Buckling Formula</h2>

      <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 max-w-xl mb-6">
        <div className="text-center mb-4">
          <div className="inline-block bg-slate-800 rounded-xl p-4 shadow-lg">
            <p className="text-sm text-slate-400 mb-1">Critical Buckling Load:</p>
            <span className="text-2xl font-bold text-indigo-400">P<sub>cr</sub> = π²EI / L²</span>
          </div>
        </div>

        <svg viewBox="0 0 300 140" className="w-full h-32 mb-4">
          <rect x="0" y="0" width="300" height="140" fill="#1e293b" rx="10" />

          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
            Buckling Load vs Length
          </text>

          <line x1="40" y1="110" x2="280" y2="110" stroke={colors.neutral} strokeWidth="2" />
          <line x1="40" y1="110" x2="40" y2="30" stroke={colors.neutral} strokeWidth="2" />

          <text x="160" y="130" textAnchor="middle" fill={colors.neutral} fontSize="10">Length →</text>

          <path
            d="M 50,35 Q 100,50 140,70 Q 180,85 220,95 Q 260,102 280,105"
            stroke={colors.primary}
            strokeWidth="3"
            fill="none"
          />

          <circle cx="60" cy="38" r="6" fill={colors.success} />
          <text x="60" y="55" textAnchor="middle" fill={colors.success} fontSize="9">200N</text>

          <circle cx="140" cy="70" r="6" fill={colors.accent} />
          <text x="140" y="87" textAnchor="middle" fill={colors.accent} fontSize="9">50N</text>

          <circle cx="260" cy="100" r="6" fill={colors.danger} />
          <text x="260" y="117" textAnchor="middle" fill={colors.danger} fontSize="9">12N</text>
        </svg>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-500/20 rounded-lg p-2">
            <p className="font-bold text-emerald-400">L</p>
            <p className="text-sm text-emerald-300">200N</p>
          </div>
          <div className="bg-amber-500/20 rounded-lg p-2">
            <p className="font-bold text-amber-400">2L</p>
            <p className="text-sm text-amber-300">50N (4x less!)</p>
          </div>
          <div className="bg-red-500/20 rounded-lg p-2">
            <p className="font-bold text-red-400">4L</p>
            <p className="text-sm text-red-300">12N (16x less!)</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 max-w-xl">
        <h4 className="font-bold text-amber-400 mb-1">The Square Relationship</h4>
        <p className="text-slate-300">Double the length → Quarter the buckling strength! This is why skyscrapers need much thicker columns than houses.</p>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        style={{ zIndex: 10 }}
      >
        Try Shape Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'solid_best', label: 'Solid rods are strongest (most material)', icon: '●' },
      { id: 'hollow_best', label: 'Hollow tubes are stronger (material at edges)', icon: '◯' },
      { id: 'ibeam_best', label: 'I-beams are strongest (optimized shape)', icon: 'I' }
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-6">The Shape Twist</h2>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6 max-w-lg">
          <p className="text-slate-300">
            Three columns with the SAME amount of material, but different shapes:
            solid circle, hollow tube, or I-beam.
          </p>
          <p className="text-purple-400 font-semibold mt-3">
            Which resists buckling best?
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="15" fill={colors.column} />
            </svg>
            <p className="text-sm text-slate-400">Solid</p>
          </div>
          <div className="text-center">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="18" fill={colors.column} />
              <circle cx="25" cy="25" r="10" fill="#1e293b" />
            </svg>
            <p className="text-sm text-slate-400">Hollow</p>
          </div>
          <div className="text-center">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <rect x="7" y="10" width="36" height="6" fill={colors.column} />
              <rect x="7" y="34" width="36" height="6" fill={colors.column} />
              <rect x="20" y="10" width="10" height="30" fill={colors.column} />
            </svg>
            <p className="text-sm text-slate-400">I-Beam</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
          {twistOptions.map(option => (
            <button
              key={option.id}
              onClick={() => {
                setTwistPrediction(option.id);
                playSound('click');
                console.debug('prediction', { prediction: option.id });
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                twistPrediction === option.id
                  ? 'border-purple-500 bg-purple-500/20 shadow-md'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
              }`}
              style={{ zIndex: 10 }}
            >
              <span className="text-2xl font-mono">{option.icon}</span>
              <span className={twistPrediction === option.id ? 'text-purple-300 font-semibold' : 'text-slate-300'}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => goToPhase('twist_play')}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
            style={{ zIndex: 10 }}
          >
            Test Shapes →
          </button>
        )}
      </div>
    );
  };

  const renderTwistPlay = () => {
    // Calculate critical load for current twist parameters
    const twistCriticalLoad = calculateCriticalLoad(
      twistColumnLength,
      twistColumnRadius,
      selectedMaterial,
      selectedEndCondition
    );
    const twistCriticalLoadKN = twistCriticalLoad / 1000;
    const twistMaxSliderForce = Math.min(twistCriticalLoad * 1.2, 1000000);
    const twistLoadRatio = twistAppliedForce / twistCriticalLoad;
    const twistSafetyFactor = getSafetyFactor(twistAppliedForce, twistCriticalLoad);
    const twistIsBuckled = twistLoadRatio >= 1;
    const twistBuckleDeflection = twistIsBuckled ? 1 : twistLoadRatio * 0.3;

    const currentMaterial = materials[selectedMaterial];
    const currentEndCondition = endConditions[selectedEndCondition];

    // Get column color based on stress state
    const getTwistColumnColor = () => {
      if (twistIsBuckled) return colors.buckled;
      if (twistLoadRatio > 0.8) return colors.stressed;
      if (twistLoadRatio > 0.5) return colors.accent;
      return currentMaterial.color;
    };

    // Interactive twist column SVG
    const renderTwistInteractiveColumn = () => {
      const columnVisualHeight = 50 + (twistColumnLength - 0.5) * 80;
      const columnWidth = 8 + (twistColumnRadius - 0.01) * 400;
      const buckleOffset = twistBuckleDeflection * 40;

      // End condition visual markers
      const renderEndCondition = (position: 'top' | 'bottom') => {
        const y = position === 'top' ? 0 : columnVisualHeight;
        const isFixed = selectedEndCondition.includes('fixed') &&
          (position === 'bottom' || selectedEndCondition === 'fixed-fixed');
        const isPinned = selectedEndCondition.includes('pinned') &&
          (position === 'top' && selectedEndCondition === 'pinned-pinned') ||
          (position === 'bottom' && selectedEndCondition === 'fixed-pinned') ||
          (position === 'top' && selectedEndCondition === 'fixed-pinned');
        const isFree = selectedEndCondition === 'fixed-free' && position === 'top';

        if (isFixed) {
          return (
            <g transform={`translate(0, ${y})`}>
              <rect x="-20" y={position === 'top' ? -8 : 0} width="40" height="8" fill={colors.steel} />
              <line x1="-15" y1={position === 'top' ? -8 : 8} x2="-10" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
              <line x1="-5" y1={position === 'top' ? -8 : 8} x2="0" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
              <line x1="5" y1={position === 'top' ? -8 : 8} x2="10" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
              <line x1="15" y1={position === 'top' ? -8 : 8} x2="20" y2={position === 'top' ? -12 : 12} stroke={colors.steel} strokeWidth="2" />
            </g>
          );
        }
        if (isPinned || (position === 'top' && selectedEndCondition === 'pinned-pinned')) {
          return (
            <g transform={`translate(0, ${y})`}>
              <circle cx="0" cy={position === 'top' ? -6 : 6} r="6" fill="none" stroke={colors.steel} strokeWidth="2" />
              <circle cx="0" cy={position === 'top' ? -6 : 6} r="2" fill={colors.steel} />
            </g>
          );
        }
        if (isFree) {
          return (
            <g transform={`translate(0, ${y})`}>
              <circle cx="0" cy="-4" r="3" fill={colors.accent} />
              <text x="15" y="0" fill={colors.accent} fontSize="8">free</text>
            </g>
          );
        }
        return null;
      };

      return (
        <svg viewBox="0 0 340 350" className="w-full h-80 md:h-96">
          {/* Background */}
          <rect x="0" y="0" width="340" height="350" fill="#1e293b" rx="12" />

          {/* Ground/Base */}
          <rect x="0" y="300" width="340" height="50" fill={colors.steel} />

          {/* Applied Force Arrow */}
          <g transform={`translate(150, ${50})`}>
            <rect x="-45" y="-28" width="90" height="28" fill={colors.load} rx="4" />
            <text x="0" y="-10" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {twistAppliedForce >= 1000 ? `${(twistAppliedForce / 1000).toFixed(1)} kN` : `${twistAppliedForce.toFixed(0)} N`}
            </text>
            <polygon points="0,5 -12,-8 12,-8" fill={colors.load} />
          </g>

          {/* Column */}
          <g transform={`translate(150, ${300 - columnVisualHeight})`}>
            {twistIsBuckled || twistBuckleDeflection > 0 ? (
              <path
                d={`M 0,0
                    Q ${buckleOffset * Math.sin(Math.PI * 0.25)},${columnVisualHeight * 0.25}
                      ${buckleOffset},${columnVisualHeight * 0.5}
                    Q ${buckleOffset * Math.sin(Math.PI * 0.75)},${columnVisualHeight * 0.75}
                      0,${columnVisualHeight}`}
                stroke={getTwistColumnColor()}
                strokeWidth={columnWidth}
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <rect
                x={-columnWidth / 2}
                y="0"
                width={columnWidth}
                height={columnVisualHeight}
                fill={getTwistColumnColor()}
                rx="2"
              />
            )}
            {/* End condition markers */}
            {renderEndCondition('top')}
            {renderEndCondition('bottom')}
          </g>

          {/* Status Badge */}
          <g transform="translate(150, 20)">
            <rect
              x="-55"
              y="-12"
              width="110"
              height="24"
              fill={twistIsBuckled ? colors.buckled : twistLoadRatio > 0.8 ? colors.stressed : colors.success}
              rx="12"
            />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {twistIsBuckled ? 'BUCKLED!' : twistLoadRatio > 0.8 ? 'NEAR CRITICAL!' : 'STABLE'}
            </text>
          </g>

          {/* Material indicator */}
          <g transform="translate(280, 80)">
            <rect x="-35" y="-20" width="70" height="55" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="-5" textAnchor="middle" fill={colors.neutral} fontSize="9">Material</text>
            <rect x="-15" y="5" width="30" height="8" fill={currentMaterial.color} rx="2" />
            <text x="0" y="28" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
              {currentMaterial.name}
            </text>
          </g>

          {/* End condition indicator */}
          <g transform="translate(60, 80)">
            <rect x="-45" y="-20" width="90" height="55" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="-5" textAnchor="middle" fill={colors.neutral} fontSize="9">End Condition</text>
            <text x="0" y="15" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="bold">
              K = {currentEndCondition.K}
            </text>
            <text x="0" y="28" textAnchor="middle" fill="white" fontSize="8">
              {currentEndCondition.name.split(' ')[0]}
            </text>
          </g>

          {/* Safety Factor */}
          <g transform="translate(280, 180)">
            <rect x="-35" y="-15" width="70" height="50" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="0" textAnchor="middle" fill={colors.neutral} fontSize="9">Safety</text>
            <text x="0" y="18" textAnchor="middle" fill={twistSafetyFactor > 2 ? colors.success : twistSafetyFactor > 1 ? colors.accent : colors.danger} fontSize="16" fontWeight="bold">
              {twistSafetyFactor === Infinity ? '∞' : twistSafetyFactor.toFixed(1)}
            </text>
          </g>

          {/* Young's Modulus */}
          <g transform="translate(60, 180)">
            <rect x="-45" y="-15" width="90" height="50" fill="rgba(0,0,0,0.3)" rx="8" />
            <text x="0" y="0" textAnchor="middle" fill={colors.neutral} fontSize="9">E (modulus)</text>
            <text x="0" y="18" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">
              {(currentMaterial.E / 1e9).toFixed(0)} GPa
            </text>
          </g>

          {/* Info text */}
          <text x="170" y="330" textAnchor="middle" fill={colors.neutral} fontSize="10">
            P_cr = {twistCriticalLoadKN.toFixed(1)} kN | K = {currentEndCondition.K} | E = {(currentMaterial.E / 1e9).toFixed(0)} GPa
          </text>
        </svg>
      );
    };

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-purple-400 mb-2">Material & End Condition Lab</h2>
        <p className="text-slate-400 mb-6">Explore how material properties and boundary conditions affect buckling</p>

        {/* Interactive Visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 w-full max-w-xl">
          {renderTwistInteractiveColumn()}
        </div>

        {/* Material Selector */}
        <div className="w-full max-w-xl mb-4">
          <h4 className="font-semibold text-slate-300 mb-2">Select Material:</h4>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(materials).map(([key, mat]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedMaterial(key);
                  setTwistAppliedForce(0);
                  playSound('click');
                }}
                className={`p-3 rounded-xl border-2 transition-all ${
                  selectedMaterial === key
                    ? 'border-purple-500 bg-purple-500/20 shadow-lg'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
                style={{ zIndex: 10 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: mat.color }} />
                  <p className="font-medium text-white">{mat.name}</p>
                </div>
                <p className="text-xs text-slate-400">E = {(mat.E / 1e9).toFixed(0)} GPa</p>
              </button>
            ))}
          </div>
        </div>

        {/* End Condition Selector */}
        <div className="w-full max-w-xl mb-6">
          <h4 className="font-semibold text-slate-300 mb-2">Select End Condition:</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(endConditions).map(([key, cond]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedEndCondition(key);
                  setTwistAppliedForce(0);
                  playSound('click');
                }}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  selectedEndCondition === key
                    ? 'border-amber-500 bg-amber-500/20 shadow-lg'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
                style={{ zIndex: 10 }}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium text-white text-sm">{cond.name}</p>
                  <span className="text-amber-400 font-bold">K = {cond.K}</span>
                </div>
                <p className="text-xs text-slate-400">{cond.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Range Sliders */}
        <div className="w-full max-w-xl space-y-4 mb-6">
          {/* Column Length Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Column Length (L)</label>
              <span className="text-lg font-bold text-indigo-400">{twistColumnLength.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={twistColumnLength}
              onChange={(e) => {
                setTwistColumnLength(parseFloat(e.target.value));
                setTwistAppliedForce(0);
              }}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              style={{ zIndex: 10 }}
            />
          </div>

          {/* Applied Force Slider */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Applied Force (P)</label>
              <span className={`text-lg font-bold ${twistIsBuckled ? 'text-red-400' : twistLoadRatio > 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {twistAppliedForce >= 1000 ? `${(twistAppliedForce / 1000).toFixed(1)} kN` : `${twistAppliedForce.toFixed(0)} N`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={twistMaxSliderForce}
              step={twistMaxSliderForce / 100}
              value={twistAppliedForce}
              onChange={(e) => {
                const newForce = parseFloat(e.target.value);
                setTwistAppliedForce(newForce);
                if (newForce >= twistCriticalLoad && !twistIsBuckled) {
                  playSound('failure');
                  setTwistExperimentsRun(prev => prev + 1);
                }
              }}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              style={{ zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span>
              <span className="text-red-400">Critical: {twistCriticalLoadKN.toFixed(1)} kN</span>
            </div>
            {/* Visual load bar */}
            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${twistIsBuckled ? 'bg-red-500' : twistLoadRatio > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(twistLoadRatio * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Formula Explanation */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 mb-6 w-full max-w-xl">
          <h4 className="font-bold text-purple-400 mb-2">How K Affects Critical Load</h4>
          <p className="text-sm text-slate-300 mb-2">
            The effective length factor <strong>K</strong> determines how end conditions affect buckling:
          </p>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• <strong>Fixed-Fixed (K=0.5):</strong> 4x stronger than pinned-pinned</li>
            <li>• <strong>Pinned-Pinned (K=1.0):</strong> Reference case</li>
            <li>• <strong>Fixed-Free (K=2.0):</strong> 4x weaker than pinned-pinned</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => {
              setTwistAppliedForce(0);
              playSound('click');
            }}
            className="px-6 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
            style={{ zIndex: 10 }}
          >
            Reset Force
          </button>
          <button
            onClick={() => {
              setSelectedMaterial('steel');
              setSelectedEndCondition('pinned-pinned');
              setTwistColumnLength(1.5);
              setTwistColumnRadius(0.02);
              setTwistAppliedForce(0);
              playSound('click');
            }}
            className="px-6 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
            style={{ zIndex: 10 }}
          >
            Reset All
          </button>
        </div>

        {/* Progress to next phase */}
        {twistExperimentsRun >= 2 && (
          <button
            onClick={() => goToPhase('twist_review')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            style={{ zIndex: 10 }}
          >
            Review Findings →
          </button>
        )}

        {twistExperimentsRun < 2 && (
          <p className="text-slate-500 text-sm">
            Buckle the column with {2 - twistExperimentsRun} more configuration{twistExperimentsRun === 1 ? '' : 's'} to continue
          </p>
        )}
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Shape Optimization</h2>

      <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-6 max-w-xl mb-6">
        <svg viewBox="0 0 300 120" className="w-full h-28 mb-4">
          <rect x="0" y="0" width="300" height="120" fill="#1e293b" rx="10" />

          <g transform="translate(50, 60)">
            <circle cx="0" cy="0" r="20" fill={colors.column} />
            <text x="0" y="40" textAnchor="middle" fill={colors.neutral} fontSize="10">Solid</text>
            <text x="0" y="55" textAnchor="middle" fill={colors.danger} fontSize="11" fontWeight="bold">50N</text>
          </g>

          <g transform="translate(150, 60)">
            <circle cx="0" cy="0" r="25" fill={colors.column} />
            <circle cx="0" cy="0" r="14" fill="#1e293b" />
            <text x="0" y="45" textAnchor="middle" fill={colors.neutral} fontSize="10">Hollow</text>
            <text x="0" y="60" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">75N (1.5x)</text>
          </g>

          <g transform="translate(250, 60)">
            <rect x="-20" y="-20" width="40" height="6" fill={colors.column} />
            <rect x="-20" y="14" width="40" height="6" fill={colors.column} />
            <rect x="-4" y="-20" width="8" height="40" fill={colors.column} />
            <text x="0" y="45" textAnchor="middle" fill={colors.neutral} fontSize="10">I-Beam</text>
            <text x="0" y="60" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="bold">125N (2.5x)</text>
          </g>

          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">SAME MATERIAL, DIFFERENT SHAPES</text>
        </svg>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 max-w-xl">
        <h4 className="font-bold text-amber-400 mb-1">The Moment of Inertia Secret</h4>
        <p className="text-slate-300">
          Buckling resistance depends on the 'moment of inertia' (I)—how material is distributed from the center.
          I-beams place material far from the center, maximizing I and buckling resistance!
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
        style={{ zIndex: 10 }}
      >
        See Applications →
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const realWorldApps = [
    { icon: '🏢', title: 'Skyscraper Columns', short: 'Architecture', color: '#6366F1' },
    { icon: '🚲', title: 'Bicycle Frame Design', short: 'Engineering', color: '#10B981' },
    { icon: '🦴', title: 'Bone Structure', short: 'Biology', color: '#F59E0B' },
    { icon: '🗼', title: 'Transmission Towers', short: 'Infrastructure', color: '#8B5CF6' }
  ];

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Buckling Everywhere</h2>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-6">
        {realWorldApps.map((app, i) => (
          <button
            key={i}
            onClick={() => {
              if (completedApps <= i) {
                setCompletedApps(i + 1);
                playSound('complete');
              }
            }}
            className={`p-4 rounded-xl text-center transition-all ${
              completedApps > i
                ? 'bg-emerald-500/20 border-2 border-emerald-500'
                : 'bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600'
            }`}
            style={{ zIndex: 10 }}
          >
            <span className="text-3xl">{app.icon}</span>
            <p className="text-sm font-medium mt-2" style={{ color: completedApps > i ? '#10B981' : app.color }}>{app.short}</p>
            {completedApps > i && <span className="text-emerald-400 text-xs">✓ Explored</span>}
          </button>
        ))}
      </div>

      <p className="text-slate-400 mb-4">{completedApps} / 4 applications explored</p>

      {completedApps >= 4 && (
        <button
          onClick={() => goToPhase('test')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          style={{ zIndex: 10 }}
        >
          Take the Test →
        </button>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const testQuestions = [
    { question: 'What happens when you double a column\'s length?', options: [{ text: 'Half strength', correct: false }, { text: 'Quarter strength', correct: true }, { text: 'Same strength', correct: false }, { text: 'Double strength', correct: false }] },
    { question: 'Why do columns buckle sideways?', options: [{ text: 'Material weakness', correct: false }, { text: 'Small imperfections amplify', correct: true }, { text: 'Gravity pulls sideways', correct: false }, { text: 'Heat expansion', correct: false }] },
    { question: 'Which cross-section resists buckling best?', options: [{ text: 'Solid rod', correct: false }, { text: 'Hollow tube', correct: false }, { text: 'I-beam', correct: true }, { text: 'Square bar', correct: false }] },
    { question: 'What is moment of inertia (I)?', options: [{ text: 'Weight distribution', correct: false }, { text: 'Material distribution from center', correct: true }, { text: 'Total material amount', correct: false }, { text: 'Column height', correct: false }] },
    { question: 'Euler\'s formula shows P_cr is proportional to:', options: [{ text: '1/L', correct: false }, { text: '1/L²', correct: true }, { text: 'L', correct: false }, { text: 'L²', correct: false }] },
    { question: 'Why are bike frames hollow?', options: [{ text: 'Cheaper', correct: false }, { text: 'Higher I for same weight', correct: true }, { text: 'Easier to weld', correct: false }, { text: 'Better appearance', correct: false }] },
    { question: 'Long bones are hollow because:', options: [{ text: 'Blood storage', correct: false }, { text: 'Higher buckling resistance', correct: true }, { text: 'Flexibility', correct: false }, { text: 'Random evolution', correct: false }] },
    { question: 'Lattice towers resist buckling by:', options: [{ text: 'Heavy materials', correct: false }, { text: 'Separated members increase I', correct: true }, { text: 'Solid construction', correct: false }, { text: 'Magnetic forces', correct: false }] },
    { question: 'For same buckling resistance, 2x height needs:', options: [{ text: '2x thicker', correct: false }, { text: '4x thicker I', correct: true }, { text: 'Same thickness', correct: false }, { text: 'Half thickness', correct: false }] },
    { question: 'The L² relationship means:', options: [{ text: 'Linear scaling', correct: false }, { text: 'Dramatic weakness with length', correct: true }, { text: 'No effect', correct: false }, { text: 'Stronger when longer', correct: false }] }
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    playSound(optionIndex === testQuestions[questionIndex].correct ? 'success' : 'failure');
  };

  const calculateTestScore = () => {
    let correct = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && testAnswers[i] === q.correct) correct++;
    });
    return correct;
  };

  const renderTest = () => {
    const allAnswered = testAnswers.every(a => a !== null);

    if (showTestResults) {
      const score = calculateTestScore();
      return (
        <div className="flex flex-col items-center p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Test Results</h2>
          <div className="text-6xl mb-4">{score >= 7 ? '🏆' : '📚'}</div>
          <h3 className="text-4xl font-bold text-indigo-400 mb-2">{score}/10</h3>
          <p className="text-slate-300 mb-6">
            {score >= 7 ? 'Excellent! Buckling physics mastered!' : 'Keep studying the concepts!'}
          </p>

          {score >= 7 ? (
            <button
              onClick={() => {
                setTestScore(score);
                goToPhase('mastery');
              }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              style={{ zIndex: 10 }}
            >
              Complete Lesson →
            </button>
          ) : (
            <button
              onClick={() => {
                setShowTestResults(false);
                setTestAnswers(Array(10).fill(null));
                goToPhase('review');
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
              style={{ zIndex: 10 }}
            >
              Review & Try Again
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Knowledge Check</h2>
        <p className="text-slate-400 mb-6">{testAnswers.filter(a => a !== null).length}/10 answered</p>

        <div className="space-y-4 w-full max-w-2xl max-h-96 overflow-y-auto mb-4">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="font-semibold text-white mb-3">{qIndex + 1}. {q.q}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    className={`p-2 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowTestResults(true)}
          disabled={!allAnswered}
          className={`px-6 py-3 rounded-xl font-semibold ${
            allAnswered
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          style={{ zIndex: 10 }}
        >
          Submit Answers
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MASTERY PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏗️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Buckling Physics Mastered!</h1>
        <p className="text-xl text-slate-300 mb-6">You understand structural stability!</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📐</div>
            <p className="text-sm text-slate-300">L² Relationship</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔧</div>
            <p className="text-sm text-slate-300">Shape Optimization</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🦴</div>
            <p className="text-sm text-slate-300">Nature's Design</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🏢</div>
            <p className="text-sm text-slate-300">Engineering Apps</p>
          </div>
        </div>

        <div className="bg-emerald-500/20 rounded-xl p-4 mb-6">
          <div className="text-2xl font-bold text-emerald-400">Score: {testScore}/10 ({testScore * 10}%)</div>
        </div>

        <button
          onClick={() => {
            playSound('complete');
            onPhaseComplete?.();
          }}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg rounded-xl"
          style={{ zIndex: 10 }}
        >
          Complete Lesson
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const renderPhase = () => {
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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Buckling & Columns</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentPhase === p
                    ? 'bg-indigo-400 w-6 shadow-lg shadow-indigo-400/30'
                    : PHASES.indexOf(currentPhase) > PHASES.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-indigo-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Coach message */}
      {showCoachMessage && (
        <div className="fixed top-16 left-0 right-0 z-40 px-4">
          <div className="max-w-2xl mx-auto mt-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧑‍🏫</span>
                <p className="flex-1">{coachMessages[phase]}</p>
                <button
                  onClick={() => setShowCoachMessage(false)}
                  className="text-white/80 hover:text-white"
                  style={{ zIndex: 10 }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default BucklingRenderer;
