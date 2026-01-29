'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Game event interface for AI coach integration
interface GameEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
  phase: string;
}

// String-based phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface BoilingPressureRendererProps {
  onBack?: () => void;
  onPhaseComplete?: (phase: Phase) => void;
}

const TEST_QUESTIONS = [
  {
    question: 'Why does water boil at a lower temperature on Mount Everest?',
    options: [
      'The air is colder',
      'There is less atmospheric pressure',
      'There is less oxygen',
      'The water is different at high altitude'
    ],
    correct: 1
  },
  {
    question: 'What does a pressure cooker do to cooking temperature?',
    options: [
      'Lowers it by removing air',
      'Keeps it exactly at 100C',
      'Raises it by increasing pressure',
      'Has no effect on temperature'
    ],
    correct: 2
  },
  {
    question: 'At what pressure can water boil at room temperature (25C)?',
    options: [
      '1 atmosphere',
      '2 atmospheres',
      'About 0.03 atmospheres (vacuum)',
      'Water cannot boil at 25C'
    ],
    correct: 2
  },
  {
    question: 'Why do pressure cookers cook food faster?',
    options: [
      'Higher pressure pushes heat into food',
      'Higher boiling point means hotter water',
      'Steam moves faster at high pressure',
      'Pressure cookers use less water'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Pressure Cookers',
    description: 'At 2 atm, water boils at ~120C. The extra 20C dramatically speeds cooking - beans in 20 min instead of 2 hours!',
    icon: 'pot'
  },
  {
    title: 'High Altitude Cooking',
    description: 'Denver (1.6km): water boils at 95C. Everest base camp: 85C. Food takes longer because the water is cooler.',
    icon: 'mountain'
  },
  {
    title: 'Vacuum Distillation',
    description: 'Reduce pressure to boil liquids at lower temps. Used to purify heat-sensitive compounds without destroying them.',
    icon: 'beaker'
  },
  {
    title: 'Geysers',
    description: 'Underground water under high pressure stays liquid above 100C. When it reaches the surface - instant explosive boiling!',
    icon: 'geyser'
  }
];

// Antoine equation approximation for water boiling point
function getBoilingPoint(pressureAtm: number): number {
  if (pressureAtm <= 0.01) return 7;
  return 100 + 28.7 * Math.log(pressureAtm);
}

function getWaterState(temp: number, boilingPoint: number): 'solid' | 'liquid' | 'boiling' | 'gas' {
  if (temp <= 0) return 'solid';
  if (temp < boilingPoint - 1) return 'liquid';
  if (temp <= boilingPoint + 5) return 'boiling';
  return 'gas';
}

export default function BoilingPressureRenderer({ onBack, onPhaseComplete }: BoilingPressureRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  // Simulation state
  const [pressure, setPressure] = useState(1.0);
  const [temperature, setTemperature] = useState(25);
  const [heating, setHeating] = useState(false);
  const [bubbles, setBubbles] = useState<{id: number; x: number; y: number; size: number}[]>([]);

  // Twist state - altitude comparison
  const [twistLocation, setTwistLocation] = useState<'sea' | 'denver' | 'everest'>('sea');
  const [twistTemp, setTwistTemp] = useState(25);
  const [twistHeating, setTwistHeating] = useState(false);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const bubbleIdRef = useRef(0);

  // Sound utility
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

  // Emit game events (for logging/analytics)
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      // Event logging placeholder - can be connected to analytics
      console.debug('Game event:', { type, data, timestamp: Date.now(), phase: phaseLabels[phase] });
    },
    [phase]
  );

  // Navigate to phase
  const goToPhase = useCallback(
    (newPhase: Phase) => {
      if (navigationLockRef.current) return;
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;

      navigationLockRef.current = true;
      playSound('transition');
      setPhase(newPhase);
      onPhaseComplete?.(newPhase);

      setTimeout(() => {
        navigationLockRef.current = false;
      }, 400);
    },
    [playSound, onPhaseComplete]
  );

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const getLocationPressure = (loc: 'sea' | 'denver' | 'everest'): number => {
    switch (loc) {
      case 'sea': return 1.0;
      case 'denver': return 0.83;
      case 'everest': return 0.33;
    }
  };

  // Heating effect
  useEffect(() => {
    if (!heating) return;

    const boilingPoint = getBoilingPoint(pressure);
    const interval = setInterval(() => {
      setTemperature(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [heating, pressure]);

  // Bubble generation
  useEffect(() => {
    const boilingPoint = getBoilingPoint(pressure);
    const state = getWaterState(temperature, boilingPoint);

    if (state !== 'boiling') {
      setBubbles([]);
      return;
    }

    const interval = setInterval(() => {
      setBubbles(prev => {
        const updated = prev
          .map(b => ({ ...b, y: b.y - 3 }))
          .filter(b => b.y > 120);

        if (Math.random() > 0.3) {
          const nearBoiling = temperature >= boilingPoint;
          const intensity = nearBoiling ? 3 : 1;
          for (let i = 0; i < intensity; i++) {
            updated.push({
              id: bubbleIdRef.current++,
              x: 100 + Math.random() * 200,
              y: 220 + Math.random() * 20,
              size: 3 + Math.random() * 6
            });
          }
        }

        return updated;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [temperature, pressure]);

  // Twist heating effect
  useEffect(() => {
    if (!twistHeating) return;

    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    const interval = setInterval(() => {
      setTwistTemp(t => {
        if (t >= boilingPoint + 5) return boilingPoint + 5;
        return t + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [twistHeating, twistLocation]);

  // Reset when returning to play/twist_play
  useEffect(() => {
    if (phase === 'play') {
      setTemperature(25);
      setHeating(false);
      setPressure(1.0);
    }
    if (phase === 'twist_play') {
      setTwistTemp(25);
      setTwistHeating(false);
      setTwistLocation('sea');
    }
  }, [phase]);

  // Render beaker visualization
  const renderBeaker = (temp: number, pres: number, currentBubbles: typeof bubbles) => {
    const boilingPoint = getBoilingPoint(pres);
    const state = getWaterState(temp, boilingPoint);
    const waterColor = state === 'boiling' ? '#60a5fa' : state === 'gas' ? '#93c5fd' : '#3b82f6';

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Background */}
        <rect width="400" height="280" fill="#1e293b" />

        {/* Pressure gauge */}
        <rect x="20" y="20" width="80" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="60" y="40" textAnchor="middle" fill="#94a3b8" fontSize="11">Pressure</text>
        <text x="60" y="60" textAnchor="middle" fill="#22d3ee" fontSize="14" fontWeight="bold">
          {pres.toFixed(2)} atm
        </text>

        {/* Temperature display */}
        <rect x="300" y="20" width="80" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="340" y="40" textAnchor="middle" fill="#94a3b8" fontSize="11">Temperature</text>
        <text x="340" y="60" textAnchor="middle" fill="#fb923c" fontSize="14" fontWeight="bold">
          {temp.toFixed(0)}C
        </text>

        {/* Boiling point indicator */}
        <rect x="160" y="20" width="80" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="200" y="40" textAnchor="middle" fill="#94a3b8" fontSize="11">Boils at</text>
        <text x="200" y="60" textAnchor="middle" fill="#f87171" fontSize="14" fontWeight="bold">
          {boilingPoint.toFixed(0)}C
        </text>

        {/* Beaker outline */}
        <path
          d="M 100 90 L 100 240 Q 100 260 120 260 L 280 260 Q 300 260 300 240 L 300 90"
          fill="none"
          stroke="#6b7280"
          strokeWidth="4"
        />

        {/* Water */}
        <path
          d="M 104 120 L 104 236 Q 104 256 124 256 L 276 256 Q 296 256 296 236 L 296 120 Z"
          fill={waterColor}
          fillOpacity={state === 'gas' ? 0.3 : 0.7}
        />

        {/* Bubbles */}
        {currentBubbles.map(b => (
          <circle
            key={b.id}
            cx={b.x}
            cy={b.y}
            r={b.size}
            fill="white"
            fillOpacity="0.6"
          />
        ))}

        {/* Steam if boiling */}
        {state === 'boiling' && (
          <g className="animate-pulse">
            <path d="M 150 85 Q 145 70 150 55" fill="none" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
            <path d="M 200 85 Q 210 65 200 50" fill="none" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
            <path d="M 250 85 Q 255 70 250 55" fill="none" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* Burner */}
        <rect x="120" y="265" width="160" height="15" rx="4" fill="#374151" />
        {heating && (
          <g>
            <ellipse cx="200" cy="265" rx="60" ry="5" fill="#ef4444" fillOpacity="0.6" className="animate-pulse" />
            <ellipse cx="200" cy="263" rx="40" ry="3" fill="#f97316" fillOpacity="0.8" className="animate-pulse" />
          </g>
        )}

        {/* State indicator */}
        <rect x="140" y="170" width="120" height="30" rx="8" fill="#1f2937" fillOpacity="0.9" />
        <text x="200" y="190" textAnchor="middle" fontSize="14" fontWeight="bold" fill={
          state === 'boiling' ? '#fb923c' : state === 'gas' ? '#f87171' : '#60a5fa'
        }>
          {state.toUpperCase()}
        </text>
      </svg>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHASE TRANSITIONS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Why Is Mountain Cooking So Tricky?
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how pressure controls the boiling point of water
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">
            <span className="inline-block">&#127956;&#65039;</span>
            <span className="mx-2">&#9749;</span>
            <span className="inline-block">&#10067;</span>
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Climbers on Mount Everest can't make a proper cup of tea. The water "boils"
              but the tea doesn't steep properly.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              What's going on? At Everest base camp, water boils at only 71C (160F)...
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                The answer involves pressure and phase changes!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
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
          <span className="text-cyan-400">&#10022;</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">&#10022;</span>
          Phase Diagrams
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">&#10022;</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          If you reduce the air pressure around water, what happens to its boiling point?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          'The boiling point increases',
          'The boiling point decreases',
          'The boiling point stays the same',
          'Water can no longer boil'
        ].map((option, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setPrediction(option);
              emitEvent('prediction_made', { prediction: option });
            }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option
                ? i === 1 ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-cyan-600/40 border-2 border-cyan-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${prediction === 'The boiling point decreases' ? "text-emerald-400" : "text-cyan-400"}`}>
            {prediction === 'The boiling point decreases'
              ? "Correct! Lower pressure means water boils at lower temperatures!"
              : "Not quite - lower pressure actually decreases the boiling point!"}
          </p>
          <button
            onMouseDown={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
          >
            Test Your Prediction
          </button>
        </div>
      )}
    </div>
  );

  // Render play phase
  const renderPlay = () => {
    const boilingPoint = getBoilingPoint(pressure);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Pressure and Boiling Point</h2>
        <p className="text-slate-400 mb-6 text-center max-w-md">
          Adjust the pressure and heat the water to see how boiling point changes!
        </p>

        <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 w-full max-w-lg">
          {renderBeaker(temperature, pressure, bubbles)}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-cyan-400 font-medium mb-2">
                Pressure: {pressure.toFixed(2)} atm
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={pressure}
                onChange={(e) => {
                  setPressure(Number(e.target.value));
                  setTemperature(25);
                }}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Vacuum (0.1)</span>
                <span>Sea Level (1.0)</span>
                <span>Pressure Cooker (3.0)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
            <p className="text-slate-300 text-center">
              At <span className="text-cyan-400 font-bold">{pressure.toFixed(2)} atm</span>, water boils at{' '}
              <span className="text-orange-400 font-bold">{boilingPoint.toFixed(0)}C</span>
            </p>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <button
              onMouseDown={() => {
                playSound('click');
                setHeating(!heating);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                heating
                  ? 'bg-red-600 text-white'
                  : 'bg-orange-600 text-white'
              }`}
            >
              {heating ? '&#128293; Stop Heating' : '&#128293; Heat Water'}
            </button>
            <button
              onMouseDown={() => {
                playSound('click');
                setTemperature(25);
                setHeating(false);
              }}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg font-bold"
            >
              &#128260; Reset
            </button>
          </div>
        </div>

        <button
          onMouseDown={() => { setHeating(false); goToNextPhase(); }}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl"
        >
          Understand the Physics
        </button>
      </div>
    );
  };

  // Render review phase
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Why Pressure Changes Boiling Point</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Molecular Battle</h3>
          <p className="text-slate-300 text-sm">
            Boiling occurs when water molecules have enough energy to escape into the air.
            <span className="text-yellow-400 font-bold"> Higher pressure pushes back</span> on the
            surface, requiring more energy (higher temperature) to escape.
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/40 to-teal-900/40 rounded-2xl p-6 border border-cyan-600/30">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Pressure vs Temperature</h3>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <div className="text-lg mb-1">&#127956;&#65039;</div>
              <p className="text-xs text-slate-400">Everest</p>
              <p className="text-cyan-400 font-bold text-sm">0.33 atm</p>
              <p className="text-orange-400 text-sm">71C</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <div className="text-lg mb-1">&#127958;&#65039;</div>
              <p className="text-xs text-slate-400">Sea Level</p>
              <p className="text-cyan-400 font-bold text-sm">1.0 atm</p>
              <p className="text-orange-400 text-sm">100C</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded-lg text-center">
              <div className="text-lg mb-1">&#127858;</div>
              <p className="text-xs text-slate-400">Pressure Cooker</p>
              <p className="text-cyan-400 font-bold text-sm">2.0 atm</p>
              <p className="text-orange-400 text-sm">120C</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-2xl p-6 border border-yellow-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">&#128161; Key Insight</h3>
          <p className="text-slate-300">
            The boiling point isn't a fixed property of water - it depends on the surrounding pressure!
            The Clausius-Clapeyron equation describes this relationship mathematically.
          </p>
        </div>
      </div>

      <button
        onMouseDown={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Render twist predict phase
  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Cooking Challenge</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You need to cook pasta in boiling water. At high altitude where water boils at 85C
          instead of 100C, how will cooking time change?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          'Faster - boiling is boiling',
          'About the same time',
          'Longer - the water is cooler',
          'Impossible - pasta needs 100C water'
        ].map((option, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setTwistPrediction(option);
              emitEvent('twist_prediction_made', { prediction: option });
            }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option
                ? i === 2 ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-purple-600/40 border-2 border-purple-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${twistPrediction === 'Longer - the water is cooler' ? "text-emerald-400" : "text-amber-400"}`}>
            {twistPrediction === 'Longer - the water is cooler'
              ? "Correct! Lower boiling point means cooler water, so cooking takes longer!"
              : "Not quite - the cooler water temperature means longer cooking time!"}
          </p>
          <button
            onMouseDown={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            See the Difference
          </button>
        </div>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => {
    const twistPressure = getLocationPressure(twistLocation);
    const boilingPoint = getBoilingPoint(twistPressure);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Altitude Cooking Comparison</h2>

        <div className="bg-slate-800/50 rounded-2xl p-6 w-full max-w-lg">
          <div className="flex justify-center gap-2 mb-6">
            {(['sea', 'denver', 'everest'] as const).map(loc => (
              <button
                key={loc}
                onMouseDown={() => {
                  playSound('click');
                  setTwistLocation(loc);
                  setTwistTemp(25);
                  setTwistHeating(false);
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  twistLocation === loc
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {loc === 'sea' ? '&#127958;&#65039; Sea Level' : loc === 'denver' ? '&#127961;&#65039; Denver' : '&#127956;&#65039; Everest'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Altitude</p>
              <p className="text-white font-bold">
                {twistLocation === 'sea' ? '0m' : twistLocation === 'denver' ? '1,600m' : '5,400m'}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Pressure</p>
              <p className="text-cyan-400 font-bold">{twistPressure.toFixed(2)} atm</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Boils at</p>
              <p className="text-orange-400 font-bold">{boilingPoint.toFixed(0)}C</p>
            </div>
          </div>

          <div className="h-32 bg-slate-900/50 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {twistTemp >= boilingPoint ? '&#128168;' : '&#129749;'}
              </div>
              <p className={`font-bold ${twistTemp >= boilingPoint ? 'text-orange-400' : 'text-blue-400'}`}>
                {twistTemp.toFixed(0)}C
              </p>
              <p className="text-slate-400 text-sm">
                {twistTemp >= boilingPoint ? 'BOILING!' : 'Heating...'}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onMouseDown={() => {
                playSound('click');
                setTwistHeating(!twistHeating);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                twistHeating ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
              }`}
            >
              {twistHeating ? '&#9632; Stop' : '&#128293; Heat'}
            </button>
          </div>

          {twistTemp >= boilingPoint && (
            <div className={`mt-4 p-4 rounded-lg border ${
              twistLocation === 'everest'
                ? 'bg-yellow-900/30 border-yellow-600'
                : twistLocation === 'denver'
                  ? 'bg-orange-900/30 border-orange-600'
                  : 'bg-emerald-900/30 border-emerald-600'
            }`}>
              <p className={`text-center ${
                twistLocation === 'everest'
                  ? 'text-yellow-300'
                  : twistLocation === 'denver'
                    ? 'text-orange-300'
                    : 'text-emerald-300'
              }`}>
                {twistLocation === 'everest'
                  ? '&#9888;&#65039; Water boiling at only 71C - pasta will take 50% longer!'
                  : twistLocation === 'denver'
                    ? '&#9888;&#65039; Water at 95C - add ~20% more cooking time'
                    : '&#10003; Perfect 100C for standard cooking times'}
              </p>
            </div>
          )}
        </div>

        <button
          onMouseDown={() => { setTwistHeating(false); goToNextPhase(); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
        >
          Understand the Impact
        </button>
      </div>
    );
  };

  // Render twist review phase
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Cooking Temperature Matters!</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 rounded-2xl p-6 border border-orange-600/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">The Temperature-Time Tradeoff</h3>
          <p className="text-slate-300 text-sm">
            Cooking speed depends on <span className="text-yellow-400 font-bold">temperature, not just boiling</span>.
            At lower boiling points, chemical reactions in food happen slower -
            so cooking takes longer even though the water is "boiling."
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-900/40 to-pink-900/40 rounded-2xl p-6 border border-red-600/30">
          <h4 className="text-lg font-bold text-red-400 mb-2">High Altitude Problems</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Pasta undercooked despite boiling</li>
            <li>Eggs take longer to hardboil</li>
            <li>Baked goods rise too fast, then collapse</li>
            <li>Beans may never fully soften</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30">
          <h4 className="text-lg font-bold text-emerald-400 mb-2">Pressure Cooker Solution</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Raises boiling point to 120C</li>
            <li>Beans in 20 min (vs 2 hours)</li>
            <li>Tough meats become tender fast</li>
            <li>Works at any altitude!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-2xl p-6 border border-yellow-600/30">
          <p className="text-yellow-300 text-sm">
            &#128161; <strong>Fun Fact:</strong> On Mars (0.006 atm), water would boil at body temperature!
            Astronauts will need pressure cookers - or they'll eat very undercooked food.
          </p>
        </div>
      </div>

      <button
        onMouseDown={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        See Real Applications
      </button>
    </div>
  );

  // Render transfer phase
  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-slate-400 text-center mb-6">Explore how pressure affects phase changes</p>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, i]));
              emitEvent('explore_app', { app: app.title });
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              completedApps.has(i)
                ? 'bg-emerald-900/30 border-2 border-emerald-600'
                : 'bg-slate-800/50 border-2 border-slate-700 hover:border-blue-500'
            }`}
          >
            <div className="text-3xl mb-2">
              {app.icon === 'pot' && '&#127858;'}
              {app.icon === 'mountain' && '&#127956;&#65039;'}
              {app.icon === 'beaker' && '&#9879;&#65039;'}
              {app.icon === 'geyser' && '&#128168;'}
            </div>
            <h3 className="text-white font-bold mb-1">{app.title}</h3>
            <p className="text-slate-400 text-sm">{app.description}</p>
            {completedApps.has(i) && (
              <div className="mt-2 text-emerald-400 text-sm">&#10003; Explored</div>
            )}
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={() => { playSound('complete'); goToNextPhase(); }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          Take the Test
        </button>
      )}

      {completedApps.size < 4 && (
        <p className="mt-6 text-center text-slate-500">
          Explore all {4 - completedApps.size} remaining applications to continue
        </p>
      )}
    </div>
  );

  // Render test phase
  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= TEST_QUESTIONS.length;

    if (isComplete) {
      const score = testAnswers.reduce(
        (acc, answer, i) => acc + (answer === TEST_QUESTIONS[i].correct ? 1 : 0),
        0
      );
      const passed = score >= 3;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Test Complete!</h2>
          <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <p className="text-slate-300 mb-6">
            {passed ? 'Excellent understanding of pressure and phase changes!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={() => {
              if (passed) {
                playSound('complete');
                goToNextPhase();
              } else {
                playSound('click');
                setTestAnswers([]);
              }
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg ${
              passed
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
            }`}
          >
            {passed ? 'Complete Lesson' : 'Try Again'}
          </button>
        </div>
      );
    }

    const question = TEST_QUESTIONS[currentQuestion];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Check</h2>
        <div className="flex justify-center gap-2 mb-6">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentQuestion
                  ? testAnswers[i] === TEST_QUESTIONS[i].correct
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                  : i === currentQuestion
                    ? 'bg-blue-500'
                    : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-xl w-full">
          <p className="text-white text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  playSound(i === question.correct ? 'success' : 'failure');
                  setTestAnswers([...testAnswers, i]);
                  emitEvent('test_answer', {
                    questionIndex: currentQuestion,
                    correct: i === question.correct
                  });
                }}
                className="w-full p-4 bg-slate-700/50 text-slate-300 rounded-xl text-left hover:bg-slate-600/50 transition-all"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render mastery phase
  const renderMastery = () => {
    if (!showConfetti) {
      setShowConfetti(true);
      playSound('complete');
      emitEvent('mastery_achieved', {});
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center relative">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  fontSize: `${12 + Math.random() * 12}px`,
                }}
              >
                {["&#127858;", "&#127956;&#65039;", "&#128168;", "&#11088;", "&#10024;"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="relative bg-gradient-to-br from-cyan-900/50 via-blue-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl border border-cyan-600/30">
          <div className="text-8xl mb-6">&#127942;</div>
          <h1 className="text-3xl font-bold text-white mb-4">Phase Diagram Master!</h1>

          <p className="text-xl text-slate-300 mb-6">You've mastered pressure and phase changes!</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#127958;&#65039;</div>
              <p className="text-sm text-slate-300">Pressure-boiling point</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#127956;&#65039;</div>
              <p className="text-sm text-slate-300">Altitude effects</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128200;</div>
              <p className="text-sm text-slate-300">Phase diagrams</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#127858;</div>
              <p className="text-sm text-slate-300">Pressure cooker physics</p>
            </div>
          </div>

          <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-600/30 mb-6">
            <p className="text-blue-300">
              &#127777;&#65039; Key Insight: Boiling point isn't fixed - it's a battle between molecular escape energy and atmospheric pressure!
            </p>
          </div>

          {onBack && (
            <button
              onMouseDown={onBack}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
            >
              Back to Games
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render
  const renderPhase = () => {
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
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Boiling Point Physics</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, i) => {
              const currentIndex = PHASE_ORDER.indexOf(phase);
              return (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase === p
                      ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                      : currentIndex > i
                        ? 'bg-emerald-500 w-2'
                        : 'bg-slate-700 w-2 hover:bg-slate-600'
                  }`}
                  title={phaseLabels[p]}
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
