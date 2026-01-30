'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
// String phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface Props {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const TEST_QUESTIONS = [
  {
    question: 'Why does a microwave oven have hot spots and cold spots?',
    options: [
      { text: 'The magnetron doesn\'t produce enough power', correct: false },
      { text: 'Standing waves form with fixed nodes (cold) and antinodes (hot)', correct: true },
      { text: 'Food absorbs microwaves unevenly due to its color', correct: false },
      { text: 'The walls absorb some of the microwave energy', correct: false }
    ]
  },
  {
    question: 'What happens at a standing wave node?',
    options: [
      { text: 'Maximum energy - food heats fastest', correct: false },
      { text: 'Minimum/zero energy - food barely heats', correct: true },
      { text: 'The wave changes direction', correct: false },
      { text: 'Microwaves are absorbed by the walls', correct: false }
    ]
  },
  {
    question: 'Why do microwave ovens have turntables?',
    options: [
      { text: 'To look more professional', correct: false },
      { text: 'To move food through hot spots for even heating', correct: true },
      { text: 'To prevent sparks', correct: false },
      { text: 'To reduce microwave power consumption', correct: false }
    ]
  },
  {
    question: 'The wavelength of microwave radiation is about 12 cm. What distance is between hot spots?',
    options: [
      { text: '12 cm (one wavelength)', correct: false },
      { text: '6 cm (half wavelength)', correct: true },
      { text: '3 cm (quarter wavelength)', correct: false },
      { text: '24 cm (two wavelengths)', correct: false }
    ]
  },
  {
    question: 'What is an antinode in a standing wave?',
    options: [
      { text: 'A point of zero amplitude where waves cancel out', correct: false },
      { text: 'A point of maximum amplitude where waves reinforce', correct: true },
      { text: 'The wavelength of the microwave', correct: false },
      { text: 'The frequency of the oscillation', correct: false }
    ]
  },
  {
    question: 'How do standing waves form inside a microwave oven?',
    options: [
      { text: 'The magnetron creates multiple beams', correct: false },
      { text: 'Waves reflect off metal walls and interfere with incoming waves', correct: true },
      { text: 'Food molecules vibrate and create new waves', correct: false },
      { text: 'The turntable generates secondary waves', correct: false }
    ]
  },
  {
    question: 'If microwave frequency is 2.45 GHz, what can you conclude about the wavelength?',
    options: [
      { text: 'Wavelength = speed of light / frequency, so about 12.2 cm', correct: true },
      { text: 'Wavelength equals frequency, so 2.45 cm', correct: false },
      { text: 'Wavelength cannot be calculated from frequency', correct: false },
      { text: 'Wavelength is always 1 meter for microwaves', correct: false }
    ]
  },
  {
    question: 'In a microwave without a turntable, where should you place food for best heating?',
    options: [
      { text: 'Always in the exact center', correct: false },
      { text: 'Near the walls where reflections are strongest', correct: false },
      { text: 'At antinode positions where energy is maximum', correct: true },
      { text: 'It doesn\'t matter where you place it', correct: false }
    ]
  },
  {
    question: 'Why do some microwaves use a rotating metal stirrer instead of a turntable?',
    options: [
      { text: 'To create more microwaves', correct: false },
      { text: 'To reflect waves in changing directions, moving the hot spots', correct: true },
      { text: 'To reduce power consumption', correct: false },
      { text: 'Stirrers are cheaper to manufacture', correct: false }
    ]
  },
  {
    question: 'You can measure microwave wavelength by heating marshmallows. Why does this work?',
    options: [
      { text: 'Marshmallows absorb only certain wavelengths', correct: false },
      { text: 'The distance between melted spots equals half the wavelength', correct: true },
      { text: 'Marshmallows change color at specific temperatures', correct: false },
      { text: 'Sugar molecules resonate at the microwave frequency', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Marshmallow Experiment',
    description: 'Remove the turntable, heat marshmallows, measure distance between melted spots to find wavelength!',
    icon: '🍡'
  },
  {
    title: 'Acoustic Room Modes',
    description: 'Bass frequencies create standing waves in rooms - some spots have strong bass, others weak.',
    icon: '🔊'
  },
  {
    title: 'Laser Cavities',
    description: 'Lasers use standing waves between mirrors to amplify light at specific frequencies.',
    icon: '🔴'
  },
  {
    title: 'Musical Instruments',
    description: 'String and wind instruments create standing waves at specific harmonics!',
    icon: '🎸'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const MicrowaveStandingWaveRenderer: React.FC<Props> = ({ currentPhase, onPhaseComplete }) => {
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Simulation state
  const [isCooking, setIsCooking] = useState(false);
  const [turntableOn, setTurntableOn] = useState(false);
  const [cookTime, setCookTime] = useState(0);
  const [foodTemp, setFoodTemp] = useState<number[]>(Array(25).fill(20));
  const [animPhase, setAnimPhase] = useState(0);
  const [turntableAngle, setTurntableAngle] = useState(0);

  // Interactive slider parameters for play phase
  const [frequency, setFrequency] = useState(2.45); // GHz - standard microwave frequency
  const [cavityLength, setCavityLength] = useState(30); // cm - typical cavity size
  const [powerLevel, setPowerLevel] = useState(100); // percentage

  // Twist state
  const [twistTurntable, setTwistTurntable] = useState(false);
  const [twistCookTime, setTwistCookTime] = useState(0);
  const [twistFoodTemp, setTwistFoodTemp] = useState<number[]>(Array(25).fill(20));

  // Twist comparison state
  const [twistNoTurntableTemp, setTwistNoTurntableTemp] = useState<number[]>(Array(25).fill(20));
  const [twistWithTurntableTemp, setTwistWithTurntableTemp] = useState<number[]>(Array(25).fill(20));
  const [twistComparisonRunning, setTwistComparisonRunning] = useState(false);
  const [twistComparisonComplete, setTwistComparisonComplete] = useState(false);

  // Food position state for twist
  const [foodPosition, setFoodPosition] = useState<'center' | 'edge' | 'corner'>('center');

  // Multi-mode cavity resonance
  const [cavityMode, setCavityMode] = useState<1 | 2 | 3>(1);

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

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate wavelength from frequency: λ = c/f
  const wavelength = (3e8 / (frequency * 1e9)) * 100; // in cm

  // Number of wavelengths that fit in cavity determines standing wave pattern
  const nodesPerCavity = Math.floor(cavityLength / (wavelength / 2));

  // Standing wave intensity pattern (simplified 2D) with frequency/cavity dependence
  const getIntensityAt = (x: number, y: number, angle: number, mode: number = 1) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // Scale based on how many half-wavelengths fit in the cavity
    const scaleFactor = (cavityLength / 30) * (2.45 / frequency) * mode;
    const intensity = Math.abs(
      Math.sin(rx * Math.PI * 2 * scaleFactor) *
      Math.sin(ry * Math.PI * 2 * scaleFactor)
    );
    return intensity * (powerLevel / 100);
  };

  // Get position offset for different food positions
  const getFoodPositionOffset = () => {
    switch (foodPosition) {
      case 'center': return { x: 0, y: 0 };
      case 'edge': return { x: 0.3, y: 0 };
      case 'corner': return { x: 0.3, y: 0.3 };
      default: return { x: 0, y: 0 };
    }
  };

  // Animation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.15) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Cooking simulation
  useEffect(() => {
    if (!isCooking) return;

    const interval = setInterval(() => {
      setCookTime(t => t + 0.1);
      setTurntableAngle(a => turntableOn ? (a + 0.05) % (Math.PI * 2) : a);

      setFoodTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5;
          const y = Math.floor(i / 5) / 4 - 0.5;
          const intensity = getIntensityAt(x, y, turntableOn ? turntableAngle : 0, 1);
          const heating = intensity * 2 * (powerLevel / 100);
          return Math.min(100, temp + heating);
        });
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isCooking, turntableOn, turntableAngle]);

  // Twist cooking simulation with side-by-side comparison
  useEffect(() => {
    if (phase !== 'twist_play') return;
    if (!twistComparisonRunning) return;
    if (twistCookTime <= 0) {
      setTwistComparisonRunning(false);
      setTwistComparisonComplete(true);
      return;
    }

    const posOffset = getFoodPositionOffset();

    const cookInterval = setInterval(() => {
      setTwistCookTime(t => {
        if (t <= 0.1) return 0;
        return t - 0.1;
      });

      // Cook without turntable
      setTwistNoTurntableTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5 + posOffset.x;
          const y = Math.floor(i / 5) / 4 - 0.5 + posOffset.y;
          const intensity = getIntensityAt(x, y, 0, cavityMode);
          const heating = intensity * 3;
          return Math.min(100, temp + heating);
        });
      });

      // Cook with turntable
      setTwistWithTurntableTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5 + posOffset.x;
          const y = Math.floor(i / 5) / 4 - 0.5 + posOffset.y;
          const angle = (10 - twistCookTime) * 0.5;
          const intensity = getIntensityAt(x, y, angle, cavityMode);
          const heating = intensity * 3;
          return Math.min(100, temp + heating);
        });
      });
    }, 100);

    return () => clearInterval(cookInterval);
  }, [phase, twistCookTime, twistComparisonRunning, foodPosition, cavityMode]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setIsCooking(false);
      setTurntableOn(false);
      setCookTime(0);
      setFoodTemp(Array(25).fill(20));
      setTurntableAngle(0);
    }
    if (phase === 'twist_play') {
      setTwistTurntable(false);
      setTwistCookTime(0);
      setTwistFoodTemp(Array(25).fill(20));
      setTwistNoTurntableTemp(Array(25).fill(20));
      setTwistWithTurntableTemp(Array(25).fill(20));
      setTwistComparisonRunning(false);
      setTwistComparisonComplete(false);
      setFoodPosition('center');
      setCavityMode(1);
    }
  }, [phase]);

  // Temperature to color
  const tempToColor = (temp: number) => {
    const normalized = (temp - 20) / 80;
    if (normalized < 0.25) return '#3b82f6';
    if (normalized < 0.5) return '#22c55e';
    if (normalized < 0.75) return '#eab308';
    return '#ef4444';
  };

  const handlePrediction = useCallback((id: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(id);
    playSound('click');
  }, [playSound]);

  const handleTwistPrediction = useCallback((id: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(id);
    playSound('click');
  }, [playSound]);

  const handleAppComplete = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, index]));
    playSound('complete');
  }, [playSound]);

  const handleTestAnswer = useCallback((answerIndex: number, correct: boolean) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => [...prev, answerIndex]);
    playSound(correct ? 'success' : 'failure');
  }, [playSound]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMicrowaveScene = (temps: number[], cooking: boolean, turntable: boolean, angle: number, showNodeLabels: boolean = true) => {
    // numNodes is derived from nodesPerCavity for display purposes
    // More nodes = more complex standing wave pattern
    void nodesPerCavity; // Used in getIntensityAt via scaleFactor

    return (
      <svg viewBox="0 0 400 320" className="w-full h-64">
        <rect width="400" height="320" fill="#111827" />

        {/* Microwave body */}
        <rect x="50" y="30" width="300" height="200" rx="10" fill="#374151" stroke="#4b5563" strokeWidth="3" />

        {/* Door frame */}
        <rect x="60" y="40" width="220" height="180" rx="5" fill="#1f2937" />

        {/* Viewing window */}
        <rect x="70" y="50" width="200" height="160" rx="3" fill="#0a1628" />

        {/* Mesh pattern */}
        {[...Array(20)].map((_, i) => (
          <line key={`h${i}`} x1="70" y1={55 + i * 8} x2="270" y2={55 + i * 8} stroke="#1e293b" strokeWidth="1" />
        ))}
        {[...Array(25)].map((_, i) => (
          <line key={`v${i}`} x1={75 + i * 8} y1="50" x2={75 + i * 8} y2="210" stroke="#1e293b" strokeWidth="1" />
        ))}

        {/* Animated standing wave pattern visualization */}
        <g opacity="0.6">
          {[...Array(7)].map((_, yi) => (
            [...Array(7)].map((_, xi) => {
              const x = (xi / 6 - 0.5);
              const y = (yi / 6 - 0.5);
              const intensity = getIntensityAt(x, y, 0, 1);
              const pulseIntensity = intensity * (0.7 + 0.3 * Math.sin(animPhase * 2));
              const isAntinode = intensity > 0.7;
              const isNode = intensity < 0.15;

              return (
                <g key={`w${xi}-${yi}`}>
                  <circle
                    cx={85 + xi * 28}
                    cy={65 + yi * 22}
                    r={4 + pulseIntensity * 10}
                    fill={isAntinode ? '#ef4444' : isNode ? '#3b82f6' : '#eab308'}
                    opacity={0.4 + pulseIntensity * 0.4}
                  />
                  {/* Node/Antinode labels */}
                  {showNodeLabels && isAntinode && xi % 2 === 0 && yi % 2 === 0 && (
                    <text x={85 + xi * 28} y={65 + yi * 22 - 12} textAnchor="middle" className="fill-red-300 text-xs font-bold" style={{ fontSize: '8px' }}>
                      HOT
                    </text>
                  )}
                  {showNodeLabels && isNode && xi % 2 === 0 && yi % 2 === 0 && (
                    <text x={85 + xi * 28} y={65 + yi * 22 - 12} textAnchor="middle" className="fill-blue-300 text-xs font-bold" style={{ fontSize: '8px' }}>
                      COLD
                    </text>
                  )}
                </g>
              );
            })
          ))}
        </g>

        {/* Turntable */}
        <g transform={`translate(170, 180)`}>
          <ellipse cx="0" cy="0" rx="60" ry="15" fill="#4b5563" />
          {turntable && cooking && (
            <line
              x1="0"
              y1="0"
              x2={Math.cos(angle) * 50}
              y2={Math.sin(angle) * 10}
              stroke="#9ca3af"
              strokeWidth="2"
            />
          )}
        </g>

        {/* Food (5x5 grid representing a plate) */}
        <g transform={`translate(120, 100) rotate(${turntable ? angle * 180 / Math.PI : 0}, 50, 40)`}>
          {temps.map((temp, i) => {
            const x = (i % 5) * 20;
            const y = Math.floor(i / 5) * 16;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="18"
                height="14"
                rx="2"
                fill={tempToColor(temp)}
                stroke="#1f2937"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Control panel */}
        <rect x="290" y="50" width="50" height="160" fill="#1f2937" rx="3" />
        <circle cx="315" cy="80" r="12" fill={cooking ? '#22c55e' : '#4b5563'} />
        <text x="315" y="110" textAnchor="middle" className="fill-gray-400 text-xs">
          {cooking ? 'ON' : 'OFF'}
        </text>
        <rect x="300" y="130" width="30" height="8" fill={turntable ? '#3b82f6' : '#4b5563'} rx="2" />
        <text x="315" y="155" textAnchor="middle" className="fill-gray-500 text-xs">Turn</text>

        {/* Timer */}
        <text x="315" y="190" textAnchor="middle" className="fill-green-400 text-sm font-mono">
          {cookTime.toFixed(1)}s
        </text>

        {/* Temperature legend with node/antinode explanation */}
        <g transform="translate(50, 240)">
          <rect x="0" y="0" width="16" height="10" fill="#3b82f6" />
          <text x="20" y="9" className="fill-gray-400 text-xs">Node (Cold)</text>
          <rect x="90" y="0" width="16" height="10" fill="#eab308" />
          <text x="110" y="9" className="fill-gray-400 text-xs">Between</text>
          <rect x="170" y="0" width="16" height="10" fill="#ef4444" />
          <text x="190" y="9" className="fill-gray-400 text-xs">Antinode (Hot)</text>
        </g>

        {/* Wavelength info */}
        <g transform="translate(50, 260)">
          <text x="0" y="10" className="fill-amber-400 text-xs">
            {`λ = ${wavelength.toFixed(1)} cm | Nodes every ${(wavelength / 2).toFixed(1)} cm`}
          </text>
        </g>

        {/* Power indicator */}
        <g transform="translate(50, 280)">
          <text x="0" y="10" className="fill-gray-400 text-xs">Power: {powerLevel}%</text>
          <rect x="80" y="2" width="100" height="8" fill="#1f2937" rx="2" />
          <rect x="80" y="2" width={powerLevel} height="8" fill="#22c55e" rx="2" />
        </g>
      </svg>
    );
  };

  const renderTwistScene = (temps: number[], turntable: boolean) => {
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const tempVariance = Math.sqrt(temps.reduce((acc, t) => acc + Math.pow(t - avgTemp, 2), 0) / temps.length);

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#111827" />

        <text x="200" y="25" textAnchor="middle" className="fill-gray-300 text-sm font-semibold">
          After 10 seconds of cooking:
        </text>

        {/* Food grid display */}
        <g transform="translate(100, 50)">
          <text x="50" y="-10" textAnchor="middle" className="fill-gray-400 text-xs">
            {turntable ? 'WITH Turntable' : 'NO Turntable'}
          </text>
          {temps.map((temp, i) => {
            const x = (i % 5) * 22;
            const y = Math.floor(i / 5) * 22;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="20"
                height="20"
                rx="3"
                fill={tempToColor(temp)}
                stroke="#374151"
                strokeWidth="1"
              />
            );
          })}
          <text x="50" y="130" textAnchor="middle" className="fill-gray-400 text-xs">
            Avg: {avgTemp.toFixed(0)}C
          </text>
          <text x="50" y="145" textAnchor="middle" className="fill-gray-400 text-xs">
            Variation: +/-{tempVariance.toFixed(0)}C
          </text>
        </g>

        {/* Comparison metrics */}
        <g transform="translate(220, 60)">
          <text x="0" y="0" className="fill-gray-300 text-sm">Evenness Score:</text>
          <rect x="0" y="10" width="150" height="20" fill="#1f2937" rx="4" />
          <rect
            x="0"
            y="10"
            width={Math.max(10, 150 - tempVariance * 5)}
            height="20"
            fill={tempVariance < 10 ? '#22c55e' : tempVariance < 20 ? '#eab308' : '#ef4444'}
            rx="4"
          />
          <text x="75" y="25" textAnchor="middle" className="fill-white text-xs font-semibold">
            {tempVariance < 10 ? 'Excellent!' : tempVariance < 20 ? 'OK' : 'Uneven!'}
          </text>
        </g>

        {/* Explanation */}
        <text x="200" y="220" textAnchor="middle" className="fill-gray-400 text-sm">
          {turntable
            ? 'Turntable moves food through hot spots - even heating!'
            : 'Food sits in fixed positions - hot and cold spots!'}
        </text>
      </svg>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
        The Microwave Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why microwaves create hot spots and cold spots
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-4">🍲</div>

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You heat leftovers in the microwave.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              One bite is <span className="text-blue-400 font-semibold">ice cold</span>, the next is <span className="text-red-400 font-semibold">scalding hot</span>!
            </p>
            <div className="pt-2">
              <p className="text-base text-amber-400 font-semibold">
                Why does this happen?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToNextPhase()}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ position: 'relative', zIndex: 10 }}
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
          <span className="text-amber-400">*</span>
          Standing Waves
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">*</span>
          Real Experiments
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Microwaves bounce back and forth inside the oven. What happens when waves reflect off the walls?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'random', text: 'Random chaos - energy scatters everywhere equally', icon: '🎲' },
          { id: 'standing', text: 'Standing waves form with fixed hot spots and cold spots', icon: '〰️' },
          { id: 'center', text: 'All energy concentrates in the center', icon: '🎯' },
          { id: 'absorbed', text: 'Walls absorb most energy - edges are hottest', icon: '🧱' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={prediction !== null}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option.id
                ? option.id === 'standing' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : prediction !== null && option.id === 'standing' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>
      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {prediction === 'standing' ? '✓ Correct!' : 'Not quite!'} Standing waves create fixed patterns of high and low energy!
          </p>
          <button
            onClick={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
            style={{ position: 'relative', zIndex: 10 }}
          >
            See It in Action
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Standing Wave Lab</h2>

      {/* Interactive sliders panel */}
      <div className="bg-slate-800/60 rounded-2xl p-5 mb-4 w-full max-w-2xl border border-slate-700/50">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Microwave Parameters</h3>
        <div className="grid gap-5">
          {/* Frequency slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-300 font-medium">Microwave Frequency</label>
              <span className="text-sm text-amber-400 font-mono">{frequency.toFixed(2)} GHz</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="3.0"
              step="0.05"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>2.0 GHz</span>
              <span className="text-amber-400">Standard: 2.45 GHz</span>
              <span>3.0 GHz</span>
            </div>
          </div>

          {/* Cavity length slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-300 font-medium">Cavity Length</label>
              <span className="text-sm text-blue-400 font-mono">{cavityLength} cm</span>
            </div>
            <input
              type="range"
              min="20"
              max="50"
              step="1"
              value={cavityLength}
              onChange={(e) => setCavityLength(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>20 cm (Small)</span>
              <span>50 cm (Large)</span>
            </div>
          </div>

          {/* Power level slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-300 font-medium">Power Level</label>
              <span className="text-sm text-emerald-400 font-mono">{powerLevel}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={powerLevel}
              onChange={(e) => setPowerLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>10% (Low)</span>
              <span>100% (High)</span>
            </div>
          </div>

          {/* Calculated wavelength display */}
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg p-3 border border-amber-500/20">
            <p className="text-sm text-slate-300">
              <span className="text-amber-400 font-semibold">Calculated Wavelength:</span>{' '}
              <span className="font-mono text-white">{wavelength.toFixed(2)} cm</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Formula: lambda = c / f = (3 x 10^8 m/s) / ({frequency} x 10^9 Hz)
            </p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-red-400">Hot spots</span> every {(wavelength / 2).toFixed(1)} cm (half wavelength)
            </p>
          </div>
        </div>
      </div>

      {/* Microwave visualization */}
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderMicrowaveScene(foodTemp, isCooking, turntableOn, turntableAngle, true)}
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={() => {
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            setIsCooking(!isCooking);
            playSound('click');
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isCooking ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}
          style={{ position: 'relative', zIndex: 10 }}
        >
          {isCooking ? 'Stop' : 'Start Cooking'}
        </button>
        <button
          onClick={() => {
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            setTurntableOn(!turntableOn);
            playSound('click');
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            turntableOn ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
          style={{ position: 'relative', zIndex: 10 }}
        >
          Turntable: {turntableOn ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => {
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            setFoodTemp(Array(25).fill(20));
            setCookTime(0);
            playSound('click');
          }}
          className="px-6 py-2 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
          style={{ position: 'relative', zIndex: 10 }}
        >
          Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <p className="text-amber-300 text-sm text-center">
          <strong>Standing waves:</strong> When microwaves bounce back and forth, they interfere to create
          fixed patterns of high energy (antinodes - <span className="text-red-400">HOT</span>) and
          low energy (nodes - <span className="text-blue-400">COLD</span>).
        </p>
        <p className="text-slate-400 text-xs text-center mt-2">
          Try adjusting the frequency and see how the wavelength and hot spot spacing changes!
        </p>
      </div>

      <button
        onClick={() => goToNextPhase()}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        style={{ position: 'relative', zIndex: 10 }}
      >
        Review the Science
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Standing Wave Physics</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Wave Reflection</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Microwaves bounce off metal walls</li>
            <li>* Outgoing + reflected waves interfere</li>
            <li>* Creates stable standing wave pattern</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">Hot Spots & Cold Spots</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Antinodes = maximum energy (HOT)</li>
            <li>* Nodes = minimum energy (COLD)</li>
            <li>* Spacing = wavelength/2 = 6cm</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Math</h3>
          <p className="text-slate-300 text-sm">
            <strong>Wavelength:</strong> lambda = c / f = 3x10^8 / 2.45x10^9 = 12.2 cm<br />
            <strong>Hot spot spacing:</strong> lambda/2 = 6.1 cm apart!
          </p>
        </div>
      </div>
      <button
        onClick={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        style={{ position: 'relative', zIndex: 10 }}
      >
        Discover the Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          If standing waves create fixed hot spots, why do microwave ovens have a <span className="text-blue-400 font-semibold">turntable</span>?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'even', text: 'Turntable moves food through hot spots for even heating', icon: '🔄' },
          { id: 'stir', text: 'It just stirs the food like a mixer', icon: '🥄' },
          { id: 'waves', text: 'Turntable creates additional microwaves', icon: '📡' },
          { id: 'nothing', text: 'It\'s decorative - doesn\'t really help', icon: '*' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option.id
                ? option.id === 'even' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : twistPrediction !== null && option.id === 'even' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>
      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'even' ? '✓ Exactly!' : 'Not quite!'} The turntable moves food through the pattern for even heating!
          </p>
          <button
            onClick={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
            style={{ position: 'relative', zIndex: 10 }}
          >
            See How It Works
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const startComparison = () => {
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;
      setTwistNoTurntableTemp(Array(25).fill(20));
      setTwistWithTurntableTemp(Array(25).fill(20));
      setTwistCookTime(10);
      setTwistComparisonRunning(true);
      setTwistComparisonComplete(false);
      playSound('click');
    };

    const resetComparison = () => {
      setTwistNoTurntableTemp(Array(25).fill(20));
      setTwistWithTurntableTemp(Array(25).fill(20));
      setTwistCookTime(0);
      setTwistComparisonRunning(false);
      setTwistComparisonComplete(false);
    };

    // Calculate evenness scores
    const calcVariance = (temps: number[]) => {
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      return Math.sqrt(temps.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / temps.length);
    };

    const noTurntableVariance = calcVariance(twistNoTurntableTemp);
    const withTurntableVariance = calcVariance(twistWithTurntableTemp);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Turntable Comparison Lab</h2>

        {/* Controls panel */}
        <div className="bg-slate-800/60 rounded-2xl p-5 mb-4 w-full max-w-3xl border border-slate-700/50">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Food position selector */}
            <div className="space-y-3">
              <label className="text-sm text-slate-300 font-medium block">Food Position</label>
              <div className="flex gap-2">
                {(['center', 'edge', 'corner'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => {
                      if (!twistComparisonRunning) {
                        setFoodPosition(pos);
                        resetComparison();
                      }
                    }}
                    disabled={twistComparisonRunning}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      foodPosition === pos
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } ${twistComparisonRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ position: 'relative', zIndex: 10 }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Where the food is placed on the turntable plate
              </p>
            </div>

            {/* Cavity mode selector */}
            <div className="space-y-3">
              <label className="text-sm text-slate-300 font-medium block">Cavity Resonance Mode</label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (!twistComparisonRunning) {
                        setCavityMode(mode);
                        resetComparison();
                      }
                    }}
                    disabled={twistComparisonRunning}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      cavityMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } ${twistComparisonRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ position: 'relative', zIndex: 10 }}
                  >
                    Mode {mode}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Different resonance modes create different hot spot patterns
              </p>
            </div>
          </div>
        </div>

        {/* Side-by-side comparison visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-3xl">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Without turntable */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-400 mb-3">Without Turntable</h3>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="grid grid-cols-5 gap-1 mx-auto w-fit mb-3">
                  {twistNoTurntableTemp.map((temp, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-sm transition-colors duration-200"
                      style={{ backgroundColor: tempToColor(temp) }}
                      title={`${temp.toFixed(0)}C`}
                    />
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  Avg: {(twistNoTurntableTemp.reduce((a, b) => a + b, 0) / 25).toFixed(0)}C
                </div>
                <div className="text-sm text-slate-500">
                  Variation: +/-{noTurntableVariance.toFixed(1)}C
                </div>
                {twistComparisonComplete && (
                  <div className={`mt-2 text-sm font-semibold ${noTurntableVariance > 15 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {noTurntableVariance > 15 ? 'Very Uneven!' : 'Somewhat Uneven'}
                  </div>
                )}
              </div>
            </div>

            {/* With turntable */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">With Turntable</h3>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="grid grid-cols-5 gap-1 mx-auto w-fit mb-3">
                  {twistWithTurntableTemp.map((temp, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-sm transition-colors duration-200"
                      style={{ backgroundColor: tempToColor(temp) }}
                      title={`${temp.toFixed(0)}C`}
                    />
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  Avg: {(twistWithTurntableTemp.reduce((a, b) => a + b, 0) / 25).toFixed(0)}C
                </div>
                <div className="text-sm text-slate-500">
                  Variation: +/-{withTurntableVariance.toFixed(1)}C
                </div>
                {twistComparisonComplete && (
                  <div className={`mt-2 text-sm font-semibold ${withTurntableVariance < 10 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {withTurntableVariance < 10 ? 'Even Heating!' : 'More Even'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          {twistComparisonRunning && (
            <div className="mt-6 text-center">
              <div className="text-amber-400 font-medium mb-2">
                Cooking... {twistCookTime.toFixed(1)}s remaining
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${((10 - twistCookTime) / 10) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span>Cold (20C)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
              <span>Warm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
              <span>Hot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span>Very Hot (100C)</span>
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={startComparison}
            disabled={twistComparisonRunning}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              twistComparisonRunning
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            {twistComparisonComplete ? 'Run Again' : 'Start Comparison'}
          </button>
          <button
            onClick={resetComparison}
            disabled={twistComparisonRunning}
            className="px-6 py-3 rounded-xl font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
            style={{ position: 'relative', zIndex: 10 }}
          >
            Reset
          </button>
        </div>

        {/* Explanation */}
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-4 max-w-2xl w-full mb-6 border border-blue-500/20">
          <p className="text-blue-300 text-sm text-center mb-2">
            <strong>Multi-Mode Cavity:</strong> Real microwaves have multiple resonance modes that create complex overlapping patterns.
          </p>
          <p className="text-slate-400 text-xs text-center">
            Mode 1 = Simple pattern | Mode 2 = More nodes | Mode 3 = Complex pattern
          </p>
        </div>

        {twistComparisonComplete && (
          <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-xl p-4 max-w-2xl w-full mb-6 border border-emerald-500/30">
            <p className="text-emerald-300 text-sm text-center">
              <strong>Result:</strong> The turntable reduces temperature variation by{' '}
              <span className="font-mono text-white">
                {Math.max(0, noTurntableVariance - withTurntableVariance).toFixed(1)}C
              </span>
              {' '}by moving food through the standing wave pattern!
            </p>
          </div>
        )}

        <button
          onClick={() => goToNextPhase()}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          style={{ position: 'relative', zIndex: 10 }}
        >
          Review Discovery
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Turntable Solution</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-slate-300 text-center mb-4">
          The turntable <span className="text-blue-400 font-semibold">doesn't change the standing wave pattern</span>,
          it moves the food through the pattern!
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-red-900/30 rounded-lg p-3">
            <div className="text-red-400 font-semibold">Without Turntable</div>
            <div className="text-slate-500">Food in hot spots: scalding</div>
            <div className="text-slate-500">Food in cold spots: cold</div>
          </div>
          <div className="bg-emerald-900/30 rounded-lg p-3">
            <div className="text-emerald-400 font-semibold">With Turntable</div>
            <div className="text-slate-500">Each part visits hot spots</div>
            <div className="text-slate-500">Average heating is even!</div>
          </div>
        </div>
      </div>
      <button
        onClick={() => goToNextPhase()}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
        style={{ position: 'relative', zIndex: 10 }}
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-slate-400 mb-4">Explore each application</p>
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onClick={() => handleAppComplete(index)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-emerald-500 bg-emerald-900/30'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-slate-400 text-xs mt-1">{app.description}</p>
            {completedApps.has(index) && <span className="text-emerald-400 text-xs">Explored!</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button
          onClick={() => goToNextPhase()}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          style={{ position: 'relative', zIndex: 10 }}
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question) {
      const score = testAnswers.filter((a, i) => TEST_QUESTIONS[i].options[a]?.correct).length;
      const passingScore = Math.ceil(TEST_QUESTIONS.length * 0.7);
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-4">{score >= passingScore ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Score: {score}/{TEST_QUESTIONS.length}</h2>
          <p className="text-slate-300 mb-6">{score >= passingScore ? 'Excellent! You\'ve mastered standing waves!' : 'Keep studying! Review and try again.'}</p>
          {score >= passingScore ? (
            <button
              onClick={() => { playSound('complete'); goToNextPhase(); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              style={{ position: 'relative', zIndex: 10 }}
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setTestAnswers([]); goToPhase('review'); }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
              style={{ position: 'relative', zIndex: 10 }}
            >
              Review & Try Again
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-xl font-bold text-white text-center mb-6">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
          <p className="text-lg text-slate-300">{question.question}</p>
        </div>
        <div className="grid gap-3 w-full max-w-xl">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleTestAnswer(i, option.correct)}
              className="p-4 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent text-left text-slate-200"
              style={{ position: 'relative', zIndex: 10 }}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-amber-900/50 via-orange-900/50 to-red-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-4">Standing Wave Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered microwave standing wave physics!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">〰️</div><p className="text-sm text-slate-300">Standing Waves</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔥</div><p className="text-sm text-slate-300">Hot Spots</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔄</div><p className="text-sm text-slate-300">Turntable Solution</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🍡</div><p className="text-sm text-slate-300">Marshmallow Test</p></div>
        </div>
        <button onClick={() => goToPhase('hook')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl" style={{ position: 'relative', zIndex: 10 }}>Explore Again</button>
      </div>
    </div>
  );

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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Standing Waves</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, index) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : PHASE_ORDER.indexOf(phase) > index
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ position: 'relative', zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default MicrowaveStandingWaveRenderer;
