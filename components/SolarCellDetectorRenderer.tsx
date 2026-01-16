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

  const ProgressIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-1.5">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < PHASES.indexOf(phase)
                ? 'bg-amber-500 w-8'
                : i === PHASES.indexOf(phase)
                ? 'bg-amber-400 w-10'
                : 'bg-gray-200 w-6'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-400 tabular-nums">
        {PHASES.indexOf(phase) + 1}/{PHASES.length}
      </span>
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
    <div className="text-center py-4">
      {/* Hero Icon */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl transform rotate-6 opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-16 h-16">
            <circle cx="32" cy="20" r="12" fill="#fef3c7" />
            <path d="M32 35 L20 55 L44 55 Z" fill="#1e3a5f" />
            <rect x="26" y="45" width="12" height="8" fill="#3b82f6" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
        Solar Cells as Light Detectors
      </h1>

      {/* Subtitle */}
      <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto">
        Discover how the same physics that powers solar panels enables
        digital cameras to capture images.
      </p>

      {/* Key insight card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 text-left border border-amber-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">💡</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">The Big Idea</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Every pixel in your phone camera is a tiny solar cell,
              measuring light intensity millions of times per second.
            </p>
          </div>
        </div>
      </div>

      {/* Learning objectives */}
      <div className="flex justify-center gap-6 mb-10">
        {[
          { icon: '☀️', label: 'Photovoltaic Effect' },
          { icon: '📷', label: 'Camera Sensors' },
          { icon: '📊', label: 'Light Detection' },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-xs text-gray-500 font-medium">{item.label}</div>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={() => goToPhase('predict')}>
        Start Learning
      </PrimaryButton>
    </div>
  );

  const renderPredict = () => (
    <div>
      <div className="mb-6">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
          Prediction
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          What do you think?
        </h2>
        <p className="text-gray-600">
          A solar cell is in sunlight. If light intensity <strong>doubles</strong>,
          what happens to the electrical current?
        </p>
      </div>

      <div className="space-y-3 mb-6">
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
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
              prediction === option.id
                ? option.id === 'double'
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : showPredictionFeedback
                ? 'border-gray-100 bg-gray-50 opacity-50'
                : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50 cursor-pointer'
            }`}
          >
            <div className="font-semibold text-gray-900">{option.label}</div>
            <div className="text-sm text-gray-500">{option.desc}</div>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          prediction === 'double'
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{prediction === 'double' ? '✓' : '→'}</span>
            <p className={prediction === 'double' ? 'text-green-800' : 'text-amber-800'}>
              {prediction === 'double'
                ? 'Correct! Photocurrent is directly proportional to light intensity. Each photon creates one electron-hole pair.'
                : 'Actually, current scales linearly with intensity. Double the photons means double the current!'}
            </p>
          </div>
        </div>
      )}

      {showPredictionFeedback && (
        <PrimaryButton onClick={nextPhase}>
          Continue to Experiment
        </PrimaryButton>
      )}
    </div>
  );

  const renderPlay = () => (
    <div>
      <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-3">
          Interactive Lab
        </span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Solar Cell Light Meter
        </h2>
        <p className="text-gray-500 text-sm">
          Adjust the controls and observe how output changes.
        </p>
      </div>

      <SolarCellGraphic />

      <div className="space-y-5 mb-6">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Light Intensity</label>
            <span className="text-sm font-semibold text-amber-600">{lightIntensity}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={lightIntensity}
            onChange={e => { setLightIntensity(Number(e.target.value)); setHasExperimented(true); }}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Panel Angle</label>
            <span className="text-sm font-semibold text-amber-600">{cellAngle}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            value={cellAngle}
            onChange={e => { setCellAngle(Number(e.target.value)); setHasExperimented(true); }}
            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Light Wavelength</label>
          <div className="flex gap-2">
            {[
              { id: 'visible' as const, label: 'Visible', color: 'amber' },
              { id: 'infrared' as const, label: 'Infrared', color: 'red' },
              { id: 'uv' as const, label: 'UV', color: 'purple' },
            ].map(w => (
              <button
                key={w.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setWavelength(w.id);
                  setHasExperimented(true);
                }}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  wavelength === w.id
                    ? `bg-${w.color}-500 text-white shadow-lg`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={wavelength === w.id ? {
                  backgroundColor: w.color === 'amber' ? '#f59e0b' : w.color === 'red' ? '#ef4444' : '#8b5cf6'
                } : {}}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <p className="text-blue-800 text-sm">
          <strong>Key insight:</strong> Current is proportional to intensity.
          The cosine law reduces output at angles. Silicon works best with visible light.
        </p>
      </div>

      <PrimaryButton onClick={nextPhase} disabled={!hasExperimented}>
        {hasExperimented ? 'Continue' : 'Try the controls first...'}
      </PrimaryButton>
    </div>
  );

  const renderReview = () => (
    <div>
      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
        Key Concepts
      </span>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        The Photovoltaic Effect
      </h2>

      <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 mb-6 text-center">
        <div className="text-xl font-semibold text-gray-800 mb-2">
          Photon → Electron-Hole Pair → Current
        </div>
        <p className="text-amber-700 text-sm">
          Each photon with sufficient energy frees one electron
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          { icon: '📊', title: 'Linear Response', desc: 'Photocurrent is proportional to light intensity—ideal for measurement' },
          { icon: '📐', title: 'Cosine Law', desc: 'Tilting reduces effective capture area. At 60°, output halves.' },
          { icon: '🌈', title: 'Spectral Sensitivity', desc: 'Silicon peaks near 900nm (red/near-IR). Different materials vary.' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={nextPhase}>
        Discover the Twist
      </PrimaryButton>
    </div>
  );

  const renderTwistPredict = () => (
    <div>
      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
        Plot Twist
      </span>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        The Camera Connection
      </h2>
      <p className="text-gray-600 mb-6">
        A digital camera has millions of pixels. What is each pixel fundamentally doing?
      </p>

      <div className="space-y-3 mb-6">
        {[
          { id: 'color', label: 'Detecting colors', desc: 'Sensing different wavelengths' },
          { id: 'memory', label: 'Storing data', desc: 'Recording image information' },
          { id: 'photodetector', label: 'Measuring light intensity', desc: 'Like a tiny solar cell' },
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => {
              e.preventDefault();
              handleTwistPrediction(option.id);
            }}
            disabled={showTwistFeedback}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
              twistPrediction === option.id
                ? option.id === 'photodetector'
                  ? 'border-green-500 bg-green-50'
                  : 'border-amber-300 bg-amber-50'
                : showTwistFeedback
                ? 'border-gray-100 bg-gray-50 opacity-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer'
            }`}
          >
            <div className="font-semibold text-gray-900">{option.label}</div>
            <div className="text-sm text-gray-500">{option.desc}</div>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          twistPrediction === 'photodetector'
            ? 'bg-green-50 border border-green-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <p className={twistPrediction === 'photodetector' ? 'text-green-800' : 'text-amber-800'}>
            {twistPrediction === 'photodetector'
              ? 'Exactly! Each pixel is a tiny photodiode measuring light intensity. Color comes from filters (Bayer pattern)!'
              : 'Each pixel is fundamentally a light detector—a tiny photodiode. Color filters are added separately!'}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <PrimaryButton onClick={nextPhase}>
          Explore Camera Sensors
        </PrimaryButton>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div>
      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-3">
        Interactive Demo
      </span>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Camera Sensor Pixels
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        Each square is a photodetector measuring light intensity.
      </p>

      <CameraSensorGraphic />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">📷</div>
          <div className="font-semibold text-gray-900 text-sm">CCD/CMOS</div>
          <div className="text-gray-500 text-xs">Photodiode arrays</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🎨</div>
          <div className="font-semibold text-gray-900 text-sm">Bayer Filter</div>
          <div className="text-gray-500 text-xs">RGGB color pattern</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <p className="text-blue-800 text-sm">
          <strong>Fun fact:</strong> Your phone camera has 12+ megapixels—12 million
          photodetectors measuring light 30-60 times per second for video!
        </p>
      </div>

      <PrimaryButton onClick={nextPhase} disabled={!hasExploredTwist}>
        {hasExploredTwist ? 'Continue' : 'Interact with the sensor...'}
      </PrimaryButton>
    </div>
  );

  const renderTwistReview = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Photodetectors Everywhere
      </h2>

      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-6">
        <h3 className="font-semibold text-gray-800 text-center mb-4">The Photoelectric Family</h3>
        <div className="flex justify-around">
          {[
            { icon: '☀️', label: 'Solar Cells' },
            { icon: '📷', label: 'Cameras' },
            { icon: '💡', label: 'Light Sensors' },
            { icon: '🩺', label: 'Medical' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs text-gray-600">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="p-4 bg-white rounded-xl border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-1">Same Physics, Different Uses</h4>
          <p className="text-gray-600 text-sm">
            Power generation and light detection both use the photovoltaic effect.
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-1">Analog to Digital</h4>
          <p className="text-gray-600 text-sm">
            Continuous light becomes discrete values (0-255 for 8-bit images).
          </p>
        </div>
      </div>

      <PrimaryButton onClick={nextPhase}>
        Real-World Applications
      </PrimaryButton>
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
      <div>
        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
          Applications
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Real-World Uses
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Explore all 4 applications to unlock the knowledge test.
        </p>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {apps.map((app, i) => (
            <button
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveAppTab(i);
                if (!completedApps.has(i)) {
                  handleCompleteApp(i);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                activeAppTab === i
                  ? 'bg-amber-500 text-white shadow-lg'
                  : completedApps.has(i)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{app.icon}</span>
              <span>{app.title}</span>
              {completedApps.has(i) && activeAppTab !== i && <span>✓</span>}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <div className="bg-gray-50 rounded-2xl p-5 mb-6">
          <div className="bg-white rounded-xl mb-4 overflow-hidden">
            {apps[activeAppTab].graphic}
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            {apps[activeAppTab].title}
          </h3>
          <p className="text-gray-600">
            {apps[activeAppTab].desc}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-gray-500">
            {completedApps.size}/4 applications reviewed
          </span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  completedApps.has(i) ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <PrimaryButton onClick={nextPhase} disabled={completedApps.size < 4}>
          {completedApps.size >= 4 ? 'Take Knowledge Test' : `Review all 4 applications first`}
        </PrimaryButton>
      </div>
    );
  };

  const renderTest = () => {
    const allAnswered = !testAnswers.includes(-1);

    if (testScore !== null) {
      const passed = testScore >= 7;
      return (
        <div className="text-center py-6">
          <div className={`text-7xl mb-6 ${passed ? 'animate-bounce' : ''}`}>
            {passed ? '🎉' : '📚'}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {testScore}/10 Correct
          </h2>
          <p className="text-gray-600 mb-8">
            {passed
              ? 'Excellent! You\'ve mastered photodetection concepts!'
              : 'Review the material and try again to improve your score.'}
          </p>
          <PrimaryButton onClick={nextPhase}>
            {passed ? 'Complete Lesson' : 'See Summary'}
          </PrimaryButton>
        </div>
      );
    }

    return (
      <div>
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
          Knowledge Test
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Test Your Understanding
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Answer all 10 questions. You need 7 correct to pass.
        </p>

        <div className="space-y-6 mb-6">
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} className="bg-gray-50 rounded-2xl p-4">
              <p className="font-medium text-gray-900 mb-3 text-sm">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTestAnswer(qIndex, oIndex);
                    }}
                    className={`p-3 rounded-xl text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-amber-50 border border-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <PrimaryButton onClick={handleSubmitTest} disabled={!allAnswered}>
          {allAnswered ? 'Submit Answers' : `Answer all questions (${testAnswers.filter(a => a !== -1).length}/10)`}
        </PrimaryButton>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center py-6">
      <div className="text-7xl mb-6">🏆</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Congratulations!
      </h2>
      <p className="text-gray-600 mb-8">
        You&apos;ve mastered Solar Cell Light Detection.
      </p>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-gray-900 mb-4">Key Takeaways</h3>
        <ul className="space-y-3">
          {[
            'Photocurrent is proportional to light intensity',
            'Solar cells and camera pixels use the same physics',
            'The cosine law affects light capture at angles',
            'Photodetectors enable countless modern technologies',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-amber-500 font-bold">✓</span>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <PrimaryButton onClick={() => goToPhase('hook')} variant="secondary">
        Review Again
      </PrimaryButton>
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50">
      <div className="max-w-md mx-auto px-5 py-8">
        <ProgressIndicator />
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
