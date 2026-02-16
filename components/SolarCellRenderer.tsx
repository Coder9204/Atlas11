import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- GAME EVENT INTERFACE ---
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

interface SolarCellRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

const realWorldApps = [
  {
    icon: '🏠',
    title: 'Residential Solar Power',
    short: 'Rooftop panels convert sunlight to electricity for homes',
    tagline: 'Power from your roof',
    description: 'Over 4 million US homes have solar panels, generating electricity that reduces utility bills and carbon emissions. Modern systems can provide 80-100% of a household\'s electricity needs.',
    connection: 'This game demonstrates the inverse-square law and angle dependence of solar cell output. Home solar installers must optimize tilt angle for latitude and consider shading to maximize annual energy production.',
    howItWorks: 'Photovoltaic cells convert photons to electron-hole pairs in semiconductor junctions. Series-connected cells create 30-40V panels, which inverters convert to 120/240V AC. Net metering lets excess power flow to the grid.',
    stats: [
      { value: '4M+', label: 'US solar homes', icon: '🏘️' },
      { value: '25 yrs', label: 'Panel warranty life', icon: '📅' },
      { value: '$30K', label: 'Average savings over lifetime', icon: '💰' }
    ],
    examples: ['Rooftop arrays', 'Ground-mount systems', 'Solar carports', 'Battery backup systems'],
    companies: ['Tesla', 'SunPower', 'Enphase', 'SolarEdge'],
    futureImpact: 'Building-integrated photovoltaics will turn entire building surfaces into power generators, with solar windows and facades becoming standard in new construction.',
    color: '#F59E0B'
  },
  {
    icon: '🛰️',
    title: 'Space Power Systems',
    short: 'Satellites rely exclusively on solar cells for electrical power',
    tagline: 'Powering exploration beyond Earth',
    description: 'Every satellite, space station, and Mars rover depends on solar arrays. In space, panels receive full solar intensity without atmospheric losses, generating about 1.4 kW/m² at Earth\'s orbit.',
    connection: 'The inverse-square law is critical for space missions. Mars rovers receive only 40% of Earth\'s solar intensity. The simulation shows how distance dramatically affects power output.',
    howItWorks: 'Space-grade multi-junction cells stack 3-6 semiconductor layers, each optimized for different wavelengths, achieving 30-47% efficiency. Arrays deploy from folded configurations and track the sun with gimbal mechanisms.',
    stats: [
      { value: '47%', label: 'Record space cell efficiency', icon: '⚡' },
      { value: '109 kW', label: 'ISS solar array power', icon: '🔋' },
      { value: '$400M', label: 'NASA solar tech investment/yr', icon: '🚀' }
    ],
    examples: ['International Space Station', 'Mars rovers', 'Starlink satellites', 'James Webb Telescope'],
    companies: ['NASA', 'SpaceX', 'Airbus Defence', 'Northrop Grumman'],
    futureImpact: 'Space-based solar power stations could beam gigawatts of clean energy to Earth, providing constant power unaffected by weather or nighttime.',
    color: '#3B82F6'
  },
  {
    icon: '⚡',
    title: 'Utility-Scale Solar Farms',
    short: 'Massive installations provide clean power to millions',
    tagline: 'Industrial-scale clean energy',
    description: 'Solar farms spanning hundreds of hectares now provide cheaper electricity than fossil fuels in many regions. The largest installations exceed 2 GW capacity, powering entire cities.',
    connection: 'This game shows how tracking systems that keep panels perpendicular to sunlight (cosine factor = 1) can increase output by 25-40% compared to fixed mounts - essential knowledge for utility-scale optimization.',
    howItWorks: 'Single-axis trackers follow the sun east to west, while dual-axis trackers also adjust for seasonal elevation changes. Central inverters convert DC from thousands of panels into grid-synchronized AC power.',
    stats: [
      { value: '1200 GW', label: 'Global solar capacity', icon: '🌍' },
      { value: '$0.02/kWh', label: 'Lowest solar electricity cost', icon: '💵' },
      { value: '75%', label: 'Cost decline since 2010', icon: '📉' }
    ],
    examples: ['Bhadla Solar Park (India)', 'Solar Star (USA)', 'Tengger Desert Solar (China)', 'Noor Complex (Morocco)'],
    companies: ['NextEra Energy', 'First Solar', 'JinkoSolar', 'Canadian Solar'],
    futureImpact: 'Agrivoltaics combining solar with farming, and floating solar on reservoirs, will expand suitable land area and add benefits like reduced water evaporation.',
    color: '#10B981'
  },
  {
    icon: '🔬',
    title: 'Concentrated Photovoltaics',
    short: 'Lenses and mirrors focus sunlight onto high-efficiency cells',
    tagline: 'Magnifying solar potential',
    description: 'CPV systems use optics to concentrate sunlight 500-1000x onto tiny multi-junction cells. This achieves the highest efficiencies of any solar technology, exceeding 47% conversion.',
    connection: 'The magnifying glass option in this game demonstrates light concentration. CPV takes this to the extreme, trading larger collection areas of cheap optics for smaller areas of expensive high-performance cells.',
    howItWorks: 'Fresnel lenses or parabolic mirrors focus direct sunlight onto cells just millimeters across. Active cooling prevents overheating. Dual-axis tracking maintains focus within 0.1° to capture the solar disk image.',
    stats: [
      { value: '47%', label: 'World record efficiency', icon: '🏆' },
      { value: '1000x', label: 'Typical concentration ratio', icon: '🔍' },
      { value: '500°C', label: 'Cell operating temperature', icon: '🌡️' }
    ],
    examples: ['Desert power plants', 'Space solar arrays', 'Remote microgrids', 'Research installations'],
    companies: ['Soitec', 'Suncore', 'SolFocus', 'NREL'],
    futureImpact: 'Micro-CPV systems could integrate into buildings, while advances in multi-junction cells may push efficiencies toward 60%.',
    color: '#8B5CF6'
  }
];

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
  solar: '#3b82f6',
  light: '#fcd34d',
  panel: '#1e3a5f',
  border: '#334155',
  primary: '#f59e0b',
};

const SolarCellRenderer: React.FC<SolarCellRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  type SCPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: SCPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  // Use gamePhase from props if valid, otherwise default to 'hook'
  const getInitialPhase = (): SCPhase => {
    if (gamePhase && validPhases.includes(gamePhase as SCPhase)) {
      return gamePhase as SCPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<SCPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as SCPhase) && gamePhase !== phase) {
      setPhase(gamePhase as SCPhase);
    }
  }, [gamePhase]);

  // Simulation state
  const [lightDistance, setLightDistance] = useState(50);
  const [panelAngle, setPanelAngle] = useState(15);
  const [lightIntensity, setLightIntensity] = useState(100);
  const [useMagnifier, setUseMagnifier] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferApp, setTransferApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Phase order for navigation
  const phaseOrder: SCPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<SCPhase, string> = {
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

  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: GameEvent['details']
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'solar_cell',
        gameTitle: 'Solar Cell Physics',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  const goToPhase = useCallback((p: SCPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    if (p === 'play' || p === 'twist_play') {
      setIsAnimating(false);
    }
    if (p === 'twist_play') setUseMagnifier(true);
    if (p === 'play') setUseMagnifier(false);

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

  // Responsive typography
  const typo = {
    title: isMobile ? '24px' : '32px',
    heading: isMobile ? '18px' : '22px',
    bodyLarge: isMobile ? '14px' : '16px',
    body: isMobile ? '13px' : '14px',
    small: isMobile ? '11px' : '12px',
    label: isMobile ? '10px' : '11px',
    pagePadding: isMobile ? '12px' : '16px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '12px' : '16px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const baseIntensity = lightIntensity / 100;
    const distanceFactor = Math.pow(50 / lightDistance, 2);
    const angleRad = (panelAngle * Math.PI) / 180;
    const angleFactor = Math.max(0, Math.cos(angleRad));
    const magnifierFactor = useMagnifier ? 2.5 : 1;
    const effectiveIntensity = baseIntensity * distanceFactor * angleFactor * magnifierFactor;
    const voltage = Math.min(0.6, 0.45 + 0.15 * Math.sqrt(effectiveIntensity));
    const current = effectiveIntensity * 100;
    const power = voltage * current;
    const inputPower = effectiveIntensity * 1000;
    const efficiency = inputPower > 0 ? (power / inputPower) * 100 : 0;

    return {
      voltage: Math.min(voltage, 0.65),
      current: Math.min(current, 250),
      power: Math.min(power, 150),
      efficiency: Math.min(efficiency, 22),
      effectiveIntensity: Math.min(effectiveIntensity, 2.5),
    };
  }, [lightDistance, panelAngle, lightIntensity, useMagnifier]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setLightDistance(prev => {
        const newVal = prev + (Math.random() > 0.5 ? 2 : -2);
        return Math.max(20, Math.min(100, newVal));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'linear', label: 'Output increases linearly with brightness - double the light, double the power' },
    { id: 'nonlinear', label: 'Output increases but NOT linearly - diminishing returns at high intensity' },
    { id: 'constant', label: 'Output stays roughly constant once there is enough light' },
    { id: 'threshold', label: 'No output until brightness reaches a threshold, then jumps up' },
  ];

  const twistPredictions = [
    { id: 'dangerous', label: 'The magnifier will damage the solar cell from too much heat' },
    { id: 'boost', label: 'Output increases significantly due to concentrated light' },
    { id: 'same', label: 'Output stays the same - the cell can only absorb so much' },
    { id: 'decrease', label: 'Output decreases because the magnifier blocks some light' },
  ];

  const testQuestions = [
    {
      question: 'What happens to light intensity as you double the distance from a point source?',
      options: [
        { text: 'Intensity doubles', correct: false },
        { text: 'Intensity decreases to 1/4', correct: true },
        { text: 'Intensity decreases to 1/2', correct: false },
        { text: 'Intensity stays the same', correct: false },
      ],
    },
    {
      question: 'When a solar panel is tilted 60 degrees from perpendicular to the light source, its output is:',
      options: [
        { text: 'Zero', correct: false },
        { text: 'About 50% of maximum', correct: true },
        { text: 'About 87% of maximum', correct: false },
        { text: 'The same as when perpendicular', correct: false },
      ],
    },
    {
      question: 'The relationship between solar cell current and light intensity is approximately:',
      options: [
        { text: 'Exponential', correct: false },
        { text: 'Linear (proportional)', correct: true },
        { text: 'Inverse', correct: false },
        { text: 'Logarithmic', correct: false },
      ],
    },
    {
      question: 'Solar cell voltage under illumination:',
      options: [
        { text: 'Increases dramatically with more light', correct: false },
        { text: 'Remains relatively constant, with slight logarithmic increase', correct: true },
        { text: 'Decreases with more light', correct: false },
        { text: 'Oscillates unpredictably', correct: false },
      ],
    },
    {
      question: 'The power output of a solar cell (P = V x I) depends on intensity because:',
      options: [
        { text: 'Voltage increases linearly with intensity', correct: false },
        { text: 'Current increases linearly with intensity while voltage is nearly constant', correct: true },
        { text: 'Both voltage and current decrease with intensity', correct: false },
        { text: 'Power is independent of intensity', correct: false },
      ],
    },
    {
      question: 'Using a magnifying lens to concentrate light on a solar cell:',
      options: [
        { text: 'Always improves efficiency without any drawbacks', correct: false },
        { text: 'Increases current but may cause thermal damage if not managed', correct: true },
        { text: 'Has no effect on output', correct: false },
        { text: 'Only works with certain wavelengths of light', correct: false },
      ],
    },
    {
      question: 'The cosine law for solar panels states that effective intensity depends on:',
      options: [
        { text: 'The temperature of the panel', correct: false },
        { text: 'The angle between incident light and the panel normal', correct: true },
        { text: 'The color of the panel surface', correct: false },
        { text: 'The age of the solar cell', correct: false },
      ],
    },
    {
      question: 'Why does a solar panel produce maximum power when perpendicular to sunlight?',
      options: [
        { text: 'The panel absorbs more heat when perpendicular', correct: false },
        { text: 'Maximum projected area captures the most photons', correct: true },
        { text: 'Light travels faster when hitting perpendicular surfaces', correct: false },
        { text: 'Electrons flow more easily in perpendicular orientation', correct: false },
      ],
    },
    {
      question: 'The inverse-square law applies to solar panels because:',
      options: [
        { text: 'Light is absorbed by air over distance', correct: false },
        { text: 'Light spreads over a larger area as it travels from the source', correct: true },
        { text: 'Photons slow down with distance', correct: false },
        { text: 'Solar cells become less efficient with distance', correct: false },
      ],
    },
    {
      question: 'Solar cell efficiency is typically measured as:',
      options: [
        { text: 'Output current divided by input light intensity', correct: false },
        { text: 'Electrical power output divided by incident light power', correct: true },
        { text: 'Voltage produced per unit area', correct: false },
        { text: 'Number of photons absorbed per second', correct: false },
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
    if (score >= 8) {
      emitGameEvent('correct_answer', { score, maxScore: 10 });
    }
  };

  const currentIdx = phaseOrder.indexOf(phase);

  // Render visualization
  const renderVisualization = (interactive: boolean, showMagnifier: boolean = false) => {
    const width = 700;
    const height = 400;
    const output = calculateOutput();

    const lightX = 60 + (100 - lightDistance) * 1.5;
    const lightY = 60;
    const cellX = 320;
    const cellY = 180;
    const cellWidth = 280;
    const cellHeight = 160;

    const numRays = 6;
    const rays = [];
    const photonPositions: { x: number; y: number; progress: number }[] = [];

    for (let i = 0; i < numRays; i++) {
      const targetY = cellY - 20 + (i * 50);
      const opacity = Math.max(0.2, output.effectiveIntensity * 0.5);
      const rayEndX = cellX - 10;
      const animPhase = ((Date.now() / 800) + i * 0.15) % 1;
      const photonX = lightX + (rayEndX - lightX) * animPhase;
      const photonY = lightY + (targetY - lightY) * animPhase;

      if (animPhase > 0.1 && animPhase < 0.95) {
        photonPositions.push({ x: photonX, y: photonY, progress: animPhase });
      }

      rays.push(
        <line
          key={`solcRay${i}`}
          x1={lightX}
          y1={lightY}
          x2={rayEndX}
          y2={targetY}
          stroke="url(#solcPhotonBeam)"
          strokeWidth={showMagnifier && useMagnifier ? 3 : 2}
          opacity={opacity}
          strokeDasharray={showMagnifier && useMagnifier ? "none" : "8,4"}
        />
      );
    }

    const ehPairs = [
      { x: cellX + 30, y: cellY + 25, delay: 0 },
      { x: cellX + 80, y: cellY + 35, delay: 0.3 },
      { x: cellX + 130, y: cellY + 20, delay: 0.6 },
      { x: cellX + 180, y: cellY + 40, delay: 0.15 },
      { x: cellX + 220, y: cellY + 30, delay: 0.45 },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '700px' }}
        >
          <defs>
            <linearGradient id="solcLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a1628" />
              <stop offset="70%" stopColor="#071320" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <radialGradient id="solcSunCore" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity={1} />
              <stop offset="25%" stopColor="#fef3c7" stopOpacity={0.95} />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity={0.85} />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.3} />
            </radialGradient>

            <radialGradient id="solcSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4 * (lightIntensity / 100)} />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity={0.25 * (lightIntensity / 100)} />
              <stop offset="70%" stopColor="#d97706" stopOpacity={0.1 * (lightIntensity / 100)} />
              <stop offset="100%" stopColor="#92400e" stopOpacity={0} />
            </radialGradient>

            <linearGradient id="solcPhotonBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity={0.9} />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity={0.8} />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.3} />
            </linearGradient>

            <radialGradient id="solcPhotonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity={1} />
              <stop offset="30%" stopColor="#fde047" stopOpacity={0.8} />
              <stop offset="60%" stopColor="#facc15" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
            </radialGradient>

            <linearGradient id="solcNType" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="20%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="80%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            <linearGradient id="solcPType" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="20%" stopColor="#9a3412" />
              <stop offset="50%" stopColor="#c2410c" />
              <stop offset="80%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>

            <linearGradient id="solcDepletion" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.6} />
              <stop offset="30%" stopColor="#a78bfa" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#c084fc" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#e879f9" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.6} />
            </linearGradient>

            <linearGradient id="solcARCoating" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
              <stop offset="25%" stopColor="#06b6d4" stopOpacity={0.5} />
              <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.6} />
              <stop offset="75%" stopColor="#06b6d4" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.4} />
            </linearGradient>

            <linearGradient id="solcMetalContact" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="20%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="80%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            <radialGradient id="solcElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity={1} />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="70%" stopColor="#1d4ed8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
            </radialGradient>

            <radialGradient id="solcHoleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity={1} />
              <stop offset="40%" stopColor="#fb923c" stopOpacity={0.8} />
              <stop offset="70%" stopColor="#ea580c" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#c2410c" stopOpacity={0} />
            </radialGradient>

            <radialGradient id="solcLensGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.15} />
            </radialGradient>

            <linearGradient id="solcEField" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            <linearGradient id="solcOutputPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            <filter id="solcSunBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="solcPhotonBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="solcParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="solcDepletionGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="solcInnerShadow">
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>

            <pattern id="solcLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity={0.3} />
            </pattern>
          </defs>

          <rect width={width} height={height} fill="url(#solcLabBg)" />
          <rect width={width} height={height} fill="url(#solcLabGrid)" />

          {/* Light Source */}
          <g transform={`translate(${lightX}, ${lightY})`}>
            <circle r={50 * (lightIntensity / 100)} fill="url(#solcSunGlow)" filter="url(#solcSunBlur)" />
            <circle r={25} fill="url(#solcSunCore)" filter="url(#solcSunBlur)">
              <animate attributeName="r" values="24;26;24" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r={12} fill="#fffbeb" opacity={0.9}>
              <animate attributeName="opacity" values="0.85;1;0.85" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text y={-40} textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold">
              LIGHT SOURCE
            </text>
            <text y={45} textAnchor="middle" fill="#94a3b8" fontSize="9">
              {lightIntensity}% intensity
            </text>
          </g>

          {rays}

          {photonPositions.map((photon, i) => (
            <g key={`solcPhoton${i}`} filter="url(#solcPhotonBlur)">
              <circle cx={photon.x} cy={photon.y} r={8} fill="url(#solcPhotonGlow)" opacity={0.8} />
              <circle cx={photon.x} cy={photon.y} r={4} fill="#fef9c3" />
              <path
                d={`M ${photon.x - 12} ${photon.y} Q ${photon.x - 6} ${photon.y - 4}, ${photon.x} ${photon.y} Q ${photon.x + 6} ${photon.y + 4}, ${photon.x + 12} ${photon.y}`}
                stroke="#fde047"
                strokeWidth="1.5"
                fill="none"
                opacity={0.6}
              />
            </g>
          ))}

          {showMagnifier && useMagnifier && (
            <g transform={`translate(${(lightX + cellX) / 2}, ${(lightY + cellY) / 2})`}>
              <ellipse rx={30} ry={50} fill="url(#solcLensGradient)" stroke="#0ea5e9" strokeWidth={3} />
              <ellipse rx={20} ry={35} fill="none" stroke="#bae6fd" strokeWidth={1} opacity={0.5} />
              <line x1={-25} y1={-40} x2={0} y2={0} stroke="#fcd34d" strokeWidth="1" strokeDasharray="4,2" opacity={0.4} />
              <line x1={25} y1={-40} x2={0} y2={0} stroke="#fcd34d" strokeWidth="1" strokeDasharray="4,2" opacity={0.4} />
              <text y={70} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
                2.5x CONCENTRATOR
              </text>
            </g>
          )}

          {/* Solar Cell Cross-Section */}
          <g transform={`translate(${cellX}, ${cellY})`}>
            <rect x={-10} y={-30} width={cellWidth + 20} height={cellHeight + 50} rx={6} fill="#111827" stroke="#1f2937" strokeWidth={1.5} />
            <rect x={0} y={0} width={cellWidth} height={8} rx={2} fill="url(#solcARCoating)" filter="url(#solcInnerShadow)" />
            <text x={cellWidth + 15} y={6} fill="#06b6d4" fontSize="8" fontWeight="bold">AR Coating</text>

            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <rect
                key={`solcTopContact${i}`}
                x={20 + i * 40}
                y={-5}
                width={8}
                height={20}
                rx={1}
                fill="url(#solcMetalContact)"
              />
            ))}

            <rect x={0} y={8} width={cellWidth} height={45} fill="url(#solcNType)" />
            <text x={-8} y={28} fill="#60a5fa" fontSize="9" fontWeight="bold" textAnchor="end">N-type</text>
            <text x={-8} y={46} fill="#94a3b8" fontSize="8" textAnchor="end">(e- rich)</text>

            <rect x={0} y={53} width={cellWidth} height={20} fill="url(#solcDepletion)" filter="url(#solcDepletionGlow)" opacity={0.9} />
            {[40, 100, 160, 220].map((xPos, i) => (
              <g key={`solcEFieldArrow${i}`} transform={`translate(${xPos}, 63)`}>
                <line x1={0} y1={-6} x2={0} y2={6} stroke="url(#solcEField)" strokeWidth={2} />
                <polygon points="0,8 -4,2 4,2" fill="#a855f7" />
              </g>
            ))}
            <text x={cellWidth + 15} y={58} fill="#c084fc" fontSize="8" fontWeight="bold">Depletion</text>
            <text x={cellWidth + 15} y={78} fill="#94a3b8" fontSize="8">Region (E Field)</text>

            <rect x={0} y={73} width={cellWidth} height={60} fill="url(#solcPType)" />
            <text x={-8} y={95} fill="#fb923c" fontSize="9" fontWeight="bold" textAnchor="end">P-type</text>
            <text x={-8} y={115} fill="#94a3b8" fontSize="8" textAnchor="end">(h+ rich)</text>

            <rect x={0} y={133} width={cellWidth} height={10} rx={2} fill="url(#solcMetalContact)" />
            <text x={cellWidth + 15} y={140} fill="#9ca3af" fontSize="8">Back Contact</text>

            {ehPairs.map((pair, i) => {
              const animTime = ((Date.now() / 1000) + pair.delay) % 2;
              const showPair = animTime < 1.5 && output.effectiveIntensity > 0.2;
              // Ensure minimum 25px separation between particles at all times
              const electronY = pair.y - 15 - Math.min(animTime * 30, 35);
              const holeY = pair.y + 15 + Math.min(animTime * 25, 30);

              if (!showPair) return null;

              return (
                <g key={`solcEHPair${i}`} opacity={Math.max(0, 1 - animTime / 1.5)}>
                  {animTime < 0.3 && (
                    <circle cx={pair.x - cellX} cy={pair.y - cellY} r={10 * (1 - animTime / 0.3)} fill="#fef9c3" opacity={0.8} filter="url(#solcPhotonBlur)" />
                  )}
                  <g filter="url(#solcParticleGlow)">
                    <circle cx={pair.x - cellX} cy={electronY - cellY} r={6} fill="url(#solcElectronGlow)" />
                    <circle cx={pair.x - cellX} cy={electronY - cellY} r={3} fill="#93c5fd" />
                  </g>
                  <g filter="url(#solcParticleGlow)">
                    <circle cx={pair.x - cellX} cy={holeY - cellY} r={6} fill="url(#solcHoleGlow)" />
                    <circle cx={pair.x - cellX} cy={holeY - cellY} r={3} fill="#fed7aa" stroke="#ea580c" strokeWidth={1} fillOpacity={0.3} />
                  </g>
                </g>
              );
            })}

            <g transform={`translate(${cellWidth + 5}, 0)`}>
              <line x1={5} y1={10} x2={5} y2={130} stroke="#22c55e" strokeWidth={2} strokeDasharray="6,3">
                <animate attributeName="stroke-dashoffset" values="0;-18" dur="0.8s" repeatCount="indefinite" />
              </line>
              <polygon points="5,-5 0,5 10,5" fill="#22c55e" />
              <text x={15} y={110} fill="#22c55e" fontSize="8" fontWeight="bold">I</text>
            </g>
          </g>

          <g transform={`translate(${(lightX + cellX) / 2}, ${height - 50})`}>
            <line x1={-80} y1={0} x2={80} y2={0} stroke="#475569" strokeWidth={1} />
            <line x1={-80} y1={-5} x2={-80} y2={5} stroke="#475569" strokeWidth={2} />
            <line x1={80} y1={-5} x2={80} y2={5} stroke="#475569" strokeWidth={2} />
            <text y={-10} textAnchor="middle" fill="#94a3b8" fontSize="10">
              Distance: {lightDistance} cm
            </text>
          </g>

          <g transform="translate(10, 260)">
            <rect width={145} height={130} rx={8} fill="url(#solcOutputPanel)" stroke="#f59e0b" strokeWidth={1.5} />
            <text x={72} y={20} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">OUTPUT READINGS</text>
            <line x1={10} y1={28} x2={135} y2={28} stroke="#334155" strokeWidth={1} />
            <text x={15} y={48} fill="#94a3b8" fontSize="9">Voltage:</text>
            <text x={130} y={48} textAnchor="end" fill="#f8fafc" fontSize="11" fontWeight="bold">{output.voltage.toFixed(2)} V</text>
            <text x={15} y={68} fill="#94a3b8" fontSize="9">Current:</text>
            <text x={130} y={68} textAnchor="end" fill="#f8fafc" fontSize="11" fontWeight="bold">{output.current.toFixed(1)} mA</text>
            <text x={15} y={88} fill="#94a3b8" fontSize="9">Power:</text>
            <text x={130} y={88} textAnchor="end" fill="#10b981" fontSize="12" fontWeight="bold">{output.power.toFixed(1)} mW</text>
            <line x1={10} y1={96} x2={135} y2={96} stroke="#334155" strokeWidth={1} />
            <text x={15} y={114} fill="#94a3b8" fontSize="8">Efficiency:</text>
            <text x={130} y={114} textAnchor="end" fill="#06b6d4" fontSize="10" fontWeight="bold">{output.efficiency.toFixed(1)}%</text>
          </g>

          <g transform={`translate(${width - 120}, 15)`}>
            <rect x={-10} y={-10} width={125} height={85} rx={6} fill="rgba(15,23,42,0.9)" stroke="#334155" />
            <text x={52} y={8} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">LEGEND</text>
            <circle cx={10} cy={28} r={5} fill="url(#solcElectronGlow)" />
            <text x={22} y={31} fill="#60a5fa" fontSize="8">Electron (e-)</text>
            <circle cx={10} cy={48} r={5} fill="url(#solcHoleGlow)" />
            <text x={22} y={51} fill="#fb923c" fontSize="8">Hole (h+)</text>
            <circle cx={10} cy={68} r={5} fill="url(#solcPhotonGlow)" />
            <text x={22} y={71} fill="#fcd34d" fontSize="8">Photon</text>
          </g>

          <g transform={`translate(${cellX + 140}, ${cellY + cellHeight + 35})`}>
            <text textAnchor="middle" fill="#94a3b8" fontSize="9">
              Panel Angle: {panelAngle} deg from perpendicular
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)` : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating ? '0 4px 15px rgba(239,68,68,0.4)' : '0 4px 15px rgba(16,185,129,0.4)',
              }}
            >
              {isAnimating ? 'Stop Animation' : 'Animate Distance'}
            </button>
            <button
              onClick={() => { setLightDistance(50); setPanelAngle(0); setLightIntensity(100); setUseMagnifier(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset All
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showMagnifier: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Distance: {lightDistance} cm
        </label>
        <input
          type="range"
          min="20"
          max="100"
          step="5"
          value={lightDistance}
          onChange={(e) => setLightDistance(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Panel Angle: {panelAngle} degrees
        </label>
        <input
          type="range"
          min="-80"
          max="80"
          step="5"
          value={panelAngle}
          onChange={(e) => setPanelAngle(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Intensity: {lightIntensity}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={lightIntensity}
          onChange={(e) => setLightIntensity(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      {showMagnifier && (
        <div>
          <label style={{
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={useMagnifier}
              onChange={(e) => setUseMagnifier(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Use Magnifying Lens (2.5x concentration)
          </label>
        </div>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Effective Intensity: {(calculateOutput().effectiveIntensity * 100).toFixed(0)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          I = I_0 x cos(theta) x (1/r^2) {useMagnifier ? 'x 2.5 (lens)' : ''}
        </div>
      </div>
    </div>
  );

  // Bottom navigation bar
  const renderBottomBar = (canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const handleBack = () => {
      if (currentIdx > 0) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

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
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.3,
            minHeight: '44px'
          }}
          onClick={handleBack}
        >
          ← Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px'
          }}
          onClick={handleNext}
        >
          {nextLabel} →
        </button>
      </div>
    );
  };

  // Progress bar header
  const renderProgressBar = () => (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '8px 12px' : '10px 16px',
      backgroundColor: colors.bgCard,
      borderBottom: `1px solid ${colors.border}`,
      position: 'relative',
      zIndex: 10,
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={goBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            backgroundColor: currentIdx > 0 ? colors.bgCardLight : 'transparent',
            border: currentIdx > 0 ? `1px solid ${colors.border}` : '1px solid transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'default',
            opacity: currentIdx > 0 ? 1 : 0.4,
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
          title={currentIdx > 0 ? `Back to ${phaseLabels[phaseOrder[currentIdx - 1]]}` : 'No previous step'}
        >
          <span style={{ fontSize: '14px' }}>←</span>
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flex: 1,
        justifyContent: 'center'
      }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => { if (i <= currentIdx) goToPhase(p); }}
            role="button"
            tabIndex={0}
            style={{
              width: i === currentIdx ? '20px' : '10px',
              height: '10px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: i < currentIdx
                ? colors.success
                : i === currentIdx
                  ? colors.accent
                  : colors.border,
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              opacity: i > currentIdx ? 0.5 : 1,
              minWidth: '10px',
              minHeight: '10px'
            }}
            title={phaseLabels[p]}
            aria-label={phaseLabels[p]}
          />
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: colors.accent,
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: `${colors.accent}15`
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </div>
    </div>
  );

  // Premium wrapper with proper scroll structure
  const renderPremiumWrapper = (children: React.ReactNode, footer?: React.ReactNode) => (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: colors.bgPrimary,
      color: colors.textPrimary,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100
    }}>
      {renderProgressBar()}

      <div style={{
        flex: '1 1 0%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '80px'
      }}>
        {children}
      </div>

      {footer}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ textAlign: 'center', marginBottom: typo.sectionGap }}>
          <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>
            Solar Cell as a Physics Detector
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge }}>
            Discover how light intensity affects electrical output
          </p>
        </div>

        {renderVisualization(true)}

        <div style={{
          background: colors.bgCard,
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginTop: typo.sectionGap,
        }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, fontWeight: 400 }}>
            A solar cell converts light into electricity. But how does the power output
            change when you move the light closer? When you tilt the panel? The answers
            reveal fundamental physics principles that engineers use every day!
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '12px' }}>
            Solar cells act as precise physics detectors for light intensity, following the inverse-square law and cosine dependence.
          </p>
        </div>

        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          padding: '16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.accent}`,
          marginTop: typo.sectionGap,
        }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
            Try adjusting the distance and angle to see how power output changes!
          </p>
        </div>
      </div>,
      renderBottomBar(true, 'Start Discovery')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginTop: typo.sectionGap,
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>What to Watch:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.5 }}>
            A light source illuminating a solar panel. The panel converts light energy into
            electrical current and voltage. The display shows real-time voltage (V), current (mA),
            and power output (mW = V x I).
          </p>
        </div>

        <div style={{ marginTop: typo.sectionGap }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.heading }}>
            If you double the light brightness, what happens to the power output?
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
                  fontSize: typo.body,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(!!prediction, 'Test My Prediction')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ textAlign: 'center', marginBottom: typo.sectionGap }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>Explore Solar Cell Response</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            Adjust distance, angle, and intensity to discover the physics. Higher values result in more power output.
          </p>
        </div>

        {renderVisualization(true)}
        {renderControls()}

        <div style={{
          background: colors.bgCard,
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginTop: typo.sectionGap,
        }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.bodyLarge }}>Try These Experiments:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Move light from 20cm to 100cm - how does power change? This demonstrates the inverse-square law.</li>
            <li>Keep distance fixed, tilt panel from 0 to 80 degrees - this shows the cosine dependence.</li>
            <li>Find the combination for maximum power output - that's what engineers optimize!</li>
            <li>Note: current changes more than voltage because photocurrent is proportional to intensity.</li>
          </ul>
        </div>
      </div>,
      renderBottomBar(true, 'Continue to Review')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'nonlinear';

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          marginBottom: typo.sectionGap,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
            Power output depends on intensity, but through multiple factors: current is linear with intensity,
            while voltage increases only logarithmically. The result is approximately linear for current, but the
            overall system shows nonlinear behavior at extremes.
          </p>
        </div>

        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
          marginTop: typo.sectionGap,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>The Physics of Solar Cells</h3>
          <div style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Inverse Square Law:</strong> Light intensity
              decreases as 1/r^2 from a point source. Moving twice as far means only 1/4 the intensity!
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Cosine Law:</strong> Effective intensity
              depends on cos(theta) where theta is the angle from perpendicular. At 60 degrees, only 50%
              of the light is captured.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Current vs Voltage:</strong> Photocurrent
              is proportional to intensity (more photons = more electrons). Voltage increases only
              logarithmically with intensity.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Power:</strong> P = V x I. Since V is nearly
              constant and I is proportional to intensity, power is approximately proportional to intensity.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Next: A Twist!')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ textAlign: 'center', marginBottom: typo.sectionGap }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.heading }}>The Twist</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            What if we add a magnifying lens to concentrate the light?
          </p>
        </div>

        {renderVisualization(false, true)}

        <div style={{
          background: colors.bgCard,
          padding: typo.cardPadding,
          borderRadius: '12px',
          marginTop: typo.sectionGap,
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>What to Watch:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.5 }}>
            A magnifying lens is placed between the light source and the solar panel.
            The lens concentrates the light, increasing the intensity hitting the panel
            by about 2.5x. This is similar to concentrated solar power (CSP) systems.
          </p>
        </div>

        <div style={{ marginTop: typo.sectionGap }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.heading }}>
            What will happen when we use the magnifier with indoor light?
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
                  fontSize: typo.body,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(!!twistPrediction, 'Test My Prediction')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ textAlign: 'center', marginBottom: typo.sectionGap }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.heading }}>Test the Magnifier</h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            Toggle the magnifier and observe the output changes. When enabled, intensity increases by 2.5x.
          </p>
        </div>

        {renderVisualization(true, true)}
        {renderControls(true)}

        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          padding: '16px',
          borderRadius: '12px',
          borderLeft: `3px solid ${colors.warning}`,
          marginTop: typo.sectionGap,
        }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.bodyLarge }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            The magnifier increases effective intensity by concentrating light onto a smaller area.
            With careful indoor use, this boosts power output significantly. In bright sunlight,
            thermal management becomes critical!
          </p>
        </div>
      </div>,
      renderBottomBar(true, 'See the Explanation')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'boost';

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          marginBottom: typo.sectionGap,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
            With indoor light, the magnifier safely boosts output! The concentrated light increases
            current significantly, producing more power.
          </p>
        </div>

        {renderVisualization(false, true)}

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
          marginTop: typo.sectionGap,
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px', fontSize: typo.heading }}>Concentrated Solar Power</h3>
          <div style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Concentration Factor:</strong> A simple
              magnifier provides 2-3x concentration. Industrial concentrators can achieve 500-1000x!
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Thermal Challenge:</strong> In sunlight,
              concentrated solar creates intense heat. Special multi-junction cells with cooling
              systems are required for high concentration ratios.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Indoor Safety:</strong> With typical
              indoor lighting (~500 lux vs 100,000 lux sunlight), magnification is safe and
              demonstrates the principle without thermal risks.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Apply This Knowledge')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allComplete = completedApps.every(c => c);
    const currentApp = realWorldApps[transferApp];

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ textAlign: 'center', marginBottom: typo.sectionGap }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
            Solar cell physics applies across many technologies
          </p>
          <p style={{ color: colors.textMuted, fontSize: typo.small, marginTop: '8px' }}>
            Complete all 4 applications to unlock the test ({completedApps.filter(c => c).length}/4)
          </p>
        </div>

        {/* App tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: typo.sectionGap, flexWrap: 'wrap', justifyContent: 'center' }}>
          {realWorldApps.map((app, idx) => (
            <button
              key={idx}
              onClick={() => setTransferApp(idx)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: transferApp === idx ? `2px solid ${app.color}` : `1px solid ${colors.border}`,
                background: transferApp === idx ? `${app.color}20` : 'transparent',
                color: completedApps[idx] ? colors.success : colors.textSecondary,
                cursor: 'pointer',
                fontSize: typo.small,
                fontWeight: transferApp === idx ? 700 : 400,
              }}
            >
              {app.icon} {completedApps[idx] && '✓'}
            </button>
          ))}
        </div>

        {/* Current app content */}
        <div style={{
          background: colors.bgCard,
          padding: typo.cardPadding,
          borderRadius: '12px',
          border: `1px solid ${currentApp.color}40`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{currentApp.icon}</span>
            <div>
              <h3 style={{ color: colors.textPrimary, fontSize: typo.heading }}>{currentApp.title}</h3>
              <p style={{ color: currentApp.color, fontSize: typo.small }}>{currentApp.tagline}</p>
            </div>
          </div>

          <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '12px' }}>{currentApp.description}</p>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '12px' }}>{currentApp.howItWorks}</p>
          <p style={{ color: colors.textMuted, fontSize: typo.small, marginBottom: '12px' }}>Future Impact: {currentApp.futureImpact}</p>

          <div style={{ background: `${currentApp.color}15`, padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 600 }}>Physics Connection:</p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>{currentApp.connection}</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {currentApp.stats.map((stat, i) => (
              <div key={i} style={{ background: colors.bgCardLight, padding: '8px 12px', borderRadius: '8px', textAlign: 'center', flex: '1 1 80px' }}>
                <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: currentApp.color }}>{stat.value}</div>
                <div style={{ fontSize: typo.label, color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <p style={{ color: colors.textMuted, fontSize: typo.small, marginBottom: '4px' }}>Companies:</p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small }}>{currentApp.companies.join(' • ')}</p>
          </div>

          {!completedApps[transferApp] ? (
            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[transferApp] = true;
                setCompletedApps(newCompleted);
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${currentApp.color} 0%, ${currentApp.color}dd 100%)`,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              Got It!
            </button>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ color: colors.success, fontWeight: 600 }}>✓ Application Complete</span>
            </div>
          )}
        </div>

        {/* Next app button */}
        {transferApp < realWorldApps.length - 1 && (
          <button
            onClick={() => setTransferApp(transferApp + 1)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: typo.body,
              marginTop: typo.elementGap,
            }}
          >
            Next App →
          </button>
        )}
      </div>,
      renderBottomBar(allComplete, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPremiumWrapper(
        <div style={{ padding: typo.pagePadding }}>
          <div style={{
            background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: typo.sectionGap,
          }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
              {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.body }}>
              {testScore >= 8 ? 'You\'ve mastered solar cell physics!' : 'Review the material and try again.'}
            </p>
          </div>
          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`, marginBottom: '12px' }}>
                <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold', fontSize: typo.body }}>Question {qIndex + 1} of 10: {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontSize: typo.small }}>
                    {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>,
        renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Test</h2>
          <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
        </div>
        <p style={{ color: colors.textMuted, fontSize: typo.small, marginBottom: '12px' }}>
          Test your understanding of solar cell physics. Apply the concepts of the inverse-square law, cosine dependence, and the relationship between voltage, current, and power that you explored in the simulation.
        </p>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {testQuestions.map((_, i) => (
            <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
          ))}
        </div>
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, lineHeight: 1.5 }}>{currentQ.question}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentQ.options.map((opt, oIndex) => (
            <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.body }}>
              {opt.text}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
          <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
          ) : (
            <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
          )}
        </div>
      </div>,
      null
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        <div style={{ textAlign: 'center', marginBottom: typo.sectionGap }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h1 style={{ color: colors.success, marginBottom: '8px', fontSize: typo.title }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: typo.bodyLarge }}>You've mastered solar cell physics and light detection</p>
        </div>
        <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: typo.sectionGap }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: typo.body }}>
            <li>Inverse-square law for light intensity (I proportional to 1/r^2)</li>
            <li>Cosine dependence on angle of incidence</li>
            <li>Current proportional to intensity, voltage nearly constant</li>
            <li>Power = Voltage x Current</li>
            <li>Concentrated solar power principles</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '20px', borderRadius: '12px', marginBottom: typo.sectionGap }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
            Modern solar cells achieve up to 47% efficiency using multi-junction designs and
            concentration. Space missions use solar panels with tracking systems to maximize power.
            The same physics applies to photodiodes used in optical communication, camera sensors,
            and medical imaging devices!
          </p>
        </div>
        {renderVisualization(true, true)}
      </div>,
      renderBottomBar(true, 'Complete Game')
    );
  }

  // Default fallback - return hook phase
  return renderPremiumWrapper(
    <div style={{ padding: typo.pagePadding }}>
      <div style={{ textAlign: 'center', marginBottom: typo.sectionGap }}>
        <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>
          Solar Cell as a Physics Detector
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge }}>
          Discover how light intensity affects electrical output
        </p>
      </div>
      {renderVisualization(true)}
    </div>,
    renderBottomBar(true, 'Start Discovery')
  );
};

export default SolarCellRenderer;
