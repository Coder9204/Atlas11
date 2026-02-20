import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Solar Panel Temperature Coefficient - Complete 10-Phase Self-Managing Game
// ─────────────────────────────────────────────────────────────────────────────

interface SolarTempCoefficientRendererProps {
  onGameEvent?: (event: Record<string, unknown>) => void;
  gamePhase?: string;
  phase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const VALID_PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Explore',
  review: 'Review Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Experiment',
  twist_review: 'Deep Review',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery Complete',
};

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
  voltage: '#3b82f6',
  current: '#22c55e',
  power: '#a855f7',
  temperature: '#ef4444',
  cold: '#06b6d4',
  border: 'rgba(255,255,255,0.1)',
};

// Standard Test Conditions
const STC_TEMP = 25;
const STC_IRRADIANCE = 1000;
const STC_VOC = 40;
const STC_ISC = 10;
const STC_PMAX = 350;
const TEMP_COEFF_VOC = -0.003;
const TEMP_COEFF_ISC = 0.0005;
const TEMP_COEFF_PMAX = -0.004;

const testQuestions = [
  {
    scenario: 'A 350W silicon solar panel is installed on a rooftop in Phoenix, Arizona. On a sunny summer day, the panel temperature reaches 65°C while producing power at 1000 W/m² irradiance.',
    question: 'What is the typical temperature coefficient of power for silicon solar panels?',
    options: [
      { text: 'A) +0.4%/°C (power increases with temperature)', correct: false },
      { text: 'B) -0.3% to -0.5%/°C (power decreases with temperature)', correct: true },
      { text: 'C) 0%/°C (temperature has no effect)', correct: false },
      { text: 'D) -5%/°C (power drops dramatically)', correct: false },
    ],
    explanation: 'Silicon solar cells typically lose 0.3–0.5% of their rated power for every degree Celsius above STC (25°C). At 65°C, that is a 40°C rise — causing approximately 16% power loss.',
  },
  {
    scenario: 'A solar panel datasheet states it is rated at Standard Test Conditions (STC). An engineer is calculating the expected output for a real installation.',
    question: 'At Standard Test Conditions (STC), what is the defined cell temperature?',
    options: [
      { text: 'A) 0°C', correct: false },
      { text: 'B) 25°C', correct: true },
      { text: 'C) 40°C', correct: false },
      { text: 'D) 20°C', correct: false },
    ],
    explanation: 'STC defines cell temperature at 25°C with 1000 W/m² irradiance and AM1.5 spectrum. Real panels often run 20–35°C hotter than ambient, so actual output is nearly always below the STC rating.',
  },
  {
    scenario: 'A physics student is studying how temperature affects semiconductor devices. She heats a silicon solar panel from 25°C to 55°C and measures a voltage drop from 40V to 36.4V.',
    question: 'Why does solar panel voltage decrease when temperature increases?',
    options: [
      { text: 'A) The wires expand and increase resistance', correct: false },
      { text: 'B) The silicon bandgap decreases, reducing the voltage', correct: true },
      { text: 'C) The sun appears dimmer when it is hot', correct: false },
      { text: 'D) The panel glass absorbs more light when hot', correct: false },
    ],
    explanation: 'In silicon, the bandgap energy decreases approximately 0.45 meV per °C. This means less energy is needed to free electrons, which reduces the open-circuit voltage. This is fundamental semiconductor physics.',
  },
  {
    scenario: 'A solar installer is calculating performance for a 350W panel in Saudi Arabia where panel temperatures regularly reach 55°C. The temperature coefficient is -0.4%/°C.',
    question: 'A 350W panel at 25°C is heated to 55°C. How much power is lost? (Use -0.4%/°C)',
    options: [
      { text: 'A) About 4W (negligible)', correct: false },
      { text: 'B) About 42W (12% loss)', correct: true },
      { text: 'C) About 100W (almost 30% loss)', correct: false },
      { text: 'D) No loss — power is independent of temperature', correct: false },
    ],
    explanation: 'Temperature rise = 55 − 25 = 30°C. Power loss = 0.4%/°C × 30°C × 350W = 42W. The panel outputs only 308W at 55°C, a significant 12% reduction that engineers must account for.',
  },
  {
    scenario: 'A solar researcher is comparing how different electrical parameters respond to temperature changes in a silicon photovoltaic module.',
    question: 'What happens to solar panel current when temperature increases?',
    options: [
      { text: 'A) It decreases significantly', correct: false },
      { text: 'B) It stays exactly the same', correct: false },
      { text: 'C) It increases slightly (around +0.05%/°C)', correct: true },
      { text: 'D) It doubles', correct: false },
    ],
    explanation: 'Higher temperature increases the thermal generation of electron-hole pairs, slightly boosting the short-circuit current by about +0.05%/°C. However, this small current gain is far outweighed by the large voltage loss.',
  },
  {
    scenario: 'A homeowner in Colorado wonders why her solar system sometimes produces more power on cold, clear winter days than on hot summer days, even though the summer sun is stronger.',
    question: 'Why might a cold, clear winter day produce as much energy as a hot summer day?',
    options: [
      { text: 'A) Winter sun is actually brighter', correct: false },
      { text: 'B) Higher voltage from cold panels compensates for lower sun angle', correct: true },
      { text: 'C) Panels work better when covered in snow', correct: false },
      { text: 'D) This never actually happens', correct: false },
    ],
    explanation: 'At 0°C (25°C below STC), panels gain approximately 10% more voltage. Combined with clear mountain air and potential snow reflection, cold sunny days can match or exceed hot summer production.',
  },
  {
    scenario: 'A solar engineer is designing a large utility-scale installation in the Mojave Desert where ambient temperatures reach 45°C and panels can exceed 70°C in summer.',
    question: 'How do installers compensate for temperature losses in hot climates?',
    options: [
      { text: 'A) Install fewer panels since they produce more heat', correct: false },
      { text: 'B) Install more capacity and use designs that promote cooling', correct: true },
      { text: 'C) Cover panels with white paint to reflect heat', correct: false },
      { text: 'D) Only operate panels at night', correct: false },
    ],
    explanation: 'Engineers oversize the system by 10–20% to account for temperature derating. They also use elevated mounting for airflow, optimize tilt angles, and select panels with better temperature coefficients.',
  },
  {
    scenario: 'A solar panel manufacturer publishes a NOCT value of 47°C in their datasheet. An energy auditor needs to understand what this means for real-world performance prediction.',
    question: 'What is NOCT (Nominal Operating Cell Temperature)?',
    options: [
      { text: 'A) The maximum safe temperature for a panel', correct: false },
      { text: 'B) The expected cell temperature at 800 W/m², 20°C air, 1 m/s wind', correct: true },
      { text: 'C) The temperature where efficiency is highest', correct: false },
      { text: 'D) The temperature used for warranty calculations', correct: false },
    ],
    explanation: 'NOCT is a standardized test condition representing realistic outdoor operating conditions. It helps predict how much hotter panels will run above ambient. A NOCT of 47°C means panels typically run ~27°C above ambient air.',
  },
  {
    scenario: 'A solar developer is evaluating four potential sites for a large-scale installation and needs to select the location that will deliver the best panel efficiency.',
    question: 'Which location would likely have the best solar panel efficiency?',
    options: [
      { text: 'A) A hot, humid tropical beach', correct: false },
      { text: 'B) A cold, high-altitude desert', correct: true },
      { text: 'C) A hot, sunny parking lot', correct: false },
      { text: 'D) An indoor greenhouse', correct: false },
    ],
    explanation: 'Cold temperatures keep panel voltage high, while high altitude provides more intense direct radiation through less atmosphere. The Atacama Desert in Chile (cold nights, thin air, intense sun) has some of the world\'s highest solar yields per panel.',
  },
  {
    scenario: 'A financial analyst is comparing two solar panel brands: Panel A has a power temperature coefficient of -0.35%/°C and Panel B has -0.45%/°C. Both are 400W panels.',
    question: 'If a panel is rated at -0.35%/°C power temperature coefficient, what does this mean?',
    options: [
      { text: 'A) The panel loses 0.35W for every degree above 0°C', correct: false },
      { text: 'B) The panel loses 0.35% of its STC power for every degree above 25°C', correct: true },
      { text: 'C) The panel gains 0.35% efficiency when heated', correct: false },
      { text: 'D) The coefficient only applies below freezing', correct: false },
    ],
    explanation: 'The coefficient applies relative to the STC reference temperature (25°C). Panel A loses 0.35% × 400W = 1.4W per degree above 25°C. At 55°C (30°C above STC), Panel A loses 42W vs Panel B\'s 54W — a meaningful difference over a 25-year lifetime.',
  },
];

const realWorldApps = [
  {
    icon: '🏜️',
    title: 'Desert Solar Farm Engineering',
    description: 'Solar farms in desert regions like Arizona or Saudi Arabia face extreme panel temperatures exceeding 70°C. Engineers must oversize systems and use advanced cooling strategies to compensate for temperature-related efficiency losses.',
    question: 'How do engineers compensate for temperature losses in hot climates?',
    answer: 'Engineers install 10–20% more panel capacity than the nameplate rating to compensate for efficiency losses. They use elevated mounting for air circulation, wider row spacing, and choose panels with better temperature coefficients (-0.35%/°C vs -0.45%/°C). Some advanced systems use single-axis trackers that reduce time at peak sun angles.',
    stats: [
      { value: '20%', label: 'Typical summer efficiency loss' },
      { value: '70°C', label: 'Peak desert panel temp' },
      { value: '180 GW', label: 'Planned MENA solar by 2030' },
    ],
    companies: ['ACWA Power', 'Masdar', 'First Solar', 'Enel Green Power'],
  },
  {
    icon: '❄️',
    title: 'Cold Climate Solar Advantages',
    description: 'Contrary to intuition, cold sunny regions like Colorado mountains or Scandinavian summers can achieve excellent solar yields. Cool panels maintain higher voltage and efficiency, often outperforming warmer locations.',
    question: 'Why do cold regions sometimes outperform hot sunny areas on a per-panel basis?',
    answer: 'At 0°C, panels gain approximately 10% more voltage compared to 25°C STC. Snow reflection (albedo) can add 20–30% to incident light. Clear mountain air provides higher direct normal irradiance. The net effect often matches or exceeds hot climate production despite shorter days.',
    stats: [
      { value: '+10%', label: 'Cold weather efficiency gain' },
      { value: '30%', label: 'Boost from snow reflection' },
      { value: '2200', label: 'Peak sun hours in Alaska summer' },
    ],
    companies: ['Meyer Burger', 'REC Solar', 'Canadian Solar', 'Norwegian solar firms'],
  },
  {
    icon: '🏢',
    title: 'Building-Integrated Solar Design',
    description: 'Building-integrated photovoltaics (BIPV) replace traditional building materials with solar elements. Designers must carefully consider ventilation and thermal management to prevent efficiency losses from building-trapped heat.',
    question: 'Why is ventilation critical for rooftop solar panels?',
    answer: 'Rooftop panels can run 20–30°C hotter than ground-mounted systems if air cannot circulate underneath. That extra heat causes 8–12% more power loss. Raised mounting rails that allow airflow reduce operating temperature, recovering much of this loss. BIPV facades with ventilated cavities can generate energy while improving building envelope performance.',
    stats: [
      { value: '$11B', label: 'BIPV market by 2028' },
      { value: '25°C', label: 'Typical roof vs ground-mount temp difference' },
      { value: '8–12%', label: 'Power loss from poor ventilation' },
    ],
    companies: ['Tesla Solar Roof', 'SunPower', 'Onyx Solar', 'Solarcentury'],
  },
  {
    icon: '📊',
    title: 'Solar Investment Analysis',
    description: 'Solar project investors and banks use sophisticated models to predict energy yield and financial returns. Temperature coefficients are essential inputs that can make or break project economics in different climates.',
    question: 'How do temperature coefficients affect solar project financing?',
    answer: 'PVsyst and similar software model hourly temperatures from weather data, apply panel temperature coefficients, and calculate derated output. A -0.4%/°C coefficient might reduce annual yield by 5–15% depending on location. Banks require P90/P99 estimates accounting for year-to-year climate variation. Better temperature coefficients directly increase revenue and improve loan terms.',
    stats: [
      { value: '$350B', label: 'Annual solar investment globally' },
      { value: '5–15%', label: 'Temperature derating range by location' },
      { value: '25 yrs', label: 'Typical financial model horizon' },
    ],
    companies: ['Goldman Sachs', 'BlackRock', 'Brookfield', 'Climate finance firms'],
  },
];

const SolarTempCoefficientRenderer: React.FC<SolarTempCoefficientRendererProps> = ({
  onGameEvent,
  gamePhase,
  phase: phaseProp,
}) => {
  // Self-managing phase state
  const getInitialPhase = (): Phase => {
    const candidate = gamePhase || phaseProp;
    if (candidate && VALID_PHASES.includes(candidate as Phase)) {
      return candidate as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Simulation state
  const [panelTemperature, setPanelTemperature] = useState(25);
  const [irradiance, setIrradiance] = useState(1000);
  const [showSeason, setShowSeason] = useState<'summer' | 'winter' | null>(null);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase navigation
  const phaseOrder = VALID_PHASES;

  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({ eventType: 'phase_changed', details: { phase: p }, timestamp: Date.now() });
    }
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const prevPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Physics calculations with useMemo for performance
  const values = useMemo(() => {
    const deltaT = panelTemperature - STC_TEMP;
    const irradianceRatio = irradiance / STC_IRRADIANCE;
    const voltageTemperatureEffect = 1 + TEMP_COEFF_VOC * deltaT;
    const voltageIrradianceEffect = 1 + 0.025 * Math.log(irradianceRatio + 0.001);
    const Voc = STC_VOC * voltageTemperatureEffect * Math.max(0.5, voltageIrradianceEffect);
    const currentTemperatureEffect = 1 + TEMP_COEFF_ISC * deltaT;
    const Isc = STC_ISC * currentTemperatureEffect * irradianceRatio;
    const powerTemperatureEffect = 1 + TEMP_COEFF_PMAX * deltaT;
    const Pmax = STC_PMAX * powerTemperatureEffect * irradianceRatio;
    const panelArea = 1.7;
    const powerIn = irradiance * panelArea;
    const efficiency = (Pmax / powerIn) * 100;
    const voltageLoss = STC_VOC * TEMP_COEFF_VOC * deltaT;
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

  const setScenario = useCallback((scenario: 'summer' | 'winter') => {
    if (scenario === 'summer') {
      setPanelTemperature(55);
      setIrradiance(1000);
      setShowSeason('summer');
    } else {
      setPanelTemperature(5);
      setIrradiance(800);
      setShowSeason('winter');
    }
  }, []);

  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    setTestAnswers(prev => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }, []);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
  }, [testAnswers]);

  // ─── SVG Visualization ─────────────────────────────────────────────────────
  const renderVisualization = (interactive: boolean) => {
    const svgWidth = 500;
    const svgHeight = 400;

    // Graph dimensions — large enough to show visible change
    const graphX = 55;
    const graphY = 200;
    const graphW = 380;
    const graphH = 175;

    // Power axis: 250W to 420W (narrowed to increase visual range)
    const PWR_MIN = 240;
    const PWR_MAX = 420;

    // Compute interactive point position
    const iX = graphX + ((panelTemperature + 10) / 80) * graphW;
    const iY = graphY + graphH - ((values.Pmax - PWR_MIN) / (PWR_MAX - PWR_MIN)) * graphH;
    const clampedIY = Math.max(graphY, Math.min(graphY + graphH, iY));

    // Temperature gradient color
    const getTempColor = () => {
      if (panelTemperature < 10) return colors.cold;
      if (panelTemperature < 25) return colors.success;
      if (panelTemperature < 40) return colors.warning;
      return colors.temperature;
    };

    const tempBlend = Math.max(0, Math.min(1, (panelTemperature + 10) / 80));

    // Power curve path
    const powerCurvePath = (() => {
      const pts: string[] = [];
      for (let t = -10; t <= 70; t += 5) {
        const p = STC_PMAX * (1 + TEMP_COEFF_PMAX * (t - STC_TEMP)) * (irradiance / STC_IRRADIANCE);
        const x = graphX + ((t + 10) / 80) * graphW;
        const y = graphY + graphH - ((p - PWR_MIN) / (PWR_MAX - PWR_MIN)) * graphH;
        const clampedY = Math.max(graphY, Math.min(graphY + graphH, y));
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${clampedY.toFixed(1)}`);
      }
      return pts.join(' ');
    })();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '560px' }}
        >
          <defs>
            <linearGradient id="stcSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="50%" stopColor="#1a365d" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <radialGradient id="stcSunCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="80%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
            <radialGradient id="stcSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="stcPanelFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="stcPanelCool" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="stcPanelHot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="50%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="stcPowerLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="stcGraphBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
            </linearGradient>
            <filter id="stcSunGlowF" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="stcPointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="stcSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background */}
          <rect width={svgWidth} height={svgHeight} fill="url(#stcSkyGrad)" />

          {/* Sun */}
          <g transform="translate(65, 70)">
            <circle cx="0" cy="0" r="55" fill="url(#stcSunGlow)" opacity="0.8" />
            <circle cx="0" cy="0" r="28" fill="url(#stcSunCore)" opacity="0.9" />
            <circle cx="-7" cy="-7" r="8" fill="#ffffff" opacity="0.25" />
            {/* Sun rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={`ray-${i}`}
                x1={Math.cos(angle * Math.PI / 180) * 32}
                y1={Math.sin(angle * Math.PI / 180) * 32}
                x2={Math.cos(angle * Math.PI / 180) * 44}
                y2={Math.sin(angle * Math.PI / 180) * 44}
                stroke="#fde047"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.7"
              />
            ))}
            {/* Irradiance label — positioned well below sun */}
            <text x="0" y="68" fill={colors.textPrimary} fontSize="11" fontWeight="bold" textAnchor="middle">
              {irradiance} W/m²
            </text>
          </g>

          {/* Solar rays hitting panel */}
          <g opacity="0.5">
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`sray-${i}`}
                x1={90 + i * 8}
                y1={80 + i * 4}
                x2={175 + i * 20}
                y2={100}
                stroke="url(#stcPowerLine)"
                strokeWidth="1.5"
                strokeDasharray="6,4"
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* Solar Panel */}
          <g transform="translate(155, 60)" filter="url(#stcSoftShadow)">
            {/* Mounting bracket */}
            <rect x="60" y="96" width="44" height="10" fill="url(#stcPanelFrame)" rx="2" />
            <rect x="78" y="104" width="14" height="20" fill="url(#stcPanelFrame)" rx="2" />
            {/* Panel frame */}
            <rect x="-5" y="-5" width="175" height="105" fill="url(#stcPanelFrame)" rx="6" />
            {/* Panel cells */}
            <rect x="0" y="0" width="165" height="95" rx="3"
              fill={tempBlend > 0.5 ? 'url(#stcPanelHot)' : 'url(#stcPanelCool)'}
              opacity={1 - tempBlend * 0.25}
            />
            {/* Cell grid */}
            {[1,2,3,4,5].map(i => (
              <line key={`hg-${i}`} x1="0" y1={i * 15.5} x2="165" y2={i * 15.5} stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            ))}
            {[1,2,3,4,5,6,7,8].map(i => (
              <line key={`vg-${i}`} x1={i * 18.3} y1="0" x2={i * 18.3} y2="95" stroke="#0f172a" strokeWidth="1" strokeOpacity="0.5" />
            ))}
            {/* Glass reflection */}
            <rect x="0" y="0" width="165" height="95" rx="3" fill="rgba(255,255,255,0.08)" />
            {/* Temperature badge — raw text y=55 to avoid thermometer/output row text overlap */}
            <g transform="translate(52, 22)">
              <rect x="0" y="28" width="62" height="28" rx="6" fill="rgba(0,0,0,0.85)" stroke={getTempColor()} strokeWidth="2" />
              <text x="31" y="50" fill={getTempColor()} fontSize="15" fontWeight="bold" textAnchor="middle">
                {panelTemperature}°C
              </text>
            </g>
            {/* Panel label removed from SVG to avoid text overlap with thermometer scale and output row */}
          </g>

          {/* Thermometer */}
          <g transform="translate(400, 50)">
            {/* Thermometer body */}
            <rect x="10" y="0" width="26" height="120" rx="13" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            {/* Mercury */}
            {(() => {
              const mercH = Math.max(5, 100 * ((panelTemperature + 10) / 80));
              const mercY = 10 + 100 - mercH;
              const mercGrad = panelTemperature < 15 ? colors.cold : panelTemperature < 40 ? colors.warning : colors.temperature;
              return <rect x="17" y={mercY} width="12" height={mercH} rx="5" fill={mercGrad} />;
            })()}
            {/* Bulb */}
            <circle cx="23" cy="128" r="11" fill={getTempColor()} />
            <circle cx="20" cy="125" r="4" fill="#ffffff" opacity="0.25" />
            {/* Scale marks — text at x=72 to avoid x overlap with panel badge (right edge ~49) */}
            {[-10, 10, 25, 40, 70].map(temp => {
              const yp = 10 + (1 - (temp + 10) / 80) * 100;
              return (
                <g key={`tm-${temp}`}>
                  <line x1="8" y1={yp} x2="36" y2={yp} stroke={colors.textMuted} strokeWidth="1" />
                  <text x="72" y={yp + 4} fill={temp === 25 ? colors.accent : colors.textMuted} fontSize="11" fontWeight={temp === 25 ? 'bold' : 'normal'}>
                    {temp}°
                  </text>
                </g>
              );
            })}
            {/* Label — positioned to not overlap scale */}
            <text x="23" y="148" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="bold">Temp</text>
          </g>

          {/* Output display row — moved to translate(20,150) so computed title y=164, clear of graph title y=180 */}
          <g transform="translate(20, 150)">
            <rect x="0" y="0" width="460" height="40" rx="8" fill="rgba(15,23,42,0.9)" stroke={colors.accent} strokeWidth="1" />
            {/* Title */}
            <text x="230" y="14" fill={colors.accent} fontSize="11" fontWeight="bold" textAnchor="middle">
              Panel Output vs STC (25°C, 1000 W/m²)
            </text>
            {/* Voltage */}
            <text x="30" y="32" fill={colors.voltage} fontSize="11" fontWeight="bold">Voc:</text>
            <text x="65" y="32" fill={colors.textPrimary} fontSize="11" fontWeight="bold">{values.Voc.toFixed(1)}V</text>
            {/* Current */}
            <text x="135" y="32" fill={colors.current} fontSize="11" fontWeight="bold">Isc:</text>
            <text x="165" y="32" fill={colors.textPrimary} fontSize="11" fontWeight="bold">{values.Isc.toFixed(2)}A</text>
            {/* Power */}
            <text x="245" y="32" fill={colors.power} fontSize="12" fontWeight="bold">Pmax:</text>
            <text x="290" y="32" fill={colors.textPrimary} fontSize="12" fontWeight="bold">{values.Pmax.toFixed(0)}W</text>
            {/* Efficiency */}
            <text x="360" y="32" fill={colors.accent} fontSize="11" fontWeight="bold">η:</text>
            <text x="378" y="32" fill={colors.textPrimary} fontSize="11" fontWeight="bold">{values.efficiency.toFixed(1)}%</text>
          </g>

          {/* Temperature vs Power Graph */}
          <g transform="translate(0, 0)">
            {/* Graph background */}
            <rect x={graphX} y={graphY} width={graphW} height={graphH} rx="6" fill="url(#stcGraphBg)" stroke="#334155" strokeWidth="1" />

            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`gh-${i}`}
                x1={graphX}
                y1={graphY + (i / 4) * graphH}
                x2={graphX + graphW}
                y2={graphY + (i / 4) * graphH}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            ))}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line
                key={`gv-${i}`}
                x1={graphX + (i / 5) * graphW}
                y1={graphY}
                x2={graphX + (i / 5) * graphW}
                y2={graphY + graphH}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            ))}

            {/* Y-axis */}
            <line x1={graphX} y1={graphY} x2={graphX} y2={graphY + graphH} stroke={colors.textMuted} strokeWidth="1.5" />
            {/* X-axis */}
            <line x1={graphX} y1={graphY + graphH} x2={graphX + graphW} y2={graphY + graphH} stroke={colors.textMuted} strokeWidth="1.5" />

            {/* Y-axis label (rotated) — moved left to avoid y-tick overlap */}
            <text
              x={graphX - 38}
              y={graphY + graphH / 2}
              fill={colors.textMuted}
              fontSize="11"
              textAnchor="middle"
              transform={`rotate(-90, ${graphX - 38}, ${graphY + graphH / 2})`}
            >
              Power (W)
            </text>

            {/* Y-axis ticks — only top and bottom to avoid overlap with Y-axis label */}
            {[PWR_MAX, PWR_MIN].map((val, i) => {
              const y = graphY + (i === 0 ? 0 : graphH);
              return (
                <text key={`yt-${i}`} x={graphX - 5} y={y + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">
                  {val}
                </text>
              );
            })}

            {/* X-axis labels — offset to avoid y-tick overlap */}
            <text x={graphX} y={graphY + graphH + 22} fill={colors.textMuted} fontSize="11" textAnchor="middle">-10°C</text>
            <text x={graphX + graphW * 0.25} y={graphY + graphH + 22} fill={colors.textMuted} fontSize="11" textAnchor="middle">10°C</text>
            <text x={graphX + graphW * 0.4375} y={graphY + graphH + 22} fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="bold">25°C</text>
            <text x={graphX + graphW * 0.625} y={graphY + graphH + 22} fill={colors.textMuted} fontSize="11" textAnchor="middle">40°C</text>
            <text x={graphX + graphW} y={graphY + graphH + 22} fill={colors.textMuted} fontSize="11" textAnchor="middle">70°C</text>

            {/* Graph title — moved to avoid overlap with STC label */}
            <text x={graphX + graphW / 2} y={graphY - 20} fill={colors.textPrimary} fontSize="11" fontWeight="bold" textAnchor="middle">
              Power Output vs Panel Temperature
            </text>
            <text x={graphX + graphW / 2} y={graphY - 4} fill={colors.textMuted} fontSize="11" textAnchor="middle">
              ({irradiance} W/m²)
            </text>

            {/* STC reference line */}
            <line
              x1={graphX + ((25 + 10) / 80) * graphW}
              y1={graphY}
              x2={graphX + ((25 + 10) / 80) * graphW}
              y2={graphY + graphH}
              stroke={colors.accent}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.7"
            />
            <text
              x={graphX + ((25 + 10) / 80) * graphW + 12}
              y={graphY + 14}
              fill={colors.accent}
              fontSize="11"
              textAnchor="start"
            >
              STC
            </text>

            {/* Power curve */}
            <path
              d={powerCurvePath}
              fill="none"
              stroke="url(#stcPowerLine)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive operating point */}
            <line
              x1={iX}
              y1={clampedIY}
              x2={iX}
              y2={graphY + graphH}
              stroke={colors.accent}
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
            <circle cx={iX} cy={clampedIY} r="10" fill={colors.accent} opacity="0.25" filter="url(#stcPointGlow)" />
            <circle cx={iX} cy={clampedIY} r="7" fill={colors.accent} stroke="#ffffff" strokeWidth="2" filter="url(#stcPointGlow)" />
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '4px' }}>
            <button
              onClick={() => setScenario('summer')}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: `linear-gradient(135deg, ${colors.temperature} 0%, #dc2626 100%)`,
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
            >
              ☀️ Hot Summer
            </button>
            <button
              onClick={() => setScenario('winter')}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: `linear-gradient(135deg, ${colors.cold} 0%, #0891b2 100%)`,
                color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
            >
              ❄️ Cold Winter
            </button>
            <button
              onClick={() => { setPanelTemperature(25); setIrradiance(1000); setShowSeason(null); }}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(245,158,11,0.1)',
                color: colors.accent, fontWeight: 'bold', cursor: 'pointer', fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
            >
              Reset STC
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Slider Controls ────────────────────────────────────────────────────────
  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Panel Temperature: <strong style={{ color: colors.textPrimary }}>{panelTemperature}°C</strong>
          {panelTemperature === 25 && <span style={{ color: colors.accent }}> (STC reference)</span>}
        </label>
        <input
          type="range"
          min="-10"
          max="70"
          step="1"
          value={panelTemperature}
          onInput={(e) => { setPanelTemperature(parseInt((e.target as HTMLInputElement).value)); setShowSeason(null); }}
          onChange={(e) => { setPanelTemperature(parseInt(e.target.value)); setShowSeason(null); }}
          style={{
            width: '100%',
            height: '20px',
            cursor: 'pointer',
            accentColor: '#3b82f6',
            WebkitAppearance: 'none',
            touchAction: 'pan-y',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          <span>Cold (-10°C)</span>
          <span style={{ color: colors.accent }}>STC (25°C)</span>
          <span>Hot Roof (70°C)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
          Solar Irradiance: <strong style={{ color: colors.textPrimary }}>{irradiance} W/m²</strong>
          {irradiance === 1000 && <span style={{ color: colors.accent }}> (STC reference)</span>}
        </label>
        <input
          type="range"
          min="200"
          max="1200"
          step="50"
          value={irradiance}
          onInput={(e) => { setIrradiance(parseInt((e.target as HTMLInputElement).value)); setShowSeason(null); }}
          onChange={(e) => { setIrradiance(parseInt(e.target.value)); setShowSeason(null); }}
          style={{
            width: '100%',
            height: '20px',
            cursor: 'pointer',
            accentColor: '#3b82f6',
            WebkitAppearance: 'none',
            touchAction: 'pan-y',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          <span>Cloudy (200)</span>
          <span style={{ color: colors.accent }}>STC (1000)</span>
          <span>Peak Sun (1200)</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(168,85,247,0.12)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.power}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Temperature Coefficient — defined as
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.5 }}>
          Power coefficient = <strong style={{ color: colors.power }}>-0.4%/°C</strong> above 25°C.
          This formula calculated: P(T) = P_STC × [1 + (T − 25) × (−0.004)].
          Because voltage decreases with heat, panels lose ~12% power at 55°C. That is why installers derate systems for hot climates.
        </div>
      </div>
    </div>
  );

  // ─── Progress Bar ───────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.border,
      zIndex: 200,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.solar})`,
        transition: 'width 0.3s ease',
      }} />
    </header>
  );

  // ─── Bottom Nav ─────────────────────────────────────────────────────────────
  const renderBottomNav = (canProceed: boolean = true) => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgDark,
        borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.35)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        minHeight: '60px',
      }}>
        {/* Back button */}
        <button
          onClick={prevPhase}
          disabled={isFirst}
          style={{
            minHeight: '44px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textSecondary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            opacity: isFirst ? 0.4 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          ← Back
        </button>

        {/* Navigation dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flex: 1, paddingLeft: '8px', paddingRight: '8px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              aria-label={PHASE_LABELS[p]}
              style={{
                width: '32px',
                minHeight: '44px',
                borderRadius: '16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <span style={{
                width: phase === p ? '18px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
                transition: 'all 0.3s ease',
                display: 'block',
              }} />
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={nextPhase}
          disabled={isLast || !canProceed}
          style={{
            minHeight: '44px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: isLast || !canProceed
              ? 'rgba(255,255,255,0.1)'
              : `linear-gradient(135deg, ${colors.accent}, ${colors.solar})`,
            color: isLast || !canProceed ? colors.textMuted : 'white',
            cursor: isLast || !canProceed ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            opacity: isLast || !canProceed ? 0.4 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          Next →
        </button>
      </nav>
    );
  };

  // ─── Phase layouts ──────────────────────────────────────────────────────────
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    paddingTop: '48px',
    paddingBottom: '100px',
    background: colors.bgPrimary,
    overflowX: 'hidden',
  };

  // ── HOOK ────────────────────────────────────────────────────────────────────
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: isMobile ? '24px' : '32px', marginBottom: '8px', fontWeight: 800 }}>
              Solar Panel Temperature Coefficient
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '17px', marginBottom: '20px', fontWeight: 400 }}>
              Why do solar panels produce LESS power on hot summer days?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '20px' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px', borderLeft: `4px solid ${colors.temperature}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.7 }}>
                It seems counterintuitive: sunny hot days should produce the most solar power, right?
                But silicon solar cells have an important physical limitation — <strong style={{ color: colors.temperature }}>they lose efficiency when hot</strong>.
                Every degree above 25°C costs measurable power output because the silicon bandgap decreases with temperature.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', lineHeight: 1.6 }}>
                This is why solar panels are rated at 25°C (Standard Test Conditions, or STC). Engineers must understand
                and plan for temperature-related derating when designing real solar systems.
              </p>
            </div>

            <div style={{ background: 'rgba(245,158,11,0.15)', padding: '16px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>
                Try the "Hot Summer" and "Cold Winter" buttons above to discover the surprising comparison!
                Notice how the operating point moves along the power curve as temperature changes.
              </p>
            </div>
          </div>
        </div>
        {renderBottomNav(true)}
      </div>
    );
  }

  // ── PREDICT ─────────────────────────────────────────────────────────────────
  if (phase === 'predict') {
    const predictions = [
      { id: 'more_power_hot', label: 'More sunlight = more heat = more power output' },
      { id: 'less_power_hot', label: 'Hot panels produce LESS power despite more sunlight' },
      { id: 'same_power', label: 'Temperature does not affect solar panel output' },
      { id: 'only_current', label: 'Only current changes with temperature, not power' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '15px' }}>What You Are Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              The graph shows the relationship between temperature and power output. The panel is rated at
              350W under Standard Test Conditions (STC: 25°C, 1000 W/m²). The dot shows the current operating point.
              Watch how the dot position changes — that represents how much this concept matters.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '16px' }}>
              What do you predict happens to power output when the panel gets hotter?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    background: prediction === p.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {prediction === p.id ? '● ' : '○ '}{p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomNav(!!prediction)}
      </div>
    );
  }

  // ── PLAY ─────────────────────────────────────────────────────────────────────
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '6px', fontSize: isMobile ? '18px' : '22px' }}>
              Explore Temperature Effects
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the sliders below. Notice how the power output changes — that is the temperature coefficient in action.
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
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: '14px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Set temperature to 70°C — observe the power drop below 280W</li>
              <li>Set temperature to -10°C — observe higher voltage and efficiency</li>
              <li>Compare "Hot Summer" (55°C) vs "Cold Winter" (5°C) — which wins?</li>
              <li>Notice: voltage changes much more than current with temperature changes</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(59,130,246,0.1)', margin: '16px', padding: '14px', borderRadius: '8px', borderLeft: `3px solid ${colors.voltage}` }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>
              <strong style={{ color: colors.textPrimary }}>Why this matters in engineering:</strong> Solar installers must derate system
              capacity for hot climates. A 100kW system in Arizona may only produce 85kW on a hot summer afternoon.
              Understanding temperature coefficients is essential for accurate energy yield predictions and financial models.
            </p>
          </div>
        </div>
        {renderBottomNav(true)}
      </div>
    );
  }

  // ── REVIEW ──────────────────────────────────────────────────────────────────
  if (phase === 'review') {
    const wasCorrect = prediction === 'less_power_hot';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: '18px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.6 }}>
              As you saw in the experiment, hot panels produce <strong>LESS power</strong> despite receiving more sunlight.
              Your observation confirms this: the voltage drop from heat outweighs any small current increase.
              The correct answer was: "Hot panels produce LESS power despite more sunlight."
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: '16px' }}>The Physics: Silicon Bandgap</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Why Voltage Drops:</strong> In silicon, the
                bandgap energy (the energy needed to free an electron) decreases with temperature.
                Lower bandgap = lower open-circuit voltage. This is fundamental semiconductor physics, not a design flaw.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Numbers — temperature coefficient formula:</strong>
                <br />• Voltage (Voc): −0.3% to −0.5% per °C above 25°C
                <br />• Current (Isc): +0.04% to +0.06% per °C (slight increase)
                <br />• Net power (Pmax): −0.3% to −0.5% per °C
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Example calculation:</strong> A 350W panel at 55°C
                (30°C above STC) loses: 0.4% × 30 = 12% of its power. That is 42W lost to heat — enough to power
                a laptop or LED lighting!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>This is why</strong> panel datasheets always specify temperature coefficients,
                and why installers derate systems for hot climates. The relationship is: P(T) = P_STC × [1 + γ × (T − 25)], where
                γ is typically −0.004 (−0.4%/°C) for standard silicon panels.
              </p>
            </div>
          </div>
        </div>
        {renderBottomNav(true)}
      </div>
    );
  }

  // ── TWIST PREDICT ────────────────────────────────────────────────────────────
  if (phase === 'twist_predict') {
    const twistPredictions = [
      { id: 'summer_wins', label: 'Hot summer days always produce more energy (more sun = more power)' },
      { id: 'winter_wins', label: 'Cold sunny winter days can match or beat hot summer days' },
      { id: 'spring_fall', label: 'Only spring and fall produce good power (moderate temperature)' },
      { id: 'temperature_irrelevant', label: 'Seasonal temperature differences are too small to matter' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: isMobile ? '20px' : '24px' }}>
              ⚡ The Twist: Summer vs Winter
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Now that you know temperature reduces power — which season produces more energy?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '15px' }}>The Setup — compare these two days:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              • <strong style={{ color: colors.temperature }}>Hot Summer:</strong> 1000 W/m² irradiance, 55°C panel temperature
              <br />• <strong style={{ color: colors.cold }}>Cold Winter:</strong> 800 W/m² irradiance, 5°C panel temperature
              <br /><br />
              The summer day has 25% more sunlight. But the winter panel is 50°C cooler.
              Which effect is stronger — what do you think will happen?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: '16px' }}>
              Which day produces more power?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                    background: twistPrediction === p.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {twistPrediction === p.id ? '● ' : '○ '}{p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomNav(!!twistPrediction)}
      </div>
    );
  }

  // ── TWIST PLAY ───────────────────────────────────────────────────────────────
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: isMobile ? '20px' : '24px' }}>
              Season Comparison
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Click the season buttons to compare actual power output — see how temperature and irradiance interact.
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

          <div style={{ background: 'rgba(245,158,11,0.15)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: '14px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Click "Hot Summer" then "Cold Winter" and observe the power outputs in the graph.
              The cold day with 20% less sunlight often produces competitive power because the
              temperature coefficient creates a substantial voltage advantage. Notice how the operating dot
              moves along the curve.
            </p>
          </div>
        </div>
        {renderBottomNav(true)}
      </div>
    );
  }

  // ── TWIST REVIEW ─────────────────────────────────────────────────────────────
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'winter_wins';
    const summerPower = STC_PMAX * (1 + TEMP_COEFF_PMAX * (55 - STC_TEMP)) * (1000 / STC_IRRADIANCE);
    const winterPower = STC_PMAX * (1 + TEMP_COEFF_PMAX * (5 - STC_TEMP)) * (800 / STC_IRRADIANCE);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: '18px' }}>
              {wasCorrect ? '✓ Correct!' : '⚡ Surprising, Right?'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.6 }}>
              <strong>Cold sunny winter days can match or beat hot summer days!</strong>
              <br />• Summer (55°C, 1000 W/m²): <strong style={{ color: colors.temperature }}>{summerPower.toFixed(0)}W</strong>
              <br />• Winter (5°C, 800 W/m²): <strong style={{ color: colors.cold }}>{winterPower.toFixed(0)}W</strong>
              <br /><br />
              The 25% higher irradiance in summer is largely negated by temperature losses.
              The experiment demonstrates this relationship directly.
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontSize: '16px' }}>Real-World Implications</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Peak Power Days:</strong> The best solar
                production days are often cool, clear spring or fall days — not the hottest summer days.
                Early morning hours also outperform midday on hot days because panels are cooler.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Annual Energy:</strong> While daily peaks
                vary, summer still produces more total annual energy due to longer days and more sun hours.
                But efficiency per watt is higher in cooler conditions.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Design Impact:</strong> This is why
                high-altitude installations can be surprisingly productive. The Atacama Desert in Chile
                (high altitude, cold nights, intense UV) has some of the world's best solar resources.
              </p>
            </div>
          </div>
        </div>
        {renderBottomNav(true)}
      </div>
    );
  }

  // ── TRANSFER ──────────────────────────────────────────────────────────────────
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '6px', textAlign: 'center', fontSize: isMobile ? '20px' : '24px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontSize: '14px' }}>
              Temperature coefficients affect every solar installation worldwide
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test ({transferCompleted.size}/4)
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '0 16px 8px' }}>
            <button
              onClick={nextPhase}
              disabled={transferCompleted.size < 4}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: transferCompleted.size >= 4
                  ? `linear-gradient(135deg, ${colors.success}, #059669)`
                  : 'rgba(255,255,255,0.1)',
                color: transferCompleted.size >= 4 ? 'white' : colors.textMuted,
                cursor: transferCompleted.size >= 4 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 600,
                opacity: transferCompleted.size >= 4 ? 1 : 0.5,
              }}
            >
              Got It — Continue to Test
            </button>
          </div>

          {realWorldApps.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : `1px solid ${colors.border}`,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '22px', marginRight: '8px' }}>{app.icon}</span>
                  <h3 style={{ color: colors.textPrimary, fontSize: '15px', display: 'inline' }}>{app.title}</h3>
                </div>
                {transferCompleted.has(index) && (
                  <span style={{ color: colors.success, fontWeight: 'bold', fontSize: '14px' }}>✓ Done</span>
                )}
              </div>

              <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '10px', lineHeight: 1.5, fontWeight: 400 }}>
                {app.description}
              </p>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {app.stats.map((stat, si) => (
                  <div key={si} style={{ background: 'rgba(245,158,11,0.12)', padding: '6px 12px', borderRadius: '6px', border: `1px solid ${colors.accent}33` }}>
                    <div style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>{stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(245,158,11,0.08)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>

              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'rgba(245,158,11,0.1)',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16,185,129,0.08)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', lineHeight: 1.6 }}>{app.answer}</p>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {app.companies.map((c, ci) => (
                        <span key={ci} style={{ background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '4px', color: colors.voltage, fontSize: '11px' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {}}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.success}`,
                      background: 'rgba(16,185,129,0.1)',
                      color: colors.success,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Got It ✓
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomNav(transferCompleted.size >= 4)}
      </div>
    );
  }

  // ── TEST ─────────────────────────────────────────────────────────────────────
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              border: `2px solid ${testScore >= 8 ? colors.success : colors.error}`,
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>{testScore >= 8 ? '🏆' : '📚'}</div>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontSize: '22px' }}>
                {testScore >= 8 ? 'Excellent Work!' : 'Keep Studying!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: '15px' }}>
                {testScore >= 8 ? 'You understand solar panel temperature coefficients!' : 'Review the material and try again.'}
              </p>
            </div>

            {/* Answer review */}
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: colors.bgCard,
                  margin: '12px 16px',
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textMuted, fontSize: '11px', marginBottom: '4px' }}>Question {qIndex + 1}</p>
                  <p style={{ color: colors.textPrimary, marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>{q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '6px 10px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct
                        ? 'rgba(16,185,129,0.15)'
                        : userAnswer === oIndex ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textMuted,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      {opt.correct && <span>✓</span>}
                      {!opt.correct && userAnswer === oIndex && <span>✗</span>}
                      {opt.text}
                    </div>
                  ))}
                  {userAnswer !== null && (
                    <div style={{ background: 'rgba(59,130,246,0.1)', padding: '8px 10px', borderRadius: '6px', marginTop: '8px' }}>
                      <p style={{ color: colors.voltage, fontSize: '12px', lineHeight: 1.5 }}><strong>Explanation:</strong> {q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {renderBottomNav(testScore >= 8)}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: isMobile ? '16px' : '18px' }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>

            {/* Scenario context */}
            <div style={{ background: 'rgba(59,130,246,0.08)', padding: '14px 16px', borderRadius: '10px', marginBottom: '14px', borderLeft: `3px solid ${colors.voltage}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>{currentQ.scenario}</p>
            </div>

            {/* Question */}
            <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '15px', lineHeight: 1.5, fontWeight: 600 }}>{currentQ.question}</p>
            </div>

            {/* Answer options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => {
                const isSelected = testAnswers[currentTestQuestion] === oIndex;
                const isChecked = checkedQuestions.has(currentTestQuestion);
                const isCorrect = opt.correct;
                const isWrongSelection = isSelected && isChecked && !isCorrect;
                return (
                  <button
                    key={oIndex}
                    onClick={() => { if (!isChecked) handleTestAnswer(currentTestQuestion, oIndex); }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: isChecked && isCorrect
                        ? `2px solid ${colors.success}`
                        : isWrongSelection
                        ? `2px solid ${colors.error}`
                        : isSelected
                        ? `2px solid ${colors.accent}`
                        : `1px solid ${colors.border}`,
                      background: isChecked && isCorrect
                        ? 'rgba(16,185,129,0.15)'
                        : isWrongSelection
                        ? 'rgba(239,68,68,0.15)'
                        : isSelected
                        ? 'rgba(245,158,11,0.15)'
                        : 'transparent',
                      color: colors.textPrimary,
                      cursor: isChecked ? 'default' : 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {/* Check Answer button */}
            {testAnswers[currentTestQuestion] !== null && !checkedQuestions.has(currentTestQuestion) && (
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => setCheckedQuestions(prev => new Set([...prev, currentTestQuestion]))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.voltage}, #2563eb)`,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Check Answer
                </button>
              </div>
            )}

            {/* Inline explanation for checked wrong answers */}
            {checkedQuestions.has(currentTestQuestion) && testAnswers[currentTestQuestion] !== null && !currentQ.options[testAnswers[currentTestQuestion]!].correct && (
              <div style={{ background: 'rgba(59,130,246,0.1)', padding: '10px 12px', borderRadius: '8px', marginTop: '10px', borderLeft: `3px solid ${colors.voltage}` }}>
                <p style={{ color: colors.voltage, fontSize: '13px', lineHeight: 1.5, fontWeight: 500 }}>
                  <strong>Explanation:</strong> {currentQ.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Navigation within test */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px 16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: currentTestQuestion === 0 ? 0.4 : 1,
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent}, ${colors.solar})`,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null)
                    ? 'rgba(255,255,255,0.1)'
                    : `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: testAnswers.includes(null) ? colors.textMuted : 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
        {/* Bottom nav is disabled during active quiz */}
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: colors.bgDark,
          borderTop: `1px solid ${colors.border}`,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.35)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          minHeight: '60px',
        }}>
          <button disabled style={{ minHeight: '44px', padding: '10px 18px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textMuted, cursor: 'not-allowed', fontWeight: 600, fontSize: '14px', opacity: 0.4 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flex: 1, paddingLeft: '8px', paddingRight: '8px' }}>
            {phaseOrder.map((p, i) => (
              <button key={p} onClick={() => goToPhase(p)} aria-label={PHASE_LABELS[p]} style={{ width: '32px', minHeight: '44px', borderRadius: '16px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                <span style={{ width: phase === p ? '18px' : '8px', height: '8px', borderRadius: '4px', background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)', transition: 'all 0.3s ease', display: 'block' }} />
              </button>
            ))}
          </div>
          <button disabled style={{ minHeight: '44px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.1)', color: colors.textMuted, cursor: 'not-allowed', fontWeight: 700, fontSize: '14px', opacity: 0.4 }}>
            Next →
          </button>
        </nav>
      </div>
    );
  }

  // ── MASTERY ───────────────────────────────────────────────────────────────────
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontSize: '28px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: '16px' }}>
              You have mastered solar panel temperature coefficients
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: '16px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
              <li>Silicon bandgap decreases with temperature, reducing open-circuit voltage</li>
              <li>Power coefficient is typically −0.3% to −0.5% per °C above STC (25°C)</li>
              <li>Standard Test Conditions: 25°C, 1000 W/m² irradiance</li>
              <li>Hot panels lose significant power — a 350W panel loses ~42W at 55°C</li>
              <li>Cold sunny days can outperform hot summer days in per-watt output</li>
              <li>Installation design (ventilation, elevation) affects panel cooling</li>
              <li>Engineers derate solar systems by 10–20% for hot climate installations</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(245,158,11,0.15)', margin: '16px', padding: '20px', borderRadius: '12px', border: `1px solid ${colors.accent}44` }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: '16px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              Advanced solar technologies have better temperature coefficients: HJT (heterojunction)
              cells lose only ~0.25%/°C, and perovskite-silicon tandems show promise for even lower
              temperature sensitivity. As solar expands to hotter climates, these improvements become
              increasingly valuable. Companies like Meyer Burger, LONGi, and First Solar compete on this metric.
            </p>
          </div>

          <div style={{ margin: '16px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              Play Again
            </button>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomNav(true)}
      </div>
    );
  }

  // Fallback to hook
  return null;
};

export default SolarTempCoefficientRenderer;
