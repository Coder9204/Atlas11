import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// FloatingPaperclipRenderer – Teach surface tension support
// ─────────────────────────────────────────────────────────────
// Physics: Surface tension creates a "skin" supporting heavy objects
// Steel paperclip floats despite being 8× denser than water
// Force balance: Weight = Surface tension × perimeter × sin(θ)

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

interface FloatingPaperclipRendererProps {
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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function FloatingPaperclipRenderer({ onGameEvent }: FloatingPaperclipRendererProps) {
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

  // Simulation state
  const [clipState, setClipState] = useState<'hovering' | 'floating' | 'sinking'>('hovering');
  const [clipY, setClipY] = useState(30);
  const [dropMethod, setDropMethod] = useState<'gentle' | 'dropped'>('gentle');
  const [dimpleDepth, setDimpleDepth] = useState(0);
  const [hasDropped, setHasDropped] = useState(false);

  // Twist state - add soap
  const [soapAdded, setSoapAdded] = useState(false);
  const [twistClipY, setTwistClipY] = useState(60);
  const [twistClipState, setTwistClipState] = useState<'floating' | 'sinking' | 'sunk'>('floating');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', from: phase, to: newPhase });
    }
    setPhase(newPhase);
    playSound(440, 0.15, 'sine', 0.2);
  };

  // Drop the paperclip
  const dropClip = () => {
    if (hasDropped) return;
    setHasDropped(true);
    setClipState('floating');

    if (dropMethod === 'gentle') {
      // Gently placed - floats!
      let y = clipY;
      let dimple = 0;

      const interval = setInterval(() => {
        if (y < 95) {
          y += 2;
          setClipY(y);
        } else {
          dimple = Math.min(dimple + 0.5, 8);
          setDimpleDepth(dimple);
          if (dimple >= 8) {
            clearInterval(interval);
            playSound(523, 0.2, 'sine', 0.3);
          }
        }
      }, 30);
    } else {
      // Dropped - sinks!
      setClipState('sinking');
      let y = clipY;

      const interval = setInterval(() => {
        y += 4;
        setClipY(Math.min(y, 180));
        if (y >= 180) {
          clearInterval(interval);
          playSound(150, 0.3, 'square', 0.2);
        }
      }, 30);
    }
  };

  const resetSimulation = () => {
    setClipState('hovering');
    setClipY(30);
    setDimpleDepth(0);
    setHasDropped(false);
  };

  // Twist - add soap to floating clip
  const addSoapToWater = () => {
    if (soapAdded || twistClipState !== 'floating') return;
    setSoapAdded(true);
    setTwistClipState('sinking');

    playSound(200, 0.2, 'sine', 0.2);

    let y = twistClipY;
    const interval = setInterval(() => {
      y += 3;
      setTwistClipY(Math.min(y, 180));
      if (y >= 180) {
        clearInterval(interval);
        setTwistClipState('sunk');
        playSound(100, 0.4, 'square', 0.2);
      }
    }, 40);
  };

  const resetTwist = () => {
    setSoapAdded(false);
    setTwistClipY(60);
    setTwistClipState('floating');
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'predict', prediction: choice });
    }
    playSound(330, 0.1, 'sine', 0.2);
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'twist_predict', prediction: choice });
    }
    playSound(330, 0.1, 'sine', 0.2);
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playSound(330, 0.1, 'sine', 0.2);
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
    playSound(score >= 7 ? 523 : 330, 0.3, 'sine', 0.3);
  };

  const testQuestions = [
    {
      q: "Why does a steel paperclip float on water?",
      options: [
        "Steel is less dense than water",
        "Surface tension supports it",
        "Air bubbles hold it up",
        "The paperclip is hollow"
      ],
      correct: 1,
      explanation: "Steel is 8× denser than water, so it can't float by buoyancy. Surface tension at the water's surface creates a 'skin' that supports the light paperclip."
    },
    {
      q: "What visible feature shows surface tension supporting the paperclip?",
      options: [
        "Bubbles around the clip",
        "Color change in water",
        "A dimple in the water surface",
        "Ripples spreading outward"
      ],
      correct: 2,
      explanation: "The paperclip creates a dimple or depression in the water surface. Surface tension acts along this curved surface, providing an upward force component."
    },
    {
      q: "Why does a dropped paperclip sink but a gently placed one floats?",
      options: [
        "Dropped clip is heavier",
        "Gentle placement allows surface tension to form gradually",
        "Water temperature changes",
        "Air pressure pushes it down"
      ],
      correct: 1,
      explanation: "When dropped, the clip breaks through the surface too quickly for surface tension to support it. Gentle placement allows the water surface to deform gradually and support the weight."
    },
    {
      q: "What happens when you add soap to water with a floating paperclip?",
      options: [
        "The clip floats higher",
        "Nothing changes",
        "The clip immediately sinks",
        "The water turns cloudy"
      ],
      correct: 2,
      explanation: "Soap drastically reduces surface tension, eliminating the 'skin' that supports the paperclip. Without this support, the dense steel immediately sinks."
    },
    {
      q: "Which formula relates surface tension force to contact angle?",
      options: [
        "F = mg",
        "F = γ × L × sin(θ)",
        "F = ρgh",
        "F = ma"
      ],
      correct: 1,
      explanation: "The upward component of surface tension force is F = γ × L × sin(θ), where γ is surface tension, L is contact length, and θ is the contact angle at the water surface."
    },
    {
      q: "Why can water striders walk on water?",
      options: [
        "They are very light",
        "Their legs have oils and hairs that don't break surface tension",
        "They move too fast to sink",
        "Water pushes them up"
      ],
      correct: 1,
      explanation: "Water strider legs are covered with waxy, hydrophobic hairs that prevent them from breaking through the surface tension. This distributes their weight over the water 'skin'."
    },
    {
      q: "What is the approximate density ratio of steel to water?",
      options: [
        "1:1 (same density)",
        "2:1",
        "5:1",
        "8:1"
      ],
      correct: 3,
      explanation: "Steel has a density of about 7,850 kg/m³ while water is 1,000 kg/m³, giving a ratio of roughly 8:1. This is why steel normally sinks - surface tension is a special case."
    },
    {
      q: "What determines the maximum weight surface tension can support?",
      options: [
        "Water depth",
        "Contact perimeter and contact angle",
        "Water color",
        "Container shape"
      ],
      correct: 1,
      explanation: "Maximum supportable weight depends on the contact perimeter (longer perimeter = more force) and contact angle (steeper angle = larger vertical force component)."
    },
    {
      q: "Why does a needle float better when placed parallel to the water surface?",
      options: [
        "It's lighter that way",
        "More contact length means more surface tension force",
        "The needle is magnetic",
        "Air gets trapped underneath"
      ],
      correct: 1,
      explanation: "A parallel needle has more contact length with the water surface. Since surface tension force is proportional to contact length, this orientation provides maximum support."
    },
    {
      q: "What natural phenomenon uses surface tension for survival?",
      options: [
        "Birds flying",
        "Fish swimming",
        "Insects walking on water",
        "Plants absorbing sunlight"
      ],
      correct: 2,
      explanation: "Many insects like water striders, fishing spiders, and some beetles rely on surface tension to walk on water, hunt prey, and escape predators."
    }
  ];

  const applications = [
    {
      title: "Water Striders",
      description: "Insects that walk on water",
      detail: "Water strider legs spread their weight over a large perimeter with hydrophobic hairs, creating a stable platform on the water surface. They can even jump on water!",
      icon: "🦟"
    },
    {
      title: "Floating Needle Compass",
      description: "Ancient navigation technique",
      detail: "Magnetized needles floated on water surface tension became early compasses. The needle aligns with Earth's magnetic field while surface tension keeps it level.",
      icon: "🧭"
    },
    {
      title: "Mosquito Eggs",
      description: "Rafts of floating eggs",
      detail: "Many mosquito species lay eggs in rafts that float due to surface tension. The eggs' shape and coating prevent them from breaking through the water surface.",
      icon: "🥚"
    },
    {
      title: "Microfluidics",
      description: "Lab-on-a-chip technology",
      detail: "At tiny scales, surface tension dominates over gravity. This allows precise control of droplets in medical diagnostics, drug delivery, and chemical analysis.",
      icon: "🔬"
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
              Steel That Floats?
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              Steel is 8 times denser than water. It should sink immediately... right?
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Water container */}
              <rect x="50" y="100" width="300" height="130" fill="#1e40af" rx="5" />
              <rect x="55" y="105" width="290" height="120" fill="#3b82f6" rx="3" />

              {/* Surface ripple effect */}
              <ellipse cx="200" cy="105" rx="140" ry="5" fill="#60a5fa" opacity="0.5" />

              {/* Floating paperclip */}
              <g transform="translate(170, 95)">
                {/* Dimple in water */}
                <ellipse cx="30" cy="12" rx="35" ry="6" fill="#1d4ed8" opacity="0.5" />

                {/* Paperclip */}
                <path
                  d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Shine effect */}
                <path
                  d="M 8,3 L 12,3"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>

              {/* Question marks */}
              <text x="120" y="80" fill="#1e293b" fontSize="24" fontWeight="bold">?</text>
              <text x="280" y="80" fill="#1e293b" fontSize="24" fontWeight="bold">?</text>

              {/* Labels */}
              <text x="200" y="45" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">
                A steel paperclip floating on water!
              </text>

              {/* Density comparison */}
              <g transform="translate(70, 175)">
                <rect x="0" y="0" width="60" height="20" fill="#64748b" rx="3" />
                <text x="30" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                  Steel: 7850
                </text>
              </g>
              <g transform="translate(270, 175)">
                <rect x="0" y="0" width="60" height="20" fill="#3b82f6" rx="3" />
                <text x="30" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                  Water: 1000
                </text>
              </g>
              <text x="200" y="188" textAnchor="middle" fill="#1e293b" fontSize="10">
                kg/m³
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
              Discover the Secret
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
              You have a paperclip and a bowl of water. What do you think will happen
              when you <strong>gently place</strong> the paperclip on the water?
            </p>

            <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Bowl */}
              <ellipse cx="200" cy="100" rx="150" ry="15" fill="#1e40af" />
              <path d="M 50,100 Q 50,70 200,70 Q 350,70 350,100" fill="#3b82f6" />

              {/* Paperclip hovering */}
              <g transform="translate(175, 30)">
                <path
                  d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Motion arrow */}
                <path d="M 25,25 L 25,45" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3,2" />
                <polygon points="25,50 20,43 30,43" fill="#94a3b8" />
              </g>

              {/* Labels */}
              <text x="200" y="15" textAnchor="middle" fill="#64748b" fontSize="11">
                Gently placed on surface...
              </text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Sinks immediately (steel is too dense)' },
                { id: 'b', text: 'Floats on the surface' },
                { id: 'c', text: 'Bobs up and down, then sinks' }
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
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Floating Paperclip Experiment
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Choose how to place the paperclip on water
            </p>

            <svg viewBox="0 0 400 230" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Water container */}
              <rect x="50" y="100" width="300" height="110" fill="#1e40af" rx="8" />
              <rect x="55" y="105" width="290" height="100" fill="#3b82f6" rx="5" />

              {/* Water surface with dimple */}
              {clipState === 'floating' && (
                <path
                  d={`M 55,105 Q 150,105 ${200 - dimpleDepth * 3},${105 + dimpleDepth} Q ${200 + dimpleDepth * 3},105 345,105`}
                  fill="#60a5fa"
                  opacity="0.6"
                />
              )}

              {/* Paperclip */}
              <g transform={`translate(170, ${clipY})`}>
                <path
                  d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M 8,3 L 12,3"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>

              {/* Status indicator */}
              {clipState === 'floating' && (
                <g>
                  <text x="200" y="75" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">
                    ✓ It floats!
                  </text>

                  {/* Force diagram */}
                  <g transform="translate(320, 110)">
                    {/* Surface tension force arrows */}
                    <path d="M 0,0 L -15,-10" stroke="#22c55e" strokeWidth="2" markerEnd="url(#greenArrow)" />
                    <path d="M 30,0 L 45,-10" stroke="#22c55e" strokeWidth="2" markerEnd="url(#greenArrow)" />
                    <text x="15" y="-15" textAnchor="middle" fill="#22c55e" fontSize="8">Surface</text>
                    <text x="15" y="-5" textAnchor="middle" fill="#22c55e" fontSize="8">Tension</text>

                    {/* Weight arrow */}
                    <path d="M 15,15 L 15,30" stroke="#ef4444" strokeWidth="2" />
                    <polygon points="15,35 10,28 20,28" fill="#ef4444" />
                    <text x="35" y="30" fill="#ef4444" fontSize="8">Weight</text>
                  </g>
                  <defs>
                    <marker id="greenArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
                    </marker>
                  </defs>
                </g>
              )}

              {clipState === 'sinking' && clipY > 100 && (
                <text x="200" y="75" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">
                  ✗ It sinks!
                </text>
              )}

              {/* Instructions */}
              {clipState === 'hovering' && (
                <text x="200" y="225" textAnchor="middle" fill="#64748b" fontSize="11">
                  Select a method and drop the paperclip
                </text>
              )}
            </svg>

            {/* Method selector */}
            {!hasDropped && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  onMouseDown={() => setDropMethod('gentle')}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: dropMethod === 'gentle'
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'white',
                    color: dropMethod === 'gentle' ? 'white' : '#1e293b',
                    border: `2px solid ${dropMethod === 'gentle' ? '#22c55e' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  🤲 Gentle Place
                </button>
                <button
                  onMouseDown={() => setDropMethod('dropped')}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: dropMethod === 'dropped'
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'white',
                    color: dropMethod === 'dropped' ? 'white' : '#1e293b',
                    border: `2px solid ${dropMethod === 'dropped' ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  💨 Drop It
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              {!hasDropped ? (
                <button
                  onMouseDown={dropClip}
                  style={{
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {dropMethod === 'gentle' ? '🤲 Place Gently' : '💨 Drop!'}
                </button>
              ) : (
                <button
                  onMouseDown={resetSimulation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #64748b, #475569)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔄 Try Again
                </button>
              )}
            </div>

            {hasDropped && (clipState === 'floating' || clipY > 150) && (
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
                  marginTop: '1rem',
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
                  {prediction === 'b' ? '✓ Correct!' : 'Surprising, right?'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  When gently placed, the paperclip <strong>floats</strong>! Surface tension creates
                  an invisible "skin" on the water that supports the paperclip despite steel being
                  8× denser than water.
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
              The Physics of Surface Support
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>Why It Floats</h3>

              <svg viewBox="0 0 300 140" style={{ width: '100%', marginBottom: '1rem' }}>
                {/* Water surface */}
                <rect x="20" y="70" width="260" height="60" fill="#3b82f6" opacity="0.3" />

                {/* Dimpled surface */}
                <path
                  d="M 20,70 Q 100,70 150,85 Q 200,70 280,70"
                  fill="#60a5fa"
                  opacity="0.5"
                />
                <path
                  d="M 20,70 Q 100,70 150,85 Q 200,70 280,70"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="2"
                />

                {/* Paperclip in dimple */}
                <g transform="translate(125, 75)">
                  <rect x="0" y="0" width="50" height="8" fill="#64748b" rx="2" />
                </g>

                {/* Force vectors */}
                {/* Weight */}
                <path d="M 150,95 L 150,120" stroke="#ef4444" strokeWidth="3" />
                <polygon points="150,125 145,118 155,118" fill="#ef4444" />
                <text x="165" y="120" fill="#ef4444" fontSize="10" fontWeight="bold">W</text>

                {/* Surface tension forces */}
                <path d="M 125,80 L 95,60" stroke="#22c55e" strokeWidth="2" />
                <polygon points="92,57 99,55 97,64" fill="#22c55e" />
                <path d="M 175,80 L 205,60" stroke="#22c55e" strokeWidth="2" />
                <polygon points="208,57 201,55 203,64" fill="#22c55e" />

                {/* Angle labels */}
                <text x="75" y="55" fill="#22c55e" fontSize="9">F = γL sin(θ)</text>
                <text x="150" y="25" textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">
                  Vertical components balance weight!
                </text>
              </svg>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  The paperclip creates a <strong>dimple</strong> in the water surface.
                  Surface tension acts along this curved surface:
                </p>

                <div style={{
                  background: 'white',
                  padding: '0.75rem',
                  borderRadius: 8,
                  textAlign: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#1d4ed8' }}>
                    F<sub>vertical</sub> = γ × L × sin(θ)
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    γ = surface tension, L = perimeter, θ = contact angle
                  </p>
                </div>

                <p>
                  When F<sub>vertical</sub> ≥ Weight, the object floats!
                </p>
              </div>
            </div>

            <div style={{
              background: '#fef3c7',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#92400e', marginBottom: '0.5rem' }}>Why Dropping Fails</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                When dropped, the paperclip hits with enough momentum to
                <strong> punch through</strong> the surface tension barrier before it can
                deform and support the weight. Gentle placement allows the surface to
                gradually stretch and form the supporting dimple.
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
              Try a Twist! 🧪
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
              The Soap Test
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              A paperclip is floating on water. What happens if you add a drop of
              dish soap to the water?
            </p>

            <svg viewBox="0 0 400 140" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Water */}
              <rect x="50" y="70" width="300" height="50" fill="#3b82f6" rx="5" />

              {/* Floating paperclip */}
              <g transform="translate(170, 60)">
                <path
                  d="M 5,5 L 5,12 Q 5,15 8,15 L 45,15 Q 48,15 48,12 L 48,5 Q 48,2 45,2 L 12,2 Q 9,2 9,5 L 9,10"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                />
              </g>

              {/* Soap drop */}
              <circle cx="100" cy="50" r="15" fill="#a855f7" opacity="0.8" />
              <text x="100" y="54" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                SOAP
              </text>

              {/* Arrow */}
              <path d="M 115,60 L 145,75" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2" />
              <polygon points="150,78 143,79 145,71" fill="#a855f7" />

              {/* Question mark */}
              <text x="320" y="95" fill="#1e293b" fontSize="28" fontWeight="bold">?</text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Paperclip floats higher (soap makes water "slippery")' },
                { id: 'b', text: 'Nothing changes (soap doesn\'t affect floating)' },
                { id: 'c', text: 'Paperclip sinks immediately' }
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
                Add the Soap!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              The Soap Experiment
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              The paperclip is floating. Add soap to see what happens!
            </p>

            <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Water container */}
              <rect x="50" y="80" width="300" height="120" fill="#1e40af" rx="8" />
              <rect x="55" y="85" width="290" height="110"
                fill={soapAdded ? '#a855f7' : '#3b82f6'}
                style={{ transition: 'fill 1s' }}
                rx="5"
              />

              {/* Water surface */}
              {twistClipState === 'floating' && (
                <path
                  d="M 55,85 Q 150,85 200,92 Q 250,85 345,85"
                  fill="#60a5fa"
                  opacity="0.5"
                />
              )}

              {/* Paperclip */}
              <g transform={`translate(170, ${twistClipY})`}>
                <path
                  d="M 5,5 L 5,15 Q 5,20 10,20 L 50,20 Q 55,20 55,15 L 55,5 Q 55,0 50,0 L 15,0 Q 10,0 10,5 L 10,12"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>

              {/* Soap bottle */}
              {!soapAdded && (
                <g
                  transform="translate(50, 10)"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={addSoapToWater}
                >
                  <rect x="10" y="15" width="35" height="50" fill="#a855f7" rx="5" />
                  <rect x="15" y="0" width="25" height="20" fill="#7c3aed" rx="3" />
                  <text x="27" y="45" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                    SOAP
                  </text>
                  <text x="27" y="80" textAnchor="middle" fill="#1e293b" fontSize="10">
                    Click to add!
                  </text>
                </g>
              )}

              {/* Status messages */}
              {twistClipState === 'floating' && !soapAdded && (
                <text x="200" y="215" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
                  ✓ Paperclip floating on surface tension
                </text>
              )}

              {soapAdded && twistClipState === 'sinking' && (
                <text x="200" y="215" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">
                  Surface tension broken! Sinking...
                </text>
              )}

              {twistClipState === 'sunk' && (
                <g>
                  <text x="200" y="60" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">
                    💥 SUNK!
                  </text>
                  <text x="200" y="215" textAnchor="middle" fill="#64748b" fontSize="11">
                    Soap destroyed the surface tension that held it up
                  </text>
                </g>
              )}
            </svg>

            {/* Reset button */}
            {soapAdded && (
              <button
                onMouseDown={resetTwist}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #64748b, #475569)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginBottom: '1rem'
                }}
              >
                🔄 Reset
              </button>
            )}

            {twistClipState === 'sunk' && (
              <button
                onMouseDown={() => {
                  setShowTwistResult(true);
                  if (onGameEvent) {
                    onGameEvent({
                      type: 'result',
                      phase: 'twist_play',
                      prediction: twistPrediction,
                      actual: 'c',
                      correct: twistPrediction === 'c'
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

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'c' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'c' ? '#166534' : '#92400e' }}>
                  {twistPrediction === 'c' ? '✓ Correct!' : 'Dramatic, isn\'t it?'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The paperclip <strong>sinks immediately</strong>! Soap is a surfactant that
                  breaks the hydrogen bonds creating surface tension. Without that supportive
                  "skin," the dense steel has nothing to hold it up.
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
              Surface Tension: The Make-or-Break Force
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>Before vs After Soap</h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  background: '#dcfce7',
                  padding: '0.75rem',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#166534', marginBottom: '0.25rem' }}>
                    Clean Water
                  </p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#166534' }}>
                    γ = 0.072 N/m
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#166534' }}>
                    Strong surface tension
                  </p>
                </div>

                <div style={{
                  background: '#fee2e2',
                  padding: '0.75rem',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '0.25rem' }}>
                    Soapy Water
                  </p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dc2626' }}>
                    γ ≈ 0.025 N/m
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                    ~65% reduction!
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                The paperclip's weight exceeds what the reduced surface tension can support.
                The force balance tips from floating to sinking:
              </p>

              <div style={{
                background: 'white',
                padding: '0.75rem',
                borderRadius: 8,
                textAlign: 'center',
                marginTop: '0.75rem'
              }}>
                <p style={{ color: '#dc2626' }}>
                  γ<sub>soap</sub> × L × sin(θ) <strong>&lt;</strong> Weight
                </p>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Surface tension force can no longer support the clip
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
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>The Surfactant Effect</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                Soap molecules have a <strong>hydrophilic head</strong> (loves water) and a
                <strong> hydrophobic tail</strong> (hates water). They insert between water
                molecules at the surface, disrupting the hydrogen bond network that creates
                surface tension.
              </p>
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
              Surface Tension in Nature & Technology
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
                    playSound(500 + index * 100, 0.15, 'sine', 0.2);
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
              Surface Tension Mastery Test
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
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📎💧🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Surface Tension Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You now understand how water's invisible "skin" can support
              objects much denser than water itself!
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
                  <li>Surface tension creates a supportive "skin"</li>
                  <li>F = γ × L × sin(θ) for vertical force</li>
                  <li>Gentle placement allows surface to deform</li>
                  <li>Soap breaks hydrogen bonds → sinking</li>
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
                  fill={['#3b82f6', '#64748b', '#22c55e', '#f59e0b', '#a855f7'][i % 5]}
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
                resetSimulation();
                resetTwist();
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc, #e0f2fe)',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Progress bar */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto 1.5rem auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem'
        }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: i <= currentIndex
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: i <= currentIndex ? 'white' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 600
              }}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
          ))}
        </div>
        <div style={{
          height: 4,
          background: '#e2e8f0',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(currentIndex / (phaseOrder.length - 1)) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        background: 'white',
        borderRadius: 20,
        padding: isMobile ? '1.5rem' : '2rem',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)'
      }}>
        {renderPhase()}
      </div>
    </div>
  );
}
