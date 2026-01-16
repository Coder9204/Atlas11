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

interface WirePowerLossRendererProps {
  onStateChange?: (state: SavedState) => void;
  onEvent?: (event: GameEvent) => void;
  savedState?: SavedState | null;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function WirePowerLossRenderer({
  onStateChange,
  onEvent,
  savedState,
}: WirePowerLossRendererProps) {
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

  // Play phase: Wire simulator
  const [current, setCurrent] = useState(1);
  const [wireGauge, setWireGauge] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [wireLength, setWireLength] = useState(1);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase: Transmission line voltage
  const [transmissionVoltage, setTransmissionVoltage] = useState<'low' | 'high'>('low');
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  const navigationLockRef = useRef(false);

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
  // PHYSICS CALCULATIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getWireResistance = () => {
    const gaugeResistance = wireGauge === 'thin' ? 1.0 : wireGauge === 'medium' ? 0.3 : 0.1;
    return gaugeResistance * wireLength;
  };

  const getPowerLoss = () => {
    const R = getWireResistance();
    return current * current * R; // P = I²R
  };

  const getTemperature = () => {
    const loss = getPowerLoss();
    return 20 + loss * 8; // Base temp + heating
  };

  const getWireColor = () => {
    const temp = getTemperature();
    if (temp < 40) return '#3B82F6'; // Blue - cool
    if (temp < 60) return '#22C55E'; // Green - warm
    if (temp < 80) return '#F59E0B'; // Orange - hot
    return '#EF4444'; // Red - dangerous
  };

  // Transmission calculations
  const getTransmissionLoss = () => {
    // Same power delivered (1000W), different voltages
    const power = 1000;
    const voltage = transmissionVoltage === 'low' ? 120 : 12000;
    const current = power / voltage;
    const lineResistance = 10; // ohms for long line
    return current * current * lineResistance;
  };

  const getTransmissionEfficiency = () => {
    const power = 1000;
    const loss = getTransmissionLoss();
    return ((power - loss) / power) * 100;
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

  const handleExperiment = () => {
    setExperimentCount(prev => prev + 1);
    if (experimentCount >= 2) {
      setHasExperimented(true);
    }
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
    const correctAnswers = [1, 2, 0]; // Correct indices
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
                ? 'bg-orange-500 w-6'
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

  const renderWireSimulator = (interactive: boolean = true) => (
    <svg viewBox="0 0 400 200" className="w-full h-48 mb-4">
      {/* Power source */}
      <rect x="20" y="70" width="60" height="60" fill="#1F2937" rx="8" />
      <text x="50" y="105" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
        {current}A
      </text>
      <text x="50" y="120" textAnchor="middle" fill="#9CA3AF" fontSize="10">
        SOURCE
      </text>

      {/* Wire - thickness based on gauge */}
      <line
        x1="80"
        y1="100"
        x2={80 + 150 * wireLength}
        y2="100"
        stroke={getWireColor()}
        strokeWidth={wireGauge === 'thin' ? 4 : wireGauge === 'medium' ? 8 : 14}
        strokeLinecap="round"
      />

      {/* Heat waves for hot wire */}
      {getTemperature() > 50 && (
        <>
          <path
            d={`M ${80 + 75 * wireLength} 75 Q ${90 + 75 * wireLength} 65 ${80 + 75 * wireLength} 55`}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            opacity={Math.min((getTemperature() - 50) / 50, 1)}
          >
            <animate
              attributeName="opacity"
              values="0.3;0.8;0.3"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d={`M ${100 + 75 * wireLength} 70 Q ${110 + 75 * wireLength} 60 ${100 + 75 * wireLength} 50`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            opacity={Math.min((getTemperature() - 50) / 50, 1)}
          >
            <animate
              attributeName="opacity"
              values="0.5;1;0.5"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </path>
        </>
      )}

      {/* Load (light bulb) */}
      <circle cx={100 + 150 * wireLength} cy="100" r="25" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="3" />
      <path
        d={`M ${90 + 150 * wireLength} 110 L ${100 + 150 * wireLength} 95 L ${110 + 150 * wireLength} 110`}
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2"
      />

      {/* Labels */}
      <text x={80 + 75 * wireLength} y="140" textAnchor="middle" fill="#374151" fontSize="11">
        {wireLength}m {wireGauge} wire
      </text>
      <text x={80 + 75 * wireLength} y="155" textAnchor="middle" fill="#6B7280" fontSize="10">
        R = {getWireResistance().toFixed(2)}Ω
      </text>

      {/* Stats box */}
      <rect x="280" y="30" width="110" height="80" fill="#FEF3C7" rx="8" />
      <text x="335" y="52" textAnchor="middle" fill="#92400E" fontSize="11" fontWeight="bold">
        POWER LOSS
      </text>
      <text x="335" y="75" textAnchor="middle" fill="#DC2626" fontSize="18" fontWeight="bold">
        {getPowerLoss().toFixed(1)}W
      </text>
      <text x="335" y="95" textAnchor="middle" fill="#92400E" fontSize="11">
        {getTemperature().toFixed(0)}°C
      </text>
    </svg>
  );

  const renderTransmissionLine = () => (
    <svg viewBox="0 0 400 180" className="w-full h-44 mb-4">
      {/* Power plant */}
      <rect x="20" y="60" width="50" height="50" fill="#1F2937" rx="6" />
      <text x="45" y="88" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
        1kW
      </text>

      {/* Transformer (step up) */}
      <rect x="90" y="70" width="30" height="30" fill="#6366F1" rx="4" />
      <text x="105" y="90" textAnchor="middle" fill="white" fontSize="8">⚡</text>

      {/* Long transmission line */}
      <line
        x1="120"
        y1="85"
        x2="280"
        y2="85"
        stroke={transmissionVoltage === 'low' ? '#EF4444' : '#22C55E'}
        strokeWidth="6"
      />

      {/* Power loss indicator */}
      {transmissionVoltage === 'low' && (
        <>
          {[150, 180, 210, 240].map(x => (
            <path
              key={x}
              d={`M ${x} 65 Q ${x + 5} 55 ${x} 45`}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
            >
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="0.8s"
                repeatCount="indefinite"
              />
            </path>
          ))}
        </>
      )}

      {/* Line stats */}
      <text x="200" y="115" textAnchor="middle" fill="#6B7280" fontSize="10">
        {transmissionVoltage === 'low' ? '120V' : '12,000V'} •
        {transmissionVoltage === 'low' ? '8.3A' : '0.083A'}
      </text>

      {/* Transformer (step down) */}
      <rect x="280" y="70" width="30" height="30" fill="#6366F1" rx="4" />
      <text x="295" y="90" textAnchor="middle" fill="white" fontSize="8">⚡</text>

      {/* House */}
      <polygon points="340,85 360,60 380,85" fill="#F59E0B" />
      <rect x="345" y="85" width="30" height="30" fill="#FEF3C7" />
      <rect x="355" y="95" width="10" height="20" fill="#92400E" />

      {/* Results box */}
      <rect x="140" y="130" width="120" height="45" fill={transmissionVoltage === 'low' ? '#FEE2E2' : '#D1FAE5'} rx="8" />
      <text x="200" y="148" textAnchor="middle" fill={transmissionVoltage === 'low' ? '#DC2626' : '#059669'} fontSize="11" fontWeight="bold">
        Loss: {getTransmissionLoss().toFixed(0)}W
      </text>
      <text x="200" y="165" textAnchor="middle" fill={transmissionVoltage === 'low' ? '#DC2626' : '#059669'} fontSize="12" fontWeight="bold">
        Efficiency: {getTransmissionEfficiency().toFixed(0)}%
      </text>
    </svg>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      <div className="text-6xl mb-6">🔌🔥</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Why Does Your Phone Charger Get Warm?
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        Ever noticed that charging cables and power adapters heat up during use?
        That heat is actually <span className="text-red-500 font-semibold">wasted energy</span>!
      </p>
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
        <p className="text-orange-800">
          ⚡ This same effect explains why power companies use super-high voltages
          for long-distance transmission, and why thick cables are needed for high-power devices.
        </p>
      </div>
      <p className="text-gray-600 mb-6">
        Let&apos;s discover the physics of wire heating and the famous <strong>I²R</strong> power loss equation.
      </p>
      <button
        onMouseDown={() => goToPhase('predict')}
        className="px-8 py-4 bg-orange-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-orange-600 transition-colors"
      >
        Investigate Wire Heating →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800">
          You have a wire carrying electrical current. If you <strong>double the current</strong>,
          how much more heat will the wire produce?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'same', label: 'Same heat - current doesn\'t affect heating' },
          { id: 'double', label: '2× more heat (doubles with current)' },
          { id: 'quadruple', label: '4× more heat (squares with current)' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              prediction === option.id
                ? option.id === 'quadruple'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="font-medium text-gray-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-4 rounded-xl mb-4 ${
          prediction === 'quadruple' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={prediction === 'quadruple' ? 'text-green-800' : 'text-amber-800'}>
            {prediction === 'quadruple' ? (
              <><strong>Exactly right!</strong> Heat loss follows P = I²R, so doubling current means 2² = 4× the heat!</>
            ) : (
              <><strong>Good guess!</strong> Actually, heat loss follows P = I²R - the current is <em>squared</em>. Doubling current means 4× the heat!</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
        >
          Test It Out →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Wire Heating Simulator</h2>
      <p className="text-gray-600 mb-4">
        Experiment with current, wire thickness, and length to see how power loss and heating change.
      </p>

      {renderWireSimulator()}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current: {current}A
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={current}
            onChange={e => { setCurrent(Number(e.target.value)); handleExperiment(); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Wire Gauge:</label>
          <div className="flex gap-2">
            {(['thin', 'medium', 'thick'] as const).map(gauge => (
              <button
                key={gauge}
                onMouseDown={() => { setWireGauge(gauge); handleExperiment(); }}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  wireGauge === gauge
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {gauge.charAt(0).toUpperCase() + gauge.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wire Length: {wireLength}m
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.5"
            value={wireLength}
            onChange={e => { setWireLength(Number(e.target.value)); handleExperiment(); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          <strong>Key insight:</strong> Power loss = I²R. Current matters most because it&apos;s <em>squared</em>!
          Higher current → much more heat. Thicker/shorter wires have less resistance → less loss.
        </p>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExperimented}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExperimented
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExperimented ? 'Continue to Review →' : 'Try adjusting the controls...'}
      </button>
    </div>
  );

  const renderReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Understanding I²R Loss</h2>

      <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-xl p-5 mb-6">
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-orange-700">P = I²R</span>
        </div>
        <p className="text-orange-800 text-center">
          Power loss equals current squared times resistance
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🔌 Current (I)</h3>
          <p className="text-gray-600 text-sm">
            The amount of electrical charge flowing. <strong>Squared</strong> in the equation,
            so doubling current → 4× heat loss!
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">📏 Resistance (R)</h3>
          <p className="text-gray-600 text-sm">
            Depends on wire material, length, and thickness. Longer/thinner wires = more resistance = more loss.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🔥 Power Loss (P)</h3>
          <p className="text-gray-600 text-sm">
            Energy converted to heat every second. This is why cables warm up - and why proper
            wire gauges matter for safety!
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
      >
        Now for a Twist... →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">The Power Grid Puzzle</h2>
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <p className="text-purple-800">
          Power companies need to transmit electricity over long distances.
          They want to minimize I²R losses. What strategy do they use?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'thick', label: 'Use extremely thick cables' },
          { id: 'superconductor', label: 'Use superconducting cables' },
          { id: 'highvoltage', label: 'Transmit at very high voltage (low current)' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? option.id === 'highvoltage'
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
          twistPrediction === 'highvoltage' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={twistPrediction === 'highvoltage' ? 'text-green-800' : 'text-amber-800'}>
            {twistPrediction === 'highvoltage' ? (
              <><strong>Brilliant!</strong> High voltage transmission is the key. Since P = I²R, reducing current dramatically cuts losses!</>
            ) : (
              <><strong>Creative thinking!</strong> But the clever trick is using high voltage. Power = Voltage × Current, so high V means low I for the same power - and losses drop dramatically!</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
        >
          See It In Action →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Transmission Line Simulator</h2>
      <p className="text-gray-600 mb-4">
        Compare transmitting 1000W at low voltage vs. high voltage over the same line.
      </p>

      {renderTransmissionLine()}

      <div className="flex gap-3 mb-6">
        <button
          onMouseDown={() => { setTransmissionVoltage('low'); setHasExploredTwist(true); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            transmissionVoltage === 'low'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Low Voltage (120V)
        </button>
        <button
          onMouseDown={() => { setTransmissionVoltage('high'); setHasExploredTwist(true); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            transmissionVoltage === 'high'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          High Voltage (12kV)
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-blue-800 text-sm">
          <strong>The math:</strong> At 120V, 1000W needs 8.3A → Loss = (8.3)² × 10Ω = 694W!
          At 12kV, same power needs only 0.083A → Loss = (0.083)² × 10Ω = 0.07W!
        </p>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExploredTwist}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExploredTwist
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExploredTwist ? 'Continue →' : 'Try both voltage levels...'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">The High-Voltage Solution</h2>

      <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-gray-800 mb-3 text-center">Power Grid Strategy</h3>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-sm text-gray-600">Generate</div>
          </div>
          <div className="text-xl text-gray-400">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">⬆️</div>
            <div className="text-sm text-gray-600">Step Up</div>
            <div className="text-xs text-green-600">100,000V+</div>
          </div>
          <div className="text-xl text-gray-400">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">〰️</div>
            <div className="text-sm text-gray-600">Transmit</div>
            <div className="text-xs text-green-600">Low I²R loss</div>
          </div>
          <div className="text-xl text-gray-400">→</div>
          <div className="text-center">
            <div className="text-2xl mb-1">⬇️</div>
            <div className="text-sm text-gray-600">Step Down</div>
            <div className="text-xs text-blue-600">120V</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">🔌 Transformers</h4>
          <p className="text-gray-600 text-sm">
            Devices that convert between high and low voltage AC power with minimal loss.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">📊 100× Reduction</h4>
          <p className="text-gray-600 text-sm">
            Increasing voltage by 100× reduces current by 100×, cutting I²R losses by 10,000×!
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
      >
        Apply This Knowledge →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Real-World Applications</h2>
      <p className="text-gray-600 mb-6">
        Discover how I²R losses affect everyday electrical systems.
      </p>

      <div className="space-y-4">
        {[
          {
            title: 'USB-C Power Delivery',
            icon: '📱',
            description: 'Fast chargers use higher voltage (up to 20V) to reduce heating in thin cables',
          },
          {
            title: 'Electric Vehicle Charging',
            icon: '🚗',
            description: 'DC fast chargers use 400-800V to push high power through manageable cables',
          },
          {
            title: 'Extension Cord Ratings',
            icon: '🔌',
            description: 'Amp ratings ensure the wire won\'t overheat - heavier gauge for higher loads',
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
                  className="px-3 py-1 bg-orange-100 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
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
            ? 'bg-orange-500 text-white hover:bg-orange-600'
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
        question: 'What does the I²R power loss equation tell us?',
        options: [
          'Power loss increases with voltage',
          'Power loss increases with the square of current',
          'Power loss decreases with resistance',
        ],
      },
      {
        question: 'Why do power grids use high-voltage transmission?',
        options: [
          'High voltage travels faster through wires',
          'It\'s safer than low voltage',
          'Lower current means less I²R loss',
        ],
      },
      {
        question: 'A wire is carrying 2A. If current increases to 4A, power loss will:',
        options: [
          'Quadruple (4×)',
          'Double (2×)',
          'Stay the same',
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
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-orange-50'
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
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Answers
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className={`text-6xl mb-4 ${testScore >= 2 ? 'animate-bounce' : ''}`}>
              {testScore >= 2 ? '🎉' : '📚'}
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-2">
              {testScore} / 3 Correct
            </p>
            <p className="text-gray-600 mb-6">
              {testScore >= 2
                ? 'Great understanding of I²R power losses!'
                : 'Review the concepts and try again.'}
            </p>
            <button
              onMouseDown={nextPhase}
              className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
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
        I²R Power Loss Master!
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        You now understand one of the most important principles in electrical engineering.
      </p>

      <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-xl p-6 mb-6 text-left">
        <h3 className="font-bold text-gray-800 mb-4">Key Takeaways:</h3>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-orange-500">✓</span>
            <span>Power loss in wires = I²R (current squared × resistance)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500">✓</span>
            <span>Doubling current quadruples heat loss</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500">✓</span>
            <span>High voltage transmission reduces losses dramatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500">✓</span>
            <span>Thicker/shorter wires have less resistance</span>
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 p-4">
      <div className="max-w-lg mx-auto">
        {renderPhaseIndicator()}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
