import React, { useState, useEffect, useCallback } from 'react';

interface SolarTempCoefficientRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#fbbf24',
  solarGlow: 'rgba(251, 191, 36, 0.3)',
  voltage: '#3b82f6',
  current: '#22c55e',
  power: '#a855f7',
  temperature: '#ef4444',
  cold: '#06b6d4',
};

const SolarTempCoefficientRenderer: React.FC<SolarTempCoefficientRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [panelTemperature, setPanelTemperature] = useState(25); // Celsius (-10 to 70)
  const [irradiance, setIrradiance] = useState(1000); // W/m² (200 to 1200)
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState(1);
  const [showSeason, setShowSeason] = useState<'summer' | 'winter' | null>(null);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Standard Test Conditions (STC)
  const STC_TEMP = 25; // °C
  const STC_IRRADIANCE = 1000; // W/m²
  const STC_VOC = 40; // V (typical for 72-cell panel)
  const STC_ISC = 10; // A
  const STC_PMAX = 350; // W

  // Temperature coefficients (typical for silicon)
  const TEMP_COEFF_VOC = -0.003; // -0.3%/°C (voltage decreases with temperature)
  const TEMP_COEFF_ISC = 0.0005; // +0.05%/°C (current slightly increases with temperature)
  const TEMP_COEFF_PMAX = -0.004; // -0.4%/°C (power decreases with temperature)

  // Physics calculations
  const calculateSolarValues = useCallback(() => {
    // Temperature difference from STC
    const deltaT = panelTemperature - STC_TEMP;

    // Irradiance ratio
    const irradianceRatio = irradiance / STC_IRRADIANCE;

    // Voltage: decreases with temperature, slightly increases with irradiance (log)
    const voltageTemperatureEffect = 1 + TEMP_COEFF_VOC * deltaT;
    const voltageIrradianceEffect = 1 + 0.025 * Math.log(irradianceRatio + 0.001);
    const Voc = STC_VOC * voltageTemperatureEffect * Math.max(0.5, voltageIrradianceEffect);

    // Current: slightly increases with temperature, linearly with irradiance
    const currentTemperatureEffect = 1 + TEMP_COEFF_ISC * deltaT;
    const Isc = STC_ISC * currentTemperatureEffect * irradianceRatio;

    // Power: decreases with temperature, linear with irradiance
    const powerTemperatureEffect = 1 + TEMP_COEFF_PMAX * deltaT;
    const Pmax = STC_PMAX * powerTemperatureEffect * irradianceRatio;

    // Actual efficiency (power out / power in)
    const panelArea = 1.7; // m² typical for 350W panel
    const powerIn = irradiance * panelArea;
    const efficiency = (Pmax / powerIn) * 100;

    // Voltage loss from temperature
    const voltageLoss = STC_VOC * TEMP_COEFF_VOC * deltaT;

    // Power loss from temperature
    const powerLoss = STC_PMAX * TEMP_COEFF_PMAX * deltaT * irradianceRatio;

    return {
      Voc: Math.max(0, Voc),
      Isc: Math.max(0, Isc),
      Pmax: Math.max(0, Pmax),
      efficiency: Math.max(0, efficiency),
      voltageLoss,
      powerLoss,
      deltaT,
    };
  }, [panelTemperature, irradiance]);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setPanelTemperature(prev => {
        let newVal = prev + animationDirection * 2;
        if (newVal >= 70) {
          setAnimationDirection(-1);
          newVal = 70;
        } else if (newVal <= -10) {
          setAnimationDirection(1);
          newVal = -10;
        }
        return newVal;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating, animationDirection]);

  const values = calculateSolarValues();

  // Preset scenarios
  const setScenario = (scenario: 'summer' | 'winter') => {
    if (scenario === 'summer') {
      setPanelTemperature(55); // Hot roof in summer
      setIrradiance(1000); // Good sun
      setShowSeason('summer');
    } else {
      setPanelTemperature(5); // Cold winter day
      setIrradiance(800); // Lower sun angle but clear
      setShowSeason('winter');
    }
  };

  const predictions = [
    { id: 'more_power_hot', label: 'More sunlight = more heat = more power output' },
    { id: 'less_power_hot', label: 'Hot panels produce LESS power despite more sunlight' },
    { id: 'same_power', label: 'Temperature does not affect solar panel output' },
    { id: 'only_current', label: 'Only current changes with temperature, not power' },
  ];

  const twistPredictions = [
    { id: 'summer_wins', label: 'Hot summer days always produce more energy' },
    { id: 'winter_wins', label: 'Cold sunny winter days can match or beat hot summer days' },
    { id: 'spring_fall', label: 'Only spring and fall produce good power' },
    { id: 'temperature_irrelevant', label: 'Seasonal temperature differences are too small to matter' },
  ];

  const transferApplications = [
    {
      title: 'Solar Farm Design in Hot Climates',
      description: 'Solar farms in desert regions like Arizona or Saudi Arabia face extreme panel temperatures exceeding 70°C.',
      question: 'How do engineers compensate for temperature losses in hot climates?',
      answer: 'Engineers install more panel capacity to compensate for efficiency losses (10-15% derating), use raised mounting for airflow cooling, install panels at steeper angles for self-cleaning and cooling, and choose panels with better temperature coefficients. Some farms use single-axis trackers that also improve cooling.',
    },
    {
      title: 'Rooftop vs Ground-Mount Performance',
      description: 'Rooftop solar panels often run 20-30°C hotter than ground-mount systems due to trapped heat.',
      question: 'Why do ground-mount systems typically outperform rooftop per watt installed?',
      answer: 'Ground mounts have free airflow underneath for passive cooling, keeping panels 10-20°C cooler. This alone can mean 4-8% more energy production. They can also be optimally angled and are easier to clean. However, rooftops use otherwise wasted space and avoid land costs.',
    },
    {
      title: 'High-Altitude Solar Installations',
      description: 'Solar installations at high altitude (mountains, highlands) experience intense UV but cooler temperatures.',
      question: 'Why are high-altitude locations excellent for solar despite shorter days in some seasons?',
      answer: 'Thinner atmosphere means more direct solar radiation (up to 15% more). Cooler temperatures (0-15°C typical) keep voltage high and efficiency up. Combined, high-altitude sites can produce 20-30% more per panel than sea-level installations. This explains why the Atacama Desert (high + dry) is ideal for solar.',
    },
    {
      title: 'Bifacial Panel Temperature Effects',
      description: 'Bifacial panels absorb light from both sides and have different temperature behavior than standard panels.',
      question: 'How does temperature affect bifacial panels differently than monofacial?',
      answer: 'Bifacial panels run cooler because the back glass conducts heat better than opaque backsheets, and ground reflection provides "free" energy without adding heat. They gain 5-15% more energy from the back while running 3-5°C cooler. Their temperature coefficient advantage compounds over time.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the typical temperature coefficient of power for silicon solar panels?',
      options: [
        { text: '+0.4%/°C (power increases with temperature)', correct: false },
        { text: '-0.3% to -0.5%/°C (power decreases with temperature)', correct: true },
        { text: '0%/°C (temperature has no effect)', correct: false },
        { text: '-5%/°C (power drops dramatically)', correct: false },
      ],
    },
    {
      question: 'At Standard Test Conditions (STC), what is the defined cell temperature?',
      options: [
        { text: '0°C', correct: false },
        { text: '25°C', correct: true },
        { text: '40°C', correct: false },
        { text: '20°C', correct: false },
      ],
    },
    {
      question: 'Why does solar panel voltage decrease when temperature increases?',
      options: [
        { text: 'The wires expand and increase resistance', correct: false },
        { text: 'The silicon bandgap decreases, reducing the voltage', correct: true },
        { text: 'The sun appears dimmer when it is hot', correct: false },
        { text: 'The panel glass absorbs more light when hot', correct: false },
      ],
    },
    {
      question: 'A 350W panel at 25°C is heated to 55°C. How much power is lost? (Use -0.4%/°C)',
      options: [
        { text: 'About 4W (negligible)', correct: false },
        { text: 'About 42W (12% loss)', correct: true },
        { text: 'About 100W (almost 30% loss)', correct: false },
        { text: 'No loss - power is independent of temperature', correct: false },
      ],
    },
    {
      question: 'What happens to solar panel current when temperature increases?',
      options: [
        { text: 'It decreases significantly', correct: false },
        { text: 'It stays exactly the same', correct: false },
        { text: 'It increases slightly (around +0.05%/°C)', correct: true },
        { text: 'It doubles', correct: false },
      ],
    },
    {
      question: 'Why might a cold, clear winter day produce as much energy as a hot summer day?',
      options: [
        { text: 'Winter sun is actually brighter', correct: false },
        { text: 'Higher voltage from cold panels compensates for lower sun angle', correct: true },
        { text: 'Panels work better when covered in snow', correct: false },
        { text: 'This never actually happens', correct: false },
      ],
    },
    {
      question: 'How do installers compensate for temperature losses in hot climates?',
      options: [
        { text: 'Install fewer panels since they produce more heat', correct: false },
        { text: 'Install more capacity and use designs that promote cooling', correct: true },
        { text: 'Cover panels with white paint to reflect heat', correct: false },
        { text: 'Only operate panels at night', correct: false },
      ],
    },
    {
      question: 'What is NOCT (Nominal Operating Cell Temperature)?',
      options: [
        { text: 'The maximum safe temperature for a panel', correct: false },
        { text: 'The expected cell temperature at 800 W/m², 20°C air, 1 m/s wind', correct: true },
        { text: 'The temperature where efficiency is highest', correct: false },
        { text: 'The temperature used for warranty calculations', correct: false },
      ],
    },
    {
      question: 'Which location would likely have the best solar panel efficiency?',
      options: [
        { text: 'A hot, humid tropical beach', correct: false },
        { text: 'A cold, high-altitude desert', correct: true },
        { text: 'A hot, sunny parking lot', correct: false },
        { text: 'An indoor greenhouse', correct: false },
      ],
    },
    {
      question: 'If a panel is rated at -0.35%/°C power temperature coefficient, what does this mean?',
      options: [
        { text: 'The panel loses 0.35W for every degree above 0°C', correct: false },
        { text: 'The panel loses 0.35% of its STC power for every degree above 25°C', correct: true },
        { text: 'The panel gains 0.35% efficiency when heated', correct: false },
        { text: 'The coefficient only applies below freezing', correct: false },
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
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 420;

    // Temperature color gradient
    const getTempColor = () => {
      if (panelTemperature < 10) return colors.cold;
      if (panelTemperature < 25) return colors.success;
      if (panelTemperature < 40) return colors.warning;
      return colors.temperature;
    };

    // Sun intensity visual
    const sunOpacity = Math.min(1, irradiance / 1000);
    const sunSize = 25 + (irradiance / 1000) * 15;

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
            <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.solar} stopOpacity={sunOpacity} />
              <stop offset="100%" stopColor={colors.solar} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="panelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor={getTempColor()} stopOpacity="0.5" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Sun */}
          <g transform="translate(60, 50)">
            <circle cx="0" cy="0" r={sunSize + 20} fill="url(#sunGradient)" />
            <circle cx="0" cy="0" r={sunSize} fill={colors.solar} filter="url(#glow)" />
            <text x="0" y={sunSize + 25} fill={colors.textSecondary} fontSize="10" textAnchor="middle">
              {irradiance} W/m²
            </text>
          </g>

          {/* Solar Panel */}
          <g transform="translate(150, 30)">
            {/* Sun rays hitting panel */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1={-80 + i * 25}
                y1={-10}
                x2={10 + i * 25}
                y2={40}
                stroke={colors.solar}
                strokeWidth="2"
                opacity={sunOpacity * 0.7}
                strokeDasharray="4,4"
              />
            ))}

            {/* Panel body */}
            <rect x="0" y="20" width="140" height="80" fill="url(#panelGradient)" rx="4" stroke="#3b82f6" strokeWidth="2" />

            {/* Cell grid */}
            {[1, 2, 3, 4, 5].map(i => (
              <line key={`h${i}`} x1="0" y1={20 + i * 13.3} x2="140" y2={20 + i * 13.3} stroke="#1e3a8a" strokeWidth="0.5" />
            ))}
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <line key={`v${i}`} x1={i * 17.5} y1="20" x2={i * 17.5} y2="100" stroke="#1e3a8a" strokeWidth="0.5" />
            ))}

            {/* Temperature indicator on panel */}
            <rect x="50" y="45" width="40" height="30" fill="rgba(0,0,0,0.7)" rx="4" />
            <text x="70" y="66" fill={getTempColor()} fontSize="14" fontWeight="bold" textAnchor="middle">
              {panelTemperature}°C
            </text>
          </g>

          {/* Thermometer */}
          <g transform="translate(320, 30)">
            <rect x="0" y="0" width="35" height="100" fill="#1e293b" rx="17" stroke="#475569" strokeWidth="2" />
            <rect
              x="5"
              y={5 + 80 * (1 - (panelTemperature + 10) / 80)}
              width="25"
              height={80 * ((panelTemperature + 10) / 80)}
              fill={getTempColor()}
              rx="12"
            />
            <circle cx="17.5" cy="88" r="12" fill={getTempColor()} />
            <text x="17.5" y="115" fill={colors.textSecondary} fontSize="10" textAnchor="middle">
              Panel Temp
            </text>
          </g>

          {/* Output values */}
          <g transform="translate(20, 140)">
            <rect x="0" y="0" width="360" height="90" fill="rgba(0,0,0,0.4)" rx="8" stroke={colors.accent} strokeWidth="1" />
            <text x="180" y="18" fill={colors.textPrimary} fontSize="12" fontWeight="bold" textAnchor="middle">
              Panel Output (vs STC at 25°C, 1000 W/m²)
            </text>

            {/* Voltage */}
            <g transform="translate(20, 30)">
              <text x="0" y="12" fill={colors.voltage} fontSize="11">Voltage (Voc):</text>
              <text x="90" y="12" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
                {values.Voc.toFixed(1)}V
              </text>
              <text x="130" y="12" fill={values.deltaT > 0 ? colors.error : colors.success} fontSize="10">
                ({values.deltaT > 0 ? '' : '+'}{(-values.deltaT * TEMP_COEFF_VOC * 100).toFixed(1)}%)
              </text>
            </g>

            {/* Current */}
            <g transform="translate(200, 30)">
              <text x="0" y="12" fill={colors.current} fontSize="11">Current (Isc):</text>
              <text x="90" y="12" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
                {values.Isc.toFixed(2)}A
              </text>
            </g>

            {/* Power */}
            <g transform="translate(20, 55)">
              <text x="0" y="12" fill={colors.power} fontSize="12" fontWeight="bold">Power (Pmax):</text>
              <text x="110" y="12" fill={colors.textPrimary} fontSize="14" fontWeight="bold">
                {values.Pmax.toFixed(0)}W
              </text>
              <text x="160" y="12" fill={values.deltaT > 0 ? colors.error : colors.success} fontSize="11">
                ({values.powerLoss > 0 ? '-' : '+'}{Math.abs(values.powerLoss).toFixed(0)}W from temp)
              </text>
            </g>

            {/* Efficiency */}
            <g transform="translate(200, 55)">
              <text x="0" y="12" fill={colors.accent} fontSize="11">Efficiency:</text>
              <text x="70" y="12" fill={colors.textPrimary} fontSize="11" fontWeight="bold">
                {values.efficiency.toFixed(1)}%
              </text>
            </g>
          </g>

          {/* Power vs Temperature graph */}
          <g transform="translate(20, 250)">
            <rect x="0" y="0" width="360" height="100" fill="rgba(0,0,0,0.3)" rx="6" />
            <text x="180" y="15" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="bold">
              Power Output vs Panel Temperature (at {irradiance} W/m²)
            </text>

            {/* Axes */}
            <line x1="40" y1="85" x2="340" y2="85" stroke={colors.textMuted} strokeWidth="1" />
            <line x1="40" y1="25" x2="40" y2="85" stroke={colors.textMuted} strokeWidth="1" />

            {/* X-axis labels */}
            <text x="40" y="95" fill={colors.textMuted} fontSize="8" textAnchor="middle">-10°C</text>
            <text x="115" y="95" fill={colors.textMuted} fontSize="8" textAnchor="middle">10°C</text>
            <text x="190" y="95" fill={colors.textSecondary} fontSize="8" textAnchor="middle" fontWeight="bold">25°C (STC)</text>
            <text x="265" y="95" fill={colors.textMuted} fontSize="8" textAnchor="middle">45°C</text>
            <text x="340" y="95" fill={colors.textMuted} fontSize="8" textAnchor="middle">70°C</text>

            {/* Power line (decreasing with temperature) */}
            <path
              d={`M40,${25 + 60 * (1 - (STC_PMAX * (1 + TEMP_COEFF_PMAX * (-10 - STC_TEMP)) * (irradiance / STC_IRRADIANCE)) / (STC_PMAX * 1.2))}
                  L340,${25 + 60 * (1 - (STC_PMAX * (1 + TEMP_COEFF_PMAX * (70 - STC_TEMP)) * (irradiance / STC_IRRADIANCE)) / (STC_PMAX * 1.2))}`}
              fill="none"
              stroke={colors.power}
              strokeWidth="2"
            />

            {/* STC reference line */}
            <line x1="190" y1="25" x2="190" y2="85" stroke={colors.accent} strokeWidth="1" strokeDasharray="4,4" />

            {/* Current operating point */}
            <circle
              cx={40 + 300 * ((panelTemperature + 10) / 80)}
              cy={25 + 60 * (1 - values.Pmax / (STC_PMAX * 1.2))}
              r="6"
              fill={colors.accent}
              stroke="white"
              strokeWidth="2"
              filter="url(#glow)"
            />

            {/* Y-axis label */}
            <text x="25" y="55" fill={colors.textMuted} fontSize="8" transform="rotate(-90, 25, 55)">Power (W)</text>
          </g>

          {/* Season comparison */}
          {showSeason && (
            <g transform="translate(20, 360)">
              <rect x="0" y="0" width="360" height="50" fill={showSeason === 'summer' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.2)'} rx="6" />
              <text x="180" y="18" fill={showSeason === 'summer' ? colors.temperature : colors.cold} fontSize="11" fontWeight="bold" textAnchor="middle">
                {showSeason === 'summer' ? 'Hot Summer Day: 55°C panel, 1000 W/m²' : 'Cold Winter Day: 5°C panel, 800 W/m²'}
              </text>
              <text x="180" y="38" fill={colors.textPrimary} fontSize="12" textAnchor="middle">
                Power Output: {values.Pmax.toFixed(0)}W
                {showSeason === 'summer'
                  ? ` (${((values.powerLoss / STC_PMAX) * 100).toFixed(0)}% temp loss)`
                  : ` (+${((-values.powerLoss / STC_PMAX) * 100).toFixed(0)}% cold bonus)`}
              </text>
            </g>
          )}
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
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop Sweep' : 'Sweep Temperature'}
            </button>
            <button
              onClick={() => setScenario('summer')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: colors.temperature,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Hot Summer
            </button>
            <button
              onClick={() => setScenario('winter')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: colors.cold,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Cold Winter
            </button>
            <button
              onClick={() => { setPanelTemperature(25); setIrradiance(1000); setShowSeason(null); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset to STC
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Panel Temperature: {panelTemperature}°C {panelTemperature === 25 && '(STC)'}
        </label>
        <input
          type="range"
          min="-10"
          max="70"
          step="1"
          value={panelTemperature}
          onInput={(e) => { setPanelTemperature(parseInt((e.target as HTMLInputElement).value)); setShowSeason(null); }}
          onChange={(e) => { setPanelTemperature(parseInt(e.target.value)); setShowSeason(null); }}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Cold (-10°C)</span>
          <span style={{ color: colors.accent }}>STC (25°C)</span>
          <span>Hot Roof (70°C)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Solar Irradiance: {irradiance} W/m² {irradiance === 1000 && '(STC)'}
        </label>
        <input
          type="range"
          min="200"
          max="1200"
          step="50"
          value={irradiance}
          onInput={(e) => { setIrradiance(parseInt((e.target as HTMLInputElement).value)); setShowSeason(null); }}
          onChange={(e) => { setIrradiance(parseInt(e.target.value)); setShowSeason(null); }}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Cloudy (200)</span>
          <span style={{ color: colors.accent }}>STC (1000)</span>
          <span>Peak Sun (1200)</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(168, 85, 247, 0.15)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.power}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Temperature Coefficient
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: 1.5 }}>
          Silicon solar cells lose about 0.3-0.5% power for every degree Celsius above 25°C.
          A panel at 55°C loses ~12% of its rated power just from heat!
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Solar Panel Temperature Coefficient
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do solar panels produce LESS power on hot summer days?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                It seems counterintuitive: sunny hot days should be best for solar power, right?
                But silicon solar cells have a dirty secret - <strong style={{ color: colors.temperature }}>they hate heat</strong>.
                Every degree above 25°C costs you power output.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is why solar panels are rated at 25°C (Standard Test Conditions), and why
                cold sunny days can actually outperform scorching summer afternoons!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try the "Hot Summer" and "Cold Winter" buttons to see the surprising comparison!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You Are Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              The graph shows how power output changes with panel temperature. The panel is rated at
              350W under Standard Test Conditions (25°C, 1000 W/m²). Watch how power changes as temperature varies.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to solar panel power output when it gets hotter?
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
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Temperature Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See how temperature and irradiance affect power output
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Set temperature to 70°C (hot roof) and see power drop</li>
              <li>Set temperature to -10°C (cold day) and see voltage rise</li>
              <li>Compare "Hot Summer" vs "Cold Winter" scenarios</li>
              <li>Notice: voltage changes much more than current with temperature</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'less_power_hot';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Hot panels produce <strong>LESS power</strong> despite receiving more sunlight!
              The voltage drop from heat outweighs any small current increase.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics: Silicon Bandgap</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Why Voltage Drops:</strong> In silicon, the
                bandgap energy (the energy needed to free an electron) decreases with temperature.
                Lower bandgap = lower voltage. This is fundamental physics, not a design flaw!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Numbers:</strong>
                <br/>- Voltage coefficient: -0.3% to -0.5% per °C
                <br/>- Current coefficient: +0.04% to +0.06% per °C
                <br/>- Net power coefficient: -0.3% to -0.5% per °C
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Example:</strong> A 350W panel at 55°C
                (30° above STC) loses about 0.4% × 30 = 12% of its power. That is 42W lost to heat!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>This is why:</strong> Panel datasheets
                always specify temperature coefficients, and installers derate systems for hot climates.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Summer vs Winter: Which season wins?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Compare two days:
              <br/>- <strong style={{ color: colors.temperature }}>Hot Summer:</strong> 1000 W/m² irradiance, 55°C panel temperature
              <br/>- <strong style={{ color: colors.cold }}>Cold Winter:</strong> 800 W/m² irradiance, 5°C panel temperature
              <br/><br/>
              The summer day has 25% more sunlight. But the winter panel is 50°C cooler.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which day produces more power?
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
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Season Comparison</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Click the season buttons to compare actual power output
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Click "Hot Summer" then "Cold Winter" and compare the power outputs.
              The cold day produces competitive power despite 20% less sunlight because
              the temperature bonus is substantial!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'winter_wins';

    // Calculate actual values for both scenarios
    const summerPower = STC_PMAX * (1 + TEMP_COEFF_PMAX * (55 - STC_TEMP)) * (1000 / STC_IRRADIANCE);
    const winterPower = STC_PMAX * (1 + TEMP_COEFF_PMAX * (5 - STC_TEMP)) * (800 / STC_IRRADIANCE);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Surprising, Right?'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              <strong>Cold sunny winter days can match or beat hot summer days!</strong>
              <br/>- Summer (55°C, 1000 W/m²): {summerPower.toFixed(0)}W
              <br/>- Winter (5°C, 800 W/m²): {winterPower.toFixed(0)}W
              <br/><br/>
              The 20% higher irradiance in summer is almost completely negated by the
              temperature losses!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Real-World Implications</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Peak Power Days:</strong> The best solar
                production days are often cool, clear spring or fall days - not the hottest summer days.
                Early morning hours also outperform midday on hot days.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Annual Energy:</strong> While daily peaks
                vary, summer still produces more total energy due to longer days and more sun hours.
                But the efficiency per peak watt is higher in winter!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Design Impact:</strong> This is why
                high-altitude and northern installations can be surprisingly productive. The Atacama
                Desert in Chile (high, cold, clear) has some of the world's best solar resources.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Temperature coefficients affect every solar installation
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
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', WebkitTapHighlightColor: 'transparent' }}
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
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
                {testScore >= 8 ? 'You understand solar temperature coefficients!' : 'Review the material and try again.'}
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
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered solar panel temperature coefficients</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Silicon bandgap decreases with temperature, reducing voltage</li>
              <li>Power coefficient is typically -0.3% to -0.5% per °C</li>
              <li>Standard Test Conditions: 25°C, 1000 W/m²</li>
              <li>Hot panels lose significant power output</li>
              <li>Cold sunny days can outperform hot summer days</li>
              <li>Installation design affects panel cooling and efficiency</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Some advanced solar technologies have better temperature coefficients: HJT (heterojunction)
              cells lose only ~0.25%/°C, and perovskite-silicon tandems show promise for even lower
              temperature sensitivity. As solar moves to hotter climates, these improvements become
              increasingly valuable.
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default SolarTempCoefficientRenderer;
