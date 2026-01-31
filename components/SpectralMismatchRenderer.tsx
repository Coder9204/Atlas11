import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for this game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface SpectralMismatchRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Test Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  incandescent: '#ffb347',
  led: '#f0f8ff',
  sunlight: '#fffacd',
  uv: '#7c3aed',
  ir: '#991b1b',
};

const SpectralMismatchRenderer: React.FC<SpectralMismatchRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Navigation functions
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
  const [lightSource, setLightSource] = useState<'incandescent' | 'led' | 'sunlight'>('sunlight');
  const [hasUVFilter, setHasUVFilter] = useState(false);
  const [hasIRFilter, setHasIRFilter] = useState(false);
  const [cellBandgap, setCellBandgap] = useState(1.1); // Silicon bandgap in eV

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

  // Light source spectra (simplified model)
  const lightSources = {
    incandescent: {
      name: 'Incandescent (2700K)',
      color: colors.incandescent,
      uvContent: 0.01,
      visibleContent: 0.12,
      irContent: 0.87,
      humanBrightness: 85, // Perceived brightness
      pvPower: 35, // Relative PV output
      description: 'Warm, mostly infrared',
    },
    led: {
      name: 'LED (5000K)',
      color: colors.led,
      uvContent: 0.0,
      visibleContent: 0.95,
      irContent: 0.05,
      humanBrightness: 90,
      pvPower: 78,
      description: 'Cool, mostly visible',
    },
    sunlight: {
      name: 'Sunlight (AM1.5)',
      color: colors.sunlight,
      uvContent: 0.05,
      visibleContent: 0.43,
      irContent: 0.52,
      humanBrightness: 100,
      pvPower: 100,
      description: 'Full spectrum',
    },
  };

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const source = lightSources[lightSource];

    // Spectral content after filters
    let uvRemaining = hasUVFilter ? source.uvContent * 0.1 : source.uvContent;
    let irRemaining = hasIRFilter ? source.irContent * 0.2 : source.irContent;
    let visibleRemaining = source.visibleContent;

    // PV cell response - depends on bandgap
    // Silicon (1.1 eV) responds to wavelengths < 1127 nm
    // This means some IR is usable, UV/visible is all usable
    const usableUV = uvRemaining * 1.0; // All UV has enough energy
    const usableVisible = visibleRemaining * 1.0; // All visible has enough energy

    // For silicon, IR up to 1127nm is usable (roughly half of IR spectrum)
    const usableIR = irRemaining * 0.4;

    // Calculate total usable power
    const totalUsable = usableUV + usableVisible + usableIR;

    // Quantum efficiency loss from thermalization (excess energy wasted as heat)
    // Higher energy photons lose more energy
    const uvLoss = uvRemaining * 0.6; // UV loses 60% to heat
    const visibleLoss = visibleRemaining * 0.3; // Visible loses 30%
    const irLoss = usableIR * 0.1; // Usable IR loses only 10%

    const effectivePower = totalUsable - uvLoss - visibleLoss - irLoss;

    // Current proportional to number of photons above bandgap
    const current = effectivePower * source.pvPower * 0.4; // mA/cm²

    // Voltage determined by bandgap
    const voltage = cellBandgap * 0.7; // Approximate Voc

    // Power output
    const power = voltage * current;

    // Spectral mismatch factor (ratio of actual output to ideal)
    const spectralMismatch = effectivePower / (source.uvContent + source.visibleContent + source.irContent * 0.4);

    return {
      current,
      voltage,
      power,
      spectralMismatch: spectralMismatch * 100,
      uvContent: uvRemaining * 100,
      visibleContent: visibleRemaining * 100,
      irContent: irRemaining * 100,
      humanBrightness: source.humanBrightness,
    };
  }, [lightSource, hasUVFilter, hasIRFilter, cellBandgap]);

  const predictions = [
    { id: 'same', label: 'Similar-looking brightness means similar PV power output' },
    { id: 'warmer', label: 'Warmer (incandescent) light gives more power because it feels hotter' },
    { id: 'cooler', label: 'Cooler (LED) light gives more power because it\'s more efficient' },
    { id: 'spectrum', label: 'PV output depends on spectrum, not perceived brightness' },
  ];

  const twistPredictions = [
    { id: 'uv_helps', label: 'Blocking UV increases power (less heat damage)' },
    { id: 'ir_helps', label: 'Blocking IR increases power (less thermal stress)' },
    { id: 'both_hurt', label: 'Blocking either UV or IR reduces power (less usable photons)' },
    { id: 'no_effect', label: 'Filters have minimal effect on power output' },
  ];

  const transferApplications = [
    {
      title: 'Indoor Solar Lighting',
      description: 'Solar panels under artificial lighting behave very differently than outdoors.',
      question: 'Why do solar calculators work poorly under incandescent bulbs?',
      answer: 'Incandescent bulbs emit mostly infrared (heat) with little visible light. The amorphous silicon in calculators has a higher bandgap, so it can\'t use IR. LED or fluorescent lighting provides much more usable spectrum.',
    },
    {
      title: 'Multi-Junction Solar Cells',
      description: 'Space-grade solar cells use multiple layers to capture different parts of the spectrum.',
      question: 'How do multi-junction cells reduce spectral mismatch losses?',
      answer: 'Each junction has a different bandgap optimized for a different wavelength range. The top junction captures UV/blue, middle captures green/red, bottom captures IR. This minimizes thermalization losses from excess photon energy.',
    },
    {
      title: 'Solar Panel Testing',
      description: 'Solar simulators must match the sun\'s spectrum for accurate testing.',
      question: 'Why can\'t any bright light source test solar panels accurately?',
      answer: 'A halogen lamp might match the sun\'s intensity but has too much IR and too little blue. The panel\'s output would be lower than under real sunlight because silicon can\'t efficiently convert the excess IR.',
    },
    {
      title: 'Greenhouse Solar Panels',
      description: 'Transparent solar panels in greenhouses must balance electricity and plant growth.',
      question: 'What spectrum trade-offs exist for transparent solar panels?',
      answer: 'Plants need red and blue light for photosynthesis but don\'t use green. Transparent PV can absorb UV and some visible while letting through photosynthetically active radiation. But blocking too much reduces PV output.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why might an incandescent bulb and LED of equal perceived brightness produce different PV power?',
      options: [
        { text: 'The LED is more expensive', correct: false },
        { text: 'They have different spectral power distributions', correct: true },
        { text: 'Incandescent bulbs are hotter', correct: false },
        { text: 'The PV cell prefers warm colors', correct: false },
      ],
    },
    {
      question: 'Spectral mismatch loss occurs because:',
      options: [
        { text: 'Some photons have too little energy to generate current', correct: false },
        { text: 'Excess photon energy is wasted as heat', correct: false },
        { text: 'Both of the above', correct: true },
        { text: 'The light source is too bright', correct: false },
      ],
    },
    {
      question: 'A silicon solar cell (1.1 eV bandgap) under incandescent light performs poorly because:',
      options: [
        { text: 'Most of the spectrum is infrared beyond 1127 nm', correct: true },
        { text: 'Incandescent light is too dim', correct: false },
        { text: 'Silicon absorbs only blue light', correct: false },
        { text: 'The bulb is too efficient', correct: false },
      ],
    },
    {
      question: 'Photon energy is related to wavelength by:',
      options: [
        { text: 'Longer wavelength = higher energy', correct: false },
        { text: 'Shorter wavelength = higher energy', correct: true },
        { text: 'Wavelength doesn\'t affect energy', correct: false },
        { text: 'Only visible light has energy', correct: false },
      ],
    },
    {
      question: 'Thermalization loss refers to:',
      options: [
        { text: 'Heat from the environment damaging the cell', correct: false },
        { text: 'Excess photon energy converted to heat instead of electricity', correct: true },
        { text: 'The cell getting too cold to work', correct: false },
        { text: 'Thermal expansion breaking the cell', correct: false },
      ],
    },
    {
      question: 'An IR-blocking filter on a silicon cell under sunlight will:',
      options: [
        { text: 'Increase power by reducing heat', correct: false },
        { text: 'Decrease power by blocking usable IR photons', correct: true },
        { text: 'Have no effect on power', correct: false },
        { text: 'Double the output voltage', correct: false },
      ],
    },
    {
      question: 'Human eyes are most sensitive to which wavelengths?',
      options: [
        { text: 'Ultraviolet (300-400 nm)', correct: false },
        { text: 'Green-yellow (500-600 nm)', correct: true },
        { text: 'Near-infrared (700-1000 nm)', correct: false },
        { text: 'All wavelengths equally', correct: false },
      ],
    },
    {
      question: 'Why do solar panel specifications use AM1.5 sunlight as a standard?',
      options: [
        { text: 'It\'s the brightest possible sunlight', correct: false },
        { text: 'It represents average terrestrial sunlight spectrum', correct: true },
        { text: 'It\'s easier to measure than real sunlight', correct: false },
        { text: 'It\'s required by law', correct: false },
      ],
    },
    {
      question: 'Multi-junction solar cells achieve higher efficiency by:',
      options: [
        { text: 'Using more silicon', correct: false },
        { text: 'Having multiple bandgaps to match different spectral regions', correct: true },
        { text: 'Operating at higher temperatures', correct: false },
        { text: 'Using only visible light', correct: false },
      ],
    },
    {
      question: 'The photovoltaic response of a cell depends on photon energy rather than:',
      options: [
        { text: 'Photon number', correct: false },
        { text: 'Human-perceived brightness', correct: true },
        { text: 'Light intensity', correct: false },
        { text: 'Cell temperature', correct: false },
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

  const renderVisualization = () => {
    const width = 700;
    const height = 480;
    const output = calculateOutput();
    const source = lightSources[lightSource];

    // Calculate spectrum curve points for solar spectrum
    const getSolarSpectrumPath = () => {
      // AM1.5 solar spectrum approximation (normalized)
      const points = [
        { nm: 300, power: 0.05 },
        { nm: 400, power: 0.35 },
        { nm: 500, power: 0.85 },
        { nm: 550, power: 1.0 },
        { nm: 600, power: 0.95 },
        { nm: 700, power: 0.75 },
        { nm: 800, power: 0.55 },
        { nm: 900, power: 0.40 },
        { nm: 1000, power: 0.30 },
        { nm: 1100, power: 0.20 },
        { nm: 1200, power: 0.10 },
      ];
      return points.map((p, i) => {
        const x = 80 + ((p.nm - 300) / 900) * 380;
        const y = 200 - p.power * 120;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    // Calculate cell response curve (silicon QE)
    const getCellResponsePath = () => {
      // Silicon cell quantum efficiency curve
      const points = [
        { nm: 300, qe: 0.2 },
        { nm: 400, qe: 0.65 },
        { nm: 500, qe: 0.85 },
        { nm: 600, qe: 0.90 },
        { nm: 700, qe: 0.88 },
        { nm: 800, qe: 0.82 },
        { nm: 900, qe: 0.70 },
        { nm: 1000, qe: 0.45 },
        { nm: 1100, qe: 0.15 },
        { nm: 1200, qe: 0.0 },
      ];
      return points.map((p, i) => {
        const x = 80 + ((p.nm - 300) / 900) * 380;
        const y = 200 - p.qe * 120;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    // Light source spectrum curve
    const getLightSourcePath = () => {
      let points: { nm: number; power: number }[] = [];
      if (lightSource === 'incandescent') {
        // Blackbody at 2700K - peaks in IR
        points = [
          { nm: 300, power: 0.01 },
          { nm: 400, power: 0.05 },
          { nm: 500, power: 0.12 },
          { nm: 600, power: 0.22 },
          { nm: 700, power: 0.35 },
          { nm: 800, power: 0.55 },
          { nm: 900, power: 0.75 },
          { nm: 1000, power: 0.90 },
          { nm: 1100, power: 0.98 },
          { nm: 1200, power: 1.0 },
        ];
      } else if (lightSource === 'led') {
        // LED spectrum - peaks in blue/green visible
        points = [
          { nm: 300, power: 0.0 },
          { nm: 400, power: 0.15 },
          { nm: 450, power: 0.95 },
          { nm: 500, power: 0.70 },
          { nm: 550, power: 0.85 },
          { nm: 600, power: 0.75 },
          { nm: 650, power: 0.45 },
          { nm: 700, power: 0.10 },
          { nm: 800, power: 0.02 },
          { nm: 1000, power: 0.0 },
          { nm: 1200, power: 0.0 },
        ];
      } else {
        // Sunlight AM1.5
        points = [
          { nm: 300, power: 0.05 },
          { nm: 400, power: 0.35 },
          { nm: 500, power: 0.85 },
          { nm: 550, power: 1.0 },
          { nm: 600, power: 0.95 },
          { nm: 700, power: 0.75 },
          { nm: 800, power: 0.55 },
          { nm: 900, power: 0.40 },
          { nm: 1000, power: 0.30 },
          { nm: 1100, power: 0.20 },
          { nm: 1200, power: 0.10 },
        ];
      }
      return points.map((p, i) => {
        const x = 80 + ((p.nm - 300) / 900) * 380;
        const y = 200 - p.power * 120;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
        >
          <defs>
            {/* === PREMIUM BACKGROUND GRADIENTS === */}
            <linearGradient id="spmisLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* === SPECTRUM GRADIENT - Full visible + UV/IR === */}
            <linearGradient id="spmisSpectrumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="15%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#06b6d4" />
              <stop offset="45%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="90%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* === LIGHT SOURCE GLOW GRADIENTS === */}
            <radialGradient id="spmisIncandescentGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7ed" stopOpacity="1" />
              <stop offset="20%" stopColor="#ffedd5" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#fed7aa" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#fdba74" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#fb923c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="spmisLedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="20%" stopColor="#f0f9ff" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#bae6fd" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#7dd3fc" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="spmisSunlightGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fefce8" stopOpacity="1" />
              <stop offset="15%" stopColor="#fef9c3" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#fef08a" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fde047" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#facc15" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </radialGradient>

            {/* === SOLAR CELL GRADIENT === */}
            <linearGradient id="spmisSolarCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="25%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            <linearGradient id="spmisSolarCellFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* === MISMATCH INDICATOR GRADIENTS === */}
            <linearGradient id="spmisMismatchGood" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <linearGradient id="spmisMismatchMedium" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            <linearGradient id="spmisMismatchPoor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* === DISPLAY PANEL GRADIENT === */}
            <linearGradient id="spmisDisplayPanel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="20%" stopColor="#111827" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            <filter id="spmisLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="spmisSpectrumGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="spmisTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="spmisInnerGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* === PATTERNS === */}
            <pattern id="spmisGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            <pattern id="spmisSolarCellGrid" width="15" height="10" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#1e3a8a" strokeWidth="0.5" />
              <line x1="0" y1="5" x2="15" y2="5" stroke="#1e3a8a" strokeWidth="0.3" />
            </pattern>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width={width} height={height} fill="url(#spmisLabBg)" />
          <rect width={width} height={height} fill="url(#spmisGridPattern)" />

          {/* === TITLE === */}
          <text x={width / 2} y={28} fill={colors.textPrimary} fontSize={18} fontWeight="bold" textAnchor="middle" filter="url(#spmisTextGlow)">
            Spectral Mismatch Analysis
          </text>
          <text x={width / 2} y={48} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            Solar Spectrum vs Cell Response
          </text>

          {/* === LIGHT SOURCE VISUALIZATION === */}
          <g transform="translate(55, 95)">
            {/* Housing */}
            <rect x="-35" y="-35" width="70" height="85" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
            <rect x="-30" y="-30" width="60" height="75" rx="6" fill="#111827" />

            {/* Light source glow */}
            <circle
              cx="0"
              cy="5"
              r="28"
              fill={lightSource === 'incandescent' ? 'url(#spmisIncandescentGlow)' : lightSource === 'led' ? 'url(#spmisLedGlow)' : 'url(#spmisSunlightGlow)'}
              filter="url(#spmisLightGlow)"
            >
              <animate attributeName="r" values="26;30;26" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Inner bright core */}
            <circle cx="0" cy="5" r="12" fill="#ffffff" opacity="0.9">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
            </circle>

            {/* Light rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1={Math.cos(angle * Math.PI / 180) * 20}
                y1={5 + Math.sin(angle * Math.PI / 180) * 20}
                x2={Math.cos(angle * Math.PI / 180) * 38}
                y2={5 + Math.sin(angle * Math.PI / 180) * 38}
                stroke={source.color}
                strokeWidth="2"
                strokeOpacity="0.4"
                strokeLinecap="round"
              >
                <animate attributeName="strokeOpacity" values="0.2;0.6;0.2" dur="1.5s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
              </line>
            ))}

            {/* Source label */}
            <text x="0" y="65" fill={colors.textPrimary} fontSize={10} fontWeight="bold" textAnchor="middle">{source.name.split(' ')[0]}</text>
            <text x="0" y="78" fill={colors.textMuted} fontSize={8} textAnchor="middle">{source.description}</text>
          </g>

          {/* === SPECTRUM GRAPH === */}
          <g transform="translate(0, 0)">
            {/* Graph panel */}
            <rect x="140" y="60" width="400" height="160" rx="6" fill="url(#spmisDisplayPanel)" stroke="#374151" strokeWidth="1" />

            {/* Graph title */}
            <text x="340" y="78" fill={colors.accent} fontSize={10} fontWeight="bold" textAnchor="middle">SPECTRAL POWER DISTRIBUTION</text>

            {/* Spectrum color band at bottom */}
            <rect x="160" y="185" width="360" height="15" rx="2" fill="url(#spmisSpectrumGrad)" opacity="0.8" />

            {/* Wavelength labels */}
            <text x="160" y="210" fill={colors.textMuted} fontSize={8} textAnchor="middle">300nm</text>
            <text x="250" y="210" fill={colors.textMuted} fontSize={8} textAnchor="middle">500nm</text>
            <text x="340" y="210" fill={colors.textMuted} fontSize={8} textAnchor="middle">700nm</text>
            <text x="430" y="210" fill={colors.textMuted} fontSize={8} textAnchor="middle">900nm</text>
            <text x="520" y="210" fill={colors.textMuted} fontSize={8} textAnchor="middle">1100nm</text>

            {/* UV/Visible/IR region labels */}
            <text x="175" y="178" fill={colors.uv} fontSize={7} fontWeight="bold" textAnchor="middle">UV</text>
            <text x="290" y="178" fill="#22c55e" fontSize={7} fontWeight="bold" textAnchor="middle">VISIBLE</text>
            <text x="460" y="178" fill={colors.ir} fontSize={7} fontWeight="bold" textAnchor="middle">INFRARED</text>

            {/* Y-axis */}
            <line x1="160" y1="85" x2="160" y2="175" stroke={colors.textMuted} strokeWidth="0.5" />
            <text x="155" y="90" fill={colors.textMuted} fontSize={7} textAnchor="end">1.0</text>
            <text x="155" y="130" fill={colors.textMuted} fontSize={7} textAnchor="end">0.5</text>
            <text x="155" y="175" fill={colors.textMuted} fontSize={7} textAnchor="end">0</text>

            {/* Light source spectrum curve */}
            <path
              d={getLightSourcePath()}
              fill="none"
              stroke={source.color}
              strokeWidth="3"
              filter="url(#spmisSpectrumGlow)"
              opacity={0.9}
            />

            {/* Cell response curve (silicon QE) */}
            <path
              d={getCellResponsePath()}
              fill="none"
              stroke={colors.success}
              strokeWidth="2"
              strokeDasharray="6 3"
              opacity="0.8"
            />

            {/* Bandgap limit line */}
            <line x1="455" y1="85" x2="455" y2="175" stroke={colors.error} strokeWidth="2" strokeDasharray="4 2" />
            <text x="460" y="95" fill={colors.error} fontSize={7} fontWeight="bold">1127nm</text>
            <text x="460" y="105" fill={colors.error} fontSize={6}>Bandgap</text>

            {/* Filter overlays */}
            {hasUVFilter && (
              <g>
                <rect x="160" y="85" width="45" height="90" fill={colors.uv} opacity="0.3" />
                <text x="182" y="130" fill={colors.uv} fontSize={8} fontWeight="bold" textAnchor="middle" transform="rotate(-90, 182, 130)">UV FILTER</text>
              </g>
            )}
            {hasIRFilter && (
              <g>
                <rect x="400" y="85" width="120" height="90" fill={colors.ir} opacity="0.3" />
                <text x="460" y="130" fill={colors.ir} fontSize={8} fontWeight="bold" textAnchor="middle">IR FILTER</text>
              </g>
            )}

            {/* Legend */}
            <g transform="translate(165, 92)">
              <line x1="0" y1="0" x2="20" y2="0" stroke={source.color} strokeWidth="3" />
              <text x="25" y="3" fill={colors.textSecondary} fontSize={7}>Light Source</text>
              <line x1="90" y1="0" x2="110" y2="0" stroke={colors.success} strokeWidth="2" strokeDasharray="4 2" />
              <text x="115" y="3" fill={colors.textSecondary} fontSize={7}>Cell Response</text>
            </g>
          </g>

          {/* === SOLAR CELL VISUALIZATION === */}
          <g transform="translate(55, 280)">
            {/* Cell frame */}
            <rect x="-40" y="-30" width="80" height="75" rx="4" fill="url(#spmisSolarCellFrame)" stroke="#4b5563" strokeWidth="1" />

            {/* Cell surface */}
            <rect x="-35" y="-25" width="70" height="55" rx="2" fill="url(#spmisSolarCellGrad)" />

            {/* Grid pattern overlay */}
            <rect x="-35" y="-25" width="70" height="55" rx="2" fill="url(#spmisSolarCellGrid)" />

            {/* Busbar */}
            <rect x="-3" y="-25" width="6" height="55" fill="#9ca3af" opacity="0.8" />

            {/* Reflection highlight */}
            <rect x="-35" y="-25" width="70" height="8" rx="2" fill="#ffffff" opacity="0.15" />

            {/* Label */}
            <text x="0" y="55" fill={colors.textPrimary} fontSize={9} fontWeight="bold" textAnchor="middle">Silicon PV Cell</text>
            <text x="0" y="68" fill={colors.textMuted} fontSize={8} textAnchor="middle">Eg = {cellBandgap} eV</text>
          </g>

          {/* === ENERGY FLOW ARROWS === */}
          <g>
            {/* Arrow from light to spectrum */}
            <line x1="90" y1="95" x2="135" y2="95" stroke={source.color} strokeWidth="2" markerEnd="url(#spmisArrow)" opacity="0.6" />

            {/* Arrow from spectrum to cell */}
            <path d="M 140 180 Q 100 230 70 250" fill="none" stroke={colors.success} strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
          </g>

          {/* === MISMATCH INDICATOR === */}
          <g transform="translate(560, 70)">
            <rect x="0" y="0" width="120" height="150" rx="8" fill="url(#spmisDisplayPanel)" stroke="#374151" strokeWidth="1" />
            <text x="60" y="20" fill={colors.accent} fontSize={10} fontWeight="bold" textAnchor="middle">MISMATCH</text>
            <text x="60" y="32" fill={colors.textMuted} fontSize={8} textAnchor="middle">INDICATOR</text>

            {/* Mismatch gauge */}
            <rect x="15" y="45" width="90" height="12" rx="3" fill="#1f2937" />
            <rect
              x="15"
              y="45"
              width={Math.min(90, output.spectralMismatch * 0.9)}
              height="12"
              rx="3"
              fill={output.spectralMismatch > 70 ? 'url(#spmisMismatchGood)' : output.spectralMismatch > 40 ? 'url(#spmisMismatchMedium)' : 'url(#spmisMismatchPoor)'}
            />
            <text x="60" y="72" fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">{output.spectralMismatch.toFixed(0)}%</text>
            <text x="60" y="85" fill={colors.textMuted} fontSize={8} textAnchor="middle">Spectral Match</text>

            {/* Quality label */}
            <rect
              x="20"
              y="95"
              width="80"
              height="20"
              rx="4"
              fill={output.spectralMismatch > 70 ? 'rgba(16, 185, 129, 0.2)' : output.spectralMismatch > 40 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
            />
            <text
              x="60"
              y="109"
              fill={output.spectralMismatch > 70 ? colors.success : output.spectralMismatch > 40 ? colors.warning : colors.error}
              fontSize={9}
              fontWeight="bold"
              textAnchor="middle"
            >
              {output.spectralMismatch > 70 ? 'EXCELLENT' : output.spectralMismatch > 40 ? 'MODERATE' : 'POOR'}
            </text>

            {/* Loss breakdown */}
            <text x="15" y="132" fill={colors.textMuted} fontSize={7}>Thermalization: {(100 - output.spectralMismatch * 0.7).toFixed(0)}%</text>
            <text x="15" y="143" fill={colors.textMuted} fontSize={7}>Sub-bandgap: {(100 - output.spectralMismatch * 0.3).toFixed(0)}%</text>
          </g>

          {/* === OUTPUT PANEL === */}
          <g transform="translate(140, 240)">
            <rect x="0" y="0" width="400" height="100" rx="8" fill="url(#spmisDisplayPanel)" stroke={colors.accent} strokeWidth="1.5" />
            <text x="200" y="20" fill={colors.accent} fontSize={11} fontWeight="bold" textAnchor="middle" filter="url(#spmisTextGlow)">PV OUTPUT COMPARISON</text>

            {/* Human brightness bar */}
            <text x="15" y="42" fill={colors.textSecondary} fontSize={9}>Perceived Brightness:</text>
            <rect x="130" y="32" width="200" height="14" rx="3" fill="#1f2937" />
            <rect x="130" y="32" width={output.humanBrightness * 2} height="14" rx="3" fill="url(#spmisLedGlow)" opacity="0.9" />
            <text x="340" y="43" fill={colors.textPrimary} fontSize={10} fontWeight="bold">{output.humanBrightness}%</text>

            {/* PV Power bar */}
            <text x="15" y="62" fill={colors.textSecondary} fontSize={9}>Electrical Output:</text>
            <rect x="130" y="52" width="200" height="14" rx="3" fill="#1f2937" />
            <rect x="130" y="52" width={Math.min(200, output.power / 30 * 200)} height="14" rx="3" fill="url(#spmisMismatchGood)" />
            <text x="340" y="63" fill={colors.success} fontSize={10} fontWeight="bold">{output.power.toFixed(1)} mW</text>

            {/* Technical specs */}
            <text x="15" y="88" fill={colors.textMuted} fontSize={8}>Isc: {output.current.toFixed(1)} mA/cm²</text>
            <text x="120" y="88" fill={colors.textMuted} fontSize={8}>Voc: {output.voltage.toFixed(2)} V</text>
            <text x="220" y="88" fill={colors.textMuted} fontSize={8}>Fill Factor: 0.75</text>
            <text x="320" y="88" fill={colors.textMuted} fontSize={8}>Eff: {(output.power / 100 * 20).toFixed(1)}%</text>
          </g>

          {/* === KEY INSIGHT BOX === */}
          <g transform="translate(560, 240)">
            <rect x="0" y="0" width="120" height="100" rx="8" fill="rgba(245, 158, 11, 0.1)" stroke={colors.accent} strokeWidth="1" />
            <text x="60" y="18" fill={colors.accent} fontSize={9} fontWeight="bold" textAnchor="middle">KEY INSIGHT</text>

            <text x="60" y="38" fill={colors.textPrimary} fontSize={8} textAnchor="middle" fontWeight="bold">Same Brightness</text>
            <text x="60" y="50" fill={colors.error} fontSize={14} fontWeight="bold" textAnchor="middle">≠</text>
            <text x="60" y="65" fill={colors.textPrimary} fontSize={8} textAnchor="middle" fontWeight="bold">Same PV Power</text>

            <text x="60" y="82" fill={colors.textMuted} fontSize={7} textAnchor="middle">Spectrum determines</text>
            <text x="60" y="92" fill={colors.textMuted} fontSize={7} textAnchor="middle">electrical output</text>
          </g>

          {/* === BOTTOM INFO BAR === */}
          <g transform="translate(0, 355)">
            <rect x="20" y="0" width={width - 40} height="50" rx="6" fill="rgba(6, 182, 212, 0.1)" stroke="#0891b2" strokeWidth="0.5" />
            <text x={width / 2} y="18" fill={colors.textPrimary} fontSize={10} fontWeight="bold" textAnchor="middle">
              Physics: Photon Energy E = hc/λ | Silicon absorbs λ &lt; 1127nm (E &gt; 1.1 eV)
            </text>
            <text x={width / 2} y="35" fill={colors.textSecondary} fontSize={9} textAnchor="middle">
              High-energy UV photons waste excess as heat (thermalization) | Low-energy IR photons pass through unused
            </text>
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Source:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(lightSources).map(([key, source]) => (
            <button
              key={key}
              onClick={() => setLightSource(key as 'incandescent' | 'led' | 'sunlight')}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: lightSource === key ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: lightSource === key ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: source.color,
                cursor: 'pointer',
                fontWeight: 'bold',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {source.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={hasUVFilter}
            onChange={(e) => setHasUVFilter(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          UV Blocking Filter
        </label>

        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={hasIRFilter}
            onChange={(e) => setHasIRFilter(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          IR Blocking Filter
        </label>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          <strong>Physics:</strong> Photon energy E = hc/λ
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Silicon absorbs photons with E &gt; 1.1 eV (λ &lt; 1127 nm)
        </div>
      </div>
    </div>
  );

  // Progress bar showing all phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 16px',
      }}>
        {phaseOrder.map((p, idx) => (
          <div
            key={p}
            onClick={() => idx <= currentIdx && goToPhase(p)}
            title={phaseLabels[p]}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: idx === currentIdx ? colors.accent : idx < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
              cursor: idx <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    );
  };

  // Bottom bar with Back/Next navigation
  const renderBottomBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
        zIndex: 1000,
      }}>
        {renderProgressBar()}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}>
          <button
            onClick={goBack}
            disabled={isFirst}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: `1px solid ${isFirst ? 'transparent' : colors.accent}`,
              background: 'transparent',
              color: isFirst ? colors.textMuted : colors.accent,
              fontWeight: 'bold',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isFirst ? 0.5 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Back
          </button>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>
            {phaseLabels[phase]}
          </span>
          <button
            onClick={goNext}
            disabled={isLast}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: isLast ? colors.success : colors.accent,
              color: 'white',
              fontWeight: 'bold',
              cursor: isLast ? 'default' : 'pointer',
              fontSize: '14px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isLast ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Spectral Mismatch
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Does a warm lamp and cool lamp produce the same panel output?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                An incandescent bulb and an LED might look equally bright to your eyes,
                but a solar panel tells a different story. The spectrum of light - not
                just the brightness - determines how much electricity you get.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Compare different light sources to see how spectrum affects power output!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization()}

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If two light sources look equally bright, will they produce equal PV power?
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
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Compare Light Sources</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between sources to see how spectrum affects PV output
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Compare incandescent vs LED - which gives more PV power?</li>
              <li>Why does sunlight give the best results?</li>
              <li>Notice the mismatch between human brightness and PV power</li>
              <li>Look at where each source's spectrum falls</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'spectrum';

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
              {wasCorrect ? 'Correct!' : 'Not quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              PV output depends on the spectral power distribution, not human-perceived brightness.
              Our eyes evolved for daylight but weight green wavelengths heavily. Solar cells care
              about photon energy!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Spectral Mismatch Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Incandescent Bulbs:</strong> 87% of
                their output is infrared - heat you can feel but can't see. Most of this IR is
                beyond silicon's absorption limit, so it's wasted.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>LEDs:</strong> Nearly all output is
                in the visible range, which silicon can efficiently convert. That's why LEDs give
                more PV power despite similar perceived brightness.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Sunlight:</strong> The optimal mix -
                balanced UV, visible, and usable IR. Solar cells are optimized for this spectrum.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Thermalization:</strong> Even absorbed
                photons waste some energy. UV photons have far more energy than the 1.1 eV bandgap,
                and the excess becomes heat.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
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
              What if we add UV/IR blocking films?
            </p>
          </div>

          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              We'll add optical filters that block UV or IR radiation. These are common
              in windows and some solar applications. Will blocking "useless" spectrum
              help or hurt?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens when you add UV or IR blocking filters?
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
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Filters</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle UV and IR filters to see their effect on power output
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Both UV and usable IR contribute to power output! Blocking them reduces
              current even though it might seem like we're removing "waste" heat or
              damaging radiation.
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'both_hurt';

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
              {wasCorrect ? 'Exactly right!' : 'Counterintuitive but true!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Blocking UV or IR reduces power because both contain usable photons!
              UV has extra energy (wasted as heat), but still generates current.
              Near-IR up to 1127nm is fully usable by silicon.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Filter Trade-offs</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>UV Filters:</strong> Block high-energy
                photons that can degrade cell materials over time. Trade-off: lose ~5% of current
                but extend cell lifetime. Used in some long-duration applications.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>IR Filters:</strong> Block heat-causing
                wavelengths. But silicon uses IR up to 1127nm! Blocking all IR loses significant
                power. Only far-IR (&gt;1200nm) is truly wasted as heat.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Smart Coatings:</strong> Advanced solar
                cells use selective coatings that enhance useful wavelengths while managing thermal
                load from truly unusable far-IR.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
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
              Spectral mismatch affects many technologies
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
                  style={{
                    padding: '8px 16px',
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
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar()}
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
                {testScore >= 8 ? 'You\'ve mastered spectral mismatch!' : 'Review the material and try again.'}
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
          {renderBottomBar()}
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
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered spectral mismatch!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Light spectrum varies by source type</li>
              <li>PV response depends on photon energy, not brightness</li>
              <li>Incandescent light is mostly unusable IR</li>
              <li>Thermalization wastes excess photon energy</li>
              <li>Multi-junction cells reduce spectral losses</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Spectral mismatch is one of the biggest efficiency losses in solar cells.
              Researchers are developing hot-carrier cells, intermediate band cells, and
              spectrum-splitting systems to capture more of the sun's energy!
            </p>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default SpectralMismatchRenderer;
