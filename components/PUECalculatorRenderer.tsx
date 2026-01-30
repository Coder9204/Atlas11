'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PUECalculatorRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const PUECalculatorRenderer: React.FC<PUECalculatorRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Game-specific state
  const [itLoad, setItLoad] = useState(1000); // kW
  const [coolingEfficiency, setCoolingEfficiency] = useState(50); // percent
  const [upsEfficiency, setUpsEfficiency] = useState(92); // percent
  const [lightingPower, setLightingPower] = useState(20); // kW
  const [outdoorTemp, setOutdoorTemp] = useState(25); // Celsius
  const [useFreeCooling, setUseFreeCooling] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  const lastClickRef = useRef(0);
  const isNavigating = useRef(false);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

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

  // Calculate PUE and energy breakdown
  const calcPUEMetrics = useCallback(() => {
    // IT Load (what we actually want to power)
    const itPower = itLoad;

    // Cooling power - depends on efficiency and free cooling
    let coolingMultiplier = (100 - coolingEfficiency) / 100 + 0.3; // Base cooling overhead
    if (useFreeCooling && outdoorTemp < 18) {
      coolingMultiplier *= 0.3; // Free cooling reduces mechanical cooling by 70%
    } else if (useFreeCooling && outdoorTemp < 25) {
      coolingMultiplier *= 0.6; // Partial free cooling
    }
    const coolingPower = itPower * coolingMultiplier;

    // UPS losses
    const upsLossPower = itPower * ((100 - upsEfficiency) / 100);

    // Lighting and misc
    const miscPower = lightingPower;

    // Total facility power
    const totalPower = itPower + coolingPower + upsLossPower + miscPower;

    // PUE calculation
    const pue = totalPower / itPower;

    // Annual energy and cost
    const annualKWh = totalPower * 24 * 365;
    const annualCost = annualKWh * 0.10; // $0.10/kWh
    const wastedEnergy = (totalPower - itPower) * 24 * 365;
    const wastedCost = wastedEnergy * 0.10;

    return {
      itPower,
      coolingPower,
      upsLossPower,
      miscPower,
      totalPower,
      pue,
      annualKWh,
      annualCost,
      wastedEnergy,
      wastedCost,
      efficiencyRating: pue < 1.2 ? 'Excellent' : pue < 1.5 ? 'Good' : pue < 2.0 ? 'Average' : 'Poor'
    };
  }, [itLoad, coolingEfficiency, upsEfficiency, lightingPower, outdoorTemp, useFreeCooling]);

  const metrics = calcPUEMetrics();

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    playSound('transition');

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [playSound]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goToPrevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Premium color palette
  const colors = {
    primary: '#10b981', // emerald-500
    primaryDark: '#059669', // emerald-600
    accent: '#06b6d4', // cyan-500
    success: '#10b981', // emerald-500
    bgDark: '#020617', // slate-950
    bgCard: '#0f172a', // slate-900
    bgCardLight: '#1e293b', // slate-800
    border: '#334155', // slate-700
    textPrimary: '#f8fafc', // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b', // slate-500
  };

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '10px 16px',
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        gap: '8px'
      }}>
        {/* Back button */}
        <button
          onClick={goToPrevPhase}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: currentIdx > 0 ? colors.bgCardLight : 'transparent',
            border: currentIdx > 0 ? `1px solid ${colors.border}` : '1px solid transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'default',
            opacity: currentIdx > 0 ? 1 : 0.4,
          }}
        >
          <span style={{ fontSize: '14px' }}>&#8592;</span>
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s',
                opacity: i > currentIdx ? 0.5 : 1
              }}
              title={`${phaseLabels[p]} (${i + 1}/${phaseOrder.length})`}
            />
          ))}
        </div>

        {/* Phase counter */}
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: colors.primary,
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: `${colors.primary}15`
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </div>
    );
  };

  // Bottom navigation bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canGoBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px'
      }}>
        <button
          onClick={goToPrevPhase}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
            minHeight: '44px'
          }}
          disabled={!canGoBack}
        >
          &#8592; Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={goToNextPhase}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.primary}30` : 'none',
            minHeight: '44px'
          }}
          disabled={!canGoNext}
        >
          {nextLabel} &#8594;
        </button>
      </div>
    );
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
    playSound(prediction === 'A' ? 'success' : 'failure');
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

  const testQuestions = [
    { question: "PUE stands for:", options: [{ text: "Power Usage Effectiveness", correct: true }, { text: "Power Unit Efficiency", correct: false }, { text: "Primary Usage Energy", correct: false }, { text: "Processor Utilization Efficiency", correct: false }] },
    { question: "A PUE of 1.5 means:", options: [{ text: "50% of power goes to IT, 50% to overhead", correct: false }, { text: "For every 1W of IT, 0.5W is overhead", correct: true }, { text: "The data center is 150% efficient", correct: false }, { text: "15% of power is wasted", correct: false }] },
    { question: "The theoretical minimum PUE is:", options: [{ text: "0.0", correct: false }, { text: "1.0 (all power goes to IT)", correct: true }, { text: "0.5", correct: false }, { text: "2.0", correct: false }] },
    { question: "What is typically the largest overhead in a data center?", options: [{ text: "Lighting", correct: false }, { text: "Cooling (HVAC)", correct: true }, { text: "Security systems", correct: false }, { text: "Network equipment", correct: false }] },
    { question: "Free cooling refers to:", options: [{ text: "Government subsidies for cooling", correct: false }, { text: "Using cold outside air to cool the data center", correct: true }, { text: "Cooling that requires no fans", correct: false }, { text: "Liquid cooling systems", correct: false }] },
    { question: "UPS systems at 95% efficiency with 1000kW IT load waste:", options: [{ text: "50 kW", correct: true }, { text: "950 kW", correct: false }, { text: "5 kW", correct: false }, { text: "500 kW", correct: false }] },
    { question: "Improving PUE from 2.0 to 1.5 with 1MW IT load saves approximately:", options: [{ text: "$50,000/year", correct: false }, { text: "$250,000/year", correct: false }, { text: "$438,000/year (500kW x 8760h x $0.10)", correct: true }, { text: "$1,000,000/year", correct: false }] },
    { question: "Google's best data centers achieve PUE of:", options: [{ text: "Around 1.10", correct: true }, { text: "Around 1.50", correct: false }, { text: "Around 2.00", correct: false }, { text: "Around 0.80", correct: false }] },
    { question: "Higher cooling setpoints (warmer cold aisles) generally:", options: [{ text: "Increase PUE", correct: false }, { text: "Decrease PUE (less cooling needed)", correct: true }, { text: "Have no effect on PUE", correct: false }, { text: "Increase IT power consumption", correct: false }] },
    { question: "Which climate is best for free cooling data centers?", options: [{ text: "Tropical", correct: false }, { text: "Cold/temperate (like Nordic countries)", correct: true }, { text: "Desert", correct: false }, { text: "Climate doesn't matter", correct: false }] }
  ];

  const applications = [
    { title: "Hyperscale Giants", icon: "☁️", description: "Google, Facebook, Microsoft achieve PUE of 1.1-1.2. Their scale justifies custom designs with optimal efficiency.", details: "Google's average PUE is 1.10 - they save $billions in electricity." },
    { title: "Enterprise Data Centers", icon: "🏢", description: "Typical enterprise PUE is 1.5-2.0. Legacy infrastructure and mixed equipment make optimization harder.", details: "Upgrading from PUE 2.0 to 1.5 can save 25% of total facility power." },
    { title: "Nordic Data Centers", icon: "❄️", description: "Countries like Iceland, Norway, Sweden leverage cold climates for near-100% free cooling year-round.", details: "Some Nordic facilities achieve PUE below 1.1 using natural cooling." },
    { title: "Modular/Edge Computing", icon: "📦", description: "Pre-fabricated modular data centers optimize airflow and cooling from the factory.", details: "Containerized designs can achieve PUE of 1.2-1.3 in various climates." }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (testQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  const getPUEColor = (pue: number) => {
    if (pue < 1.2) return '#22c55e';
    if (pue < 1.5) return '#84cc16';
    if (pue < 2.0) return '#eab308';
    return '#ef4444';
  };

  const renderPUEVisualization = () => {
    const barHeight = 200;
    const itHeight = (metrics.itPower / metrics.totalPower) * barHeight;
    const coolingHeight = (metrics.coolingPower / metrics.totalPower) * barHeight;
    const upsHeight = (metrics.upsLossPower / metrics.totalPower) * barHeight;
    const miscHeight = (metrics.miscPower / metrics.totalPower) * barHeight;

    return (
      <svg viewBox="0 0 500 320" className="w-full max-w-2xl mx-auto">
        <defs>
          <linearGradient id="itGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          <linearGradient id="coolingGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

        {/* Power flow diagram */}
        <rect x="20" y="40" width="120" height="60" fill="#1f2937" stroke="#374151" strokeWidth="2" rx="5" />
        <text x="80" y="65" textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="bold">Utility Power</text>
        <text x="80" y="85" textAnchor="middle" fontSize="14" fill="#fbbf24">{metrics.totalPower.toFixed(0)} kW</text>

        {/* Arrow from utility to facility */}
        <path d="M140,70 L170,70" stroke="#fbbf24" strokeWidth="3" markerEnd="url(#arrowYellow)" />

        {/* Facility box */}
        <rect x="180" y="20" width="160" height="120" fill="#0f172a" stroke="#374151" strokeWidth="2" rx="5" />
        <text x="260" y="40" textAnchor="middle" fontSize="10" fill="#9ca3af">DATA CENTER</text>

        {/* Power breakdown bars */}
        <g transform="translate(200, 50)">
          <rect x="0" y={80 - itHeight * 0.35} width="25" height={itHeight * 0.35} fill="#22c55e" />
          <text x="12" y="95" textAnchor="middle" fontSize="8" fill="#9ca3af">IT</text>

          <rect x="30" y={80 - coolingHeight * 0.35} width="25" height={coolingHeight * 0.35} fill="#3b82f6" />
          <text x="42" y="95" textAnchor="middle" fontSize="8" fill="#9ca3af">Cool</text>

          <rect x="60" y={80 - upsHeight * 0.35} width="25" height={upsHeight * 0.35} fill="#f97316" />
          <text x="72" y="95" textAnchor="middle" fontSize="8" fill="#9ca3af">UPS</text>

          <rect x="90" y={80 - miscHeight * 0.35} width="25" height={miscHeight * 0.35} fill="#6b7280" />
          <text x="102" y="95" textAnchor="middle" fontSize="8" fill="#9ca3af">Misc</text>
        </g>

        {/* PUE Gauge */}
        <g transform="translate(380, 40)">
          <circle cx="50" cy="50" r="45" fill="#1f2937" stroke="#374151" strokeWidth="2" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="#374151" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="35"
            fill="none"
            stroke={getPUEColor(metrics.pue)}
            strokeWidth="8"
            strokeDasharray={`${(1 - (metrics.pue - 1) / 2) * 220} 220`}
            transform="rotate(-90, 50, 50)"
          />
          <text x="50" y="45" textAnchor="middle" fontSize="18" fill="white" fontWeight="bold">{metrics.pue.toFixed(2)}</text>
          <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#9ca3af">PUE</text>
          <text x="50" y="95" textAnchor="middle" fontSize="9" fill={getPUEColor(metrics.pue)}>{metrics.efficiencyRating}</text>
        </g>

        {/* Formula */}
        <rect x="20" y="160" width="200" height="50" fill="#1f2937" rx="5" />
        <text x="120" y="180" textAnchor="middle" fontSize="12" fill="#e5e7eb" fontWeight="bold">PUE = Total Power / IT Power</text>
        <text x="120" y="198" textAnchor="middle" fontSize="11" fill="#22d3ee">{metrics.totalPower.toFixed(0)} / {metrics.itPower.toFixed(0)} = {metrics.pue.toFixed(2)}</text>

        {/* Cost breakdown */}
        <rect x="240" y="160" width="240" height="80" fill="#1f2937" rx="5" />
        <text x="360" y="180" textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="bold">Annual Impact</text>
        <text x="260" y="200" fontSize="10" fill="#9ca3af">Total Energy: {(metrics.annualKWh / 1000000).toFixed(1)} GWh/year</text>
        <text x="260" y="218" fontSize="10" fill="#fbbf24">Total Cost: ${(metrics.annualCost / 1000000).toFixed(2)}M/year</text>
        <text x="260" y="236" fontSize="10" fill="#ef4444">Overhead Waste: ${(metrics.wastedCost / 1000000).toFixed(2)}M/year</text>

        {/* Free cooling indicator */}
        {useFreeCooling && (
          <g transform="translate(20, 220)">
            <rect x="0" y="0" width="120" height="35" fill={outdoorTemp < 25 ? '#22c55e' : '#6b7280'} opacity="0.2" rx="5" />
            <text x="60" y="15" textAnchor="middle" fontSize="9" fill={outdoorTemp < 25 ? '#22c55e' : '#9ca3af'}>Free Cooling</text>
            <text x="60" y="28" textAnchor="middle" fontSize="10" fill={outdoorTemp < 25 ? '#4ade80' : '#9ca3af'}>
              {outdoorTemp < 18 ? 'ACTIVE (70% savings)' : outdoorTemp < 25 ? 'PARTIAL (40% savings)' : 'OFF (too warm)'}
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowYellow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
          </marker>
        </defs>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-emerald-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-cyan-200 bg-clip-text text-transparent">
        PUE: Power Usage Effectiveness
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        If servers use 1MW, why does the building need 1.5MW?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">⚡ 🏢 📊</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A data center's servers consume 1 megawatt of power.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But the electric bill shows 1.5 megawatts! Where does the extra 500kW go?
            </p>
            <div className="pt-2">
              <p className="text-base text-emerald-400 font-semibold">
                PUE measures this overhead - and optimizing it saves millions!
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={goToNextPhase}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-cyan-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore PUE
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A data center has IT equipment using 1000 kW. The total facility power is 1500 kW. What does this mean in terms of PUE?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'PUE = 0.67 - the facility is very efficient' },
          { id: 'B', text: 'PUE = 1.5 - for every 1W of IT, there\'s 0.5W of overhead' },
          { id: 'C', text: 'PUE = 500 - representing 500kW of waste' },
          { id: 'D', text: 'PUE = 2500 - total watts used' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
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
            Correct! PUE = Total Facility Power / IT Power = 1500/1000 = 1.5. This means 50% overhead on top of IT load!
          </p>
          <button
            onClick={goToNextPhase}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl"
          >
            Explore PUE Factors
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">PUE Calculator Lab</h2>
      <p className="text-slate-400 mb-4">Adjust parameters to see their effect on PUE and energy costs!</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
        {renderPUEVisualization()}
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">IT Load: {itLoad} kW</label>
          <input type="range" min="100" max="5000" step="100" value={itLoad} onChange={(e) => setItLoad(parseInt(e.target.value))} className="w-full accent-emerald-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Cooling Efficiency: {coolingEfficiency}%</label>
          <input type="range" min="20" max="90" value={coolingEfficiency} onChange={(e) => setCoolingEfficiency(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">UPS Efficiency: {upsEfficiency}%</label>
          <input type="range" min="80" max="99" value={upsEfficiency} onChange={(e) => setUpsEfficiency(parseInt(e.target.value))} className="w-full accent-orange-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Lighting/Misc: {lightingPower} kW</label>
          <input type="range" min="5" max="100" value={lightingPower} onChange={(e) => setLightingPower(parseInt(e.target.value))} className="w-full accent-gray-500" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 rounded-xl p-4 max-w-2xl w-full mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold" style={{ color: getPUEColor(metrics.pue) }}>{metrics.pue.toFixed(2)}</div>
            <div className="text-sm text-slate-300">PUE</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{((metrics.pue - 1) * 100).toFixed(0)}%</div>
            <div className="text-sm text-slate-300">Overhead</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">${(metrics.wastedCost / 1000000).toFixed(2)}M</div>
            <div className="text-sm text-slate-300">Wasted/Year</div>
          </div>
        </div>
      </div>

      <button
        onClick={goToNextPhase}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        Learn the Science
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Science of PUE</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-emerald-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">PUE Formula</h3>
          <div className="font-mono text-center text-lg text-white mb-2">PUE = Total Facility Power / IT Equipment Power</div>
          <p className="text-slate-300 text-sm">A PUE of 1.0 is perfect (all power to IT). Typical is 1.5-2.0. Best-in-class is 1.1-1.2.</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Where Does Power Go?</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Cooling (HVAC): 30-50% of overhead</li>
            <li>- UPS losses: 5-15% of IT load</li>
            <li>- Power distribution: 2-5%</li>
            <li>- Lighting, security: 1-3%</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Why PUE Matters</h3>
          <p className="text-slate-300">A 1MW data center with PUE 2.0 uses 2MW total, costing ~$1.75M/year in electricity. Dropping to PUE 1.5 saves $438,000/year! At hyperscale, this is billions of dollars.</p>
        </div>
      </div>
      <button
        onClick={goToNextPhase}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Free Cooling Miracle</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A data center in a cold climate (average 10C outdoors) decides to use "free cooling" - using cold outside air instead of running chillers.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to their PUE?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'PUE can drop dramatically (from 1.5 to 1.1) since cooling is the biggest overhead' },
          { id: 'B', text: 'PUE slightly improves (maybe 0.1 better)' },
          { id: 'C', text: 'No change - servers still need the same cooling' },
          { id: 'D', text: 'PUE gets worse - outdoor air contains humidity' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'A' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            Correct! Free cooling can reduce mechanical cooling by 70-90%, which is typically 30-50% of all overhead. This can drop PUE from 1.5+ to below 1.2!
          </p>
          <button
            onClick={goToNextPhase}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            Explore Free Cooling
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Free Cooling Demo</h2>
      <p className="text-slate-400 mb-4">Toggle free cooling and adjust outdoor temperature to see the impact!</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
        {renderPUEVisualization()}
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Outdoor Temperature: {outdoorTemp}C</label>
          <input type="range" min="-10" max="40" value={outdoorTemp} onChange={(e) => setOutdoorTemp(parseInt(e.target.value))} className="w-full accent-cyan-500" />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>-10C (Winter)</span>
            <span>15C (Spring)</span>
            <span>40C (Summer)</span>
          </div>
        </div>

        <button
          onClick={() => setUseFreeCooling(!useFreeCooling)}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full p-4 rounded-xl font-bold text-lg transition-colors ${
            useFreeCooling ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'
          }`}
        >
          {useFreeCooling ? '✓ Free Cooling ENABLED' : 'Free Cooling DISABLED'}
        </button>

        <div className={`p-4 rounded-xl ${useFreeCooling && outdoorTemp < 25 ? 'bg-emerald-900/30' : 'bg-slate-700/50'}`}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: getPUEColor(metrics.pue) }}>
                {metrics.pue.toFixed(2)}
              </div>
              <div className="text-sm text-slate-300">PUE</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">
                ${(metrics.annualCost / 1000000).toFixed(2)}M
              </div>
              <div className="text-sm text-slate-300">Annual Cost</div>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-3 text-center">
            {useFreeCooling && outdoorTemp < 18
              ? "Maximum free cooling! Minimal mechanical cooling needed."
              : useFreeCooling && outdoorTemp < 25
              ? "Partial free cooling active. Hybrid operation."
              : "Standard mechanical cooling in use."}
          </p>
        </div>
      </div>

      <button
        onClick={goToNextPhase}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        See Explanation
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Why Location Matters for PUE</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Free Cooling Physics</h3>
          <p className="text-slate-300 text-sm">
            Cold outside air can directly cool data centers if it's below the required supply temperature (typically 18-22C). This eliminates energy-intensive compressors and chillers!
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Climate Impact</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Nordic countries: 95%+ free cooling hours</li>
            <li>- Northern US/Europe: 50-70% free cooling</li>
            <li>- Hot climates: Limited to night/winter</li>
            <li>- Some use seawater or groundwater</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Real-World Examples</h3>
          <p className="text-slate-300">Facebook's Lulea, Sweden data center achieves PUE of 1.07 using Arctic air. Google's Hamina, Finland facility uses Baltic Sea water. These sites save tens of millions annually compared to hot-climate locations.</p>
        </div>
      </div>
      <button
        onClick={goToNextPhase}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-emerald-600 text-white'
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
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>
        <p className="text-lg text-slate-300 mb-3">{applications[activeAppTab].description}</p>
        <p className="text-sm text-slate-400">{applications[activeAppTab].details}</p>
        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
          >
            Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{applications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button
          onClick={goToNextPhase}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowTestResults(true)}
            disabled={testAnswers.includes(-1)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered PUE!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() >= 7 ? (
            <button
              onClick={() => { onCorrectAnswer?.(); goToNextPhase(); }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); onIncorrectAnswer?.(); }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="bg-gradient-to-br from-emerald-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">⚡</div>
        <h1 className="text-3xl font-bold text-white mb-4">PUE Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered Power Usage Effectiveness!</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📊</div><p className="text-sm text-slate-300">PUE Formula</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">❄️</div><p className="text-sm text-slate-300">Free Cooling</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💰</div><p className="text-sm text-slate-300">Cost Impact</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🌍</div><p className="text-sm text-slate-300">Climate Effects</p></div>
        </div>
      </div>
    </div>
  );

  const renderPhaseContent = () => {
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

  // Determine if next button should be enabled for each phase
  const canProceed = () => {
    switch (phase) {
      case 'hook': return true;
      case 'predict': return showPredictionFeedback;
      case 'play': return true;
      case 'review': return true;
      case 'twist_predict': return showTwistFeedback;
      case 'twist_play': return true;
      case 'twist_review': return true;
      case 'transfer': return completedApps.size >= 4;
      case 'test': return showTestResults && calculateScore() >= 7;
      case 'mastery': return false;
      default: return true;
    }
  };

  // Get next button label for each phase
  const getNextLabel = () => {
    switch (phase) {
      case 'hook': return 'Start';
      case 'predict': return showPredictionFeedback ? 'Continue' : 'Select an answer';
      case 'play': return 'Learn More';
      case 'review': return 'Discover Twist';
      case 'twist_predict': return showTwistFeedback ? 'Continue' : 'Select an answer';
      case 'twist_play': return 'See Explanation';
      case 'twist_review': return 'Applications';
      case 'transfer': return completedApps.size >= 4 ? 'Take Test' : `Complete ${4 - completedApps.size} more`;
      case 'test': return calculateScore() >= 7 ? 'Complete' : 'Score 7+ to pass';
      case 'mastery': return 'Complete';
      default: return 'Continue';
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-[#0a0f1a] text-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Progress bar header */}
      <div className="relative z-10 flex-shrink-0">
        {renderProgressBar()}
      </div>

      {/* Main content - scrollable */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {renderPhaseContent()}
      </div>

      {/* Bottom navigation bar */}
      <div className="relative z-10 flex-shrink-0">
        {renderBottomBar(canProceed(), getNextLabel())}
      </div>
    </div>
  );
};

export default PUECalculatorRenderer;
