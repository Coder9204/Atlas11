import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
   {
      icon: '🔋',
      title: 'MPPT Charge Controllers',
      short: 'Maximizing solar harvest',
      tagline: 'Every photon counts',
      description: 'Maximum Power Point Tracking (MPPT) controllers continuously adjust load resistance to keep solar panels operating at their I-V curve sweet spot, capturing 15-30% more energy than basic controllers.',
      connection: 'The I-V curve shows power peaks at a specific voltage-current combination. MPPT algorithms find and track this maximum power point as conditions change.',
      howItWorks: 'DC-DC converters dynamically adjust their input impedance, sweeping the I-V curve to find maximum power. Perturb-and-observe or incremental conductance algorithms track the MPP.',
      stats: [
         { value: '30%', label: 'More energy captured', icon: '⚡' },
         { value: '<1s', label: 'Tracking speed', icon: '⏱️' },
         { value: '99%', label: 'Tracking efficiency', icon: '🎯' }
      ],
      examples: ['Off-grid solar systems', 'RV solar installations', 'Solar water pumping', 'Portable power stations'],
      companies: ['Victron', 'Morningstar', 'Outback', 'Midnite Solar'],
      futureImpact: 'AI-enhanced MPPT will predict optimal settings before clouds arrive.',
      color: '#F59E0B'
   },
   {
      icon: '🏠',
      title: 'Residential Solar Inverters',
      short: 'Powering homes from rooftops',
      tagline: 'Sunshine to savings',
      description: 'Grid-tied inverters convert DC from rooftop panels to AC for home use. Built-in MPPT ensures panels operate at peak efficiency regardless of temperature, shading, or panel aging.',
      connection: 'The I-V curve shifts with temperature and irradiance. Inverters must continuously track these changes to maximize energy production throughout the day.',
      howItWorks: 'String inverters manage series-connected panels with single or dual MPPT inputs. Microinverters provide per-panel optimization for complex roof configurations.',
      stats: [
         { value: '10kW', label: 'Typical home system', icon: '🏠' },
         { value: '25 yrs', label: 'Panel lifespan', icon: '⏳' },
         { value: '$100B', label: 'Global market', icon: '💰' }
      ],
      examples: ['Tesla Solar', 'SunPower systems', 'Enphase microinverters', 'SolarEdge optimizers'],
      companies: ['Enphase', 'SolarEdge', 'SMA', 'Fronius'],
      futureImpact: 'Vehicle-to-home integration will use bidirectional I-V management.',
      color: '#22C55E'
   },
   {
      icon: '🛰️',
      title: 'Space Solar Arrays',
      short: 'Powering satellites and spacecraft',
      tagline: 'No atmosphere, maximum power',
      description: 'Satellites use multi-junction gallium arsenide cells with different I-V characteristics than silicon. In space, extreme temperature swings require sophisticated MPPT and thermal management.',
      connection: 'Space cells operate at very different I-V curves - cold shadow periods increase voltage significantly, while direct sun raises temperature and shifts curves.',
      howItWorks: 'Sequential power trackers manage solar array wings, adjusting for orbital position, sun angle, and eclipse transitions. Radiation-hardened electronics maintain tracking.',
      stats: [
         { value: '30%', label: 'Cell efficiency', icon: '🔬' },
         { value: '-150°C', label: 'Shadow temp', icon: '❄️' },
         { value: '15+ yrs', label: 'Mission life', icon: '🛰️' }
      ],
      examples: ['ISS solar arrays', 'Mars rovers', 'Starlink satellites', 'James Webb telescope'],
      companies: ['NASA', 'SpaceX', 'Boeing', 'Airbus'],
      futureImpact: 'Space-based solar power stations may beam energy to Earth.',
      color: '#8B5CF6'
   },
   {
      icon: '🚗',
      title: 'Electric Vehicle Solar',
      short: 'Driving on sunshine',
      tagline: 'Free miles from the sun',
      description: 'Solar-integrated EVs face unique I-V challenges: curved surfaces receive varying irradiance, rapid shading changes during driving, and vibration affects connections.',
      connection: 'Vehicle-integrated panels require extremely fast MPPT to handle shadows from trees and buildings changing in milliseconds as the car moves.',
      howItWorks: 'Multiple MPPT zones handle different panel orientations. Algorithms predict shading transitions and pre-adjust for smooth power delivery to the vehicle battery.',
      stats: [
         { value: '30 mi', label: 'Daily solar range', icon: '🚗' },
         { value: '200W', label: 'Roof panel power', icon: '☀️' },
         { value: '$2K', label: 'Fuel savings/year', icon: '💰' }
      ],
      examples: ['Lightyear 0', 'Sono Sion', 'Hyundai Ioniq 5', 'Toyota Prius Prime'],
      companies: ['Lightyear', 'Sono Motors', 'Hyundai', 'Toyota'],
      futureImpact: 'High-efficiency cells will extend vehicle-integrated solar to trucks and buses.',
      color: '#EC4899'
   }
];

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
  const [loadResistance, setLoadResistance] = useState(20);
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
      description: 'MPPT controllers capture 15-30% more energy than PWM controllers by continuously tracking the Maximum Power Point. Typical systems save $500/year in energy costs.',
      question: 'Why do MPPT controllers outperform simple PWM controllers?',
      answer: 'PWM controllers connect panels directly to batteries, forcing operation at battery voltage. MPPT controllers use DC-DC conversion to operate panels at their MPP regardless of battery voltage, capturing 15-30% more energy especially in cold weather or partial shade.',
    },
    {
      title: 'Solar Farm Inverters',
      description: 'Grid-tied inverters convert DC from up to 10,000W of solar panels to AC for the power grid. Modern 1kW microinverters have 97% efficiency.',
      question: 'Why do modern solar farms use microinverters or power optimizers on each panel?',
      answer: 'When panels are connected in series, shade on one panel drags down the entire string. Per-panel MPPT allows each panel to operate at its own optimal point, preventing a 10% shaded panel from causing 50%+ system losses.',
    },
    {
      title: 'Space Solar Arrays',
      description: 'Space solar cells achieve 30% efficiency using multi-junction technology, operating over a temperature range from -150C to +100C between shadow and full sun.',
      question: 'Why do space solar cells perform better than terrestrial panels despite extreme temperatures?',
      answer: 'In the cold of space (-150C in shadow), solar cell voltage increases significantly. Combined with no atmosphere absorbing light, space panels can achieve 30%+ efficiency. The challenge is managing thermal cycling between sun and shadow.',
    },
    {
      title: 'Electric Vehicle Solar Roofs',
      description: 'Vehicle solar roofs add 10-30 km of daily range using 200W roof panels. Advanced MPPT algorithms respond in under 100ms to handle rapid shading changes.',
      question: 'What unique challenges do vehicle-integrated solar panels face?',
      answer: 'Rapid shading changes from trees/buildings require very fast MPPT algorithms. Curved surfaces mean different panel sections receive different intensities. Vibration affects connections. Despite challenges, solar roofs can add 10-30 miles of range per day.',
    },
  ];

  const testQuestions = [
    {
      question: 'A solar engineer is designing an MPPT charge controller for an off-grid cabin. The I-V curve shows the panel can operate across a range of voltage and current combinations. The engineer needs to identify which operating condition extracts the most power from the panel. At the Maximum Power Point (MPP), which statement is true?',
      options: [
        { text: 'Voltage is at its maximum value (Voc)', correct: false },
        { text: 'Current is at its maximum value (Isc)', correct: false },
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
              transition: 'all 0.2s ease-in-out',
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
          ← Back
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
    const width = 440;
    const height = 420;
    const graphWidth = 160;
    const graphHeight = 120;
    const ivGraphX = 30;
    const ivGraphY = 180;
    const pvGraphX = 240;
    const pvGraphY = 180;
    const maxVoltage = 0.7;
    const maxCurrent = 9;
    const maxPower = 2.5;

    const scaleV = (v: number) => (v / maxVoltage) * graphWidth;
    const scaleI = (i: number) => graphHeight - (i / maxCurrent) * graphHeight;
    const scaleP = (p: number) => graphHeight - (p / maxPower) * graphHeight;

    // Power rectangle dimensions for MPP visualization
    const mppRectWidth = scaleV(mpp.voltage);
    const mppRectHeight = graphHeight - scaleI(mpp.current);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #030712 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            {/* === PREMIUM GRADIENTS FOR SOLAR VISUALIZATION === */}

            {/* Sun radial gradient with realistic corona effect */}
            <radialGradient id="pvivSunCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7ed" stopOpacity="1" />
              <stop offset="30%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="85%" stopColor="#d97706" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Sun outer glow */}
            <radialGradient id="pvivSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            {/* Premium solar panel gradient with depth */}
            <linearGradient id="pvivPanelMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="25%" stopColor="#1d4ed8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Solar cell reflection effect */}
            <linearGradient id="pvivCellReflect" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="20%" stopColor="#3b82f6" stopOpacity="0.1" />
              <stop offset="80%" stopColor="#1e3a8a" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0" />
            </linearGradient>

            {/* Panel frame brushed metal */}
            <linearGradient id="pvivPanelFrame" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#94a3b8" />
              <stop offset="80%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* I-V Curve gradient fill */}
            <linearGradient id="pvivIVCurveFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#16a34a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.05" />
            </linearGradient>

            {/* I-V Curve stroke gradient */}
            <linearGradient id="pvivIVCurveStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* P-V Curve gradient fill */}
            <linearGradient id="pvivPVCurveFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#9333ea" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
            </linearGradient>

            {/* P-V Curve stroke gradient */}
            <linearGradient id="pvivPVCurveStroke" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="40%" stopColor="#a855f7" />
              <stop offset="70%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#d8b4fe" />
            </linearGradient>

            {/* MPP marker radial glow */}
            <radialGradient id="pvivMPPGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="1" />
              <stop offset="40%" stopColor="#db2777" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#be185d" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#9d174d" stopOpacity="0" />
            </radialGradient>

            {/* Power rectangle gradient */}
            <linearGradient id="pvivPowerRect" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.1" />
            </linearGradient>

            {/* Operating point accent glow */}
            <radialGradient id="pvivOperatingGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Thermometer gradient (cool to hot) */}
            <linearGradient id="pvivThermoFill" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="30%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Graph background gradient */}
            <linearGradient id="pvivGraphBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#1e293b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
            </linearGradient>

            {/* Display panel gradient */}
            <linearGradient id="pvivDisplayBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Analysis panel gradient */}
            <linearGradient id="pvivAnalysisBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#312e81" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.6" />
            </linearGradient>

            {/* === PREMIUM GLOW FILTERS === */}

            {/* Sun glow filter */}
            <filter id="pvivSunBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Operating point glow filter */}
            <filter id="pvivPointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* MPP marker glow filter */}
            <filter id="pvivMPPBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Curve glow filter */}
            <filter id="pvivCurveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Display text glow */}
            <filter id="pvivTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Panel reflection filter */}
            <filter id="pvivPanelShine">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="pvivGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background with grid */}
          <rect width={width} height={height} fill="url(#pvivGridPattern)" />

          {/* === SUN WITH PREMIUM GLOW === */}
          <g transform="translate(55, 45)">
            {/* Outer corona glow */}
            <circle cx="0" cy="0" r="45" fill="url(#pvivSunGlow)" opacity="0.7" />
            {/* Inner sun core */}
            <circle cx="0" cy="0" r="22" fill="url(#pvivSunCore)" />
            {/* Sun rays animation effect */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={`ray${i}`}
                x1={Math.cos(angle * Math.PI / 180) * 26}
                y1={Math.sin(angle * Math.PI / 180) * 26}
                x2={Math.cos(angle * Math.PI / 180) * 38}
                y2={Math.sin(angle * Math.PI / 180) * 38}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                opacity={0.4 + (lightIntensity / 100) * 0.6}
              >
                <animate attributeName="opacity" values={`${0.3 + (lightIntensity / 100) * 0.3};${0.6 + (lightIntensity / 100) * 0.4};${0.3 + (lightIntensity / 100) * 0.3}`} dur="2s" repeatCount="indefinite" begin={`${i * 0.25}s`} />
              </line>
            ))}
          </g>
          {/* Sun label - absolute coords to avoid overlap */}
          <text x="55" y="115" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
            {lightIntensity}% Intensity
          </text>

          {/* === PREMIUM SOLAR PANEL === */}
          <g transform="translate(130, 18)">
            {/* Panel frame with brushed metal effect */}
            <rect x="-4" y="-4" width="98" height="68" rx="4" fill="url(#pvivPanelFrame)" />
            {/* Main panel body */}
            <rect x="0" y="0" width="90" height="60" fill="url(#pvivPanelMain)" rx="2" />
            {/* Reflection overlay */}
            <rect x="0" y="0" width="90" height="60" fill="url(#pvivCellReflect)" rx="2" />

            {/* Solar cell grid lines */}
            {[1, 2, 3, 4].map(i => (
              <line key={`hline${i}`} x1="2" y1={i * 12} x2="88" y2={i * 12} stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.6" />
            ))}
            {[1, 2, 3, 4, 5].map(i => (
              <line key={`vline${i}`} x1={i * 15} y1="2" x2={i * 15} y2="58" stroke="#1e3a8a" strokeWidth="1" strokeOpacity="0.6" />
            ))}

            {/* Sunlight rays hitting panel */}
            {[0, 1, 2, 3].map(i => (
              <line
                key={`sunray${i}`}
                x1={-50 + i * 25}
                y1={-25 + i * 3}
                x2={15 + i * 22}
                y2={12 + i * 8}
                stroke="url(#pvivSunCore)"
                strokeWidth="3"
                opacity={0.2 + (lightIntensity / 100) * 0.5}
                strokeLinecap="round"
              >
                <animate attributeName="opacity" values={`${0.15 + (lightIntensity / 100) * 0.3};${0.3 + (lightIntensity / 100) * 0.5};${0.15 + (lightIntensity / 100) * 0.3}`} dur="1.5s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
              </line>
            ))}

          </g>
          {/* Panel label - absolute coords to avoid overlap test issues */}
          <text x="175" y="93" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
            PV Module
          </text>

          {/* === THERMOMETER === */}
          <g transform="translate(260, 18)">
            {/* Thermometer housing */}
            <rect x="0" y="0" width="36" height="60" fill="#1e293b" rx="6" stroke="#475569" strokeWidth="1" />
            {/* Inner tube */}
            <rect x="13" y="6" width="10" height="40" fill="#0f172a" rx="3" />
            {/* Temperature fill */}
            <rect
              x="13"
              y={6 + 40 * (1 - (temperature - 10) / 50)}
              width="10"
              height={40 * ((temperature - 10) / 50)}
              fill="url(#pvivThermoFill)"
              rx="3"
            />
            {/* Bulb at bottom */}
            <circle cx="18" cy="52" r="8" fill={temperature > 35 ? '#ef4444' : temperature > 25 ? '#f59e0b' : '#22c55e'}>
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* Scale marks */}
            {[0, 1, 2, 3, 4].map(i => (
              <line key={`mark${i}`} x1="25" y1={10 + i * 10} x2="30" y2={10 + i * 10} stroke="#64748b" strokeWidth="1" />
            ))}
          </g>
          {/* Temperature reading - absolute coords (different y from PV Module label) */}
          <text x="278" y="100" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
            {temperature}°C
          </text>

          {/* === OPERATING POINT DISPLAY === */}
          <g transform="translate(310, 15)">
            <rect x="0" y="0" width="120" height="85" fill="url(#pvivDisplayBg)" rx="8" stroke={colors.accent} strokeWidth="1.5" />
            {/* Display header */}
            <rect x="0" y="0" width="120" height="18" fill="rgba(245, 158, 11, 0.15)" rx="8" />
            <rect x="0" y="10" width="120" height="8" fill="rgba(245, 158, 11, 0.15)" />
            <text x="60" y="13" fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="700" letterSpacing="0.5">OPERATING POINT</text>

            {/* Values with glow effect */}
            <g filter="url(#pvivTextGlow)">
              <text x="12" y="36" fill={colors.voltage} fontSize="11" fontWeight="600">V:</text>
              <text x="28" y="36" fill={colors.voltage} fontSize="11" fontFamily="monospace">{currentValues.voltage.toFixed(3)} V</text>
            </g>
            <g filter="url(#pvivTextGlow)">
              <text x="12" y="52" fill={colors.current} fontSize="11" fontWeight="600">I:</text>
              <text x="28" y="52" fill={colors.current} fontSize="11" fontFamily="monospace">{currentValues.current.toFixed(2)} A</text>
            </g>
            <g filter="url(#pvivTextGlow)">
              <text x="12" y="68" fill={colors.power} fontSize="12" fontWeight="700">P:</text>
              <text x="28" y="68" fill={colors.power} fontSize="12" fontFamily="monospace" fontWeight="700">{currentValues.power.toFixed(2)} W</text>
            </g>

            {/* Efficiency bar */}
            <rect x="12" y="74" width="96" height="4" fill="#1e293b" rx="2" />
            <rect x="12" y="74" width={96 * Math.min(1, currentValues.power / mpp.power)} height="4" fill={colors.mpp} rx="2">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* === I-V CURVE GRAPH === */}
          {/* Graph background */}
          <rect x={ivGraphX - 8} y={ivGraphY - 24} width={graphWidth + 35} height={graphHeight + 48} fill="url(#pvivGraphBg)" rx="8" stroke="#334155" strokeWidth="0.5" />

          {/* Graph title */}
          <text x={ivGraphX + graphWidth / 2} y={ivGraphY - 14} fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="700">
            I-V Characteristic Curve
          </text>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(frac => (
            <g key={`ivgrid${frac}`}>
              <line x1={ivGraphX + frac * graphWidth} y1={ivGraphY} x2={ivGraphX + frac * graphWidth} y2={ivGraphY + graphHeight} stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
              <line x1={ivGraphX} y1={ivGraphY + frac * graphHeight} x2={ivGraphX + graphWidth} y2={ivGraphY + frac * graphHeight} stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
            </g>
          ))}

          {/* Axes */}
          <line x1={ivGraphX} y1={ivGraphY + graphHeight} x2={ivGraphX + graphWidth + 5} y2={ivGraphY + graphHeight} stroke={colors.textMuted} strokeWidth="1.5" />
          <line x1={ivGraphX} y1={ivGraphY - 2} x2={ivGraphX} y2={ivGraphY + graphHeight} stroke={colors.textMuted} strokeWidth="1.5" />

          {/* Axis labels */}
          <text x={ivGraphX + graphWidth / 2} y={ivGraphY + graphHeight + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
            Voltage (V)
          </text>
          <text x={ivGraphX - 20} y={ivGraphY + graphHeight / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600" transform={`rotate(-90, ${ivGraphX - 20}, ${ivGraphY + graphHeight / 2})`}>
            I (A)
          </text>

          {/* I-V Curve with fill and stroke */}
          {showIVCurve && (
            <>
              {/* Area fill under curve */}
              <path d={curveData.map((p, i) =>
                `${i === 0 ? 'M' : 'L'} ${ivGraphX + scaleV(p.voltage)} ${ivGraphY + scaleI(p.current)}`
              ).join(' ') + ` L ${ivGraphX + scaleV(curveData[curveData.length - 1].voltage)} ${ivGraphY + graphHeight} L ${ivGraphX} ${ivGraphY + graphHeight} Z`} fill="url(#pvivIVCurveFill)" />
              {/* Curve line with glow */}
              <path
                d={curveData.map((p, i) =>
                  `${i === 0 ? 'M' : 'L'} ${ivGraphX + scaleV(p.voltage)} ${ivGraphY + scaleI(p.current)}`
                ).join(' ')}
                fill="none"
                stroke="url(#pvivIVCurveStroke)"
                strokeWidth="2.5"
                filter="url(#pvivCurveGlow)"
              />
            </>
          )}

          {/* Power rectangle visualization (V x I area) */}
          {showMPP && (
            <rect
              x={ivGraphX}
              y={ivGraphY + scaleI(mpp.current)}
              width={mppRectWidth}
              height={mppRectHeight}
              fill="url(#pvivPowerRect)"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4,2"
              strokeOpacity="0.6"
            />
          )}

          {/* MPP marker on I-V curve */}
          {showMPP && (
            <>
              <circle cx={ivGraphX + scaleV(mpp.voltage)} cy={ivGraphY + scaleI(mpp.current)} r="10" fill="url(#pvivMPPGlow)" opacity="0.5" />
              <circle cx={ivGraphX + scaleV(mpp.voltage)} cy={ivGraphY + scaleI(mpp.current)} r="5" fill="none" stroke={colors.mpp} strokeWidth="2" strokeDasharray="4,2">
                <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x={ivGraphX + scaleV(mpp.voltage) + 12} y={ivGraphY + scaleI(mpp.current) - 8} fill={colors.mpp} fontSize="11" fontWeight="700">MPP</text>
            </>
          )}

          {/* Operating point with glow - I-V graph */}
          <circle cx={ivGraphX + scaleV(currentValues.voltage)} cy={ivGraphY + scaleI(currentValues.current)} r="8" fill="url(#pvivOperatingGlow)" opacity="0.6" filter="url(#pvivPointGlow)" />
          <circle cx={ivGraphX + scaleV(currentValues.voltage)} cy={ivGraphY + scaleI(currentValues.current)} r="5" fill={colors.accent} stroke="white" strokeWidth="2" />

          {/* Isc and Voc labels */}
          <text x={ivGraphX + 8} y={ivGraphY + 14} fill={colors.current} fontSize="11" fontWeight="700">Isc</text>
          <text x={ivGraphX + graphWidth - 20} y={ivGraphY + graphHeight - 6} fill={colors.voltage} fontSize="11" fontWeight="700">Voc</text>

          {/* === P-V CURVE GRAPH === */}
          {/* Graph background */}
          <rect x={pvGraphX - 8} y={pvGraphY - 24} width={graphWidth + 35} height={graphHeight + 48} fill="url(#pvivGraphBg)" rx="8" stroke="#334155" strokeWidth="0.5" />

          {/* Graph title */}
          <text x={pvGraphX + graphWidth / 2} y={pvGraphY - 14} fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="700">
            P-V Power Curve
          </text>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(frac => (
            <g key={`pvgrid${frac}`}>
              <line x1={pvGraphX + frac * graphWidth} y1={pvGraphY} x2={pvGraphX + frac * graphWidth} y2={pvGraphY + graphHeight} stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
              <line x1={pvGraphX} y1={pvGraphY + frac * graphHeight} x2={pvGraphX + graphWidth} y2={pvGraphY + frac * graphHeight} stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
            </g>
          ))}

          {/* Axes */}
          <line x1={pvGraphX} y1={pvGraphY + graphHeight} x2={pvGraphX + graphWidth + 5} y2={pvGraphY + graphHeight} stroke={colors.textMuted} strokeWidth="1.5" />
          <line x1={pvGraphX} y1={pvGraphY - 2} x2={pvGraphX} y2={pvGraphY + graphHeight} stroke={colors.textMuted} strokeWidth="1.5" />

          {/* Axis labels */}
          <text x={pvGraphX + graphWidth / 2} y={pvGraphY + graphHeight + 18} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
            Voltage (V)
          </text>
          <text x={pvGraphX - 20} y={pvGraphY + graphHeight / 2} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600" transform={`rotate(-90, ${pvGraphX - 20}, ${pvGraphY + graphHeight / 2})`}>
            P (W)
          </text>

          {/* P-V Curve with fill and stroke */}
          {showPVCurve && (
            <>
              {/* Area fill under curve */}
              <path d={curveData.map((p, i) =>
                `${i === 0 ? 'M' : 'L'} ${pvGraphX + scaleV(p.voltage)} ${pvGraphY + scaleP(p.power)}`
              ).join(' ') + ` L ${pvGraphX + scaleV(curveData[curveData.length - 1].voltage)} ${pvGraphY + graphHeight} L ${pvGraphX} ${pvGraphY + graphHeight} Z`} fill="url(#pvivPVCurveFill)" />
              {/* Curve line with glow */}
              <path
                d={curveData.map((p, i) =>
                  `${i === 0 ? 'M' : 'L'} ${pvGraphX + scaleV(p.voltage)} ${pvGraphY + scaleP(p.power)}`
                ).join(' ')}
                fill="none"
                stroke="url(#pvivPVCurveStroke)"
                strokeWidth="2.5"
                filter="url(#pvivCurveGlow)"
              />
            </>
          )}

          {/* MPP vertical line and marker */}
          {showMPP && (
            <>
              <line
                x1={pvGraphX + scaleV(mpp.voltage)}
                y1={pvGraphY}
                x2={pvGraphX + scaleV(mpp.voltage)}
                y2={pvGraphY + graphHeight}
                stroke={colors.mpp}
                strokeWidth="1.5"
                strokeDasharray="6,3"
                strokeOpacity="0.6"
              />
              <circle cx={pvGraphX + scaleV(mpp.voltage)} cy={pvGraphY + scaleP(mpp.power)} r="12" fill="url(#pvivMPPGlow)" opacity="0.4" />
              <circle cx={pvGraphX + scaleV(mpp.voltage)} cy={pvGraphY + scaleP(mpp.power)} r="7" fill={colors.mpp} stroke="white" strokeWidth="2">
                <animate attributeName="r" values="7;9;7" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x={pvGraphX + scaleV(mpp.voltage) - 50} y={pvGraphY + scaleP(mpp.power) + 20} fill={colors.mpp} fontSize="11" textAnchor="middle" fontWeight="700">
                Max Power
              </text>
              <text x={pvGraphX + scaleV(mpp.voltage) - 50} y={pvGraphY + scaleP(mpp.power) + 34} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">
                {mpp.power.toFixed(2)}W
              </text>
            </>
          )}

          {/* Operating point with glow - P-V graph */}
          <circle cx={pvGraphX + scaleV(currentValues.voltage)} cy={pvGraphY + scaleP(currentValues.power)} r="8" fill="url(#pvivOperatingGlow)" opacity="0.6" filter="url(#pvivPointGlow)" />
          <circle cx={pvGraphX + scaleV(currentValues.voltage)} cy={pvGraphY + scaleP(currentValues.power)} r="5" fill={colors.accent} stroke="white" strokeWidth="2" />

          {/* === MPP ANALYSIS PANEL === */}
          <rect x="25" y="325" width={width - 50} height="85" fill="url(#pvivAnalysisBg)" rx="10" stroke={colors.mpp} strokeWidth="1.5" />

          {/* Header */}
          <rect x="25" y="325" width={width - 50} height="22" fill="rgba(236, 72, 153, 0.15)" rx="10" />
          <rect x="25" y="337" width={width - 50} height="10" fill="rgba(236, 72, 153, 0.15)" />
          <text x={25 + (width - 50) / 2} y="340" fill={colors.textPrimary} fontSize="11" textAnchor="middle" fontWeight="700" letterSpacing="0.5">
            Maximum Power Point (MPP) Analysis
          </text>

          {/* MPP Values - Left column */}
          <circle cx="40" cy="363" r="4" fill={colors.mpp} />
          <text x="50" y="367" fill={colors.textSecondary} fontSize="11">
            MPP Voltage: <tspan fill={colors.voltage} fontWeight="700" fontFamily="monospace">{mpp.voltage.toFixed(3)} V</tspan>
          </text>
          <circle cx="40" cy="381" r="4" fill={colors.mpp} />
          <text x="50" y="385" fill={colors.textSecondary} fontSize="11">
            MPP Current: <tspan fill={colors.current} fontWeight="700" fontFamily="monospace">{mpp.current.toFixed(2)} A</tspan>
          </text>

          {/* MPP Values - Right column */}
          <circle cx="225" cy="363" r="4" fill={colors.power} />
          <text x="235" y="367" fill={colors.textSecondary} fontSize="11">
            Max Power: <tspan fill={colors.mpp} fontWeight="700" fontFamily="monospace">{mpp.power.toFixed(2)} W</tspan>
          </text>
          <circle cx="225" cy="381" r="4" fill={colors.accent} />
          <text x="235" y="385" fill={colors.textSecondary} fontSize="11">
            Efficiency: <tspan fill={colors.accent} fontWeight="700" fontFamily="monospace">{((currentValues.power / mpp.power) * 100).toFixed(1)}%</tspan>
          </text>

          {/* Efficiency progress bar */}
          <rect x="40" y="393" width={width - 80} height="8" fill="#1e293b" rx="4" />
          <rect
            x="40"
            y="393"
            width={(width - 80) * Math.min(1, currentValues.power / mpp.power)}
            height="8"
            fill="url(#pvivMPPGlow)"
            rx="4"
          >
            <animate attributeName="opacity" values="0.8;1;0.8" dur="1.2s" repeatCount="indefinite" />
          </rect>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: isAnimating
                  ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                  : '0 4px 15px rgba(34, 197, 94, 0.4)',
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
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)',
              }}
            >
              Jump to MPP
            </button>
            <button
              onClick={() => { setLoadResistance(50); setLightIntensity(100); setTemperature(25); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
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
          style={{ width: '100%', height: '32px', cursor: 'pointer', accentColor: colors.voltage, touchAction: 'none', appearance: 'auto' }}
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
          style={{ width: '100%', height: '32px', cursor: 'pointer', accentColor: colors.solar, touchAction: 'none', appearance: 'auto' }}
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
            style={{ width: '100%', height: '32px', cursor: 'pointer', accentColor: colors.error, touchAction: 'none', appearance: 'auto' }}
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
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 800 }}>
                PV I-V Curve: The Solar Sweet Spot
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
                Why do solar panels have a Maximum Power Point?
              </p>
            </div>
            {renderVisualization(true)}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                  A solar panel can produce different combinations of voltage and current depending on
                  the connected load. But there is one special point where <strong style={{ color: colors.mpp }}>power output is maximum</strong>.
                  This is called the Maximum Power Point (MPP).
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
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
            {/* Side-by-side layout: SVG left, controls right */}

            <div style={{

              display: 'flex',

              flexDirection: isMobile ? 'column' : 'row',

              gap: isMobile ? '12px' : '20px',

              width: '100%',

              alignItems: isMobile ? 'center' : 'flex-start',

            }}>

              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>

                {renderVisualization(true)}

              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

                {renderControls()}

              </div>

            </div>
            <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>What This Visualization Shows:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '10px', fontWeight: 400 }}>
                This visualization displays the I-V characteristic curve — how current and voltage relate for a solar panel. The P-V curve illustrates power output at each operating point. The Maximum Power Point (MPP) represents the peak of the power curve.
              </p>
              <h4 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>Cause & Effect:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '10px', fontWeight: 400 }}>
                When you increase load resistance (move slider right), voltage increases but current decreases — you move along the I-V curve toward Voc. When you decrease load resistance (move slider left), more current flows but voltage drops toward Isc. As you change light intensity, the short-circuit current scales proportionally while voltage changes very little.
              </p>
              <h4 style={{ color: colors.success, marginBottom: '8px', fontWeight: 600 }}>Why This Matters in Real-World Engineering:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, fontWeight: 400 }}>
                This is why MPPT (Maximum Power Point Tracking) technology is so important in solar energy systems. Engineers design inverters and charge controllers that continuously track the MPP, enabling up to 30% more energy extraction. Modern solar industry relies on I-V curve analysis to design optimal systems, troubleshoot degraded panels, and predict energy yield.
              </p>
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
                As you observed when experimenting with the sliders: when light intensity doubles, <strong>current roughly doubles</strong> (linear relationship),
                but <strong>voltage only increases slightly</strong> (logarithmic relationship). You predicted the outcome — now you saw it in action! This is
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
                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: `linear-gradient(135deg, ${colors.accent}, ${colors.warning})`, color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 700, width: '100%' }}
                  >
                    Got It →
                  </button>
                ) : (
                  <>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                      <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                    </div>
                    <span style={{ color: colors.success, fontSize: '13px', fontWeight: 600 }}>✓ Got It</span>
                  </>
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
                <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
                <span style={{ color: colors.accent, fontWeight: 700, fontSize: '16px', background: `${colors.accent}22`, padding: '4px 10px', borderRadius: '8px' }}>
                  Question {currentTestQuestion + 1} of {testQuestions.length}
                </span>
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
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
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
        return { canGoNext: true, label: 'Explore →' };
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
