'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    question: 'Why do all warm objects emit infrared radiation?',
    options: [
      'They have special IR emitting chemicals',
      'Thermal motion of molecules produces electromagnetic radiation',
      'They absorb IR from the sun and re-emit it',
      'Only metal objects emit IR'
    ],
    correct: 1
  },
  {
    question: 'A shiny metal cup and a matte black cup are the same temperature. On an IR camera:',
    options: [
      'They look the same - same temperature means same IR',
      'The shiny cup appears COOLER because it reflects surroundings instead of emitting',
      'The shiny cup appears HOTTER because metal conducts better',
      'IR cameras cannot see metal objects'
    ],
    correct: 1
  },
  {
    question: 'What is emissivity?',
    options: [
      'How hot an object is',
      'How much IR radiation a surface emits compared to a perfect blackbody',
      'The color of an object under normal light',
      'How reflective a surface is to visible light'
    ],
    correct: 1
  },
  {
    question: 'To get accurate temperature readings with an IR camera, you should:',
    options: [
      'Always use a shiny surface',
      'Set the emissivity value to match the surface, or apply high-emissivity tape',
      'Only measure on cloudy days',
      'Point the camera at the sun first to calibrate'
    ],
    correct: 1
  }
];

const TRANSFER_APPS = [
  {
    title: 'Building Inspections',
    description: 'Find heat leaks, missing insulation, and moisture damage by seeing temperature differences.',
    icon: '🏠'
  },
  {
    title: 'Medical Imaging',
    description: 'Detect inflammation, blood flow issues, and fever screening by measuring skin temperature.',
    icon: '🏥'
  },
  {
    title: 'Electrical Maintenance',
    description: 'Find hot spots in electrical panels that indicate loose connections or overloaded circuits.',
    icon: '⚡'
  },
  {
    title: 'Night Vision',
    description: 'Military and wildlife observation use thermal imaging to see warm bodies in total darkness.',
    icon: '🌙'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const InfraredEmissivityRenderer: React.FC<Props> = ({ onGameEvent, currentPhase, onPhaseComplete }) => {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showTestResults, setShowTestResults] = useState(false);

  // Simulation state
  const [viewMode, setViewMode] = useState<'visible' | 'infrared'>('visible');
  const [selectedObject, setSelectedObject] = useState<'hand' | 'cup_matte' | 'cup_shiny' | 'ice'>('hand');
  const [objectTemp, setObjectTemp] = useState(37); // Celsius
  const [ambientTemp] = useState(22);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state
  const [twistViewMode, setTwistViewMode] = useState<'visible' | 'infrared'>('visible');

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Object properties
  const getObjectProps = (obj: string) => {
    const props: Record<string, { emissivity: number; name: string; actualTemp: number; color: string }> = {
      hand: { emissivity: 0.98, name: 'Human Hand', actualTemp: 37, color: '#e8b4a0' },
      cup_matte: { emissivity: 0.95, name: 'Matte Black Cup', actualTemp: objectTemp, color: '#1f2937' },
      cup_shiny: { emissivity: 0.1, name: 'Polished Metal Cup', actualTemp: objectTemp, color: '#9ca3af' },
      ice: { emissivity: 0.96, name: 'Ice Cube', actualTemp: 0, color: '#e0f2fe' }
    };
    return props[obj] || props.hand;
  };

  // Temperature to IR color
  const tempToIRColor = (temp: number, emissivity: number) => {
    // Apparent temperature = emissivity * actual + (1-emissivity) * ambient
    const apparentTemp = emissivity * temp + (1 - emissivity) * ambientTemp;

    // Map to color scale (-10 to 50°C)
    const normalizedTemp = Math.max(0, Math.min(1, (apparentTemp + 10) / 60));

    if (normalizedTemp < 0.25) {
      return `rgb(${Math.floor(normalizedTemp * 4 * 100)}, ${Math.floor(normalizedTemp * 4 * 50)}, ${150 + Math.floor(normalizedTemp * 4 * 105)})`;
    } else if (normalizedTemp < 0.5) {
      return `rgb(${100 + Math.floor((normalizedTemp - 0.25) * 4 * 155)}, ${50 + Math.floor((normalizedTemp - 0.25) * 4 * 200)}, ${255 - Math.floor((normalizedTemp - 0.25) * 4 * 155)})`;
    } else if (normalizedTemp < 0.75) {
      return `rgb(255, ${250 - Math.floor((normalizedTemp - 0.5) * 4 * 100)}, ${100 - Math.floor((normalizedTemp - 0.5) * 4 * 100)})`;
    } else {
      return `rgb(255, ${150 - Math.floor((normalizedTemp - 0.75) * 4 * 150)}, 0)`;
    }
  };

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

  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete, onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 2) {
      setViewMode('visible');
      setSelectedObject('hand');
      setObjectTemp(37);
    }
    if (phase === 5) {
      setTwistViewMode('visible');
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderIRScene = (object: string, infrared: boolean) => {
    const props = getObjectProps(object);
    const irColor = tempToIRColor(props.actualTemp, props.emissivity);
    const apparentTemp = props.emissivity * props.actualTemp + (1 - props.emissivity) * ambientTemp;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Background */}
        <rect width="400" height="280" fill={infrared ? '#0a1628' : '#1e293b'} />

        {/* IR color scale legend */}
        {infrared && (
          <g transform="translate(350, 40)">
            <defs>
              <linearGradient id="irScale" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgb(0, 0, 150)" />
                <stop offset="25%" stopColor="rgb(100, 50, 255)" />
                <stop offset="50%" stopColor="rgb(255, 250, 100)" />
                <stop offset="75%" stopColor="rgb(255, 150, 0)" />
                <stop offset="100%" stopColor="rgb(255, 0, 0)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="20" height="150" fill="url(#irScale)" />
            <text x="25" y="10" className="fill-gray-400 text-xs">50°C</text>
            <text x="25" y="80" className="fill-gray-400 text-xs">20°C</text>
            <text x="25" y="150" className="fill-gray-400 text-xs">-10°C</text>
          </g>
        )}

        {/* Object */}
        <g transform="translate(120, 60)">
          {object === 'hand' && (
            <g>
              {/* Hand shape */}
              <ellipse cx="80" cy="100" rx="50" ry="70" fill={infrared ? irColor : props.color} />
              <ellipse cx="80" cy="40" rx="8" ry="30" fill={infrared ? irColor : props.color} />
              <ellipse cx="95" cy="35" rx="7" ry="35" fill={infrared ? irColor : props.color} />
              <ellipse cx="110" cy="40" rx="6" ry="32" fill={infrared ? irColor : props.color} />
              <ellipse cx="122" cy="50" rx="5" ry="25" fill={infrared ? irColor : props.color} />
              <ellipse cx="50" cy="75" rx="20" ry="10" fill={infrared ? irColor : props.color} transform="rotate(-30, 50, 75)" />

              {/* IR radiation lines */}
              {infrared && (
                <g className="animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <line
                      key={i}
                      x1={80}
                      y1={80}
                      x2={80 + Math.cos(i * Math.PI / 4 + animPhase) * (60 + Math.sin(animPhase + i) * 10)}
                      y2={80 + Math.sin(i * Math.PI / 4 + animPhase) * (60 + Math.sin(animPhase + i) * 10)}
                      stroke={irColor}
                      strokeWidth="2"
                      opacity="0.5"
                    />
                  ))}
                </g>
              )}
            </g>
          )}

          {(object === 'cup_matte' || object === 'cup_shiny') && (
            <g>
              {/* Cup shape */}
              <path
                d={`M 50 40 L 60 160 L 100 160 L 110 40 Z`}
                fill={infrared ? irColor : props.color}
                stroke={object === 'cup_shiny' ? '#d1d5db' : 'none'}
                strokeWidth="2"
              />
              <ellipse cx="80" cy="40" rx="30" ry="10" fill={infrared ? irColor : (object === 'cup_shiny' ? '#6b7280' : '#374151')} />

              {/* Handle */}
              <path
                d="M 110 60 Q 140 70 140 100 Q 140 130 110 140"
                fill="none"
                stroke={infrared ? irColor : (object === 'cup_shiny' ? '#9ca3af' : '#1f2937')}
                strokeWidth="8"
              />

              {/* Shiny reflection indicator */}
              {object === 'cup_shiny' && !infrared && (
                <ellipse cx="75" cy="90" rx="10" ry="25" fill="white" opacity="0.3" />
              )}

              {/* IR radiation */}
              {infrared && props.emissivity > 0.5 && (
                <g className="animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <line
                      key={i}
                      x1={80}
                      y1={100}
                      x2={80 + Math.cos(i * Math.PI / 3 + animPhase) * 50}
                      y2={100 + Math.sin(i * Math.PI / 3 + animPhase) * 50}
                      stroke={irColor}
                      strokeWidth="2"
                      opacity="0.5"
                    />
                  ))}
                </g>
              )}
            </g>
          )}

          {object === 'ice' && (
            <g>
              {/* Ice cube */}
              <polygon
                points="50,60 100,40 130,80 130,140 80,160 30,140 30,80"
                fill={infrared ? irColor : props.color}
                stroke={infrared ? 'none' : '#93c5fd'}
                strokeWidth="2"
              />
              <polygon
                points="50,60 100,40 130,80 80,100"
                fill={infrared ? irColor : '#bfdbfe'}
                opacity="0.7"
              />

              {/* Frost texture */}
              {!infrared && (
                <>
                  <line x1="60" y1="90" x2="70" y2="120" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                  <line x1="90" y1="80" x2="100" y2="130" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
                </>
              )}
            </g>
          )}
        </g>

        {/* Temperature readout */}
        <g transform="translate(20, 240)">
          <text className="fill-gray-400 text-sm">
            {infrared ? `Apparent: ${apparentTemp.toFixed(1)}°C` : `Actual: ${props.actualTemp}°C`}
          </text>
          {infrared && props.emissivity < 0.5 && (
            <text x="0" y="20" className="fill-yellow-400 text-xs">
              ⚠️ Low emissivity - reflects surroundings!
            </text>
          )}
        </g>

        {/* Labels */}
        <text x="200" y="25" textAnchor="middle" className="fill-gray-300 text-sm font-medium">
          {infrared ? '📷 IR Camera View' : '👁️ Normal View'} - {props.name}
        </text>
      </svg>
    );
  };

  const renderTwistScene = (infrared: boolean) => {
    // Two cups at same temperature - one shiny, one matte
    const matteIRColor = tempToIRColor(60, 0.95);
    const shinyIRColor = tempToIRColor(60, 0.1);
    const shinyApparent = 0.1 * 60 + 0.9 * ambientTemp;

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill={infrared ? '#0a1628' : '#1e293b'} />

        {/* Both cups filled with hot water at 60°C */}
        <text x="200" y="25" textAnchor="middle" className="fill-gray-300 text-sm">
          Both cups contain 60°C hot water
        </text>

        {/* Matte cup */}
        <g transform="translate(60, 50)">
          <path
            d="M 30 30 L 40 150 L 100 150 L 110 30 Z"
            fill={infrared ? matteIRColor : '#1f2937'}
          />
          <ellipse cx="70" cy="30" rx="40" ry="12" fill={infrared ? matteIRColor : '#374151'} />
          <path
            d="M 110 50 Q 145 60 145 90 Q 145 120 110 130"
            fill="none"
            stroke={infrared ? matteIRColor : '#1f2937'}
            strokeWidth="10"
          />

          {/* Steam */}
          {!infrared && (
            <g className="animate-pulse">
              {[...Array(3)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${55 + i * 15} 20 Q ${60 + i * 15} ${10 - Math.sin(animPhase + i) * 5} ${55 + i * 15} 0`}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  opacity="0.5"
                />
              ))}
            </g>
          )}

          {/* IR radiation */}
          {infrared && (
            <g className="animate-pulse">
              {[...Array(5)].map((_, i) => (
                <line
                  key={i}
                  x1={70}
                  y1={90}
                  x2={70 + Math.cos(i * Math.PI / 2.5 + animPhase) * 40}
                  y2={90 + Math.sin(i * Math.PI / 2.5 + animPhase) * 40}
                  stroke={matteIRColor}
                  strokeWidth="2"
                  opacity="0.6"
                />
              ))}
            </g>
          )}

          <text x="70" y="180" textAnchor="middle" className="fill-gray-400 text-xs">Matte Black</text>
          <text x="70" y="195" textAnchor="middle" className={infrared ? 'fill-orange-400 text-xs' : 'fill-gray-500 text-xs'}>
            {infrared ? '~58°C' : 'ε = 0.95'}
          </text>
        </g>

        {/* Shiny cup */}
        <g transform="translate(220, 50)">
          <path
            d="M 30 30 L 40 150 L 100 150 L 110 30 Z"
            fill={infrared ? shinyIRColor : '#9ca3af'}
            stroke="#d1d5db"
            strokeWidth="2"
          />
          <ellipse cx="70" cy="30" rx="40" ry="12" fill={infrared ? shinyIRColor : '#6b7280'} />
          <path
            d="M 110 50 Q 145 60 145 90 Q 145 120 110 130"
            fill="none"
            stroke={infrared ? shinyIRColor : '#9ca3af'}
            strokeWidth="10"
          />

          {/* Reflection highlight */}
          {!infrared && (
            <ellipse cx="60" cy="80" rx="8" ry="25" fill="white" opacity="0.3" />
          )}

          {/* Steam */}
          {!infrared && (
            <g className="animate-pulse">
              {[...Array(3)].map((_, i) => (
                <path
                  key={i}
                  d={`M ${55 + i * 15} 20 Q ${60 + i * 15} ${10 - Math.sin(animPhase + i) * 5} ${55 + i * 15} 0`}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  opacity="0.5"
                />
              ))}
            </g>
          )}

          <text x="70" y="180" textAnchor="middle" className="fill-gray-400 text-xs">Polished Metal</text>
          <text x="70" y="195" textAnchor="middle" className={infrared ? 'fill-blue-400 text-xs' : 'fill-gray-500 text-xs'}>
            {infrared ? `~${shinyApparent.toFixed(0)}°C` : 'ε = 0.1'}
          </text>
        </g>

        {/* Explanation */}
        {infrared && (
          <text x="200" y="230" textAnchor="middle" className="fill-yellow-400 text-sm">
            Same temperature, different IR readings! Shiny surface reflects cold room.
          </text>
        )}
      </svg>
    );
  };

  const handlePrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(pred);
    playSound(pred === 'temp' ? 'success' : 'failure');
    onGameEvent?.({ type: 'prediction_made', data: { prediction: pred } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(pred);
    playSound(pred === 'shiny_cold' ? 'success' : 'failure');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction: pred } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    const currentQuestion = testAnswers.length;
    const isCorrect = answerIndex === TEST_QUESTIONS[currentQuestion].correct;
    playSound(isCorrect ? 'success' : 'failure');
    setTestAnswers([...testAnswers, answerIndex]);
    onGameEvent?.({ type: 'test_answered', data: { question: currentQuestion, answer: answerIndex, correct: isCorrect } });
  }, [testAnswers, playSound, onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { app: TRANSFER_APPS[appIndex].title } });
  }, [playSound, onGameEvent]);

  const calculateScore = () => testAnswers.filter((a, i) => a === TEST_QUESTIONS[i].correct).length;

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
        The Invisible Heat Vision
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how thermal cameras reveal hidden temperatures
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🌡️📷</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Thermal cameras can &quot;see&quot; heat! Every warm object glows with invisible
              <span className="text-orange-400 font-semibold"> infrared light</span>.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But here&apos;s a trick: some hot objects appear <span className="text-blue-400 font-semibold">cold</span> on thermal cameras!
            </p>
            <div className="pt-2">
              <p className="text-base text-orange-400 font-semibold">
                How can a hot cup appear cold on a thermal camera?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          You point a thermal camera at your hand. What determines how bright it appears on the camera?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'color', text: 'The color of your skin (darker = more heat)', icon: '🎨' },
          { id: 'temp', text: 'Your body temperature creates infrared radiation', icon: '🌡️' },
          { id: 'motion', text: 'How fast you move your hand', icon: '👋' },
          { id: 'light', text: 'How much visible light is hitting your hand', icon: '💡' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={prediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? option.id === 'temp' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : prediction !== null && option.id === 'temp'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {prediction === 'temp' ? '✓ Correct!' : '✗ Not quite.'} Your body temperature creates infrared radiation!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Experiment: Thermal Imaging</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderIRScene(selectedObject, viewMode === 'infrared')}
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-4">
        <div className="space-y-2">
          <label className="text-gray-400 text-sm">Object:</label>
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value as typeof selectedObject)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
          >
            <option value="hand">Human Hand (37°C)</option>
            <option value="cup_matte">Matte Black Cup</option>
            <option value="cup_shiny">Shiny Metal Cup</option>
            <option value="ice">Ice Cube (0°C)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-gray-400 text-sm">View Mode:</label>
          <button
            onMouseDown={(e) => { e.preventDefault(); playSound('click'); setViewMode(viewMode === 'visible' ? 'infrared' : 'visible'); }}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'infrared'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {viewMode === 'infrared' ? '📷 IR Camera' : '👁️ Normal View'}
          </button>
        </div>
      </div>

      {(selectedObject === 'cup_matte' || selectedObject === 'cup_shiny') && (
        <div className="max-w-lg w-full mb-4">
          <label className="text-gray-400 text-sm">Cup Temperature: {objectTemp}°C</label>
          <input
            type="range"
            min="20"
            max="80"
            value={objectTemp}
            onChange={(e) => setObjectTemp(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
        </div>
      )}

      {viewMode === 'infrared' && (
        <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-orange-300 text-sm">
            <strong>Thermal imaging:</strong> All warm objects emit IR radiation. The camera detects this and
            creates a false-color image showing temperature differences.
            Emissivity (ε) = how well a surface emits IR compared to a perfect &quot;blackbody&quot;.
          </p>
        </div>
      )}

      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
      >
        Continue →
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">How Thermal Imaging Works</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Thermal Motion</h3>
              <p className="text-gray-400 text-sm">All matter above absolute zero has vibrating molecules</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">IR Emission</h3>
              <p className="text-gray-400 text-sm">These vibrations emit electromagnetic radiation (infrared)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Camera Detection</h3>
              <p className="text-gray-400 text-sm">IR sensors measure the radiation and map it to colors</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-orange-900/30 rounded-xl p-4 max-w-lg w-full mb-6 text-center">
        <p className="text-orange-300 font-semibold">Stefan-Boltzmann Law</p>
        <p className="text-gray-400 text-sm mt-1">
          Power radiated = ε × σ × A × T⁴<br />
          Hotter objects radiate exponentially more IR!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-orange-400 font-semibold">{prediction === 'temp' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-red-400 mb-6">🔄 The Twist!</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300">
          You fill TWO cups with the same 60°C hot water. One is <span className="text-gray-400">matte black</span>,
          one is <span className="text-gray-300">polished metal</span>. On the thermal camera:
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
        {[
          { id: 'same', text: 'Both appear the same temperature (60°C)', icon: '=' },
          { id: 'shiny_cold', text: 'Shiny cup appears COOLER than the matte cup', icon: '❄️' },
          { id: 'shiny_hot', text: 'Shiny cup appears HOTTER (metal conducts better)', icon: '🔥' },
          { id: 'invisible', text: 'Shiny cup is invisible to IR cameras', icon: '👻' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? option.id === 'shiny_cold' ? 'border-emerald-500 bg-emerald-900/30' : 'border-red-500 bg-red-900/30'
                : twistPrediction !== null && option.id === 'shiny_cold'
                  ? 'border-emerald-500 bg-emerald-900/30'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'shiny_cold' ? '✓ Correct!' : '✗ Not quite.'} Low emissivity surfaces reflect surroundings!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-red-400 mb-4">The Emissivity Trick</h2>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderTwistScene(twistViewMode === 'infrared')}
      </div>

      <div className="flex justify-center gap-4 mb-4">
        <button
          onMouseDown={(e) => { e.preventDefault(); playSound('click'); setTwistViewMode('visible'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            twistViewMode === 'visible'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          👁️ Normal View
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); playSound('click'); setTwistViewMode('infrared'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            twistViewMode === 'infrared'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          📷 IR Camera
        </button>
      </div>

      {twistViewMode === 'infrared' && (
        <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 rounded-xl p-4 max-w-lg w-full mb-4">
          <p className="text-red-300 text-sm text-center">
            <strong>Low emissivity = reflects surroundings!</strong><br />
            The shiny cup reflects the cold room (~22°C) instead of emitting its own 60°C IR.
          </p>
        </div>
      )}

      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
        className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-pink-500 transition-all"
      >
        Continue →
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-red-400 mb-6">Emissivity Explained</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg w-full mb-6">
        <p className="text-gray-300 text-center mb-4">
          <span className="text-orange-400 font-semibold">Emissivity (ε)</span> is the ratio of IR emitted vs a perfect &quot;blackbody&quot;
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-orange-400 font-semibold">High Emissivity (ε ≈ 1)</div>
            <div className="text-gray-500">Skin, matte paint, paper</div>
            <div className="text-gray-400 text-xs mt-1">→ Emits true temperature</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Low Emissivity (ε ≈ 0.1)</div>
            <div className="text-gray-500">Polished metal, mirrors</div>
            <div className="text-gray-400 text-xs mt-1">→ Reflects surroundings</div>
          </div>
        </div>

        <p className="text-yellow-300 text-sm mt-4 text-center">
          💡 Pro tip: Put electrical tape (ε≈0.95) on shiny surfaces for accurate readings!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-red-400 font-semibold">{twistPrediction === 'shiny_cold' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl text-white font-semibold hover:from-red-500 hover:to-pink-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-gray-400 mb-4">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-6">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={(e) => { e.preventDefault(); handleAppComplete(index); }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-orange-500 bg-orange-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-orange-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
        >
          Take the Quiz →
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question || showTestResults) {
      const score = calculateScore();
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-4">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-gray-300 mb-6">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (score >= 3) {
                playSound('complete');
                nextPhase();
              } else {
                setTestAnswers([]);
                setShowTestResults(false);
                goToPhase(3);
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all"
          >
            {score >= 3 ? 'Complete! 🎊' : 'Review & Try Again'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mb-6">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg w-full">
          {question.options.map((option, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(i); }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-orange-500 transition-all text-left text-gray-200"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-red-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-4">Thermal Imaging Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered the physics of infrared imaging!</p>
        <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-xl p-6 mb-6">
          <p className="text-orange-300 font-medium mb-4">You now understand:</p>
          <ul className="text-gray-300 text-sm space-y-2 text-left">
            <li>✓ All warm objects emit infrared radiation</li>
            <li>✓ Emissivity determines how much IR a surface emits</li>
            <li>✓ Shiny surfaces reflect surroundings, appearing cooler</li>
            <li>✓ Real-world thermal imaging applications</li>
          </ul>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Next time you see thermal footage, you&apos;ll know the physics behind it!
        </p>
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(0); }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
        >
          ↺ Explore Again
        </button>
      </div>
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Infrared Emissivity</span>
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

export default InfraredEmissivityRenderer;
