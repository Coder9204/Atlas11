import React, { useState, useEffect, useCallback, useRef } from 'react';

// Gold standard types
type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'simulation_stopped'
  | 'parameter_changed'
  | 'shape_changed'
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

const DragForceRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
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

  // Animation states for skydiver
  const [skydiverY, setSkydiverY] = useState(50);
  const [skydiverVelocity, setSkydiverVelocity] = useState(0);
  const [skydiverShape, setSkydiverShape] = useState<'spread' | 'tucked'>('spread');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showVectors, setShowVectors] = useState(true);
  const [currentDrag, setCurrentDrag] = useState(0);
  const [currentGravity, setCurrentGravity] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const navigationLockRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Web Audio API sound system
  const playSound = useCallback((soundType: 'click' | 'correct' | 'incorrect' | 'complete' | 'transition' | 'whoosh') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundType) {
        case 'click':
        case 'transition':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        case 'whoosh':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
      }
    } catch {
      // Audio not available
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

  // Drag force simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSkydiverY(prev => {
        const mass = 80; // kg
        const g = 9.8; // m/s²
        const gravity = mass * g;

        // Drag coefficient varies with body position
        const dragCoefficient = skydiverShape === 'spread' ? 1.0 : 0.4;
        const area = skydiverShape === 'spread' ? 0.8 : 0.3; // m²
        const airDensity = 1.2; // kg/m³

        // Drag force: F_d = 0.5 * ρ * v² * C_d * A
        const dragForce = 0.5 * airDensity * skydiverVelocity * skydiverVelocity * dragCoefficient * area;
        const netForce = gravity - dragForce;
        const acceleration = netForce / mass;

        const newVelocity = skydiverVelocity + acceleration * 0.1;
        setSkydiverVelocity(newVelocity);
        setCurrentDrag(dragForce);
        setCurrentGravity(gravity);
        setTimeElapsed(t => t + 0.1);

        // Convert to screen position (scaled)
        const newY = prev + newVelocity * 0.5;

        if (newY >= 350) {
          setIsSimulating(false);
          return 350;
        }

        return newY;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, skydiverShape, skydiverVelocity]);

  const startSimulation = useCallback(() => {
    setSkydiverY(50);
    setSkydiverVelocity(0);
    setCurrentDrag(0);
    setTimeElapsed(0);
    setIsSimulating(true);
  }, []);

  const resetSimulation = useCallback(() => {
    setIsSimulating(false);
    setSkydiverY(50);
    setSkydiverVelocity(0);
    setCurrentDrag(0);
    setTimeElapsed(0);
  }, []);

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
    playSound(prediction === 'B' ? 'correct' : 'incorrect');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'C' ? 'correct' : 'incorrect');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const calculateTestScore = useCallback(() => {
    const correctAnswers = [1, 2, 0, 1, 2, 0, 1, 2, 1, 0];
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer === correctAnswers[index]) score++;
    });
    return score;
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const renderPhaseContent = () => {
    switch (phase) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-sky-400 tracking-wide">FLUID DYNAMICS</span>
            </div>

            {/* Main title with gradient */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-transparent">
              The Invisible Force
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-8 leading-relaxed">
              How air resistance shapes the way things fall
            </p>

            {/* Premium card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 max-w-2xl border border-slate-700/50 shadow-2xl shadow-sky-500/5 mb-8">
              <div className="relative w-full max-w-md h-64 rounded-xl overflow-hidden mx-auto">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                {/* Sky background with clouds */}
                <defs>
                  <linearGradient id="skyBg" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87ceeb" />
                    <stop offset="100%" stopColor="#4a90a4" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="300" fill="url(#skyBg)" opacity="0.3" />

                {/* Clouds */}
                <ellipse cx="80" cy="40" rx="40" ry="20" fill="white" opacity="0.6" />
                <ellipse cx="60" cy="50" rx="30" ry="15" fill="white" opacity="0.6" />
                <ellipse cx="320" cy="80" rx="50" ry="25" fill="white" opacity="0.5" />

                {/* Skydiver */}
                <g transform="translate(200, 140)">
                  {/* Body */}
                  <ellipse cx="0" cy="0" rx="25" ry="15" fill="#ff6600" />
                  {/* Head */}
                  <circle cx="0" cy="-20" r="12" fill="#ffcc99" />
                  {/* Helmet */}
                  <ellipse cx="0" cy="-22" rx="14" ry="10" fill="#333" />
                  {/* Arms spread */}
                  <line x1="-25" y1="-5" x2="-60" y2="-15" stroke="#ff6600" strokeWidth="8" strokeLinecap="round" />
                  <line x1="25" y1="-5" x2="60" y2="-15" stroke="#ff6600" strokeWidth="8" strokeLinecap="round" />
                  {/* Legs spread */}
                  <line x1="-10" y1="15" x2="-35" y2="40" stroke="#333" strokeWidth="8" strokeLinecap="round" />
                  <line x1="10" y1="15" x2="35" y2="40" stroke="#333" strokeWidth="8" strokeLinecap="round" />
                </g>

                {/* Air resistance arrows */}
                <g opacity="0.7">
                  <path d="M200 80 L200 110" stroke="#00ff00" strokeWidth="4" markerEnd="url(#arrowUp)" />
                  <path d="M160 100 L175 115" stroke="#00ff00" strokeWidth="3" />
                  <path d="M240 100 L225 115" stroke="#00ff00" strokeWidth="3" />
                </g>

                {/* Gravity arrow */}
                <path d="M200 200 L200 250" stroke="#ff4444" strokeWidth="4">
                  <animate attributeName="stroke-opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                </path>
                <polygon points="200,260 195,245 205,245" fill="#ff4444" />

                {/* Labels */}
                <text x="200" y="275" fontSize="14" fill="#ff4444" textAnchor="middle" fontWeight="bold">Gravity</text>
                <text x="200" y="70" fontSize="14" fill="#00ff00" textAnchor="middle" fontWeight="bold">Drag?</text>
              </svg>
              </div>
              <p className="text-lg text-slate-300 mt-4 mb-2">
                A skydiver spreads their arms and legs wide. They feel an invisible force <span className="text-sky-400 font-bold">pushing up</span> against them.
              </p>
              <p className="text-base text-cyan-400">
                What is this mysterious force fighting against gravity?
              </p>
            </div>

            {/* Premium CTA button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
              className="group relative px-8 py-4 bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Discover Drag Force
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            <p className="mt-6 text-sm text-slate-500">Explore terminal velocity and aerodynamics</p>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              A skydiver can change their falling speed by changing body position. If they tuck into a ball (less surface area), what happens to the <span className="text-sky-400 font-bold">drag force</span>?
            </p>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Drag force increases - more air hits the tucked body' },
                { id: 'B', text: 'Drag force decreases - less surface area to push against' },
                { id: 'C', text: 'Drag force stays the same - only speed matters' },
                { id: 'D', text: 'Drag force disappears - only gravity acts' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                  disabled={showPredictionFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'B'
                      ? 'bg-green-600 text-white'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showPredictionFeedback && (
              <div className="bg-slate-800 p-4 rounded-xl mb-4 max-w-md">
                <p className={`font-bold ${selectedPrediction === 'B' ? 'text-green-400' : 'text-sky-400'}`}>
                  {selectedPrediction === 'B' ? 'Correct!' : 'Not quite!'}
                </p>
                <p className="text-slate-300">
                  Drag force depends on surface area! Less area = less air resistance = faster falling. This is why skydivers can control their speed.
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
                  className="mt-4 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
                >
                  Try the Simulation
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-4">Drag Force Simulator</h2>

            <div className="relative w-full max-w-lg h-80 bg-gradient-to-b from-sky-400/20 to-sky-900/40 rounded-xl mb-4 overflow-hidden">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                {/* Sky gradient */}
                <defs>
                  <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87ceeb" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="400" height="400" fill="url(#skyGradient)" />

                {/* Clouds */}
                <ellipse cx="60" cy="30" rx="35" ry="15" fill="white" opacity="0.5" />
                <ellipse cx="340" cy="50" rx="40" ry="18" fill="white" opacity="0.4" />
                <ellipse cx="200" cy="20" rx="30" ry="12" fill="white" opacity="0.3" />

                {/* Ground */}
                <rect x="0" y="360" width="400" height="40" fill="#2d5a27" />
                <line x1="0" y1="360" x2="400" y2="360" stroke="#1a3a15" strokeWidth="3" />

                {/* Altitude markers */}
                {[100, 200, 300].map(y => (
                  <g key={y}>
                    <line x1="10" y1={y} x2="30" y2={y} stroke="#fff" strokeWidth="1" opacity="0.5" />
                    <text x="35" y={y + 4} fontSize="10" fill="#fff" opacity="0.5">
                      {Math.round((360 - y) / 3.6)}%
                    </text>
                  </g>
                ))}

                {/* Skydiver */}
                <g transform={`translate(200, ${skydiverY})`}>
                  {skydiverShape === 'spread' ? (
                    // Spread eagle position
                    <>
                      <ellipse cx="0" cy="0" rx="25" ry="12" fill="#ff6600" />
                      <circle cx="0" cy="-15" r="10" fill="#ffcc99" />
                      <ellipse cx="0" cy="-17" rx="12" ry="8" fill="#333" />
                      <line x1="-25" y1="0" x2="-55" y2="-10" stroke="#ff6600" strokeWidth="6" strokeLinecap="round" />
                      <line x1="25" y1="0" x2="55" y2="-10" stroke="#ff6600" strokeWidth="6" strokeLinecap="round" />
                      <line x1="-8" y1="12" x2="-25" y2="35" stroke="#333" strokeWidth="6" strokeLinecap="round" />
                      <line x1="8" y1="12" x2="25" y2="35" stroke="#333" strokeWidth="6" strokeLinecap="round" />
                    </>
                  ) : (
                    // Tucked position
                    <>
                      <ellipse cx="0" cy="0" rx="15" ry="20" fill="#ff6600" />
                      <circle cx="0" cy="-18" r="10" fill="#ffcc99" />
                      <ellipse cx="0" cy="-20" rx="12" ry="8" fill="#333" />
                      <ellipse cx="0" cy="15" rx="12" ry="8" fill="#333" />
                    </>
                  )}
                </g>

                {/* Force vectors */}
                {showVectors && skydiverY < 350 && (
                  <>
                    {/* Gravity (red down) */}
                    <line x1="200" y1={skydiverY + 40} x2="200" y2={skydiverY + 40 + Math.min(currentGravity / 20, 60)}
                          stroke="#ff4444" strokeWidth="4" />
                    <polygon points={`200,${skydiverY + 45 + Math.min(currentGravity / 20, 60)} 195,${skydiverY + 35 + Math.min(currentGravity / 20, 60)} 205,${skydiverY + 35 + Math.min(currentGravity / 20, 60)}`}
                             fill="#ff4444" />

                    {/* Drag (green up) */}
                    {currentDrag > 0 && (
                      <>
                        <line x1="200" y1={skydiverY - 30} x2="200" y2={skydiverY - 30 - Math.min(currentDrag / 20, 50)}
                              stroke="#00ff00" strokeWidth="4" />
                        <polygon points={`200,${skydiverY - 35 - Math.min(currentDrag / 20, 50)} 195,${skydiverY - 25 - Math.min(currentDrag / 20, 50)} 205,${skydiverY - 25 - Math.min(currentDrag / 20, 50)}`}
                                 fill="#00ff00" />
                      </>
                    )}
                  </>
                )}

                {/* Stats overlay */}
                <rect x="280" y="10" width="110" height="90" fill="rgba(0,0,0,0.5)" rx="5" />
                <text x="290" y="30" fontSize="11" fill="#fff">Speed: {skydiverVelocity.toFixed(1)} m/s</text>
                <text x="290" y="48" fontSize="11" fill="#ff4444">Gravity: {currentGravity.toFixed(0)} N</text>
                <text x="290" y="66" fontSize="11" fill="#00ff00">Drag: {currentDrag.toFixed(0)} N</text>
                <text x="290" y="84" fontSize="11" fill="#fff">Time: {timeElapsed.toFixed(1)}s</text>
              </svg>
            </div>

            {/* Controls */}
            <div className="flex gap-4 mb-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); setSkydiverShape('spread'); resetSimulation(); }}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  skydiverShape === 'spread' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                Spread Eagle (High Drag)
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); setSkydiverShape('tucked'); resetSimulation(); }}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  skydiverShape === 'tucked' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                Tucked Ball (Low Drag)
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); startSimulation(); }}
                disabled={isSimulating}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-all"
              >
                {isSimulating ? 'Falling...' : 'Jump!'}
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); resetSimulation(); }}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-all"
              >
                Reset
              </button>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={(e) => setShowVectors(e.target.checked)}
                />
                Show Forces
              </label>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(3); }}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl"
            >
              Review the Physics
            </button>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">The Physics of Drag Force</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-slate-800 p-4 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-2">The Drag Equation</h3>
                <div className="bg-slate-900 p-3 rounded text-center mb-2">
                  <span className="text-sky-400 font-mono text-lg">F_d = ½ρv²C_dA</span>
                </div>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li><span className="text-cyan-400">ρ</span> = air density</li>
                  <li><span className="text-cyan-400">v²</span> = velocity squared</li>
                  <li><span className="text-cyan-400">C_d</span> = drag coefficient</li>
                  <li><span className="text-cyan-400">A</span> = cross-sectional area</li>
                </ul>
              </div>

              <div className="bg-slate-800 p-4 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-2">Key Insight: v² Effect</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Drag increases with the <span className="text-yellow-400">square</span> of velocity!
                </p>
                <div className="bg-slate-900 p-2 rounded text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Speed: 10 m/s</span>
                    <span className="text-green-400">Drag: 1x</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Speed: 20 m/s</span>
                    <span className="text-green-400">Drag: 4x</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Speed: 30 m/s</span>
                    <span className="text-green-400">Drag: 9x</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-sky-900/50 to-cyan-900/50 p-4 rounded-xl md:col-span-2">
                <h3 className="text-lg font-bold text-sky-400 mb-2">Why Shape Matters</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🧍</div>
                    <div className="text-orange-400 font-bold">Spread Eagle</div>
                    <div className="text-slate-300">Area: ~0.8 m²</div>
                    <div className="text-slate-300">C_d: ~1.0</div>
                    <div className="text-green-400">High drag = Slow fall</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-2">⚫</div>
                    <div className="text-purple-400 font-bold">Tucked Ball</div>
                    <div className="text-slate-300">Area: ~0.3 m²</div>
                    <div className="text-slate-300">C_d: ~0.4</div>
                    <div className="text-red-400">Low drag = Fast fall</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl"
            >
              Ready for the Twist?
            </button>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist: Golf Ball Dimples</h2>
            <div className="bg-slate-800 p-4 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Golf balls have <span className="text-yellow-400 font-bold">dimples</span> all over their surface.
                This makes the surface <span className="text-sky-400">rougher</span>, not smoother.
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                Why do golf balls fly FARTHER with a rough, dimpled surface?
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'A', text: 'Dimples trap air and make the ball lighter' },
                { id: 'B', text: 'Dimples create more friction with the club' },
                { id: 'C', text: 'Dimples reduce drag by creating turbulent airflow' },
                { id: 'D', text: 'Dimples have no effect - it\'s just tradition' }
              ].map(option => (
                <button
                  key={option.id}
                  onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                  disabled={showTwistFeedback}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'C'
                      ? 'bg-green-600 text-white'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span className="font-bold">{option.id}.</span> {option.text}
                </button>
              ))}
            </div>
            {showTwistFeedback && (
              <div className="bg-slate-800 p-4 rounded-xl max-w-md">
                <p className={`font-bold ${twistPrediction === 'C' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'C' ? 'Exactly right!' : 'Counter-intuitive, isn\'t it?'}
                </p>
                <p className="text-slate-300">
                  Dimples create <span className="text-yellow-400">turbulent</span> airflow that stays attached longer, reducing the low-pressure wake behind the ball.
                  A smooth ball has laminar flow that separates earlier, creating more drag!
                </p>
                <button
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  See the Difference
                </button>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Smooth vs Dimpled Ball</h2>
            <TwistAnimation />
            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
            >
              Understand Why
            </button>
          </div>
        );

      case 6:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Boundary Layer Secret</h2>

            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 rounded-xl max-w-lg mb-6">
              <h3 className="text-lg font-bold text-pink-400 mb-3">Laminar vs Turbulent Flow</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                  <div className="text-2xl mb-1">⚪</div>
                  <div className="text-red-400 font-bold">Smooth Ball</div>
                  <p className="text-slate-300 text-xs">Laminar flow separates early</p>
                  <p className="text-slate-400 text-xs">Large wake = High drag</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                  <div className="text-2xl mb-1">⚽</div>
                  <div className="text-green-400 font-bold">Dimpled Ball</div>
                  <p className="text-slate-300 text-xs">Turbulent flow stays attached</p>
                  <p className="text-slate-400 text-xs">Small wake = Low drag</p>
                </div>
              </div>

              <p className="text-slate-200 text-sm">
                This is called the <span className="text-yellow-400 font-bold">drag crisis</span>: sometimes making a surface rougher
                actually <span className="text-green-400">reduces</span> total drag by preventing flow separation.
              </p>

              <div className="mt-3 bg-slate-800 p-2 rounded text-xs text-slate-400 text-center">
                A dimpled golf ball flies ~2x farther than a smooth one!
              </div>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-xl"
            >
              See Real-World Applications
            </button>
          </div>
        );

      case 7:
        const applications = [
          {
            title: 'Vehicle Aerodynamics',
            description: 'Car designers spend millions reducing drag coefficients. A 10% drag reduction can improve fuel efficiency by 5%. Spoilers, smooth underbodies, and teardrop shapes all fight drag.',
            color: 'from-blue-600 to-indigo-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Car body - streamlined */}
                <path d="M10 60 L20 60 L25 45 L70 40 L90 50 L90 65 L10 65 Z" fill="#3366cc" />
                {/* Windows */}
                <path d="M28 45 L65 42 L70 50 L30 52 Z" fill="#88ccff" />
                {/* Wheels */}
                <circle cx="25" cy="65" r="8" fill="#333" />
                <circle cx="75" cy="65" r="8" fill="#333" />
                {/* Airflow lines */}
                <path d="M5 45 Q50 35 95 45" stroke="#00ff00" strokeWidth="2" strokeDasharray="3,3" fill="none" opacity="0.7">
                  <animate attributeName="stroke-dashoffset" from="0" to="-6" dur="0.5s" repeatCount="indefinite" />
                </path>
                <path d="M5 55 Q50 50 95 55" stroke="#00ff00" strokeWidth="2" strokeDasharray="3,3" fill="none" opacity="0.7">
                  <animate attributeName="stroke-dashoffset" from="0" to="-6" dur="0.5s" repeatCount="indefinite" />
                </path>
              </svg>
            )
          },
          {
            title: 'Cycling Time Trials',
            description: 'At 30 mph, 90% of a cyclist\'s effort fights air resistance! Aero helmets, skin suits, and tucked positions can save minutes in races.',
            color: 'from-yellow-600 to-orange-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Bike frame */}
                <polygon points="30,70 50,50 70,70 50,70" fill="none" stroke="#333" strokeWidth="3" />
                <line x1="50" y1="50" x2="50" y2="35" stroke="#333" strokeWidth="3" />
                {/* Wheels */}
                <circle cx="30" cy="70" r="15" fill="none" stroke="#333" strokeWidth="3" />
                <circle cx="70" cy="70" r="15" fill="none" stroke="#333" strokeWidth="3" />
                {/* Cyclist tucked */}
                <ellipse cx="50" cy="35" rx="15" ry="8" fill="#ff6600" />
                <circle cx="45" cy="28" r="7" fill="#ffcc99" />
                {/* Aero helmet */}
                <ellipse cx="47" cy="27" rx="9" ry="5" fill="#333" />
                <path d="M47 27 L60 30" stroke="#333" strokeWidth="4" />
              </svg>
            )
          },
          {
            title: 'Swimsuit Technology',
            description: 'High-tech swimsuits use textured surfaces (like shark skin) to reduce drag in water. Some suits were so effective they were banned from competition!',
            color: 'from-cyan-600 to-blue-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Water */}
                <rect x="0" y="40" width="100" height="60" fill="#0066cc" opacity="0.3" />
                {/* Swimmer */}
                <ellipse cx="50" cy="50" rx="30" ry="8" fill="#ff6600" />
                <circle cx="20" cy="48" r="8" fill="#ffcc99" />
                {/* Arm extended */}
                <line x1="80" y1="50" x2="95" y2="45" stroke="#ffcc99" strokeWidth="5" strokeLinecap="round" />
                {/* Legs */}
                <line x1="50" y1="58" x2="35" y2="70" stroke="#ffcc99" strokeWidth="5" strokeLinecap="round" />
                {/* Water ripples */}
                <path d="M10 40 Q25 35 40 40 Q55 45 70 40 Q85 35 100 40" stroke="#00ccff" strokeWidth="2" fill="none" opacity="0.6">
                  <animate attributeName="d" values="M10 40 Q25 35 40 40 Q55 45 70 40 Q85 35 100 40;M10 40 Q25 45 40 40 Q55 35 70 40 Q85 45 100 40;M10 40 Q25 35 40 40 Q55 45 70 40 Q85 35 100 40" dur="2s" repeatCount="indefinite" />
                </path>
              </svg>
            )
          },
          {
            title: 'Building Wind Loads',
            description: 'Skyscrapers must withstand enormous wind forces. Engineers use rounded corners, tapered shapes, and openings to reduce drag and prevent dangerous swaying.',
            color: 'from-gray-600 to-slate-600',
            icon: (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Building */}
                <rect x="35" y="20" width="30" height="70" fill="#666" />
                {/* Windows */}
                <rect x="40" y="25" width="8" height="8" fill="#88ccff" />
                <rect x="52" y="25" width="8" height="8" fill="#88ccff" />
                <rect x="40" y="38" width="8" height="8" fill="#88ccff" />
                <rect x="52" y="38" width="8" height="8" fill="#88ccff" />
                <rect x="40" y="51" width="8" height="8" fill="#88ccff" />
                <rect x="52" y="51" width="8" height="8" fill="#88ccff" />
                {/* Wind arrows */}
                <path d="M10 40 L30 40" stroke="#00ccff" strokeWidth="3" markerEnd="url(#arrow)">
                  <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                </path>
                <path d="M10 55 L30 55" stroke="#00ccff" strokeWidth="3">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
                </path>
                {/* Wake turbulence */}
                <path d="M70 45 Q80 40 75 50 Q85 45 80 55" stroke="#ff6666" strokeWidth="2" fill="none" opacity="0.6" />
              </svg>
            )
          }
        ];

        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {applications.map((app, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? `bg-gradient-to-r ${app.color} text-white`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '✓ '}{app.title.split(':')[0]}
                </button>
              ))}
            </div>

            <div className={`bg-gradient-to-r ${applications[activeAppTab].color} p-1 rounded-xl w-full max-w-md`}>
              <div className="bg-slate-900 p-4 rounded-lg">
                <div className="w-24 h-24 mx-auto mb-4">
                  {applications[activeAppTab].icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{applications[activeAppTab].title}</h3>
                <p className="text-slate-300">{applications[activeAppTab].description}</p>
                {!completedApps.has(activeAppTab) && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">
              Completed: {completedApps.size} / {applications.length}
            </p>

            {completedApps.size >= 3 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold rounded-xl"
              >
                Take the Quiz
              </button>
            )}
          </div>
        );

      case 8:
        const questions = [
          {
            q: 'What happens to drag force when you double your speed?',
            options: ['It doubles', 'It quadruples', 'It stays the same', 'It halves'],
            correct: 1
          },
          {
            q: 'Which body position creates MORE air resistance for a skydiver?',
            options: ['Tucked ball', 'Head-first dive', 'Spread eagle', 'All the same'],
            correct: 2
          },
          {
            q: 'In the drag equation F = ½ρv²CdA, what does A represent?',
            options: ['Cross-sectional area', 'Altitude', 'Acceleration', 'Air mass'],
            correct: 0
          },
          {
            q: 'Why do golf balls have dimples?',
            options: ['To look cool', 'To reduce drag via turbulent flow', 'To add weight', 'To improve grip'],
            correct: 1
          },
          {
            q: 'At highway speeds, what percent of a car\'s energy fights air resistance?',
            options: ['About 10%', 'About 25%', 'About 50% or more', 'Less than 5%'],
            correct: 2
          },
          {
            q: 'What shape has the lowest drag coefficient?',
            options: ['Teardrop/streamlined', 'Cube', 'Flat plate', 'Cylinder'],
            correct: 0
          },
          {
            q: 'How does air density affect drag force?',
            options: ['No effect', 'Higher density = more drag', 'Higher density = less drag', 'Only affects fast objects'],
            correct: 1
          },
          {
            q: 'What is the drag coefficient (Cd) a measure of?',
            options: ['Object\'s weight', 'Object\'s speed', 'Object\'s shape efficiency', 'Air temperature'],
            correct: 2
          },
          {
            q: 'Why do cyclists tuck during time trials?',
            options: ['To look professional', 'To reduce frontal area and drag', 'To pedal faster', 'To stay warm'],
            correct: 1
          },
          {
            q: 'What creates the "drag crisis" effect with dimpled surfaces?',
            options: ['Turbulent flow delaying separation', 'Magic', 'Lighter weight', 'More friction'],
            correct: 0
          }
        ];

        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-sky-400 mb-6">Knowledge Check</h2>

            <div className="w-full max-w-lg space-y-4 max-h-96 overflow-y-auto">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-200 mb-3 font-medium">{qIndex + 1}. {question.q}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {question.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                        disabled={showTestResults}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          showTestResults && oIndex === question.correct
                            ? 'bg-green-600 text-white'
                            : showTestResults && testAnswers[qIndex] === oIndex
                            ? 'bg-red-600 text-white'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-2xl font-bold text-sky-400">
                  Score: {calculateTestScore()} / 10
                </p>
                <p className={`text-lg ${calculateTestScore() >= 7 ? 'text-green-400' : 'text-red-400'}`}>
                  {calculateTestScore() >= 7 ? 'Excellent! You\'ve mastered drag force!' : 'Keep practicing! Try the simulation again.'}
                </p>
                {calculateTestScore() >= 7 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); goToPhase(9); }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl"
                  >
                    Claim Your Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 9:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <div className="text-6xl mb-4">🪂</div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 mb-4">
              Drag Force Master!
            </h2>
            <div className="bg-gradient-to-r from-sky-600/20 to-cyan-600/20 border border-sky-500/50 p-6 rounded-xl max-w-md mb-6">
              <p className="text-slate-200 mb-4">
                You&apos;ve mastered the physics of drag force!
              </p>
              <div className="text-left text-sm text-slate-300 space-y-2">
                <p>✓ Drag increases with velocity squared</p>
                <p>✓ Shape and area determine drag coefficient</p>
                <p>✓ Turbulent flow can reduce drag (golf balls)</p>
                <p>✓ Real-world aerodynamic applications</p>
              </div>
            </div>
            <p className="text-cyan-400 font-medium">
              Now you understand why skydivers can control their speed!
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const TwistAnimation: React.FC = () => {
    const [smoothBallX, setSmoothBallX] = useState(50);
    const [dimpledBallX, setDimpledBallX] = useState(50);
    const [isFlying, setIsFlying] = useState(false);

    const startFlight = useCallback(() => {
      if (isFlying) return;
      setIsFlying(true);
      setSmoothBallX(50);
      setDimpledBallX(50);

      let t = 0;
      const interval = setInterval(() => {
        t += 1;
        // Smooth ball slows down faster due to higher drag
        setSmoothBallX(50 + t * 4 * Math.exp(-t * 0.03));
        // Dimpled ball goes much farther
        setDimpledBallX(50 + t * 6 * Math.exp(-t * 0.015));

        if (t >= 60) {
          clearInterval(interval);
          setIsFlying(false);
        }
      }, 50);
    }, [isFlying]);

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-md h-48 bg-gradient-to-b from-sky-300/20 to-green-800/30 rounded-xl overflow-hidden">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            {/* Sky */}
            <rect x="0" y="0" width="400" height="150" fill="#87ceeb" opacity="0.2" />

            {/* Ground */}
            <rect x="0" y="150" width="400" height="50" fill="#2d5a27" />

            {/* Tee */}
            <rect x="40" y="140" width="5" height="15" fill="#8b4513" />

            {/* Labels */}
            <text x="200" y="30" fontSize="14" fill="#aaa" textAnchor="middle">Golf Ball Comparison</text>

            {/* Smooth ball (top, white) */}
            <circle cx={smoothBallX} cy="70" r="10" fill="white" stroke="#ccc" strokeWidth="1" />
            <text x="30" y="75" fontSize="10" fill="#ff6666">Smooth</text>

            {/* Dimpled ball (bottom, with texture) */}
            <circle cx={dimpledBallX} cy="120" r="10" fill="white" stroke="#ccc" strokeWidth="1" />
            {/* Dimple pattern */}
            <circle cx={dimpledBallX - 3} cy="117" r="1.5" fill="#ddd" />
            <circle cx={dimpledBallX + 3} cy="117" r="1.5" fill="#ddd" />
            <circle cx={dimpledBallX} cy="123" r="1.5" fill="#ddd" />
            <circle cx={dimpledBallX - 5} cy="120" r="1.5" fill="#ddd" />
            <circle cx={dimpledBallX + 5} cy="120" r="1.5" fill="#ddd" />
            <text x="30" y="125" fontSize="10" fill="#00ff00">Dimpled</text>

            {/* Distance markers */}
            {[100, 200, 300].map(x => (
              <g key={x}>
                <line x1={x} y1="145" x2={x} y2="155" stroke="#fff" strokeWidth="1" opacity="0.5" />
                <text x={x} y="170" fontSize="8" fill="#fff" textAnchor="middle" opacity="0.5">{x - 50}m</text>
              </g>
            ))}

            {/* Wake visualization */}
            {isFlying && (
              <>
                {/* Large wake behind smooth ball */}
                <ellipse cx={smoothBallX - 20} cy="70" rx="15" ry="10" fill="#ff6666" opacity="0.3" />
                {/* Small wake behind dimpled ball */}
                <ellipse cx={dimpledBallX - 12} cy="120" rx="8" ry="5" fill="#66ff66" opacity="0.3" />
              </>
            )}
          </svg>
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); startFlight(); }}
          disabled={isFlying}
          className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-bold rounded-xl"
        >
          {isFlying ? 'Flying...' : 'Hit Both Balls!'}
        </button>

        <p className="text-slate-400 text-sm mt-2">
          Watch how the dimpled ball flies farther despite having a &quot;rougher&quot; surface!
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/3 rounded-full blur-3xl" />

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-sky-400">Drag Force</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(i); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === i
                    ? 'bg-gradient-to-r from-sky-400 to-cyan-400 w-6 shadow-lg shadow-sky-500/50'
                    : phase > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseLabels[i]}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-16 pb-8">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default DragForceRenderer;
