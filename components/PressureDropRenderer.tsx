'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Pressure Drop in Fluid Systems - Complete 10-Phase Game
// Understanding how pipe diameter, flow rate, length, and roughness affect pressure loss
// -----------------------------------------------------------------------------

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

interface PressureDropRendererProps {
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A building engineer notices that water flow to the top floor is weak. The plumber suggests either doubling the pump pressure or replacing the 1-inch pipes with 2-inch pipes.",
    question: "If the pipe diameter is doubled, how does the pressure drop change (assuming the same flow rate)?",
    options: [
      { id: 'a', label: "Pressure drop is cut in half" },
      { id: 'b', label: "Pressure drop drops to 1/4 of original" },
      { id: 'c', label: "Pressure drop drops to 1/16 of original", correct: true },
      { id: 'd', label: "Pressure drop stays the same" }
    ],
    explanation: "Pressure drop is proportional to 1/D^5 (from Darcy-Weisbach: ΔP ∝ L/D × V², and V ∝ 1/D² for constant flow). Doubling diameter: (1/2)^5 = 1/32, but accounting for velocity reduction, the net effect is approximately 1/16. Pipe diameter has a dramatic effect on pressure drop!"
  },
  {
    scenario: "An HVAC technician is sizing ductwork for a new building. They can use either 100 feet of 12-inch diameter duct or 100 feet of 10-inch duct.",
    question: "Approximately how much more pressure drop will the smaller duct have?",
    options: [
      { id: 'a', label: "20% more (proportional to diameter difference)" },
      { id: 'b', label: "44% more (based on area ratio)" },
      { id: 'c', label: "About 2.5 times more (fifth power relationship)", correct: true },
      { id: 'd', label: "10 times more" }
    ],
    explanation: "For the same airflow, pressure drop scales roughly as (D₁/D₂)^5. (12/10)^5 = 1.2^5 ≈ 2.49. The 10-inch duct will have about 2.5 times the pressure drop of the 12-inch duct—a huge penalty for a seemingly small size reduction."
  },
  {
    scenario: "A factory's compressed air system experiences excessive pressure drop. A consultant recommends reducing the flow rate from 100 CFM to 80 CFM.",
    question: "By what factor will the pressure drop decrease?",
    options: [
      { id: 'a', label: "By 20% (linear with flow)" },
      { id: 'b', label: "By 36% (squared relationship)", correct: true },
      { id: 'c', label: "By 49% (cubed relationship)" },
      { id: 'd', label: "By 59% (fifth power relationship)" }
    ],
    explanation: "Pressure drop is proportional to velocity squared, and velocity is proportional to flow rate. So ΔP ∝ Q². At 80% flow: 0.8² = 0.64, meaning pressure drop is 64% of original—a 36% reduction for 20% less flow."
  },
  {
    scenario: "A hospital is designing a new medical gas piping system. The original design uses 200 feet of pipe, but budget constraints might require extending the run to 300 feet.",
    question: "How will the pressure drop change with the longer pipe run?",
    options: [
      { id: 'a', label: "Increase by 50% (proportional to length)", correct: true },
      { id: 'b', label: "Increase by 125% (squared relationship)" },
      { id: 'c', label: "Increase by 237% (cubed relationship)" },
      { id: 'd', label: "Stay approximately the same" }
    ],
    explanation: "Pressure drop is directly proportional to pipe length (ΔP ∝ L). Increasing from 200 to 300 feet (1.5×) means pressure drop increases by 50%. Unlike diameter, length has a simple linear relationship with pressure drop."
  },
  {
    scenario: "An engineer is comparing pressure drop in two identical pipe sections: one brand new with smooth interior, the other 20 years old with corroded, rough walls.",
    question: "What effect does the increased wall roughness have?",
    options: [
      { id: 'a', label: "Minimal effect—roughness is negligible in most systems" },
      { id: 'b', label: "Increases friction factor, potentially doubling or tripling pressure drop", correct: true },
      { id: 'c', label: "Decreases pressure drop by creating turbulence that aids flow" },
      { id: 'd', label: "Only affects flow at very high velocities" }
    ],
    explanation: "Wall roughness significantly increases the friction factor in the Darcy-Weisbach equation. Corroded pipes can have 2-5× higher friction factors than new pipes, directly multiplying pressure drop. This is why pipe maintenance and material selection matter."
  },
  {
    scenario: "A building's HVAC air filter has been in service for 6 months without replacement. The building automation system shows supply fan working harder than when the filter was new.",
    question: "Why does the fan need to work harder as the filter ages?",
    options: [
      { id: 'a', label: "The filter media shrinks over time, reducing flow area" },
      { id: 'b', label: "Dust accumulation increases filter resistance, raising system pressure drop", correct: true },
      { id: 'c', label: "The fan motor degrades with age" },
      { id: 'd', label: "Air temperature changes affect fan performance" }
    ],
    explanation: "As filters load with particles, their pressure drop increases significantly—sometimes 2-4× the clean filter drop. This is why filter pressure monitoring is standard practice. A loaded filter forces the fan to work harder to maintain airflow."
  },
  {
    scenario: "A piping system has a long straight run followed by several elbows, tees, and valves. The total pipe length is 50 feet.",
    question: "How should fittings be accounted for in pressure drop calculations?",
    options: [
      { id: 'a', label: "Ignore fittings—they have negligible impact" },
      { id: 'b', label: "Add equivalent length for each fitting; total effective length may be 2-3× the physical pipe length", correct: true },
      { id: 'c', label: "Subtract from pressure drop since fittings smooth the flow" },
      { id: 'd', label: "Multiply the pipe pressure drop by 10% per fitting" }
    ],
    explanation: "Fittings create local turbulence and pressure losses. Each fitting has an 'equivalent length' of straight pipe. A 90° elbow might equal 30 pipe diameters of straight pipe. In systems with many fittings, fitting losses often exceed straight pipe losses."
  },
  {
    scenario: "A process engineer is designing a chemical transfer system. At startup, flow will be 50 GPM, but after 2 years, demand will increase to 100 GPM using the same pipes.",
    question: "How will the future pressure drop compare to the initial pressure drop?",
    options: [
      { id: 'a', label: "Double (linear relationship)" },
      { id: 'b', label: "Quadruple (flow squared)", correct: true },
      { id: 'c', label: "8 times higher (flow cubed)" },
      { id: 'd', label: "16 times higher (flow to the fourth power)" }
    ],
    explanation: "Since ΔP ∝ V² and V ∝ Q (for fixed pipe size), doubling flow rate quadruples pressure drop. This is critical for system design—the engineer must size the pump and pipes for future flow rates, not just initial conditions."
  },
  {
    scenario: "A cleanroom designer must choose between running one large 18-inch duct or two parallel 12-inch ducts to deliver the same total airflow.",
    question: "Which option will have lower pressure drop?",
    options: [
      { id: 'a', label: "One large 18-inch duct—less surface area means less friction" },
      { id: 'b', label: "Two parallel 12-inch ducts—splitting flow reduces velocity in each", correct: true },
      { id: 'c', label: "Both are equivalent since they carry the same air" },
      { id: 'd', label: "Cannot determine without knowing the exact flow rate" }
    ],
    explanation: "Two 12\" ducts have a combined area of 2×π×6² = 226 in², while one 18\" duct has π×9² = 254 in². However, pressure drop scales with V². Splitting flow between two ducts means each carries half the flow at much lower velocity, dramatically reducing total pressure drop."
  },
  {
    scenario: "A facilities manager notices that after installing new high-efficiency air filters, the building's HVAC system cannot achieve design airflow even with fans at maximum speed.",
    question: "What is the most likely cause and solution?",
    options: [
      { id: 'a', label: "Filters are defective; replace with original type" },
      { id: 'b', label: "The high-efficiency filters have higher pressure drop; system needs rebalancing or fan upgrade", correct: true },
      { id: 'c', label: "Ductwork has collapsed somewhere in the system" },
      { id: 'd', label: "Fan motors have reached end of life" }
    ],
    explanation: "Higher efficiency filters (like HEPA) have significantly higher pressure drop than standard filters. The system curve shifts up, reducing the operating point airflow. Solutions include upgrading fans, adding filter area, or using multiple filter stages."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🏥',
    title: 'Hospital HVAC Systems',
    short: 'Critical air quality and pressure control',
    tagline: 'Where airflow saves lives',
    description: 'Hospitals require precise pressure relationships between spaces—operating rooms at +0.01 inches WC positive to corridors, isolation rooms negative at -0.01 inches WC. Understanding pressure drop is essential to maintain these life-critical pressure differentials across 15-25 air changes per hour. Filter pressure drop monitoring is mandatory: clean HEPA filters start at 1.0 inches WC and can reach 2.5 inches WC when loaded, requiring fan speed adjustment via variable frequency drives. Every duct segment, bend, and fitting contributes to total system pressure drop.',
    connection: 'Every duct run, filter, and fitting contributes to system pressure drop. HVAC engineers must calculate total system pressure drop to size fans that can maintain required airflows and pressure differentials under all filter loading conditions throughout the system lifecycle.',
    howItWorks: 'Supply and exhaust fans are sized with significant safety margins. Pressure drop monitoring on filters triggers replacements before airflow degrades below minimum safe thresholds. Variable speed drives adjust fan speeds continuously to maintain precise airflows.',
    stats: [
      { value: '15-25 ACH', label: 'OR air changes/hour', icon: '🔄' },
      { value: '+0.01"', label: 'Typical OR pressure WC', icon: '📊' },
      { value: '99.97%', label: 'HEPA filter efficiency', icon: '🛡️' }
    ],
    examples: ['Operating room ventilation', 'Isolation room control', 'Pharmacy clean rooms', 'Laboratory fume hoods'],
    companies: ['Trane', 'Carrier', 'Johnson Controls', 'Price Industries'],
    futureImpact: 'Smart building systems will use AI to predict filter loading and optimize fan speeds, reducing energy while maintaining critical pressures.',
    color: '#10B981'
  },
  {
    icon: '🏭',
    title: 'Industrial Piping Systems',
    short: 'Moving fluids efficiently at scale',
    tagline: 'Every psi costs money',
    description: 'Chemical plants, refineries, and manufacturing facilities move massive quantities of fluids through miles of piping at flow rates exceeding 10,000 GPM. Pressure drop calculations determine pump sizing, pipe diameters, and operating costs that can reach $5M+ annually just for pumping energy. The Darcy-Weisbach equation governs all industrial piping: ΔP = f × (L/D) × (ρV²/2). Engineers balance capital costs (larger pipes cost more) against operating costs (smaller pipes need bigger pumps). A 20-40% energy savings is achievable through optimal pipe sizing alone.',
    connection: 'The Darcy-Weisbach equation governs all industrial piping design. Engineers balance capital costs (larger pipes cost more) against operating costs (smaller pipes need bigger pumps). Optimal designs minimize 20-year lifecycle costs, not just initial capital.',
    howItWorks: 'Process engineers use sophisticated software to model pressure drop through entire plant systems, accounting for fluid properties, temperatures, pipe materials, fittings, and elevation changes. Pumps are sized to overcome total system pressure drop at maximum flow.',
    stats: [
      { value: '$5M+', label: 'Annual pumping costs (large plant)', icon: '💰' },
      { value: '20-40%', label: 'Energy savings with optimal sizing', icon: '⚡' },
      { value: '10,000+ GPM', label: 'Typical large process flows', icon: '📏' }
    ],
    examples: ['Oil pipelines', 'Chemical transfer', 'Water treatment', 'Steam distribution'],
    companies: ['Emerson', 'Flowserve', 'Grundfos', 'KSB'],
    futureImpact: 'Digital twins of piping systems will enable real-time optimization, detecting developing blockages before they cause failures.',
    color: '#F59E0B'
  },
  {
    icon: '🌬️',
    title: 'Building Ventilation Design',
    short: 'Balancing comfort, efficiency, and air quality',
    tagline: 'The art of moving air',
    description: 'Commercial buildings use extensive ductwork networks to deliver 15-20 CFM per person of conditioned air. Pressure drop calculations determine duct sizes, fan selections, and energy consumption. The target friction rate is 0.08 inches WC per 100 feet of duct. Poor design leads to uncomfortable spaces, wasted energy (fans consume 30-50% of HVAC energy), and indoor air quality problems. Dampers, diffusers, and each 90° elbow add equivalent pipe length. A single standard elbow equals 30 pipe diameters in friction loss.',
    connection: 'Every turn, damper, diffuser, and straight duct section contributes to total system pressure drop. Engineers use pressure drop to balance airflows, ensure proper ventilation rates, and minimize fan energy consumption across hundreds of zones.',
    howItWorks: 'Design starts with required airflows per zone, then ducts are sized to limit velocity and pressure drop within budget. The system curve (pressure vs. flow) is plotted against fan curves to find the stable operating point. VAV systems adjust dynamically.',
    stats: [
      { value: '0.08"/100ft', label: 'Typical design friction rate', icon: '📐' },
      { value: '30-50%', label: 'HVAC energy used by fans', icon: '💨' },
      { value: '15-20 CFM', label: 'Per person fresh air required', icon: '👤' }
    ],
    examples: ['Office buildings', 'Schools and universities', 'Shopping centers', 'Data centers'],
    companies: ['Titus', 'Krueger', 'Greenheck', 'Systemair'],
    futureImpact: 'Demand-controlled ventilation using CO2 and occupancy sensors will optimize airflows in real-time, dramatically reducing pressure drop and energy use.',
    color: '#3B82F6'
  },
  {
    icon: '🚰',
    title: 'Plumbing System Design',
    short: 'Reliable water delivery to every fixture',
    tagline: 'Pressure where you need it',
    description: 'From skyscrapers to hospitals, plumbing systems must deliver 20-80 PSI at every fixture. Pressure drop calculations ensure the top floor shower works as well as the ground floor, even during peak demand with all fixtures operating simultaneously. Water velocity must stay below 8 fps in copper pipe to prevent erosion and noise. Each floor typically loses 4-8 PSI of pressure from pipe friction. High-rise buildings above 10 stories require booster pump stations every 10-15 floors to maintain adequate pressure throughout.',
    connection: 'Water velocity, pipe material, fittings, and elevation all contribute to pressure loss. Plumbing engineers size pipes to limit velocity (noise and erosion) while maintaining adequate pressure at the furthest fixtures from the main supply point.',
    howItWorks: 'Engineers calculate pressure drop from the water main to each fixture, accounting for static head (0.433 PSI per foot of elevation), friction losses, and fitting losses. Booster pumps are added when city pressure of 40-80 PSI is insufficient for upper floors.',
    stats: [
      { value: '20-80 PSI', label: 'Required fixture pressure range', icon: '💧' },
      { value: '8 fps max', label: 'Velocity limit in copper pipe', icon: '⚡' },
      { value: '4-8 PSI', label: 'Typical pressure loss per floor', icon: '📉' }
    ],
    examples: ['High-rise buildings', 'Hospital medical gas', 'Fire sprinkler systems', 'Irrigation systems'],
    companies: ['Watts', 'Zurn', 'Sloan', 'Chicago Faucets'],
    futureImpact: 'Smart water systems will monitor pressure throughout buildings, detecting leaks and optimizing pump operations in real-time.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PressureDropRenderer: React.FC<PressureDropRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [pipeDiameter, setPipeDiameter] = useState(4); // inches
  const [flowRate, setFlowRate] = useState(50); // GPM or CFM
  const [pipeLength, setPipeLength] = useState(100); // feet
  const [roughness, setRoughness] = useState(1); // multiplier (1 = smooth, 3 = rough)
  const [filterLoading, setFilterLoading] = useState(0); // 0-100%
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
    accent: '#3B82F6', // Blue for fluid/water
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(148,163,184,0.9)',
    textMuted: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation - labels matching test patterns
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'Explore Filter',
    twist_play: 'Twist Experiment',
    twist_review: 'Deep Insight',
    transfer: 'Real World Transfer',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculate pressure drop using simplified Darcy-Weisbach
  const calculatePressureDrop = useCallback(() => {
    const velocity = flowRate / (pipeDiameter * pipeDiameter); // simplified velocity
    const basePressureDrop = roughness * (pipeLength / pipeDiameter) * (velocity * velocity) / 1000;
    const filterDrop = filterLoading * 0.5; // Up to 0.5 inches WC from filter

    return {
      pipeDrop: basePressureDrop,
      filterDrop: filterDrop,
      totalDrop: basePressureDrop + filterDrop,
      velocity: velocity * 10 // scaled for display
    };
  }, [pipeDiameter, flowRate, pipeLength, roughness, filterLoading]);

  const pressureData = calculatePressureDrop();

  // Enhanced Pipe System Visualization with viewBox and filter effects
  const PipeVisualization = ({ showFlow = true, showPressure = true }) => {
    const vbWidth = 500;
    const vbHeight = 260;
    const pipeY = vbHeight / 2 - 10;
    const pipeHeight = Math.max(24, pipeDiameter * 5);

    // Animated flow particles
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const offset = ((animationFrame * flowRate / 50 * 2) + i * 50) % (vbWidth - 100);
      const yOffset = Math.sin((animationFrame + i * 30) * 0.1) * (pipeHeight / 4 - 2);
      particles.push({ x: 50 + offset, y: pipeY + yOffset, opacity: 0.6 + Math.random() * 0.4 });
    }

    return (
      <svg
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        width="100%"
        style={{ maxWidth: '500px', background: colors.bgCard, borderRadius: '12px', display: 'block' }}
      >
        <defs>
          <linearGradient id="pdPipeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.success} />
          </linearGradient>
          <linearGradient id="pdPipeShading" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
          <linearGradient id="pdGaugeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <filter id="pdGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pdDropShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
          </filter>
        </defs>

        {/* Background grid */}
        <g opacity="0.3">
          {[60, 120, 180, 240, 300, 360, 420].map(x => (
            <line key={`vg${x}`} x1={x} y1="20" x2={x} y2={vbHeight - 20} stroke="#ffffff" strokeWidth="0.5" strokeDasharray="4 4" />
          ))}
          {[60, 120, 180, 220].map(y => (
            <line key={`hg${y}`} x1="40" y1={y} x2={vbWidth - 40} y2={y} stroke="#ffffff" strokeWidth="0.5" strokeDasharray="4 4" />
          ))}
        </g>

        {/* Pressure gauge at inlet - absolute coordinates */}
        <circle cx="38" cy="38" r="26" fill="url(#pdGaugeGlow)" opacity="0.9" />
        <circle cx="38" cy="38" r="22" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
        <text x="38" y="43" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="700">
          {(pressureData.totalDrop + 30).toFixed(1)}
        </text>
        <text x="38" y="82" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="500">Pressure in</text>

        {/* Pressure gauge at outlet - absolute coordinates */}
        <circle cx={vbWidth - 38} cy="38" r="26" fill="#10B981" opacity="0.3" />
        <circle cx={vbWidth - 38} cy="38" r="22" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="2" />
        <text x={vbWidth - 38} y="43" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="700">
          30.0
        </text>
        <text x={vbWidth - 38} y="82" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="500">Pressure out</text>

        {/* Pipe body outer */}
        <rect
          x="70"
          y={pipeY - pipeHeight / 2 - 6}
          width={vbWidth - 140}
          height={pipeHeight + 12}
          rx="6"
          fill={colors.border}
          filter="url(#pdDropShadow)"
        />

        {/* Pipe inner with pressure gradient */}
        <rect
          x="76"
          y={pipeY - pipeHeight / 2}
          width={vbWidth - 152}
          height={pipeHeight}
          rx="3"
          fill="url(#pdPipeGradient)"
          opacity="0.35"
        />

        {/* Pipe shading for 3D effect */}
        <rect
          x="76"
          y={pipeY - pipeHeight / 2}
          width={vbWidth - 152}
          height={pipeHeight}
          rx="3"
          fill="url(#pdPipeShading)"
        />

        {/* Roughness texture */}
        {roughness > 1.5 && (
          <g>
            {Array.from({ length: Math.floor((vbWidth - 152) / 18) }, (_, i) => (
              <rect
                key={i}
                x={76 + i * 18}
                y={pipeY - pipeHeight / 2}
                width="2"
                height={pipeHeight}
                fill={colors.bgSecondary}
                opacity={roughness > 2 ? 0.5 : 0.3}
              />
            ))}
          </g>
        )}

        {/* Flow particles */}
        {showFlow && particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={Math.max(3, 3 + flowRate / 60)}
            fill="white"
            opacity={p.opacity * (flowRate / 100)}
            filter="url(#pdGlow)"
          />
        ))}

        {/* Pressure drop indicator bar */}
        {showPressure && (
          <g>
            <rect
              x="76"
              y={vbHeight - 40}
              width={vbWidth - 152}
              height="10"
              rx="5"
              fill={colors.bgSecondary}
            />
            <rect
              x="76"
              y={vbHeight - 40}
              width={Math.min((pressureData.totalDrop / 5) * (vbWidth - 152), vbWidth - 152)}
              height="10"
              rx="5"
              fill={pressureData.totalDrop > 3 ? colors.error : pressureData.totalDrop > 1.5 ? colors.warning : colors.success}
            />
            <text x={vbWidth / 2} y={vbHeight - 16} fill="#FFFFFF" fontSize="12" textAnchor="middle" fontWeight="600">
              ΔP = {pressureData.totalDrop.toFixed(2)} PSI
            </text>
          </g>
        )}

        {/* Diameter indicator - absolute coordinates */}
        <line x1={vbWidth / 2 - 35} y1={pipeY - pipeHeight / 2 - 10} x2={vbWidth / 2 - 35} y2={pipeY + pipeHeight / 2 + 10} stroke={colors.accent} strokeWidth="1.5" />
        <line x1={vbWidth / 2 - 42} y1={pipeY - pipeHeight / 2 - 10} x2={vbWidth / 2 - 28} y2={pipeY - pipeHeight / 2 - 10} stroke={colors.accent} strokeWidth="1.5" />
        <line x1={vbWidth / 2 - 42} y1={pipeY + pipeHeight / 2 + 10} x2={vbWidth / 2 - 28} y2={pipeY + pipeHeight / 2 + 10} stroke={colors.accent} strokeWidth="1.5" />
        <text x={vbWidth / 2 - 56} y={pipeY + 5} fill="#FFFFFF" fontSize="13" textAnchor="middle" fontWeight="600">
          {pipeDiameter}&quot;
        </text>

        {/* Flow label and arrow - absolute */}
        <line x1={vbWidth / 2 + 60} y1={pipeY} x2={vbWidth / 2 + 105} y2={pipeY} stroke={colors.success} strokeWidth="2" />
        <polygon points={`${vbWidth / 2 + 105},${pipeY} ${vbWidth / 2 + 96},${pipeY + 5} ${vbWidth / 2 + 96},${pipeY - 5}`} fill={colors.success} />
        <text x={vbWidth / 2 + 82} y={pipeY - 12} fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="500">
          Flow Rate
        </text>
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

  // Bottom navigation bar with Back and Next
  const renderBottomNav = (onNext?: () => void, nextLabel = 'Next →', nextDisabled = false) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgCard,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 200,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      <button
        onClick={prevPhase}
        disabled={phase === 'hook'}
        style={{
          padding: '12px 20px',
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: phase === 'hook' ? colors.border : '#FFFFFF',
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          fontSize: '15px',
          fontWeight: 600,
          minHeight: '48px',
          transition: 'all 0.2s ease',
        }}
      >
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            aria-label={phaseLabels[p]}
            style={{
              width: phase === p ? '24px' : '8px',
              borderRadius: '4px',
              border: 'none',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: '4px 0',
            }}
          />
        ))}
      </div>
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: nextDisabled ? colors.border : `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
            color: 'white',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            fontWeight: 700,
            minHeight: '48px',
            transition: 'all 0.2s ease',
            boxShadow: nextDisabled ? 'none' : `0 4px 12px ${colors.accentGlow}`,
          }}
        >
          {nextLabel}
        </button>
      )}
      {!onNext && (
        <div style={{ width: '100px' }} />
      )}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
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

  // -----------------------------------------------------------------------------
  // PHASE RENDERS
  // -----------------------------------------------------------------------------

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
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '100px',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔧💧
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Pressure Drop in Fluid Systems
        </h1>

        <p style={{
          ...typo.body,
          color: '#CBD5E1',
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Discover why doubling the pipe diameter doesn&apos;t halve pressure drop—it drops to{' '}
          <span style={{ color: colors.success }}>1/16th</span>. This fifth-power relationship
          governs everything from hospital ventilation to oil pipelines.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: '#CBD5E1', fontStyle: 'italic', margin: 0 }}>
            &quot;Understanding pressure drop is the key to designing efficient fluid systems.
            Get it wrong, and you&apos;ll waste energy, money, and compromise performance.&quot;
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', margin: '8px 0 0 0' }}>
            — Fluid Systems Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Pressure Drop →
        </button>

        {renderBottomNav(() => nextPhase(), 'Start →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Pressure drop increases linearly—double flow means double the drop' },
      { id: 'b', text: 'Pressure drop increases with flow squared—double flow means 4× the drop' },
      { id: 'c', text: 'Pressure drop stays roughly constant regardless of flow rate' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction — What do you expect to happen?
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A pipe system has a certain pressure drop at 50 GPM. What happens if you double the flow rate to 100 GPM?
          </h2>

          {/* Predict diagram SVG */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg
              viewBox="0 0 500 200"
              width="100%"
              style={{ maxWidth: '500px', display: 'block', margin: '0 auto' }}
            >
              <defs>
                <linearGradient id="pdPredGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
              {/* Scenario 1: 50 GPM */}
              <g transform="translate(60, 40)">
                <rect x="0" y="0" width="80" height="40" rx="6" fill="#3B82F6" opacity="0.3" stroke="#3B82F6" strokeWidth="2" />
                <text x="40" y="25" fill="#FFFFFF" fontSize="13" textAnchor="middle" fontWeight="600">Pipe</text>
                <text x="40" y="62" fill="#FFFFFF" fontSize="12" textAnchor="middle">50 GPM</text>
                <text x="40" y="80" fill="#10B981" fontSize="12" textAnchor="middle">1 PSI drop</text>
              </g>

              {/* Arrow */}
              <g transform="translate(200, 65)">
                <line x1="0" y1="0" x2="50" y2="0" stroke="#64748b" strokeWidth="2" />
                <polygon points="50,0 40,5 40,-5" fill="#64748b" />
                <text x="25" y="-10" fill="#94a3b8" fontSize="11" textAnchor="middle">×2 flow</text>
              </g>

              {/* Scenario 2: 100 GPM */}
              <g transform="translate(310, 40)">
                <rect x="0" y="0" width="80" height="40" rx="6" fill="#3B82F6" opacity="0.3" stroke="#3B82F6" strokeWidth="2" />
                <text x="40" y="25" fill="#FFFFFF" fontSize="13" textAnchor="middle" fontWeight="600">Pipe</text>
                <text x="40" y="62" fill="#FFFFFF" fontSize="12" textAnchor="middle">100 GPM</text>
                <text x="40" y="80" fill="#F59E0B" fontSize="13" textAnchor="middle">? PSI drop</text>
              </g>

              {/* Question mark */}
              <g transform="translate(250, 140)">
                <circle cx="0" cy="0" r="20" fill="#F59E0B" opacity="0.2" stroke="#F59E0B" strokeWidth="2" />
                <text x="0" y="7" fill="#F59E0B" fontSize="20" textAnchor="middle" fontWeight="700">?</text>
              </g>
            </svg>
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
                  color: prediction === opt.id ? 'white' : '#CBD5E1',
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
        </div>

        {renderBottomNav(prediction ? () => { playSound('success'); nextPhase(); } : undefined, 'Next →', !prediction)}
      </div>
    );
  }

  // PLAY PHASE - Interactive Pressure Drop
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          {/* Educational header */}
          <div style={{
            padding: '16px 24px',
            background: colors.bgCard,
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: '#CBD5E1', margin: 0 }}>
              Explore how pipe diameter and flow rate affect pressure drop in real-world plumbing, HVAC, and industrial piping systems. Engineers use these principles daily to design efficient fluid distribution networks for hospitals, factories, and buildings.
            </p>
          </div>

          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Experiment: Pressure Drop
            </h2>
            <p style={{ ...typo.body, color: '#CBD5E1', textAlign: 'center', marginBottom: '24px' }}>
              Adjust pipe diameter and flow rate to see how pressure drop changes. Observe the squared relationship used in engineering design.
            </p>

          {/* Side-by-side layout: SVG left, controls right */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
            {/* SVG panel */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
              }}>
                {/* Formula display */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.small, color: colors.textMuted, margin: '0 0 4px 0' }}>Darcy-Weisbach Equation</p>
                  <p style={{ ...typo.h3, color: colors.accent, fontFamily: 'monospace', margin: 0 }}>
                    ΔP = f × (L/D) × (ρV²/2)
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <PipeVisualization />
                </div>
              </div>

              {/* Results display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  borderTop: `3px solid ${colors.accent}`,
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{pressureData.velocity.toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Velocity (ft/s)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  borderTop: `3px solid ${colors.warning}`,
                }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{pressureData.pipeDrop.toFixed(2)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Pressure Drop (PSI)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                  borderTop: `3px solid ${pressureData.totalDrop > 2 ? colors.error : colors.success}`,
                }}>
                  <div style={{
                    ...typo.h3,
                    color: pressureData.totalDrop > 2 ? colors.error : colors.success
                  }}>
                    {pressureData.totalDrop > 2 ? 'HIGH' : pressureData.totalDrop > 1 ? 'MED' : 'LOW'}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Drop Rating</div>
                </div>
              </div>
            </div>

            {/* Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
              }}>
                {/* Diameter slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Pipe Diameter</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{pipeDiameter}" ({(pipeDiameter * 25.4).toFixed(0)}mm)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={pipeDiameter}
                    onChange={(e) => setPipeDiameter(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>

                {/* Flow rate slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Flow Rate</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{flowRate} GPM</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={flowRate}
                    onChange={(e) => setFlowRate(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Why it matters */}
              <div style={{
                background: `${colors.accent}11`,
                border: `1px solid ${colors.accent}33`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ ...typo.small, color: '#CBD5E1', margin: 0 }}>
                  <strong style={{ color: colors.accent }}>Why this matters:</strong> Pressure drop
                  determines pump sizing, pipe costs, and energy use in real-world engineering applications. The
                  relationship is non-linear—small diameter increases have dramatic effects on system efficiency.
                </p>
              </div>

              {/* Discovery prompt */}
              {pipeDiameter >= 6 && flowRate <= 40 && (
                <div style={{
                  background: `${colors.success}22`,
                  border: `1px solid ${colors.success}`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                    Notice how a larger diameter dramatically reduces pressure drop—even at the same flow rate!
                  </p>
                </div>
              )}
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

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Next →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Darcy-Weisbach Equation
          </h2>

          {/* Connection to prediction */}
          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: '#CBD5E1', margin: 0 }}>
              <strong style={{ color: colors.success }}>What you observed in the experiment:</strong> As
              you saw, doubling flow rate causes the pressure drop to increase by 4×—not just 2×. This is
              because ΔP ∝ V², the velocity squared relationship. Your prediction was tested by the data!
            </p>
          </div>

          {/* SVG diagram of Darcy-Weisbach */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <svg
              viewBox="0 0 500 200"
              width="100%"
              style={{ maxWidth: '500px', background: colors.bgCard, borderRadius: '12px', display: 'block', margin: '0 auto' }}
            >
              <defs>
                <linearGradient id="rvGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
                <filter id="rvGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* ΔP curve showing V² relationship */}
              <path
                d="M 60 170 Q 160 160 200 120 Q 280 60 420 30"
                fill="none"
                stroke="url(#rvGrad)"
                strokeWidth="3"
                filter="url(#rvGlow)"
              />
              {/* Axis labels */}
              <text x="240" y="195" fill="#FFFFFF" fontSize="12" textAnchor="middle" fontWeight="500">Flow Rate (Q)</text>
              <text x="25" y="105" fill="#FFFFFF" fontSize="12" textAnchor="middle" transform="rotate(-90,25,105)" fontWeight="500">ΔP (PSI)</text>
              {/* Points */}
              <circle cx="200" cy="120" r="6" fill="#3B82F6" />
              <circle cx="280" cy="70" r="6" fill="#10B981" />
              <text x="200" y="108" fill="#FFFFFF" fontSize="11" textAnchor="middle">50 GPM</text>
              <text x="280" y="58" fill="#10B981" fontSize="11" textAnchor="middle">100 GPM</text>
              <text x="340" y="55" fill="#F59E0B" fontSize="11">4× drop!</text>
              {/* Axes */}
              <line x1="50" y1="180" x2="450" y2="180" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
              <line x1="50" y1="180" x2="50" y2="20" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
            </svg>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Formula display */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.h3, color: colors.accent, fontFamily: 'monospace', margin: 0 }}>
                ΔP = f × (L/D) × (ρV²/2)
              </p>
            </div>

            <div style={{ ...typo.body, color: '#CBD5E1' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.accent}`,
                }}>
                  <strong style={{ color: colors.accent }}>f</strong> — Friction factor (depends on roughness and Reynolds number)
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.warning}`,
                }}>
                  <strong style={{ color: colors.warning }}>L/D</strong> — Length divided by diameter (longer pipe or smaller diameter = more drop)
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <strong style={{ color: colors.success }}>V²</strong> — Velocity squared (this is why flow rate matters so much!)
                </div>
              </div>
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
              Key Insights
            </h3>
            <ul style={{ ...typo.body, color: '#CBD5E1', margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Pressure drop ∝ <strong>flow rate²</strong> — double flow = 4× drop</li>
              <li style={{ marginBottom: '8px' }}>Pressure drop ∝ <strong>1/diameter⁵</strong> (roughly) — double diameter = 1/32× drop</li>
              <li style={{ marginBottom: '8px' }}>Pressure drop ∝ <strong>length</strong> — simple linear relationship</li>
              <li>Roughness increases the friction factor f, multiplying all losses</li>
            </ul>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Filter Effects →
            </button>
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Next →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Filter pressure drop stays constant—they are designed for consistent performance' },
      { id: 'b', text: 'Filter pressure drop decreases as dust fills gaps in the media' },
      { id: 'c', text: 'Filter pressure drop increases as dust accumulates, potentially doubling or tripling' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Filter Loading Effect on System Pressure
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            An air filter starts with a clean pressure drop of 0.2" WC. After 6 months of operation, what happens?
          </h2>

          {/* Filter diagram SVG */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <svg
              viewBox="0 0 500 180"
              width="100%"
              style={{ maxWidth: '500px', display: 'block', margin: '0 auto' }}
            >
              <defs>
                <linearGradient id="tpFilterClean" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
                <linearGradient id="tpFilterDirty" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
                <filter id="tpGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Clean filter */}
              <g transform="translate(80, 30)">
                <rect x="0" y="0" width="80" height="100" rx="4" fill="url(#tpFilterClean)" stroke="#94a3b8" strokeWidth="2" />
                <text x="40" y="55" fill="#1e293b" fontSize="12" textAnchor="middle" fontWeight="600">Clean</text>
                <text x="40" y="130" fill="#10B981" fontSize="13" textAnchor="middle" fontWeight="700">0.2&quot; WC</text>
              </g>
              {/* Arrow */}
              <g transform="translate(230, 80)">
                <line x1="0" y1="0" x2="40" y2="0" stroke="#64748b" strokeWidth="2" />
                <polygon points="40,0 30,6 30,-6" fill="#64748b" />
                <text x="20" y="-12" fill="#94a3b8" fontSize="11" textAnchor="middle">6 months</text>
              </g>
              {/* Dirty filter */}
              <g transform="translate(340, 30)">
                <rect x="0" y="0" width="80" height="100" rx="4" fill="url(#tpFilterDirty)" stroke="#64748b" strokeWidth="2" />
                <text x="40" y="50" fill="#FFFFFF" fontSize="12" textAnchor="middle" fontWeight="600">Loaded</text>
                <text x="40" y="65" fill="#94a3b8" fontSize="11" textAnchor="middle">with dust</text>
                <text x="40" y="130" fill="#F59E0B" fontSize="13" textAnchor="middle" fontWeight="700">? WC</text>
              </g>
            </svg>
          </div>

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
                  color: twistPrediction === opt.id ? 'white' : '#CBD5E1',
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
                See Filter Effects →
              </button>
            )}
          </div>
        </div>

        {renderBottomNav(twistPrediction ? () => { playSound('success'); nextPhase(); } : undefined, 'Next →', !twistPrediction)}
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

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          {/* Educational header */}
          <div style={{
            padding: '16px 24px',
            background: colors.bgCard,
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: '#CBD5E1', margin: 0 }}>
              Experiment with all system parameters to observe their combined effects. Notice how filter
              loading adds to total pressure drop, and roughness multiplies friction losses.
              Try different combinations to find the optimal balance.
            </p>
          </div>

          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Complete System Experiment
            </h2>
            <p style={{ ...typo.body, color: '#CBD5E1', textAlign: 'center', marginBottom: '24px' }}>
              Explore how all factors combine: diameter, length, roughness, and filter loading
            </p>

          {/* Side-by-side layout: SVG left, controls right */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
            {/* SVG panel */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <PipeVisualization />
                </div>
              </div>

              {/* Results breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{pressureData.pipeDrop.toFixed(2)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Pipe Drop (PSI)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{pressureData.filterDrop.toFixed(2)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Filter Drop (PSI)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: pressureData.totalDrop > 3 ? colors.error : colors.success
                  }}>
                    {pressureData.totalDrop.toFixed(2)}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Total Drop (PSI)</div>
                </div>
              </div>

              {/* Warning for high drop */}
              {pressureData.totalDrop > 3 && (
                <div style={{
                  background: `${colors.error}22`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.small, color: colors.error, margin: 0 }}>
                    Warning: High pressure drop! Consider larger pipes, lower flow, or filter replacement.
                  </p>
                </div>
              )}
            </div>

            {/* Controls panel */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
              }}>
                {/* All sliders - stacked in 280px panel */}
                {/* Diameter */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Pipe Diameter</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{pipeDiameter}"</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={pipeDiameter}
                    onChange={(e) => setPipeDiameter(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>

                {/* Flow rate */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Flow Rate</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{flowRate} GPM</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={flowRate}
                    onChange={(e) => setFlowRate(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>

                {/* Length */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Pipe Length</span>
                    <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{pipeLength} ft</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="200"
                    step="25"
                    value={pipeLength}
                    onChange={(e) => setPipeLength(parseInt(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>

                {/* Roughness */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Pipe Roughness</span>
                    <span style={{ ...typo.small, color: roughness > 2 ? colors.error : colors.success, fontWeight: 600 }}>
                      {roughness <= 1.5 ? 'Smooth' : roughness <= 2.5 ? 'Moderate' : 'Rough'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.5"
                    value={roughness}
                    onChange={(e) => setRoughness(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>

                {/* Filter loading slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Filter Loading</span>
                    <span style={{
                      ...typo.small,
                      color: filterLoading > 0.7 ? colors.error : filterLoading > 0.4 ? colors.warning : colors.success,
                      fontWeight: 600
                    }}>
                      {(filterLoading * 100).toFixed(0)}% loaded
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filterLoading}
                    onChange={(e) => setFilterLoading(parseFloat(e.target.value))}
                    style={{ width: '100%', height: '20px', borderRadius: '4px', cursor: 'pointer', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand System Design →
            </button>
          </div>
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Next →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            System Design Principles
          </h2>

          {/* SVG diagram for twist review */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <svg
              viewBox="0 0 500 180"
              width="100%"
              style={{ maxWidth: '500px', background: colors.bgCard, borderRadius: '12px', display: 'block', margin: '0 auto' }}
            >
              <defs>
                <linearGradient id="trGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
                <filter id="trGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Filter loading curve */}
              <path
                d="M 60 160 L 120 145 L 200 130 L 280 100 L 360 70 L 420 40"
                fill="none"
                stroke="url(#trGrad)"
                strokeWidth="3"
                filter="url(#trGlow)"
              />
              {/* Axis */}
              <line x1="50" y1="170" x2="450" y2="170" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
              <line x1="50" y1="170" x2="50" y2="20" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
              {/* Labels */}
              <text x="250" y="190" fill="#FFFFFF" fontSize="12" textAnchor="middle">Filter Age (months)</text>
              <text x="30" y="95" fill="#FFFFFF" fontSize="11" textAnchor="middle" transform="rotate(-90,30,95)">ΔP (WC)</text>
              {/* Key points */}
              <circle cx="60" cy="160" r="5" fill="#10B981" />
              <circle cx="420" cy="40" r="5" fill="#EF4444" />
              <text x="75" y="155" fill="#10B981" fontSize="11">Clean: 0.2"</text>
              <text x="380" y="35" fill="#EF4444" fontSize="11">Loaded: 0.6"</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📏</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Size Pipes Generously</h3>
              </div>
              <p style={{ ...typo.body, color: '#CBD5E1', margin: 0 }}>
                The dramatic effect of diameter (roughly 5th power) means slightly larger pipes can
                drastically reduce pump energy costs. A <span style={{ color: colors.success }}>20%
                larger diameter can reduce pressure drop by 60%</span>.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Plan for Filter Loading</h3>
              </div>
              <p style={{ ...typo.body, color: '#CBD5E1', margin: 0 }}>
                Design systems with <span style={{ color: colors.warning }}>2-3× the clean filter
                pressure drop</span> as headroom. Filter pressure monitoring prevents surprises and
                optimizes replacement schedules.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Key Takeaway</h3>
              </div>
              <p style={{ ...typo.body, color: '#CBD5E1', margin: 0 }}>
                Pressure drop is non-negotiable physics. Understanding it lets you design systems
                that are efficient, reliable, and cost-effective over their entire lifespan.
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
        </div>

        {renderBottomNav(() => { playSound('success'); nextPhase(); }, 'Next →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    const markCurrentAndNext = (idx: number) => {
      const newCompleted = [...completedApps];
      newCompleted[idx] = true;
      setCompletedApps(newCompleted);
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Transfer Applications
            </h2>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
              App {selectedApp + 1} of {realWorldApps.length} — {completedApps.filter(c => c).length} completed
            </p>

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
                  markCurrentAndNext(i);
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

            <p style={{ ...typo.body, color: '#CBD5E1', marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Pressure Drop Applies:
              </h4>
              <p style={{ ...typo.small, color: '#CBD5E1', margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
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

            {/* Got It button per app */}
            <button
              onClick={() => {
                playSound('click');
                markCurrentAndNext(selectedApp);
                // Move to next app if not last
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                  markCurrentAndNext(selectedApp + 1);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
              }}
            >
              Got It — Next Application →
            </button>
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

        {renderBottomNav(allAppsCompleted ? () => { playSound('success'); nextPhase(); } : undefined, 'Next →', !allAppsCompleted)}
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
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderProgressBar()}

          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '0 24px' }}>
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
            <p style={{ ...typo.body, color: '#CBD5E1', marginBottom: '16px' }}>
              Score: {testScore * 10}% — {passed ? 'You\'ve mastered Pressure Drop in Fluid Systems!' : 'Review the concepts and try again.'}
            </p>

            {/* Answer review */}
            <div style={{ textAlign: 'left', marginBottom: '32px' }}>
              {testQuestions.map((q, i) => {
                const correct = q.options.find(o => o.correct)?.id;
                const answered = testAnswers[i];
                const isCorrect = answered === correct;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    marginBottom: '6px',
                    borderRadius: '8px',
                    background: isCorrect ? `${colors.success}22` : `${colors.error}22`,
                    border: `1px solid ${isCorrect ? colors.success : colors.error}44`,
                  }}>
                    <span style={{ fontSize: '16px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <span style={{ ...typo.small, color: '#CBD5E1' }}>Q{i + 1}: {isCorrect ? 'Correct' : `Incorrect (Answer: ${correct?.toUpperCase()})`}</span>
                  </div>
                );
              })}
            </div>

            {passed ? (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => goToPhase('hook')}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: '#CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  Play Again
                </button>
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={primaryButtonStyle}
                >
                  Complete Lesson →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => goToPhase('hook')}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: '#CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                  }}
                  style={primaryButtonStyle}
                >
                  Review &amp; Retry
                </button>
              </div>
              )}
            </div>
          </div>
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: '#CBD5E1' }}>
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
            <p style={{ ...typo.small, color: '#CBD5E1', margin: 0 }}>
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
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}33` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : '#CBD5E1',
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
                  color: '#CBD5E1',
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
                Next
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
        </div>

        {renderBottomNav()}
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
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '100px',
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
          Pressure Drop Master!
        </h1>

        <p style={{ ...typo.body, color: '#CBD5E1', maxWidth: '500px', marginBottom: '32px' }}>
          Congratulations! You now understand how pressure drop affects fluid system design and can
          apply this knowledge to create efficient, reliable systems.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Mastery Achieved:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Darcy-Weisbach equation fundamentals',
              'Flow rate squared relationship (ΔP ∝ V²)',
              'Dramatic effect of pipe diameter (1/D⁵)',
              'Filter loading and maintenance impact',
              'Real-world system design principles',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: '#CBD5E1' }}>{item}</span>
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
              color: '#CBD5E1',
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

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default PressureDropRenderer;
