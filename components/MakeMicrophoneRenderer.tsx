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

interface MakeMicrophoneRendererProps {
  onStateChange?: (state: SavedState) => void;
  onEvent?: (event: GameEvent) => void;
  savedState?: SavedState | null;
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function MakeMicrophoneRenderer({
  onStateChange,
  onEvent,
  savedState,
}: MakeMicrophoneRendererProps) {
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

  // Play phase: Microphone simulator
  const [soundWavePhase, setSoundWavePhase] = useState(0);
  const [soundFrequency, setSoundFrequency] = useState(2);
  const [soundAmplitude, setSoundAmplitude] = useState(0.5);
  const [micType, setMicType] = useState<'dynamic' | 'condenser'>('dynamic');
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase: Speaker as microphone
  const [speakerMode, setSpeakerMode] = useState<'speaker' | 'microphone'>('speaker');
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

  // Animation for sound waves
  useEffect(() => {
    if (phase === 'play' || phase === 'twist_play') {
      const animate = () => {
        setSoundWavePhase(p => (p + 0.1) % (Math.PI * 2));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationRef.current);
    }
  }, [phase]);

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
    const correctAnswers = [1, 0, 2]; // Correct indices
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer === correctAnswers[index]) score++;
    });
    setTestScore(score);
    playSound(score >= 2 ? 'success' : 'failure');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHYSICS CALCULATIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getDiaphragmPosition = () => {
    return Math.sin(soundWavePhase * soundFrequency) * soundAmplitude * 15;
  };

  const getOutputVoltage = () => {
    const position = getDiaphragmPosition();
    const sensitivity = micType === 'dynamic' ? 0.8 : 1.2;
    return (position / 15) * sensitivity;
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
                ? 'bg-teal-500 w-6'
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

  const renderMicrophoneSimulator = () => {
    const diaphragmOffset = getDiaphragmPosition();
    const voltage = getOutputVoltage();

    return (
      <svg viewBox="0 0 400 220" className="w-full h-52 mb-4">
        {/* Sound waves incoming */}
        {[0, 1, 2, 3].map(i => (
          <path
            key={i}
            d={`M ${30 + i * 25} 110 Q ${40 + i * 25} ${90 + Math.sin(soundWavePhase + i * 0.5) * 20 * soundAmplitude}, ${50 + i * 25} 110 Q ${60 + i * 25} ${130 - Math.sin(soundWavePhase + i * 0.5) * 20 * soundAmplitude}, ${70 + i * 25} 110`}
            fill="none"
            stroke="#0D9488"
            strokeWidth="2"
            opacity={0.4 + (i * 0.15)}
          />
        ))}
        <text x="60" y="150" textAnchor="middle" fill="#0D9488" fontSize="10">
          Sound Waves
        </text>

        {/* Microphone housing */}
        <rect x="140" y="60" width="100" height="100" fill="#374151" rx="10" />

        {/* Diaphragm */}
        <ellipse
          cx="155"
          cy="110"
          rx="8"
          ry="30"
          fill="#9CA3AF"
          stroke="#6B7280"
          strokeWidth="2"
          transform={`translate(${diaphragmOffset}, 0)`}
        />
        <text x="155" y="155" textAnchor="middle" fill="#9CA3AF" fontSize="9">
          Diaphragm
        </text>

        {micType === 'dynamic' ? (
          <>
            {/* Voice coil */}
            <rect
              x={170 + diaphragmOffset}
              y="95"
              width="15"
              height="30"
              fill="#F59E0B"
              rx="3"
            />
            <text x="177" y="135" textAnchor="middle" fill="#F59E0B" fontSize="8">
              Coil
            </text>

            {/* Magnet */}
            <rect x="195" y="80" width="30" height="60" fill="#DC2626" rx="4" />
            <text x="210" y="115" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
              N S
            </text>
            <text x="210" y="155" textAnchor="middle" fill="#DC2626" fontSize="8">
              Magnet
            </text>

            {/* Field lines */}
            <path
              d="M 195 90 C 180 85, 180 135, 195 130"
              fill="none"
              stroke="#FCA5A5"
              strokeWidth="1"
              strokeDasharray="3"
            />
          </>
        ) : (
          <>
            {/* Backplate (condenser) */}
            <rect x="175" y="85" width="8" height="50" fill="#3B82F6" />
            <text x="179" y="155" textAnchor="middle" fill="#3B82F6" fontSize="8">
              Backplate
            </text>

            {/* Capacitor symbol */}
            <line x1="168" y1="100" x2="168" y2="120" stroke="#6B7280" strokeWidth="2" />
            <line x1="175" y1="100" x2="175" y2="120" stroke="#6B7280" strokeWidth="2" />

            {/* Bias voltage */}
            <text x="210" y="110" fill="#3B82F6" fontSize="9">
              48V bias
            </text>
          </>
        )}

        {/* Output signal */}
        <g transform="translate(260, 60)">
          <rect width="120" height="100" fill="#F3F4F6" rx="8" />
          <text x="60" y="20" textAnchor="middle" fill="#374151" fontSize="11" fontWeight="bold">
            OUTPUT SIGNAL
          </text>

          {/* Waveform display */}
          <path
            d={`M 10 60 ${Array.from({ length: 20 }, (_, i) =>
              `L ${10 + i * 5} ${60 - Math.sin((soundWavePhase + i * 0.5) * soundFrequency) * voltage * 25}`
            ).join(' ')}`}
            fill="none"
            stroke="#0D9488"
            strokeWidth="2"
          />

          {/* Voltage readout */}
          <text x="60" y="90" textAnchor="middle" fill="#0D9488" fontSize="12" fontWeight="bold">
            {(Math.abs(voltage) * 10).toFixed(1)} mV
          </text>
        </g>
      </svg>
    );
  };

  const renderSpeakerMicDemo = () => (
    <svg viewBox="0 0 400 200" className="w-full h-48 mb-4">
      {speakerMode === 'speaker' ? (
        <>
          {/* Audio input */}
          <g transform="translate(20, 50)">
            <rect width="80" height="60" fill="#374151" rx="8" />
            <text x="40" y="25" textAnchor="middle" fill="white" fontSize="10">
              AUDIO IN
            </text>
            <path
              d={`M 15 45 ${Array.from({ length: 12 }, (_, i) =>
                `L ${15 + i * 5} ${45 - Math.sin(soundWavePhase + i * 0.5) * 10}`
              ).join(' ')}`}
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
          </g>

          {/* Electrical signal arrow */}
          <path d="M 100 80 L 130 80 L 125 75 M 130 80 L 125 85" fill="none" stroke="#22C55E" strokeWidth="2">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
          </path>
          <text x="115" y="95" textAnchor="middle" fill="#22C55E" fontSize="9">
            Electric
          </text>

          {/* Speaker cone */}
          <g transform="translate(140, 40)">
            <polygon
              points={`60,60 ${100 + Math.sin(soundWavePhase) * 10},40 ${100 + Math.sin(soundWavePhase) * 10},80`}
              fill="#9CA3AF"
              stroke="#6B7280"
              strokeWidth="2"
            />
            <rect x="100" y="50" width="30" height="20" fill="#F59E0B" rx="3" />
            <rect x="130" y="45" width="20" height="30" fill="#DC2626" rx="3" />
            <text x="90" y="100" textAnchor="middle" fill="#6B7280" fontSize="10">
              Speaker Cone
            </text>
          </g>

          {/* Sound waves out */}
          {[0, 1, 2].map(i => (
            <ellipse
              key={i}
              cx={320 + i * 20}
              cy="60"
              rx={10 + i * 8}
              ry={20 + i * 10}
              fill="none"
              stroke="#0D9488"
              strokeWidth="2"
              opacity={0.7 - i * 0.2}
            >
              <animate attributeName="rx" values={`${10 + i * 8};${15 + i * 8};${10 + i * 8}`} dur="0.5s" repeatCount="indefinite" />
            </ellipse>
          ))}
          <text x="340" y="100" textAnchor="middle" fill="#0D9488" fontSize="10">
            Sound Out
          </text>
        </>
      ) : (
        <>
          {/* Sound waves in */}
          {[0, 1, 2].map(i => (
            <ellipse
              key={i}
              cx={60 + i * 20}
              cy="60"
              rx={10 + i * 8}
              ry={20 + i * 10}
              fill="none"
              stroke="#0D9488"
              strokeWidth="2"
              opacity={0.3 + i * 0.2}
            />
          ))}
          <text x="60" y="100" textAnchor="middle" fill="#0D9488" fontSize="10">
            Sound In
          </text>

          {/* Speaker cone (as mic) */}
          <g transform="translate(120, 40)">
            <polygon
              points={`${40 + Math.sin(soundWavePhase) * 5},60 0,40 0,80`}
              fill="#9CA3AF"
              stroke="#6B7280"
              strokeWidth="2"
            />
            <rect x="0" y="50" width="30" height="20" fill="#F59E0B" rx="3" />
            <rect x="-20" y="45" width="20" height="30" fill="#DC2626" rx="3" />
            <text x="20" y="100" textAnchor="middle" fill="#6B7280" fontSize="10">
              Same Speaker!
            </text>
          </g>

          {/* Electrical signal arrow */}
          <path d="M 200 80 L 230 80 L 225 75 M 230 80 L 225 85" fill="none" stroke="#22C55E" strokeWidth="2">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
          </path>
          <text x="215" y="95" textAnchor="middle" fill="#22C55E" fontSize="9">
            Electric
          </text>

          {/* Audio output */}
          <g transform="translate(250, 50)">
            <rect width="100" height="60" fill="#374151" rx="8" />
            <text x="50" y="20" textAnchor="middle" fill="white" fontSize="10">
              AUDIO OUT
            </text>
            <path
              d={`M 15 40 ${Array.from({ length: 14 }, (_, i) =>
                `L ${15 + i * 5} ${40 - Math.sin(soundWavePhase + i * 0.5) * 8}`
              ).join(' ')}`}
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
            <text x="50" y="55" textAnchor="middle" fill="#9CA3AF" fontSize="9">
              (weaker signal)
            </text>
          </g>
        </>
      )}

      {/* Mode label */}
      <rect x="150" y="150" width="100" height="30" fill={speakerMode === 'speaker' ? '#3B82F6' : '#8B5CF6'} rx="15" />
      <text x="200" y="170" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
        {speakerMode === 'speaker' ? '🔊 Speaker' : '🎤 Microphone'}
      </text>
    </svg>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE CONTENT
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="text-center">
      <div className="text-6xl mb-6">🎤🔊</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        How Does Your Voice Become Electricity?
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        When you speak into a microphone, invisible sound waves somehow transform into
        electrical signals that travel through wires. How does this magic happen?
      </p>
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mb-6">
        <p className="text-teal-800">
          🔬 The secret lies in <strong>transducers</strong>—devices that convert
          one form of energy to another. And here&apos;s the amazing part:
          the physics works <em>both ways</em>!
        </p>
      </div>
      <p className="text-gray-600 mb-6">
        Let&apos;s build understanding of how microphones capture sound.
      </p>
      <button
        onMouseDown={() => goToPhase('predict')}
        className="px-8 py-4 bg-teal-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-teal-600 transition-colors"
      >
        Explore Transducers →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800">
          A dynamic microphone uses a coil attached to a diaphragm, placed in a magnetic field.
          What principle allows it to generate electricity from sound?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'heat', label: 'Sound heats the coil, generating current' },
          { id: 'induction', label: 'Moving coil in magnetic field induces voltage' },
          { id: 'pressure', label: 'Air pressure creates static electricity' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              prediction === option.id
                ? option.id === 'induction'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="font-medium text-gray-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-4 rounded-xl mb-4 ${
          prediction === 'induction' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={prediction === 'induction' ? 'text-green-800' : 'text-amber-800'}>
            {prediction === 'induction' ? (
              <><strong>Exactly!</strong> Electromagnetic induction—when a conductor moves through a magnetic field, voltage is induced. Faraday&apos;s law at work!</>
            ) : (
              <><strong>Good thinking!</strong> The actual mechanism is electromagnetic induction. Sound moves the diaphragm → coil moves in magnetic field → voltage is induced.</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"
        >
          See How It Works →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Microphone Simulator</h2>
      <p className="text-gray-600 mb-4">
        Watch how sound waves become electrical signals. Adjust the sound and mic type.
      </p>

      {renderMicrophoneSimulator()}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sound Frequency
          </label>
          <input
            type="range"
            min="1"
            max="4"
            step="0.5"
            value={soundFrequency}
            onChange={e => { setSoundFrequency(Number(e.target.value)); handleExperiment(); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sound Amplitude (Loudness)
          </label>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.1"
            value={soundAmplitude}
            onChange={e => { setSoundAmplitude(Number(e.target.value)); handleExperiment(); }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Microphone Type:</label>
          <div className="flex gap-2">
            <button
              onMouseDown={() => { setMicType('dynamic'); handleExperiment(); }}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                micType === 'dynamic'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Dynamic (Coil)
            </button>
            <button
              onMouseDown={() => { setMicType('condenser'); handleExperiment(); }}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                micType === 'condenser'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Condenser
            </button>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
        <p className="text-yellow-800 text-sm">
          <strong>Notice:</strong> Louder sounds → bigger diaphragm movement → stronger signal.
          Condenser mics are more sensitive but need phantom power (48V).
        </p>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExperimented}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExperimented
            ? 'bg-teal-500 text-white hover:bg-teal-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExperimented ? 'Continue to Review →' : 'Try adjusting the controls...'}
      </button>
    </div>
  );

  const renderReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">How Microphones Work</h2>

      <div className="bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl p-5 mb-6">
        <div className="text-center mb-3">
          <span className="text-2xl">Sound → Motion → Electricity</span>
        </div>
        <p className="text-teal-800 text-center text-sm">
          Microphones are transducers that convert acoustic energy to electrical energy
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🎤 Dynamic Microphones</h3>
          <p className="text-gray-600 text-sm">
            Coil attached to diaphragm moves in magnetic field. Rugged, no power needed.
            Great for live performances.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">🎙️ Condenser Microphones</h3>
          <p className="text-gray-600 text-sm">
            Diaphragm acts as capacitor plate. Distance changes → capacitance changes → signal.
            More sensitive, needs phantom power.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-2">📱 MEMS Microphones</h3>
          <p className="text-gray-600 text-sm">
            Tiny silicon diaphragms in phones and earbuds. Miniature condenser design
            with built-in amplifiers.
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"
      >
        Now for a Twist... →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">The Reversibility Puzzle</h2>
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <p className="text-purple-800">
          A speaker has a coil, magnet, and cone—the same basic parts as a dynamic microphone.
          What happens if you <strong>speak into a speaker</strong> instead of playing audio through it?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'nothing', label: 'Nothing - speakers only output sound' },
          { id: 'damage', label: 'You\'ll damage the speaker' },
          { id: 'works', label: 'It works as a microphone!' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? option.id === 'works'
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
          twistPrediction === 'works' ? 'bg-green-100 border border-green-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={twistPrediction === 'works' ? 'text-green-800' : 'text-amber-800'}>
            {twistPrediction === 'works' ? (
              <><strong>Amazing but true!</strong> The physics of electromagnetic induction works both ways. Sound moves cone → coil moves in magnetic field → voltage generated!</>
            ) : (
              <><strong>Surprising fact:</strong> Speakers actually CAN work as microphones! The physics is completely reversible. (The signal is weaker, but it works!)</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onMouseDown={nextPhase}
          className="w-full py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"
        >
          See It In Action →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Speaker ↔ Microphone</h2>
      <p className="text-gray-600 mb-4">
        Switch between modes to see the same device work both ways!
      </p>

      {renderSpeakerMicDemo()}

      <div className="flex gap-3 mb-6">
        <button
          onMouseDown={() => { setSpeakerMode('speaker'); setHasExploredTwist(true); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            speakerMode === 'speaker'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔊 As Speaker
        </button>
        <button
          onMouseDown={() => { setSpeakerMode('microphone'); setHasExploredTwist(true); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
            speakerMode === 'microphone'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🎤 As Microphone
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-blue-800 text-sm">
          <strong>Fun fact:</strong> Early intercoms used the same speaker for both talking and listening!
          The Green Bullet harmonica mic is actually a repurposed speaker element.
        </p>
      </div>

      <button
        onMouseDown={nextPhase}
        disabled={!hasExploredTwist}
        className={`w-full py-3 rounded-xl font-bold transition-colors ${
          hasExploredTwist
            ? 'bg-teal-500 text-white hover:bg-teal-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {hasExploredTwist ? 'Continue →' : 'Try both modes...'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Transducer Reciprocity</h2>

      <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-gray-800 mb-3 text-center">The Same Physics, Both Directions</h3>
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-2xl mb-1">🔊</div>
            <div className="text-xs text-gray-600">Electric → Motion</div>
          </div>
          <div className="text-2xl text-gray-400">⟷</div>
          <div className="text-center">
            <div className="text-2xl mb-1">🎤</div>
            <div className="text-xs text-gray-600">Motion → Electric</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">🧲 Electromagnetic Induction</h4>
          <p className="text-gray-600 text-sm">
            Works both ways: current in coil creates motion OR motion in coil creates current.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-bold text-gray-800 mb-1">🎸 Piezoelectric Effect</h4>
          <p className="text-gray-600 text-sm">
            Also bidirectional: squeezing crystal makes voltage OR voltage bends crystal.
            Used in pickups AND buzzers!
          </p>
        </div>
      </div>

      <button
        onMouseDown={nextPhase}
        className="w-full py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"
      >
        Apply This Knowledge →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Real-World Applications</h2>
      <p className="text-gray-600 mb-6">
        See how transducer technology shapes modern devices.
      </p>

      <div className="space-y-4">
        {[
          {
            title: 'Bone Conduction Headphones',
            icon: '🎧',
            description: 'Transducers on your skull vibrate to send sound directly to inner ear',
          },
          {
            title: 'Ultrasonic Sensors',
            icon: '📡',
            description: 'Same piezo element emits ultrasound pulses and receives echoes',
          },
          {
            title: 'Guitar Pickups',
            icon: '🎸',
            description: 'Magnets + coils convert string vibrations to electrical guitar signal',
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
                  className="px-3 py-1 bg-teal-100 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-200 transition-colors"
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
            ? 'bg-teal-500 text-white hover:bg-teal-600'
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
        question: 'How does a dynamic microphone generate electricity?',
        options: [
          'Chemical reaction in the diaphragm',
          'Coil moving in magnetic field induces voltage',
          'Static electricity from air friction',
        ],
      },
      {
        question: 'Why can a speaker work as a microphone?',
        options: [
          'Electromagnetic induction is reversible',
          'It has a built-in microphone',
          'The magnet stores sound',
        ],
      },
      {
        question: 'What type of mic needs phantom power (48V)?',
        options: [
          'Dynamic microphone',
          'Ribbon microphone',
          'Condenser microphone',
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
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-teal-50'
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
                  ? 'bg-teal-500 text-white hover:bg-teal-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Answers
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className={`text-6xl mb-4 ${testScore >= 2 ? 'animate-bounce' : ''}`}>
              {testScore >= 2 ? '🎤' : '📚'}
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-2">
              {testScore} / 3 Correct
            </p>
            <p className="text-gray-600 mb-6">
              {testScore >= 2
                ? 'You understand transducers!'
                : 'Review the concepts and try again.'}
            </p>
            <button
              onMouseDown={nextPhase}
              className="px-8 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"
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
      <div className="text-6xl mb-6">🎤🏆</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Transducer Master!
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        You now understand how sound becomes electricity and vice versa.
      </p>

      <div className="bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl p-6 mb-6 text-left">
        <h3 className="font-bold text-gray-800 mb-4">Key Takeaways:</h3>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-teal-500">✓</span>
            <span>Microphones convert sound waves to electrical signals</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500">✓</span>
            <span>Dynamic mics use coils in magnetic fields (induction)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500">✓</span>
            <span>Condenser mics use changing capacitance (need power)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500">✓</span>
            <span>Transduction is often reversible—speakers can be mics!</span>
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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-4">
      <div className="max-w-lg mx-auto">
        {renderPhaseIndicator()}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
