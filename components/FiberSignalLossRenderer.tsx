'use client';

import React, { useState, useEffect, useCallback } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Bend Effects',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

interface FiberSignalLossRendererProps {
  phase?: Phase;
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
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  fiber: '#22d3ee',
  fiberCore: '#67e8f9',
  laserRed: '#ef4444',
  laserGreen: '#22c55e',
};

// Fiber types with attenuation characteristics
const fiberTypes = [
  { name: 'Single-mode (1550nm)', attenuation: 0.2, label: 'Long-haul' },
  { name: 'Single-mode (1310nm)', attenuation: 0.35, label: 'Metro' },
  { name: 'Multi-mode (850nm)', attenuation: 2.5, label: 'Data center' },
  { name: 'Multi-mode (1300nm)', attenuation: 0.8, label: 'Campus' },
];

const FiberSignalLossRenderer: React.FC<FiberSignalLossRendererProps> = ({
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

  // Internal phase state management
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialPhase && PHASES.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  });

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && PHASES.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      goToPhase(PHASES[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [fiberLength, setFiberLength] = useState(10); // km
  const [fiberTypeIndex, setFiberTypeIndex] = useState(0);
  const [inputPower, setInputPower] = useState(0); // dBm
  const [numConnectors, setNumConnectors] = useState(2);
  const [numSplices, setNumSplices] = useState(1);
  const [bendRadius, setBendRadius] = useState(30); // mm
  const [animationFrame, setAnimationFrame] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate signal loss
  const fiber = fiberTypes[fiberTypeIndex];
  const fiberLoss = fiber.attenuation * fiberLength;
  const connectorLoss = numConnectors * 0.5; // 0.5 dB per connector
  const spliceLoss = numSplices * 0.1; // 0.1 dB per splice
  const bendLoss = bendRadius < 15 ? 3.0 : bendRadius < 25 ? 0.5 : 0;
  const totalLoss = fiberLoss + connectorLoss + spliceLoss + bendLoss;
  const outputPower = inputPower - totalLoss;
  const signalStrength = Math.max(0, Math.min(1, (outputPower + 30) / 30)); // Normalize to 0-1

  // Animation for light pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const predictions = [
    { id: 'same', label: 'Signal stays the same - light travels perfectly in fiber' },
    { id: 'slight', label: 'Signal loses a little strength - minor absorption' },
    { id: 'significant', label: 'Signal weakens significantly over distance (dB/km loss)' },
    { id: 'amplified', label: 'Signal gets stronger - fiber acts like an amplifier' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Bends have no effect - light bounces internally' },
    { id: 'faster', label: 'Bends make light travel faster through shortcuts' },
    { id: 'more_loss', label: 'Tight bends cause more signal loss than straight runs' },
    { id: 'blocked', label: 'Bends completely block the signal' },
  ];

  const transferApplications = [
    {
      title: 'Submarine Cables',
      description: 'Undersea fiber cables span thousands of kilometers connecting continents. How do they maintain signal over such distances?',
      answer: 'Submarine cables use optical amplifiers (EDFAs) every 50-100km to boost the signal. They use single-mode fiber at 1550nm for lowest attenuation (0.2 dB/km). Even so, signals must be amplified dozens of times across the Atlantic!',
    },
    {
      title: 'OTDR Testing',
      description: 'Technicians use Optical Time Domain Reflectometers to find faults in fiber networks. How does OTDR work?',
      answer: 'OTDR sends light pulses and measures reflections. Distance is calculated from time-of-flight. Sudden spikes indicate connectors/splices, gradual slope shows attenuation, and sharp drops reveal breaks or macrobends. Its like radar for fiber!',
    },
    {
      title: 'Data Center Interconnects',
      description: 'Modern data centers use multimode fiber for short runs between racks. Why not single-mode everywhere?',
      answer: 'Multimode is cheaper for short distances (<500m) - larger core means easier alignment, cheaper transceivers. But modal dispersion limits bandwidth over distance. Single-mode costs more but supports 100km+ with proper amplification.',
    },
    {
      title: 'Fiber to the Home (FTTH)',
      description: 'Your home internet likely uses a Passive Optical Network (PON). How does one fiber serve multiple homes?',
      answer: 'PON uses optical splitters to divide one fiber signal to 32-128 homes. Each split adds ~3.5dB loss. A 1:32 splitter loses ~17dB! This limits total reach. GPON can serve homes up to 20km from the central office.',
    },
  ];

  const testQuestions = [
    {
      question: 'Fiber optic signal loss is measured in:',
      options: [
        { text: 'Watts per meter', correct: false },
        { text: 'Decibels per kilometer (dB/km)', correct: true },
        { text: 'Lumens per second', correct: false },
        { text: 'Hertz per mile', correct: false },
      ],
    },
    {
      question: 'Single-mode fiber at 1550nm has attenuation of approximately:',
      options: [
        { text: '10 dB/km', correct: false },
        { text: '2.5 dB/km', correct: false },
        { text: '0.2 dB/km', correct: true },
        { text: '0.02 dB/km', correct: false },
      ],
    },
    {
      question: 'If a 10km fiber run has 0.3 dB/km attenuation, total fiber loss is:',
      options: [
        { text: '0.03 dB', correct: false },
        { text: '0.3 dB', correct: false },
        { text: '3 dB', correct: true },
        { text: '30 dB', correct: false },
      ],
    },
    {
      question: 'A connector typically adds how much loss?',
      options: [
        { text: '0.01 dB', correct: false },
        { text: '0.5 dB', correct: true },
        { text: '5 dB', correct: false },
        { text: '10 dB', correct: false },
      ],
    },
    {
      question: 'Why do tight bends cause signal loss in fiber?',
      options: [
        { text: 'The glass cracks under pressure', correct: false },
        { text: 'Light escapes when angle exceeds critical angle', correct: true },
        { text: 'Electrical resistance increases', correct: false },
        { text: 'The fiber stretches and thins', correct: false },
      ],
    },
    {
      question: 'OTDR stands for:',
      options: [
        { text: 'Optical Transmission Data Rate', correct: false },
        { text: 'Optical Time Domain Reflectometer', correct: true },
        { text: 'Optical Termination Detection Radar', correct: false },
        { text: 'Output Terminal Digital Reader', correct: false },
      ],
    },
    {
      question: 'Why is 1550nm preferred for long-distance fiber communication?',
      options: [
        { text: 'Its invisible to the human eye', correct: false },
        { text: 'Lowest attenuation in silica glass', correct: true },
        { text: 'Highest bandwidth capacity', correct: false },
        { text: 'Cheapest laser diodes available', correct: false },
      ],
    },
    {
      question: 'A 1:32 optical splitter adds approximately how much loss?',
      options: [
        { text: '3.2 dB', correct: false },
        { text: '32 dB', correct: false },
        { text: '15-17 dB', correct: true },
        { text: '1.5 dB', correct: false },
      ],
    },
    {
      question: 'Modal dispersion limits bandwidth in:',
      options: [
        { text: 'Single-mode fiber', correct: false },
        { text: 'Multimode fiber', correct: true },
        { text: 'Both types equally', correct: false },
        { text: 'Neither type', correct: false },
      ],
    },
    {
      question: 'Submarine fiber cables use amplifiers every:',
      options: [
        { text: '1-5 km', correct: false },
        { text: '50-100 km', correct: true },
        { text: '500-1000 km', correct: false },
        { text: 'They dont need amplifiers', correct: false },
      ],
    },
  ];

  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, testQuestions, onCorrectAnswer, onIncorrectAnswer]);

  // Real-world applications data
  const realWorldApps = [
    {
      icon: '🌊',
      title: 'Undersea Cables',
      short: 'Global Internet Backbone',
      tagline: 'Connecting continents through the ocean depths',
      description: 'Submarine fiber optic cables carry over 99% of intercontinental data traffic, spanning thousands of kilometers across ocean floors. These engineering marvels must maintain signal integrity through extreme pressures, temperatures, and distances that would render most communication systems useless.',
      connection: 'Understanding fiber signal loss is critical for submarine cable design. At 0.2 dB/km attenuation over 6,000+ km transatlantic routes, signals would be completely lost without optical amplifiers placed every 50-100 km along the cable.',
      howItWorks: 'Submarine cables use single-mode fiber at 1550nm wavelength for minimum attenuation. Erbium-Doped Fiber Amplifiers (EDFAs) are housed in repeater units on the ocean floor, boosting all wavelengths simultaneously. Multiple fiber pairs provide redundancy, and Dense Wavelength Division Multiplexing (DWDM) allows 100+ channels per fiber, achieving total capacities exceeding 200 Tbps per cable system.',
      stats: [
        { value: '99%', label: 'Of intercontinental data via submarine cables' },
        { value: '1.3M km', label: 'Total submarine cable deployed globally' },
        { value: '200+ Tbps', label: 'Capacity of modern transatlantic cables' },
      ],
      examples: [
        'MAREA cable: 6,600 km from Virginia to Spain, 200 Tbps capacity',
        'PEACE cable: 15,000 km connecting Asia, Africa, and Europe',
        'Dunant cable: Google-owned transatlantic with 250 Tbps capacity',
        'SEA-ME-WE 6: 19,200 km serving Southeast Asia, Middle East, Western Europe',
      ],
      companies: ['SubCom', 'NEC Corporation', 'Alcatel Submarine Networks', 'Google', 'Meta'],
      futureImpact: 'Next-generation submarine cables will use hollow-core fiber and space-division multiplexing to push capacities beyond 1 Pbps per cable. Quantum key distribution over submarine fiber will enable unhackable intercontinental communications by 2030.',
      color: '#0ea5e9',
    },
    {
      icon: '🏠',
      title: 'FTTH Networks',
      short: 'Home Broadband',
      tagline: 'Bringing gigabit speeds to every doorstep',
      description: 'Fiber to the Home (FTTH) networks deliver high-speed internet directly to residential subscribers using Passive Optical Networks (PON). This architecture efficiently serves entire neighborhoods from a single fiber connection at the central office.',
      connection: 'PON technology relies on optical splitters that divide the signal to serve multiple homes, with each split adding approximately 3.5 dB of loss. A 1:32 splitter loses about 17 dB, limiting total reach to around 20 km from the central office - making signal loss calculations essential for network design.',
      howItWorks: 'A single fiber from the Optical Line Terminal (OLT) at the central office reaches a passive splitter in the neighborhood, which divides the signal to 32-128 Optical Network Terminals (ONTs) at individual homes. Downstream data broadcasts to all users (each ONT filters its data), while upstream uses Time Division Multiple Access (TDMA) to prevent collisions. GPON provides 2.5 Gbps down/1.25 Gbps up, while XGS-PON offers symmetric 10 Gbps.',
      stats: [
        { value: '1.2B', label: 'Global FTTH/B subscribers (2024)' },
        { value: '20 km', label: 'Maximum PON reach from central office' },
        { value: '10 Gbps', label: 'XGS-PON symmetric speed per port' },
      ],
      examples: [
        'Verizon Fios: 7+ million FTTH subscribers across northeastern US',
        'China Telecom: World\'s largest FTTH network with 180+ million homes',
        'Orange France: 34 million homes passed with fiber infrastructure',
        'Google Fiber: Pioneered residential gigabit service in the US',
      ],
      companies: ['Verizon', 'AT&T', 'China Telecom', 'Orange', 'NTT'],
      futureImpact: '50G-PON and beyond will deliver 50 Gbps to homes by 2028, enabling 8K streaming, holographic communications, and real-time cloud gaming. Bend-insensitive fiber will simplify installations, reducing deployment costs by 40%.',
      color: '#10b981',
    },
    {
      icon: '🏢',
      title: 'Data Center Interconnects',
      short: 'Enterprise Infrastructure',
      tagline: 'The high-speed nervous system of cloud computing',
      description: 'Data Center Interconnects (DCI) are the high-capacity fiber links connecting data centers within a campus, across a metro area, or between regions. These links carry massive amounts of traffic between compute, storage, and networking resources.',
      connection: 'DCI links must maintain extremely low loss budgets to support high-speed transceivers (400G and beyond). Every connector, splice, and patch panel adds loss that must be carefully calculated. Multimode fiber dominates short reaches (<500m) where its lower cost offsets higher attenuation, while single-mode handles longer distances.',
      howItWorks: 'Within data centers, multimode fiber with 850nm VCSELs connects servers to Top-of-Rack switches over short distances. Between buildings, single-mode fiber with coherent optics enables 400G+ transmission over campus distances. For metro and long-haul DCI, DWDM systems multiplex 96+ wavelengths onto a single fiber pair, with each wavelength carrying 400G-800G using advanced modulation formats like 64-QAM.',
      stats: [
        { value: '800 Gbps', label: 'Per wavelength with coherent optics' },
        { value: '144 fibers', label: 'Typical high-density trunk cable' },
        { value: '<0.35 dB', label: 'Loss budget per connection in DCI' },
      ],
      examples: [
        'AWS Direct Connect: Dedicated fiber links to AWS regions worldwide',
        'Microsoft Azure ExpressRoute: Private connectivity to Azure data centers',
        'Equinix Fabric: Interconnection platform linking 250+ data centers',
        'Google Cloud Interconnect: 10-200 Gbps dedicated connections',
      ],
      companies: ['Equinix', 'Digital Realty', 'AWS', 'Microsoft Azure', 'Google Cloud'],
      futureImpact: 'Co-packaged optics will integrate photonics directly into switch ASICs, enabling 51.2 Tbps switches by 2026. Silicon photonics will reduce transceiver costs by 60%, while 1.6T optics become standard for spine-leaf architectures.',
      color: '#8b5cf6',
    },
    {
      icon: '🔬',
      title: 'Fiber Optic Sensors',
      short: 'Industrial Monitoring',
      tagline: 'Turning fiber into distributed sensing networks',
      description: 'Fiber optic sensors use the fiber itself as the sensing element, detecting changes in temperature, strain, pressure, and vibration along the entire length of the fiber. This enables monitoring of pipelines, bridges, tunnels, and industrial equipment over distances impossible with traditional sensors.',
      connection: 'Sensor performance directly depends on understanding signal loss. Distributed sensing techniques like OTDR, Brillouin scattering, and Rayleigh backscatter analyze how the signal degrades along the fiber to detect and locate environmental changes. Every 0.1 dB of unexpected loss could indicate a structural issue.',
      howItWorks: 'Distributed Temperature Sensing (DTS) uses Raman scattering - the ratio of Stokes to anti-Stokes backscattered light indicates temperature at each point along the fiber. Distributed Acoustic Sensing (DAS) uses Rayleigh backscatter to detect vibrations with meter-level resolution over 50+ km. Fiber Bragg Gratings (FBGs) are point sensors written into the fiber that reflect specific wavelengths, with wavelength shift indicating strain or temperature.',
      stats: [
        { value: '50+ km', label: 'Sensing range for distributed systems' },
        { value: '1 meter', label: 'Spatial resolution for acoustic sensing' },
        { value: '0.1°C', label: 'Temperature resolution for DTS systems' },
      ],
      examples: [
        'Pipeline leak detection: 1,000+ km of oil/gas pipelines monitored continuously',
        'Structural health monitoring: Golden Gate Bridge uses fiber sensors for seismic detection',
        'Perimeter security: Fiber buried along borders detects footsteps and vehicles',
        'Downhole monitoring: Oil wells use fiber to measure temperature/pressure at depth',
      ],
      companies: ['Luna Innovations', 'Silixa', 'AP Sensing', 'Omnisens', 'Halliburton'],
      futureImpact: 'AI-powered analysis of distributed sensing data will predict equipment failures weeks in advance. Fiber sensors embedded in 3D-printed structures will enable smart infrastructure that self-reports damage. Quantum-enhanced sensors will achieve sensitivity improvements of 1000x for gravitational wave detection.',
      color: '#f59e0b',
    },
  ];

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 320;
    const pulsePosition = (animationFrame / 100) * 340;
    const pulseIntensity = Math.max(0.2, 1 - (pulsePosition / 340) * (totalLoss / 20));

    // Calculate fiber path based on bend radius
    const fiberPath = bendRadius < 25
      ? `M 85 160 Q 140 ${160 - (30 - bendRadius)}, 180 160 Q 250 ${160 + (30 - bendRadius)}, 320 160 Q 360 ${160 - (30 - bendRadius) / 2}, 415 160`
      : 'M 85 160 L 415 160';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        {/* Title outside SVG */}
        <div style={{
          color: colors.textPrimary,
          fontSize: typo.heading,
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Fiber Optic Signal Transmission
        </div>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: '16px', maxWidth: '600px' }}
        >
          <defs>
            {/* Premium laser housing gradient */}
            <linearGradient id="fiberLaserHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="25%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="75%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Laser diode glow */}
            <radialGradient id="fiberLaserDiodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#dc2626" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Fiber cladding gradient - outer glass layer */}
            <linearGradient id="fiberCladdingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity={0.4 + signalStrength * 0.5} />
              <stop offset="80%" stopColor="#0284c7" stopOpacity={0.3 + signalStrength * 0.4} />
              <stop offset="100%" stopColor="#0369a1" stopOpacity={signalStrength * 0.6} />
            </linearGradient>

            {/* Fiber core gradient - inner light-carrying core */}
            <linearGradient id="fiberCoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity={0.9 * signalStrength + 0.1} />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.7 * signalStrength + 0.1} />
              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.5 * signalStrength} />
            </linearGradient>

            {/* Light pulse glow gradient */}
            <radialGradient id="fiberLightPulseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* Receiver housing gradient */}
            <linearGradient id="fiberReceiverHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#1f2937" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Receiver photodiode glow */}
            <radialGradient id="fiberPhotodiodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={signalStrength > 0.3 ? '#6ee7b7' : '#fca5a5'} stopOpacity="1" />
              <stop offset="40%" stopColor={signalStrength > 0.3 ? '#10b981' : '#ef4444'} stopOpacity="0.8" />
              <stop offset="70%" stopColor={signalStrength > 0.3 ? '#059669' : '#dc2626'} stopOpacity="0.5" />
              <stop offset="100%" stopColor={signalStrength > 0.3 ? '#047857' : '#b91c1c'} stopOpacity="0" />
            </radialGradient>

            {/* Connector metal gradient */}
            <linearGradient id="fiberConnectorMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="25%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="75%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Attenuation graph gradient */}
            <linearGradient id="fiberAttenuationGraph" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="30%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Background panel gradient */}
            <linearGradient id="fiberPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
            </linearGradient>

            {/* Glow filter for light pulse */}
            <filter id="fiberPulseGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow filter for elements */}
            <filter id="fiberSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner glow for fiber */}
            <filter id="fiberInnerGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Signal loss drop shadow */}
            <filter id="fiberDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Lab background with grid pattern */}
          <rect width={width} height={height} fill="url(#fiberPanelBg)" />
          <pattern id="fiberGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100,116,139,0.1)" strokeWidth="0.5" />
          </pattern>
          <rect width={width} height={height} fill="url(#fiberGrid)" />

          {/* === LASER SOURCE UNIT === */}
          <g filter="url(#fiberDropShadow)">
            {/* Main housing */}
            <rect x={15} y={125} width={65} height={70} rx={6} fill="url(#fiberLaserHousing)" />
            {/* Housing border highlight */}
            <rect x={15} y={125} width={65} height={70} rx={6} fill="none" stroke="#6b7280" strokeWidth={1} />
            {/* Inner panel */}
            <rect x={22} y={132} width={51} height={35} rx={3} fill="#1f2937" stroke="#374151" strokeWidth={1} />
            {/* Laser diode with glow */}
            <circle cx={47} cy={150} r={10} fill="url(#fiberLaserDiodeGlow)" filter="url(#fiberSoftGlow)" />
            <circle cx={47} cy={150} r={5} fill={colors.laserRed}>
              <animate attributeName="opacity" values="1;0.7;1" dur="0.3s" repeatCount="indefinite" />
            </circle>
            {/* Status LED */}
            <circle cx={30} cy={183} r={3} fill="#22c55e">
              <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
            </circle>
            {/* Fiber output port */}
            <rect x={72} y={152} width={13} height={16} rx={2} fill="#475569" stroke="#6b7280" strokeWidth={1} />
            <ellipse cx={78} cy={160} rx={4} ry={6} fill="#1e293b" />
          </g>

          {/* === FIBER OPTIC CABLE === */}
          {/* Fiber cladding (outer layer) */}
          <path
            d={fiberPath}
            fill="none"
            stroke="url(#fiberCladdingGradient)"
            strokeWidth={14}
            strokeLinecap="round"
            filter="url(#fiberInnerGlow)"
          />
          {/* Glass core (inner layer) */}
          <path
            d={fiberPath}
            fill="none"
            stroke="url(#fiberCoreGradient)"
            strokeWidth={6}
            strokeLinecap="round"
          />
          {/* Core center highlight */}
          <path
            d={fiberPath}
            fill="none"
            stroke="#a5f3fc"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.4 + signalStrength * 0.4}
          />

          {/* === ANIMATED LIGHT PULSE === */}
          <ellipse
            cx={85 + pulsePosition}
            cy={160}
            rx={10}
            ry={5}
            fill="url(#fiberLightPulseGlow)"
            opacity={pulseIntensity}
            filter="url(#fiberPulseGlow)"
          >
            <animate attributeName="rx" values="10;12;10" dur="0.2s" repeatCount="indefinite" />
          </ellipse>
          {/* Pulse core */}
          <ellipse
            cx={85 + pulsePosition}
            cy={160}
            rx={4}
            ry={2}
            fill="#fef3c7"
            opacity={pulseIntensity * 0.9}
          />

          {/* === CONNECTORS === */}
          {numConnectors >= 1 && (
            <g>
              <rect x={145} y={145} width={14} height={30} rx={2} fill="url(#fiberConnectorMetal)" stroke="#9ca3af" strokeWidth={1} />
              <rect x={148} y={157} width={8} height={6} rx={1} fill="#1e293b" />
              {/* Loss indicator glow */}
              <circle cx={152} cy={190} r={8} fill="rgba(245,158,11,0.2)" />
            </g>
          )}
          {numConnectors >= 2 && (
            <g>
              <rect x={343} y={145} width={14} height={30} rx={2} fill="url(#fiberConnectorMetal)" stroke="#9ca3af" strokeWidth={1} />
              <rect x={346} y={157} width={8} height={6} rx={1} fill="#1e293b" />
              {/* Loss indicator glow */}
              <circle cx={350} cy={190} r={8} fill="rgba(245,158,11,0.2)" />
            </g>
          )}

          {/* === SPLICE POINT === */}
          {numSplices >= 1 && (
            <g>
              <line x1={245} y1={145} x2={245} y2={175} stroke={colors.accent} strokeWidth={2} strokeDasharray="3,2" />
              <circle cx={245} cy={160} r={8} fill="rgba(6,182,212,0.2)" stroke={colors.accent} strokeWidth={1} />
              <circle cx={245} cy={160} r={3} fill={colors.accent} />
            </g>
          )}

          {/* === BEND LOSS VISUALIZATION === */}
          {bendRadius < 25 && (
            <g>
              {/* Light escape rays */}
              <g opacity={0.6}>
                <line x1={180} y1={155} x2={165} y2={135} stroke="#ef4444" strokeWidth={1} strokeDasharray="2,2">
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.5s" repeatCount="indefinite" />
                </line>
                <line x1={250} y1={165} x2={265} y2={185} stroke="#ef4444" strokeWidth={1} strokeDasharray="2,2">
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="0.5s" repeatCount="indefinite" />
                </line>
              </g>
              {/* Warning indicator */}
              <circle cx={220} cy={105} r={12} fill="rgba(239,68,68,0.2)" />
              <path d="M 215 108 L 220 98 L 225 108 Z" fill={colors.error} />
              <circle cx={220} cy={103} r={1.5} fill={colors.error} />
            </g>
          )}

          {/* === RECEIVER UNIT === */}
          <g filter="url(#fiberDropShadow)">
            {/* Fiber input port */}
            <rect x={415} y={152} width={13} height={16} rx={2} fill="#475569" stroke="#6b7280" strokeWidth={1} />
            <ellipse cx={422} cy={160} rx={4} ry={6} fill="#1e293b" />
            {/* Main housing */}
            <rect x={420} y={125} width={65} height={70} rx={6} fill="url(#fiberReceiverHousing)" />
            <rect x={420} y={125} width={65} height={70} rx={6} fill="none" stroke={signalStrength > 0.3 ? '#10b981' : '#ef4444'} strokeWidth={1.5} />
            {/* Inner panel */}
            <rect x={427} y={132} width={51} height={35} rx={3} fill="#1f2937" stroke="#374151" strokeWidth={1} />
            {/* Photodiode with glow */}
            <circle cx={452} cy={150} r={10} fill="url(#fiberPhotodiodeGlow)" filter="url(#fiberSoftGlow)" opacity={signalStrength} />
            <circle cx={452} cy={150} r={5} fill={signalStrength > 0.3 ? colors.success : colors.error}>
              <animate attributeName="opacity" values={`${signalStrength};${signalStrength * 0.6};${signalStrength}`} dur="0.5s" repeatCount="indefinite" />
            </circle>
            {/* Signal strength bar */}
            <rect x={430} y={175} width={40} height={8} rx={2} fill="#1f2937" stroke="#374151" strokeWidth={1} />
            <rect x={431} y={176} width={Math.max(0, signalStrength * 38)} height={6} rx={1} fill={signalStrength > 0.5 ? colors.success : signalStrength > 0.3 ? colors.warning : colors.error} />
          </g>

          {/* === ATTENUATION GRAPH (mini) === */}
          <g transform="translate(30, 220)">
            <rect x={0} y={0} width={440} height={85} rx={8} fill="rgba(0,0,0,0.4)" />
            {/* Graph area */}
            <rect x={10} y={35} width={200} height={40} rx={4} fill="#0f172a" stroke="#334155" strokeWidth={1} />
            {/* Attenuation line */}
            <polyline
              points={`15,40 ${15 + (200 * 0.2)},${40 + (fiberLoss / totalLoss) * 25} ${15 + (200 * 0.5)},${40 + ((fiberLoss + connectorLoss) / totalLoss) * 30} ${15 + (200 * 0.8)},${40 + ((fiberLoss + connectorLoss + spliceLoss) / totalLoss) * 32} 205,${42 + (totalLoss / 20) * 30}`}
              fill="none"
              stroke="url(#fiberAttenuationGraph)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Graph labels as simple shapes/indicators instead of text */}
            <circle cx={15} cy={40} r={3} fill="#22c55e" />
            <circle cx={205} cy={Math.min(70, 42 + (totalLoss / 20) * 30)} r={3} fill="#ef4444" />
          </g>
        </svg>

        {/* Loss breakdown labels outside SVG */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
          maxWidth: '600px',
          padding: `0 ${typo.pagePadding}`,
          background: colors.bgCard,
          borderRadius: '12px',
          paddingTop: typo.cardPadding,
          paddingBottom: typo.cardPadding,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
            Signal Loss Breakdown
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textSecondary, fontSize: typo.small }}>
            <span>Fiber ({fiberLength}km x {fiber.attenuation}dB/km):</span>
            <span style={{ color: colors.warning, fontWeight: 'bold' }}>-{fiberLoss.toFixed(1)} dB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textSecondary, fontSize: typo.small }}>
            <span>Connectors ({numConnectors} x 0.5dB):</span>
            <span style={{ color: colors.warning, fontWeight: 'bold' }}>-{connectorLoss.toFixed(1)} dB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textSecondary, fontSize: typo.small }}>
            <span>Splices + Bends:</span>
            <span style={{ color: colors.warning, fontWeight: 'bold' }}>-{(spliceLoss + bendLoss).toFixed(1)} dB</span>
          </div>
          <div style={{ height: '1px', background: colors.textMuted, margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textPrimary, fontSize: typo.body, fontWeight: 'bold' }}>
            <span>TOTAL LOSS:</span>
            <span style={{ color: colors.error }}>-{totalLoss.toFixed(1)} dB</span>
          </div>
          {bendRadius < 25 && (
            <div style={{
              color: colors.error,
              fontSize: typo.small,
              textAlign: 'center',
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: '8px',
              border: `1px solid ${colors.error}`
            }}>
              Warning: Bend radius {bendRadius}mm is below minimum! Adding {bendLoss.toFixed(1)} dB loss.
            </div>
          )}
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{ background: colors.bgCard, padding: '10px 18px', borderRadius: '10px', textAlign: 'center', border: `1px solid ${colors.accent}` }}>
              <div style={{ color: colors.textMuted, fontSize: typo.label }}>INPUT</div>
              <div style={{ color: colors.accent, fontSize: typo.heading, fontWeight: 'bold' }}>{inputPower} dBm</div>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '10px 18px',
              borderRadius: '10px',
              textAlign: 'center',
              border: `1px solid ${signalStrength > 0.3 ? colors.success : colors.error}`
            }}>
              <div style={{ color: colors.textMuted, fontSize: typo.label }}>OUTPUT</div>
              <div style={{ color: signalStrength > 0.3 ? colors.success : colors.error, fontSize: typo.heading, fontWeight: 'bold' }}>
                {outputPower.toFixed(1)} dBm
              </div>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '10px 18px',
              borderRadius: '10px',
              textAlign: 'center',
              border: `1px solid ${signalStrength > 0.5 ? colors.success : signalStrength > 0.3 ? colors.warning : colors.error}`
            }}>
              <div style={{ color: colors.textMuted, fontSize: typo.label }}>SIGNAL</div>
              <div style={{
                color: signalStrength > 0.5 ? colors.success : signalStrength > 0.3 ? colors.warning : colors.error,
                fontSize: typo.heading,
                fontWeight: 'bold'
              }}>
                {(signalStrength * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Fiber Length: {fiberLength} km
        </label>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={fiberLength}
          onChange={(e) => setFiberLength(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Fiber Type: {fiber.name}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {fiberTypes.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setFiberTypeIndex(i)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: fiberTypeIndex === i ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: fiberTypeIndex === i ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '11px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {f.label}<br/>{f.attenuation} dB/km
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Bend Radius: {bendRadius} mm {bendRadius < 25 && '(Causing loss!)'}
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={bendRadius}
          onChange={(e) => setBendRadius(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Connectors: {numConnectors}
          </label>
          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={numConnectors}
            onChange={(e) => setNumConnectors(parseInt(e.target.value))}
            style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Splices: {numSplices}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={numSplices}
            onChange={(e) => setNumSplices(parseInt(e.target.value))}
            style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
          />
        </div>
      </div>

      <div style={{
        background: 'rgba(6, 182, 212, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Loss Equation:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace' }}>
          Total Loss = (Attenuation x Length) + Connectors + Splices + Bends
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          = ({fiber.attenuation} x {fiberLength}) + {connectorLoss.toFixed(1)} + {spliceLoss.toFixed(1)} + {bendLoss.toFixed(1)}
        </div>
        <div style={{ color: colors.accent, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          = {totalLoss.toFixed(1)} dB
        </div>
      </div>
    </div>
  );

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: currentIdx === 0 ? 'rgba(255,255,255,0.3)' : colors.textSecondary,
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PHASES.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                style={{
                  width: i === currentIdx ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: i === currentIdx ? colors.accent : i < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                }}
                title={PHASE_LABELS[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: '500', color: colors.textMuted, marginLeft: '8px' }}>
            {currentIdx + 1}/{PHASES.length}
          </span>
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'rgba(6, 182, 212, 0.2)',
          color: colors.accent,
          fontSize: '12px',
          fontWeight: '600',
        }}>
          {PHASE_LABELS[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: currentIdx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
            color: currentIdx === 0 ? colors.textMuted : colors.textSecondary,
            fontWeight: '500',
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '500' }}>
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            border: 'none',
            background: canGoNext ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canGoNext ? 'white' : colors.textMuted,
            fontWeight: '600',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {nextLabel} {canGoNext && '->'}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>~</div>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Fiber Optic Signal Loss
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why does fiber lose signal over long distances?
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
                Data centers send terabits of data through hair-thin glass fibers. But even
                perfect glass absorbs and scatters light. Connectors, splices, and bends
                all take their toll on signal strength.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Understanding these losses is critical for designing reliable networks.
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the fiber length and type to see how signal degrades!
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You need to send a laser signal through 50km of fiber optic cable to connect
              two data centers. The laser starts at 0 dBm (1 milliwatt) of optical power.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the signal over this distance?
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
                    background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Fiber Loss</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust parameters to understand each loss component
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
              <li>Set length to 100km with multimode fiber - watch signal vanish!</li>
              <li>Compare single-mode (1550nm) vs multimode (850nm) attenuation</li>
              <li>Reduce bend radius below 15mm - see dramatic loss increase</li>
              <li>Add 6 connectors - each one steals signal!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'significant';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
              Fiber suffers attenuation measured in dB/km - even the best fiber loses signal over distance!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Fiber Loss</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Attenuation Sources:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li><strong>Absorption:</strong> Silica glass absorbs certain wavelengths (OH ions, IR absorption)</li>
                <li><strong>Rayleigh Scattering:</strong> Light scatters off molecular irregularities</li>
                <li><strong>Macrobending:</strong> Tight bends let light escape the core</li>
                <li><strong>Microbending:</strong> Tiny imperfections from stress/pressure</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The dB Scale:</strong> Decibels are logarithmic.
                3 dB loss = half the power. 10 dB = 10x reduction. 20 dB = 100x reduction!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Wavelength Matters:</strong> 1550nm has lowest
                loss (~0.2 dB/km) because its between silica absorption peaks.
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when you bend fiber around corners?
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
              A technician is running fiber through a data center and needs to route it around
              a tight corner. The bend radius is only 10mm - much tighter than the recommended
              30mm minimum for this fiber type.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does this tight bend affect the signal?
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
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Bend Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the bend radius to see how tight bends cause loss
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
              Light travels through fiber via total internal reflection - it bounces off the
              cladding at shallow angles. When you bend the fiber too tight, the angle exceeds
              the critical angle and light escapes! This is called macrobend loss. Minimum
              bend radius specs exist for a reason!
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more_loss';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
              Tight bends cause significant signal loss by allowing light to escape the fiber core!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Bends Matter</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Total Internal Reflection:</strong> Light stays
                in the fiber core because it reflects off the cladding at angles beyond the critical angle.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Macrobend Loss:</strong> When fiber bends too
                sharply, the angle of incidence changes and light can escape. The tighter the bend,
                the more light leaks out.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Minimum Bend Radius:</strong> Manufacturers
                specify minimum bend radius (often 25-30mm for standard single-mode). Bend-insensitive
                fiber uses a special design allowing tighter bends for data center use.
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
    const allAppsCompleted = transferCompleted.size >= 4;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Fiber loss affects everything from internet to undersea cables
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Completed</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
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
        {renderBottomBar(allAppsCompleted, allAppsCompleted ? 'Take the Test' : `Complete ${4 - transferCompleted.size} more`)}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand fiber optic signal loss!' : 'Review the material and try again.'}
              </p>
              {testScore < 7 && (
                <button
                  onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); }}
                  style={{
                    marginTop: '16px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct' : userAnswer === oIndex ? 'Your answer' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const allAnswered = !testAnswers.includes(null);
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
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
                    WebkitTapHighlightColor: 'transparent',
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
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
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
                disabled={!allAnswered}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: allAnswered ? colors.success : colors.textMuted,
                  color: 'white',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>~</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand fiber optic signal loss
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Attenuation measured in dB/km (logarithmic scale)</li>
              <li>1550nm wavelength has lowest loss in silica fiber</li>
              <li>Connectors, splices, and bends all add loss</li>
              <li>Macrobend loss from exceeding critical angle</li>
              <li>OTDR testing to locate faults and measure loss</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern fiber networks use Dense Wavelength Division Multiplexing (DWDM) to send
              80+ wavelengths through a single fiber, each carrying 100+ Gbps. Erbium-Doped
              Fiber Amplifiers (EDFAs) boost all wavelengths simultaneously without converting
              to electrical signals. This is how a single fiber pair can carry over 10 Tbps
              across oceans!
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default FiberSignalLossRenderer;
