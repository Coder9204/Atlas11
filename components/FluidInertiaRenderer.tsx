/**
 * FLUID INERTIA RENDERER
 *
 * Complete physics game demonstrating fluid inertia - the tendency of fluids
 * to resist changes in their flow state due to their mass and momentum.
 *
 * FEATURES:
 * - Interactive visualization of fluid momentum and inertia
 * - Demonstrates water hammer, shock absorption, and flow dynamics
 * - Rich transfer phase with real-world applications
 * - Full compliance with GAME_EVALUATION_SYSTEM.md
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ============================================================
// THEME COLORS
// ============================================================

const colors = {
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  bgGradientStart: '#1e1b4b',
  bgGradientEnd: '#0f172a',

  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',

  accent: '#06b6d4',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',

  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

  border: '#334155',
  borderLight: '#475569',

  // Physics colors
  fluid: '#3b82f6',
  fluidLight: '#60a5fa',
  pressure: '#ef4444',
  pressureLight: '#f87171',
  flow: '#22c55e',
  flowLight: '#4ade80',
  damping: '#f59e0b',
  dampingLight: '#fbbf24',
};

const GAME_ID = 'fluid_inertia';

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const testQuestions = [
  {
    scenario: "You quickly close a water faucet and hear a loud banging noise in the pipes.",
    question: "What causes this 'water hammer' effect?",
    options: [
      { id: 'air', label: "Air bubbles collapsing in the pipes" },
      { id: 'inertia', label: "The moving water's inertia creates a pressure spike when suddenly stopped", correct: true },
      { id: 'vibration', label: "The faucet handle vibrating" },
      { id: 'thermal', label: "Thermal expansion of the pipes" }
    ],
    explanation: "Water hammer occurs because moving water has momentum (mass x velocity). When flow suddenly stops, the water's inertia creates a massive pressure wave that travels back through the pipes, causing the banging sound."
  },
  {
    scenario: "A car's shock absorber uses oil-filled cylinders to provide a smooth ride.",
    question: "How does fluid inertia help absorb bumps?",
    options: [
      { id: 'compression', label: "The oil compresses and springs back" },
      { id: 'resistance', label: "Fluid inertia and viscous drag resist rapid piston movement", correct: true },
      { id: 'heat', label: "The oil absorbs heat from the road" },
      { id: 'lubrication', label: "The oil just lubricates moving parts" }
    ],
    explanation: "When a wheel hits a bump, the piston tries to move quickly through the oil. The fluid's inertia and viscous resistance oppose rapid motion, absorbing and dissipating the energy gradually instead of all at once."
  },
  {
    scenario: "Blood flows continuously through your arteries in a pulsatile manner.",
    question: "Why doesn't blood stop flowing between heartbeats?",
    options: [
      { id: 'gravity', label: "Gravity keeps it moving downward" },
      { id: 'inertia', label: "Blood's inertia maintains flow, aided by elastic artery walls", correct: true },
      { id: 'suction', label: "The heart creates suction to pull blood back" },
      { id: 'valves', label: "Valves push the blood forward" }
    ],
    explanation: "The blood's inertia keeps it moving forward between heartbeats. Elastic artery walls store energy during systole and release it during diastole, working with fluid inertia to maintain continuous flow."
  },
  {
    scenario: "Engineers are designing a long-distance oil pipeline.",
    question: "Why do pipelines need careful startup and shutdown procedures?",
    options: [
      { id: 'temperature', label: "Oil needs time to reach operating temperature" },
      { id: 'inertia', label: "Sudden flow changes create dangerous pressure surges from fluid inertia", correct: true },
      { id: 'pollution', label: "To prevent oil spills at connections" },
      { id: 'pumps', label: "Pumps need time to warm up" }
    ],
    explanation: "Millions of gallons of oil moving at high speed have enormous inertia. Sudden stops or starts create pressure waves that can rupture pipes. Gradual ramp-up/down procedures manage fluid inertia safely."
  },
  {
    scenario: "You're pouring water from a pitcher and suddenly stop.",
    question: "Why does some water continue to flow out after you stop pouring?",
    options: [
      { id: 'gravity', label: "Gravity continues pulling the water" },
      { id: 'inertia', label: "The water's inertia keeps it moving in the original direction", correct: true },
      { id: 'suction', label: "Air pressure pushes remaining water out" },
      { id: 'dripping', label: "Surface tension causes dripping" }
    ],
    explanation: "Water already in motion has momentum due to its inertia. Even when you stop tilting, the water's inertia continues carrying it forward until friction and gravity overcome this momentum."
  },
  {
    scenario: "A hydraulic brake system uses fluid to transmit force from the pedal to the brakes.",
    question: "Why do hydraulic brakes feel 'spongy' with air in the lines?",
    options: [
      { id: 'compression', label: "Air compresses instead of transmitting force instantly" },
      { id: 'inertia', label: "Air bubbles disrupt the fluid inertia needed for quick response", correct: true },
      { id: 'leak', label: "Air causes the fluid to leak out" },
      { id: 'corrosion', label: "Air corrodes the brake lines" }
    ],
    explanation: "Hydraulic systems rely on fluid inertia to transmit force rapidly. Air bubbles compress and absorb energy, disrupting the inertial coupling between pedal and brakes, making response sluggish and unpredictable."
  },
  {
    scenario: "A tsunami approaches the coast after an undersea earthquake.",
    question: "What role does fluid inertia play in tsunami formation?",
    options: [
      { id: 'speed', label: "Inertia makes the wave move faster" },
      { id: 'momentum', label: "The massive water column's inertia carries enormous momentum that devastates coastlines", correct: true },
      { id: 'height', label: "Inertia makes waves taller" },
      { id: 'frequency', label: "Inertia determines wave frequency" }
    ],
    explanation: "A tsunami involves the entire water column moving, not just surface waves. This enormous mass of water carries tremendous momentum due to inertia, which is why even slow-moving tsunamis cause catastrophic damage."
  },
  {
    scenario: "Fuel injectors spray precisely timed bursts of fuel into an engine.",
    question: "How does fluid inertia affect fuel injection timing?",
    options: [
      { id: 'delay', label: "Fuel inertia causes response delay between signal and spray", correct: true },
      { id: 'pressure', label: "Inertia increases fuel pressure" },
      { id: 'atomization', label: "Inertia only affects droplet size" },
      { id: 'irrelevant', label: "Inertia doesn't affect injection timing" }
    ],
    explanation: "When the injector opens, fuel must accelerate from rest. Its inertia causes a slight delay before flow reaches full rate. Engineers account for this 'hydraulic delay' in injection timing calculations."
  },
  {
    scenario: "An artificial heart pump must maintain steady blood flow.",
    question: "Why do some heart pumps use continuous flow instead of pulsatile?",
    options: [
      { id: 'simpler', label: "Continuous pumps are simpler to build" },
      { id: 'inertia', label: "Continuous flow leverages fluid inertia for smoother, more efficient operation", correct: true },
      { id: 'quieter', label: "Continuous pumps are quieter" },
      { id: 'cost', label: "Continuous pumps are cheaper" }
    ],
    explanation: "Continuous flow pumps work with blood's inertia rather than against it. Once moving, the blood's inertia helps maintain flow with less energy. Pulsatile pumps must repeatedly overcome inertia, requiring more power."
  },
  {
    scenario: "A dam's spillway must handle emergency water releases safely.",
    question: "Why are spillway designs critical for dam safety?",
    options: [
      { id: 'erosion', label: "To prevent erosion of the dam base" },
      { id: 'inertia', label: "To manage the enormous momentum of high-velocity water flow", correct: true },
      { id: 'fish', label: "To protect fish populations" },
      { id: 'aesthetics', label: "For visual appearance" }
    ],
    explanation: "Water exiting a spillway at high velocity has tremendous momentum due to its inertia. Spillway designs must gradually redirect and dissipate this momentum to prevent structural damage and downstream flooding."
  }
];

const realWorldApps = [
  {
    icon: '🚗',
    title: 'Hydraulic Shock Absorbers',
    short: 'Automotive Suspension',
    tagline: 'Transforming bumps into smooth rides through fluid resistance',
    description: 'Hydraulic shock absorbers are masterpieces of fluid dynamics engineering that exploit fluid inertia to convert violent road impacts into controlled, comfortable motion. Inside each shock absorber, a piston forces oil through precisely calibrated orifices. The oil\'s inertia resists rapid displacement, creating a damping force that absorbs kinetic energy from bumps. This energy is converted to heat and gradually dissipated, preventing the violent bouncing that would occur with springs alone. Modern adaptive dampers can electronically adjust orifice size in milliseconds, optimizing ride comfort and handling in real-time.',
    connection: 'When a wheel hits a bump, the suspension compresses rapidly. The piston inside the shock absorber tries to push oil aside, but the fluid\'s inertia (its resistance to acceleration) creates a reaction force proportional to how fast the piston moves. This is described by F = ma applied to fluid dynamics — the fluid\'s mass resists acceleration, absorbing impact energy. The faster the impact, the greater the resistance, providing progressive damping exactly when needed most.',
    howItWorks: 'A piston with calibrated valves moves through oil-filled chambers. During compression (bump), oil flows through small orifices, and its inertia creates resistance. During extension (rebound), different valve settings control the return rate. Twin-tube designs separate the working fluid from a gas-charged reservoir that compensates for rod displacement. Monotube designs use a floating piston to separate oil from pressurized nitrogen gas, providing faster response and better heat dissipation for performance applications.',
    stats: [
      { value: '2,000+ N', label: 'Peak Damping Force' },
      { value: '50 ms', label: 'Adaptive Response Time' },
      { value: '100,000 mi', label: 'Typical Lifespan' }
    ],
    examples: [
      'Bilstein B8 performance shocks use monotube design with precise fluid inertia tuning for sports cars',
      'Bose electromagnetic suspension predicts bumps and uses fluid dynamics for near-perfect isolation',
      'Fox Racing shocks in off-road vehicles use position-sensitive damping for varied terrain',
      'Mercedes Magic Body Control scans the road ahead and pre-adjusts damping using fluid inertia principles'
    ],
    companies: [
      'ZF Friedrichshafen',
      'Tenneco (Monroe)',
      'Bilstein',
      'KYB Corporation',
      'FOX Factory'
    ],
    futureImpact: 'Next-generation magnetorheological dampers use magnetic particles suspended in fluid to change viscosity instantaneously, providing unprecedented control over fluid inertia effects. Active suspension systems are evolving toward fully predictive designs using AI and road-scanning sensors to pre-position dampers before impacts occur, potentially eliminating felt road imperfections entirely while maintaining perfect vehicle control.',
    color: '#3B82F6'
  },
  {
    icon: '🔧',
    title: 'Water Hammer Prevention',
    short: 'Plumbing Systems',
    tagline: 'Protecting pipes from the destructive force of suddenly stopped water',
    description: 'Water hammer is a dramatic demonstration of fluid inertia that can destroy plumbing systems. When flowing water is suddenly stopped — by a quick-closing valve, pump shutdown, or even a washing machine — the water\'s momentum must go somewhere. This creates a pressure spike that can exceed 10 times the normal operating pressure, producing the characteristic banging sound and potentially rupturing pipes, damaging valves, and destroying equipment. Modern plumbing systems incorporate multiple strategies to manage this inertial energy, from simple air chambers to sophisticated surge arrestors.',
    connection: 'The physics is straightforward: water flowing at velocity v has momentum p = mv. When flow stops instantaneously, this momentum creates a pressure wave traveling at the speed of sound in water (~1,400 m/s). The pressure increase is given by the Joukowsky equation: ΔP = ρcv, where ρ is water density, c is wave speed, and v is flow velocity. For typical household flows, this can mean pressure spikes of 50-100 psi above normal, concentrated in a fraction of a second.',
    howItWorks: 'Hammer arrestors contain a gas-filled chamber separated from the water by a piston or diaphragm. When water hammer occurs, the suddenly stopped water compresses the gas cushion instead of creating a sharp pressure spike — the gas\'s compressibility absorbs the fluid\'s kinetic energy gradually. Slow-closing valves prevent hammer by giving water time to decelerate gently. In large systems, surge tanks and pressure relief valves provide additional protection. Pipeline systems may use check valves with dashpots to control closure speed.',
    stats: [
      { value: '1,400 m/s', label: 'Pressure Wave Speed' },
      { value: '10x Normal', label: 'Peak Pressure Spike' },
      { value: '$2B/year', label: 'Water Damage Costs' }
    ],
    examples: [
      'Commercial dishwashers use solenoid valves with built-in arrestors to prevent hammer during rapid cycling',
      'Hospital plumbing systems require hammer arrestors at all quick-closing fixtures to protect sensitive equipment',
      'Fire suppression systems use slow-opening valves to prevent hammer when systems activate',
      'Hydroelectric plants use surge tanks holding millions of gallons to absorb turbine shutdown transients'
    ],
    companies: [
      'Watts Water Technologies',
      'Sioux Chief',
      'Oatey',
      'SharkBite'
    ],
    futureImpact: 'Smart water systems are incorporating real-time pressure monitoring with AI-driven valve control to detect and prevent water hammer before it occurs. Variable-speed pump drives eliminate hammer at source by controlling acceleration and deceleration rates. New pipe materials with greater flexibility and strength are being developed to better withstand transient pressures, while whole-house water management systems will coordinate all valves and appliances to prevent simultaneous closures.',
    color: '#06B6D4'
  },
  {
    icon: '❤️',
    title: 'Blood Flow Dynamics',
    short: 'Cardiovascular System',
    tagline: 'Nature\'s masterful use of fluid inertia for continuous circulation',
    description: 'The human cardiovascular system is an extraordinary example of biological engineering that exploits fluid inertia to maintain continuous blood flow with an intermittent pump. The heart doesn\'t simply push blood — it works in concert with the elastic properties of arteries and the inertia of the blood itself to create smooth, pulsatile flow that reaches every cell. Blood\'s inertia, combined with the Windkessel effect of elastic arteries, converts the heart\'s discrete pulses into nearly continuous capillary perfusion. Understanding these dynamics is crucial for designing artificial hearts, treating cardiovascular disease, and developing life-saving medical interventions.',
    connection: 'Blood has significant mass and thus significant inertia as it moves through vessels. When the heart contracts (systole), it accelerates blood forward. Between beats (diastole), blood\'s inertia keeps it moving. The arterial walls stretch during systole, storing elastic energy, then recoil during diastole, pushing blood forward. This combination of fluid inertia and vessel elasticity is modeled by the Womersley number, which characterizes the ratio of inertial to viscous forces in pulsatile flow.',
    howItWorks: 'During systole, the heart ejects about 70mL of blood at high pressure. This blood\'s momentum carries it into the aorta, stretching elastic arterial walls and storing energy. During diastole, the elastic walls recoil, maintaining pressure and flow. Blood\'s inertia, combined with one-way valves, ensures forward flow continues even as the heart refills. The system is tuned so that the natural frequency of blood\'s inertial response matches the heart rate, optimizing efficiency — a phenomenon called impedance matching.',
    stats: [
      { value: '5 L/min', label: 'Cardiac Output' },
      { value: '100,000 km', label: 'Total Vessel Length' },
      { value: '60-100 bpm', label: 'Natural Frequency Match' }
    ],
    examples: [
      'HeartMate 3 LVAD uses continuous flow that works with blood inertia for efficient circulation support',
      'Arterial stiffness measurement uses pulse wave velocity to assess how inertia affects blood flow in aging',
      'Cardiopulmonary bypass machines must carefully manage flow transitions to prevent hemolysis from inertial forces',
      'Intra-aortic balloon pumps time inflation to augment the natural inertial flow patterns of blood'
    ],
    companies: [
      'Abbott (St. Jude Medical)',
      'Medtronic',
      'Edwards Lifesciences',
      'Abiomed',
      'SynCardia Systems'
    ],
    futureImpact: 'Total artificial hearts are evolving from pulsatile designs that fight blood\'s inertia to continuous-flow systems that work with it. Personalized cardiovascular modeling using patient-specific simulations of blood inertia and vessel properties will enable precision medicine for heart disease. Microfluidic organ-on-chip devices that replicate blood flow dynamics are revolutionizing drug testing, while advances in understanding inertia-driven flow patterns are improving early detection of aneurysms and atherosclerosis.',
    color: '#EF4444'
  },
  {
    icon: '🛢️',
    title: 'Oil Pipeline Design',
    short: 'Energy Infrastructure',
    tagline: 'Moving millions of barrels across continents with controlled momentum',
    description: 'Major oil pipelines transport millions of barrels of crude oil daily across thousands of miles, representing one of the most challenging applications of fluid inertia management. A single pipeline may contain 10 million gallons of oil moving at 3-8 mph, representing enormous kinetic energy that must be carefully controlled. Pump startup, shutdown, valve operations, and emergency scenarios all involve managing the inertia of this massive fluid column. Pipeline engineers must design systems that prevent catastrophic pressure surges while maintaining efficient, continuous flow — a challenge that combines physics, materials science, and control systems engineering.',
    connection: 'The fluid inertia in a major pipeline is staggering. A 1,000-mile pipeline containing oil moving at 5 mph represents kinetic energy equivalent to a freight train. Sudden stops create pressure waves described by ΔP = ρcv, where the speed of sound in oil (~1,200 m/s) means pressure pulses propagate nearly instantly. The "effective mass" of oil in a long pipeline creates significant startup inertia — pumps must gradually accelerate flow to avoid overpressure, a process that can take hours for large systems.',
    howItWorks: 'Surge control systems include multiple redundant components: surge tanks at pump stations absorb transient pressures; variable-frequency drives allow gradual pump speed changes; pressure relief valves provide emergency protection; and sophisticated SCADA systems coordinate operations across the entire pipeline. Slack-line flow techniques manage elevation changes by allowing vapor pockets at high points. Drag reducing agents decrease friction, but also change the inertial dynamics by allowing higher velocities for the same pressure drop.',
    stats: [
      { value: '2.5M bbl/day', label: 'Trans-Alaska Flow Rate' },
      { value: '800 miles', label: 'Typical Pipeline Length' },
      { value: '4 hours', label: 'Controlled Startup Time' }
    ],
    examples: [
      'Trans-Alaska Pipeline uses 11 pump stations with coordinated startup sequences managing 800 miles of oil inertia',
      'Keystone Pipeline employs advanced surge modeling to predict and prevent pressure transients across 2,687 miles',
      'Druzhba Pipeline (the world\'s longest) uses batching operations that require precise inertia management at product interfaces',
      'Colonial Pipeline\'s emergency shutdown systems must safely dissipate the momentum of 100 million gallons in transit'
    ],
    companies: [
      'Kinder Morgan',
      'Enbridge',
      'TC Energy',
      'Enterprise Products',
      'Plains All American Pipeline'
    ],
    futureImpact: 'Digital twin technology is enabling real-time simulation of pipeline fluid dynamics, predicting surge events before they occur and optimizing pump schedules. Advanced materials including composite pipes with optimized flexibility are being developed to better absorb pressure transients. Hydrogen pipeline infrastructure for clean energy will require new approaches to managing inertia due to hydrogen\'s different physical properties. AI-driven pipeline management systems will continuously optimize flow parameters while ensuring safety margins for all inertial effects.',
    color: '#F59E0B'
  }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface FluidInertiaRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

export default function FluidInertiaRenderer({ onGameEvent, gamePhase }: FluidInertiaRendererProps) {
  const [phase, setPhase] = useState<Phase>('hook');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [hasPlayedSimulation, setHasPlayedSimulation] = useState(false);
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [viewedApps, setViewedApps] = useState<Set<number>>(new Set([0]));
  const [flowVelocity, setFlowVelocity] = useState(50);
  const [valveOpen, setValveOpen] = useState(true);
  const [showPressureSpike, setShowPressureSpike] = useState(false);
  const [dampingLevel, setDampingLevel] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Emit game events
  const emitEvent = useCallback((type: string, details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        type,
        gameType: GAME_ID,
        gameTitle: 'Fluid Inertia',
        details: { phase, ...details },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
  }, [phase, emitEvent]);

  // Sync with external phase
  useEffect(() => {
    if (gamePhase && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Water hammer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== 'play') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const animate = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw pipe
      ctx.fillStyle = colors.bgCardLight;
      ctx.fillRect(50, 80, 300, 40);

      // Draw valve
      const valveX = 300;
      ctx.fillStyle = valveOpen ? colors.success : colors.error;
      ctx.fillRect(valveX - 5, 70, 10, 60);

      // Draw water particles
      const particleCount = 20;
      for (let i = 0; i < particleCount; i++) {
        const baseX = 60 + (i / particleCount) * 230;
        let x = baseX;

        if (valveOpen) {
          x = baseX + (time * flowVelocity * 0.1) % 240;
          if (x > 290) x = x - 240;
        } else if (showPressureSpike) {
          // Water hammer effect - particles bunch up at valve
          const distToValve = 290 - baseX;
          x = baseX + Math.max(0, distToValve * (1 - Math.exp(-time * 2)));
        }

        const y = 100 + Math.sin(time * 2 + i) * 5;

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = colors.fluid;
        ctx.fill();
      }

      // Draw pressure indicator
      if (showPressureSpike) {
        const pressure = Math.min(100, time * 50);
        ctx.fillStyle = colors.error;
        ctx.fillRect(320, 130 - pressure, 20, pressure);
        ctx.fillStyle = colors.textPrimary;
        ctx.font = '12px system-ui';
        ctx.fillText('Pressure', 310, 145);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, valveOpen, flowVelocity, showPressureSpike]);

  // Handle valve close (water hammer demonstration)
  const handleValveClose = () => {
    if (valveOpen) {
      setValveOpen(false);
      setShowPressureSpike(true);
      setHasPlayedSimulation(true);
      emitEvent('simulation_played', { action: 'valve_closed', velocity: flowVelocity });

      // Reset after 3 seconds
      setTimeout(() => {
        setValveOpen(true);
        setShowPressureSpike(false);
      }, 3000);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (answerId: string) => {
    if (showExplanation) return;

    setSelectedAnswer(answerId);
    setShowExplanation(true);

    const currentQ = testQuestions[currentQuestion];
    const isCorrect = currentQ.options.find(o => o.id === answerId)?.correct || false;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    emitEvent('answer_submitted', {
      questionIndex: currentQuestion,
      answerId,
      isCorrect
    });
  };

  // Next question
  const handleNextQuestion = () => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      goToPhase('mastery');
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.bgGradientStart} 0%, ${colors.bgGradientEnd} 100%)`,
    color: colors.textPrimary,
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: `1px solid ${colors.border}`
  };

  const buttonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  };

  const progressDots = useMemo(() => {
    const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(phase);

    return (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
        {phases.map((p, i) => (
          <div
            key={p}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: i <= currentIndex ? colors.primary : colors.border,
              transition: 'background 0.3s'
            }}
          />
        ))}
      </div>
    );
  }, [phase]);

  // Phase rendering
  if (phase === 'hook') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <h1 style={{ fontSize: '28px', marginBottom: '16px', textAlign: 'center' }}>
              Have you ever heard pipes bang when you quickly shut off a faucet?
            </h1>
            <p style={{ color: colors.textMuted, fontSize: '18px', textAlign: 'center', lineHeight: 1.6 }}>
              That loud, sometimes violent banging is called "water hammer" — and it's a dramatic
              demonstration of a fundamental physics principle: <strong style={{ color: colors.primary }}>fluid inertia</strong>.
            </p>
            <div style={{
              margin: '24px 0',
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '48px' }}>💥🔧</span>
              <p style={{ color: colors.textSecondary, marginTop: '12px' }}>
                Moving water doesn't want to stop moving. When you force it to stop suddenly,
                all that momentum has to go somewhere...
              </p>
            </div>
            <button
              style={{ ...buttonStyle, width: '100%' }}
              onClick={() => goToPhase('predict')}
            >
              Explore Fluid Inertia →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Make a Prediction</h2>
            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>
              Water is flowing through a pipe at high speed. You suddenly close a valve,
              stopping the flow instantly. What happens?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'nothing', label: 'Nothing special — the water just stops' },
                { id: 'pressure', label: 'A pressure spike occurs, potentially damaging the pipe', correct: true },
                { id: 'reverse', label: 'The water reverses direction' },
                { id: 'heat', label: 'The water heats up significantly' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPrediction(option.id);
                    emitEvent('prediction_made', { prediction: option.id });
                  }}
                  style={{
                    padding: '16px',
                    background: prediction === option.id ? colors.primary : colors.bgCardLight,
                    border: `2px solid ${prediction === option.id ? colors.primary : colors.border}`,
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                style={{ ...buttonStyle, width: '100%', marginTop: '20px' }}
                onClick={() => goToPhase('play')}
              >
                Test Your Prediction →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Water Hammer Simulation</h2>
            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>
              Adjust the flow velocity and close the valve to see what happens when
              moving water is suddenly stopped.
            </p>

            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              style={{
                width: '100%',
                height: 'auto',
                background: colors.bgDark,
                borderRadius: '12px',
                marginBottom: '20px'
              }}
            />

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.textSecondary }}>
                Flow Velocity: {flowVelocity}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={flowVelocity}
                onChange={(e) => setFlowVelocity(Number(e.target.value))}
                disabled={!valveOpen}
                style={{ width: '100%' }}
              />
            </div>

            <button
              onClick={handleValveClose}
              disabled={!valveOpen}
              style={{
                ...buttonStyle,
                width: '100%',
                background: valveOpen
                  ? `linear-gradient(135deg, ${colors.error} 0%, ${colors.errorLight} 100%)`
                  : colors.bgCardLight,
                cursor: valveOpen ? 'pointer' : 'not-allowed'
              }}
            >
              {valveOpen ? '🔧 Close Valve Suddenly' : '⏳ Pressure Dissipating...'}
            </button>

            {showPressureSpike && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                borderLeft: `4px solid ${colors.error}`
              }}>
                <p style={{ color: colors.errorLight, fontWeight: 600 }}>
                  💥 Water Hammer Detected!
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
                  The water's inertia created a massive pressure spike when flow suddenly stopped.
                  Higher velocity = stronger hammer effect!
                </p>
              </div>
            )}

            {hasPlayedSimulation && (
              <button
                style={{ ...buttonStyle, width: '100%', marginTop: '20px' }}
                onClick={() => goToPhase('review')}
              >
                Understand What Happened →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'pressure';

    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
              {wasCorrect ? '✅ Excellent Prediction!' : '🎓 Let\'s Learn Why'}
            </h2>

            <div style={{
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: colors.primary, marginBottom: '12px' }}>The Physics of Fluid Inertia</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Moving water has <strong>momentum</strong> (mass × velocity). When you suddenly
                stop the flow, this momentum must be absorbed somehow. The result is a
                <strong> pressure wave</strong> that travels back through the pipe at the speed
                of sound in water (~1,400 m/s).
              </p>
            </div>

            <div style={{
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Joukowsky Equation</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                The pressure spike is given by: <strong>ΔP = ρcv</strong>
              </p>
              <ul style={{ color: colors.textMuted, marginTop: '12px', paddingLeft: '20px' }}>
                <li>ρ = fluid density</li>
                <li>c = speed of sound in fluid</li>
                <li>v = flow velocity before stopping</li>
              </ul>
              <p style={{ color: colors.textSecondary, marginTop: '12px' }}>
                This explains why faster flow = stronger water hammer!
              </p>
            </div>

            <button
              style={{ ...buttonStyle, width: '100%' }}
              onClick={() => goToPhase('twist_predict')}
            >
              Explore a Twist Scenario →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>The Twist: Shock Absorbers</h2>
            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>
              Car shock absorbers are filled with oil. When the wheel hits a bump, a piston
              pushes through this oil. How does fluid inertia help create a smooth ride?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'compress', label: 'The oil compresses like a spring' },
                { id: 'resist', label: 'Fluid inertia resists rapid piston movement, absorbing energy gradually', correct: true },
                { id: 'heat', label: 'The oil heats up and expands to cushion the bump' },
                { id: 'flow', label: 'Oil flows around the piston with no resistance' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPrediction(option.id);
                    emitEvent('twist_prediction_made', { prediction: option.id });
                  }}
                  style={{
                    padding: '16px',
                    background: prediction === option.id ? colors.accent : colors.bgCardLight,
                    border: `2px solid ${prediction === option.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                style={{ ...buttonStyle, width: '100%', marginTop: '20px' }}
                onClick={() => goToPhase('twist_play')}
              >
                See How It Works →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Shock Absorber Simulation</h2>
            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>
              Adjust the damping level to see how fluid inertia affects bump absorption.
            </p>

            <div style={{
              background: colors.bgDark,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '120px',
                  background: colors.bgCardLight,
                  borderRadius: '8px',
                  margin: '0 auto',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${dampingLevel}%`,
                    background: colors.fluid,
                    transition: 'height 0.3s'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: `${100 - dampingLevel}%`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '50px',
                    height: '10px',
                    background: colors.textMuted,
                    borderRadius: '4px'
                  }} />
                </div>
                <p style={{ color: colors.textSecondary, marginTop: '12px', fontSize: '14px' }}>
                  Damping: {dampingLevel}%
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.textSecondary }}>
                Damping Level: {dampingLevel}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={dampingLevel}
                onChange={(e) => setDampingLevel(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{
              padding: '16px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                {dampingLevel < 30 && '⚠️ Low damping: Minimal fluid resistance, bouncy ride'}
                {dampingLevel >= 30 && dampingLevel < 70 && '✅ Optimal damping: Fluid inertia absorbs bumps smoothly'}
                {dampingLevel >= 70 && '⚠️ High damping: Too much resistance, harsh ride'}
              </p>
            </div>

            <button
              style={{ ...buttonStyle, width: '100%' }}
              onClick={() => goToPhase('twist_review')}
            >
              Understand the Physics →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_review') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>How Shock Absorbers Use Fluid Inertia</h2>

            <div style={{
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Key Insight</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                When a wheel hits a bump, the piston tries to move quickly through oil.
                The oil's <strong>inertia</strong> resists this rapid acceleration, creating
                a damping force that's proportional to piston velocity.
              </p>
            </div>

            <div style={{
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: colors.success, marginBottom: '12px' }}>Energy Transformation</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                Instead of the bump's energy being transferred instantly to the car body
                (causing jarring motion), fluid inertia allows the energy to be absorbed
                gradually and converted to heat. This is why shock absorbers get warm during use!
              </p>
            </div>

            <div style={{
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>F = ma at Work</h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                The damping force comes from accelerating the oil mass through orifices.
                Faster piston movement requires more force to accelerate the oil, providing
                progressive damping exactly when it's needed most.
              </p>
            </div>

            <button
              style={{ ...buttonStyle, width: '100%' }}
              onClick={() => goToPhase('transfer')}
            >
              Explore Real-World Applications →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'transfer') {
    const currentApp = realWorldApps[activeAppIndex];

    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {progressDots}

          {/* App selector tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {realWorldApps.map((app, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveAppIndex(index);
                  setViewedApps(prev => new Set([...prev, index]));
                  emitEvent('app_viewed', { appIndex: index, appTitle: app.title });
                }}
                style={{
                  padding: '10px 16px',
                  background: activeAppIndex === index ? currentApp.color : colors.bgCardLight,
                  border: `2px solid ${activeAppIndex === index ? currentApp.color : colors.border}`,
                  borderRadius: '20px',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <span>{app.icon}</span>
                <span>{app.short}</span>
                {viewedApps.has(index) && <span style={{ color: colors.success }}>✓</span>}
              </button>
            ))}
          </div>

          <div style={{ ...cardStyle, borderTop: `4px solid ${currentApp.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <span style={{ fontSize: '48px' }}>{currentApp.icon}</span>
              <div>
                <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{currentApp.title}</h2>
                <p style={{ color: currentApp.color, fontSize: '14px' }}>{currentApp.tagline}</p>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, lineHeight: 1.7, marginBottom: '24px' }}>
              {currentApp.description}
            </p>

            <div style={{
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: colors.primary, marginBottom: '12px', fontSize: '16px' }}>
                🔗 Physics Connection
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6, fontSize: '14px' }}>
                {currentApp.connection}
              </p>
            </div>

            <div style={{
              padding: '20px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: '16px' }}>
                ⚙️ How It Works
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6, fontSize: '14px' }}>
                {currentApp.howItWorks}
              </p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgCardLight,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: currentApp.color }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textSecondary, marginBottom: '12px', fontSize: '16px' }}>
                📋 Real Examples
              </h3>
              <ul style={{ color: colors.textMuted, paddingLeft: '20px', lineHeight: 1.8 }}>
                {currentApp.examples.map((example, i) => (
                  <li key={i} style={{ marginBottom: '8px' }}>{example}</li>
                ))}
              </ul>
            </div>

            {/* Companies */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: colors.textSecondary, marginBottom: '12px', fontSize: '16px' }}>
                🏢 Key Players
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentApp.companies.map((company, i) => (
                  <span key={i} style={{
                    background: colors.bgCardLight,
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: colors.textSecondary
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {/* Future Impact */}
            <div style={{
              padding: '20px',
              background: `linear-gradient(135deg, ${currentApp.color}20 0%, ${colors.bgCardLight} 100%)`,
              borderRadius: '12px',
              borderLeft: `4px solid ${currentApp.color}`
            }}>
              <h3 style={{ color: currentApp.color, marginBottom: '12px', fontSize: '16px' }}>
                🚀 Future Impact
              </h3>
              <p style={{ color: colors.textSecondary, lineHeight: 1.6, fontSize: '14px' }}>
                {currentApp.futureImpact}
              </p>
            </div>
          </div>

          {viewedApps.size >= realWorldApps.length && (
            <button
              style={{ ...buttonStyle, width: '100%' }}
              onClick={() => goToPhase('test')}
            >
              Test Your Knowledge →
            </button>
          )}

          {viewedApps.size < realWorldApps.length && (
            <p style={{ textAlign: 'center', color: colors.textMuted, marginTop: '20px' }}>
              Explore all {realWorldApps.length} applications to unlock the quiz
              ({viewedApps.size}/{realWorldApps.length} viewed)
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'test') {
    const currentQ = testQuestions[currentQuestion];

    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={cardStyle}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '20px',
              color: colors.textMuted
            }}>
              <span>Question {currentQuestion + 1} of {testQuestions.length}</span>
              <span>Score: {score}/{currentQuestion + (showExplanation ? 1 : 0)}</span>
            </div>

            <div style={{
              padding: '16px',
              background: colors.bgCardLight,
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '8px' }}>
                Scenario:
              </p>
              <p style={{ color: colors.textSecondary }}>
                {currentQ.scenario}
              </p>
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
              {currentQ.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQ.options.map(option => {
                let bgColor = colors.bgCardLight;
                let borderColor = colors.border;

                if (showExplanation) {
                  if (option.correct) {
                    bgColor = 'rgba(34, 197, 94, 0.2)';
                    borderColor = colors.success;
                  } else if (selectedAnswer === option.id) {
                    bgColor = 'rgba(239, 68, 68, 0.2)';
                    borderColor = colors.error;
                  }
                } else if (selectedAnswer === option.id) {
                  bgColor = colors.primary;
                  borderColor = colors.primary;
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    disabled={showExplanation}
                    style={{
                      padding: '16px',
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '12px',
                      color: colors.textPrimary,
                      textAlign: 'left',
                      cursor: showExplanation ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: showExplanation && !option.correct && selectedAnswer !== option.id ? 0.5 : 1
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <>
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: colors.bgCardLight,
                  borderRadius: '12px',
                  borderLeft: `4px solid ${colors.primary}`
                }}>
                  <p style={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                    💡 {currentQ.explanation}
                  </p>
                </div>

                <button
                  style={{ ...buttonStyle, width: '100%', marginTop: '20px' }}
                  onClick={handleNextQuestion}
                >
                  {currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    const percentage = Math.round((score / testQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {progressDots}
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              {passed ? '🏆' : '📚'}
            </div>

            <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>
              {passed ? 'Congratulations!' : 'Keep Learning!'}
            </h2>

            <p style={{ color: colors.textMuted, marginBottom: '24px' }}>
              {passed
                ? 'You\'ve mastered the physics of fluid inertia!'
                : 'Review the material and try again to master this topic.'}
            </p>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: passed ? colors.success : colors.warning,
              marginBottom: '8px'
            }}>
              {score}/{testQuestions.length}
            </div>
            <p style={{ color: colors.textMuted, marginBottom: '32px' }}>
              {percentage}% Correct
            </p>

            {passed && (
              <div style={{
                padding: '20px',
                background: colors.bgCardLight,
                borderRadius: '12px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <h3 style={{ color: colors.success, marginBottom: '12px' }}>Key Takeaways:</h3>
                <ul style={{ color: colors.textSecondary, paddingLeft: '20px', lineHeight: 1.8 }}>
                  <li>Moving fluids have momentum (mass × velocity) that resists changes</li>
                  <li>Sudden flow changes create pressure spikes (water hammer)</li>
                  <li>Fluid inertia is essential for shock absorbers, pipelines, and blood flow</li>
                  <li>The Joukowsky equation predicts pressure spikes: ΔP = ρcv</li>
                </ul>
              </div>
            )}

            <button
              style={buttonStyle}
              onClick={() => {
                if (passed) {
                  emitEvent('mastery_achieved', { score, percentage });
                } else {
                  setPhase('hook');
                  setCurrentQuestion(0);
                  setScore(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                }
              }}
            >
              {passed ? 'Complete Lesson ✓' : 'Try Again →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
