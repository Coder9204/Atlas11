'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
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

interface InductionHeatingRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    question: 'What causes metal to heat up in an induction cooktop?',
    options: [
      'Direct heat from burning gas',
      'Radiation from a hot coil',
      'Eddy currents induced in the metal pan',
      'Microwaves penetrating the food'
    ],
    correct: 2
  },
  {
    question: 'Why doesn\'t a glass pan heat up on an induction stove?',
    options: [
      'Glass is already too hot',
      'Glass is an insulator - no eddy currents form',
      'The magnetic field passes through glass too fast',
      'Glass reflects the magnetic field'
    ],
    correct: 1
  },
  {
    question: 'How do eddy currents cause heating?',
    options: [
      'They create friction with air molecules',
      'They flow through resistance, converting electrical energy to heat (I²R)',
      'They vibrate at ultrasonic frequencies',
      'They create sparks inside the metal'
    ],
    correct: 1
  },
  {
    question: 'Why is induction cooking more efficient than gas?',
    options: [
      'It uses more electricity',
      'Heat is generated directly in the pan, not wasted on air',
      'Gas burners are turned down',
      'Induction uses nuclear energy'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Induction Cooktops',
    description: 'Oscillating field creates eddy currents in steel/iron pans. 80-90% efficient vs 40% for gas!',
    icon: '🍳'
  },
  {
    title: 'Metal Hardening',
    description: 'Rapid surface heating hardens tool steel without affecting the core. Used for gears and shafts.',
    icon: '⚙️'
  },
  {
    title: 'Induction Furnaces',
    description: 'Melt metals without contamination from fuel combustion. Essential for high-purity alloys.',
    icon: '🔥'
  },
  {
    title: 'Wireless Charging',
    description: 'Similar principle! Oscillating field induces current in your phone\'s receiver coil.',
    icon: '🔋'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const InductionHeatingRenderer: React.FC<InductionHeatingRendererProps> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(4).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [isHeating, setIsHeating] = useState(false);
  const [panMaterial, setPanMaterial] = useState<'steel' | 'aluminum' | 'glass' | 'copper'>('steel');
  const [temperature, setTemperature] = useState(25);
  const [frequency, setFrequency] = useState(25); // kHz
  const [fieldPhase, setFieldPhase] = useState(0);

  // Twist state
  const [twistMaterial, setTwistMaterial] = useState<'steel' | 'aluminum' | 'glass'>('steel');

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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

  // Material properties
  const getMaterialProperties = (mat: string) => {
    const props: Record<string, { conductivity: number; magnetic: boolean; heatingRate: number; color: string }> = {
      steel: { conductivity: 0.7, magnetic: true, heatingRate: 1.0, color: '#6b7280' },
      aluminum: { conductivity: 1.0, magnetic: false, heatingRate: 0.3, color: '#d1d5db' },
      glass: { conductivity: 0, magnetic: false, heatingRate: 0, color: '#93c5fd' },
      copper: { conductivity: 1.0, magnetic: false, heatingRate: 0.4, color: '#f97316' }
    };
    return props[mat] || props.steel;
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  const handlePrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(pred);
    setShowPredictionFeedback(true);
    playSound(pred === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(pred);
    setShowTwistFeedback(true);
    playSound(pred === 'B' ? 'success' : 'failure');
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

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer === TEST_QUESTIONS[index].correct ? 1 : 0), 0);

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setFieldPhase(p => (p + frequency / 10) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [frequency]);

  // Heating simulation
  useEffect(() => {
    if (!isHeating) return;

    const props = getMaterialProperties(panMaterial);
    const interval = setInterval(() => {
      setTemperature(t => {
        const maxTemp = props.heatingRate > 0 ? 400 : 25;
        const rate = props.heatingRate * (frequency / 25);
        if (t >= maxTemp) return maxTemp;
        return t + rate;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isHeating, panMaterial, frequency]);

  // Cooling when not heating
  useEffect(() => {
    if (isHeating || temperature <= 25) return;

    const interval = setInterval(() => {
      setTemperature(t => Math.max(25, t - 0.5));
    }, 100);

    return () => clearInterval(interval);
  }, [isHeating, temperature]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 2) { // play phase
      setIsHeating(false);
      setPanMaterial('steel');
      setTemperature(25);
      setFrequency(25);
    }
    if (phase === 5) { // twist_play phase
      setTwistMaterial('steel');
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────

  const renderInductionCooktop = (material: string, temp: number, heating: boolean, phase: number) => {
    const props = getMaterialProperties(material);
    const tempColor = temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : temp > 50 ? '#fbbf24' : '#6b7280';
    const hasEddyCurrents = heating && props.conductivity > 0;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Cooktop surface */}
        <rect x="50" y="180" width="300" height="30" rx="4" fill="#1f2937" />

        {/* Induction coil (under surface) */}
        <g>
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx="200"
              cy="195"
              rx={30 + i * 15}
              ry={6 + i * 3}
              fill="none"
              stroke={heating ? '#f97316' : '#4b5563'}
              strokeWidth="3"
              opacity={heating ? 0.5 + Math.sin(phase + i) * 0.3 : 0.5}
            />
          ))}
        </g>

        {/* Magnetic field arrows (oscillating) */}
        {heating && (
          <g>
            {[-1, 1].map(side => (
              <g key={side} transform={`translate(${200 + side * 80}, 160)`}>
                <path
                  d={`M 0 30 L 0 ${30 - Math.sin(phase) * 20}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text y="50" textAnchor="middle" className="fill-blue-400 text-xs">B</text>
              </g>
            ))}
          </g>
        )}

        {/* Pan */}
        <g>
          {/* Pan body */}
          <ellipse cx="200" cy="175" rx="80" ry="15" fill={tempColor} />
          <rect x="120" y="100" width="160" height="75" fill={props.color} />
          <ellipse cx="200" cy="100" rx="80" ry="20" fill={props.color} />
          <ellipse cx="200" cy="100" rx="70" ry="15" fill="#111827" />

          {/* Handle */}
          <rect x="280" y="125" width="60" height="15" rx="4" fill="#1f2937" />

          {/* Eddy currents in pan (when conducting) */}
          {hasEddyCurrents && (
            <g className="animate-pulse">
              {[...Array(3)].map((_, i) => (
                <ellipse
                  key={i}
                  cx="200"
                  cy={170 - i * 20}
                  rx={60 - i * 10}
                  ry={10 - i * 2}
                  fill="none"
                  stroke={temp > 100 ? '#ef4444' : '#f97316'}
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity={0.6 - i * 0.15}
                  style={{ transform: `rotate(${Math.sin(phase) * 5}deg)`, transformOrigin: '200px 150px' }}
                />
              ))}
            </g>
          )}

          {/* No heating indicator for glass */}
          {material === 'glass' && heating && (
            <text x="200" y="140" textAnchor="middle" className="fill-blue-300 text-sm font-bold">
              No currents!
            </text>
          )}
        </g>

        {/* Temperature display */}
        <rect x="20" y="20" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="70" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Pan Temp</text>
        <text x="70" y="60" textAnchor="middle" className={`text-lg font-bold ${
          temp > 100 ? 'fill-red-400' : 'fill-gray-300'
        }`}>
          {temp.toFixed(0)}°C
        </text>

        {/* Material label */}
        <rect x="280" y="20" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="330" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Material</text>
        <text x="330" y="60" textAnchor="middle" className="fill-white text-sm font-bold capitalize">
          {material}
        </text>

        {/* Power indicator */}
        <rect x="150" y="230" width="100" height="40" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="200" y="250" textAnchor="middle" className="fill-gray-400 text-xs">Induction</text>
        <text x="200" y="265" textAnchor="middle" className={`text-sm font-bold ${
          heating ? 'fill-orange-400' : 'fill-gray-500'
        }`}>
          {heating ? 'ON' : 'OFF'}
        </text>
      </svg>
    );
  };

  const renderEddyCurrentDiagram = () => (
    <svg viewBox="0 0 300 150" className="w-full h-32">
      <rect width="300" height="150" fill="#111827" />

      {/* Changing B field */}
      <g transform="translate(60, 75)">
        <text x="0" y="-50" textAnchor="middle" className="fill-gray-400 text-xs">Changing B field</text>
        <circle r="30" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" />
        <path d="M 0 -20 L 0 20" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowhead)" />
        <text x="0" y="50" textAnchor="middle" className="fill-blue-400 text-xs">↕ B(t)</text>
      </g>

      {/* Arrow */}
      <path d="M 100 75 L 130 75" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrowhead)" />
      <text x="115" y="90" textAnchor="middle" className="fill-yellow-400 text-xs">induces</text>

      {/* Eddy currents in conductor */}
      <g transform="translate(190, 75)">
        <text x="0" y="-50" textAnchor="middle" className="fill-gray-400 text-xs">Metal conductor</text>
        <rect x="-40" y="-30" width="80" height="60" rx="4" fill="#6b7280" />
        {/* Swirling currents */}
        <ellipse cx="0" cy="0" rx="25" ry="15" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4,4" />
        <ellipse cx="0" cy="0" rx="15" ry="8" fill="none" stroke="#ef4444" strokeWidth="2" />
        <text x="0" y="50" textAnchor="middle" className="fill-orange-400 text-xs">Eddy currents → I²R heat</text>
      </g>
    </svg>
  );

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        Heat Without Contact
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how invisible magnetic fields can cook your dinner
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />

        <div className="relative">
          {renderInductionCooktop('steel', 25, false, 0)}

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Induction cooktops boil water in seconds, yet stay cool to touch!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              The heat is generated inside the pan itself, not transferred from the stove.
            </p>
            <div className="pt-2">
              <p className="text-base text-orange-400 font-semibold">
                How does invisible energy create visible heat?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          An oscillating magnetic field passes through a metal pan. What happens inside the metal?
        </p>
        {renderInductionCooktop('steel', 25, false, 0)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The metal vibrates like a speaker' },
          { id: 'B', text: 'Circular currents form and heat the metal (I²R)' },
          { id: 'C', text: 'The metal becomes a permanent magnet' },
          { id: 'D', text: 'Nothing - magnetism doesn\'t affect metal' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && prediction === option.id
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
            Correct! Eddy currents induced by the changing field flow through resistance and generate heat!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToPhase(2); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Induction Heating Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderInductionCooktop(panMaterial, temperature, isHeating, fieldPhase)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Pan Material</label>
          <div className="grid grid-cols-2 gap-2">
            {(['steel', 'aluminum', 'glass', 'copper'] as const).map(mat => (
              <button
                key={mat}
                onMouseDown={(e) => { e.preventDefault(); playSound('click'); setPanMaterial(mat); setTemperature(25); }}
                className={`px-3 py-2 rounded-lg font-bold text-sm capitalize ${panMaterial === mat ? 'bg-orange-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Frequency: {frequency} kHz</label>
          <input type="range" min="10" max="50" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full accent-orange-500" />
          <p className="text-xs text-slate-400 mt-1">Higher frequency = faster heating</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold ${temperature > 100 ? 'text-red-400' : 'text-orange-400'}`}>{temperature.toFixed(0)}°C</div>
            <div className="text-sm text-slate-300">Temperature</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{getMaterialProperties(panMaterial).magnetic ? 'Yes' : 'No'}</div>
            <div className="text-sm text-slate-300">Magnetic</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${getMaterialProperties(panMaterial).heatingRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {getMaterialProperties(panMaterial).heatingRate > 0.5 ? 'HEATING' : getMaterialProperties(panMaterial).heatingRate > 0 ? 'SLOW' : 'NONE'}
            </div>
            <div className="text-sm text-slate-300">Status</div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-6">
        <button onMouseDown={(e) => { e.preventDefault(); playSound('click'); setIsHeating(!isHeating); }} className={`px-4 py-2 rounded-lg font-medium ${isHeating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}>
          {isHeating ? 'Turn Off' : 'Turn On'}
        </button>
      </div>
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-orange-400 mb-2">Key Formula: P = I²R</h3>
        <p className="text-slate-300 text-sm">
          {panMaterial === 'glass' ? 'Glass is an insulator - no eddy currents, no heating!' :
           panMaterial === 'aluminum' || panMaterial === 'copper' ? 'Non-magnetic metal heats slowly (fewer eddy currents)' :
           'Steel heats efficiently - magnetic + conductive!'}
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); setIsHeating(false); goToPhase(3); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Induction Heating</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">How It Works</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>A coil creates an oscillating magnetic field</li>
            <li>Changing field induces circular currents (eddy currents)</li>
            <li>Currents flow through resistance and generate heat (P = I²R)</li>
            <li>Heat is generated directly in the pan!</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Best Materials</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Iron/Steel: Magnetic + resistive = fast heating</li>
            <li>Cast iron: Excellent for induction cooking</li>
            <li>Higher resistance = more I²R heating</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">Poor Materials</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Glass: No free electrons, no currents</li>
            <li>Aluminum: Low resistance, weak heating</li>
            <li>Copper: Too conductive, currents flow too easily</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Efficiency</h3>
          <p className="text-slate-300 text-sm">
            Induction: 80-90% efficient (heat generated directly in pan)<br/>
            Gas: Only 40% efficient (heat escapes into air)
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(4); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover the Material Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Material Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Why do induction cooktops require special pans? What happens if you use aluminum or glass?
        </p>
        <p className="text-lg text-orange-400 font-medium">
          What determines if a material heats up on an induction stove?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'All pans work equally well' },
          { id: 'B', text: 'Non-magnetic/non-conducting pans don\'t heat (or heat poorly)' },
          { id: 'C', text: 'The cooktop will break if wrong pan is used' },
          { id: 'D', text: 'All metal pans work, only glass fails' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            Correct! Only magnetic, conductive materials heat effectively on induction!
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); goToPhase(5); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            Compare Materials
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const materialProps: Record<string, { heats: boolean; rate: string; reason: string; color: string }> = {
      steel: { heats: true, rate: 'Fast', reason: 'Magnetic + moderate resistance = strong eddy currents + I²R heating', color: 'orange' },
      aluminum: { heats: true, rate: 'Slow', reason: 'Conductive but non-magnetic - weak eddy currents', color: 'amber' },
      glass: { heats: false, rate: 'None', reason: 'No free electrons - no currents can form!', color: 'blue' }
    };
    const props = materialProps[twistMaterial];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Material Comparison Lab</h2>
        <div className="flex gap-3 mb-6">
          {(['steel', 'aluminum', 'glass'] as const).map(mat => (
            <button
              key={mat}
              onMouseDown={(e) => { e.preventDefault(); playSound('click'); setTwistMaterial(mat); }}
              className={`px-5 py-2 rounded-lg font-bold capitalize transition-all ${twistMaterial === mat ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {mat}
            </button>
          ))}
        </div>
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
          {renderInductionCooktop(twistMaterial === 'aluminum' ? 'aluminum' : twistMaterial === 'glass' ? 'glass' : 'steel', 25, true, fieldPhase)}
        </div>
        <div className={`p-6 rounded-2xl border-2 max-w-md ${props.heats ? 'bg-orange-900/30 border-orange-600' : 'bg-blue-900/30 border-blue-600'}`}>
          <div className="text-center mb-4">
            <span className={`text-3xl font-bold ${props.heats ? 'text-orange-400' : 'text-blue-400'}`}>
              Heating: {props.rate}
            </span>
          </div>
          <p className={`text-center text-lg ${props.heats ? 'text-orange-300' : 'text-blue-300'}`}>
            <span className="font-bold">{twistMaterial.charAt(0).toUpperCase() + twistMaterial.slice(1)}:</span> {props.reason}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-md">
          {Object.entries(materialProps).map(([mat, p]) => (
            <div key={mat} className={`p-3 rounded-lg ${mat === twistMaterial ? 'bg-slate-600' : 'bg-slate-700'}`}>
              <p className="text-white text-xs font-bold capitalize text-center">{mat}</p>
              <p className={`text-xs text-center ${p.heats ? 'text-orange-400' : 'text-blue-400'}`}>{p.rate}</p>
            </div>
          ))}
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(6); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
          Understand Why
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Why Material Matters</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-cyan-400 mb-3">Two Key Properties for Induction</h3>
        <ul className="space-y-2 text-slate-300">
          <li>1. Electrical conductivity - for currents to flow</li>
          <li>2. Magnetic permeability - for stronger field coupling</li>
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-xl">
        <div className="p-4 bg-emerald-900/40 rounded-xl border border-emerald-600 text-center">
          <p className="text-emerald-400 font-bold">Steel/Cast Iron</p>
          <p className="text-slate-400 text-xs mt-1">Conductive + Magnetic</p>
          <p className="text-emerald-300 text-sm font-bold mt-2">BEST</p>
        </div>
        <div className="p-4 bg-amber-900/40 rounded-xl border border-amber-600 text-center">
          <p className="text-amber-400 font-bold">Aluminum</p>
          <p className="text-slate-400 text-xs mt-1">Conductive, Not magnetic</p>
          <p className="text-amber-300 text-sm font-bold mt-2">POOR</p>
        </div>
        <div className="p-4 bg-red-900/40 rounded-xl border border-red-600 text-center">
          <p className="text-red-400 font-bold">Glass</p>
          <p className="text-slate-400 text-xs mt-1">Insulator, Not magnetic</p>
          <p className="text-red-300 text-sm font-bold mt-2">NONE</p>
        </div>
      </div>
      <div className="mt-6 p-4 bg-amber-900/30 rounded-xl border border-amber-600 max-w-xl">
        <p className="text-amber-300 text-sm">
          <strong>Pro Tip:</strong> Induction-ready aluminum pans have a steel plate bonded to the bottom!
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToPhase(7); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Real-World Applications</h2>
      <p className="text-slate-400 mb-6">Explore how induction heating powers modern industry</p>
      <div className="flex border-b border-slate-700 mb-6 max-w-xl w-full">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(i); handleAppComplete(i); }}
            className={`flex-1 py-3 text-center transition-all ${activeAppTab === i ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-xl">{app.icon}</span>
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-xl w-full">
        <h3 className="text-xl font-bold text-orange-400 mb-3">{TRANSFER_APPS[activeAppTab].title}</h3>
        <p className="text-slate-300">{TRANSFER_APPS[activeAppTab].description}</p>
        {completedApps.has(activeAppTab) && (
          <div className="mt-4 text-emerald-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Explored
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-6">
        {TRANSFER_APPS.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${completedApps.has(i) ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        ))}
      </div>
      {completedApps.size >= 4 ? (
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase(8); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
          Take the Test
        </button>
      ) : (
        <p className="mt-6 text-slate-500 text-sm">Explore all applications to continue ({completedApps.size}/4)</p>
      )}
    </div>
  );

  const renderTest = () => {
    const score = calculateScore();
    const allAnswered = testAnswers.every(a => a !== -1);

    if (showTestResults) {
      const passed = score >= 3;
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{passed ? 'Excellent!' : 'Keep Learning!'}</h2>
          <p className="text-slate-300 mb-6 max-w-md">
            {passed ? 'You have a solid understanding of induction heating!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); if (passed) { goToPhase(9); } else { setTestAnswers(Array(4).fill(-1)); setShowTestResults(false); } }}
            className={`px-6 py-3 font-semibold rounded-xl ${passed ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'}`}
          >
            {passed ? 'Complete Mastery' : 'Try Again'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Check</h2>
        <div className="flex gap-2 mb-6">
          {TEST_QUESTIONS.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${testAnswers[i] !== -1 ? (testAnswers[i] === TEST_QUESTIONS[i].correct ? 'bg-emerald-400' : 'bg-red-400') : 'bg-slate-600'}`} />
          ))}
        </div>
        <div className="space-y-6 max-w-xl w-full">
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    disabled={testAnswers[qIndex] !== -1}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? oIndex === q.correct ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                        : testAnswers[qIndex] !== -1 && oIndex === q.correct ? 'bg-emerald-600/40 border-2 border-emerald-400'
                        : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {allAnswered && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); playSound(score >= 3 ? 'complete' : 'failure'); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            See Results
          </button>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-amber-500/30">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-white mb-4">Induction Heating Master!</h1>
      <p className="text-lg text-slate-400 max-w-md mb-8">
        You have mastered the physics of contactless heating through electromagnetic induction
      </p>
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 max-w-md border border-slate-700/50 mb-8">
        <h3 className="text-lg font-semibold text-orange-400 mb-4">Key Concepts Mastered</h3>
        <ul className="space-y-3 text-left">
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> Eddy currents from changing magnetic fields
          </li>
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> I²R heating in resistive materials
          </li>
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> Material selection for optimal heating
          </li>
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> Industrial applications of induction
          </li>
        </ul>
      </div>
      <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl p-4 max-w-md mb-8">
        <p className="text-orange-300 text-sm">
          Key Insight: Heat without direct contact - oscillating fields make currents, currents make heat!
        </p>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('complete'); onGameEvent?.({ type: 'mastery_achieved' }); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Claim Your Badge
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      </button>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Induction Heating</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default InductionHeatingRenderer;
