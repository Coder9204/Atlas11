import React, { useState, useCallback, useEffect, useRef } from 'react';

// Phase type for internal state management
type SolarPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface SolarYieldPredictionRendererProps {
  gamePhase?: SolarPhase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Sound utility for feedback
const playSound = (type: 'click' | 'success' | 'transition') => {
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
      transition: { freq: 500, duration: 0.15, type: 'sine' },
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

const SolarYieldPredictionRenderer: React.FC<SolarYieldPredictionRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase order and labels for navigation
  const phaseOrder: SolarPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<SolarPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Uncertainty',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  // Internal phase state management
  const getInitialPhase = (): SolarPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<SolarPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation refs for debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state - Solar yield model parameters
  const [irradiance, setIrradiance] = useState(5.5); // kWh/m²/day (peak sun hours)
  const [tiltAngle, setTiltAngle] = useState(30); // degrees
  const [temperature, setTemperature] = useState(25); // Celsius
  const [soilingLoss, setSoilingLoss] = useState(3); // percent
  const [inverterEfficiency, setInverterEfficiency] = useState(96); // percent
  const [systemSize, setSystemSize] = useState(10); // kW
  const [showUncertainty, setShowUncertainty] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Responsive design
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Colors
  const colors = {
    primary: '#f59e0b', // amber-500
    primaryDark: '#d97706',
    success: '#22c55e',
    danger: '#ef4444',
    bgDark: '#0f172a',
    bgCard: '#1e293b',
    border: '#475569',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
  };

  // Navigation function
  const goToPhase = useCallback((p: SolarPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    playSound('transition');

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Physics calculations
  const calculateYield = useCallback(() => {
    const optimalTilt = 35;
    const angleRad = ((tiltAngle - optimalTilt) * Math.PI) / 180;
    const cosineFactor = Math.cos(angleRad * 0.5);

    const tempCoeff = -0.004;
    const tempDerate = 1 + tempCoeff * (temperature - 25);

    const soilingFactor = 1 - soilingLoss / 100;
    const inverterFactor = inverterEfficiency / 100;
    const systemLosses = 0.86;

    const dailyYield = irradiance * systemSize * cosineFactor * tempDerate * soilingFactor * inverterFactor * systemLosses;
    const annualYield = dailyYield * 365;

    const irradianceUncertainty = 0.08;
    const degradationUncertainty = 0.005;
    const modelUncertainty = 0.05;

    const totalUncertainty = Math.sqrt(
      irradianceUncertainty ** 2 + degradationUncertainty ** 2 + modelUncertainty ** 2
    );

    const irradianceSensitivity = ((irradiance * 1.1 - irradiance) / irradiance) * 100;
    const tempSensitivity = Math.abs(tempCoeff * 10 * 100);
    const soilingSensitivity = 5;
    const inverterSensitivity = 2;

    return {
      dailyYield: Math.max(0, dailyYield),
      annualYield: Math.max(0, annualYield),
      cosineFactor,
      tempDerate,
      soilingFactor,
      inverterFactor,
      uncertainty: totalUncertainty,
      lowEstimate: annualYield * (1 - totalUncertainty),
      highEstimate: annualYield * (1 + totalUncertainty),
      sensitivities: {
        irradiance: irradianceSensitivity,
        temperature: tempSensitivity,
        soiling: soilingSensitivity,
        inverter: inverterSensitivity,
      },
    };
  }, [irradiance, tiltAngle, temperature, soilingLoss, inverterEfficiency, systemSize]);

  const predictions = [
    { id: 'complex', label: 'You need complex simulation software - too many variables interact' },
    { id: 'simple', label: 'A few key parameters (irradiance, temperature, losses) capture most of the physics' },
    { id: 'impossible', label: 'Weather is unpredictable, so yield prediction is mostly guesswork' },
    { id: 'machine_learning', label: 'Only machine learning can model all the nonlinear effects' },
  ];

  const twistPredictions = [
    { id: 'irradiance_dominates', label: 'Irradiance uncertainty dominates - weather varies year to year' },
    { id: 'all_equal', label: 'All factors contribute equally to uncertainty' },
    { id: 'model_dominates', label: 'Model error is the biggest uncertainty' },
    { id: 'temperature_dominates', label: 'Temperature variations matter most' },
  ];

  const transferApplications = [
    {
      title: 'Utility-Scale Solar Farms',
      description: 'Large solar installations use yield predictions to secure financing and plan grid integration.',
      question: 'Why do banks require P90 yield estimates (90% confidence) for solar project financing?',
      answer: 'Banks need conservative estimates to ensure loan repayment even in below-average years. P90 means there is a 90% probability the actual yield will exceed this value. This accounts for weather variability, equipment degradation, and model uncertainty.',
    },
    {
      title: 'Residential Solar Proposals',
      description: 'Solar installers provide homeowners with estimated annual savings based on yield predictions.',
      question: 'What makes residential yield predictions less accurate than utility-scale?',
      answer: 'Residential systems face more shading from trees and buildings, less optimal orientations, and smaller sample sizes for validation. Additionally, homeowner energy usage patterns affect the economic value of generated power differently than grid sales.',
    },
    {
      title: 'Solar + Battery Sizing',
      description: 'Battery storage systems must be sized based on expected solar generation patterns.',
      question: 'How does yield uncertainty affect battery sizing decisions?',
      answer: 'If you size batteries for average yield, you will have excess capacity on good days and insufficient on poor days. Designers must consider the distribution of daily yields, not just the annual average, to optimize battery capacity and cycling.',
    },
    {
      title: 'Solar Forecasting for Grid Operators',
      description: 'Grid operators need hour-ahead and day-ahead solar forecasts to balance supply and demand.',
      question: 'Why is short-term solar forecasting harder than annual yield prediction?',
      answer: 'Annual predictions average out weather variations, while short-term forecasts must predict specific cloud movements. A passing cloud can cut output by 80% in seconds. Forecasters combine satellite imagery, weather models, and real-time sensor data.',
    },
  ];

  const testQuestions = [
    {
      question: 'The primary factor determining solar panel output is:',
      options: [
        { text: 'Panel color', correct: false },
        { text: 'Solar irradiance (sunlight intensity)', correct: true },
        { text: 'Wind speed', correct: false },
        { text: 'Humidity', correct: false },
      ],
    },
    {
      question: 'Why do solar panels produce less power at higher temperatures?',
      options: [
        { text: 'The glass absorbs more light when hot', correct: false },
        { text: 'Electrons have more thermal energy, reducing voltage', correct: true },
        { text: 'Hot air is less transparent', correct: false },
        { text: 'The inverter shuts down to protect itself', correct: false },
      ],
    },
    {
      question: 'A typical temperature coefficient for silicon solar cells is:',
      options: [
        { text: '+0.4% per degree C (output increases with heat)', correct: false },
        { text: '-0.4% per degree C (output decreases with heat)', correct: true },
        { text: '0% (temperature has no effect)', correct: false },
        { text: '-4% per degree C (dramatic decrease)', correct: false },
      ],
    },
    {
      question: 'Soiling losses in solar systems are caused by:',
      options: [
        { text: 'Chemical reactions in the cells', correct: false },
        { text: 'Dust, pollen, bird droppings blocking sunlight', correct: true },
        { text: 'Electromagnetic interference', correct: false },
        { text: 'Battery self-discharge', correct: false },
      ],
    },
    {
      question: 'The optimal tilt angle for a fixed solar panel is approximately equal to:',
      options: [
        { text: 'The site latitude', correct: true },
        { text: 'Always 45 degrees', correct: false },
        { text: 'Zero (flat horizontal)', correct: false },
        { text: '90 degrees (vertical)', correct: false },
      ],
    },
    {
      question: 'Inverter efficiency affects solar yield because:',
      options: [
        { text: 'Inverters generate DC power', correct: false },
        { text: 'Some energy is lost converting DC to AC', correct: true },
        { text: 'Inverters only work at night', correct: false },
        { text: 'Inverters store energy in batteries', correct: false },
      ],
    },
    {
      question: 'Peak sun hours (PSH) represent:',
      options: [
        { text: 'The hours when the sun is above the horizon', correct: false },
        { text: 'Equivalent hours of 1000 W/m squared irradiance', correct: true },
        { text: 'The hottest part of the day', correct: false },
        { text: 'When electricity prices are highest', correct: false },
      ],
    },
    {
      question: 'Year-to-year solar yield variation is primarily caused by:',
      options: [
        { text: 'Panel degradation', correct: false },
        { text: 'Weather and cloud cover variations', correct: true },
        { text: 'Grid voltage fluctuations', correct: false },
        { text: 'Changes in Earth orbit', correct: false },
      ],
    },
    {
      question: 'A P90 yield estimate means:',
      options: [
        { text: '90% of panels will work correctly', correct: false },
        { text: 'There is a 90% probability of exceeding this yield', correct: true },
        { text: 'The system operates at 90% efficiency', correct: false },
        { text: 'The estimate is 90% accurate', correct: false },
      ],
    },
    {
      question: 'Simple physics-based yield models can predict annual solar output within:',
      options: [
        { text: '50% error - too many unknown factors', correct: false },
        { text: '5-10% error - key physics dominates', correct: true },
        { text: '0.1% error - perfectly predictable', correct: false },
        { text: '1% error - only uncertainty is weather', correct: false },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        gap: isMobile ? '8px' : '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i < currentIdx && goToPhase(p)}
              style={{
                height: isMobile ? '8px' : '10px',
                width: i === currentIdx ? (isMobile ? '16px' : '24px') : (isMobile ? '8px' : '10px'),
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                cursor: i < currentIdx ? 'pointer' : 'default',
                transition: 'all 0.3s',
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
          {currentIdx + 1} / {phaseOrder.length}
        </span>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '11px',
          fontWeight: 700,
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Next') => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: isMobile ? '10px 16px' : '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: canBack ? colors.textPrimary : colors.textSecondary,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.5,
            fontWeight: 600,
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textSecondary }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '12px 28px',
            borderRadius: '8px',
            border: 'none',
            background: canGoNext ? `linear-gradient(135deg, ${colors.primary}, ${colors.success})` : colors.border,
            color: colors.textPrimary,
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.5,
            fontWeight: 700,
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = () => {
    const output = calculateYield();

    return (
      <svg width="100%" height="450" viewBox="0 0 500 450" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id="yieldGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#84cc16" />
          </linearGradient>
        </defs>

        <rect width="500" height="450" fill="#0f172a" rx="12" />

        <text x="250" y="30" fill="#f8fafc" fontSize="16" fontWeight="bold" textAnchor="middle">
          Solar Yield Prediction Model
        </text>

        <g transform="translate(20, 50)">
          <rect width="200" height="160" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="100" y="20" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">INPUT PARAMETERS</text>

          <text x="10" y="45" fill="#94a3b8" fontSize="10">Irradiance:</text>
          <text x="190" y="45" fill="#f8fafc" fontSize="10" textAnchor="end">{irradiance.toFixed(1)} kWh/m2/day</text>

          <text x="10" y="65" fill="#94a3b8" fontSize="10">System Size:</text>
          <text x="190" y="65" fill="#f8fafc" fontSize="10" textAnchor="end">{systemSize} kW</text>

          <text x="10" y="85" fill="#94a3b8" fontSize="10">Tilt Angle:</text>
          <text x="190" y="85" fill="#f8fafc" fontSize="10" textAnchor="end">{tiltAngle} deg</text>

          <text x="10" y="105" fill="#94a3b8" fontSize="10">Temperature:</text>
          <text x="190" y="105" fill="#f8fafc" fontSize="10" textAnchor="end">{temperature} C</text>

          <text x="10" y="125" fill="#94a3b8" fontSize="10">Soiling Loss:</text>
          <text x="190" y="125" fill="#f8fafc" fontSize="10" textAnchor="end">{soilingLoss}%</text>

          <text x="10" y="145" fill="#94a3b8" fontSize="10">Inverter Eff:</text>
          <text x="190" y="145" fill="#f8fafc" fontSize="10" textAnchor="end">{inverterEfficiency}%</text>
        </g>

        <g transform="translate(240, 50)">
          <rect width="240" height="160" fill="rgba(30, 41, 59, 0.8)" rx="8" />
          <text x="120" y="20" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">YIELD CALCULATION</text>

          <text x="10" y="45" fill="#94a3b8" fontSize="9">Irradiance x Size x Days:</text>
          <text x="230" y="45" fill="#f8fafc" fontSize="9" textAnchor="end">{(irradiance * systemSize * 365).toFixed(0)} kWh base</text>

          <text x="10" y="65" fill="#94a3b8" fontSize="9">x Cosine Factor:</text>
          <text x="230" y="65" fill="#f8fafc" fontSize="9" textAnchor="end">x {output.cosineFactor.toFixed(3)}</text>

          <text x="10" y="85" fill="#94a3b8" fontSize="9">x Temp Derate:</text>
          <text x="230" y="85" fill={output.tempDerate < 1 ? '#ef4444' : '#22c55e'} fontSize="9" textAnchor="end">x {output.tempDerate.toFixed(3)}</text>

          <text x="10" y="105" fill="#94a3b8" fontSize="9">x Soiling Factor:</text>
          <text x="230" y="105" fill="#f8fafc" fontSize="9" textAnchor="end">x {output.soilingFactor.toFixed(3)}</text>

          <text x="10" y="125" fill="#94a3b8" fontSize="9">x Inverter Eff:</text>
          <text x="230" y="125" fill="#f8fafc" fontSize="9" textAnchor="end">x {output.inverterFactor.toFixed(3)}</text>

          <text x="10" y="145" fill="#94a3b8" fontSize="9">x System Losses:</text>
          <text x="230" y="145" fill="#f8fafc" fontSize="9" textAnchor="end">x 0.860</text>
        </g>

        <g transform="translate(20, 220)">
          <rect width="460" height="80" fill="rgba(34, 197, 94, 0.1)" rx="8" stroke="#22c55e" strokeWidth="2" />
          <text x="230" y="25" fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="middle">PREDICTED ANNUAL YIELD</text>
          <text x="230" y="55" fill="#f8fafc" fontSize="28" fontWeight="bold" textAnchor="middle">
            {output.annualYield.toFixed(0)} kWh/year
          </text>
          {showUncertainty && (
            <text x="230" y="72" fill="#94a3b8" fontSize="10" textAnchor="middle">
              Range: {output.lowEstimate.toFixed(0)} - {output.highEstimate.toFixed(0)} kWh (+/-{(output.uncertainty * 100).toFixed(1)}%)
            </text>
          )}
        </g>

        <g transform="translate(20, 320)">
          <text x="230" y="0" fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle">
            SENSITIVITY ANALYSIS - What Matters Most?
          </text>

          <rect x="10" y="20" width={output.sensitivities.irradiance * 15} height="20" fill="#f59e0b" rx="4" />
          <text x="10" y="55" fill="#94a3b8" fontSize="9">Irradiance ({output.sensitivities.irradiance.toFixed(1)}%)</text>

          <rect x="10" y="65" width={output.sensitivities.temperature * 15} height="20" fill="#ef4444" rx="4" />
          <text x="10" y="100" fill="#94a3b8" fontSize="9">Temperature ({output.sensitivities.temperature.toFixed(1)}%)</text>

          <rect x="250" y="20" width={output.sensitivities.soiling * 15} height="20" fill="#8b5cf6" rx="4" />
          <text x="250" y="55" fill="#94a3b8" fontSize="9">Soiling ({output.sensitivities.soiling.toFixed(1)}%)</text>

          <rect x="250" y="65" width={output.sensitivities.inverter * 15} height="20" fill="#3b82f6" rx="4" />
          <text x="250" y="100" fill="#94a3b8" fontSize="9">Inverter ({output.sensitivities.inverter.toFixed(1)}%)</text>
        </g>

        <g transform="translate(20, 430)">
          <text x="230" y="0" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Simple physics: multiply a few factors to predict kWh within 5-10%
          </text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Solar Irradiance: {irradiance.toFixed(1)} kWh/m2/day (Peak Sun Hours)
        </label>
        <input
          type="range"
          min="3"
          max="7"
          step="0.1"
          value={irradiance}
          onChange={(e) => setIrradiance(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          System Size: {systemSize} kW
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={systemSize}
          onChange={(e) => setSystemSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Panel Tilt Angle: {tiltAngle} deg (optimal ~35 deg at mid-latitudes)
        </label>
        <input
          type="range"
          min="0"
          max="60"
          step="5"
          value={tiltAngle}
          onChange={(e) => setTiltAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Cell Temperature: {temperature} C (above 25 C reduces output)
        </label>
        <input
          type="range"
          min="15"
          max="55"
          step="1"
          value={temperature}
          onChange={(e) => setTemperature(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Soiling Loss: {soilingLoss}%
        </label>
        <input
          type="range"
          min="0"
          max="15"
          step="1"
          value={soilingLoss}
          onChange={(e) => setSoilingLoss(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '8px' }}>
          Inverter Efficiency: {inverterEfficiency}%
        </label>
        <input
          type="range"
          min="90"
          max="99"
          step="0.5"
          value={inverterEfficiency}
          onChange={(e) => setInverterEfficiency(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <button
        onClick={() => setShowUncertainty(!showUncertainty)}
        style={{
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: showUncertainty ? '#8b5cf6' : '#475569',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        {showUncertainty ? 'Hide Uncertainty Bands' : 'Show Uncertainty Bands'}
      </button>
    </div>
  );

  // Render wrapper with progress bar and bottom navigation
  const renderPhaseContent = (content: React.ReactNode, canGoNext: boolean, nextLabel: string = 'Next') => (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: colors.bgDark }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {content}
      </div>
      {renderBottomBar(canGoNext, nextLabel)}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#f59e0b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Solar Physics</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #f59e0b, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Solar Yield Prediction
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '18px', marginTop: '8px' }}>
              Can you predict annual kWh from a few physical parameters?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #f59e0b' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              Solar installations cost thousands of dollars. Investors need to know: how much energy will this system produce?
              Do you need complex software, or can simple physics get you surprisingly close?
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '12px' }}>
              Spoiler: A handful of factors capture most of the physics.
            </p>
          </div>
        </div>
      </div>,
      true,
      'Make a Prediction'
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              To predict how many kilowatt-hours a solar system will produce in a year, what approach is needed?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      prediction !== null,
      'Test My Prediction'
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Build Your Yield Model</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            Adjust parameters and see how each factor affects annual production
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Try These Experiments:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Increase temperature to 45 C - watch the temperature penalty</li>
              <li>Move irradiance from 4 to 6 - see the dominant effect</li>
              <li>Vary tilt angle - notice the cosine correction</li>
              <li>Look at the sensitivity bars - which parameter matters most?</li>
            </ul>
          </div>
        </div>
      </div>,
      true,
      'Review the Concepts'
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'simple';

    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly Right!' : 'Not Quite!'}
            </h3>
            <p>
              Simple physics-based models using a handful of parameters (irradiance, temperature coefficient, losses) can predict annual solar yield within 5-10% accuracy. The key insight is that a few factors dominate.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Physics of Solar Yield</h3>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>1. Irradiance Dominates</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                Solar irradiance (measured in kWh/m2/day or Peak Sun Hours) is the single biggest factor. A location with 6 PSH produces 50% more than one with 4 PSH - this alone sets the baseline.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>2. Temperature Derating</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                Silicon cells lose ~0.4% output per degree C above 25 C. A panel at 45 C produces 8% less power. Hot desert locations face this penalty despite high irradiance.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#8b5cf6', marginBottom: '8px' }}>3. Multiplicative Losses</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                Soiling, inverter efficiency, wiring losses, and mismatch multiply together. Each 3% loss compounds: 0.97 x 0.96 x 0.97 x 0.98 = 0.88 (12% total loss).
              </p>
            </div>

            <div>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>4. Simple Model, Good Results</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                Annual kWh = Irradiance x Size x 365 x Cosine x TempDerate x Soiling x Inverter x SystemLosses. This captures 90-95% of the physics!
              </p>
            </div>
          </div>
        </div>
      </div>,
      true,
      'Next: A Twist!'
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '24px' }}>The Twist: Uncertainty</h2>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px' }}>
              You can predict the average yield, but how confident should you be? Banks need P90 estimates (90% confidence). What is the biggest source of uncertainty in solar yield predictions?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '15px',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      twistPrediction !== null,
      'Test My Prediction'
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore Uncertainty</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            Enable uncertainty bands and see how confidence changes with parameters
          </p>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #8b5cf6' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '12px' }}>Uncertainty Sources:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li><strong>Weather Variation (8%):</strong> Year-to-year irradiance varies</li>
              <li><strong>Degradation (0.5%/yr):</strong> Panels lose efficiency over time</li>
              <li><strong>Model Error (5%):</strong> Our simple model is not perfect</li>
              <li>These combine via square root of sum of squares: ~10% total</li>
            </ul>
          </div>
        </div>
      </div>,
      true,
      'See the Explanation'
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'irradiance_dominates';

    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p>
              Year-to-year weather variation (irradiance uncertainty) is typically the largest source of uncertainty at 6-10%. Model errors are 3-5%, and other factors contribute less.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ color: '#8b5cf6', marginBottom: '16px' }}>Understanding Solar Uncertainty</h3>

            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
              For project financing, uncertainty matters as much as the prediction. Banks use statistical analysis to determine P50 (median), P90 (conservative), and P99 (worst case) scenarios.
            </p>

            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <p style={{ color: '#f8fafc', marginBottom: '8px' }}><strong>Example for 15,000 kWh/yr P50 prediction:</strong></p>
              <ul style={{ color: '#94a3b8', fontSize: '14px', paddingLeft: '20px' }}>
                <li>P50 (median): 15,000 kWh - 50% chance of exceeding</li>
                <li>P90: ~13,500 kWh - 90% chance of exceeding (used for debt sizing)</li>
                <li>P99: ~12,500 kWh - 99% chance of exceeding (worst case)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>,
      true,
      'Apply This Knowledge'
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '24px' }}>
            Solar yield prediction powers billion-dollar decisions
          </p>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #475569',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: '#f8fafc' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: '#22c55e' }}>Complete</span>}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#f59e0b', fontSize: '14px' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #f59e0b',
                    background: 'transparent',
                    color: '#f59e0b',
                    cursor: 'pointer',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                  <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>,
      transferCompleted.size >= 4,
      'Take the Test'
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
        <div style={{ color: '#f8fafc', padding: '24px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: '#94a3b8', marginTop: '8px' }}>
                {testScore >= 8 ? 'You have mastered solar yield prediction!' : 'Review the material and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      background: opt.correct ? 'rgba(34, 197, 94, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#94a3b8',
                    }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>,
        testScore >= 8,
        testScore >= 8 ? 'Complete Mastery' : 'Review & Retry'
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const allAnswered = !testAnswers.includes(null);

    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Knowledge Test</h2>
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? '#f59e0b' : i === currentTestQuestion ? '#94a3b8' : '#475569',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px' }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #f59e0b' : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f59e0b',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={!allAnswered}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: allAnswered ? '#22c55e' : '#475569',
                  color: 'white',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>,
      false // Navigation handled by test buttons
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
            You have mastered solar yield prediction physics
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Simple physics models capture most solar yield behavior</li>
              <li>Irradiance is the dominant factor</li>
              <li>Temperature derating (-0.4%/C for silicon)</li>
              <li>Multiplicative loss factors (soiling, inverter, system)</li>
              <li>Uncertainty quantification for financial decisions</li>
              <li>P50/P90/P99 probability exceedance concepts</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>Connection to AI/Compute:</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
              The same principle applies: a few key parameters often dominate complex systems. Just as solar yield is ~90% determined by irradiance, temperature, and basic losses, AI inference latency is dominated by memory bandwidth and model size. Simple models reveal the physics before you need complexity.
            </p>
          </div>
        </div>
      </div>,
      true,
      'Complete'
    );
  }

  return null;
};

export default SolarYieldPredictionRenderer;
