'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { playSound } from '../lib/audio';

// ────────────────────────────────────────────────────────────────────────────
// PREMIUM DESIGN SYSTEM
// ────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FCD34D',
  background: '#FFFBEB',
  surface: '#FFFFFF',
  surfaceAlt: '#FEF3C7',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#059669',
  successLight: '#D1FAE5',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  border: '#E5E7EB',
  borderFocus: '#F59E0B',
};

// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

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

const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery',
];

interface SavedState {
  phase: Phase;
  completedApps: number[];
  testAnswers: number[];
  testScore: number | null;
}

interface GameEvent {
  type: 'state_update' | 'completion' | 'tool_call';
  phase: Phase;
  data: Record<string, unknown>;
}

interface SolarCellDetectorRendererProps {
  onStateChange?: (state: SavedState) => void;
  onEvent?: (event: GameEvent) => void;
  savedState?: SavedState | null;
}

// ────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS (10 questions)
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'How does photocurrent relate to light intensity in a solar cell?',
    options: ['Logarithmically', 'Linearly (proportional)', 'Exponentially', 'Inversely'],
    correct: 1,
  },
  {
    question: 'What determines a pixel\'s brightness value in a digital camera?',
    options: ['The color of light', 'Light intensity measured by photodetector', 'Random noise', 'Shutter speed only'],
    correct: 1,
  },
  {
    question: 'Why does tilting a solar cell reduce its output?',
    options: ['Cosine law reduces effective area', 'Heat buildup', 'Photons bounce off', 'Wiring issues'],
    correct: 0,
  },
  {
    question: 'What happens when a photon hits a solar cell?',
    options: ['It heats the cell', 'Creates electron-hole pair', 'Reflects away', 'Nothing'],
    correct: 1,
  },
  {
    question: 'Which wavelength is silicon most efficient at converting?',
    options: ['Ultraviolet', 'Blue', 'Red/Near-infrared', 'Radio waves'],
    correct: 2,
  },
  {
    question: 'What is the photovoltaic effect?',
    options: ['Heat generation', 'Light to electricity conversion', 'Electricity to light', 'Sound to electricity'],
    correct: 1,
  },
  {
    question: 'How do phone light sensors adjust screen brightness?',
    options: ['By time of day', 'Measuring ambient light intensity', 'User settings only', 'Battery level'],
    correct: 1,
  },
  {
    question: 'What does a Bayer filter do in a camera sensor?',
    options: ['Blocks all light', 'Adds color information to pixels', 'Increases brightness', 'Reduces noise'],
    correct: 1,
  },
  {
    question: 'At 60° tilt, how much current does a solar cell produce compared to 0°?',
    options: ['Same amount', 'About 50% (cos 60°)', 'Zero', '75%'],
    correct: 1,
  },
  {
    question: 'Why are solar cells useful as light detectors?',
    options: ['They\'re cheap', 'Linear response to intensity', 'They\'re colorful', 'They make noise'],
    correct: 1,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function SolarCellDetectorRenderer({
  onStateChange,
  onEvent,
  savedState,
}: SolarCellDetectorRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>(savedState?.phase || 'hook');
  const [completedApps, setCompletedApps] = useState<Set<number>>(
    new Set(savedState?.completedApps || [])
  );
  const [testAnswers, setTestAnswers] = useState<number[]>(
    savedState?.testAnswers || Array(10).fill(-1)
  );
  const [testScore, setTestScore] = useState<number | null>(
    savedState?.testScore ?? null
  );

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase state
  const [lightIntensity, setLightIntensity] = useState(50);
  const [cellAngle, setCellAngle] = useState(0);
  const [wavelength, setWavelength] = useState<'visible' | 'infrared' | 'uv'>('visible');
  const [hasExperimented, setHasExperimented] = useState(false);

  // Twist phase state
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Transfer phase - tabbed applications
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Navigation lock with shorter timeout for responsiveness
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const state: SavedState = {
      phase,
      completedApps: Array.from(completedApps),
      testAnswers,
      testScore,
    };
    onStateChange?.(state);
  }, [phase, completedApps, testAnswers, testScore, onStateChange]);

  useEffect(() => {
    const event: GameEvent = {
      type: phase === 'mastery' ? 'completion' : 'state_update',
      phase,
      data: { testScore },
    };
    onEvent?.(event);
  }, [phase, testScore, onEvent]);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION - Optimized for single-click reliability
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 200);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // ──────────────────────────────────────────────────────────────────────────
  // PHYSICS CALCULATIONS
  // ──────────────────────────────────────────────────────────────────────────

  const getAngleEfficiency = useCallback(() => {
    return Math.cos((cellAngle * Math.PI) / 180);
  }, [cellAngle]);

  const getWavelengthEfficiency = useCallback(() => {
    switch (wavelength) {
      case 'visible': return 0.85;
      case 'infrared': return 0.5;
      case 'uv': return 0.3;
      default: return 0.85;
    }
  }, [wavelength]);

  const getOutputCurrent = useCallback(() => {
    const baseOutput = lightIntensity / 100;
    return baseOutput * getAngleEfficiency() * getWavelengthEfficiency();
  }, [lightIntensity, getAngleEfficiency, getWavelengthEfficiency]);

  const getOutputVoltage = useCallback(() => {
    const current = getOutputCurrent();
    if (current <= 0) return 0;
    return 0.45 + 0.1 * Math.log10(current * 100 + 1);
  }, [getOutputCurrent]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS - Optimized for reliability
  // ──────────────────────────────────────────────────────────────────────────

  const handlePrediction = useCallback((choice: string) => {
    if (showPredictionFeedback) return;
    playSound('click');
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, [showPredictionFeedback]);

  const handleTwistPrediction = useCallback((choice: string) => {
    if (showTwistFeedback) return;
    playSound('click');
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, [showTwistFeedback]);

  const handleCompleteApp = useCallback((appIndex: number) => {
    playSound('success');
    setCompletedApps(prev => new Set([...prev, appIndex]));
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    playSound('click');
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer === TEST_QUESTIONS[index].correct) score++;
    });
    setTestScore(score);
    playSound(score >= 7 ? 'success' : 'failure');
  }, [testAnswers]);

  // ──────────────────────────────────────────────────────────────────────────
  // PREMIUM COMPONENTS
  // ──────────────────────────────────────────────────────────────────────────

  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist Predict', twist_play: 'Twist Lab', twist_review: 'Twist Review',
    transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
  };

  const ProgressIndicator = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
        <span className="text-sm font-semibold text-white/80 tracking-wide">Solar Cell Detector</span>
        <div className="flex items-center gap-1.5">
          {PHASES.map((p, i) => (
            <button
              key={p}
              onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                phase === p
                  ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                  : i < PHASES.indexOf(phase)
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-700 w-2 hover:bg-slate-600'
              }`}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
      </div>
    </div>
  );

  const PrimaryButton = ({
    children,
    onClick,
    disabled = false,
    variant = 'primary'
  }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={`
        w-full py-4 px-6 rounded-2xl font-semibold text-lg
        transition-all duration-200 transform
        ${disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : variant === 'primary'
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
    >
      {children}
    </button>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // GRAPHICS COMPONENTS
  // ──────────────────────────────────────────────────────────────────────────

  const SolarCellGraphic = () => {
    const current = getOutputCurrent();
    const voltage = getOutputVoltage();
    const efficiency = getAngleEfficiency() * getWavelengthEfficiency() * 100;

    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 mb-6">
        <svg viewBox="0 0 400 200" className="w-full h-48">
          {/* Sun */}
          <defs>
            <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <circle cx="50" cy="50" r="30" fill="url(#sunGradient)" filter="url(#glow)" />

          {/* Light rays */}
          {[...Array(5)].map((_, i) => (
            <line
              key={i}
              x1={80}
              y1={35 + i * 8}
              x2={140}
              y2={70 + i * 5}
              stroke={wavelength === 'visible' ? '#FCD34D' : wavelength === 'infrared' ? '#F87171' : '#A78BFA'}
              strokeWidth="3"
              strokeLinecap="round"
              opacity={lightIntensity / 100}
            >
              <animate
                attributeName="opacity"
                values={`${lightIntensity/100*0.6};${lightIntensity/100};${lightIntensity/100*0.6}`}
                dur="1.5s"
                repeatCount="indefinite"
              />
            </line>
          ))}

          {/* Solar Panel */}
          <g transform={`translate(200, 100) rotate(${cellAngle})`}>
            <rect x="-50" y="-60" width="100" height="120" rx="8" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" />
            {/* Grid pattern */}
            {[-40, -20, 0, 20, 40].map(y => (
              <line key={y} x1="-45" y1={y} x2="45" y2={y} stroke="#2563eb" strokeWidth="1" opacity="0.5" />
            ))}
            {[-30, 0, 30].map(x => (
              <line key={x} x1={x} y1="-55" x2={x} y2="55" stroke="#2563eb" strokeWidth="1" opacity="0.5" />
            ))}
            {/* Active glow */}
            <rect
              x="-48"
              y="-58"
              width={96 * Math.max(0.1, efficiency / 100)}
              height="116"
              fill="#3b82f6"
              opacity="0.3"
              rx="6"
            />
          </g>

          {/* Output Display */}
          <g transform="translate(300, 30)">
            <rect width="90" height="140" rx="12" fill="rgba(255,255,255,0.1)" />
            <text x="45" y="25" textAnchor="middle" fill="#9ca3af" fontSize="10" fontWeight="600">OUTPUT</text>

            <rect x="8" y="35" width="74" height="45" rx="8" fill="rgba(59,130,246,0.2)" />
            <text x="45" y="55" textAnchor="middle" fill="#60a5fa" fontSize="9">CURRENT</text>
            <text x="45" y="72" textAnchor="middle" fill="#93c5fd" fontSize="16" fontWeight="700">
              {(current * 100).toFixed(1)} mA
            </text>

            <rect x="8" y="88" width="74" height="45" rx="8" fill="rgba(251,191,36,0.2)" />
            <text x="45" y="108" textAnchor="middle" fill="#fbbf24" fontSize="9">VOLTAGE</text>
            <text x="45" y="125" textAnchor="middle" fill="#fcd34d" fontSize="16" fontWeight="700">
              {voltage.toFixed(2)} V
            </text>
          </g>

          {/* Labels */}
          <text x="50" y="95" textAnchor="middle" fill="#9ca3af" fontSize="10">
            {lightIntensity}% Light
          </text>
          <text x="200" y="175" textAnchor="middle" fill="#9ca3af" fontSize="10">
            {cellAngle}° Tilt
          </text>
        </svg>
      </div>
    );
  };

  const CameraSensorGraphic = () => {
    const pixels = Array.from({ length: 64 }, (_, i) => {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const brightness = Math.sin((row + col) * 0.5) * 0.3 + 0.5;
      return Math.floor(brightness * 255);
    });

    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 mb-6">
        <svg viewBox="0 0 400 180" className="w-full h-44">
          {/* Scene */}
          <g transform="translate(20, 20)">
            <rect width="90" height="120" rx="8" fill="#374151" />
            <circle cx="45" cy="35" r="22" fill="#fef08a" />
            <rect x="25" y="70" width="40" height="35" rx="4" fill="#3b82f6" />
            <text x="45" y="145" textAnchor="middle" fill="#9ca3af" fontSize="10">Scene</text>
          </g>

          {/* Lens */}
          <ellipse cx="150" cy="80" rx="12" ry="35" fill="none" stroke="#6366f1" strokeWidth="3" />
          <text x="150" y="130" textAnchor="middle" fill="#6366f1" fontSize="10">Lens</text>

          {/* Light path */}
          <path d="M 115 80 L 138 80 M 162 80 L 200 80" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4" />

          {/* Sensor */}
          <g transform="translate(210, 15)">
            <rect x="-5" y="-5" width="135" height="135" rx="8" fill="#1f2937" />
            {pixels.map((value, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              return (
                <rect
                  key={i}
                  x={col * 16}
                  y={row * 16}
                  width="15"
                  height="15"
                  rx="2"
                  fill={`rgb(${value}, ${value}, ${value})`}
                  onMouseEnter={() => setHasExploredTwist(true)}
                />
              );
            })}
            <text x="62" y="145" textAnchor="middle" fill="#9ca3af" fontSize="10">Image Sensor</text>
          </g>
        </svg>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // APPLICATION TAB GRAPHICS
  // ──────────────────────────────────────────────────────────────────────────

  const AppGraphic1 = () => (
    <svg viewBox="0 0 300 160" className="w-full h-40">
      <defs>
        <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
      </defs>
      {/* Phone */}
      <rect x="100" y="10" width="100" height="140" rx="12" fill="url(#phoneGrad)" />
      <rect x="105" y="25" width="90" height="110" rx="4" fill="#fef3c7" />

      {/* Sun indicator */}
      <circle cx="150" cy="0" r="15" fill="#fcd34d" opacity="0.8">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Light sensor */}
      <circle cx="150" cy="17" r="3" fill="#60a5fa" />

      {/* Brightness bar */}
      <rect x="115" y="100" width="70" height="8" rx="4" fill="#d1d5db" />
      <rect x="115" y="100" width="50" height="8" rx="4" fill="#f59e0b">
        <animate attributeName="width" values="30;60;30" dur="3s" repeatCount="indefinite" />
      </rect>

      <text x="150" y="125" textAnchor="middle" fill="#6b7280" fontSize="10">Auto Brightness</text>
    </svg>
  );

  const AppGraphic2 = () => (
    <svg viewBox="0 0 300 160" className="w-full h-40">
      {/* Scanner beam */}
      <rect x="50" y="60" width="200" height="40" rx="4" fill="#374151" />

      {/* Barcode */}
      {[60, 75, 85, 100, 110, 130, 145, 160, 175, 190, 210, 225].map((x, i) => (
        <rect key={i} x={x} y="70" width={i % 3 === 0 ? 4 : 2} height="20" fill="white" />
      ))}

      {/* Laser line */}
      <line x1="50" y1="80" x2="250" y2="80" stroke="#ef4444" strokeWidth="2">
        <animate attributeName="y1" values="75;85;75" dur="0.5s" repeatCount="indefinite" />
        <animate attributeName="y2" values="75;85;75" dur="0.5s" repeatCount="indefinite" />
      </line>

      {/* Photodetector */}
      <rect x="125" y="110" width="50" height="20" rx="4" fill="#3b82f6" />
      <text x="150" y="123" textAnchor="middle" fill="white" fontSize="8">Detector</text>

      <text x="150" y="150" textAnchor="middle" fill="#6b7280" fontSize="10">Barcode Scanner</text>
    </svg>
  );

  const AppGraphic3 = () => (
    <svg viewBox="0 0 300 160" className="w-full h-40">
      {/* Sun */}
      <circle cx="150" cy="20" r="15" fill="#fcd34d">
        <animate attributeName="cx" values="80;220;80" dur="8s" repeatCount="indefinite" />
      </circle>

      {/* Solar panel mount */}
      <rect x="140" y="120" width="20" height="30" fill="#6b7280" />

      {/* Panel */}
      <g transform="translate(150, 100)">
        <rect x="-50" y="-30" width="100" height="60" rx="4" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2">
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-30;30;-30"
            dur="8s"
            repeatCount="indefinite"
          />
        </rect>
      </g>

      {/* Dual sensors */}
      <circle cx="110" cy="85" r="5" fill="#22c55e" />
      <circle cx="190" cy="85" r="5" fill="#22c55e" />

      <text x="150" y="155" textAnchor="middle" fill="#6b7280" fontSize="10">Solar Tracking</text>
    </svg>
  );

  const AppGraphic4 = () => (
    <svg viewBox="0 0 300 160" className="w-full h-40">
      {/* Pulse oximeter */}
      <rect x="100" y="30" width="100" height="80" rx="12" fill="#374151" />

      {/* Finger slot */}
      <ellipse cx="150" cy="50" rx="25" ry="12" fill="#fcd9b8" />

      {/* LED */}
      <circle cx="130" cy="50" r="4" fill="#ef4444">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
      </circle>

      {/* Detector */}
      <circle cx="170" cy="50" r="4" fill="#3b82f6" />

      {/* Display */}
      <rect x="115" y="70" width="70" height="30" rx="4" fill="#1f2937" />
      <text x="150" y="90" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">98%</text>

      {/* Pulse wave */}
      <path d="M 50 130 Q 75 130, 100 130 T 125 110 T 150 130 T 175 130 T 200 130 T 225 110 T 250 130"
            fill="none" stroke="#ef4444" strokeWidth="2">
        <animate attributeName="d"
                 values="M 50 130 Q 75 130, 100 130 T 125 110 T 150 130 T 175 130 T 200 130 T 225 110 T 250 130;
                         M 50 130 Q 75 130, 100 110 T 125 130 T 150 130 T 175 110 T 200 130 T 225 130 T 250 130;
                         M 50 130 Q 75 130, 100 130 T 125 110 T 150 130 T 175 130 T 200 130 T 225 110 T 250 130"
                 dur="1s" repeatCount="indefinite" />
      </path>

      <text x="150" y="150" textAnchor="middle" fill="#6b7280" fontSize="10">Pulse Oximeter</text>
    </svg>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
        Solar Cells as Light Detectors
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how the same physics that powers solar panels enables digital cameras to capture images
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 rounded-3xl" />

        <div className="relative">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-14 h-14">
                <circle cx="32" cy="20" r="12" fill="#fef3c7" />
                <path d="M32 35 L20 55 L44 55 Z" fill="#1e3a5f" />
                <rect x="26" y="45" width="12" height="8" fill="#3b82f6" />
              </svg>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Every pixel in your phone camera is a tiny solar cell
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              measuring light intensity millions of times per second
            </p>
            <div className="pt-2">
              <p className="text-base text-amber-400 font-semibold">
                How does light become electricity?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase('predict'); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Start Learning
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          Photovoltaic Effect
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          Camera Sensors
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          Light Detection
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A solar cell is in sunlight. If light intensity <strong className="text-amber-400">doubles</strong>,
          what happens to the electrical current?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'same', label: 'Stays the same', desc: 'Limited by material properties' },
          { id: 'double', label: 'Approximately doubles', desc: 'Proportional increase' },
          { id: 'quadruple', label: 'Quadruples', desc: 'Exponential relationship' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePrediction(option.id);
            }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && prediction === option.id
                ? option.id === 'double' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'double' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.label}</span>
            <span className="text-slate-400 ml-2 text-sm">- {option.desc}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {prediction === 'double'
              ? '✓ Correct! Photocurrent is directly proportional to light intensity. Each photon creates one electron-hole pair.'
              : '→ Actually, current scales linearly with intensity. Double the photons means double the current!'}
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            Continue to Experiment →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Solar Cell Light Meter</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
        <SolarCellGraphic />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Light Intensity: {lightIntensity}%</label>
          <input type="range" min="10" max="100" value={lightIntensity} onChange={e => { setLightIntensity(Number(e.target.value)); setHasExperimented(true); }} className="w-full accent-amber-500" />
          <p className="text-xs text-slate-400 mt-1">More light = more current</p>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Panel Angle: {cellAngle}°</label>
          <input type="range" min="0" max="80" value={cellAngle} onChange={e => { setCellAngle(Number(e.target.value)); setHasExperimented(true); }} className="w-full accent-amber-500" />
          <p className="text-xs text-slate-400 mt-1">Cosine law reduces output</p>
        </div>
      </div>
      <div className="bg-slate-700/50 rounded-xl p-4 w-full max-w-2xl mb-6">
        <label className="text-slate-300 text-sm block mb-2">Light Wavelength</label>
        <div className="flex gap-2">
          {[
            { id: 'visible' as const, label: 'Visible', color: '#f59e0b' },
            { id: 'infrared' as const, label: 'Infrared', color: '#ef4444' },
            { id: 'uv' as const, label: 'UV', color: '#8b5cf6' },
          ].map(w => (
            <button
              key={w.id}
              onMouseDown={(e) => { e.preventDefault(); setWavelength(w.id); setHasExperimented(true); }}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${wavelength === w.id ? 'text-white shadow-lg' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
              style={wavelength === w.id ? { backgroundColor: w.color } : {}}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl mb-6">
        <h3 className="text-lg font-semibold text-amber-400 mb-2">Key Insight</h3>
        <p className="text-slate-300 text-sm">
          Current is proportional to intensity. The cosine law reduces output at angles. Silicon works best with visible light.
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); if (hasExperimented) nextPhase(); }} className={`px-6 py-3 font-semibold rounded-xl ${hasExperimented ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
        {hasExperimented ? 'Review the Concepts →' : 'Try the controls first...'}
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding the Photovoltaic Effect</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">☀️ How It Works</h3>
          <div className="text-lg font-semibold text-white mb-2">Photon → Electron-Hole Pair → Current</div>
          <p className="text-slate-300 text-sm">Each photon with sufficient energy frees one electron</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">📊 Linear Response</h3>
          <p className="text-slate-300 text-sm">Photocurrent is proportional to light intensity—ideal for measurement</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">📐 Cosine Law</h3>
          <p className="text-slate-300 text-sm">Tilting reduces effective capture area. At 60°, output halves.</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">🌈 Spectral Sensitivity</h3>
          <p className="text-slate-300 text-sm">Silicon peaks near 900nm (red/near-IR). Different materials vary.</p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); nextPhase(); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover a Surprising Twist →
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Camera Connection</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A digital camera has millions of pixels. What is each pixel fundamentally doing?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'color', label: 'Detecting colors', desc: 'Sensing different wavelengths' },
          { id: 'memory', label: 'Storing data', desc: 'Recording image information' },
          { id: 'photodetector', label: 'Measuring light intensity', desc: 'Like a tiny solar cell' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'photodetector' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'photodetector' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.label}</span>
            <span className="text-slate-400 ml-2 text-sm">- {option.desc}</span>
          </button>
        ))}
      </div>
      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'photodetector'
              ? '✓ Exactly! Each pixel is a tiny photodiode measuring light intensity. Color comes from filters (Bayer pattern)!'
              : '→ Each pixel is fundamentally a light detector—a tiny photodiode. Color filters are added separately!'}
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); nextPhase(); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl">
            Explore Camera Sensors →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Camera Sensor Pixels</h2>
      <p className="text-slate-400 mb-4">Each square is a photodetector measuring light intensity.</p>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 w-full max-w-2xl">
        <CameraSensorGraphic />
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">📷</div>
          <div className="font-semibold text-white text-sm">CCD/CMOS</div>
          <div className="text-slate-400 text-xs">Photodiode arrays</div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🎨</div>
          <div className="font-semibold text-white text-sm">Bayer Filter</div>
          <div className="text-slate-400 text-xs">RGGB color pattern</div>
        </div>
      </div>
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl mb-6">
        <p className="text-cyan-400 text-sm">
          <strong>Fun fact:</strong> Your phone camera has 12+ megapixels—12 million photodetectors measuring light 30-60 times per second for video!
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); if (hasExploredTwist) nextPhase(); }} className={`px-6 py-3 font-semibold rounded-xl ${hasExploredTwist ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
        {hasExploredTwist ? 'Review the Discovery →' : 'Interact with the sensor...'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Photodetectors Everywhere</h2>
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4 text-center">The Photoelectric Family</h3>
        <div className="flex justify-around">
          {[
            { icon: '☀️', label: 'Solar Cells' },
            { icon: '📷', label: 'Cameras' },
            { icon: '💡', label: 'Light Sensors' },
            { icon: '🩺', label: 'Medical' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-xs text-slate-300">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="font-semibold text-white mb-1">Same Physics, Different Uses</h4>
          <p className="text-slate-400 text-sm">Power generation and light detection both use the photovoltaic effect.</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="font-semibold text-white mb-1">Analog to Digital</h4>
          <p className="text-slate-400 text-sm">Continuous light becomes discrete values (0-255 for 8-bit images).</p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); nextPhase(); }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
        Explore Real-World Applications →
      </button>
    </div>
  );

  const renderTransfer = () => {
    const apps = [
      {
        title: 'Screen Brightness',
        icon: '📱',
        desc: 'Phone sensors detect ambient light and automatically adjust display brightness for comfort and battery life.',
        graphic: <AppGraphic1 />,
      },
      {
        title: 'Barcode Scanners',
        icon: '📊',
        desc: 'Photodetectors read patterns of light and dark bars as products pass, enabling fast checkout systems.',
        graphic: <AppGraphic2 />,
      },
      {
        title: 'Solar Tracking',
        icon: '☀️',
        desc: 'Paired solar cells detect which direction has more light, automatically aiming panels for maximum power.',
        graphic: <AppGraphic3 />,
      },
      {
        title: 'Pulse Oximeters',
        icon: '🩺',
        desc: 'Light through your finger is detected to measure blood oxygen levels and pulse rate non-invasively.',
        graphic: <AppGraphic4 />,
      },
    ];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          {apps.map((app, index) => (
            <button
              key={index}
              onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); if (!completedApps.has(index)) handleCompleteApp(index); }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeAppTab === index ? 'bg-amber-600 text-white'
                : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {app.icon} {app.title}
            </button>
          ))}
        </div>
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{apps[activeAppTab].icon}</span>
            <h3 className="text-xl font-bold text-white">{apps[activeAppTab].title}</h3>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
            {apps[activeAppTab].graphic}
          </div>
          <p className="text-lg text-slate-300">{apps[activeAppTab].desc}</p>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <span className="text-slate-400">Progress:</span>
          <div className="flex gap-1">{apps.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
          <span className="text-slate-400">{completedApps.size}/4</span>
        </div>
        {completedApps.size >= 4 && (
          <button onMouseDown={(e) => { e.preventDefault(); nextPhase(); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
            Take the Knowledge Test →
          </button>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const allAnswered = !testAnswers.includes(-1);

    if (testScore !== null) {
      const passed = testScore >= 7;
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl">
            <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">Score: {testScore}/10</h3>
            <p className="text-slate-300 mb-6">{passed ? 'Excellent! You\'ve mastered photodetection concepts!' : 'Keep studying! Review and try again.'}</p>
            {passed ? (
              <button onMouseDown={(e) => { e.preventDefault(); nextPhase(); }} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl">
                Claim Your Mastery Badge →
              </button>
            ) : (
              <button onMouseDown={(e) => { e.preventDefault(); setTestScore(null); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl">
                Review & Try Again
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
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
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onMouseDown={(e) => { e.preventDefault(); if (allAnswered) handleSubmitTest(); }}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${!allAnswered ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'}`}
          >
            {allAnswered ? 'Submit Answers' : `Answer all questions (${testAnswers.filter(a => a !== -1).length}/10)`}
          </button>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-amber-900/50 via-orange-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">☀️</div>
        <h1 className="text-3xl font-bold text-white mb-4">Solar Cell Light Detection Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You&apos;ve mastered the physics of photodetection!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">☀️</div><p className="text-sm text-slate-300">Photovoltaic Effect</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📷</div><p className="text-sm text-slate-300">Camera Sensors</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📐</div><p className="text-sm text-slate-300">Cosine Law</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🩺</div><p className="text-sm text-slate-300">Medical Devices</p></div>
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); goToPhase('hook'); }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">↺ Explore Again</button>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <ProgressIndicator />

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        {renderContent()}
      </div>
    </div>
  );
}
