'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

interface GeneratorStartupRendererProps {
  phase?: Phase; // Optional - used for resume functionality
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'Why does a diesel generator take 10+ seconds to start?',
    options: [
      { text: 'The fuel takes time to reach the engine', correct: false },
      { text: 'Rotational inertia: heavy rotating mass must accelerate to full speed', correct: true },
      { text: 'The generator is in sleep mode', correct: false },
      { text: 'Safety regulations require a delay', correct: false },
    ],
  },
  {
    question: 'What does generator "synchronization" mean?',
    options: [
      { text: 'Connecting two generators via cable', correct: false },
      { text: 'Matching frequency, voltage, and phase before connecting to load', correct: true },
      { text: 'Starting multiple generators at once', correct: false },
      { text: 'Updating the generator software', correct: false },
    ],
  },
  {
    question: 'What causes frequency droop during load pickup?',
    options: [
      { text: 'The fuel runs out', correct: false },
      { text: 'Sudden load slows the engine before governor can compensate', correct: true },
      { text: 'The generator overheats', correct: false },
      { text: 'Electrical interference', correct: false },
    ],
  },
  {
    question: 'What is the standard AC frequency in North America?',
    options: [
      { text: '50 Hz', correct: false },
      { text: '60 Hz', correct: true },
      { text: '100 Hz', correct: false },
      { text: '120 Hz', correct: false },
    ],
  },
  {
    question: 'Why do data centers use "load acceptance rate" limits?',
    options: [
      { text: 'To save fuel', correct: false },
      { text: 'To prevent excessive frequency droop during load pickup', correct: true },
      { text: 'To make generators last longer', correct: false },
      { text: 'Government regulations require it', correct: false },
    ],
  },
  {
    question: 'What is the role of a flywheel on a generator?',
    options: [
      { text: 'Generate electricity directly', correct: false },
      { text: 'Store rotational energy for load stability and smoother operation', correct: true },
      { text: 'Cool the engine', correct: false },
      { text: 'Filter the fuel', correct: false },
    ],
  },
  {
    question: 'What happens if you connect a generator that is not synchronized?',
    options: [
      { text: 'Nothing - it will sync automatically', correct: false },
      { text: 'Severe mechanical stress and potential damage', correct: true },
      { text: 'The lights flicker briefly', correct: false },
      { text: 'The generator runs faster', correct: false },
    ],
  },
  {
    question: 'What is "black start" capability?',
    options: [
      { text: 'Starting a generator at night', correct: false },
      { text: 'Ability to start without external power (using batteries)', correct: true },
      { text: 'Starting with black fuel', correct: false },
      { text: 'Emergency shutdown procedure', correct: false },
    ],
  },
  {
    question: 'How does a governor control generator frequency?',
    options: [
      { text: 'By adjusting voltage output', correct: false },
      { text: 'By controlling fuel flow to maintain engine speed', correct: true },
      { text: 'By changing the number of poles', correct: false },
      { text: 'By heating the windings', correct: false },
    ],
  },
  {
    question: 'Why do most data center generators run at 1800 RPM (North America)?',
    options: [
      { text: 'It is the quietest speed', correct: false },
      { text: '4-pole generator at 1800 RPM produces 60 Hz', correct: true },
      { text: 'Fuel efficiency is best at that speed', correct: false },
      { text: 'Regulations require it', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Data Center Backup Power',
    icon: '🏢',
    description: 'Data centers use diesel generators as backup. The 10-15 second startup time is why UPS batteries bridge the gap. Critical facilities often have multiple redundant generators.',
  },
  {
    title: 'Hospital Emergency Power',
    icon: '🏥',
    description: 'Hospitals must maintain power to operating rooms and life support. Generators start within 10 seconds, with automatic transfer switches ensuring seamless transition.',
  },
  {
    title: 'Grid Frequency Regulation',
    icon: '⚡',
    description: 'Power grids constantly balance supply and demand. Large generators respond to frequency changes - too much load causes frequency to drop, triggering governor response.',
  },
  {
    title: 'Ship Propulsion Systems',
    icon: '🚢',
    description: 'Large ships use diesel-electric propulsion. Understanding generator dynamics is crucial for maneuvering - sudden propulsion demands cause significant frequency droop.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

// Phase labels for progress bar
const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Observer Effect',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

export default function GeneratorStartupRenderer({
  phase: initialPhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: GeneratorStartupRendererProps) {
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

  // Internal phase state management
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialPhase && PHASES.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  });

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && PHASES.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      goToPhase(PHASES[idx - 1]);
    }
  }, [phase, goToPhase]);

  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(TEST_QUESTIONS.length).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Play phase state
  const [isStarting, setIsStarting] = useState(false);
  const [startupTime, setStartupTime] = useState(0);
  const [rpm, setRpm] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [generatorState, setGeneratorState] = useState<'stopped' | 'cranking' | 'warmup' | 'sync' | 'online'>('stopped');
  const [hasExperimented, setHasExperimented] = useState(false);

  // Twist phase state
  const [loadPercentage, setLoadPercentage] = useState(0);
  const [frequencyDroop, setFrequencyDroop] = useState(60);
  const [isLoadApplied, setIsLoadApplied] = useState(false);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Animation
  const [animationFrame, setAnimationFrame] = useState(0);
  const lastClickRef = useRef(0);
  const startupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Startup simulation
  useEffect(() => {
    if (isStarting && generatorState !== 'online') {
      startupIntervalRef.current = setInterval(() => {
        setStartupTime(prev => {
          const newTime = prev + 0.1;

          // State machine
          if (newTime < 2) {
            setGeneratorState('cranking');
            setRpm(Math.min(300, newTime * 150));
            setFrequency(0);
          } else if (newTime < 5) {
            setGeneratorState('warmup');
            setRpm(Math.min(1500, 300 + (newTime - 2) * 400));
            setFrequency(Math.max(0, (newTime - 3) * 30));
          } else if (newTime < 10) {
            setGeneratorState('sync');
            setRpm(Math.min(1800, 1500 + (newTime - 5) * 60));
            setFrequency(Math.min(60, 45 + (newTime - 5) * 3));
          } else {
            setGeneratorState('online');
            setRpm(1800);
            setFrequency(60);
            setHasExperimented(true);
            if (startupIntervalRef.current) {
              clearInterval(startupIntervalRef.current);
            }
          }

          return newTime;
        });
      }, 100);
    }

    return () => {
      if (startupIntervalRef.current) {
        clearInterval(startupIntervalRef.current);
      }
    };
  }, [isStarting, generatorState]);

  // Frequency droop calculation
  useEffect(() => {
    if (isLoadApplied) {
      // Simulate frequency droop - rapid initial drop, then recovery
      const droopAmount = (loadPercentage / 100) * 8; // Max 8% droop
      const newFreq = 60 - droopAmount + Math.random() * 0.5;
      setFrequencyDroop(Math.max(55, newFreq));
    } else {
      setFrequencyDroop(60);
    }
  }, [loadPercentage, isLoadApplied]);

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700">
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          className={`p-2 rounded-lg transition-all ${
            currentIdx === 0
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-slate-700 text-slate-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                className={`h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-6 bg-orange-500'
                    : i < currentIdx
                    ? 'w-2 bg-emerald-500 cursor-pointer hover:bg-emerald-400'
                    : 'w-2 bg-slate-600'
                }`}
                title={PHASE_LABELS[p]}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-slate-400 ml-2">
            {currentIdx + 1}/{PHASES.length}
          </span>
        </div>

        <div className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
          {PHASE_LABELS[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div className="flex justify-between items-center px-6 py-4 bg-slate-900/80 border-t border-slate-700">
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
            currentIdx === 0
              ? 'opacity-30 cursor-not-allowed bg-slate-700 text-slate-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Back
        </button>

        <span className="text-sm text-slate-500 font-medium">
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
            canGoNext
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {nextLabel} {canGoNext && <span className="ml-1">→</span>}
        </button>
      </div>
    );
  };

  // Handlers
  const handleStartGenerator = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setIsStarting(true);
    setStartupTime(0);
    setRpm(0);
    setFrequency(0);
    setGeneratorState('cranking');
  }, []);

  const handleResetGenerator = useCallback(() => {
    setIsStarting(false);
    setStartupTime(0);
    setRpm(0);
    setFrequency(0);
    setGeneratorState('stopped');
  }, []);

  const handlePrediction = useCallback((choice: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleApplyLoad = useCallback(() => {
    setIsLoadApplied(true);
    setHasExploredTwist(true);
  }, []);

  const handleReleaseLoad = useCallback(() => {
    setIsLoadApplied(false);
    setLoadPercentage(0);
  }, []);

  const handleCompleteApp = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer !== null && TEST_QUESTIONS[index].options[answer].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderGeneratorVisualization = () => {
    const rotationSpeed = rpm / 30; // Visual rotation
    const engineRunning = rpm > 100;

    return (
      <svg viewBox="0 0 400 300" className="w-full h-64">
        <defs>
          <linearGradient id="engineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <linearGradient id="genGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="300" fill="#1e293b" rx="12" />

        {/* Diesel Engine Block */}
        <rect x="40" y="80" width="120" height="140" fill="url(#engineGrad)" rx="8" stroke="#4b5563" strokeWidth="2" />
        <text x="100" y="70" textAnchor="middle" fill="#94a3b8" fontSize="11">DIESEL ENGINE</text>

        {/* Engine cylinders */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={55 + i * 35} y="95" width="25" height="50" fill="#1f2937" rx="3" />
            {engineRunning && (
              <rect
                x={55 + i * 35}
                y={95 + Math.sin((animationFrame + i * 40) * rotationSpeed * 0.1) * 15 + 15}
                width="25"
                height="20"
                fill="#ef4444"
                opacity={0.6 + Math.sin((animationFrame + i * 40) * 0.1) * 0.3}
                rx="2"
              />
            )}
          </g>
        ))}

        {/* Flywheel */}
        <g transform={`translate(160, 150) rotate(${animationFrame * rotationSpeed * 0.5})`}>
          <circle cx="0" cy="0" r="35" fill="#475569" stroke="#64748b" strokeWidth="3" />
          <circle cx="0" cy="0" r="25" fill="#374151" />
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#64748b" strokeWidth="2" />
          <line x1="0" y1="-30" x2="0" y2="30" stroke="#64748b" strokeWidth="2" />
        </g>
        <text x="160" y="200" textAnchor="middle" fill="#94a3b8" fontSize="9">FLYWHEEL</text>

        {/* Coupling */}
        <rect x="190" y="140" width="30" height="20" fill="#6b7280" rx="4" />

        {/* Generator */}
        <rect x="220" y="90" width="100" height="120" fill="url(#genGrad)" rx="8" stroke="#60a5fa" strokeWidth="2" />
        <text x="270" y="80" textAnchor="middle" fill="#94a3b8" fontSize="11">GENERATOR</text>

        {/* Generator windings */}
        <g transform={`translate(270, 150) rotate(${animationFrame * rotationSpeed * 0.5})`}>
          <circle cx="0" cy="0" r="40" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="10,5" />
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <rect
              key={i}
              x="-5"
              y="-35"
              width="10"
              height="20"
              fill="#fbbf24"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>

        {/* Output cables */}
        {frequency > 50 && (
          <g>
            <line x1="320" y1="130" x2="370" y2="130" stroke="#22c55e" strokeWidth="4" />
            <line x1="320" y1="170" x2="370" y2="170" stroke="#22c55e" strokeWidth="4" />
            <rect x="355" y="115" width="35" height="70" fill="#1f2937" rx="4" stroke="#22c55e" strokeWidth="2" />
            <text x="372" y="145" textAnchor="middle" fill="#22c55e" fontSize="10">OUTPUT</text>
            <text x="372" y="160" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
              {frequency.toFixed(1)} Hz
            </text>
          </g>
        )}

        {/* Status indicators */}
        <rect x="40" y="235" width="320" height="50" fill="#0f172a" rx="8" />

        <g transform="translate(60, 250)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">STATE</text>
          <text x="0" y="18" fill={
            generatorState === 'stopped' ? '#ef4444' :
            generatorState === 'cranking' ? '#f59e0b' :
            generatorState === 'warmup' ? '#fbbf24' :
            generatorState === 'sync' ? '#3b82f6' : '#22c55e'
          } fontSize="12" fontWeight="bold">
            {generatorState.toUpperCase()}
          </text>
        </g>

        <g transform="translate(140, 250)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">RPM</text>
          <text x="0" y="18" fill="#ffffff" fontSize="12" fontWeight="bold">{rpm.toFixed(0)}</text>
        </g>

        <g transform="translate(200, 250)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">FREQ</text>
          <text x="0" y="18" fill="#ffffff" fontSize="12" fontWeight="bold">{frequency.toFixed(1)} Hz</text>
        </g>

        <g transform="translate(270, 250)">
          <text x="0" y="0" fill="#94a3b8" fontSize="10">TIME</text>
          <text x="0" y="18" fill="#ffffff" fontSize="12" fontWeight="bold">{startupTime.toFixed(1)}s</text>
        </g>
      </svg>
    );
  };

  const renderFrequencyDroopVisualization = () => {
    const targetFreq = 60;
    const droopPercentage = ((targetFreq - frequencyDroop) / targetFreq) * 100;

    return (
      <svg viewBox="0 0 400 280" className="w-full h-64">
        <defs>
          <linearGradient id="freqGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="400" height="280" fill="#1e293b" rx="12" />

        {/* Title */}
        <text x="200" y="25" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
          Frequency Droop During Load Pickup
        </text>

        {/* Frequency meter */}
        <rect x="50" y="50" width="300" height="120" fill="#0f172a" rx="8" />

        {/* Target frequency line */}
        <line x1="70" y1="80" x2="330" y2="80" stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />
        <text x="60" y="85" textAnchor="end" fill="#22c55e" fontSize="10">60 Hz</text>

        {/* Danger zone */}
        <rect x="70" y="130" width="260" height="30" fill="rgba(239, 68, 68, 0.2)" rx="4" />
        <text x="60" y="148" textAnchor="end" fill="#ef4444" fontSize="9">55 Hz</text>
        <text x="340" y="148" fill="#ef4444" fontSize="9">DANGER</text>

        {/* Current frequency line */}
        <line
          x1="70"
          y1={80 + (60 - frequencyDroop) * 10}
          x2="330"
          y2={80 + (60 - frequencyDroop) * 10}
          stroke="#fbbf24"
          strokeWidth="3"
        >
          {isLoadApplied && <animate attributeName="y1" values={`${80 + (60 - frequencyDroop) * 10};${85 + (60 - frequencyDroop) * 10};${80 + (60 - frequencyDroop) * 10}`} dur="0.5s" repeatCount="indefinite" />}
        </line>

        {/* Frequency readout */}
        <rect x="140" y="90" width="120" height="50" fill="#1f2937" rx="8" />
        <text x="200" y="120" textAnchor="middle" fill={frequencyDroop < 57 ? '#ef4444' : frequencyDroop < 59 ? '#fbbf24' : '#22c55e'} fontSize="24" fontWeight="bold">
          {frequencyDroop.toFixed(1)} Hz
        </text>
        <text x="200" y="135" textAnchor="middle" fill="#94a3b8" fontSize="10">
          {droopPercentage.toFixed(1)}% droop
        </text>

        {/* Load indicator */}
        <rect x="50" y="190" width="300" height="30" fill="#374151" rx="8" />
        <rect
          x="50"
          y="190"
          width={loadPercentage * 3}
          height="30"
          fill={loadPercentage > 80 ? '#ef4444' : loadPercentage > 50 ? '#f59e0b' : '#3b82f6'}
          rx="8"
        />
        <text x="200" y="210" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
          LOAD: {loadPercentage}%
        </text>

        {/* Explanation */}
        <text x="200" y="245" textAnchor="middle" fill="#94a3b8" fontSize="11">
          {isLoadApplied
            ? `Governor compensating for ${loadPercentage}% load...`
            : 'Apply load to see frequency droop'}
        </text>
        <text x="200" y="265" textAnchor="middle" fill="#64748b" fontSize="10">
          {frequencyDroop < 57 ? 'CRITICAL: Equipment may disconnect!' : frequencyDroop < 59 ? 'Governor working hard' : 'Frequency stable'}
        </text>
      </svg>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-orange-400 tracking-wide">DATA CENTER PHYSICS</span>
        </div>

        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/30">
          <span className="text-4xl">⚙️</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
          Diesel Generator Startup
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10">
          Why does it take 10 seconds for the backup generator to kick in?
        </p>

        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />
          <div className="relative flex items-start gap-4 text-left">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">The Critical Delay</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                When the grid fails, generators don&apos;t start instantly. Heavy rotating masses,
                synchronization requirements, and physics create an unavoidable 10+ second delay.
              </p>
            </div>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Explore Generator Startup')}
    </div>
  );

  const renderPredict = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-xl">🤔</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Make Your Prediction</h2>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
        <p className="text-blue-800 leading-relaxed">
          A data center&apos;s power fails. The diesel generator needs to start and take over.
        </p>
        <p className="text-blue-700 mt-2 font-medium">
          Why can&apos;t the generator provide power instantly like flipping a switch?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'fuel', label: 'Diesel fuel takes time to ignite', icon: '🛢️' },
          { id: 'inertia', label: 'Heavy rotating parts must accelerate to full speed', icon: '⚙️' },
          { id: 'warmup', label: 'The engine needs to warm up first', icon: '🌡️' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'inertia'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-slate-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          prediction === 'inertia' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${prediction === 'inertia' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {prediction === 'inertia' ? (
              <><strong>Exactly right!</strong> Rotational inertia is the main factor. A 2-ton flywheel and generator rotor must spin up to 1800 RPM (North America) before producing proper 60Hz power. Physics takes time!</>
            ) : (
              <><strong>Partially correct, but:</strong> The main delay is rotational inertia - heavy rotating masses need time to accelerate. The engine, flywheel, and generator rotor must all spin up to exactly 1800 RPM for 60Hz output.</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showPredictionFeedback, 'Watch a Generator Start')}
    </div>
  );

  const renderPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">🔬</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Generator Startup Simulator</h2>
          <p className="text-sm text-slate-500">Watch the startup sequence unfold</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderGeneratorVisualization()}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {generatorState === 'stopped' ? (
          <button
            onClick={handleStartGenerator}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
          >
            Start Generator
          </button>
        ) : generatorState === 'online' ? (
          <button
            onClick={handleResetGenerator}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg"
          >
            Reset Simulation
          </button>
        ) : (
          <div className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-amber-100 text-amber-800 text-center">
            Starting... {startupTime.toFixed(1)}s
          </div>
        )}
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-orange-800 mb-2">Startup Sequence:</h4>
        <ul className="text-orange-700 text-sm space-y-1">
          <li className={generatorState === 'cranking' ? 'font-bold' : ''}>1. Cranking (0-2s): Starter motor spins engine</li>
          <li className={generatorState === 'warmup' ? 'font-bold' : ''}>2. Warmup (2-5s): Engine fires, RPM increases</li>
          <li className={generatorState === 'sync' ? 'font-bold' : ''}>3. Sync (5-10s): Speed stabilizes at 1800 RPM = 60Hz</li>
          <li className={generatorState === 'online' ? 'font-bold' : ''}>4. Online: Ready to accept load!</li>
        </ul>
      </div>

      {renderBottomBar(hasExperimented, hasExperimented ? 'Continue to Review' : 'Start the generator first...')}
    </div>
  );

  const renderReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Understanding Generator Physics</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white">
        <p className="text-indigo-200 text-sm mb-2">Generator Frequency Formula</p>
        <div className="text-2xl font-bold mb-2">f = (P x N) / 120</div>
        <p className="text-indigo-200 text-sm">
          f = frequency (Hz), P = poles, N = RPM
        </p>
        <p className="text-indigo-100 text-sm mt-2">
          4-pole @ 1800 RPM = 60 Hz
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          {
            icon: '⚙️',
            title: 'Rotational Inertia',
            desc: 'Heavy flywheels and rotors resist speed changes. This provides stability but means slow startup. J = moment of inertia determines acceleration time.',
          },
          {
            icon: '🔄',
            title: 'Synchronization',
            desc: 'Before connecting to load, generator must match grid frequency (60Hz), voltage, and phase angle. Mismatched connection causes severe damage.',
          },
          {
            icon: '📊',
            title: 'Governor Control',
            desc: 'The governor adjusts fuel flow to maintain constant speed. When load increases, speed drops briefly until governor compensates.',
          },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {renderBottomBar(true, 'Now for a Twist...')}
    </div>
  );

  const renderTwistPredict = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <span className="text-xl">🔄</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">The Load Pickup Twist</h2>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <p className="text-amber-800 leading-relaxed">
          The generator is running at perfect 60Hz. Suddenly, the UPS transfers 500kW of data center load to it.
        </p>
        <p className="text-amber-700 mt-2 font-medium">
          What happens to the frequency?
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'stable', label: 'Stays at 60Hz - generator is designed for this', icon: '✓' },
          { id: 'droop', label: 'Frequency drops briefly then recovers (droop)', icon: '📉' },
          { id: 'increase', label: 'Frequency increases from the extra energy', icon: '📈' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === 'droop'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
                : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50'
            } ${showTwistFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium text-slate-700">{option.label}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          twistPrediction === 'droop' ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'
        }`}>
          <p className={`leading-relaxed ${twistPrediction === 'droop' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {twistPrediction === 'droop' ? (
              <><strong>Exactly right!</strong> Sudden load acts like a brake on the engine. Frequency drops until the governor increases fuel flow. This &quot;frequency droop&quot; is why load acceptance rates are limited!</>
            ) : (
              <><strong>Physics says otherwise:</strong> Sudden load acts like a brake on the rotating mass. The frequency drops (droop) until the governor compensates by adding more fuel. Too fast = equipment damage!</>
            )}
          </p>
        </div>
      )}
      {renderBottomBar(showTwistFeedback, 'Explore Frequency Droop')}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Frequency Droop Simulator</h2>
          <p className="text-sm text-slate-500">See how load affects generator frequency</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
        {renderFrequencyDroopVisualization()}
      </div>

      <div className="bg-slate-100 rounded-xl p-4 mb-4">
        <label className="text-slate-700 text-sm font-medium block mb-2">
          Load Level: {loadPercentage}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={loadPercentage}
          onChange={(e) => setLoadPercentage(parseInt(e.target.value))}
          className="w-full accent-orange-500"
          disabled={!isLoadApplied}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {!isLoadApplied ? (
          <button
            onClick={handleApplyLoad}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg"
          >
            Apply Load to Generator
          </button>
        ) : (
          <button
            onClick={handleReleaseLoad}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="col-span-2 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
          >
            Release Load
          </button>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
        <p className="text-red-800 text-sm leading-relaxed">
          <strong>Warning:</strong> If frequency drops below 57Hz for too long, sensitive equipment may disconnect for self-protection.
          Data centers limit load acceptance rate to 25-50% steps to prevent excessive droop!
        </p>
      </div>

      {renderBottomBar(hasExploredTwist, hasExploredTwist ? 'Continue' : 'Apply load to the generator...')}
    </div>
  );

  const renderTwistReview = () => (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Managing Generator Dynamics</h2>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Load Management Strategies</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">📶</div>
            <div className="text-sm text-slate-700 font-medium">Stepped Loading</div>
            <div className="text-xs text-teal-600">25-50% steps</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-sm text-slate-700 font-medium">Time Delays</div>
            <div className="text-xs text-teal-600">5-10s between steps</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">🔄</div>
            <div className="text-sm text-slate-700 font-medium">Flywheel Storage</div>
            <div className="text-xs text-teal-600">Smooths transients</div>
          </div>
          <div className="text-center bg-white rounded-xl p-4">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-slate-700 font-medium">Fast Governors</div>
            <div className="text-xs text-teal-600">Electronic control</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <h4 className="font-bold text-slate-800 mb-2">Data Center Best Practices</h4>
        <ul className="text-slate-600 text-sm space-y-2">
          <li>Limit load acceptance rate to prevent frequency droop</li>
          <li>Use multiple generators in parallel for redundancy</li>
          <li>Electronic governors respond faster than mechanical</li>
          <li>Regular testing ensures reliability during actual outages</li>
        </ul>
      </div>

      {renderBottomBar(true, 'See Real Applications')}
    </div>
  );

  const renderTransfer = () => {
    const allAppsCompleted = completedApps.size >= 4;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="text-xl">🌍</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Real-World Applications</h2>
            <p className="text-sm text-slate-500">Complete all 4 to unlock assessment</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TRANSFER_APPS.map((app, index) => (
            <button
              key={index}
              onClick={() => setActiveAppTab(index)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                activeAppTab === index
                  ? 'bg-orange-500 text-white shadow-lg'
                  : completedApps.has(index)
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {completedApps.has(index) && <span>✓</span>}
              {app.icon}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{TRANSFER_APPS[activeAppTab].icon}</span>
              <h3 className="font-bold text-slate-800 text-lg">{TRANSFER_APPS[activeAppTab].title}</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {TRANSFER_APPS[activeAppTab].description}
            </p>
            {!completedApps.has(activeAppTab) ? (
              <button
                onClick={() => handleCompleteApp(activeAppTab)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Mark as Complete
              </button>
            ) : (
              <div className="w-full py-3 bg-orange-100 text-orange-700 rounded-xl font-semibold text-center">
                Completed
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-orange-600">{completedApps.size}/4</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedApps.size / 4) * 100}%` }}
            />
          </div>
        </div>

        {renderBottomBar(allAppsCompleted, allAppsCompleted ? 'Take the Assessment' : `Complete ${4 - completedApps.size} more`)}
      </div>
    );
  };

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;
    const allAnswered = answeredCount === TEST_QUESTIONS.length;

    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <span className="text-xl">📝</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Knowledge Assessment</h2>
            <p className="text-sm text-slate-500">10 questions - 70% to pass</p>
          </div>
        </div>

        {!testSubmitted ? (
          <>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Progress</span>
                <span className="text-sm font-bold text-violet-600">{answeredCount}/10</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / 10) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-6 mb-6">
              {TEST_QUESTIONS.map((q, qIndex) => (
                <div key={qIndex} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                      testAnswers[qIndex] !== null ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {qIndex + 1}
                    </span>
                    <p className="font-medium text-slate-800 leading-relaxed">{q.question}</p>
                  </div>
                  <div className="space-y-2 ml-10">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        className={`w-full p-3 rounded-xl text-left text-sm transition-all duration-200 ${
                          testAnswers[qIndex] === oIndex
                            ? 'bg-violet-500 text-white shadow-lg'
                            : 'bg-slate-50 text-slate-700 hover:bg-violet-50 border border-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmitTest}
              disabled={!allAnswered}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={`w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all ${
                allAnswered
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAnswered ? 'Submit Assessment' : `Answer ${10 - answeredCount} more`}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
              testScore >= 7 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'
            }`}>
              <span className="text-5xl">{testScore >= 7 ? '⚙️' : '📚'}</span>
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">{testScore}/10 Correct</h3>
            <p className="text-slate-600 mb-8">
              {testScore >= 7 ? 'Excellent! You understand generator dynamics!' : 'Review the concepts and try again.'}
            </p>

            {testScore >= 7 ? (
              renderBottomBar(true, 'Complete Lesson')
            ) : (
              <button
                onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(TEST_QUESTIONS.length).fill(null)); }}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className="w-full py-4 px-8 rounded-2xl font-semibold text-lg bg-slate-200 text-slate-700"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="max-w-2xl mx-auto px-6 py-8 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-xl shadow-orange-500/30 mb-6">
          <span className="text-5xl">🏆</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">Generator Dynamics Master!</h1>

      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        You now understand why generators need time to start and how to manage load dynamics.
      </p>

      <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-slate-800 mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-700">
          {[
            'Rotational inertia causes 10+ second startup time',
            'Frequency = (Poles x RPM) / 120',
            'Synchronization must match frequency, voltage, and phase',
            'Frequency droop occurs during sudden load pickup',
            'Governors control speed by adjusting fuel flow',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm">✓</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="px-8 py-4 bg-slate-200 text-slate-700 rounded-2xl font-semibold"
        >
          Complete
        </button>
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      {renderProgressBar()}
      <div className="flex-1 overflow-auto">
        {renderPhase()}
      </div>
    </div>
  );
}
