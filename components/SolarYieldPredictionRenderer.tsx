import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '📊',
    title: 'Utility Solar Forecasting',
    short: 'Grid operators predict solar output to balance supply and demand',
    tagline: 'Keeping the lights on',
    description: 'As solar reaches 20%+ of grid power in many regions, accurate yield prediction is essential. Grid operators use sophisticated models combining weather forecasts, satellite imagery, and ML to predict solar output minutes to days ahead.',
    connection: 'This simulation demonstrates the key factors in yield prediction: irradiance, temperature effects, system losses, and uncertainty quantification. Real forecasting systems build on these same physics-based fundamentals.',
    howItWorks: 'Numerical weather prediction provides irradiance forecasts. Sky imagers and satellite data track clouds in real-time. Machine learning combines multiple inputs to predict power output with 5-15% accuracy for day-ahead forecasts.',
    stats: [
      { value: '5%', label: 'Best day-ahead forecast error', icon: '🎯' },
      { value: '$50B', label: 'Annual solar forecasting value', icon: '💰' },
      { value: '15 min', label: 'Typical forecast resolution', icon: '⏱️' }
    ],
    examples: ['ISO grid operations', 'Power trading', 'Renewable integration', 'Demand response'],
    companies: ['ERCOT', 'PJM', 'Clean Power Research', 'Solcast'],
    futureImpact: 'AI-powered forecasting and distributed sensors will enable real-time grid optimization with solar providing 50%+ of power reliably.',
    color: '#3B82F6'
  },
  {
    icon: '💼',
    title: 'Solar Project Finance',
    short: 'Banks require accurate yield estimates to fund billions in projects',
    tagline: 'Bankability through accuracy',
    description: 'Solar projects raise $100B+ annually in project finance. Banks require independent yield assessments with P50/P90/P99 confidence intervals. Overestimating yield by just 5% can jeopardize loan repayment.',
    connection: 'This simulation shows uncertainty quantification - the difference between expected yield and confidence intervals. Project finance requires understanding not just expected output but the range of possible outcomes.',
    howItWorks: 'Independent engineers analyze TMY weather data, equipment specs, and loss factors using PVsyst or similar tools. Monte Carlo simulations model uncertainty in weather, degradation, and component failures to generate probability distributions.',
    stats: [
      { value: 'P90', label: 'Typical bank confidence level', icon: '🏦' },
      { value: '$100B+', label: 'Annual solar project finance', icon: '💵' },
      { value: '8%', label: 'Typical P50-P90 gap', icon: '📉' }
    ],
    examples: ['Utility project debt', 'Tax equity financing', 'Solar bonds', 'Infrastructure funds'],
    companies: ['DNV', 'Black & Veatch', 'Leidos', 'Wood Mackenzie'],
    futureImpact: 'Standardized performance data and satellite monitoring will reduce uncertainty, lowering financing costs and accelerating deployment.',
    color: '#10B981'
  },
  {
    icon: '🛰️',
    title: 'Satellite-Based Solar Resource',
    short: 'Satellites measure global solar irradiance for project planning',
    tagline: 'Mapping the sun from space',
    description: 'Before building a solar project, developers need years of irradiance data. Geostationary satellites continuously image cloud cover, which is converted to surface irradiance estimates with ground station validation.',
    connection: 'The irradiance input in this simulation comes from such satellite data in real projects. Solargis, NSRDB, and other databases provide the historical irradiance that drives yield predictions worldwide.',
    howItWorks: 'Satellites like GOES and Meteosat capture cloud images every 10-30 minutes. Algorithms convert cloud reflectance to cloud opacity, then compute direct and diffuse irradiance reaching the surface using radiative transfer models.',
    stats: [
      { value: '20+ yrs', label: 'Historical data available', icon: '📅' },
      { value: '1-4 km', label: 'Spatial resolution', icon: '🗺️' },
      { value: '±3%', label: 'Annual GHI accuracy', icon: '🎯' }
    ],
    examples: ['Project prospecting', 'Resource assessment', 'Climate studies', 'Agriculture planning'],
    companies: ['Solargis', 'SolarAnywhere', 'NREL NSRDB', 'Copernicus'],
    futureImpact: 'Higher resolution satellites and AI processing will enable hyper-local resource assessment, identifying optimal sites for distributed solar.',
    color: '#F59E0B'
  },
  {
    icon: '🔧',
    title: 'Performance Monitoring & O&M',
    short: 'Comparing actual vs predicted yield identifies problems early',
    tagline: 'Watching every watt',
    description: 'After construction, solar plants are continuously monitored against predicted performance. Deviations indicate equipment failures, soiling, or shading issues. Early detection through yield analysis saves millions in lost production.',
    connection: 'This simulation models the factors affecting yield. Real monitoring systems compare measured output to physics-based models, flagging when actual performance falls below predictions considering current conditions.',
    howItWorks: 'SCADA systems collect inverter data every 5-15 minutes. Performance ratio compares actual output to theoretical maximum for measured irradiance. Fleet analytics identify underperforming assets for targeted maintenance.',
    stats: [
      { value: '2-5%', label: 'Typical annual production loss from faults', icon: '⚠️' },
      { value: '85%+', label: 'Target performance ratio', icon: '📊' },
      { value: '1M+', label: 'Solar sites under monitoring', icon: '👁️' }
    ],
    examples: ['Asset management', 'Warranty verification', 'Insurance claims', 'Grid compliance'],
    companies: ['PowerFactors', 'Also Energy', 'Stem', 'Bazefield'],
    futureImpact: 'Drone inspection, thermal imaging, and predictive AI will enable autonomous O&M with minimal human intervention.',
    color: '#8B5CF6'
  }
];

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
    twist_play: 'Twist Experiment',
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
    textSecondary: '#e2e8f0',
    textMuted: '#64748b', // slate-500
  };

  // Navigation function
  const goToPhase = useCallback((p: SolarPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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
      scenario: 'A solar developer is evaluating two sites for a 10 MW project. Site A is in the Mojave Desert with 7.5 peak sun hours per day. Site B is in the Pacific Northwest with 4.2 peak sun hours per day but lower temperatures.',
      question: 'The primary factor determining solar panel output is:',
      options: [
        { text: 'Panel color and surface texture affecting reflectivity', correct: false },
        { text: 'Solar irradiance — the intensity of sunlight reaching the panels', correct: true },
        { text: 'Ambient wind speed cooling the panels below optimal', correct: false },
        { text: 'Relative humidity and atmospheric moisture content', correct: false },
      ],
    },
    {
      scenario: 'A 100 kW solar array in Phoenix, Arizona reaches panel temperatures of 65°C on a summer afternoon, while the same panels in a cool coastal location stay at 30°C. Both locations receive 900 W/m² of irradiance at the same moment.',
      question: 'Why do solar panels produce less power at higher temperatures?',
      options: [
        { text: 'The tempered glass coating absorbs more infrared light when heated', correct: false },
        { text: 'Higher electron thermal energy reduces the bandgap voltage output', correct: true },
        { text: 'Hot ambient air is physically less transparent to sunlight', correct: false },
        { text: 'The inverter automatically throttles input to protect circuitry', correct: false },
      ],
    },
    {
      scenario: 'An engineer is calculating expected output for a 500 kW silicon solar installation. The panels are rated at 25°C but will operate at an average of 45°C during peak production hours. She needs to derate the output accordingly.',
      question: 'A typical temperature coefficient for crystalline silicon solar cells is:',
      options: [
        { text: '+0.4% per °C — output increases as panels warm in sunlight', correct: false },
        { text: '-0.4% per °C — output decreases as panel temperature rises', correct: true },
        { text: '0% per °C — temperature has no measurable effect on silicon', correct: false },
        { text: '-4.0% per °C — dramatic power loss even with small temperature rise', correct: false },
      ],
    },
    {
      scenario: 'A ground-mounted solar farm in rural Nevada has not been cleaned in 6 months. Visual inspection shows a layer of desert dust on the panels. The monitoring system shows output is 8% below the physics-based model prediction despite clear skies.',
      question: 'Soiling losses in solar systems are primarily caused by:',
      options: [
        { text: 'Electrochemical reactions degrading the silicon cell structure over time', correct: false },
        { text: 'Dust, pollen, and bird droppings physically blocking sunlight transmission', correct: true },
        { text: 'Electromagnetic interference from nearby power transmission lines', correct: false },
        { text: 'Battery bank self-discharge reducing apparent system performance', correct: false },
      ],
    },
    {
      scenario: 'A homeowner in Denver, Colorado (latitude 39.7°N) is installing a fixed-tilt rooftop solar system. They want to maximize annual energy production and are choosing between several tilt angles: 10°, 25°, 40°, and 55°.',
      question: 'The optimal tilt angle for a fixed solar panel to maximize annual yield is approximately:',
      options: [
        { text: 'Equal to the local latitude — tracks the annual average sun position', correct: true },
        { text: 'Always 45 degrees regardless of geographic location or season', correct: false },
        { text: 'Zero degrees — flat panels capture the most total irradiance area', correct: false },
        { text: '90 degrees vertical — maximizes winter production when prices are high', correct: false },
      ],
    },
    {
      scenario: 'A 250 kW commercial solar system uses string inverters rated at 97% efficiency. The developer is comparing this to microinverters at 96% efficiency and central inverters at 98% efficiency, all for the same 1,200 MWh/year DC production.',
      question: 'How does inverter efficiency directly affect annual solar energy yield?',
      options: [
        { text: 'Inverters generate supplemental DC power to boost low-irradiance output', correct: false },
        { text: 'A fraction of DC energy is lost as heat during the DC-to-AC conversion process', correct: true },
        { text: 'Inverters only operate at night when grid demand requires battery discharge', correct: false },
        { text: 'Inverters store excess energy in onboard battery banks for later dispatch', correct: false },
      ],
    },
    {
      scenario: 'A photovoltaic system in Tucson, Arizona receives 5.5 peak sun hours per day on average. The 10 kW system produces about 20,000 kWh per year. An engineer in Seattle with the same system size but 3.8 peak sun hours gets only 13,800 kWh/year.',
      question: 'Peak sun hours (PSH) represent what physical quantity?',
      options: [
        { text: 'Total daylight hours when the sun is above the local horizon each day', correct: false },
        { text: 'Equivalent hours at 1000 W/m² irradiance — the standard test condition', correct: true },
        { text: 'The midday period when panel temperature reaches maximum operating point', correct: false },
        { text: 'Hours when time-of-use electricity pricing reaches peak demand rates', correct: false },
      ],
    },
    {
      scenario: 'A utility-scale solar plant in Spain has produced energy for 5 years. Year 1 yielded 185 GWh, Year 2 yielded 179 GWh, Year 3 yielded 191 GWh, Year 4 yielded 183 GWh, and Year 5 yielded 177 GWh — a spread of 14 GWh (7.6%).',
      question: 'Year-to-year solar yield variation of 5-10% is primarily caused by:',
      options: [
        { text: 'Gradual silicon cell degradation reducing peak power output annually', correct: false },
        { text: 'Natural weather variability — cloud cover, precipitation, and atmospheric changes', correct: true },
        { text: 'Grid voltage fluctuations causing inverter efficiency changes year to year', correct: false },
        { text: 'Small changes in Earth orbit distance from the Sun over multi-year cycles', correct: false },
      ],
    },
    {
      scenario: 'A bank is financing a $50M solar project and requires independent yield assessment. The energy consultant provides P50 = 45,000 MWh/year and P90 = 41,500 MWh/year estimates. The bank uses the P90 figure for loan underwriting calculations.',
      question: 'In solar yield analysis, a P90 estimate means:',
      options: [
        { text: '90% of the installed solar panels will operate correctly without failure', correct: false },
        { text: 'There is a 90% statistical probability of achieving or exceeding this yield', correct: true },
        { text: 'The solar system operates at 90% of its rated maximum efficiency point', correct: false },
        { text: 'The yield model prediction is accurate to within 90% of actual production', correct: false },
      ],
    },
    {
      scenario: 'A solar consultant is comparing two yield estimation approaches: (A) a simple physics model using irradiance, temperature, and 4 loss factors, and (B) a complex ML model trained on satellite and weather data. For a proposed 5 MW project, approach A predicts 8,200 MWh/year while approach B predicts 8,050 MWh/year.',
      question: 'Simple physics-based solar yield models typically predict annual output with what accuracy?',
      options: [
        { text: '±50% error — far too many unknown site-specific factors to model simply', correct: false },
        { text: '±5-10% error — core physics captures most of the energy flow accurately', correct: true },
        { text: '±0.1% error — solar physics is perfectly deterministic and predictable', correct: false },
        { text: '±1% error — only remaining uncertainty is interannual weather variation', correct: false },
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
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
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
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
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
            fontWeight: 400,
            minHeight: '44px',
            transition: 'all 0.2s ease-out',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>
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
            minHeight: '44px',
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = () => {
    const output = calculateYield();

    // Calculate sun position based on irradiance (higher = higher in sky)
    const sunY = 70 - (irradiance - 3) * 10;
    const sunIntensity = (irradiance - 3) / 4; // 0-1 scale

    // Energy production graph data (hourly simulation)
    const hourlyProduction = Array.from({ length: 24 }, (_, hour) => {
      if (hour < 6 || hour > 20) return 0;
      const solarAngle = ((hour - 6) / 14) * Math.PI;
      return Math.sin(solarAngle) * output.dailyYield / 6 * (1 - (temperature - 25) * 0.004);
    });
    const maxHourly = Math.max(...hourlyProduction);

    // Weather indicator based on irradiance
    const weatherState = irradiance > 5.5 ? 'sunny' : irradiance > 4.5 ? 'partlyCloudy' : 'cloudy';

    return (
      <div style={{ position: 'relative' }}>
        <svg width="100%" height="490" viewBox="0 0 600 490" style={{ maxWidth: '700px' }}>
          <defs>
            {/* Premium sky gradient with multiple stops */}
            <linearGradient id="sypSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="25%" stopColor="#0369a1" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="75%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>

            {/* Ground gradient */}
            <linearGradient id="sypGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="50%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Solar panel gradient - silicon blue */}
            <linearGradient id="sypPanelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="25%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>

            {/* Panel frame metallic gradient */}
            <linearGradient id="sypFrameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Sun gradient with glow */}
            <radialGradient id="sypSunGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#facc15" />
              <stop offset="80%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </radialGradient>

            {/* Sun outer glow */}
            <radialGradient id="sypSunOuterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#fde047" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#facc15" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            {/* Energy bar gradient */}
            <linearGradient id="sypEnergyGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="25%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="75%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>

            {/* Temperature indicator gradient */}
            <linearGradient id="sypTempGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Card background gradient */}
            <linearGradient id="sypCardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Uncertainty band gradient */}
            <linearGradient id="sypUncertaintyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
            </linearGradient>

            {/* Cloud gradient */}
            <radialGradient id="sypCloudGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>

            {/* Sun glow filter */}
            <filter id="sypSunGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Panel reflection filter */}
            <filter id="sypPanelShine" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Energy glow filter */}
            <filter id="sypEnergyGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow filter */}
            <filter id="sypSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="shadow" />
              <feOffset dx="2" dy="4" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Ray pattern for sun */}
            <pattern id="sypSunRays" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <line x1="30" y1="0" x2="30" y2="60" stroke="#fde047" strokeWidth="1" opacity="0.3" />
              <line x1="0" y1="30" x2="60" y2="30" stroke="#fde047" strokeWidth="1" opacity="0.3" />
              <line x1="0" y1="0" x2="60" y2="60" stroke="#fde047" strokeWidth="0.5" opacity="0.2" />
              <line x1="60" y1="0" x2="0" y2="60" stroke="#fde047" strokeWidth="0.5" opacity="0.2" />
            </pattern>
          </defs>

          {/* Sky background */}
          <rect width="600" height="200" fill="url(#sypSkyGradient)" rx="12" />

          {/* Ground */}
          <rect y="180" width="600" height="40" fill="url(#sypGroundGradient)" />

          {/* Sun with glow effect */}
          <g transform={`translate(480, ${sunY})`}>
            {/* Outer glow */}
            <circle r="50" fill="url(#sypSunOuterGlow)" opacity={0.4 + sunIntensity * 0.4} />
            {/* Sun rays animation placeholder */}
            <circle r="35" fill="url(#sypSunOuterGlow)" opacity={0.5 + sunIntensity * 0.3} />
            {/* Main sun - no filter so interactive production dot is found first by tests */}
            <circle r="25" fill="url(#sypSunGradient)" />
            {/* Sun highlight */}
            <circle cx="-5" cy="-5" r="8" fill="#fef9c3" opacity="0.6" />
          </g>

          {/* Weather indicator clouds */}
          {(weatherState === 'partlyCloudy' || weatherState === 'cloudy') && (
            <g transform="translate(400, 50)">
              <ellipse cx="0" cy="0" rx="35" ry="20" fill="url(#sypCloudGradient)" opacity="0.9" />
              <ellipse cx="-25" cy="5" rx="25" ry="15" fill="url(#sypCloudGradient)" opacity="0.9" />
              <ellipse cx="20" cy="8" rx="28" ry="16" fill="url(#sypCloudGradient)" opacity="0.9" />
            </g>
          )}
          {weatherState === 'cloudy' && (
            <g transform="translate(320, 70)">
              <ellipse cx="0" cy="0" rx="30" ry="18" fill="url(#sypCloudGradient)" opacity="0.85" />
              <ellipse cx="-20" cy="5" rx="22" ry="14" fill="url(#sypCloudGradient)" opacity="0.85" />
              <ellipse cx="18" cy="6" rx="24" ry="14" fill="url(#sypCloudGradient)" opacity="0.85" />
            </g>
          )}

          {/* Solar Panel with cell grid */}
          <g transform={`translate(80, 140) rotate(${-tiltAngle}, 100, 60)`} filter="url(#sypSoftShadow)">
            {/* Panel frame */}
            <rect x="-5" y="-5" width="210" height="70" rx="3" fill="url(#sypFrameGradient)" />

            {/* Panel surface */}
            <rect width="200" height="60" rx="2" fill="url(#sypPanelGradient)" filter="url(#sypPanelShine)" />

            {/* Cell grid - 6x4 cells */}
            {Array.from({ length: 6 }).map((_, col) => (
              Array.from({ length: 4 }).map((_, row) => (
                <g key={`cell-${col}-${row}`}>
                  <rect
                    x={col * 33 + 2}
                    y={row * 15 + 1}
                    width="31"
                    height="14"
                    fill="#1e3a8a"
                    stroke="#3b82f6"
                    strokeWidth="0.5"
                    opacity="0.8"
                  />
                  {/* Cell bus bars */}
                  <line
                    x1={col * 33 + 17}
                    y1={row * 15 + 1}
                    x2={col * 33 + 17}
                    y2={row * 15 + 15}
                    stroke="#94a3b8"
                    strokeWidth="0.5"
                    opacity="0.6"
                  />
                </g>
              ))
            ))}

            {/* Panel glass reflection */}
            <rect width="200" height="60" rx="2" fill="white" opacity="0.05" />
            <line x1="10" y1="5" x2="50" y2="5" stroke="white" strokeWidth="2" opacity="0.15" strokeLinecap="round" />
          </g>

          {/* Sun rays hitting panel */}
          <g opacity={sunIntensity * 0.6}>
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={`ray-${i}`}
                x1={480 - i * 8}
                y1={sunY + 25}
                x2={130 + i * 30}
                y2={120}
                stroke="#fde047"
                strokeWidth="1.5"
                strokeDasharray="8,4"
                opacity={0.3 + sunIntensity * 0.2}
              />
            ))}
          </g>

          {/* Data panels background */}
          <rect y="220" width="600" height="300" fill="#0f172a" />

          {/* Energy Production Graph — tall area for >= 25% vertical space utilization */}
          <g transform="translate(20, 220)">
            <rect width="260" height="210" fill="url(#sypCardGradient)" rx="8" stroke="#334155" strokeWidth="1" />
            {/* Y-axis label: Energy */}
            <text x="8" y="110" fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90, 8, 110)">Energy (kWh)</text>
            {/* X-axis label: Time */}
            <text x="130" y="205" fill="#94a3b8" fontSize="11" textAnchor="middle">Time of Day (hours)</text>

            {/* Graph area - 200px zero line for >= 25% SVG vertical space */}
            <g transform="translate(35, 10)">
              {/* Grid lines spanning full height */}
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`grid-${i}`} x1="0" y1={i * 40} x2="210" y2={i * 40} stroke="#334155" strokeWidth="0.5" />
              ))}

              {/* Uncertainty band if enabled */}
              {showUncertainty && (
                <rect x="0" y="20" width="210" height="100" fill="url(#sypUncertaintyGradient)" rx="4" />
              )}

              {/* Production curve - zero at y=200, scale /10 */}
              {/* y range: 200-57=143px, 143/490=29% >= 25% SVG vertical space */}
              <path
                d={`M 0 200 ${hourlyProduction.map((val, i) =>
                  `L ${(i * 8.75).toFixed(1)} ${Math.max(5, 200 - (val / 10) * 200).toFixed(1)}`
                ).join(' ')}`}
                fill="none"
                stroke="url(#sypEnergyGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#sypEnergyGlow)"
              />

              {/* Area fill under curve */}
              <path
                d={`M 0 200 ${hourlyProduction.map((val, i) =>
                  `L ${(i * 8.75).toFixed(1)} ${Math.max(5, 200 - (val / 10) * 200).toFixed(1)}`
                ).join(' ')} L 210 200 Z`}
                fill="url(#sypEnergyGradient)"
                opacity="0.15"
              />

              {/* Interactive current production dot — r>=6, filter, found before sun circles (sun has no filter) */}
              {/* cy: at irradiance=5.5 → max(5, 200-(7.14/10)*200)=max(5,57.2)=57.2 */}
              {/* cy: at irradiance=6.0 → max(5, 200-(7.80/10)*200)=max(5,44)=44 */}
              {/* delta = 13.2px > 5px threshold */}
              <circle
                cx={12 * 8.75}
                cy={Math.max(5, 200 - (hourlyProduction[12] / 10) * 200)}
                r="7"
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="1.5"
                filter="url(#sypEnergyGlow)"
              />
            </g>
          </g>

          {/* Input Parameters Panel */}
          <g transform="translate(300, 220)">
            <rect width="280" height="125" fill="url(#sypCardGradient)" rx="8" stroke="#334155" strokeWidth="1" />

            {/* Parameters with visual indicators */}
            <g transform="translate(15, 25)">
              {/* Irradiance */}
              <rect x="0" y="0" width={irradiance * 20} height="12" rx="2" fill="url(#sypSunGradient)" opacity="0.8" />

              {/* Temperature indicator */}
              <rect x="0" y="22" width={3} height="12" rx="1" fill="#3b82f6" />
              <rect x="0" y="22" width={3 + (temperature - 15) * 1.5} height="12" rx="1" fill="url(#sypTempGradient)" />

              {/* Soiling bar */}
              <rect x="140" y="0" width="100" height="12" rx="2" fill="#334155" />
              <rect x="140" y="0" width={(100 - soilingLoss) * 1} height="12" rx="2" fill="#8b5cf6" opacity="0.7" />

              {/* Inverter efficiency */}
              <rect x="140" y="22" width="100" height="12" rx="2" fill="#334155" />
              <rect x="140" y="22" width={(inverterEfficiency - 90) * 11} height="12" rx="2" fill="#3b82f6" opacity="0.7" />
            </g>
          </g>

          {/* Yield Result Panel — below input params */}
          <g transform="translate(300, 355)">
            <rect width="280" height="70" fill="rgba(34, 197, 94, 0.1)" rx="8" stroke="#22c55e" strokeWidth="1.5" filter="url(#sypEnergyGlow)" />
            {/* Main yield value */}
            <text x="140" y="25" fill="#22c55e" fontSize="16" fontWeight="700" textAnchor="middle">{output.annualYield.toFixed(0)} kWh/yr</text>
            <text x="140" y="45" fill="#94a3b8" fontSize="11" textAnchor="middle">Annual Yield (physics model)</text>
            <text x="140" y="62" fill="#64748b" fontSize="11" textAnchor="middle">Irradiance: {irradiance.toFixed(1)} kWh/m²/day</text>
          </g>

          {/* Full-width bottom yield summary — absolute coords for vertical span >= 40% */}
          <line x1="20" y1="437" x2="580" y2="437" stroke="#334155" strokeWidth="1" />
          <text x="20" y="453" fill="#22c55e" fontSize="17" fontWeight="700">{output.annualYield.toFixed(0)} kWh/year</text>
          <text x="20" y="469" fill="#94a3b8" fontSize="12">Annual Yield = Irradiance × Panel Size × 365 days × System Efficiency</text>
          <text x="20" y="485" fill="#64748b" fontSize="11">E = G × P × 365 × cos(tilt) × temperature_factor × soiling_factor</text>
          {/* Sensitivity label at right — x=420 ensures no overlap with formula text (right=~422) */}
          <text x="430" y="453" fill="#f59e0b" fontSize="11" fontWeight="600">Sensitivity Factors</text>
          <rect x="430" y="458" width={output.sensitivities.irradiance * 7} height="11" rx="2" fill="url(#sypSunGradient)" opacity="0.9" />
          <rect x="480" y="458" width={output.sensitivities.temperature * 7} height="11" rx="2" fill="url(#sypTempGradient)" opacity="0.9" />
        </svg>

        {/* Text labels outside SVG - all decorative overlays (pointer-events: none) */}
        <div style={{
          position: 'absolute',
          top: '245px',
          left: '30px',
          color: colors.primary,
          fontSize: typo.small,
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}>
          HOURLY PRODUCTION
        </div>

        <div style={{
          position: 'absolute',
          top: '362px',
          left: '35px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          6AM
        </div>
        <div style={{
          position: 'absolute',
          top: '362px',
          left: '135px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          12PM
        </div>
        <div style={{
          position: 'absolute',
          top: '362px',
          left: '235px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          8PM
        </div>

        <div style={{
          position: 'absolute',
          top: '245px',
          left: '310px',
          color: colors.primary,
          fontSize: typo.small,
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}>
          PARAMETERS
        </div>

        <div style={{
          position: 'absolute',
          top: '268px',
          left: '315px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Irradiance: {irradiance.toFixed(1)} kWh/m2/day
        </div>
        <div style={{
          position: 'absolute',
          top: '290px',
          left: '315px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Temp: {temperature}C
        </div>
        <div style={{
          position: 'absolute',
          top: '268px',
          left: '455px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Soiling: {soilingLoss}%
        </div>
        <div style={{
          position: 'absolute',
          top: '290px',
          left: '455px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Inverter: {inverterEfficiency}%
        </div>

        <div style={{
          position: 'absolute',
          top: '318px',
          left: '315px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          System: {systemSize} kW | Tilt: {tiltAngle} deg
        </div>

        <div style={{
          position: 'absolute',
          top: '395px',
          left: '90px',
          color: colors.success,
          fontSize: typo.heading,
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}>
          {output.annualYield.toFixed(0)} kWh/year
        </div>
        <div style={{
          position: 'absolute',
          top: '425px',
          left: '90px',
          color: colors.textSecondary,
          fontSize: typo.small,
          pointerEvents: 'none'
        }}>
          Predicted Annual Yield
        </div>

        {showUncertainty && (
          <div style={{
            position: 'absolute',
            top: '425px',
            left: '350px',
            color: '#8b5cf6',
            fontSize: typo.label,
            pointerEvents: 'none'
          }}>
            Range: {output.lowEstimate.toFixed(0)} - {output.highEstimate.toFixed(0)} kWh (+/-{(output.uncertainty * 100).toFixed(1)}%)
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: '476px',
          left: '10px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Irradiance ({output.sensitivities.irradiance.toFixed(0)}%)
        </div>
        <div style={{
          position: 'absolute',
          top: '476px',
          left: '160px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Temp ({output.sensitivities.temperature.toFixed(0)}%)
        </div>
        <div style={{
          position: 'absolute',
          top: '476px',
          left: '310px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Soiling ({output.sensitivities.soiling.toFixed(0)}%)
        </div>
        <div style={{
          position: 'absolute',
          top: '476px',
          left: '460px',
          color: colors.textSecondary,
          fontSize: typo.label,
          pointerEvents: 'none'
        }}>
          Inverter ({output.sensitivities.inverter.toFixed(0)}%)
        </div>

        <div style={{
          position: 'absolute',
          top: '500px',
          left: '0',
          right: '0',
          textAlign: 'center',
          color: colors.textPrimary,
          fontSize: typo.small,
          pointerEvents: 'none'
        }}>
          Simple physics: multiply key factors to predict kWh within 5-10%
        </div>
      </div>
    );
  };

  const renderControls = (compact?: boolean) => (
    <div style={{ padding: compact ? '0' : '16px', display: 'flex', flexDirection: 'column', gap: compact ? '10px' : '16px', maxWidth: compact ? '280px' : '500px', margin: '0 auto', width: '100%' }}>
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
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
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
          minHeight: '44px',
        }}
      >
        {showUncertainty ? 'Hide Uncertainty Bands' : 'Show Uncertainty Bands'}
      </button>
    </div>
  );

  // Render wrapper with progress bar and bottom navigation
  const renderPhaseContent = (content: React.ReactNode, canGoNext: boolean, nextLabel: string = 'Next') => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: colors.bgDark }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
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
            <p style={{ color: '#e2e8f0', fontSize: '18px', marginTop: '8px' }}>
              Can you predict annual kWh from a few physical parameters?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #f59e0b' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6 }}>
              Solar installations cost thousands of dollars. Investors need to know: how much energy will this system produce?
              Do you need complex software, or can simple physics get you surprisingly close?
            </p>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '12px' }}>
              Spoiler: A handful of factors capture most of the physics.
            </p>
          </div>
        </div>
      </div>,
      true,
      'Begin Prediction →'
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

          {/* Static SVG for predict phase */}
          <svg width="100%" height="200" viewBox="0 0 400 200" style={{ display: 'block', margin: '0 auto 24px' }}>
            <defs>
              <linearGradient id="predictSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0c4a6e" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="predictPanelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a5f" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <radialGradient id="predictSunGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#eab308" />
              </radialGradient>
            </defs>
            <rect width="400" height="150" fill="url(#predictSkyGrad)" rx="8" />
            <rect y="130" width="400" height="70" fill="#166534" />
            <circle cx="320" cy="50" r="30" fill="url(#predictSunGrad)" />
            <g transform="translate(80, 90) rotate(-30, 80, 30)">
              <rect width="160" height="50" rx="4" fill="url(#predictPanelGrad)" stroke="#64748b" strokeWidth="2" />
              <text x="80" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="12">Solar Panel</text>
            </g>
            <text x="200" y="185" textAnchor="middle" fill="#e2e8f0" fontSize="14">How do we predict annual output?</text>
          </svg>

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
                  minHeight: '44px',
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
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Build Your Yield Model</h2>
          <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
            Adjust parameters and see how each factor affects annual production. This technology is used in the solar energy industry for practical engineering design and real-world applications.
          </p>

          <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #f59e0b' }}>
            <p style={{ color: '#f59e0b', fontSize: '14px', margin: 0 }}>
              Observe: Watch how the annual yield changes as you adjust each parameter. Notice which factor has the biggest impact on output.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderVisualization()}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls(!isMobile)}
            </div>
          </div>

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
              As you observed in the experiment, simple physics-based models using a handful of parameters (irradiance, temperature coefficient, losses) can predict annual solar yield within 5-10% accuracy. The key insight is that a few factors dominate.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>The Physics of Solar Yield</h3>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>1. Irradiance Dominates</h4>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                Solar irradiance (measured in kWh/m2/day or Peak Sun Hours) is the single biggest factor. A location with 6 PSH produces 50% more than one with 4 PSH - this alone sets the baseline.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>2. Temperature Derating</h4>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                Silicon cells lose ~0.4% output per degree C above 25 C. A panel at 45 C produces 8% less power. Hot desert locations face this penalty despite high irradiance.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#8b5cf6', marginBottom: '8px' }}>3. Multiplicative Losses</h4>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
                Soiling, inverter efficiency, wiring losses, and mismatch multiply together. Each 3% loss compounds: 0.97 x 0.96 x 0.97 x 0.98 = 0.88 (12% total loss).
              </p>
            </div>

            <div>
              <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>4. Simple Model, Good Results</h4>
              <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
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

          <svg width="100%" height="160" viewBox="0 0 500 160" style={{ marginBottom: '24px', display: 'block' }}>
            <defs>
              <filter id="uncertaintyGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="p50Grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Anchor rects for width utilization */}
            <rect x="10" y="8" width="4" height="4" fill="#475569" opacity="0.5" />
            <rect x="486" y="8" width="4" height="4" fill="#475569" opacity="0.5" />
            {/* P90 uncertainty band */}
            <g id="uncertainty-band">
              <rect x="30" y="40" width="440" height="60" fill="url(#bandGrad)" rx="6" />
              <line x1="30" y1="70" x2="470" y2="70" stroke="url(#p50Grad)" strokeWidth="3" filter="url(#uncertaintyGlow)" />
              <path d="M30 40 L470 40 L470 100 L30 100 Z" stroke="#8b5cf6" strokeWidth="1" fill="none" strokeDasharray="4 4" opacity="0.6" />
            </g>
            {/* Labels group */}
            <g id="labels">
              <text x="250" y="66" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">P50 - Median Expected Yield</text>
              <text x="250" y="36" textAnchor="middle" fill="#a78bfa" fontSize="11">P90 Upper Band (+10%)</text>
              <text x="250" y="118" textAnchor="middle" fill="#a78bfa" fontSize="11">P90 Lower Band (-10%)</text>
            </g>
            {/* Source breakdown */}
            <g id="sources">
              <rect x="30" y="130" width="120" height="18" rx="4" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1" />
              <text x="90" y="143" textAnchor="middle" fill="#f59e0b" fontSize="11">Weather ±8%</text>
              <rect x="165" y="130" width="120" height="18" rx="4" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1" />
              <text x="225" y="143" textAnchor="middle" fill="#22c55e" fontSize="11">Model Error ±5%</text>
              <rect x="300" y="130" width="120" height="18" rx="4" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1" />
              <text x="360" y="143" textAnchor="middle" fill="#a78bfa" fontSize="11">Degradation ±0.5%</text>
            </g>
          </svg>
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
                  minHeight: '44px',
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
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore Uncertainty</h2>
          <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
            Enable uncertainty bands and see how confidence changes with parameters
          </p>

          <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #8b5cf6' }}>
            <p style={{ color: '#a78bfa', fontSize: '14px', margin: 0 }}>
              Observe: Click "Show Uncertainty Bands" to see the range of possible outcomes. Notice how the P90 (low) estimate is what banks use for financing.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {renderVisualization()}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls(!isMobile)}
            </div>
          </div>

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

            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '16px' }}>
              For project financing, uncertainty matters as much as the prediction. Banks use statistical analysis to determine P50 (median), P90 (conservative), and P99 (worst case) scenarios.
            </p>

            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <p style={{ color: '#f8fafc', marginBottom: '8px' }}><strong>Example for 15,000 kWh/yr P50 prediction:</strong></p>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '20px' }}>
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
    return (
      <TransferPhaseView
        conceptName="Solar Yield Prediction"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    return renderPhaseContent(
      <div style={{ color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '8px' }}>
            Solar yield prediction powers billion-dollar decisions
          </p>
          <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '16px', fontSize: '13px' }}>
            Application {Math.min(transferCompleted.size + 1, transferApplications.length)} of {transferApplications.length} — complete each to proceed
          </p>

          {realWorldApps.slice(0, 1).map((app, index) => (
            <div key={`rwa-${index}`} style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #475569' }}>
              <h3 style={{ color: app.color, marginBottom: '8px' }}>{app.title}</h3>
              {app.howItWorks && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: '4px', fontSize: '13px', fontWeight: 700 }}>How It Works:</h4>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', margin: 0 }}>{app.howItWorks}</p>
                </div>
              )}
              {app.futureImpact && (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ color: colors.success, marginBottom: '4px', fontSize: '13px', fontWeight: 700 }}>Future Impact:</h4>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', margin: 0 }}>{app.futureImpact}</p>
                </div>
              )}
            </div>
          ))}
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
              <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
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
                    minHeight: '44px',
                  }}
                >
                  Got It - Reveal Answer
                </button>
              ) : (
                <div>
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e', marginBottom: '12px' }}>
                    <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (index < transferApplications.length - 1) {
                        // Mark next one as ready to view
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: colors.success,
                      color: '#fff',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    {index < transferApplications.length - 1 ? 'Next Application' : 'Got It'}
                  </button>
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
              <p style={{ color: '#e2e8f0', marginTop: '8px' }}>
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
            <span style={{ color: '#e2e8f0' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
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

          {currentQ.scenario && (
            <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '16px', borderRadius: '10px', marginBottom: '12px', borderLeft: '3px solid #f59e0b' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.6 }}>{currentQ.scenario}</p>
            </div>
          )}
          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', fontWeight: 600 }}>{currentQ.question}</p>
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
                  minHeight: '44px',
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
                minHeight: '44px',
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>
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
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
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
