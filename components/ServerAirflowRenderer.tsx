'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// Server Airflow Management - Complete 10-Phase Game
// Teaching hot aisle/cold aisle containment in data centers
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

interface ServerAirflowRendererProps {
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
    scenario: "A data center manager notices that servers in the middle of a rack row run 8°C hotter than servers at the ends, even though all receive the same airflow from the raised floor.",
    question: "What is the most likely cause of this temperature difference?",
    options: [
      { id: 'a', label: "The middle servers have older, less efficient processors" },
      { id: 'b', label: "Hot exhaust air is recirculating from the hot aisle back to server intakes", correct: true },
      { id: 'c', label: "The CRAC units are too far from the middle racks" },
      { id: 'd', label: "Network cables are blocking airflow to middle servers" }
    ],
    explanation: "Without proper containment or with gaps in the rack, hot exhaust air from the hot aisle can recirculate over the top of racks or through empty rack spaces. This 'short-cycling' mixes hot and cold air, raising inlet temperatures especially in the middle of rows where the effect accumulates."
  },
  {
    scenario: "An engineer removes two servers from a rack for maintenance and forgets to install blanking panels. The next day, three adjacent servers shut down from thermal throttling.",
    question: "Why did leaving empty rack spaces cause overheating?",
    options: [
      { id: 'a', label: "The empty spaces created electromagnetic interference" },
      { id: 'b', label: "Hot air shortcuts through the gaps, raising cold aisle temperature at server intakes", correct: true },
      { id: 'c', label: "The rack's power distribution became unbalanced" },
      { id: 'd', label: "The servers' fans sped up and created turbulence" }
    ],
    explanation: "Air follows the path of least resistance. An empty 2U gap in a rack provides an easy shortcut for hot exhaust air (35-45°C) to flow back to the cold aisle, raising intake temperatures. This can cause a 5-10°C temperature rise at adjacent server inlets, triggering thermal protection."
  },
  {
    scenario: "A new data center achieves a PUE of 1.8, but after installing hot aisle containment, PUE drops to 1.4. The IT load hasn't changed.",
    question: "Why did containment improve PUE so dramatically?",
    options: [
      { id: 'a', label: "Containment reduces the number of servers needed" },
      { id: 'b', label: "Separating hot and cold air allows CRAC units to operate more efficiently at higher return temperatures", correct: true },
      { id: 'c', label: "Containment generates electricity from the temperature difference" },
      { id: 'd', label: "The plastic panels reflect heat back into the servers" }
    ],
    explanation: "PUE (Power Usage Effectiveness) measures total facility power divided by IT power. With containment, CRAC units receive pure hot air (not mixed), allowing them to run at higher return temperatures with better thermodynamic efficiency. Less cooling power is needed for the same heat removal, improving PUE."
  },
  {
    scenario: "A facility uses CFD (Computational Fluid Dynamics) modeling before installing new racks. The simulation shows a 'hot spot' forming 6 feet above the floor in one area.",
    question: "What physical phenomenon is CFD predicting?",
    options: [
      { id: 'a', label: "Electrical resistance heating the air" },
      { id: 'b', label: "Thermal stratification where hot air rises and pools at ceiling level", correct: true },
      { id: 'c', label: "Air friction from excessive fan speeds" },
      { id: 'd', label: "Condensation forming from temperature gradients" }
    ],
    explanation: "CFD models solve the Navier-Stokes equations for fluid flow and heat transfer. Hot air is less dense and rises (buoyancy), creating thermal stratification. Without proper exhaust or containment, hot air accumulates at ceiling level, which can then recirculate down to server intakes if CRAC placement isn't optimized."
  },
  {
    scenario: "A colocation facility has perforated floor tiles throughout the entire raised floor. Some tiles blow cold air forcefully while others barely move air at all.",
    question: "What causes this uneven airflow distribution?",
    options: [
      { id: 'a', label: "Some tiles are defective" },
      { id: 'b', label: "Variations in underfloor static pressure due to cable obstructions and distance from CRAC units", correct: true },
      { id: 'c', label: "The CRAC units are fighting each other" },
      { id: 'd', label: "Servers are pulling air at different rates" }
    ],
    explanation: "The raised floor acts as a pressurized plenum. Airflow through perforated tiles depends on the local static pressure, which varies based on distance from CRAC supply, cable obstructions, and whether tiles are near walls or open areas. CFD modeling helps optimize tile placement and predict these pressure variations."
  },
  {
    scenario: "A data center in Arizona operates efficiently in winter but struggles with cooling in summer even though IT load is constant. CRAC units run at maximum capacity.",
    question: "What strategy would most improve summer performance?",
    options: [
      { id: 'a', label: "Add more servers to increase heat output" },
      { id: 'b', label: "Raise the cold aisle setpoint temperature per ASHRAE guidelines to reduce the cooling delta-T", correct: true },
      { id: 'c', label: "Install more floor tiles to increase airflow" },
      { id: 'd', label: "Turn off some servers to reduce heat" }
    ],
    explanation: "ASHRAE has expanded allowable inlet temperatures to 27°C (80°F) for most equipment. By raising the cold aisle setpoint, you reduce the temperature difference (delta-T) that CRAC units must achieve. This makes economizer modes more effective and reduces compressor work. Modern servers tolerate these higher temperatures without performance loss."
  },
  {
    scenario: "A hyperscale data center operates with cold aisle containment at 27°C inlet temperature and achieves a PUE of 1.12. A traditional enterprise data center runs at 18°C inlet and achieves PUE of 1.8.",
    question: "Why does the higher temperature operation achieve better efficiency?",
    options: [
      { id: 'a', label: "Higher temperatures make servers run faster" },
      { id: 'b', label: "Warmer setpoints enable more free cooling hours and reduce compressor work", correct: true },
      { id: 'c', label: "The hyperscale center has better servers" },
      { id: 'd', label: "Lower temperatures cause ice buildup on coils" }
    ],
    explanation: "When the cold aisle setpoint is 27°C, outside air (via economizers) can directly cool the data center whenever ambient temperature is below ~24°C. At 18°C setpoint, mechanical cooling is needed unless it's very cold outside. Higher setpoints dramatically expand free cooling hours, which is why hyperscalers prefer warmer operation."
  },
  {
    scenario: "An IT manager notices that after adding blanking panels, the CRAC unit fans automatically slowed down while maintaining the same cold aisle temperature.",
    question: "What explains this automatic adjustment?",
    options: [
      { id: 'a', label: "The blanking panels blocked sensors" },
      { id: 'b', label: "Eliminating bypass airflow means less total CFM is needed to deliver the same cooling to servers", correct: true },
      { id: 'c', label: "The CRAC compressors failed" },
      { id: 'd', label: "Blanking panels generate their own cooling effect" }
    ],
    explanation: "Without blanking panels, cold air 'bypasses' servers by flowing through empty rack spaces directly to the hot aisle. This wasted airflow doesn't do useful cooling work. With panels installed, all cold air goes through servers, so the CRAC variable-speed fans can slow down while still meeting the cooling demand—saving significant energy."
  },
  {
    scenario: "During a CFD analysis, an engineer discovers that 40% of the cold air from CRAC units returns to the units without passing through any servers.",
    question: "What is this phenomenon called and why is it problematic?",
    options: [
      { id: 'a', label: "Thermal runaway—it causes fires" },
      { id: 'b', label: "Bypass airflow—it wastes cooling capacity and increases energy consumption", correct: true },
      { id: 'c', label: "Pressure equalization—it's normal and expected" },
      { id: 'd', label: "Cold pooling—it overcools some servers" }
    ],
    explanation: "Bypass airflow is conditioned air that returns to CRAC units without absorbing heat from IT equipment. It represents wasted energy—the air was cooled but didn't do useful work. Common causes include poorly placed perforated tiles, gaps under/around racks, and cable cutouts. Reducing bypass is one of the highest-ROI efficiency improvements."
  },
  {
    scenario: "A new GPU cluster generates 50kW per rack—five times the heat density of traditional servers. Standard raised-floor cooling cannot keep inlet temperatures below 35°C despite maximum fan speeds.",
    question: "What fundamental cooling approach change is needed?",
    options: [
      { id: 'a', label: "Add more raised floor perforated tiles" },
      { id: 'b', label: "Transition to liquid cooling, which has 25x the heat capacity of air", correct: true },
      { id: 'c', label: "Install larger blanking panels" },
      { id: 'd', label: "Move the racks closer to CRAC units" }
    ],
    explanation: "Air cooling has practical limits around 20-30kW per rack. Beyond this, the volume of air required becomes impractical. Water has 25 times the volumetric heat capacity of air, so direct-to-chip liquid cooling or immersion cooling becomes necessary for high-density AI/GPU clusters. This represents a fundamental shift in data center design."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🏢',
    title: 'Hyperscale Data Centers',
    short: 'Cooling at massive scale',
    tagline: 'Millions of servers, billions in cooling costs',
    description: 'Tech giants like Google, Amazon, and Microsoft operate data centers with 100,000+ servers each. Advanced airflow management, hot aisle containment, and free cooling save hundreds of millions in energy costs annually.',
    connection: 'The hot/cold aisle separation principle scales to warehouse-sized facilities. Hot aisle containment can improve PUE by 0.1-0.2 points, saving millions of dollars per year per facility.',
    howItWorks: 'Computational Fluid Dynamics (CFD) modeling optimizes tile placement and CRAC positioning. Real-time sensors adjust airflow dynamically. Some facilities use outside air or evaporative cooling when conditions permit, with automated dampers switching between modes.',
    stats: [
      { value: '1.1', label: 'Best PUE achieved', icon: '⚡' },
      { value: '500MW', label: 'Largest facilities', icon: '🔌' },
      { value: '$5B+', label: 'Annual cooling cost', icon: '💰' }
    ],
    examples: ['Google data centers', 'AWS regions', 'Microsoft Azure', 'Meta facilities'],
    companies: ['Google', 'Amazon', 'Microsoft', 'Meta'],
    futureImpact: 'AI workloads are driving liquid cooling adoption, as GPU clusters generate 10x the heat density of traditional servers. Hyperscalers are redesigning facilities from the ground up for liquid-cooled AI infrastructure.',
    color: '#3B82F6'
  },
  {
    icon: '💧',
    title: 'Liquid Cooling Systems',
    short: 'Beyond air cooling limits',
    tagline: 'Water is 25x better than air',
    description: 'High-performance computing and AI training clusters generate heat densities that air cannot handle. Direct-to-chip liquid cooling and immersion cooling are becoming essential for modern data centers pushing beyond 30kW per rack.',
    connection: 'When airflow alone cannot remove enough heat (above ~30kW per rack), liquid cooling takes over. Water has 25x the heat capacity of air, enabling much higher power densities while maintaining safe operating temperatures.',
    howItWorks: 'Cold plates attach directly to CPUs and GPUs, circulating coolant that absorbs heat. Facility water systems or cooling distribution units (CDUs) reject this heat to the atmosphere. Some systems immerse entire servers in dielectric fluid for maximum heat transfer.',
    stats: [
      { value: '100kW+', label: 'Per-rack density', icon: '🔥' },
      { value: '25x', label: 'Water vs air efficiency', icon: '💧' },
      { value: '40%', label: 'Energy savings', icon: '⚡' }
    ],
    examples: ['NVIDIA DGX clusters', 'Supercomputers', 'AI training farms', 'HPC centers'],
    companies: ['Asetek', 'CoolIT', 'GRC', 'LiquidCool Solutions'],
    futureImpact: 'Most new AI data centers will be designed for liquid cooling from the start, fundamentally changing facility architecture. Warm water cooling at 45°C enables direct heat rejection without chillers.',
    color: '#06B6D4'
  },
  {
    icon: '🌡️',
    title: 'Free Cooling & Economizers',
    short: 'Using outdoor air intelligently',
    tagline: 'Nature as your air conditioner',
    description: 'In cool climates, outside air can directly cool data centers for much of the year. Economizer systems switch between mechanical cooling and free cooling based on outdoor conditions, dramatically reducing energy consumption.',
    connection: 'When outdoor air is cooler than the return air temperature, it makes no thermodynamic sense to run energy-intensive compressors. Airside economizers bring in filtered outside air; waterside economizers use cooling towers.',
    howItWorks: 'Sensors monitor outdoor temperature and humidity continuously. When conditions are favorable, dampers open to bring in outside air while exhaust fans remove hot air. Evaporative cooling extends free cooling hours in dry climates by adding moisture to lower air temperature.',
    stats: [
      { value: '5000+', label: 'Free cooling hours/yr', icon: '🌬️' },
      { value: '50%', label: 'Energy reduction', icon: '⚡' },
      { value: '18-27°C', label: 'ASHRAE inlet range', icon: '🌡️' }
    ],
    examples: ['Nordic data centers', 'Mountain locations', 'Coastal facilities', 'Underground sites'],
    companies: ['Facebook Lulea', 'Google Finland', 'Microsoft Dublin', 'Verne Global'],
    futureImpact: 'Climate change may reduce free cooling hours in some regions, driving data centers toward colder locations or alternative cooling methods. Facilities are being built in Iceland and Scandinavia specifically for year-round free cooling.',
    color: '#10B981'
  },
  {
    icon: '📋',
    title: 'Blanking Panels & Sealing',
    short: 'Simple parts, massive impact',
    tagline: 'The $2 part that saves thousands',
    description: 'Empty rack slots without blanking panels allow hot exhaust air to recirculate to server intakes. This simple $2 piece of metal can prevent thousands of dollars in cooling waste and equipment failures—one of the highest-ROI efficiency improvements.',
    connection: 'The physics is straightforward: air takes the path of least resistance. A 2U gap in a rack provides a shortcut for hot air to bypass the intended airflow path, raising intake temperatures by 5-10°C and wasting cooling capacity.',
    howItWorks: 'Blanking panels block unused rack spaces, forcing all air through active equipment. Brush grommets seal cable openings while allowing cables to pass. Rack-level containment systems provide additional isolation. Foam gaskets seal gaps between racks.',
    stats: [
      { value: '10°C', label: 'Potential temp rise', icon: '🌡️' },
      { value: '$2-5', label: 'Panel cost each', icon: '💵' },
      { value: '15%', label: 'Cooling waste eliminated', icon: '📉' }
    ],
    examples: ['Enterprise data centers', 'Colocation facilities', 'Telecom central offices', 'Edge deployments'],
    companies: ['APC/Schneider', 'Eaton', 'Vertiv', 'Chatsworth'],
    futureImpact: 'Smart blanking panels with integrated sensors can detect airflow issues and temperature anomalies, alerting operators before problems escalate. Automated systems may adjust airflow based on real-time conditions.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ServerAirflowRenderer: React.FC<ServerAirflowRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [fanSpeed, setFanSpeed] = useState(70); // percent
  const [serverLoad, setServerLoad] = useState(80); // percent — start high so slider change to 60 is visible
  const [blankingPanels, setBlankingPanels] = useState(true);
  const [hotAisleContainment, setHotAisleContainment] = useState(false);
  const [raisedFloorOpenness, setRaisedFloorOpenness] = useState(50); // percent
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
    accent: '#06B6D4', // Cyan for cooling theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    hot: '#EF4444',
    cold: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
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
    hook: 'Explore Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Experiment Lab',
    twist_review: 'Deep Insight',
    transfer: 'Transfer Applications',
    test: 'Quiz Knowledge Test',
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

  // Calculate airflow and temperatures
  const calculateMetrics = useCallback(() => {
    // Base heat generation from server load
    const heatGenerated = serverLoad * 0.8; // kW per rack simplified

    // Effective cooling based on fan speed and floor openness
    const coolingCapacity = (fanSpeed / 100) * (raisedFloorOpenness / 100) * 100;

    // Recirculation factor - without blanking panels, hot air shortcuts back
    const recirculationFactor = blankingPanels ? 0.05 : 0.40;

    // Containment bonus - reduces mixing
    const containmentBonus = hotAisleContainment ? 0.25 : 0;

    // Calculate temperatures
    const baseColdAisle = 18;
    const recirculationPenalty = recirculationFactor * 15;
    const containmentBenefit = containmentBonus * 5;
    const coldAisleTemp = baseColdAisle + recirculationPenalty - containmentBenefit;

    // Delta-T depends on heat load and airflow
    const deltaT = (heatGenerated * 10) / Math.max(coolingCapacity / 2, 1);
    const hotAisleTemp = coldAisleTemp + Math.min(deltaT, 30);

    // PUE estimation
    const basePUE = 2.0;
    const efficiencyGains = (blankingPanels ? 0.2 : 0) + (hotAisleContainment ? 0.3 : 0) + (raisedFloorOpenness > 40 ? 0.1 : 0);
    const pue = Math.max(1.1, basePUE - efficiencyGains);

    return {
      coldAisleTemp: Math.max(15, Math.min(35, coldAisleTemp)),
      hotAisleTemp: Math.max(25, Math.min(55, hotAisleTemp)),
      deltaT: hotAisleTemp - coldAisleTemp,
      recirculationPercent: recirculationFactor * 100,
      bypassPercent: Math.max(0, (100 - raisedFloorOpenness) * 0.3),
      pue,
      coolingEfficiency: Math.max(0, 100 - recirculationFactor * 100 - (100 - raisedFloorOpenness) * 0.2)
    };
  }, [serverLoad, fanSpeed, blankingPanels, hotAisleContainment, raisedFloorOpenness]);

  const metrics = calculateMetrics();

  // Data Center Visualization Component
  const DataCenterVisualization = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 280 : 350;

    const coldColor = colors.cold;
    const hotColor = colors.hot;
    const warmColor = '#F59E0B';

    // Animation offset for airflow
    const flowOffset = (animationFrame * 2) % 40;

    return (
      <svg width={width} height={height} viewBox="0 0 500 350" style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          {/* Cold air gradient */}
          <linearGradient id="coldAirGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>

          {/* Hot air gradient */}
          <linearGradient id="hotAirGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Server rack gradient */}
          <linearGradient id="rackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Floor gradient */}
          <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="coldGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hotGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="500" height="350" fill="#0f172a" />

        {/* Raised floor / Plenum */}
        <rect x="20" y="280" width="460" height="50" fill="url(#floorGrad)" rx="4" />
        <text x="250" y="310" fill={colors.textMuted} fontSize="11" textAnchor="middle">Raised Floor Plenum (Cold Air)</text>
        {/* Axis labels */}
        <text x="12" y="180" fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90,12,180)">Temperature →</text>
        <text x="250" y="348" fill={colors.textMuted} fontSize="11" textAnchor="middle">Airflow Direction →</text>

        {/* Cold air in plenum */}
        <ellipse cx="250" cy="295" rx={180 * (raisedFloorOpenness / 100)} ry="15" fill={coldColor} opacity="0.3" />

        {/* Perforated floor tiles */}
        {[80, 180, 280, 380].map((x, i) => (
          <g key={`tile-${i}`}>
            <rect x={x} y="265" width="40" height="15" fill="#475569" rx="2" stroke="#64748b" strokeWidth="1" />
            {raisedFloorOpenness > 30 && (
              <>
                {[0, 1, 2].map(j => (
                  <rect key={j} x={x + 8 + j * 12} y="268" width="6" height="9" fill={coldColor} opacity="0.6" rx="1" />
                ))}
              </>
            )}
          </g>
        ))}

        {/* Cold aisle zone */}
        <rect x="140" y="80" width="220" height="180" fill={coldColor} opacity="0.1" rx="8" />
        <text x="250" y="100" fill={coldColor} fontSize="12" textAnchor="middle" fontWeight="600">COLD AISLE</text>
        <text x="250" y="116" fill={coldColor} fontSize="11" textAnchor="middle">{metrics.coldAisleTemp.toFixed(1)}°C</text>

        {/* Hot aisle zones */}
        <rect x="20" y="80" width="60" height="180" fill={hotColor} opacity="0.15" rx="4" />
        <text x="50" y="100" fill={hotColor} fontSize="11" textAnchor="middle" fontWeight="600">HOT</text>
        <text x="50" y="114" fill={hotColor} fontSize="11" textAnchor="middle">{metrics.hotAisleTemp.toFixed(1)}°C</text>

        <rect x="420" y="80" width="60" height="180" fill={hotColor} opacity="0.15" rx="4" />
        <text x="450" y="100" fill={hotColor} fontSize="11" textAnchor="middle" fontWeight="600">HOT</text>
        <text x="450" y="114" fill={hotColor} fontSize="11" textAnchor="middle">{metrics.hotAisleTemp.toFixed(1)}°C</text>

        {/* Server racks - Left side */}
        <g>
          <rect x="85" y="120" width="50" height="140" fill="url(#rackGrad)" rx="4" stroke="#64748b" strokeWidth="1" />
          {/* Servers */}
          {[0, 1, 2, 3, 4].map(i => (
            <g key={`left-server-${i}`}>
              {blankingPanels || i !== 2 ? (
                <>
                  <rect x="90" y={125 + i * 27} width="40" height="22" fill="#1f2937" rx="2" />
                  <circle cx="97" cy={136 + i * 27} r="3" fill={serverLoad > 20 * i ? '#22c55e' : '#64748b'}>
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  {/* Vent lines */}
                  {[0, 1, 2].map(j => (
                    <rect key={j} x={106 + j * 8} y={128 + i * 27} width="5" height="16" fill="#374151" rx="1" />
                  ))}
                </>
              ) : (
                /* Empty slot without blanking panel */
                <rect x="90" y={125 + i * 27} width="40" height="22" fill="#0f172a" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" rx="2" />
              )}
            </g>
          ))}
        </g>

        {/* Server racks - Right side */}
        <g>
          <rect x="365" y="120" width="50" height="140" fill="url(#rackGrad)" rx="4" stroke="#64748b" strokeWidth="1" />
          {[0, 1, 2, 3, 4].map(i => (
            <g key={`right-server-${i}`}>
              <rect x="370" y={125 + i * 27} width="40" height="22" fill="#1f2937" rx="2" />
              <circle cx="377" cy={136 + i * 27} r="3" fill={serverLoad > 20 * i ? '#22c55e' : '#64748b'}>
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.2s" repeatCount="indefinite" />
              </circle>
              {[0, 1, 2].map(j => (
                <rect key={j} x={386 + j * 8} y={128 + i * 27} width="5" height="16" fill="#374151" rx="1" />
              ))}
            </g>
          ))}
        </g>

        {/* Hot aisle containment barriers */}
        {hotAisleContainment && (
          <>
            <rect x="20" y="75" width="60" height="8" fill={warmColor} opacity="0.8" rx="2" />
            <rect x="420" y="75" width="60" height="8" fill={warmColor} opacity="0.8" rx="2" />
            <text x="50" y="68" fill={warmColor} fontSize="11" textAnchor="middle">CONTAIN</text>
            <text x="450" y="68" fill={warmColor} fontSize="11" textAnchor="middle">CONTAIN</text>
          </>
        )}

        {/* Cold air flow arrows - rising from floor */}
        {[160, 220, 280, 340].map((x, i) => (
          <g key={`cold-flow-${i}`} filter="url(#coldGlow)">
            <path
              d={`M${x},${265 - flowOffset % 40} L${x},${220 - flowOffset % 40}`}
              stroke={coldColor}
              strokeWidth="3"
              strokeLinecap="round"
              opacity={0.4 + (fanSpeed / 200)}
            />
            <polygon
              points={`${x},${215 - flowOffset % 40} ${x - 6},${225 - flowOffset % 40} ${x + 6},${225 - flowOffset % 40}`}
              fill={coldColor}
              opacity={0.6}
            />
          </g>
        ))}

        {/* Airflow through servers - left rack */}
        {[0, 1, 2].map(i => {
          const baseY = 136 + i * 40;
          const xOffset = (flowOffset * 1.5) % 50;
          return (
            <g key={`flow-left-${i}`}>
              <path
                d={`M${140 + xOffset},${baseY} L${85 + xOffset * 0.5},${baseY}`}
                stroke={xOffset < 25 ? coldColor : warmColor}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.5"
              />
            </g>
          );
        })}

        {/* Airflow through servers - right rack */}
        {[0, 1, 2].map(i => {
          const baseY = 136 + i * 40;
          const xOffset = (flowOffset * 1.5) % 50;
          return (
            <g key={`flow-right-${i}`}>
              <path
                d={`M${360 - xOffset},${baseY} L${415 - xOffset * 0.5},${baseY}`}
                stroke={xOffset < 25 ? coldColor : warmColor}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.5"
              />
            </g>
          );
        })}

        {/* Hot air recirculation when no blanking panels */}
        {!blankingPanels && (
          <g filter="url(#hotGlow)">
            {[0, 1].map(i => (
              <path
                key={`recirc-${i}`}
                d={`M85,${152 + i * 40} Q60,${152 + i * 40} 60,${130 + i * 40} Q60,${110 + i * 40} 140,${140 + i * 40}`}
                stroke={hotColor}
                strokeWidth="2"
                strokeDasharray="5 3"
                fill="none"
                opacity="0.7"
              >
                <animate attributeName="stroke-dashoffset" from="0" to="16" dur="0.8s" repeatCount="indefinite" />
              </path>
            ))}
          </g>
        )}

        {/* Hot exhaust rising */}
        {[35, 435].map((x, idx) => (
          <g key={`exhaust-${idx}`}>
            {[0, 1, 2].map(i => {
              const yOffset = (flowOffset + i * 15) % 40;
              return (
                <ellipse
                  key={`heat-${idx}-${i}`}
                  cx={x + 15}
                  cy={75 - yOffset}
                  rx="10"
                  ry="5"
                  fill={hotColor}
                  opacity={0.3 - yOffset / 150}
                  filter="url(#hotGlow)"
                />
              );
            })}
          </g>
        ))}

        {/* CRAC unit */}
        <g>
          <rect x="210" y="20" width="80" height="50" fill="#1e293b" rx="6" stroke="#475569" strokeWidth="2" />
          <text x="250" y="40" fill={colors.textSecondary} fontSize="11" textAnchor="middle">CRAC Unit</text>
          <text x="250" y="55" fill={coldColor} fontSize="11" textAnchor="middle">{fanSpeed}% | Load:{serverLoad}%</text>
          {/* Fan animation */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <line
              key={i}
              x1="250"
              y1="35"
              x2={250 + 12 * Math.cos((angle + animationFrame * (fanSpeed / 15)) * Math.PI / 180)}
              y2={35 + 12 * Math.sin((angle + animationFrame * (fanSpeed / 15)) * Math.PI / 180)}
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Metrics display */}
        <g>
          <rect x="20" y="15" width="85" height="50" fill={colors.bgSecondary} rx="6" opacity="0.9" />
          <text x="62" y="32" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Recirc.</text>
          <text x="62" y="50" fill={blankingPanels ? colors.success : colors.error} fontSize="14" fontWeight="600" textAnchor="middle">
            {metrics.recirculationPercent.toFixed(0)}%
          </text>
        </g>

        <g>
          <rect x="395" y="15" width="85" height="50" fill={colors.bgSecondary} rx="6" opacity="0.9" />
          <text x="437" y="32" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Est. PUE</text>
          <text x="437" y="50" fill={metrics.pue < 1.5 ? colors.success : metrics.pue < 1.8 ? colors.warning : colors.error} fontSize="14" fontWeight="600" textAnchor="middle">
            {metrics.pue.toFixed(2)}
          </text>
        </g>
      </svg>
    );
  };

  // Navigation bar component
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {phaseOrder.indexOf(phase) > 0 && (
          <button
            onClick={() => { playSound('click'); goToPhase(phaseOrder[phaseOrder.indexOf(phase) - 1]); }}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.textSecondary,
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '14px',
              minHeight: '44px',
            }}
            aria-label="Back"
          >
            ← Back
          </button>
        )}
        <span style={{ fontSize: '24px' }}>🏢</span>
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Server Airflow</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
          {phaseLabels[phase]}
        </span>
        <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
          ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
        </span>
      </div>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
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
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
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
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '84px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🏢💨❄️
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Data Center Airflow
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "A data center uses <span style={{ color: colors.accent }}>more electricity for cooling</span> than its servers use for computing. The difference between good and bad airflow can be millions of dollars per year."
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
            "Did you know? A $2 blanking panel can save thousands of dollars in cooling costs. Miss one empty slot, and server intake temperatures rise 10°C."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Data Center Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Learning →
        </button>

        {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'It looks more organized and professional for facility tours' },
      { id: 'b', text: 'It separates cold inlet air from hot exhaust to prevent wasteful mixing' },
      { id: 'c', text: 'It reduces the number of cables needed between racks' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '72px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
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
            Data centers arrange servers in alternating "hot aisles" and "cold aisles". Why this specific layout?
          </h2>

          {/* Static SVG diagram for predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="100%" height="180" viewBox="0 0 400 180" style={{ maxWidth: '400px' }}>
              {/* Background */}
              <rect width="400" height="180" fill={colors.bgCard} rx="8" />

              {/* Cold aisle left */}
              <rect x="20" y="40" width="80" height="100" fill="#3B82F633" stroke="#3B82F6" strokeWidth="2" rx="4" />
              <text x="60" y="90" fill="#3B82F6" fontSize="12" textAnchor="middle" fontWeight="600">COLD</text>
              <text x="60" y="105" fill="#3B82F6" fontSize="10" textAnchor="middle">AISLE</text>

              {/* Server rack 1 */}
              <rect x="110" y="30" width="40" height="120" fill="#374151" stroke="#64748b" strokeWidth="1" rx="4" />
              <rect x="115" y="40" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="115" y="60" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="115" y="80" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="115" y="100" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="115" y="120" width="30" height="15" fill="#1f2937" rx="2" />

              {/* Hot aisle */}
              <rect x="160" y="40" width="80" height="100" fill="#EF444433" stroke="#EF4444" strokeWidth="2" rx="4" />
              <text x="200" y="90" fill="#EF4444" fontSize="12" textAnchor="middle" fontWeight="600">HOT</text>
              <text x="200" y="105" fill="#EF4444" fontSize="10" textAnchor="middle">AISLE</text>

              {/* Server rack 2 */}
              <rect x="250" y="30" width="40" height="120" fill="#374151" stroke="#64748b" strokeWidth="1" rx="4" />
              <rect x="255" y="40" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="255" y="60" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="255" y="80" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="255" y="100" width="30" height="15" fill="#1f2937" rx="2" />
              <rect x="255" y="120" width="30" height="15" fill="#1f2937" rx="2" />

              {/* Cold aisle right */}
              <rect x="300" y="40" width="80" height="100" fill="#3B82F633" stroke="#3B82F6" strokeWidth="2" rx="4" />
              <text x="340" y="90" fill="#3B82F6" fontSize="12" textAnchor="middle" fontWeight="600">COLD</text>
              <text x="340" y="105" fill="#3B82F6" fontSize="10" textAnchor="middle">AISLE</text>

              {/* Arrows showing airflow direction */}
              <path d="M60 130 L60 150 L130 150 L130 145" stroke="#3B82F6" strokeWidth="2" fill="none" markerEnd="url(#arrowBlue)" />
              <path d="M130 35 L130 25 L200 25 L200 35" stroke="#EF4444" strokeWidth="2" fill="none" markerEnd="url(#arrowRed)" />

              <defs>
                <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#3B82F6" />
                </marker>
                <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#EF4444" />
                </marker>
              </defs>
            </svg>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
              Server racks face each other, creating alternating aisles
            </p>
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
                  minHeight: '44px',
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
              Continue →
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Data Center
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '72px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Data Center Airflow Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Experiment with blanking panels and see how they affect temperatures
          </p>

          {/* Key Physics Terms */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: `1px solid ${colors.border}`,
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>Key Physics Terms:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ ...typo.small, color: colors.textSecondary, fontWeight: 400 }}><strong style={{ color: colors.textPrimary }}>Recirculation:</strong> Hot exhaust air looping back to server intakes — the primary cause of overheating.</div>
              <div style={{ ...typo.small, color: colors.textSecondary, fontWeight: 400 }}><strong style={{ color: colors.textPrimary }}>PUE (Power Usage Effectiveness):</strong> Total facility power ÷ IT power. PUE 1.0 is perfect; 1.5 means 50% overhead.</div>
              <div style={{ ...typo.small, color: colors.textSecondary, fontWeight: 400 }}><strong style={{ color: colors.textPrimary }}>Delta-T (ΔT):</strong> Temperature rise across servers. Higher ΔT means more efficient heat extraction.</div>
              <div style={{ ...typo.small, color: colors.textSecondary, fontWeight: 400 }}><strong style={{ color: colors.textPrimary }}>Bypass airflow:</strong> Cold air that returns to CRAC without cooling any servers — wasted energy.</div>
            </div>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.success, marginBottom: '6px', fontWeight: 600 }}>Why This Matters:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontWeight: 400 }}>
              A $500M hyperscale data center with poor airflow wastes 30-40% of its cooling energy. The $2 blanking panel that costs less than a coffee can prevent 10°C temperature rises and save thousands per year. Google, Microsoft, and Amazon invest billions in airflow optimization — it&apos;s that impactful.
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0, textAlign: 'center' }}>
              👀 Observe how toggling blanking panels affects the cold aisle temperature and recirculation rate.
            </p>
          </div>

          {/* Formula near graphic */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`,
          }}>
            <code style={{ fontSize: '16px', color: colors.warning }}>Q = ṁ × Cp × ΔT</code>
            <span style={{ ...typo.small, color: colors.textSecondary, marginLeft: '12px', fontWeight: 400 }}>Heat removed = mass flow × specific heat × temperature difference</span>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Main visualization */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <DataCenterVisualization />
                </div>
              </div>

              {/* Discovery prompt */}
              {!blankingPanels && (
                <div style={{
                  background: `${colors.error}22`,
                  border: `1px solid ${colors.error}`,
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.small, color: colors.error, margin: 0 }}>
                    Hot air is recirculating! Cold aisle +{(metrics.coldAisleTemp - 18).toFixed(1)}°C
                  </p>
                </div>
              )}

              {blankingPanels && (
                <div style={{
                  background: `${colors.success}22`,
                  border: `1px solid ${colors.success}`,
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.small, color: colors.success, margin: 0 }}>
                    Good airflow! Blanking panels prevent recirculation.
                  </p>
                </div>
              )}
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Blanking panel toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px',
                background: colors.bgSecondary,
                borderRadius: '12px',
              }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Blanking Panels:</span>
                <button
                  onClick={() => setBlankingPanels(!blankingPanels)}
                  style={{
                    width: '64px',
                    height: '36px',
                    borderRadius: '18px',
                    border: 'none',
                    background: blankingPanels ? colors.success : colors.error,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.3s',
                    minHeight: '36px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '4px',
                    left: blankingPanels ? '32px' : '4px',
                    transition: 'left 0.3s',
                  }} />
                </button>
                <span style={{
                  ...typo.small,
                  color: blankingPanels ? colors.success : colors.error,
                  fontWeight: 600,
                }}>
                  {blankingPanels ? 'ON' : 'OFF'}
                </span>
              </div>

              {/* Server load slider with physics label */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>
                    Server Load: {serverLoad}%
                  </span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{(serverLoad * 0.8).toFixed(0)} kW</span>
                </div>
                <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px', fontWeight: 400, fontSize: '12px' }}>
                  Higher load = more heat to remove via airflow
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={serverLoad}
                  onChange={(e) => setServerLoad(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: colors.accent,
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    touchAction: 'none',
                  }}
                  aria-label="Server Load slider"
                />
              </div>

              {/* Temperature display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : '1fr',
                gap: '8px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.cold }}>{metrics.coldAisleTemp.toFixed(1)}°C</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>Cold Aisle</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.hot }}>{metrics.hotAisleTemp.toFixed(1)}°C</div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>Hot Aisle</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{
                    ...typo.h3,
                    color: metrics.recirculationPercent > 20 ? colors.error : colors.success
                  }}>
                    {metrics.recirculationPercent.toFixed(0)}%
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>Recirculation</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue →
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '72px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Data Center Cooling
          </h2>

          {/* Prediction callback */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 400 }}>
              {prediction === 'b'
                ? 'You predicted correctly! As you observed in the experiment, separating cold inlet air from hot exhaust is exactly the purpose of hot/cold aisle layout.'
                : prediction
                  ? 'As you observed in the experiment, the real answer is that hot/cold aisle separation prevents wasteful mixing of hot exhaust air with cold supply air.'
                  : 'As you observed in the simulation, hot/cold aisle separation prevents hot exhaust air from recirculating to server intakes.'}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              Hot Aisle / Cold Aisle Separation
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Servers intake air from one side and exhaust hot air from the other. By facing server fronts toward a shared cold aisle:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Cold supply air stays at target temperature (18-27°C)</li>
              <li style={{ marginBottom: '8px' }}>Hot exhaust air is isolated in dedicated hot aisles</li>
              <li style={{ marginBottom: '8px' }}>CRAC units receive pure hot return air, maximizing efficiency</li>
              <li>No energy is wasted cooling already-cold air</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>
              The Heat Transfer Equation
            </h3>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <code style={{ fontSize: '18px', color: colors.textPrimary }}>Q = m&#x307; × Cp × ΔT</code>
            </div>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Heat removed (Q) equals mass flow rate (m&#x307;) × specific heat capacity (Cp) × temperature difference (ΔT).
              More CFM or larger temperature rise = more cooling capacity.
            </p>
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
              PUE (Power Usage Effectiveness) measures total facility power ÷ IT power. A PUE of 1.5 means 50% of power goes to cooling and infrastructure. Good airflow management can achieve PUE below 1.2!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue →
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
      { id: 'a', text: 'Temperatures stay the same since the same amount of cold air is supplied' },
      { id: 'b', text: 'Cold aisle rises 5-10°C as hot exhaust shortcuts through the gaps back to server intakes' },
      { id: 'c', text: 'Hot aisle temperature decreases because there are fewer servers generating heat' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '72px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              📋 New Variable: Blanking Panels
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A technician removes several servers for maintenance and forgets to install blanking panels. What happens to the remaining servers?
          </h2>

          {/* Static graphic showing gap in rack - no sliders */}
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <svg width="300" height="200" viewBox="0 0 300 200" style={{ maxWidth: '100%' }}>
              <rect width="300" height="200" fill={colors.bgCard} />
              {/* Title */}
              <text x="150" y="20" fill={colors.warning} fontSize="12" textAnchor="middle" fontWeight="600">Missing Blanking Panels: Hot Air Shortcuts</text>
              {/* Rack */}
              <rect x="100" y="35" width="60" height="130" fill="#374151" stroke="#64748b" strokeWidth="1" rx="4" />
              {/* Servers */}
              <rect x="105" y="40" width="50" height="20" fill="#1f2937" rx="2" />
              <circle cx="115" cy="50" r="3" fill="#22c55e" />
              <rect x="105" y="65" width="50" height="20" fill="#1f2937" rx="2" />
              <circle cx="115" cy="75" r="3" fill="#22c55e" />
              {/* Empty gap with red border */}
              <rect x="105" y="90" width="50" height="20" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" rx="2" />
              <text x="130" y="103" fill="#ef4444" fontSize="11" textAnchor="middle">EMPTY!</text>
              <rect x="105" y="115" width="50" height="20" fill="#1f2937" rx="2" />
              <circle cx="115" cy="125" r="3" fill="#22c55e" />
              <rect x="105" y="140" width="50" height="20" fill="#1f2937" rx="2" />
              <circle cx="115" cy="150" r="3" fill="#22c55e" />
              {/* Hot air arrow through gap */}
              <path d="M160,100 Q185,100 185,75 Q185,50 130,50" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" fill="none" />
              <polygon points="130,47 124,53 136,53" fill="#ef4444" />
              <text x="195" y="75" fill="#ef4444" fontSize="11">Hot air</text>
              <text x="195" y="90" fill="#ef4444" fontSize="11">bypasses!</text>
              {/* Temperature labels */}
              <text x="55" y="80" fill="#3B82F6" fontSize="11" textAnchor="middle">COLD</text>
              <text x="55" y="95" fill="#3B82F6" fontSize="11" textAnchor="middle">AISLE</text>
              <text x="55" y="115" fill="#3B82F6" fontSize="11" textAnchor="middle">18°C</text>
              {/* Bottom label */}
              <text x="150" y="188" fill={colors.textMuted} fontSize="11" textAnchor="middle">Temperature →</text>
              {/* Side label */}
              <text x="12" y="110" fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90,12,110)">Height →</text>
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
                  minHeight: '44px',
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
              Continue →
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '72px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Containment & Efficiency Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Combine blanking panels with hot aisle containment for maximum efficiency
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0, textAlign: 'center' }}>
              👀 Observe how combining blanking panels with containment affects PUE and cooling efficiency.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <DataCenterVisualization />
            </div>

            {/* Controls grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}>
              {/* Blanking panels toggle */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Blanking Panels</span>
                  <button
                    onClick={() => setBlankingPanels(!blankingPanels)}
                    style={{
                      width: '60px',
                      height: '30px',
                      borderRadius: '15px',
                      border: 'none',
                      background: blankingPanels ? colors.success : colors.error,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: blankingPanels ? '33px' : '3px',
                      transition: 'left 0.3s',
                    }} />
                  </button>
                </div>
              </div>

              {/* Hot aisle containment toggle */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Hot Aisle Containment</span>
                  <button
                    onClick={() => setHotAisleContainment(!hotAisleContainment)}
                    style={{
                      width: '60px',
                      height: '30px',
                      borderRadius: '15px',
                      border: 'none',
                      background: hotAisleContainment ? colors.warning : colors.border,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '3px',
                      left: hotAisleContainment ? '33px' : '3px',
                      transition: 'left 0.3s',
                    }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Fan speed slider with physics label */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>
                  Fan Speed: {fanSpeed}%
                </span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{fanSpeed} CFM</span>
              </div>
              <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 400 }}>
                Controls airflow rate (CFM) — higher fan speed = more cooling capacity per Q = ṁ × Cp × ΔT
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={fanSpeed}
                onChange={(e) => setFanSpeed(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: colors.accent,
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  touchAction: 'none',
                }}
                aria-label="Fan Speed slider"
              />
            </div>

            {/* Raised floor slider with physics label */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>
                  Floor Tile Openness: {raisedFloorOpenness}%
                </span>
                <span style={{ ...typo.small, color: colors.cold, fontWeight: 600 }}>Pressure: {raisedFloorOpenness > 60 ? 'High' : raisedFloorOpenness > 40 ? 'Med' : 'Low'}</span>
              </div>
              <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 400 }}>
                Controls static pressure distribution — higher openness = more cold air reaches servers from plenum
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={raisedFloorOpenness}
                onChange={(e) => setRaisedFloorOpenness(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: colors.cold,
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  touchAction: 'none',
                }}
                aria-label="Floor Tile Openness slider"
              />
            </div>

            {/* Metrics */}
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
                <div style={{
                  ...typo.h3,
                  color: metrics.pue < 1.4 ? colors.success : metrics.pue < 1.7 ? colors.warning : colors.error
                }}>
                  {metrics.pue.toFixed(2)}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Est. PUE</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>
                  {metrics.coolingEfficiency.toFixed(0)}%
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cooling Efficiency</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue →
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '72px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            CFD Modeling & Optimization
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Computational Fluid Dynamics</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                CFD solves the Navier-Stokes equations to predict airflow patterns, temperature distributions, and pressure gradients. Engineers use CFD to optimize tile placement, identify hot spots, and validate containment designs before installation.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📉</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Bypass Airflow Problem</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Conditioned air that returns to CRAC units without cooling any equipment is wasted energy. Common sources: poorly placed tiles, gaps under racks, cable cutouts, and oversized floor tile openings. Eliminating bypass can improve efficiency by 20-30%.
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
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>ASHRAE Thermal Guidelines</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Recommended range:</strong> 18-27°C (64-80°F) inlet temperature. Modern equipment tolerates even higher temps, enabling free cooling in more climates. Each 1°C increase in setpoint can reduce cooling energy by 4-5%.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue →
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Server Airflow"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '72px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} completed)
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
                  minHeight: '44px',
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
                Connection to Airflow Management:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>How It Works:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontWeight: 400 }}>{app.howItWorks}</p>
            </div>

            {/* Future impact */}
            <div style={{ marginBottom: '16px', background: `${app.color}11`, borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '6px', fontWeight: 600 }}>Future Impact:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontWeight: 400 }}>{app.futureImpact}</p>
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

          {/* Got It / Next Application button */}
          {!allAppsCompleted ? (
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Find next uncompleted app
                const nextUncompleted = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                if (nextUncompleted !== -1) {
                  setSelectedApp(nextUncompleted);
                } else {
                  const firstUncompleted = newCompleted.findIndex(c => !c);
                  if (firstUncompleted !== -1) {
                    setSelectedApp(firstUncompleted);
                  }
                }
              }}
              style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px' }}
            >
              Got It - Next Application →
            </button>
          ) : (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Continue →
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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
          paddingTop: '84px',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', overflowY: 'auto' }}>
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
                ? 'You\'ve mastered Data Center Airflow Management!'
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '84px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', overflowY: 'auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of {testQuestions.length}
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
                  minHeight: '44px',
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
                  minHeight: '44px',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < testQuestions.length - 1 ? (
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
                  minHeight: '44px',
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
                  minHeight: '44px',
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
        minHeight: '100dvh',
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
          Airflow Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how proper airflow management keeps data centers running efficiently and saves millions in energy costs.
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
              'Hot aisle / cold aisle separation',
              'The physics of air recirculation',
              'Why blanking panels are critical',
              'Hot aisle containment benefits',
              'CFD modeling and PUE optimization',
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

export default ServerAirflowRenderer;
