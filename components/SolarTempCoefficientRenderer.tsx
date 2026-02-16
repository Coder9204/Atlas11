'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';


// ============================================================================
// GAME EVENT INTERFACE AND UTILITIES
// ============================================================================

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

// Sound utility
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

const realWorldApps = [
  {
    icon: '🏜️',
    title: 'Desert Solar Farm Engineering',
    short: 'Hot climates require careful design to manage efficiency losses',
    tagline: 'Engineering for extreme heat',
    description: 'Desert installations like those in Arizona, Saudi Arabia, and the Sahara face panel temperatures exceeding 70°C. Engineers must oversize systems and use advanced cooling strategies to compensate for temperature-related efficiency losses.',
    connection: 'This simulation shows how hot panels produce less power despite receiving intense sunlight. Desert solar farms can lose 15-25% of potential output to temperature effects, making this a critical design consideration.',
    howItWorks: 'Hot panels suffer voltage drops of ~0.3%/°C above 25°C STC. Engineers use elevated mounting for air circulation, wider row spacing, and cooling fins. Some advanced systems use water cooling or tracking that reduces time at peak sun angles.',
    stats: [
      { value: '20%', label: 'Typical summer efficiency loss', icon: '📉' },
      { value: '70°C', label: 'Peak desert panel temp', icon: '🌡️' },
      { value: '180 GW', label: 'Planned MENA solar by 2030', icon: '☀️' }
    ],
    examples: ['Noor-Ouarzazate (Morocco)', 'NEOM solar (Saudi Arabia)', 'Australian solar farms', 'Chile Atacama projects'],
    companies: ['ACWA Power', 'Masdar', 'Enel Green Power', 'First Solar'],
    futureImpact: 'New panel technologies with better temperature coefficients and passive cooling could unlock the vast solar potential of the world\'s deserts.',
    color: '#F59E0B'
  },
  {
    icon: '❄️',
    title: 'Cold Climate Solar Advantages',
    short: 'Snowy regions can achieve surprising solar performance',
    tagline: 'Cold panels, hot performance',
    description: 'Contrary to intuition, cold sunny regions like Colorado mountains or Scandinavian summers can achieve excellent solar yields. Cool panels maintain higher voltage and efficiency, often outperforming warmer locations.',
    connection: 'The simulation demonstrates that cold panels (below 25°C STC) actually exceed rated efficiency. Combined with clean air, high altitude, and snow reflection, cold climate solar can match or exceed warmer regions.',
    howItWorks: 'At 0°C, panels gain ~10% voltage compared to 25°C STC. Snow reflection (albedo) can add 20-30% to incident light. Clear mountain air provides higher direct normal irradiance. Net effect often exceeds hot climate production.',
    stats: [
      { value: '+10%', label: 'Cold weather efficiency gain', icon: '📈' },
      { value: '30%', label: 'Boost from snow reflection', icon: '❄️' },
      { value: '2200', label: 'Peak sun hours in Alaska summer', icon: '🌅' }
    ],
    examples: ['Swiss Alpine installations', 'Scandinavian solar parks', 'Canadian solar farms', 'High-altitude research stations'],
    companies: ['Meyer Burger', 'REC Solar', 'Canadian Solar', 'Norwegian solar firms'],
    futureImpact: 'As panel costs drop, previously overlooked cold regions are becoming attractive for solar development, especially for summer peak production.',
    color: '#06B6D4'
  },
  {
    icon: '🏢',
    title: 'Building-Integrated Solar Design',
    short: 'Architects balance aesthetics with thermal management',
    tagline: 'Form meets function',
    description: 'Building-integrated photovoltaics (BIPV) replace traditional building materials with solar elements. Designers must carefully consider ventilation and thermal mass to prevent efficiency losses from building-trapped heat.',
    connection: 'This simulation shows why ventilation gaps behind panels are critical. Rooftop panels can run 20-30°C hotter than ground-mounted systems if air cannot circulate, significantly impacting annual energy yield.',
    howItWorks: 'BIPV systems include solar facades, solar roof tiles, and transparent solar glazing. Ventilated cavities allow convective cooling. Some designs use phase-change materials to absorb heat peaks. Optimal designs balance thermal performance with structural integration.',
    stats: [
      { value: '$11B', label: 'BIPV market by 2028', icon: '🏗️' },
      { value: '25°C', label: 'Typical roof temp difference', icon: '🏠' },
      { value: '40%', label: 'Building energy from facades', icon: '🔋' }
    ],
    examples: ['Solar roof tiles', 'Glass curtain walls', 'Solar facades', 'Transparent skylights'],
    companies: ['Tesla Solar Roof', 'SunPower', 'Onyx Solar', 'Solarcentury'],
    futureImpact: 'Perovskite tandem cells and improved thermal management will enable net-zero buildings where every surface contributes to energy generation.',
    color: '#10B981'
  },
  {
    icon: '📊',
    title: 'Solar Investment Analysis',
    short: 'Financial models must account for temperature derating',
    tagline: 'The economics of efficiency',
    description: 'Solar project investors and banks use sophisticated models to predict energy yield and financial returns. Temperature coefficients are essential inputs that can make or break project economics in different climates.',
    connection: 'The simulation shows real derating factors used in industry models. A -0.4%/°C power coefficient might reduce annual yield by 5-15% depending on location, directly impacting project revenue and loan repayment.',
    howItWorks: 'PVsyst and similar software model hourly temperatures from weather data, apply panel temperature coefficients, and calculate derated output. Banks require P90/P99 estimates accounting for year-to-year climate variation.',
    stats: [
      { value: '$350B', label: 'Annual solar investment globally', icon: '💰' },
      { value: '5-15%', label: 'Temperature derating range', icon: '📉' },
      { value: '25 yrs', label: 'Typical financial model horizon', icon: '📆' }
    ],
    examples: ['Utility project finance', 'Solar REITs', 'Community solar funds', 'Residential loan underwriting'],
    companies: ['Goldman Sachs', 'BlackRock', 'Brookfield', 'Climate finance firms'],
    futureImpact: 'Better temperature prediction through satellite data and AI will reduce investment risk and enable financing in emerging solar markets.',
    color: '#8B5CF6'
  }
];

interface SolarTempCoefficientRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}


  // Phase labels
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Play',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'solar_temp_coefficient',
        gameTitle: 'Solar Panel Temperature Coefficient',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Colors
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

const SolarTempCoefficientRenderer: React.FC<SolarTempCoefficientRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const initialPhase = (gamePhase && phaseOrder.includes(gamePhase as Phase)) ? gamePhase as Phase : 'hook';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const isNavigating = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
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
  

  // Responsive detection
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

  
  // Progress bar
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
  };

  // Bottom navigation bar
  const currentIndex = phaseOrder.indexOf(phase);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === phaseOrder.length - 1;

  const renderBottomBar = () => (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderTop: `1px solid ${colors.border}`,
      background: 'rgba(0,0,0,0.3)',
    }}>
      <button
        onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: isFirst ? 'rgba(255,255,255,0.3)' : 'white',
          cursor: isFirst ? 'not-allowed' : 'pointer',
          opacity: isFirst ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        }}
      >
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentIndex && goToPhase(p)}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
              cursor: i <= currentIndex ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
            }}
            title={phaseLabels[p]}
          />
        ))}
      </div>
      <button
        onClick={() => !isLast && nextPhase()}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: isLast ? 'rgba(255,255,255,0.3)' : 'white',
          cursor: isLast ? 'not-allowed' : 'pointer',
          opacity: isLast ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
        }}
      >
        Next →
      </button>
    </div>
  );

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 520;

    // Temperature color gradient - returns color based on panel temperature
    const getTempColor = () => {
      if (panelTemperature < 10) return colors.cold;
      if (panelTemperature < 25) return colors.success;
      if (panelTemperature < 40) return colors.warning;
      return colors.temperature;
    };

    // Get temperature blend for gradient (0 = cold, 1 = hot)
    const tempBlend = Math.max(0, Math.min(1, (panelTemperature + 10) / 80));

    // Sun intensity visual
    const sunOpacity = Math.min(1, irradiance / 1000);
    const sunSize = 30 + (irradiance / 1000) * 20;

    // Efficiency percentage for graph
    const efficiencyPercent = (values.efficiency / 22) * 100; // 22% is max efficiency baseline

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '600px' }}
        >
          <defs>
            {/* === PREMIUM BACKGROUND GRADIENTS === */}
            <linearGradient id="stcoefSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="25%" stopColor="#162544" />
              <stop offset="50%" stopColor="#1a365d" />
              <stop offset="75%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* === SUN GRADIENTS === */}
            <radialGradient id="stcoefSunCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="20%" stopColor="#fef3c7" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="80%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>

            <radialGradient id="stcoefSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="stcoefSunCorona" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#fde047" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>

            {/* === SOLAR PANEL GRADIENTS === */}
            <linearGradient id="stcoefPanelFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="stcoefPanelCellCool" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="25%" stopColor="#1e3a8a" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            <linearGradient id="stcoefPanelCellHot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="25%" stopColor="#991b1b" />
              <stop offset="50%" stopColor="#b91c1c" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            <linearGradient id="stcoefPanelReflection" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* === THERMOMETER GRADIENTS === */}
            <linearGradient id="stcoefThermometerBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#334155" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="stcoefThermometerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.5" />
              <stop offset="20%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="80%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="stcoefMercuryCold" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="30%" stopColor="#06b6d4" />
              <stop offset="60%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>

            <linearGradient id="stcoefMercuryWarm" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>

            <linearGradient id="stcoefMercuryHot" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="30%" stopColor="#dc2626" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* === GRAPH GRADIENTS === */}
            <linearGradient id="stcoefGraphBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="stcoefPowerLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="25%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            <linearGradient id="stcoefEfficiencyLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            <linearGradient id="stcoefGraphGridLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0" />
              <stop offset="10%" stopColor="#334155" stopOpacity="0.5" />
              <stop offset="90%" stopColor="#334155" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0" />
            </linearGradient>

            {/* === RADIAL TEMPERATURE EFFECT === */}
            <radialGradient id="stcoefHeatRadiation" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="stcoefColdAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#0891b2" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS === */}
            <filter id="stcoefSunGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="stcoefPanelGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="stcoefThermometerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="stcoefDataPointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="stcoefTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="stcoefSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
            </filter>

            {/* === SUN RAY PATTERN === */}
            <pattern id="stcoefSunRays" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <line x1="10" y1="0" x2="10" y2="20" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#stcoefSkyGradient)" />

          {/* Subtle grid pattern */}
          <pattern id="stcoefBgGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width={width} height={height} fill="url(#stcoefBgGrid)" />

          {/* === PREMIUM SUN === */}
          <g transform="translate(70, 65)">
            {/* Sun corona (outer glow) */}
            <circle cx="0" cy="0" r={sunSize + 45} fill="url(#stcoefSunCorona)" opacity={sunOpacity * 0.8} />

            {/* Sun glow (middle layer) */}
            <circle cx="0" cy="0" r={sunSize + 25} fill="url(#stcoefSunGlow)" opacity={sunOpacity} />

            {/* Sun core with glow filter */}
            <circle cx="0" cy="0" r={sunSize} fill="url(#stcoefSunCore)" filter="url(#stcoefSunGlowFilter)" />

            {/* Sun highlight */}
            <ellipse cx={-sunSize * 0.25} cy={-sunSize * 0.25} rx={sunSize * 0.3} ry={sunSize * 0.2} fill="#ffffff" opacity="0.3" />

            {/* Irradiance label */}
            <text x="0" y={sunSize + 40} fill={colors.textPrimary} fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#stcoefTextGlow)">
              {irradiance} W/m²
            </text>
            <text x="0" y={sunSize + 54} fill={colors.textMuted} fontSize="10" textAnchor="middle">
              Solar Irradiance
            </text>
          </g>

          {/* === SUN RAYS HITTING PANEL === */}
          <g opacity={sunOpacity * 0.6}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <line
                key={`ray-${i}`}
                x1={85 + i * 8}
                y1={75 + i * 5}
                x2={175 + i * 22}
                y2={95}
                stroke="url(#stcoefPowerLine)"
                strokeWidth="2"
                strokeDasharray="8,4"
                strokeLinecap="round"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="12" dur="1s" repeatCount="indefinite" />
              </line>
            ))}
          </g>

          {/* === PREMIUM SOLAR PANEL === */}
          <g transform="translate(160, 55)" filter="url(#stcoefSoftShadow)">
            {/* Panel mounting bracket */}
            <rect x="60" y="95" width="50" height="15" fill="url(#stcoefPanelFrame)" rx="2" />
            <rect x="75" y="108" width="20" height="30" fill="url(#stcoefPanelFrame)" rx="2" />

            {/* Panel frame */}
            <rect x="-5" y="-5" width="180" height="105" fill="url(#stcoefPanelFrame)" rx="6" />

            {/* Panel glass/cell area */}
            <rect x="0" y="0" width="170" height="95" rx="3" fill={tempBlend > 0.5 ? 'url(#stcoefPanelCellHot)' : 'url(#stcoefPanelCellCool)'} opacity={1 - tempBlend * 0.3} />

            {/* Temperature overlay based on panel temp */}
            {tempBlend > 0.4 && (
              <rect x="0" y="0" width="170" height="95" rx="3" fill="url(#stcoefHeatRadiation)" opacity={tempBlend * 0.8} />
            )}
            {tempBlend < 0.3 && (
              <rect x="0" y="0" width="170" height="95" rx="3" fill="url(#stcoefColdAura)" opacity={(0.3 - tempBlend) * 2} />
            )}

            {/* Cell grid lines - horizontal */}
            {[1, 2, 3, 4, 5].map(i => (
              <line key={`h-${i}`} x1="0" y1={i * 15.8} x2="170" y2={i * 15.8} stroke="#0f172a" strokeWidth="1.5" strokeOpacity="0.6" />
            ))}
            {/* Cell grid lines - vertical */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <line key={`v-${i}`} x1={i * 17} y1="0" x2={i * 17} y2="95" stroke="#0f172a" strokeWidth="1.5" strokeOpacity="0.6" />
            ))}

            {/* Glass reflection */}
            <rect x="0" y="0" width="170" height="95" rx="3" fill="url(#stcoefPanelReflection)" />

            {/* Temperature indicator badge */}
            <g transform="translate(55, 32)">
              <rect x="0" y="0" width="60" height="30" rx="6" fill="rgba(0,0,0,0.85)" stroke={getTempColor()} strokeWidth="2" />
              <text x="30" y="21" fill={getTempColor()} fontSize="16" fontWeight="bold" textAnchor="middle" filter="url(#stcoefTextGlow)">
                {panelTemperature}°C
              </text>
            </g>

            {/* Panel label */}
            <text x="85" y="115" fill={colors.textSecondary} fontSize="10" textAnchor="middle">350W Solar Panel</text>
          </g>

          {/* === PREMIUM THERMOMETER === */}
          <g transform="translate(410, 40)">
            {/* Thermometer body background */}
            <rect x="0" y="0" width="45" height="130" rx="22" fill="url(#stcoefThermometerBg)" stroke="#475569" strokeWidth="2" />

            {/* Glass effect overlay */}
            <rect x="2" y="2" width="41" height="126" rx="20" fill="url(#stcoefThermometerGlass)" />

            {/* Temperature scale marks */}
            {[-10, 0, 10, 25, 40, 55, 70].map((temp, i) => {
              const yPos = 10 + (1 - (temp + 10) / 80) * 95;
              return (
                <g key={`mark-${temp}`}>
                  <line x1="8" y1={yPos} x2="15" y2={yPos} stroke={colors.textMuted} strokeWidth="1" />
                  <text x="50" y={yPos + 3} fill={temp === 25 ? colors.accent : colors.textMuted} fontSize="8" fontWeight={temp === 25 ? 'bold' : 'normal'}>
                    {temp}°
                  </text>
                </g>
              );
            })}

            {/* Mercury column */}
            {(() => {
              const mercuryHeight = Math.max(5, 95 * ((panelTemperature + 10) / 80));
              const mercuryY = 10 + 95 - mercuryHeight;
              const mercuryGradient = panelTemperature < 15 ? 'url(#stcoefMercuryCold)' : panelTemperature < 40 ? 'url(#stcoefMercuryWarm)' : 'url(#stcoefMercuryHot)';
              return (
                <rect
                  x="15"
                  y={mercuryY}
                  width="15"
                  height={mercuryHeight}
                  rx="7"
                  fill={mercuryGradient}
                  filter="url(#stcoefThermometerGlow)"
                />
              );
            })()}

            {/* Bulb at bottom */}
            <circle cx="22.5" cy="115" r="12" fill={getTempColor()} filter="url(#stcoefThermometerGlow)" />
            <circle cx="20" cy="112" r="4" fill="#ffffff" opacity="0.3" />

            {/* Label */}
            <text x="22" y="148" fill={colors.textSecondary} fontSize="10" textAnchor="middle" fontWeight="bold">Panel</text>
            <text x="22" y="160" fill={colors.textSecondary} fontSize="10" textAnchor="middle">Temp</text>
          </g>

          {/* === OUTPUT VALUES PANEL === */}
          <g transform="translate(20, 180)">
            <rect x="0" y="0" width="460" height="95" rx="10" fill="rgba(15, 23, 42, 0.9)" stroke={colors.accent} strokeWidth="1.5" />

            {/* Header */}
            <rect x="0" y="0" width="460" height="24" rx="10" fill="rgba(245, 158, 11, 0.15)" />
            <text x="230" y="17" fill={colors.accent} fontSize="12" fontWeight="bold" textAnchor="middle">
              Panel Output vs STC (25°C, 1000 W/m²)
            </text>

            {/* Voltage */}
            <g transform="translate(25, 35)">
              <circle cx="6" cy="8" r="6" fill={colors.voltage} opacity="0.3" />
              <circle cx="6" cy="8" r="3" fill={colors.voltage} />
              <text x="20" y="12" fill={colors.voltage} fontSize="11" fontWeight="bold">Voltage (Voc)</text>
              <text x="115" y="12" fill={colors.textPrimary} fontSize="13" fontWeight="bold">{values.Voc.toFixed(1)}V</text>
              <text x="160" y="12" fill={values.deltaT > 0 ? colors.error : colors.success} fontSize="10">
                ({values.deltaT > 0 ? '' : '+'}{(-values.deltaT * TEMP_COEFF_VOC * 100).toFixed(1)}%)
              </text>
            </g>

            {/* Current */}
            <g transform="translate(245, 35)">
              <circle cx="6" cy="8" r="6" fill={colors.current} opacity="0.3" />
              <circle cx="6" cy="8" r="3" fill={colors.current} />
              <text x="20" y="12" fill={colors.current} fontSize="11" fontWeight="bold">Current (Isc)</text>
              <text x="115" y="12" fill={colors.textPrimary} fontSize="13" fontWeight="bold">{values.Isc.toFixed(2)}A</text>
            </g>

            {/* Power */}
            <g transform="translate(25, 60)">
              <circle cx="6" cy="8" r="8" fill={colors.power} opacity="0.3" />
              <circle cx="6" cy="8" r="4" fill={colors.power} />
              <text x="20" y="12" fill={colors.power} fontSize="13" fontWeight="bold">Power (Pmax)</text>
              <text x="130" y="12" fill={colors.textPrimary} fontSize="16" fontWeight="bold">{values.Pmax.toFixed(0)}W</text>
              <text x="185" y="12" fill={values.deltaT > 0 ? colors.error : colors.success} fontSize="11" fontWeight="bold">
                ({values.powerLoss > 0 ? '-' : '+'}{Math.abs(values.powerLoss).toFixed(0)}W)
              </text>
            </g>

            {/* Efficiency */}
            <g transform="translate(245, 60)">
              <circle cx="6" cy="8" r="6" fill={colors.accent} opacity="0.3" />
              <circle cx="6" cy="8" r="3" fill={colors.accent} />
              <text x="20" y="12" fill={colors.accent} fontSize="11" fontWeight="bold">Efficiency</text>
              <text x="95" y="12" fill={colors.textPrimary} fontSize="13" fontWeight="bold">{values.efficiency.toFixed(1)}%</text>
            </g>
          </g>

          {/* === TEMPERATURE VS EFFICIENCY GRAPH === */}
          <g transform="translate(20, 290)">
            <rect x="0" y="0" width="460" height="130" rx="10" fill="url(#stcoefGraphBg)" stroke="#334155" strokeWidth="1" />

            {/* Graph title */}
            <text x="230" y="18" fill={colors.textPrimary} fontSize="11" fontWeight="bold" textAnchor="middle">
              Power Output vs Panel Temperature (at {irradiance} W/m²)
            </text>

            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line key={`grid-h-${i}`} x1="55" y1={35 + i * 20} x2="440" y2={35 + i * 20} stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
            ))}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={`grid-v-${i}`} x1={55 + i * 77} y1="35" x2={55 + i * 77} y2="115" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.5" />
            ))}

            {/* Y-axis */}
            <line x1="55" y1="35" x2="55" y2="115" stroke={colors.textMuted} strokeWidth="1.5" />
            <text x="30" y="80" fill={colors.textMuted} fontSize="9" textAnchor="middle" transform="rotate(-90, 30, 80)">Power (W)</text>

            {/* Y-axis labels */}
            <text x="50" y="38" fill={colors.textMuted} fontSize="8" textAnchor="end">400</text>
            <text x="50" y="58" fill={colors.textMuted} fontSize="8" textAnchor="end">350</text>
            <text x="50" y="78" fill={colors.textMuted} fontSize="8" textAnchor="end">300</text>
            <text x="50" y="98" fill={colors.textMuted} fontSize="8" textAnchor="end">250</text>
            <text x="50" y="118" fill={colors.textMuted} fontSize="8" textAnchor="end">200</text>

            {/* X-axis */}
            <line x1="55" y1="115" x2="440" y2="115" stroke={colors.textMuted} strokeWidth="1.5" />

            {/* X-axis labels */}
            <text x="55" y="125" fill={colors.textMuted} fontSize="8" textAnchor="middle">-10°C</text>
            <text x="132" y="125" fill={colors.textMuted} fontSize="8" textAnchor="middle">10°C</text>
            <text x="209" y="125" fill={colors.accent} fontSize="8" textAnchor="middle" fontWeight="bold">25°C</text>
            <text x="286" y="125" fill={colors.textMuted} fontSize="8" textAnchor="middle">40°C</text>
            <text x="363" y="125" fill={colors.textMuted} fontSize="8" textAnchor="middle">55°C</text>
            <text x="440" y="125" fill={colors.textMuted} fontSize="8" textAnchor="middle">70°C</text>

            {/* STC reference line */}
            <line x1="209" y1="35" x2="209" y2="115" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="4,4" strokeOpacity="0.7" />
            <text x="209" y="32" fill={colors.accent} fontSize="7" textAnchor="middle">STC</text>

            {/* Power curve (decreasing with temperature) */}
            <path
              d={(() => {
                const points = [];
                for (let t = -10; t <= 70; t += 5) {
                  const power = STC_PMAX * (1 + TEMP_COEFF_PMAX * (t - STC_TEMP)) * (irradiance / STC_IRRADIANCE);
                  const x = 55 + ((t + 10) / 80) * 385;
                  const y = 115 - ((power - 200) / 200) * 80;
                  points.push(`${points.length === 0 ? 'M' : 'L'}${x},${Math.max(35, Math.min(115, y))}`);
                }
                return points.join(' ');
              })()}
              fill="none"
              stroke="url(#stcoefPowerLine)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current operating point */}
            {(() => {
              const x = 55 + ((panelTemperature + 10) / 80) * 385;
              const y = 115 - ((values.Pmax - 200) / 200) * 80;
              return (
                <g>
                  {/* Vertical reference line to x-axis */}
                  <line x1={x} y1={Math.max(35, Math.min(115, y))} x2={x} y2="115" stroke={colors.accent} strokeWidth="1" strokeDasharray="2,2" strokeOpacity="0.5" />

                  {/* Data point with glow */}
                  <circle cx={x} cy={Math.max(35, Math.min(115, y))} r="10" fill={colors.accent} opacity="0.3" filter="url(#stcoefDataPointGlow)" />
                  <circle cx={x} cy={Math.max(35, Math.min(115, y))} r="6" fill={colors.accent} stroke="#ffffff" strokeWidth="2" />

                  {/* Value label */}
                  <rect x={x - 25} y={Math.max(35, Math.min(115, y)) - 25} width="50" height="16" rx="4" fill="rgba(0,0,0,0.8)" />
                  <text x={x} y={Math.max(35, Math.min(115, y)) - 12} fill={colors.textPrimary} fontSize="9" fontWeight="bold" textAnchor="middle">
                    {values.Pmax.toFixed(0)}W
                  </text>
                </g>
              );
            })()}
          </g>

          {/* === SEASON COMPARISON (when active) === */}
          {showSeason && (
            <g transform="translate(20, 430)">
              <rect
                x="0"
                y="0"
                width="460"
                height="55"
                rx="10"
                fill={showSeason === 'summer' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)'}
                stroke={showSeason === 'summer' ? colors.temperature : colors.cold}
                strokeWidth="1.5"
              />
              <text x="230" y="20" fill={showSeason === 'summer' ? colors.temperature : colors.cold} fontSize="13" fontWeight="bold" textAnchor="middle">
                {showSeason === 'summer' ? 'Hot Summer Day: 55°C panel, 1000 W/m²' : 'Cold Winter Day: 5°C panel, 800 W/m²'}
              </text>
              <text x="230" y="42" fill={colors.textPrimary} fontSize="14" fontWeight="bold" textAnchor="middle">
                Power Output: {values.Pmax.toFixed(0)}W
                <tspan fill={showSeason === 'summer' ? colors.error : colors.success} fontSize="12">
                  {showSeason === 'summer'
                    ? ` (${((values.powerLoss / STC_PMAX) * 100).toFixed(0)}% temp loss)`
                    : ` (+${((-values.powerLoss / STC_PMAX) * 100).toFixed(0)}% cold bonus)`}
                </tspan>
              </text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: isAnimating
                  ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)`
                  : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating ? '0 4px 15px rgba(239, 68, 68, 0.4)' : '0 4px 15px rgba(16, 185, 129, 0.4)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop Sweep' : 'Sweep Temperature'}
            </button>
            <button
              onClick={() => setScenario('summer')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.temperature} 0%, #dc2626 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Hot Summer
            </button>
            <button
              onClick={() => setScenario('winter')}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.cold} 0%, #0891b2 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Cold Winter
            </button>
            <button
              onClick={() => { setPanelTemperature(25); setIrradiance(1000); setShowSeason(null); }}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(245, 158, 11, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '48px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '24px',
          textAlign: 'center',
        }}>
          {renderProgressBar()}
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
