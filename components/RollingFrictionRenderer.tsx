import React, { useState, useEffect, useCallback, useRef } from 'react';

// Gold standard types
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

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

const RollingFrictionRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [isMobile, setIsMobile] = useState(false);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Animation states
  const [ballPosition, setBallPosition] = useState(0);
  const [boxPosition, setBoxPosition] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [isRacing, setIsRacing] = useState(false);
  const [raceComplete, setRaceComplete] = useState(false);
  const [surfaceType, setSurfaceType] = useState<'smooth' | 'rough' | 'ice'>('smooth');
  const [objectMass, setObjectMass] = useState(1);
  const [showForces, setShowForces] = useState(true);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase sync with external control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const playSound = useCallback((soundType: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
        'success': { freq: 880, type: 'sine', duration: 0.15 },
        'failure': { freq: 220, type: 'square', duration: 0.3 },
        'complete': { freq: 587, type: 'sine', duration: 0.2 },
        'transition': { freq: 440, type: 'sine', duration: 0.1 },
        'click': { freq: 600, type: 'sine', duration: 0.1 }
      };

      const sound = sounds[soundType] || sounds['transition'];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(ctx.currentTime + sound.duration);
    } catch (e) {
      console.log(`Sound: ${soundType}`);
    }
  }, []);

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  // Friction coefficients based on surface
  const getFrictionCoeffs = () => {
    switch (surfaceType) {
      case 'ice': return { sliding: 0.05, rolling: 0.005 };
      case 'rough': return { sliding: 0.8, rolling: 0.08 };
      default: return { sliding: 0.4, rolling: 0.02 };
    }
  };

  // Racing animation
  useEffect(() => {
    if (!isRacing) return;

    const { sliding, rolling } = getFrictionCoeffs();
    const initialVelocity = 10;
    const g = 9.8;

    const interval = setInterval(() => {
      setBallPosition(prev => {
        const decelBall = rolling * g;
        const newPos = prev + (initialVelocity - decelBall * (prev / 5)) * 0.1;
        if (newPos >= 100 || (initialVelocity - decelBall * (newPos / 5)) <= 0) {
          return Math.min(newPos, 100);
        }
        return newPos;
      });

      setBoxPosition(prev => {
        const decelBox = sliding * g;
        const newPos = prev + (initialVelocity - decelBox * (prev / 2)) * 0.1;
        if (newPos >= 100 || (initialVelocity - decelBox * (newPos / 2)) <= 0) {
          return Math.min(newPos, 40);
        }
        return newPos;
      });

      setBallRotation(prev => prev + 15);
    }, 50);

    const timeout = setTimeout(() => {
      setIsRacing(false);
      setRaceComplete(true);
      clearInterval(interval);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRacing, surfaceType]);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const startRace = useCallback(() => {
    setBallPosition(0);
    setBoxPosition(0);
    setBallRotation(0);
    setRaceComplete(false);
    setIsRacing(true);
  }, []);

  const testQuestions = [
    { question: "Rolling friction is typically:", options: ["Equal to sliding friction", "Greater than sliding friction", "Much less than sliding friction", "Zero"], correct: 2 },
    { question: "Why is rolling friction so much lower than sliding friction?", options: ["Rolling objects are lighter", "Less surface deformation and no bonds breaking", "Air lubricates the contact", "Gravity is weaker for round objects"], correct: 1 },
    { question: "The coefficient of rolling friction for a car tire on asphalt is about:", options: ["0.7 - 0.9", "0.3 - 0.5", "0.01 - 0.03", "Exactly 0"], correct: 2 },
    { question: "What causes rolling friction?", options: ["Air resistance only", "Surface deformation and energy loss", "Magnetic effects", "Static electricity"], correct: 1 },
    { question: "Ball bearings reduce friction by:", options: ["Eliminating all contact", "Converting sliding to rolling friction", "Using magnets", "Cooling the surfaces"], correct: 1 },
    { question: "A harder wheel on a harder surface has:", options: ["More rolling friction", "Less rolling friction", "Same rolling friction", "No rolling friction"], correct: 1 },
    { question: "Why do train wheels have such low rolling resistance?", options: ["Trains are heavy", "Steel on steel contact is very hard", "Trains use magnets", "Air pressure is different"], correct: 1 },
    { question: "Inflating car tires properly reduces rolling friction because:", options: ["Less tire deformation", "More air resistance", "Heavier tires", "More grip"], correct: 0 },
    { question: "A shopping cart with stuck wheels demonstrates:", options: ["Zero friction", "Rolling friction only", "Conversion from rolling to sliding friction", "Magnetic resistance"], correct: 2 },
    { question: "The rolling friction force equation is:", options: ["F = μr × N", "F = ma", "F = mv²/r", "F = kx"], correct: 0 }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer === testQuestions[index].correct ? 1 : 0), 0);

  const renderRaceTrack = (size: number = 300) => {
    const { sliding, rolling } = getFrictionCoeffs();
    const ballX = 30 + (size - 80) * (ballPosition / 100);
    const boxX = 30 + (size - 80) * (boxPosition / 100);

    return (
      <svg width={size} height={180} className="mx-auto">
        {/* Background */}
        <rect x="0" y="0" width={size} height="180" fill="#1e293b" rx="10" />

        {/* Track surface */}
        <rect x="20" y="70" width={size - 40} height="8" fill={surfaceType === 'ice' ? '#a5f3fc' : surfaceType === 'rough' ? '#78716c' : '#64748b'} rx="2" />
        <rect x="20" y="130" width={size - 40} height="8" fill={surfaceType === 'ice' ? '#a5f3fc' : surfaceType === 'rough' ? '#78716c' : '#64748b'} rx="2" />

        {/* Track labels */}
        <text x="12" y="76" fill="#22c55e" fontSize="10" fontWeight="bold">🔴</text>
        <text x="12" y="136" fill="#3b82f6" fontSize="10" fontWeight="bold">📦</text>

        {/* Rolling ball */}
        <g transform={`translate(${ballX}, 65)`}>
          <circle cx="0" cy="0" r="12" fill="#ef4444" />
          <g transform={`rotate(${ballRotation})`}>
            <line x1="-8" y1="0" x2="8" y2="0" stroke="white" strokeWidth="2" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="white" strokeWidth="2" />
          </g>
          {showForces && (
            <g>
              {/* Friction force arrow (small for rolling) */}
              <line x1="0" y1="15" x2="-10 * rolling / 0.1" y2="15" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowYellow)" />
              <text x={-15} y="28" fill="#fbbf24" fontSize="8">f_r</text>
            </g>
          )}
        </g>

        {/* Sliding box */}
        <g transform={`translate(${boxX}, 118)`}>
          <rect x="-12" y="-12" width="24" height="24" fill="#3b82f6" rx="3" />
          <rect x="-8" y="-8" width="16" height="16" fill="#60a5fa" rx="2" />
          {showForces && (
            <g>
              {/* Friction force arrow (larger for sliding) */}
              <line x1="0" y1="15" x2={-30 * sliding / 0.5} y2="15" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowYellow)" />
              <text x={-25} y="28" fill="#fbbf24" fontSize="8">f_s</text>
            </g>
          )}
        </g>

        {/* Finish line */}
        <line x1={size - 35} y1="60" x2={size - 35} y2="145" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" />
        <text x={size - 50} y="155" fill="#22c55e" fontSize="10">FINISH</text>

        {/* Race status */}
        {raceComplete && (
          <g>
            <rect x={size/2 - 60} y="10" width="120" height="30" fill="#22c55e" rx="5" />
            <text x={size/2} y="30" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">🔴 Ball Wins!</text>
          </g>
        )}

        {/* Friction comparison */}
        <g transform={`translate(${size/2}, 170)`}>
          <text x="0" y="0" textAnchor="middle" fill="#94a3b8" fontSize="9">
            μ_rolling = {rolling.toFixed(3)} vs μ_sliding = {sliding.toFixed(2)}
          </text>
        </g>

        <defs>
          <marker id="arrowYellow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderFrictionDiagram = () => (
    <svg width="280" height="200" className="mx-auto">
      <rect x="0" y="0" width="280" height="200" fill="#1e293b" rx="10" />

      {/* Rolling object side */}
      <text x="70" y="20" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">Rolling</text>
      <rect x="20" y="120" width="100" height="10" fill="#64748b" />
      <circle cx="70" cy="105" r="15" fill="#ef4444" />
      {/* Tiny contact point */}
      <circle cx="70" cy="119" r="2" fill="#fbbf24" />
      <text x="70" y="145" textAnchor="middle" fill="#94a3b8" fontSize="9">Tiny contact</text>
      <text x="70" y="158" textAnchor="middle" fill="#94a3b8" fontSize="9">point</text>

      {/* Sliding object side */}
      <text x="210" y="20" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">Sliding</text>
      <rect x="160" y="120" width="100" height="10" fill="#64748b" />
      <rect x="185" y="95" width="50" height="25" fill="#3b82f6" rx="3" />
      {/* Large contact area */}
      <line x1="185" y1="120" x2="235" y2="120" stroke="#fbbf24" strokeWidth="4" />
      <text x="210" y="145" textAnchor="middle" fill="#94a3b8" fontSize="9">Large contact</text>
      <text x="210" y="158" textAnchor="middle" fill="#94a3b8" fontSize="9">area + bonds</text>

      {/* Force arrows */}
      <line x1="70" y1="105" x2="40" y2="105" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowYellow2)" />
      <text x="30" y="100" fill="#fbbf24" fontSize="8">f small</text>

      <line x1="210" y1="107" x2="160" y2="107" stroke="#fbbf24" strokeWidth="3" markerEnd="url(#arrowYellow2)" />
      <text x="145" y="102" fill="#fbbf24" fontSize="8">f LARGE</text>

      {/* Key insight */}
      <rect x="40" y="170" width="200" height="25" fill="#22c55e/20" rx="5" />
      <text x="140" y="187" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">Rolling: fresh contact each instant!</text>

      <defs>
        <marker id="arrowYellow2" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
        </marker>
      </defs>
    </svg>
  );

  const applications = [
    {
      title: "Wheels & Tires",
      icon: "🛞",
      description: "Wheels are humanity's greatest friction-reduction invention, converting sliding to rolling contact.",
      details: "Car tires have μ_rolling ≈ 0.01-0.02, compared to sliding rubber at μ_sliding ≈ 0.8. That's 40-80x less friction! Proper inflation reduces rolling resistance further.",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          <rect x="0" y="90" width="200" height="30" fill="#4b5563" />
          {/* Car body */}
          <rect x="40" y="50" width="120" height="35" rx="10" fill="#3b82f6" />
          <rect x="55" y="40" width="70" height="20" rx="5" fill="#60a5fa" />
          {/* Wheels */}
          <circle cx="70" cy="85" r="18" fill="#1f2937" />
          <circle cx="70" cy="85" r="12" fill="#64748b" />
          <circle cx="130" cy="85" r="18" fill="#1f2937" />
          <circle cx="130" cy="85" r="12" fill="#64748b" />
          {/* Motion lines */}
          <line x1="20" y1="70" x2="5" y2="70" stroke="#22c55e" strokeWidth="2" />
          <line x1="20" y1="60" x2="10" y2="60" stroke="#22c55e" strokeWidth="2" />
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">μ_r ≈ 0.015</text>
        </svg>
      )
    },
    {
      title: "Ball Bearings",
      icon: "⚙️",
      description: "Ball bearings convert sliding friction in shafts to rolling friction, enabling smooth rotation.",
      details: "A shaft sliding in a hole has high friction. Ball bearings between shaft and housing roll instead of slide, reducing friction by 100x or more!",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          {/* Outer ring */}
          <circle cx="100" cy="60" r="45" fill="#64748b" />
          <circle cx="100" cy="60" r="30" fill="#1e293b" />
          {/* Balls */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <circle
              key={angle}
              cx={100 + Math.cos(angle * Math.PI / 180) * 37}
              cy={60 + Math.sin(angle * Math.PI / 180) * 37}
              r="6"
              fill="#94a3b8"
            />
          ))}
          {/* Inner shaft */}
          <circle cx="100" cy="60" r="20" fill="#475569" />
          <circle cx="100" cy="60" r="5" fill="#1f2937" />
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">Balls roll, shaft spins free</text>
        </svg>
      )
    },
    {
      title: "Train Wheels",
      icon: "🚂",
      description: "Steel train wheels on steel rails have the lowest rolling friction of any land vehicle.",
      details: "Train wheels achieve μ_r ≈ 0.001! Steel-on-steel is extremely hard, minimizing deformation. One locomotive can pull 100+ freight cars efficiently.",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          {/* Rails */}
          <rect x="0" y="80" width="200" height="8" fill="#78716c" />
          <rect x="0" y="85" width="200" height="20" fill="#57534e" />
          {/* Train car */}
          <rect x="30" y="30" width="140" height="45" fill="#dc2626" rx="5" />
          <rect x="40" y="35" width="30" height="25" fill="#fef3c7" rx="2" />
          <rect x="85" y="35" width="30" height="25" fill="#fef3c7" rx="2" />
          <rect x="130" y="35" width="30" height="25" fill="#fef3c7" rx="2" />
          {/* Wheels */}
          <circle cx="60" cy="78" r="12" fill="#374151" />
          <circle cx="60" cy="78" r="6" fill="#1f2937" />
          <circle cx="140" cy="78" r="12" fill="#374151" />
          <circle cx="140" cy="78" r="6" fill="#1f2937" />
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">μ_r ≈ 0.001 (steel on steel)</text>
        </svg>
      )
    },
    {
      title: "Luggage Wheels",
      icon: "🧳",
      description: "Modern suitcases use spinner wheels to eliminate sliding entirely when changing direction.",
      details: "Traditional 2-wheel luggage slides when turning. 4-wheel spinners roll in any direction, making 50lb bags feel nearly effortless to maneuver.",
      animation: (
        <svg width="200" height="120" className="mx-auto">
          {/* Floor */}
          <rect x="0" y="100" width="200" height="20" fill="#4b5563" />
          {/* Suitcase */}
          <rect x="70" y="20" width="60" height="75" rx="5" fill="#8b5cf6" />
          <rect x="75" y="25" width="50" height="30" fill="#a78bfa" rx="3" />
          <rect x="95" y="5" width="10" height="20" rx="3" fill="#6d28d9" />
          {/* Spinner wheels */}
          <circle cx="80" cy="97" r="6" fill="#1f2937" />
          <circle cx="120" cy="97" r="6" fill="#1f2937" />
          {/* Rotation arrows */}
          <path d="M75,97 A8,8 0 1 1 85,97" fill="none" stroke="#22c55e" strokeWidth="1.5" />
          <path d="M115,97 A8,8 0 1 1 125,97" fill="none" stroke="#22c55e" strokeWidth="1.5" />
          <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">360° spinner wheels</text>
        </svg>
      )
    }
  ];

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-emerald-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>
      {/* Gradient Title */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">Why Do Round Things Roll So Far?</h1>
      <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-8 max-w-2xl border border-white/10">
        {renderRaceTrack(320)}
        <p className="text-xl text-slate-300 mt-6 mb-4">
          Push a ball and a box with the same force. The ball rolls much farther before stopping!
        </p>
        <p className="text-lg text-emerald-400 font-medium">
          What makes rolling so much more efficient than sliding?
        </p>
        <button
          onMouseDown={(e) => { e.preventDefault(); startRace(); }}
          className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
        >
          🏁 Start the Race!
        </button>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-lg font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 shadow-lg"
      >
        Discover the Physics →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A ball and a box are both pushed with the same force on a flat surface. Why does the ball travel much farther?
        </p>
        {renderFrictionDiagram()}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The ball is lighter because it\'s hollow' },
          { id: 'B', text: 'Rolling friction is much smaller than sliding friction' },
          { id: 'C', text: 'The ball stores energy in its spin' },
          { id: 'D', text: 'Air flows around the ball better' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Correct! Rolling friction (μ_r) is typically <span className="text-cyan-400">10-100x smaller</span> than sliding friction!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Rolling vs Sliding Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderRaceTrack(340)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Surface Type</label>
          <div className="flex gap-2">
            {(['smooth', 'rough', 'ice'] as const).map(type => (
              <button
                key={type}
                onMouseDown={(e) => { e.preventDefault(); setSurfaceType(type); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  surfaceType === type ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                {type === 'ice' ? '🧊 Ice' : type === 'rough' ? '🪨 Rough' : '🛤️ Smooth'}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Controls</label>
          <div className="flex gap-2">
            <button
              onMouseDown={(e) => { e.preventDefault(); startRace(); }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
            >
              🏁 Race
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowForces(!showForces); }}
              className={`px-4 py-2 rounded-lg font-medium ${showForces ? 'bg-amber-600' : 'bg-slate-600'} text-white`}
            >
              {showForces ? '⚡ Forces ON' : '⚡ Forces OFF'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Friction Coefficients</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{getFrictionCoeffs().rolling.toFixed(3)}</div>
            <div className="text-sm text-slate-300">μ_rolling (ball)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{getFrictionCoeffs().sliding.toFixed(2)}</div>
            <div className="text-sm text-slate-300">μ_sliding (box)</div>
          </div>
        </div>
        <p className="text-center text-cyan-400 mt-3 text-sm">
          Ratio: <strong>{(getFrictionCoeffs().sliding / getFrictionCoeffs().rolling).toFixed(0)}x</strong> more friction when sliding!
        </p>
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Key Formula: f = μ × N</h3>
        <p className="text-slate-300 text-sm">
          Friction force = coefficient × normal force. With μ_rolling being 20-100x smaller, rolling objects experience far less resistance!
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
      >
        Review the Concepts →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Rolling Friction</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🔴 Why Rolling Friction is Low</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Contact point is always <strong>fresh</strong>—no bonds form</li>
            <li>• Contact area is tiny (ideally a point or line)</li>
            <li>• Minimal surface deformation for hard materials</li>
            <li>• No "plowing" through the surface</li>
            <li>• Energy loss mainly from material compression</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">📦 Why Sliding Friction is High</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>• Same surfaces rubbing continuously</li>
            <li>• Microscopic bonds form and break</li>
            <li>• Large contact area</li>
            <li>• Surface irregularities interlock</li>
            <li>• Heat generated from bond breaking</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-amber-400 mb-3">📊 Typical Friction Coefficients</h3>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-lg font-bold text-emerald-400">0.001 - 0.002</div>
              <div className="text-slate-400">Train wheel on rail</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cyan-400">0.01 - 0.03</div>
              <div className="text-slate-400">Car tire on road</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">0.4 - 0.8</div>
              <div className="text-slate-400">Rubber sliding on concrete</div>
            </div>
          </div>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          When a shopping cart wheel gets stuck and stops rolling, what happens to the friction?
        </p>
        <svg width="200" height="100" className="mx-auto">
          <rect x="0" y="70" width="200" height="30" fill="#4b5563" />
          {/* Cart */}
          <rect x="60" y="20" width="80" height="40" fill="#64748b" rx="5" />
          {/* Good wheel */}
          <circle cx="80" cy="65" r="10" fill="#22c55e" />
          <circle cx="80" cy="65" r="5" fill="#1f2937" />
          {/* Stuck wheel */}
          <circle cx="120" cy="65" r="10" fill="#ef4444" />
          <text x="120" y="68" textAnchor="middle" fill="white" fontSize="8">X</text>
          {/* Drag marks */}
          <line x1="120" y1="75" x2="140" y2="75" stroke="#ef4444" strokeWidth="3" />
          <text x="100" y="95" textAnchor="middle" fill="#94a3b8" fontSize="10">Stuck wheel drags</text>
        </svg>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Friction decreases because wheel stops spinning' },
          { id: 'B', text: 'Friction stays the same—it\'s still touching the ground' },
          { id: 'C', text: 'Friction increases dramatically—rolling becomes sliding' },
          { id: 'D', text: 'Friction disappears because the wheel is locked' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            ✓ Exactly! A stuck wheel converts rolling to sliding friction—up to 50x more resistance!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is why a stuck shopping cart wheel makes the whole cart incredibly hard to push!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            See the Energy Difference →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Rolling vs Locked Wheels</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-3xl">
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-emerald-400 mb-2 text-center">Rolling Wheel</h3>
          <svg width="180" height="120" className="mx-auto">
            <rect x="0" y="80" width="180" height="40" fill="#4b5563" />
            {/* Wheel */}
            <circle cx="90" cy="70" r="25" fill="#22c55e" />
            <circle cx="90" cy="70" r="15" fill="#1f2937" />
            {/* Rotation arrow */}
            <path d="M70,70 A20,20 0 0 1 110,70" fill="none" stroke="white" strokeWidth="2" />
            <polygon points="108,65 115,70 108,75" fill="white" />
            {/* Tiny friction arrow */}
            <line x1="90" y1="98" x2="75" y2="98" stroke="#fbbf24" strokeWidth="2" />
            <text x="65" y="102" fill="#fbbf24" fontSize="9">f</text>
            <text x="90" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">Low friction</text>
          </svg>
          <p className="text-center text-sm text-slate-300 mt-2">Contact point constantly refreshes</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-red-400 mb-2 text-center">Locked Wheel</h3>
          <svg width="180" height="120" className="mx-auto">
            <rect x="0" y="80" width="180" height="40" fill="#4b5563" />
            {/* Drag marks */}
            <rect x="60" y="93" width="60" height="4" fill="#ef4444" opacity="0.5" />
            {/* Wheel */}
            <circle cx="90" cy="70" r="25" fill="#ef4444" />
            <circle cx="90" cy="70" r="15" fill="#1f2937" />
            {/* Lock symbol */}
            <text x="90" y="75" textAnchor="middle" fill="white" fontSize="16">🔒</text>
            {/* Large friction arrow */}
            <line x1="90" y1="98" x2="40" y2="98" stroke="#fbbf24" strokeWidth="4" />
            <text x="30" y="102" fill="#fbbf24" fontSize="9">F!</text>
            <text x="90" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">HIGH friction</text>
          </svg>
          <p className="text-center text-sm text-slate-300 mt-2">Same point drags = sliding friction</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-purple-400 mb-3">Real-World Implications:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• <strong>ABS brakes:</strong> Prevent wheel lock to maintain lower rolling friction + steering control</li>
          <li>• <strong>Flat spots:</strong> Locked train wheels can form flat spots that damage rails</li>
          <li>• <strong>Shopping carts:</strong> A stuck wheel can increase pushing force by 20-50x!</li>
          <li>• <strong>Airplane landing:</strong> Tires "spin up" to avoid initial sliding friction damage</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">
          The key insight: <strong>Never let wheels lock up if you want efficient motion!</strong>
        </p>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        Review the Discovery →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">🌟 Key Discovery</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">Rolling is Nature's Low-Friction Solution!</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            The invention of the wheel was revolutionary because it converts high sliding friction to low rolling friction:
          </p>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-red-400">μ ≈ 0.5</div>
                <div className="text-sm">Sliding (dragging)</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-400">μ ≈ 0.01</div>
                <div className="text-sm">Rolling (wheels)</div>
              </div>
            </div>
            <p className="text-center text-cyan-400 mt-3 font-medium">50x friction reduction!</p>
          </div>
          <p className="text-emerald-400 font-medium">
            This is why wheels, ball bearings, and roller mechanisms are everywhere in engineering!
          </p>
        </div>
      </div>

      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
      >
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-emerald-600 text-white'
              : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>

        {applications[activeAppTab].animation}

        <p className="text-lg text-slate-300 mt-4 mb-3">{applications[activeAppTab].description}</p>
        <p className="text-sm text-slate-400">{applications[activeAppTab].details}</p>

        {!completedApps.has(activeAppTab) && (
          <button
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
          >
            ✓ Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          Take the Knowledge Test →
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); }}
            disabled={testAnswers.includes(-1)}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${
              testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">
            {calculateScore() >= 7 ? 'Excellent! You\'ve mastered rolling friction!' : 'Keep studying! Review and try again.'}
          </p>

          {calculateScore() >= 7 ? (
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase(3); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-emerald-900/50 via-teal-900/50 to-cyan-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🛞</div>
        <h1 className="text-3xl font-bold text-white mb-4">Rolling Friction Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You've mastered the physics of rolling vs sliding friction!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🔴</div>
            <p className="text-sm text-slate-300">Rolling Friction</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">📦</div>
            <p className="text-sm text-slate-300">Sliding Friction</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">⚙️</div>
            <p className="text-sm text-slate-300">Ball Bearings</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">🚂</div>
            <p className="text-sm text-slate-300">Train Wheels</p>
          </div>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          ↺ Explore Again
        </button>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/3 rounded-full blur-3xl" />

      {/* Progress bar header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-slate-400">Rolling Friction</span>
          {/* Premium phase dots */}
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-14 pb-8">
        {renderPhase()}
      </div>
    </div>
  );
};

export default RollingFrictionRenderer;
