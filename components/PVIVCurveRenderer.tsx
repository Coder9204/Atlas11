import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
             'coach_prompt' | 'guide_paused' | 'guide_resumed';
  gameType: string;
  gameTitle: string;
  details: {
    currentScreen?: number;
    totalScreens?: number;
    phase?: string;
    phaseLabel?: string;
    prediction?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    coachMessage?: string;
    needsHelp?: boolean;
    [key: string]: unknown;
  };
  timestamp: number;
}

interface PVIVCurveRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string; // Optional, only for resume
}

// --- GLOBAL SOUND UTILITY ---
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#fbbf24',
  solarGlow: 'rgba(251, 191, 36, 0.3)',
  current: '#22c55e',
  voltage: '#3b82f6',
  power: '#a855f7',
  mpp: '#ec4899',
  primary: '#06b6d4',
  border: '#334155',
};

const PVIVCurveRenderer: React.FC<PVIVCurveRendererProps> = ({ onGameEvent, gamePhase }) => {
  // --- INTERNAL PHASE STATE MANAGEMENT ---
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Simulation state
  const [loadResistance, setLoadResistance] = useState(50);
  const [lightIntensity, setLightIntensity] = useState(100);
  const [temperature, setTemperature] = useState(25);
  const [showIVCurve, setShowIVCurve] = useState(true);
  const [showPVCurve, setShowPVCurve] = useState(true);
  const [showMPP, setShowMPP] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(1);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // --- RESPONSIVE DESIGN ---
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

  // Phase order for navigation
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Test It',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Emit events to AI coach
  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: GameEvent['details']
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'pv_iv_curve',
        gameTitle: 'PV I-V Curve',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    playSound('transition');
    setPhase(p);

    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      message: `Navigated to ${phaseLabels[p]}`
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phaseLabels, phaseOrder]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Physics calculations for I-V curve
  const calculateIV = useCallback((loadPercent: number) => {
    const baseIsc = 8.5;
    const baseVoc = 0.65;
    const intensityFactor = lightIntensity / 100;
    const Isc = baseIsc * intensityFactor;
    const tempCoeff = -0.0022;
    const Voc = baseVoc + tempCoeff * (temperature - 25);
    const currentTempCoeff = 0.0006;
    const tempAdjustedIsc = Isc * (1 + currentTempCoeff * (temperature - 25));
    const normalizedLoad = loadPercent / 100;
    const voltage = normalizedLoad * Voc;
    const n = 2.5;
    const current = Math.max(0, tempAdjustedIsc * (1 - Math.pow(voltage / Voc, n)));
    const power = voltage * current;
    return { voltage, current, power, Isc: tempAdjustedIsc, Voc };
  }, [lightIntensity, temperature]);

  const findMPP = useCallback(() => {
    let maxPower = 0;
    let mppVoltage = 0;
    let mppCurrent = 0;
    let mppLoad = 0;
    for (let load = 0; load <= 100; load += 1) {
      const { voltage, current, power } = calculateIV(load);
      if (power > maxPower) {
        maxPower = power;
        mppVoltage = voltage;
        mppCurrent = current;
        mppLoad = load;
      }
    }
    return { power: maxPower, voltage: mppVoltage, current: mppCurrent, load: mppLoad };
  }, [calculateIV]);

  const generateCurveData = useCallback(() => {
    const points: { load: number; voltage: number; current: number; power: number }[] = [];
    for (let load = 0; load <= 100; load += 2) {
      const { voltage, current, power } = calculateIV(load);
      points.push({ load, voltage, current, power });
    }
    return points;
  }, [calculateIV]);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setLoadResistance(prev => {
        let newVal = prev + animationDirection * 2;
        if (newVal >= 100) {
          setAnimationDirection(-1);
          newVal = 100;
        } else if (newVal <= 0) {
          setAnimationDirection(1);
          newVal = 0;
        }
        return newVal;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, animationDirection]);

  const currentValues = calculateIV(loadResistance);
  const mpp = findMPP();
  const curveData = generateCurveData();

  const predictions = [
    { id: 'double_v', label: 'Voltage doubles when sunlight doubles' },
    { id: 'double_i', label: 'Current doubles, voltage stays nearly the same' },
    { id: 'both_double', label: 'Both voltage and current double equally' },
    { id: 'neither', label: 'Neither changes much - there is a limit' },
  ];

  const twistPredictions = [
    { id: 'power_up', label: 'Power output increases when panel gets warmer' },
    { id: 'power_down', label: 'Power output decreases when panel gets warmer' },
    { id: 'power_same', label: 'Power stays the same - heat does not affect solar cells' },
    { id: 'voltage_up', label: 'Voltage increases, current decreases, power stays same' },
  ];

  const transferApplications = [
    {
      title: 'MPPT Solar Charge Controllers',
      description: 'Maximum Power Point Tracking (MPPT) controllers continuously adjust the load to keep the solar panel operating at its sweet spot.',
      question: 'Why do MPPT controllers outperform simple PWM controllers?',
      answer: 'PWM controllers connect panels directly to batteries, forcing operation at battery voltage. MPPT controllers use DC-DC conversion to operate panels at their MPP regardless of battery voltage, capturing 15-30% more energy especially in cold weather or partial shade.',
    },
    {
      title: 'Solar Farm Inverters',
      description: 'Grid-tied inverters in solar farms track the MPP of thousands of panels while converting DC to AC for the power grid.',
      question: 'Why do modern solar farms use microinverters or power optimizers on each panel?',
      answer: 'When panels are connected in series, shade on one panel drags down the entire string. Per-panel MPPT allows each panel to operate at its own optimal point, preventing a 10% shaded panel from causing 50%+ system losses.',
    },
    {
      title: 'Space Solar Arrays',
      description: 'Satellites use gallium arsenide solar cells that have different I-V characteristics than silicon, with higher efficiency but different temperature coefficients.',
      question: 'Why do space solar cells perform better than terrestrial panels despite extreme temperatures?',
      answer: 'In the cold of space (-150C in shadow), solar cell voltage increases significantly. Combined with no atmosphere absorbing light, space panels can achieve 30%+ efficiency. The challenge is managing thermal cycling between sun and shadow.',
    },
    {
      title: 'Electric Vehicle Solar Roofs',
      description: 'Some EVs integrate solar panels that must track MPP while the car moves through changing light conditions.',
      question: 'What unique challenges do vehicle-integrated solar panels face?',
      answer: 'Rapid shading changes from trees/buildings require very fast MPPT algorithms. Curved surfaces mean different panel sections receive different intensities. Vibration affects connections. Despite challenges, solar roofs can add 10-30 miles of range per day.',
    },
  ];

  const testQuestions = [
    {
      question: 'At the Maximum Power Point (MPP), which statement is true?',
      options: [
        { text: 'Voltage is at its maximum value', correct: false },
        { text: 'Current is at its maximum value', correct: false },
        { text: 'The product of voltage and current (V x I) is maximized', correct: true },
        { text: 'Both voltage and current are at 50% of their maximum', correct: false },
      ],
    },
    {
      question: 'What happens to solar cell voltage when light intensity doubles?',
      options: [
        { text: 'It roughly doubles', correct: false },
        { text: 'It increases only slightly (logarithmically)', correct: true },
        { text: 'It stays exactly the same', correct: false },
        { text: 'It decreases', correct: false },
      ],
    },
    {
      question: 'What happens to solar cell current when light intensity doubles?',
      options: [
        { text: 'It roughly doubles (linear relationship)', correct: true },
        { text: 'It increases only slightly', correct: false },
        { text: 'It stays the same', correct: false },
        { text: 'It depends on temperature', correct: false },
      ],
    },
    {
      question: 'When a solar panel gets hotter, what typically happens?',
      options: [
        { text: 'Voltage increases, improving efficiency', correct: false },
        { text: 'Voltage decreases, reducing power output', correct: true },
        { text: 'Current increases dramatically', correct: false },
        { text: 'Nothing changes significantly', correct: false },
      ],
    },
    {
      question: 'The open-circuit voltage (Voc) occurs when:',
      options: [
        { text: 'The panel is short-circuited', correct: false },
        { text: 'No current flows through the external circuit', correct: true },
        { text: 'Maximum power is being extracted', correct: false },
        { text: 'The panel is in complete darkness', correct: false },
      ],
    },
    {
      question: 'The short-circuit current (Isc) occurs when:',
      options: [
        { text: 'The load resistance is infinite', correct: false },
        { text: 'The terminals are directly connected (zero load resistance)', correct: true },
        { text: 'The panel is at maximum power', correct: false },
        { text: 'The panel voltage equals battery voltage', correct: false },
      ],
    },
    {
      question: 'What does an MPPT charge controller do?',
      options: [
        { text: 'Keeps the battery at maximum voltage', correct: false },
        { text: 'Continuously adjusts the load to operate the panel at its optimal power point', correct: true },
        { text: 'Maximizes current regardless of voltage', correct: false },
        { text: 'Prevents the panel from overheating', correct: false },
      ],
    },
    {
      question: 'Why is the I-V curve of a solar cell non-linear?',
      options: [
        { text: 'Due to manufacturing defects', correct: false },
        { text: 'Because the p-n junction behaves like a diode', correct: true },
        { text: 'Because light intensity varies', correct: false },
        { text: 'Due to cable resistance', correct: false },
      ],
    },
    {
      question: 'The fill factor of a solar cell measures:',
      options: [
        { text: 'How much of the panel surface is covered by cells', correct: false },
        { text: 'The ratio of actual max power to the product of Voc and Isc', correct: true },
        { text: 'How full the battery is', correct: false },
        { text: 'The percentage of light converted to heat', correct: false },
      ],
    },
    {
      question: 'In partial shade, why does output drop more than expected?',
      options: [
        { text: 'Shaded cells become resistive loads that consume power', correct: true },
        { text: 'The inverter turns off completely', correct: false },
        { text: 'Light bends away from the panel', correct: false },
        { text: 'The panel temperature drops too much', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 8 ? 'success' : 'failure');
    emitGameEvent(score >= 8 ? 'correct_answer' : 'incorrect_answer', {
      score,
      maxScore: 10,
      message: score >= 8 ? 'Test passed!' : 'Test not passed'
    });
  };

  const currentIdx = phaseOrder.indexOf(phase);

  // --- RENDER PROGRESS BAR ---
  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '8px 12px' : '10px 16px',
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: colors.bgCard,
      gap: isMobile ? '8px' : '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
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
      <span style={{ fontSize: '11px', fontWeight: 700, color: colors.primary, padding: '4px 8px', borderRadius: '6px', backgroundColor: `${colors.primary}15` }}>
        {currentIdx + 1}/{phaseOrder.length}
      </span>
    </div>
  );

  // --- RENDER BOTTOM BAR ---
  const renderBottomBar = (canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px'
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={() => {
            if (!canGoNext) return;
            if (onNext) {
              onNext();
            } else {
              goNext();
            }
          }}
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = (interactive: boolean, showTempControl: boolean = false) => {
    const width = 400;
    const height = 380;
    const graphWidth = 160;
    const graphHeight = 120;
    const ivGraphX = 30;
    const ivGraphY = 160;
    const pvGraphX = 220;
    const pvGraphY = 160;
    const maxVoltage = 0.7;
    const maxCurrent = 10;
    const maxPower = 5;

    const scaleV = (v: number) => (v / maxVoltage) * graphWidth;
    const scaleI = (i: number) => graphHeight - (i / maxCurrent) * graphHeight;
    const scaleP = (p: number) => graphHeight - (p / maxPower) * graphHeight;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.solar} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.solar} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>
          </defs>

          <circle cx="60" cy="40" r="35" fill="url(#sunGlow)" />
          <circle cx="60" cy="40" r="18" fill={colors.solar} />
          <text x="60" y="85" fill={colors.textSecondary} fontSize="10" textAnchor="middle">
            {lightIntensity}% Intensity
          </text>

          <g transform="translate(140, 20)">
            <rect x="0" y="0" width="80" height="50" fill="url(#panelGrad)" rx="4" stroke="#3b82f6" strokeWidth="2" />
            {[1, 2, 3].map(i => (
              <line key={`h${i}`} x1="0" y1={i * 12.5} x2="80" y2={i * 12.5} stroke="#1e3a8a" strokeWidth="0.5" />
            ))}
            {[1, 2, 3, 4, 5].map(i => (
              <line key={`v${i}`} x1={i * 13.3} y1="0" x2={i * 13.3} y2="50" stroke="#1e3a8a" strokeWidth="0.5" />
            ))}
            {[0, 1, 2].map(i => (
              <line
                key={`ray${i}`}
                x1={-60 + i * 20}
                y1={-20 + i * 5}
                x2={20 + i * 20}
                y2={10}
                stroke={colors.solar}
                strokeWidth="2"
                opacity={lightIntensity / 100}
                strokeDasharray="4,4"
              />
            ))}
          </g>

          <g transform="translate(250, 20)">
            <rect x="0" y="0" width="40" height="50" fill="#1e293b" rx="4" stroke="#475569" />
            <rect x="15" y="5" width="10" height="35" fill="#0f172a" rx="2" />
            <rect
              x="15"
              y={5 + 35 * (1 - (temperature - 10) / 50)}
              width="10"
              height={35 * ((temperature - 10) / 50)}
              fill={temperature > 35 ? colors.error : temperature > 25 ? colors.warning : colors.success}
              rx="2"
            />
            <circle cx="20" cy="45" r="6" fill={temperature > 35 ? colors.error : colors.warning} />
            <text x="20" y="65" fill={colors.textSecondary} fontSize="9" textAnchor="middle">
              {temperature}C
            </text>
          </g>

          <g transform="translate(300, 20)">
            <rect x="0" y="0" width="90" height="70" fill="rgba(0,0,0,0.5)" rx="6" stroke={colors.accent} strokeWidth="1" />
            <text x="45" y="14" fill={colors.textMuted} fontSize="8" textAnchor="middle">OPERATING POINT</text>
            <text x="10" y="30" fill={colors.voltage} fontSize="10">V: {currentValues.voltage.toFixed(3)} V</text>
            <text x="10" y="44" fill={colors.current} fontSize="10">I: {currentValues.current.toFixed(2)} A</text>
            <text x="10" y="58" fill={colors.power} fontSize="10" fontWeight="bold">P: {currentValues.power.toFixed(2)} W</text>
          </g>

          <g transform={`translate(${ivGraphX}, ${ivGraphY})`}>
            <rect x="-5" y="-20" width={graphWidth + 30} height={graphHeight + 40} fill="rgba(0,0,0,0.3)" rx="6" />
            <text x={graphWidth / 2} y="-6" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">
              Current vs Voltage (I-V Curve)
            </text>
            <line x1="0" y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke={colors.textMuted} strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2={graphHeight} stroke={colors.textMuted} strokeWidth="1" />
            <text x={graphWidth / 2} y={graphHeight + 15} fill={colors.textSecondary} fontSize="8" textAnchor="middle">
              Voltage (V)
            </text>
            <text x="-8" y={graphHeight / 2} fill={colors.textSecondary} fontSize="8" textAnchor="middle" transform={`rotate(-90, -8, ${graphHeight / 2})`}>
              Current (A)
            </text>
            {showIVCurve && (
              <path
                d={curveData.map((p, i) =>
                  `${i === 0 ? 'M' : 'L'} ${scaleV(p.voltage)} ${scaleI(p.current)}`
                ).join(' ')}
                fill="none"
                stroke={colors.current}
                strokeWidth="2"
              />
            )}
            <circle
              cx={scaleV(currentValues.voltage)}
              cy={scaleI(currentValues.current)}
              r="5"
              fill={colors.accent}
              stroke="white"
              strokeWidth="2"
            />
            {showMPP && (
              <>
                <circle
                  cx={scaleV(mpp.voltage)}
                  cy={scaleI(mpp.current)}
                  r="4"
                  fill="none"
                  stroke={colors.mpp}
                  strokeWidth="2"
                  strokeDasharray="3,2"
                />
                <text x={scaleV(mpp.voltage) + 8} y={scaleI(mpp.current) - 5} fill={colors.mpp} fontSize="8">
                  MPP
                </text>
              </>
            )}
            <text x="5" y="10" fill={colors.current} fontSize="8">Isc</text>
            <text x={graphWidth - 15} y={graphHeight - 5} fill={colors.voltage} fontSize="8">Voc</text>
          </g>

          <g transform={`translate(${pvGraphX}, ${pvGraphY})`}>
            <rect x="-5" y="-20" width={graphWidth + 30} height={graphHeight + 40} fill="rgba(0,0,0,0.3)" rx="6" />
            <text x={graphWidth / 2} y="-6" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">
              Power vs Voltage (P-V Curve)
            </text>
            <line x1="0" y1={graphHeight} x2={graphWidth} y2={graphHeight} stroke={colors.textMuted} strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2={graphHeight} stroke={colors.textMuted} strokeWidth="1" />
            <text x={graphWidth / 2} y={graphHeight + 15} fill={colors.textSecondary} fontSize="8" textAnchor="middle">
              Voltage (V)
            </text>
            <text x="-8" y={graphHeight / 2} fill={colors.textSecondary} fontSize="8" textAnchor="middle" transform={`rotate(-90, -8, ${graphHeight / 2})`}>
              Power (W)
            </text>
            {showPVCurve && (
              <path
                d={curveData.map((p, i) =>
                  `${i === 0 ? 'M' : 'L'} ${scaleV(p.voltage)} ${scaleP(p.power)}`
                ).join(' ')}
                fill="none"
                stroke={colors.power}
                strokeWidth="2"
              />
            )}
            <circle
              cx={scaleV(currentValues.voltage)}
              cy={scaleP(currentValues.power)}
              r="5"
              fill={colors.accent}
              stroke="white"
              strokeWidth="2"
            />
            {showMPP && (
              <>
                <line
                  x1={scaleV(mpp.voltage)}
                  y1="0"
                  x2={scaleV(mpp.voltage)}
                  y2={graphHeight}
                  stroke={colors.mpp}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <circle
                  cx={scaleV(mpp.voltage)}
                  cy={scaleP(mpp.power)}
                  r="6"
                  fill={colors.mpp}
                  stroke="white"
                  strokeWidth="2"
                />
                <text x={scaleV(mpp.voltage)} y={scaleP(mpp.power) - 10} fill={colors.mpp} fontSize="9" textAnchor="middle" fontWeight="bold">
                  Max Power
                </text>
              </>
            )}
          </g>

          <g transform="translate(30, 310)">
            <rect x="0" y="0" width="340" height="60" fill="rgba(0,0,0,0.4)" rx="8" stroke={colors.mpp} strokeWidth="1" />
            <text x="170" y="16" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">
              Maximum Power Point (MPP) Analysis
            </text>
            <text x="20" y="34" fill={colors.textSecondary} fontSize="9">
              MPP Voltage: {mpp.voltage.toFixed(3)} V | MPP Current: {mpp.current.toFixed(2)} A
            </text>
            <text x="20" y="50" fill={colors.mpp} fontSize="10" fontWeight="bold">
              Maximum Power: {mpp.power.toFixed(2)} W | Current Efficiency: {((currentValues.power / mpp.power) * 100).toFixed(0)}%
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {isAnimating ? 'Stop Sweep' : 'Sweep Load'}
            </button>
            <button
              onClick={() => setLoadResistance(mpp.load)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: colors.mpp,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Jump to MPP
            </button>
            <button
              onClick={() => { setLoadResistance(50); setLightIntensity(100); setTemperature(25); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showTempControl: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Load Resistance (Operating Point): {loadResistance}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={loadResistance}
          onInput={(e) => setLoadResistance(parseInt((e.target as HTMLInputElement).value))}
          onChange={(e) => setLoadResistance(parseInt(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Short Circuit (0%)</span>
          <span>Open Circuit (100%)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Light Intensity: {lightIntensity}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={lightIntensity}
          onInput={(e) => setLightIntensity(parseInt((e.target as HTMLInputElement).value))}
          onChange={(e) => setLightIntensity(parseInt(e.target.value))}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Cloudy (10%)</span>
          <span>Full Sun (100%)</span>
        </div>
      </div>

      {showTempControl && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Panel Temperature: {temperature}C
          </label>
          <input
            type="range"
            min="10"
            max="60"
            step="1"
            value={temperature}
            onInput={(e) => setTemperature(parseInt((e.target as HTMLInputElement).value))}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            style={{ width: '100%', height: '32px', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
            <span>Cool (10C)</span>
            <span>Hot (60C)</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showIVCurve} onChange={(e) => setShowIVCurve(e.target.checked)} />
          I-V Curve
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showPVCurve} onChange={(e) => setShowPVCurve(e.target.checked)} />
          P-V Curve
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: '12px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showMPP} onChange={(e) => setShowMPP(e.target.checked)} />
          MPP Marker
        </label>
      </div>

      <div style={{
        background: 'rgba(168, 85, 247, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.power}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Why the Sweet Spot?
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          At low voltage (short circuit), current is maximum but voltage is zero, so P = V x I = 0.
          At high voltage (open circuit), voltage is maximum but current is zero, so P = 0.
          The Maximum Power Point (MPP) is where the product V x I is largest.
        </div>
      </div>
    </div>
  );

  // --- PHASE CONTENT RENDERING ---
  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
                PV I-V Curve: The Solar Sweet Spot
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
                Why do solar panels have a Maximum Power Point?
              </p>
            </div>
            {renderVisualization(true)}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                  A solar panel can produce different combinations of voltage and current depending on
                  the connected load. But there is one special point where <strong style={{ color: colors.mpp }}>power output is maximum</strong>.
                  This is called the Maximum Power Point (MPP).
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                  Modern solar systems use sophisticated electronics to always operate at this sweet spot!
                </p>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                  Use the Load Resistance slider to move along the I-V curve and watch how power changes!
                </p>
              </div>
            </div>
          </>
        );

      case 'predict':
        return (
          <>
            {renderVisualization(false)}
            <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You are Looking At:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                The I-V curve shows all possible combinations of current (I) and voltage (V) a solar panel
                can produce. The P-V curve shows the power output at each voltage. The yellow dot is your
                current operating point.
              </p>
            </div>
            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                If sunlight intensity doubles, what happens to voltage and current?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {predictions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPrediction(p.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                      background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'play':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the I-V Curve</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Find the Maximum Power Point by adjusting the load
              </p>
            </div>
            {renderVisualization(true)}
            {renderControls()}
            <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Sweep the load from 0% to 100% and watch power rise then fall</li>
                <li>Change light intensity - watch current scale but voltage barely change</li>
                <li>Click "Jump to MPP" to see the optimal operating point</li>
                <li>Note: The P-V curve has a single peak at the MPP</li>
              </ul>
            </div>
          </>
        );

      case 'review':
        const wasCorrectReview = prediction === 'double_i';
        return (
          <>
            <div style={{
              background: wasCorrectReview ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrectReview ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: wasCorrectReview ? colors.success : colors.error, marginBottom: '8px' }}>
                {wasCorrectReview ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                When light intensity doubles, <strong>current roughly doubles</strong> (linear relationship),
                but <strong>voltage only increases slightly</strong> (logarithmic relationship). This is
                fundamental to photovoltaic physics!
              </p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of I-V Curves</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Short-Circuit Current (Isc):</strong> When
                  terminals are connected directly (zero resistance), current is maximum but voltage is zero.
                  More photons = more current, so Isc is proportional to light intensity.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Open-Circuit Voltage (Voc):</strong> When
                  the circuit is open (infinite resistance), voltage reaches maximum but no current flows.
                  Voc increases only logarithmically with intensity because it is set by the semiconductor bandgap.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Maximum Power Point (MPP):</strong> The
                  point where V x I is maximized. Typically around 75-80% of Voc. Modern MPPT controllers
                  continuously track this point as conditions change.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Fill Factor:</strong> The ratio of actual
                  maximum power to the theoretical maximum (Voc x Isc). Higher fill factor means a more
                  rectangular I-V curve and better cell quality (typical: 70-85%).
                </p>
              </div>
            </div>
          </>
        );

      case 'twist_predict':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
              <p style={{ color: colors.textSecondary }}>
                What happens when the solar panel heats up?
              </p>
            </div>
            {renderVisualization(false, true)}
            <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                Solar panels in the real world get hot - often reaching 50-70 degrees C on sunny days, even in
                moderate climates. The panel is now exposed to the same light but at a higher temperature.
                Standard Test Conditions (STC) are defined at 25 degrees C.
              </p>
            </div>
            <div style={{ padding: '0 16px 16px 16px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
                What happens to power output when the panel gets hotter?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {twistPredictions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setTwistPrediction(p.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                      background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'twist_play':
        return (
          <>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Temperature Effects</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Adjust temperature and observe changes in the I-V curve
              </p>
            </div>
            {renderVisualization(true, true)}
            {renderControls(true)}
            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Watch the Voc (open-circuit voltage) as you increase temperature. It drops by about
                0.3-0.5% per degree C! This is why solar panels produce less power on hot summer days
                than you might expect, and why cold but sunny days are ideal.
              </p>
            </div>
          </>
        );

      case 'twist_review':
        const wasCorrectTwist = twistPrediction === 'power_down';
        return (
          <>
            <div style={{
              background: wasCorrectTwist ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrectTwist ? colors.success : colors.error}`,
            }}>
              <h3 style={{ color: wasCorrectTwist ? colors.success : colors.error, marginBottom: '8px' }}>
                {wasCorrectTwist ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Higher temperature <strong>decreases voltage significantly</strong> while only slightly
                increasing current. The net effect is <strong>reduced power output</strong> - typically
                0.3-0.5% loss per degree C above 25 degrees C.
              </p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Temperature Coefficients</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Voltage Coefficient:</strong> Typically
                  -0.3% to -0.5% per degree C. At 60 degrees C (35 degrees above STC), voltage drops by 10-17%!
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Current Coefficient:</strong> Slightly
                  positive (+0.04% to +0.06% per degree C), but not enough to compensate for voltage loss.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Real-World Impact:</strong> Panels rated
                  at 400W at STC might only produce 340W on a hot roof. This is why good ventilation and
                  mounting with airflow behind panels improves performance. Cold, clear winter days often
                  produce peak power!
                </p>
              </div>
            </div>
          </>
        );

      case 'transfer':
        return (
          <>
            <div style={{ padding: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
                Real-World Applications
              </h2>
              <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
                I-V curve knowledge is essential for solar system design
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
                Complete all 4 applications to unlock the test
              </p>
            </div>
            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: colors.bgCard,
                  margin: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                  {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
                </div>
                {!transferCompleted.has(index) ? (
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                  >
                    Reveal Answer
                  </button>
                ) : (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </>
        );

      case 'test':
        if (testSubmitted) {
          return (
            <>
              <div style={{
                background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                margin: '16px',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                  {testScore >= 8 ? 'You understand PV I-V characteristics!' : 'Review the material and try again.'}
                </p>
              </div>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                    <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                        {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          );
        }

        const currentQ = testQuestions[currentTestQuestion];
        return (
          <>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
                <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQ.options.map((opt, oIndex) => (
                  <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
              ) : (
                <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
              )}
            </div>
          </>
        );

      case 'mastery':
        return (
          <>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
              <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered PV I-V curve characteristics</p>
            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>I-V curve shape from short-circuit to open-circuit</li>
                <li>Current scales linearly with light intensity</li>
                <li>Voltage scales logarithmically with intensity</li>
                <li>Maximum Power Point (MPP) optimization</li>
                <li>Temperature effects on voltage and power</li>
                <li>MPPT controller operation principles</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Multi-junction cells stack semiconductors with different bandgaps to capture more of
                the solar spectrum. Bifacial panels capture reflected light from behind. Perovskite
                cells promise higher efficiency at lower cost. The fundamental I-V behavior you learned
                applies to all these advanced technologies!
              </p>
            </div>
            {renderVisualization(true, true)}
          </>
        );

      default:
        return null;
    }
  };

  // Determine bottom bar state
  const getBottomBarConfig = () => {
    switch (phase) {
      case 'hook':
        return { canGoNext: true, label: 'Make a Prediction' };
      case 'predict':
        return { canGoNext: !!prediction, label: 'Test My Prediction' };
      case 'play':
        return { canGoNext: true, label: 'Continue to Review' };
      case 'review':
        return { canGoNext: true, label: 'Next: A Twist!' };
      case 'twist_predict':
        return { canGoNext: !!twistPrediction, label: 'Test My Prediction' };
      case 'twist_play':
        return { canGoNext: true, label: 'See the Explanation' };
      case 'twist_review':
        return { canGoNext: true, label: 'Apply This Knowledge' };
      case 'transfer':
        return { canGoNext: transferCompleted.size >= 4, label: 'Take the Test' };
      case 'test':
        if (testSubmitted) {
          return {
            canGoNext: testScore >= 8,
            label: testScore >= 8 ? 'Complete Mastery' : 'Review & Retry',
            onNext: testScore >= 8 ? goNext : () => {
              setTestSubmitted(false);
              setTestAnswers(new Array(10).fill(null));
              setCurrentTestQuestion(0);
              goToPhase('hook');
            }
          };
        }
        return { canGoNext: false, label: 'Answer All Questions' };
      case 'mastery':
        return {
          canGoNext: true,
          label: 'Complete Game',
          onNext: () => {
            playSound('complete');
            emitGameEvent('game_completed', { score: testScore, maxScore: 10, message: 'Game completed!' });
          }
        };
      default:
        return { canGoNext: true, label: 'Continue' };
    }
  };

  const bottomBarConfig = getBottomBarConfig();

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary, color: colors.textPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar(bottomBarConfig.canGoNext, bottomBarConfig.label, bottomBarConfig.onNext)}
    </div>
  );
};

export default PVIVCurveRenderer;
