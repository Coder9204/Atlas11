import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// SoapBoatRenderer – Teach surface tension propulsion
// ─────────────────────────────────────────────────────────────
// Physics: Soap reduces surface tension, creating force imbalance
// Marangoni effect: Flow from low to high surface tension regions
// Water surface tension ≈ 0.072 N/m; soap reduces it significantly

interface SoapBoatRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
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

const playSound = (soundType: 'click' | 'success' | 'failure' | 'transition' | 'complete' = 'click') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; dur: number; type: OscillatorType; vol: number }> = {
      click: { freq: 330, dur: 0.1, type: 'sine', vol: 0.2 },
      success: { freq: 523, dur: 0.3, type: 'sine', vol: 0.3 },
      failure: { freq: 220, dur: 0.3, type: 'sine', vol: 0.3 },
      transition: { freq: 440, dur: 0.15, type: 'sine', vol: 0.2 },
      complete: { freq: 660, dur: 0.4, type: 'sine', vol: 0.3 }
    };
    const sound = sounds[soundType];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(sound.vol, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.dur);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.dur);
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SoapBoatRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: SoapBoatRendererProps) {
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
  const [boatPosition, setBoatPosition] = useState(50); // x position
  const [boatVelocity, setBoatVelocity] = useState(0);
  const [soapAdded, setSoapAdded] = useState(false);
  const [soapSpread, setSoapSpread] = useState(0); // 0-100%
  const [waterContaminated, setWaterContaminated] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Interactive controls
  const [soapConcentration, setSoapConcentration] = useState(50); // % strength
  const [waterTemperature, setWaterTemperature] = useState(20); // Celsius
  const [boatMass, setBoatMass] = useState(5); // grams
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(true);

  // Twist state - different liquids
  const [liquidType, setLiquidType] = useState<'water' | 'soapyWater' | 'oil'>('water');
  const [twistBoatPosition, setTwistBoatPosition] = useState(50);
  const [twistSoapAdded, setTwistSoapAdded] = useState(false);
  const [twistAnimating, setTwistAnimating] = useState(false);

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

    onPhaseComplete?.();
    playSound('transition');
  };

  // Surface tension values (N/m)
  const surfaceTensions: Record<string, number> = {
    water: 0.072,
    soapyWater: 0.025,
    oil: 0.032
  };

  // Calculate effective surface tension based on temperature
  const getEffectiveSurfaceTension = (base: number, temp: number) => {
    // Surface tension decreases with temperature (about 0.15% per degree C)
    const tempFactor = 1 - (temp - 20) * 0.0015;
    return base * Math.max(0.5, tempFactor);
  };

  // Calculate soap effectiveness based on concentration
  const getSoapReduction = () => {
    // Higher concentration = more reduction in surface tension
    return (soapConcentration / 100) * 0.65; // Max 65% reduction at 100%
  };

  // Add soap and animate boat
  const addSoap = () => {
    if (animating || soapAdded || waterContaminated) return;
    setSoapAdded(true);
    setAnimating(true);

    playSound('transition');

    // Soap spreads and boat accelerates
    let spread = 0;
    let pos = boatPosition;
    let vel = 0;

    const baseTension = getEffectiveSurfaceTension(surfaceTensions.water, waterTemperature);
    const soapReduction = getSoapReduction();
    const massEffect = 5 / boatMass; // Lighter boats move faster

    const interval = setInterval(() => {
      spread += 3 * (soapConcentration / 50); // Higher concentration spreads faster
      setSoapSpread(Math.min(spread, 100));

      // Force from surface tension difference
      if (spread < 80) {
        const tensionFront = baseTension;
        const tensionBack = baseTension * (1 - (spread / 100) * soapReduction);
        const force = (tensionFront - tensionBack) * 0.5 * massEffect;
        vel += force * 50;
      }

      // Drag slows boat
      vel *= 0.98;
      pos += vel;

      setBoatVelocity(vel);
      setBoatPosition(Math.min(Math.max(pos, 10), 350));

      if (spread >= 100) {
        clearInterval(interval);
        setWaterContaminated(true);
        setAnimating(false);
      }
    }, 50);
  };

  const resetSimulation = () => {
    setBoatPosition(50);
    setBoatVelocity(0);
    setSoapAdded(false);
    setSoapSpread(0);
    setWaterContaminated(false);
    setAnimating(false);
  };

  // Twist simulation
  const addTwistSoap = () => {
    if (twistAnimating || twistSoapAdded) return;
    setTwistSoapAdded(true);
    setTwistAnimating(true);

    playSound('transition');

    let pos = twistBoatPosition;
    let vel = 0;
    let steps = 0;

    const interval = setInterval(() => {
      steps++;

      // Different behavior based on liquid
      if (liquidType === 'water') {
        // Normal movement
        if (steps < 40) {
          vel += 0.3;
        }
        vel *= 0.97;
      } else if (liquidType === 'soapyWater') {
        // Already low surface tension, soap has minimal effect
        vel *= 0.99;
      } else if (liquidType === 'oil') {
        // Oil has different surface chemistry, soap doesn't work well
        vel += 0.02;
        vel *= 0.98;
      }

      pos += vel;
      setTwistBoatPosition(Math.min(Math.max(pos, 10), 350));

      if (steps >= 60) {
        clearInterval(interval);
        setTwistAnimating(false);
      }
    }, 50);
  };

  const resetTwistSimulation = () => {
    setTwistBoatPosition(50);
    setTwistSoapAdded(false);
    setTwistAnimating(false);
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    playSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    playSound('click');
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playSound('click');
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
        return acc + 1;
      }
      return acc;
    }, 0);
    if (score >= 7) {
      onCorrectAnswer?.();
      playSound('success');
    } else {
      onIncorrectAnswer?.();
      playSound('failure');
    }
  };

  const testQuestions = [
    {
      question: "What is surface tension?",
      options: [
        { text: "Pressure inside a liquid", correct: false },
        { text: "Cohesive forces at the liquid surface", correct: true },
        { text: "Temperature of the surface layer", correct: false },
        { text: "Density variation at the surface", correct: false }
      ],
    },
    {
      question: "Why does a soap boat move forward when soap is added behind it?",
      options: [
        { text: "Soap pushes the boat", correct: false },
        { text: "Chemical reaction propels it", correct: false },
        { text: "Surface tension imbalance creates net force", correct: true },
        { text: "Soap is lighter than water", correct: false }
      ],
    },
    {
      question: "What happens if you try the soap boat experiment a second time in the same water?",
      options: [
        { text: "It works faster", correct: false },
        { text: "It doesn't work well - water is contaminated", correct: true },
        { text: "The boat sinks", correct: false },
        { text: "It works the same", correct: false }
      ],
    },
    {
      question: "What is the Marangoni effect?",
      options: [
        { text: "Soap dissolving in water", correct: false },
        { text: "Flow caused by surface tension gradients", correct: true },
        { text: "Evaporation from liquid surfaces", correct: false },
        { text: "Density-driven convection", correct: false }
      ],
    },
    {
      question: "What is the approximate surface tension of water at room temperature?",
      options: [
        { text: "0.0072 N/m", correct: false },
        { text: "0.072 N/m", correct: true },
        { text: "0.72 N/m", correct: false },
        { text: "7.2 N/m", correct: false }
      ],
    },
    {
      question: "How do surfactants (soaps) reduce surface tension?",
      options: [
        { text: "By increasing water temperature", correct: false },
        { text: "By breaking hydrogen bonds between water molecules", correct: true },
        { text: "By making water denser", correct: false },
        { text: "By adding pressure to the surface", correct: false }
      ],
    },
    {
      question: "Why does the soap boat work better with dish soap than with oil?",
      options: [
        { text: "Dish soap is heavier", correct: false },
        { text: "Dish soap is a surfactant that drastically lowers water's surface tension", correct: true },
        { text: "Oil floats on water", correct: false },
        { text: "Dish soap creates bubbles", correct: false }
      ],
    },
    {
      question: "What would happen if you tried the soap boat on mercury instead of water?",
      options: [
        { text: "Work the same way", correct: false },
        { text: "Work much better due to mercury's high surface tension", correct: false },
        { text: "Not work well - soap doesn't reduce mercury's surface tension", correct: true },
        { text: "The boat would sink", correct: false }
      ],
    },
    {
      question: "In the 'tears of wine' phenomenon, what causes the wine to climb the glass?",
      options: [
        { text: "Wine evaporates from the glass edge", correct: false },
        { text: "Alcohol evaporation creates surface tension gradients (Marangoni effect)", correct: true },
        { text: "Glass absorbs wine", correct: false },
        { text: "Wine is attracted to glass by static electricity", correct: false }
      ],
    },
    {
      question: "What shape does a soap film naturally form and why?",
      options: [
        { text: "Flat, due to gravity", correct: false },
        { text: "Spherical, because surface tension minimizes surface area", correct: true },
        { text: "Cubic, due to molecular structure", correct: false },
        { text: "Random shapes", correct: false }
      ],
    }
  ];

  const applications = [
    {
      title: "Insect Locomotion",
      description: "Water striders walking on water",
      detail: "Water striders can walk because their legs are coated with hydrophobic hairs. They use asymmetric leg movements to create surface tension gradients for propulsion.",
      icon: "🦟"
    },
    {
      title: "Lung Surfactant",
      description: "Breathing made possible",
      detail: "Pulmonary surfactant reduces surface tension in lung alveoli, preventing collapse. Premature babies lacking this surfactant develop respiratory distress syndrome.",
      icon: "🫁"
    },
    {
      title: "Tears of Wine",
      description: "Wine climbing the glass",
      detail: "Alcohol evaporating from wine creates surface tension gradients (Marangoni flow). Higher surface tension at the top pulls wine upward, forming 'tears' that roll back down.",
      icon: "🍷"
    },
    {
      title: "Self-Cleaning Surfaces",
      description: "Lotus leaf effect applications",
      detail: "Superhydrophobic surfaces manipulate surface tension to make water bead up and roll off, carrying dirt away. Used in self-cleaning glass and fabrics.",
      icon: "🌿"
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
            {/* Premium Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '9999px',
              marginBottom: '16px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                background: '#3b82f6',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
            </div>
            {/* Gradient Title */}
            <h2 style={{
              fontSize: '2rem',
              marginBottom: '0.5rem',
              background: 'linear-gradient(to right, #f8fafc, #60a5fa, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800
            }}>
              The Soap-Powered Boat
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              Can you power a boat with nothing but a tiny drop of soap?
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Water surface */}
              <defs>
                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              <rect x="20" y="120" width="360" height="110" fill="url(#waterGrad)" rx="5" />

              {/* Surface ripples */}
              {[0, 1, 2].map(i => (
                <ellipse
                  key={i}
                  cx="200"
                  cy="120"
                  rx={50 + i * 40}
                  ry={5 + i * 2}
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="1"
                  opacity={0.5 - i * 0.15}
                >
                  <animate
                    attributeName="rx"
                    values={`${50 + i * 40};${70 + i * 40};${50 + i * 40}`}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              ))}

              {/* Boat */}
              <g transform="translate(100, 100)">
                {/* Hull */}
                <path
                  d="M 0,20 L 10,35 L 60,35 L 70,20 L 0,20"
                  fill="#854d0e"
                  stroke="#713f12"
                  strokeWidth="2"
                />
                {/* Deck */}
                <rect x="5" y="10" width="60" height="12" fill="#a16207" stroke="#854d0e" strokeWidth="1" rx="2" />

                {/* Motion lines */}
                <g>
                  <line x1="75" y1="25" x2="95" y2="25" stroke="#22c55e" strokeWidth="3" strokeLinecap="round">
                    <animate attributeName="x2" values="95;110;95" dur="0.5s" repeatCount="indefinite" />
                  </line>
                  <line x1="75" y1="18" x2="90" y2="15" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                    <animate attributeName="x2" values="90;100;90" dur="0.5s" repeatCount="indefinite" />
                  </line>
                  <line x1="75" y1="32" x2="90" y2="35" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                    <animate attributeName="x2" values="90;100;90" dur="0.5s" repeatCount="indefinite" />
                  </line>
                </g>

                {/* Soap drop */}
                <circle cx="-10" cy="25" r="8" fill="#a855f7" opacity="0.8">
                  <animate attributeName="r" values="8;10;8" dur="1s" repeatCount="indefinite" />
                </circle>
                <text x="-10" y="28" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                  soap
                </text>
              </g>

              {/* Labels */}
              <text x="200" y="45" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">
                A tiny soap drop makes the boat zoom!
              </text>
              <text x="200" y="200" textAnchor="middle" fill="white" fontSize="12">
                No motor, no wind, no paddle...
              </text>
              <text x="200" y="220" textAnchor="middle" fill="#bfdbfe" fontSize="12">
                Just surface tension!
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
              A small paper boat floats on water. When you add a drop of dish soap
              behind the boat, what happens?
            </p>

            <svg viewBox="0 0 400 140" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Water */}
              <rect x="20" y="70" width="360" height="50" fill="#3b82f6" rx="5" />

              {/* Boat */}
              <g transform="translate(180, 55)">
                <path d="M 0,15 L 8,25 L 42,25 L 50,15 L 0,15" fill="#854d0e" stroke="#713f12" strokeWidth="2" />
                <rect x="5" y="7" width="40" height="10" fill="#a16207" rx="2" />
              </g>

              {/* Soap drop approaching */}
              <circle cx="120" cy="80" r="10" fill="#a855f7" opacity="0.8" />
              <text x="120" y="83" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
                SOAP
              </text>

              {/* Question mark */}
              <text x="330" y="90" fill="#1e293b" fontSize="24" fontWeight="bold">?</text>

              {/* Arrow */}
              <path d="M 150,80 L 170,80" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4,2" markerEnd="url(#arrowhead)" />
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                </marker>
              </defs>

              <text x="200" y="130" textAnchor="middle" fill="#64748b" fontSize="11">
                Soap added behind the boat...
              </text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Boat moves backward (toward the soap)' },
                { id: 'b', text: 'Boat moves forward (away from soap)' },
                { id: 'c', text: 'Boat stays still (soap has no effect)' }
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
        const currentTension = getEffectiveSurfaceTension(surfaceTensions.water, waterTemperature);
        const reducedTension = currentTension * (1 - getSoapReduction());

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Soap Boat Experiment
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Adjust parameters and click the soap bottle to run the experiment!
            </p>

            {/* Interactive Controls Panel */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              width: '100%',
              maxWidth: 450,
              border: '1px solid rgba(71, 85, 105, 0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>⚙️ Experiment Controls</h4>
                <button
                  onClick={() => setShowPhysicsPanel(!showPhysicsPanel)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {showPhysicsPanel ? 'Hide' : 'Show'}
                </button>
              </div>

              {showPhysicsPanel && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Soap Concentration Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Soap Concentration</span>
                      <span style={{ color: '#a855f7', fontFamily: 'monospace' }}>{soapConcentration}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={soapConcentration}
                      onChange={(e) => setSoapConcentration(parseInt(e.target.value))}
                      disabled={soapAdded}
                      style={{ width: '100%', accentColor: '#a855f7' }}
                    />
                  </div>

                  {/* Water Temperature Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Water Temperature</span>
                      <span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>{waterTemperature}°C</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={waterTemperature}
                      onChange={(e) => setWaterTemperature(parseInt(e.target.value))}
                      disabled={soapAdded}
                      style={{ width: '100%', accentColor: '#3b82f6' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>Cold (5°C)</span>
                      <span>Hot (60°C)</span>
                    </div>
                  </div>

                  {/* Boat Mass Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Boat Mass</span>
                      <span style={{ color: '#22c55e', fontFamily: 'monospace' }}>{boatMass}g</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={boatMass}
                      onChange={(e) => setBoatMass(parseInt(e.target.value))}
                      disabled={soapAdded}
                      style={{ width: '100%', accentColor: '#22c55e' }}
                    />
                  </div>

                  {/* Real-time Physics Display */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(71, 85, 105, 0.5)'
                  }}>
                    <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Water γ</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3b82f6' }}>{(currentTension * 1000).toFixed(1)}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>mN/m</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Soap γ</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#a855f7' }}>{(reducedTension * 1000).toFixed(1)}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>mN/m</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Δγ Force</div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#22c55e' }}>{((currentTension - reducedTension) * 1000).toFixed(1)}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b' }}>mN/m</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Container */}
              <rect x="10" y="80" width="380" height="150" fill="#1e40af" rx="8" />
              <rect x="15" y="85" width="370" height="140" fill="#3b82f6" rx="5" />

              {/* Water surface effect */}
              <ellipse cx="200" cy="85" rx="180" ry="5" fill="#60a5fa" opacity="0.5" />

              {/* Soap spread visualization */}
              {soapAdded && (
                <g>
                  <ellipse
                    cx={boatPosition - 10}
                    cy="100"
                    rx={soapSpread * 1.5}
                    ry={soapSpread * 0.3}
                    fill="#a855f7"
                    opacity={0.3}
                  />
                  {/* Spreading ripples */}
                  {[0, 1, 2].map(i => (
                    <ellipse
                      key={i}
                      cx={boatPosition - 10}
                      cy="100"
                      rx={Math.min(soapSpread * (1 + i * 0.3), 180)}
                      ry={Math.min(soapSpread * 0.2, 20)}
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="1"
                      opacity={0.5 - i * 0.15}
                    />
                  ))}
                </g>
              )}

              {/* Boat */}
              <g transform={`translate(${boatPosition}, 85)`}>
                {/* Hull */}
                <path
                  d="M 0,15 L 8,30 L 52,30 L 60,15 L 0,15"
                  fill="#854d0e"
                  stroke="#713f12"
                  strokeWidth="2"
                />
                {/* Deck */}
                <rect x="5" y="5" width="50" height="12" fill="#a16207" stroke="#854d0e" strokeWidth="1" rx="2" />

                {/* Flag */}
                <line x1="30" y1="5" x2="30" y2="-15" stroke="#713f12" strokeWidth="2" />
                <path d="M 30,-15 L 45,-10 L 30,-5" fill="#ef4444" />
              </g>

              {/* Surface tension arrows */}
              {!waterContaminated && !soapAdded && (
                <g opacity="0.6">
                  {/* Front arrows (pull) */}
                  <path d="M {boatPosition + 70},95 L {boatPosition + 90},95" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#greenArrow)" />
                  {/* Back arrows (pull) */}
                  <path d="M {boatPosition - 20},95 L {boatPosition - 40},95" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#greenArrow)" />
                  <text x="200" y="145" textAnchor="middle" fill="white" fontSize="10">
                    Equal surface tension on all sides = no movement
                  </text>
                </g>
              )}

              {/* After soap */}
              {soapAdded && soapSpread > 20 && (
                <g>
                  {/* Strong front pull */}
                  <path
                    d={`M ${boatPosition + 70},95 L ${boatPosition + 100},95`}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="4"
                  />
                  <polygon
                    points={`${boatPosition + 100},95 ${boatPosition + 90},90 ${boatPosition + 90},100`}
                    fill="#22c55e"
                  />
                  <text x={boatPosition + 85} y="80" fill="#22c55e" fontSize="9" fontWeight="bold">
                    HIGH
                  </text>

                  {/* Weak back pull */}
                  <path
                    d={`M ${boatPosition - 20},95 L ${boatPosition - 35},95`}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeDasharray="3,2"
                  />
                  <text x={boatPosition - 35} y="80" fill="#fbbf24" fontSize="9" fontWeight="bold">
                    LOW
                  </text>
                </g>
              )}

              {/* Soap bottle */}
              {!waterContaminated && (
                <g
                  transform="translate(20, 10)"
                  style={{ cursor: soapAdded ? 'default' : 'pointer' }}
                  onMouseDown={addSoap}
                >
                  <rect x="10" y="20" width="30" height="50" fill="#a855f7" rx="5" />
                  <rect x="15" y="5" width="20" height="20" fill="#7c3aed" rx="3" />
                  <text x="25" y="50" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                    SOAP
                  </text>
                  {!soapAdded && (
                    <text x="25" y="85" textAnchor="middle" fill="#1e293b" fontSize="10">
                      Click me!
                    </text>
                  )}
                </g>
              )}

              {/* Status */}
              <text x="200" y="240" textAnchor="middle" fill="#1e293b" fontSize="11">
                {waterContaminated
                  ? '⚠️ Water contaminated - soap spread everywhere!'
                  : soapAdded
                  ? `Soap spreading... ${Math.round(soapSpread)}%`
                  : 'Add soap behind the boat'}
              </text>

              {/* Velocity indicator */}
              {animating && (
                <text x="200" y="180" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                  Speed: {(boatVelocity * 10).toFixed(1)} cm/s
                </text>
              )}
            </svg>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              {waterContaminated && (
                <button
                  onMouseDown={resetSimulation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔄 Fresh Water
                </button>
              )}
            </div>

            {waterContaminated && (
              <button
                onMouseDown={() => {
                  setShowResult(true);
                  if (prediction === 'b') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
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
                  {prediction === 'b' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The boat moves <strong>forward</strong>! Soap reduces surface tension behind the boat,
                  creating an imbalance. The higher surface tension at the front pulls the boat forward!
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
              The Physics of Surface Tension
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>What is Surface Tension?</h3>

              <svg viewBox="0 0 300 120" style={{ width: '100%', marginBottom: '1rem' }}>
                {/* Bulk molecules */}
                <g transform="translate(50, 60)">
                  <circle cx="0" cy="0" r="10" fill="#3b82f6" />
                  <line x1="0" y1="-10" x2="0" y2="-25" stroke="#22c55e" strokeWidth="2" />
                  <line x1="10" y1="0" x2="25" y2="0" stroke="#22c55e" strokeWidth="2" />
                  <line x1="0" y1="10" x2="0" y2="25" stroke="#22c55e" strokeWidth="2" />
                  <line x1="-10" y1="0" x2="-25" y2="0" stroke="#22c55e" strokeWidth="2" />
                  <text x="0" y="50" textAnchor="middle" fill="#1e293b" fontSize="9">Inside: Pulled equally</text>
                  <text x="0" y="62" textAnchor="middle" fill="#1e293b" fontSize="9">in all directions</text>
                </g>

                {/* Surface molecule */}
                <g transform="translate(200, 60)">
                  <rect x="-50" y="-30" width="100" height="5" fill="#60a5fa" opacity="0.3" />
                  <text x="0" y="-40" textAnchor="middle" fill="#64748b" fontSize="8">Surface</text>
                  <circle cx="0" cy="0" r="10" fill="#ef4444" />
                  <line x1="10" y1="0" x2="25" y2="0" stroke="#22c55e" strokeWidth="2" />
                  <line x1="0" y1="10" x2="0" y2="25" stroke="#22c55e" strokeWidth="2" />
                  <line x1="-10" y1="0" x2="-25" y2="0" stroke="#22c55e" strokeWidth="2" />
                  {/* No upward arrow! */}
                  <text x="0" y="50" textAnchor="middle" fill="#1e293b" fontSize="9">Surface: No pull</text>
                  <text x="0" y="62" textAnchor="middle" fill="#1e293b" fontSize="9">from above!</text>
                </g>
              </svg>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  Surface molecules have <strong>no neighbors above</strong>, so they're pulled
                  inward and sideways more strongly. This creates a "skin" on the water surface.
                </p>

                <div style={{
                  background: 'white',
                  padding: '0.75rem',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#1d4ed8' }}>
                    Water surface tension: γ ≈ 0.072 N/m
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Strong enough to support small insects!
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#7c3aed', marginBottom: '0.75rem' }}>How Soap Propels the Boat</h3>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Soap is a <strong>surfactant</strong> - it breaks hydrogen bonds</li>
                  <li>Behind the boat, surface tension drops (~0.025 N/m)</li>
                  <li>Front still has high tension (~0.072 N/m)</li>
                  <li>Net force: <strong>F = Δγ × L</strong> (tension difference × boat width)</li>
                  <li>Boat accelerates forward until soap spreads everywhere!</li>
                </ol>

                <p style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#fef3c7',
                  borderRadius: 8,
                  fontSize: '0.85rem'
                }}>
                  <strong>Marangoni Effect:</strong> Flow from low surface tension to high surface tension
                  regions. This drives the soap boat and many other phenomena!
                </p>
              </div>
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
              Try a Twist! 🔄
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
              The Liquid Challenge
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              What if we try the soap boat on water that's <strong>already soapy</strong>?
              Or on <strong>cooking oil</strong>?
            </p>

            <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Three containers */}
              <g transform="translate(30, 20)">
                <rect x="0" y="30" width="80" height="50" fill="#3b82f6" rx="5" />
                <text x="40" y="95" textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">
                  Clean Water
                </text>
                <text x="40" y="108" textAnchor="middle" fill="#64748b" fontSize="9">
                  γ = 0.072 N/m
                </text>
              </g>

              <g transform="translate(160, 20)">
                <rect x="0" y="30" width="80" height="50" fill="#a855f7" rx="5" />
                <text x="40" y="95" textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">
                  Soapy Water
                </text>
                <text x="40" y="108" textAnchor="middle" fill="#64748b" fontSize="9">
                  γ = 0.025 N/m
                </text>
              </g>

              <g transform="translate(290, 20)">
                <rect x="0" y="30" width="80" height="50" fill="#fbbf24" rx="5" />
                <text x="40" y="95" textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">
                  Cooking Oil
                </text>
                <text x="40" y="108" textAnchor="middle" fill="#64748b" fontSize="9">
                  γ = 0.032 N/m
                </text>
              </g>
            </svg>

            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Where will the soap boat work best?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Works the same on all three' },
                { id: 'b', text: 'Works best on soapy water (lowest tension)' },
                { id: 'c', text: 'Only works well on clean water' }
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
                Test Each One!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        const liquidColors: Record<string, string> = {
          water: '#3b82f6',
          soapyWater: '#a855f7',
          oil: '#fbbf24'
        };

        const liquidLabels: Record<string, string> = {
          water: 'Clean Water',
          soapyWater: 'Soapy Water',
          oil: 'Cooking Oil'
        };

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Compare Different Liquids
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Select a liquid and try the soap boat!
            </p>

            {/* Liquid selector */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {(['water', 'soapyWater', 'oil'] as const).map(liquid => (
                <button
                  key={liquid}
                  onMouseDown={() => {
                    setLiquidType(liquid);
                    resetTwistSimulation();
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: liquidType === liquid ? liquidColors[liquid] : 'white',
                    color: liquidType === liquid ? 'white' : '#1e293b',
                    border: `2px solid ${liquidColors[liquid]}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {liquidLabels[liquid]}
                </button>
              ))}
            </div>

            <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Container */}
              <rect x="20" y="60" width="360" height="120" fill="#1e293b" rx="8" />
              <rect x="25" y="65" width="350" height="110" fill={liquidColors[liquidType]} rx="5" />

              {/* Boat */}
              <g transform={`translate(${twistBoatPosition}, 55)`}>
                <path d="M 0,15 L 8,30 L 52,30 L 60,15 L 0,15" fill="#854d0e" stroke="#713f12" strokeWidth="2" />
                <rect x="5" y="5" width="50" height="12" fill="#a16207" rx="2" />
                <line x1="30" y1="5" x2="30" y2="-15" stroke="#713f12" strokeWidth="2" />
                <path d="M 30,-15 L 45,-10 L 30,-5" fill="#ef4444" />
              </g>

              {/* Result indicator */}
              {twistSoapAdded && !twistAnimating && (
                <g>
                  <text
                    x="200"
                    y="145"
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {liquidType === 'water'
                      ? '✓ Moved significantly!'
                      : liquidType === 'soapyWater'
                      ? '✗ Barely moved - already low tension!'
                      : '✗ Minimal effect - wrong chemistry!'}
                  </text>
                </g>
              )}

              {/* Liquid info */}
              <text x="200" y="195" textAnchor="middle" fill="#64748b" fontSize="11">
                Surface tension: {surfaceTensions[liquidType]} N/m
              </text>
            </svg>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onMouseDown={addTwistSoap}
                disabled={twistAnimating || twistSoapAdded}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: twistAnimating || twistSoapAdded
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: twistAnimating || twistSoapAdded ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                🧴 Add Soap
              </button>

              <button
                onMouseDown={resetTwistSimulation}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                🔄 Reset
              </button>
            </div>

            {twistSoapAdded && !twistAnimating && (
              <button
                onMouseDown={() => {
                  setShowTwistResult(true);
                  if (twistPrediction === 'c') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
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
                  {twistPrediction === 'c' ? '✓ Correct!' : 'Not quite!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The soap boat only works well on <strong>clean water</strong>! Soapy water already
                  has low surface tension (no gradient to create), and oil has different chemistry
                  that soap doesn't affect the same way.
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
              It's About the Gradient!
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>The Key Insight</h3>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '1rem' }}>
                  The soap boat needs a <strong>surface tension gradient</strong> to work.
                  It's not about having high or low tension - it's about the <em>difference</em>!
                </p>

                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: 10,
                  marginBottom: '1rem'
                }}>
                  <p style={{ fontWeight: 'bold', textAlign: 'center', color: '#ca8a04' }}>
                    Force ∝ Δγ = γ<sub>front</sub> - γ<sub>back</sub>
                  </p>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#fef3c7' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Liquid</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Before Soap</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>After Soap</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Δγ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>Clean Water</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.072</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.025</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: '#22c55e', fontWeight: 'bold' }}>0.047 ✓</td>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: '0.5rem' }}>Soapy Water</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.025</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.025</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>0 ✗</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>Cooking Oil</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>0.032</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>~0.030</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', color: '#f59e0b', fontWeight: 'bold' }}>~0.002</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Why Oil Doesn't Work</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                Soap molecules work by having a <strong>water-loving head</strong> and
                <strong> water-fearing tail</strong>. Oil molecules don't interact with soap
                the same way - there's no hydrogen bonding to disrupt!
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
              Surface Tension in the Real World
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
                    playSound('click');
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
        const score = testQuestions.reduce((acc, tq, i) => {
          if (testAnswers[i] !== undefined && tq.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

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
                    {qi + 1}. {tq.question}
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
                            ? opt.correct
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
                              ? opt.correct
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
                        {opt.text}
                      </button>
                    ))}
                  </div>
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
        const finalScore = testQuestions.reduce((acc, tq, i) => {
          if (testAnswers[i] !== undefined && tq.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚤💧🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Surface Tension Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You now understand the invisible force that lets insects walk on water
              and powers soap boats!
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
                  <li>Surface tension from cohesive forces</li>
                  <li>Surfactants break hydrogen bonds</li>
                  <li>Marangoni effect: flow toward high γ</li>
                  <li>Gradient matters, not absolute value!</li>
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
                  fill={['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'][i % 5]}
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
                onPhaseComplete?.();
                setTestAnswers({});
                setTestSubmitted(false);
                setCompletedApps(new Set());
                resetSimulation();
                resetTwistSimulation();
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
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Soap Boat</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : currentIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ padding: isMobile ? '1rem' : '2rem', paddingTop: '5rem' }}>
        <div style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 700,
          margin: '0 auto',
          background: 'rgba(30, 41, 59, 0.3)',
          backdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: isMobile ? '1.5rem' : '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
