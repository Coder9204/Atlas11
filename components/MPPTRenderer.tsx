'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MPPT (Maximum Power Point Tracking) - Complete 10-Phase Game
// Why solar controllers matter for harvesting maximum energy
// ─────────────────────────────────────────────────────────────────────────────

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

interface MPPTRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A homeowner notices their solar panels produce 300W at noon but only 180W in the late afternoon, even though sunlight intensity only dropped by 30%.",
    question: "Why might power drop more than expected as sunlight decreases?",
    options: [
      { id: 'a', label: "The panels are physically damaged by afternoon heat" },
      { id: 'b', label: "Without MPPT, the operating point moves away from maximum power", correct: true },
      { id: 'c', label: "Electrons move slower in the afternoon" },
      { id: 'd', label: "The inverter automatically reduces output for safety" }
    ],
    explanation: "Solar panels have a specific voltage-current relationship (I-V curve) that shifts with light intensity. Without MPPT actively tracking the new maximum power point, a fixed-voltage system operates at a suboptimal point, losing more power than the reduction in sunlight would suggest."
  },
  {
    scenario: "An engineer compares two identical solar installations: one with a simple PWM charge controller, the other with an MPPT controller. The MPPT system harvests 25% more energy.",
    question: "What allows the MPPT controller to extract more power?",
    options: [
      { id: 'a', label: "It uses higher quality wiring that reduces resistance" },
      { id: 'b', label: "It actively finds and tracks the voltage where power output is maximum", correct: true },
      { id: 'c', label: "It stores extra energy in internal capacitors" },
      { id: 'd', label: "It runs the panels at higher temperature for more efficiency" }
    ],
    explanation: "MPPT controllers continuously adjust the operating voltage to find the Maximum Power Point on the I-V curve. PWM controllers simply connect panels directly to batteries, often operating far from the optimal point, especially when battery voltage doesn't match panel MPP voltage."
  },
  {
    scenario: "A solar panel is rated for 40V at maximum power, but it's connected to a 12V battery system. The panel produces far less power than expected.",
    question: "What's causing the power loss?",
    options: [
      { id: 'a', label: "The battery is forcing the panel to operate at 12V instead of its optimal 40V", correct: true },
      { id: 'b', label: "12V batteries cannot accept solar power" },
      { id: 'c', label: "The panel rating is only valid in laboratory conditions" },
      { id: 'd', label: "Voltage differences always cause power loss" }
    ],
    explanation: "When a panel's MPP voltage (40V) differs significantly from battery voltage (12V), a direct connection forces the panel to operate at 12V—far from its optimal point. An MPPT controller solves this by converting the panel's high voltage to the battery's voltage while preserving power."
  },
  {
    scenario: "On a partly cloudy day, solar output fluctuates rapidly as clouds pass. An MPPT controller adjusts its operating point every few seconds.",
    question: "Why does the MPPT need to continuously adjust rather than staying at a fixed point?",
    options: [
      { id: 'a', label: "To prevent the panels from overheating" },
      { id: 'b', label: "Because the I-V curve and MPP location shift with changing irradiance", correct: true },
      { id: 'c', label: "To synchronize with the AC grid frequency" },
      { id: 'd', label: "Clouds change the color of sunlight, requiring recalibration" }
    ],
    explanation: "The I-V curve of a solar panel changes shape and the MPP shifts location whenever irradiance changes. MPPT algorithms (like Perturb & Observe or Incremental Conductance) continuously probe the curve to find the new maximum power point as conditions change."
  },
  {
    scenario: "A data center's rooftop solar system uses string inverters with MPPT. When one panel in a string is shaded, the entire string's output drops dramatically.",
    question: "Why does shading one panel affect the whole string so severely?",
    options: [
      { id: 'a', label: "The MPPT controller turns off the entire string for safety" },
      { id: 'b', label: "In a series string, current is limited by the weakest panel, and MPPT can only optimize for one operating point", correct: true },
      { id: 'c', label: "Shade creates electrical interference that disrupts other panels" },
      { id: 'd', label: "The inverter cannot handle mixed voltage inputs" }
    ],
    explanation: "In a series string, all panels share the same current. When one panel is shaded, its maximum current drops, limiting the entire string. The MPPT finds a compromise point, but significant power is lost. Solutions include microinverters, power optimizers, or bypass diodes."
  },
  {
    scenario: "A solar installer offers two system options: one large MPPT tracker for all panels, or multiple smaller trackers with panels grouped by orientation. The multi-tracker option costs 20% more.",
    question: "When would the multi-tracker option provide better energy harvest?",
    options: [
      { id: 'a', label: "When panels face different directions and receive sunlight at different intensities", correct: true },
      { id: 'b', label: "Only when the total system size exceeds 10kW" },
      { id: 'c', label: "When the battery bank is larger than 20kWh" },
      { id: 'd', label: "The single tracker is always better due to lower system losses" }
    ],
    explanation: "When panels face different directions (e.g., east and west roof sections), they have different I-V curves and MPP locations at any given time. Separate MPPT trackers can optimize each group independently, while a single tracker must compromise. This can yield 10-25% more energy."
  },
  {
    scenario: "An off-grid cabin's MPPT controller displays 'Bulk', 'Absorption', and 'Float' charging stages. During 'Float' mode, the panels produce far below their potential power.",
    question: "Why does the MPPT allow the panels to underperform during Float mode?",
    options: [
      { id: 'a', label: "The MPPT controller is malfunctioning" },
      { id: 'b', label: "Float mode means batteries are full; MPPT reduces power to prevent overcharging", correct: true },
      { id: 'c', label: "Float mode is for nighttime operation only" },
      { id: 'd', label: "The panels are too cold to operate at full power" }
    ],
    explanation: "MPPT controllers integrate battery charging logic. When batteries reach full charge, the controller moves away from MPP intentionally, reducing power flow to maintain float voltage and prevent overcharging. The 'lost' power isn't really lost—there's simply nowhere to put it."
  },
  {
    scenario: "A solar panel's specification sheet shows Vmp=37V (voltage at max power) and Voc=45V (open circuit voltage). The MPPT controller operates the panel at 37V.",
    question: "What would happen if the controller operated the panel at 45V instead?",
    options: [
      { id: 'a', label: "Power output would increase by 22%" },
      { id: 'b', label: "Power output would be zero because current is zero at Voc", correct: true },
      { id: 'c', label: "The panel would overheat and shut down" },
      { id: 'd', label: "The same power would be produced at higher efficiency" }
    ],
    explanation: "At open circuit voltage (Voc), no current flows—the panel produces no power (P = V × I = 45V × 0A = 0W). The maximum power point (Vmp=37V) is where the product of voltage and current is highest. Operating at Voc means zero power output."
  },
  {
    scenario: "A solar installation in Phoenix, Arizona shows 15% less power output in summer compared to spring, despite having more intense sunlight in summer.",
    question: "What causes this counterintuitive seasonal performance?",
    options: [
      { id: 'a', label: "Summer sunlight has less energy due to atmospheric changes" },
      { id: 'b', label: "Higher temperatures reduce panel voltage and efficiency, and shift the MPP", correct: true },
      { id: 'c', label: "The MPPT controller slows down in hot weather" },
      { id: 'd', label: "Dust accumulation is worse in summer" }
    ],
    explanation: "Solar panel efficiency drops with temperature—typically 0.3-0.5% per degree Celsius above 25°C. In Phoenix summer (panel temps of 60-70°C), this means 10-20% efficiency loss. The MPP voltage also decreases with temperature, requiring MPPT to track a moving target."
  },
  {
    scenario: "A researcher tests an MPPT algorithm by covering a solar panel with a blanket and watching the controller's response. The operating voltage oscillates wildly before settling.",
    question: "What MPPT algorithm behavior is the researcher observing?",
    options: [
      { id: 'a', label: "The controller is broken and needs replacement" },
      { id: 'b', label: "Perturb & Observe algorithm hunting for the new MPP after a sudden change", correct: true },
      { id: 'c', label: "Electromagnetic interference from the blanket material" },
      { id: 'd', label: "Battery voltage fluctuations affecting the measurement" }
    ],
    explanation: "Perturb & Observe (P&O) MPPT works by slightly changing voltage, measuring power change, and adjusting direction. When conditions change suddenly, the algorithm must search for the new MPP, causing visible oscillation. More advanced algorithms (like Incremental Conductance) converge faster."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏠',
    title: 'Residential Solar Systems',
    short: 'Maximizing rooftop solar harvest',
    tagline: 'Every watt counts for your electricity bill',
    description: 'Home solar installations use MPPT charge controllers or inverters to extract maximum power from rooftop panels. With varying roof orientations, shading from trees, and changing weather, MPPT can improve energy harvest by 20-30% compared to simpler PWM controllers.',
    connection: 'Residential systems face constantly changing conditions—morning shade, afternoon clouds, seasonal sun angles. MPPT continuously adjusts the operating point to maximize power as the I-V curve shifts throughout the day.',
    howItWorks: 'String inverters with MPPT track the combined curve of series-connected panels. Microinverters provide panel-level MPPT, eliminating mismatch losses. Modern systems achieve 97-99% MPPT efficiency.',
    stats: [
      { value: '25-30%', label: 'More energy vs PWM', icon: '⚡' },
      { value: '99%', label: 'MPPT tracking efficiency', icon: '📈' },
      { value: '$400/yr', label: 'Typical savings', icon: '💰' }
    ],
    examples: ['Enphase microinverters', 'SolarEdge optimizers', 'Victron MPPT controllers', 'Tesla Powerwall integration'],
    companies: ['Enphase', 'SolarEdge', 'SMA', 'Victron'],
    futureImpact: 'AI-powered MPPT algorithms will predict weather and pre-position operating points, reducing tracking losses to near zero.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Solar Charging',
    short: 'Solar-to-EV power optimization',
    tagline: 'Sun-powered miles on demand',
    description: 'Solar carports and home charging systems use MPPT to convert variable solar output into EV charging. Advanced systems coordinate solar MPPT with EV battery management for seamless energy transfer.',
    connection: 'EV batteries require specific voltage and current profiles. MPPT enables solar panels (with varying output) to charge batteries efficiently by continuously finding the optimal power point and converting it to the required charging parameters.',
    howItWorks: 'Solar charge controllers with MPPT feed power to a DC-DC converter that matches EV battery voltage. Smart systems shift charging to solar peak hours and reduce grid draw when clouds pass.',
    stats: [
      { value: '1000mi', label: 'Free solar miles/year', icon: '🚗' },
      { value: '50%', label: 'Charging cost reduction', icon: '💵' },
      { value: '2-5kW', label: 'Typical carport size', icon: '☀️' }
    ],
    examples: ['Tesla Solar + Powerwall', 'Wallbox Quasar V2G', 'Zappi solar diverter', 'SolarEdge EV charger'],
    companies: ['Tesla', 'Wallbox', 'myenergi', 'SolarEdge'],
    futureImpact: 'Vehicle-to-grid (V2G) systems will use bidirectional MPPT, making EVs into mobile solar batteries that stabilize the grid.',
    color: '#3B82F6'
  },
  {
    icon: '🛰️',
    title: 'Spacecraft Power Systems',
    short: 'Solar arrays in the harshest environment',
    tagline: 'No second chances in space',
    description: 'Satellites and space probes use sophisticated MPPT to harvest power from solar arrays in extreme conditions—temperature swings of 200°C, radiation damage, and varying sun distance. Reliability is critical with no possibility of repair.',
    connection: 'Space solar arrays experience dramatic I-V curve changes as they rotate, heat/cool, and degrade from radiation. MPPT must track these changes precisely while operating on minimal computing resources and maximum reliability.',
    howItWorks: 'Sequential switching shunt regulators or series regulators with MPPT manage power from multi-junction solar cells. Redundant controllers ensure continuous operation. Some use fixed setpoints with periodic optimization to reduce complexity.',
    stats: [
      { value: '30%', label: 'Solar cell efficiency', icon: '⚡' },
      { value: '15+ years', label: 'Operational lifetime', icon: '🛰️' },
      { value: '-150 to +150°C', label: 'Temperature range', icon: '🌡️' }
    ],
    examples: ['ISS solar arrays', 'Mars rovers', 'Starlink satellites', 'James Webb Space Telescope'],
    companies: ['Boeing', 'Lockheed Martin', 'Airbus', 'SpaceX'],
    futureImpact: 'Lunar and Mars bases will use autonomous MPPT systems that self-calibrate as panels degrade over decades without human intervention.',
    color: '#8B5CF6'
  },
  {
    icon: '🏭',
    title: 'Utility-Scale Solar Farms',
    short: 'Megawatts of optimized power',
    tagline: 'Grid-scale efficiency at every moment',
    description: 'Large solar farms use thousands of MPPT trackers to optimize hundreds of megawatts. Advanced algorithms coordinate across the entire plant, managing partial shading, soiling, and equipment variations to maximize revenue.',
    connection: 'At utility scale, even 1% efficiency improvement means millions of dollars. MPPT systems must handle massive panel arrays with varying conditions while maintaining grid stability and power quality requirements.',
    howItWorks: 'Central inverters combine MPPT with grid-tie functions, matching DC input to AC grid requirements. String-level monitoring identifies underperforming sections. Machine learning predicts optimal setpoints based on weather forecasts.',
    stats: [
      { value: '500MW', label: 'Largest solar farms', icon: '⚡' },
      { value: '$50M/yr', label: 'Value of 1% efficiency gain', icon: '💰' },
      { value: '99.5%', label: 'System availability', icon: '📊' }
    ],
    examples: ['Bhadla Solar Park', 'Tengger Desert Solar', 'Solar Star California', 'Benban Solar Park'],
    companies: ['First Solar', 'JinkoSolar', 'LONGi', 'Trina Solar'],
    futureImpact: 'AI-driven plant optimization will use satellite imagery and weather AI to predictively position MPPT across entire regions, creating virtual power plants.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const MPPTRenderer: React.FC<MPPTRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [irradiance, setIrradiance] = useState(1000); // W/m²
  const [temperature, setTemperature] = useState(25); // °C
  const [loadResistance, setLoadResistance] = useState(5); // Ohms
  const [mpptEnabled, setMpptEnabled] = useState(false);
  const [operatingVoltage, setOperatingVoltage] = useState(17);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Solar/energy yellow-orange
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Temperature Lab',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate I-V curve based on conditions
  const calculateIV = useCallback((voltage: number) => {
    // Simplified solar cell model
    const Isc = 9 * (irradiance / 1000); // Short circuit current scales with irradiance
    const Voc = 21 - 0.04 * (temperature - 25); // Open circuit voltage decreases with temp
    const n = 1.3; // Ideality factor
    const Vt = 0.026 * (273 + temperature) / 298; // Thermal voltage

    if (voltage >= Voc) return 0;
    if (voltage <= 0) return Isc;

    // Simplified single-diode model
    const current = Isc * (1 - Math.exp((voltage - Voc) / (n * Vt * 10)));
    return Math.max(0, current);
  }, [irradiance, temperature]);

  // Find MPP
  const findMPP = useCallback(() => {
    let maxPower = 0;
    let mppVoltage = 0;
    for (let v = 0; v <= 22; v += 0.1) {
      const i = calculateIV(v);
      const p = v * i;
      if (p > maxPower) {
        maxPower = p;
        mppVoltage = v;
      }
    }
    return { voltage: mppVoltage, power: maxPower, current: calculateIV(mppVoltage) };
  }, [calculateIV]);

  const mpp = findMPP();

  // Current operating point
  const currentCurrent = calculateIV(operatingVoltage);
  const currentPower = operatingVoltage * currentCurrent;
  const efficiency = mpp.power > 0 ? (currentPower / mpp.power) * 100 : 0;

  // MPPT auto-tracking
  useEffect(() => {
    if (mpptEnabled && phase === 'play') {
      const interval = setInterval(() => {
        setOperatingVoltage(v => {
          const target = mpp.voltage;
          const diff = target - v;
          return v + diff * 0.1; // Smooth tracking
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [mpptEnabled, mpp.voltage, phase]);

  // I-V Curve SVG Component
  const IVCurveVisualization = ({ showMPP = true, showOperatingPoint = true, interactive = false, showFormula = false }) => {
    const width = isMobile ? 320 : 450;
    const height = isMobile ? 220 : 280;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Generate curve points
    const curvePoints: { x: number; y: number; v: number; i: number; p: number }[] = [];
    for (let v = 0; v <= 22; v += 0.5) {
      const i = calculateIV(v);
      const x = padding.left + (v / 22) * plotWidth;
      const y = padding.top + plotHeight - (i / 10) * plotHeight;
      curvePoints.push({ x, y, v, i, p: v * i });
    }

    // Power curve points
    const powerPoints = curvePoints.map(pt => ({
      x: pt.x,
      y: padding.top + plotHeight - (pt.p / 200) * plotHeight,
      p: pt.p
    }));

    const curvePath = curvePoints.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
    ).join(' ');

    const powerPath = powerPoints.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
    ).join(' ');

    // Operating point position
    const opX = padding.left + (operatingVoltage / 22) * plotWidth;
    const opY = padding.top + plotHeight - (currentCurrent / 10) * plotHeight;

    // MPP position
    const mppX = padding.left + (mpp.voltage / 22) * plotWidth;
    const mppY = padding.top + plotHeight - (mpp.current / 10) * plotHeight;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <g key={`grid-${frac}`}>
            <line
              x1={padding.left}
              y1={padding.top + frac * plotHeight}
              x2={padding.left + plotWidth}
              y2={padding.top + frac * plotHeight}
              stroke={colors.border}
              strokeDasharray="3,3"
            />
            <line
              x1={padding.left + frac * plotWidth}
              y1={padding.top}
              x2={padding.left + frac * plotWidth}
              y2={padding.top + plotHeight}
              stroke={colors.border}
              strokeDasharray="3,3"
            />
          </g>
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeWidth="2" />

        {/* Axis labels */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textSecondary} fontSize="12" textAnchor="middle">Voltage (V)</text>
        <text x={15} y={padding.top + plotHeight / 2} fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`}>Current (A)</text>

        {/* Power curve (dashed) - Orange/yellow represents power/energy */}
        <path d={powerPath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5,5" opacity="0.6" />

        {/* I-V curve - Blue represents electrical current flow */}
        <path d={curvePath} fill="none" stroke="#3B82F6" strokeWidth="3" />

        {/* MPP marker */}
        {showMPP && (
          <g>
            <circle cx={mppX} cy={mppY} r="8" fill={colors.success} stroke="white" strokeWidth="2" />
            <text x={mppX + 12} y={mppY - 8} fill={colors.success} fontSize="11" fontWeight="600">
              MPP: {mpp.power.toFixed(0)}W
            </text>
          </g>
        )}

        {/* Operating point */}
        {showOperatingPoint && (
          <g>
            <circle
              cx={opX}
              cy={opY}
              r="10"
              fill={efficiency > 95 ? colors.success : efficiency > 80 ? colors.warning : colors.error}
              stroke="white"
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }}
            />
            {/* Vertical line to show voltage */}
            <line x1={opX} y1={opY} x2={opX} y2={padding.top + plotHeight} stroke={colors.textSecondary} strokeDasharray="3,3" />
          </g>
        )}

        {/* Legend */}
        <g transform={`translate(${padding.left + 10}, ${padding.top + 10})`}>
          <rect x="0" y="0" width="12" height="3" fill="#3B82F6" />
          <text x="18" y="4" fill={colors.textSecondary} fontSize="10">I-V Curve</text>
          <rect x="0" y="12" width="12" height="3" fill="#F59E0B" opacity="0.6" />
          <text x="18" y="16" fill={colors.textSecondary} fontSize="10">Power</text>
        </g>

        {/* Formula (if enabled) */}
        {showFormula && (
          <g transform={`translate(${width - padding.right - 100}, ${height - padding.bottom - 20})`}>
            <text fill={colors.textSecondary} fontSize="11" fontFamily="monospace">
              <tspan x="0" y="0">P = V × I</tspan>
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Progress bar component
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

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ☀️⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Maximum Power Point Tracking
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "If sunlight doubles, does power double? The answer reveals why <span style={{ color: colors.accent }}>smart controllers</span> extract 25% more energy from the same panels."
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "Every solar panel has a sweet spot—a specific voltage where it produces maximum power. Miss it, and you leave watts on the table."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Solar Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Find the Sweet Spot →
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Power increases linearly with voltage—higher voltage always means more power' },
      { id: 'b', text: 'There\'s one optimal voltage where power peaks, and it\'s different from max voltage' },
      { id: 'c', text: 'Power stays constant regardless of the load connected' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A solar panel is rated at 100W. As you change the load resistance, how does power output behave?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>☀️</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Sunlight</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{
                background: colors.accent + '33',
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
              }}>
                <div style={{ fontSize: '32px' }}>⬛</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Solar Panel</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>❓</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Power Output?</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive I-V Curve
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Find the Maximum Power Point
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust the operating voltage to find where power output is highest
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                💡 <strong>Watch for:</strong> The power value peaks at a specific voltage—not at the maximum voltage!
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <IVCurveVisualization showMPP={false} showOperatingPoint={true} interactive={true} showFormula={true} />
              </div>

              {/* Voltage slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Operating Voltage</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{operatingVoltage.toFixed(1)}V</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="22"
                  step="0.5"
                  value={operatingVoltage}
                  onChange={(e) => setOperatingVoltage(parseFloat(e.target.value))}
                  disabled={mpptEnabled}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.accent} ${(operatingVoltage / 22) * 100}%, ${colors.border} ${(operatingVoltage / 22) * 100}%)`,
                    cursor: mpptEnabled ? 'not-allowed' : 'pointer',
                    opacity: mpptEnabled ? 0.5 : 1,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>0V</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>22V</span>
                </div>
              </div>

              {/* MPPT toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Manual Control</span>
                <button
                  onClick={() => setMpptEnabled(!mpptEnabled)}
                  style={{
                    width: '60px',
                    height: '30px',
                    borderRadius: '15px',
                    border: 'none',
                    background: mpptEnabled ? colors.success : colors.border,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.3s',
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: mpptEnabled ? '33px' : '3px',
                    transition: 'left 0.3s',
                  }} />
                </button>
                <span style={{ ...typo.small, color: mpptEnabled ? colors.success : colors.textSecondary, fontWeight: mpptEnabled ? 600 : 400 }}>
                  MPPT Auto
                </span>
              </div>

              {/* Power output display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{currentPower.toFixed(1)}W</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Current Power</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{mpp.power.toFixed(1)}W</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Maximum Available</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: efficiency > 95 ? colors.success : efficiency > 80 ? colors.warning : colors.error
                  }}>
                    {efficiency.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Efficiency</div>
                </div>
              </div>
            </div>

            {/* Discovery prompt */}
            {efficiency > 95 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  🎯 You found the Maximum Power Point! Notice how it's not at the highest voltage.
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand Why →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Does a "Sweet Spot" Exist?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <IVCurveVisualization showMPP={true} showOperatingPoint={false} />
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Power = Voltage × Current</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.accent }}>low voltage</span>: Current is high, but V×I is still small.
              </p>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.accent }}>high voltage</span>: Current drops rapidly, so V×I becomes small again.
              </p>
              <p>
                The <span style={{ color: colors.success, fontWeight: 600 }}>Maximum Power Point (MPP)</span> is where the product V×I reaches its peak—typically around 80% of the open circuit voltage.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              💡 Key Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Without MPPT, a battery or load forces the panel to operate at a fixed voltage—often far from the optimal point. MPPT controllers actively adjust the operating point to always stay at peak power.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Temperature Effects →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The entire curve shifts down and left—less current AND less voltage' },
      { id: 'b', text: 'Only current changes; voltage stays the same' },
      { id: 'c', text: 'The MPP voltage decreases, requiring MPPT to track a new point' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              🌡️ New Variable: Temperature
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            On a hot summer day (45°C panel temperature), what happens to the I-V curve?
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See the Temperature Effect →
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Temperature & Irradiance Effects
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust conditions and watch the I-V curve change
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                🔍 <strong>Watch for:</strong> Temperature shifts voltage left (orange/red=voltage drop). Irradiance changes current height (blue=more current).
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <IVCurveVisualization showMPP={true} showOperatingPoint={true} showFormula={true} />
              </div>

              {/* Temperature slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>🌡️ Panel Temperature</span>
                  <span style={{
                    ...typo.small,
                    color: temperature > 40 ? colors.error : temperature > 30 ? colors.warning : colors.success,
                    fontWeight: 600
                  }}>
                    {temperature}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="70"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Cold (0°C)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Hot (70°C)</span>
                </div>
              </div>

              {/* Irradiance slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>☀️ Sunlight Intensity</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{irradiance} W/m²</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="50"
                  value={irradiance}
                  onChange={(e) => setIrradiance(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Cloudy</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Full Sun</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{mpp.power.toFixed(0)}W</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Max Power</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{mpp.voltage.toFixed(1)}V</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>MPP Voltage</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Physics →
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why MPPT Never Stops Tracking
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Temperature Effect</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Higher temperatures <span style={{ color: colors.error }}>decrease voltage</span> by ~0.4%/°C. A panel at 60°C loses about 14% of its voltage compared to 25°C—shifting the MPP left on the curve.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>☀️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Irradiance Effect</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Lower light <span style={{ color: colors.warning }}>decreases current</span> proportionally. At 500 W/m², current is roughly half of full sun—but voltage only drops slightly. The MPP power drops significantly.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>MPPT Algorithms</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Perturb & Observe:</strong> Slightly changes voltage, measures power change, and adjusts. Simple but can oscillate around MPP.
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '8px', marginBottom: 0 }}>
                <strong>Incremental Conductance:</strong> Uses dI/dV to detect MPP precisely. Faster convergence, better for varying conditions.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* App selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound('click');
                    setSelectedApp(i);
                    const newCompleted = [...completedApps];
                    newCompleted[i] = true;
                    setCompletedApps(newCompleted);
                  }}
                  style={{
                    background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  {completedApps[i] && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: colors.success,
                      color: 'white',
                      fontSize: '12px',
                      lineHeight: '18px',
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                    {a.title.split(' ').slice(0, 2).join(' ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected app details */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              borderLeft: `4px solid ${app.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                {app.description}
              </p>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How MPPT Connects:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test →
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered Maximum Power Point Tracking!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review & Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          MPPT Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how Maximum Power Point Tracking works and why it's essential for efficient solar energy harvesting.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'I-V curves and power optimization',
              'Why MPP exists at a specific voltage',
              'Temperature and irradiance effects',
              'How MPPT algorithms track changing conditions',
              'Real-world applications from homes to space',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default MPPTRenderer;
