'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// RADIATION ARMOR - Complete 10-Phase Game (#25 of 36 ELON Games)
// Space radiation protection — shielding electronics and humans against GCR,
// solar events, and trapped radiation belts
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

interface ELON_RadiationArmorRendererProps {
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
    scenario: "An astronaut on the ISS is concerned about radiation exposure during a 6-month mission. Ground-based annual exposure is about 2.4 mSv.",
    question: "Approximately how much radiation does an ISS crew member receive per year?",
    options: [
      { id: 'a', label: "About 2.4 mSv — same as on Earth" },
      { id: 'b', label: "About 150 mSv — roughly 60x more than Earth", correct: true },
      { id: 'c', label: "About 2400 mSv — 1000x more" },
      { id: 'd', label: "Less than on Earth due to the vacuum" }
    ],
    explanation: "ISS crew receive approximately 150 mSv/year compared to 2.4 mSv/year on Earth — about 60x higher. Earth's magnetosphere and atmosphere provide enormous natural shielding."
  },
  {
    scenario: "A spacecraft designer is choosing between aluminum and polyethylene (HDPE) for radiation shielding.",
    question: "Why is hydrogen-rich polyethylene often superior to aluminum for radiation shielding?",
    options: [
      { id: 'a', label: "Polyethylene is denser and blocks more radiation" },
      { id: 'b', label: "Hydrogen nuclei are efficient at fragmenting heavy ions without producing secondary neutrons", correct: true },
      { id: 'c', label: "Aluminum is transparent to all radiation" },
      { id: 'd', label: "Polyethylene reflects radiation back into space" }
    ],
    explanation: "Hydrogen-rich materials are superior because protons can efficiently fragment heavy ions (GCR) through nuclear collisions. High-Z materials like aluminum produce dangerous secondary neutrons when struck by energetic particles."
  },
  {
    scenario: "During a deep-space mission, sensors detect a sudden 1000x increase in proton flux from the Sun.",
    question: "What type of event is this, and how long might it last?",
    options: [
      { id: 'a', label: "A coronal mass ejection — lasts minutes" },
      { id: 'b', label: "A solar particle event (SPE) — can last 24-72 hours", correct: true },
      { id: 'c', label: "A gamma-ray burst — lasts microseconds" },
      { id: 'd', label: "Normal solar wind variation — no concern" }
    ],
    explanation: "Solar Particle Events can increase radiation flux by 1000x and persist for 24-72 hours. Crew must retreat to a storm shelter with extra shielding for the duration of the event."
  },
  {
    scenario: "A radiation physicist describes a particle's Linear Energy Transfer (LET) as 'very high'.",
    question: "What does high LET mean for biological damage?",
    options: [
      { id: 'a', label: "The particle deposits dense energy along its path, causing severe clustered DNA damage", correct: true },
      { id: 'b', label: "The particle passes through without interaction" },
      { id: 'c', label: "The particle has low energy and is easily stopped" },
      { id: 'd', label: "The particle only damages electronics, not biology" }
    ],
    explanation: "High-LET particles (like heavy ions in GCR) deposit energy densely along their track, creating clustered DNA damage that is difficult for cells to repair. This makes them far more biologically damaging per unit dose than low-LET radiation."
  },
  {
    scenario: "A charged particle beam passes through a material and deposits most of its energy just before stopping.",
    question: "What is this energy deposition peak called?",
    options: [
      { id: 'a', label: "The Bragg peak — particles slow down and deposit maximum energy near end of range", correct: true },
      { id: 'b', label: "The Compton edge" },
      { id: 'c', label: "The bremsstrahlung peak" },
      { id: 'd', label: "The photoelectric maximum" }
    ],
    explanation: "The Bragg peak occurs because charged particles interact more strongly with matter as they slow down. This is exploited in proton therapy for cancer treatment but is a concern for shielding design."
  },
  {
    scenario: "A spacecraft computer experiences random bit flips during passage through the South Atlantic Anomaly.",
    question: "What causes these Single Event Upsets (SEUs)?",
    options: [
      { id: 'a', label: "Temperature fluctuations in the electronics" },
      { id: 'b', label: "Energetic trapped protons depositing charge in semiconductor junctions", correct: true },
      { id: 'c', label: "Electromagnetic interference from Earth" },
      { id: 'd', label: "Software bugs triggered by vacuum conditions" }
    ],
    explanation: "SEUs occur when energetic charged particles (trapped protons, heavy ions) deposit enough charge in a transistor to flip its state. The South Atlantic Anomaly has elevated trapped particle flux due to offset of Earth's magnetic dipole."
  },
  {
    scenario: "Engineers are designing a Mars transit vehicle. The dominant radiation concern during the 6-month cruise is different from LEO.",
    question: "What is the primary radiation hazard during Mars transit?",
    options: [
      { id: 'a', label: "Trapped radiation belt particles" },
      { id: 'b', label: "Galactic Cosmic Rays (GCR) — high-energy heavy ions from outside the solar system", correct: true },
      { id: 'c', label: "UV radiation from the Sun" },
      { id: 'd', label: "Microwave background radiation" }
    ],
    explanation: "Outside Earth's magnetosphere, Galactic Cosmic Rays (GCR) are the dominant continuous hazard. These high-energy heavy ions (iron, carbon, oxygen nuclei at near-light speed) are extremely penetrating and difficult to shield against."
  },
  {
    scenario: "Adding more aluminum shielding to a spacecraft shows diminishing dose reduction and eventually the dose rate may slightly increase.",
    question: "Why does adding more aluminum shielding sometimes increase the dose?",
    options: [
      { id: 'a', label: "Aluminum becomes radioactive" },
      { id: 'b', label: "GCR interacting with aluminum produces secondary neutrons and fragments that add to the dose", correct: true },
      { id: 'c', label: "More aluminum traps heat which converts to radiation" },
      { id: 'd', label: "Aluminum has a maximum radiation absorption limit" }
    ],
    explanation: "When high-energy GCR nuclei strike aluminum atoms, they produce showers of secondary particles including neutrons. Beyond a certain thickness, these secondary particles contribute more dose than the original GCR being stopped."
  },
  {
    scenario: "The unit 'Sievert' (Sv) is used instead of 'Gray' (Gy) when assessing radiation risk to astronauts.",
    question: "What is the key difference between Gray and Sievert?",
    options: [
      { id: 'a', label: "Gray measures absorbed energy; Sievert weights by biological effectiveness of the radiation type", correct: true },
      { id: 'b', label: "They measure the same thing in different unit systems" },
      { id: 'c', label: "Gray is for electronics; Sievert is for biology" },
      { id: 'd', label: "Sievert measures total particles; Gray measures energy" }
    ],
    explanation: "1 Gray = 1 J/kg of absorbed dose. Sievert = Gray x Quality Factor (Q). Alpha particles (Q=20) cause 20x more biological damage per Gray than gamma rays (Q=1). For space radiation, heavy ions can have Q values of 5-40."
  },
  {
    scenario: "NASA is considering water as a multi-purpose shielding material for a deep-space habitat.",
    question: "Why is water considered an effective radiation shield?",
    options: [
      { id: 'a', label: "Water absorbs all electromagnetic radiation" },
      { id: 'b', label: "Water is hydrogen-rich, provides structural mass, and serves life support — making it mass-efficient", correct: true },
      { id: 'c', label: "Water reflects radiation like a mirror" },
      { id: 'd', label: "Water becomes superconducting in space" }
    ],
    explanation: "Water is 11% hydrogen by mass, making it an excellent GCR shield. It can simultaneously serve as drinking water, thermal buffer, and radiation protection — critical when every kilogram launched costs thousands of dollars."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F6F8}',
    title: 'ISS Radiation Protection',
    short: 'Protecting crew in low Earth orbit for decades',
    tagline: 'Living inside Earth\'s magnetic shield',
    description: 'The International Space Station orbits within Earth\'s magnetosphere, which deflects most solar wind and GCR. However, crew still receive about 150 mSv/year — 60x the ground-level dose. The station uses its aluminum hull (10-20 g/cm\u00B2) plus internal polyethylene panels in crew quarters for additional protection during solar events.',
    connection: 'The shielding curve shows why ISS aluminum hull provides useful but limited protection — and why polyethylene augmentation in sleeping quarters makes a real difference for long-duration crew.',
    howItWorks: 'Multiple aluminum hull layers provide primary shielding. Polyethylene-lined crew quarters reduce sleeping dose. Real-time radiation monitoring triggers shelter protocols during solar events.',
    stats: [
      { value: '150mSv/yr', label: 'Crew annual dose', icon: '\u2622\uFE0F' },
      { value: '10-20g/cm\u00B2', label: 'Aluminum hull', icon: '\u{1F6E1}\uFE0F' },
      { value: '2.4mSv', label: 'Earth annual dose', icon: '\u{1F30D}' }
    ],
    examples: ['Columbus module shielding', 'Crew sleeping quarters', 'South Atlantic Anomaly alerts', 'EVA dose monitoring'],
    companies: ['NASA', 'Roscosmos', 'ESA', 'JAXA'],
    futureImpact: 'Next-generation stations will incorporate water walls and advanced composites for superior multi-purpose shielding.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F534}',
    title: 'Mars Transit Shielding',
    short: 'Protecting crew during 6-month deep-space cruise',
    tagline: 'Beyond Earth\'s magnetic umbrella',
    description: 'During a Mars transit, crew are exposed to unshielded GCR at approximately 1.8 mSv/day — accumulating roughly 330 mSv over 6 months. Unlike LEO, there is no magnetospheric protection. The dominant hazard is high-energy heavy ions that are nearly impossible to fully stop without impractical mass.',
    connection: 'The diminishing returns of shielding thickness are most critical for Mars missions — the dose reduction curve shows why simply adding more aluminum fails against GCR.',
    howItWorks: 'Hydrogen-rich materials line crew habitats. Water storage surrounds sleeping areas. Storm shelters provide concentrated protection during SPEs. Active monitoring adjusts crew activities.',
    stats: [
      { value: '1.8mSv/day', label: 'GCR cruise dose', icon: '\u2622\uFE0F' },
      { value: '6 months', label: 'Transit time', icon: '\u23F1\uFE0F' },
      { value: 'GCR', label: 'Dominant hazard', icon: '\u{1F4A5}' }
    ],
    examples: ['Curiosity RAD measurements', 'Orion MPCV shielding', 'TransHab inflatable concept', 'Water wall prototypes'],
    companies: ['NASA', 'SpaceX', 'Lockheed Martin', 'Bigelow Aerospace'],
    futureImpact: 'Faster transit times (nuclear propulsion) may ultimately be more effective than adding shielding mass.',
    color: '#EF4444'
  },
  {
    icon: '\u{1F680}',
    title: 'SpaceX Starship for Mars',
    short: 'Mass-budget challenges for large crew vehicle',
    tagline: 'Scaling radiation protection for 100 passengers',
    description: 'SpaceX Starship aims to carry up to 100 people to Mars. The large crew volume is actually advantageous — internal equipment, water tanks, and supplies provide distributed shielding. The challenge is that every kilogram of dedicated shielding reduces payload capacity. Storm shelters within the ship provide concentrated protection during solar events.',
    connection: 'Starship illustrates the mass-vs-protection tradeoff: the shielding curve shows that practical thickness limits mean accepting some GCR dose while designing robust storm shelters for acute SPE events.',
    howItWorks: 'Stainless steel hull provides baseline shielding. Internal layout places water and supplies around crew areas. Dedicated storm shelter uses concentrated polyethylene for SPE protection.',
    stats: [
      { value: 'Mass budget', label: 'Primary challenge', icon: '\u2696\uFE0F' },
      { value: 'Large volume', label: 'Crew habitat', icon: '\u{1F3E0}' },
      { value: 'Storm shelter', label: 'SPE protection', icon: '\u{1F6E1}\uFE0F' }
    ],
    examples: ['Starship Mars architecture', 'In-situ water shielding', 'Crew rotation schedules', 'Active dosimetry systems'],
    companies: ['SpaceX', 'NASA', 'Axiom Space', 'Sierra Space'],
    futureImpact: 'Starship\'s massive payload capacity may enable thicker shielding than any previous deep-space vehicle.',
    color: '#F59E0B'
  },
  {
    icon: '\u{1F319}',
    title: 'Artemis Orion Spacecraft',
    short: 'Storm shelter design for lunar missions',
    tagline: 'Threading the Van Allen Belts',
    description: 'The Orion spacecraft must transit the Van Allen radiation belts — regions of intense trapped particles — on its way to the Moon. The vehicle features a dedicated storm shelter where 4 crew members can shelter behind extra shielding during solar events. Orion\'s trajectory is optimized to minimize time in the most intense belt regions.',
    connection: 'Orion demonstrates how trajectory design and concentrated shielding work together — the dose curve shows why strategic placement of mass matters more than uniform thickness.',
    howItWorks: 'Orion uses a combination of its heat shield, hull structure, and interior stowage as shielding. During SPEs, crew configure the cabin to maximize protection using onboard supplies and dedicated panels.',
    stats: [
      { value: 'Van Allen', label: 'Belt transit', icon: '\u{1F9F2}' },
      { value: 'Storm shelter', label: 'SPE design', icon: '\u{1F6E1}\uFE0F' },
      { value: '4 crew', label: 'Mission size', icon: '\u{1F468}\u200D\u{1F680}' }
    ],
    examples: ['Artemis I radiation measurements', 'HERA phantom experiment', 'Van Allen belt transit', 'Lunar surface exposure'],
    companies: ['Lockheed Martin', 'NASA', 'ESA', 'Airbus Defence'],
    futureImpact: 'Artemis data will validate shielding models and inform Gateway station and Mars vehicle designs.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_RadiationArmorRenderer: React.FC<ELON_RadiationArmorRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [shieldThickness, setShieldThickness] = useState(10);
  const [shieldMaterial, setShieldMaterial] = useState<'aluminum' | 'polyethylene'>('aluminum');

  // Twist phase - solar particle event
  const [solarEventActive, setSolarEventActive] = useState(false);
  const [stormShelterThickness, setStormShelterThickness] = useState(20);

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

  // Calculate dose reduction based on shield thickness (g/cm2)
  // Uses exponential attenuation with diminishing returns for GCR
  const calculateDoseRate = (thickness: number, material: 'aluminum' | 'polyethylene', solarEvent: boolean) => {
    const baseDose = solarEvent ? 500 : 1.8; // mSv/day: SPE vs GCR
    const effectiveAlpha = material === 'polyethylene' ? 0.065 : 0.04; // polyethylene better per g/cm2
    // Secondary neutron buildup for aluminum at higher thicknesses
    const secondaryBuildup = material === 'aluminum' ? 1 + thickness * 0.003 : 1;
    const attenuation = Math.exp(-effectiveAlpha * thickness) * secondaryBuildup;
    return baseDose * Math.max(0.01, attenuation);
  };

  const calculateMassPenalty = (thickness: number, material: 'aluminum' | 'polyethylene') => {
    // kg per m2 of hull area (simplified)
    const density = material === 'aluminum' ? 2.7 : 0.95; // g/cm3
    return thickness * density * 0.1; // kg/m2 approximation
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Exploration',
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
        gameType: 'radiation-armor',
        gameTitle: 'Radiation Armor',
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
  }, [phase, goToPhase]);

  // Current simulation values
  const currentDose = calculateDoseRate(shieldThickness, shieldMaterial, false);
  const unshieldedDose = 1.8;
  const doseReduction = ((unshieldedDose - currentDose) / unshieldedDose) * 100;
  const massPenalty = calculateMassPenalty(shieldThickness, shieldMaterial);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
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
          data-navigation-dot="true"
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
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

  // Fixed navigation bar component
  const NavigationBar = ({ children }: { children: React.ReactNode }) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {children}
    </nav>
  );

  // Slider style helper
  const sliderStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => ({
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, ${colors.border} ${((value - min) / (max - min)) * 100}%)`,
    cursor: 'pointer',
    touchAction: 'pan-y' as const,
    WebkitAppearance: 'none' as const,
    accentColor: color,
  });

  // Radiation Shielding SVG Visualization
  const ShieldingVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 360;
    const thickNorm = (shieldThickness - 1) / 49;
    const shieldW = 30 + thickNorm * 60;
    const wallX = 120;
    const doseNorm = Math.min(1, currentDose / unshieldedDose);

    // Generate particle positions
    const particles = Array.from({ length: 18 }, (_, i) => ({
      y: 30 + (i * 17) % (height - 80),
      speed: 0.5 + (i * 0.3) % 1.5,
      type: i % 3 === 0 ? 'gcr' : i % 3 === 1 ? 'proton' : 'electron',
      stopped: i < Math.floor(18 * (1 - doseNorm)),
      stopX: wallX + Math.random() * shieldW * 0.8,
    }));

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="shieldGradAl" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
          <linearGradient id="shieldGradPE" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="interiorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#16213e" />
          </linearGradient>
          <linearGradient id="doseBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <radialGradient id="gcrGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="protonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="electronGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="doseGlow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Space background */}
        <rect x="0" y="20" width={wallX} height={height - 60} fill="url(#spaceGrad)" rx="4" />
        {/* Stars */}
        <circle cx="20" cy="45" r="1" fill="white" opacity="0.7" />
        <circle cx="55" cy="70" r="1.5" fill="white" opacity="0.5" />
        <circle cx="35" cy="120" r="1" fill="white" opacity="0.8" />
        <circle cx="80" cy="95" r="1" fill="white" opacity="0.6" />
        <circle cx="15" cy="180" r="1.5" fill="white" opacity="0.4" />
        <circle cx="95" cy="210" r="1" fill="white" opacity="0.7" />
        <circle cx="45" cy="260" r="1" fill="white" opacity="0.5" />
        <circle cx="70" cy="165" r="1.5" fill="white" opacity="0.6" />

        {/* Shield wall */}
        <rect
          x={wallX}
          y={20}
          width={shieldW}
          height={height - 60}
          fill={shieldMaterial === 'aluminum' ? 'url(#shieldGradAl)' : 'url(#shieldGradPE)'}
          stroke={shieldMaterial === 'aluminum' ? '#9ca3af' : '#4ade80'}
          strokeWidth="1.5"
          rx="2"
        />
        {/* Shield layers */}
        {[0.25, 0.5, 0.75].map((frac, i) => (
          <line
            key={i}
            x1={wallX + shieldW * frac}
            y1={25}
            x2={wallX + shieldW * frac}
            y2={height - 45}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="3,6"
          />
        ))}

        {/* Interior */}
        <rect x={wallX + shieldW} y={20} width={width - wallX - shieldW - 10} height={height - 60} fill="url(#interiorGrad)" rx="4" />
        {/* Crew figure inside */}
        <circle cx={wallX + shieldW + 60} cy={130} r="10" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1={wallX + shieldW + 60} y1={140} x2={wallX + shieldW + 60} y2={175} stroke="#60a5fa" strokeWidth="1.5" />
        <line x1={wallX + shieldW + 60} y1={150} x2={wallX + shieldW + 47} y2={160} stroke="#60a5fa" strokeWidth="1.5" />
        <line x1={wallX + shieldW + 60} y1={150} x2={wallX + shieldW + 73} y2={160} stroke="#60a5fa" strokeWidth="1.5" />
        <line x1={wallX + shieldW + 60} y1={175} x2={wallX + shieldW + 48} y2={195} stroke="#60a5fa" strokeWidth="1.5" />
        <line x1={wallX + shieldW + 60} y1={175} x2={wallX + shieldW + 72} y2={195} stroke="#60a5fa" strokeWidth="1.5" />

        {/* Title */}
        <text x={width / 2} y={14} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Radiation Shielding Cross-Section — {shieldMaterial === 'aluminum' ? 'Aluminum' : 'Polyethylene'}
        </text>

        {/* Labels */}
        <text x={60} y={height - 30} fill="#94a3b8" fontSize="11" textAnchor="middle">SPACE</text>
        <text x={wallX + shieldW / 2} y={height - 30} fill={shieldMaterial === 'aluminum' ? '#9ca3af' : '#4ade80'} fontSize="11" textAnchor="middle" fontWeight="600">
          {shieldThickness} g/cm\u00B2
        </text>
        <text x={wallX + shieldW + 60} y={height - 30} fill="#60a5fa" fontSize="11" textAnchor="middle">CREW</text>

        {/* Animated radiation particles */}
        {particles.map((p, i) => {
          const pColor = p.type === 'gcr' ? '#EF4444' : p.type === 'proton' ? '#F59E0B' : '#3B82F6';
          const pRadius = p.type === 'gcr' ? 6 : p.type === 'proton' ? 4 : 3;
          const endX = p.stopped ? p.stopX : wallX + shieldW + 80;
          const glowId = p.type === 'gcr' ? 'url(#gcrGlow)' : p.type === 'proton' ? 'url(#protonGlow)' : 'url(#electronGlow)';

          return (
            <g key={i}>
              {/* Particle trail */}
              <line
                x1={5}
                y1={p.y}
                x2={Math.min(endX, wallX - 2)}
                y2={p.y}
                stroke={pColor}
                strokeWidth="1"
                opacity="0.3"
                strokeDasharray="4,3"
              />
              {/* Particle through shield */}
              {!p.stopped && (
                <line
                  x1={wallX}
                  y1={p.y}
                  x2={endX}
                  y2={p.y + (Math.random() - 0.5) * 10}
                  stroke={pColor}
                  strokeWidth="0.8"
                  opacity="0.2"
                />
              )}
              {/* Impact / stop flash */}
              {p.stopped && (
                <circle
                  cx={p.stopX}
                  cy={p.y}
                  r={pRadius + 4}
                  fill={glowId}
                  opacity="0.4"
                />
              )}
              {/* Particle circle */}
              <circle
                cx={p.stopped ? p.stopX : endX}
                cy={p.y}
                r={pRadius}
                fill={pColor}
                filter="url(#particleGlow)"
                opacity={p.stopped ? 0.7 : 0.9}
              />
            </g>
          );
        })}

        {/* Secondary neutron indicators for aluminum at high thickness */}
        {shieldMaterial === 'aluminum' && shieldThickness > 20 && (
          <>
            <circle cx={wallX + shieldW - 5} cy={80} r="2" fill="#a78bfa" opacity="0.7" />
            <circle cx={wallX + shieldW - 3} cy={140} r="2" fill="#a78bfa" opacity="0.6" />
            <circle cx={wallX + shieldW + 5} cy={200} r="2" fill="#a78bfa" opacity="0.5" />
            <text x={wallX + shieldW + 15} y={80} fill="#a78bfa" fontSize="11" opacity="0.8">n</text>
            <text x={wallX + shieldW + 15} y={140} fill="#a78bfa" fontSize="11" opacity="0.7">n</text>
          </>
        )}

        {/* Dose rate meter */}
        <rect x={width - 110} y={30} width="100" height="70" rx="6" fill="rgba(0,0,0,0.6)" stroke={colors.border} />
        <text x={width - 60} y={47} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">DOSE RATE</text>
        <rect x={width - 100} y={53} width="80" height="10" rx="4" fill={colors.border} />
        <rect
          x={width - 100}
          y={53}
          width={80 * doseNorm}
          height={10}
          rx="4"
          fill="url(#doseBarGrad)"
          filter="url(#doseGlow)"
        />
        <text x={width - 60} y={80} fill={doseNorm > 0.7 ? colors.error : doseNorm > 0.4 ? colors.warning : colors.success} fontSize="11" textAnchor="middle" fontWeight="700">
          {currentDose.toFixed(2)} mSv/d
        </text>
        <text x={width - 60} y={93} fill="#94a3b8" fontSize="11" textAnchor="middle">
          {doseReduction > 0 ? `-${doseReduction.toFixed(0)}%` : 'No reduction'}
        </text>

        {/* Particle type legend */}
        <g>
          <circle cx={width - 100} cy={height - 55} r="5" fill="#EF4444" />
          <text x={width - 88} y={height - 51} fill="#94a3b8" fontSize="11">GCR (heavy ion)</text>
          <circle cx={width - 100} cy={height - 38} r="5" fill="#F59E0B" />
          <text x={width - 88} y={height - 34} fill="#94a3b8" fontSize="11">Proton</text>
          <circle cx={width - 100} cy={height - 21} r="5" fill="#3B82F6" />
          <text x={width - 88} y={height - 17} fill="#94a3b8" fontSize="11">Electron</text>
        </g>

        {/* Dose curve showing attenuation vs thickness */}
        <path
          d={`M ${wallX + shieldW + 20} ${60 + 10 * doseNorm} Q ${wallX + shieldW + 50} ${120 + 40 * doseNorm} ${wallX + shieldW + 80} ${180 + 50 * doseNorm} Q ${wallX + shieldW + 110} ${220 + 40 * doseNorm} ${width - 120} ${240 + 30 * doseNorm}`}
          stroke={colors.accent}
          fill="none"
          strokeWidth="1.5"
          opacity="0.5"
          strokeDasharray="3,2"
        />
        <text x={wallX + shieldW + 20} y={55} fill={colors.accent} fontSize="11" opacity="0.7">dose</text>
      </svg>
    );
  };

  // Storm shelter SVG for twist_play
  const StormShelterVisualization = () => {
    const width = isMobile ? 340 : 520;
    const height = 320;
    const normalDose = calculateDoseRate(shieldThickness, shieldMaterial, false);
    const speDose = calculateDoseRate(shieldThickness, shieldMaterial, true);
    const shelterDose = calculateDoseRate(stormShelterThickness + shieldThickness, 'polyethylene', true);
    const speNorm = Math.min(1, speDose / 500);
    const shelterNorm = Math.min(1, shelterDose / 500);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
      >
        <defs>
          <linearGradient id="speFluxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="shelterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="stormBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="stormGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="alertGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="30" y1="60" x2={width - 30} y2="60" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="130" x2={width - 30} y2="130" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1="30" y1="200" x2={width - 30} y2="200" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
        <line x1={width / 2} y1="40" x2={width / 2} y2="220" stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />

        {/* Title */}
        <text x={width / 2} y={25} fill={colors.textPrimary} fontSize="14" fontWeight="700" textAnchor="middle">
          Solar Particle Event — Storm Shelter Analysis
        </text>

        {/* SPE alert indicator */}
        <circle cx={width - 40} cy={25} r="8" fill={solarEventActive ? colors.error : colors.warning} filter="url(#alertGlow)" opacity={solarEventActive ? 1 : 0.6} />
        <text x={width - 40} y={29} fill="white" fontSize="11" textAnchor="middle" fontWeight="700">!</text>

        {/* Flux comparison bars */}
        <text x={width / 2} y={50} fill="#94a3b8" fontSize="11" textAnchor="middle">
          Normal GCR vs Solar Particle Event Flux
        </text>

        {/* Normal bar */}
        <rect x={50} y={60} width={width - 100} height={14} rx="4" fill={colors.border} />
        <rect x={50} y={60} width={(width - 100) * 0.001} height={14} rx="4" fill={colors.success} />
        <text x={55} y={71} fill={colors.success} fontSize="11" fontWeight="600">Normal: 1x</text>

        {/* SPE bar */}
        <rect x={50} y={80} width={width - 100} height={14} rx="4" fill={colors.border} />
        <rect x={50} y={80} width={width - 100} height={14} rx="4" fill="url(#speFluxGrad)" filter="url(#stormGlow)" opacity="0.8" />
        <text x={55} y={91} fill="white" fontSize="11" fontWeight="700">SPE: 1000x flux!</text>

        {/* Dose comparison */}
        <text x={width / 2} y={118} fill="#94a3b8" fontSize="11" textAnchor="middle">
          Dose Behind Hull Only vs Storm Shelter
        </text>

        {/* Hull-only dose bar */}
        <g>
          <text x={50} y={138} fill={colors.error} fontSize="11" fontWeight="600">Hull only:</text>
          <rect x={130} y={128} width={width - 180} height={14} rx="4" fill={colors.border} />
          <rect x={130} y={128} width={(width - 180) * speNorm} height={14} rx="4" fill={colors.error} filter="url(#stormGlow)" />
          <circle cx={130 + (width - 180) * speNorm} cy={135} r="6" fill={colors.error} stroke="white" strokeWidth="1.5" filter="url(#stormGlow)" />
          <text x={width - 45} y={139} fill={colors.error} fontSize="11" fontWeight="700">{speDose.toFixed(0)} mSv/d</text>
        </g>

        {/* Shelter dose bar */}
        <g>
          <text x={50} y={168} fill={colors.success} fontSize="11" fontWeight="600">Shelter:</text>
          <rect x={130} y={158} width={width - 180} height={14} rx="4" fill={colors.border} />
          <rect x={130} y={158} width={(width - 180) * shelterNorm} height={14} rx="4" fill="url(#shelterGrad)" />
          <circle cx={130 + (width - 180) * shelterNorm} cy={165} r="6" fill={colors.success} stroke="white" strokeWidth="1.5" filter="url(#stormGlow)" />
          <text x={width - 45} y={169} fill={colors.success} fontSize="11" fontWeight="700">{shelterDose.toFixed(1)} mSv/d</text>
        </g>

        {/* Storm shelter diagram */}
        <text x={width / 2} y={198} fill="#94a3b8" fontSize="11" textAnchor="middle">Storm Shelter Cross-Section</text>

        {/* Outer hull */}
        <rect x={80} y={210} width={width - 160} height={70} rx="6" fill="rgba(107,114,128,0.3)" stroke="#6b7280" />
        {/* Inner shelter */}
        <rect x={130} y={220} width={width - 260} height={50} rx="4" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="2" />
        {/* Crew inside shelter */}
        <circle cx={width / 2 - 30} cy={245} r="7" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1={width / 2 - 30} y1={252} x2={width / 2 - 30} y2={265} stroke="#60a5fa" strokeWidth="1.5" />
        <circle cx={width / 2 + 30} cy={245} r="7" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1={width / 2 + 30} y1={252} x2={width / 2 + 30} y2={265} stroke="#60a5fa" strokeWidth="1.5" />

        {/* Labels */}
        <text x={85} y={250} fill="#6b7280" fontSize="11" transform={`rotate(-90 85 250)`}>Hull</text>
        <text x={135} y={250} fill="#22c55e" fontSize="11" transform={`rotate(-90 135 250)`}>Shelter</text>

        {/* Incoming SPE arrows */}
        {[215, 235, 255, 270].map((y, i) => (
          <g key={i}>
            <line x1={30} y1={y} x2={75} y2={y} stroke="#EF4444" strokeWidth="1.5" opacity="0.6" />
            <polygon points={`75,${y - 3} 80,${y} 75,${y + 3}`} fill="#EF4444" opacity="0.6" />
          </g>
        ))}

        {/* Result text */}
        <text x={width / 2} y={height - 14} fill={shelterDose < 50 ? colors.success : colors.warning} fontSize="12" textAnchor="middle" fontWeight="700">
          {shelterDose < 50 ? 'Shelter adequate for 72-hour SPE' : shelterDose < 150 ? 'Marginal — increase shelter thickness' : 'DANGER — shelter insufficient for extended SPE'}
        </text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

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
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            {'\u2622\uFE0F\u{1F6E1}\uFE0F'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Radiation Armor
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"Beyond Earth's magnetic shield, an "}
            <span style={{ color: colors.error }}>invisible threat</span>
            {" bombards everything — high-energy particles from the Sun and distant supernovae. How do we armor spacecraft against radiation that can pierce steel?"}
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "Space radiation is the number one risk for human exploration beyond low Earth orbit. It is invisible, relentless, and unlike anything we face on the ground — the particles travel at near-light speed and can damage DNA at the molecular level."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - NASA Human Research Program
            </p>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              disabled
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'not-allowed',
                opacity: 0.3,
                minHeight: '44px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Start Exploring
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'About the same — space is mostly vacuum with no radioactive materials' },
      { id: 'b', text: 'About 60x more annually (150 mSv vs 2.4 mSv on Earth)' },
      { id: 'c', text: '1000x more — space is bathed in lethal radiation' },
      { id: 'd', text: 'Less in space — no radon gas or terrestrial sources' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              ISS crew receive how much more radiation than people on Earth?
            </h2>

            {/* Static SVG showing Earth vs Space radiation */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="earthShield" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="earthGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#166534" />
                  </radialGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">Earth vs ISS: Radiation Exposure</text>

                {/* Earth with magnetosphere */}
                <circle cx="100" cy="110" r="40" fill="url(#earthGrad)" />
                <ellipse cx="100" cy="110" rx="65" ry="55" fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0.4" strokeDasharray="4,3" />
                <ellipse cx="100" cy="110" rx="75" ry="65" fill="url(#earthShield)" />
                <text x="100" y="175" textAnchor="middle" fill="#94a3b8" fontSize="11">Earth: 2.4 mSv/yr</text>
                <text x="100" y="190" textAnchor="middle" fill="#22c55e" fontSize="11">Protected</text>

                {/* ISS in orbit */}
                <rect x="260" y="85" width="80" height="12" rx="2" fill="#6b7280" />
                <rect x="285" y="70" width="6" height="50" rx="1" fill="#60a5fa" />
                <rect x="310" y="70" width="6" height="50" rx="1" fill="#60a5fa" />
                <text x="300" y="175" textAnchor="middle" fill="#94a3b8" fontSize="11">ISS: ??? mSv/yr</text>
                <text x="300" y="190" textAnchor="middle" fill={colors.warning} fontSize="11">Partially shielded</text>

                {/* Radiation arrows hitting ISS */}
                {[55, 72, 88, 105, 120].map((y, i) => (
                  <g key={i}>
                    <line x1="370" y1={y} x2="345" y2={y + 5} stroke="#EF4444" strokeWidth="1" opacity="0.5" />
                    <circle cx="345" cy={y + 5} r="2" fill="#EF4444" opacity="0.6" filter="url(#predictGlow)" />
                  </g>
                ))}

                {/* Question mark */}
                <text x="300" y="60" textAnchor="middle" fill={colors.accent} fontSize="24" fontWeight="800">?</text>
              </svg>
            </div>

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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Test My Prediction
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // PLAY PHASE - Interactive Radiation Shielding Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Radiation Shielding Simulator
            </h2>

            {/* Why this matters */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Every kilogram of shielding reduces payload capacity and increases mission cost. Engineers must find the optimal balance between crew protection and mass budget — a tradeoff that defines the feasibility of deep-space missions.
              </p>
            </div>

            {/* Key terms */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>GCR (Galactic Cosmic Rays)</strong> are high-energy particles from supernovae and other cosmic sources — extremely penetrating and difficult to shield.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>Areal Density (g/cm{'\u00B2'})</strong> is the standard measure of shielding thickness — mass per unit area, allowing comparison across materials of different density.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Secondary Neutrons</strong> are produced when high-energy particles strike shield atoms — a hidden danger that can actually increase dose with too much high-Z shielding.
              </p>
            </div>

            {/* Visualization explanation */}
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              This visualization shows a cross-section of spacecraft shielding. Watch how radiation particles interact with the shield — some are stopped, some scatter, and some penetrate. Adjust the shield thickness slider and compare aluminum vs polyethylene to see the dose reduction curve with its diminishing returns.
            </p>

            {/* Main visualization - side by side on desktop */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <ShieldingVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Material selector */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Shield Material</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {shieldMaterial === 'aluminum' ? 'Aluminum (Al)' : 'Polyethylene (HDPE)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(['aluminum', 'polyethylene'] as const).map((mat) => (
                        <button
                          key={mat}
                          onClick={() => { playSound('click'); setShieldMaterial(mat); }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: shieldMaterial === mat ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                            background: shieldMaterial === mat ? `${colors.accent}22` : colors.bgSecondary,
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            fontSize: '14px',
                            minHeight: '44px',
                          }}
                        >
                          {mat === 'aluminum' ? 'Aluminum (Z=13)' : 'Polyethylene (H-rich)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shield thickness slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Shield Thickness</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {shieldThickness} g/cm{'\u00B2'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={shieldThickness}
                      onChange={(e) => setShieldThickness(parseInt(e.target.value))}
                      onInput={(e) => setShieldThickness(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Shield Thickness"
                      style={sliderStyle(colors.accent, shieldThickness, 1, 50)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1 g/cm{'\u00B2'} (minimal)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50 (heavy)</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: currentDose > 1.0 ? colors.error : currentDose > 0.5 ? colors.warning : colors.success }}>
                        {currentDose.toFixed(2)}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>mSv/day</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent }}>
                        {doseReduction > 0 ? `-${doseReduction.toFixed(0)}%` : '0%'}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Dose reduction</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.warning }}>
                        {massPenalty.toFixed(1)}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>kg/m{'\u00B2'} mass</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand the Physics
            </button>
          </div>
        </NavigationBar>
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
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Radiation Shielding
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              {prediction === 'b'
                ? 'Your prediction was correct! As you observed in the experiment, ISS crew receive about 150 mSv/year — roughly 60x the ground-level dose of 2.4 mSv. The simulator showed that shielding helps but cannot eliminate the exposure entirely.'
                : 'Recall your prediction from earlier — as you observed in the experiment, ISS crew receive approximately 150 mSv/year — about 60x the 2.4 mSv annual dose on Earth. The result shows why complete protection is impractical.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Dose = Flux x Cross-Section x (1 - Attenuation)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Radiation dose depends on <span style={{ color: colors.error }}>particle flux</span> (how many particles arrive), <span style={{ color: colors.accent }}>interaction cross-section</span> (how likely they are to interact), and <span style={{ color: colors.success }}>shielding attenuation</span> (how much is absorbed). For GCR, the extreme energies mean attenuation is limited.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  ISS: ~150 mSv/yr behind 10-20 g/cm{'\u00B2'} Al | Earth: 2.4 mSv/yr behind atmosphere + magnetosphere
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Why Hydrogen-Rich Materials Win
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Hydrogen nuclei (protons) are uniquely effective at fragmenting heavy GCR ions without producing dangerous secondary neutrons. High-Z materials like aluminum generate neutron showers that can paradoxically increase the dose. This is why polyethylene outperforms aluminum per unit mass.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Three Types of Space Radiation
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'GCR', desc: 'Galactic Cosmic Rays', dose: '1.8 mSv/d', color: '#EF4444' },
                  { name: 'SPE', desc: 'Solar Particle Events', dose: 'Up to 500 mSv/d', color: '#F59E0B' },
                  { name: 'Trapped', desc: 'Van Allen Belts', dose: 'Variable', color: '#3B82F6' },
                ].map(rad => (
                  <div key={rad.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{rad.name}</div>
                    <div style={{ ...typo.small, color: rad.color }}>{rad.dose}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{rad.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Discover the Twist
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Radiation flux increases by about 10% — manageable without changes' },
      { id: 'b', text: 'Flux increases 1000x for 24-72 hours — crew must shelter behind extra shielding' },
      { id: 'c', text: 'Solar events are too rare to matter for mission planning' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Solar Particle Event
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              During a solar particle event, radiation flux increases...
            </h2>

            {/* Static SVG showing solar event */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="100%" stopColor="#F97316" />
                  </radialGradient>
                  <filter id="sunGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Sun */}
                <circle cx="60" cy="70" r="30" fill="url(#sunGrad)" filter="url(#sunGlow)" />
                <text x="60" y="75" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">CME</text>
                {/* Particle burst */}
                {[40, 55, 70, 85, 100].map((y, i) => (
                  <g key={i}>
                    <line x1="95" y1={y} x2="300" y2={y + (Math.random() - 0.5) * 20} stroke="#EF4444" strokeWidth="2" opacity="0.6" />
                    <circle cx="300" cy={y + (Math.random() - 0.5) * 20} r="3" fill="#EF4444" opacity="0.7" />
                  </g>
                ))}
                {/* Spacecraft */}
                <rect x="310" y="55" width="60" height="30" rx="4" fill="#6b7280" stroke="#9ca3af" />
                <text x="340" y="75" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">CREW</text>
                <text x="200" y="130" textAnchor="middle" fill="#94a3b8" fontSize="11">1000x normal flux for 24-72 hours</text>
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                See Storm Shelter
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - Storm Shelter Designer
  if (phase === 'twist_play') {
    const speDose = calculateDoseRate(shieldThickness, shieldMaterial, true);
    const shelterDose = calculateDoseRate(stormShelterThickness + shieldThickness, 'polyethylene', true);
    const shelterMass = calculateMassPenalty(stormShelterThickness, 'polyethylene');

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Storm Shelter Designer
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Design additional shielding for a dedicated storm shelter to protect crew during a solar particle event
            </p>

            {/* Twist visualization - side by side on desktop */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '12px' : '20px',
                width: '100%',
                alignItems: isMobile ? 'center' : 'flex-start',
              }}>
                {/* Left: SVG visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden' }}>
                    <StormShelterVisualization />
                  </div>

                  {/* Educational panel */}
                  <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                    <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The storm shelter cross-section shows how concentrated polyethylene shielding inside the hull dramatically reduces radiation dose during a solar particle event, compared to hull-only protection.</p>
                    <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> Increasing the shelter thickness adds hydrogen-rich material that fragments incoming solar protons, reducing the dose rate inside the shelter -- but at the cost of additional mass per square meter of shelter wall.</p>
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  {/* Solar event toggle */}
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => { playSound('click'); setSolarEventActive(!solarEventActive); }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `2px solid ${solarEventActive ? colors.error : colors.border}`,
                        background: solarEventActive ? `${colors.error}22` : colors.bgSecondary,
                        color: solarEventActive ? colors.error : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        minHeight: '44px',
                      }}
                    >
                      {solarEventActive ? '\u26A0\uFE0F SOLAR PARTICLE EVENT ACTIVE — 1000x flux' : 'Simulate Solar Particle Event'}
                    </button>
                  </div>

                  {/* Storm shelter thickness slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Extra Shelter Shielding (polyethylene)</span>
                      <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>+{stormShelterThickness} g/cm{'\u00B2'}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={stormShelterThickness}
                      onChange={(e) => setStormShelterThickness(parseInt(e.target.value))}
                      onInput={(e) => setStormShelterThickness(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Storm shelter extra thickness"
                      style={sliderStyle(colors.success, stormShelterThickness, 5, 50)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>5 g/cm{'\u00B2'} (light)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50 g/cm{'\u00B2'} (heavy)</span>
                    </div>
                  </div>

                  {/* Results */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.error }}>{speDose.toFixed(0)} mSv/d</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Hull Only (during SPE)</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.success }}>{shelterDose.toFixed(1)} mSv/d</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>In Storm Shelter</div>
                    </div>
                  </div>

                  {/* Mass and event info */}
                  <div style={{
                    background: shelterDose < 50 ? `${colors.success}22` : `${colors.warning}22`,
                    border: `1px solid ${shelterDose < 50 ? colors.success : colors.warning}`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                      72-hour SPE total dose in shelter:
                    </p>
                    <div style={{
                      ...typo.h2,
                      color: shelterDose * 3 < 150 ? colors.success : shelterDose * 3 < 500 ? colors.warning : colors.error
                    }}>
                      {(shelterDose * 3).toFixed(0)} mSv
                    </div>
                    <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                      Shelter mass penalty: {shelterMass.toFixed(1)} kg/m{'\u00B2'} | NASA career limit: ~1000 mSv
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_predict')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              Understand Storm Shelters
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
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
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Storm Shelter Strategy
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Two-Layer Defense</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Space vehicle radiation protection uses a two-layer strategy: the hull provides baseline GCR protection for normal operations, while a dedicated storm shelter with concentrated shielding protects crew during the acute 24-72 hour solar particle events that can deliver lethal doses.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Mass Budget Reality</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Shielding the entire vehicle to storm-shelter levels would be prohibitively massive. Instead, only a small volume — enough for all crew to occupy for days — receives the heaviest protection. Water tanks, food stores, and equipment are strategically placed around this shelter for multi-purpose shielding.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Radiation protection for deep-space missions requires accepting chronic low-level GCR exposure while designing for survivable acute SPE exposure. No practical shielding eliminates GCR completely — the ultimate solution may be faster transit times through nuclear propulsion.
                </p>
              </div>
            </div>
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_play')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, minHeight: '44px' }}
            >
              See Real-World Applications
            </button>
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E L O N_ Radiation Armor"
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
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Explore each application to continue
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

            {/* All apps always visible */}
            {realWorldApps.map((app, idx) => (
              <div key={idx} style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${app.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>

                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  {app.description}
                </p>

                <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <p style={{ ...typo.small, color: colors.accent, marginBottom: '4px', fontWeight: 600 }}>Physics Connection:</p>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Used by: {app.companies.join(', ')}
                </p>

                {!completedApps[idx] && (
                  <button
                    onClick={() => {
                      playSound('click');
                      const newCompleted = [...completedApps];
                      newCompleted[idx] = true;
                      setCompletedApps(newCompleted);
                      setSelectedApp(idx);
                      // Auto-advance to next uncompleted app or test phase
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted === -1) {
                        // All apps completed — advance to test
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextUncompleted);
                      }
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginTop: '12px',
                      minHeight: '44px',
                    }}
                  >
                    Got It!
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {'\u2190'} Back
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, minHeight: '44px' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
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
          {renderProgressBar()}

          <div style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingTop: '44px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
                {passed ? '\u{1F3C6}' : '\u{1F4DA}'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand space radiation shielding and its engineering challenges!' : 'Review the concepts and try again.'}
              </p>
            </div>
          </div>

          <NavigationBar>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
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
                  style={{ ...primaryButtonStyle, minHeight: '44px' }}
                >
                  Review & Try Again
                </button>
              )}
            </div>
            {renderNavDots()}
          </NavigationBar>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Knowledge Test: Radiation Armor
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Apply your understanding of space radiation types, shielding physics, dose units, and protection strategies. Consider the tradeoffs between mass, material choice, and the different radiation environments encountered in LEO, deep space, and during solar events.
            </p>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.h3, color: colors.accent }}>
                Q{currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
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
          </div>
        </div>

        <NavigationBar>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  padding: '14px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {'\u2190'} Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  padding: '14px 24px',
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
                  padding: '14px 24px',
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
          {renderNavDots()}
        </NavigationBar>
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
        {renderProgressBar()}

        <div style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingTop: '44px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
            {'\u{1F3C6}'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Radiation Armor Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how spacecraft are armored against the invisible threat of space radiation — from GCR to solar storms.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'GCR, SPE, and trapped belt radiation types',
                'Hydrogen-rich materials vs high-Z secondaries',
                'Dose reduction with diminishing returns',
                'Storm shelter strategy for solar events',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>{'\u2713'}</span>
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
              }}
            >
              Return to Dashboard
            </a>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default ELON_RadiationArmorRenderer;
