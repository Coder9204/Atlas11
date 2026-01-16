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
// SOUND UTILITY
// ─────────────────────────────────────────────────────────────────────────────

const playSound = (frequency: number, type: OscillatorType = 'sine', duration: number = 0.15) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio not available
  }
};

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

const isValidPhase = (phase: string): phase is Phase => {
  return ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'].includes(phase);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface BucklingRendererProps {
  onComplete?: (score: number) => void;
  emitGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const BucklingRenderer: React.FC<BucklingRendererProps> = ({
  onComplete,
  emitGameEvent,
  gamePhase
}) => {
  // Phase management
  const getInitialPhase = (): Phase => {
    if (gamePhase && isValidPhase(gamePhase)) return gamePhase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase());
  const [showCoachMessage, setShowCoachMessage] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Column simulation
  const [columnLength, setColumnLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [appliedLoad, setAppliedLoad] = useState(0);
  const [hasBuckled, setHasBuckled] = useState(false);
  const [buckleAmount, setBuckleAmount] = useState(0);
  const [experimentsRun, setExperimentsRun] = useState(0);
  const [bucklingLoads, setBucklingLoads] = useState<Record<string, number>>({});

  // Twist: cross-section shape
  const [crossSection, setCrossSection] = useState<'solid' | 'hollow' | 'i-beam'>('solid');
  const [twistLoad, setTwistLoad] = useState(0);
  const [twistHasBuckled, setTwistHasBuckled] = useState(false);
  const [twistBuckleAmount, setTwistBuckleAmount] = useState(0);
  const [twistExperimentsRun, setTwistExperimentsRun] = useState(0);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync
  useEffect(() => {
    if (gamePhase && isValidPhase(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Emit game events
  const emitEvent = useCallback((
    type: GameEvent['type'],
    data?: GameEvent['data'],
    message?: string
  ) => {
    if (emitGameEvent) {
      emitGameEvent({ type, phase, data, timestamp: Date.now(), message });
    }
  }, [emitGameEvent, phase]);

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound(500, 'sine', 0.1);
    setPhase(newPhase);
    setShowCoachMessage(true);
    emitEvent('phase_change', { action: `Moved to ${newPhase}` });

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [emitEvent]);

  // ─────────────────────────────────────────────────────────────────────────
  // BUCKLING PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  // Critical buckling load (Euler's formula simplified)
  // P_cr = π²EI / L² - load inversely proportional to length squared
  const getCriticalLoad = (length: 'short' | 'medium' | 'long', section: 'solid' | 'hollow' | 'i-beam' = 'solid') => {
    // Base load for medium solid column
    let baseLoad = 50;

    // Length factor (L² relationship)
    const lengthFactors = { short: 4, medium: 1, long: 0.25 }; // 1/L² relationship

    // Cross-section moment of inertia factor
    // I-beams and hollow sections have higher I for same material
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
        setTwistBuckleAmount(loadRatio * 0.3); // Slight deformation
        setTwistHasBuckled(false);
      } else {
        setTwistBuckleAmount(1);
        setTwistHasBuckled(true);
        playSound(200, 'sawtooth', 0.4);
        emitEvent('observation', {
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
        playSound(200, 'sawtooth', 0.4);
        emitEvent('observation', {
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
    hook: "📏 Why does a yardstick break when you push down on it? It doesn't crush—it bends and snaps sideways!",
    predict: "Which holds more weight: a short thick column or a long thin one of the same material?",
    play: "Apply load to columns of different lengths. Watch for buckling!",
    review: "Euler discovered: doubling length makes a column 4× weaker to buckling!",
    twist_predict: "Engineers use I-beams and hollow tubes. Do they buckle differently than solid rods?",
    twist_play: "Test different cross-section shapes under load.",
    twist_review: "Shape matters! I-beams resist buckling far better than solid rods of equal weight!",
    transfer: "From bike frames to skyscrapers, buckling physics shapes our world!",
    test: "Let's test your understanding of buckling and column design!",
    mastery: "🎉 You've mastered structural buckling! Build stronger with less!"
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PREMIUM COLOR PALETTE
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
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const renderProgressBar = () => {
    const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(phase);
    const progress = ((currentIndex + 1) / phases.length) * 100;

    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`
          }}
        />
      </div>
    );
  };

  const renderBottomBar = (onNext: () => void, canProceed: boolean, buttonText: string = 'Continue') => (
    <div className="mt-6 flex justify-center">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          if (canProceed) onNext();
        }}
        disabled={!canProceed}
        className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-300 ${
          canProceed
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-105'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );

  const renderKeyTakeaway = (title: string, content: string) => (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
      <h4 className="font-bold text-amber-800 mb-1">💡 {title}</h4>
      <p className="text-amber-900">{content}</p>
    </div>
  );

  const renderSectionHeader = (title: string, subtitle?: string) => (
    <div className="text-center mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
      {subtitle && <p className="text-gray-600">{subtitle}</p>}
    </div>
  );

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

    // Buckling curve (sine wave shape)
    const buckleOffset = buckleAmt * 30; // Max sideways deflection

    // Column color based on stress
    const stressRatio = load / criticalLoad;
    const columnColor = buckled ? colors.buckled :
                        stressRatio > 0.8 ? colors.stressed :
                        stressRatio > 0.5 ? colors.accent : colors.column;

    return (
      <svg viewBox="0 0 200 280" className="w-full h-56 md:h-64">
        {/* Background */}
        <rect x="0" y="0" width="200" height="280" fill="#F8FAFC" rx="10" />

        {/* Ground */}
        <rect x="0" y="250" width="200" height="30" fill={colors.steel} />
        <line x1="80" y1="250" x2="120" y2="250" stroke={colors.column} strokeWidth="3" />

        {/* Load indicator */}
        <g transform={`translate(100, ${60 - height / 2})`}>
          <rect x="-30" y="-20" width="60" height="20" fill={colors.load} rx="3" />
          <text x="0" y="-5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
            {load}N
          </text>
          {/* Load arrows */}
          <polygon points="0,5 -8,-5 8,-5" fill={colors.load} />
        </g>

        {/* Column */}
        <g transform={`translate(100, ${250 - height})`}>
          {buckled || buckleAmt > 0 ? (
            // Buckled/deforming column (curved path)
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
            // Straight column
            <rect
              x={section === 'i-beam' ? -8 : section === 'hollow' ? -7 : -6}
              y="0"
              width={section === 'i-beam' ? 16 : section === 'hollow' ? 14 : 12}
              height={height}
              fill={columnColor}
              rx="2"
            />
          )}

          {/* Cross section indicator for twist */}
          {section && (
            <g transform={`translate(50, ${height / 2})`}>
              <text x="0" y="-20" textAnchor="middle" fill={colors.neutral} fontSize="9">Cross-section:</text>
              {section === 'solid' && (
                <circle cx="0" cy="0" r="10" fill={columnColor} />
              )}
              {section === 'hollow' && (
                <>
                  <circle cx="0" cy="0" r="12" fill={columnColor} />
                  <circle cx="0" cy="0" r="6" fill="#F8FAFC" />
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

        {/* Status indicator */}
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
            {buckled ? '💥 BUCKLED!' : stressRatio > 0.8 ? '⚠️ CRITICAL' : '✓ STABLE'}
          </text>
        </g>

        {/* Critical load indicator */}
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
    <div className="text-center">
      {renderSectionHeader('The Buckling Mystery', 'Why do columns collapse sideways?')}

      <div className="bg-gradient-to-br from-slate-100 to-gray-100 rounded-2xl p-6 mb-6 shadow-lg">
        <svg viewBox="0 0 300 180" className="w-full h-44 mb-4">
          <rect x="0" y="0" width="300" height="180" fill="white" rx="10" />

          {/* Ground */}
          <rect x="0" y="160" width="300" height="20" fill={colors.steel} />

          {/* Ruler/column demonstration */}
          <g transform="translate(80, 160)">
            {/* Straight ruler */}
            <rect x="-5" y="-100" width="10" height="100" fill={colors.column} rx="2" />
            <text x="0" y="-110" textAnchor="middle" fill={colors.neutral} fontSize="10">Before</text>
          </g>

          <text x="150" y="90" textAnchor="middle" fill={colors.primary} fontSize="16" fontWeight="bold">→</text>

          <g transform="translate(220, 160)">
            {/* Buckled ruler */}
            <path
              d="M 0,0 Q 30,-50 0,-100"
              stroke={colors.buckled}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
            />
            <text x="0" y="-110" textAnchor="middle" fill={colors.buckled} fontSize="10">BUCKLED!</text>

            {/* Load arrow */}
            <polygon points="0,-100 -8,-85 8,-85" fill={colors.load} />
            <rect x="-10" y="-120" width="20" height="15" fill={colors.load} rx="2" />
          </g>

          <text x="150" y="25" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
            Push down on a yardstick...
          </text>
        </svg>

        <p className="text-lg text-gray-800">
          A long thin column doesn't crush straight down—
          <br />
          <span className="font-bold text-red-600">it bends and snaps sideways!</span>
        </p>
      </div>

      {renderKeyTakeaway(
        "The Question",
        "Why does a column buckle sideways instead of just compressing? And why are longer columns SO much weaker?"
      )}

      {renderBottomBar(() => goToPhase('predict'), true, 'Make Your Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictionOptions = [
      { id: 'linear', label: 'Double length = half the strength', icon: '📏' },
      { id: 'square', label: 'Double length = quarter the strength', icon: '📐' },
      { id: 'same', label: 'Length doesn\'t affect buckling strength', icon: '=' },
      { id: 'stronger', label: 'Longer columns are actually stronger', icon: '💪' }
    ];

    return (
      <div>
        {renderSectionHeader('Your Prediction', 'How does length affect buckling?')}

        <div className="bg-blue-50 rounded-xl p-4 mb-5">
          <p className="text-blue-800">
            Imagine two identical steel rods—same thickness, same material.
            One is 1 meter long, one is 2 meters long.
            <br /><br />
            <span className="font-semibold">How do their buckling strengths compare?</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {predictionOptions.map(option => (
            <button
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setPrediction(option.id);
                playSound(400, 'sine', 0.1);
                emitEvent('prediction', { prediction: option.id });
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                prediction === option.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-2xl">{option.icon}</span>
              <span className={prediction === option.id ? 'text-indigo-700 font-semibold' : 'text-gray-700'}>
                {option.label}
              </span>
              {prediction === option.id && (
                <span className="ml-auto text-indigo-500">✓</span>
              )}
            </button>
          ))}
        </div>

        {renderBottomBar(() => goToPhase('play'), prediction !== null, 'Start Experiments')}
      </div>
    );
  };

  const renderPlay = () => (
    <div>
      {renderSectionHeader('Buckling Lab', 'Test columns of different lengths')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderColumnVisualization(columnLength, appliedLoad, buckleAmount, hasBuckled)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Column Length:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'short' as const, label: 'Short', desc: '0.5m' },
            { id: 'medium' as const, label: 'Medium', desc: '1m' },
            { id: 'long' as const, label: 'Long', desc: '2m' }
          ].map(col => (
            <button
              key={col.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setColumnLength(col.id);
                resetColumn();
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                columnLength === col.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium">{col.label}</p>
              <p className="text-xs text-gray-500">{col.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleLoadChange(-10);
          }}
          disabled={appliedLoad <= 0}
          className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          −
        </button>

        <div className="text-center px-4">
          <p className="text-2xl font-bold text-blue-600">{appliedLoad}N</p>
          <p className="text-sm text-gray-500">Applied Load</p>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleLoadChange(10);
          }}
          disabled={hasBuckled}
          className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          +
        </button>
      </div>

      <div className="flex justify-center gap-3 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetColumn();
          }}
          className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium"
        >
          Reset
        </button>
        {hasBuckled && !bucklingLoads[columnLength] && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setExperimentsRun(prev => prev + 1);
              setBucklingLoads(prev => ({ ...prev, [columnLength]: appliedLoad }));
            }}
            className="px-6 py-2 rounded-lg bg-indigo-500 text-white font-medium"
          >
            Record Result
          </button>
        )}
      </div>

      {Object.keys(bucklingLoads).length > 0 && (
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <h4 className="font-semibold text-indigo-800 mb-2">📊 Buckling Loads:</h4>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(bucklingLoads).map(([len, load]) => (
              <div key={len} className="bg-white rounded-lg p-2 text-center shadow-sm">
                <p className="text-sm font-medium text-gray-700 capitalize">{len}</p>
                <p className="text-lg font-bold text-indigo-600">{load}N</p>
              </div>
            ))}
          </div>
          {Object.keys(bucklingLoads).length >= 2 && (
            <p className="text-sm text-indigo-700 mt-2 text-center">
              Notice: Short column holds 4× more than long column! (L² relationship)
            </p>
          )}
        </div>
      )}

      {renderBottomBar(() => goToPhase('review'), Object.keys(bucklingLoads).length >= 2, 'Understand the Physics')}
    </div>
  );

  const renderReview = () => (
    <div>
      {renderSectionHeader("Euler's Buckling Formula", 'The L² relationship')}

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-5">
        <div className="text-center mb-4">
          <div className="inline-block bg-white rounded-xl p-4 shadow-lg">
            <p className="text-sm text-gray-600 mb-1">Critical Buckling Load:</p>
            <span className="text-2xl font-bold text-indigo-600">P<sub>cr</sub> = π²EI / L²</span>
          </div>
        </div>

        <svg viewBox="0 0 300 140" className="w-full h-32 mb-4">
          <rect x="0" y="0" width="300" height="140" fill="white" rx="10" />

          {/* Graph showing 1/L² relationship */}
          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
            Buckling Load vs Length
          </text>

          {/* Axes */}
          <line x1="40" y1="110" x2="280" y2="110" stroke={colors.neutral} strokeWidth="2" />
          <line x1="40" y1="110" x2="40" y2="30" stroke={colors.neutral} strokeWidth="2" />

          <text x="160" y="130" textAnchor="middle" fill={colors.neutral} fontSize="10">Length →</text>
          <text x="20" y="70" textAnchor="middle" fill={colors.neutral} fontSize="10" transform="rotate(-90, 20, 70)">Load →</text>

          {/* 1/L² curve */}
          <path
            d="M 50,35 Q 100,50 140,70 Q 180,85 220,95 Q 260,102 280,105"
            stroke={colors.primary}
            strokeWidth="3"
            fill="none"
          />

          {/* Data points */}
          <circle cx="60" cy="38" r="6" fill={colors.success} />
          <text x="60" y="55" textAnchor="middle" fill={colors.success} fontSize="9">200N</text>

          <circle cx="140" cy="70" r="6" fill={colors.accent} />
          <text x="140" y="87" textAnchor="middle" fill={colors.accent} fontSize="9">50N</text>

          <circle cx="260" cy="100" r="6" fill={colors.danger} />
          <text x="260" y="117" textAnchor="middle" fill={colors.danger} fontSize="9">12N</text>
        </svg>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-100 rounded-lg p-2">
            <p className="font-bold text-green-700">L</p>
            <p className="text-sm text-green-600">200N</p>
          </div>
          <div className="bg-amber-100 rounded-lg p-2">
            <p className="font-bold text-amber-700">2L</p>
            <p className="text-sm text-amber-600">50N (4× less!)</p>
          </div>
          <div className="bg-red-100 rounded-lg p-2">
            <p className="font-bold text-red-700">4L</p>
            <p className="text-sm text-red-600">12N (16× less!)</p>
          </div>
        </div>
      </div>

      {renderKeyTakeaway(
        "The Square Relationship",
        "Double the length → Quarter the buckling strength! This is why skyscrapers need much thicker columns than houses."
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Why It Buckles Sideways:</h4>
        <p className="text-gray-700 text-sm">
          Long columns are weak in <span className="font-semibold">bending</span>. Any tiny sideways imperfection
          gets amplified by the load until the column suddenly bows out. The longer the column,
          the less force needed to trigger this catastrophic failure.
        </p>
      </div>

      {renderBottomBar(() => goToPhase('twist_predict'), true, 'Try Shape Twist')}
    </div>
  );

  const renderTwistPredict = () => {
    const twistOptions = [
      { id: 'solid_best', label: 'Solid rods are strongest (most material)', icon: '●' },
      { id: 'hollow_best', label: 'Hollow tubes are stronger (material at edges)', icon: '◯' },
      { id: 'ibeam_best', label: 'I-beams are strongest (optimized shape)', icon: 'I' }
    ];

    return (
      <div>
        {renderSectionHeader('The Shape Twist', 'Does cross-section shape matter?')}

        <div className="bg-purple-50 rounded-xl p-4 mb-5">
          <p className="text-purple-800">
            Three columns with the SAME amount of material, but different shapes:
            solid circle, hollow tube, or I-beam.
            <br /><br />
            <span className="font-semibold">Which resists buckling best?</span>
          </p>
        </div>

        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="15" fill={colors.column} />
            </svg>
            <p className="text-sm text-gray-600">Solid</p>
          </div>
          <div className="text-center">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="18" fill={colors.column} />
              <circle cx="25" cy="25" r="10" fill="white" />
            </svg>
            <p className="text-sm text-gray-600">Hollow</p>
          </div>
          <div className="text-center">
            <svg width="50" height="50" viewBox="0 0 50 50">
              <rect x="7" y="10" width="36" height="6" fill={colors.column} />
              <rect x="7" y="34" width="36" height="6" fill={colors.column} />
              <rect x="20" y="10" width="10" height="30" fill={colors.column} />
            </svg>
            <p className="text-sm text-gray-600">I-Beam</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {twistOptions.map(option => (
            <button
              key={option.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setTwistPrediction(option.id);
                playSound(400, 'sine', 0.1);
                emitEvent('prediction', { prediction: option.id });
              }}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                twistPrediction === option.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="text-2xl font-mono">{option.icon}</span>
              <span className={twistPrediction === option.id ? 'text-purple-700 font-semibold' : 'text-gray-700'}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {renderBottomBar(() => goToPhase('twist_play'), twistPrediction !== null, 'Test Shapes')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div>
      {renderSectionHeader('Cross-Section Lab', 'Same material, different shapes')}

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        {renderColumnVisualization('medium', twistLoad, twistBuckleAmount, twistHasBuckled, crossSection)}
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">Select Cross-Section:</h4>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'solid' as const, label: 'Solid', crit: getCriticalLoad('medium', 'solid') },
            { id: 'hollow' as const, label: 'Hollow', crit: getCriticalLoad('medium', 'hollow') },
            { id: 'i-beam' as const, label: 'I-Beam', crit: getCriticalLoad('medium', 'i-beam') }
          ].map(sec => (
            <button
              key={sec.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setCrossSection(sec.id);
                resetColumn(true);
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                crossSection === sec.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-medium">{sec.label}</p>
              <p className="text-xs text-gray-500">Crit: {sec.crit}N</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleLoadChange(-10, true);
          }}
          disabled={twistLoad <= 0}
          className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          −
        </button>

        <div className="text-center px-4">
          <p className="text-2xl font-bold text-purple-600">{twistLoad}N</p>
          <p className="text-sm text-gray-500">Applied Load</p>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            handleLoadChange(10, true);
          }}
          disabled={twistHasBuckled}
          className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl disabled:opacity-50"
        >
          +
        </button>
      </div>

      <div className="flex justify-center gap-3 mb-4">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            resetColumn(true);
          }}
          className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium"
        >
          Reset
        </button>
        {twistHasBuckled && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setTwistExperimentsRun(prev => prev + 1);
              resetColumn(true);
            }}
            className="px-6 py-2 rounded-lg bg-purple-500 text-white font-medium"
          >
            Try Another
          </button>
        )}
      </div>

      {twistHasBuckled && (
        <div className="bg-purple-50 rounded-xl p-4 mb-4">
          <p className="text-purple-800">
            <span className="font-bold">
              {crossSection === 'solid' && '📊 Solid buckled at ~50N'}
              {crossSection === 'hollow' && '📊 Hollow lasted until ~75N!'}
              {crossSection === 'i-beam' && '💪 I-Beam survived to ~125N!'}
            </span>
          </p>
        </div>
      )}

      {renderBottomBar(() => goToPhase('twist_review'), twistExperimentsRun >= 2, 'Review Findings')}
    </div>
  );

  const renderTwistReview = () => (
    <div>
      {renderSectionHeader('Shape Optimization', 'Why engineers use I-beams')}

      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 mb-5">
        <svg viewBox="0 0 300 120" className="w-full h-28 mb-4">
          <rect x="0" y="0" width="300" height="120" fill="white" rx="10" />

          {/* Three shapes with their strengths */}
          <g transform="translate(50, 60)">
            <circle cx="0" cy="0" r="20" fill={colors.column} />
            <text x="0" y="40" textAnchor="middle" fill={colors.neutral} fontSize="10">Solid</text>
            <text x="0" y="55" textAnchor="middle" fill={colors.danger} fontSize="11" fontWeight="bold">50N</text>
          </g>

          <g transform="translate(150, 60)">
            <circle cx="0" cy="0" r="25" fill={colors.column} />
            <circle cx="0" cy="0" r="14" fill="white" />
            <text x="0" y="45" textAnchor="middle" fill={colors.neutral} fontSize="10">Hollow</text>
            <text x="0" y="60" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">75N (1.5×)</text>
          </g>

          <g transform="translate(250, 60)">
            <rect x="-20" y="-20" width="40" height="6" fill={colors.column} />
            <rect x="-20" y="14" width="40" height="6" fill={colors.column} />
            <rect x="-4" y="-20" width="8" height="40" fill={colors.column} />
            <text x="0" y="45" textAnchor="middle" fill={colors.neutral} fontSize="10">I-Beam</text>
            <text x="0" y="60" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="bold">125N (2.5×)</text>
          </g>

          <text x="150" y="20" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">SAME MATERIAL, DIFFERENT SHAPES</text>
        </svg>
      </div>

      {renderKeyTakeaway(
        "The Moment of Inertia Secret",
        "Buckling resistance depends on the 'moment of inertia' (I)—how material is distributed from the center. I-beams place material far from the center, maximizing I and buckling resistance!"
      )}

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-bold text-gray-800 mb-2">Engineering Insight:</h4>
        <p className="text-gray-700 text-sm">
          This is why building columns, bicycle frames, and cranes use hollow tubes and I-beams—
          they're <span className="font-semibold">much stronger per pound</span> than solid rods. The material is where it counts: at the edges!
        </p>
      </div>

      {renderBottomBar(() => goToPhase('transfer'), true, 'See Applications')}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFER PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const realWorldApps = [
    {
      icon: '🏢',
      title: 'Skyscraper Columns',
      short: 'Architecture',
      tagline: 'Why tall buildings need massive columns',
      description: 'Skyscraper columns must resist enormous compressive loads while remaining slender enough for interior space. Buckling is the critical failure mode.',
      connection: 'The L² relationship means a 100-story building needs columns far thicker than 10× a 10-story building\'s columns. Double the height, quadruple the column size!',
      howItWorks: 'Engineers use steel I-beams, concrete-filled tubes, and composite materials to maximize moment of inertia. Outrigger trusses and core walls provide additional buckling restraint.',
      stats: [
        { value: '2m+', label: 'Column width (megatalls)' },
        { value: '30%', label: 'Floor space for columns' },
        { value: '800m', label: 'Current height limit' }
      ],
      examples: ['Burj Khalifa\'s Y-shaped core', 'Empire State\'s steel frame', 'One World Trade Center', 'Shanghai Tower\'s twisted form'],
      companies: ['SOM', 'Foster + Partners', 'Adrian Smith + Gordon Gill', 'Arup'],
      futureImpact: 'Carbon fiber composites and 3D-printed optimized shapes may enable taller, thinner structures by maximizing buckling resistance per unit weight.',
      color: '#6366F1'
    },
    {
      icon: '🚲',
      title: 'Bicycle Frame Design',
      short: 'Engineering',
      tagline: 'Hollow tubes beat solid rods',
      description: 'Bicycle frames use thin-walled tubes because hollow sections resist buckling far better than solid rods of the same weight.',
      connection: 'A hollow tube has its material at the edges, maximizing moment of inertia. Same steel, much higher buckling resistance, much lighter bike!',
      howItWorks: 'Aluminum and carbon fiber frames use carefully designed tube profiles—sometimes tapered or ovalized—to optimize stiffness where needed while minimizing weight.',
      stats: [
        { value: '7kg', label: 'Pro racing frame' },
        { value: '3-5mm', label: 'Typical tube wall' },
        { value: '35%', label: 'Stiffer than solid (equal weight)' }
      ],
      examples: ['Tour de France carbon frames', 'Mountain bike hydroformed tubes', 'BMX frame geometry', 'E-bike battery integration'],
      companies: ['Specialized', 'Trek', 'Pinarello', 'Canyon'],
      futureImpact: 'Generative design algorithms now create organic-looking frames that are optimized specifically for buckling loads in different riding conditions.',
      color: '#10B981'
    },
    {
      icon: '🦴',
      title: 'Bone Structure',
      short: 'Biology',
      tagline: 'Nature discovered hollow tubes first',
      description: 'Long bones like femurs are hollow with a dense outer shell—nature\'s solution to the buckling problem, optimized over millions of years.',
      connection: 'Evolution "discovered" that hollow tubes resist buckling better than solid bones of the same weight. The marrow cavity isn\'t waste—it\'s smart engineering!',
      howItWorks: 'Cortical (outer) bone is dense and strong; cancellous (inner) bone is spongy where less stress occurs. The combination maximizes strength-to-weight ratio.',
      stats: [
        { value: '1600 kg/m³', label: 'Cortical bone density' },
        { value: '200× lighter', label: 'Than equal-strength steel' },
        { value: '70 years', label: 'Design lifespan' }
      ],
      examples: ['Human femur', 'Bird bones (extra hollow)', 'Dinosaur leg bones', 'Antler structure'],
      companies: ['Biomedical research labs', 'Orthopedic implant designers', 'Biomimicry institutes'],
      futureImpact: 'Bone-inspired lattice structures are being 3D-printed for aerospace and medical implants, copying nature\'s buckling-resistant designs.',
      color: '#F59E0B'
    },
    {
      icon: '🗼',
      title: 'Transmission Towers',
      short: 'Infrastructure',
      tagline: 'Lattice beats solid for tall structures',
      description: 'High-voltage transmission towers use open lattice designs rather than solid poles to resist buckling while minimizing material and wind load.',
      connection: 'The lattice structure creates effective "I-beam behavior" by separating the structural elements far apart, dramatically increasing the moment of inertia.',
      howItWorks: 'Angle iron members arranged in triangular patterns carry compression loads. The open design reduces wind loading while the geometry resists buckling.',
      stats: [
        { value: '50m+', label: 'Typical tower height' },
        { value: '10×', label: 'Lighter than solid tower' },
        { value: '50+ years', label: 'Service life' }
      ],
      examples: ['High-voltage transmission lines', 'Eiffel Tower (scaled up)', 'Communication masts', 'Oil platform legs'],
      companies: ['ABB', 'Siemens Energy', 'GE Grid Solutions', 'Prysmian'],
      futureImpact: 'Offshore wind turbine foundations use similar principles, with lattice structures now reaching depths of 60+ meters in extreme buckling environments.',
      color: '#8B5CF6'
    }
  ];

  const renderTransfer = () => (
    <div>
      {renderSectionHeader('Buckling Everywhere', 'From bones to buildings')}

      {completedApps < realWorldApps.length ? (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div
            className="p-4 text-white"
            style={{ backgroundColor: realWorldApps[completedApps].color }}
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">{realWorldApps[completedApps].icon}</span>
              <div>
                <h3 className="text-xl font-bold">{realWorldApps[completedApps].title}</h3>
                <p className="opacity-90">{realWorldApps[completedApps].tagline}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-gray-700 mb-4">{realWorldApps[completedApps].description}</p>

            <div className="bg-indigo-50 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-indigo-800 mb-1">🔗 Connection to Buckling:</h4>
              <p className="text-indigo-700 text-sm">{realWorldApps[completedApps].connection}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-gray-800 mb-1">⚙️ How It Works:</h4>
              <p className="text-gray-700 text-sm">{realWorldApps[completedApps].howItWorks}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {realWorldApps[completedApps].stats.map((stat, i) => (
                <div key={i} className="text-center bg-white rounded-lg p-2 shadow-sm border">
                  <div className="text-lg font-bold" style={{ color: realWorldApps[completedApps].color }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 pb-5">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                playSound(600, 'sine', 0.1);
                setCompletedApps(prev => prev + 1);
              }}
              className="w-full py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: realWorldApps[completedApps].color }}
            >
              {completedApps < realWorldApps.length - 1 ? 'Next Application →' : 'Complete Applications'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="bg-green-50 rounded-2xl p-6 mb-6">
            <div className="text-4xl mb-3">🎓</div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Applications Complete!</h3>
            <p className="text-green-700">
              Buckling physics shapes everything from bike frames to skyscrapers!
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {realWorldApps.map((app, i) => (
              <div
                key={i}
                className="p-3 rounded-xl text-center"
                style={{ backgroundColor: `${app.color}20` }}
              >
                <span className="text-2xl">{app.icon}</span>
                <p className="text-xs font-medium mt-1" style={{ color: app.color }}>{app.short}</p>
              </div>
            ))}
          </div>

          {renderBottomBar(() => goToPhase('test'), true, 'Take the Test')}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TEST PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const testQuestions = [
    {
      scenario: 'A steel column 2m long can support 100kN before buckling.',
      question: 'If we double the length to 4m (same thickness), what load causes buckling?',
      options: [
        { text: '200kN (double length = double strength)', correct: false },
        { text: '100kN (length doesn\'t matter)', correct: false },
        { text: '50kN (double length = half strength)', correct: false },
        { text: '25kN (double length = quarter strength)', correct: true }
      ],
      explanation: 'Euler\'s formula: P_cr ∝ 1/L². Doubling the length means 1/(2²) = 1/4 of the original buckling load. This is the L² relationship!'
    },
    {
      scenario: 'An engineer is designing a column for a building.',
      question: 'To DOUBLE the buckling resistance, they could:',
      options: [
        { text: 'Double the column length', correct: false },
        { text: 'Halve the column length', correct: true },
        { text: 'Use the same length but half the material', correct: false },
        { text: 'Double the applied load gradually', correct: false }
      ],
      explanation: 'Since P_cr ∝ 1/L², halving the length means 1/(0.5²) = 4× the buckling resistance. To just double it, you\'d reduce length by about 30%.'
    },
    {
      scenario: 'A hollow tube and solid rod have the same cross-sectional area (same material amount).',
      question: 'Which resists buckling better?',
      options: [
        { text: 'Solid rod (more central material)', correct: false },
        { text: 'Hollow tube (material at edges)', correct: true },
        { text: 'Both are equal (same material)', correct: false },
        { text: 'Depends on the load direction', correct: false }
      ],
      explanation: 'Buckling resistance depends on moment of inertia (I), which increases when material is far from the center. Hollow tubes have higher I than solid rods of equal weight.'
    },
    {
      scenario: 'I-beams are used for building construction instead of solid rectangular bars.',
      question: 'The primary advantage for vertical loads is:',
      options: [
        { text: 'Easier to transport', correct: false },
        { text: 'Higher buckling resistance per unit weight', correct: true },
        { text: 'Lower cost per pound', correct: false },
        { text: 'Better appearance', correct: false }
      ],
      explanation: 'I-beams concentrate material in the flanges (far from neutral axis), maximizing moment of inertia and thus buckling resistance. Same weight, much stronger!'
    },
    {
      scenario: 'Long bones in your leg are hollow with marrow inside.',
      question: 'From a structural perspective, why did evolution favor this design?',
      options: [
        { text: 'To store nutrients in the marrow', correct: false },
        { text: 'Higher buckling resistance with less weight', correct: true },
        { text: 'To allow flexibility during movement', correct: false },
        { text: 'Bones evolved randomly', correct: false }
      ],
      explanation: 'Hollow structures resist buckling better than solid ones of equal weight. Evolution selected for this because it allowed strong legs with minimal skeletal weight.'
    },
    {
      scenario: 'A wooden yardstick is held vertically and you push down on top.',
      question: 'Why does it bend sideways rather than compress straight down?',
      options: [
        { text: 'Wood is weak in compression', correct: false },
        { text: 'Small imperfections trigger buckling in slender columns', correct: true },
        { text: 'Gravity pulls it sideways', correct: false },
        { text: 'The grain orientation causes sideways failure', correct: false }
      ],
      explanation: 'Slender columns fail by buckling, not crushing. Any tiny sideways imperfection creates a moment that deflects the column sideways, and the deflection amplifies until collapse.'
    },
    {
      scenario: 'You need to support a heavy shelf with the least material possible.',
      question: 'The best support design would be:',
      options: [
        { text: 'Long thin solid rods', correct: false },
        { text: 'Short hollow tubes', correct: true },
        { text: 'Long hollow tubes', correct: false },
        { text: 'Short thin solid rods', correct: false }
      ],
      explanation: 'Short (high P_cr due to 1/L²) and hollow (high I for given weight) gives maximum buckling resistance. This is why shelf brackets are typically short and tubular.'
    },
    {
      scenario: 'A bicycle frame uses thin-walled aluminum tubes rather than solid aluminum rods.',
      question: 'This design choice primarily:',
      options: [
        { text: 'Reduces weight while maintaining buckling resistance', correct: true },
        { text: 'Makes the frame more flexible', correct: false },
        { text: 'Is cheaper to manufacture', correct: false },
        { text: 'Improves aerodynamics', correct: false }
      ],
      explanation: 'Hollow tubes have higher I than solid rods of equal weight. This means the bike can be light yet still resist the buckling loads from pedaling and impacts.'
    },
    {
      scenario: 'Transmission towers use open lattice structures rather than solid poles.',
      question: 'Besides wind resistance, what buckling advantage does this provide?',
      options: [
        { text: 'Lattice has no buckling advantage', correct: false },
        { text: 'Separated members increase effective I dramatically', correct: true },
        { text: 'Lattice can flex without breaking', correct: false },
        { text: 'It\'s purely for aesthetic reasons', correct: false }
      ],
      explanation: 'The lattice places structural elements far apart, creating a very high effective moment of inertia. This makes the tower extremely resistant to buckling as a whole.'
    },
    {
      scenario: 'A skyscraper is twice as tall as another, both with similar floor plans.',
      question: 'How do the main column sizes compare to resist buckling?',
      options: [
        { text: 'About twice as thick', correct: false },
        { text: 'About four times as thick', correct: true },
        { text: 'About the same thickness', correct: false },
        { text: 'Thickness is unrelated to height', correct: false }
      ],
      explanation: 'The L² relationship means doubling height requires quadrupling the moment of inertia. Since I depends on radius⁴ for circular columns, they need to be approximately twice the diameter (4× the I).'
    }
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    playSound(optionIndex === testQuestions[questionIndex].options.findIndex(o => o.correct) ? 600 : 300, 'sine', 0.15);
  };

  const calculateTestScore = () => {
    let correct = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) correct++;
    });
    return correct;
  };

  const renderTest = () => {
    const allAnswered = testAnswers.every(a => a !== null);

    if (showTestResults) {
      const score = calculateTestScore();
      return (
        <div className="text-center">
          {renderSectionHeader('Test Results', `You scored ${score}/10`)}

          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-6 mb-6">
            <div className="text-6xl mb-4">
              {score >= 8 ? '🏆' : score >= 6 ? '🌟' : '📚'}
            </div>
            <div className="text-4xl font-bold text-indigo-600 mb-2">{score * 10}%</div>
            <p className="text-indigo-800">
              {score >= 8 ? 'Excellent! Buckling physics mastered!' :
               score >= 6 ? 'Good understanding of structural stability!' :
               'Review the concepts and try again!'}
            </p>
          </div>

          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {testQuestions.map((q, i) => {
              const isCorrect = testAnswers[i] !== null && q.options[testAnswers[i]!].correct;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-left ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
                >
                  <div className="flex items-start gap-2">
                    <span>{isCorrect ? '✓' : '✗'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Q{i+1}: {q.question}</p>
                      {!isCorrect && (
                        <p className="text-xs text-gray-600 mt-1">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {renderBottomBar(() => {
            setTestScore(score);
            goToPhase('mastery');
          }, true, 'Complete Lesson')}
        </div>
      );
    }

    return (
      <div>
        {renderSectionHeader('Knowledge Check', `${testAnswers.filter(a => a !== null).length}/10 answered`)}

        <div className="space-y-6 max-h-96 overflow-y-auto mb-4">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm text-gray-500 mb-1 italic">{q.scenario}</p>
              <p className="font-semibold text-gray-800 mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(qIndex, oIndex);
                    }}
                    className={`p-2 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {renderBottomBar(() => setShowTestResults(true), allAnswered, 'Submit Answers')}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MASTERY PHASE
  // ─────────────────────────────────────────────────────────────────────────

  const renderMastery = () => {
    const confetti = Array(20).fill(null).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: [colors.primary, colors.secondary, colors.accent, colors.success][Math.floor(Math.random() * 4)]
    }));

    return (
      <div className="text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {confetti.map((c, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${c.left}%`,
                top: '-10px',
                backgroundColor: c.color,
                animation: `fall ${c.duration}s ease-in forwards`,
                animationDelay: `${c.delay}s`
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes fall {
            to {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
        `}</style>

        <div className="text-6xl mb-4">🏗️</div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Buckling Physics Mastered!
        </h2>
        <p className="text-gray-600 mb-6">You understand structural stability!</p>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-indigo-800 mb-4">🧠 What You Learned:</h3>
          <div className="grid grid-cols-1 gap-3 text-left">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Euler's Formula:</span>
              <p className="text-sm text-gray-700">P_cr = π²EI/L² — buckling load inversely proportional to length squared</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">The L² Effect:</span>
              <p className="text-sm text-gray-700">Double length = quarter strength (dramatic weakness)</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Shape Matters:</span>
              <p className="text-sm text-gray-700">I-beams and hollow tubes beat solid rods (higher moment of inertia)</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <span className="font-semibold text-indigo-700">Engineering Application:</span>
              <p className="text-sm text-gray-700">Optimize cross-section shape to maximize buckling resistance per unit weight</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <div className="text-2xl font-bold text-green-600 mb-1">
            Test Score: {testScore}/10 ({testScore * 10}%)
          </div>
        </div>

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            playSound(800, 'sine', 0.3);
            if (onComplete) onComplete(testScore * 10);
            emitEvent('completion', { score: testScore * 10 });
          }}
          className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          Complete Lesson 🚀
        </button>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 ${isMobile ? 'p-3' : 'p-6'}`}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            🏗️ Buckling & Column Collapse
          </h1>
          <p className="text-gray-600 text-sm">Why slender columns fail sideways</p>
        </div>

        {renderProgressBar()}

        {showCoachMessage && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl p-4 mb-4 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧑‍🏫</span>
              <p className="flex-1">{coachMessages[phase]}</p>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowCoachMessage(false);
                }}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-4 md:p-6">
          {phase === 'hook' && renderHook()}
          {phase === 'predict' && renderPredict()}
          {phase === 'play' && renderPlay()}
          {phase === 'review' && renderReview()}
          {phase === 'twist_predict' && renderTwistPredict()}
          {phase === 'twist_play' && renderTwistPlay()}
          {phase === 'twist_review' && renderTwistReview()}
          {phase === 'transfer' && renderTransfer()}
          {phase === 'test' && renderTest()}
          {phase === 'mastery' && renderMastery()}
        </div>
      </div>
    </div>
  );
};

export default BucklingRenderer;
