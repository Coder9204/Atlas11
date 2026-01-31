'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface HeatSinkThermalRendererProps {
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

const HeatSinkThermalRenderer: React.FC<HeatSinkThermalRendererProps> = ({
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
  const [cpuPower, setCpuPower] = useState(100); // Watts
  const [finCount, setFinCount] = useState(20);
  const [finHeight, setFinHeight] = useState(40); // mm
  const [fanSpeed, setFanSpeed] = useState(50); // percent
  const [thermalPaste, setThermalPaste] = useState<'none' | 'cheap' | 'premium'>('cheap');
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

  // Thermal resistance calculations
  const calcThermalResistance = useCallback(() => {
    // Junction to case resistance (fixed for CPU die)
    const R_jc = 0.3; // K/W

    // TIM resistance based on type
    const R_tim = thermalPaste === 'none' ? 2.0 : thermalPaste === 'cheap' ? 0.5 : 0.2;

    // Heatsink base resistance
    const R_base = 0.1; // K/W

    // Fin to air resistance (depends on fins and airflow)
    const finArea = finCount * finHeight * 0.05; // simplified area calculation
    const airflowFactor = 0.5 + (fanSpeed / 100) * 1.5;
    const R_fins = 1.0 / (finArea * airflowFactor * 0.1);

    // Diminishing returns on fins
    const finEfficiency = Math.min(1, 15 / finCount); // efficiency drops with more fins
    const R_fins_effective = R_fins / finEfficiency;

    return { R_jc, R_tim, R_base, R_fins: R_fins_effective, total: R_jc + R_tim + R_base + R_fins_effective };
  }, [finCount, finHeight, fanSpeed, thermalPaste]);

  const thermalResistance = calcThermalResistance();
  const ambientTemp = 25;
  const cpuTemp = ambientTemp + cpuPower * thermalResistance.total;

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
    primary: '#f97316', // orange-500
    primaryDark: '#ea580c', // orange-600
    accent: '#ef4444', // red-500
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

  const testQuestions = [
    { question: "What is thermal resistance measured in?", options: [{ text: "Watts per meter", correct: false }, { text: "Kelvin per Watt (K/W)", correct: true }, { text: "Joules per second", correct: false }, { text: "Celsius per meter", correct: false }] },
    { question: "In a thermal chain, total resistance is calculated by:", options: [{ text: "Taking the average of all resistances", correct: false }, { text: "Adding all resistances in series", correct: true }, { text: "Multiplying all resistances", correct: false }, { text: "Using only the largest resistance", correct: false }] },
    { question: "Why do CPUs need heatsinks but LEDs often don't?", options: [{ text: "LEDs don't produce heat", correct: false }, { text: "CPUs produce much more power that must be dissipated", correct: true }, { text: "LEDs are always cooler than CPUs", correct: false }, { text: "Heatsinks only work on silicon", correct: false }] },
    { question: "What is the purpose of thermal interface material (TIM)?", options: [{ text: "To electrically insulate the CPU", correct: false }, { text: "To fill air gaps and reduce contact resistance", correct: true }, { text: "To make the heatsink stick better", correct: false }, { text: "To increase thermal resistance", correct: false }] },
    { question: "If R_total = 0.5 K/W and power = 100W, temperature rise is:", options: [{ text: "200 degrees C", correct: false }, { text: "50 degrees C", correct: true }, { text: "0.005 degrees C", correct: false }, { text: "5000 degrees C", correct: false }] },
    { question: "Why does increasing fin count have diminishing returns?", options: [{ text: "More fins weigh more", correct: false }, { text: "Air can't flow well between tightly packed fins", correct: true }, { text: "Fins block the CPU", correct: false }, { text: "It doesn't - more fins always help", correct: false }] },
    { question: "What primarily limits heat transfer to air from fins?", options: [{ text: "Fin material conductivity", correct: false }, { text: "Convective heat transfer coefficient at fin surface", correct: true }, { text: "Fin color", correct: false }, { text: "CPU voltage", correct: false }] },
    { question: "A vapor chamber improves cooling by:", options: [{ text: "Using fans internally", correct: false }, { text: "Spreading heat quickly across a large area via phase change", correct: true }, { text: "Adding more thermal paste", correct: false }, { text: "Increasing thermal resistance", correct: false }] },
    { question: "Which thermal paste property matters most?", options: [{ text: "Color", correct: false }, { text: "Thermal conductivity (W/mK)", correct: true }, { text: "Viscosity only", correct: false }, { text: "Brand name", correct: false }] },
    { question: "The junction-to-ambient thermal resistance includes:", options: [{ text: "Only the heatsink", correct: false }, { text: "Die, TIM, heatsink base, fins, and convection to air", correct: true }, { text: "Only the thermal paste", correct: false }, { text: "Only the CPU die", correct: false }] }
  ];

  const applications = [
    { title: "CPU Cooling", icon: "💻", description: "Modern CPUs dissipate 65-250W. Tower coolers and AIOs use the same thermal resistance chain principles to keep temps under 90C.", details: "The thermal chain: die -> IHS -> TIM -> heatsink base -> fins -> air" },
    { title: "GPU Cooling", icon: "🎮", description: "High-end GPUs can exceed 400W! Triple-fan designs and vapor chambers spread heat across massive fin arrays.", details: "Vapor chambers act like heat pipes but spread heat in 2D instead of 1D." },
    { title: "Server Cooling", icon: "🖥️", description: "Data centers must cool thousands of servers. Each CPU's thermal solution matters for overall PUE efficiency.", details: "Hot spots from bad TIM application can reduce server lifespan significantly." },
    { title: "Power Electronics", icon: "⚡", description: "IGBTs and MOSFETs in inverters need careful thermal management. Poor cooling causes thermal runaway.", details: "Thermal resistance from junction to case is a key datasheet spec." }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (testQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  const getTempColor = (temp: number) => {
    if (temp < 50) return '#22c55e';
    if (temp < 70) return '#eab308';
    if (temp < 85) return '#f97316';
    return '#ef4444';
  };

  const renderHeatSinkVisualization = () => {
    const baseWidth = 200;
    const finWidth = Math.max(2, (baseWidth - 20) / finCount);
    const finSpacing = (baseWidth - finWidth * finCount) / (finCount + 1);

    return (
      <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
        <defs>
          <linearGradient id="heatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={getTempColor(cpuTemp)} />
            <stop offset="100%" stopColor={getTempColor(cpuTemp - 20)} />
          </linearGradient>
          <linearGradient id="finGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
        </defs>

        {/* CPU Die */}
        <rect x="170" y="240" width="60" height="20" fill={getTempColor(cpuTemp)} stroke="#1f2937" strokeWidth="2" />
        <text x="200" y="255" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">CPU</text>

        {/* Thermal Paste Layer */}
        <rect x="160" y="232" width="80" height="8" fill={thermalPaste === 'none' ? '#374151' : thermalPaste === 'cheap' ? '#6b7280' : '#a855f7'} />
        <text x="280" y="238" fontSize="9" fill="#9ca3af">TIM: {thermalResistance.R_tim.toFixed(2)} K/W</text>

        {/* Heatsink Base */}
        <rect x="100" y="220" width={baseWidth} height="12" fill="#4b5563" stroke="#374151" strokeWidth="1" />

        {/* Fins */}
        {Array.from({ length: finCount }).map((_, i) => {
          const x = 100 + finSpacing + i * (finWidth + finSpacing);
          const heatIntensity = Math.max(0.3, 1 - (i / finCount) * 0.5);
          return (
            <rect
              key={i}
              x={x}
              y={220 - finHeight * 2}
              width={finWidth}
              height={finHeight * 2}
              fill={`rgba(107, 114, 128, ${heatIntensity})`}
              stroke="#374151"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Airflow arrows */}
        {fanSpeed > 0 && Array.from({ length: 5 }).map((_, i) => {
          const x = 80 + ((animationFrame * (fanSpeed / 30) + i * 60) % 240);
          return (
            <g key={i} transform={`translate(${x}, ${180 - finHeight})`}>
              <path d="M0,0 L15,0 L12,-4 M15,0 L12,4" fill="none" stroke="#60a5fa" strokeWidth="2" opacity={fanSpeed / 100} />
            </g>
          );
        })}

        {/* Temperature display */}
        <rect x="310" y="180" width="70" height="80" fill="#1f2937" rx="5" />
        <text x="345" y="205" textAnchor="middle" fontSize="12" fill="#9ca3af">CPU Temp</text>
        <text x="345" y="235" textAnchor="middle" fontSize="24" fill={getTempColor(cpuTemp)} fontWeight="bold">{cpuTemp.toFixed(0)}°C</text>
        <text x="345" y="252" textAnchor="middle" fontSize="10" fill="#6b7280">{cpuTemp < 70 ? 'Safe' : cpuTemp < 85 ? 'Warm' : 'HOT!'}</text>

        {/* Thermal resistance chain */}
        <text x="20" y="30" fontSize="11" fill="#e5e7eb" fontWeight="bold">Thermal Chain (Series):</text>
        <text x="20" y="50" fontSize="9" fill="#9ca3af">R_junction: {thermalResistance.R_jc.toFixed(2)} K/W</text>
        <text x="20" y="65" fontSize="9" fill="#9ca3af">R_TIM: {thermalResistance.R_tim.toFixed(2)} K/W</text>
        <text x="20" y="80" fontSize="9" fill="#9ca3af">R_base: {thermalResistance.R_base.toFixed(2)} K/W</text>
        <text x="20" y="95" fontSize="9" fill="#9ca3af">R_fins: {thermalResistance.R_fins.toFixed(2)} K/W</text>
        <text x="20" y="115" fontSize="10" fill="#22d3ee" fontWeight="bold">Total: {thermalResistance.total.toFixed(2)} K/W</text>

        {/* Power indicator */}
        <text x="20" y="140" fontSize="10" fill="#f59e0b">Power: {cpuPower}W</text>
        <text x="20" y="155" fontSize="9" fill="#9ca3af">deltaT = P x R = {(cpuPower * thermalResistance.total).toFixed(1)}°C</text>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-6">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        Heat Sink Thermal Resistance
      </h1>

      <p className="text-base text-slate-400 max-w-md mb-6">
        Why do CPUs need massive heat sinks but LEDs don't?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 max-w-xl w-full border border-slate-700/50 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-2xl" />

        <div className="relative">
          <div className="text-5xl mb-4">🔥 💻 ❄️</div>

          <div className="space-y-3">
            <p className="text-lg text-white/90 font-medium leading-relaxed">
              A CPU generates 150 watts of heat in a chip smaller than your fingernail!
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Without proper cooling, it would reach 1000C in seconds. How does heat flow through the cooling system?
            </p>
            <p className="text-sm text-orange-400 font-semibold">
              It's all about thermal resistance - every layer in the chain matters!
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-4 max-w-2xl mb-4">
        <p className="text-base text-slate-300">
          A CPU produces 100W of heat. Between the CPU die and room air, there's thermal paste, a heatsink base, and fins. How is the total thermal resistance calculated?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Take the average of all thermal resistances' },
          { id: 'B', text: 'Add all thermal resistances together (series)' },
          { id: 'C', text: 'Use only the largest resistance (bottleneck)' },
          { id: 'D', text: 'Multiply all resistances together' }
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
        <div className="mt-4 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Like electrical resistors in series, thermal resistances add up: R_total = R1 + R2 + R3 + ...
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Thermal Resistance Lab</h2>
      <p className="text-slate-400 mb-4">Adjust parameters to see how each affects CPU temperature!</p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
        {renderHeatSinkVisualization()}
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">CPU Power: {cpuPower}W</label>
          <input type="range" min="50" max="300" value={cpuPower} onChange={(e) => setCpuPower(parseInt(e.target.value))} className="w-full accent-orange-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Fin Count: {finCount}</label>
          <input type="range" min="5" max="60" value={finCount} onChange={(e) => setFinCount(parseInt(e.target.value))} className="w-full accent-orange-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Fin Height: {finHeight}mm</label>
          <input type="range" min="20" max="80" value={finHeight} onChange={(e) => setFinHeight(parseInt(e.target.value))} className="w-full accent-orange-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Fan Speed: {fanSpeed}%</label>
          <input type="range" min="0" max="100" value={fanSpeed} onChange={(e) => setFanSpeed(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Thermal Paste Quality</label>
          <div className="flex gap-2">
            {(['none', 'cheap', 'premium'] as const).map(type => (
              <button
                key={type}
                onClick={() => setThermalPaste(type)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  thermalPaste === type ? 'bg-orange-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Science of Thermal Resistance</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Thermal Ohm's Law</h3>
          <div className="font-mono text-center text-lg text-white mb-2">deltaT = P x R_thermal</div>
          <p className="text-slate-300 text-sm">Temperature rise equals power times thermal resistance. Just like V = IR in electronics!</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Series Resistance Chain</h3>
          <p className="text-slate-300 text-sm mb-2">Heat flows through each layer in sequence:</p>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>- Die to IHS (integrated heat spreader)</li>
            <li>- IHS to TIM (thermal paste)</li>
            <li>- TIM to heatsink base</li>
            <li>- Base through fins to air</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Key Insight</h3>
          <p className="text-slate-300">The TOTAL resistance determines CPU temp. A single bad layer (like dried thermal paste with R = 2 K/W) can bottleneck the entire cooling system, no matter how good your heatsink is!</p>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Fin Count Paradox</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          You have a heatsink with 30 fins. An engineer suggests doubling it to 60 fins for better cooling.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What actually happens to cooling performance?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Cooling doubles - twice the fins, twice the cooling!' },
          { id: 'B', text: 'Cooling improves by exactly 50%' },
          { id: 'C', text: 'Diminishing returns - improvement is much less than double' },
          { id: 'D', text: 'No change - fin count doesn\'t matter' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
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
        <div className="mt-4 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! More fins mean less space between them, restricting airflow and reducing each fin's efficiency. There's an optimal point!
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Diminishing Returns Demo</h2>
      <p className="text-slate-400 mb-4">Watch how fin efficiency drops as you pack in more fins!</p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-2xl">
        {renderHeatSinkVisualization()}

        <div className="mt-4 bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Fin Count: {finCount} (drag to see diminishing returns)</label>
          <input type="range" min="5" max="80" value={finCount} onChange={(e) => setFinCount(parseInt(e.target.value))} className="w-full accent-amber-500" />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>5 fins (high efficiency)</span>
            <span>40 fins (optimal)</span>
            <span>80 fins (overcrowded)</span>
          </div>
        </div>

        <div className="mt-4 bg-amber-900/30 rounded-xl p-4">
          <p className="text-amber-400 font-medium">Fin Efficiency: {(Math.min(1, 15 / finCount) * 100).toFixed(0)}%</p>
          <p className="text-sm text-slate-300 mt-1">
            {finCount <= 15 ? "Fins operating at full efficiency!" :
             finCount <= 40 ? "Some airflow restriction between fins" :
             "Severe crowding - air can't flow effectively!"}
          </p>
        </div>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Fin Design Trade-offs</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Boundary Layer Problem</h3>
          <p className="text-slate-300 text-sm">
            Air flowing past a fin develops a boundary layer - a thin zone of slow-moving air that insulates the fin. Fins too close together cause boundary layers to merge, blocking fresh air!
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Optimal Design</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Fin spacing: 1-3mm for forced airflow</li>
            <li>- Taller fins help more than adding fins</li>
            <li>- Fan static pressure matters for dense fins</li>
            <li>- Vapor chambers for high-power CPUs</li>
          </ul>
        </div>
      </div>
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
              activeAppTab === index ? 'bg-orange-600 text-white'
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-orange-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-red-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered thermal resistance!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() < 7 && (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); onIncorrectAnswer?.(); }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
            >
              Review & Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-orange-900/50 via-red-900/50 to-amber-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🔥</div>
        <h1 className="text-3xl font-bold text-white mb-4">Thermal Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered heat sink thermal resistance!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📊</div><p className="text-sm text-slate-300">Thermal Ohm's Law</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔗</div><p className="text-sm text-slate-300">Series Resistance</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📉</div><p className="text-sm text-slate-300">Diminishing Returns</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">💨</div><p className="text-sm text-slate-300">Airflow Optimization</p></div>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

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

export default HeatSinkThermalRenderer;
