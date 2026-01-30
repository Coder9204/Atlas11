'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ServerAirflowRendererProps {
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

const ServerAirflowRenderer: React.FC<ServerAirflowRendererProps> = ({
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
  const [serverLoad, setServerLoad] = useState(70); // percent
  const [fanSpeed, setFanSpeed] = useState(50); // percent CFM
  const [blankingPanels, setBlankingPanels] = useState(true);
  const [raisedFloorOpen, setRaisedFloorOpen] = useState(50); // percent tile openness
  const [hotAisleContainment, setHotAisleContainment] = useState(false);
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

  // Calculate airflow and temperatures
  const calcAirflowMetrics = useCallback(() => {
    const heatGenerated = serverLoad * 10; // kW simplified
    const effectiveCFM = fanSpeed * 20; // simplified CFM

    // Blanking panel effect - without them, hot air recirculates
    const recirculationFactor = blankingPanels ? 0.1 : 0.5;

    // Raised floor pressure effect
    const pressureDrop = (100 - raisedFloorOpen) * 0.02;

    // Hot aisle containment reduces mixing
    const containmentBonus = hotAisleContainment ? 0.3 : 0;

    // Calculate temps
    const coolingEfficiency = (effectiveCFM / 1000) * (1 - recirculationFactor - pressureDrop + containmentBonus);
    const coldAisleTemp = 18 + (1 - coolingEfficiency) * 5;
    const hotAisleTemp = coldAisleTemp + (heatGenerated / Math.max(1, effectiveCFM)) * 50;

    // Delta T across servers
    const deltaT = hotAisleTemp - coldAisleTemp;

    return {
      heatGenerated,
      effectiveCFM,
      coldAisleTemp: Math.max(18, Math.min(30, coldAisleTemp)),
      hotAisleTemp: Math.max(25, Math.min(50, hotAisleTemp)),
      deltaT,
      recirculationPercent: recirculationFactor * 100,
      staticPressure: 0.05 + raisedFloorOpen * 0.001 // inches WC
    };
  }, [serverLoad, fanSpeed, blankingPanels, raisedFloorOpen, hotAisleContainment]);

  const metrics = calcAirflowMetrics();

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
    primary: '#3b82f6', // blue-500
    primaryDark: '#2563eb', // blue-600
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
    playSound(prediction === 'C' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
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
    { question: "Why do data centers use raised floors?", options: [{ text: "To store cables", correct: false }, { text: "To create a pressurized plenum for cold air distribution", correct: true }, { text: "To make cleaning easier", correct: false }, { text: "For earthquake protection", correct: false }] },
    { question: "What is the purpose of the hot aisle/cold aisle layout?", options: [{ text: "To look organized", correct: false }, { text: "To separate cold inlet air from hot exhaust air", correct: true }, { text: "To save floor space", correct: false }, { text: "To reduce noise", correct: false }] },
    { question: "Blanking panels in empty rack slots prevent:", options: [{ text: "Dust from entering", correct: false }, { text: "Hot air from recirculating to the cold aisle", correct: true }, { text: "Theft of equipment", correct: false }, { text: "Electromagnetic interference", correct: false }] },
    { question: "CFM stands for:", options: [{ text: "Cold Flow Measurement", correct: false }, { text: "Cubic Feet per Minute (airflow volume)", correct: true }, { text: "Cooling Factor Metric", correct: false }, { text: "Central Fan Motor", correct: false }] },
    { question: "Static pressure in a raised floor is measured in:", options: [{ text: "PSI", correct: false }, { text: "Inches of water column (WC)", correct: true }, { text: "Degrees Celsius", correct: false }, { text: "Watts", correct: false }] },
    { question: "Hot aisle containment helps by:", options: [{ text: "Making the room look better", correct: false }, { text: "Preventing hot/cold air mixing, improving CRAC efficiency", correct: true }, { text: "Reducing noise", correct: false }, { text: "Saving floor space", correct: false }] },
    { question: "The ideal cold aisle temperature for servers is typically:", options: [{ text: "5-10C (very cold)", correct: false }, { text: "18-27C per ASHRAE guidelines", correct: true }, { text: "30-35C (warm)", correct: false }, { text: "0C (freezing)", correct: false }] },
    { question: "Bypass airflow refers to:", options: [{ text: "Air going through servers too fast", correct: false }, { text: "Conditioned air that returns to CRAC without cooling equipment", correct: true }, { text: "Emergency ventilation", correct: false }, { text: "Air going through cable holes", correct: false }] },
    { question: "If you remove a server without adding blanking panels:", options: [{ text: "Nothing changes", correct: false }, { text: "Hot air shortcuts through the gap, raising cold aisle temp", correct: true }, { text: "The rack cools better", correct: false }, { text: "Static pressure increases", correct: false }] },
    { question: "Delta T (temperature rise) across a server depends on:", options: [{ text: "Server color", correct: false }, { text: "Heat load and airflow rate (Q = m_dot * Cp * deltaT)", correct: true }, { text: "Rack height only", correct: false }, { text: "Room lighting", correct: false }] }
  ];

  const applications = [
    { title: "Hyperscale Data Centers", icon: "🏢", description: "Google, Amazon, and Microsoft run data centers with 100,000+ servers. Perfect airflow management saves millions in cooling costs.", details: "Hot aisle containment can improve PUE by 0.1-0.2 points." },
    { title: "Colocation Facilities", icon: "🔌", description: "Colo providers must cool diverse equipment from different customers. Blanking panels and airflow management are critical.", details: "Empty U-spaces without blanking panels can raise intake temps by 5-10C." },
    { title: "Edge Computing", icon: "📡", description: "Small edge sites (5-10 racks) still need proper airflow. Micro-modular designs use sealed hot aisles.", details: "Self-contained pods maintain airflow even in non-ideal locations." },
    { title: "Telecom Central Offices", icon: "📞", description: "Legacy telecom buildings often have poor airflow. Retrofitting with containment and proper tile placement helps.", details: "Perforated tile placement matters - 80% of cooling issues are airflow-related." }
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (testQuestions[index].options[answer]?.correct ? 1 : 0), 0);

  const getTempColor = (temp: number) => {
    if (temp < 22) return '#3b82f6';
    if (temp < 27) return '#22c55e';
    if (temp < 35) return '#eab308';
    return '#ef4444';
  };

  const renderDataCenterVisualization = () => {
    return (
      <svg viewBox="0 0 500 350" className="w-full max-w-2xl mx-auto">
        <defs>
          <linearGradient id="coldAirGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="hotAirGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        {/* Floor/Plenum */}
        <rect x="20" y="280" width="460" height="40" fill="#374151" stroke="#4b5563" strokeWidth="2" />
        <text x="250" y="305" textAnchor="middle" fontSize="12" fill="#9ca3af">Raised Floor Plenum (Pressurized)</text>

        {/* Floor tiles with perforations */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = 50 + i * 75;
          const isPerforated = i === 1 || i === 4; // Cold aisle tiles
          return (
            <g key={i}>
              <rect x={x} y="260" width="60" height="20" fill={isPerforated ? '#1e40af' : '#6b7280'} stroke="#374151" />
              {isPerforated && raisedFloorOpen > 20 && (
                <g>
                  {[...Array(3)].map((_, j) => (
                    <rect key={j} x={x + 10 + j * 18} y="263" width="10" height="14" fill="#3b82f6" opacity="0.5" />
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* Server racks */}
        {[0, 1, 2].map((row) => {
          const y = 100 + row * 55;
          return (
            <g key={row}>
              {/* Left rack row */}
              <rect x="60" y={y} width="80" height="45" fill="#1f2937" stroke="#374151" strokeWidth="2" rx="3" />
              {blankingPanels ? (
                <>
                  <rect x="65" y={y + 5} width="70" height="10" fill="#4b5563" />
                  <rect x="65" y={y + 18} width="70" height="10" fill="#22c55e" />
                  <rect x="65" y={y + 31} width="70" height="10" fill="#4b5563" />
                </>
              ) : (
                <>
                  <rect x="65" y={y + 5} width="70" height="10" fill="#22c55e" />
                  <rect x="65" y={y + 18} width="70" height="3" fill="#1f2937" />
                  <rect x="65" y={y + 31} width="70" height="10" fill="#22c55e" />
                </>
              )}

              {/* Right rack row */}
              <rect x="360" y={y} width="80" height="45" fill="#1f2937" stroke="#374151" strokeWidth="2" rx="3" />
              <rect x="365" y={y + 5} width="70" height="10" fill="#22c55e" />
              <rect x="365" y={y + 18} width="70" height="10" fill="#22c55e" />
              <rect x="365" y={y + 31} width="70" height="10" fill="#22c55e" />
            </g>
          );
        })}

        {/* Cold aisle label */}
        <rect x="170" y="120" width="160" height="100" fill="url(#coldAirGradient)" opacity="0.3" rx="5" />
        <text x="250" y="145" textAnchor="middle" fontSize="14" fill="#60a5fa" fontWeight="bold">Cold Aisle</text>
        <text x="250" y="165" textAnchor="middle" fontSize="12" fill="#93c5fd">{metrics.coldAisleTemp.toFixed(1)}C</text>

        {/* Hot aisle labels */}
        <rect x="20" y="95" width="35" height="170" fill="url(#hotAirGradient)" opacity="0.3" rx="3" />
        <rect x="445" y="95" width="35" height="170" fill="url(#hotAirGradient)" opacity="0.3" rx="3" />

        {/* Hot aisle containment visualization */}
        {hotAisleContainment && (
          <>
            <rect x="20" y="90" width="35" height="5" fill="#f97316" />
            <rect x="445" y="90" width="35" height="5" fill="#f97316" />
            <text x="37" y="85" textAnchor="middle" fontSize="8" fill="#f97316">Contained</text>
          </>
        )}

        {/* Airflow arrows - cold air rising from floor */}
        {[...Array(Math.round(raisedFloorOpen / 20))].map((_, i) => {
          const x = 200 + i * 30;
          const yOffset = (animationFrame * 2 + i * 20) % 40;
          return (
            <path key={`cold-${i}`} d={`M${x},${260 - yOffset} L${x},${240 - yOffset} L${x - 5},${245 - yOffset} M${x},${240 - yOffset} L${x + 5},${245 - yOffset}`}
              fill="none" stroke="#60a5fa" strokeWidth="2" opacity={0.7} />
          );
        })}

        {/* Airflow through servers */}
        {[...Array(5)].map((_, i) => {
          const x = 145 + ((animationFrame * 1.5 + i * 25) % 70);
          const y = 115 + (i % 3) * 55 + 22;
          return (
            <path key={`flow-${i}`} d={`M${x},${y} L${x + 15},${y}`}
              fill="none" stroke={getTempColor(metrics.coldAisleTemp + i * 3)} strokeWidth="2" opacity={0.8} />
          );
        })}

        {/* Hot air recirculation if no blanking panels */}
        {!blankingPanels && (
          <path d="M145,130 Q120,100 145,150" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" opacity="0.7">
            <animate attributeName="stroke-dashoffset" from="0" to="12" dur="1s" repeatCount="indefinite" />
          </path>
        )}

        {/* Metrics panel */}
        <rect x="330" y="10" width="160" height="80" fill="#1f2937" rx="5" />
        <text x="410" y="30" textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="bold">Airflow Metrics</text>
        <text x="340" y="48" fontSize="10" fill="#9ca3af">CFM: {metrics.effectiveCFM.toFixed(0)}</text>
        <text x="340" y="62" fontSize="10" fill="#9ca3af">Static: {metrics.staticPressure.toFixed(3)}" WC</text>
        <text x="340" y="76" fontSize="10" fill={blankingPanels ? '#22c55e' : '#ef4444'}>Recirc: {metrics.recirculationPercent.toFixed(0)}%</text>

        {/* Temperature display */}
        <rect x="20" y="10" width="100" height="70" fill="#1f2937" rx="5" />
        <text x="70" y="30" textAnchor="middle" fontSize="11" fill="#e5e7eb" fontWeight="bold">Temperatures</text>
        <text x="30" y="50" fontSize="10" fill="#60a5fa">Cold: {metrics.coldAisleTemp.toFixed(1)}C</text>
        <text x="30" y="65" fontSize="10" fill="#f97316">Hot: {metrics.hotAisleTemp.toFixed(1)}C</text>

        {/* Heat load */}
        <text x="250" y="30" textAnchor="middle" fontSize="10" fill="#fbbf24">Heat Load: {metrics.heatGenerated.toFixed(0)} kW</text>
      </svg>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-blue-400 tracking-wide">DATA CENTER PHYSICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
        Server Airflow & Pressure
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Why do data centers have raised floors with holes?
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🏢 💨 ❄️</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              A data center uses more power for cooling than the servers themselves!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Hot and cold air mixing wastes energy. The solution? Pressurized plenums, containment, and... blanking panels?
            </p>
            <div className="pt-2">
              <p className="text-base text-blue-400 font-semibold">
                Small details like a missing blanking panel can raise temps by 10C!
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Data centers put servers in rows with alternating "cold aisles" and "hot aisles". Cold air comes up from the floor, goes through servers, and exits hot. Why this layout?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'It looks more organized for visitors' },
          { id: 'B', text: 'It makes cable management easier' },
          { id: 'C', text: 'It prevents hot and cold air from mixing, improving cooling efficiency' },
          { id: 'D', text: 'It reduces noise from the servers' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C' ? 'bg-emerald-600/40 border-2 border-emerald-400'
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
            Correct! Separating hot exhaust from cold supply prevents wasteful mixing. The cold aisle stays cool, and CRAC units work more efficiently!
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Data Center Airflow Lab</h2>
      <p className="text-slate-400 mb-4">Adjust parameters to see their effect on cooling!</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
        {renderDataCenterVisualization()}
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Server Load: {serverLoad}%</label>
          <input type="range" min="20" max="100" value={serverLoad} onChange={(e) => setServerLoad(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">CRAC Fan Speed (CFM): {fanSpeed}%</label>
          <input type="range" min="20" max="100" value={fanSpeed} onChange={(e) => setFanSpeed(parseInt(e.target.value))} className="w-full accent-blue-500" />
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Floor Tile Openness: {raisedFloorOpen}%</label>
          <input type="range" min="10" max="100" value={raisedFloorOpen} onChange={(e) => setRaisedFloorOpen(parseInt(e.target.value))} className="w-full accent-cyan-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setBlankingPanels(!blankingPanels)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl font-medium transition-colors ${
              blankingPanels ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            Blanking Panels: {blankingPanels ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setHotAisleContainment(!hotAisleContainment)}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={`p-4 rounded-xl font-medium transition-colors ${
              hotAisleContainment ? 'bg-orange-600 text-white' : 'bg-slate-600 text-white'
            }`}
          >
            Hot Aisle Containment: {hotAisleContainment ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-4 max-w-2xl w-full mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{metrics.coldAisleTemp.toFixed(1)}C</div>
            <div className="text-sm text-slate-300">Cold Aisle</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-400">{metrics.hotAisleTemp.toFixed(1)}C</div>
            <div className="text-sm text-slate-300">Hot Aisle</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{metrics.deltaT.toFixed(1)}C</div>
            <div className="text-sm text-slate-300">Delta T</div>
          </div>
        </div>
      </div>

    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Science of Data Center Airflow</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Raised Floor Plenum</h3>
          <p className="text-slate-300 text-sm">The space under the raised floor is a pressurized air distribution system. CRACs push cold air into this plenum, and it rises through perforated tiles into the cold aisle.</p>
          <p className="text-cyan-400 text-sm mt-2">Static pressure: 0.03-0.05" water column is typical.</p>
        </div>
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Heat Transfer Physics</h3>
          <div className="font-mono text-center text-sm text-white mb-2">Q = m_dot x Cp x deltaT</div>
          <p className="text-slate-300 text-sm">Heat removed equals mass flow rate times specific heat times temperature difference. More CFM or larger deltaT = more cooling!</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Key Concepts</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
            <div>
              <p className="text-white font-medium">Hot/Cold Aisle Separation</p>
              <p>Prevents mixing and short-circuiting of airflow</p>
            </div>
            <div>
              <p className="text-white font-medium">Containment</p>
              <p>Physical barriers further reduce mixing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Blanking Panel Mystery</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A data center manager removes some old servers from a rack but forgets to install blanking panels in the empty slots. The rack is only 60% full.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to the remaining servers in that rack?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'They cool better due to extra airflow through the gaps' },
          { id: 'B', text: 'They overheat because hot air shortcuts through the gaps back to the cold aisle' },
          { id: 'C', text: 'No change - servers manage their own cooling' },
          { id: 'D', text: 'Only servers near the gaps are affected' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ WebkitTapHighlightColor: 'transparent' }}
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
        <div className="mt-4 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Hot exhaust air takes the path of least resistance - right through those gaps back into the cold aisle. This "recirculation" can raise intake temps by 10C or more!
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Blanking Panel Demo</h2>
      <p className="text-slate-400 mb-4">Toggle blanking panels to see the dramatic difference!</p>

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full max-w-2xl">
        {renderDataCenterVisualization()}
      </div>

      <div className="grid gap-4 w-full max-w-2xl mb-4">
        <button
          onClick={() => setBlankingPanels(!blankingPanels)}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`w-full p-4 rounded-xl font-bold text-lg transition-colors ${
            blankingPanels ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {blankingPanels ? '✓ Blanking Panels Installed' : '✗ Blanking Panels Missing'}
        </button>

        <div className={`p-4 rounded-xl ${blankingPanels ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: getTempColor(metrics.coldAisleTemp) }}>
                {metrics.coldAisleTemp.toFixed(1)}C
              </div>
              <div className="text-sm text-slate-300">Cold Aisle Temp</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">
                {metrics.recirculationPercent.toFixed(0)}%
              </div>
              <div className="text-sm text-slate-300">Hot Air Recirculation</div>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-3 text-center">
            {blankingPanels
              ? "Good airflow! Cold aisle stays cool."
              : "Hot air shortcuts through gaps, raising cold aisle temperature!"}
          </p>
        </div>
      </div>

    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Why Blanking Panels Matter So Much</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">The Physics of Recirculation</h3>
          <p className="text-slate-300 text-sm">
            Air follows the path of least resistance. A gap in the rack is much easier to flow through than dense server components. Hot exhaust (35-45C) loops back to the cold aisle (target 18-22C).
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">The Cascade Effect</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>- Servers intake warmer air</li>
            <li>- Fans spin faster to compensate</li>
            <li>- Power consumption increases</li>
            <li>- CRAC works harder</li>
            <li>- PUE gets worse!</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The $2 Panel That Saves Thousands</h3>
          <p className="text-slate-300">A blanking panel costs $2-5. But that missing panel can cause $100s in extra cooling costs monthly, plus reduced server lifespan. It's one of the highest-ROI investments in a data center!</p>
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
              activeAppTab === index ? 'bg-blue-600 text-white'
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
                    className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
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
            className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'}`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
          <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered data center airflow!' : 'Keep studying! Review and try again.'}</p>
          {calculateScore() < 7 && (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); onIncorrectAnswer?.(); }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
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
      <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">💨</div>
        <h1 className="text-3xl font-bold text-white mb-4">Airflow Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered data center airflow management!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🏢</div><p className="text-sm text-slate-300">Hot/Cold Aisles</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📋</div><p className="text-sm text-slate-300">Blanking Panels</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">📊</div><p className="text-sm text-slate-300">Static Pressure</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔒</div><p className="text-sm text-slate-300">Containment</p></div>
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
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

export default ServerAirflowRenderer;
