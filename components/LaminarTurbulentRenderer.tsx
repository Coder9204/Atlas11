'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

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

interface LaminarTurbulentRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// =============================================================================
// SOUND UTILITY
// =============================================================================

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

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================

const testQuestions = [
  {
    scenario: "You're filling a bathtub and notice the water stream from the faucet is perfectly clear and glassy at low flow, but becomes white and chaotic when you turn it up high.",
    question: "What physical quantity determines this transition?",
    options: [
      { id: 'a', label: "Water temperature - hot water is more turbulent" },
      { id: 'b', label: "Reynolds number - the ratio of inertial to viscous forces", correct: true },
      { id: 'c', label: "Water pressure alone - higher pressure equals turbulence" },
      { id: 'd', label: "Pipe material - metal pipes create turbulence" }
    ],
    explanation: "The Reynolds number (Re = rho*v*D/mu) determines flow regime. When inertial forces dominate viscous forces (high Re), flow becomes turbulent. The faucet transition happens as velocity increases, raising Re above ~4000."
  },
  {
    scenario: "A pipeline engineer is designing a system to transport crude oil (viscosity 50x water) versus water through identical pipes at the same volumetric flow rate.",
    question: "Which fluid is more likely to flow turbulently?",
    options: [
      { id: 'a', label: "Oil - its thickness creates more friction and chaos" },
      { id: 'b', label: "Water - lower viscosity means higher Reynolds number", correct: true },
      { id: 'c', label: "Both identical - same pipe, same flow rate" },
      { id: 'd', label: "Cannot determine without knowing pipe diameter" }
    ],
    explanation: "Reynolds number is inversely proportional to viscosity (Re = rho*v*D/mu). Water's much lower viscosity gives it a higher Re at the same velocity, making turbulence more likely. Oil's high viscosity suppresses turbulent fluctuations."
  },
  {
    scenario: "A blood vessel develops a 70% stenosis (narrowing) due to plaque buildup. A doctor places a stethoscope over the area and hears a whooshing sound called a 'bruit'.",
    question: "What causes this audible sound?",
    options: [
      { id: 'a', label: "Blood cells rubbing against the plaque surface" },
      { id: 'b', label: "Turbulent flow - the narrowing increases velocity and Reynolds number", correct: true },
      { id: 'c', label: "Laminar flow becoming more organized" },
      { id: 'd', label: "The heart beating harder to push blood through" }
    ],
    explanation: "The stenosis dramatically increases local blood velocity (continuity equation). This raises the Reynolds number above the critical threshold (~2300-4000), triggering turbulent flow. The chaotic eddies create the audible bruit sound."
  },
  {
    scenario: "A golf ball manufacturer is deciding whether to make balls smooth or dimpled. A smooth ball seems more 'aerodynamic' intuitively.",
    question: "Why do dimpled balls actually fly 2x farther than smooth ones?",
    options: [
      { id: 'a', label: "Dimples trap air, making the ball lighter" },
      { id: 'b', label: "Dimples trigger turbulent boundary layer that delays flow separation, reducing drag", correct: true },
      { id: 'c', label: "Dimples increase spin, which creates lift" },
      { id: 'd', label: "Smooth balls have more surface area creating friction" }
    ],
    explanation: "Counterintuitively, dimples trigger a turbulent boundary layer that stays attached longer around the ball's curve. This dramatically reduces the low-pressure wake behind the ball, cutting total drag by ~50%. The small increase in skin friction is far outweighed by reduced pressure drag."
  },
  {
    scenario: "An aircraft designer is trying to maintain laminar flow over a wing to reduce fuel consumption. Even a small imperfection like bug splatter can ruin the laminar flow region.",
    question: "Why are laminar boundary layers so sensitive to surface imperfections?",
    options: [
      { id: 'a', label: "Imperfections heat up the air" },
      { id: 'b', label: "Small disturbances amplify in laminar flow, triggering transition to turbulence", correct: true },
      { id: 'c', label: "Bugs are chemically reactive with air" },
      { id: 'd', label: "Laminar flow requires perfectly smooth surfaces to exist at all" }
    ],
    explanation: "Laminar flow exists in a delicate balance. Small disturbances (surface roughness, vibrations) can grow exponentially through instability mechanisms. Once disturbances exceed a threshold, they trigger transition to turbulence, increasing drag significantly."
  },
  {
    scenario: "A microfluidics researcher designs a lab-on-chip device with channels only 100 micrometers wide. Fluids flow side-by-side without mixing.",
    question: "Why is turbulent mixing essentially impossible in these tiny channels?",
    options: [
      { id: 'a', label: "The channel walls prevent eddies from forming" },
      { id: 'b', label: "Reynolds number scales with length - microscale means Re << 1, firmly laminar", correct: true },
      { id: 'c', label: "Surface tension prevents turbulence" },
      { id: 'd', label: "Microfluidic devices use special anti-turbulence coatings" }
    ],
    explanation: "Reynolds number is proportional to characteristic length (Re = rho*v*L/mu). At 100 um scale with typical velocities, Re is around 1-100 - thousands of times below the turbulent transition. Viscous forces completely dominate, ensuring laminar flow."
  },
  {
    scenario: "A Formula 1 team notices their car's underbody has small scratches and imperfections from track debris. The aerodynamics team is concerned.",
    question: "How do these imperfections affect the airflow under the car?",
    options: [
      { id: 'a', label: "They have no effect - the car is too fast for imperfections to matter" },
      { id: 'b', label: "They trigger premature transition to turbulent flow, increasing drag", correct: true },
      { id: 'c', label: "They create helpful vortices that increase downforce" },
      { id: 'd', label: "They only matter aesthetically" }
    ],
    explanation: "F1 cars carefully design smooth underbodies to maintain laminar flow regions. Surface imperfections act as 'trip wires' that trigger turbulent transition earlier than intended, increasing skin friction drag and hurting performance."
  },
  {
    scenario: "A chemical plant is pumping a Newtonian fluid through a long pipeline and wants to reduce pumping power costs. They're considering adding drag-reducing polymers.",
    question: "How do these polymers reduce turbulent drag by up to 80%?",
    options: [
      { id: 'a', label: "They make the fluid thicker, reducing flow rate" },
      { id: 'b', label: "They suppress turbulent eddies near the pipe wall without eliminating turbulence", correct: true },
      { id: 'c', label: "They coat the pipe wall making it smoother" },
      { id: 'd', label: "They convert turbulent flow back to laminar" }
    ],
    explanation: "Drag-reducing polymers (like polyethylene oxide) are long-chain molecules that stretch and dampen the small eddies responsible for momentum transfer near the wall. The bulk flow remains turbulent, but near-wall turbulence is suppressed, dramatically reducing friction."
  },
  {
    scenario: "A heat exchanger designer must choose between laminar and turbulent flow for cooling a hot surface. Heat transfer is critical.",
    question: "Which flow regime provides better heat transfer, and why?",
    options: [
      { id: 'a', label: "Laminar - smooth flow allows heat to conduct better" },
      { id: 'b', label: "Turbulent - eddies enhance mixing and heat transfer despite higher pumping cost", correct: true },
      { id: 'c', label: "Both are equal - heat transfer depends only on temperature difference" },
      { id: 'd', label: "Transitional flow - it combines benefits of both" }
    ],
    explanation: "Turbulent flow dramatically enhances heat transfer (5-10x) because eddies continuously bring fresh cool fluid to the hot surface and carry hot fluid away. Laminar flow relies only on slow molecular conduction through the boundary layer. Most heat exchangers operate turbulently."
  },
  {
    scenario: "An engineer calculates Re = 3000 for flow in a pipe. The textbook says transition occurs at Re = 2300.",
    question: "What should the engineer expect to observe?",
    options: [
      { id: 'a', label: "Fully developed turbulent flow throughout the pipe" },
      { id: 'b', label: "Intermittent turbulence - 'turbulent puffs' that come and go amid laminar flow", correct: true },
      { id: 'c', label: "Fully laminar flow - 2300 is just a rough estimate" },
      { id: 'd', label: "The flow will oscillate between fully laminar and fully turbulent" }
    ],
    explanation: "Re = 3000 is in the transition zone (2300-4000). Flow is intermittent - localized turbulent patches ('puffs') form and decay within otherwise laminar flow. The transition is sensitive to disturbances and not a sharp boundary."
  }
];

// =============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications with stats
// =============================================================================

const realWorldApps = [
  {
    icon: '✈️',
    title: 'Aircraft Aerodynamics',
    short: 'Aviation',
    tagline: 'The Quest for Laminar Flow',
    description: 'Aircraft designers obsess over maintaining laminar flow across wings to reduce fuel consumption. At cruise speeds, laminar boundary layers have 5-10x lower skin friction than turbulent ones. Even small imperfections - bug splatter, ice crystals, rivets - can trigger premature transition, destroying laminar flow regions.',
    connection: 'The Reynolds number governs boundary layer transition on aircraft surfaces. At flight Reynolds numbers of 10-100 million, maintaining laminar flow requires careful pressure gradient management and surface smoothness within microns.',
    howItWorks: 'Natural laminar flow (NLF) airfoils have carefully designed pressure distributions that delay transition. Hybrid laminar flow control (HLFC) actively sucks away turbulent disturbances through micro-perforated surfaces. Composite materials enable smoother surfaces than riveted aluminum.',
    stats: [
      { value: '10-15%', label: 'Fuel savings from laminar flow', icon: '⛽' },
      { value: '5-10x', label: 'Drag increase when laminar->turbulent', icon: '📈' },
      { value: '10-100M', label: 'Typical flight Reynolds number', icon: '🔢' }
    ],
    examples: [
      'Boeing 787 uses natural laminar flow nacelles',
      'Gliders achieve 60:1 lift-to-drag with extensive laminar flow',
      'NASA X-66 tests hybrid laminar flow control',
      'F-22 stealth coatings also promote laminar flow'
    ],
    companies: ['Boeing', 'Airbus', 'NASA', 'Lockheed Martin'],
    futureImpact: 'Active laminar flow control with smart surfaces could enable 25-30% efficiency gains, critical for sustainable aviation.',
    color: '#3B82F6'
  },
  {
    icon: '🩺',
    title: 'Cardiovascular Medicine',
    short: 'Blood Flow',
    tagline: 'When Turbulence Means Trouble',
    description: 'Normal blood flow is laminar - smooth and silent. Turbulent blood flow is pathological, occurring at stenoses (narrowings) and faulty heart valves. Doctors literally hear turbulence as murmurs and bruits through stethoscopes. Turbulent flow also damages blood vessel walls and promotes further plaque growth.',
    connection: 'Blood normally has Re ~ 1000-2000 in major arteries. A 70% stenosis can locally increase velocity 10x, pushing Re above 4000 and triggering audible turbulence. The transition is a key diagnostic marker.',
    howItWorks: 'Doppler ultrasound measures blood velocity to calculate local Reynolds numbers. High-velocity jets through stenoses appear as bright signals. Turbulent flow creates characteristic spectral broadening patterns that cardiologists recognize instantly.',
    stats: [
      { value: '~2300', label: 'Critical Re for blood flow', icon: '⚠️' },
      { value: '30-100 cm/s', label: 'Normal arterial velocity', icon: '🌊' },
      { value: '70%', label: 'Stenosis threshold for turbulence', icon: '❤️' }
    ],
    examples: [
      'Carotid bruits indicate stroke risk',
      'Heart murmurs reveal valve problems',
      'Artificial heart valves designed for laminar flow',
      'Stents restore laminar flow in blocked arteries'
    ],
    companies: ['Medtronic', 'Edwards Lifesciences', 'Abbott', 'Siemens Healthineers'],
    futureImpact: 'AI-powered acoustic sensors could enable continuous at-home cardiovascular monitoring, detecting turbulence years before symptoms appear.',
    color: '#EF4444'
  },
  {
    icon: '🏭',
    title: 'Pipeline Engineering',
    short: 'Oil & Gas',
    tagline: 'Billions in Pumping Costs',
    description: 'The oil and gas industry transports fluids through millions of kilometers of pipelines. The difference between laminar and turbulent flow determines pumping power - turbulent flow can require 10x more energy. Drag-reducing polymers can cut turbulent friction by 80%, saving billions annually.',
    connection: 'Pipeline flow regime directly determines pressure drop and pumping cost. Laminar pipe flow (Re < 2300) has friction factor f = 64/Re, while turbulent follows the Moody diagram with much higher values.',
    howItWorks: 'Engineers select pipe diameter based on flow rate and fluid viscosity to optimize Reynolds number. For viscous crude oil, larger pipes maintain lower Re. Drag-reducing agents (long-chain polymers) suppress near-wall turbulence without eliminating bulk turbulent mixing.',
    stats: [
      { value: '80%', label: 'Friction reduction with DRAs', icon: '📉' },
      { value: '$2B+', label: 'Annual DRA market value', icon: '💰' },
      { value: '3M+ km', label: 'Global pipeline network', icon: '🌍' }
    ],
    examples: [
      'Trans-Alaska Pipeline uses heated oil and DRAs',
      'Natural gas pipelines operate at Re > 10 million',
      'Slurry pipelines transport coal-water mixtures',
      'Subsea pipelines require thermal management'
    ],
    companies: ['Kinder Morgan', 'TransCanada', 'Baker Hughes', 'Schlumberger'],
    futureImpact: 'Smart pipeline networks with AI-controlled DRA injection will optimize flow in real-time, crucial for hydrogen transport.',
    color: '#F59E0B'
  },
  {
    icon: '🔬',
    title: 'Microfluidics',
    short: 'Lab-on-Chip',
    tagline: 'Where Laminar is Guaranteed',
    description: 'Microfluidic devices operate at scales where turbulence is essentially impossible. With channel dimensions of 10-500 micrometers, Reynolds numbers rarely exceed 100. This predictable laminar flow enables precise control of chemical reactions, cell sorting, and diagnostic assays on palm-sized "lab-on-chip" devices.',
    connection: 'The Reynolds number scales with length (Re ~ L). At 100 um scale with typical velocities, Re ~ 1-10 - thousands of times below turbulent transition. Two streams flow side-by-side and mix only by diffusion.',
    howItWorks: 'Microfluidic channels exploit laminar flow for precise control. Streams can flow parallel without mixing, enabling concentration gradients. Inertial focusing (at moderate Re ~ 1-100) positions particles at equilibrium locations for high-throughput sorting.',
    stats: [
      { value: '<100', label: 'Typical channel Reynolds number', icon: '📊' },
      { value: '10-500 um', label: 'Channel dimensions', icon: '📏' },
      { value: '10^6/sec', label: 'Cell sorting throughput', icon: '🧫' }
    ],
    examples: [
      'COVID rapid tests use microfluidic transport',
      'Cell sorters isolate circulating tumor cells',
      'Organ-on-chip devices test drug responses',
      'Point-of-care diagnostics from finger pricks'
    ],
    companies: ['Illumina', '10x Genomics', 'Fluidigm', 'Dolomite Microfluidics'],
    futureImpact: 'Lab-on-chip technology will democratize medical diagnostics, enabling comprehensive blood panels from a single drop.',
    color: '#8B5CF6'
  }
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LaminarTurbulentRenderer: React.FC<LaminarTurbulentRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Hook phase
  const [hookStep, setHookStep] = useState(0);
  const [faucetFlow, setFaucetFlow] = useState(0);

  // Play phase - flow simulator
  const [flowVelocity, setFlowVelocity] = useState(0.5);
  const [pipeDiameter, setPipeDiameter] = useState(2);
  const [fluidViscosity, setFluidViscosity] = useState(1);
  const [showDyeInjection, setShowDyeInjection] = useState(true);
  const [dyeParticles, setDyeParticles] = useState<{x: number, y: number, id: number}[]>([]);
  const dyeIdRef = useRef(0);
  const animationRef = useRef<number>();

  // Twist phase - boundary layers
  const [objectShape, setObjectShape] = useState<'sphere' | 'streamlined' | 'flat'>('sphere');

  // Transfer phase
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test phase
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate Reynolds number
  const calculateReynolds = (velocity: number, diameter: number, viscosity: number): number => {
    const density = 1000; // water kg/m3
    // Re = rho*v*D/mu (diameter in cm -> m, viscosity relative to water)
    return (density * velocity * (diameter / 100)) / (viscosity * 0.001);
  };

  // Get flow type based on Reynolds number
  const getFlowType = (Re: number): 'laminar' | 'transition' | 'turbulent' => {
    if (Re < 2300) return 'laminar';
    if (Re < 4000) return 'transition';
    return 'turbulent';
  };

  // Dye particle animation
  useEffect(() => {
    if (phase !== 'play' || !showDyeInjection) return;

    const Re = calculateReynolds(flowVelocity, pipeDiameter, fluidViscosity);
    const flowType = getFlowType(Re);

    const animate = () => {
      // Add new particles
      if (Math.random() < 0.3) {
        const newParticle = {
          id: dyeIdRef.current++,
          x: 50,
          y: 100 + (Math.random() - 0.5) * 20
        };
        setDyeParticles(prev => [...prev.slice(-50), newParticle]);
      }

      // Update particle positions
      setDyeParticles(prev => prev.map(p => {
        let newY = p.y;

        if (flowType === 'turbulent') {
          newY += (Math.random() - 0.5) * 15;
        } else if (flowType === 'transition') {
          newY += (Math.random() - 0.5) * 5;
        }

        return {
          ...p,
          x: p.x + flowVelocity * 3 + 1,
          y: Math.max(70, Math.min(130, newY))
        };
      }).filter(p => p.x < 400));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, flowVelocity, pipeDiameter, fluidViscosity, showDyeInjection]);

  // Colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#22D3EE',
    accentGlow: 'rgba(34, 211, 238, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#2a2a3a',
    laminar: '#22D3EE',
    turbulent: '#F97316',
    primary: '#00D4FF',
    secondary: '#7B68EE',
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
    play: 'Experiment Lab',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Experiment Boundary',
    twist_review: 'Deep Insight',
    transfer: 'Apply Transfer',
    test: 'Quiz Knowledge',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'laminar-turbulent',
        gameTitle: 'Laminar vs Turbulent Flow',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

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

  // Navigation bar component
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
      }}>
        <div>
          {currentIndex > 0 && (
            <button
              onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
              aria-label="Back"
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.textSecondary,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ← Back
            </button>
          )}
        </div>
        <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>🌊 Laminar vs Turbulent Flow</span>
        <div>
          {currentIndex < phaseOrder.length - 1 && (
            <button
              onClick={() => { if (phase !== 'test') goToPhase(phaseOrder[currentIndex + 1]); }}
              aria-label="Next"
              disabled={phase === 'test'}
              style={{
                background: phase === 'test' ? colors.border : colors.accent,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '4px 10px',
                cursor: phase === 'test' ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                opacity: phase === 'test' ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          )}
        </div>
      </nav>
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
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            display: 'block',
          }} />
        </button>
      ))}
    </div>
  );

  // =============================================================================
  // PHASE RENDERS
  // =============================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px 100px',
          textAlign: 'center',
        }}>

        {hookStep === 0 && (
          <>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              animation: 'pulse 2s infinite',
            }}>
              🌊💨
            </div>
            <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Laminar vs Turbulent Flow
            </h1>

            <p style={{
              ...typo.body,
              color: colors.textSecondary,
              maxWidth: '600px',
              marginBottom: '32px',
            }}>
              Turn on a faucet slowly - the water is <span style={{ color: colors.laminar }}>clear and glassy</span>.
              Crank it up - it becomes <span style={{ color: colors.turbulent }}>white and chaotic</span>.
              What changed? Just the speed. Same water, same pipe - but fundamentally different physics.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '500px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Try it: Adjust the faucet below to see the transition.
              </p>

              {/* Faucet visualization */}
              <svg width="300" height="180" viewBox="0 0 300 180" style={{ margin: '20px auto', display: 'block' }}>
                <defs>
                  <linearGradient id="hookFaucetMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9ca3af" />
                    <stop offset="50%" stopColor="#4b5563" />
                    <stop offset="100%" stopColor="#9ca3af" />
                  </linearGradient>
                </defs>

                {/* Faucet */}
                <rect x="125" y="10" width="50" height="30" rx="5" fill="url(#hookFaucetMetal)" />
                <rect x="140" y="35" width="20" height="25" fill="url(#hookFaucetMetal)" />
                <ellipse cx="150" cy="60" rx="12" ry="5" fill="#374151" />

                {/* Water stream */}
                {faucetFlow === 0 ? (
                  <text x="150" y="110" fill={colors.textMuted} fontSize="12" textAnchor="middle">Faucet Off</text>
                ) : faucetFlow < 50 ? (
                  <path d="M 145 65 Q 145 100 143 140 L 157 140 Q 155 100 155 65 Z" fill={colors.laminar} opacity="0.7" />
                ) : (
                  <path d="M 140 65 Q 130 90 125 140 L 175 140 Q 170 90 160 65 Z" fill={colors.turbulent} opacity="0.6">
                    <animate attributeName="d"
                      values="M 140 65 Q 130 90 125 140 L 175 140 Q 170 90 160 65 Z;M 140 65 Q 135 90 120 140 L 180 140 Q 165 90 160 65 Z;M 140 65 Q 130 90 125 140 L 175 140 Q 170 90 160 65 Z"
                      dur="0.3s" repeatCount="indefinite" />
                  </path>
                )}

                {/* Sink */}
                <rect x="75" y="145" width="150" height="25" rx="5" fill="#1f2937" stroke="#374151" />

                {/* Labels */}
                {faucetFlow > 0 && faucetFlow < 50 && (
                  <text x="220" y="100" fill={colors.laminar} fontSize="14" fontWeight="600">Laminar</text>
                )}
                {faucetFlow >= 50 && (
                  <text x="220" y="100" fill={colors.turbulent} fontSize="14" fontWeight="600">Turbulent</text>
                )}
              </svg>

              <div style={{ marginTop: '16px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Faucet: </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={faucetFlow}
                  onChange={(e) => {
                    setFaucetFlow(Number(e.target.value));
                    playSound('click');
                  }}
                  style={{ width: '150px', accentColor: faucetFlow < 50 ? colors.laminar : colors.turbulent }}
                />
                <span style={{ color: colors.textSecondary, fontSize: '14px', marginLeft: '10px' }}>
                  {faucetFlow === 0 ? 'Off' : faucetFlow < 50 ? 'Low' : 'High'}
                </span>
              </div>
            </div>

            <button
              onClick={() => { playSound('click'); setHookStep(1); }}
              style={{
                ...primaryButtonStyle,
                opacity: faucetFlow > 30 ? 1 : 0.5,
                cursor: faucetFlow > 30 ? 'pointer' : 'not-allowed',
              }}
              disabled={faucetFlow <= 30}
            >
              Start Exploring
            </button>
          </>
        )}

        {hookStep === 1 && (
          <>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              The Reynolds Number
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxWidth: '600px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{
                  padding: '16px',
                  background: `${colors.laminar}15`,
                  borderRadius: '12px',
                  border: `2px solid ${colors.laminar}`
                }}>
                  <p style={{ color: colors.laminar, fontWeight: '600', margin: '0 0 8px 0' }}>Laminar Flow</p>
                  <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>
                    Smooth parallel layers sliding past each other. Re &lt; 2300
                  </p>
                </div>
                <div style={{
                  padding: '16px',
                  background: `${colors.turbulent}15`,
                  borderRadius: '12px',
                  border: `2px solid ${colors.turbulent}`
                }}>
                  <p style={{ color: colors.turbulent, fontWeight: '600', margin: '0 0 8px 0' }}>Turbulent Flow</p>
                  <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>
                    Chaotic eddies and mixing in all directions. Re &gt; 4000
                  </p>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: colors.bgSecondary,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ color: colors.accent, fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' }}>
                  Re = rho * v * D / mu
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                  Reynolds number = Inertial forces / Viscous forces
                </p>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Continue to Predict
            </button>
          </>
        )}

        {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Water - lower viscosity allows chaos to develop more easily', correct: true },
      { id: 'b', text: 'Honey - its thickness creates more friction and turbulence' },
      { id: 'c', text: 'Same - velocity alone determines turbulence, not fluid properties' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', padding: '72px 24px 100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Step 1 of 1
            </span>
          </div>

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
            You have two identical pipes at the same flow velocity. One carries water, the other honey.
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="100%" height="100" viewBox="0 0 400 100">
              {/* Water pipe */}
              <g transform="translate(100, 40)">
                <rect x="-60" y="-15" width="120" height="30" rx="5" fill="#333" />
                <rect x="-55" y="-10" width="110" height="20" fill={colors.laminar} opacity="0.4" />
                <text y="30" fill={colors.laminar} fontSize="12" textAnchor="middle">Water (thin)</text>
              </g>
              {/* Honey pipe */}
              <g transform="translate(300, 40)">
                <rect x="-60" y="-15" width="120" height="30" rx="5" fill="#333" />
                <rect x="-55" y="-10" width="110" height="20" fill={colors.warning} opacity="0.6" />
                <text y="30" fill={colors.warning} fontSize="12" textAnchor="middle">Honey (thick)</text>
              </g>
              <text x="200" y="50" fill={colors.textSecondary} fontSize="14" textAnchor="middle">vs</text>
            </svg>

            <p style={{ ...typo.h3, color: colors.textPrimary, marginTop: '16px' }}>
              Which flow is more likely to become turbulent?
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
              Test My Prediction
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Reynolds Number Simulator
  if (phase === 'play') {
    const Re = calculateReynolds(flowVelocity, pipeDiameter, fluidViscosity);
    const flowType = getFlowType(Re);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', padding: '72px 24px 100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Reynolds Number Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
            Adjust velocity, diameter, and viscosity to control the flow regime.
          </p>
          <p style={{ ...typo.small, color: '#e2e8f0', textAlign: 'center', marginBottom: '8px' }}>
            This visualization shows how fluid flow transitions between laminar and turbulent regimes. Observe the dye streaks: laminar flow displays smooth parallel lines while turbulent flow illustrates chaotic mixing patterns.
          </p>
          <p style={{ ...typo.small, color: '#e2e8f0', textAlign: 'center', marginBottom: '8px' }}>
            When you increase velocity, Re increases and the flow regime changes. Higher Re causes the inertial forces to overcome viscous damping, because the ratio of momentum to friction rises above the critical threshold (~4000).
          </p>
          <p style={{ ...typo.small, color: '#e2e8f0', textAlign: 'center', marginBottom: '16px' }}>
            Try adjusting each slider to observe how it affects the Reynolds number. Experiment with viscosity: watch how increasing it calms turbulent flow. Notice how diameter and velocity both affect the transition threshold.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Pipe visualization with dye */}
            <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <svg width="100%" height="240" viewBox="0 0 450 240">
                <defs>
                  <linearGradient id="pipeWall" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6b7280" />
                    <stop offset="50%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#6b7280" />
                  </linearGradient>
                  <linearGradient id="pipeInterior" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1f2937" />
                    <stop offset="50%" stopColor="#030712" />
                    <stop offset="100%" stopColor="#1f2937" />
                  </linearGradient>
                  <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="depthShadow">
                    <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.6)" />
                  </filter>
                </defs>

                {/* Background/grid layer */}
                <g id="grid-layer">
                  <rect x="0" y="0" width="450" height="240" fill="#111827" rx="8" />
                  {[60, 80, 100, 120, 140].map(y => (
                    <line key={y} x1="25" y1={y} x2="425" y2={y} stroke="#1f2937" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  ))}
                  {/* Y-axis label */}
                  <text x="12" y="100" fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90, 12, 100)">Velocity Profile</text>
                  {/* X-axis label */}
                  <text x="225" y="230" fill="#94a3b8" fontSize="11" textAnchor="middle">Flow Direction →</text>
                </g>

                {/* Pipe layer */}
                <g id="pipe-layer" filter="url(#depthShadow)">
                  <rect x="25" y="55" width="400" height="10" fill="url(#pipeWall)" />
                  <rect x="25" y="155" width="400" height="10" fill="url(#pipeWall)" />
                  <rect x="25" y="65" width="400" height="90" fill="url(#pipeInterior)" />
                </g>

                {/* Flow streamlines layer */}
                <g id="flow-layer">
                {flowType === 'laminar' ? (
                  [75, 88, 100, 112, 125].map((y, i) => (
                    <line key={i} x1="40" y1={y} x2="410" y2={y} stroke={colors.laminar} strokeWidth="2" opacity="0.5">
                      <animate attributeName="stroke-dashoffset" from="0" to="-20" dur={`${1.5 - flowVelocity * 0.2}s`} repeatCount="indefinite" />
                    </line>
                  ))
                ) : flowType === 'turbulent' ? (
                  [75, 88, 100, 112, 125].map((y, i) => (
                    <path key={i}
                      d={`M 40 ${y} Q 100 ${y + (i % 2 === 0 ? 35 : -35)} 160 ${y} Q 220 ${y + (i % 2 === 0 ? -30 : 30)} 280 ${y} Q 340 ${y + (i % 2 === 0 ? 35 : -35)} 410 ${y}`}
                      fill="none" stroke={colors.turbulent} strokeWidth="2" opacity="0.5">
                      <animate attributeName="d"
                        values={`M 40 ${y} Q 100 ${y + 35} 160 ${y} Q 220 ${y - 30} 280 ${y} Q 340 ${y + 35} 410 ${y};M 40 ${y} Q 100 ${y - 35} 160 ${y} Q 220 ${y + 30} 280 ${y} Q 340 ${y - 35} 410 ${y};M 40 ${y} Q 100 ${y + 35} 160 ${y} Q 220 ${y - 30} 280 ${y} Q 340 ${y + 35} 410 ${y}`}
                        dur="0.5s" repeatCount="indefinite" />
                    </path>
                  ))
                ) : (
                  [75, 88, 100, 112, 125].map((y, i) => (
                    <path key={i}
                      d={`M 40 ${y} Q 150 ${y + (i % 2 === 0 ? 25 : -25)} 260 ${y} Q 350 ${y + (i % 2 === 0 ? -20 : 20)} 410 ${y}`}
                      fill="none" stroke={colors.warning} strokeWidth="2" opacity="0.5">
                      <animate attributeName="d"
                        values={`M 40 ${y} Q 150 ${y + 25} 260 ${y} Q 350 ${y - 20} 410 ${y};M 40 ${y} Q 150 ${y - 20} 260 ${y} Q 350 ${y + 25} 410 ${y};M 40 ${y} Q 150 ${y + 25} 260 ${y} Q 350 ${y - 20} 410 ${y}`}
                        dur="1.5s" repeatCount="indefinite" />
                    </path>
                  ))
                )}
                </g>

                {/* Dye particles layer */}
                <g id="dye-layer">
                {showDyeInjection && dyeParticles.map(p => (
                  <circle key={p.id} cx={p.x} cy={p.y} r="4"
                    fill={flowType === 'turbulent' ? colors.turbulent : flowType === 'laminar' ? colors.laminar : colors.warning}
                  />
                ))}

                {showDyeInjection && (
                  <g transform="translate(35, 68)">
                    <rect x="-10" y="0" width="20" height="80" rx="3" fill="#8B5CF6" />
                    <rect x="-5" y="15" width="10" height="40" fill="#0a0f1a" opacity="0.5" />
                  </g>
                )}
                </g>

                {/* Labels/annotations layer */}
                <g id="labels-layer">
                  <text x="225" y="25" fill={flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning}
                    fontSize="14" textAnchor="middle" fontWeight="700">
                    {flowType.toUpperCase()} FLOW — Re = {Re.toFixed(0)}
                  </text>
                  <text x="225" y="40" fill="#94a3b8" fontSize="11" textAnchor="middle">Re = ρvD/μ</text>
                  {/* Tick marks on pipe walls */}
                  {[100, 175, 250, 325, 400].map(x => (
                    <line key={x} x1={x} y1="55" x2={x} y2="62" stroke="#6b7280" strokeWidth="1" />
                  ))}
                </g>

                {/* Interactive Re indicator circle - position moves with flow velocity slider */}
                <circle
                  cx={Math.min(420, Math.max(30, 30 + ((flowVelocity - 0.1) / (5 - 0.1)) * 380))}
                  cy="100"
                  r="9"
                  fill={flowType === 'laminar' ? '#22D3EE' : flowType === 'turbulent' ? '#EF4444' : '#F59E0B'}
                  stroke={flowType === 'laminar' ? '#22D3EE' : flowType === 'turbulent' ? '#EF4444' : '#F59E0B'}
                  strokeWidth="2"
                  filter="url(#glowFilter)"
                />
              </svg>
            </div>

            {/* Reynolds number display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: flowType === 'laminar' ? colors.laminar : flowType === 'turbulent' ? colors.turbulent : colors.warning }}>
                  {Re.toFixed(0)}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Reynolds Number</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.laminar }}>2300</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Laminar Limit</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.turbulent }}>4000</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Turbulent Threshold</div>
              </div>
            </div>
          </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Sliders */}
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Velocity slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Velocity (v)</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{flowVelocity.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={flowVelocity}
                  onChange={(e) => setFlowVelocity(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>

              {/* Diameter slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Diameter (D)</span>
                  <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{pipeDiameter.toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={pipeDiameter}
                  onChange={(e) => setPipeDiameter(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>

              {/* Viscosity slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Viscosity (mu)</span>
                  <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{fluidViscosity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={fluidViscosity}
                  onChange={(e) => setFluidViscosity(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', borderRadius: '4px', cursor: 'pointer' }}
                />
              </div>

              {/* Dye toggle */}
              <button
                onClick={() => setShowDyeInjection(!showDyeInjection)}
                style={{
                  padding: '10px 16px',
                  background: showDyeInjection ? colors.accent + '33' : colors.bgSecondary,
                  color: showDyeInjection ? colors.accent : colors.textMuted,
                  border: `1px solid ${showDyeInjection ? colors.accent : colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  minHeight: '44px',
                }}
              >
                {showDyeInjection ? 'Dye Injection: ON' : 'Dye Injection: OFF'}
              </button>
            </div>
          </div>
          </div>

          {/* Legend panel */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: colors.laminar }} />
              <span style={{ ...typo.small, color: colors.textSecondary }}>Laminar Flow (Re &lt; 2300)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: colors.warning }} />
              <span style={{ ...typo.small, color: colors.textSecondary }}>Transition (2300-4000)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: colors.turbulent }} />
              <span style={{ ...typo.small, color: colors.textSecondary }}>Turbulent Flow (Re &gt; 4000)</span>
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
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.success }}>Real-World Relevance:</strong> Engineers use Reynolds number calculations daily to design everything from aircraft wings to blood vessel stents to oil pipelines. Understanding flow regimes is critical for optimizing efficiency and safety.
            </p>
          </div>

          {/* Discovery prompt */}
          <div style={{
            background: `${colors.accent}22`,
            border: `1px solid ${colors.accent}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
              {flowType === 'laminar'
                ? "Notice the smooth, parallel dye streaks. Increase velocity to see the transition!"
                : flowType === 'turbulent'
                ? "See how the dye mixes chaotically? Try increasing viscosity to calm it down."
                : "You're in the transition zone! Small disturbances can tip it either way."}
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Next →
          </button>
        </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const userPredictedCorrect = prediction === 'a';
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Flow Regimes
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Re = rho * v * D / mu</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The Reynolds number compares <span style={{ color: colors.turbulent }}>inertial forces</span> (momentum, pushing forward) to <span style={{ color: colors.laminar }}>viscous forces</span> (internal friction, resisting motion).
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.laminar }}>Re &lt; 2300:</strong> Laminar - viscosity wins, flow stays organized</li>
                <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.warning }}>2300 &lt; Re &lt; 4000:</strong> Transition - unstable, intermittent turbulence</li>
                <li><strong style={{ color: colors.turbulent }}>Re &gt; 4000:</strong> Turbulent - inertia wins, chaotic mixing</li>
              </ul>
            </div>
          </div>

          <div style={{
            background: userPredictedCorrect ? `${colors.success}11` : `${colors.warning}11`,
            border: `1px solid ${userPredictedCorrect ? colors.success : colors.warning}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: userPredictedCorrect ? colors.success : colors.warning, marginBottom: '12px' }}>
              {userPredictedCorrect
                ? "Your prediction was correct! Water becomes turbulent more easily."
                : "Revisiting your prediction: The key insight is about viscosity!"}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Water (low viscosity) becomes turbulent more easily than honey (high viscosity) at the same velocity.
              Viscosity in the denominator means higher mu = lower Re = more laminar.
              Honey's thickness acts like a damper, suppressing turbulent fluctuations.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Why This Matters
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Engineers use Reynolds number to predict flow in pipes, around aircraft, through blood vessels, and in microfluidic devices.
              Laminar flow is predictable and efficient. Turbulent flow enhances mixing and heat transfer but increases drag.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Next →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Smooth ball - less surface friction means less drag' },
      { id: 'b', text: 'Dimpled ball - roughness somehow reduces drag', correct: true },
      { id: 'c', text: 'Same distance - only mass and launch angle matter' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}
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
              The Golf Ball Paradox — What do you predict will happen?
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Golf balls have 300-500 dimples. A smooth ball seems more "aerodynamic"...
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="100%" height="120" viewBox="0 0 400 120">
              {/* Smooth ball */}
              <g transform="translate(100, 60)">
                <circle r="35" fill="#fff" />
                <text y="55" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Smooth</text>
              </g>
              {/* Dimpled ball */}
              <g transform="translate(300, 60)">
                <circle r="35" fill="#fff" />
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 30) * Math.PI / 180;
                  const r = 25;
                  return (
                    <circle key={i} cx={r * Math.cos(angle)} cy={r * Math.sin(angle)} r={4} fill="#ddd" />
                  );
                })}
                <text y="55" fill={colors.textSecondary} fontSize="11" textAnchor="middle">Dimpled</text>
              </g>
              <text x="200" y="65" fill={colors.textSecondary} fontSize="16" textAnchor="middle" fontWeight="700">VS</text>
            </svg>

            <p style={{ ...typo.h3, color: colors.textPrimary, marginTop: '16px' }}>
              Which ball flies farther?
            </p>
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
              See the Answer
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
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Boundary Layer Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Explore why dimples reduce drag on blunt objects.
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>

            {/* Visualization */}
            <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <svg width="100%" height="200" viewBox="0 0 500 200">
                <defs>
                  <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#e5e7eb" />
                    <stop offset="100%" stopColor="#6b7280" />
                  </radialGradient>
                  <linearGradient id="wakeGradRed" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor={colors.error} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={colors.error} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="wakeGradGreen" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor={colors.success} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={colors.success} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Incoming flow arrows */}
                {[40, 70, 100, 130, 160].map((y, i) => (
                  <g key={i}>
                    <line x1="10" y1={y} x2="60" y2={y} stroke={colors.laminar} strokeWidth="2" opacity="0.5" />
                    <polygon points="60,-4 72,0 60,4" transform={`translate(0, ${y})`} fill={colors.laminar} opacity="0.5" />
                  </g>
                ))}

                {objectShape === 'sphere' && (
                  <>
                    {/* SMOOTH SPHERE - left */}
                    <g transform="translate(140, 100)">
                      <circle r="40" fill="url(#sphereGrad)" />
                      <path d="M 40 -5 Q 60 -30 90 -35 L 90 35 Q 60 30 40 5" fill="url(#wakeGradRed)" />
                      <text x="0" y="60" fill={colors.error} fontSize="11" textAnchor="middle" fontWeight="600">SMOOTH</text>
                      <text x="0" y="75" fill={colors.textMuted} fontSize="9" textAnchor="middle">Large wake = High drag</text>
                      <circle cx="40" cy="0" r="4" fill={colors.error}>
                        <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                      </circle>
                      <text x="55" y="-15" fill={colors.error} fontSize="8">Early separation</text>
                    </g>

                    {/* VS */}
                    <text x="250" y="105" fill={colors.textSecondary} fontSize="16" textAnchor="middle" fontWeight="700">VS</text>

                    {/* DIMPLED SPHERE - right */}
                    <g transform="translate(360, 100)">
                      <circle r="40" fill="url(#sphereGrad)" />
                      {/* Dimples */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 30) * Math.PI / 180;
                        return <circle key={i} cx={28 * Math.cos(angle)} cy={28 * Math.sin(angle)} r="4" fill="#9ca3af" />;
                      })}
                      <path d="M 40 -5 Q 50 -30 65 -35 L 65 35 Q 50 30 40 5" fill="url(#wakeGradGreen)" />
                      <text x="0" y="60" fill={colors.success} fontSize="11" textAnchor="middle" fontWeight="600">DIMPLED</text>
                      <text x="0" y="75" fill={colors.textMuted} fontSize="9" textAnchor="middle">Small wake = 50% less drag!</text>
                      <circle cx="38" cy="20" r="4" fill={colors.success}>
                        <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                      </circle>
                      <text x="55" y="30" fill={colors.success} fontSize="8">Late separation</text>
                    </g>
                  </>
                )}

                {objectShape === 'streamlined' && (
                  <g transform="translate(250, 100)">
                    <ellipse rx="100" ry="35" fill="url(#sphereGrad)" />
                    <path d="M 100 -5 Q 110 -30 120 -35 L 120 35 Q 110 30 100 5" fill="url(#wakeGradGreen)" />
                    <text x="0" y="55" fill={colors.success} fontSize="12" textAnchor="middle" fontWeight="600">STREAMLINED</text>
                    <text x="0" y="70" fill={colors.textMuted} fontSize="10" textAnchor="middle">Flow stays attached - Minimal drag</text>
                  </g>
                )}

                {objectShape === 'flat' && (
                  <g transform="translate(250, 100)">
                    <rect x="-15" y="-50" width="30" height="100" rx="3" fill="#6b7280" />
                    <ellipse cx="80" cy="0" rx="80" ry="60" fill="url(#wakeGradRed)" />
                    {/* Eddies */}
                    {[40, 80, 120].map((x, i) => (
                      <circle key={i} cx={x} cy={(i % 2 === 0 ? -1 : 1) * 20} r={15 + i * 3} fill="none" stroke={colors.error} strokeWidth="1" opacity="0.3">
                        <animateTransform attributeName="transform" type="rotate" values={`0 ${x} ${(i % 2 === 0 ? -1 : 1) * 20}; 360 ${x} ${(i % 2 === 0 ? -1 : 1) * 20}`} dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                    <text x="0" y="70" fill={colors.error} fontSize="12" textAnchor="middle" fontWeight="600">FLAT PLATE</text>
                    <text x="0" y="85" fill={colors.textMuted} fontSize="10" textAnchor="middle">Immediate separation - Maximum drag</text>
                  </g>
                )}
              </svg>
            </div>

            {/* Explanation */}
            <div style={{
              padding: '16px',
              background: colors.bgSecondary,
              borderRadius: '8px',
              borderLeft: `4px solid ${objectShape === 'sphere' ? colors.success : objectShape === 'streamlined' ? colors.success : colors.error}`
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                {objectShape === 'sphere' ? (
                  <>
                    <strong style={{ color: colors.success }}>The Dimple Effect:</strong> Dimples trigger a turbulent boundary layer that has more momentum near the surface.
                    This energized layer stays attached longer, dramatically reducing the wake and total drag by ~50%.
                  </>
                ) : objectShape === 'streamlined' ? (
                  <>
                    <strong style={{ color: colors.success }}>Streamlined shapes</strong> avoid the need for boundary layer tricks - the gentle curves keep flow attached naturally.
                    Laminar flow here is optimal!
                  </>
                ) : (
                  <>
                    <strong style={{ color: colors.error }}>Flat plates</strong> cause immediate separation regardless of boundary layer state.
                    Turbulent BL cannot help much here - the shape itself is the problem.
                  </>
                )}
              </p>
            </div>
          </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Shape selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {(['sphere', 'streamlined', 'flat'] as const).map(shape => (
                <button
                  key={shape}
                  onClick={() => setObjectShape(shape)}
                  style={{
                    padding: '10px 20px',
                    background: objectShape === shape ? colors.accent : colors.bgSecondary,
                    color: objectShape === shape ? colors.bgPrimary : colors.textSecondary,
                    border: `1px solid ${objectShape === shape ? colors.accent : colors.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: objectShape === shape ? '600' : '400',
                    minHeight: '44px',
                  }}
                >
                  {shape === 'sphere' ? 'Sphere (Golf Ball)' : shape === 'streamlined' ? 'Streamlined' : 'Flat Plate'}
                </button>
              ))}
            </div>
          </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Trade-off
          </button>
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
        paddingTop: '80px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            When Turbulence Helps vs Hurts
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚽</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Turbulence HELPS (Blunt Objects)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Golf balls, soccer balls, cyclist helmets - turbulent boundary layers delay separation, reducing wake drag.
                The small increase in skin friction is far outweighed by the reduced pressure drag.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.error}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>✈️</span>
                <h3 style={{ ...typo.h3, color: colors.error, margin: 0 }}>Turbulence HURTS (Streamlined Objects)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Aircraft wings, submarines, race cars - for these shapes, laminar flow already stays attached.
                Triggering turbulence only adds skin friction drag with no wake benefit.
              </p>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚖️</span>
                <h3 style={{ ...typo.h3, color: colors.accent, margin: 0 }}>The Engineering Trade-off</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Engineers must consider: Can the shape be streamlined? If not, would triggering turbulence reduce wake drag more than it adds skin friction?
                The answer depends on shape, speed, and Reynolds number.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Laminar Turbulent"
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0', overflowY: 'auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedCount} explored)
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
                  {a.short}
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
                Flow Physics Connection:
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

            {/* Got It button for within-phase navigation */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Move to next app or stay on current
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginTop: '16px',
                background: completedApps[selectedApp] ? colors.bgSecondary : `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
                color: completedApps[selectedApp] ? colors.textSecondary : 'white',
              }}
            >
              {completedApps[selectedApp] ? 'Reviewed' : 'Got It'}
            </button>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
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
          paddingTop: '80px',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand laminar and turbulent flow!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
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
                Review and Try Again
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
        paddingTop: '80px',
      }}>
        {renderNavBar()}
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
                Previous
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
                  minHeight: '44px',
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
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🌊🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Flow Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the physics of laminar and turbulent flow, and when each is beneficial.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '450px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Reynolds number predicts flow regime (Re = rho*v*D/mu)',
              'Re < 2300: Laminar | Re > 4000: Turbulent',
              'Higher viscosity suppresses turbulence',
              'Dimples help blunt objects by delaying separation',
              'Streamlined shapes benefit from laminar flow',
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
              minHeight: '44px',
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
              minHeight: '44px',
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

export default LaminarTurbulentRenderer;
