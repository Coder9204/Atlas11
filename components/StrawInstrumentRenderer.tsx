import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// StrawInstrumentRenderer – Teach tunable resonance with straws
// ─────────────────────────────────────────────────────────────
// Physics: Standing waves in tubes, f = v/(2L) for open pipe
// Shorter tube = higher frequency/pitch
// Cut straws to create a scale!

interface GameEvent {
  type: 'phase_change' | 'prediction' | 'result' | 'complete';
  from?: string;
  to?: string;
  phase?: string;
  prediction?: string;
  actual?: string;
  correct?: boolean;
  score?: number;
  total?: number;
  percentage?: number;
}

interface StrawInstrumentRendererProps {
  onGameEvent?: (event: GameEvent) => void;
}

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

const phaseOrder: Phase[] = [
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

function isValidPhase(p: string): p is Phase {
  return phaseOrder.includes(p as Phase);
}

// Premium sound system
const playGameSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds = {
      click: { freq: 600, duration: 0.08, type: 'sine' as OscillatorType, vol: 0.15 },
      success: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType, vol: 0.2 },
      failure: { freq: 220, duration: 0.2, type: 'triangle' as OscillatorType, vol: 0.15 },
      transition: { freq: 440, duration: 0.12, type: 'sine' as OscillatorType, vol: 0.15 },
      complete: { freq: 660, duration: 0.25, type: 'sine' as OscillatorType, vol: 0.2 },
    };

    const s = sounds[type];
    oscillator.frequency.value = s.freq;
    oscillator.type = s.type;
    gainNode.gain.setValueAtTime(s.vol, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + s.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + s.duration);
  } catch {}
};

const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
};

// Play musical note with harmonics (more realistic pipe sound)
const playPipeSound = (baseFreq: number, duration: number) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Fundamental + harmonics for pipe-like sound
    [1, 2, 3].forEach((harmonic, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = baseFreq * harmonic;
      osc.type = 'sine';
      const vol = 0.25 / (harmonic * harmonic); // Higher harmonics quieter
      gain.gain.setValueAtTime(vol, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    });
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function StrawInstrumentRenderer({ onGameEvent }: StrawInstrumentRendererProps) {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [strawLength, setStrawLength] = useState(20); // cm
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Twist state - create a scale
  const [scaleStraws, setScaleStraws] = useState([20, 17.8, 15.9, 15, 13.4, 11.9, 10.6, 10]); // C major approx
  const [activeStraw, setActiveStraw] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const goToPhase = (newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', from: phase, to: newPhase });
    }
    setPhase(newPhase);
    playGameSound('transition');
  };

  // Calculate frequency from length (open pipe approximation)
  // f = v / (2L), v ≈ 343 m/s
  const lengthToFrequency = (lengthCm: number) => {
    const lengthM = lengthCm / 100;
    return 343 / (2 * lengthM);
  };

  // Get note name from frequency
  const frequencyToNote = (freq: number): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const halfSteps = Math.round(12 * Math.log2(freq / A4));
    const noteIndex = ((halfSteps % 12) + 12 + 9) % 12; // A is index 9
    const octave = Math.floor((halfSteps + 9) / 12) + 4;
    return notes[noteIndex] + octave;
  };

  // Play the straw
  const playStraw = () => {
    if (playing) return;
    setPlaying(true);
    setHasPlayed(true);

    const freq = lengthToFrequency(strawLength);
    playPipeSound(freq, 0.5);

    setTimeout(() => setPlaying(false), 500);
  };

  const playScaleStraw = (index: number) => {
    setActiveStraw(index);
    const freq = lengthToFrequency(scaleStraws[index]);
    playPipeSound(freq, 0.4);
    setTimeout(() => setActiveStraw(null), 400);
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'predict', prediction: choice });
    }
    playGameSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'twist_predict', prediction: choice });
    }
    playGameSound('click');
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playGameSound('click');
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);
    if (onGameEvent) {
      onGameEvent({
        type: 'result',
        phase: 'test',
        score,
        total: testQuestions.length,
        percentage: Math.round((score / testQuestions.length) * 100),
      });
    }
    playGameSound(score >= 7 ? 'success' : 'failure');
  };

  const testQuestions = [
    {
      q: "What happens to pitch when you cut a straw shorter?",
      options: [
        "Pitch gets lower",
        "Pitch gets higher",
        "Pitch stays the same",
        "The straw stops making sound"
      ],
      correct: 1,
      explanation: "Shorter tubes produce higher pitches. The wavelength that fits in the tube is shorter, meaning higher frequency and higher pitch."
    },
    {
      q: "What creates the sound in a straw instrument?",
      options: [
        "Air molecules splitting",
        "Standing waves (resonance) in the tube",
        "Static electricity",
        "Air pressure outside the tube"
      ],
      correct: 1,
      explanation: "Sound is created by standing waves - patterns where certain wavelengths resonate and reinforce themselves within the tube, amplifying the sound."
    },
    {
      q: "For an open pipe, the fundamental frequency formula is:",
      options: [
        "f = v / L",
        "f = v / (2L)",
        "f = v / (4L)",
        "f = 2v / L"
      ],
      correct: 1,
      explanation: "For an open pipe, one complete wavelength spans twice the tube length: λ = 2L. Since f = v/λ, we get f = v/(2L)."
    },
    {
      q: "If a 20 cm straw produces 850 Hz, what frequency would a 10 cm straw produce?",
      options: [
        "425 Hz",
        "850 Hz",
        "1700 Hz",
        "340 Hz"
      ],
      correct: 2,
      explanation: "Halving the length doubles the frequency. Since f = v/(2L), if L is halved, f doubles: from 850 Hz to 1700 Hz."
    },
    {
      q: "Why do pan flutes have tubes of different lengths?",
      options: [
        "For decoration",
        "Each length produces a different note",
        "Longer tubes are louder",
        "They contain different materials"
      ],
      correct: 1,
      explanation: "Each tube length resonates at a specific frequency, producing a different musical note. Shorter tubes make higher notes, longer tubes make lower notes."
    },
    {
      q: "What are the nodes in a standing wave?",
      options: [
        "Points of maximum vibration",
        "Points of no vibration",
        "The ends of the tube",
        "Where sound escapes"
      ],
      correct: 1,
      explanation: "Nodes are points in a standing wave where there is no displacement - the wave cancels itself. Anti-nodes are points of maximum displacement."
    },
    {
      q: "How does a closed pipe differ from an open pipe?",
      options: [
        "Closed pipes are quieter",
        "Closed pipes only produce odd harmonics",
        "Closed pipes produce lower frequencies",
        "No difference in sound"
      ],
      correct: 1,
      explanation: "Closed pipes (one end blocked) only produce odd harmonics (1st, 3rd, 5th...) because of the boundary condition at the closed end. Open pipes produce all harmonics."
    },
    {
      q: "What is resonance in the context of musical instruments?",
      options: [
        "When sound bounces back",
        "When certain frequencies are amplified by constructive interference",
        "When air gets compressed",
        "When the tube vibrates visibly"
      ],
      correct: 1,
      explanation: "Resonance occurs when a frequency matches the natural frequency of the system, causing constructive interference and amplification. This is what makes instruments loud."
    },
    {
      q: "If you blow harder into a straw, what primarily changes?",
      options: [
        "Pitch increases significantly",
        "Volume increases (pitch may rise slightly)",
        "Wavelength changes",
        "Nothing changes"
      ],
      correct: 1,
      explanation: "Blowing harder primarily increases volume (amplitude). Pitch may increase slightly due to higher harmonics becoming more prominent, but the fundamental stays roughly the same."
    },
    {
      q: "Why does a straw with a flattened end (like a reed) make sound easier?",
      options: [
        "Air flows faster",
        "The vibrating reed creates regular pressure pulses",
        "The straw gets longer",
        "Air becomes denser"
      ],
      correct: 1,
      explanation: "A flattened end acts like a double reed, vibrating rapidly to create regular pressure pulses that excite the air column. This is how oboes and bassoons work!"
    }
  ];

  const applications = [
    {
      title: "Pan Flute",
      description: "Ancient multi-tube instrument",
      detail: "The pan flute dates back thousands of years. Each tube is a different length, producing a different note. Players blow across the top of tubes to create music.",
      icon: "🎵"
    },
    {
      title: "Organ Pipes",
      description: "Church organs with hundreds of pipes",
      detail: "Pipe organs contain thousands of metal pipes of different lengths. The largest may be 32 feet long (producing frequencies below human hearing), the smallest just inches.",
      icon: "⛪"
    },
    {
      title: "Clarinet & Oboe",
      description: "Reed instruments with holes",
      detail: "Instead of cutting tubes, these instruments use finger holes to effectively change the tube length. Closing holes makes the tube 'longer' (lower pitch).",
      icon: "🎷"
    },
    {
      title: "Car Exhaust Tuning",
      description: "Engineering for desired sound",
      detail: "Car exhausts are tuned using pipe length and resonance. Sports cars have specific pipe lengths to create their distinctive sound while managing back-pressure.",
      icon: "🚗"
    }
  ];

  const renderPhase = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────
      // HOOK
      // ───────────────────────────────────────────────────
      case 'hook':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Music From a Straw!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              Can you turn a simple drinking straw into a musical instrument?
              Yes! And it teaches us about standing waves and resonance.
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Multiple straws of different lengths */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                const length = 180 - i * 18;
                const x = 50 + i * 40;
                return (
                  <g key={i}>
                    {/* Straw */}
                    <rect
                      x={x}
                      y={200 - length}
                      width="25"
                      height={length}
                      fill={`hsl(${200 + i * 20}, 70%, 50%)`}
                      rx="3"
                    />
                    {/* Stripes */}
                    {[0, 1, 2].map(j => (
                      <rect
                        key={j}
                        x={x}
                        y={200 - length + j * 25 + 10}
                        width="25"
                        height="3"
                        fill="white"
                        opacity="0.3"
                      />
                    ))}
                  </g>
                );
              })}

              {/* Musical notes */}
              <text x="50" y="50" fill="#1e293b" fontSize="20">♪</text>
              <text x="150" y="40" fill="#3b82f6" fontSize="25">♫</text>
              <text x="250" y="55" fill="#8b5cf6" fontSize="22">♪</text>
              <text x="330" y="45" fill="#ec4899" fontSize="20">♫</text>

              {/* Label */}
              <text x="200" y="230" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">
                Different lengths = Different notes!
              </text>
            </svg>

            <button
              onMouseDown={() => goToPhase('predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              Explore Straw Music
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // PREDICT
      // ───────────────────────────────────────────────────
      case 'predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Make Your Prediction
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              You have two straws: one is <strong>20 cm long</strong>, the other is
              <strong> 10 cm long</strong>. When you blow across them to make sound,
              which produces the <strong>higher pitch</strong>?
            </p>

            <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Long straw */}
              <g transform="translate(70, 30)">
                <rect x="0" y="0" width="25" height="100" fill="#3b82f6" rx="3" />
                <text x="12" y="120" textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold">
                  20 cm
                </text>
              </g>

              {/* Short straw */}
              <g transform="translate(270, 80)">
                <rect x="0" y="0" width="25" height="50" fill="#ef4444" rx="3" />
                <text x="12" y="70" textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold">
                  10 cm
                </text>
              </g>

              {/* Question marks */}
              <text x="82" y="20" fill="#3b82f6" fontSize="16">?</text>
              <text x="282" y="70" fill="#ef4444" fontSize="16">?</text>

              {/* Labels */}
              <text x="200" y="145" textAnchor="middle" fill="#64748b" fontSize="11">
                Which makes the higher sound?
              </text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Long straw (20 cm) = higher pitch' },
                { id: 'b', text: 'Short straw (10 cm) = higher pitch' },
                { id: 'c', text: 'Both make the same pitch' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handlePrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: prediction === opt.id ? '#3b82f6' : 'white',
                    color: prediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${prediction === opt.id ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onMouseDown={() => goToPhase('play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // PLAY
      // ───────────────────────────────────────────────────
      case 'play':
        const currentFreq = lengthToFrequency(strawLength);
        const currentNote = frequencyToNote(currentFreq);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Straw Instrument Lab
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Adjust the straw length and listen to the pitch change!
            </p>

            <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Background */}
              <rect x="20" y="20" width="360" height="160" fill="#f8fafc" rx="10" />

              {/* Straw visualization */}
              <g transform={`translate(180, ${180 - strawLength * 5})`}>
                {/* Straw body */}
                <rect
                  x="0"
                  y="0"
                  width="40"
                  height={strawLength * 5}
                  fill={`hsl(${200 + (30 - strawLength) * 5}, 70%, 50%)`}
                  rx="5"
                  style={{
                    filter: playing ? 'brightness(1.2)' : 'none',
                    transition: 'filter 0.1s'
                  }}
                />

                {/* Stripes */}
                {[0, 1, 2, 3, 4].map(i => (
                  strawLength * 5 > i * 25 && (
                    <rect
                      key={i}
                      x="0"
                      y={i * 25}
                      width="40"
                      height="3"
                      fill="white"
                      opacity="0.3"
                    />
                  )
                ))}

                {/* Sound waves when playing */}
                {playing && (
                  <g>
                    {[0, 1, 2].map(i => (
                      <ellipse
                        key={i}
                        cx="20"
                        cy={-10 - i * 15}
                        rx={10 + i * 8}
                        ry={5 + i * 3}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        opacity={0.8 - i * 0.25}
                      >
                        <animate
                          attributeName="ry"
                          values={`${5 + i * 3};${8 + i * 3};${5 + i * 3}`}
                          dur="0.1s"
                          repeatCount="indefinite"
                        />
                      </ellipse>
                    ))}
                  </g>
                )}
              </g>

              {/* Length label */}
              <text x="200" y="195" textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold">
                Length: {strawLength} cm
              </text>

              {/* Frequency display */}
              <rect x="280" y="30" width="90" height="60" fill="#1e293b" rx="8" />
              <text x="325" y="55" textAnchor="middle" fill="#22c55e" fontSize="14" fontFamily="monospace">
                {currentFreq.toFixed(0)} Hz
              </text>
              <text x="325" y="78" textAnchor="middle" fill="#fbbf24" fontSize="18" fontWeight="bold">
                {currentNote}
              </text>
            </svg>

            {/* Length slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1.5rem' }}>
              <label style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Straw Length: {strawLength} cm
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={strawLength}
                onChange={(e) => setStrawLength(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>5 cm (high)</span>
                <span>30 cm (low)</span>
              </div>
            </div>

            {/* Play button */}
            <button
              onMouseDown={playStraw}
              disabled={playing}
              style={{
                padding: '1rem 2rem',
                background: playing
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: playing ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '1.1rem',
                marginBottom: '1rem'
              }}
            >
              {playing ? '🔊 Playing...' : '🎵 Blow!'}
            </button>

            {hasPlayed && (
              <button
                onMouseDown={() => {
                  setShowResult(true);
                  if (onGameEvent) {
                    onGameEvent({
                      type: 'result',
                      phase: 'play',
                      prediction,
                      actual: 'b',
                      correct: prediction === 'b'
                    });
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: prediction === 'b' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'b' ? '#166534' : '#92400e' }}>
                  {prediction === 'b' ? '✓ Correct!' : 'Shorter = Higher!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  <strong>Shorter straws produce higher pitches!</strong> The sound wave
                  wavelength must fit in the tube, so shorter tubes = shorter waves = higher frequency.
                </p>
                <button
                  onMouseDown={() => goToPhase('review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Learn the Physics
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // REVIEW
      // ───────────────────────────────────────────────────
      case 'review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Physics of Pipe Resonance
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>Standing Waves</h3>

              <svg viewBox="0 0 300 100" style={{ width: '100%', marginBottom: '1rem' }}>
                {/* Tube */}
                <rect x="30" y="30" width="240" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" rx="5" />

                {/* Standing wave visualization */}
                <path
                  d="M 30,50 Q 90,20 150,50 Q 210,80 270,50"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                >
                  <animate
                    attributeName="d"
                    values="M 30,50 Q 90,20 150,50 Q 210,80 270,50;M 30,50 Q 90,80 150,50 Q 210,20 270,50;M 30,50 Q 90,20 150,50 Q 210,80 270,50"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </path>

                {/* Wavelength indicator */}
                <path d="M 30,85 L 270,85" fill="none" stroke="#64748b" strokeWidth="1" />
                <path d="M 30,80 L 30,90" stroke="#64748b" strokeWidth="2" />
                <path d="M 270,80 L 270,90" stroke="#64748b" strokeWidth="2" />
                <text x="150" y="98" textAnchor="middle" fill="#64748b" fontSize="10">
                  λ = 2L (wavelength = twice tube length)
                </text>
              </svg>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>
                  f = v / (2L)
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  frequency = sound speed / (2 × tube length)
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Key insight:</strong> Halve the length → double the frequency!
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>20 cm straw → ~858 Hz</li>
                  <li>10 cm straw → ~1,715 Hz (one octave higher)</li>
                </ul>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Why It Resonates</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                Air vibrates inside the tube, creating standing waves. Only certain
                wavelengths "fit" in the tube and reinforce themselves - this is
                <strong> resonance</strong>. Other wavelengths cancel out and die away.
              </p>
            </div>

            <button
              onMouseDown={() => goToPhase('twist_predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Try a Twist! 🎹
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PREDICT
      // ───────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Build a Musical Scale!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              To make a C major scale (Do-Re-Mi-Fa-Sol-La-Ti-Do) with straws,
              how should the lengths relate to each other?
            </p>

            <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Scale visualization */}
              {['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do\''].map((note, i) => (
                <g key={i} transform={`translate(${45 + i * 40}, 20)`}>
                  <rect
                    x="0"
                    y={80 - (i + 1) * 8}
                    width="28"
                    height={(i + 1) * 8 + 15}
                    fill={`hsl(${200 + i * 20}, 60%, 55%)`}
                    rx="3"
                  />
                  <text x="14" y="110" textAnchor="middle" fill="#1e293b" fontSize="9">
                    {note}
                  </text>
                </g>
              ))}
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Equal spacing (each 2 cm shorter)' },
                { id: 'b', text: 'Ratio spacing (each ~11% shorter)' },
                { id: 'c', text: 'Random lengths can make any scale' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id ? '#f59e0b' : 'white',
                    color: twistPrediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${twistPrediction === opt.id ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onMouseDown={() => goToPhase('twist_play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Build the Scale!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C\''];

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Your Straw Pan Flute
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Click each straw to play a note! Notice the length ratios.
            </p>

            <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Base */}
              <rect x="20" y="170" width="360" height="20" fill="#854d0e" rx="5" />

              {/* Straws */}
              {scaleStraws.map((length, i) => {
                const freq = lengthToFrequency(length);
                const x = 40 + i * 42;
                const height = length * 6;

                return (
                  <g
                    key={i}
                    style={{ cursor: 'pointer' }}
                    onMouseDown={() => playScaleStraw(i)}
                  >
                    <rect
                      x={x}
                      y={170 - height}
                      width="35"
                      height={height}
                      fill={activeStraw === i
                        ? '#fbbf24'
                        : `hsl(${200 + i * 20}, 60%, 55%)`}
                      rx="4"
                      style={{
                        transition: 'fill 0.1s',
                        filter: activeStraw === i ? 'brightness(1.2)' : 'none'
                      }}
                    />

                    {/* Sound waves when active */}
                    {activeStraw === i && (
                      <g>
                        {[0, 1].map(j => (
                          <ellipse
                            key={j}
                            cx={x + 17}
                            cy={170 - height - 10 - j * 12}
                            rx={12 + j * 6}
                            ry={4 + j * 2}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            opacity={0.7 - j * 0.2}
                          />
                        ))}
                      </g>
                    )}

                    {/* Note name */}
                    <text
                      x={x + 17}
                      y={185}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {noteNames[i]}
                    </text>

                    {/* Length */}
                    <text
                      x={x + 17}
                      y={155 - height}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                    >
                      {length.toFixed(1)}cm
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Frequency info */}
            <div style={{
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: 12,
              width: '100%',
              maxWidth: 400,
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Notice the pattern:
              </p>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                Each note is about <strong>~11% shorter</strong> than the previous,
                not a fixed amount shorter. This creates the <strong>multiplicative</strong> (ratio)
                spacing that musical scales require!
              </p>
            </div>

            <button
              onMouseDown={() => {
                setShowTwistResult(true);
                if (onGameEvent) {
                  onGameEvent({
                    type: 'result',
                    phase: 'twist_play',
                    prediction: twistPrediction,
                    actual: 'b',
                    correct: twistPrediction === 'b'
                  });
                }
              }}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              See Results
            </button>

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'b' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'b' ? '#166534' : '#92400e' }}>
                  {twistPrediction === 'b' ? '✓ Correct!' : 'It\'s about ratios!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Musical scales use <strong>ratio spacing</strong>. Each semitone is a factor of
                  2^(1/12) ≈ 1.059 in frequency, which means each tube is about 5.6% shorter.
                  A whole octave (double frequency) requires half the length.
                </p>
                <button
                  onMouseDown={() => goToPhase('twist_review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Understand Why
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST REVIEW
      // ───────────────────────────────────────────────────
      case 'twist_review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Musical Math: The Equal Temperament Scale
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>The 12th Root of 2</h3>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>
                  Semitone ratio = ¹²√2 ≈ 1.0595
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  12 semitones = 1 octave = 2× frequency
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>Why ratios, not fixed steps?</strong>
                </p>
                <p style={{ lineHeight: 1.7 }}>
                  Our ears perceive pitch <em>logarithmically</em>. A change from 100 Hz to 200 Hz
                  sounds the same (one octave) as 500 Hz to 1000 Hz. This means musical intervals
                  are based on <strong>ratios</strong>, not fixed differences.
                </p>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Length Calculation</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                Since f = v/(2L), and frequency ratios are fixed:
              </p>
              <ul style={{ color: '#1e293b', fontSize: '0.85rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li>Doubling frequency → halving length</li>
                <li>One semitone up → length × (1/1.0595)</li>
                <li>One octave up → length × 0.5</li>
              </ul>
            </div>

            <button
              onMouseDown={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              See Real Applications
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TRANSFER
      // ───────────────────────────────────────────────────
      case 'transfer':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Pipe Resonance in the Real World
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center' }}>
              Explore each application to unlock the test
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: 600,
              marginBottom: '1.5rem'
            }}>
              {applications.map((app, index) => (
                <div
                  key={index}
                  onMouseDown={() => {
                    setCompletedApps(prev => new Set([...prev, index]));
                    playGameSound('click');
                  }}
                  style={{
                    background: completedApps.has(index)
                      ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                      : 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `2px solid ${completedApps.has(index) ? '#22c55e' : '#e2e8f0'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.icon}</div>
                  <h3 style={{ color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {app.title}
                    {completedApps.has(index) && ' ✓'}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {app.description}
                  </p>
                  {completedApps.has(index) && (
                    <p style={{ color: '#1e293b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      {app.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {completedApps.size} / {applications.length} applications explored
            </p>

            {completedApps.size >= applications.length && (
              <button
                onMouseDown={() => goToPhase('test')}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Take the Test
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TEST
      // ───────────────────────────────────────────────────
      case 'test':
        const score = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Pipe Resonance Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600 }}>
              {testQuestions.map((tq, qi) => (
                <div
                  key={qi}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `2px solid ${
                      testSubmitted
                        ? testAnswers[qi] === tq.correct
                          ? '#22c55e'
                          : testAnswers[qi] !== undefined
                          ? '#ef4444'
                          : '#e2e8f0'
                        : '#e2e8f0'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
                    {qi + 1}. {tq.q}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onMouseDown={() => handleTestAnswer(qi, oi)}
                        disabled={testSubmitted}
                        style={{
                          padding: '0.6rem 1rem',
                          textAlign: 'left',
                          background: testSubmitted
                            ? oi === tq.correct
                              ? '#dcfce7'
                              : testAnswers[qi] === oi
                              ? '#fee2e2'
                              : '#f8fafc'
                            : testAnswers[qi] === oi
                            ? '#dbeafe'
                            : '#f8fafc',
                          color: '#1e293b',
                          border: `1px solid ${
                            testSubmitted
                              ? oi === tq.correct
                                ? '#22c55e'
                                : testAnswers[qi] === oi
                                ? '#ef4444'
                                : '#e2e8f0'
                              : testAnswers[qi] === oi
                              ? '#3b82f6'
                              : '#e2e8f0'
                          }`,
                          borderRadius: 8,
                          cursor: testSubmitted ? 'default' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {testSubmitted && (
                    <p style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: '#f0f9ff',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      color: '#1e293b'
                    }}>
                      💡 {tq.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!testSubmitted ? (
              <button
                onMouseDown={submitTest}
                disabled={Object.keys(testAnswers).length < testQuestions.length}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: Object.keys(testAnswers).length < testQuestions.length
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: Object.keys(testAnswers).length < testQuestions.length ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: score >= 7 ? '#22c55e' : '#f59e0b',
                  marginBottom: '1rem'
                }}>
                  Score: {score}/{testQuestions.length} ({Math.round(score / testQuestions.length * 100)}%)
                </p>

                <button
                  onMouseDown={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Complete Journey
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // MASTERY
      // ───────────────────────────────────────────────────
      case 'mastery':
        const finalScore = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎵🥤🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Pipe Resonance Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You now understand how changing tube length creates different
              musical notes through standing wave resonance!
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 400,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '1rem' }}>Your Achievements</h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
                    {finalScore}/{testQuestions.length}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Test Score</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>4</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Applications</p>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'left'
              }}>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Key Takeaways:
                </p>
                <ul style={{ color: '#64748b', fontSize: '0.85rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>f = v / (2L) for open pipes</li>
                  <li>Shorter = higher pitch</li>
                  <li>Musical scales use ratio spacing</li>
                  <li>Half length = double frequency (octave)</li>
                </ul>
              </div>
            </div>

            {/* Confetti */}
            <svg viewBox="0 0 300 100" style={{ width: '100%', maxWidth: 300 }}>
              {[...Array(20)].map((_, i) => (
                <circle
                  key={i}
                  cx={Math.random() * 300}
                  cy={Math.random() * 100}
                  r={3 + Math.random() * 4}
                  fill={['#3b82f6', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6'][i % 5]}
                >
                  <animate
                    attributeName="cy"
                    values={`${Math.random() * 30};${70 + Math.random() * 30}`}
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            <button
              onMouseDown={() => {
                if (onGameEvent) {
                  onGameEvent({ type: 'complete', score: finalScore, total: testQuestions.length });
                }
                goToPhase('hook');
                setTestAnswers({});
                setTestSubmitted(false);
                setCompletedApps(new Set());
                setHasPlayed(false);
              }}
              style={{
                marginTop: '1rem',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Play Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />

      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/3 rounded-full blur-3xl" />

      {/* Fixed header with phase navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-lg">🎵</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Straw Instrument</h1>
                <p className="text-xs text-slate-400">Pipe Resonance</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {phaseOrder.map((p, i) => (
                <div
                  key={p}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-6 bg-gradient-to-r from-amber-400 to-orange-400'
                      : i < currentIndex
                      ? 'w-2 bg-amber-500'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 md:p-8">
            {renderPhase()}
          </div>
        </div>
      </div>
    </div>
  );
}
