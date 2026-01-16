'use client';

import React, { useState, useRef, useEffect } from 'react';
import { playSound } from '../lib/audio';

// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

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

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

interface SavedState {
  phase: Phase;
  completedApps: number[];
  testAnswers: number[];
  testScore: number | null;
}

interface GameEvent {
  type: 'state_update' | 'completion' | 'tool_call';
  phase: Phase;
  data: Record<string, unknown>;
}

interface InductiveKickbackRendererProps {
  onStateChange?: (state: SavedState) => void;
  onEvent?: (event: GameEvent) => void;
  savedState?: SavedState | null;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function InductiveKickbackRenderer({
  onStateChange,
  onEvent,
  savedState,
}: InductiveKickbackRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );
  const [testAnswers, setTestAnswers] = useState<number[]>(
    savedState?.testAnswers || [-1, -1, -1]
  );
  const [testScore, setTestScore] = useState<number | null>(
    savedState?.testScore ?? null
  );

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase: Relay simulator
  const [switchOn, setSwitchOn] = useState(true);
  const [hasFlybackDiode, setHasFlybackDiode] = useState(false);
  const [kickbackVoltage, setKickbackVoltage] = useState(0);
  const [showSpark, setShowSpark] = useState(false);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase: Boost converter
  const [boostActive, setBoostActive] = useState(false);
  const [boostOutput, setBoostOutput] = useState(5);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  const navigationLockRef = useRef(false);
  const animationRef = useRef<number>(0);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const state: SavedState = {
      phase,
      completedApps: Array.from(completedApps),
      testAnswers,
      testScore,
    };
    onStateChange?.(state);
  }, [phase, completedApps, testAnswers, testScore, onStateChange]);

  useEffect(() => {
    const event: GameEvent = {
      type: phase === 'mastery' ? 'completion' : 'state_update',
      phase,
      data: { testScore },
    };
    onEvent?.(event);
  }, [phase, testScore, onEvent]);

  // Animation for kickback decay
  useEffect(() => {
    if (kickbackVoltage > 0) {
      animationRef.current = requestAnimationFrame(() => {
        setKickbackVoltage(v => Math.max(0, v - 15));
      });
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [kickbackVoltage]);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handlePrediction = (choice: string) => {
    playSound('click');
    setPrediction(choice);
    setShowPredictionFeedback(true);
  };

  const handleTwistPrediction = (choice: string) => {
    playSound('click');
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  };

  const handleSwitchToggle = () => {
    if (switchOn) {
      // Turning OFF - induces kickback
      if (!hasFlybackDiode) {
        setKickbackVoltage(350);
        setShowSpark(true);
        setTimeout(() => setShowSpark(false), 300);
      } else {
        setKickbackVoltage(12); // Clamped to supply voltage
      }
    }
    setSwitchOn(!switchOn);
    setExperimentCount(prev => prev + 1);
    if (experimentCount >= 2) {
      setHasExperimented(true);
    }
  };

  const handleBoostToggle = () => {
    setBoostActive(!boostActive);
    if (!boostActive) {
      // Simulate boost ramping up
      let output = 5;
      const interval = setInterval(() => {
        output += 3;
        if (output >= 12) {
          setBoostOutput(12);
          clearInterval(interval);
        } else {
          setBoostOutput(output);
        }
      }, 100);
    } else {
      setBoostOutput(5);
    }
    setHasExploredTwist(true);
  };

  const handleCompleteApp = (appIndex: number) => {
    playSound('success');
    setCompletedApps(prev => new Set([...prev, appIndex]));
  };

  const handleTestAnswer = (questionIndex: number, answerIndex: number) => {
    playSound('click');
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
  };

  const handleSubmitTest = () => {
    const correctAnswers = [2, 1, 0]; // Correct indices
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer === correctAnswers[index]) score++;
    });
    setTestScore(score);
    playSound(score >= 2 ? 'success' : 'failure');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderPhaseIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-2">
      <div className="flex items-center gap-1">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`h-2 rounded-full transition-all duration-300 ${
              i <= PHASES.indexOf(phase)
                ? 'bg-indigo-500 w-6'
                : 'bg-gray-200 w-4'
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-gray-500 font-medium">
        {PHASES.indexOf(phase) + 1} / {PHASES.length}
      </span>
    </div>
  );

  const renderRelayCircuit = () => (
    <svg viewBox="0 0 400 220" className="w-full h-52 mb-4">
      {/* Battery */}
      <rect x="30" y="80" width="40" height="60" fill="#374151" rx="4" />
      <text x="50" y="115" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
        12V
      </text>

      {/* Wires */}
      <path
        d="M 70 100 L 120 100"
        stroke={switchOn ? '#22C55E' : '#6B7280'}
        strokeWidth="4"
        fill="none"
      />

      {/* Switch */}
      <circle cx="140" cy="100" r="8" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />
      <line
        x1="140"
        y1="100"
        x2={switchOn ? '170' : '160'}
        y2={switchOn ? '100' : '80'}
        stroke="#374151"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="170" cy="100" r="6" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />

      {/* Spark effect */}
      {showSpark && (
        <>
          <circle cx="155" cy="90" r="15" fill="#FEF08A" opacity="0.8">
            <animate attributeName="r" values="5;20;5" dur="0.3s" />
            <animate attributeName="opacity" values="1;0;1" dur="0.3s" />
          </circle>
          <text x="155" y="65" textAnchor="middle" fill="#DC2626" fontSize="14" fontWeight="bold">
            ⚡ SPARK!
          </text>
        </>
      )}

      {/* Wire to coil */}
      <path
        d="M 180 100 L 220 100"
        stroke={switchOn ? '#22C55E' : '#6B7280'}
        strokeWidth="4"
        fill="none"
      />

      {/* Inductor coil */}
      <rect x="220" y="70" width="80" height="60" fill="none" stroke="#6366F1" strokeWidth="3" rx="8" />
      <path
        d="M 235 100 C 240 85, 250 85, 255 100 C 260 115, 270 115, 275 100 C 280 85, 290 85, 295 100"
        fill="none"
        stroke="#6366F1"
        strokeWidth="3"
      />
      <text x="260" y="145" textAnchor="middle" fill="#4F46E5" fontSize="11">
        RELAY COIL
      </text>

      {/* Magnetic field indicator */}
      {switchOn && (
        <>
          <ellipse cx="260" cy="100" rx="50" ry="25" fill="none" stroke="#A5B4FC" strokeWidth="1" strokeDasharray="4" opacity="0.6">
            <animate attributeName="rx" values="45;55;45" dur="2s" repeatCount="indefinite" />
          </ellipse>
          <text x="260" y="60" textAnchor="middle" fill="#6366F1" fontSize="10">
            Magnetic Field
          </text>
        </>
      )}

      {/* Flyback diode (if enabled) */}
      {hasFlybackDiode && (
        <>
          <polygon points="260,165 275,180 245,180" fill="#22C55E" />
          <line x1="245" y1="165" x2="275" y2="165" stroke="#22C55E" strokeWidth="3" />
          <text x="260" y="200" textAnchor="middle" fill="#15803D" fontSize="10" fontWeight="bold">
            FLYBACK DIODE
          </text>
          {/* Diode connections */}
          <line x1="225" y1="130" x2="225" y2="172" stroke="#22C55E" strokeWidth="2" />
          <line x1="225" y1="172" x2="245" y2="172" stroke="#22C55E" strokeWidth="2" />
          <line x1="275" y1="172" x2="295" y2="172" stroke="#22C55E" strokeWidth="2" />
          <line x1="295" y1="172" x2="295" y2="130" stroke="#22C55E" strokeWidth="2" />
        </>
      )}

      {/* Return wire */}
      <path
        d="M 300 100 L 340 100 L 340 140 L 50 140 L 50 140"
        stroke={switchOn ? '#22C55E' : '#6B7280'}
        strokeWidth="4"
        fill="none"
      />

      {/* Kickback voltage indicator */}
      {kickbackVoltage > 0 && (
        <g>
          <rect x="320" y="20" width="70" height="40" fill={kickbackVoltage > 50 ? '#FEE2E2' : '#D1FAE5'} rx="6" />
          <text x="355" y="38" textAnchor="middle" fill={kickbackVoltage > 50 ? '#DC2626' : '#059669'} fontSize="10">
            SPIKE
          </text>
          <text x="355" y="52" textAnchor="middle" fill={kickbackVoltage > 50 ? '#DC2626' : '#059669'} fontSize="14" fontWeight="bold">
            {kickbackVoltage.toFixed(0)}V
          </text>
        </g>
      )}
    </svg>
  );

  const renderBoostConverter = () => (
    <svg viewBox="0 0 400 180" className="w-full h-44 mb-4">
      {/* Input battery */}
      <rect x="20" y="60" width="50" height="60" fill="#374151" rx="6" />
      <text x="45" y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
        5V
      </text>

      {/* Inductor */}
      <path
        d="M 80 90 C 90 75, 100 75, 110 90 C 120 105, 130 105, 140 90"
        fill="none"
        stroke="#6366F1"
        strokeWidth="4"
      />

      {/* Switch symbol */}
      <rect x="150" y="100" width="30" height="20" fill={boostActive ? '#22C55E' : '#9CA3AF'} rx="4" />
      <text x="165" y="114" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
        {boostActive ? 'ON' : 'OFF'}
      </text>

      {/* Switching frequency indicator */}
      {boostActive && (
        <g>
          <rect x="145" y="70" width="40" height="20" fill="#DBEAFE" rx="4" />
          <text x="165" y="84" textAnchor="middle" fill="#1D4ED8" fontSize="8">
            100kHz
          </text>
        </g>
      )}

      {/* Diode */}
      <polygon points="200,90 220,80 220,100" fill="#6366F1" />
      <line x1="220" y1="80" x2="220" y2="100" stroke="#6366F1" strokeWidth="3" />

      {/* Capacitor */}
      <line x1="240" y1="75" x2="240" y2="105" stroke="#374151" strokeWidth="3" />
      <line x1="250" y1="75" x2="250" y2="105" stroke="#374151" strokeWidth="3" />

      {/* Output */}
      <rect x="280" y="55" width="90" height="70" fill="#FEF3C7" rx="8" stroke="#F59E0B" strokeWidth="2" />
      <text x="325" y="80" textAnchor="middle" fill="#92400E" fontSize="11">
        OUTPUT
      </text>
      <text x="325" y="105" textAnchor="middle" fill={boostActive ? '#059669' : '#6B7280'} fontSize="24" fontWeight="bold">
        {boostOutput}V
      </text>

      {/* Energy flow arrow */}
      {boostActive && (
        <path
          d="M 100 55 L 130 55 L 125 50 M 130 55 L 125 60"
          fill="none"
          stroke="#22C55E"
          strokeWidth="2"
        >
          <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />
        </path>
      )}

      {/* Labels */}
      <text x="110" y="120" textAnchor="middle" fill="#6366F1" fontSize="10">
        Inductor
      </text>
      <text x="245" y="120" textAnchor="middle" fill="#374151" fontSize="10">
        Cap
      </text>

      {/* Explanation */}
      <text x="200" y="160" textAnchor="middle" fill="#6B7280" fontSize="11">
        {boostActive ? 'Inductor kickback boosts voltage!' : 'Activate to see boost effect'}
      </text>
    </svg>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      <div className="text-6xl mb-6">⚡🔌</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        The Mysterious Voltage Spike
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        Ever unplugged something with a motor and seen a spark? Or wondered why
        some circuits need special protection diodes?
      </p>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6">
        <p className="text-indigo-800">
          🧲 When current through a coil suddenly stops, something dramatic happens.
          The collapsing magnetic field fights back with a massive voltage spike!
        </p>
      </div>
      <p className="text-gray-600 mb-6">
        Let&apos;s explore <strong>inductive kickback</strong> and learn why it can
        destroy electronics—and how to harness it.
      </p>
      <button
        onMouseDown={() => goToPhase('predict')}
        className="px-8 py-4 bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-600 transition-colors"
      >
        Investigate the Spike →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800">
          A relay coil is powered by 12V. When you flip the switch OFF,
          what happens to the voltage across the coil?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'zero', label: 'Drops to 0V immediately' },
          { id: 'gradual', label: 'Gradually decreases from 12V to 0V' },
          { id: 'spike', label: 'Spikes to hundreds of volts briefly' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              prediction === option.id
                ? option.id === 'spike'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="font-medium text-gray-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-4 rounded-xl mb-4 ${
          prediction === 'spike' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={prediction === 'spike' ? 'text-green-800' : 'text-amber-800'}>
            {prediction === 'spike' ? (
              <><strong>Exactly!</strong> The collapsing magnetic field induces a huge voltage spike—often 10-100× the supply voltage!</>
            ) : (
              <><strong>Surprising result:</strong> The voltage actually spikes to hundreds of volts! The inductor &quot;kicks back&quot; when current is interrupted.</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors"
        >
          See It Happen →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Relay Circuit Simulator</h2>
      <p className="text-gray-600 mb-4">
        Click the switch to see inductive kickback. Then add a flyback diode to protect the circuit.
      </p>

      {renderRelayCircuit()}

      <div className="flex gap-3 mb-4">
        <button
          onMouseDown={handleSwitchToggle}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            switchOn
              ? 'bg-green-500 text-white'
              : 'bg-gray-300 text-gray-700'
          }`}
        >
          {switchOn ? '🔌 Switch ON' : '🔌 Switch OFF'}
        </button>
        <button
          onMouseDown={() => setHasFlybackDiode(!hasFlybackDiode)}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            hasFlybackDiode
              ? 'bg-green-500 text-white'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {hasFlybackDiode ? '✓ Diode Added' : '+ Add Diode'}
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          <strong>Try this:</strong> Toggle the switch OFF without the diode to see the spark.
          Then add the diode and notice how it clamps the voltage spike!
        </p>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExperimented}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExperimented
            ? 'bg-indigo-500 text-white hover:bg-indigo-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExperimented ? 'Continue to Review →' : 'Toggle the switch a few times...'}
      </button>
    </div>
  );

  const renderReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Understanding Inductive Kickback</h2>

      <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl p-5 mb-6">
        <div className="text-center mb-4">
          <span className="text-2xl font-bold text-indigo-700">V = -L × (di/dt)</span>
        </div>
        <p className="text-indigo-800 text-center text-sm">
          Induced voltage = inductance × rate of current change
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🧲 Magnetic Field Energy</h3>
          <p className="text-gray-600 text-sm">
            Current through a coil creates a magnetic field that stores energy.
            This energy can&apos;t disappear instantly!
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">⚡ Rapid Change = High Voltage</h3>
          <p className="text-gray-600 text-sm">
            When current is cut suddenly, di/dt is huge, producing a massive
            voltage spike in the opposite direction.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🛡️ Flyback Diode</h3>
          <p className="text-gray-600 text-sm">
            A diode across the coil provides a path for the current to continue flowing,
            clamping the voltage and protecting circuits.
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors"
      >
        Now for a Twist... →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">The Useful Side of Kickback</h2>
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <p className="text-purple-800">
          Inductive kickback seems destructive. But engineers have found ways to
          <strong> harness it constructively</strong>. How might they use it?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'nothing', label: 'It\'s only a problem to be prevented' },
          { id: 'spark', label: 'To create sparks in spark plugs' },
          { id: 'both', label: 'Both spark plugs AND voltage boosting circuits' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? option.id === 'both'
                  ? 'border-green-500 bg-green-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
            } ${showTwistFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="font-medium text-gray-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-4 rounded-xl mb-4 ${
          twistPrediction === 'both' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={twistPrediction === 'both' ? 'text-green-800' : 'text-amber-800'}>
            {twistPrediction === 'both' ? (
              <><strong>Perfect!</strong> Ignition coils use it for spark plugs, and boost converters use controlled kickback to increase voltage!</>
            ) : (
              <><strong>There&apos;s more!</strong> Inductive kickback powers spark plugs (40,000V from 12V!) and boost converters that increase voltage.</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors"
        >
          Explore Boost Converters →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Boost Converter Demo</h2>
      <p className="text-gray-600 mb-4">
        See how controlled inductive kickback can step up 5V to 12V!
      </p>

      {renderBoostConverter()}

      <button
        onMouseDown={handleBoostToggle}
        className={`w-full py-3 rounded-xl font-bold mb-4 transition-all ${
          boostActive
            ? 'bg-green-500 text-white'
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        {boostActive ? '⚡ Boost Active - Click to Stop' : '▶ Activate Boost Converter'}
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-blue-800 text-sm">
          <strong>How it works:</strong> A switch rapidly turns on/off (100kHz).
          Each time it opens, the inductor&apos;s kickback adds to the input voltage,
          charging a capacitor to a higher level!
        </p>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExploredTwist}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExploredTwist
            ? 'bg-indigo-500 text-white hover:bg-indigo-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExploredTwist ? 'Continue →' : 'Try the boost converter...'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Harnessing the Kickback</h2>

      <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-gray-800 mb-3 text-center">Controlled Kickback Applications</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl mb-2">🚗</div>
            <div className="text-sm text-gray-700 font-medium">Ignition Coils</div>
            <div className="text-xs text-gray-500">12V → 40,000V!</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🔋</div>
            <div className="text-sm text-gray-700 font-medium">Boost Converters</div>
            <div className="text-xs text-gray-500">Step up DC voltage</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">🎯 Key Insight</h4>
          <p className="text-gray-600 text-sm">
            The same physics that can destroy circuits is harnessed to generate high voltages and
            efficient power conversion—it&apos;s all about control!
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">📊 Switching Frequency</h4>
          <p className="text-gray-600 text-sm">
            Boost converters switch at 10kHz-1MHz. Each cycle captures a bit of kickback energy,
            accumulating it in a capacitor.
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors"
      >
        Apply This Knowledge →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Real-World Applications</h2>
      <p className="text-gray-600 mb-6">
        Discover where inductive kickback matters in everyday technology.
      </p>

      <div className="space-y-4">
        {[
          {
            title: 'Car Ignition Systems',
            icon: '🚗',
            description: 'Ignition coils boost 12V battery to 40,000V spark using controlled kickback',
          },
          {
            title: 'USB Power Banks',
            icon: '🔋',
            description: 'Boost converters step up battery voltage to charge your devices',
          },
          {
            title: 'Relay Protection',
            icon: '🛡️',
            description: 'Arduino and microcontrollers use flyback diodes when controlling motors/relays',
          },
        ].map((app, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 transition-all ${
              completedApps.has(index)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{app.icon}</span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{app.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{app.description}</p>
              </div>
              {!completedApps.has(index) && (
                <button
                  onMouseDown={() => handleCompleteApp(index)}
                  className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
                >
                  Got it
                </button>
              )}
              {completedApps.has(index) && (
                <span className="text-green-500 text-xl">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={completedApps.size < 3}
        className={`w-full py-3 mt-6 rounded-xl font-bold transition-colors ${
          completedApps.size >= 3
            ? 'bg-indigo-500 text-white hover:bg-indigo-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {completedApps.size >= 3 ? 'Take the Test →' : `Review all applications (${completedApps.size}/3)`}
      </button>
    </div>
  );

  const renderTest = () => {
    const questions = [
      {
        question: 'What causes inductive kickback?',
        options: [
          'Capacitor discharge',
          'Resistance heating',
          'Collapsing magnetic field inducing voltage',
        ],
      },
      {
        question: 'What does a flyback diode do?',
        options: [
          'Increases the kickback voltage',
          'Provides a path for current to safely dissipate',
          'Converts AC to DC',
        ],
      },
      {
        question: 'How do boost converters use inductive kickback?',
        options: [
          'Controlled switching captures kickback to raise voltage',
          'They eliminate kickback completely',
          'They only work with AC power',
        ],
      },
    ];

    return (
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Knowledge Check</h2>

        {testScore === null ? (
          <>
            <div className="space-y-6 mb-6">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="font-medium text-gray-800 mb-3">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={() => handleTestAnswer(qIndex, oIndex)}
                        className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                          testAnswers[qIndex] === oIndex
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-indigo-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onMouseDown={handleSubmitTest}
              disabled={testAnswers.includes(-1)}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${
                !testAnswers.includes(-1)
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Answers
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className={`text-6xl mb-4 ${testScore >= 2 ? 'animate-bounce' : ''}`}>
              {testScore >= 2 ? '⚡' : '📚'}
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-2">
              {testScore} / 3 Correct
            </p>
            <p className="text-gray-600 mb-6">
              {testScore >= 2
                ? 'You understand inductive kickback!'
                : 'Review the concepts and try again.'}
            </p>
            <button
              onMouseDown={nextPhase}
              className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors"
            >
              {testScore >= 2 ? 'Complete Lesson →' : 'See Summary →'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center">
      <div className="text-6xl mb-6">⚡🏆</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Inductive Kickback Master!
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        You now understand one of the most important phenomena in power electronics.
      </p>

      <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl p-6 mb-6 text-left">
        <h3 className="font-bold text-gray-800 mb-4">Key Takeaways:</h3>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-indigo-500">✓</span>
            <span>V = -L(di/dt): Rapid current change creates voltage spikes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500">✓</span>
            <span>Flyback diodes protect circuits from destructive spikes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500">✓</span>
            <span>Ignition coils use kickback for 40,000V sparks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-500">✓</span>
            <span>Boost converters harness kickback for voltage step-up</span>
          </li>
        </ul>
      </div>

      <button
        onMouseDown={() => goToPhase('hook')}
        className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
      >
        Review Again
      </button>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-lg mx-auto">
        {renderPhaseIndicator()}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
