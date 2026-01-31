'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
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

interface GameEvent {
  type: 'prediction' | 'observation' | 'interaction' | 'completion';
  phase: Phase;
  data: Record<string, unknown>;
}

interface ElectromagnetRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
  current: number;
  coilTurns: number;
  hasCore: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'What creates the magnetic field in an electromagnet?',
    options: [
      { text: 'The iron core', correct: false },
      { text: 'Electric current flowing through wire', correct: true },
      { text: 'Static electricity', correct: false },
      { text: 'The battery\'s chemicals', correct: false }
    ]
  },
  {
    question: 'Why does adding an iron core strengthen an electromagnet?',
    options: [
      { text: 'Iron is heavier', correct: false },
      { text: 'Iron conducts electricity better', correct: false },
      { text: 'Iron concentrates and amplifies the magnetic field', correct: true },
      { text: 'Iron generates its own magnetic field', correct: false }
    ]
  },
  {
    question: 'What happens to an electromagnet\'s field when you reverse the current?',
    options: [
      { text: 'The field disappears', correct: false },
      { text: 'The field doubles in strength', correct: false },
      { text: 'The field stays the same', correct: false },
      { text: 'The north and south poles swap', correct: true }
    ]
  },
  {
    question: 'How can you make an electromagnet stronger?',
    options: [
      { text: 'Use thinner wire', correct: false },
      { text: 'Increase current and/or number of coil turns', correct: true },
      { text: 'Use plastic instead of iron', correct: false },
      { text: 'Decrease the voltage', correct: false }
    ]
  },
  {
    question: 'What is the main advantage of an electromagnet over a permanent magnet?',
    options: [
      { text: 'Electromagnets are always stronger', correct: false },
      { text: 'Electromagnets can be turned on and off', correct: true },
      { text: 'Electromagnets never need maintenance', correct: false },
      { text: 'Electromagnets are cheaper to make', correct: false }
    ]
  },
  {
    question: 'In an MRI machine, what allows the electromagnet to be extremely powerful?',
    options: [
      { text: 'Using very thick copper wire', correct: false },
      { text: 'Superconducting coils that carry current without resistance', correct: true },
      { text: 'Adding multiple iron cores', correct: false },
      { text: 'Using alternating current at high frequency', correct: false }
    ]
  },
  {
    question: 'How does a junkyard crane electromagnet release a car?',
    options: [
      { text: 'By reversing the current direction', correct: false },
      { text: 'By turning off the current', correct: true },
      { text: 'By lowering the voltage slowly', correct: false },
      { text: 'By heating up the electromagnet', correct: false }
    ]
  },
  {
    question: 'What happens to the magnetic field if you double both the current and the number of coil turns?',
    options: [
      { text: 'The field strength doubles', correct: false },
      { text: 'The field strength quadruples', correct: true },
      { text: 'The field strength stays the same', correct: false },
      { text: 'The field strength is cut in half', correct: false }
    ]
  },
  {
    question: 'Why do electric motors use electromagnets instead of permanent magnets for the stator?',
    options: [
      { text: 'Permanent magnets are too expensive', correct: false },
      { text: 'Electromagnets allow the field direction to be switched for continuous rotation', correct: true },
      { text: 'Permanent magnets would melt from the heat', correct: false },
      { text: 'Electromagnets are lighter in weight', correct: false }
    ]
  },
  {
    question: 'What is the right-hand rule used for in electromagnetism?',
    options: [
      { text: 'To measure the strength of the magnetic field', correct: false },
      { text: 'To determine the direction of the magnetic field around a current-carrying wire', correct: true },
      { text: 'To calculate the voltage needed', correct: false },
      { text: 'To find the temperature of the wire', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Electric Motors',
    description: 'Electromagnets create rotating magnetic fields that push permanent magnets, converting electricity to motion.',
    icon: '⚡'
  },
  {
    title: 'MRI Machines',
    description: 'Superconducting electromagnets create fields 60,000× Earth\'s, allowing detailed body imaging.',
    icon: '🏥'
  },
  {
    title: 'Scrapyard Cranes',
    description: 'Giant electromagnets lift cars and metal debris. Turn off the current to drop the load!',
    icon: '🏗️'
  },
  {
    title: 'Maglev Trains',
    description: 'Electromagnets both levitate the train and propel it forward at 600+ km/h with no wheels!',
    icon: '🚄'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function isValidPhase(phase: string): phase is Phase {
  return PHASES.includes(phase as Phase);
}

function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

function calculateFieldStrength(current: number, turns: number, hasCore: boolean): number {
  // B ∝ μ * n * I (simplified)
  const coreMultiplier = hasCore ? 1000 : 1;
  return current * turns * coreMultiplier * 0.001; // Scale for display
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ElectromagnetRenderer({ phase: initialPhase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: ElectromagnetRendererProps) {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(initialPhase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Simulation state
  const [current, setCurrent] = useState(0); // Amperes (-5 to 5)
  const [coilTurns, setCoilTurns] = useState(10);
  const [hasCore, setHasCore] = useState(false);
  const [paperClipPositions, setPaperClipPositions] = useState<{x: number; y: number; attracted: boolean}[]>([]);

  // Twist state - reversing current / AC
  const [twistCurrent, setTwistCurrent] = useState(3);
  const [isAC, setIsAC] = useState(false);
  const [acPhase, setAcPhase] = useState(0);

  const navigationLockRef = useRef(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    if (onPhaseComplete) onPhaseComplete();

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // ─── Animation Effect ────────────────────────────────────────────────────────
  // Paper clip attraction animation
  useEffect(() => {
    const fieldStrength = calculateFieldStrength(Math.abs(current), coilTurns, hasCore);
    const attractionRadius = Math.min(100, fieldStrength * 10);

    setPaperClipPositions(prev => {
      if (prev.length === 0) {
        // Initialize paper clips
        return [
          { x: 50, y: 150, attracted: false },
          { x: 350, y: 150, attracted: false },
          { x: 100, y: 220, attracted: false },
          { x: 300, y: 220, attracted: false },
        ];
      }

      return prev.map(clip => {
        const centerX = 200;
        const centerY = 140;
        const dist = Math.sqrt(Math.pow(clip.x - centerX, 2) + Math.pow(clip.y - centerY, 2));

        if (fieldStrength > 0 && dist < attractionRadius + 50) {
          const angle = Math.atan2(centerY - clip.y, centerX - clip.x);
          const speed = fieldStrength * 0.5;
          const newX = clip.x + Math.cos(angle) * speed;
          const newY = clip.y + Math.sin(angle) * speed;
          const newDist = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));

          return {
            x: newDist < 30 ? clip.x : newX,
            y: newDist < 30 ? clip.y : newY,
            attracted: newDist < 50
          };
        }
        return clip;
      });
    });
  }, [current, coilTurns, hasCore]);

  // AC oscillation
  useEffect(() => {
    if (!isAC) return;

    const interval = setInterval(() => {
      setAcPhase(p => (p + 0.1) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [isAC]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setCurrent(0);
      setCoilTurns(10);
      setHasCore(false);
      setPaperClipPositions([
        { x: 50, y: 150, attracted: false },
        { x: 350, y: 150, attracted: false },
        { x: 100, y: 220, attracted: false },
        { x: 300, y: 220, attracted: false },
      ]);
    }
    if (phase === 'twist_play') {
      setTwistCurrent(3);
      setIsAC(false);
      setAcPhase(0);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-purple-500 to-blue-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderElectromagnet = (curr: number, turns: number, core: boolean, clips: typeof paperClipPositions) => {
    const fieldStrength = calculateFieldStrength(Math.abs(curr), turns, core);
    const fieldRadius = Math.min(80, fieldStrength * 8);
    const polarity = curr > 0 ? 'N-S' : curr < 0 ? 'S-N' : 'OFF';

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        {/* Background */}
        <rect width="400" height="280" fill="#111827" />

        {/* Magnetic field lines */}
        {curr !== 0 && (
          <g className="animate-pulse" style={{ opacity: Math.min(1, fieldStrength / 5) }}>
            {[...Array(6)].map((_, i) => {
              const scale = 0.5 + (i * 0.15);
              return (
                <ellipse
                  key={i}
                  cx="200"
                  cy="140"
                  rx={40 * scale + fieldRadius}
                  ry={20 * scale + fieldRadius / 2}
                  fill="none"
                  stroke={curr > 0 ? '#3b82f6' : '#ef4444'}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity={1 - (i * 0.15)}
                />
              );
            })}
            {/* Field direction arrows */}
            <text x="120" y="100" className={`text-xs ${curr > 0 ? 'fill-blue-400' : 'fill-red-400'}`}>
              {curr > 0 ? '→' : '←'}
            </text>
            <text x="260" y="100" className={`text-xs ${curr > 0 ? 'fill-blue-400' : 'fill-red-400'}`}>
              {curr > 0 ? '←' : '→'}
            </text>
          </g>
        )}

        {/* Coil windings */}
        <g>
          {[...Array(Math.min(turns, 20))].map((_, i) => (
            <ellipse
              key={i}
              cx={160 + i * 4}
              cy="140"
              rx="15"
              ry="30"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
            />
          ))}
        </g>

        {/* Iron core (if enabled) */}
        {core && (
          <rect
            x="155"
            y="120"
            width={Math.min(turns, 20) * 4 + 10}
            height="40"
            rx="4"
            fill="#4b5563"
            stroke="#6b7280"
            strokeWidth="2"
          />
        )}

        {/* Pole labels */}
        {curr !== 0 && (
          <>
            <circle cx="140" cy="140" r="15" fill={curr > 0 ? '#ef4444' : '#3b82f6'} />
            <text x="140" y="145" textAnchor="middle" className="fill-white text-xs font-bold">
              {curr > 0 ? 'N' : 'S'}
            </text>
            <circle cx="160 + Math.min(turns, 20) * 4 + 20" cy="140" r="15" fill={curr > 0 ? '#3b82f6' : '#ef4444'} />
            <text x={160 + Math.min(turns, 20) * 4 + 20} y="145" textAnchor="middle" className="fill-white text-xs font-bold">
              {curr > 0 ? 'S' : 'N'}
            </text>
          </>
        )}

        {/* Battery/power source */}
        <rect x="170" y="220" width="60" height="30" rx="4" fill="#374151" stroke="#6b7280" strokeWidth="2" />
        <text x="200" y="240" textAnchor="middle" className="fill-gray-300 text-xs">
          {curr.toFixed(1)}A
        </text>

        {/* Wires */}
        <path
          d={`M 160 170 L 160 220 L 170 220`}
          fill="none"
          stroke={curr > 0 ? '#ef4444' : curr < 0 ? '#3b82f6' : '#6b7280'}
          strokeWidth="3"
        />
        <path
          d={`M ${160 + Math.min(turns, 20) * 4} 170 L ${160 + Math.min(turns, 20) * 4} 220 L 230 220`}
          fill="none"
          stroke={curr > 0 ? '#3b82f6' : curr < 0 ? '#ef4444' : '#6b7280'}
          strokeWidth="3"
        />

        {/* Paper clips */}
        {clips.map((clip, i) => (
          <g key={i} transform={`translate(${clip.x}, ${clip.y})`}>
            <path
              d="M -8 -5 L 8 -5 L 8 5 L -5 5 L -5 -2 L 5 -2"
              fill="none"
              stroke={clip.attracted ? '#22c55e' : '#9ca3af'}
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Field strength meter */}
        <rect x="20" y="20" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="70" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Field Strength</text>
        <text x="70" y="60" textAnchor="middle" className="fill-purple-400 text-sm font-bold">
          {fieldStrength.toFixed(2)} T
        </text>

        {/* Polarity indicator */}
        <rect x="280" y="20" width="100" height="50" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="330" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Polarity</text>
        <text x="330" y="60" textAnchor="middle" className={`text-sm font-bold ${
          curr === 0 ? 'fill-gray-500' : curr > 0 ? 'fill-blue-400' : 'fill-red-400'
        }`}>
          {polarity}
        </text>
      </svg>
    );
  };

  const renderACMotor = (curr: number, ac: boolean, phase: number) => {
    const effectiveCurrent = ac ? curr * Math.sin(phase) : curr;
    const rotorAngle = ac ? phase * 2 : 0;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* Stator (outer electromagnets) */}
        <circle cx="200" cy="140" r="100" fill="none" stroke="#4b5563" strokeWidth="8" />

        {/* Electromagnet coils on stator */}
        {[0, 90, 180, 270].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 200 + Math.cos(rad) * 80;
          const y = 140 + Math.sin(rad) * 80;
          const isActive = ac ? Math.abs(Math.sin(phase + (i * Math.PI / 2))) > 0.5 : curr > 0;

          return (
            <g key={i}>
              <rect
                x={x - 15}
                y={y - 15}
                width="30"
                height="30"
                rx="4"
                fill={isActive ? '#f59e0b' : '#374151'}
                stroke="#6b7280"
                strokeWidth="2"
              />
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r="25"
                  fill="none"
                  stroke={i % 2 === 0 ? '#3b82f6' : '#ef4444'}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
              )}
            </g>
          );
        })}

        {/* Rotor (inner permanent magnet) */}
        <g transform={`rotate(${(rotorAngle * 180) / Math.PI}, 200, 140)`}>
          <ellipse cx="200" cy="140" rx="40" ry="40" fill="#374151" stroke="#6b7280" strokeWidth="2" />
          {/* N pole */}
          <path d="M 200 100 L 210 125 L 190 125 Z" fill="#ef4444" />
          <text x="200" y="118" textAnchor="middle" className="fill-white text-xs font-bold">N</text>
          {/* S pole */}
          <path d="M 200 180 L 210 155 L 190 155 Z" fill="#3b82f6" />
          <text x="200" y="172" textAnchor="middle" className="fill-white text-xs font-bold">S</text>
        </g>

        {/* Shaft */}
        <rect x="195" y="180" width="10" height="60" fill="#6b7280" />

        {/* Current waveform display */}
        <rect x="20" y="20" width="120" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="80" y="40" textAnchor="middle" className="fill-gray-400 text-xs">
          {ac ? 'AC Current' : 'DC Current'}
        </text>
        {ac ? (
          <path
            d={`M 30 60 ${[...Array(20)].map((_, i) => `L ${30 + i * 5} ${60 + Math.sin((i / 3) + phase) * 10}`).join(' ')}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
          />
        ) : (
          <line x1="30" y1="60" x2="130" y2="60" stroke="#22c55e" strokeWidth="2" />
        )}

        {/* Mode indicator */}
        <rect x="260" y="20" width="120" height="60" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="320" y="40" textAnchor="middle" className="fill-gray-400 text-xs">Motor Mode</text>
        <text x="320" y="60" textAnchor="middle" className={`text-sm font-bold ${ac ? 'fill-green-400' : 'fill-yellow-400'}`}>
          {ac ? 'AC ROTATING' : 'DC STATIC'}
        </text>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">How Do Electric Motors Spin?</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-lg leading-relaxed">
          Every electric car, washing machine, and fan uses electric motors.
          But how does <span className="text-yellow-400">electricity</span> create
          <span className="text-purple-400"> magnetic force</span>?
        </p>
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-blue-300 font-medium">
            ⚡ The secret is the electromagnet—a magnet you can turn on and off!
          </p>
        </div>
        <p className="text-gray-400 mt-4">
          Discover how coils of wire become powerful magnets that lift cars
          and power trains!
        </p>
      </div>
      <button
        onMouseDown={() => { playSound('click'); nextPhase(); }}
        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
      >
        Discover the Secret →
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Make Your Prediction</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          If you pass electric current through a coil of wire, what will happen?
        </p>
        <div className="space-y-3">
          {[
            'Nothing - wire isn\'t magnetic',
            'The wire will create a magnetic field',
            'The wire will get hot but not magnetic',
            'The wire will repel all metals'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setPrediction(option);
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                prediction === option
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {prediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => {
    const fieldStrength = calculateFieldStrength(Math.abs(current), coilTurns, hasCore);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Build an Electromagnet</h2>

        <div className="bg-gray-800 rounded-xl p-6">
          {renderElectromagnet(current, coilTurns, hasCore, paperClipPositions)}

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-yellow-400 font-medium mb-2">
                Current: {current.toFixed(1)} A
              </label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={current}
                onChange={(e) => setCurrent(Number(e.target.value))}
                className="w-full accent-yellow-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-5A</span>
                <span>0</span>
                <span>+5A</span>
              </div>
            </div>
            <div>
              <label className="block text-orange-400 font-medium mb-2">
                Coil Turns: {coilTurns}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={coilTurns}
                onChange={(e) => setCoilTurns(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <button
              onMouseDown={() => {
                playSound('click');
                setHasCore(!hasCore);
              }}
              className={`px-6 py-3 rounded-lg font-bold ${
                hasCore
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {hasCore ? '🧲 Iron Core: ON' : '🔘 Iron Core: OFF'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-gray-300 text-center">
              Field Strength: <span className="text-purple-400 font-bold">{fieldStrength.toFixed(3)} T</span>
              {hasCore && <span className="text-green-400 ml-2">(1000× with iron core!)</span>}
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
          >
            Understand the Physics →
          </button>
        </div>
      </div>
    );
  };

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Oersted&apos;s Discovery</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
          <h3 className="text-purple-400 font-bold mb-2">Electricity Creates Magnetism</h3>
          <p className="text-gray-300">
            In 1820, Hans Christian Oersted discovered that electric current creates
            a magnetic field around the wire. <span className="text-yellow-400 font-bold">
            Coiling the wire concentrates this field</span>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-xs text-gray-400">More Current</p>
            <p className="text-purple-400 font-bold">→ Stronger</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🔄</div>
            <p className="text-xs text-gray-400">More Turns</p>
            <p className="text-purple-400 font-bold">→ Stronger</p>
          </div>
          <div className="p-3 bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">🧲</div>
            <p className="text-xs text-gray-400">Iron Core</p>
            <p className="text-purple-400 font-bold">→ 1000× Stronger!</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300">
            💡 <strong>Key Equation:</strong> B = μ₀ × n × I
            <br />
            <span className="text-sm">Field strength = permeability × turns/length × current</span>
          </p>
        </div>

        <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-600">
          <p className="text-blue-300">
            🧲 <strong>Why Iron Helps:</strong> Iron atoms act like tiny magnets that align
            with the coil&apos;s field, amplifying it by ~1000×. This is called &quot;ferromagnetism.&quot;
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          What If We Reverse Current? →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The Motor Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          If we rapidly switch the current direction back and forth (AC current),
          what will happen to the magnetic field?
        </p>
        <div className="space-y-3">
          {[
            'The field will disappear',
            'The field will stay the same direction',
            'The field will flip north/south rapidly',
            'The field will become twice as strong'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setTwistPrediction(option);
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                twistPrediction === option
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {twistPrediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          See What Happens →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">AC vs DC: Making Motors Spin</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderACMotor(twistCurrent, isAC, acPhase)}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setIsAC(false);
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              !isAC ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            DC (Static)
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setIsAC(true);
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              isAC ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            AC (Alternating)
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            {isAC ? (
              <>
                <span className="text-green-400 font-bold">AC creates a rotating magnetic field!</span>
                <br />
                <span className="text-sm">The rotor chases the field, causing continuous rotation.</span>
              </>
            ) : (
              <>
                <span className="text-yellow-400 font-bold">DC creates a static field.</span>
                <br />
                <span className="text-sm">The rotor aligns once, then stops. Motors need commutators to keep spinning.</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); setIsAC(false); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          Understand Motor Physics →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">How Motors Work</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">The Rotating Field Principle</h3>
          <p className="text-gray-300">
            <span className="text-yellow-400 font-bold">Reversing current reverses the magnetic poles.</span>{' '}
            By rapidly alternating current in multiple coils, we create a magnetic field
            that appears to rotate—and any magnet inside will spin trying to follow it!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-yellow-400 font-bold mb-2">DC Motors</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Need brushes/commutator to switch current</li>
              <li>• Simple speed control</li>
              <li>• Brushes wear out over time</li>
              <li>• Used in toys, small appliances</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="text-green-400 font-bold mb-2">AC Motors</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• No brushes needed</li>
              <li>• Grid power is already AC</li>
              <li>• Very reliable, long-lasting</li>
              <li>• Used in industry, EVs, fans</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Fun Fact:</strong> Nikola Tesla invented the AC induction motor in 1887.
            It&apos;s called &quot;induction&quot; because the rotating field induces current in the rotor,
            making it magnetic without any electrical connection!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Electromagnets</h2>
      <p className="text-gray-400 text-center">Explore how electromagnets power our world</p>

      <div className="grid grid-cols-2 gap-4">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, i]));
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              completedApps.has(i)
                ? 'bg-green-900/30 border-2 border-green-600'
                : 'bg-gray-800 border-2 border-gray-700 hover:border-purple-500'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-bold mb-1">{app.title}</h3>
            <p className="text-gray-400 text-sm">{app.description}</p>
            {completedApps.has(i) && (
              <div className="mt-2 text-green-400 text-sm">✓ Explored</div>
            )}
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('complete'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all"
          >
            Take the Test →
          </button>
        </div>
      )}

      {completedApps.size < 4 && (
        <p className="text-center text-gray-500">
          Explore all {4 - completedApps.size} remaining applications to continue
        </p>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= TEST_QUESTIONS.length;

    if (isComplete) {
      const score = testAnswers.reduce(
        (acc, answer, i) => acc + (TEST_QUESTIONS[i].options[answer]?.correct ? 1 : 0),
        0
      );
      const passingScore = Math.ceil(TEST_QUESTIONS.length * 0.7);
      const passed = score >= passingScore;
      if (passed && onCorrectAnswer) onCorrectAnswer();

      return (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-white">Test Complete!</h2>
          <div className={`text-6xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <p className="text-gray-300">
            {passed ? 'Excellent understanding of electromagnets!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={() => {
              if (passed) {
                playSound('complete');
                nextPhase();
              } else {
                playSound('click');
                setTestAnswers([]);
              }
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg ${
              passed
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
            }`}
          >
            {passed ? 'Complete Lesson →' : 'Try Again'}
          </button>
        </div>
      );
    }

    const question = TEST_QUESTIONS[currentQuestion];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Knowledge Check</h2>
        <div className="flex justify-center gap-2 mb-4">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentQuestion
                  ? TEST_QUESTIONS[i].options[testAnswers[i]]?.correct
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : i === currentQuestion
                    ? 'bg-purple-500'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-white text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  playSound(option.correct ? 'success' : 'failure');
                  setTestAnswers([...testAnswers, i]);
                }}
                className="w-full p-4 bg-gray-700 text-gray-300 rounded-lg text-left hover:bg-gray-600 transition-all"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-3xl font-bold text-white">Electromagnet Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Current creates magnetic fields
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Coils concentrate the field
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Iron cores amplify 1000×
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> AC creates rotating fields for motors
          </li>
        </ul>
      </div>
      <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600 max-w-md mx-auto">
        <p className="text-purple-300">
          🧲 Key Insight: Electromagnets are switchable magnets—turn on current, get magnetism!
        </p>
      </div>
      <button
        onMouseDown={() => {
          playSound('complete');
          if (onPhaseComplete) onPhaseComplete();
        }}
        className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        🎓 Claim Your Badge
      </button>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}

        {/* Phase indicator */}
        <div className="text-center mb-6">
          <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm">
            {phase.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {renderPhase()}

        {/* Navigation */}
        {phase !== 'hook' && phase !== 'mastery' && (
          <div className="mt-8 flex justify-between">
            <button
              onMouseDown={() => {
                const currentIndex = PHASES.indexOf(phase);
                if (currentIndex > 0) {
                  goToPhase(PHASES[currentIndex - 1]);
                }
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            >
              ← Back
            </button>
            <div className="text-gray-500 text-sm">
              {PHASES.indexOf(phase) + 1} / {PHASES.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
