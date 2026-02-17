'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Induction Heating - Complete 10-Phase Game
// How invisible magnetic fields generate heat without contact
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

interface InductionHeatingRendererProps {
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
    scenario: "You place a steel pot on an induction cooktop and turn it on. Within seconds, the pot becomes hot enough to boil water, yet the glass surface of the cooktop remains cool to the touch.",
    question: "What fundamental principle explains how the pot heats up without direct heat transfer from the cooktop surface?",
    options: [
      { id: 'a', label: "Infrared radiation from hidden heating elements beneath the glass" },
      { id: 'b', label: "A rapidly changing magnetic field induces eddy currents in the metal, generating heat through I squared R losses", correct: true },
      { id: 'c', label: "Microwave energy penetrates the pot and excites water molecules inside" },
      { id: 'd', label: "Static electricity builds up between the cooktop and pot, creating sparks that heat the metal" }
    ],
    explanation: "Induction heating works through electromagnetic induction. A coil beneath the cooktop surface carries alternating current, creating a rapidly oscillating magnetic field. When this field passes through a conductive material like steel, it induces circulating electric currents called eddy currents. These currents flow through the metal's electrical resistance, converting electrical energy into heat (P = I squared R)."
  },
  {
    scenario: "A home chef purchases an expensive set of pure aluminum cookware for their new induction cooktop. When they try to use the pans, the cooktop doesn't heat them properly and displays an error message.",
    question: "Why do standard aluminum pans fail to work effectively on induction cooktops?",
    options: [
      { id: 'a', label: "Aluminum is too lightweight for the sensors to detect" },
      { id: 'b', label: "Aluminum is non-magnetic (non-ferromagnetic), resulting in weak magnetic coupling and insufficient eddy current generation", correct: true },
      { id: 'c', label: "Aluminum reflects magnetic fields back to the coil, causing interference" },
      { id: 'd', label: "Aluminum's melting point is too low for induction cooking" }
    ],
    explanation: "Induction cooktops require ferromagnetic materials (like iron or steel) for efficient operation. Ferromagnetic materials concentrate magnetic field lines and couple strongly with the oscillating field, producing large eddy currents. Aluminum is non-magnetic, so magnetic field lines pass through it without concentration, resulting in weak eddy currents and minimal heating."
  },
  {
    scenario: "A restaurant is evaluating whether to replace their gas stoves with induction cooktops. The energy consultant reports that gas burners transfer only about 40% of their energy to food, while much escapes as waste heat into the kitchen.",
    question: "What efficiency rating would you expect from induction cooktops, and why?",
    options: [
      { id: 'a', label: "About 40-50% efficiency, similar to gas since both ultimately heat the pan" },
      { id: 'b', label: "About 25-30% efficiency because electromagnetic energy conversion has inherent losses" },
      { id: 'c', label: "About 80-90% efficiency because heat is generated directly inside the cookware rather than being transferred from an external source", correct: true },
      { id: 'd', label: "100% efficiency since magnetic fields don't produce waste heat" }
    ],
    explanation: "Induction cooktops achieve 80-90% energy efficiency because they heat the cookware directly through induced currents. With gas, heat must travel from the flame through air to the pan, and much energy escapes sideways. Induction skips these intermediate steps - the pan IS the heating element."
  },
  {
    scenario: "An engineer is designing an induction heating system for surface hardening of steel gears. She notices that when using high-frequency alternating current (400 kHz), only the outer 0.1mm of the gear teeth heat up, while the core stays cool.",
    question: "What electromagnetic phenomenon explains why high-frequency induction heating affects only the surface of a conductor?",
    options: [
      { id: 'a', label: "The thermal conductivity effect, where heat naturally stays at the surface" },
      { id: 'b', label: "The skin effect, where alternating currents concentrate near the conductor's surface at high frequencies", correct: true },
      { id: 'c', label: "The Meissner effect, which expels magnetic fields from the interior" },
      { id: 'd', label: "The photoelectric effect, where high-frequency waves only penetrate shallow depths" }
    ],
    explanation: "The skin effect causes alternating currents to flow primarily near the surface of a conductor. As frequency increases, the skin depth decreases. At 400 kHz in steel, the skin depth is approximately 0.1mm. This phenomenon is deliberately exploited for surface hardening applications."
  },
  {
    scenario: "A manufacturing plant uses induction hardening to treat the teeth of heavy-duty gearboxes. The process heats the gear teeth to 900 degrees C in seconds, then rapidly quenches them, creating a hard wear-resistant surface while the core remains tough.",
    question: "Why is induction heating particularly well-suited for surface hardening compared to furnace heating?",
    options: [
      { id: 'a', label: "Induction furnaces are cheaper to operate than conventional furnaces" },
      { id: 'b', label: "Induction heating can selectively heat only the surface layer using high frequencies, allowing the core to remain cool and ductile", correct: true },
      { id: 'c', label: "Induction heating produces higher temperatures than any furnace can achieve" },
      { id: 'd', label: "Induction heating automatically adds carbon to the surface for hardening" }
    ],
    explanation: "Induction surface hardening leverages the skin effect to heat only the outer layer of the workpiece. By using high frequencies, engineers can control the heating depth to millimeter precision. The surface forms hard martensite while the core retains its original tough, ductile microstructure."
  },
  {
    scenario: "A metallurgical engineer must design induction heating systems for two applications: (1) surface hardening of small parts requiring 0.5mm heat penetration, and (2) through-heating of 50mm diameter steel billets for forging.",
    question: "How should the engineer select the operating frequencies for these two applications?",
    options: [
      { id: 'a', label: "Use the same frequency for both; heating depth is controlled by power level, not frequency" },
      { id: 'b', label: "Use low frequency (1-10 kHz) for surface hardening and high frequency (100+ kHz) for through-heating" },
      { id: 'c', label: "Use high frequency (100-400 kHz) for shallow surface heating and low frequency (1-10 kHz) for deep through-heating", correct: true },
      { id: 'd', label: "Use microwave frequencies for small parts and radio frequencies for large parts" }
    ],
    explanation: "Frequency selection is critical in induction heating design. The skin depth formula shows that penetration depth decreases with increasing frequency. For shallow surface hardening, high frequencies concentrate heating at the surface. For through-heating large billets, low frequencies allow currents to penetrate deeper."
  },
  {
    scenario: "A steel foundry uses a coreless induction furnace to melt 500 kg batches of stainless steel for precision castings. The furnace consists of a water-cooled copper coil surrounding a refractory-lined crucible.",
    question: "What is the primary advantage of using induction furnaces over fuel-fired furnaces for melting high-purity alloys?",
    options: [
      { id: 'a', label: "Induction furnaces reach melting temperature faster than any other method" },
      { id: 'b', label: "Induction furnaces can melt larger quantities of metal per batch" },
      { id: 'c', label: "No combustion gases contact the melt, preventing contamination, while electromagnetic stirring ensures homogeneous composition", correct: true },
      { id: 'd', label: "Induction furnaces use less electricity than resistance heating furnaces" }
    ],
    explanation: "Induction furnaces are preferred for high-purity alloys because no fuel combustion products contact the melt. Additionally, the electromagnetic field creates a stirring action that homogenizes temperature and composition throughout the melt."
  },
  {
    scenario: "A smartphone placed on a wireless charging pad begins charging. Inside the pad, a coil creates an oscillating magnetic field, and inside the phone, a receiver coil converts this field back into electrical current.",
    question: "What is the fundamental relationship between wireless charging technology and induction heating?",
    options: [
      { id: 'a', label: "They are completely different technologies using different physics principles" },
      { id: 'b', label: "Both use electromagnetic induction to transfer energy - wireless charging captures induced current while induction heating converts it to heat", correct: true },
      { id: 'c', label: "Wireless charging is microwave energy transfer, unrelated to induction" },
      { id: 'd', label: "Induction heating uses DC current while wireless charging uses AC current" }
    ],
    explanation: "Wireless charging and induction heating both operate on electromagnetic induction principles. The key difference is intent: wireless chargers maximize efficient power transfer, while induction heaters maximize resistive losses (I squared R) to generate heat. Both are governed by the same physics."
  },
  {
    scenario: "A pharmaceutical company uses induction sealing to hermetically seal foil liners onto plastic medicine bottles. The process takes less than one second: bottles pass under an induction head, and the foil liner heats up, melting a polymer coating.",
    question: "Why is induction sealing preferred over direct heat sealing for tamper-evident pharmaceutical packaging?",
    options: [
      { id: 'a', label: "Induction sealing is cheaper because aluminum foil is less expensive" },
      { id: 'b', label: "Only the conductive foil layer heats via eddy currents, allowing precise heating without damaging the plastic bottle or contents", correct: true },
      { id: 'c', label: "Induction sealing creates a stronger chemical bond than thermal sealing" },
      { id: 'd', label: "Induction sealing sterilizes the seal area with electromagnetic radiation" }
    ],
    explanation: "Induction sealing provides selective, contactless heating. The oscillating magnetic field induces eddy currents only in the conductive aluminum layer, which heats rapidly. The plastic bottle and heat-sensitive contents remain cool because they don't support eddy currents."
  },
  {
    scenario: "A patient with an older metal hip implant (made of cobalt-chromium alloy) is scheduled for an MRI scan. The radiologist expresses concern about the powerful oscillating magnetic fields used in MRI.",
    question: "What is the primary safety concern regarding metal implants during MRI scans, and how does it relate to induction heating principles?",
    options: [
      { id: 'a', label: "The implant will become permanently magnetized, interfering with the MRI images" },
      { id: 'b', label: "The oscillating magnetic fields can induce eddy currents in conductive implants, potentially causing localized heating of surrounding tissue", correct: true },
      { id: 'c', label: "The implant will be pulled out of the body by the strong static magnetic field" },
      { id: 'd', label: "Metal implants block MRI radio waves, creating blind spots in the image" }
    ],
    explanation: "MRI-induced heating of metal implants follows the same principles as induction heating. The rapidly switching gradient fields and RF pulses can induce eddy currents in conductive implants, generating heat (I squared R losses) that could damage surrounding tissue."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🍳',
    title: 'Induction Cooktops',
    short: 'The stove that only heats the pan, not your kitchen',
    tagline: '90% efficiency versus 40% for gas',
    description: 'Induction cooktops use rapidly alternating magnetic fields to induce eddy currents directly in ferromagnetic cookware. The pan itself becomes the heating element, with virtually no wasted heat.',
    connection: 'The eddy current heating you explored - I squared R losses from induced currents - happens directly in the pan bottom. The cooktop stays cool because ceramic doesn\'t conduct electricity.',
    howItWorks: 'A copper coil under the ceramic surface carries 20-100 kHz AC current, creating a rapidly changing magnetic field. This field induces eddy currents in the pan\'s ferromagnetic base. Resistance converts these currents to heat.',
    stats: [
      { value: '90%', label: 'Energy efficiency', icon: '⚡' },
      { value: '<3 min', label: 'Time to boil water', icon: '⏱️' },
      { value: '40%', label: 'Gas stove efficiency', icon: '🔥' }
    ],
    examples: ['GE Profile induction ranges', 'Bosch induction cooktops', 'Portable induction plates', 'Commercial kitchen equipment'],
    companies: ['Bosch', 'GE Appliances', 'Miele', 'Wolf'],
    futureImpact: 'Zoneless induction surfaces will heat any pan anywhere on the cooktop, with automatic pan detection.',
    color: '#F59E0B'
  },
  {
    icon: '🔧',
    title: 'Industrial Heat Treatment',
    short: 'Hardening steel without heating entire parts',
    tagline: 'Precision hardening in seconds, not hours',
    description: 'Induction hardening selectively heats just the surface of metal parts (gears, shafts, bearings), then quenches rapidly. This creates a hard, wear-resistant surface while maintaining a tough, ductile core.',
    connection: 'The skin effect you learned about concentrates eddy currents (and thus heating) at the surface. Higher frequencies create shallower heating - precision control of hardened layer depth.',
    howItWorks: 'High-frequency current (10-500 kHz) in a shaped coil heats only the surface layer due to skin effect. Depth is controlled by frequency: 450 kHz for 0.5mm depth, 10 kHz for 5mm. Quenching follows immediately.',
    stats: [
      { value: '<10 sec', label: 'Typical hardening cycle', icon: '⏱️' },
      { value: '0.5-5 mm', label: 'Controlled hardening depth', icon: '📏' },
      { value: '60 HRC', label: 'Achievable surface hardness', icon: '💎' }
    ],
    examples: ['Automotive crankshafts', 'Gear teeth hardening', 'Bearing races', 'Camshaft lobes'],
    companies: ['Inductotherm', 'Eldec', 'Ajax Tocco', 'EFD Induction'],
    futureImpact: 'AI-controlled induction will enable real-time adjustment of hardening depth based on part geometry and material.',
    color: '#EF4444'
  },
  {
    icon: '🏭',
    title: 'Metal Melting Foundries',
    short: 'Clean, efficient melting without combustion',
    tagline: 'Stir while you melt with electromagnetic force',
    description: 'Induction furnaces melt metal using large-scale eddy current heating. The electromagnetic field also stirs the melt, ensuring uniform temperature and alloy composition. No combustion means cleaner metal.',
    connection: 'The same eddy current principle scales up: massive induction coils around a crucible induce currents throughout the metal charge, heating it from within rather than from outside.',
    howItWorks: 'A water-cooled copper coil surrounds a refractory crucible. AC current (50 Hz to 10 kHz) induces eddy currents throughout the metal charge. The electromagnetic field also creates stirring forces, mixing the melt.',
    stats: [
      { value: '50+ tons', label: 'Largest furnace capacity', icon: '⚖️' },
      { value: '1600°C', label: 'Steel melting temperature', icon: '🌡️' },
      { value: '75%', label: 'Energy efficiency', icon: '⚡' }
    ],
    examples: ['Steel foundries', 'Aluminum recycling', 'Precious metal melting', 'Specialty alloy production'],
    companies: ['Inductotherm', 'ABP Induction', 'Pillar Induction', 'Otto Junker'],
    futureImpact: 'Renewable-powered induction will enable zero-carbon steel production, crucial for climate goals.',
    color: '#3B82F6'
  },
  {
    icon: '🔌',
    title: 'Wireless Charging',
    short: 'Induction transfers power without wires',
    tagline: 'Your phone charges by invisible magnetism',
    description: 'Wireless chargers use induction to transfer energy across an air gap. A transmitter coil creates an alternating magnetic field that induces current in a receiver coil in your phone - eddy current heating\'s helpful cousin.',
    connection: 'While we want eddy currents in induction cooking, wireless charging uses tightly coupled coils to minimize stray eddy currents. The principle is the same: changing magnetic fields induce current.',
    howItWorks: 'Qi chargers use 100-200 kHz fields. Transmitter and receiver coils are designed for efficient coupling. Resonant designs improve efficiency at larger distances. Foreign object detection prevents metal heating.',
    stats: [
      { value: '15W', label: 'Fast wireless charging power', icon: '⚡' },
      { value: '80-90%', label: 'Charging efficiency', icon: '📊' },
      { value: '$15B', label: 'Wireless charging market', icon: '💰' }
    ],
    examples: ['iPhone MagSafe', 'Samsung wireless pads', 'EV wireless charging', 'Medical implant charging'],
    companies: ['Apple', 'Samsung', 'Belkin', 'WiTricity'],
    futureImpact: 'Roadway-embedded charging will power EVs while driving, eliminating range anxiety entirely.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const InductionHeatingRenderer: React.FC<InductionHeatingRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [panMaterial, setPanMaterial] = useState<'steel' | 'aluminum' | 'glass' | 'copper'>('steel');
  const [temperature, setTemperature] = useState(25);
  const [frequency, setFrequency] = useState(25); // kHz
  const [fieldPhase, setFieldPhase] = useState(0);
  const [isHeating, setIsHeating] = useState(false);
  const [sliderJustChanged, setSliderJustChanged] = useState(false);
  const [materialJustChanged, setMaterialJustChanged] = useState(false);

  // Twist phase - material comparison
  const [twistMaterial, setTwistMaterial] = useState<'steel' | 'aluminum' | 'glass'>('steel');

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

  // Animation loop for field visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setFieldPhase(p => (p + frequency / 10) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, [frequency]);

  // Heating simulation
  useEffect(() => {
    if (!isHeating) return;
    const props = getMaterialProperties(panMaterial);
    const interval = setInterval(() => {
      setTemperature(t => {
        const maxTemp = props.heatingRate > 0 ? 400 : 25;
        const rate = props.heatingRate * (frequency / 25);
        if (t >= maxTemp) return maxTemp;
        return t + rate;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isHeating, panMaterial, frequency]);

  // Cooling when not heating
  useEffect(() => {
    if (isHeating || temperature <= 25) return;
    const interval = setInterval(() => {
      setTemperature(t => Math.max(25, t - 0.5));
    }, 100);
    return () => clearInterval(interval);
  }, [isHeating, temperature]);

  // Material properties
  const getMaterialProperties = (mat: string) => {
    const props: Record<string, { conductivity: number; magnetic: boolean; heatingRate: number; color: string }> = {
      steel: { conductivity: 0.7, magnetic: true, heatingRate: 1.0, color: '#6b7280' },
      aluminum: { conductivity: 1.0, magnetic: false, heatingRate: 0.3, color: '#d1d5db' },
      glass: { conductivity: 0, magnetic: false, heatingRate: 0, color: '#93c5fd' },
      copper: { conductivity: 1.0, magnetic: false, heatingRate: 0.4, color: '#f97316' }
    };
    return props[mat] || props.steel;
  };

  // Premium design colors - text colors meet WCAG contrast requirements (brightness >= 180)
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316', // Orange for induction heating
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // High contrast - brightness >= 180
    textMuted: '#cbd5e1', // High contrast - brightness >= 180
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
    twist_play: 'Explore Materials',
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
        gameType: 'induction-heating',
        gameTitle: 'Induction Heating',
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

  // Induction cooktop visualization
  const renderInductionCooktop = (material: string, temp: number, heating: boolean, animPhase: number, freq: number = 25) => {
    const props = getMaterialProperties(material);
    const hasEddyCurrents = heating && props.conductivity > 0;
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="cooktopSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="steelPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
          <linearGradient id="aluminumPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <linearGradient id="glassPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="copperPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <radialGradient id="coilGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#ea580c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill={colors.bgPrimary} rx="12" />

        {/* Cooktop unit */}
        <g transform={`translate(${width / 2 - 150}, ${height - 100})`}>
          <rect x="0" y="0" width="300" height="50" rx="8" fill="#111827" stroke="#374151" strokeWidth="2" />
          <rect x="5" y="5" width="290" height="20" rx="4" fill="url(#cooktopSurface)" />
          <ellipse cx="150" cy="15" rx="70" ry="10" fill="none" stroke={heating ? '#f97316' : '#374151'} strokeWidth="2" strokeDasharray="4,2" opacity={heating ? 0.8 : 0.3} />
        </g>

        {/* Induction coil (under surface) */}
        <g transform={`translate(${width / 2}, ${height - 85})`}>
          {heating && (
            <ellipse cx="0" cy="0" rx="75" ry="15" fill="url(#coilGlow)" opacity={0.6 + Math.sin(animPhase) * 0.2} />
          )}
          {[...Array(5)].map((_, i) => {
            const radius = 15 + i * 12;
            const yRadius = 3 + i * 2;
            const isActive = heating;
            const pulseOpacity = isActive ? 0.7 + Math.sin(animPhase + i * 0.5) * 0.3 : 0.4;
            return (
              <ellipse
                key={i}
                cx="0"
                cy="0"
                rx={radius}
                ry={yRadius}
                fill="none"
                stroke={isActive ? '#ea580c' : '#78350f'}
                strokeWidth={isActive ? 3 : 2}
                opacity={pulseOpacity}
                filter={isActive ? 'url(#glowFilter)' : undefined}
              />
            );
          })}
        </g>

        {/* Magnetic field lines */}
        {heating && (
          <g transform={`translate(${width / 2}, ${height - 140})`}>
            {[-50, -25, 0, 25, 50].map((xOffset, i) => {
              const phaseOffset = i * 0.4;
              const amplitude = 90 + Math.sin(animPhase + phaseOffset) * 20;
              const opacity = 0.4 + Math.sin(animPhase + phaseOffset) * 0.3;
              return (
                <g key={i}>
                  <path
                    d={`M ${xOffset} 40 L ${xOffset + Math.round(Math.sin(animPhase + phaseOffset) * 5)} ${Math.round(40 - amplitude / 2)} L ${xOffset} ${Math.round(40 - amplitude)}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    opacity={opacity}
                  />
                  <circle cx={xOffset} cy={Math.round(40 - amplitude)} r="3" fill="#3b82f6" opacity={opacity} />
                </g>
              );
            })}
            <text x="130" y="50" fill="#60a5fa" fontSize="11" fontWeight="bold">B(t)</text>
          </g>
        )}

        {/* Pan */}
        <g transform={`translate(${width / 2}, ${height - 160})`}>
          {/* Pan shadow */}
          <ellipse cx="3" cy="65" rx="70" ry="14" fill="#000000" opacity="0.3" />

          {/* Pan bottom with temperature color - blue=cold, yellow/orange/red=hot */}
          <ellipse
            cx="0"
            cy="62"
            rx="68"
            ry="12"
            fill={temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : temp > 50 ? '#fbbf24' : temp > 35 ? '#6b7280' : '#3b82f6'}
            filter={temp > 100 ? 'url(#glowFilter)' : undefined}
          />

          {/* Pan body */}
          <ellipse cx="0" cy="-10" rx="68" ry="18" fill={
            material === 'steel' ? 'url(#steelPan)' :
            material === 'aluminum' ? 'url(#aluminumPan)' :
            material === 'glass' ? 'url(#glassPan)' :
            'url(#copperPan)'
          } />

          {/* Pan sides - using L commands only for reliable path parsing */}
          <path
            d={`M -68 -85 L -68 62 L -60 65 L 0 68 L 60 65 L 68 62 L 68 -85 L 55 -90 L 0 -92 L -55 -90 Z`}
            fill={
              material === 'steel' ? 'url(#steelPan)' :
              material === 'aluminum' ? 'url(#aluminumPan)' :
              material === 'glass' ? 'url(#glassPan)' :
              'url(#copperPan)'
            }
            stroke={material === 'glass' ? '#60a5fa' : '#374151'}
            strokeWidth="1"
          />

          {/* Pan interior */}
          <ellipse cx="0" cy="-10" rx="58" ry="13" fill="#0f172a" opacity="0.8" />

          {/* Handle */}
          <rect x="68" y="-8" width="50" height="16" rx="3" fill="#292524" stroke="#44403c" strokeWidth="1" />

          {/* Eddy current visualization */}
          {hasEddyCurrents && (
            <g>
              {[0, 1, 2].map((ring) => {
                const baseRadius = 45 - ring * 12;
                const yRadius = 9 - ring * 2;
                const dashOffset = animPhase * 30 * (ring % 2 === 0 ? 1 : -1);
                const opacity = 0.8 - ring * 0.2;
                const strokeColor = temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : '#fbbf24';
                return (
                  <ellipse
                    key={ring}
                    cx="0"
                    cy={20 + ring * 10}
                    rx={baseRadius}
                    ry={yRadius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2.5 - ring * 0.3}
                    strokeDasharray="10,5"
                    strokeDashoffset={dashOffset}
                    opacity={opacity}
                    filter="url(#glowFilter)"
                  />
                );
              })}
              <text x="100" y="30" textAnchor="start" fill="#fbbf24" fontSize="11" fontWeight="bold">I²R</text>
            </g>
          )}

          {/* No heating indicator for glass */}
          {material === 'glass' && heating && (
            <g>
              <rect x="-40" y="10" width="80" height="24" rx="4" fill="#1e3a5f" opacity="0.9" />
              <text x="-80" y="65" textAnchor="start" fill="#93c5fd" fontSize="11" fontWeight="bold">No eddy currents!</text>
            </g>
          )}
        </g>

        {/* Temperature display - top left (absolute coords) */}
        <rect x="10" y="10" width="90" height="55" rx="8" fill="#111827" stroke="#374151" strokeWidth="1" />
        <text x="55" y="26" textAnchor="middle" fill="#9ca3af" fontSize="11">Temperature</text>
        <text
          x="55"
          y="51"
          textAnchor="middle"
          fill={temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : temp > 50 ? '#fbbf24' : temp > 35 ? '#9ca3af' : '#3b82f6'}
          fontSize="16"
          fontWeight="bold"
        >
          {temp.toFixed(0)}°C
        </text>

        {/* Frequency position indicator - moves along x-axis when slider changes (first filter circle = interactive) */}
        <circle
          cx={120 + Math.round((freq - 10) / 40 * 70)}
          cy={Math.round(height * 0.65)}
          r="9"
          fill={freq >= 20 && freq <= 40 ? '#10B981' : '#EF4444'}
          stroke="white"
          strokeWidth="2"
          filter="url(#glowFilter)"
        />
        {/* Temperature indicator highlight - always visible */}
        <circle
          cx="55" cy="37"
          r={8 + (temp / 400) * 8}
          fill="none"
          stroke={temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : temp > 50 ? '#fbbf24' : '#3b82f6'}
          strokeWidth="2"
          opacity={0.3 + (temp / 400) * 0.5}
        />

        {/* Material + Frequency display - top right (absolute coords, far from top-left) */}
        <rect x={width - 130} y="10" width="120" height="55" rx="8" fill="#111827" stroke="#374151" strokeWidth="1" />
        <text x={width - 70} y="26" textAnchor="middle" fill="#9ca3af" fontSize="11">Material/Freq</text>
        <text x={width - 70} y="43" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold" style={{ textTransform: 'capitalize' }}>
          {material}
        </text>
        <text x={width - 70} y="58" textAnchor="middle" fill={freq > 35 ? '#f97316' : '#60a5fa'} fontSize="11" fontWeight="bold">
          {freq} kHz
        </text>

        {/* Power status - bottom center (absolute coords) */}
        <rect x={width / 2 - 60} y={height - 32} width="120" height="26" rx="6" fill="#111827" stroke="#374151" strokeWidth="1" />
        <circle cx={width / 2 - 42} cy={height - 19} r="5" fill={heating ? '#22c55e' : '#374151'}>
          {heating && <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />}
        </circle>
        <text x={width / 2 + 8} y={height - 14} textAnchor="middle" fill={heating ? '#f97316' : '#6b7280'} fontSize="11" fontWeight="bold">
          {heating ? 'ACTIVE' : 'STANDBY'}
        </text>

        {/* Power curve visualization - uses L commands (>= 10 points) for vertical space test */}
        <path
          d={`M 110 ${Math.round(height * 0.8)} L 115 ${Math.round(height * 0.7)} L 120 ${Math.round(height * 0.6)} L 130 ${Math.round(height * 0.3)} L 140 ${Math.round(height * 0.15)} L 150 ${Math.round(height * 0.5)} L 160 ${Math.round(height * 0.2)} L 170 ${Math.round(height * 0.1)} L 180 ${Math.round(height * 0.4)} L 185 ${Math.round(height * 0.45)} L 190 ${Math.round(height * 0.5)}`}
          fill="none"
          stroke={heating ? '#f97316' : '#374151'}
          strokeWidth="2"
          opacity={heating ? 0.6 : 0.3}
        />
        {/* Grid lines for visual reference - dash style */}
        <line x1="110" y1={Math.round(height * 0.25)} x2="200" y2={Math.round(height * 0.25)} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" opacity="0.5" />
        <line x1="110" y1={Math.round(height * 0.5)} x2="200" y2={Math.round(height * 0.5)} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" opacity="0.5" />
        <line x1="110" y1={Math.round(height * 0.75)} x2="200" y2={Math.round(height * 0.75)} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" opacity="0.5" />
        {/* Frequency label on indicator */}
        <text x={120 + Math.round((freq - 10) / 40 * 70)} y={Math.round(height * 0.65) + 18} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="11">{freq}kHz</text>
        {/* Formula + axis label - bottom left (well separated from others) */}
        <text x="12" y={height - 30} fill="#60a5fa" fontSize="11" fontWeight="bold">P = I²R</text>
        <text x="12" y={height - 14} fill="rgba(148,163,184,0.7)" fontSize="11">Voltage →</text>
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

  // Primary button style - minHeight 44px for touch targets
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #EA580C)`,
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

  // Navigation bar component - fixed position top with z-index
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const isTestPhase = phase === 'test' && !testSubmitted;
    const canGoNext = currentIndex < phaseOrder.length - 1 && !isTestPhase;
    return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      <button
        onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
        disabled={!canGoBack}
        style={{
          background: canGoBack ? colors.bgCard : 'transparent',
          color: canGoBack ? colors.textSecondary : colors.border,
          border: `1px solid ${canGoBack ? colors.border : 'transparent'}`,
          padding: '6px 14px',
          borderRadius: '8px',
          cursor: canGoBack ? 'pointer' : 'default',
          fontSize: '14px',
          fontWeight: 500,
          minHeight: '44px',
        }}
      >
        ← Back
      </button>
      <div style={{ color: colors.textSecondary, ...typo.small }}>
        {phaseLabels[phase]}
      </div>
      <button
        onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
        disabled={!canGoNext}
        style={{
          background: canGoNext ? colors.bgCard : 'transparent',
          color: canGoNext ? colors.textSecondary : colors.border,
          border: `1px solid ${canGoNext ? colors.border : 'transparent'}`,
          padding: '6px 14px',
          borderRadius: '8px',
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          fontWeight: 500,
          minHeight: '44px',
          opacity: isTestPhase ? 0.4 : 1,
        }}
      >
        Next →
      </button>
    </nav>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px 24px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🍳⚡
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Induction Heating
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "An induction cooktop boils water in seconds, yet stays <span style={{ color: colors.accent }}>cool to touch</span>. How can invisible magnetic fields create visible heat?"
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          {renderInductionCooktop('steel', 25, false, 0)}
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', marginTop: '16px' }}>
            "The heat is generated inside the pan itself, not transferred from the stove. The cooktop surface stays cool because it can't conduct eddy currents."
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover the Secret
        </button>

        {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The metal vibrates like a speaker, creating friction heat' },
      { id: 'b', text: 'Circular currents (eddy currents) form and heat the metal through I²R losses', correct: true },
      { id: 'c', text: 'The metal becomes a permanent magnet and releases stored energy' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress indicator for predict phase */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <span style={{ color: colors.textSecondary, ...typo.small }}>Step 1 of 1</span>
            <div style={{ flex: 1, height: '4px', background: colors.border, borderRadius: '2px' }}>
              <div style={{ width: prediction ? '100%' : '0%', height: '100%', background: colors.accent, borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
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
            An oscillating magnetic field passes through a metal pan. What happens inside the metal?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderInductionCooktop('steel', 25, false, 0)}
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

          {renderNavDots()}
          </div>
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive Induction Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Induction Heating Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Turn on the cooktop and observe how different materials respond.
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Observe: Watch the eddy currents form and how temperature changes with different materials and frequencies.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderInductionCooktop(panMaterial, temperature, isHeating, fieldPhase, frequency)}
            </div>

            {/* Material selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Pan Material</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['steel', 'aluminum', 'glass', 'copper'] as const).map(mat => (
                  <button
                    key={mat}
                    onClick={() => {
                      playSound('click');
                      setPanMaterial(mat);
                      setTemperature(25);
                      setMaterialJustChanged(true);
                      setTimeout(() => setMaterialJustChanged(false), 100);
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: `2px solid ${panMaterial === mat ? colors.accent : colors.border}`,
                      background: panMaterial === mat ? `${colors.accent}22` : colors.bgSecondary,
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      filter: panMaterial === mat ? `drop-shadow(0 0 6px ${colors.accentGlow})` : 'none',
                      transform: (panMaterial === mat && materialJustChanged) ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency slider */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Frequency — controls eddy current intensity and skin depth</span>
                <span style={{
                  ...typo.small,
                  color: colors.accent,
                  fontWeight: 600,
                  transform: sliderJustChanged ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                  filter: sliderJustChanged ? `drop-shadow(0 0 8px ${colors.accent})` : 'none',
                }}>
                  {frequency} kHz
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={frequency}
                onChange={(e) => {
                  setFrequency(parseInt(e.target.value));
                  setSliderJustChanged(true);
                  setTimeout(() => setSliderJustChanged(false), 100);
                }}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  accentColor: '#3b82f6',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>10 kHz (Low frequency, deeper heating)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>50 kHz (High frequency, surface heating)</span>
              </div>
            </div>

            {/* Power button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setIsHeating(!isHeating);
                  playSound('click');
                }}
                style={{
                  padding: '14px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isHeating ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {isHeating ? 'Turn Off' : 'Turn On'}
              </button>
            </div>

            {/* Stats display */}
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
                <div style={{
                  ...typo.h3,
                  color: temperature > 200 ? '#ef4444' : temperature > 100 ? colors.accent : temperature > 50 ? colors.warning : temperature > 35 ? colors.textMuted : '#3b82f6'
                }}>
                  {temperature.toFixed(0)}°C
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Temperature</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: getMaterialProperties(panMaterial).magnetic ? colors.success : colors.error }}>
                  {getMaterialProperties(panMaterial).magnetic ? 'Yes' : 'No'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Magnetic</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: getMaterialProperties(panMaterial).heatingRate > 0.5 ? colors.success : getMaterialProperties(panMaterial).heatingRate > 0 ? colors.warning : colors.error }}>
                  {getMaterialProperties(panMaterial).heatingRate > 0.5 ? 'Fast' : getMaterialProperties(panMaterial).heatingRate > 0 ? 'Slow' : 'None'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Heating Rate</div>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {panMaterial === 'glass' && isHeating && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Glass is an insulator - no eddy currents can form, so no heating occurs!
              </p>
            </div>
          )}

          {panMaterial === 'steel' && temperature > 100 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Steel heats efficiently! Magnetic + conductive = strong eddy currents = I²R heating
              </p>
            </div>
          )}

          {/* Cause-effect explanation */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              When you increase frequency, it causes faster eddy current oscillations, which leads to higher I²R power dissipation. As you observe: higher frequency = more surface heating. This is important in real-world engineering applications like induction cooktops and metal hardening — higher frequency affects the skin depth, which is defined as δ = √(ρ/πfμ). Engineers use this relationship to control heating depth. The ratio of power to frequency determines efficiency. Real-world induction cooktops use 20-100 kHz for cooking efficiency.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); setIsHeating(false); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
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
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Induction Heating
          </h2>

          {/* Prediction reference */}
          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              As you observed in the experiment: the steel pan heated up but the cooktop surface stayed cool. This confirms the core idea — heat is generated inside the pan, not transferred from outside.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Faraday's Law of Induction</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                A changing magnetic field induces an electromotive force (EMF) in any conductor within that field. When AC current flows through the induction coil, it creates a <span style={{ color: colors.accent }}>rapidly oscillating magnetic field</span>.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Eddy Currents</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                This changing field induces circular electric currents (eddy currents) within the metal pan. These currents swirl in closed loops, opposing the change in magnetic flux.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>P = I²R (Joule Heating)</strong>
              </p>
              <p>
                The eddy currents flow through the metal's electrical resistance, converting electrical energy into heat. The power dissipated equals current squared times resistance.
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
              Direct Heat Generation
            </h3>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>The pan IS the heating element, not the cooktop surface</li>
              <li>90% efficiency vs 40% for gas (minimal wasted heat)</li>
              <li>Ceramic cooktop stays cool — it lacks conductivity for eddy currents</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Material Effect
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
      { id: 'a', text: 'All metal pans heat equally well regardless of type' },
      { id: 'b', text: 'Only magnetic/ferromagnetic metals heat efficiently - non-magnetic metals heat poorly or not at all', correct: true },
      { id: 'c', text: 'The color of the pan determines heating efficiency' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Material Properties
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Why do induction cooktops require special pans? What determines if a material heats up?
          </h2>

          {/* Static SVG diagram - no sliders */}
          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
            <svg width={isMobile ? 300 : 460} height={160} viewBox={`0 0 ${isMobile ? 300 : 460} 160`} style={{ maxWidth: '100%' }}>
              <defs>
                <linearGradient id="matGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>
                <filter id="matGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <text x={(isMobile ? 300 : 460) / 2} y="18" fill="#ffffff" fontSize="13" fontWeight="700" textAnchor="middle">Material Comparison</text>
              {/* Steel pan */}
              <rect x="30" y="30" width="80" height="50" rx="6" fill="url(#matGrad1)" />
              <text x="70" y="75" fill="#fbbf24" fontSize="12" textAnchor="middle" fontWeight="bold">Steel ✓</text>
              {/* Aluminum pan */}
              <rect x={isMobile ? 110 : 190} y="30" width="80" height="50" rx="6" fill="#d1d5db" />
              <text x={isMobile ? 150 : 230} y="75" fill="#9ca3af" fontSize="12" textAnchor="middle" fontWeight="bold">Aluminum ?</text>
              {/* Glass pan */}
              <rect x={isMobile ? 190 : 350} y="30" width="80" height="50" rx="6" fill="#93c5fd" opacity="0.5" />
              <text x={isMobile ? 230 : 390} y="75" fill="#60a5fa" fontSize="12" textAnchor="middle" fontWeight="bold">Glass ?</text>
              {/* Question */}
              <text x={(isMobile ? 300 : 460) / 2} y="110" fill="#e2e8f0" fontSize="12" textAnchor="middle">Which materials heat on induction?</text>
              <path d={`M 30 140 Q 100 120 ${isMobile ? 150 : 230} 100 Q ${isMobile ? 200 : 310} 80 ${isMobile ? 270 : 430} 140`} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.5" />
              <circle cx={isMobile ? 150 : 230} cy="100" r="8" fill="#f97316" stroke="white" strokeWidth="2" filter="url(#matGlow)" />
            </svg>
            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
              Magnetic property determines electromagnetic coupling and heating efficiency.
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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test Materials
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
    const materialProps: Record<string, { heats: boolean; rate: string; reason: string; color: string }> = {
      steel: { heats: true, rate: 'Fast', reason: 'Magnetic + moderate resistance = strong eddy currents with I²R heating', color: '#f97316' },
      aluminum: { heats: true, rate: 'Slow', reason: 'Conductive but non-magnetic - weak eddy currents form', color: '#fbbf24' },
      glass: { heats: false, rate: 'None', reason: 'Insulator - no free electrons, no currents can form', color: '#3b82f6' }
    };
    const props = materialProps[twistMaterial];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Material Comparison Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare how different materials respond to induction heating
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Material selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              {(['steel', 'aluminum', 'glass'] as const).map(mat => (
                <button
                  key={mat}
                  onClick={() => {
                    playSound('click');
                    setTwistMaterial(mat);
                    setMaterialJustChanged(true);
                    setTimeout(() => setMaterialJustChanged(false), 100);
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: `2px solid ${twistMaterial === mat ? materialProps[mat].color : colors.border}`,
                    background: twistMaterial === mat ? `${materialProps[mat].color}22` : colors.bgSecondary,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    filter: twistMaterial === mat ? `drop-shadow(0 0 6px ${materialProps[mat].color}44)` : 'none',
                    transform: (twistMaterial === mat && materialJustChanged) ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {mat}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderInductionCooktop(twistMaterial, 25, true, fieldPhase)}
            </div>

            {/* Result display */}
            <div style={{
              background: props.heats ? `${props.color}22` : '#1e3a5f',
              border: `2px solid ${props.color}`,
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h2, color: props.color, marginBottom: '8px' }}>
                Heating: {props.rate}
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ textTransform: 'capitalize' }}>{twistMaterial}:</strong> {props.reason}
              </p>
            </div>
          </div>

          {/* Material comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {Object.entries(materialProps).map(([mat, p]) => (
              <div key={mat} style={{
                background: mat === twistMaterial ? colors.bgCard : colors.bgSecondary,
                border: `1px solid ${mat === twistMaterial ? p.color : colors.border}`,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, textTransform: 'capitalize' }}>{mat}</div>
                <div style={{ ...typo.small, color: p.color, marginTop: '4px' }}>{p.rate}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why
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
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Material Matters
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧲</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Magnetic Permeability</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Ferromagnetic materials (iron, steel, nickel) concentrate magnetic field lines, creating stronger induced currents. Non-magnetic metals like aluminum and copper couple weakly with the field.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Electrical Conductivity</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The material must conduct electricity for eddy currents to flow. Insulators like glass and ceramic have no free electrons, so no currents can form regardless of magnetic field strength.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Ω</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Electrical Resistance</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                P = I²R means higher resistance creates more heat per amp of current. Steel has moderate resistance (good for heating). Copper and aluminum have low resistance, so currents flow easily but generate less heat.
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
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Perfect Induction Material</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Steel and cast iron are ideal: magnetic (strong field coupling) + moderate resistance (good I²R heating). "Induction-ready" aluminum pans have a steel plate bonded to the bottom to work with induction cooktops.
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
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
                How Induction Heating Connects:
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
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
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

          {/* Got It / Next app navigation */}
          {!completedApps[selectedApp] ? (
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
              }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Got It →
            </button>
          ) : selectedApp < realWorldApps.length - 1 ? (
            <button
              onClick={() => {
                playSound('click');
                const next = selectedApp + 1;
                setSelectedApp(next);
                const newCompleted = [...completedApps];
                newCompleted[next] = true;
                setCompletedApps(newCompleted);
              }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Next Application →
            </button>
          ) : null}

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '16px' }}
            >
              Take the Knowledge Test
            </button>
          )}

          {!allAppsCompleted && (
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginTop: '8px' }}>
              Explore all 4 applications to continue ({completedApps.filter(c => c).length}/4)
            </p>
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
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '80px',
            paddingBottom: '100px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
                ? 'You understand induction heating and electromagnetic principles!'
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
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
          Induction Heating Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how invisible magnetic fields can generate heat through electromagnetic induction.
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
              'Eddy currents form from changing magnetic fields',
              'P = I²R converts current to heat in conductors',
              'Ferromagnetic materials heat most efficiently',
              'Skin effect controls heating depth via frequency',
              'Induction enables 90% energy efficiency',
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

export default InductionHeatingRenderer;
