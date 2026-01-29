'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ===============================================================================
// TYPES & INTERFACES
// ===============================================================================
interface FaradayCageRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ===============================================================================
// CONSTANTS
// ===============================================================================
const TEST_QUESTIONS = [
  {
    question: 'Why does a Faraday cage block electromagnetic waves?',
    options: [
      { text: 'It absorbs all the energy as heat', correct: false },
      { text: 'Free electrons move to cancel the field inside', correct: true },
      { text: 'The metal reflects all radiation like a mirror', correct: false },
      { text: 'It converts EM waves to sound', correct: false }
    ]
  },
  {
    question: 'Your phone loses signal in an elevator because:',
    options: [
      { text: 'Elevators are too high up', correct: false },
      { text: 'The metal walls act as a Faraday cage', correct: true },
      { text: 'The motor creates interference', correct: false },
      { text: 'Buildings block GPS', correct: false }
    ]
  },
  {
    question: 'Why does mesh work for shielding even though it has holes?',
    options: [
      { text: 'The holes let heat escape', correct: false },
      { text: 'Mesh is cheaper than solid metal', correct: false },
      { text: 'Holes smaller than the wavelength still block waves', correct: true },
      { text: 'The holes are filled with invisible glass', correct: false }
    ]
  },
  {
    question: 'Microwave ovens have a mesh window. What would happen if the holes were larger?',
    options: [
      { text: 'Food would cook faster', correct: false },
      { text: 'Microwaves could leak out and be dangerous', correct: true },
      { text: 'The oven would be more efficient', correct: false },
      { text: 'You couldn\'t see the food', correct: false }
    ]
  },
  {
    question: 'When charges redistribute on a Faraday cage, where do they accumulate?',
    options: [
      { text: 'Uniformly throughout the metal', correct: false },
      { text: 'Only at the corners', correct: false },
      { text: 'On the outer surface of the conductor', correct: true },
      { text: 'In the center of the metal', correct: false }
    ]
  },
  {
    question: 'Why is a car relatively safe during a lightning strike?',
    options: [
      { text: 'The rubber tires insulate you from the ground', correct: false },
      { text: 'The metal body acts as a Faraday cage, directing current around you', correct: true },
      { text: 'Lightning cannot strike moving objects', correct: false },
      { text: 'The car\'s battery absorbs the electricity', correct: false }
    ]
  },
  {
    question: 'A solid metal box vs a metal mesh cage - which provides better shielding?',
    options: [
      { text: 'Solid metal, because it has no gaps', correct: true },
      { text: 'Mesh, because it allows air to circulate', correct: false },
      { text: 'They are exactly equal in effectiveness', correct: false },
      { text: 'Mesh, because it has more surface area', correct: false }
    ]
  },
  {
    question: 'Why might your cell phone still work inside some buildings with metal frames?',
    options: [
      { text: 'Cell signals are too powerful to block', correct: false },
      { text: 'Windows and gaps act as openings larger than the wavelength', correct: true },
      { text: 'Metal frames amplify signals', correct: false },
      { text: 'Modern phones can penetrate any shielding', correct: false }
    ]
  },
  {
    question: 'What happens to the electric field inside a perfect Faraday cage?',
    options: [
      { text: 'It doubles in strength', correct: false },
      { text: 'It oscillates rapidly', correct: false },
      { text: 'It becomes zero', correct: true },
      { text: 'It reverses direction', correct: false }
    ]
  },
  {
    question: 'RFID-blocking wallets use the Faraday cage principle. What are they protecting against?',
    options: [
      { text: 'Heat damage to cards', correct: false },
      { text: 'Unauthorized wireless scanning of card data', correct: true },
      { text: 'Magnetic stripe erasure', correct: false },
      { text: 'Physical bending of cards', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Microwave Ovens',
    description: 'The mesh door keeps 2.45GHz microwaves inside while letting you see your food. Holes are ~1mm, wavelength is 12cm!',
    icon: '🍿'
  },
  {
    title: 'MRI Rooms',
    description: 'Entire rooms are shielded to keep RF signals from interfering with sensitive imaging. Also protects the outside world.',
    icon: '🏥'
  },
  {
    title: 'EMP Protection',
    description: 'Critical electronics in military and infrastructure use Faraday enclosures to survive electromagnetic pulses.',
    icon: '⚡'
  },
  {
    title: 'RFID Blocking Wallets',
    description: 'Metal-lined wallets block the radio signals used to scan contactless cards, preventing wireless theft.',
    icon: '💳'
  }
];

// ===============================================================================
// MAIN COMPONENT
// ===============================================================================
const FaradayCageRenderer: React.FC<FaradayCageRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [cageEnabled, setCageEnabled] = useState(false);
  const [signalStrength, setSignalStrength] = useState(100);
  const [wavePhase, setWavePhase] = useState(0);
  const [meshSize, setMeshSize] = useState<'small' | 'medium' | 'large'>('small');
  const [wavelength, setWavelength] = useState<'long' | 'short'>('long');

  const lastClickRef = useRef(0);

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

  // Animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setWavePhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Update signal based on cage
  useEffect(() => {
    setSignalStrength(cageEnabled ? 5 : 100);
  }, [cageEnabled]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setCageEnabled(false);
      setSignalStrength(100);
    }
    if (phase === 'twist_play') {
      setMeshSize('small');
      setWavelength('long');
    }
  }, [phase]);

  const getShieldingEffectiveness = (mesh: 'small' | 'medium' | 'large', wave: 'long' | 'short'): number => {
    if (mesh === 'small') return 99;
    if (mesh === 'medium') return wave === 'long' ? 95 : 50;
    return wave === 'long' ? 80 : 10;
  };

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

  const submitTest = () => {
    let score = 0;
    TEST_QUESTIONS.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setShowTestResults(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderFaradayCage = (cage: boolean, strength: number, animPhase: number) => {
    const waveAmplitude = 30;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />
        {/* Radio tower */}
        <g>
          <rect x="30" y="100" width="10" height="130" fill="#6b7280" />
          <path d="M 15 100 L 35 60 L 55 100" fill="none" stroke="#6b7280" strokeWidth="4" />
          <circle cx="35" cy="55" r="8" fill="#ef4444" className="animate-pulse" />
          <text x="35" y="250" textAnchor="middle" className="fill-gray-400 text-xs">Signal</text>
        </g>

        {/* EM waves propagating */}
        <g>
          {[...Array(5)].map((_, i) => {
            const x = 80 + i * 40;
            const opacity = cage && x > 200 ? 0.1 : 1 - i * 0.15;
            const blocked = cage && x > 180;
            return (
              <g key={i}>
                <path d={`M ${x} 80 Q ${x + 10} ${80 + Math.sin(animPhase + i) * waveAmplitude} ${x + 20} 80 Q ${x + 30} ${80 - Math.sin(animPhase + i) * waveAmplitude} ${x + 40} 80`} fill="none" stroke={blocked ? '#ef4444' : '#fbbf24'} strokeWidth="3" opacity={blocked ? 0.3 : opacity} />
                <path d={`M ${x} 200 Q ${x + 10} ${200 + Math.sin(animPhase + i) * waveAmplitude} ${x + 20} 200 Q ${x + 30} ${200 - Math.sin(animPhase + i) * waveAmplitude} ${x + 40} 200`} fill="none" stroke={blocked ? '#ef4444' : '#fbbf24'} strokeWidth="3" opacity={blocked ? 0.3 : opacity} />
              </g>
            );
          })}
        </g>

        {/* Faraday cage (when enabled) */}
        {cage && (
          <g>
            <rect x="180" y="50" width="140" height="180" rx="8" fill="none" stroke="#f59e0b" strokeWidth="6" />
            {[...Array(7)].map((_, i) => (<line key={`v${i}`} x1={190 + i * 20} y1="50" x2={190 + i * 20} y2="230" stroke="#f59e0b" strokeWidth="2" />))}
            {[...Array(9)].map((_, i) => (<line key={`h${i}`} x1="180" y1={60 + i * 20} x2="320" y2={60 + i * 20} stroke="#f59e0b" strokeWidth="2" />))}
            {[...Array(4)].map((_, i) => (<circle key={`e${i}`} cx={183 + Math.sin(animPhase * 2 + i) * 3} cy={80 + i * 40} r="4" fill="#3b82f6" className="animate-pulse" />))}
            {[...Array(4)].map((_, i) => (<circle key={`e2${i}`} cx={317 + Math.sin(animPhase * 2 + i + Math.PI) * 3} cy={80 + i * 40} r="4" fill="#3b82f6" className="animate-pulse" />))}
          </g>
        )}

        {/* Phone inside */}
        <g transform="translate(230, 100)">
          <rect x="0" y="0" width="40" height="70" rx="6" fill="#374151" stroke="#6b7280" strokeWidth="2" />
          <rect x="5" y="8" width="30" height="45" fill="#1f2937" />
          <g transform="translate(8, 15)">
            {[...Array(4)].map((_, i) => {
              const barHeight = 5 + i * 4;
              const barStrength = (i + 1) * 25;
              const visible = strength >= barStrength;
              return (<rect key={i} x={i * 7} y={20 - barHeight} width="5" height={barHeight} fill={visible ? '#22c55e' : '#4b5563'} />);
            })}
          </g>
          <text x="20" y="65" textAnchor="middle" className="fill-gray-400 text-xs">{strength > 50 ? 'OK' : 'X'}</text>
        </g>

        {/* Signal strength indicator */}
        <rect x="10" y="10" width="100" height="40" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="60" y="28" textAnchor="middle" className="fill-gray-400 text-xs">Inside Signal</text>
        <text x="60" y="43" textAnchor="middle" className={`text-sm font-bold ${strength > 50 ? 'fill-green-400' : 'fill-red-400'}`}>{strength}%</text>

        {/* Cage status */}
        <rect x="290" y="10" width="100" height="40" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="340" y="28" textAnchor="middle" className="fill-gray-400 text-xs">Cage</text>
        <text x="340" y="43" textAnchor="middle" className={`text-sm font-bold ${cage ? 'fill-yellow-400' : 'fill-gray-500'}`}>{cage ? 'ON' : 'OFF'}</text>
      </svg>
    );
  };

  const renderMeshComparison = (mesh: 'small' | 'medium' | 'large', wave: 'long' | 'short') => {
    const meshSizes = { small: 8, medium: 20, large: 40 };
    const wavelengths = { long: 60, short: 15 };
    const meshPixels = meshSizes[mesh];
    const wavePixels = wavelengths[wave];
    const effectiveness = getShieldingEffectiveness(mesh, wave);
    const penetrates = effectiveness < 50;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />
        <rect x="180" y="40" width="120" height="200" rx="4" fill="none" stroke="#6b7280" strokeWidth="2" />
        <g>
          {[...Array(Math.ceil(120 / meshPixels))].map((_, i) =>
            [...Array(Math.ceil(200 / meshPixels))].map((_, j) => (
              <rect key={`${i}-${j}`} x={180 + i * meshPixels + 2} y={40 + j * meshPixels + 2} width={meshPixels - 4} height={meshPixels - 4} fill="#111827" stroke="#f59e0b" strokeWidth="1" />
            ))
          )}
        </g>
        {/* Incoming waves */}
        <g>
          {[...Array(3)].map((_, i) => {
            const x = 50 + i * 40;
            return (
              <path key={i} d={`M ${x} ${140 - wavePixels / 2} C ${x + 20} ${140 - wavePixels / 2}, ${x + 20} ${140 + wavePixels / 2}, ${x + 40} ${140 + wavePixels / 2} C ${x + 60} ${140 + wavePixels / 2}, ${x + 60} ${140 - wavePixels / 2}, ${x + 80} ${140 - wavePixels / 2}`} fill="none" stroke="#3b82f6" strokeWidth="3" opacity={1 - i * 0.2} />
            );
          })}
        </g>
        {penetrates && (
          <g className="animate-pulse">
            <path d={`M 200 ${140 - wavePixels / 4} C 220 ${140 - wavePixels / 4}, 220 ${140 + wavePixels / 4}, 240 ${140 + wavePixels / 4} C 260 ${140 + wavePixels / 4}, 260 ${140 - wavePixels / 4}, 280 ${140 - wavePixels / 4}`} fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.7" />
          </g>
        )}
        {!penetrates && (
          <g>
            <circle cx="240" cy="140" r="20" fill="#22c55e" fillOpacity="0.2" />
            <text x="240" y="145" textAnchor="middle" className="fill-green-400 text-lg">OK</text>
          </g>
        )}
        <text x="100" y="260" textAnchor="middle" className="fill-blue-400 text-xs">Wave: {wave === 'long' ? '60mm' : '15mm'}</text>
        <text x="240" y="260" textAnchor="middle" className="fill-yellow-400 text-xs">Mesh: {meshPixels}mm holes</text>
        <rect x="20" y="20" width="140" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="90" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Hole vs Wavelength</text>
        <text x="90" y="58" textAnchor="middle" className={`text-sm font-bold ${meshPixels < wavePixels ? 'fill-green-400' : 'fill-red-400'}`}>{meshPixels < wavePixels ? 'BLOCKED' : 'LEAKS'}</text>
        <rect x="280" y="20" width="100" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="330" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Shielding</text>
        <text x="330" y="60" textAnchor="middle" className={`text-lg font-bold ${effectiveness > 80 ? 'fill-green-400' : effectiveness > 40 ? 'fill-yellow-400' : 'fill-red-400'}`}>{effectiveness}%</text>
      </svg>
    );
  };

  const colors = {
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    bgPrimary: '#0f172a',
    bgCard: 'rgba(30, 41, 59, 0.9)',
    bgDark: 'rgba(15, 23, 42, 0.95)',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.4)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-yellow-200 bg-clip-text text-transparent">
              The Invisible Shield
            </h1>
            <p className="text-lg text-slate-400 max-w-md mb-10">
              Why does your phone lose signal in elevators?
            </p>
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5 rounded-3xl" />
              <div className="relative">
                <div className="text-6xl mb-6">📱🛡️</div>
                <div className="mt-4 space-y-4">
                  <p className="text-xl text-white/90 font-medium leading-relaxed">
                    Step into a metal elevator, and your phone signal vanishes.
                  </p>
                  <p className="text-lg text-slate-400 leading-relaxed">
                    Step out, and it returns. The metal box acts like a magical shield against radio waves!
                  </p>
                  <div className="pt-2">
                    <p className="text-base text-amber-400 font-semibold">
                      This is called a &quot;Faraday cage&quot;!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
              <p className="text-lg text-slate-300 mb-4">
                Why does a metal enclosure block electromagnetic waves?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'Metal absorbs all the wave energy as heat' },
                { id: 'B', text: 'Free electrons in metal move to cancel the field inside' },
                { id: 'C', text: 'Metal is simply too dense for waves to pass through' },
                { id: 'D', text: 'The waves bounce back like light off a mirror' }
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
                  Correct! Free electrons redistribute to cancel the incoming electromagnetic field!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!selectedPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Faraday Cage Simulator</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
              {renderFaradayCage(cageEnabled, signalStrength, wavePhase)}
            </div>
            <div className="flex justify-center mt-4">
              <button
                onMouseDown={(e) => { e.preventDefault(); setCageEnabled(!cageEnabled); }}
                className={`px-8 py-4 rounded-lg font-bold text-lg ${cageEnabled ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                {cageEnabled ? 'Cage ON' : 'Cage OFF'}
              </button>
            </div>
            <div className="bg-gradient-to-r from-amber-900/40 to-yellow-900/40 rounded-xl p-4 max-w-2xl w-full mt-6">
              <p className="text-slate-300 text-center">
                {cageEnabled ? (
                  <><span className="text-amber-400 font-bold">Signal blocked!</span> Free electrons redistribute to cancel the incoming field.</>
                ) : (
                  <><span className="text-green-400 font-bold">Full signal!</span> EM waves pass freely to the phone.</>
                )}
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">The Shielding Principle</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
              <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-600">
                <h3 className="text-amber-400 font-bold mb-2">How It Works</h3>
                <p className="text-slate-300">
                  When an EM wave hits a conductor, it pushes free electrons around.
                  These electrons <span className="text-cyan-400 font-bold">redistribute instantly</span> to
                  create an opposing field that cancels the original wave inside!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-blue-400 font-bold mb-2">External Wave</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Oscillating E and B fields</li>
                    <li>Pushes electrons in metal</li>
                    <li>Creates surface currents</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-green-400 font-bold mb-2">Inside</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Surface currents make opposing field</li>
                    <li>Fields cancel out perfectly</li>
                    <li>Net field = zero!</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
                <p className="text-purple-300">
                  <strong>Key Insight:</strong> The cage doesn&apos;t need to be solid!
                  As long as holes are smaller than the wavelength, it still works.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">The Mesh Question</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
              <p className="text-lg text-slate-300 mb-4">
                A Faraday cage with large holes is exposed to waves with a wavelength
                SHORTER than the hole size. What happens?
              </p>
            </div>
            <div className="grid gap-3 w-full max-w-xl">
              {[
                { id: 'A', text: 'Still blocks everything - holes don\'t matter' },
                { id: 'B', text: 'Blocks half the wave' },
                { id: 'C', text: 'Waves leak through - holes are too big!' },
                { id: 'D', text: 'Converts the wave to a different frequency' }
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
                  Correct! When holes are larger than the wavelength, waves can leak through!
                </p>
              </div>
            )}
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">Mesh Size vs Wavelength</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
              {renderMeshComparison(meshSize, wavelength)}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-amber-400 font-medium mb-2">Mesh Hole Size</p>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as const).map(size => (
                      <button key={size} onMouseDown={(e) => { e.preventDefault(); setMeshSize(size); }} className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm ${meshSize === size ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                        {size === 'small' ? '8mm' : size === 'medium' ? '20mm' : '40mm'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-blue-400 font-medium mb-2">Wavelength</p>
                  <div className="flex gap-2">
                    {(['long', 'short'] as const).map(wave => (
                      <button key={wave} onMouseDown={(e) => { e.preventDefault(); setWavelength(wave); }} className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm ${wavelength === wave ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                        {wave === 'long' ? '60mm' : '15mm'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`mt-4 p-4 rounded-lg border ${getShieldingEffectiveness(meshSize, wavelength) > 80 ? 'bg-green-900/30 border-green-600' : getShieldingEffectiveness(meshSize, wavelength) > 40 ? 'bg-yellow-900/30 border-yellow-600' : 'bg-red-900/30 border-red-600'}`}>
                <p className={`text-center ${getShieldingEffectiveness(meshSize, wavelength) > 80 ? 'text-green-300' : getShieldingEffectiveness(meshSize, wavelength) > 40 ? 'text-yellow-300' : 'text-red-300'}`}>
                  <span className="font-bold">Rule:</span> Hole size must be much smaller than wavelength for effective shielding.
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">The Wavelength Rule</h2>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl space-y-4">
              <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
                <h3 className="text-green-400 font-bold mb-2">The Key Principle</h3>
                <p className="text-slate-300">
                  Electromagnetic waves can only &quot;see&quot; obstacles comparable to their wavelength.
                  If a hole is <span className="text-yellow-400 font-bold">much smaller than the wavelength</span>,
                  the wave diffracts around it and can&apos;t pass through!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-cyan-400 font-bold mb-2">Microwave Oven Door</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>Microwaves: wavelength = 12cm</li>
                    <li>Mesh holes: ~1-2mm</li>
                    <li>Holes are 60-100x smaller</li>
                    <li>Result: Safe! Waves blocked</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <h4 className="text-purple-400 font-bold mb-2">WiFi Through Walls</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>WiFi: wavelength = 12cm</li>
                    <li>Wall studs: ~40cm apart</li>
                    <li>Gaps are 3x larger</li>
                    <li>Result: WiFi passes through!</li>
                  </ul>
                </div>
              </div>
              <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
                <p className="text-yellow-300 text-sm">
                  <strong>Real Example:</strong> Your car is a Faraday cage for radio waves (metal body),
                  but you can still make phone calls because cell signals can enter through the windows!
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
              {TRANSFER_APPS.map((app, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index ? 'bg-amber-600 text-white'
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
                <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
                <h3 className="text-xl font-bold text-white">{TRANSFER_APPS[activeAppTab].title}</h3>
              </div>
              <p className="text-lg text-slate-300 mt-4">{TRANSFER_APPS[activeAppTab].description}</p>
              {!completedApps.has(activeAppTab) && (
                <button onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
                  Mark as Understood
                </button>
              )}
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span className="text-slate-400">Progress:</span>
              <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
              <span className="text-slate-400">{completedApps.size}/4</span>
            </div>
          </div>
        </div>
        {renderBottomBar(completedApps.size < 4, completedApps.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (showTestResults) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mx-auto mt-8 text-center">
              <div className="text-6xl mb-4">{testScore >= 3 ? '🎉' : '📚'}</div>
              <h3 className="text-2xl font-bold text-white mb-2">Score: {testScore}/{TEST_QUESTIONS.length}</h3>
              <p className="text-slate-300 mb-6">{testScore >= 7 ? 'Excellent! You understand Faraday cages!' : 'Keep studying! Review and try again.'}</p>
            </div>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mx-auto mt-4" style={{ borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className={`p-2 rounded mb-1 ${opt.correct ? 'bg-emerald-900/30 text-emerald-400' : userAnswer === oIndex ? 'bg-red-900/30 text-red-400' : 'text-slate-400'}`}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
            <div className="space-y-6 max-w-2xl w-full">
              {TEST_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                  <div className="grid gap-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                        className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-amber-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onMouseDown={(e) => { e.preventDefault(); submitTest(); }}
                disabled={testAnswers.includes(null)}
                className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(null) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'}`}
              >
                Submit Answers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
            <div className="bg-gradient-to-br from-amber-900/50 via-yellow-900/50 to-orange-900/50 rounded-3xl p-8 max-w-2xl">
              <div className="text-8xl mb-6">🛡️</div>
              <h1 className="text-3xl font-bold text-white mb-4">Faraday Cage Master!</h1>
              <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered electromagnetic shielding!</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">⚡</div><p className="text-sm text-slate-300">Electron Redistribution</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔲</div><p className="text-sm text-slate-300">Mesh vs Wavelength</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🍿</div><p className="text-sm text-slate-300">Microwave Ovens</p></div>
                <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📱</div><p className="text-sm text-slate-300">Signal Blocking</p></div>
              </div>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default FaradayCageRenderer;
