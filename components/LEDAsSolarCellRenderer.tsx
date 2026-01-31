import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for this game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface LEDAsSolarCellRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
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
  led: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  purple: '#a855f7',
  border: '#334155',
};

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

const LEDAsSolarCellRenderer: React.FC<LEDAsSolarCellRendererProps> = ({
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
  const [ledColor, setLedColor] = useState<'red' | 'green' | 'blue' | 'yellow'>('red');
  const [lightIntensity, setLightIntensity] = useState(80);
  const [lightWavelength, setLightWavelength] = useState(550); // nm
  const [showMultimeter, setShowMultimeter] = useState(true);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // LED bandgap energies in eV (determines threshold wavelength)
  const ledBandgaps: Record<string, { bandgap: number; peakWavelength: number; color: string }> = {
    red: { bandgap: 1.9, peakWavelength: 650, color: colors.red },
    yellow: { bandgap: 2.1, peakWavelength: 590, color: colors.yellow },
    green: { bandgap: 2.2, peakWavelength: 565, color: colors.led },
    blue: { bandgap: 2.7, peakWavelength: 470, color: colors.blue },
  };

  // Physics calculations
  const calculateOutput = useCallback(() => {
    const led = ledBandgaps[ledColor];
    const h = 4.136e-15; // Planck's constant in eV·s
    const c = 3e8; // Speed of light in m/s

    // Photon energy from light source
    const photonEnergy = (h * c) / (lightWavelength * 1e-9);

    // LED acts as solar cell - generates current when photon energy > bandgap
    const aboveThreshold = photonEnergy >= led.bandgap;

    // Quantum efficiency - peaks when light matches LED wavelength, decreases for higher energy
    let quantumEfficiency = 0;
    if (aboveThreshold) {
      // Efficiency drops for photons with energy much higher than bandgap
      const excessEnergy = photonEnergy - led.bandgap;
      quantumEfficiency = Math.max(0, 1 - excessEnergy / 2) * 0.8;
      // Also reduced efficiency if wavelength is far from peak
      const wavelengthMatch = 1 - Math.abs(lightWavelength - led.peakWavelength) / 300;
      quantumEfficiency *= Math.max(0.1, wavelengthMatch);
    }

    // Current proportional to intensity and quantum efficiency
    const current = aboveThreshold ? (lightIntensity / 100) * quantumEfficiency * 0.5 : 0; // mA

    // Voltage determined by bandgap (open circuit voltage)
    const voltage = aboveThreshold ? led.bandgap * 0.7 : 0; // V

    // Power output
    const power = voltage * current; // mW

    return {
      voltage: voltage,
      current: current,
      power: power,
      photonEnergy: photonEnergy,
      aboveThreshold: aboveThreshold,
      quantumEfficiency: quantumEfficiency * 100,
    };
  }, [ledColor, lightIntensity, lightWavelength]);

  const predictions = [
    { id: 'no', label: 'LEDs cannot generate electricity - they only emit light' },
    { id: 'small', label: 'LEDs can generate small amounts of electricity when illuminated' },
    { id: 'same', label: 'LEDs work exactly like solar cells with the same efficiency' },
    { id: 'depends', label: 'Only certain LED colors can generate electricity' },
  ];

  const twistPredictions = [
    { id: 'no_effect', label: 'Color filters have no effect on LED voltage generation' },
    { id: 'match', label: 'LED generates more voltage when filter matches LED color' },
    { id: 'opposite', label: 'LED generates more voltage when filter blocks LED color' },
    { id: 'all_block', label: 'All filters block the photovoltaic effect' },
  ];

  const transferApplications = [
    {
      title: 'Bidirectional Communication',
      description: 'LEDs can both transmit and receive optical signals, enabling half-duplex communication with a single component.',
      question: 'Why can an LED both emit and detect light?',
      answer: 'The P-N junction works in both directions. Forward bias causes electron-hole recombination (light emission). Photons striking the junction create electron-hole pairs (photocurrent). The same physics, reversed!',
    },
    {
      title: 'Solar Power Indicators',
      description: 'Some solar-powered devices use LEDs as both status indicators and auxiliary power sources.',
      question: 'How can an LED indicator also harvest energy?',
      answer: 'When the LED is off, it acts as a small photovoltaic cell. In bright conditions, it can generate enough power to charge a capacitor or supplement the main solar cell, making the device more efficient.',
    },
    {
      title: 'Light Sensing Arrays',
      description: 'LED matrices can be used as low-resolution imaging sensors by measuring photocurrent in each LED.',
      question: 'What limits LEDs as image sensors compared to camera chips?',
      answer: 'LEDs have lower sensitivity, narrower spectral response (only wavelengths above their bandgap), and lower quantum efficiency. But they\'re cheap and can create large-area sensors for simple applications.',
    },
    {
      title: 'Color-Specific Detectors',
      description: 'Different LED colors respond to different wavelength ranges, enabling simple spectroscopy.',
      question: 'How can multiple LEDs measure light color?',
      answer: 'Each LED color has a different bandgap threshold. By measuring photocurrent from red, green, and blue LEDs simultaneously, you can estimate the color composition of incident light without filters.',
    },
  ];

  const testQuestions = [
    {
      question: 'An LED can generate electricity because:',
      options: [
        { text: 'It contains a battery', correct: false },
        { text: 'Its P-N junction creates photocurrent when photons generate electron-hole pairs', correct: true },
        { text: 'It has a built-in solar cell layer', correct: false },
        { text: 'Electricity cannot be generated by an LED', correct: false },
      ],
    },
    {
      question: 'Which LED color would generate the highest voltage when illuminated?',
      options: [
        { text: 'Red LED (largest bandgap)', correct: false },
        { text: 'Blue LED (largest bandgap)', correct: true },
        { text: 'All LEDs generate the same voltage', correct: false },
        { text: 'Green LED (medium bandgap)', correct: false },
      ],
    },
    {
      question: 'Why does a red LED respond to green light but not infrared?',
      options: [
        { text: 'Green light is brighter', correct: false },
        { text: 'Green photons have more energy than the red LED bandgap, IR does not', correct: true },
        { text: 'Infrared is invisible', correct: false },
        { text: 'The LED filters out infrared', correct: false },
      ],
    },
    {
      question: 'When using an LED as a solar cell, photon energy must be:',
      options: [
        { text: 'Exactly equal to the bandgap', correct: false },
        { text: 'Greater than or equal to the bandgap energy', correct: true },
        { text: 'Less than the bandgap energy', correct: false },
        { text: 'Equal to the forward voltage', correct: false },
      ],
    },
    {
      question: 'The open-circuit voltage of an LED used as a solar cell is related to:',
      options: [
        { text: 'The light intensity only', correct: false },
        { text: 'The LED bandgap energy', correct: true },
        { text: 'The LED size', correct: false },
        { text: 'The wire resistance', correct: false },
      ],
    },
    {
      question: 'If you shine blue light on a red LED and a blue LED:',
      options: [
        { text: 'Only the blue LED generates photocurrent', correct: false },
        { text: 'Both generate photocurrent, red LED generates more', correct: true },
        { text: 'Neither generates photocurrent', correct: false },
        { text: 'Only the red LED generates photocurrent', correct: false },
      ],
    },
    {
      question: 'Why is LED photovoltaic efficiency lower than standard solar cells?',
      options: [
        { text: 'LEDs are made of plastic', correct: false },
        { text: 'LEDs are optimized for light emission, not absorption', correct: true },
        { text: 'LEDs only work at night', correct: false },
        { text: 'Solar cells use more electricity', correct: false },
      ],
    },
    {
      question: 'Excess photon energy (above the bandgap) is converted to:',
      options: [
        { text: 'Higher voltage output', correct: false },
        { text: 'Heat (thermalization loss)', correct: true },
        { text: 'Brighter light emission', correct: false },
        { text: 'Stored in the LED', correct: false },
      ],
    },
    {
      question: 'A yellow filter placed over a green LED will:',
      options: [
        { text: 'Block the photovoltaic effect entirely', correct: false },
        { text: 'Reduce photocurrent by removing higher-energy photons', correct: true },
        { text: 'Increase voltage by matching colors', correct: false },
        { text: 'Have no effect on the output', correct: false },
      ],
    },
    {
      question: 'The LED photovoltaic effect demonstrates that:',
      options: [
        { text: 'Light and electricity are unrelated', correct: false },
        { text: 'Semiconductor junctions can convert light to electricity', correct: true },
        { text: 'Only specialized solar cells can generate power', correct: false },
        { text: 'LEDs are more efficient than solar panels', correct: false },
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

  const wavelengthToColor = (wl: number): string => {
    if (wl < 380) return '#7c3aed'; // UV
    if (wl < 450) return '#3b82f6'; // Blue
    if (wl < 495) return '#06b6d4'; // Cyan
    if (wl < 570) return '#22c55e'; // Green
    if (wl < 590) return '#eab308'; // Yellow
    if (wl < 620) return '#f97316'; // Orange
    if (wl < 700) return '#ef4444'; // Red
    return '#991b1b'; // IR
  };

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
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
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
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

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canGoNext: boolean, nextLabel: string) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
          disabled={!canBack}
        >
          Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={goNext}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : 'rgba(30, 41, 59, 0.9)',
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
          disabled={!canGoNext}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const renderVisualization = () => {
    const width = 600;
    const height = 450;
    const output = calculateOutput();
    const led = ledBandgaps[ledColor];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #020617 50%, #0a0f1a 100%)', borderRadius: '12px', maxWidth: '650px' }}
        >
          <defs>
            {/* === PREMIUM GRADIENTS === */}

            {/* Light source housing - brushed aluminum effect */}
            <linearGradient id="ledscLightHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* LED housing - epoxy dome effect */}
            <linearGradient id="ledscLEDHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={led.color} stopOpacity="0.9" />
              <stop offset="25%" stopColor={led.color} stopOpacity="0.7" />
              <stop offset="50%" stopColor={led.color} stopOpacity="0.5" />
              <stop offset="75%" stopColor={led.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={led.color} stopOpacity="0.15" />
            </linearGradient>

            {/* LED inner dome highlight */}
            <radialGradient id="ledscLEDHighlight" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="60%" stopColor={led.color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={led.color} stopOpacity="0" />
            </radialGradient>

            {/* P-N Junction gradient */}
            <linearGradient id="ledscPNJunction" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="20%" stopColor="#2563eb" />
              <stop offset="45%" stopColor="#1e40af" />
              <stop offset="55%" stopColor="#991b1b" />
              <stop offset="80%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Depletion zone gradient */}
            <linearGradient id="ledscDepletionZone" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.3" />
            </linearGradient>

            {/* Light beam gradient */}
            <linearGradient id="ledscLightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="0.8" />
              <stop offset="30%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="0.6" />
              <stop offset="70%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="0.4" />
              <stop offset="100%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="0.1" />
            </linearGradient>

            {/* Photon glow - radial */}
            <radialGradient id="ledscPhotonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="1" />
              <stop offset="30%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="0.7" />
              <stop offset="60%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="0.3" />
              <stop offset="100%" stopColor={wavelengthToColor(lightWavelength)} stopOpacity="0" />
            </radialGradient>

            {/* Electron glow - blue */}
            <radialGradient id="ledscElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Hole glow - red */}
            <radialGradient id="ledscHoleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="30%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#dc2626" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Multimeter display gradient */}
            <linearGradient id="ledscMeterDisplay" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="20%" stopColor="#111827" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Multimeter housing */}
            <linearGradient id="ledscMeterHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="25%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="75%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Wire gradient - cathode */}
            <linearGradient id="ledscWireCathode" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="30%" stopColor="#6b7280" />
              <stop offset="70%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Wire gradient - anode */}
            <linearGradient id="ledscWireAnode" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="30%" stopColor="#9ca3af" />
              <stop offset="70%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* === PREMIUM FILTERS === */}

            {/* LED glow filter */}
            <filter id="ledscGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="12" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Photon glow filter */}
            <filter id="ledscPhotonFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Electron/hole particle filter */}
            <filter id="ledscParticleFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft inner glow */}
            <filter id="ledscInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Light source emission glow */}
            <filter id="ledscEmissionGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker for current flow */}
            <marker id="ledscArrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.success} />
            </marker>

            {/* Lab background pattern */}
            <pattern id="ledscLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background grid pattern */}
          <rect width={width} height={height} fill="url(#ledscLabGrid)" />

          {/* Title */}
          <text x={width / 2} y={28} fill={colors.textPrimary} fontSize={18} fontWeight="bold" textAnchor="middle">
            LED as Solar Cell - Photovoltaic Mode
          </text>
          <text x={width / 2} y={46} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Semiconductor P-N Junction Converting Light to Electricity
          </text>

          {/* === PREMIUM LIGHT SOURCE === */}
          <g transform="translate(85, 200)">
            {/* Flashlight body */}
            <rect x="-40" y="-50" width={80} height={100} rx={10} fill="url(#ledscLightHousing)" stroke="#4b5563" strokeWidth={1.5} />
            <rect x="-35" y="-45" width={70} height={90} rx={8} fill="#1f2937" opacity="0.3" />

            {/* Lens bezel */}
            <ellipse cx="40" cy="0" rx={12} ry={35} fill="#374151" stroke="#4b5563" strokeWidth={1} />

            {/* Light emitter with glow */}
            <circle cx="0" cy="0" r={30} fill="url(#ledscPhotonGlow)" filter="url(#ledscEmissionGlow)" opacity={lightIntensity / 100} />
            <circle cx="0" cy="0" r={20} fill={wavelengthToColor(lightWavelength)} opacity={lightIntensity / 100 * 0.8} />
            <circle cx="0" cy="0" r={10} fill="#ffffff" opacity={0.6} />

            {/* Control panel */}
            <rect x="-30" y="55" width={60} height={25} rx={4} fill="#111827" stroke="#334155" strokeWidth={0.5} />
            <circle cx="-15" cy="67" r={5} fill={colors.success}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text x="10" y="71" fill={colors.textMuted} fontSize={8} textAnchor="middle">ON</text>

            {/* Labels */}
            <text x="0" y={95} fill={colors.textSecondary} fontSize={11} fontWeight="600" textAnchor="middle">Light Source</text>
            <text x="0" y={110} fill={wavelengthToColor(lightWavelength)} fontSize={12} fontWeight="bold" textAnchor="middle">{lightWavelength} nm</text>
          </g>

          {/* === PHOTON BEAM WITH PARTICLES === */}
          <g>
            {/* Main beam path */}
            {Array.from({ length: 12 }).map((_, i) => {
              const spread = (i - 5.5) * 0.08;
              const startX = 130;
              const endX = 260;
              const startY = 200;
              const endY = 200 + (i - 5.5) * 6;
              const opacity = output.aboveThreshold ? (lightIntensity / 100) * 0.5 : 0.15;
              return (
                <line
                  key={`ray${i}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="url(#ledscLightBeam)"
                  strokeWidth={2.5}
                  opacity={opacity}
                  strokeDasharray={output.aboveThreshold ? "none" : "6,4"}
                />
              );
            })}

            {/* Animated photon particles traveling to LED */}
            {output.aboveThreshold && Array.from({ length: 5 }).map((_, i) => (
              <g key={`photon${i}`}>
                <circle
                  r={4}
                  fill="url(#ledscPhotonGlow)"
                  filter="url(#ledscPhotonFilter)"
                >
                  <animateMotion
                    dur={`${1.2 + i * 0.3}s`}
                    repeatCount="indefinite"
                    path={`M130,${195 + i * 4} L260,${195 + i * 4}`}
                    begin={`${i * 0.25}s`}
                  />
                </circle>
                {/* Photon wave visualization */}
                <circle
                  r={6}
                  fill="none"
                  stroke={wavelengthToColor(lightWavelength)}
                  strokeWidth={1}
                  opacity={0.4}
                >
                  <animateMotion
                    dur={`${1.2 + i * 0.3}s`}
                    repeatCount="indefinite"
                    path={`M130,${195 + i * 4} L260,${195 + i * 4}`}
                    begin={`${i * 0.25}s`}
                  />
                  <animate attributeName="r" values="4;8;4" dur="0.3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.3s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </g>

          {/* === PREMIUM LED COMPONENT WITH P-N JUNCTION === */}
          <g transform="translate(320, 200)">
            {/* LED dome - outer shell */}
            <ellipse cx="0" cy="-10" rx={50} ry={65} fill="url(#ledscLEDHousing)" stroke={led.color} strokeWidth={1} strokeOpacity={0.5} />

            {/* LED dome - inner highlight */}
            <ellipse cx="-10" cy="-25" rx={30} ry={40} fill="url(#ledscLEDHighlight)" />

            {/* Active glow when generating */}
            {output.aboveThreshold && (
              <ellipse cx="0" cy="-10" rx={45} ry={60} fill={led.color} opacity={0.3} filter="url(#ledscGlowFilter)">
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="1.5s" repeatCount="indefinite" />
              </ellipse>
            )}

            {/* P-N Junction visualization inside LED */}
            <g transform="translate(0, 30)">
              {/* Junction housing */}
              <rect x="-35" y="-20" width={70} height={40} rx={4} fill="url(#ledscPNJunction)" stroke="#475569" strokeWidth={1} />

              {/* Depletion zone */}
              <rect x="-8" y="-18" width={16} height={36} fill="url(#ledscDepletionZone)" />

              {/* N-type label */}
              <text x="-22" y="0" fill="#93c5fd" fontSize={9} fontWeight="bold" textAnchor="middle">N</text>

              {/* P-type label */}
              <text x="22" y="0" fill="#fca5a5" fontSize={9} fontWeight="bold" textAnchor="middle">P</text>

              {/* Electron-hole pair generation animation */}
              {output.aboveThreshold && (
                <g>
                  {/* Electrons moving to N-side */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <circle
                      key={`electron${i}`}
                      r={3}
                      fill="url(#ledscElectronGlow)"
                      filter="url(#ledscParticleFilter)"
                    >
                      <animateMotion
                        dur={`${1 + i * 0.4}s`}
                        repeatCount="indefinite"
                        path="M0,0 L-25,0"
                        begin={`${i * 0.35}s`}
                      />
                      <animate attributeName="opacity" values="0;1;1;0" dur={`${1 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.35}s`} />
                    </circle>
                  ))}

                  {/* Holes moving to P-side */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <circle
                      key={`hole${i}`}
                      r={3}
                      fill="url(#ledscHoleGlow)"
                      filter="url(#ledscParticleFilter)"
                    >
                      <animateMotion
                        dur={`${1 + i * 0.4}s`}
                        repeatCount="indefinite"
                        path="M0,0 L25,0"
                        begin={`${i * 0.35}s`}
                      />
                      <animate attributeName="opacity" values="0;1;1;0" dur={`${1 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.35}s`} />
                    </circle>
                  ))}

                  {/* Photon absorption burst at junction */}
                  <circle cx="0" cy="0" r={5} fill={wavelengthToColor(lightWavelength)} opacity={0.6}>
                    <animate attributeName="r" values="3;8;3" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}
            </g>

            {/* LED legs with gradient */}
            <rect x="-14" y={55} width={6} height={40} rx={1} fill="url(#ledscWireCathode)" />
            <rect x="8" y={55} width={6} height={40} rx={1} fill="url(#ledscWireAnode)" />

            {/* Leg labels */}
            <text x="-11" y={105} fill="#93c5fd" fontSize={7} textAnchor="middle">-</text>
            <text x="11" y={105} fill="#fca5a5" fontSize={7} textAnchor="middle">+</text>

            {/* Labels */}
            <text x="0" y={-85} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">{ledColor.toUpperCase()} LED</text>
            <text x="0" y={120} fill={colors.textSecondary} fontSize={10} textAnchor="middle">Bandgap: {led.bandgap} eV</text>

            {/* Current flow indicator */}
            {output.aboveThreshold && (
              <g>
                <text x="0" y={140} fill={colors.success} fontSize={11} fontWeight="bold" textAnchor="middle">
                  Generating Power
                </text>
                {/* Animated current arrows */}
                <path d="M -11,90 L -11,70" stroke={colors.success} strokeWidth={2} markerEnd="url(#ledscArrowGreen)" opacity={0.8}>
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
                </path>
                <path d="M 11,70 L 11,90" stroke={colors.success} strokeWidth={2} opacity={0.8}>
                  <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" begin="0.5s" />
                </path>
              </g>
            )}
          </g>

          {/* === PREMIUM MULTIMETER === */}
          {showMultimeter && (
            <g transform="translate(500, 140)">
              {/* Meter housing */}
              <rect x="-55" y="-60" width={110} height={180} rx={10} fill="url(#ledscMeterHousing)" stroke="#475569" strokeWidth={1.5} />
              <rect x="-50" y="-55" width={100} height={170} rx={8} fill="#111827" opacity="0.3" />

              {/* Brand label */}
              <text x="0" y={-42} fill={colors.accent} fontSize={11} fontWeight="bold" textAnchor="middle" letterSpacing="1">MULTIMETER</text>

              {/* LCD Display background */}
              <rect x="-45" y="-30" width={90} height={130} rx={6} fill="url(#ledscMeterDisplay)" stroke="#334155" strokeWidth={0.5} />

              {/* Voltage display */}
              <rect x="-40" y="-25" width={80} height={38} rx={4} fill="#030712" stroke="#1f2937" strokeWidth={0.5} />
              <text x="0" y={-5} fill={colors.success} fontSize={20} fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {output.voltage.toFixed(3)}
              </text>
              <text x="35" y={-5} fill={colors.success} fontSize={12} textAnchor="middle">V</text>
              <text x="0" y={10} fill={colors.textMuted} fontSize={8} textAnchor="middle" letterSpacing="0.5">VOLTAGE</text>

              {/* Current display */}
              <rect x="-40" y={20} width={80} height={38} rx={4} fill="#030712" stroke="#1f2937" strokeWidth={0.5} />
              <text x="0" y={42} fill={colors.blue} fontSize={18} fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {(output.current * 1000).toFixed(1)}
              </text>
              <text x="35" y={42} fill={colors.blue} fontSize={10} textAnchor="middle">uA</text>
              <text x="0" y={55} fill={colors.textMuted} fontSize={8} textAnchor="middle" letterSpacing="0.5">CURRENT</text>

              {/* Power display */}
              <rect x="-40" y={65} width={80} height={32} rx={4} fill="#030712" stroke="#1f2937" strokeWidth={0.5} />
              <text x="0" y={85} fill={colors.warning} fontSize={14} fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {(output.power * 1000).toFixed(2)}
              </text>
              <text x="35" y={85} fill={colors.warning} fontSize={9} textAnchor="middle">uW</text>
              <text x="0" y={95} fill={colors.textMuted} fontSize={7} textAnchor="middle" letterSpacing="0.5">POWER</text>

              {/* Connection indicator */}
              <circle cx="-35" cy={110} r={4} fill={output.aboveThreshold ? colors.success : colors.textMuted}>
                {output.aboveThreshold && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
              </circle>
              <text x="-20" y={113} fill={colors.textMuted} fontSize={7}>SIGNAL</text>
            </g>
          )}

          {/* === ENERGY DIAGRAM === */}
          <g transform="translate(60, 365)">
            <text x="0" y="0" fill={colors.textSecondary} fontSize={11} fontWeight="600">Energy Comparison:</text>

            {/* Photon energy bar */}
            <rect x="120" y="-12" width={Math.min(output.photonEnergy * 50, 180)} height={14} rx={3} fill={wavelengthToColor(lightWavelength)} opacity={0.8} />
            <rect x="120" y="-12" width={Math.min(output.photonEnergy * 50, 180)} height={4} rx={2} fill="#ffffff" opacity={0.3} />
            <text x="120" y={15} fill={colors.textMuted} fontSize={9}>Photon Energy: <tspan fill={wavelengthToColor(lightWavelength)} fontWeight="bold">{output.photonEnergy.toFixed(2)} eV</tspan></text>

            {/* Bandgap threshold indicator */}
            <line x1={120 + led.bandgap * 50} y1="-18" x2={120 + led.bandgap * 50} y2="8" stroke={colors.error} strokeWidth={2} strokeDasharray="4,2" />
            <text x={120 + led.bandgap * 50} y="-22" fill={colors.error} fontSize={8} textAnchor="middle" fontWeight="bold">Bandgap</text>
            <text x={120 + led.bandgap * 50} y="22" fill={colors.error} fontSize={8} textAnchor="middle">{led.bandgap} eV</text>
          </g>

          {/* === STATUS INDICATOR === */}
          <g transform={`translate(${width / 2}, 420)`}>
            <rect x="-110" y="-15" width={220} height={30} rx={8}
              fill={output.aboveThreshold ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
              stroke={output.aboveThreshold ? colors.success : colors.error}
              strokeWidth={1.5}
            />
            {output.aboveThreshold && (
              <rect x="-110" y="-15" width={220} height={30} rx={8} fill={colors.success} opacity={0.1}>
                <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
              </rect>
            )}
            <circle cx="-90" cy="0" r={5} fill={output.aboveThreshold ? colors.success : colors.error}>
              {output.aboveThreshold && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
            </circle>
            <text x="10" y="5" fill={output.aboveThreshold ? colors.success : colors.error} fontSize={13} fontWeight="bold" textAnchor="middle">
              {output.aboveThreshold ? 'PHOTOVOLTAIC ACTIVE' : 'BELOW THRESHOLD'}
            </text>
          </g>

          {/* === LEGEND === */}
          <g transform="translate(20, 60)">
            <rect x="-5" y="-15" width={120} height={70} rx={6} fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth={0.5} />
            <text x="5" y="0" fill={colors.textSecondary} fontSize={9} fontWeight="600">LEGEND</text>

            {/* Photon */}
            <circle cx="15" cy="18" r={4} fill={wavelengthToColor(lightWavelength)} filter="url(#ledscPhotonFilter)" />
            <text x="28" y="21" fill={colors.textMuted} fontSize={8}>Photon</text>

            {/* Electron */}
            <circle cx="15" cy="35" r={4} fill="url(#ledscElectronGlow)" />
            <text x="28" y="38" fill={colors.textMuted} fontSize={8}>Electron (e-)</text>

            {/* Hole */}
            <circle cx="75" cy="35" r={4} fill="url(#ledscHoleGlow)" />
            <text x="88" y="38" fill={colors.textMuted} fontSize={8}>Hole (h+)</text>
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          LED Color:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(ledBandgaps).map(([color, data]) => (
            <button
              key={color}
              onClick={() => setLedColor(color as 'red' | 'green' | 'blue' | 'yellow')}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: ledColor === color ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: ledColor === color ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: data.color,
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'capitalize',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Wavelength: {lightWavelength} nm
        </label>
        <input
          type="range"
          min="350"
          max="750"
          step="10"
          value={lightWavelength}
          onChange={(e) => setLightWavelength(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: wavelengthToColor(lightWavelength) }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
          <span style={{ color: colors.purple }}>UV</span>
          <span style={{ color: colors.blue }}>Blue</span>
          <span style={{ color: colors.led }}>Green</span>
          <span style={{ color: colors.yellow }}>Yellow</span>
          <span style={{ color: colors.red }}>Red</span>
          <span style={{ color: '#991b1b' }}>IR</span>
        </div>
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

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          <strong>Physics:</strong> Photon energy = hc/lambda = {(1240 / lightWavelength).toFixed(2)} eV
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Must exceed LED bandgap ({ledBandgaps[ledColor].bandgap} eV) to generate current
        </div>
      </div>
    </div>
  );

  // Render wrapper with progress bar and bottom bar
  const renderPhaseContent = (content: React.ReactNode, canGoNext: boolean, nextLabel: string) => (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
        {content}
      </div>
      {renderBottomBar(canGoNext, nextLabel)}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
            LED as a Solar Cell
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
            Can an LED generate electricity like a solar cell?
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
              We know LEDs emit light when powered. But what happens when we shine light
              ON an LED? The P-N junction that creates light can also convert it back to
              electricity - the photovoltaic effect in action!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              LEDs are tiny solar cells waiting to be discovered.
            </p>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
              Try changing LED colors and light wavelength to see when power is generated!
            </p>
          </div>
        </div>
      </>,
      true,
      'Make a Prediction'
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <>
        {renderVisualization()}

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            When you shine a flashlight on an LED, what do you predict will happen?
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
      </>,
      !!prediction,
      'Test My Prediction'
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore LED Photovoltaic Effect</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Change LED color and light wavelength to discover the physics
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
            <li>Shine blue light on a red LED - what voltage do you get?</li>
            <li>Try red light on a blue LED - does it work?</li>
            <li>Which LED produces the highest voltage?</li>
            <li>What happens at the wavelength threshold?</li>
          </ul>
        </div>
      </>,
      true,
      'Continue to Review'
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'small';

    return renderPhaseContent(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Let\'s explore further!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            LEDs can indeed generate electricity when illuminated! The P-N junction creates
            electron-hole pairs when photons with sufficient energy are absorbed.
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics Explained</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>P-N Junction Magic:</strong> The same
              semiconductor junction that emits light can also absorb it. Photons with energy
              greater than the bandgap create electron-hole pairs that generate current.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Bandgap Energy:</strong> Each LED color
              has a specific bandgap. Blue LEDs have larger bandgaps (2.7 eV) than red LEDs (1.9 eV),
              so they can generate higher voltages.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Threshold Effect:</strong> Light must have
              photon energy above the bandgap. Red light on a blue LED won't work because red
              photons don't have enough energy!
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Efficiency:</strong> LEDs aren't optimized
              for solar conversion, so efficiency is low. But the physics is identical to solar cells!
            </p>
          </div>
        </div>
      </>,
      true,
      'Next: A Twist!'
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary }}>
            What if we add colored filters between the light and the LED?
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
            We'll place colored filters that block certain wavelengths. How will this
            affect the LED's ability to generate electricity? Will matching colors
            help or hurt?
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            What happens when you add a colored filter?
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
      </>,
      !!twistPrediction,
      'Test My Prediction'
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test with Filters</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Use the wavelength slider to simulate different colored filters
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
            Filters that pass only long wavelengths (red, orange) reduce the photon energy.
            For LEDs with larger bandgaps (green, blue), this can drop below threshold!
          </p>
        </div>
      </>,
      true,
      'See the Explanation'
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'opposite';

    return renderPhaseContent(
      <>
        <div style={{
          background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
          borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
        }}>
          <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
            {wasCorrect ? 'Excellent insight!' : 'The answer is counterintuitive!'}
          </h3>
          <p style={{ color: colors.textPrimary }}>
            Colored filters that match the LED color often REDUCE output! The filter
            removes higher-energy photons that the LED could have converted.
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Spectral Response Explained</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Energy Matters:</strong> LEDs respond
              to photons with energy ABOVE their bandgap. Higher energy (shorter wavelength)
              photons can always be converted.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Filter Effect:</strong> A red filter
              removes blue and green light. For a red LED, this is fine. But a green LED
              loses the high-energy photons it needs!
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Practical Implication:</strong> This
              is why solar cells need broad spectrum absorption and why multi-junction cells
              use different bandgaps to capture more of the spectrum.
            </p>
          </div>
        </div>
      </>,
      true,
      'Apply This Knowledge'
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderPhaseContent(
      <>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            LED photovoltaics enable surprising technologies
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
      </>,
      transferCompleted.size >= 4,
      'Take the Test'
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
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
              {testScore >= 8 ? 'You\'ve mastered LED photovoltaics!' : 'Review the material and try again.'}
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
        </>,
        testScore >= 8,
        testScore >= 8 ? 'Complete Mastery' : 'Review & Retry'
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
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
    return renderPhaseContent(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered LED photovoltaics!</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>P-N junctions can both emit and absorb light</li>
            <li>Photon energy must exceed bandgap for current generation</li>
            <li>Different LED colors have different bandgap energies</li>
            <li>Voltage output relates to bandgap energy</li>
            <li>Spectral response depends on bandgap threshold</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            This principle is used in optical transceivers, LED-based sensors, and even
            research into new solar cell designs. The same physics applies to all
            semiconductor light-electricity conversion!
          </p>
        </div>
        {renderVisualization()}
      </>,
      true,
      'Complete Game'
    );
  }

  return null;
};

export default LEDAsSolarCellRenderer;
