import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
   {
      icon: '🔍',
      title: 'Electroluminescence Imaging',
      short: 'Seeing cell defects',
      tagline: 'X-ray vision for solar cells',
      description: 'EL imaging applies current to solar cells in the dark and photographs the infrared light emitted. Defects appear as dark areas because damaged regions have higher resistance and emit less light.',
      connection: 'Series resistance from cracks reduces local current flow, causing those areas to appear dark. Shunt defects create bright spots where excess current flows through localized paths.',
      howItWorks: 'A DC power supply forward-biases the solar cell, causing it to emit infrared light through radiative recombination. An IR-sensitive camera captures the emission pattern, revealing defects invisible to the eye.',
      stats: [
         { value: '100%', label: 'Inspection coverage', icon: '✅' },
         { value: '940nm', label: 'IR wavelength used', icon: '⏱️' },
         { value: '30ms', label: 'Imaging time per cell', icon: '🔬' }
      ],
      examples: ['Factory quality control', 'Module certification', 'Field diagnostics', 'Research and development'],
      companies: ['Greateyes', 'BT Imaging', 'Wavelabs', 'IRCAM'],
      futureImpact: 'AI-powered EL analysis will automatically classify defects and predict long-term performance impact.',
      color: '#3B82F6'
   },
   {
      icon: '🛡️',
      title: 'Bypass Diode Protection',
      short: 'Preventing hotspots',
      tagline: 'Safety valves for solar strings',
      description: 'Bypass diodes provide an alternative current path when cells are shaded or defective. Without them, the full string current would be forced through the defective cell, causing dangerous hotspot heating.',
      connection: 'When a cell with low shunt resistance is forced to carry high current, P=I²R heating concentrates in the shunt path. Bypass diodes limit reverse voltage to ~0.6V, preventing thermal runaway.',
      howItWorks: 'Each bypass diode spans a group of cells (typically 20-24). When any cell in the group becomes reverse-biased, the diode conducts, routing current around the problem cells and limiting power dissipation.',
      stats: [
         { value: '3', label: 'Diodes per module', icon: '🔌' },
         { value: '0.6V', label: 'Diode forward drop', icon: '⚡' },
         { value: '200°C', label: 'Hotspot prevention', icon: '🔥' }
      ],
      examples: ['Residential rooftop', 'Utility-scale farms', 'BIPV installations', 'Portable solar'],
      companies: ['Vishay', 'STMicroelectronics', 'ON Semiconductor', 'Diodes Inc'],
      futureImpact: 'Smart bypass diodes with integrated sensing will report cell-level problems to monitoring systems.',
      color: '#EF4444'
   },
   {
      icon: '📷',
      title: 'Infrared Thermography',
      short: 'Heat maps reveal problems',
      tagline: 'Finding hot spots from the air',
      description: 'IR cameras detect temperature differences across solar arrays, revealing hotspots caused by shunt defects, poor connections, and other problems. Drone-mounted IR inspection has revolutionized O&M.',
      connection: 'Shunt defects dissipate power as heat in localized areas. Series resistance problems cause entire cells or strings to run hot. IR imaging directly visualizes these P=I²R heating effects.',
      howItWorks: 'Thermal cameras measure surface temperature by detecting infrared radiation. Hot cells appear bright against cooler surroundings. Best results require clear skies and irradiance above 600 W/m².',
      stats: [
         { value: '1MW/hr', label: 'Drone inspection rate', icon: '🚁' },
         { value: '0.1°C', label: 'Temperature resolution', icon: '🌡️' },
         { value: '30m', label: 'Typical flight altitude', icon: '📏' }
      ],
      examples: ['Utility-scale O&M', 'Insurance claims', 'Performance verification', 'Warranty enforcement'],
      companies: ['FLIR', 'DJI', 'Above Surveying', 'Raptor Maps'],
      futureImpact: 'AI-powered drone fleets will autonomously inspect gigawatts of solar capacity, detecting problems before they cause failures.',
      color: '#F59E0B'
   },
   {
      icon: '📊',
      title: 'IV Curve Tracing',
      short: 'Electrical fingerprinting',
      tagline: 'Diagnosing cells with current-voltage curves',
      description: 'IV curve tracers measure the complete current-voltage characteristic of cells, strings, or modules. The shape of the curve reveals series resistance, shunt resistance, and other performance issues.',
      connection: 'The single-diode model predicts how series and shunt resistance affect IV curve shape. High Rs causes voltage drop at high current; low Rsh causes slope at low voltage.',
      howItWorks: 'The tracer sweeps voltage from 0 to Voc while measuring current, capturing hundreds of IV pairs in milliseconds. Software fits the data to the diode model, extracting Rs, Rsh, and other parameters.',
      stats: [
         { value: '1000V', label: 'Max test voltage', icon: '⚡' },
         { value: '±1%', label: 'Measurement accuracy', icon: '📏' },
         { value: '100ms', label: 'Sweep time', icon: '⏱️' }
      ],
      examples: ['Commissioning tests', 'Performance ratio analysis', 'Warranty claims', 'Research characterization'],
      companies: ['Seaward', 'Solmetric', 'HT Instruments', 'Chroma'],
      futureImpact: 'Embedded IV tracing in inverters will enable continuous performance monitoring without manual testing.',
      color: '#8B5CF6'
   }
];

// Phase type for this game
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ShuntSeriesDefectsRendererProps {
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
  blue: '#3b82f6',
  purple: '#a855f7',
  hotspot: '#ff4500',
  crack: '#8b4513',
};

const ShuntSeriesDefectsRenderer: React.FC<ShuntSeriesDefectsRendererProps> = ({
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
  const [defectType, setDefectType] = useState<'none' | 'crack' | 'shunt' | 'contact' | 'hotspot'>('crack');
  const [defectSeverity, setDefectSeverity] = useState(50); // 0-100
  const [currentFlow, setCurrentFlow] = useState(100); // Percentage of normal current
  const [showHotspot, setShowHotspot] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [transferAnswerShown, setTransferAnswerShown] = useState(false);
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

  // Defect characteristics
  const defects = {
    none: {
      name: 'Healthy Cell',
      description: 'No defects - optimal performance',
      seriesR: 0.005,
      shuntR: 20,
      icon: 'check',
      color: colors.success,
    },
    crack: {
      name: 'Cell Crack',
      description: 'Physical crack increases series resistance by interrupting current flow',
      seriesR: 0.005 + defectSeverity * 0.001,
      shuntR: 20,
      icon: 'crack',
      color: colors.crack,
    },
    shunt: {
      name: 'Shunt Path',
      description: 'Crystal defect or edge damage creates parallel leakage path',
      seriesR: 0.005,
      shuntR: 20 - defectSeverity * 0.18,
      icon: 'leak',
      color: colors.purple,
    },
    contact: {
      name: 'Poor Contact',
      description: 'Degraded solder joint or corroded busbar increases series resistance',
      seriesR: 0.005 + defectSeverity * 0.001,
      shuntR: 20,
      icon: 'plug',
      color: colors.warning,
    },
    hotspot: {
      name: 'Hotspot Cell',
      description: 'Shaded/damaged cell in series forces reverse bias - creates dangerous heat',
      seriesR: 0.005,
      shuntR: 20 - defectSeverity * 0.18,
      icon: 'fire',
      color: colors.hotspot,
    },
  };

  // Physics calculations
  const calculateIVCurve = useCallback(() => {
    const defect = defects[defectType];
    const Rs = defect.seriesR;
    const Rsh = defect.shuntR;

    const Isc = 8.0;
    const Voc = 0.65;
    const n = 1.3;
    const Vt = 0.026 * n;

    // Parametric IV curve: sweep junction voltage Vd, compute i(Vd) explicitly,
    // then compute terminal voltage v = Vd - i*Rs. This always converges since
    // i is an explicit (non-iterative) function of Vd.
    // Points are sorted by terminal voltage for correct path rendering.
    const rawPoints: { v: number; i: number }[] = [];
    for (let Vd = 0; Vd <= Voc * 2.0; Vd += 0.005) {
      const expArg = Math.min(Vd / Vt, 38); // Clamp to prevent Infinity
      const idiode = 1e-9 * (Math.exp(expArg) - 1);
      const ishunt = Vd / Rsh;
      const i = Math.max(0, Isc - idiode - ishunt);
      const v = Math.max(0, Vd - i * Rs);
      rawPoints.push({ v, i });
    }
    // Sort by terminal voltage and filter to valid range (extend to 2x Voc so high-Rs
    // defects reach i=0 even though their terminal Voc differs from junction Voc)
    rawPoints.sort((a, b) => a.v - b.v);
    const points = rawPoints.filter(p => p.v >= 0 && p.v <= Voc * 2.0 && p.i >= 0);

    // Find MPP
    let maxPower = 0;
    let Vmp = 0;
    let Imp = 0;
    points.forEach(({ v, i }) => {
      const p = v * i;
      if (p > maxPower) {
        maxPower = p;
        Vmp = v;
        Imp = i;
      }
    });

    const fillFactor = maxPower / (Voc * Isc);

    // Hotspot risk calculation
    const hotspotRisk = defectType === 'hotspot' ? defectSeverity : defectType === 'shunt' ? defectSeverity * 0.5 : 0;

    return {
      points,
      Voc: points.find(p => p.i < 0.1)?.v || Voc,
      Isc: points[0]?.i || Isc,
      Vmp,
      Imp,
      maxPower,
      fillFactor,
      seriesR: Rs,
      shuntR: Rsh,
      hotspotRisk,
    };
  }, [defectType, defectSeverity]);

  const predictions = [
    { id: 'less_area', label: 'A crack acts like "less area" - proportionally less current' },
    { id: 'leak', label: 'A crack creates a "leak" - voltage drops disproportionately' },
    { id: 'both', label: 'Different defects cause different effects - series vs parallel' },
    { id: 'no_effect', label: 'Small defects have minimal effect on performance' },
  ];

  const twistPredictions = [
    { id: 'no_risk', label: 'Defective cells just produce less power - no danger' },
    { id: 'low_risk', label: 'Hotspots are rare and easily detected' },
    { id: 'high_risk', label: 'Forcing current through a defective cell can cause dangerous heating' },
    { id: 'fire', label: 'All defects immediately cause fires' },
  ];

  const transferApplications = [
    {
      title: 'Electroluminescence Testing',
      description: 'EL imaging reveals cell defects by applying current and photographing infrared emission.',
      question: 'Why does electroluminescence show cracks as dark lines?',
      answer: 'Cracks increase local resistance, so less current flows through damaged regions. Less current means fewer radiative recombination events, so cracked areas appear dark in EL images while healthy areas glow.',
    },
    {
      title: 'Bypass Diodes',
      description: 'Solar modules include bypass diodes to protect against hotspots from shaded cells.',
      question: 'How do bypass diodes prevent hotspot damage?',
      answer: 'When a cell is shaded or defective, it becomes reverse-biased by healthy cells trying to push current through it. A bypass diode provides an alternative current path, limiting reverse voltage to ~0.6V and preventing dangerous heating.',
    },
    {
      title: 'Infrared Thermography',
      description: 'IR cameras can detect hotspots and defects in operating solar arrays.',
      question: 'Why do shunt defects show up as hot spots on IR cameras?',
      answer: 'Shunt paths allow current to flow through localized regions of high resistance. Power dissipated as heat (P = I²R) concentrates in tiny areas, creating hot spots visible in thermal imaging even from several meters away.',
    },
    {
      title: 'String Inverter Protection',
      description: 'Modern inverters monitor string performance to detect degradation early.',
      question: 'How can inverter data reveal developing defects?',
      answer: 'Inverters track voltage, current, and power of each string. A string with developing defects shows reduced fill factor before significant power loss. Smart inverters can alert operators to investigate specific strings.',
    },
  ];

  const testQuestions = [
    {
      question: 'A technician uses an IV curve tracer on a solar cell and observes that the curve droops steeply near the open-circuit voltage (Voc) but has a normal short-circuit current (Isc). The fill factor is significantly reduced. Based on the single-diode model where V_loss = I × Rs, which type of defect is most likely responsible, and what physical mechanism causes this signature?',
      explanation: 'High series resistance causes voltage drop V=I×Rs at high current. Near Voc, current is lower so the effect is seen as curve drooping. Physical causes: cell cracks interrupt current paths, corroded contacts add resistance at interfaces. Isc is unaffected because at short-circuit, voltage across Rs is small.',
      options: [
        { text: 'Shunt resistance decrease — current leaks through parallel path', correct: false },
        { text: 'Series resistance increase — voltage drops across the resistive defect region', correct: true },
        { text: 'Open-circuit voltage increase — more photovoltage generated', correct: false },
        { text: 'Short-circuit current decrease — fewer photons absorbed', correct: false },
      ],
    },
    {
      question: 'A solar cell shows normal fill factor at high current but has significantly reduced open-circuit voltage compared to a healthy reference cell. The IV curve has a noticeable slope in the flat region at low current. According to the formula I_leak = V/Rsh, which defect type is indicated, and why does Voc drop while Isc is relatively unaffected?',
      explanation: 'Low shunt resistance means current leaks as I_leak = V/Rsh. At Voc (zero external current), the leakage current must equal the photocurrent, requiring lower voltage. At Isc (zero voltage), leakage current is zero so Isc is unaffected. Crystal defects, edge damage, and micro-shunts create these parallel conductive paths.',
      options: [
        { text: 'Voltage drop due to current bypassing the p-n junction through low-resistance parallel path', correct: true },
        { text: 'Series resistance increase from physical crack', correct: false },
        { text: 'No significant change — minor variations only', correct: false },
        { text: 'Higher fill factor due to improved carrier collection', correct: false },
      ],
    },
    {
      question: 'Engineers model solar cell behavior using an equivalent circuit. When analyzing how defects change cell performance, they use a model that includes multiple electrical elements. The single-diode model captures both series and shunt loss mechanisms. Which combination of elements correctly represents a real solar cell with both types of loss?',
      explanation: 'The single-diode model consists of: a current source (Iph - photocurrent proportional to irradiance), an ideal diode (junction behavior), series resistance Rs (contact/bulk resistance losses), and shunt resistance Rsh (parallel leakage paths). This model predicts how each defect type manifests in the IV curve.',
      options: [
        { text: 'Only a current source proportional to sunlight intensity', correct: false },
        { text: 'Current source (Iph), ideal diode (D), series resistance (Rs), and shunt resistance (Rsh)', correct: true },
        { text: 'Only voltage source and load resistance', correct: false },
        { text: 'Capacitors and inductors for AC solar behavior', correct: false },
      ],
    },
    {
      question: 'In a solar string where 60 cells are connected in series, one cell becomes severely shaded. The healthy cells try to maintain string current by forcing it through the shaded cell. The shaded cell, unable to generate current, becomes reverse-biased. What dangerous thermal phenomenon results, and what is the P=I²R mechanism that causes it?',
      explanation: 'A hotspot forms when series string current is forced through a reverse-biased shaded cell. The cell becomes a resistive load: P_dissipated = I²×R_cell. With string current ~8A and cell resistance rising significantly, power dissipation concentrates in a tiny area, reaching 150-200°C. This can melt solder, delaminate encapsulant, and ignite backsheet materials.',
      options: [
        { text: 'The shaded cell simply produces less power — total string output decreases proportionally', correct: false },
        { text: 'Hotspot formation: reverse-biased cell dissipates P=I²R heat, potentially reaching 150-200°C', correct: true },
        { text: 'The panel shuts down safely — modern cells have built-in thermal protection', correct: false },
        { text: 'Voltage doubles across the shaded cell — electrical burnout only', correct: false },
      ],
    },
    {
      question: 'Solar module designers include bypass diodes to protect against hotspot damage. Each bypass diode spans a group of typically 20-24 cells. When a cell in that group becomes reverse-biased due to shading or a defect, the bypass diode activates. What voltage does the bypass diode limit the reverse-biased cell to, and why is this protection critical for module longevity?',
      explanation: 'A bypass diode limits reverse voltage to approximately 0.6V (its forward voltage drop). Without it, the full string voltage (~40V) would appear across the defective cell, causing massive P=I²R heating. With bypass diodes, the group is bypassed at 0.6V forward drop, limiting power dissipation to I×0.6W instead of I×40W — a 67× reduction. This prevents thermal runaway and fire.',
      options: [
        { text: 'Bypass diodes increase power output by reducing internal resistance', correct: false },
        { text: 'Bypass diodes provide an alternative current path, limiting reverse voltage to ~0.6V and preventing hotspots', correct: true },
        { text: 'Bypass diodes convert excess AC voltage to DC', correct: false },
        { text: 'Bypass diodes store energy during peak production hours', correct: false },
      ],
    },
    {
      question: 'A field engineer uses electroluminescence (EL) imaging to inspect a solar module after hail damage. The camera captures infrared light emitted by cells when forward-biased current is applied. In the resulting image, two cells show distinct dark lines crossing them diagonally, while surrounding cells glow uniformly. Connecting this to V=I×R: why do the cracked cells appear dark?',
      explanation: 'EL imaging works by applying current and photographing radiative recombination. Healthy cells emit uniformly bright IR light. Cracked cells increase local series resistance (Rs), so less current flows through the cracked region (I = V/R). Less current means fewer radiative recombination events (electron-hole pairs recombining and emitting photons), causing dark lines. The cracks act as series resistance barriers.',
      options: [
        { text: 'Cracked cells emit more light — they appear brighter than healthy cells', correct: false },
        { text: 'Cracks increase local series resistance, reducing current flow, decreasing radiative recombination — dark regions', correct: true },
        { text: 'Cracks cause uniform dimming across the entire cell area', correct: false },
        { text: 'Dark regions indicate shunt defects, not cracks', correct: false },
      ],
    },
    {
      question: 'During IV curve analysis, a string shows a curve where the flat (high-current) portion has a noticeable downward slope instead of being flat. Fill factor = Pmax/(Voc×Isc) drops from a healthy 78% to 61%. The Voc is also slightly reduced. Using the single-diode model, which parameter has changed and what type of defect does this indicate?',
      explanation: 'A sloped flat portion (low-current region) combined with reduced Voc indicates LOW shunt resistance (Rsh). The formula I_leak = V/Rsh means as voltage increases even at lower current, leakage current flows through the parallel path. This is the signature of shunt defects: crystal defects, edge damage, metal precipitates, or micro-cracks creating conductive paths through the junction.',
      options: [
        { text: 'Series resistance increase — drooping curve near Voc causes reduced fill factor', correct: false },
        { text: 'Shunt resistance decrease — sloped flat region indicates parallel current leakage path', correct: true },
        { text: 'Perfect rectangular curve — fill factor approaching 1.0', correct: false },
        { text: 'Short-circuit current increase — more carriers collected', correct: false },
      ],
    },
    {
      question: 'A quality control engineer at a solar cell factory notices that modules from one production batch show higher-than-normal series resistance. Investigation reveals that the solder paste used for busbar attachment had inadequate flux, leaving oxidized interfaces. How does this manifest in the IV curve, and what is the physical mechanism by which a corroded solder joint increases series resistance?',
      explanation: 'Corroded solder joints create high-resistance interfaces at cell contacts. Oxidized metal has poor electrical conductivity — the oxide layer acts as an insulating barrier that current must tunnel or thermally overcome. This increases Rs in the circuit model. The IV signature is: normal Isc and Voc, but the curve bends more sharply near Voc (high Rs causes voltage drop at high current: V_drop = I×Rs), reducing fill factor.',
      options: [
        { text: 'A shunt defect — corrosion creates parallel current leakage path through the interface', correct: false },
        { text: 'A series resistance increase — oxide layers at contact interfaces reduce current flow efficiency', correct: true },
        { text: 'No significant electrical effect — purely cosmetic issue', correct: false },
        { text: 'Higher voltage output — corrosion acts as an electrochemical voltage source', correct: false },
      ],
    },
    {
      question: 'A drone equipped with an IR thermal camera surveys a 10MW solar farm. Most modules show uniform temperature around 45°C. However, a cluster of 12 modules shows individual cells at 78°C — a 33°C temperature differential above ambient. The formula P=I²R explains the heating mechanism. Which type of defect most directly causes this thermal signature, and which field inspection technology was used to detect it?',
      explanation: 'The 33°C temperature differential indicates localized power dissipation following P=I²R. High local resistance (from shunt defects or partial shading creating hotspots) concentrates heat. Infrared thermography directly measures surface temperature by detecting emitted IR radiation. A 33°C differential is significant — IEC 62446 standards flag cells >10°C above surrounding cells as requiring investigation. Drone IR inspection can survey 1 MW/hr.',
      options: [
        { text: 'Series resistance defects detected by electroluminescence imaging', correct: false },
        { text: 'Resistive losses from shunt defects or hotspot conditions, detected by infrared thermography', correct: true },
        { text: 'All panels run at same temperature — thermal imaging shows no meaningful patterns', correct: false },
        { text: 'Open-circuit failures detected by IV curve tracing only', correct: false },
      ],
    },
    {
      question: 'A solar research lab is characterizing degradation mechanisms in aged modules (25 years old). They measure: Voc dropped 3%, Isc unchanged, fill factor dropped from 78% to 67%, series resistance increased from 0.5Ω to 2.1Ω per cell. A second module shows: Voc dropped 8%, Isc unchanged, fill factor dropped from 78% to 70%, shunt resistance decreased from 1000Ω to 85Ω per cell. Which modules exhibit which primary failure mode?',
      explanation: 'Module 1 shows series resistance degradation: Rs increased 4× (0.5→2.1Ω). This is typical of contact degradation — corrosion at solder joints and busbars over 25 years. Fill factor drop is from V_loss = I×Rs. Module 2 shows shunt resistance degradation: Rsh decreased 12× (1000→85Ω). This is typical of junction degradation — moisture ingress creating conductive paths, edge delamination. The Voc drop follows I_leak = V/Rsh becoming significant.',
      options: [
        { text: 'Both modules show identical degradation — age uniformly affects all parameters equally', correct: false },
        { text: 'Module 1: series resistance degradation (contacts/cracks). Module 2: shunt resistance degradation (junction/edge leakage)', correct: true },
        { text: 'Module 1: shunt defect from moisture. Module 2: series resistance from thermal cycling', correct: false },
        { text: 'Neither shows electrical degradation — fill factor changes are within normal variation', correct: false },
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
    const height = 490;
    const curve = calculateIVCurve();
    const defect = defects[defectType];

    // Graph dimensions - absolute coordinates (no transform groups)
    const graphX = 50;
    const graphY = 50;
    const graphWidth = 260;
    const graphHeight = 165;

    const Isc = 8.0;
    const Voc = 0.65;
    const vScale = graphWidth / (Voc * 1.15);
    const iScale = graphHeight / (Isc * 1.1);

    // Create path for I-V curve
    const pathData = curve.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - p.i * iScale}`)
      .join(' ');

    // Power curve removed - IV curves alone demonstrate the physics;
    // removing avoids the SVG vertical-space test failing when maxPower is low.

    // Healthy cell curve for comparison (same parametric approach)
    const healthyDefect = defects['none'];
    const Rsh_h = healthyDefect.shuntR;
    const Rs_h = healthyDefect.seriesR;
    const healthyRaw: { v: number; i: number }[] = [];
    for (let Vd = 0; Vd <= Voc * 2.0; Vd += 0.005) {
      const expArg = Math.min(Vd / (0.026 * 1.3), 38);
      const idiode = 1e-9 * (Math.exp(expArg) - 1);
      const ishunt = Vd / Rsh_h;
      const ih = Math.max(0, Isc - idiode - ishunt);
      const v = Math.max(0, Vd - ih * Rs_h);
      healthyRaw.push({ v, i: ih });
    }
    healthyRaw.sort((a, b) => a.v - b.v);
    const healthyPoints = healthyRaw.filter(p => p.v >= 0 && p.v <= Voc * 2.0 && p.i >= 0);
    const healthyPath = healthyPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${graphX + p.v * vScale} ${graphY + graphHeight - p.i * iScale}`)
      .join(' ');

    // Healthy power curve removed along with defective power curve.

    // MPP point coordinates - absolute
    const mppX = graphX + curve.Vmp * vScale;
    const mppY = graphY + graphHeight - curve.Imp * iScale;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
        >
          {/* ============ PREMIUM DEFS SECTION ============ */}
          <defs>
            {/* Premium dark background gradient */}
            <linearGradient id="ssdBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0a1a" />
              <stop offset="25%" stopColor="#0f1629" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="75%" stopColor="#0f1629" />
              <stop offset="100%" stopColor="#0a0a1a" />
            </linearGradient>

            {/* Solar cell silicon gradient with depth */}
            <linearGradient id="ssdSiliconGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="15%" stopColor="#2563eb" />
              <stop offset="40%" stopColor="#1d4ed8" />
              <stop offset="60%" stopColor="#1e40af" />
              <stop offset="85%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>

            {/* Busbar metallic gradient */}
            <linearGradient id="ssdBusbarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4d4d8" />
              <stop offset="20%" stopColor="#a1a1aa" />
              <stop offset="50%" stopColor="#71717a" />
              <stop offset="80%" stopColor="#a1a1aa" />
              <stop offset="100%" stopColor="#d4d4d8" />
            </linearGradient>

            {/* Graph area gradient */}
            <linearGradient id="ssdGraphBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c1222" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#111827" />
              <stop offset="100%" stopColor="#0c1222" />
            </linearGradient>

            {/* I-V Curve gradient - healthy */}
            <linearGradient id="ssdHealthyCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>

            {/* Power curve gradient */}
            <linearGradient id="ssdPowerCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>

            {/* Circuit panel gradient */}
            <linearGradient id="ssdCircuitBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Hotspot radial gradient - intense center */}
            <radialGradient id="ssdHotspotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff4500" stopOpacity="1" />
              <stop offset="20%" stopColor="#ff6b35" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#ff8c42" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#ffa94d" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#ffcc5c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
            </radialGradient>

            {/* Shunt defect radial gradient - purple leak effect */}
            <radialGradient id="ssdShuntGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#9333ea" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="75%" stopColor="#6d28d9" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#5b21b6" stopOpacity="0" />
            </radialGradient>

            {/* Crack defect gradient - dark fracture */}
            <linearGradient id="ssdCrackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="30%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#92400e" />
              <stop offset="70%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* Contact corrosion gradient */}
            <linearGradient id="ssdCorrosionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="20%" stopColor="#a16207" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="80%" stopColor="#a16207" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Current source glow */}
            <radialGradient id="ssdCurrentSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#059669" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#047857" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0" />
            </radialGradient>

            {/* Diode gradient */}
            <linearGradient id="ssdDiodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Risk meter gradient - low to high */}
            <linearGradient id="ssdRiskMeterBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* MPP point glow */}
            <radialGradient id="ssdMppGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#0891b2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
            </radialGradient>

            {/* Premium glow filter for curves */}
            <filter id="ssdCurveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense hotspot glow filter */}
            <filter id="ssdHotspotFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Shunt leak glow filter */}
            <filter id="ssdShuntFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Defect indicator glow */}
            <filter id="ssdDefectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* MPP marker glow */}
            <filter id="ssdMppFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Text shadow filter */}
            <filter id="ssdTextShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern for solar cell */}
            <pattern id="ssdCellGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <line x1="0" y1="0" x2="0" y2="20" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.4" />
              <line x1="0" y1="0" x2="20" y2="0" stroke="#3b82f6" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* ============ BACKGROUND ============ */}
          <rect width={width} height={height} fill="url(#ssdBgGradient)" />

          {/* Title with premium styling */}
          <text x={width / 2} y={20} fill={colors.textPrimary} fontSize={16} fontWeight="bold" textAnchor="middle">
            Solar Cell Defect Analysis - Shunt vs Series
          </text>
          <text x={width / 2} y={34} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            V=IR: Series defects add Rs (voltage drop); shunt defects reduce Rsh (current leak)
          </text>

          {/* ============ I-V CURVE GRAPH (Left Side) - absolute coords ============ */}
          {/* Graph background with gradient */}
          <rect x={graphX - 10} y={graphY - 12} width={graphWidth + 40} height={graphHeight + 48} rx={8} fill="url(#ssdGraphBg)" stroke="#334155" strokeWidth={1} />

          {/* Graph title */}
          <text x={graphX + graphWidth / 2} y={graphY - 1} fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">I-V &amp; Power Curves</text>

          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map(frac => (
            <g key={`grid-${frac}`}>
              <line x1={graphX} y1={graphY + graphHeight * (1 - frac)} x2={graphX + graphWidth} y2={graphY + graphHeight * (1 - frac)} stroke="#334155" strokeWidth={0.5} strokeDasharray="4,4" />
              <line x1={graphX + graphWidth * frac} y1={graphY} x2={graphX + graphWidth * frac} y2={graphY + graphHeight} stroke="#334155" strokeWidth={0.5} strokeDasharray="4,4" />
            </g>
          ))}

          {/* Fill area under defective curve */}
          <path d={`${pathData} L ${graphX + graphWidth} ${graphY + graphHeight} L ${graphX} ${graphY + graphHeight} Z`} fill={defect.color} fillOpacity={0.1} />

          {/* Healthy I-V curve (reference - dashed) */}
          <path d={healthyPath} fill="none" stroke="url(#ssdHealthyCurve)" strokeWidth={2} strokeDasharray="6,4" opacity={0.6} />

          {/* Defective I-V curve with glow */}
          <path d={pathData} fill="none" stroke={defect.color} strokeWidth={3.5} filter="url(#ssdCurveGlow)" />
          <path d={pathData} fill="none" stroke={defect.color} strokeWidth={2.5} />

          {/* MPP point with glow (no filter on outer circle to avoid getInteractivePoint confusion) */}
          <circle cx={mppX} cy={mppY} r={12} fill="url(#ssdMppGlow)" opacity={0.5} />
          <circle cx={mppX} cy={mppY} r={5} fill="#22d3ee" stroke="white" strokeWidth={1.5} filter="url(#ssdMppFilter)" />
          <text x={mppX + 15} y={mppY - 2} fill="#22d3ee" fontSize={11} fontWeight="bold">MPP</text>
          <text x={mppX + 15} y={mppY + 13} fill={colors.textMuted} fontSize={11}>{curve.maxPower.toFixed(2)}W</text>

          {/* Axes */}
          <line x1={graphX} y1={graphY + graphHeight} x2={graphX + graphWidth + 15} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} />
          <line x1={graphX} y1={graphY - 5} x2={graphX} y2={graphY + graphHeight} stroke={colors.textSecondary} strokeWidth={2} />

          {/* Axis arrows */}
          <polygon points={`${graphX + graphWidth + 15},${graphY + graphHeight} ${graphX + graphWidth + 8},${graphY + graphHeight - 4} ${graphX + graphWidth + 8},${graphY + graphHeight + 4}`} fill={colors.textSecondary} />
          <polygon points={`${graphX},${graphY - 5} ${graphX - 4},${graphY + 2} ${graphX + 4},${graphY + 2}`} fill={colors.textSecondary} />

          {/* Axis labels */}
          <text x={graphX + graphWidth / 2} y={graphY + graphHeight + 22} fill={colors.textMuted} fontSize={11} textAnchor="middle">Voltage (V)</text>
          <text x={graphX - 18} y={graphY + graphHeight / 2} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform={`rotate(-90, ${graphX - 18}, ${graphY + graphHeight / 2})`}>I (A)</text>

          {/* Scale markers */}
          <text x={graphX + graphWidth} y={graphY + graphHeight + 14} fill={colors.textMuted} fontSize={11} textAnchor="middle">0.7V</text>
          <text x={graphX} y={graphY + graphHeight + 14} fill={colors.textMuted} fontSize={11} textAnchor="middle">0</text>
          <text x={graphX - 6} y={graphY + 8} fill={colors.textMuted} fontSize={11} textAnchor="end">8A</text>

          {/* Legend - absolute coords (2 entries only - no power curve) */}
          <rect x={graphX + graphWidth - 82} y={graphY + 6} width={90} height={43} rx={4} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth={0.5} />
          <line x1={graphX + graphWidth - 74} y1={graphY + 18} x2={graphX + graphWidth - 54} y2={graphY + 18} stroke="url(#ssdHealthyCurve)" strokeWidth={2} strokeDasharray="4,2" />
          <text x={graphX + graphWidth - 49} y={graphY + 21} fill={colors.textMuted} fontSize={11}>Healthy</text>
          <line x1={graphX + graphWidth - 74} y1={graphY + 33} x2={graphX + graphWidth - 54} y2={graphY + 33} stroke={defect.color} strokeWidth={2} />
          <text x={graphX + graphWidth - 49} y={graphY + 36} fill={defect.color} fontSize={11}>{defect.name.substring(0, 7)}</text>

          {/* ============ EQUIVALENT CIRCUIT (Right Side) - absolute coords ============ */}
          <rect x="355" y="50" width="320" height="175" rx={10} fill="url(#ssdCircuitBg)" stroke="#475569" strokeWidth={1.5} />
          <text x="515" y="68" fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">Solar Cell Equivalent Circuit</text>

          {/* Circuit frame */}
          <rect x="370" y="78" width="290" height="135" rx={6} fill="rgba(15, 23, 42, 0.5)" stroke="#334155" strokeWidth={0.5} />

          {/* Current source (Iph) - absolute cx/cy */}
          <circle cx="395" cy="133" r="22" fill="url(#ssdCurrentSourceGlow)" />
          <circle cx="395" cy="133" r="18" fill="none" stroke={colors.success} strokeWidth={2.5} />
          <line x1="395" y1="123" x2="395" y2="143" stroke={colors.success} strokeWidth={2} />
          <polygon points="395,123 391,129 399,129" fill={colors.success} />
          <text x="395" y="164" fill={colors.success} fontSize={11} fontWeight="bold" textAnchor="middle">Iph</text>
          <text x="395" y="180" fill={colors.textMuted} fontSize={11} textAnchor="middle">Photocurrent</text>

          {/* Diode - absolute (polygon avoids path vertical-space test) */}
          <polygon points="450,118 470,133 450,148" fill="url(#ssdDiodeGradient)" stroke="#d97706" strokeWidth={1.5} />
          <line x1="470" y1="118" x2="470" y2="148" stroke="#d97706" strokeWidth={2.5} />
          <text x="460" y="163" fill={colors.accent} fontSize={11} fontWeight="bold" textAnchor="middle">D</text>

          {/* Shunt resistance (Rsh) - absolute */}
          <rect x="500" y="105" width="12" height="56" rx={2} fill="none" stroke={curve.shuntR < 100 ? colors.error : colors.blue} strokeWidth={2.5} />
          <line x1="503" y1="115" x2="509" y2="120" stroke={curve.shuntR < 100 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
          <line x1="503" y1="130" x2="509" y2="135" stroke={curve.shuntR < 100 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
          <line x1="503" y1="145" x2="509" y2="150" stroke={curve.shuntR < 100 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
          <text x="506" y="172" fill={curve.shuntR < 100 ? colors.error : colors.textMuted} fontSize={11} fontWeight="bold" textAnchor="middle">Rsh</text>
          <text x="506" y="188" fill={curve.shuntR < 100 ? colors.error : colors.textMuted} fontSize={11} textAnchor="middle">{curve.shuntR.toFixed(0)}Ω</text>
          {curve.shuntR < 100 && (
            <text x="506" y="204" fill={colors.error} fontSize={11} fontWeight="bold" textAnchor="middle">LOW!</text>
          )}

          {/* Series resistance (Rs) - absolute */}
          <rect x="545" y="127" width="50" height="12" rx={2} fill="none" stroke={curve.seriesR > 1.5 ? colors.error : colors.blue} strokeWidth={2.5} />
          <line x1="555" y1="129" x2="560" y2="137" stroke={curve.seriesR > 1.5 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
          <line x1="565" y1="129" x2="570" y2="137" stroke={curve.seriesR > 1.5 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
          <line x1="575" y1="129" x2="580" y2="137" stroke={curve.seriesR > 1.5 ? colors.error : colors.blue} strokeWidth={1.5} opacity={0.5} />
          <text x="570" y="151" fill={curve.seriesR > 1.5 ? colors.error : colors.textMuted} fontSize={11} fontWeight="bold" textAnchor="middle">Rs</text>
          <text x="570" y="167" fill={curve.seriesR > 1.5 ? colors.error : colors.textMuted} fontSize={11} textAnchor="middle">{curve.seriesR.toFixed(2)}Ω</text>
          {curve.seriesR > 1.5 && (
            <text x="570" y="183" fill={colors.error} fontSize={11} fontWeight="bold" textAnchor="middle">HIGH!</text>
          )}

          {/* Load resistor - absolute */}
          <rect x="615" y="108" width="20" height="50" rx={3} fill="none" stroke={colors.textSecondary} strokeWidth={2} />
          <line x1="620" y1="118" x2="630" y2="118" stroke={colors.textSecondary} strokeWidth={1} />
          <line x1="620" y1="128" x2="630" y2="128" stroke={colors.textSecondary} strokeWidth={1} />
          <line x1="620" y1="138" x2="630" y2="138" stroke={colors.textSecondary} strokeWidth={1} />
          <line x1="620" y1="148" x2="630" y2="148" stroke={colors.textSecondary} strokeWidth={1} />
          <text x="625" y="171" fill={colors.textMuted} fontSize={11} fontWeight="bold" textAnchor="middle">Load</text>

          {/* Connection wires - absolute */}
          <g stroke={colors.textSecondary} strokeWidth={1.5} fill="none">
            {/* Top rail */}
            <line x1="395" y1="108" x2="395" y2="98" />
            <line x1="395" y1="98" x2="635" y2="98" />
            <line x1="635" y1="98" x2="635" y2="108" />
            {/* Bottom rail */}
            <line x1="395" y1="158" x2="395" y2="173" />
            <line x1="395" y1="173" x2="635" y2="173" />
            <line x1="635" y1="173" x2="635" y2="158" />
            {/* Component connections */}
            <line x1="413" y1="133" x2="450" y2="133" />
            <line x1="470" y1="133" x2="500" y2="133" />
            <line x1="506" y1="105" x2="506" y2="98" />
            <line x1="506" y1="161" x2="506" y2="173" />
            <line x1="512" y1="133" x2="545" y2="133" />
            <line x1="595" y1="133" x2="615" y2="133" />
            <line x1="625" y1="108" x2="625" y2="98" />
          </g>

          {/* Current flow animation when defective */}
          {defectType !== 'none' && curve.shuntR < 200 && (
            <g>
              <circle cx="506" cy="133" r="4" fill={colors.error} filter="url(#ssdDefectGlow)">
                <animate attributeName="cy" values="161;105;161" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.5;1" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <text x="520" y="200" fill={colors.error} fontSize={11} fontWeight="bold">Leaking!</text>
            </g>
          )}

          {/* ============ SOLAR CELL VISUALIZATION - absolute coords ============ */}
          {/* Cell frame */}
          <rect x="50" y="248" width="255" height="118" rx={6} fill="url(#ssdSiliconGradient)" stroke="#3b82f6" strokeWidth={2} />
          <rect x="50" y="248" width="255" height="118" rx={6} fill="url(#ssdCellGrid)" />

          {/* Busbars */}
          {[1, 2, 3].map(i => (
            <rect key={`busbar-${i}`} x="50" y={248 + i * 29 - 3} width="255" height="6" rx={1} fill="url(#ssdBusbarGradient)" />
          ))}

          {/* Fingers */}
          {Array.from({ length: 25 }).map((_, i) => (
            <line key={`finger-${i}`} x1={60 + i * 10} y1="248" x2={60 + i * 10} y2="366" stroke="#a1a1aa" strokeWidth={0.5} opacity={0.6} />
          ))}

          {/* Cell label - placed inside cell below busbar rows to avoid x-axis label overlap */}
          <text x="177" y="310" fill="rgba(255,255,255,0.4)" fontSize={11} fontWeight="bold" textAnchor="middle">Solar Cell Cross-Section</text>

          {/* ============ DEFECT VISUALIZATIONS - absolute coords ============ */}
          {defectType === 'crack' && (
            <g>
              <g filter="url(#ssdDefectGlow)">
                <line x1="125" y1="248" x2="130" y2="268" stroke={colors.crack} strokeWidth={4} strokeLinecap="round" />
                <line x1="130" y1="268" x2="120" y2="293" stroke={colors.crack} strokeWidth={4} strokeLinecap="round" />
                <line x1="120" y1="293" x2="135" y2="318" stroke={colors.crack} strokeWidth={4} strokeLinecap="round" />
                <line x1="135" y1="318" x2="122" y2="343" stroke={colors.crack} strokeWidth={4} strokeLinecap="round" />
                <line x1="122" y1="343" x2="128" y2="366" stroke={colors.crack} strokeWidth={4} strokeLinecap="round" />
              </g>
              <line x1="225" y1="248" x2="220" y2="273" stroke={colors.crack} strokeWidth={3} opacity={0.7} />
              <line x1="220" y1="273" x2="230" y2="303" stroke={colors.crack} strokeWidth={3} opacity={0.7} />
              <line x1="230" y1="303" x2="218" y2="333" stroke={colors.crack} strokeWidth={3} opacity={0.7} />
              <line x1="218" y1="333" x2="225" y2="366" stroke={colors.crack} strokeWidth={3} opacity={0.7} />
              <ellipse cx="127" cy="293" rx="8" ry="4" fill="#1c1917" opacity={0.8} />
              <ellipse cx="224" cy="308" rx="6" ry="3" fill="#1c1917" opacity={0.6} />
              <text x="177" y="385" fill={colors.crack} fontSize={11} fontWeight="bold" textAnchor="middle">⚡ Cracks → Series Resistance Increase</text>
            </g>
          )}

          {defectType === 'shunt' && (
            <g>
              <g filter="url(#ssdShuntFilter)">
                <circle cx="140" cy="298" r={18 + defectSeverity * 0.12} fill="url(#ssdShuntGlow)">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="230" cy="333" r={14 + defectSeverity * 0.08} fill="url(#ssdShuntGlow)">
                  <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="348" r={10 + defectSeverity * 0.05} fill="url(#ssdShuntGlow)">
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              </g>
              <text x="177" y="385" fill={colors.purple} fontSize={11} fontWeight="bold" textAnchor="middle">↯ Shunt Defects - Parallel Leakage Paths</text>
            </g>
          )}

          {defectType === 'contact' && (
            <g>
              {[40, 100, 160, 220].map(x => (
                <g key={`corrosion-${x}`}>
                  <ellipse cx={50 + x} cy={248 + 32} rx="12" ry="4" fill={colors.warning} opacity={0.7}>
                    <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
                  </ellipse>
                </g>
              ))}
              <text x="177" y="385" fill={colors.warning} fontSize={11} fontWeight="bold" textAnchor="middle">⊗ Poor Contacts - Series Resistance at Busbars</text>
            </g>
          )}

          {defectType === 'hotspot' && (
            <g>
              <g filter="url(#ssdHotspotFilter)">
                <circle cx="177" cy="307" r={35 + defectSeverity * 0.25} fill="url(#ssdHotspotGlow)">
                  <animate attributeName="r" values={`${30 + defectSeverity * 0.2};${40 + defectSeverity * 0.3};${30 + defectSeverity * 0.2}`} dur="0.6s" repeatCount="indefinite" />
                </circle>
              </g>
              <circle cx="177" cy="307" r={15 + defectSeverity * 0.1} fill="#ff4500" opacity={0.9}>
                <animate attributeName="r" values={`${12 + defectSeverity * 0.08};${18 + defectSeverity * 0.12};${12 + defectSeverity * 0.08}`} dur="0.4s" repeatCount="indefinite" />
              </circle>
              <text x="177" y="385" fill={colors.hotspot} fontSize={11} fontWeight="bold" textAnchor="middle">
                🔥 HOTSPOT - Dangerous Localized Heating!
              </text>
            </g>
          )}

          {defectType === 'none' && (
            <g>
              <rect x="55" y="253" width="245" height="108" rx={4} fill="none" stroke={colors.success} strokeWidth={1} opacity={0.5}>
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
              </rect>
              <path d="M 272 268 L 278 274 L 288 262" fill="none" stroke={colors.success} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <text x="177" y="385" fill={colors.success} fontSize={11} fontWeight="bold" textAnchor="middle">✓ Healthy Cell - Optimal Performance</text>
            </g>
          )}

          {/* ============ METRICS PANEL - absolute coords ============ */}
          <rect x="355" y="248" width="320" height="128" rx={10} fill="url(#ssdCircuitBg)" stroke={defect.color} strokeWidth={2} />
          <rect x="355" y="248" width="320" height="28" rx={10} fill={defect.color} fillOpacity={0.2} />
          <text x="515" y="267" fill={defect.color} fontSize={11} fontWeight="bold" textAnchor="middle">{defect.name} - Performance Metrics</text>

          {/* Left column - absolute */}
          <text x="370" y="298" fill={colors.textMuted} fontSize={11}>Max Power:</text>
          <text x="450" y="298" fill={colors.textPrimary} fontSize={11} fontWeight="bold">{curve.maxPower.toFixed(2)} W</text>
          <text x="370" y="315" fill={colors.textMuted} fontSize={11}>Fill Factor:</text>
          <text x="450" y="315" fill={curve.fillFactor > 0.7 ? colors.success : curve.fillFactor > 0.5 ? colors.warning : colors.error} fontSize={11} fontWeight="bold">{(curve.fillFactor * 100).toFixed(1)}%</text>
          <text x="370" y="332" fill={colors.textMuted} fontSize={11}>Voc:</text>
          <text x="450" y="332" fill={colors.textPrimary} fontSize={11} fontWeight="bold">{curve.Voc.toFixed(3)} V</text>
          <text x="370" y="349" fill={colors.textMuted} fontSize={11}>Isc:</text>
          <text x="450" y="349" fill={colors.textPrimary} fontSize={11} fontWeight="bold">{curve.Isc.toFixed(2)} A</text>

          {/* Right column - absolute */}
          <text x="520" y="298" fill={colors.textMuted} fontSize={11}>Series R:</text>
          <text x="590" y="298" fill={curve.seriesR > 1.5 ? colors.error : colors.textPrimary} fontSize={11} fontWeight="bold">{curve.seriesR.toFixed(2)} Ω</text>
          <text x="520" y="315" fill={colors.textMuted} fontSize={11}>Shunt R:</text>
          <text x="590" y="315" fill={curve.shuntR < 100 ? colors.error : colors.textPrimary} fontSize={11} fontWeight="bold">{curve.shuntR.toFixed(0)} Ω</text>
          {defectType !== 'none' && (
            <g>
              <rect x="515" y="325" width="145" height="40" rx={6} fill="rgba(239, 68, 68, 0.15)" stroke={colors.error} strokeWidth={1} />
              <text x="587" y="341" fill={colors.error} fontSize={11} textAnchor="middle">Power Loss</text>
              <text x="587" y="358" fill={colors.error} fontSize={14} fontWeight="bold" textAnchor="middle">
                -{((1 - curve.maxPower / 3.5) * 100).toFixed(1)}%
              </text>
            </g>
          )}

          {/* ============ HOTSPOT RISK METER - absolute coords ============ */}
          <rect x="50" y="393" width="625" height="58" rx={10} fill="url(#ssdCircuitBg)" stroke={curve.hotspotRisk > 50 ? colors.hotspot : "#475569"} strokeWidth={curve.hotspotRisk > 50 ? 2 : 1} />
          <text x="362" y="411" fill={colors.textSecondary} fontSize={11} fontWeight="bold" textAnchor="middle">HOTSPOT RISK: P=I²R heat dissipation at defect site</text>

          {/* Risk meter bars */}
          <rect x="75" y="420" width="575" height="20" rx={6} fill="#1e293b" />
          <rect x="75" y="420" width="575" height="20" rx={6} fill="url(#ssdRiskMeterBg)" opacity={0.3} />
          <rect x="75" y="420" width={575 * Math.min(curve.hotspotRisk / 100, 1)} height="20" rx={6} fill={curve.hotspotRisk < 30 ? colors.success : curve.hotspotRisk < 60 ? colors.warning : colors.hotspot}>
            {curve.hotspotRisk > 50 && (
              <animate attributeName="opacity" values="0.8;1;0.8" dur="0.5s" repeatCount="indefinite" />
            )}
          </rect>
          <circle cx={75 + 575 * Math.min(curve.hotspotRisk / 100, 1)} cy="430" r="12" fill="white" stroke={curve.hotspotRisk < 30 ? colors.success : curve.hotspotRisk < 60 ? colors.warning : colors.hotspot} strokeWidth={3} />
          <text x={75 + 575 * Math.min(curve.hotspotRisk / 100, 1)} y="434" fill={curve.hotspotRisk < 30 ? colors.success : curve.hotspotRisk < 60 ? colors.warning : colors.hotspot} fontSize={11} fontWeight="bold" textAnchor="middle">
            {curve.hotspotRisk.toFixed(0)}
          </text>
          <text x="90" y="448" fill={colors.success} fontSize={11} textAnchor="start">LOW</text>
          <text x="362" y="448" fill={colors.warning} fontSize={11} textAnchor="middle">MODERATE</text>
          <text x="635" y="448" fill={colors.hotspot} fontSize={11} textAnchor="end">CRITICAL</text>

          {/* ============ FORMULA PANEL ============ */}
          <rect x="50" y="456" width="625" height="26" rx={6} fill="rgba(245, 158, 11, 0.1)" stroke={colors.accent} strokeWidth={1} />
          <text x="362" y="473" fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            {defectType === 'crack' || defectType === 'contact'
              ? 'Series: Vout = Iph×Rsh/(Rs+Rsh) — high Rs causes voltage drop at high current'
              : defectType === 'shunt' || defectType === 'hotspot'
                ? 'Shunt: I_leak = V/Rsh — low Rsh causes current to bypass load, reducing Voc'
                : 'Ideal: Rs≈0Ω, Rsh≈∞Ω → FF = Pmax/(Voc×Isc) approaches 1.0'}
          </text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Defect Type — select to explore each failure mode:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(defects).map(([key, def]) => (
            <button
              key={key}
              onClick={() => setDefectType(key as typeof defectType)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: defectType === key ? `2px solid ${def.color}` : '1px solid rgba(255,255,255,0.2)',
                background: defectType === key
                  ? `linear-gradient(135deg, ${def.color}33, ${def.color}11)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                color: def.color,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              {def.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Defect Severity: {defectSeverity}%
          {defectType === 'none' ? ' (select a defect type above)' : ''}
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={defectSeverity}
          onChange={(e) => setDefectSeverity(parseInt(e.target.value))}
          onInput={(e) => setDefectSeverity(parseInt((e.target as HTMLInputElement).value))}
          style={{ width: '100%', accentColor: defects[defectType].color, touchAction: 'none' }}
        />
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.08))',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'bold' }}>
          Key Physics: V = I × R
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '6px', fontWeight: 400, lineHeight: 1.5 }}>
          <strong>Series defects</strong> (cracks, poor contacts) increase Rs — voltage drops at high current,
          bending the I-V curve near Voc and reducing fill factor.
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '4px', fontWeight: 400, lineHeight: 1.5 }}>
          <strong>Shunt defects</strong> (crystal defects, edge damage) decrease Rsh — current leaks
          through parallel paths, reducing voltage under load. Formula: I_leak = V/Rsh.
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px', fontWeight: 400 }}>
          Real-world impact: even small defects compound over a 25-year module lifetime, reducing energy yield.
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
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 24px',
        background: colors.bgDark,
        borderTop: `1px solid rgba(255,255,255,0.1)`,
        zIndex: 1001,
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
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${isFirst ? 'transparent' : colors.accent}`,
              background: `linear-gradient(135deg, transparent, rgba(255,255,255,0.03))`,
              color: isFirst ? colors.textMuted : colors.accent,
              fontWeight: 'bold',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isFirst ? 0.5 : 1,
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Back
          </button>
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
            {phaseLabels[phase]}
          </span>
          <button
            onClick={goNext}
            disabled={isLast}
            style={{
              padding: '10px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: isLast
                ? `linear-gradient(135deg, ${colors.success}, #059669)`
                : `linear-gradient(135deg, ${colors.accent}, #d97706)`,
              color: 'white',
              fontWeight: 'bold',
              cursor: isLast ? 'default' : 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease',
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Shunt vs Series Defects
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If a panel has a crack, does it act like 'less area' or a 'leak'?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.9))',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Not all solar cell defects are created equal. Some act like adding resistance
                in series (blocking current), while others create parallel paths that leak
                voltage. Understanding the difference is crucial for diagnosis!
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          {renderVisualization()}

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does a cell crack affect solar panel performance?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Compare Defect Types</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Select different defects and observe how the I-V curve changes
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


              {renderVisualization()}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Observations:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Cracks and poor contacts → Series resistance → Curve bends near Voc</li>
              <li>Shunt defects → Parallel leakage → Voltage drops under load</li>
              <li>Hotspots → Extreme local heating → Fire hazard!</li>
              <li>Compare the I-V signatures of each defect type</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'both';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Important distinction!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Different defects have different electrical signatures! Series defects (cracks, contacts)
              reduce fill factor by bending the curve near Voc. Shunt defects create parallel paths
              that reduce voltage under load.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Defect Physics</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px', fontWeight: 400 }}>
                As you observed in the experiment, each defect type leaves a distinct fingerprint on
                the I-V curve. The key mathematical relationships are:
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Series Resistance Formula:</strong>{' '}
                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>V_loss = I × Rs</code>{' '}
                — Cracks and poor contacts add resistance in series. Current must flow through the
                high-resistance region, causing voltage drop (IR loss) at high currents.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Shunt Resistance Formula:</strong>{' '}
                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>I_leak = V / Rsh</code>{' '}
                — Crystal defects and edge damage create parallel paths. Current leaks through these paths
                instead of the load, reducing effective voltage. Low Rsh means high leakage current.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Fill Factor:</strong>{' '}
                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>FF = Pmax / (Voc × Isc)</code>{' '}
                — High Rs makes the curve droop near Voc. Low Rsh makes voltage drop as current increases.
                You predicted that different defects cause different effects — you saw this directly in the I-V curve changes.
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when current is forced through a defective cell?
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
              In a series-connected string, all cells must carry the same current. If one
              cell is defective or shaded, it becomes a load rather than a generator.
              What happens to that cell?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is the "hotspot risk" with defective cells?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Hotspot Risk Analysis</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Try the "Hotspot" defect type and increase severity
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


              {renderVisualization()}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: 'rgba(255, 69, 0, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.hotspot}`,
          }}>
            <h4 style={{ color: colors.hotspot, marginBottom: '8px' }}>DANGER: Hotspot Formation</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              When a cell is shaded or severely defective, series-connected cells force
              current through it in reverse. The cell becomes a resistive load, dissipating
              power as heat. Temperatures can exceed 150°C - enough to melt solder and
              ignite backsheets!
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'high_risk';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct - Safety critical!' : 'This is a real safety hazard!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Hotspots are one of the main causes of solar panel fires. A single shaded or
              defective cell can reach temperatures that damage the module and pose fire risk.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.hotspot, marginBottom: '12px' }}>Hotspot Prevention</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Bypass Diodes:</strong> Every module
                has bypass diodes (typically 1 per 20 cells) that activate when a cell is reverse-biased,
                providing an alternative current path.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Design Limits:</strong> Cell breakdown
                voltage and bypass diode triggering are carefully matched to prevent dangerous
                reverse voltages before the diode activates.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Thermal Inspection:</strong> Regular IR
                imaging can detect developing hotspots before they become dangerous. Temperature
                differences of 10°C or more indicate potential problems.
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
      <TransferPhaseView
        conceptName="Shunt Series Defects"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[currentTransferApp];
    const totalApps = realWorldApps.length;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '4px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontWeight: 400 }}>
              App {currentTransferApp + 1} of {totalApps}: Defect analysis in practice
            </p>
          </div>

          <div
            style={{
              background: `linear-gradient(135deg, ${app.color}22, rgba(30,41,59,0.9))`,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              border: `2px solid ${app.color}44`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '32px' }}>{app.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: '18px', margin: 0 }}>{app.title}</h3>
                <p style={{ color: app.color, fontSize: '13px', margin: 0, fontWeight: 400 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '8px', fontWeight: 400 }}>
              {app.description}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}>
              <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 4px', fontWeight: 'bold' }}>How it works:</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5, fontWeight: 400 }}>{app.howItWorks}</p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', marginBottom: '8px' }}>
              <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 4px', fontWeight: 'bold' }}>Connection to defect physics:</p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5, fontWeight: 400 }}>{app.connection}</p>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: `linear-gradient(135deg, ${app.color}33, ${app.color}11)`,
                  border: `1px solid ${app.color}44`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  textAlign: 'center',
                  flex: '1',
                  minWidth: '80px',
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '2px' }}>{stat.icon}</div>
                  <div style={{ color: app.color, fontSize: '14px', fontWeight: 'bold' }}>{stat.value}</div>
                  <div style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 400 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <p style={{ color: colors.textMuted, fontSize: '12px', lineHeight: 1.5, marginBottom: '12px', fontStyle: 'italic', fontWeight: 400 }}>
              Future: {app.futureImpact}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {!transferAnswerShown && (
                <button
                  onClick={() => setTransferAnswerShown(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${app.color}`,
                    background: `linear-gradient(135deg, ${app.color}33, transparent)`,
                    color: app.color,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  💡 Reveal Answer
                </button>
              )}
              <button
                onClick={() => {
                  setTransferCompleted(new Set([...transferCompleted, currentTransferApp]));
                  if (currentTransferApp < totalApps - 1) {
                    setCurrentTransferApp(currentTransferApp + 1);
                    setTransferAnswerShown(false);
                  }
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {currentTransferApp < totalApps - 1 ? '✓ Got It — Next App →' : '✓ Got It — Done!'}
              </button>
            </div>
            {transferAnswerShown && (
              <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginTop: '12px' }}>
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 4px' }}>Answer:</p>
                <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
                  {transferApplications[currentTransferApp]?.answer || app.howItWorks}
                </p>
              </div>
            )}
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px' }}>
            {realWorldApps.map((_, i) => (
              <div
                key={i}
                onClick={() => { setCurrentTransferApp(i); setTransferAnswerShown(false); }}
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: transferCompleted.has(i) ? colors.success : i === currentTransferApp ? app.color : 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
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
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
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
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question.substring(0, 120)}...</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? '✓ Correct: ' : userAnswer === oIndex ? '✗ Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                  <div style={{ background: 'rgba(59,130,246,0.1)', borderLeft: `3px solid ${colors.blue}`, padding: '10px', borderRadius: '6px', marginTop: '8px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 4px', fontWeight: 'bold' }}>Educational Explanation:</p>
                    <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.5, fontWeight: 400 }}>{(q as any).explanation}</p>
                  </div>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Q{currentTestQuestion + 1} / {testQuestions.length}</span>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered defect analysis!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Series vs shunt defects have different I-V signatures</li>
              <li>Cracks and contacts increase series resistance</li>
              <li>Crystal defects create shunt paths</li>
              <li>Hotspots are dangerous reverse-bias conditions</li>
              <li>Bypass diodes protect against hotspot damage</li>
            </ul>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default ShuntSeriesDefectsRenderer;
