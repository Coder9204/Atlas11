import React, { useState, useEffect, useCallback } from 'react';

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

interface SolarCellRendererProps {
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
  solar: '#3b82f6',
  light: '#fcd34d',
  panel: '#1e3a5f',
};

const SolarCellRenderer: React.FC<SolarCellRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [lightDistance, setLightDistance] = useState(50);
  const [panelAngle, setPanelAngle] = useState(0);
  const [lightIntensity, setLightIntensity] = useState(100);
  const [useMagnifier, setUseMagnifier] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

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

  // Physics calculations
  const calculateOutput = useCallback(() => {
    // Base intensity from source
    const baseIntensity = lightIntensity / 100;

    // Inverse square law: I proportional to 1/r^2
    // Normalize distance (50 is reference distance)
    const distanceFactor = Math.pow(50 / lightDistance, 2);

    // Angle dependence: I proportional to cos(theta)
    const angleRad = (panelAngle * Math.PI) / 180;
    const angleFactor = Math.max(0, Math.cos(angleRad));

    // Magnifier effect (2.5x intensity boost when used)
    const magnifierFactor = useMagnifier ? 2.5 : 1;

    // Combined intensity on panel
    const effectiveIntensity = baseIntensity * distanceFactor * angleFactor * magnifierFactor;

    // Solar cell output (current proportional to intensity, voltage relatively stable)
    const voltage = Math.min(0.6, 0.45 + 0.15 * Math.sqrt(effectiveIntensity));
    const current = effectiveIntensity * 100; // mA
    const power = voltage * current; // mW

    // Efficiency (typical silicon cell ~15-20%)
    const inputPower = effectiveIntensity * 1000; // Arbitrary scaling for display
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

  const transferApplications = [
    {
      title: 'Solar Farms',
      description: 'Large-scale solar installations use tracking systems to follow the sun, maximizing the cosine factor throughout the day.',
      question: 'Why do solar farms use sun-tracking mounts instead of fixed panels?',
      answer: 'Fixed panels only achieve optimal angle (cos(0) = 1) briefly each day. Tracking systems keep panels perpendicular to sunlight, maximizing energy capture by 25-40% compared to fixed installations.',
    },
    {
      title: 'Satellite Power Systems',
      description: 'Satellites in orbit must carefully manage their solar panel orientation relative to the Sun while also managing thermal loads.',
      question: 'How does the inverse-square law affect satellite solar panel design?',
      answer: 'Satellites closer to the Sun (like Mercury missions) receive more intense light but also more heat. They may angle panels away from perpendicular to reduce thermal stress, trading efficiency for survivability.',
    },
    {
      title: 'Light Meters in Photography',
      description: 'Photographers use light meters with photodiodes (similar to solar cells) to measure scene brightness for proper exposure.',
      question: 'Why do light meters need to account for angle of incidence?',
      answer: 'A light meter pointed at an angle to the light source underestimates the true illumination. Professional meters use cosine-corrected diffusers to accurately measure light from any direction.',
    },
    {
      title: 'Solar-Powered Calculators',
      description: 'Simple calculators use small photovoltaic cells that work even in indoor lighting conditions.',
      question: 'How do calculator solar cells work in dim indoor light?',
      answer: 'Amorphous silicon cells in calculators are optimized for low-light conditions. They sacrifice peak efficiency for better performance across a wide intensity range, following a more logarithmic response.',
    },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showMagnifier: boolean = false) => {
    const width = 700;
    const height = 400;
    const output = calculateOutput();

    // Light source position based on distance
    const lightX = 60 + (100 - lightDistance) * 1.5;
    const lightY = 60;

    // Solar cell cross-section position
    const cellX = 320;
    const cellY = 180;
    const cellWidth = 280;
    const cellHeight = 160;

    // Calculate photon rays
    const numRays = 6;
    const rays = [];
    const photonPositions: { x: number; y: number; progress: number }[] = [];

    for (let i = 0; i < numRays; i++) {
      const targetY = cellY - 20 + (i * 50);
      const opacity = Math.max(0.2, output.effectiveIntensity * 0.5);
      const rayEndX = cellX - 10;

      // Calculate animated photon position along ray
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

    // Electron-hole pair generation positions (where photons hit the cell)
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
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="solcLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a1628" />
              <stop offset="70%" stopColor="#071320" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Sun/Light source radial gradient with depth */}
            <radialGradient id="solcSunCore" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
              <stop offset="25%" stopColor="#fef3c7" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
            </radialGradient>

            {/* Sun outer glow */}
            <radialGradient id="solcSunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4 * (lightIntensity / 100)} />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity={0.25 * (lightIntensity / 100)} />
              <stop offset="70%" stopColor="#d97706" stopOpacity={0.1 * (lightIntensity / 100)} />
              <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
            </radialGradient>

            {/* Photon beam gradient */}
            <linearGradient id="solcPhotonBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
            </linearGradient>

            {/* Photon particle glow */}
            <radialGradient id="solcPhotonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="1" />
              <stop offset="30%" stopColor="#fde047" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#facc15" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            {/* N-type silicon gradient (phosphorus doped - electron rich) */}
            <linearGradient id="solcNType" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="20%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="80%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* P-type silicon gradient (boron doped - hole rich) */}
            <linearGradient id="solcPType" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="20%" stopColor="#9a3412" />
              <stop offset="50%" stopColor="#c2410c" />
              <stop offset="80%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>

            {/* Depletion region gradient */}
            <linearGradient id="solcDepletion" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#a78bfa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#e879f9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.6" />
            </linearGradient>

            {/* Anti-reflective coating gradient */}
            <linearGradient id="solcARCoating" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.4" />
            </linearGradient>

            {/* Metal contact gradient */}
            <linearGradient id="solcMetalContact" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="20%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="80%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Electron glow (blue - negative) */}
            <radialGradient id="solcElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
            </radialGradient>

            {/* Hole glow (orange/red - positive) */}
            <radialGradient id="solcHoleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="1" />
              <stop offset="40%" stopColor="#fb923c" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
            </radialGradient>

            {/* Magnifier lens gradient */}
            <radialGradient id="solcLensGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.15" />
            </radialGradient>

            {/* Electric field arrows gradient */}
            <linearGradient id="solcEField" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            {/* Output panel gradient */}
            <linearGradient id="solcOutputPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            {/* Sun glow filter */}
            <filter id="solcSunBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Photon glow filter */}
            <filter id="solcPhotonBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Electron/hole glow filter */}
            <filter id="solcParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Depletion region glow */}
            <filter id="solcDepletionGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner shadow for depth */}
            <filter id="solcInnerShadow">
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>

            {/* Grid pattern for lab background */}
            <pattern id="solcLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#solcLabBg)" />
          <rect width={width} height={height} fill="url(#solcLabGrid)" />

          {/* === LIGHT SOURCE (SUN/LAMP) === */}
          <g transform={`translate(${lightX}, ${lightY})`}>
            {/* Outer glow */}
            <circle r={50 * (lightIntensity / 100)} fill="url(#solcSunGlow)" filter="url(#solcSunBlur)" />
            {/* Main sun body */}
            <circle r={25} fill="url(#solcSunCore)" filter="url(#solcSunBlur)">
              <animate attributeName="r" values="24;26;24" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Hot core */}
            <circle r={12} fill="#fffbeb" opacity="0.9">
              <animate attributeName="opacity" values="0.85;1;0.85" dur="1.5s" repeatCount="indefinite" />
            </circle>
            {/* Label */}
            <text y={-40} textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold">
              LIGHT SOURCE
            </text>
            <text y={45} textAnchor="middle" fill="#94a3b8" fontSize="9">
              {lightIntensity}% intensity
            </text>
          </g>

          {/* === PHOTON RAYS === */}
          {rays}

          {/* === ANIMATED PHOTONS === */}
          {photonPositions.map((photon, i) => (
            <g key={`solcPhoton${i}`} filter="url(#solcPhotonBlur)">
              <circle cx={photon.x} cy={photon.y} r={8} fill="url(#solcPhotonGlow)" opacity={0.8} />
              <circle cx={photon.x} cy={photon.y} r={4} fill="#fef9c3" />
              {/* Photon wave visualization */}
              <path
                d={`M ${photon.x - 12} ${photon.y} Q ${photon.x - 6} ${photon.y - 4}, ${photon.x} ${photon.y} Q ${photon.x + 6} ${photon.y + 4}, ${photon.x + 12} ${photon.y}`}
                stroke="#fde047"
                strokeWidth="1.5"
                fill="none"
                opacity="0.6"
              />
            </g>
          ))}

          {/* === MAGNIFIER LENS (if enabled) === */}
          {showMagnifier && useMagnifier && (
            <g transform={`translate(${(lightX + cellX) / 2}, ${(lightY + cellY) / 2})`}>
              {/* Lens body */}
              <ellipse rx={30} ry={50} fill="url(#solcLensGradient)" stroke="#0ea5e9" strokeWidth={3} />
              {/* Lens highlight */}
              <ellipse rx={20} ry={35} fill="none" stroke="#bae6fd" strokeWidth={1} opacity="0.5" />
              {/* Focus lines */}
              <line x1={-25} y1={-40} x2={0} y2={0} stroke="#fcd34d" strokeWidth="1" strokeDasharray="4,2" opacity="0.4" />
              <line x1={25} y1={-40} x2={0} y2={0} stroke="#fcd34d" strokeWidth="1" strokeDasharray="4,2" opacity="0.4" />
              {/* Label */}
              <text y={70} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
                2.5x CONCENTRATOR
              </text>
            </g>
          )}

          {/* === SOLAR CELL CROSS-SECTION === */}
          <g transform={`translate(${cellX}, ${cellY})`}>
            {/* Cell frame/housing */}
            <rect x={-10} y={-30} width={cellWidth + 20} height={cellHeight + 50} rx={6} fill="#111827" stroke="#1f2937" strokeWidth={1.5} />

            {/* Anti-reflective coating (top layer) */}
            <rect x={0} y={0} width={cellWidth} height={8} rx={2} fill="url(#solcARCoating)" filter="url(#solcInnerShadow)" />
            <text x={cellWidth + 15} y={6} fill="#06b6d4" fontSize="8" fontWeight="bold">AR Coating</text>

            {/* Top metal contacts (finger electrodes) */}
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

            {/* N-Type Silicon Layer (top - electron rich) */}
            <rect x={0} y={8} width={cellWidth} height={45} fill="url(#solcNType)" />
            <text x={-8} y={32} fill="#60a5fa" fontSize="9" fontWeight="bold" textAnchor="end">N-type</text>
            <text x={-8} y={42} fill="#94a3b8" fontSize="7" textAnchor="end">(e- rich)</text>

            {/* P-N Junction / Depletion Region */}
            <rect x={0} y={53} width={cellWidth} height={20} fill="url(#solcDepletion)" filter="url(#solcDepletionGlow)" opacity="0.9" />
            {/* Electric field arrows in depletion region */}
            {[40, 100, 160, 220].map((xPos, i) => (
              <g key={`solcEFieldArrow${i}`} transform={`translate(${xPos}, 63)`}>
                <line x1={0} y1={-6} x2={0} y2={6} stroke="url(#solcEField)" strokeWidth={2} />
                <polygon points="0,8 -4,2 4,2" fill="#a855f7" />
                <text y={-10} textAnchor="middle" fill="#c4b5fd" fontSize="6">E</text>
              </g>
            ))}
            <text x={cellWidth + 15} y={65} fill="#c084fc" fontSize="8" fontWeight="bold">Depletion</text>
            <text x={cellWidth + 15} y={75} fill="#94a3b8" fontSize="7">Region</text>

            {/* P-Type Silicon Layer (bottom - hole rich) */}
            <rect x={0} y={73} width={cellWidth} height={60} fill="url(#solcPType)" />
            <text x={-8} y={100} fill="#fb923c" fontSize="9" fontWeight="bold" textAnchor="end">P-type</text>
            <text x={-8} y={110} fill="#94a3b8" fontSize="7" textAnchor="end">(h+ rich)</text>

            {/* Bottom metal contact (back electrode) */}
            <rect x={0} y={133} width={cellWidth} height={10} rx={2} fill="url(#solcMetalContact)" />
            <text x={cellWidth + 15} y={140} fill="#9ca3af" fontSize="8">Back Contact</text>

            {/* === ELECTRON-HOLE PAIR GENERATION ANIMATION === */}
            {ehPairs.map((pair, i) => {
              const animTime = ((Date.now() / 1000) + pair.delay) % 2;
              const showPair = animTime < 1.5 && output.effectiveIntensity > 0.2;
              const electronY = pair.y - Math.min(animTime * 30, 35);
              const holeY = pair.y + Math.min(animTime * 25, 30);

              if (!showPair) return null;

              return (
                <g key={`solcEHPair${i}`} opacity={Math.max(0, 1 - animTime / 1.5)}>
                  {/* Photon absorption flash */}
                  {animTime < 0.3 && (
                    <circle cx={pair.x - cellX} cy={pair.y - cellY} r={10 * (1 - animTime / 0.3)} fill="#fef9c3" opacity={0.8} filter="url(#solcPhotonBlur)" />
                  )}

                  {/* Electron (moves up toward N-type) */}
                  <g filter="url(#solcParticleGlow)">
                    <circle cx={pair.x - cellX} cy={electronY - cellY} r={6} fill="url(#solcElectronGlow)" />
                    <circle cx={pair.x - cellX} cy={electronY - cellY} r={3} fill="#93c5fd" />
                    <text x={pair.x - cellX} y={electronY - cellY + 2} textAnchor="middle" fill="#1e3a8a" fontSize="6" fontWeight="bold">e-</text>
                  </g>

                  {/* Hole (moves down toward P-type) */}
                  <g filter="url(#solcParticleGlow)">
                    <circle cx={pair.x - cellX} cy={holeY - cellY} r={6} fill="url(#solcHoleGlow)" />
                    <circle cx={pair.x - cellX} cy={holeY - cellY} r={3} fill="#fed7aa" stroke="#ea580c" strokeWidth={1} fill-opacity="0.3" />
                    <text x={pair.x - cellX} y={holeY - cellY + 2} textAnchor="middle" fill="#7c2d12" fontSize="6" fontWeight="bold">h+</text>
                  </g>
                </g>
              );
            })}

            {/* Current flow indicators */}
            <g transform={`translate(${cellWidth + 5}, 0)`}>
              <line x1={5} y1={10} x2={5} y2={130} stroke="#22c55e" strokeWidth={2} strokeDasharray="6,3">
                <animate attributeName="stroke-dashoffset" values="0;-18" dur="0.8s" repeatCount="indefinite" />
              </line>
              <polygon points="5,-5 0,5 10,5" fill="#22c55e" />
              <text x={15} y={70} fill="#22c55e" fontSize="8" fontWeight="bold">I</text>
            </g>
          </g>

          {/* === DISTANCE INDICATOR === */}
          <g transform={`translate(${(lightX + cellX) / 2}, ${height - 50})`}>
            <line x1={-80} y1={0} x2={80} y2={0} stroke="#475569" strokeWidth={1} />
            <line x1={-80} y1={-5} x2={-80} y2={5} stroke="#475569" strokeWidth={2} />
            <line x1={80} y1={-5} x2={80} y2={5} stroke="#475569" strokeWidth={2} />
            <text y={-10} textAnchor="middle" fill="#94a3b8" fontSize="10">
              Distance: {lightDistance} cm
            </text>
          </g>

          {/* === OUTPUT DISPLAY PANEL === */}
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

          {/* === LEGEND === */}
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

          {/* === PANEL ANGLE INDICATOR === */}
          <g transform={`translate(${cellX + 140}, ${cellY + cellHeight + 35})`}>
            <text textAnchor="middle" fill="#94a3b8" fontSize="9">
              Panel Angle: {panelAngle}deg from perpendicular
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
          style={{ width: '100%' }}
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
          style={{ width: '100%' }}
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
          style={{ width: '100%' }}
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

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
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
              Solar Cell as a Physics Detector
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Does brightness scale linearly with output?
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
                A solar cell converts light into electricity. But how does the power output
                change when you move the light closer? When you tilt the panel? The answers
                reveal fundamental physics!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Solar cells act as precise physics detectors for light intensity.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the distance and angle to see how power output changes!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A light source illuminating a solar panel. The panel converts light energy into
              electrical current and voltage. The display shows real-time voltage (V), current (mA),
              and power output (mW = V x I).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
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
                    fontSize: '14px',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Solar Cell Response</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust distance, angle, and intensity to discover the physics
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Move light from 20cm to 100cm - how does power change?</li>
              <li>Keep distance fixed, tilt panel from 0 to 80 degrees</li>
              <li>Find the combination for maximum power output</li>
              <li>Note: current changes more than voltage!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'nonlinear';

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
              Power output depends on intensity, but through multiple factors: current is linear with intensity,
              while voltage increases only logarithmically. The result is approximately linear for current, but the
              overall system shows nonlinear behavior at extremes.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Solar Cells</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
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
              What if we add a magnifying lens to concentrate the light?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A magnifying lens is placed between the light source and the solar panel.
              The lens concentrates the light, increasing the intensity hitting the panel
              by about 2.5x. This is similar to concentrated solar power (CSP) systems.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
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
                    fontSize: '14px',
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Magnifier</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle the magnifier and observe the output changes
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
              The magnifier increases effective intensity by concentrating light onto a smaller area.
              With careful indoor use, this boosts power output significantly. In bright sunlight,
              thermal management becomes critical!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'boost';

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
              With indoor light, the magnifier safely boosts output! The concentrated light increases
              current significantly, producing more power.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Concentrated Solar Power</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
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
              Solar cell physics applies across many technologies
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
                {testScore >= 8 ? 'You\'ve mastered solar cell physics!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered solar cell physics and light detection</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Inverse-square law for light intensity (I proportional to 1/r^2)</li>
              <li>Cosine dependence on angle of incidence</li>
              <li>Current proportional to intensity, voltage nearly constant</li>
              <li>Power = Voltage x Current</li>
              <li>Concentrated solar power principles</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern solar cells achieve up to 47% efficiency using multi-junction designs and
              concentration. Space missions use solar panels with tracking systems to maximize power.
              The same physics applies to photodiodes used in optical communication, camera sensors,
              and medical imaging devices!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default SolarCellRenderer;
