'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ============================================================================
// BUOYANCY RENDERER - Complete 10-Phase Premium Physics Game
// Archimedes' Principle: Understanding why things float or sink
// ============================================================================

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

interface BuoyancyRendererProps {
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

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions with explanations
// ============================================================================
const testQuestions = [
  {
    scenario: "A cruise ship weighing 228,000 tons floats gracefully in the ocean, while a small steel ball bearing weighing just 5 grams sinks immediately when dropped in water.",
    question: "How can a massive steel ship float while a tiny steel ball sinks?",
    options: [
      { id: 'a', label: "Ships are made of special lightweight steel that floats" },
      { id: 'b', label: "The ship's hollow hull displaces more water than its weight, creating greater buoyant force", correct: true },
      { id: 'c', label: "Saltwater is denser so it can support heavier objects" },
      { id: 'd', label: "The ship's engines push it upward" }
    ],
    explanation: "The key is SHAPE, not material. The ship's hull is hollow, displacing a huge volume of water. The weight of this displaced water (buoyant force) exceeds the ship's weight. The solid ball displaces little water relative to its mass, so buoyancy cannot overcome gravity."
  },
  {
    scenario: "A 10 kg object displaces 8 liters of water when fully submerged. The object is released from rest at the water surface. (g = 10 m/s^2, water density = 1 kg/L)",
    question: "What will happen to this object?",
    options: [
      { id: 'a', label: "It will float with 80% of its volume submerged" },
      { id: 'b', label: "It will sink to the bottom", correct: true },
      { id: 'c', label: "It will float with 20% of its volume submerged" },
      { id: 'd', label: "It will hover at neutral buoyancy" }
    ],
    explanation: "Weight = 10 kg x 10 m/s^2 = 100 N. Max buoyant force = 8 L x 1 kg/L x 10 m/s^2 = 80 N. Since weight (100N) > max buoyancy (80N), the object sinks. The object's density is 10kg/8L = 1.25 kg/L, which is greater than water's 1 kg/L."
  },
  {
    scenario: "An ice cube floats in a glass of water with exactly 10% of its volume above the waterline. The ice slowly melts over the next hour.",
    question: "What happens to the water level in the glass after the ice completely melts?",
    options: [
      { id: 'a', label: "The water level rises because ice expands when frozen" },
      { id: 'b', label: "The water level drops because the melted ice takes up less space" },
      { id: 'c', label: "The water level stays exactly the same", correct: true },
      { id: 'd', label: "It depends on the room temperature" }
    ],
    explanation: "This is a famous result! The floating ice displaces exactly its own weight in water. When it melts, the liquid water fills precisely the same volume that was displaced. This is why melting sea ice doesn't raise ocean levels (but melting land ice does!)."
  },
  {
    scenario: "A submarine at periscope depth (60 feet) needs to dive to 400 feet to avoid detection. The captain orders the ballast tanks flooded.",
    question: "What physical principle allows the submarine to control its depth by adjusting ballast tanks?",
    options: [
      { id: 'a', label: "Changing ballast changes the submarine's volume" },
      { id: 'b', label: "Adding water increases weight without changing volume, making buoyancy less than weight", correct: true },
      { id: 'c', label: "Water pressure at depth pushes the submarine down" },
      { id: 'd', label: "The propellers push the submarine downward" }
    ],
    explanation: "Flooding ballast tanks adds weight (water mass) without significantly changing the hull's displaced volume. This increases the submarine's average density above water's density, causing negative buoyancy. To surface, compressed air forces water out, reducing weight and achieving positive buoyancy."
  },
  {
    scenario: "A swimmer floats easily in the Dead Sea (density 1.24 kg/L) but struggles to float in a freshwater lake (density 1.00 kg/L). In both cases, the swimmer's body hasn't changed.",
    question: "Why does the same person float more easily in the Dead Sea?",
    options: [
      { id: 'a', label: "The Dead Sea has no waves to push you under" },
      { id: 'b', label: "Denser water provides more buoyant force per unit volume displaced", correct: true },
      { id: 'c', label: "Salt water is warmer, reducing body density" },
      { id: 'd', label: "The Dead Sea is at low elevation, changing gravity" }
    ],
    explanation: "Buoyant force = density x volume x g. In denser water, less volume needs to be submerged to displace enough water weight to equal your body weight. In the Dead Sea (1.24 kg/L), you only need to displace about 80% as much volume as in fresh water to achieve the same buoyant force."
  },
  {
    scenario: "A hot air balloon pilot is preparing for takeoff. The envelope volume is 2,800 cubic meters. Outside air is at 15C (density 1.225 kg/m^3), and the pilot heats the air inside to 100C (density 0.95 kg/m^3).",
    question: "What is the approximate lifting force generated by this balloon?",
    options: [
      { id: 'a', label: "About 7,500 N (770 kg of lift)", correct: true },
      { id: 'b', label: "About 34,000 N (3,400 kg of lift)" },
      { id: 'c', label: "About 2,660 N (265 kg of lift)" },
      { id: 'd', label: "About 28,000 N (2,800 kg of lift)" }
    ],
    explanation: "Lift = (density_outside - density_inside) x Volume x g = (1.225 - 0.95) x 2800 x 10 = 0.275 x 2800 x 10 = 7,700 N or about 770 kg. This must support the balloon envelope (~250 kg), basket (~100 kg), passengers, and fuel while maintaining positive buoyancy."
  },
  {
    scenario: "A hydrometer is placed in three different liquids. In liquid A, it floats with mark '0.8' at the surface. In liquid B, mark '1.0' is at the surface. In liquid C, mark '1.2' is at the surface.",
    question: "Which liquid is the densest?",
    options: [
      { id: 'a', label: "Liquid A (0.8 mark visible)" },
      { id: 'b', label: "Liquid B (1.0 mark visible)" },
      { id: 'c', label: "Liquid C (1.2 mark visible)", correct: true },
      { id: 'd', label: "They all have the same density" }
    ],
    explanation: "A hydrometer floats higher in denser liquids because less volume needs to be submerged to displace enough weight. The scale is calibrated so that when the '1.2' mark is at the surface, the liquid density is 1.2 g/cm^3. The hydrometer's constant weight is supported by a smaller submerged volume in denser fluids."
  },
  {
    scenario: "A diver wearing a wetsuit descends from the surface to 30 meters depth. At the surface, the wetsuit's air bubbles gave her slight positive buoyancy. At 30 meters, she notices she's now sinking.",
    question: "Why did the diver's buoyancy change with depth?",
    options: [
      { id: 'a', label: "Water density increases significantly at depth" },
      { id: 'b', label: "Pressure compressed the air bubbles, reducing the wetsuit's displaced volume", correct: true },
      { id: 'c', label: "The diver's body absorbed water, increasing her mass" },
      { id: 'd', label: "Gravity is stronger at greater depths" }
    ],
    explanation: "At 30m depth, pressure is 4 atmospheres. By Boyle's law, the trapped air in the wetsuit compresses to 1/4 its surface volume. This reduces the total volume displaced by the diver-wetsuit system while mass stays constant, decreasing buoyancy. Divers compensate using a BCD (buoyancy control device)."
  },
  {
    scenario: "A cargo ship's hull is marked with Plimsoll lines indicating maximum safe loading depths for different water types: TF (Tropical Fresh), F (Fresh), T (Tropical), S (Summer), W (Winter), WNA (Winter North Atlantic).",
    question: "Why can ships be loaded deeper in saltwater than freshwater?",
    options: [
      { id: 'a', label: "Saltwater is warmer, making steel more buoyant" },
      { id: 'b', label: "Saltwater has lower surface tension" },
      { id: 'c', label: "Denser saltwater provides more lift per depth of submersion", correct: true },
      { id: 'd', label: "Wave action in saltwater helps support the ship" }
    ],
    explanation: "Saltwater (density ~1.025 kg/L) is about 2.5% denser than freshwater. For the same submerged hull volume, saltwater provides 2.5% more buoyant force. This means ships can carry more cargo (be heavier) in saltwater while maintaining the same freeboard height. The Plimsoll lines ensure safe loading limits for each water type."
  },
  {
    scenario: "An offshore oil platform uses massive hollow concrete structures called 'gravity-based structures' that float during transport but then sink to the seabed at the installation site, where they're anchored by their own weight.",
    question: "How can the same structure both float during transport and sink when installed?",
    options: [
      { id: 'a', label: "The concrete hardens and becomes denser over time" },
      { id: 'b', label: "The hollow chambers are flooded with water at the installation site, increasing weight", correct: true },
      { id: 'c', label: "Cranes push the structure down until it sinks" },
      { id: 'd', label: "The seabed creates suction that pulls the structure down" }
    ],
    explanation: "These structures are designed with controlled buoyancy. During tow-out, the chambers contain air, giving positive buoyancy. At the installation site, valves open to flood the chambers with seawater. This dramatically increases mass while keeping volume nearly constant, creating negative buoyancy that sinks the structure. The same principle is used in floating dry docks."
  }
];

// ============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications with comprehensive data
// ============================================================================
const realWorldApps = [
  {
    icon: '🚢',
    title: 'Naval Architecture & Ship Design',
    short: 'How massive steel ships stay afloat',
    tagline: 'Displacing water is an art form worth billions',
    description: 'Modern ship design is fundamentally an exercise in buoyancy optimization. The largest cruise ships displace over 228,000 tons of water yet carry 6,000+ passengers in luxury. Container ships move 90% of world trade by carefully balancing cargo weight against hull displacement.',
    connection: 'Every ship design starts with Archimedes: the hull must displace enough water to support the total loaded weight. Naval architects calculate the "displacement" (water weight pushed aside) which must equal the ship weight for flotation. Stability requires the center of buoyancy to create a restoring moment against heeling.',
    howItWorks: 'Ship hulls are essentially large hollow containers. The underwater volume (draft x beam x length, adjusted for hull shape) determines displacement. As cargo is added, the ship sinks deeper, displacing more water until buoyancy equals the new weight. The Plimsoll line marks maximum safe draft. Hull shape affects both buoyancy and stability - wider hulls are more stable but slower.',
    stats: [
      { value: '228,081', label: 'tons - Wonder of Seas displacement', icon: '🛳️' },
      { value: '400m', label: 'length of largest ships', icon: '📏' },
      { value: '$1.35B', label: 'cost per mega cruise ship', icon: '💰' }
    ],
    examples: [
      'Wonder of the Seas (Royal Caribbean) - World largest cruise ship at 236,857 GT',
      'Ever Ace - 24,000 TEU container capacity, displaces 235,579 tons fully loaded',
      'Pioneering Spirit - Largest construction vessel, can lift 48,000 tons using buoyancy',
      'FPSO vessels combine tanker hull buoyancy with offshore oil production'
    ],
    companies: ['Hyundai Heavy Industries', 'Samsung Heavy Industries', 'China State Shipbuilding', 'Fincantieri', 'Meyer Werft'],
    futureImpact: 'Next-generation ships will feature air lubrication systems that release bubbles under the hull to reduce friction, hull forms optimized by AI, and composite materials that improve the buoyancy-to-weight ratio. Ammonia and hydrogen fuel will require redesigning fuel tank buoyancy calculations.',
    color: '#3B82F6'
  },
  {
    icon: '🛥️',
    title: 'Submarine Buoyancy Control Systems',
    short: 'Precision depth control through variable buoyancy',
    tagline: 'Mastering the deep through controlled displacement',
    description: 'Submarines achieve precise three-dimensional maneuverability by controlling their buoyancy. Unlike surface ships that simply float, submarines must actively manage their density to dive, surface, or hover at any depth. Nuclear submarines can remain submerged for months, continuously adjusting buoyancy as fuel is consumed and waste accumulates.',
    connection: 'The fundamental equation is simple: if submarine density > water density, it sinks; if less, it rises. Submarines manipulate their effective density by filling or emptying ballast tanks with water. Main ballast tanks (MBT) handle large buoyancy changes; variable ballast tanks (VBT) provide precise trim control.',
    howItWorks: 'To dive: open vents at top of MBTs while flood ports at bottom admit seawater. Air escapes, water enters, weight increases, submarine descends. To surface: compressed air (stored at 3,000+ psi) forces water out through flood ports. Hovering requires neutral buoyancy - weight exactly equals displaced water weight. Trim tanks fore and aft adjust the submarine horizontal attitude.',
    stats: [
      { value: '600m+', label: 'operating depth for attack subs', icon: '⬇️' },
      { value: '33 knots', label: 'submerged speed possible', icon: '⚡' },
      { value: '90 days', label: 'submerged endurance', icon: '📅' }
    ],
    examples: [
      'Virginia-class submarines use advanced ballast management for ultra-quiet operations',
      'Seawolf-class achieves 600m+ depth through titanium hull and precise buoyancy control',
      'Deep submergence rescue vehicles (DSRV) hover precisely to mate with stricken subs',
      'Research submersible Limiting Factor reached Challenger Deep (10,927m) using syntactic foam buoyancy'
    ],
    companies: ['General Dynamics Electric Boat', 'BAE Systems Submarines', 'Naval Group', 'ThyssenKrupp Marine Systems', 'Huntington Ingalls Industries'],
    futureImpact: 'Future submarines will feature variable buoyancy materials that can change density on command, eliminating noisy ballast pump operations. Unmanned underwater vehicles (UUVs) will use these systems for months-long missions. Bio-inspired designs mimicking fish swim bladders promise nearly silent depth changes.',
    color: '#06B6D4'
  },
  {
    icon: '🎈',
    title: 'Lighter-Than-Air Flight & Balloons',
    short: 'Buoyancy in the atmosphere',
    tagline: 'When hot air becomes your lifting force',
    description: 'Hot air balloons, helium blimps, and weather balloons all exploit atmospheric buoyancy - the same principle as floating in water, but in air. By reducing the density of gas inside an envelope below ambient air density, an upward buoyant force is created. This ancient technology is experiencing a renaissance for tourism, scientific research, and even cargo transport.',
    connection: 'Archimedes principle works identically in gases: F_buoyancy = rho_air x V x g. For hot air balloons, heating air from 20C to 100C reduces its density from 1.2 kg/m^3 to 0.95 kg/m^3. The density difference (0.25 kg/m^3) multiplied by envelope volume gives the lifting force. Helium (0.17 kg/m^3) provides even more lift but at higher cost.',
    howItWorks: 'Hot air balloons: propane burners heat air inside the envelope. Hotter air = lower density = more lift. To descend, let air cool or open the parachute valve to release hot air. Helium/hydrogen balloons: the lifting gas is permanently lighter than air. Altitude control via ballast release (up) or gas venting (down). Weather balloons expand as they rise into lower pressure, eventually bursting.',
    stats: [
      { value: '2,800 m3', label: 'typical hot air balloon volume', icon: '🎈' },
      { value: '600 kg', label: 'lifting capacity (passengers + fuel)', icon: '⬆️' },
      { value: '35 km', label: 'altitude for stratospheric balloons', icon: '🌍' }
    ],
    examples: [
      'Project Loon used helium balloons at 20km altitude to provide internet to remote areas',
      'Stratolaunch uses balloon-lifted platforms for high-altitude research',
      'RedBull Stratos: Felix Baumgartner jumped from 39km balloon altitude',
      'Zeppelin NT modern airships carry 12 passengers on sightseeing tours'
    ],
    companies: ['Cameron Balloons', 'Lindstrand Technologies', 'World View Enterprises', 'Aerostar International', 'Zeppelin Luftschifftechnik'],
    futureImpact: 'High-altitude pseudo-satellites (HAPS) will provide persistent surveillance and communications from the stratosphere at a fraction of satellite cost. Solar-heated balloons operating 24/7 in the upper atmosphere could form a new layer of global infrastructure. Hybrid airships may revolutionize cargo transport to remote areas without runways.',
    color: '#F59E0B'
  },
  {
    icon: '🧪',
    title: 'Hydrometry & Density Measurement',
    short: 'Precision measurement through buoyancy equilibrium',
    tagline: 'Ancient science enabling modern industry',
    description: 'The hydrometer - a weighted float with a graduated stem - has measured liquid density for over 2,000 years. From ancient winemakers checking fermentation to modern battery technicians testing electrolyte, the hydrometer applies Archimedes principle as a precision instrument. Digital density meters now achieve 6-decimal-place accuracy using the same fundamental physics.',
    connection: 'At equilibrium, a floating hydrometer displaces exactly its own weight in liquid. In denser liquids, less volume needs to be submerged, so it floats higher. The graduated stem converts float height directly to density reading. Since the hydrometer mass is constant, the submerged volume is inversely proportional to liquid density.',
    howItWorks: 'A glass tube with a weighted bulb bottom floats upright in liquid. The narrow stem amplifies small density differences into readable scale movements. A hydrometer in water (1.0 g/cm^3) sinks to a certain level. The same hydrometer in alcohol (0.79 g/cm^3) sinks deeper. In concentrated sugar solution (1.4 g/cm^3), it rides high. Specialized scales measure alcohol %, sugar content (Brix), battery specific gravity, etc.',
    stats: [
      { value: '0.0001', label: 'g/cm3 - digital density meter precision', icon: '🎯' },
      { value: '2000+', label: 'years of hydrometer use', icon: '📜' },
      { value: '$2B+', label: 'annual density measurement market', icon: '💰' }
    ],
    examples: [
      'Brewers measure wort specific gravity to calculate alcohol content (OG/FG method)',
      'Automotive technicians test battery electrolyte (1.265 SG = full charge)',
      'Dairy inspectors detect watered-down milk (should be 1.028-1.035 g/cm^3)',
      'Petroleum industry classifies crude oil by API gravity (buoyancy-derived scale)'
    ],
    companies: ['Anton Paar', 'Mettler Toledo', 'Thermo Fisher Scientific', 'Kruess', 'Rudolph Research'],
    futureImpact: 'Microfluidic density sensors are enabling real-time inline process monitoring in pharmaceuticals and food production. Lab-on-a-chip devices use nanoliter samples. AI-powered density analysis can detect adulteration and contamination. Smart hydrometers with Bluetooth connectivity are modernizing traditional brewing and winemaking.',
    color: '#10B981'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const BuoyancyRenderer: React.FC<BuoyancyRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();
// Simulation state
  const [objectDensity, setObjectDensity] = useState(0.8); // kg/L
  const [fluidDensity, setFluidDensity] = useState(1.0); // kg/L (water)
  const [objectVolume, setObjectVolume] = useState(10); // liters
  const [hasDropped, setHasDropped] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Twist phase - different fluids
  const [twistFluid, setTwistFluid] = useState<'water' | 'oil' | 'saltwater' | 'deadsea'>('water');
  const [twistObjectType, setTwistObjectType] = useState<'wood' | 'ice' | 'human' | 'steel'>('ice');
  const [twistHasDropped, setTwistHasDropped] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);
  const animationRef = useRef<number | null>(null);

  // Responsive design
// Animation for dropping object
  useEffect(() => {
    if (hasDropped && animationProgress < 100) {
      animationRef.current = requestAnimationFrame(() => {
        setAnimationProgress(prev => Math.min(prev + 4, 100));
      });
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [hasDropped, animationProgress]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    water: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textMuted: '#B8BFC8',
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
    twist_play: 'Twist Play',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'buoyancy',
        gameTitle: 'Buoyancy & Archimedes Principle',
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

  // Calculate buoyancy physics
  const calculateBuoyancy = useCallback((objDensity: number, flDensity: number, volume: number) => {
    const g = 10;
    const volumeM3 = volume / 1000;
    const fluidDensityKgM3 = flDensity * 1000;
    const objectDensityKgM3 = objDensity * 1000;

    const objectMass = objectDensityKgM3 * volumeM3;
    const weight = objectMass * g;
    const maxBuoyancy = fluidDensityKgM3 * volumeM3 * g;

    const floats = objDensity < flDensity;
    const equilibriumSubmersion = floats ? (objDensity / flDensity) * 100 : 100;
    const currentSubmersion = hasDropped ? Math.min(equilibriumSubmersion, animationProgress * equilibriumSubmersion / 100) : 0;
    const currentBuoyancy = maxBuoyancy * (currentSubmersion / 100);

    return {
      weight,
      maxBuoyancy,
      currentBuoyancy,
      floats,
      equilibriumSubmersion,
      currentSubmersion,
      objectMass,
    };
  }, [hasDropped, animationProgress]);

  const buoyancyValues = calculateBuoyancy(objectDensity, fluidDensity, objectVolume);

  // Get twist fluid density
  const getTwistFluidDensity = (fluid: string) => {
    switch (fluid) {
      case 'oil': return 0.9;
      case 'saltwater': return 1.025;
      case 'deadsea': return 1.24;
      default: return 1.0;
    }
  };

  const getTwistObjectDensity = (obj: string) => {
    switch (obj) {
      case 'wood': return 0.6;
      case 'ice': return 0.92;
      case 'human': return 1.06;
      case 'steel': return 7.8;
      default: return 0.92;
    }
  };

  // Water tank visualization (plain render function to avoid React remounting)
  const renderWaterTankVisualization = (objDensity: number, flDensity: number, showObject = true, dropped = false, progress = 100) => {
    const width = isMobile ? 320 : 440;
    const height = isMobile ? 280 : 340;

    const floats = objDensity < flDensity;
    const equilibrium = floats ? (objDensity / flDensity) * 100 : 100;
    const currentSubmersion = dropped ? Math.min(equilibrium, progress * equilibrium / 100) : 0;

    const waterTop = height * 0.35;
    const waterHeight = height * 0.55;
    const objectSize = isMobile ? 50 : 60;
    const objectX = width / 2 - objectSize / 2;

    // Object position: starts above water, drops to equilibrium
    const aboveWaterY = waterTop - objectSize - 10;
    const equilibriumY = waterTop + (equilibrium / 100) * waterHeight - objectSize * (1 - equilibrium/100);
    const currentY = dropped
      ? aboveWaterY + (equilibriumY - aboveWaterY) * (progress / 100)
      : aboveWaterY;

    const objectColor = floats ? colors.success : colors.error;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Buoyancy visualization">
        <defs>
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#075985" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="objectGradFloat" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="objectGradSink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Tank walls */}
        <rect x="40" y="30" width={width - 80} height={height - 60} fill="none" stroke={colors.border} strokeWidth="3" rx="8" />

        {/* Water */}
        <rect x="43" y={waterTop} width={width - 86} height={waterHeight} fill="url(#waterGradient)" rx="4" />

        {/* Water surface shimmer */}
        <line x1="43" y1={waterTop} x2={width - 43} y2={waterTop} stroke="#7dd3fc" strokeWidth="3" />

        {/* Depth markers */}
        <text x="30" y={waterTop + waterHeight * 0.25} fill={colors.textMuted} fontSize="11" textAnchor="end">25%</text>
        <text x="30" y={waterTop + waterHeight * 0.5} fill={colors.textMuted} fontSize="11" textAnchor="end">50%</text>
        <text x="30" y={waterTop + waterHeight * 0.75} fill={colors.textMuted} fontSize="11" textAnchor="end">75%</text>

        {/* Object */}
        {showObject && (
          <g filter="url(#glow)">
            <rect
              x={objectX}
              y={currentY}
              width={objectSize}
              height={objectSize}
              rx="8"
              fill={floats ? 'url(#objectGradFloat)' : 'url(#objectGradSink)'}
            />
            <text
              x={objectX + objectSize/2}
              y={currentY + objectSize/2 + 5}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
            >
              {objDensity.toFixed(1)}
            </text>
          </g>
        )}

        {/* Status indicator */}
        <g transform={`translate(${width/2}, 20)`}>
          <rect x="-50" y="-12" width="100" height="24" rx="12" fill={floats ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'} />
          <text x="0" y="5" textAnchor="middle" fill={objectColor} fontSize="13" fontWeight="600">
            {floats ? 'FLOATS' : 'SINKS'}
          </text>
        </g>

        {/* Fluid density label */}
        <text x={width - 50} y={waterTop + 25} fill="#7dd3fc" fontSize="12" textAnchor="end">
          {flDensity.toFixed(2)} kg/L
        </text>

        {/* Force arrows when dropped */}
        {dropped && progress > 20 && (
          <>
            {/* Weight arrow (down) */}
            <g transform={`translate(${objectX + objectSize + 15}, ${currentY + objectSize/2})`}>
              <line x1="0" y1="0" x2="0" y2="30" stroke={colors.error} strokeWidth="3" />
              <polygon points="-6,24 6,24 0,34" fill={colors.error} />
              <text x="10" y="20" fill={colors.error} fontSize="11">W</text>
            </g>
            {/* Buoyancy arrow (up) - only when in water */}
            {currentSubmersion > 0 && (
              <g transform={`translate(${objectX - 15}, ${currentY + objectSize/2})`}>
                <line x1="0" y1={30 * currentSubmersion/100} x2="0" y2="0" stroke={colors.accent} strokeWidth="3" />
                <polygon points="-6,6 6,6 0,-4" fill={colors.accent} />
                <text x="-15" y="20" fill={colors.accent} fontSize="11">Fb</text>
              </g>
            )}
          </>
        )}

        {/* Water surface bubbles and wave path */}
        <circle cx={width * 0.3} cy={waterTop + 8} r="3" fill="rgba(125,211,252,0.3)">
          <animate attributeName="cy" values={`${waterTop + 8};${waterTop + 3};${waterTop + 8}`} dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={width * 0.6} cy={waterTop + 12} r="4" fill="rgba(125,211,252,0.2)">
          <animate attributeName="cy" values={`${waterTop + 12};${waterTop + 6};${waterTop + 12}`} dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx={width * 0.8} cy={waterTop + 6} r="2" fill="rgba(125,211,252,0.25)" />
        <line x1="43" y1={waterTop - 2} x2={width - 43} y2={waterTop - 2} stroke="rgba(125,211,252,0.3)" strokeWidth="1" />
        <line x1="43" y1={waterTop + waterHeight} x2={width - 43} y2={waterTop + waterHeight} stroke="rgba(7,89,133,0.4)" strokeWidth="1" />
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
  };

  // Bottom navigation bar
  const currentIndex = phaseOrder.indexOf(phase);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === phaseOrder.length - 1;
  const canGoNext = !isLast && phase !== 'test';

  const renderBottomBar = () => (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.3)',
    }}>
      <button
        onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'transparent',
          color: isFirst ? 'rgba(255,255,255,0.3)' : 'white',
          cursor: isFirst ? 'not-allowed' : 'pointer',
          opacity: isFirst ? 0.4 : 1,
          transition: 'all 0.3s ease',
          fontFamily: theme.fontFamily,
        }}
      >
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentIndex && goToPhase(p)}
            title={phaseLabels[p]}
            style={{
              width: p === phase ? '20px' : '10px',
              height: '10px',
              borderRadius: '5px',
              background: p === phase ? '#3b82f6' : i < currentIndex ? '#10b981' : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIndex ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
      <button
        onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: 'none',
          background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          opacity: canGoNext ? 1 : 0.4,
          transition: 'all 0.3s ease',
          fontFamily: theme.fontFamily,
        }}
      >
        Next →
      </button>
    </div>
  );

  // ============================================================================
  // PHASE RENDERS
  // ============================================================================

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
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'float 3s ease-in-out infinite',
        }}>
          🚢 🪨
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } } .muted-secondary { color: #94a3b8; } .muted-dim { color: #6B7280; }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Buoyancy & Archimedes' Principle
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "A massive steel cruise ship carrying 6,000 passengers floats serenely, while a tiny steel marble sinks instantly. How can <span style={{ color: colors.accent }}>228,000 tons of steel float</span> when a 5-gram ball cannot?"
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
            "Any object, wholly or partially immersed in a fluid, is buoyed up by a force equal to the weight of the fluid displaced by the object."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Archimedes of Syracuse, c. 250 BCE
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover Why Things Float
        </button>
      </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Its weight - heavier objects sink, lighter objects float' },
      { id: 'b', text: 'Its density compared to the fluid - less dense floats, more dense sinks', correct: true },
      { id: 'c', text: 'Its shape - flat objects float, round objects sink' },
      { id: 'd', text: 'Its color - darker objects absorb more water and sink' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
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
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What property of an object determines whether it will float or sink in water?
          </h2>

          {/* SVG Visual comparison */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="440" height="280" style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <defs>
                <linearGradient id="predictWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#075985" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="stoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#78716c" />
                  <stop offset="100%" stopColor="#44403c" />
                </linearGradient>
                <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <linearGradient id="shipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
                <filter id="predictGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Water */}
              <rect x="20" y="140" width="400" height="120" fill="url(#predictWater)" rx="4" />
              <line x1="20" y1="140" x2="420" y2="140" stroke="#7dd3fc" strokeWidth="2" />
              {/* Stone - sinks to bottom */}
              <g filter="url(#predictGlow)">
                <circle cx="80" cy="230" r="25" fill="url(#stoneGrad)" />
                <text x="80" y="235" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Stone</text>
              </g>
              <text x="80" y="270" textAnchor="middle" fill={colors.error} fontSize="11">Sinks</text>
              {/* Wood - floats at surface */}
              <g filter="url(#predictGlow)">
                <rect x="195" y="125" width="50" height="30" rx="4" fill="url(#woodGrad)" />
                <text x="220" y="144" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Wood</text>
              </g>
              <text x="220" y="115" textAnchor="middle" fill={colors.success} fontSize="11">Floats</text>
              {/* Ship - floats (hollow hull) */}
              <g filter="url(#predictGlow)">
                <path d="M320,130 L370,130 L380,155 L310,155 Z" fill="url(#shipGrad)" />
                <rect x="335" y="115" width="15" height="15" fill={colors.accent} rx="2" />
                <text x="345" y="170" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Ship</text>
              </g>
              <text x="345" y="185" textAnchor="middle" fill={colors.success} fontSize="11">Floats!</text>
              {/* Labels */}
              <text x="220" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">What determines floating vs sinking?</text>
              <text x="80" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="11">Dense & Heavy</text>
              <text x="220" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="11">Light & Porous</text>
              <text x="345" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="11">Heavy but Hollow</text>
              {/* Arrows */}
              <path d="M80,65 L80,90" stroke={colors.error} strokeWidth="2" markerEnd="url(#arrowDown)" />
              <path d="M220,65 L220,90" stroke={colors.success} strokeWidth="2" />
              <path d="M345,65 L345,90" stroke={colors.success} strokeWidth="2" />
              <circle cx="80" cy="95" r="3" fill={colors.error} />
              <circle cx="220" cy="95" r="3" fill={colors.success} />
              <circle cx="345" cy="95" r="3" fill={colors.success} />
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
              Test My Prediction
            </button>
          )}
        </div>
      </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Buoyancy Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Buoyancy Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            The visualization shows an object dropping into a fluid. Adjust the densities to observe what floats and what sinks. When you increase object density, more of it sinks below the waterline. This demonstrates how ships and submarines use buoyancy in real-world engineering.
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Density is defined as mass divided by volume (calculated as ρ = m/V). The ratio of object density to fluid density determines whether an object floats or sinks.
          </p>

          {/* Formula */}
          <p style={{ ...typo.body, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontFamily: 'monospace' }}>
            F_b = ρ × V × g
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
          {/* Force comparison chart */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg viewBox="0 0 440 280" width="100%" style={{ maxWidth: '440px', background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="forceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.05" />
                </linearGradient>
                <filter id="forceGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="forceDropShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Grid lines */}
              <g>
                <line x1="60" y1="40" x2="420" y2="40" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="60" y1="80" x2="420" y2="80" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="60" y1="120" x2="420" y2="120" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="60" y1="160" x2="420" y2="160" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="60" y1="200" x2="420" y2="200" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="60" y1="240" x2="420" y2="240" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              </g>

              {/* Vertical grid lines */}
              <g>
                <line x1="140" y1="25" x2="140" y2="250" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="220" y1="25" x2="220" y2="250" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="300" y1="25" x2="300" y2="250" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
                <line x1="380" y1="25" x2="380" y2="250" stroke={colors.border} strokeDasharray="4 4" opacity="0.3" />
              </g>

              {/* Axes */}
              <g>
                <line x1="60" y1="20" x2="60" y2="250" stroke={colors.textMuted} strokeWidth="2" />
                <line x1="60" y1="250" x2="420" y2="250" stroke={colors.textMuted} strokeWidth="2" />
              </g>

              {/* Axis labels */}
              <text x="15" y="140" fill={colors.textSecondary} fontSize="12" textAnchor="middle" transform="rotate(-90, 15, 140)">Force (N)</text>
              <text x="240" y="275" fill={colors.textSecondary} fontSize="12" textAnchor="middle">Density (kg/L)</text>

              {/* X-axis tick labels */}
              <g>
                <text x="80" y="262" fill={colors.textMuted} fontSize="11" textAnchor="middle">0.3</text>
                <text x="160" y="262" fill={colors.textMuted} fontSize="11" textAnchor="middle">0.8</text>
                <text x="320" y="262" fill={colors.textMuted} fontSize="11" textAnchor="middle">1.8</text>
                <text x="400" y="262" fill={colors.textMuted} fontSize="11" textAnchor="middle">2.5</text>
              </g>

              {/* Y-axis tick labels */}
              <g>
                <text x="52" y="44" fill={colors.textMuted} fontSize="11" textAnchor="end">{(buoyancyValues.weight * 1.2).toFixed(0)}</text>
                <text x="52" y="120" fill={colors.textMuted} fontSize="11" textAnchor="end">{(buoyancyValues.weight * 0.7).toFixed(0)}</text>
                <text x="52" y="200" fill={colors.textMuted} fontSize="11" textAnchor="end">{(buoyancyValues.weight * 0.3).toFixed(0)}</text>
                <text x="52" y="253" fill={colors.textMuted} fontSize="11" textAnchor="end">0</text>
              </g>

              {/* Force curves */}
              {(() => {
                const chartTop = 30;
                const chartBottom = 245;
                const chartH = chartBottom - chartTop;
                const maxForce = Math.max(buoyancyValues.weight, buoyancyValues.maxBuoyancy) * 1.3 || 100;
                const weightY = chartBottom - (buoyancyValues.weight / maxForce) * chartH;
                const buoyY = chartBottom - (buoyancyValues.maxBuoyancy / maxForce) * chartH;
                const densityNorm = (objectDensity - 0.3) / (2.5 - 0.3);
                const markerX = 80 + densityNorm * 320;

                // Generate buoyancy force curve with 12 data points
                // Buoyancy = min(objDensity, fluidDensity) * V * g (in kg/L units)
                const volumeM3 = objectVolume / 1000;
                const g = 10;
                const buoyPoints: string[] = [];
                for (let i = 0; i <= 11; i++) {
                  const x = 80 + (i / 11) * 320;
                  const density = 0.3 + (i / 11) * 2.2;
                  // If density < fluid, object floats: buoyancy = weight = density*V*g*1000
                  // If density >= fluid, object sinks: buoyancy = fluid*V*g*1000 (max)
                  const buoyForce = Math.min(density, fluidDensity) * 1000 * volumeM3 * g;
                  const y = chartBottom - (buoyForce / maxForce) * chartH;
                  buoyPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
                }
                const buoyCurve = buoyPoints.join(' ');

                return (
                  <g>
                    {/* Weight line (red) - constant horizontal */}
                    <g filter="url(#forceDropShadow)">
                      <line x1="80" y1={weightY} x2="400" y2={weightY} stroke="#EF4444" strokeWidth="2.5" />
                    </g>
                    <text x="410" y={weightY - 8} fill="#EF4444" fontSize="11" fontWeight="bold">Weight</text>

                    {/* Buoyancy curve (green) */}
                    <g filter="url(#forceDropShadow)">
                      <path d={buoyCurve} fill="none" stroke="#10B981" strokeWidth="2.5" />
                    </g>
                    <text x="410" y={chartTop + 8} fill="#10B981" fontSize="11" fontWeight="bold">Buoyancy</text>

                    {/* Float/Sink zone indicator */}
                    <rect x="60" y={chartTop} width={Math.max(0, markerX - 60)} height={chartH} fill={buoyancyValues.floats ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'} />

                    {/* Current position markers */}
                    <circle cx={markerX} cy={weightY} r="8" fill="#EF4444" stroke="#ffffff" strokeWidth="2" filter="url(#forceGlow)" />
                    <circle cx={markerX} cy={buoyY} r="8" fill="#10B981" stroke="#ffffff" strokeWidth="2" filter="url(#forceGlow)" />

                    {/* Connecting line between markers */}
                    <line x1={markerX} y1={weightY} x2={markerX} y2={buoyY} stroke={colors.textMuted} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                  </g>
                );
              })()}

              {/* Title */}
              <text x="240" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="bold">Force Comparison</text>
            </svg>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderWaterTankVisualization(objectDensity, fluidDensity, true, hasDropped, animationProgress)}
            </div>

            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Object Density slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Object Density</span>
                <span style={{ ...typo.small, color: buoyancyValues.floats ? colors.success : colors.error, fontWeight: 600 }}>
                  {objectDensity.toFixed(2)} kg/L
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={objectDensity}
                onChange={(e) => {
                  setObjectDensity(parseFloat(e.target.value));
                  setHasDropped(false);
                  setAnimationProgress(0);
                }}
                style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Cork (0.3)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Steel (2.5)</span>
              </div>
            </div>

            {/* Fluid Density slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Fluid Density</span>
                <span style={{ ...typo.small, color: colors.water, fontWeight: 600 }}>
                  {fluidDensity.toFixed(2)} kg/L
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={fluidDensity}
                onChange={(e) => {
                  setFluidDensity(parseFloat(e.target.value));
                  setHasDropped(false);
                  setAnimationProgress(0);
                }}
                style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Oil (0.8)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Dead Sea (1.5)</span>
              </div>
            </div>

            {/* Object Volume slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Object Volume</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                  {objectVolume} liters
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={objectVolume}
                onChange={(e) => {
                  setObjectVolume(parseInt(e.target.value));
                  setHasDropped(false);
                  setAnimationProgress(0);
                }}
                style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
              />
            </div>
            </div>
          </div>

            {/* Drop button */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setHasDropped(true);
                  setAnimationProgress(0);
                }}
                disabled={hasDropped}
                style={{
                  ...primaryButtonStyle,
                  opacity: hasDropped ? 0.5 : 1,
                  cursor: hasDropped ? 'not-allowed' : 'pointer',
                }}
              >
                Drop Object
              </button>
              <button
                onClick={() => {
                  setHasDropped(false);
                  setAnimationProgress(0);
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            </div>

            {/* Physics display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>{buoyancyValues.weight.toFixed(0)} N</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Weight</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{buoyancyValues.currentBuoyancy.toFixed(0)} N</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Buoyant Force</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: buoyancyValues.floats ? colors.success : colors.error }}>
                  {buoyancyValues.equilibriumSubmersion.toFixed(0)}%
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Submerged</div>
              </div>
            </div>
          </div>

          {/* Key insight */}
          {hasDropped && animationProgress >= 100 && (
            <div style={{
              background: buoyancyValues.floats ? `${colors.success}22` : `${colors.error}22`,
              border: `1px solid ${buoyancyValues.floats ? colors.success : colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: buoyancyValues.floats ? colors.success : colors.error, margin: 0 }}>
                {buoyancyValues.floats
                  ? `Object floats! It sinks until buoyancy (${buoyancyValues.currentBuoyancy.toFixed(0)} N) equals weight (${buoyancyValues.weight.toFixed(0)} N)`
                  : `Object sinks! Even fully submerged, buoyancy (${buoyancyValues.maxBuoyancy.toFixed(0)} N) cannot overcome weight (${buoyancyValues.weight.toFixed(0)} N)`
                }
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>
      </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const userWasCorrect = prediction === 'b';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Result feedback */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {userWasCorrect ? '🎯' : '💡'}
            </div>
            <h2 style={{ ...typo.h2, color: userWasCorrect ? colors.success : colors.accent }}>
              {userWasCorrect ? 'Exactly Right!' : 'The Key is Density!'}
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px' }}>
              {userWasCorrect
                ? 'Your prediction was correct! As you observed in the experiment, density comparison determines floating behavior.'
                : 'You predicted something different, but as you saw in the experiment, density is the key factor that determines whether objects float or sink.'}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Archimedes' Principle
            </h3>

            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
                Buoyant Force = Weight of Displaced Fluid
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, fontFamily: 'monospace' }}>
                F<sub>b</sub> = ρ<sub>fluid</sub> x V<sub>submerged</sub> x g
              </p>
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.success }}>Float condition:</strong> Object density &lt; Fluid density
              </p>
              <p style={{ marginBottom: '16px' }}>
                When an object is less dense than the fluid, it only needs to displace part of its volume to balance its weight. It floats with some portion above the surface.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.error }}>Sink condition:</strong> Object density &gt; Fluid density
              </p>
              <p>
                When an object is denser than the fluid, even complete submersion doesn't generate enough buoyant force to overcome its weight. It sinks to the bottom.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            border: `1px solid ${colors.warning}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              Why Weight Alone Doesn't Determine Floating
            </h4>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A 228,000-ton cruise ship floats while a 5-gram steel ball sinks. The ship's hollow hull means its average density (total mass / total volume) is less than water. The solid steel ball's density (7.8 kg/L) far exceeds water (1.0 kg/L). <strong>Shape determines the volume, which determines density!</strong>
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore a Twist
          </button>
        </div>
      </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Float higher (less submerged) - the oil provides more support' },
      { id: 'b', text: 'Float lower (more submerged) - less dense fluid means less buoyancy per volume', correct: true },
      { id: 'c', text: 'Float at the same level - all liquids provide the same buoyancy' },
      { id: 'd', text: 'Sink completely - objects can only float in water' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
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
              New Variable: Fluid Type
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Ice floats in water with 10% above the surface. If you place the same ice cube in vegetable oil (density 0.9 kg/L instead of water's 1.0 kg/L), what happens?
          </h2>

          {/* SVG Visual comparison */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="440" height="240" style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <defs>
                <linearGradient id="twistWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#075985" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="twistOil" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0.6" />
                </linearGradient>
                <filter id="twistGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Water tank */}
              <rect x="20" y="30" width="180" height="180" fill="none" stroke={colors.border} strokeWidth="2" rx="6" />
              <rect x="22" y="80" width="176" height="128" fill="url(#twistWater)" rx="4" />
              <line x1="22" y1="80" x2="198" y2="80" stroke="#7dd3fc" strokeWidth="2" />
              <text x="110" y="22" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="bold">Water (1.0 kg/L)</text>
              {/* Ice in water - 90% submerged */}
              <g filter="url(#twistGlow)">
                <rect x="85" y="72" width="50" height="50" rx="6" fill="#a5f3fc" stroke="#22d3ee" strokeWidth="1.5" />
                <text x="110" y="100" textAnchor="middle" fill="#0e7490" fontSize="11" fontWeight="bold">ICE</text>
              </g>
              <text x="110" y="150" textAnchor="middle" fill="white" fontSize="11">90% submerged</text>
              {/* Oil tank */}
              <rect x="240" y="30" width="180" height="180" fill="none" stroke={colors.border} strokeWidth="2" rx="6" />
              <rect x="242" y="80" width="176" height="128" fill="url(#twistOil)" rx="4" />
              <line x1="242" y1="80" x2="418" y2="80" stroke="#fbbf24" strokeWidth="2" />
              <text x="330" y="22" textAnchor="middle" fill={colors.warning} fontSize="13" fontWeight="bold">Oil (0.9 kg/L)</text>
              {/* Ice in oil - unknown */}
              <g filter="url(#twistGlow)">
                <rect x="305" y="68" width="50" height="50" rx="6" fill="#a5f3fc" stroke="#22d3ee" strokeWidth="1.5" />
                <text x="330" y="96" textAnchor="middle" fill="#0e7490" fontSize="11" fontWeight="bold">ICE</text>
              </g>
              <text x="330" y="150" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">???</text>
              {/* Arrow between */}
              <path d="M205,120 L235,120" stroke={colors.textMuted} strokeWidth="2" />
              <polygon points="232,115 240,120 232,125" fill={colors.textMuted} />
              <text x="220" y="110" textAnchor="middle" fill={colors.textMuted} fontSize="11">vs</text>
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
              Test in Different Fluids
            </button>
          )}
        </div>
      </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const currentFluidDensity = getTwistFluidDensity(twistFluid);
    const currentObjectDensity = getTwistObjectDensity(twistObjectType);
    const floats = currentObjectDensity < currentFluidDensity;
    const submersionPercent = floats ? (currentObjectDensity / currentFluidDensity) * 100 : 100;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Fluid Comparison Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Test different objects in different fluids
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  {renderWaterTankVisualization(currentObjectDensity, currentFluidDensity, true, twistHasDropped, 100)}
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Fluid selector */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>Select Fluid:</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'oil', label: 'Oil', density: 0.9, color: colors.warning },
                  { id: 'water', label: 'Fresh Water', density: 1.0, color: colors.water },
                  { id: 'saltwater', label: 'Salt Water', density: 1.025, color: '#38bdf8' },
                  { id: 'deadsea', label: 'Dead Sea', density: 1.24, color: colors.success },
                ].map(fluid => (
                  <button
                    key={fluid.id}
                    onClick={() => {
                      playSound('click');
                      setTwistFluid(fluid.id as any);
                      setTwistHasDropped(false);
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${twistFluid === fluid.id ? fluid.color : colors.border}`,
                      background: twistFluid === fluid.id ? `${fluid.color}22` : 'transparent',
                      color: twistFluid === fluid.id ? fluid.color : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {fluid.label} ({fluid.density})
                  </button>
                ))}
              </div>
            </div>

            {/* Object selector */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>Select Object:</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'wood', label: 'Wood', density: 0.6, emoji: '🪵' },
                  { id: 'ice', label: 'Ice', density: 0.92, emoji: '🧊' },
                  { id: 'human', label: 'Human Body', density: 1.06, emoji: '🏊' },
                  { id: 'steel', label: 'Steel Ball', density: 7.8, emoji: '⚫' },
                ].map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      playSound('click');
                      setTwistObjectType(obj.id as any);
                      setTwistHasDropped(false);
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: `2px solid ${twistObjectType === obj.id ? colors.accent : colors.border}`,
                      background: twistObjectType === obj.id ? `${colors.accent}22` : 'transparent',
                      color: twistObjectType === obj.id ? colors.accent : colors.textSecondary,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {obj.emoji} {obj.label} ({obj.density})
                  </button>
                ))}
              </div>
            </div>
              </div>
            </div>

            {/* Drop button */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setTwistHasDropped(true);
                }}
                disabled={twistHasDropped}
                style={{
                  ...primaryButtonStyle,
                  opacity: twistHasDropped ? 0.5 : 1,
                  cursor: twistHasDropped ? 'not-allowed' : 'pointer',
                }}
              >
                Drop Object
              </button>
              <button
                onClick={() => setTwistHasDropped(false)}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            </div>

            {/* Results display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{currentObjectDensity.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Object kg/L</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.water }}>{currentFluidDensity.toFixed(2)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Fluid kg/L</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: floats ? colors.success : colors.error }}>
                  {floats ? `${submersionPercent.toFixed(0)}%` : 'Sinks'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Submerged</div>
              </div>
            </div>
          </div>

          {/* Insight after experimenting */}
          {twistHasDropped && (
            <div style={{
              background: `${colors.accent}22`,
              border: `1px solid ${colors.accent}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.accent, margin: 0, textAlign: 'center' }}>
                {floats
                  ? `In ${twistFluid} (${currentFluidDensity} kg/L), the object submerges ${submersionPercent.toFixed(0)}%. Denser fluid = less submersion!`
                  : `The object sinks because its density (${currentObjectDensity}) exceeds the fluid density (${currentFluidDensity}).`
                }
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Insight
          </button>
        </div>
      </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const userWasCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {userWasCorrect ? '🎯' : '🔍'}
            </div>
            <h2 style={{ ...typo.h2, color: userWasCorrect ? colors.success : colors.warning }}>
              {userWasCorrect ? 'Correct!' : 'Less Dense Fluid = Deeper Submersion'}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Math Behind It</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                At equilibrium: ρ<sub>object</sub> / ρ<sub>fluid</sub> = fraction submerged
                <br /><br />
                Ice (0.92) in water (1.0): 0.92/1.0 = 92% submerged (8% above)<br />
                Ice (0.92) in oil (0.9): 0.92/0.9 = 102% - <strong>it sinks in oil!</strong>
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚢</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Plimsoll Lines on Ships</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Ships have different maximum load lines for different waters! In denser saltwater (1.025 kg/L), ships ride higher and can carry more cargo. In fresh water (1.0 kg/L), the same ship sinks deeper and must carry less. The Plimsoll line ensures safety across all water types.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🏊</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Dead Sea Effect</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The Dead Sea (1.24 kg/L) is so dense that humans (1.06 kg/L) float effortlessly! You'd need to submerge only 85% of your volume to float, compared to 100%+ in fresh water (meaning you'd sink without effort in pure fresh water).
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
      </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Buoyancy"
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

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
                Physics Connection:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
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

            {/* Examples */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
                Examples:
              </h4>
              <ul style={{ ...typo.small, color: colors.textMuted, margin: 0, paddingLeft: '20px' }}>
                {app.examples.map((ex, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
                ))}
              </ul>
            </div>

            {/* Companies */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px', fontWeight: 600 }}>
                Key Companies:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.companies.map((company, i) => (
                  <span key={i} style={{
                    padding: '4px 10px',
                    background: colors.bgSecondary,
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: colors.textMuted,
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            {/* Future Impact */}
            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${app.color}33`,
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>
          </div>

          {/* Next Application / Continue to Test button */}
          <div style={{ marginBottom: '12px' }}>
            {selectedApp < realWorldApps.length - 1 ? (
              <button
                onClick={() => {
                  playSound('click');
                  const nextIdx = selectedApp + 1;
                  setSelectedApp(nextIdx);
                  const newCompleted = [...completedApps];
                  newCompleted[nextIdx] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Next Application →
              </button>
            ) : (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Continue to Test →
              </button>
            )}
          </div>

          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
            Application {selectedApp + 1} of {realWorldApps.length} ({completedApps.filter(c => c).length}/{realWorldApps.length} viewed)
          </p>
        </div>
      </div>
        {renderBottomBar()}
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You have mastered buoyancy and Archimedes\' Principle!'
                : 'Review the concepts and try again to achieve mastery.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Next: Achieve Mastery
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  setShowExplanation(false);
                  goToPhase('review');
                }}
                style={primaryButtonStyle}
              >
                Back to Review
              </button>
            )}
          </div>

          {/* Answer Key */}
          <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
            {testQuestions.map((q, idx) => {
              const userAnswer = testAnswers[idx];
              const correctOption = q.options.find(o => o.correct);
              const correctAnswer = correctOption?.id;
              const userOption = q.options.find(o => o.id === userAnswer);
              const isCorrect = userAnswer === correctAnswer;
              return (
                <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                    <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {q.question}</span>
                  </div>
                  {!isCorrect && userOption && (<div style={{ marginLeft: '26px', marginBottom: '6px' }}><span style={{ color: colors.error, fontSize: '13px' }}>Your answer: </span><span style={{ color: '#64748b', fontSize: '13px' }}>{userOption.label}</span></div>)}
                  <div style={{ marginLeft: '26px', marginBottom: '8px' }}><span style={{ color: colors.success, fontSize: '13px' }}>Correct answer: </span><span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.label}</span></div>
                  <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}><span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span><span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span></div>
                </div>
              );
            })}
          </div>
        </div>
          {renderBottomBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const selectedAnswer = testAnswers[currentQuestion];
    const isCorrect = selectedAnswer === question.options.find(o => o.correct)?.id;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
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
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontStyle: 'italic' }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => {
              const isSelected = selectedAnswer === opt.id;
              const showCorrectness = showExplanation;

              let borderColor = colors.border;
              let bgColor = colors.bgCard;

              if (showCorrectness) {
                if (opt.correct) {
                  borderColor = colors.success;
                  bgColor = `${colors.success}22`;
                } else if (isSelected && !opt.correct) {
                  borderColor = colors.error;
                  bgColor = `${colors.error}22`;
                }
              } else if (isSelected) {
                borderColor = colors.accent;
                bgColor = `${colors.accent}22`;
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (!showExplanation) {
                      playSound('click');
                      const newAnswers = [...testAnswers];
                      newAnswers[currentQuestion] = opt.id;
                      setTestAnswers(newAnswers);
                    }
                  }}
                  disabled={showExplanation}
                  style={{
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: showExplanation ? 'default' : 'pointer',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isSelected ? colors.accent : colors.bgSecondary,
                    color: isSelected ? 'white' : colors.textSecondary,
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
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div style={{
              background: isCorrect ? `${colors.success}22` : `${colors.error}22`,
              border: `1px solid ${isCorrect ? colors.success : colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, fontWeight: 600, marginBottom: '8px' }}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.explanation}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => {
                  setCurrentQuestion(currentQuestion - 1);
                  setShowExplanation(false);
                }}
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

            {!showExplanation && selectedAnswer && (
              <button
                onClick={() => {
                  playSound(isCorrect ? 'success' : 'failure');
                  setShowExplanation(true);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Check Answer
              </button>
            )}

            {showExplanation && currentQuestion < 9 && (
              <button
                onClick={() => {
                  setCurrentQuestion(currentQuestion + 1);
                  setShowExplanation(false);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Next Question
              </button>
            )}

            {showExplanation && currentQuestion === 9 && (
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
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                See Results
              </button>
            )}
          </div>
        </div>
      </div>
        {renderBottomBar()}
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
        overflow: 'hidden',
      }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '24px',
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
          Buoyancy Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand Archimedes' Principle and the physics of why things float or sink. From ships to submarines to hot air balloons!
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '450px',
          width: '100%',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Concepts Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {[
              'Buoyant force equals weight of displaced fluid',
              'Density comparison determines float/sink behavior',
              'Shape affects volume, which affects average density',
              'Denser fluids provide more buoyancy per volume',
              'Real applications: ships, submarines, balloons, hydrometers',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success, fontSize: '18px' }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `${colors.accent}22`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          maxWidth: '450px',
          width: '100%',
          border: `1px solid ${colors.accent}44`,
        }}>
          <p style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
            Archimedes' Formula
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, fontFamily: 'monospace' }}>
            F<sub>buoyancy</sub> = ρ<sub>fluid</sub> x V<sub>displaced</sub> x g
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '32px',
          maxWidth: '450px',
          width: '100%',
        }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚢</div>
            <div style={{ ...typo.small, color: colors.textMuted }}>Naval Design</div>
          </div>
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛥️</div>
            <div style={{ ...typo.small, color: colors.textMuted }}>Submarines</div>
          </div>
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎈</div>
            <div style={{ ...typo.small, color: colors.textMuted }}>Balloons</div>
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
        </div>
      </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
          <button onClick={() => { onGameEvent?.({ eventType: 'game_completed', gameType: 'buoyancy', gameTitle: 'Buoyancy', details: { phase: 'mastery', score: testScore, maxScore: 10 }, timestamp: Date.now() }); window.location.href = '/games'; }}
            style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Complete Game →
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default BuoyancyRenderer;
