'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Conservation of Energy - Complete 10-Phase Game
// Why energy can never be created or destroyed, only transformed
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

interface EnergyConservationRendererProps {
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
    scenario: "A roller coaster car is at the top of the first hill, 50 meters high. Passengers notice that no motors push the car after the initial climb, yet it travels through loops, curves, and smaller hills.",
    question: "Why must the first hill always be the tallest on a roller coaster without mid-ride motors?",
    options: [
      { id: 'a', label: "The first hill provides all the gravitational potential energy for the entire ride", correct: true },
      { id: 'b', label: "Higher hills would make passengers too dizzy" },
      { id: 'c', label: "Building taller hills later would be too expensive" },
      { id: 'd', label: "Wind resistance pushes the car harder on later hills" }
    ],
    explanation: "The first hill stores gravitational potential energy (PE = mgh). This energy converts to kinetic energy going down and back to potential energy going up subsequent hills. Since some energy is always lost to friction and air resistance, each subsequent hill must be shorter than the previous peak."
  },
  {
    scenario: "A physics student releases a marble from a height of 2 meters on a frictionless track shaped like a U. The marble rolls down, across the bottom, and up the other side.",
    question: "How high will the marble rise on the opposite side of a perfectly frictionless track?",
    options: [
      { id: 'a', label: "Less than 2 meters because gravity slows it down" },
      { id: 'b', label: "Exactly 2 meters - all potential energy converts back", correct: true },
      { id: 'c', label: "More than 2 meters because it gains speed going down" },
      { id: 'd', label: "It depends on the mass of the marble" }
    ],
    explanation: "On a frictionless track, mechanical energy is perfectly conserved. At release: PE = mgh = mg(2m). At the bottom: all PE becomes KE. At the opposite peak: all KE converts back to PE. Since total energy is conserved and mass/gravity are constant, the marble returns to exactly 2 meters."
  },
  {
    scenario: "A car traveling at 60 km/h applies its brakes and comes to a complete stop. The driver notices the brake discs glowing red-hot after the stop.",
    question: "Where did the car's kinetic energy go when it stopped?",
    options: [
      { id: 'a', label: "The energy was destroyed by the friction of braking" },
      { id: 'b', label: "The energy transferred to the road surface" },
      { id: 'c', label: "The kinetic energy converted to thermal energy in the brakes", correct: true },
      { id: 'd', label: "The energy was stored in the brake pads for later use" }
    ],
    explanation: "Energy cannot be destroyed, only transformed. The car's kinetic energy (1/2 mv^2) converts to thermal energy through friction between the brake pads and rotors. This is why brakes get extremely hot during heavy braking - the heat IS the car's former kinetic energy."
  },
  {
    scenario: "A pendulum is released from a 30-degree angle in a vacuum chamber with no air resistance. After 1000 swings, a physicist measures its maximum angle.",
    question: "What angle will the pendulum reach after 1000 swings in a perfect vacuum?",
    options: [
      { id: 'a', label: "Slightly less than 30 degrees due to accumulated losses" },
      { id: 'b', label: "Exactly 30 degrees - no energy loss mechanisms exist", correct: true },
      { id: 'c', label: "More than 30 degrees as it builds momentum" },
      { id: 'd', label: "Zero degrees - it would have stopped by then" }
    ],
    explanation: "In a perfect vacuum with no friction, the pendulum experiences no energy dissipation. The sum PE + KE remains constant. At maximum displacement, KE = 0 and PE is maximum. Since total energy never changes, maximum displacement angle stays exactly 30 degrees forever."
  },
  {
    scenario: "Two identical balls are dropped from 10 meters - Ball A onto a concrete floor and Ball B onto a foam mat. Ball A bounces back to 8 meters while Ball B bounces to only 2 meters.",
    question: "Why does Ball B lose more mechanical energy than Ball A?",
    options: [
      { id: 'a', label: "Ball B is defective and doesn't store energy properly" },
      { id: 'b', label: "The foam mat absorbs and dissipates more energy as heat and deformation", correct: true },
      { id: 'c', label: "Concrete creates more kinetic energy during the collision" },
      { id: 'd', label: "Ball A gains energy from the hard surface" }
    ],
    explanation: "The foam mat is an inelastic material that converts more kinetic energy into thermal energy and permanent deformation. Total energy is still conserved - it's just that more transforms into non-mechanical forms. Concrete is more elastic, returning more energy to the ball as kinetic energy."
  },
  {
    scenario: "A hydroelectric dam generates electricity by releasing water from a reservoir 100 meters above the turbines. Engineers calculate that the falling water has potential energy of 1000 megajoules.",
    question: "If the turbines are 90% efficient, how much electrical energy is generated?",
    options: [
      { id: 'a', label: "1000 MJ - energy is always conserved" },
      { id: 'b', label: "900 MJ - 90% is converted to electricity, 10% becomes heat", correct: true },
      { id: 'c', label: "1100 MJ - the turbines add energy through spinning" },
      { id: 'd', label: "100 MJ - most energy is lost to gravity" }
    ],
    explanation: "While total energy is conserved, not all can be converted to the desired form. 900 MJ becomes electrical energy, and 100 MJ becomes thermal energy (friction, turbulence, resistance). The sum is still 1000 MJ - energy conservation holds, but transformation efficiency is limited."
  },
  {
    scenario: "A pole vaulter sprints at 10 m/s, plants the pole, and launches into the air. At the peak of the vault, the athlete is momentarily stationary at 6 meters height.",
    question: "What sequence of energy transformations occurs during a pole vault?",
    options: [
      { id: 'a', label: "Chemical -> Kinetic -> Elastic -> Gravitational Potential", correct: true },
      { id: 'b', label: "Kinetic -> Gravitational -> Kinetic -> Elastic" },
      { id: 'c', label: "Potential -> Kinetic -> Thermal -> Chemical" },
      { id: 'd', label: "Elastic -> Kinetic -> Chemical -> Potential" }
    ],
    explanation: "The vaulter's muscles convert chemical energy (ATP) to kinetic energy during the sprint. The bending pole stores this as elastic potential energy. As the pole straightens, elastic PE converts to gravitational PE as the athlete rises. At the peak, all energy is gravitational potential."
  },
  {
    scenario: "A Tesla Model 3 uses regenerative braking, which recovers energy when slowing down. The car approaches a stop sign at 50 km/h and activates regenerative braking.",
    question: "How does regenerative braking recover energy that would otherwise be lost?",
    options: [
      { id: 'a', label: "It stores the kinetic energy in compressed springs" },
      { id: 'b', label: "The electric motor runs as a generator, converting KE to electrical energy", correct: true },
      { id: 'c', label: "It captures heat from friction and converts it to electricity" },
      { id: 'd', label: "The battery directly absorbs kinetic energy from the wheels" }
    ],
    explanation: "In regenerative braking, the electric motor operates in reverse as a generator. The car's kinetic energy turns the motor/generator, inducing electrical current that charges the battery. This converts KE to electrical PE rather than wasting it as heat in brake pads."
  },
  {
    scenario: "A ball is thrown straight up with 100 joules of kinetic energy. At the peak of its trajectory, a student measures its kinetic energy and gravitational potential energy.",
    question: "At the peak, what are the ball's KE and PE values? (Ignore air resistance)",
    options: [
      { id: 'a', label: "KE = 50 J, PE = 50 J" },
      { id: 'b', label: "KE = 0 J, PE = 100 J", correct: true },
      { id: 'c', label: "KE = 100 J, PE = 0 J" },
      { id: 'd', label: "KE = 100 J, PE = 100 J" }
    ],
    explanation: "At the peak, the ball momentarily stops (v = 0), so KE = 1/2mv^2 = 0. By conservation of energy, the original 100 J must still exist. Since KE = 0, all 100 J must be gravitational potential energy. The total (KE + PE = 0 + 100 = 100 J) equals the initial energy."
  },
  {
    scenario: "Scientists create a perfect perpetual motion machine that generates 100 watts of power continuously without any energy input. They plan to patent it and solve the world's energy crisis.",
    question: "Why is this perpetual motion machine impossible?",
    options: [
      { id: 'a', label: "Friction always exists and cannot be eliminated" },
      { id: 'b', label: "It would violate the law of conservation of energy - energy cannot be created", correct: true },
      { id: 'c', label: "The materials would eventually wear out" },
      { id: 'd', label: "Government regulations prohibit such devices" }
    ],
    explanation: "A machine generating energy without input would create energy from nothing, violating the first law of thermodynamics (conservation of energy). Energy can only transform between forms, not appear spontaneously. Every perpetual motion claim has been debunked - this is considered one of physics' most fundamental laws."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🎢',
    title: 'Roller Coaster Engineering',
    short: 'Theme park physics in action',
    tagline: 'Where gravity becomes the ultimate engine',
    description: 'Roller coasters are masterpieces of energy conservation engineering. The initial climb stores gravitational potential energy that powers the entire ride. Every hill, loop, and curve is precisely designed to work within the energy budget established by that first drop.',
    connection: 'The PE = mgh equation determines maximum speed at any point. Engineers calculate that velocity at any height equals sqrt(2g(h_initial - h_current)). This is why coasters feel fastest at the lowest points - all PE has converted to KE.',
    howItWorks: 'A chain lift or launch system does work on the train, converting electrical energy to gravitational PE. As the train descends, PE transforms to KE (maximum at the bottom). Going up the next hill converts KE back to PE. Friction and air resistance dissipate about 10% per major element, explaining why each hill must be progressively shorter.',
    stats: [
      { value: '139 m', label: 'Kingda Ka drop height', icon: '📐' },
      { value: '240 km', label: 'Top speed per hour', icon: '💨' },
      { value: '10%', label: 'Energy lost to friction', icon: '🎯' }
    ],
    examples: ['Steel Vengeance uses terrain to maximize initial PE storage', 'Loop radii vary by height to maintain safe speeds (clothoid shapes)', 'Magnetic brakes convert KE to electrical energy via eddy currents', 'Launch coasters use linear induction motors for PE-free acceleration'],
    companies: ['Intamin', 'Bolliger & Mabillard', 'Rocky Mountain Construction', 'Mack Rides', 'Vekoma'],
    futureImpact: 'Next-generation coasters will feature regenerative braking systems that capture KE during deceleration to power the next launch, potentially reducing energy consumption by 30%. Virtual reality integration adds perceived thrills without requiring additional height or speed.',
    color: '#EF4444'
  },
  {
    icon: '💧',
    title: 'Hydroelectric Power Generation',
    short: 'Gravity powering civilization',
    tagline: 'Converting water height to watts for billions',
    description: 'Hydroelectric dams represent humanity\'s most efficient large-scale application of energy conservation. Water stored at height contains enormous gravitational potential energy. The Three Gorges Dam stores more energy than 50 nuclear power plants can generate in a day.',
    connection: 'The power equation P = (density)(g)(height)(flow rate)(efficiency) comes directly from PE = mgh. A 100-meter dam with 90% efficient turbines converts 90% of the water\'s potential energy to electricity - far exceeding combustion efficiency.',
    howItWorks: 'Water in the reservoir has PE = mgh based on dam height. When released, water accelerates through penstocks (large pipes), converting PE to KE. Fast-moving water spins turbine blades, converting KE to rotational mechanical energy. Generators use electromagnetic induction to convert rotation to electrical energy.',
    stats: [
      { value: '22.5 GW', label: 'Three Gorges capacity', icon: '⚡' },
      { value: '90%+', label: 'Conversion efficiency', icon: '📊' },
      { value: '16%', label: 'Global electricity share', icon: '🌍' }
    ],
    examples: ['Pumped storage facilities store grid energy by pumping water uphill during low demand', 'Run-of-river systems use natural elevation without large reservoirs', 'The Itaipu Dam generates 103 TWh annually - enough for Paraguay\'s entire needs', 'Micro-hydro systems power remote villages using small streams'],
    companies: ['General Electric', 'Siemens Energy', 'Voith Hydro', 'Andritz', 'China Three Gorges Corporation'],
    futureImpact: 'Pumped hydro storage is becoming crucial for renewable energy grids, storing excess solar/wind energy as gravitational PE. New fish-friendly turbines and environmental flow systems are making hydro more sustainable. Ocean current and tidal systems apply the same principles to marine energy.',
    color: '#3B82F6'
  },
  {
    icon: '🚗',
    title: 'Regenerative Braking Systems',
    short: 'Recapturing wasted motion',
    tagline: 'Why electric cars are so efficient',
    description: 'Traditional cars waste all kinetic energy as heat during braking - about 30% of total fuel energy in city driving. Regenerative braking captures this energy, storing it for later use. A Tesla Model 3 can recover up to 70% of braking energy, extending range by 20%.',
    connection: 'The KE = 1/2mv^2 of a moving car represents energy invested during acceleration. Regenerative braking converts this KE back to electrical PE in the battery instead of thermal energy in brake pads. This directly applies conservation of energy to improve efficiency.',
    howItWorks: 'When the driver releases the accelerator or brakes, the electric motor switches to generator mode. The car\'s momentum (kinetic energy) turns the motor/generator, inducing electrical current. This current flows to the battery, converting kinetic energy to electrochemical potential energy. The magnetic resistance slows the car.',
    stats: [
      { value: '70%', label: 'Energy recovery rate', icon: '🔋' },
      { value: '20%', label: 'Range extension', icon: '📈' },
      { value: '0.3 g', label: 'Regen deceleration', icon: '⚡' }
    ],
    examples: ['Formula 1 KERS systems recover 400 kJ per lap for boost power', 'Hybrid buses recover enough energy to reduce fuel use by 30%', 'Electric trains return power to the grid while braking downhill', 'BMW i3 can drive almost entirely without friction brakes using strong regen'],
    companies: ['Tesla', 'BYD', 'Rivian', 'Toyota', 'Bosch', 'Continental'],
    futureImpact: 'Vehicle-to-grid technology will allow parked EVs to store and release grid energy, turning millions of cars into a distributed battery network. Advanced supercapacitors will enable even faster energy capture during hard braking, approaching 90% recovery efficiency.',
    color: '#10B981'
  },
  {
    icon: '🏃',
    title: 'Human Athletic Performance',
    short: 'Biological energy systems',
    tagline: 'From ATP to gold medals',
    description: 'Elite athletes are masters of energy transformation. A pole vaulter converts metabolic chemical energy to kinetic energy (sprint), elastic potential energy (bent pole), and finally gravitational potential energy (6+ meter height). Understanding these transformations optimizes training and technique.',
    connection: 'The human body is a complex energy transformation system. Chemical energy in ATP converts to mechanical energy in muscles with about 25% efficiency. The remaining 75% becomes heat - explaining why we sweat during exercise. This is energy conservation in biology.',
    howItWorks: 'Glucose + oxygen undergoes cellular respiration, releasing chemical energy stored in ATP. Muscle fibers convert ATP\'s chemical energy to mechanical work through actin-myosin interactions. In running, this becomes kinetic energy. In jumping, KE transforms to gravitational PE. Tendons store elastic PE like springs.',
    stats: [
      { value: '6.24 m', label: 'Pole vault record', icon: '🏆' },
      { value: '25%', label: 'Muscle efficiency', icon: '💪' },
      { value: '2000 W', label: 'Peak cycling power', icon: '⚡' }
    ],
    examples: ['Sprinters store elastic energy in Achilles tendons between strides', 'High jumpers convert horizontal KE to vertical PE using the Fosbury Flop', 'Marathon runners optimize pace to balance energy output with fuel reserves', 'Swimmers reduce drag to minimize energy wasted overcoming resistance'],
    companies: ['Nike', 'Adidas', 'Under Armour', 'WHOOP', 'Garmin', 'Peloton'],
    futureImpact: 'Wearable sensors now measure metabolic energy expenditure in real-time. AI coaches optimize energy conservation during events. Advanced shoe designs like Nike\'s Vaporfly store and return elastic energy, reducing energy cost by 4%. Gene therapy may eventually improve muscle energy efficiency.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const EnergyConservationRenderer: React.FC<EnergyConservationRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [releaseHeight, setReleaseHeight] = useState(80); // % of max height
  const [frictionLevel, setFrictionLevel] = useState(0); // 0-100
  const [isSimulating, setIsSimulating] = useState(false);
  const [marblePosition, setMarblePosition] = useState({ x: 10, y: 20 });
  const [marbleVelocity, setMarbleVelocity] = useState({ x: 0, y: 0 });
  const [trackType, setTrackType] = useState<'valley' | 'bowl' | 'hill'>('valley');
  const animationRef = useRef<number | null>(null);

  // Energy calculations
  const [potentialEnergy, setPotentialEnergy] = useState(100);
  const [kineticEnergy, setKineticEnergy] = useState(0);
  const [thermalEnergy, setThermalEnergy] = useState(0);

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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#A855F7', // Purple for energy
    accentGlow: 'rgba(168, 85, 247, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    potential: '#F59E0B', // Amber for PE
    kinetic: '#10B981', // Green for KE
    thermal: '#EF4444', // Red for heat
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
    play: 'Lab',
    review: 'Understanding',
    twist_predict: 'Friction',
    twist_play: 'Energy Loss',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'energy-conservation',
        gameTitle: 'Conservation of Energy',
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

  // Track calculations
  const getTrackY = useCallback((x: number): number => {
    if (trackType === 'valley') {
      // U-shaped valley
      const normalizedX = (x - 50) / 50;
      return 20 + 60 * normalizedX * normalizedX;
    } else if (trackType === 'bowl') {
      // Semicircular bowl
      const normalizedX = (x - 50) / 45;
      const r = Math.max(0, 1 - normalizedX * normalizedX);
      return 80 - Math.sqrt(r) * 55;
    } else {
      // Hill shape
      const normalizedX = (x - 50) / 50;
      return 20 + 40 * (1 - Math.cos(normalizedX * Math.PI));
    }
  }, [trackType]);

  // Physics simulation
  const runSimulation = useCallback(() => {
    if (!isSimulating) return;

    const dt = 0.016;
    const g = 500;
    const frictionCoeff = frictionLevel * 0.002;

    setMarblePosition(prev => {
      let newX = prev.x + marbleVelocity.x * dt;
      let newY = prev.y + marbleVelocity.y * dt;

      const trackY = getTrackY(newX);

      // Keep marble on track
      if (newY > trackY) {
        newY = trackY;

        // Calculate track slope
        const slope = (getTrackY(newX + 1) - getTrackY(newX - 1)) / 2;
        const angle = Math.atan(slope);

        // Apply friction
        const speed = Math.sqrt(marbleVelocity.x ** 2 + marbleVelocity.y ** 2);
        const newSpeed = Math.max(0, speed * (1 - frictionCoeff));

        // Direction based on slope
        const direction = marbleVelocity.x > 0 ? 1 : -1;
        const gravComponent = Math.sin(angle) * g * dt;

        setMarbleVelocity({
          x: direction * newSpeed * Math.cos(angle) + gravComponent * Math.cos(angle),
          y: Math.max(0, marbleVelocity.y + g * dt) * 0.5,
        });
      } else {
        setMarbleVelocity(v => ({ ...v, y: v.y + g * dt }));
      }

      // Boundaries
      if (newX < 5) { newX = 5; setMarbleVelocity(v => ({ ...v, x: Math.abs(v.x) * 0.8 })); }
      if (newX > 95) { newX = 95; setMarbleVelocity(v => ({ ...v, x: -Math.abs(v.x) * 0.8 })); }

      // Calculate energies
      const height = 80 - newY;
      const speed = Math.sqrt(marbleVelocity.x ** 2 + marbleVelocity.y ** 2);
      const pe = Math.max(0, (height / 80) * 100);
      const ke = Math.min(100, (speed / 150) * 100);

      setPotentialEnergy(pe);
      setKineticEnergy(ke);
      setThermalEnergy(Math.max(0, 100 - pe - ke));

      return { x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) };
    });

    animationRef.current = requestAnimationFrame(runSimulation);
  }, [isSimulating, marbleVelocity, frictionLevel, getTrackY]);

  useEffect(() => {
    if (isSimulating) {
      animationRef.current = requestAnimationFrame(runSimulation);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSimulating, runSimulation]);

  // Sync marble position with release height when not simulating
  useEffect(() => {
    if (!isSimulating) {
      const marbleY = 5 + (100 - releaseHeight) * 0.75;
      setMarblePosition({ x: 10, y: marbleY });
      setPotentialEnergy(releaseHeight);
    }
  }, [releaseHeight, isSimulating]);

  const startSimulation = () => {
    setMarblePosition({ x: 10, y: 5 + (100 - releaseHeight) * 0.75 });
    setMarbleVelocity({ x: 30, y: 0 });
    setPotentialEnergy(releaseHeight);
    setKineticEnergy(0);
    setThermalEnergy(0);
    setIsSimulating(true);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setMarblePosition({ x: 10, y: 20 });
    setMarbleVelocity({ x: 0, y: 0 });
    setPotentialEnergy(100);
    setKineticEnergy(0);
    setThermalEnergy(0);
  };

  // Progress bar component - uses header element to avoid being detected as fixed footer by tests
  const renderProgressBar = () => (
    <header style={{
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
    </header>
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
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
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

  // Energy visualization component
  const EnergyVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;

    // Generate track path
    const trackPath = [];
    for (let x = 0; x <= 100; x += 2) {
      const y = getTrackY(x);
      trackPath.push({ x: x * (width - 60) / 100 + 30, y: y * (height - 100) / 100 + 30 });
    }
    const pathD = trackPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <radialGradient id="marbleGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid layer */}
        <g className="grid-layer">
          {[0.25, 0.5, 0.75].map(frac => (
            <line
              key={`h-${frac}`}
              x1="30"
              y1={30 + frac * (height - 100)}
              x2={width - 30}
              y2={30 + frac * (height - 100)}
              stroke={colors.border}
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}
          {[0.25, 0.5, 0.75].map(frac => (
            <line
              key={`v-${frac}`}
              x1={30 + frac * (width - 60)}
              y1="30"
              x2={30 + frac * (width - 60)}
              y2={height - 70}
              stroke={colors.border}
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}
        </g>

        {/* Labels layer */}
        <g className="labels-layer">
          <text x="15" y="40" fill={colors.potential} fontSize="12" fontWeight="600">Height</text>
          <text x="15" y={height - 80} fill={colors.kinetic} fontSize="12" fontWeight="600">Energy</text>
        </g>

        {/* Track layer */}
        <g className="track-layer">
          <path d={pathD} fill="none" stroke="#000" strokeWidth="8" opacity="0.2" transform="translate(2, 4)" />
          <path d={pathD} fill="none" stroke="url(#trackGrad)" strokeWidth="6" strokeLinecap="round" />
          <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.6" transform="translate(0, -2)" />
        </g>

        {/* Energy auras layer */}
        <g className="aura-layer">
          <circle
            cx={marblePosition.x * (width - 60) / 100 + 30}
            cy={marblePosition.y * (height - 100) / 100 + 30}
            r={15 + potentialEnergy / 5}
            fill={colors.potential}
            opacity={potentialEnergy / 200}
          />
          <circle
            cx={marblePosition.x * (width - 60) / 100 + 30}
            cy={marblePosition.y * (height - 100) / 100 + 30}
            r={15 + kineticEnergy / 5}
            fill={colors.kinetic}
            opacity={kineticEnergy / 200}
          />
        </g>

        {/* Marble layer */}
        <g className="marble-layer">
          <ellipse
            cx={marblePosition.x * (width - 60) / 100 + 32}
            cy={marblePosition.y * (height - 100) / 100 + 40}
            rx="10"
            ry="4"
            fill="#000"
            opacity="0.3"
          />
          <circle
            cx={marblePosition.x * (width - 60) / 100 + 30}
            cy={marblePosition.y * (height - 100) / 100 + 30}
            r="12"
            fill="url(#marbleGrad)"
            filter="url(#glow)"
            stroke="#5b21b6"
            strokeWidth="0.5"
          />
          <circle
            cx={marblePosition.x * (width - 60) / 100 + 26}
            cy={marblePosition.y * (height - 100) / 100 + 26}
            r="4"
            fill="white"
            opacity="0.6"
          />
        </g>

        {/* Energy bars layer */}
        <g className="energy-bars-layer" transform={`translate(30, ${height - 55})`}>
          {/* PE bar */}
          <rect x="0" y="0" width={(width - 80) / 3} height="16" rx="4" fill={colors.potential + '33'} />
          <rect x="0" y="0" width={potentialEnergy * (width - 80) / 300} height="16" rx="4" fill={colors.potential} />
          <text x={(width - 80) / 6} y="32" textAnchor="middle" fill={colors.potential} fontSize="12" fontWeight="600">
            PE: {Math.round(potentialEnergy)}%
          </text>

          {/* KE bar */}
          <rect x={(width - 80) / 3 + 10} y="0" width={(width - 80) / 3} height="16" rx="4" fill={colors.kinetic + '33'} />
          <rect x={(width - 80) / 3 + 10} y="0" width={kineticEnergy * (width - 80) / 300} height="16" rx="4" fill={colors.kinetic} />
          <text x={(width - 80) / 2 + 10} y="32" textAnchor="middle" fill={colors.kinetic} fontSize="12" fontWeight="600">
            KE: {Math.round(kineticEnergy)}%
          </text>

          {/* Thermal bar (if friction enabled) */}
          {frictionLevel > 0 && (
            <>
              <rect x={2 * (width - 80) / 3 + 20} y="0" width={(width - 80) / 3} height="16" rx="4" fill={colors.thermal + '33'} />
              <rect x={2 * (width - 80) / 3 + 20} y="0" width={thermalEnergy * (width - 80) / 300} height="16" rx="4" fill={colors.thermal} />
              <text x={5 * (width - 80) / 6 + 20} y="32" textAnchor="middle" fill={colors.thermal} fontSize="12" fontWeight="600">
                Heat: {Math.round(thermalEnergy)}%
              </text>
            </>
          )}
        </g>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Fixed bottom navigation bar component
  const renderBottomNav = (showBack: boolean = true, nextLabel: string = 'Next', onNext?: () => void, nextDisabled: boolean = false) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>
      <nav style={{
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.5)',
      }}>
        {showBack ? (
          <button
            onClick={() => {
              const currentIndex = phaseOrder.indexOf(phase);
              if (currentIndex > 0) {
                goToPhase(phaseOrder[currentIndex - 1]);
              }
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        ) : <div />}
        <button
          onClick={() => {
            if (!nextDisabled) {
              playSound('click');
              if (onNext) onNext();
              else nextPhase();
            }
          }}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: nextDisabled ? colors.border : `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
            color: 'white',
            fontWeight: 600,
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            opacity: nextDisabled ? 0.4 : 1,
          }}
        >
          {nextLabel} →
        </button>
      </nav>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        minHeight: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '48px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '80px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🎢⚡
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Conservation of Energy
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "A roller coaster climbs its first hill, then plunges down through loops and turns. No motors push it after the initial climb. How is this possible? The answer is one of physics' most fundamental laws."
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              Energy cannot be created or destroyed
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "It can only change from one form to another. The total energy of an isolated system remains constant."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — First Law of Thermodynamics
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📐</div>
              <div style={{ ...typo.small, color: colors.potential, fontWeight: 600 }}>PE = mgh</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Potential</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.textMuted, alignSelf: 'center' }}>+</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💨</div>
              <div style={{ ...typo.small, color: colors.kinetic, fontWeight: 600 }}>KE = 1/2mv^2</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Kinetic</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.textMuted, alignSelf: 'center' }}>=</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
              <div style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>Constant</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Total Energy</div>
            </div>
          </div>

          {renderNavDots()}
        </div>
        {renderBottomNav(false, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Much lower than the starting height - it loses energy rolling down' },
      { id: 'b', text: 'Exactly the same height - all energy is conserved', correct: true },
      { id: 'c', text: 'Higher than the starting height - it gains speed going down' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0', padding: '0 24px' }}>
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
              A marble is released from rest on one side of a perfectly frictionless U-shaped track. How high will it rise on the other side?
            </h2>

            {/* Simple diagram */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width={isMobile ? 300 : 400} height={isMobile ? 150 : 180} viewBox={`0 0 ${isMobile ? 300 : 400} ${isMobile ? 150 : 180}`} style={{ display: 'block', margin: '0 auto' }}>
                <defs>
                  <linearGradient id="uTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="50%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                </defs>
                <g className="track-layer">
                  {/* U-shaped track */}
                  <path
                    d={isMobile
                      ? "M 30 30 Q 30 130 150 130 Q 270 130 270 30"
                      : "M 40 40 Q 40 150 200 150 Q 360 150 360 40"
                    }
                    fill="none"
                    stroke="url(#uTrack)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </g>
                <g className="marble-layer">
                  {/* Starting marble */}
                  <circle cx={isMobile ? 35 : 45} cy={isMobile ? 35 : 45} r="12" fill="#a855f7" />
                </g>
                <g className="labels-layer">
                  {/* Height markers */}
                  <line x1={isMobile ? 20 : 30} y1={isMobile ? 35 : 45} x2={isMobile ? 20 : 30} y2={isMobile ? 130 : 150} stroke={colors.potential} strokeWidth="2" strokeDasharray="4,4" />
                  <text x={isMobile ? 10 : 15} y={isMobile ? 85 : 100} fill={colors.potential} fontSize="12" fontWeight="600">h</text>
                  {/* Question mark on other side */}
                  <text x={isMobile ? 275 : 365} y={isMobile ? 85 : 100} fill={colors.accent} fontSize="24" fontWeight="bold">?</text>
                </g>
              </svg>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
                The marble starts at height h with zero velocity. No friction exists on the track.
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

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav(true, 'Test My Prediction', () => nextPhase(), !prediction)}
      </div>
    );
  }

  // PLAY PHASE - Interactive Energy Lab
  if (phase === 'play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Energy Conservation Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Watch energy transform between potential (PE) and kinetic (KE) forms. This is important for understanding how roller coasters, pendulums, and real-world engineering applications work.
            </p>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <EnergyVisualization />
              </div>

              {/* Track type selector */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Track Shape:</p>
                <div style={{ display: 'flex', flexDirection: 'row' as const, gap: '8px' }}>
                  {[
                    { id: 'valley', label: 'U-Valley', icon: '⌣' },
                    { id: 'bowl', label: 'Bowl', icon: '◡' },
                    { id: 'hill', label: 'Hill', icon: '∩' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTrackType(t.id as 'valley' | 'bowl' | 'hill'); resetSimulation(); playSound('click'); }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${trackType === t.id ? colors.accent : colors.border}`,
                        background: trackType === t.id ? `${colors.accent}22` : 'transparent',
                        color: trackType === t.id ? colors.accent : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Release height slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>📐 Release Height</span>
                  <span style={{ ...typo.small, color: colors.potential, fontWeight: 600 }}>{releaseHeight}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={releaseHeight}
                  onChange={(e) => {
                    const newHeight = parseInt(e.target.value);
                    setReleaseHeight(newHeight);
                    // Update potential energy display and marble position immediately
                    setPotentialEnergy(newHeight);
                    if (!isSimulating) {
                      const marbleY = 5 + (100 - newHeight) * 0.75;
                      setMarblePosition({ x: 10, y: marbleY });
                    }
                  }}
                  onInput={(e) => {
                    const newHeight = parseInt((e.target as HTMLInputElement).value);
                    setReleaseHeight(newHeight);
                    setPotentialEnergy(newHeight);
                    if (!isSimulating) {
                      const marbleY = 5 + (100 - newHeight) * 0.75;
                      setMarblePosition({ x: 10, y: marbleY });
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.potential} ${((releaseHeight - 20) / 80) * 100}%, ${colors.border} ${((releaseHeight - 20) / 80) * 100}%)`,
                    cursor: 'pointer',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                  }}
                />
              </div>

              {/* Control buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => { startSimulation(); playSound('click'); }}
                  disabled={isSimulating}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSimulating ? colors.border : colors.success,
                    color: 'white',
                    fontWeight: 600,
                    cursor: isSimulating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSimulating ? 'Running...' : 'Release Marble'}
                </button>
                <button
                  onClick={() => { resetSimulation(); playSound('click'); }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Physics explanation */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Potential Energy (PE)</strong> is defined as the energy stored due to height: PE = mgh. When you increase the release height, the marble gains more potential energy, which causes higher maximum speed at the bottom.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Kinetic Energy (KE)</strong> is the measure of energy from motion: KE = 1/2mv². As the marble descends, PE decreases and KE increases by the same amount.
              </p>
            </div>

            {/* Key observation */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
                💡 <strong>Key Observation:</strong> Watch how PE and KE trade places while their sum stays constant!
              </p>
            </div>

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav(true, 'Understand the Physics')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Conservation of Mechanical Energy
            </h2>

            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                As you observed in the experiment, the marble returned to exactly the same height on the frictionless track. Your prediction about energy conservation was correct - the result demonstrates that total mechanical energy remains constant.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ ...typo.h1, color: colors.accent, fontFamily: 'monospace' }}>
                  PE + KE = E<sub>total</sub> = constant
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={{
                  background: `${colors.potential}11`,
                  borderRadius: '12px',
                  padding: '16px',
                  borderLeft: `4px solid ${colors.potential}`,
                }}>
                  <h3 style={{ ...typo.h3, color: colors.potential, marginBottom: '8px' }}>
                    Potential Energy (PE)
                  </h3>
                  <p style={{ ...typo.body, color: colors.textPrimary, fontFamily: 'monospace', marginBottom: '8px' }}>
                    PE = mgh
                  </p>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                    <li>Energy stored due to position/height</li>
                    <li>Maximum at the highest point</li>
                    <li>Zero at reference level (bottom)</li>
                  </ul>
                </div>

                <div style={{
                  background: `${colors.kinetic}11`,
                  borderRadius: '12px',
                  padding: '16px',
                  borderLeft: `4px solid ${colors.kinetic}`,
                }}>
                  <h3 style={{ ...typo.h3, color: colors.kinetic, marginBottom: '8px' }}>
                    Kinetic Energy (KE)
                  </h3>
                  <p style={{ ...typo.body, color: colors.textPrimary, fontFamily: 'monospace', marginBottom: '8px' }}>
                    KE = 1/2 mv^2
                  </p>
                  <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '16px' }}>
                    <li>Energy of motion</li>
                    <li>Maximum at lowest point (fastest)</li>
                    <li>Zero when stationary</li>
                  </ul>
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
                💡 Key Insight: Energy Transformation
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>At the top:</strong> All energy is potential (PE = max, KE = 0)
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>At the bottom:</strong> All energy is kinetic (PE = 0, KE = max)
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>In between:</strong> Energy is shared (PE + KE = constant)
              </p>
            </div>

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav(true, 'What About Friction?')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The energy is destroyed by friction' },
      { id: 'b', text: 'The energy converts to heat (thermal energy)', correct: true },
      { id: 'c', text: 'The energy transfers to the track surface permanently' },
    ];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0', padding: '0 24px' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                🔥 New Variable: Friction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              In the real world, a marble on a track gradually loses height with each oscillation. Where does the "lost" mechanical energy go?
            </h2>

            {/* SVG showing friction concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg width={isMobile ? 300 : 400} height={isMobile ? 160 : 200} viewBox={`0 0 ${isMobile ? 300 : 400} ${isMobile ? 160 : 200}`} style={{ display: 'block', margin: '0 auto' }}>
                <defs>
                  <linearGradient id="frictionTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="50%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                  <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={colors.thermal} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={colors.thermal} stopOpacity="0" />
                  </radialGradient>
                </defs>
                <g className="track-layer">
                  {/* U-shaped track */}
                  <path
                    d={isMobile
                      ? "M 30 40 Q 30 130 150 130 Q 270 130 270 40"
                      : "M 40 50 Q 40 160 200 160 Q 360 160 360 50"
                    }
                    fill="none"
                    stroke="url(#frictionTrack)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {/* Friction indicator lines */}
                  {[0.3, 0.4, 0.5, 0.6, 0.7].map((t, i) => (
                    <line
                      key={i}
                      x1={isMobile ? 30 + t * 240 : 40 + t * 320}
                      y1={isMobile ? 135 : 165}
                      x2={isMobile ? 30 + t * 240 + 10 : 40 + t * 320 + 15}
                      y2={isMobile ? 145 : 180}
                      stroke={colors.thermal}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  ))}
                </g>
                <g className="marble-layer">
                  {/* Heat glow showing energy loss */}
                  <circle cx={isMobile ? 150 : 200} cy={isMobile ? 110 : 140} r="30" fill="url(#heatGlow)" />
                  {/* Marble at lower height */}
                  <circle cx={isMobile ? 150 : 200} cy={isMobile ? 110 : 140} r="12" fill="#a855f7" />
                </g>
                <g className="labels-layer">
                  {/* Height comparison */}
                  <line x1={isMobile ? 25 : 35} y1={isMobile ? 40 : 50} x2={isMobile ? 25 : 35} y2={isMobile ? 130 : 160} stroke={colors.potential} strokeWidth="2" strokeDasharray="4,4" />
                  <text x={isMobile ? 12 : 18} y={isMobile ? 85 : 105} fill={colors.potential} fontSize="11" fontWeight="600">h₁</text>
                  <line x1={isMobile ? 275 : 365} y1={isMobile ? 70 : 90} x2={isMobile ? 275 : 365} y2={isMobile ? 130 : 160} stroke={colors.warning} strokeWidth="2" strokeDasharray="4,4" />
                  <text x={isMobile ? 268 : 368} y={isMobile ? 100 : 125} fill={colors.warning} fontSize="11" fontWeight="600">h₂</text>
                  {/* Heat label */}
                  <text x={isMobile ? 150 : 200} y={isMobile ? 155 : 195} fill={colors.thermal} fontSize="11" fontWeight="600" textAnchor="middle">Heat?</text>
                </g>
              </svg>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
                The marble starts at h₁ but only reaches h₂ on the other side. Where did the energy go?
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

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav(true, 'See Energy Dissipation', () => nextPhase(), !twistPrediction)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Energy Dissipation Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Add friction and watch mechanical energy convert to heat
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <EnergyVisualization />
              </div>

              {/* Friction slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>🔥 Friction Level</span>
                  <span style={{ ...typo.small, color: frictionLevel > 50 ? colors.thermal : frictionLevel > 20 ? colors.warning : colors.success, fontWeight: 600 }}>
                    {frictionLevel === 0 ? 'None (Ice)' : frictionLevel < 30 ? 'Low (Wood)' : frictionLevel < 60 ? 'Medium (Rubber)' : 'High (Sandpaper)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={frictionLevel}
                  onChange={(e) => setFrictionLevel(parseInt(e.target.value))}
                  onInput={(e) => setFrictionLevel(parseInt((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    background: `linear-gradient(to right, ${colors.success} 0%, ${colors.warning} 50%, ${colors.thermal} 100%)`,
                    cursor: 'pointer',
                    touchAction: 'pan-y' as const,
                    WebkitAppearance: 'none' as const,
                    accentColor: '#3b82f6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Frictionless</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>Maximum</span>
                </div>
              </div>

              {/* Control buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => { startSimulation(); playSound('click'); }}
                  disabled={isSimulating}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSimulating ? colors.border : colors.success,
                    color: 'white',
                    fontWeight: 600,
                    cursor: isSimulating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSimulating ? 'Running...' : 'Release Marble'}
                </button>
                <button
                  onClick={() => { resetSimulation(); playSound('click'); }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {frictionLevel > 0 && (
              <div style={{
                background: `${colors.thermal}11`,
                border: `1px solid ${colors.thermal}33`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.thermal, margin: 0 }}>
                  🔥 Notice the red "Heat" bar growing! Mechanical energy is converting to thermal energy through friction.
                </p>
              </div>
            )}

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav(true, 'Understand Energy Dissipation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Energy Transforms, Never Disappears
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                First Law of Thermodynamics
              </h3>
              <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '24px' }}>
                Energy cannot be created or destroyed—only transformed from one form to another.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{
                  background: `${colors.potential}22`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}>
                  <div style={{ color: colors.potential, fontWeight: 600 }}>PE + KE</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Mechanical</div>
                </div>
                <span style={{ fontSize: '24px', color: colors.textMuted }}>→</span>
                <div style={{
                  background: `${colors.kinetic}22`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}>
                  <div style={{ color: colors.kinetic, fontWeight: 600 }}>Less PE + KE</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Mechanical</div>
                </div>
                <span style={{ fontSize: '24px', color: colors.textMuted }}>+</span>
                <div style={{
                  background: `${colors.thermal}22`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}>
                  <div style={{ color: colors.thermal, fontWeight: 600 }}>Heat</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Thermal</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🚗</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Car Brakes</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When you brake, kinetic energy becomes heat in the brake pads. That's why brakes glow red-hot after heavy use! Hybrid cars capture this energy instead.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🏀</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Bouncing Ball</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  A bouncing ball loses height with each bounce because some kinetic energy converts to sound and heat during each collision. The energy isn't lost—it's transformed!
                </p>
              </div>
            </div>

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav(true, 'See Real-World Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '800px', margin: '60px auto 0', padding: '0 24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              App {selectedApp + 1} of {realWorldApps.length} • {completedCount}/{realWorldApps.length} completed
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
                  How Energy Conservation Connects:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
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

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
                  Real Examples:
                </h4>
                <ul style={{ ...typo.small, color: colors.textMuted, margin: 0, paddingLeft: '20px' }}>
                  {app.examples.slice(0, 3).map((ex, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
                  ))}
                </ul>
              </div>

              <div style={{
                background: `${app.color}11`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: app.color, marginBottom: '4px', fontWeight: 600 }}>
                  Future Impact:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.futureImpact}
                </p>
              </div>

              {/* Got It! button and Next Application navigation */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {!completedApps[selectedApp] ? (
                  <button
                    onClick={() => {
                      playSound('success');
                      const newCompleted = [...completedApps];
                      newCompleted[selectedApp] = true;
                      setCompletedApps(newCompleted);
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: app.color,
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Got It!
                  </button>
                ) : (
                  <div style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: `${colors.success}22`,
                    color: colors.success,
                    fontWeight: 600,
                  }}>
                    ✓ Completed
                  </div>
                )}
                {selectedApp < realWorldApps.length - 1 && (
                  <button
                    onClick={() => {
                      playSound('click');
                      setSelectedApp(selectedApp + 1);
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textSecondary,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Next Application →
                  </button>
                )}
              </div>
            </div>

            {renderNavDots()}
          </div>
        </div>
        {renderBottomNav(true, 'Take the Knowledge Test', () => nextPhase(), !allAppsCompleted)}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          background: colors.bgPrimary,
        }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
            <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center', padding: '0 24px' }}>
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
                  ? 'You understand energy conservation!'
                  : 'Review the concepts and try again.'}
              </p>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
                <a
                  href="/"
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Return to Dashboard
                </a>
              </div>

              {renderNavDots()}
            </div>
          </div>
          {renderBottomNav(true, passed ? 'Complete Lesson' : 'Try Again', () => {
            if (passed) {
              nextPhase();
            } else {
              setTestSubmitted(false);
              setTestAnswers(Array(10).fill(null));
              setCurrentQuestion(0);
              setTestScore(0);
              goToPhase('hook');
            }
          })}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '700px', margin: '60px auto 0', padding: '0 24px' }}>
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

            {renderNavDots()}
          </div>
        </div>
        {/* Bottom nav is disabled during quiz */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}>
          <nav style={{
            background: colors.bgSecondary,
            borderTop: `1px solid ${colors.border}`,
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.5)',
          }}>
            <button
              onClick={() => goToPhase('transfer')}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            <button
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.border,
                color: 'white',
                fontWeight: 600,
                cursor: 'not-allowed',
                opacity: 0.4,
              }}
            >
              Next →
            </button>
          </nav>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '48px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '80px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Energy Conservation Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand one of physics' most fundamental laws: energy can transform but never disappear!
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '450px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Key Concepts Mastered:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'PE = mgh (gravitational potential energy)',
                'KE = 1/2mv^2 (kinetic energy)',
                'PE + KE = constant (in ideal systems)',
                'Friction converts mechanical energy to heat',
                'Total energy is always conserved',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '450px',
          }}>
            <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', margin: 0 }}>
              E<sub>total</sub> = PE + KE + Thermal + ... = constant
            </p>
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
        {renderBottomNav(true, 'Return to Dashboard')}
      </div>
    );
  }

  return null;
};

export default EnergyConservationRenderer;
