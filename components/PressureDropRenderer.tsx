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
    description: 'Hospitals require precise pressure relationships between spaces—operating rooms positive to corridors, isolation rooms negative. Understanding pressure drop is essential to maintain these life-critical pressure differentials.',
    connection: 'Every duct run, filter, and fitting contributes to system pressure drop. HVAC engineers must calculate total system pressure drop to size fans that can maintain required airflows and pressure differentials under all filter loading conditions.',
    howItWorks: 'Supply and exhaust fans are sized with significant safety margins. Pressure drop monitoring on filters triggers replacements. Variable speed drives adjust fan speeds to maintain airflows as filter resistance increases over time.',
    stats: [
      { value: '15-25 ACH', label: 'OR air changes/hour', icon: '🔄' },
      { value: '+0.01"', label: 'Typical OR pressure', icon: '📊' },
      { value: '99.97%', label: 'HEPA efficiency', icon: '🛡️' }
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
    description: 'Chemical plants, refineries, and manufacturing facilities move massive quantities of fluids through miles of piping. Pressure drop calculations determine pump sizing, pipe diameters, and operating costs that can reach millions of dollars annually.',
    connection: 'The Darcy-Weisbach equation governs all industrial piping design. Engineers balance capital costs (larger pipes cost more) against operating costs (smaller pipes need bigger pumps). Optimal designs minimize lifecycle costs.',
    howItWorks: 'Process engineers use sophisticated software to model pressure drop through entire systems, accounting for fluid properties, temperatures, pipe materials, fittings, and elevation changes. Pumps are sized to overcome total system pressure drop.',
    stats: [
      { value: '$5M+', label: 'Annual pumping costs', icon: '💰' },
      { value: '20-40%', label: 'Energy savings potential', icon: '⚡' },
      { value: '1000s mi', label: 'Pipeline lengths', icon: '📏' }
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
    description: 'Commercial buildings use extensive ductwork networks to deliver conditioned air. Pressure drop calculations determine duct sizes, fan selections, and energy consumption. Poor design leads to uncomfortable spaces and wasted energy.',
    connection: 'Every turn, damper, diffuser, and straight duct section contributes to total system pressure drop. Engineers use pressure drop to balance airflows, ensure proper ventilation rates, and minimize fan energy consumption.',
    howItWorks: 'Design starts with required airflows, then ducts are sized to limit velocity and pressure drop. The system curve (pressure vs. flow) is plotted against fan curves to find the operating point. VAV systems adjust dynamically.',
    stats: [
      { value: '0.08"/100ft', label: 'Typical design friction', icon: '📐' },
      { value: '30-50%', label: 'HVAC energy from fans', icon: '💨' },
      { value: '15-20cfm', label: 'Per person fresh air', icon: '👤' }
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
    description: 'From skyscrapers to hospitals, plumbing systems must deliver adequate water pressure to every fixture. Pressure drop calculations ensure the top floor shower works as well as the ground floor, even during peak demand.',
    connection: 'Water velocity, pipe material, fittings, and elevation all contribute to pressure loss. Plumbing engineers size pipes to limit velocity (noise and erosion) while maintaining adequate pressure at the furthest fixtures.',
    howItWorks: 'Engineers calculate pressure drop from the water main to each fixture, accounting for static head (elevation), friction losses, and fitting losses. Booster pumps are added when city pressure is insufficient.',
    stats: [
      { value: '20-80 psi', label: 'Fixture pressure range', icon: '💧' },
      { value: '8 fps', label: 'Max velocity (copper)', icon: '⚡' },
      { value: '4-8 psi', label: 'Typical floor loss', icon: '📉' }
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
    twist_predict: 'Filter Effects',
    twist_play: 'System Lab',
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

  // Calculate pressure drop using simplified Darcy-Weisbach
  const calculatePressureDrop = useCallback(() => {
    // Simplified calculation for educational purposes
    // ΔP ∝ f × (L/D) × (ρV²/2)
    // V ∝ Q/D² for circular pipe

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

  // Pipe System Visualization
  const PipeVisualization = ({ showFlow = true, showPressure = true }) => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 200 : 240;
    const pipeY = height / 2;
    const pipeHeight = Math.max(20, pipeDiameter * 5);

    // Animated flow particles
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const offset = ((animationFrame * flowRate / 50 * 2) + i * 50) % (width - 80);
      const yOffset = Math.sin((animationFrame + i * 30) * 0.1) * (pipeHeight / 4 - 2);
      particles.push({ x: 40 + offset, y: pipeY + yOffset, opacity: 0.6 + Math.random() * 0.4 });
    }

    // Pressure gradient (higher at inlet, lower at outlet)
    const pressureColor = (x: number) => {
      const ratio = x / (width - 80);
      const r = Math.round(59 + ratio * 180);
      const g = Math.round(130 - ratio * 80);
      const b = Math.round(246 - ratio * 150);
      return `rgb(${r},${g},${b})`;
    };

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Pressure gauge at inlet */}
        <g transform="translate(30, 30)">
          <circle cx="0" cy="0" r="18" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
          <text x="0" y="5" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="600">
            {(pressureData.totalDrop + 30).toFixed(1)}
          </text>
          <text x="0" y="38" fill={colors.textMuted} fontSize="9" textAnchor="middle">PSI in</text>
        </g>

        {/* Pressure gauge at outlet */}
        <g transform={`translate(${width - 30}, 30)`}>
          <circle cx="0" cy="0" r="18" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="2" />
          <text x="0" y="5" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="600">
            30.0
          </text>
          <text x="0" y="38" fill={colors.textMuted} fontSize="9" textAnchor="middle">PSI out</text>
        </g>

        {/* Pipe body with gradient */}
        <defs>
          <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.success} />
          </linearGradient>
          <linearGradient id="pipeShading" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
        </defs>

        {/* Pipe outer */}
        <rect
          x="40"
          y={pipeY - pipeHeight / 2 - 4}
          width={width - 80}
          height={pipeHeight + 8}
          rx="4"
          fill={colors.border}
        />

        {/* Pipe inner with pressure gradient */}
        <rect
          x="44"
          y={pipeY - pipeHeight / 2}
          width={width - 88}
          height={pipeHeight}
          rx="2"
          fill="url(#pipeGradient)"
          opacity="0.3"
        />

        {/* Pipe shading for 3D effect */}
        <rect
          x="44"
          y={pipeY - pipeHeight / 2}
          width={width - 88}
          height={pipeHeight}
          rx="2"
          fill="url(#pipeShading)"
        />

        {/* Roughness visualization (inner texture) */}
        {roughness > 1.5 && (
          <g>
            {Array.from({ length: Math.floor((width - 88) / 15) }, (_, i) => (
              <rect
                key={i}
                x={44 + i * 15}
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
            r={3 + flowRate / 50}
            fill="white"
            opacity={p.opacity * (flowRate / 100)}
          />
        ))}

        {/* Pressure drop indicator bar */}
        {showPressure && (
          <g>
            <rect
              x="44"
              y={height - 35}
              width={width - 88}
              height="8"
              rx="4"
              fill={colors.bgSecondary}
            />
            <rect
              x="44"
              y={height - 35}
              width={Math.min((pressureData.totalDrop / 5) * (width - 88), width - 88)}
              height="8"
              rx="4"
              fill={pressureData.totalDrop > 3 ? colors.error : pressureData.totalDrop > 1.5 ? colors.warning : colors.success}
            />
            <text x={width / 2} y={height - 10} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
              Pressure Drop: {pressureData.totalDrop.toFixed(2)} PSI
            </text>
          </g>
        )}

        {/* Diameter indicator */}
        <g transform={`translate(${width / 2}, ${pipeY})`}>
          <line x1="-30" y1={-pipeHeight / 2 - 8} x2="-30" y2={pipeHeight / 2 + 8} stroke={colors.textMuted} strokeWidth="1" />
          <line x1="-35" y1={-pipeHeight / 2 - 8} x2="-25" y2={-pipeHeight / 2 - 8} stroke={colors.textMuted} strokeWidth="1" />
          <line x1="-35" y1={pipeHeight / 2 + 8} x2="-25" y2={pipeHeight / 2 + 8} stroke={colors.textMuted} strokeWidth="1" />
          <text x="-45" y="4" fill={colors.textMuted} fontSize="10" textAnchor="end">{pipeDiameter}"</text>
        </g>
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
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Double the pipe diameter and pressure drop doesn't halve—it drops to <span style={{ color: colors.success }}>1/16th</span>. This fifth-power relationship governs everything from hospital ventilation to oil pipelines."
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
            "Understanding pressure drop is the key to designing efficient fluid systems. Get it wrong, and you'll waste energy, money, and compromise performance."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Fluid Systems Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Pressure Drop →
        </button>

        {renderNavDots()}
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
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A pipe system has a certain pressure drop at 50 GPM. What happens if you double the flow rate to 100 GPM?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {/* Static SVG diagram */}
            <svg width={isMobile ? 340 : 500} height={200} style={{ margin: '0 auto', display: 'block' }}>
              {/* Scenario 1: 50 GPM */}
              <g transform="translate(40, 50)">
                <rect x="0" y="0" width="60" height="30" rx="4" fill={colors.accent} opacity="0.3" stroke={colors.accent} strokeWidth="2" />
                <text x="30" y="20" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">Pipe</text>
                <text x="30" y="50" fill={colors.textMuted} fontSize="10" textAnchor="middle">50 GPM</text>
                <text x="30" y="65" fill={colors.accent} fontSize="10" textAnchor="middle">1 PSI drop</text>
              </g>

              {/* Arrow */}
              <g transform={`translate(${isMobile ? 180 : 240}, 65)`}>
                <line x1="0" y1="0" x2="40" y2="0" stroke={colors.textMuted} strokeWidth="2" />
                <polygon points="40,0 32,4 32,-4" fill={colors.textMuted} />
              </g>

              {/* Scenario 2: 100 GPM */}
              <g transform={`translate(${isMobile ? 240 : 300}, 50)`}>
                <rect x="0" y="0" width="60" height="30" rx="4" fill={colors.accent} opacity="0.3" stroke={colors.accent} strokeWidth="2" />
                <text x="30" y="20" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="600">Pipe</text>
                <text x="30" y="50" fill={colors.textMuted} fontSize="10" textAnchor="middle">100 GPM</text>
                <text x="30" y="65" fill={colors.warning} fontSize="10" textAnchor="middle">? PSI drop</text>
              </g>

              {/* Question mark */}
              <g transform={`translate(${isMobile ? 210 : 270}, 120)`}>
                <circle cx="0" cy="0" r="15" fill={colors.warning} opacity="0.2" stroke={colors.warning} strokeWidth="2" />
                <text x="0" y="6" fill={colors.warning} fontSize="18" textAnchor="middle" fontWeight="700">?</text>
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
        </div>

        {renderNavDots()}
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
          {/* Educational header with observation guidance */}
          <div style={{
            padding: '16px 24px',
            background: colors.bgCard,
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Watch how pressure drop changes as you adjust pipe diameter and flow rate. Notice that larger diameters dramatically reduce pressure drop,
              while increasing flow rate causes the drop to rise quickly. Try to achieve the lowest pressure drop possible.
            </p>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Explore Pressure Drop
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust pipe diameter and flow rate to see how pressure drop changes
            </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
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

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PipeVisualization />
            </div>

            {/* Diameter slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Pipe Diameter</span>
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
                  accentColor: colors.accent,
                  touchAction: 'pan-y',
                }}
              />
            </div>

            {/* Flow rate slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Flow Rate</span>
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
                  accentColor: colors.accent,
                  touchAction: 'pan-y',
                }}
              />
            </div>

            {/* Results display */}
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
                borderTop: `3px solid ${colors.accent}`,
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{pressureData.velocity.toFixed(1)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Velocity (ft/s)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                borderTop: `3px solid ${colors.warning}`,
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{pressureData.pipeDrop.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Pressure Drop (PSI)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                borderTop: `3px solid ${pressureData.totalDrop > 2 ? colors.error : colors.success}`,
              }}>
                <div style={{
                  ...typo.h3,
                  color: pressureData.totalDrop > 2 ? colors.error : colors.success
                }}>
                  {pressureData.totalDrop > 2 ? 'HIGH' : pressureData.totalDrop > 1 ? 'MODERATE' : 'LOW'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Drop Rating</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {pipeDiameter >= 6 && flowRate <= 40 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how a larger diameter dramatically reduces pressure drop—even at the same flow rate!
              </p>
            </div>
          )}

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

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.accent}`,
                }}>
                  <strong style={{ color: colors.accent }}>f</strong> - Friction factor (depends on roughness and Reynolds number)
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.warning}`,
                }}>
                  <strong style={{ color: colors.warning }}>L/D</strong> - Length divided by diameter (longer pipe or smaller diameter = more drop)
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <strong style={{ color: colors.success }}>V²</strong> - Velocity squared (this is why flow rate matters so much!)
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
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Pressure drop ∝ <strong>flow rate²</strong> — double flow = 4× drop</li>
              <li style={{ marginBottom: '8px' }}>Pressure drop ∝ <strong>1/diameter⁵</strong> (roughly) — double diameter = 1/32× drop</li>
              <li style={{ marginBottom: '8px' }}>Pressure drop ∝ <strong>length</strong> — simple linear relationship</li>
              <li>Roughness increases the friction factor, multiplying all losses</li>
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

        {renderNavDots()}
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
              New Variable: Filter Loading
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            An air filter starts with a clean pressure drop of 0.2" WC. After 6 months of operation, what happens to the pressure drop?
          </h2>

          {/* Filter diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '100px',
                  background: 'linear-gradient(to bottom, #ddd 0%, #fff 100%)',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ color: colors.textMuted, fontSize: '12px' }}>Clean</span>
                </div>
                <p style={{ ...typo.small, color: colors.success, marginTop: '8px' }}>0.2" WC</p>
              </div>
              <div style={{ fontSize: '32px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '100px',
                  background: 'linear-gradient(to bottom, #888 0%, #aaa 100%)',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ color: colors.textPrimary, fontSize: '12px' }}>Loaded</span>
                </div>
                <p style={{ ...typo.small, color: colors.warning, marginTop: '8px' }}>? WC</p>
              </div>
            </div>
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
                See Filter Effects →
              </button>
            )}
          </div>
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

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          {/* Educational header with observation guidance */}
          <div style={{
            padding: '16px 24px',
            background: colors.bgCard,
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Experiment with all system parameters to understand their combined effects. Notice how filter loading adds to total pressure drop,
              and how roughness multiplies the friction losses. Try different combinations to find the optimal balance.
            </p>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Complete System Pressure Drop
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Explore how all factors combine: diameter, length, roughness, and filter loading
            </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <PipeVisualization />
            </div>

            {/* All sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Diameter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Pipe Diameter</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{pipeDiameter}"</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={pipeDiameter}
                  onChange={(e) => setPipeDiameter(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>

              {/* Flow rate */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Flow Rate</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{flowRate} GPM</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={flowRate}
                  onChange={(e) => setFlowRate(parseInt(e.target.value))}
                  style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>

              {/* Length */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Pipe Length</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{pipeLength} ft</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="200"
                  step="25"
                  value={pipeLength}
                  onChange={(e) => setPipeLength(parseInt(e.target.value))}
                  style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>

              {/* Roughness */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Pipe Roughness</span>
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
                  style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Filter loading slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Filter Loading</span>
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
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Results breakdown */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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
                marginTop: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.small, color: colors.error, margin: 0 }}>
                  Warning: High pressure drop! Consider larger pipes, lower flow, or filter replacement.
                </p>
              </div>
            )}
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand System Design →
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            System Design Principles
          </h2>

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
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The dramatic effect of diameter (roughly 5th power) means slightly larger pipes can drastically reduce pump energy costs. A <span style={{ color: colors.success }}>20% larger diameter can reduce pressure drop by 60%</span>.
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
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Design systems with <span style={{ color: colors.warning }}>2-3× the clean filter pressure drop</span> as headroom. Filter pressure monitoring prevents surprises and optimizes replacement schedules.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚖️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Balance Capital vs Operating Cost</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Larger pipes cost more upfront but save pump energy forever. <span style={{ color: colors.accent }}>Lifecycle cost analysis</span> often favors larger pipes, especially for systems running continuously.
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
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Pressure drop is non-negotiable physics. Understanding it lets you design systems that are efficient, reliable, and cost-effective over their entire lifespan.
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

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
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
                How Pressure Drop Applies:
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
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered Pressure Drop in Fluid Systems!'
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
          Pressure Drop Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how pressure drop affects fluid system design and can apply this knowledge to create efficient, reliable systems.
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
              'Darcy-Weisbach equation fundamentals',
              'Flow rate squared relationship',
              'Dramatic effect of pipe diameter',
              'Filter loading and maintenance',
              'Real-world system design principles',
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

export default PressureDropRenderer;
