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
      <div className="relative">
        {/* External Labels using typo system */}
        <div className="flex justify-between mb-2 px-2">
          <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-700/50">
            <div style={{ fontSize: typo.small, fontWeight: 700 }} className="text-slate-200 mb-1">Temperatures</div>
            <div style={{ fontSize: typo.label }} className="text-blue-400">Cold: {metrics.coldAisleTemp.toFixed(1)}C</div>
            <div style={{ fontSize: typo.label }} className="text-orange-400">Hot: {metrics.hotAisleTemp.toFixed(1)}C</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-700/50 text-center">
            <div style={{ fontSize: typo.label }} className="text-amber-400">Heat Load</div>
            <div style={{ fontSize: typo.small, fontWeight: 700 }} className="text-amber-300">{metrics.heatGenerated.toFixed(0)} kW</div>
          </div>
          <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-700/50">
            <div style={{ fontSize: typo.small, fontWeight: 700 }} className="text-slate-200 mb-1">Airflow Metrics</div>
            <div style={{ fontSize: typo.label }} className="text-slate-400">CFM: {metrics.effectiveCFM.toFixed(0)}</div>
            <div style={{ fontSize: typo.label }} className="text-slate-400">Static: {metrics.staticPressure.toFixed(3)}&quot; WC</div>
            <div style={{ fontSize: typo.label, color: blankingPanels ? '#22c55e' : '#ef4444' }}>Recirc: {metrics.recirculationPercent.toFixed(0)}%</div>
          </div>
        </div>

        <svg viewBox="0 0 500 300" className="w-full max-w-2xl mx-auto">
          <defs>
            {/* Premium cold air gradient with 5 stops */}
            <linearGradient id="sairColdAir" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="25%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Premium hot air gradient with 5 stops */}
            <linearGradient id="sairHotAir" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="25%" stopColor="#c2410c" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>

            {/* Server chassis metallic gradient */}
            <linearGradient id="sairChassisMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="60%" stopColor="#1f2937" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Rack frame brushed metal */}
            <linearGradient id="sairRackMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="15%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="85%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Server LED glow */}
            <radialGradient id="sairServerLED" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#16a34a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            {/* Blanking panel gradient */}
            <linearGradient id="sairBlankingPanel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="25%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="75%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Floor tile gradient */}
            <linearGradient id="sairFloorTile" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Perforated tile gradient */}
            <linearGradient id="sairPerfTile" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="30%" stopColor="#1d4ed8" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Plenum chamber gradient */}
            <linearGradient id="sairPlenum" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="30%" stopColor="#111827" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Fan blade gradient */}
            <radialGradient id="sairFanBlade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* Containment barrier gradient */}
            <linearGradient id="sairContainment" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c2410c" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0.3" />
            </linearGradient>

            {/* Temperature zone gradients */}
            <linearGradient id="sairTempZoneCold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="sairTempZoneHot" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.1" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="sairColdGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="sairHotGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="sairLEDGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="sairSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Airflow streamline pattern */}
            <pattern id="sairStreamlines" width="20" height="10" patternUnits="userSpaceOnUse">
              <path d="M0,5 Q5,2 10,5 T20,5" fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background with subtle grid */}
          <rect width="500" height="300" fill="#030712" />
          <pattern id="sairGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
          </pattern>
          <rect width="500" height="300" fill="url(#sairGrid)" />

          {/* Floor/Plenum with depth */}
          <rect x="20" y="235" width="460" height="55" rx="4" fill="url(#sairPlenum)" />
          <rect x="20" y="235" width="460" height="4" fill="#374151" opacity="0.5" />
          {/* Plenum internal cold air glow */}
          <ellipse cx="250" cy="265" rx="180" ry="20" fill="url(#sairColdAir)" opacity="0.2" filter="url(#sairSoftGlow)" />

          {/* Floor tiles with perforations */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = 50 + i * 75;
            const isPerforated = i === 1 || i === 4;
            return (
              <g key={i}>
                <rect x={x} y="215" width="60" height="20" rx="2" fill={isPerforated ? 'url(#sairPerfTile)' : 'url(#sairFloorTile)'} stroke="#475569" strokeWidth="1" />
                {/* Tile surface highlight */}
                <rect x={x + 2} y="217" width="56" height="2" fill="rgba(255,255,255,0.1)" rx="1" />
                {isPerforated && raisedFloorOpen > 20 && (
                  <g>
                    {[...Array(4)].map((_, j) => (
                      <rect key={j} x={x + 8 + j * 14} y="219" width="8" height="12" rx="1" fill="#3b82f6" opacity={0.4 + (raisedFloorOpen / 200)} />
                    ))}
                    {/* Cold air glow from perforations */}
                    <ellipse cx={x + 30} cy="225" rx="25" ry="8" fill="#3b82f6" opacity="0.15" filter="url(#sairColdGlow)" />
                  </g>
                )}
              </g>
            );
          })}

          {/* Temperature zones */}
          {/* Cold aisle zone */}
          <rect x="160" y="70" width="180" height="140" rx="8" fill="url(#sairTempZoneCold)" />

          {/* Hot aisle zones */}
          <rect x="20" y="70" width="45" height="140" rx="4" fill="url(#sairTempZoneHot)" />
          <rect x="435" y="70" width="45" height="140" rx="4" fill="url(#sairTempZoneHot)" />

          {/* Server racks with premium styling */}
          {[0, 1, 2].map((row) => {
            const y = 75 + row * 48;
            return (
              <g key={row}>
                {/* Left rack */}
                <g>
                  {/* Rack frame */}
                  <rect x="55" y={y} width="90" height="42" rx="4" fill="url(#sairRackMetal)" stroke="#475569" strokeWidth="1.5" />
                  {/* Rack top highlight */}
                  <rect x="57" y={y + 2} width="86" height="2" fill="rgba(255,255,255,0.08)" rx="1" />

                  {blankingPanels ? (
                    <>
                      {/* Blanking panel with texture */}
                      <rect x="60" y={y + 5} width="80" height="9" rx="2" fill="url(#sairBlankingPanel)" />
                      <rect x="62" y={y + 6} width="76" height="1" fill="rgba(255,255,255,0.1)" />

                      {/* Active server with LED and vents */}
                      <rect x="60" y={y + 16} width="80" height="10" rx="2" fill="url(#sairChassisMetal)" />
                      <circle cx="68" cy={y + 21} r="2.5" fill="url(#sairServerLED)" filter="url(#sairLEDGlow)">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      {/* Server vents */}
                      {[...Array(6)].map((_, v) => (
                        <rect key={v} x={80 + v * 10} y={y + 18} width="6" height="6" rx="1" fill="#1f2937" opacity="0.6" />
                      ))}

                      {/* Blanking panel */}
                      <rect x="60" y={y + 28} width="80" height="9" rx="2" fill="url(#sairBlankingPanel)" />
                      <rect x="62" y={y + 29} width="76" height="1" fill="rgba(255,255,255,0.1)" />
                    </>
                  ) : (
                    <>
                      {/* Active server */}
                      <rect x="60" y={y + 5} width="80" height="10" rx="2" fill="url(#sairChassisMetal)" />
                      <circle cx="68" cy={y + 10} r="2.5" fill="url(#sairServerLED)" filter="url(#sairLEDGlow)">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      {[...Array(6)].map((_, v) => (
                        <rect key={v} x={80 + v * 10} y={y + 7} width="6" height="6" rx="1" fill="#1f2937" opacity="0.6" />
                      ))}

                      {/* Empty slot (gap) with recirculation indicator */}
                      <rect x="60" y={y + 17} width="80" height="8" rx="1" fill="#0f172a" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3 2" strokeOpacity="0.5" />

                      {/* Active server */}
                      <rect x="60" y={y + 27} width="80" height="10" rx="2" fill="url(#sairChassisMetal)" />
                      <circle cx="68" cy={y + 32} r="2.5" fill="url(#sairServerLED)" filter="url(#sairLEDGlow)">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                      {[...Array(6)].map((_, v) => (
                        <rect key={v} x={80 + v * 10} y={y + 29} width="6" height="6" rx="1" fill="#1f2937" opacity="0.6" />
                      ))}
                    </>
                  )}
                </g>

                {/* Right rack */}
                <g>
                  <rect x="355" y={y} width="90" height="42" rx="4" fill="url(#sairRackMetal)" stroke="#475569" strokeWidth="1.5" />
                  <rect x="357" y={y + 2} width="86" height="2" fill="rgba(255,255,255,0.08)" rx="1" />

                  {[0, 1, 2].map((slot) => (
                    <g key={slot}>
                      <rect x="360" y={y + 5 + slot * 12} width="80" height="10" rx="2" fill="url(#sairChassisMetal)" />
                      <circle cx="368" cy={y + 10 + slot * 12} r="2.5" fill="url(#sairServerLED)" filter="url(#sairLEDGlow)">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur={`${1.2 + slot * 0.3}s`} repeatCount="indefinite" />
                      </circle>
                      {[...Array(6)].map((_, v) => (
                        <rect key={v} x={380 + v * 10} y={y + 7 + slot * 12} width="6" height="6" rx="1" fill="#1f2937" opacity="0.6" />
                      ))}
                    </g>
                  ))}
                </g>
              </g>
            );
          })}

          {/* Fan visualization at top of racks */}
          {[75, 375].map((x, idx) => (
            <g key={`fan-${idx}`} transform={`translate(${x}, 55)`}>
              <circle cx="35" cy="8" r="12" fill="url(#sairFanBlade)" stroke="#475569" strokeWidth="1" />
              <circle cx="35" cy="8" r="4" fill="#1e293b" />
              {/* Fan blades - animated rotation */}
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <line
                  key={i}
                  x1="35"
                  y1="8"
                  x2={35 + 9 * Math.cos((angle + animationFrame * (fanSpeed / 10)) * Math.PI / 180)}
                  y2={8 + 9 * Math.sin((angle + animationFrame * (fanSpeed / 10)) * Math.PI / 180)}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}

          {/* Hot aisle containment barriers */}
          {hotAisleContainment && (
            <>
              <rect x="20" y="60" width="40" height="8" rx="2" fill="url(#sairContainment)" />
              <rect x="440" y="60" width="40" height="8" rx="2" fill="url(#sairContainment)" />
              {/* Containment ceiling panels */}
              <rect x="20" y="60" width="40" height="2" fill="#f97316" opacity="0.8" />
              <rect x="440" y="60" width="40" height="2" fill="#f97316" opacity="0.8" />
            </>
          )}

          {/* Animated cold air streamlines rising from floor */}
          {[...Array(Math.round(raisedFloorOpen / 15))].map((_, i) => {
            const baseX = 180 + i * 25;
            const yOffset = (animationFrame * 2 + i * 15) % 60;
            const opacity = 0.4 + (raisedFloorOpen / 200);
            return (
              <g key={`cold-stream-${i}`} filter="url(#sairColdGlow)">
                <path
                  d={`M${baseX},${215 - yOffset} Q${baseX + 5},${200 - yOffset} ${baseX},${185 - yOffset}`}
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity={opacity}
                />
                {/* Arrow head */}
                <polygon
                  points={`${baseX},${182 - yOffset} ${baseX - 4},${190 - yOffset} ${baseX + 4},${190 - yOffset}`}
                  fill="#60a5fa"
                  opacity={opacity}
                />
              </g>
            );
          })}

          {/* Animated airflow through servers - streamlines */}
          {[...Array(6)].map((_, i) => {
            const row = i % 3;
            const baseY = 95 + row * 48;
            const xOffset = (animationFrame * 1.5 + i * 20) % 80;
            const tempProgress = xOffset / 80;
            const streamColor = tempProgress < 0.3 ? '#60a5fa' : tempProgress < 0.6 ? '#fbbf24' : '#f97316';
            return (
              <g key={`flow-${i}`}>
                {/* Streamline path through server */}
                <path
                  d={`M${148 + xOffset},${baseY} l15,0`}
                  fill="none"
                  stroke={streamColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                {/* Small particle effect */}
                <circle
                  cx={155 + xOffset}
                  cy={baseY}
                  r="2"
                  fill={streamColor}
                  opacity="0.9"
                />
              </g>
            );
          })}

          {/* Hot air recirculation visualization when no blanking panels */}
          {!blankingPanels && (
            <g filter="url(#sairHotGlow)">
              {[0, 1, 2].map((row) => {
                const y = 75 + row * 48 + 21;
                const loopOffset = (animationFrame * 2 + row * 30) % 100;
                return (
                  <g key={`recirc-${row}`}>
                    {/* Recirculation loop path */}
                    <path
                      d={`M148,${y} Q130,${y - 15} 130,${y - 30} Q130,${y - 45} 150,${y - 40}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="6 3"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="18"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    </path>
                    {/* Hot air particle */}
                    <circle
                      cx={130 + (loopOffset % 25)}
                      cy={y - 20 - Math.sin(loopOffset * 0.1) * 10}
                      r="3"
                      fill="#ef4444"
                      opacity="0.7"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Hot exhaust rising from hot aisles */}
          {[30, 455].map((x, idx) => (
            <g key={`exhaust-${idx}`}>
              {[...Array(3)].map((_, i) => {
                const yOffset = (animationFrame * 1.5 + i * 25) % 50;
                return (
                  <g key={`heat-${idx}-${i}`} filter="url(#sairHotGlow)">
                    <ellipse
                      cx={x + 15}
                      cy={70 - yOffset}
                      rx="8"
                      ry="4"
                      fill="#f97316"
                      opacity={0.3 - yOffset / 200}
                    />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
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
