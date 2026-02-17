import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface HotspotsRendererProps {
  phase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  hot: '#dc2626',
  warm: '#f97316',
  cool: '#3b82f6',
  cold: '#1d4ed8',
};

const HotspotsRenderer: React.FC<HotspotsRendererProps> = ({
  phase: initialPhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
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

  // Phase management - internal state
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Bypass Diodes',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const getInitialPhase = (): Phase => {
    if (initialPhase && phaseOrder.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && phaseOrder.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(p);

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

  // Simulation state
  const [shadedCellIndex, setShadedCellIndex] = useState(5);
  const [shadingLevel, setShadingLevel] = useState(80); // 0-100, higher = more shaded
  const [stringCurrent, setStringCurrent] = useState(8); // Amps
  const [bypassDiodeEnabled, setBypassDiodeEnabled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations - Hotspot power dissipation
  const calculateHotspot = useCallback(() => {
    const numCells = 12;
    const cellVoc = 0.6; // Open circuit voltage per cell

    // Shaded cell generates much less current
    const shadedCellCurrent = stringCurrent * (1 - shadingLevel / 100);

    // In series string, current is limited by weakest cell
    // But if string is forced to carry more current, shaded cell goes reverse-biased
    const currentMismatch = stringCurrent - shadedCellCurrent;

    // Reverse bias voltage on shaded cell
    // Can be up to (N-1) * Voc in worst case
    const reverseVoltage = bypassDiodeEnabled
      ? Math.min(0.7, currentMismatch * 0.1) // Bypass limits to ~0.7V
      : Math.min((numCells - 1) * cellVoc, currentMismatch * 2);

    // Power dissipated as heat in shaded cell
    const heatPower = stringCurrent * reverseVoltage;

    // Temperature rise (simplified thermal model)
    // Assume 0.5 deg C per watt for a typical cell
    const temperatureRise = heatPower * 0.5;
    const cellTemperature = 25 + temperatureRise;

    // Risk assessment
    const riskLevel = cellTemperature > 150 ? 'Critical' :
                      cellTemperature > 100 ? 'High' :
                      cellTemperature > 60 ? 'Moderate' : 'Low';

    return {
      shadedCellCurrent,
      currentMismatch,
      reverseVoltage: Math.max(0, reverseVoltage),
      heatPower: Math.max(0, heatPower),
      cellTemperature,
      temperatureRise,
      riskLevel,
      bypassActive: bypassDiodeEnabled && reverseVoltage > 0.5,
    };
  }, [shadedCellIndex, shadingLevel, stringCurrent, bypassDiodeEnabled]);

  // Animation for thermal buildup
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setShadingLevel(prev => {
        const newVal = prev + 2;
        if (newVal >= 95) {
          setIsAnimating(false);
          return 95;
        }
        return newVal;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'no_effect', label: 'Nothing happens - the shaded cell just produces less power' },
    { id: 'string_stops', label: 'The entire string stops working because one cell is shaded' },
    { id: 'heats_up', label: 'The shaded cell gets hot because it dissipates power instead of generating it' },
    { id: 'other_cells', label: 'The other cells work harder and get hot to compensate' },
  ];

  const twistPredictions = [
    { id: 'no_help', label: 'Bypass diodes don\'t help - the cell still heats up the same' },
    { id: 'stops_heat', label: 'Bypass diodes completely eliminate heating by skipping the shaded cell' },
    { id: 'reduces_heat', label: 'Bypass diodes reduce heating by limiting reverse voltage' },
    { id: 'makes_worse', label: 'Bypass diodes make heating worse by concentrating current' },
  ];

  const transferApplications = [
    {
      title: 'Rooftop Solar Maintenance',
      description: 'Residential solar systems often experience partial shading from chimneys, trees, or debris.',
      question: 'Why should homeowners keep their panels clean and check for hotspots periodically?',
      answer: 'Even small debris like leaves can create localized shading that causes hotspots. Over time, repeated thermal stress can crack cells, melt solder joints, or damage encapsulant. Regular inspection with a thermal camera can catch developing hotspots before permanent damage occurs.',
    },
    {
      title: 'Utility-Scale Solar Design',
      description: 'Large solar farms use sophisticated designs to minimize hotspot risk across thousands of panels.',
      question: 'Why do modern panels have bypass diodes for every 20-24 cells instead of the whole panel?',
      answer: 'Having bypass diodes for smaller cell groups limits the reverse voltage any single shaded cell can experience. With 3 bypass diodes per 60-cell panel, a shaded cell sees at most 19 cells of reverse voltage instead of 59, reducing hotspot power by ~70% and dramatically improving reliability.',
    },
    {
      title: 'Half-Cut Cell Technology',
      description: 'Modern panels use cells cut in half, creating 120 or 144 half-cells instead of 60 or 72 full cells.',
      question: 'How do half-cut cells reduce hotspot severity?',
      answer: 'Half-cut cells carry half the current of full cells. Since hotspot power = I x V, halving the current cuts hotspot power by half. Additionally, half-cell panels typically have 6 bypass diodes protecting smaller cell groups, further reducing the maximum reverse voltage.',
    },
    {
      title: 'IR Thermography Inspection',
      description: 'Professional solar inspectors use infrared cameras to detect hotspots during O&M.',
      question: 'What temperature difference indicates a problematic hotspot during IR inspection?',
      answer: 'Industry standards flag cells that are 10-20C warmer than neighbors as concerning, and cells 40C+ warmer as critical failures requiring immediate attention. Regular IR inspections can identify degrading cells before they cause fires or major damage.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes a solar cell to become a "hotspot" when shaded?',
      options: [
        { text: 'The cell absorbs extra sunlight from other cells', correct: false },
        { text: 'Series current forces the shaded cell into reverse bias, dissipating power as heat', correct: true },
        { text: 'The cell\'s internal resistance increases when shaded', correct: false },
        { text: 'Thermal radiation from neighboring cells heats the shaded cell', correct: false },
      ],
    },
    {
      question: 'In a series string of cells, when one cell is shaded:',
      options: [
        { text: 'Current increases through the shaded cell', correct: false },
        { text: 'Current decreases through the entire string', correct: false },
        { text: 'The shaded cell becomes reverse-biased if string current is forced', correct: true },
        { text: 'Voltage across the shaded cell increases normally', correct: false },
      ],
    },
    {
      question: 'The power dissipated as heat in a hotspot is calculated as:',
      options: [
        { text: 'String voltage divided by cell current', correct: false },
        { text: 'String current multiplied by reverse voltage across the shaded cell', correct: true },
        { text: 'Total string power divided by number of cells', correct: false },
        { text: 'Cell current squared times cell resistance', correct: false },
      ],
    },
    {
      question: 'How do bypass diodes protect against hotspots?',
      options: [
        { text: 'They increase current through shaded cells', correct: false },
        { text: 'They provide an alternate current path, limiting reverse voltage', correct: true },
        { text: 'They cool the cells through thermoelectric effect', correct: false },
        { text: 'They increase the voltage across shaded cells', correct: false },
      ],
    },
    {
      question: 'A typical bypass diode limits the reverse voltage across a shaded cell group to approximately:',
      options: [
        { text: '0.1 volts', correct: false },
        { text: '0.6-0.7 volts', correct: true },
        { text: '5-10 volts', correct: false },
        { text: '20-30 volts', correct: false },
      ],
    },
    {
      question: 'Why are hotspots more dangerous than just reduced power output?',
      options: [
        { text: 'They can cause cell cracking, encapsulant damage, and even fires', correct: true },
        { text: 'They only affect the shaded cell\'s efficiency', correct: false },
        { text: 'They are only a problem in cold weather', correct: false },
        { text: 'They reduce the warranty period', correct: false },
      ],
    },
    {
      question: 'What is the typical temperature threshold for a "critical" hotspot?',
      options: [
        { text: '50-60C above ambient', correct: false },
        { text: '10-20C above neighboring cells', correct: false },
        { text: '100-150C or more (absolute temperature)', correct: true },
        { text: 'Any temperature above 25C', correct: false },
      ],
    },
    {
      question: 'Half-cut cell panels reduce hotspot severity because:',
      options: [
        { text: 'Half-cut cells have higher voltage', correct: false },
        { text: 'Half-cut cells carry half the current, reducing P = I x V', correct: true },
        { text: 'Half-cut cells are more resistant to shading', correct: false },
        { text: 'Half-cut cells don\'t need bypass diodes', correct: false },
      ],
    },
    {
      question: 'Which shading scenario creates the worst hotspot?',
      options: [
        { text: 'Uniform light reduction across all cells', correct: false },
        { text: 'One cell completely shaded while others receive full sun', correct: true },
        { text: 'All cells in the string equally shaded', correct: false },
        { text: 'Shading that varies slowly throughout the day', correct: false },
      ],
    },
    {
      question: 'In a string with no bypass diode, a shaded cell can experience reverse voltage up to:',
      options: [
        { text: 'The shaded cell\'s own open-circuit voltage', correct: false },
        { text: 'The sum of all other cells\' voltages (N-1) x Voc', correct: true },
        { text: 'The inverter input voltage', correct: false },
        { text: 'Zero volts (cells don\'t reverse bias)', correct: false },
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

  const getTemperatureColor = (temp: number) => {
    if (temp > 120) return colors.hot;
    if (temp > 80) return colors.warm;
    if (temp > 50) return colors.warning;
    return colors.cool;
  };

  const realWorldApps = [
    {
      icon: 'Sun',
      title: 'Solar Panel Inspection',
      short: 'Photovoltaics',
      tagline: 'Detecting hidden defects before they cause failures',
      description: 'Thermal imaging revolutionizes solar farm maintenance by revealing cell-level defects invisible to the naked eye. Hotspots caused by shading, cracked cells, or degraded connections show up as bright spots on infrared cameras, enabling proactive maintenance before catastrophic failures occur.',
      connection: 'The same hotspot physics you learned applies directly here - shaded or damaged cells go into reverse bias, dissipating power as heat that thermal cameras can detect from the ground or drones.',
      howItWorks: 'Infrared cameras detect the 8-14 micrometer wavelength radiation emitted by objects based on their temperature. Solar panels typically operate at 40-60C, but hotspots can exceed 150C, creating stark thermal contrast that identifies problem cells instantly.',
      stats: [
        { value: '85%', label: 'Defects found via thermal imaging' },
        { value: '10x', label: 'Faster than visual inspection' },
        { value: '$50K+', label: 'Typical savings per MW annually' }
      ],
      examples: [
        'Drone-based thermal inspection of utility-scale solar farms',
        'Handheld IR cameras for residential system troubleshooting',
        'Automated monitoring systems with fixed thermal sensors',
        'Quality control during manufacturing to catch defects early'
      ],
      companies: ['FLIR Systems', 'DJI Enterprise', 'Raptor Maps', 'SunPower', 'First Solar'],
      futureImpact: 'AI-powered thermal analysis will enable real-time hotspot detection across millions of panels, predicting failures weeks in advance and automatically dispatching maintenance crews before damage occurs.',
      color: '#f59e0b'
    },
    {
      icon: 'Cpu',
      title: 'Chip Thermal Analysis',
      short: 'Semiconductors',
      tagline: 'Managing heat in microscopic circuits',
      description: 'Modern processors pack billions of transistors into chips smaller than a fingernail, creating intense localized heating. Thermal imaging at the chip level identifies hotspots that limit performance, cause reliability issues, and drive cooling system design.',
      connection: 'Just like a shaded solar cell dissipates power as heat due to current mismatch, transistors in high-activity regions dissipate more power, creating thermal gradients that affect performance and longevity.',
      howItWorks: 'Specialized infrared microscopes with sub-micrometer resolution map temperature distributions across active chips. Lock-in thermography synchronizes with clock signals to isolate heat from specific circuit blocks, while transient thermal imaging captures nanosecond-scale heating events.',
      stats: [
        { value: '100W/cm2', label: 'Power density in modern CPUs' },
        { value: '0.1C', label: 'Temperature resolution achieved' },
        { value: '1um', label: 'Spatial resolution possible' }
      ],
      examples: [
        'CPU and GPU hotspot mapping for cooler design optimization',
        'Failure analysis of defective integrated circuits',
        'Power integrity verification during chip development',
        'Thermal validation of 3D stacked chip packages'
      ],
      companies: ['Intel', 'AMD', 'NVIDIA', 'Quantum Focus Instruments', 'Microsanj'],
      futureImpact: 'As chips move to 3D stacking and chiplet architectures, thermal management becomes even more critical. Advanced thermal imaging will guide the design of integrated cooling solutions and adaptive power management.',
      color: '#8b5cf6'
    },
    {
      icon: 'Building',
      title: 'Building Thermography',
      short: 'Energy Auditing',
      tagline: 'Making invisible heat loss visible',
      description: 'Buildings account for 40% of global energy consumption, with much wasted through poor insulation, air leaks, and thermal bridges. Infrared thermography reveals these invisible energy losses, guiding cost-effective retrofits that dramatically reduce heating and cooling costs.',
      connection: 'The thermal imaging principles used to detect solar panel hotspots apply directly to buildings - temperature differences indicate where energy is being wasted through conduction, convection, or radiation.',
      howItWorks: 'During cold weather, heated buildings lose warmth through defects that show up as warm spots on exterior thermal scans. Conversely, in summer, AC losses appear as cool spots. Interior scans reveal missing insulation, air infiltration paths, and moisture problems before they cause visible damage.',
      stats: [
        { value: '30%', label: 'Typical energy savings identified' },
        { value: '3-5yr', label: 'Payback on recommended upgrades' },
        { value: '40%', label: 'Buildings share of energy use' }
      ],
      examples: [
        'Home energy audits identifying insulation gaps and air leaks',
        'Commercial building commissioning and retro-commissioning',
        'Detecting moisture intrusion and mold risk in walls',
        'Verifying quality of new construction insulation installation'
      ],
      companies: ['FLIR Systems', 'Testo', 'Building Diagnostics', 'Snell Group', 'Owens Corning'],
      futureImpact: 'Building codes increasingly require thermal verification of insulation. Drone-based neighborhood-scale thermal surveys will help cities prioritize weatherization programs and track progress toward carbon neutrality goals.',
      color: '#10b981'
    },
    {
      icon: 'Heart',
      title: 'Medical Thermal Imaging',
      short: 'Healthcare',
      tagline: 'Non-invasive detection of inflammation and circulation',
      description: 'The human body emits infrared radiation proportional to skin temperature, which varies with blood flow, metabolism, and inflammation. Medical thermography provides a completely non-invasive, radiation-free way to detect abnormalities ranging from breast tumors to diabetic foot complications.',
      connection: 'Like solar cell hotspots indicating localized power dissipation, elevated skin temperatures indicate increased metabolic activity or blood flow - often early signs of disease before other symptoms appear.',
      howItWorks: 'High-resolution thermal cameras detect temperature variations as small as 0.02C across the skin surface. Abnormal thermal patterns - asymmetric heat, unexpected hot or cold zones - can indicate tumors, vascular problems, inflammation, or nerve damage before they become clinically apparent.',
      stats: [
        { value: '97%', label: 'Sensitivity for breast abnormalities' },
        { value: '0.02C', label: 'Temperature sensitivity achieved' },
        { value: '0', label: 'Radiation exposure (completely safe)' }
      ],
      examples: [
        'Breast cancer screening as adjunct to mammography',
        'Diabetic foot assessment to prevent amputations',
        'Sports medicine for injury detection and recovery monitoring',
        'Fever screening at airports and public venues'
      ],
      companies: ['Meditherm', 'FLIR Systems', 'Infrared Cameras Inc', 'Seek Thermal', 'Therma-Scan'],
      futureImpact: 'AI-analyzed thermal imaging will become a routine part of preventive healthcare, detecting early signs of cardiovascular disease, cancer, and metabolic disorders during regular checkups with zero radiation risk.',
      color: '#ef4444'
    }
  ];

  const renderVisualization = (interactive: boolean, showBypass: boolean = false) => {
    const width = 520;
    const height = 400;
    const output = calculateHotspot();

    const numCells = 12;
    const cellWidth = 35;
    const cellHeight = 50;
    const cellGap = 3;

    // Calculate stable temperatures for non-shaded cells (avoid random on each render)
    const cellTemps = [...Array(numCells)].map((_, i) =>
      i === shadedCellIndex ? output.cellTemperature : 25 + (i * 1.3) % 5
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* Title label moved outside SVG */}
        <div style={{
          fontSize: typo.heading,
          fontWeight: 700,
          color: colors.accent,
          textAlign: 'center',
        }}>
          Series String of Solar Cells
        </div>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '560px' }}
        >
          <defs>
            {/* Premium thermal gradient - hot to cool with 6 stops */}
            <linearGradient id="hotThermalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="20%" stopColor="#3b82f6" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Hot cell gradient - vertical for cell fill */}
            <linearGradient id="hotCellGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="75%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>

            {/* Cool cell gradient - normal operating cells */}
            <linearGradient id="hotCoolCellGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Warm cell gradient - medium temperature */}
            <linearGradient id="hotWarmCellGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>

            {/* Solar panel frame metallic gradient */}
            <linearGradient id="hotPanelFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Sun gradient */}
            <radialGradient id="hotSunGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="70%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.5" />
            </radialGradient>

            {/* Cloud gradient */}
            <radialGradient id="hotCloudGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </radialGradient>

            {/* Bypass diode active glow */}
            <radialGradient id="hotBypassGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.6" />
            </radialGradient>

            {/* Data panel glass effect */}
            <linearGradient id="hotPanelGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(30,41,59,0.95)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0.98)" />
            </linearGradient>

            {/* Heat glow filter */}
            <filter id="hotHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense heat glow for critical temps */}
            <filter id="hotCriticalGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feColorMatrix in="blur" type="matrix"
                values="1.5 0 0 0 0  0 0.3 0 0 0  0 0 0.3 0 0  0 0 0 1 0" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sun ray glow */}
            <filter id="hotSunGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bypass diode glow */}
            <filter id="hotBypassFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current flow arrow gradient */}
            <linearGradient id="hotCurrentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
            </linearGradient>

            {/* Chart gradient fill */}
            <linearGradient id="hotChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.1" />
            </linearGradient>

            {/* Grid pattern for solar cells */}
            <pattern id="hotCellGrid" width="7" height="10" patternUnits="userSpaceOnUse">
              <rect width="7" height="10" fill="none" />
              <line x1="0" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <line x1="3.5" y1="0" x2="3.5" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
            </pattern>
          </defs>

          {/* Background gradient */}
          <rect width={width} height={height} fill="url(#hotPanelGlass)" rx="12" />

          {/* Subtle grid overlay */}
          <pattern id="hotBgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="rgba(100,116,139,0.1)" strokeWidth="0.5" />
          </pattern>
          <rect width={width} height={height} fill="url(#hotBgGrid)" rx="12" />

          {/* Sun icon */}
          <circle cx={460} cy={30} r={18} fill="url(#hotSunGradient)" filter="url(#hotSunGlow)" />
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45) * Math.PI / 180;
            const x1 = 460 + Math.cos(angle) * 22;
            const y1 = 30 + Math.sin(angle) * 22;
            const x2 = 460 + Math.cos(angle) * 30;
            const y2 = 30 + Math.sin(angle) * 30;
            return (
              <line key={`sunray${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#fde047" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            );
          })}

          {/* Sun rays on non-shaded cells */}
          {[...Array(numCells)].map((_, i) => {
            if (i === shadedCellIndex) return null;
            const x = 50 + i * (cellWidth + cellGap) + cellWidth / 2;
            return (
              <g key={`sun${i}`} filter="url(#hotSunGlow)">
                <line x1={x} y1={55} x2={x} y2={70} stroke="#fde047" strokeWidth={2} opacity={0.7} />
                <line x1={x - 6} y1={58} x2={x - 3} y2={70} stroke="#fde047" strokeWidth={1.5} opacity={0.5} />
                <line x1={x + 6} y1={58} x2={x + 3} y2={70} stroke="#fde047" strokeWidth={1.5} opacity={0.5} />
              </g>
            );
          })}

          {/* Shade cloud over shaded cell */}
          <ellipse
            cx={50 + shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2}
            cy={55}
            rx={28}
            ry={18}
            fill="url(#hotCloudGradient)"
            opacity={Math.min(shadingLevel / 100 + 0.2, 1)}
          />
          {/* Cloud secondary puffs */}
          <ellipse
            cx={50 + shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2 - 15}
            cy={60}
            rx={12}
            ry={10}
            fill="url(#hotCloudGradient)"
            opacity={Math.min(shadingLevel / 100 + 0.1, 0.9)}
          />
          <ellipse
            cx={50 + shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2 + 15}
            cy={58}
            rx={14}
            ry={11}
            fill="url(#hotCloudGradient)"
            opacity={Math.min(shadingLevel / 100 + 0.1, 0.9)}
          />

          {/* Solar panel frame */}
          <rect x={44} y={73} width={numCells * (cellWidth + cellGap) + 8} height={cellHeight + 8}
            fill="none" stroke="url(#hotPanelFrame)" strokeWidth="4" rx="4" />

          {/* Solar cells */}
          <g transform="translate(50, 77)">
            {[...Array(numCells)].map((_, i) => {
              const isShaded = i === shadedCellIndex;
              const cellTemp = cellTemps[i];

              // Choose gradient based on temperature
              let cellGradient = 'url(#hotCoolCellGradient)';
              let glowFilter = undefined;
              if (isShaded) {
                if (output.cellTemperature > 120) {
                  cellGradient = 'url(#hotCellGradient)';
                  glowFilter = 'url(#hotCriticalGlow)';
                } else if (output.cellTemperature > 80) {
                  cellGradient = 'url(#hotCellGradient)';
                  glowFilter = 'url(#hotHeatGlow)';
                } else if (output.cellTemperature > 50) {
                  cellGradient = 'url(#hotWarmCellGradient)';
                }
              }

              return (
                <g key={`cell${i}`}>
                  {/* Cell body with gradient */}
                  <rect
                    x={i * (cellWidth + cellGap)}
                    y={0}
                    width={cellWidth}
                    height={cellHeight}
                    fill={cellGradient}
                    stroke={isShaded && output.cellTemperature > 60 ? colors.hot : '#475569'}
                    strokeWidth={isShaded ? 2 : 1}
                    rx={2}
                    filter={glowFilter}
                    opacity={isShaded ? 0.6 + shadingLevel / 250 : 1}
                  />

                  {/* Solar cell grid lines overlay */}
                  <rect
                    x={i * (cellWidth + cellGap)}
                    y={0}
                    width={cellWidth}
                    height={cellHeight}
                    fill="url(#hotCellGrid)"
                    rx={2}
                  />

                  {/* Series connection lines with gradient */}
                  {i < numCells - 1 && (
                    <line
                      x1={i * (cellWidth + cellGap) + cellWidth}
                      y1={cellHeight / 2}
                      x2={(i + 1) * (cellWidth + cellGap)}
                      y2={cellHeight / 2}
                      stroke="url(#hotCurrentGradient)"
                      strokeWidth={3}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Current flow arrows with gradient */}
          <g transform="translate(50, 145)">
            {[...Array(6)].map((_, i) => (
              <polygon
                key={`arrow${i}`}
                points={`${50 + i * 70},0 ${60 + i * 70},-6 ${60 + i * 70},6`}
                fill="url(#hotCurrentGradient)"
                filter="url(#hotSunGlow)"
              />
            ))}
          </g>

          {/* Bypass diode visualization */}
          {showBypass && (
            <g transform="translate(50, 77)">
              {/* Bypass diode arc */}
              <path
                d={`M ${Math.max(0, (shadedCellIndex - 1)) * (cellWidth + cellGap) + cellWidth / 2} ${-12}
                    Q ${shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2} ${-30}
                    ${Math.min(numCells - 1, shadedCellIndex + 1) * (cellWidth + cellGap) + cellWidth / 2} ${-12}`}
                fill="none"
                stroke={bypassDiodeEnabled ? '#22c55e' : colors.textMuted}
                strokeWidth={bypassDiodeEnabled ? 3 : 2}
                strokeDasharray={bypassDiodeEnabled ? 'none' : '5,5'}
                filter={bypassDiodeEnabled && output.bypassActive ? 'url(#hotBypassFilter)' : undefined}
              />
              {/* Diode symbol */}
              <circle
                cx={shadedCellIndex * (cellWidth + cellGap) + cellWidth / 2}
                cy={-22}
                r={10}
                fill={bypassDiodeEnabled && output.bypassActive ? 'url(#hotBypassGlow)' : colors.bgCard}
                stroke={bypassDiodeEnabled ? '#22c55e' : colors.textMuted}
                strokeWidth={2}
                filter={bypassDiodeEnabled && output.bypassActive ? 'url(#hotBypassFilter)' : undefined}
              />
            </g>
          )}

          {/* Thermal heatmap bar */}
          <g transform="translate(50, 165)">
            {/* Heatmap background */}
            <rect x={-5} y={8} width={numCells * (cellWidth + cellGap) + 6} height={28}
              fill="rgba(0,0,0,0.4)" rx={4} stroke="rgba(100,116,139,0.3)" strokeWidth="1" />

            {[...Array(numCells)].map((_, i) => {
              const isShaded = i === shadedCellIndex;
              const temp = cellTemps[i];
              const heatIntensity = Math.min((temp - 25) / 125, 1);

              return (
                <rect
                  key={`heat${i}`}
                  x={i * (cellWidth + cellGap)}
                  y={12}
                  width={cellWidth - 2}
                  height={20}
                  fill={`rgb(${Math.floor(heatIntensity * 220 + 35)}, ${Math.floor((1 - heatIntensity) * 120 + 30)}, ${Math.floor((1 - heatIntensity) * 180 + 40)})`}
                  rx={2}
                  filter={isShaded && output.cellTemperature > 100 ? 'url(#hotHeatGlow)' : undefined}
                />
              );
            })}

            {/* Temperature scale bar */}
            <rect x={0} y={42} width={numCells * (cellWidth + cellGap) - cellGap} height={8}
              fill="url(#hotThermalGradient)" rx={4} />
          </g>

          {/* Temperature indicator thermometer */}
          <g transform="translate(480, 80)">
            {/* Thermometer body */}
            <rect x={0} y={0} width={20} height={100} rx={10} fill="rgba(0,0,0,0.5)" stroke="#475569" strokeWidth="1" />
            {/* Mercury level */}
            <rect
              x={4}
              y={96 - Math.min((output.cellTemperature - 25) / 150, 1) * 90}
              width={12}
              height={Math.min((output.cellTemperature - 25) / 150, 1) * 90}
              rx={6}
              fill={output.cellTemperature > 100 ? 'url(#hotCellGradient)' : output.cellTemperature > 60 ? 'url(#hotWarmCellGradient)' : 'url(#hotCoolCellGradient)'}
              filter={output.cellTemperature > 100 ? 'url(#hotHeatGlow)' : undefined}
            />
            {/* Thermometer bulb */}
            <circle cx={10} cy={100} r={12} fill="rgba(0,0,0,0.5)" stroke="#475569" strokeWidth="1" />
            <circle
              cx={10}
              cy={100}
              r={9}
              fill={output.cellTemperature > 100 ? '#dc2626' : output.cellTemperature > 60 ? '#f97316' : '#3b82f6'}
              filter={output.cellTemperature > 100 ? 'url(#hotHeatGlow)' : undefined}
            />
            {/* Scale marks */}
            {[0, 50, 100, 150].map((temp, i) => (
              <g key={`mark${i}`}>
                <line x1={-5} y1={96 - (temp / 150) * 90} x2={0} y2={96 - (temp / 150) * 90}
                  stroke="#94a3b8" strokeWidth="1" />
              </g>
            ))}
          </g>

          {/* Data panel - Hotspot Analysis */}
          <g transform="translate(15, 225)">
            <rect x={0} y={0} width={230} height={135} fill="url(#hotPanelGlass)" rx={10}
              stroke="rgba(100,116,139,0.3)" strokeWidth="1" />

            {/* Panel header accent line */}
            <rect x={10} y={8} width={50} height={3} rx={1.5} fill={colors.accent} />
          </g>

          {/* Power vs Shading chart */}
          <g transform="translate(260, 190)">
            <rect x={0} y={0} width={240} height={185} fill="url(#hotPanelGlass)" rx={10}
              stroke="rgba(100,116,139,0.3)" strokeWidth="1" />

            {/* Chart header accent line */}
            <rect x={10} y={8} width={50} height={3} rx={1.5} fill={colors.accent} />

            {/* Y-axis label */}
            <text x={12} y={75} fill={colors.textSecondary} fontSize="10" fontWeight="600">
              Power
            </text>
            <text x={15} y={85} fill={colors.textSecondary} fontSize="10" fontWeight="600">
              (W)
            </text>

            {/* X-axis label */}
            <text x={95} y={177} fill={colors.textSecondary} fontSize="10" fontWeight="600" textAnchor="middle">
              Shading Level (%)
            </text>

            {/* Axes with better styling */}
            <line x1={40} y1={155} x2={215} y2={155} stroke="#475569" strokeWidth={1.5} />
            <line x1={40} y1={30} x2={40} y2={155} stroke="#475569" strokeWidth={1.5} />

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((pct, i) => (
              <line key={`gridH${i}`} x1={40} y1={155 - pct * 125} x2={215} y2={155 - pct * 125}
                stroke="rgba(100,116,139,0.2)" strokeWidth="1" strokeDasharray="3,3" />
            ))}
            {[0.25, 0.5, 0.75].map((pct, i) => (
              <line key={`gridV${i}`} x1={40 + pct * 175} y1={30} x2={40 + pct * 175} y2={155}
                stroke="rgba(100,116,139,0.2)" strokeWidth="1" strokeDasharray="3,3" />
            ))}

            {/* Filled area under curve */}
            <path
              d={`M 40,155 ${[...Array(20)].map((_, i) => {
                const shade = (i / 19) * 100;
                const power = stringCurrent * Math.min((11 * 0.6), (stringCurrent * shade / 100) * 2);
                const x = 40 + i * 9.2;
                const y = 155 - (power / 80) * 125;
                return `L ${x},${Math.max(30, y)}`;
              }).join(' ')} L 215,155 Z`}
              fill={bypassDiodeEnabled ? 'rgba(34,197,94,0.2)' : 'url(#hotChartGradient)'}
            />

            {/* Curve line */}
            <path
              d={`M 40,155 ${[...Array(20)].map((_, i) => {
                const shade = (i / 19) * 100;
                const power = stringCurrent * Math.min((11 * 0.6), (stringCurrent * shade / 100) * 2);
                const x = 40 + i * 9.2;
                const y = 155 - (power / 80) * 125;
                return `L ${x},${Math.max(30, y)}`;
              }).join(' ')}`}
              fill="none"
              stroke={bypassDiodeEnabled ? '#22c55e' : '#dc2626'}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {/* Current position marker */}
            <circle
              cx={40 + (shadingLevel / 100) * 175}
              cy={Math.max(30, 155 - (output.heatPower / 80) * 125)}
              r={7}
              fill={colors.accent}
              stroke="#1e293b"
              strokeWidth={2}
              filter="url(#hotSunGlow)"
            />

            {showBypass && output.bypassActive && (
              <g transform="translate(127, 50)">
                <rect x={-45} y={-12} width={90} height={20} rx={10} fill="rgba(34,197,94,0.2)" />
              </g>
            )}
          </g>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '560px',
          padding: '0 16px',
          gap: '16px'
        }}>
          {/* Hotspot Analysis panel label */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: typo.body,
              fontWeight: 700,
              color: colors.accent,
              marginBottom: '8px'
            }}>
              Hotspot Analysis
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: typo.small }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Shading Level:</span>
                <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{shadingLevel}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Reverse Voltage:</span>
                <span style={{ color: output.reverseVoltage > 5 ? colors.hot : colors.textPrimary, fontWeight: 600 }}>
                  {output.reverseVoltage.toFixed(1)} V
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Heat Power:</span>
                <span style={{ color: output.heatPower > 20 ? colors.hot : colors.textPrimary, fontWeight: 600 }}>
                  {output.heatPower.toFixed(1)} W
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Cell Temperature:</span>
                <span style={{ color: getTemperatureColor(output.cellTemperature), fontWeight: 700 }}>
                  {output.cellTemperature.toFixed(0)}C
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Risk Level:</span>
                <span style={{
                  color: output.riskLevel === 'Critical' ? colors.hot :
                         output.riskLevel === 'High' ? colors.warm : colors.success,
                  fontWeight: 700
                }}>
                  {output.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Power vs Shading panel label */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: typo.body,
              fontWeight: 700,
              color: colors.accent,
              marginBottom: '8px'
            }}>
              Power vs Shading
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: typo.small }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Current (I):</span>
                <span style={{ color: colors.warning, fontWeight: 600 }}>{stringCurrent} A</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Shaded Cell:</span>
                <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Cell {shadedCellIndex + 1}</span>
              </div>
              {showBypass && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.textSecondary }}>Bypass Diode:</span>
                  <span style={{
                    color: bypassDiodeEnabled ? colors.success : colors.textMuted,
                    fontWeight: 600
                  }}>
                    {bypassDiodeEnabled ? (output.bypassActive ? 'Active' : 'Ready') : 'Disabled'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thermal scale legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: typo.label,
          color: colors.textMuted,
          marginTop: '4px'
        }}>
          <span>25C</span>
          <div style={{
            width: '120px',
            height: '8px',
            background: 'linear-gradient(to right, #1d4ed8, #3b82f6, #22c55e, #eab308, #f97316, #dc2626)',
            borderRadius: '4px'
          }} />
          <span>150C+</span>
        </div>

        {/* Hotspot Power Formula */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '8px',
          padding: '12px 16px',
          background: 'rgba(245, 158, 11, 0.15)',
          borderRadius: '8px',
          maxWidth: '560px',
          marginLeft: 'auto',
          marginRight: 'auto',
          gap: '4px',
        }}>
          <span style={{
            fontSize: typo.label,
            color: colors.textSecondary,
            fontWeight: 600,
          }}>
            Hotspot Power Formula:
          </span>
          <span style={{
            fontSize: typo.bodyLarge,
            color: colors.accent,
            fontWeight: 700,
            fontFamily: 'monospace',
          }}>
            P = I × V
          </span>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setIsAnimating(!isAnimating); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                boxShadow: isAnimating
                  ? '0 4px 15px rgba(239,68,68,0.4)'
                  : '0 4px 15px rgba(34,197,94,0.4)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Pause' : 'Animate Shading'}
            </button>
            <button
              onClick={() => { setShadingLevel(0); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showBypass: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Shading Level: {shadingLevel}%
        </label>
        <input
          type="range"
          min="0"
          max="95"
          step="5"
          value={shadingLevel}
          onChange={(e) => setShadingLevel(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          String Current: {stringCurrent} A
        </label>
        <input
          type="range"
          min="1"
          max="12"
          step="0.5"
          value={stringCurrent}
          onChange={(e) => setStringCurrent(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Shaded Cell Position: Cell {shadedCellIndex + 1}
        </label>
        <input
          type="range"
          min="0"
          max="11"
          step="1"
          value={shadedCellIndex}
          onChange={(e) => setShadedCellIndex(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showBypass && (
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
              checked={bypassDiodeEnabled}
              onChange={(e) => setBypassDiodeEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Enable Bypass Diode
          </label>
        </div>
      )}

      <div style={{
        background: 'rgba(220, 38, 38, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.hot}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Heat Power = I_string x V_reverse = {stringCurrent}A x {calculateHotspot().reverseVoltage.toFixed(1)}V = {calculateHotspot().heatPower.toFixed(1)}W
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Temperature rise approx. {calculateHotspot().temperatureRise.toFixed(0)}C above ambient
        </div>
      </div>
    </div>
  );

  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgCard,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  const renderBottomBar = (canProceed: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    const handleNext = () => {
      if (!canProceed) return;
      if (onNext) {
        onNext();
      } else {
        goNext();
      }
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1001,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '12px 24px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: canBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            fontSize: '14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={handleNext}
          style={{
            padding: '12px 32px',
            minHeight: '44px',
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
          {nextLabel}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '44px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Can a Solar Cell Become a Heater?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The dangerous physics of hotspots
            </p>
          </div>

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Solar cells are designed to generate electricity from light. But what happens when
                one cell in a series string gets shaded while the others remain in full sun?
                The answer might surprise you - and it involves some serious heat!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is one of the most important reliability challenges in solar panel design.
              </p>
            </div>

            <div style={{
              background: 'rgba(220, 38, 38, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.hot}`,
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Shade one cell and watch the thermal camera view - things get hot!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: colors.accent, fontSize: '18px', marginBottom: '12px' }}>
                The Problem
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>
                In a series-connected string of solar cells, all cells must carry the same current.
                When one cell gets shaded, it can't generate as much current as the others. But if
                the string is forced to carry current, the shaded cell goes into reverse bias and
                starts dissipating power as heat instead of generating electricity.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, fontSize: '18px', marginBottom: '12px' }}>
                Why It Matters
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>
                Hotspots can reach temperatures exceeding 150°C, causing permanent damage to solar
                panels through cell cracking, encapsulant melting, and even fires. Understanding
                this phenomenon is critical for anyone working with photovoltaic systems.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A string of 12 solar cells connected in series (like a chain of batteries).
              Full sunlight hits 11 cells, but one cell is shaded by a leaf or bird dropping.
              The inverter tries to draw current through the entire string...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the shaded cell?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
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
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Hotspot Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust shading and current to see how hotspots form
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontStyle: 'italic', marginTop: '8px' }}>
              Observe how the thermal display changes as you adjust the sliders below.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              This is important because solar panel engineers use these principles to design safer, more reliable systems.
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
              <li>Increase shading from 0% to 95% - watch temperature rise</li>
              <li>Try different string currents - how does it affect heat?</li>
              <li>Find the shading level where temperature exceeds 100C</li>
              <li>Move the shaded cell - does position matter?</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'heats_up';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>
              You predicted: {predictions.find(p => p.id === prediction)?.label || 'No selection'}
            </p>
            <p style={{ color: colors.textPrimary }}>
              The shaded cell becomes a hotspot! It goes into reverse bias and dissipates power as heat,
              potentially reaching temperatures that can damage the cell and surrounding materials.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Hotspots</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Series Current Constraint:</strong> In a series string,
                all cells must carry the same current. A shaded cell that can't generate this current becomes a load instead of a source.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Reverse Bias:</strong> The other 11 cells collectively
                push current through the shaded cell, creating a reverse voltage across it. The cell acts like a resistor.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power Dissipation:</strong> Heat power = I x V.
                With 8A current and 5V reverse bias, that's 40W concentrated in a single small cell!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Damage Risk:</strong> Temperatures above 150C can
                melt solder, crack cells, burn encapsulant, and even start fires in extreme cases.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we add bypass diodes to the string?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Solution:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A bypass diode is connected in parallel with each cell (or group of cells).
              When a cell goes into reverse bias, the diode provides an alternate current path.
              How much will this help with the hotspot problem?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How will bypass diodes affect the hotspot?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
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
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Bypass Diodes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle the bypass diode and compare temperatures
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontStyle: 'italic', marginTop: '8px' }}>
              Observe how the bypass diode affects the thermal output as you experiment.
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <h4 style={{ color: colors.success, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The bypass diode limits reverse voltage to about 0.7V (its forward drop).
              This dramatically reduces heat power: instead of 40W, the hotspot might only be 5W!
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'reduces_heat';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              Bypass diodes reduce but don't eliminate hotspot heating.
              They limit reverse voltage to ~0.7V, cutting heat power by 85-95%!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>How Bypass Diodes Work</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Forward Voltage Drop:</strong> When the shaded cell's
                reverse voltage exceeds ~0.6V, the bypass diode conducts, clamping the voltage.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Current Sharing:</strong> The string current splits
                between the diode and the cell, with most current taking the lower-resistance diode path.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Modern Panels:</strong> Commercial panels typically
                have 3 bypass diodes protecting 20-cell groups. This balances cost against protection.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              How engineers and companies in the solar industry apply hotspot physics to real-world photovoltaic systems
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
              <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.hot, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    minHeight: '44px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '12px' }}>{app.answer}</p>
                  <button
                    onClick={() => {
                      // Move to next application or continue
                      const nextIndex = index + 1;
                      if (nextIndex < transferApplications.length && !transferCompleted.has(nextIndex)) {
                        // Scroll to next application
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      minHeight: '44px',
                      borderRadius: '6px',
                      border: 'none',
                      background: colors.success,
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
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
                {testScore >= 8 ? 'You understand hotspot physics!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <p style={{ color: colors.textPrimary, fontWeight: 'bold', flex: 1 }}>{qIndex + 1}. {q.question}</p>
                  </div>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? '✓ ' : userAnswer === oIndex ? '✗ ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setCurrentTestQuestion(0); })}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
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
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
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
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand solar cell hotspot physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Series current constraint forces shaded cells into reverse bias</li>
              <li>Hotspot power = I_string x V_reverse</li>
              <li>Temperatures can exceed 150C, causing permanent damage</li>
              <li>Bypass diodes limit reverse voltage to ~0.7V</li>
              <li>Half-cut cells and more bypass diodes reduce hotspot severity</li>
              <li>IR thermography detects hotspots before failure</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(220, 38, 38, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.hot, marginBottom: '12px' }}>Safety First:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Hotspots are a leading cause of solar panel fires and premature failure.
              Understanding this physics helps engineers design safer panels, installers avoid
              shading issues, and operators detect problems before they become dangerous.
              Your knowledge could literally prevent fires!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default HotspotsRenderer;
