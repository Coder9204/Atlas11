'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// HYDROSTATIC PRESSURE - Complete 10-Phase Interactive Learning Game
// Understanding pressure in fluids: P = rho * g * h
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

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

interface HydrostaticPressureRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ============================================================================
// PREMIUM COLOR SYSTEM
// ============================================================================
const colors = {
  bgDeep: '#030712',
  bgSurface: '#0f172a',
  bgElevated: '#1e293b',
  bgHover: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textTertiary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#06b6d4',
  primaryHover: '#0891b2',
  secondary: '#3b82f6',
  accent: '#8b5cf6',
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
};

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// ============================================================================
// SOUND UTILITY
// ============================================================================
const playSound = (type: 'click' | 'success' | 'error' | 'transition' | 'complete' | 'bubble') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType; ramp?: boolean }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      error: { freq: 300, duration: 0.25, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' },
      bubble: { freq: 200, duration: 0.15, type: 'sine', ramp: true }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    if (sound.ramp) {
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + sound.duration);
    }
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ============================================================================
// CONSTANTS
// ============================================================================
const GRAVITY = 9.81;
const ATM_PRESSURE = 101325;

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions = [
  {
    scenario: "A scuba diver descends from the surface to 10 meters depth in fresh water. Their dive computer shows total pressure increasing from 1 atm to 2 atm.",
    question: "What causes the pressure to double at just 10 meters depth?",
    options: [
      { id: 'a', label: "Water molecules move faster at depth" },
      { id: 'b', label: "The weight of the 10-meter water column above adds ~1 atm of pressure", correct: true },
      { id: 'c', label: "Gravity is stronger underwater" },
      { id: 'd', label: "The diver's body compresses at depth" }
    ],
    explanation: "Hydrostatic pressure P = rgh tells us that a 10m column of fresh water (density 1000 kg/m3) creates about 98,100 Pa or roughly 1 atm. Add the 1 atm at the surface, and total pressure is 2 atm."
  },
  {
    scenario: "In the equation P = rgh, an engineer needs to calculate pressure at 50 meters depth in seawater (density 1025 kg/m3) versus fresh water (density 1000 kg/m3).",
    question: "How does seawater density affect the pressure at the same depth?",
    options: [
      { id: 'a', label: "No difference - pressure only depends on depth" },
      { id: 'b', label: "Seawater pressure is 2.5% higher because density is 2.5% higher", correct: true },
      { id: 'c', label: "Seawater pressure is lower due to salt buoyancy" },
      { id: 'd', label: "Seawater creates exactly double the pressure" }
    ],
    explanation: "Since P = rgh, pressure is directly proportional to density. A 2.5% increase in density (from 1000 to 1025 kg/m3) means 2.5% more pressure at the same depth. This is why dive tables differ for salt and fresh water."
  },
  {
    scenario: "A scientist places pressure sensors at the bottom of three containers: a wide tank (1000 liters), a medium beaker (100 liters), and a narrow tube (1 liter). All are filled with water to exactly 80 cm height.",
    question: "Which container shows the highest pressure reading at the bottom?",
    options: [
      { id: 'a', label: "The wide tank - it holds more water weight" },
      { id: 'b', label: "The narrow tube - water is concentrated" },
      { id: 'c', label: "All show equal pressure", correct: true },
      { id: 'd', label: "Cannot determine without knowing container shapes" }
    ],
    explanation: "This demonstrates the Hydrostatic Paradox. Pressure P = rgh depends only on depth (h), fluid density (r), and gravity (g) - not on volume or container shape. All three have identical 80 cm water height, so all have identical pressure."
  },
  {
    scenario: "In 1646, Blaise Pascal attached a thin 10-meter vertical tube to a sealed wooden barrel filled with water. By adding just a few cups of water to the tube, the barrel burst dramatically.",
    question: "How could such a small amount of water burst a strong barrel?",
    options: [
      { id: 'a', label: "The water accelerated as it fell, creating impact force" },
      { id: 'b', label: "The 10-meter height created ~1 atm pressure throughout the barrel", correct: true },
      { id: 'c', label: "Chemical reactions between water and wood weakened the barrel" },
      { id: 'd', label: "Pascal heated the water, causing steam pressure" }
    ],
    explanation: "Height, not volume, determines pressure. The narrow tube's 10m height created approximately 1 atmosphere of additional pressure (98 kPa) on every surface inside the barrel. This pressure acting on the barrel's large surface area produced enormous force - even from a tiny volume of water."
  },
  {
    scenario: "A diver at 30 meters depth holds their breath and rapidly ascends to the surface in 30 seconds without exhaling. Emergency responders find them unconscious at the surface.",
    question: "What likely caused this diving accident?",
    options: [
      { id: 'a', label: "Exhaustion from swimming too fast" },
      { id: 'b', label: "Air in lungs expanded 4x as pressure dropped, causing pulmonary barotrauma", correct: true },
      { id: 'c', label: "Cold water shock from temperature change" },
      { id: 'd', label: "Dehydration from the physical exertion" }
    ],
    explanation: "At 30m, pressure is 4 atm. The diver's lungs held compressed air at 4x surface pressure. As they ascended, pressure dropped and air expanded. Without exhaling, lungs can rupture (pulmonary barotrauma). This is why divers must exhale continuously during emergency ascents."
  },
  {
    scenario: "Engineers designing a submarine for 300-meter operations calculate the hull pressure. At this depth, the hull experiences 30 atmospheres of pressure - about 3 MPa.",
    question: "Why do submarine hulls use cylindrical or spherical shapes rather than box shapes?",
    options: [
      { id: 'a', label: "Curved shapes reduce drag for faster movement" },
      { id: 'b', label: "Curved surfaces distribute pressure evenly, converting crushing force to compression", correct: true },
      { id: 'c', label: "Box shapes are too expensive to manufacture" },
      { id: 'd', label: "Curved shapes provide more interior space" }
    ],
    explanation: "Hydrostatic pressure acts perpendicular to every surface. Curved hulls (spheres, cylinders) distribute this uniform pressure as pure compression stress, which materials handle well. Flat surfaces would experience bending moments and stress concentrations, requiring much thicker walls."
  },
  {
    scenario: "A city's water tower stands 40 meters tall. Engineers calculate that homes at ground level will receive approximately 4 atmospheres (60 psi) of water pressure without any pumps operating.",
    question: "What fundamental principle allows water towers to provide pressure?",
    options: [
      { id: 'a', label: "Spinning turbines inside the tower create centrifugal pressure" },
      { id: 'b', label: "Gravitational potential energy converts to pressure head via P = rgh", correct: true },
      { id: 'c', label: "Air pumps at the top of the tower pressurize the water" },
      { id: 'd', label: "Temperature differences create thermal pressure gradients" }
    ],
    explanation: "Water towers are a direct application of P = rgh. The 40m elevation provides pressure head: P = 1000 kg/m3 x 9.81 m/s2 x 40m = 392,400 Pa or about 4 atm. This passive system provides consistent pressure 24/7 without pumps, using only gravity."
  },
  {
    scenario: "A hydraulic car lift uses a small piston (area 10 cm2) to lift a car on a large piston (area 500 cm2). The mechanic applies 100 N of force to the small piston.",
    question: "How much force does the large piston exert on the car?",
    options: [
      { id: 'a', label: "100 N - force is conserved" },
      { id: 'b', label: "5,000 N - force multiplies by the area ratio", correct: true },
      { id: 'c', label: "5 N - force divides by the area ratio" },
      { id: 'd', label: "50,000 N - force multiplies by area squared" }
    ],
    explanation: "Pascal's principle: pressure transmits equally throughout a fluid. Small piston pressure = 100N / 10cm2 = 10 N/cm2. This same pressure on the large piston creates force = 10 N/cm2 x 500 cm2 = 5,000 N. The 50:1 area ratio provides 50:1 force multiplication."
  },
  {
    scenario: "A patient stands up quickly after lying down. Their doctor notices blood pressure is momentarily lower in their brain than in their feet due to the hydrostatic column of blood.",
    question: "Why might patients feel dizzy when standing up quickly (orthostatic hypotension)?",
    options: [
      { id: 'a', label: "Muscles compress blood vessels when standing" },
      { id: 'b', label: "Hydrostatic pressure creates ~100 mmHg head-to-foot difference, reducing brain blood flow", correct: true },
      { id: 'c', label: "The inner ear cannot adjust to vertical orientation quickly" },
      { id: 'd', label: "Oxygen concentration in blood drops when vertical" }
    ],
    explanation: "Blood is a fluid following P = rgh. A 1.7m tall person has about 130 mmHg hydrostatic pressure difference between brain and feet when standing. Until the body compensates (by constricting leg vessels and increasing heart rate), brain blood pressure temporarily drops, causing dizziness."
  },
  {
    scenario: "The Mariana Trench reaches 10,994 meters depth. Pressure at the bottom is about 1,100 atmospheres (110 MPa). At this pressure, water compresses by about 5%, increasing density.",
    question: "How does water compression affect actual pressure at extreme depths?",
    options: [
      { id: 'a', label: "No effect - water is incompressible" },
      { id: 'b', label: "Compression increases density, making deep pressure slightly higher than P = rgh predicts", correct: true },
      { id: 'c', label: "Compression reduces pressure by absorbing energy" },
      { id: 'd', label: "Compression creates vacuum pockets that lower average pressure" }
    ],
    explanation: "While water is nearly incompressible, at 1,100 atm it compresses ~5%. Since P = rgh, higher density means slightly more pressure than simple calculations predict. At Challenger Deep, actual pressure is about 2-3% higher than if water were perfectly incompressible."
  }
];

// ============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications with full metadata
// ============================================================================
const realWorldApps = [
  {
    icon: '🤿',
    title: 'Scuba Diving Safety',
    short: 'Understanding decompression sickness',
    tagline: 'Every 10 meters adds another atmosphere',
    description: 'Scuba divers experience hydrostatic pressure directly on their bodies and in the air they breathe. Understanding P = rgh is essential for dive planning, avoiding decompression sickness (the bends), and preventing lung barotrauma during ascent.',
    connection: 'The pressure simulation you explored shows exactly what divers experience: at 30m, total pressure is 4 atm. Nitrogen dissolves into blood at 4x the surface rate. Ascending too quickly lets nitrogen bubble out - like opening a shaken soda.',
    howItWorks: 'Divers breathe compressed air at ambient pressure. High pressure forces nitrogen into blood and tissues. Ascending slowly allows nitrogen to diffuse back into lungs safely. Dive computers use hydrostatic equations to calculate safe ascent rates and decompression stops.',
    stats: [
      { value: '10m/atm', label: 'Pressure increase rate', icon: '📏' },
      { value: '9m/min', label: 'Safe ascent rate', icon: '⬆️' },
      { value: '1,200+', label: 'DCS cases per year (US)', icon: '🏥' }
    ],
    examples: ['Recreational diving to 40m', 'Technical deep diving', 'Commercial saturation diving', 'Navy submarine escape training'],
    companies: ['PADI', 'Divers Alert Network', 'Shearwater Research', 'Suunto'],
    futureImpact: 'AI-powered dive computers will provide real-time tissue saturation modeling and personalized decompression schedules based on individual physiology.',
    color: '#3B82F6'
  },
  {
    icon: '🚢',
    title: 'Submarine Engineering',
    short: 'Designing pressure hulls for the deep',
    tagline: 'Where 1 cm2 experiences 100+ kg of force',
    description: 'Submarine hulls must withstand crushing hydrostatic pressure at operating depth while remaining light enough to control buoyancy. Military submarines operate at 300-500m; deep research vessels go to 6,000m+. Every aspect of design starts with P = rgh.',
    connection: 'Your exploration of pressure increasing with depth explains submarine depth ratings. At 300m, every square meter of hull experiences 3 million Newtons of force - equivalent to 300 cars stacked on a dining table.',
    howItWorks: 'Pressure hulls use high-strength steel (HY-80/100) or titanium in cylindrical or spherical shapes. Wall thickness calculations start with P = rgh at maximum depth, plus safety factors. Penetrations (for periscopes, cables) are the weakest points and require special reinforcement.',
    stats: [
      { value: '500m', label: 'Typical military depth', icon: '🎯' },
      { value: '50 atm', label: 'Hull design pressure', icon: '💪' },
      { value: '10,994m', label: 'Deepest dive ever', icon: '🏆' }
    ],
    examples: ['Virginia-class submarines (US)', 'Seawolf-class deep divers', 'DSV Limiting Factor', 'Trieste bathyscaphe (1960)'],
    companies: ['General Dynamics', 'Triton Submarines', 'Huntington Ingalls', 'EYOS Expeditions'],
    futureImpact: 'Advanced carbon fiber composites and glass pressure spheres will enable routine access to hadal zones (6,000-11,000m) for scientific exploration.',
    color: '#8B5CF6'
  },
  {
    icon: '🏗️',
    title: 'Dam Engineering',
    short: 'Holding back billions of gallons',
    tagline: 'Where pressure determines wall thickness',
    description: 'Dams must resist hydrostatic pressure that increases linearly from zero at the surface to maximum at the base. This pressure distribution dictates the characteristic triangular cross-section of gravity dams - thick at the bottom, thin at the top.',
    connection: 'The triangular pressure distribution you observed in the simulation is exactly what dam engineers design for. At Hoover Dam (180m), base pressure reaches 1.8 MPa - the dam must be 200m thick at the base to resist this force.',
    howItWorks: 'Gravity dams use mass to resist overturning and sliding. Arch dams transfer force to canyon walls. Engineers integrate P = rgh from surface to base to calculate total force and overturning moment. Every dam section must resist the specific pressure at its depth.',
    stats: [
      { value: '180m', label: 'Hoover Dam height', icon: '📏' },
      { value: '1.8 MPa', label: 'Base pressure', icon: '💪' },
      { value: '28B m3', label: 'Lake Mead volume', icon: '💧' }
    ],
    examples: ['Hoover Dam (USA)', 'Three Gorges Dam (China)', 'Itaipu Dam (Brazil)', 'Grand Coulee Dam (USA)'],
    companies: ['Bechtel', 'Bureau of Reclamation', 'Voith Hydro', 'Andritz'],
    futureImpact: 'Smart dams with embedded sensors will monitor hydrostatic stress in real-time, predicting structural issues before failure and optimizing water release schedules.',
    color: '#22C55E'
  },
  {
    icon: '💧',
    title: 'Water Distribution',
    short: 'Pressure without pumps',
    tagline: 'Gravity does the work 24/7',
    description: 'Municipal water systems use elevated tanks and reservoirs to provide consistent water pressure through hydrostatics. A 40m water tower creates ~60 psi at ground level without any pumps running - pure gravitational potential energy converted to pressure.',
    connection: 'P = rgh directly determines home water pressure. A 30m elevation difference provides 3 atm (45 psi) - enough for showers, dishwashers, and fire hydrants. Higher buildings need roof tanks or booster pumps to overcome hydrostatic head.',
    howItWorks: 'Pumps fill elevated tanks during low-demand periods (usually night). During peak demand, gravity-fed water supplements pump capacity. Tank height sets maximum pressure; tank volume provides buffer for demand spikes. Pressure zones manage varying terrain elevations.',
    stats: [
      { value: '40-60 psi', label: 'Typical home pressure', icon: '🚿' },
      { value: '30-50m', label: 'Water tower height', icon: '📏' },
      { value: '1M+ gal', label: 'Large tank capacity', icon: '💧' }
    ],
    examples: ['Municipal water towers', 'NYC rooftop tanks', 'Pressure zone management', 'Emergency fire suppression'],
    companies: ['American Water', 'Veolia', 'Xylem', 'Suez'],
    futureImpact: 'Smart pressure management with real-time sensors will reduce pipe bursts, detect leaks instantly, and optimize pump schedules to cut energy costs by 30%.',
    color: '#F59E0B'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const HydrostaticPressureRenderer: React.FC<HydrostaticPressureRendererProps> = ({ onGameEvent, gamePhase }) => {
  // ========== STATE ==========
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Simulation states
  const [depth, setDepth] = useState(10);
  const [fluidDensity, setFluidDensity] = useState(1000);
  const [showPressureArrows, setShowPressureArrows] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist simulation
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
  const [measurementCount, setMeasurementCount] = useState(0);

  // Transfer states
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Animation ref
  const animationRef = useRef<number>();

  // ========== CALCULATIONS ==========
  const hydrostaticPressure = fluidDensity * GRAVITY * depth;
  const totalPressure = ATM_PRESSURE + hydrostaticPressure;
  const pressureInAtm = totalPressure / ATM_PRESSURE;

  // ========== SYNC gamePhase PROP ==========
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // ========== RESPONSIVE DETECTION ==========
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ========== RESPONSIVE TYPOGRAPHY ==========
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    subheading: isMobile ? '17px' : '20px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '16px' : '20px',
    sectionGap: isMobile ? '16px' : '24px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // ========== ANIMATION LOOP ==========
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => (prev + 1) % 120);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ========== RESET TEST ON ENTRY ==========
  useEffect(() => {
    if (phase === 'test') {
      setCurrentQuestion(0);
      setTestAnswers(Array(10).fill(null));
      setTestScore(0);
      setShowExplanation(false);
    }
  }, [phase]);

  // ========== EVENT EMITTER ==========
  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'hydrostatic_pressure',
      gameTitle: 'Hydrostatic Pressure',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // ========== NAVIGATION ==========
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_changed', { from: phase, to: newPhase });
  }, [phase, emitEvent]);

  // ========== TEST ANSWER HANDLER ==========
  const handleTestAnswer = useCallback((answerId: string) => {
    if (testAnswers[currentQuestion] !== null) return;

    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = answerId;
    setTestAnswers(newAnswers);
    setShowExplanation(true);

    const isCorrect = testQuestions[currentQuestion].options.find(o => o.id === answerId)?.correct;
    if (isCorrect) {
      setTestScore(s => s + 1);
      playSound('success');
      emitEvent('correct_answer', { question: currentQuestion, answer: answerId });
    } else {
      playSound('error');
      emitEvent('incorrect_answer', { question: currentQuestion, answer: answerId });
    }
  }, [currentQuestion, testAnswers, emitEvent]);

  // ========== RETURN TO DASHBOARD ==========
  const handleReturnToDashboard = useCallback(() => {
    emitEvent('button_clicked', { action: 'return_to_dashboard' });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [emitEvent]);

  // ========== PROGRESS BAR RENDERER ==========
  const renderProgressBar = (progress: number, color: string = colors.primary) => (
    <div style={{
      height: '6px',
      background: colors.bgElevated,
      borderRadius: '3px',
      overflow: 'hidden'
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, progress))}%`,
        background: color,
        borderRadius: '3px',
        transition: 'width 0.3s ease'
      }} />
    </div>
  );

  // ========== NAV DOTS RENDERER ==========
  const renderNavDots = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => { if (i <= currentIdx) goToPhase(p); }}
            style={{
              width: phase === p ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              background: phase === p ? colors.primary : i < currentIdx ? colors.success : colors.bgElevated,
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.2s',
              opacity: i <= currentIdx ? 1 : 0.5
            }}
            aria-label={`Go to ${p} phase`}
          />
        ))}
      </div>
    );
  };

  // ============================================================================
  // VISUALIZATION: PRESSURE TANK
  // ============================================================================
  const renderPressureTank = () => {
    const width = isMobile ? 300 : 380;
    const height = isMobile ? 260 : 300;
    const tankTop = 40;
    const tankHeight = 160;
    const tankLeft = 50;
    const tankWidth = 120;
    const depthRatio = depth / 50;
    const objectY = tankTop + depthRatio * tankHeight;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          <defs>
            {/* Water gradient with depth effect */}
            <linearGradient id="hydroWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.35" />
              <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.65" />
              <stop offset="75%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.95" />
            </linearGradient>

            {/* Glass effect gradient */}
            <linearGradient id="hydroGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
              <stop offset="20%" stopColor="#64748b" stopOpacity="0.2" />
              <stop offset="80%" stopColor="#64748b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.5" />
            </linearGradient>

            {/* Pressure arrow gradient */}
            <linearGradient id="hydroArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="1" />
            </linearGradient>

            {/* Object glow */}
            <radialGradient id="hydroObjectGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
            </radialGradient>

            {/* Bubble gradient */}
            <radialGradient id="hydroBubbleGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
            </radialGradient>

            {/* Surface shimmer */}
            <linearGradient id="hydroSurfaceShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.2" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="hydroGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker */}
            <marker id="hydroArrowMarker" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
              <path d="M0,0 L0,8 L8,4 z" fill="#22c55e" />
            </marker>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill={colors.bgSurface} rx="16" />

          {/* Grid lines for visual reference */}
          {[0, 10, 20, 30, 40, 50].map((d) => {
            const gy = tankTop + (d / 50) * tankHeight;
            return (
              <line key={`grid-${d}`} x1={tankLeft} y1={gy} x2={tankLeft + tankWidth} y2={gy} stroke={colors.textMuted} strokeDasharray="4 4" opacity="0.3" />
            );
          })}

          {/* Axis labels */}
          <text x={tankLeft + tankWidth / 2} y={tankTop - 12} textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600">Depth (meters)</text>
          <text x={width - 72} y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="12" fontWeight="600">Pressure</text>

          {/* Formula display in SVG */}
          <text x={tankLeft + tankWidth / 2} y={height - 12} textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="bold">P = rgh = {(hydrostaticPressure / 1000).toFixed(1)} kPa</text>

          {/* Tank water fill */}
          <rect x={tankLeft} y={tankTop} width={tankWidth} height={tankHeight} fill="url(#hydroWaterGrad)" rx="4" />

          {/* Glass container walls */}
          <rect x={tankLeft - 3} y={tankTop - 3} width={tankWidth + 6} height={tankHeight + 6} fill="none" stroke="url(#hydroGlassGrad)" strokeWidth="4" rx="6" />

          {/* Surface shimmer */}
          <line x1={tankLeft + 4} y1={tankTop + 3} x2={tankLeft + tankWidth - 4} y2={tankTop + 3} stroke="url(#hydroSurfaceShimmer)" strokeWidth="2" strokeLinecap="round" />

          {/* Depth markers */}
          {[0, 10, 20, 30, 40, 50].map((d) => {
            const y = tankTop + (d / 50) * tankHeight;
            const isActive = Math.abs(d - depth) < 5;
            return (
              <g key={d}>
                <line x1={tankLeft - 10} y1={y} x2={tankLeft - 4} y2={y} stroke={isActive ? colors.primary : colors.textMuted} strokeWidth={isActive ? 2 : 1} />
                <text x={tankLeft - 14} y={y + 4} textAnchor="end" fill={isActive ? colors.primary : colors.textMuted} fontSize="11" fontWeight={isActive ? 'bold' : 'normal'}>{d}m</text>
              </g>
            );
          })}

          {/* Object/Diver indicator - interactive point */}
          {(() => {
            const pointCx = tankLeft + tankWidth / 2;
            const pointCy = Math.min(objectY, tankTop + tankHeight - 18);
            return (
              <g>
                <circle cx={pointCx} cy={pointCy} r="18" fill="url(#hydroObjectGlow)" filter="url(#hydroGlowFilter)" />
                <circle cx={pointCx} cy={pointCy} r="18" fill="none" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.7" />
                <text x={pointCx} y={pointCy + 5} textAnchor="middle" fill={colors.bgDeep} fontSize="11" fontWeight="bold">{depth}m</text>
              </g>
            );
          })()}

          {/* Pressure arrows pointing inward */}
          {showPressureArrows && (
            <g transform={`translate(${tankLeft + tankWidth/2}, ${Math.min(objectY, tankTop + tankHeight - 18)})`}>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const arrowLength = 16 + (depth / 50) * 28;
                const rad = (angle * Math.PI) / 180;
                const startRadius = 22;
                const x1 = Math.cos(rad) * (startRadius + arrowLength);
                const y1 = Math.sin(rad) * (startRadius + arrowLength);
                const x2 = Math.cos(rad) * startRadius;
                const y2 = Math.sin(rad) * startRadius;
                return (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#hydroArrowGrad)" strokeWidth={2 + depth / 30} markerEnd="url(#hydroArrowMarker)" opacity={0.7 + (depth / 100)} />
                );
              })}
            </g>
          )}

          {/* Animated bubbles */}
          {[1, 2, 3, 4].map(i => {
            const bubbleY = tankTop + tankHeight - ((animationFrame * 1.5 + i * 35) % tankHeight);
            const bubbleX = tankLeft + 12 + i * 28;
            const bubbleSize = 2 + (i % 3);
            return (
              <circle key={i} cx={bubbleX} cy={bubbleY} r={bubbleSize} fill="url(#hydroBubbleGrad)" opacity={0.3 + (bubbleY - tankTop) / tankHeight * 0.5} />
            );
          })}

          {/* Pressure readout panel */}
          <rect x={width - 130} y="30" width="115" height="140" fill={colors.bgElevated} rx="12" stroke={colors.bgHover} strokeWidth="1" />
          <text x={width - 72} y="50" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="600" letterSpacing="0.5">PRESSURE</text>

          <text x={width - 72} y="76" textAnchor="middle" fill={colors.success} fontSize="20" fontWeight="bold">{(hydrostaticPressure / 1000).toFixed(1)}</text>
          <text x={width - 72} y="94" textAnchor="middle" fill={colors.textMuted} fontSize="11">kPa (hydrostatic)</text>

          <line x1={width - 120} y1="105" x2={width - 25} y2="105" stroke={colors.bgHover} strokeWidth="1" />

          <text x={width - 72} y="126" textAnchor="middle" fill={colors.secondary} fontSize="20" fontWeight="bold">{pressureInAtm.toFixed(2)}</text>
          <text x={width - 72} y="144" textAnchor="middle" fill={colors.textMuted} fontSize="11">atm (total)</text>
        </svg>

        {/* Formula display */}
        <div style={{
          padding: '12px 20px',
          background: `linear-gradient(135deg, ${colors.bgElevated} 0%, ${colors.bgSurface} 100%)`,
          borderRadius: '12px',
          border: `1px solid ${colors.bgHover}`,
          textAlign: 'center'
        }}>
          <span style={{ fontSize: typo.body, color: colors.warning, fontWeight: 700, fontFamily: 'monospace' }}>
            P = rgh = {fluidDensity} x 9.81 x {depth} = {(hydrostaticPressure / 1000).toFixed(1)} kPa
          </span>
        </div>
      </div>
    );
  };

  // ============================================================================
  // VISUALIZATION: CONTAINER COMPARISON (Hydrostatic Paradox)
  // ============================================================================
  const renderContainerComparison = () => {
    const width = isMobile ? 300 : 380;
    const height = 220;
    const waterHeight = 130;
    const baseY = 180;

    const containers = [
      { x: width * 0.17, halfWidth: 40, label: 'Wide', volume: '1000 L' },
      { x: width * 0.5, halfWidth: 18, label: 'Medium', volume: '100 L' },
      { x: width * 0.83, halfWidth: 5, label: 'Narrow', volume: '1 L' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="containerWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="sensorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={width} height={height} fill={colors.bgSurface} rx="12" />

          {containers.map((c, i) => (
            <g key={i}>
              {/* Water fill */}
              <rect x={c.x - c.halfWidth} y={baseY - waterHeight} width={c.halfWidth * 2} height={waterHeight} fill="url(#containerWaterGrad)" rx="3" />
              {/* Container outline */}
              <rect x={c.x - c.halfWidth} y={baseY - waterHeight} width={c.halfWidth * 2} height={waterHeight} fill="none" stroke={colors.textMuted} strokeWidth="2" rx="3" strokeOpacity="0.6" />
              {/* Surface shimmer */}
              <line x1={c.x - c.halfWidth + 2} y1={baseY - waterHeight + 3} x2={c.x + c.halfWidth - 2} y2={baseY - waterHeight + 3} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
              {/* Pressure sensor glow when selected */}
              {selectedContainer === i && (
                <>
                  <circle cx={c.x} cy={baseY - 10} r="10" fill="url(#sensorGlow)" />
                  <circle cx={c.x} cy={baseY - 10} r="5" fill="#f59e0b" />
                </>
              )}
            </g>
          ))}

          {/* Title text at top */}
          <text x={width / 2} y="18" textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600">Hydrostatic Paradox: Shape vs Pressure</text>

          {/* Height indicator */}
          <line x1={width - 25} y1={baseY - waterHeight + 5} x2={width - 25} y2={baseY - 5} stroke={colors.warning} strokeWidth="2" markerStart="url(#hydroArrowMarker)" />
          <text x={width - 15} y={baseY - waterHeight/2 + 3} fill={colors.warning} fontSize="11" fontWeight="bold" writingMode="vertical-rl">SAME h</text>

          {/* Bottom label */}
          <text x={width / 2} y={baseY + 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">All containers: same height, same pressure at the bottom</text>
        </svg>

        {/* Container labels */}
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', padding: '0 16px' }}>
          {containers.map((c, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: typo.label, color: colors.textMuted }}>{c.volume}</div>
            </div>
          ))}
        </div>

        {/* Equal pressure result */}
        <div style={{
          padding: '10px 16px',
          background: colors.successBg,
          border: `1px solid ${colors.success}40`,
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: typo.body, color: colors.success, fontWeight: 700 }}>
            All have EQUAL pressure at the bottom!
          </span>
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: HOOK
  // ============================================================================
  const renderHook = () => (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '32px 20px' : '48px 32px',
      textAlign: 'center'
    }}>
      {/* Category pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 16px',
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <div style={{ width: '6px', height: '6px', background: colors.primary, borderRadius: '50%' }} />
        <span style={{ fontSize: typo.label, fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fluid Mechanics</span>
      </div>

      {/* Title with gradient */}
      <h1 style={{
        fontSize: isMobile ? '36px' : '52px',
        fontWeight: 800,
        lineHeight: 1.1,
        marginBottom: '16px',
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Hydrostatic<br />Pressure
      </h1>

      <p style={{
        fontSize: typo.bodyLarge,
        color: colors.textSecondary,
        maxWidth: '420px',
        lineHeight: 1.6,
        marginBottom: '32px'
      }}>
        Why do your ears hurt when you dive deep?<br />
        Why are submarines built to be so incredibly strong?
      </p>

      {/* Visual preview */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: `linear-gradient(135deg, ${colors.bgSurface} 0%, ${colors.bgElevated} 100%)`,
        borderRadius: '24px',
        padding: '24px',
        border: `1px solid ${colors.bgHover}`,
        marginBottom: '32px'
      }}>
        <svg width={isMobile ? 260 : 320} height={140} viewBox={`0 0 ${isMobile ? 260 : 320} 140`} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="hookWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="hookPressureGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          <rect width={isMobile ? 260 : 320} height="140" fill={colors.bgDeep} rx="12" />

          {/* Pool cross-section */}
          <rect x="30" y="15" width={isMobile ? 180 : 230} height="110" fill="url(#hookWaterGrad)" rx="6" />
          <rect x="30" y="15" width={isMobile ? 180 : 230} height="110" fill="none" stroke={colors.textMuted} strokeWidth="2" rx="6" strokeOpacity="0.4" />

          {/* Surface diver */}
          <circle cx="60" cy="32" r="12" fill="#fbbf24" />
          <text x="60" y="36" textAnchor="middle" fill={colors.bgDeep} fontSize="8" fontWeight="bold">1atm</text>

          {/* Deep diver */}
          <circle cx={isMobile ? 170 : 210} cy="105" r="12" fill="#f59e0b" />
          <text x={isMobile ? 170 : 210} y="109" textAnchor="middle" fill={colors.bgDeep} fontSize="8" fontWeight="bold">2atm</text>

          {/* Pressure indicator bar */}
          <rect x={isMobile ? 220 : 275} y="18" width="8" height="104" fill="url(#hookPressureGrad)" rx="4" />

          {/* Depth labels */}
          <text x="26" y="22" textAnchor="end" fill={colors.textMuted} fontSize="8">0m</text>
          <text x="26" y="122" textAnchor="end" fill={colors.textMuted} fontSize="8">10m</text>
        </svg>

        <p style={{ color: colors.primary, fontSize: typo.bodyLarge, fontWeight: 600, marginTop: '16px', textAlign: 'center' }}>
          At just 10 meters, pressure DOUBLES!
        </p>
      </div>

      {/* Quote */}
      <div style={{
        maxWidth: '380px',
        padding: '16px 20px',
        background: colors.bgSurface,
        borderRadius: '12px',
        borderLeft: `3px solid ${colors.primary}`,
        marginBottom: '32px',
        textAlign: 'left'
      }}>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
          "Every 10 meters of water adds about 1 atmosphere of pressure - the same pressure as our entire atmosphere."
        </p>
        <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
          - Diving Physics Fundamentals
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{
          padding: '18px 48px',
          fontSize: typo.bodyLarge,
          fontWeight: 600,
          color: '#fff',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          boxShadow: `0 8px 32px ${colors.primary}50`,
          transition: 'transform 0.2s, box-shadow 0.2s',
          minHeight: '44px'
        }}
      >
        Discover Why
      </button>

      {/* Features */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '28px' }}>
        {[{ icon: '5', text: 'min' }, { icon: '🧪', text: 'Lab' }, { icon: '📝', text: 'Quiz' }].map((f, i) => (
          <span key={i} style={{ fontSize: typo.small, color: colors.textMuted }}>
            {f.icon} {f.text}
          </span>
        ))}
      </div>
    </div>
  );

  // ============================================================================
  // PHASE: PREDICT
  // ============================================================================
  const renderPredict = () => {
    const options = [
      { id: 'cold', label: 'Water gets colder and denser at depth', desc: 'Temperature changes cause pressure', icon: '❄️' },
      { id: 'weight', label: 'The weight of water above pushes down', desc: 'More water = more weight = more pressure', icon: '⬇️' },
      { id: 'gravity', label: 'Gravity is stronger deeper underwater', desc: 'Gravity increases at depth', icon: '🌍' }
    ];

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '560px', margin: '0 auto' }}>
        <p style={{ fontSize: typo.label, fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Step 2 - Make Your Prediction
        </p>
        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '8px', lineHeight: 1.2 }}>
          Why Does Pressure Increase With Depth?
        </h2>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '16px', lineHeight: 1.5 }}>
          What causes the crushing pressure that divers experience deep underwater?
        </p>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '28px', lineHeight: 1.5 }}>
          Think about what happens as you dive deeper into a swimming pool or the ocean. Consider the force that acts on everything - how much will the pressure change at different depths?
        </p>

        {/* Static SVG preview for predict phase */}
        <div style={{
          background: colors.bgSurface,
          borderRadius: '20px',
          padding: typo.cardPadding,
          border: `1px solid ${colors.bgHover}`,
          marginBottom: '24px'
        }}>
          <svg width={isMobile ? 300 : 380} height={260} viewBox={`0 0 ${isMobile ? 300 : 380} 260`} style={{ display: 'block', margin: '0 auto' }}>
            <defs>
              <linearGradient id="predictWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#075985" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="predictPressureBar" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <rect width={isMobile ? 300 : 380} height="260" fill={colors.bgDeep} rx="12" />
            {/* Pool cross-section */}
            <rect x="40" y="20" width="200" height="200" fill="url(#predictWaterGrad)" rx="6" />
            <rect x="40" y="20" width="200" height="200" fill="none" stroke={colors.textMuted} strokeWidth="2" rx="6" strokeOpacity="0.4" />
            {/* Depth labels */}
            <text x="32" y="30" textAnchor="end" fill={colors.textMuted} fontSize="11">0m</text>
            <text x="32" y="120" textAnchor="end" fill={colors.textMuted} fontSize="11">25m</text>
            <text x="32" y="218" textAnchor="end" fill={colors.textMuted} fontSize="11">50m</text>
            {/* Diver at surface */}
            <circle cx="100" cy="40" r="12" fill="#fbbf24" />
            <text x="100" y="44" textAnchor="middle" fill={colors.bgDeep} fontSize="11" fontWeight="bold">1 atm</text>
            {/* Diver at mid depth */}
            <circle cx="160" cy="120" r="12" fill="#f59e0b" />
            <text x="160" y="124" textAnchor="middle" fill={colors.bgDeep} fontSize="11" fontWeight="bold">3 atm</text>
            {/* Diver at deep */}
            <circle cx="200" cy="200" r="12" fill="#ea580c" />
            <text x="200" y="204" textAnchor="middle" fill={colors.bgDeep} fontSize="11" fontWeight="bold">6 atm</text>
            {/* Pressure bar */}
            <rect x={(isMobile ? 260 : 300)} y="20" width="12" height="200" fill="url(#predictPressureBar)" rx="6" />
            <text x={(isMobile ? 266 : 306)} y="14" textAnchor="middle" fill={colors.textMuted} fontSize="11">Low</text>
            <text x={(isMobile ? 266 : 306)} y="238" textAnchor="middle" fill={colors.textMuted} fontSize="11">High</text>
            {/* Title */}
            <text x="140" y="250" textAnchor="middle" fill={colors.primary} fontSize="13" fontWeight="bold">What happens to pressure as depth increases?</text>
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              aria-pressed={prediction === opt.id}
              onClick={() => {
                if (prediction !== opt.id) {
                  playSound('click');
                  setPrediction(opt.id);
                  emitEvent('prediction_made', { prediction: opt.id });
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '18px 20px',
                textAlign: 'left',
                background: prediction === opt.id ? colors.successBg : colors.bgSurface,
                border: `2px solid ${prediction === opt.id ? colors.success : 'transparent'}`,
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '44px'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: colors.textPrimary, fontWeight: 600, fontSize: typo.body, margin: 0 }}>{opt.label}</p>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: '4px 0 0' }}>{opt.desc}</p>
              </div>
              {prediction === opt.id && <span style={{ color: colors.success, fontSize: '22px' }}>✓</span>}
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={() => goToPhase('play')}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: typo.bodyLarge,
              fontWeight: 600,
              color: '#fff',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              boxShadow: `0 6px 24px ${colors.primary}40`,
              minHeight: '44px'
            }}
          >
            Explore the Depths
          </button>
        )}
      </div>
    );
  };

  // ============================================================================
  // PHASE: PLAY (Interactive Simulation)
  // ============================================================================
  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '16px 20px' : '20px 32px',
        borderBottom: `1px solid ${colors.bgHover}`,
        background: colors.bgSurface,
        flexShrink: 0
      }}>
        <p style={{ fontSize: typo.label, fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Step 3 - Interactive Lab
        </p>
        <h1 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px' }}>
          Pressure vs Depth Simulator
        </h1>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0 }}>
          Adjust the depth slider and watch pressure change in real-time. When you increase depth, pressure increases linearly because more water weight pushes down.
        </p>
        <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: '8px 0 0' }}>
          Real-world relevance: This is exactly how dive computers calculate decompression schedules for scuba divers, helping them avoid the bends by tracking pressure at depth.
        </p>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: typo.pagePadding, background: colors.bgDeep }}>
          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            {/* Left column - SVG visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgSurface,
                borderRadius: '20px',
                padding: typo.cardPadding,
                border: `1px solid ${colors.bgHover}`
              }}>
                {renderPressureTank()}
              </div>
            </div>

            {/* Right column - Controls */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgSurface,
                borderRadius: '20px',
                padding: '20px',
                border: `1px solid ${colors.bgHover}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {/* Depth slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: typo.body, fontWeight: 600, color: colors.textSecondary }}>Depth</span>
                    <span style={{ fontSize: typo.body, fontWeight: 700, color: colors.primary }}>{depth} meters</span>
                  </div>
                  <input
                    type="range"
                    role="slider"
                    aria-label="Depth control"
                    aria-valuemin={0}
                    aria-valuemax={50}
                    aria-valuenow={depth}
                    min="0"
                    max="50"
                    value={depth}
                    onChange={(e) => {
                      setDepth(Number(e.target.value));
                      playSound('bubble');
                    }}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      background: colors.bgElevated,
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      accentColor: '#3b82f6',
                      touchAction: 'pan-y' as const
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: typo.label, color: colors.textMuted }}>0m</span>
                    <span style={{ fontSize: typo.label, color: colors.textMuted }}>50m</span>
                  </div>
                </div>

                {/* Fluid type selector */}
                <div>
                  <span style={{ fontSize: typo.body, fontWeight: 600, color: colors.textSecondary, display: 'block', marginBottom: '10px' }}>
                    Fluid Type
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { value: 1000, label: 'Fresh Water' },
                      { value: 1025, label: 'Salt Water' },
                      { value: 13600, label: 'Mercury' }
                    ].map(fluid => (
                      <button
                        key={fluid.value}
                        onClick={() => {
                          setFluidDensity(fluid.value);
                          playSound('click');
                        }}
                        style={{
                          padding: '10px 16px',
                          fontSize: typo.small,
                          fontWeight: 600,
                          background: fluidDensity === fluid.value ? colors.primary : colors.bgElevated,
                          color: fluidDensity === fluid.value ? '#fff' : colors.textSecondary,
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {fluid.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle pressure arrows */}
                <button
                  onClick={() => setShowPressureArrows(!showPressureArrows)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: typo.body,
                    fontWeight: 600,
                    background: showPressureArrows ? colors.success : colors.bgElevated,
                    color: showPressureArrows ? '#fff' : colors.textSecondary,
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {showPressureArrows ? '● Arrows ON' : '○ Arrows OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <div style={{
              background: colors.successBg,
              border: `1px solid ${colors.success}40`,
              borderRadius: '14px',
              padding: '18px'
            }}>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: colors.success }}>Key Insight:</strong> Pressure acts <strong>equally in all directions</strong> at any given depth. Notice how the arrows point inward from all sides - up, down, left, right!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        padding: isMobile ? '16px 20px' : '20px 32px',
        borderTop: `1px solid ${colors.bgHover}`,
        background: colors.bgSurface,
        flexShrink: 0
      }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <button
            onClick={() => goToPhase('review')}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: typo.bodyLarge,
              fontWeight: 600,
              color: '#fff',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Learn the Equation
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // PHASE: REVIEW
  // ============================================================================
  const renderReview = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ fontSize: typo.label, fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
        Step 4 - The Science
      </p>
      <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, marginBottom: '24px' }}>
        The Hydrostatic Pressure Equation
      </h2>

      {/* Main equation card */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 100%)`,
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '28px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '42px', fontWeight: 800, color: colors.primary, fontFamily: 'monospace', margin: '0 0 12px' }}>
          P = rgh
        </p>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0 }}>
          Hydrostatic Pressure Equation
        </p>
      </div>

      {/* Variable explanations */}
      <div style={{ display: 'grid', gap: '14px', marginBottom: '28px' }}>
        {[
          { symbol: 'P', name: 'Pressure', unit: 'Pascals (Pa)', desc: 'Force per unit area', color: colors.primary },
          { symbol: 'r', name: 'Fluid Density', unit: 'kg/m3', desc: 'Mass per unit volume', color: colors.warning },
          { symbol: 'g', name: 'Gravity', unit: '9.81 m/s2', desc: 'Gravitational acceleration', color: colors.success },
          { symbol: 'h', name: 'Depth', unit: 'meters (m)', desc: 'Vertical distance below surface', color: colors.accent }
        ].map(v => (
          <div key={v.symbol} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            background: colors.bgSurface,
            borderRadius: '14px',
            padding: '16px 20px'
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: v.color,
              width: '40px',
              textAlign: 'center'
            }}>{v.symbol}</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: colors.textPrimary, fontWeight: 600, fontSize: typo.body, margin: 0 }}>{v.name}</p>
              <p style={{ color: colors.textMuted, fontSize: typo.small, margin: '2px 0 0' }}>{v.unit} - {v.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total pressure note */}
      <div style={{
        background: colors.warningBg,
        border: `1px solid ${colors.warning}40`,
        borderRadius: '14px',
        padding: '18px',
        marginBottom: '28px'
      }}>
        <p style={{ color: colors.warning, fontWeight: 700, margin: '0 0 8px', fontSize: typo.body }}>
          Total Pressure Includes Atmospheric!
        </p>
        <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0 }}>
          <strong style={{ fontFamily: 'monospace' }}>P_total = P_atm + rgh</strong><br />
          At the surface, you already have 1 atm (101,325 Pa) pressing on you from the air above!
        </p>
      </div>

      {/* Quick reference table */}
      <div style={{ background: colors.bgSurface, borderRadius: '14px', padding: '18px', marginBottom: '28px' }}>
        <p style={{ color: colors.textSecondary, fontWeight: 600, margin: '0 0 14px', fontSize: typo.body }}>
          Quick Reference (Fresh Water)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { depth: '0m', atm: '1 atm' },
            { depth: '10m', atm: '2 atm' },
            { depth: '30m', atm: '4 atm' },
            { depth: '100m', atm: '11 atm' }
          ].map(r => (
            <div key={r.depth} style={{
              textAlign: 'center',
              padding: '12px 8px',
              background: colors.bgElevated,
              borderRadius: '10px'
            }}>
              <p style={{ color: colors.primary, fontWeight: 700, fontSize: typo.body, margin: 0 }}>{r.depth}</p>
              <p style={{ color: colors.textMuted, fontSize: typo.label, margin: '4px 0 0' }}>{r.atm}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction feedback */}
      <p style={{ textAlign: 'center', fontSize: typo.body, color: colors.textMuted, marginBottom: '24px' }}>
        Your prediction: {prediction === 'weight' ? (
          <span style={{ color: colors.success }}>Correct! The weight of water above creates pressure.</span>
        ) : (
          <span style={{ color: colors.warning }}>Now you understand - it is the weight of water above!</span>
        )}
      </p>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{
          width: '100%',
          padding: '18px',
          fontSize: typo.bodyLarge,
          fontWeight: 600,
          color: '#fff',
          background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`,
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          minHeight: '44px'
        }}
      >
        A Surprising Paradox
      </button>
    </div>
  );

  // ============================================================================
  // PHASE: TWIST_PREDICT
  // ============================================================================
  const renderTwistPredict = () => {
    const options = [
      { id: 'wide', label: 'Wide container (most water volume)', desc: 'More volume = more weight = more pressure?' },
      { id: 'narrow', label: 'Narrow container (concentrated column)', desc: 'Focused column pushes harder?' },
      { id: 'equal', label: 'All containers have equal pressure', desc: 'Only depth matters, not shape?' }
    ];

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '560px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: colors.warningBg,
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '16px' }}>🌀</span>
          <span style={{ fontSize: typo.label, color: colors.warning, fontWeight: 600 }}>TWIST: The Paradox!</span>
        </div>

        <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.warning, marginBottom: '8px' }}>
          Different Shapes, Same Height
        </h2>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
          Three containers with vastly different volumes, but filled to exactly the same height. Which has more pressure at the bottom?
        </p>

        {/* Visual */}
        <div style={{
          background: colors.bgSurface,
          borderRadius: '20px',
          padding: typo.cardPadding,
          marginBottom: '28px'
        }}>
          {renderContainerComparison()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              role="option"
              aria-selected={twistPrediction === opt.id}
              onClick={() => {
                if (twistPrediction !== opt.id) {
                  playSound('click');
                  setTwistPrediction(opt.id);
                  emitEvent('prediction_made', { twistPrediction: opt.id });
                }
              }}
              style={{
                padding: '18px 20px',
                textAlign: 'left',
                background: twistPrediction === opt.id ? colors.warningBg : colors.bgSurface,
                border: `2px solid ${twistPrediction === opt.id ? colors.warning : 'transparent'}`,
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '44px'
              }}
            >
              <p style={{ color: colors.textPrimary, fontWeight: 600, fontSize: typo.body, margin: 0 }}>{opt.label}</p>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: '4px 0 0' }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => goToPhase('twist_play')}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: typo.bodyLarge,
              fontWeight: 600,
              color: '#fff',
              background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`,
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Test Your Prediction
          </button>
        )}
      </div>
    );
  };

  // ============================================================================
  // PHASE: TWIST_PLAY
  // ============================================================================
  const renderTwistPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '16px 20px' : '20px 32px',
        borderBottom: `1px solid ${colors.bgHover}`,
        background: colors.bgSurface,
        flexShrink: 0
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          background: colors.warningBg,
          borderRadius: '6px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px' }}>🌀</span>
          <span style={{ fontSize: typo.label, color: colors.warning, fontWeight: 600 }}>TWIST EXPERIMENT</span>
        </div>
        <h1 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, margin: '0 0 4px' }}>
          Container Comparison Lab
        </h1>
        <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0 }}>
          Click each container to measure pressure at the bottom
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: typo.pagePadding, background: colors.bgDeep }}>
          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            {/* Left column - SVG visualization */}
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgSurface,
                borderRadius: '20px',
                padding: typo.cardPadding,
                border: `1px solid ${colors.bgHover}`
              }}>
                {renderContainerComparison()}
              </div>
            </div>

            {/* Right column - Controls */}
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgSurface,
                borderRadius: '20px',
                padding: '20px',
                border: `1px solid ${colors.bgHover}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <p style={{ fontSize: typo.body, fontWeight: 600, color: colors.textSecondary, margin: 0 }}>
                  Select a container to measure:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['Wide (1000L)', 'Medium (100L)', 'Narrow (1L)'].map((label, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedContainer(i);
                        setMeasurementCount(c => c + 1);
                        playSound('success');
                        emitEvent('selection_made', { container: label, measurement: measurementCount + 1 });
                      }}
                      style={{
                        padding: '12px 16px',
                        fontSize: typo.body,
                        fontWeight: 600,
                        background: selectedContainer === i ? colors.primary : colors.bgElevated,
                        color: selectedContainer === i ? '#fff' : colors.textSecondary,
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {selectedContainer !== null && (
                  <div style={{
                    padding: '14px',
                    background: colors.successBg,
                    border: `1px solid ${colors.success}40`,
                    borderRadius: '14px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: colors.success, fontWeight: 700, fontSize: typo.subheading, margin: '0 0 8px' }}>
                      Pressure: {(1000 * 9.81 * 0.8 / 1000).toFixed(1)} kPa
                    </p>
                    <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0 }}>
                      Identical to the other containers!
                    </p>
                  </div>
                )}

                <p style={{ textAlign: 'center', fontSize: typo.small, color: colors.textMuted, margin: 0 }}>
                  Measurements taken: {measurementCount} (try all 3!)
                </p>
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div style={{ maxWidth: '800px', margin: '16px auto 0' }}>
            <div style={{
              background: colors.warningBg,
              border: `1px solid ${colors.warning}40`,
              borderRadius: '14px',
              padding: '18px'
            }}>
              <p style={{ color: colors.warning, fontWeight: 700, margin: '0 0 8px', fontSize: typo.body }}>
                The Hydrostatic Paradox!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0, lineHeight: 1.6 }}>
                Despite huge differences in volume (1000:1 ratio!), all containers have <strong>identical pressure</strong> at the bottom because they share the same <strong>height</strong>!
              </p>
            </div>
          </div>
        </div>
      </div>

      {measurementCount >= 3 && (
        <div style={{
          padding: isMobile ? '16px 20px' : '20px 32px',
          borderTop: `1px solid ${colors.bgHover}`,
          background: colors.bgSurface,
          flexShrink: 0
        }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <button
              onClick={() => goToPhase('twist_review')}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: typo.bodyLarge,
                fontWeight: 600,
                color: '#fff',
                background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`,
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Understand the Paradox
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // PHASE: TWIST_REVIEW
  // ============================================================================
  const renderTwistReview = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ fontSize: typo.label, fontWeight: 600, color: colors.warning, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
        Step 7 - Deep Understanding
      </p>
      <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.warning, marginBottom: '24px' }}>
        Why Shape Does Not Matter
      </h2>

      {/* Key insight */}
      <div style={{
        background: colors.warningBg,
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '28px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '36px', fontWeight: 800, color: colors.warning, fontFamily: 'monospace', margin: '0 0 14px' }}>
          P = rgh
        </p>
        <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, margin: 0, lineHeight: 1.6 }}>
          Notice: <strong>Volume does not appear!</strong><br />
          Pressure depends ONLY on density, gravity, and <strong>height</strong>.
        </p>
      </div>

      {/* Pascal's barrel experiment */}
      <div style={{
        background: colors.bgSurface,
        borderRadius: '18px',
        padding: '22px',
        marginBottom: '28px'
      }}>
        <h3 style={{ color: colors.accent, fontWeight: 700, fontSize: typo.subheading, margin: '0 0 14px' }}>
          Pascal's Famous Barrel (1646)
        </h3>
        <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0, lineHeight: 1.6 }}>
          Blaise Pascal attached a thin 10-meter vertical tube to a sealed wooden barrel filled with water. By adding just a few cups of water to the tube, he created enough pressure to <strong style={{ color: colors.error }}>burst the barrel dramatically!</strong>
        </p>
        <p style={{ color: colors.textMuted, fontSize: typo.small, margin: '14px 0 0' }}>
          The tiny volume of water in the tube created ~1 atm of extra pressure because of the height alone.
        </p>
      </div>

      {/* What matters vs doesn't */}
      <div style={{ display: 'grid', gap: '14px', marginBottom: '28px' }}>
        <div style={{
          background: colors.successBg,
          border: `1px solid ${colors.success}40`,
          borderRadius: '14px',
          padding: '18px'
        }}>
          <p style={{ color: colors.success, fontWeight: 700, margin: '0 0 6px', fontSize: typo.body }}>What DOES Matter</p>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0 }}>
            The vertical height of the fluid column above the measurement point
          </p>
        </div>
        <div style={{
          background: colors.errorBg,
          border: `1px solid ${colors.error}40`,
          borderRadius: '14px',
          padding: '18px'
        }}>
          <p style={{ color: colors.error, fontWeight: 700, margin: '0 0 6px', fontSize: typo.body }}>What Does NOT Matter</p>
          <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0 }}>
            Container shape, total volume, cross-sectional area, or container width
          </p>
        </div>
      </div>

      {/* Prediction feedback */}
      <p style={{ textAlign: 'center', fontSize: typo.body, color: colors.textMuted, marginBottom: '24px' }}>
        Your prediction: {twistPrediction === 'equal' ? (
          <span style={{ color: colors.success }}>Excellent! You got it right!</span>
        ) : (
          <span style={{ color: colors.warning }}>Mind-blowing, right? Most people get this wrong!</span>
        )}
      </p>

      <button
        onClick={() => goToPhase('transfer')}
        style={{
          width: '100%',
          padding: '18px',
          fontSize: typo.bodyLarge,
          fontWeight: 600,
          color: '#fff',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          minHeight: '44px'
        }}
      >
        See Real-World Applications
      </button>
    </div>
  );

  // ============================================================================
  // PHASE: TRANSFER (Real-World Applications)
  // ============================================================================
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    const allCompleted = completedApps.every(Boolean);
    const isLastApp = activeApp === realWorldApps.length - 1;

    const handleContinueApp = () => {
      const newCompleted = [...completedApps];
      newCompleted[activeApp] = true;
      setCompletedApps(newCompleted);
      playSound('success');
      emitEvent('button_clicked', { action: 'app_completed', appIndex: activeApp, appTitle: app.title });

      if (!isLastApp) {
        setActiveApp(activeApp + 1);
      }
    };

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '620px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <p style={{ fontSize: typo.label, fontWeight: 600, color: colors.primary, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Step 8 - Real World
            </p>
            <h2 style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              Applications
            </h2>
          </div>
          <span style={{
            fontSize: typo.small,
            color: colors.textMuted,
            background: colors.bgElevated,
            padding: '8px 14px',
            borderRadius: '24px'
          }}>
            {completedApps.filter(Boolean).length}/4 done
          </span>
        </div>

        {/* App tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '6px' }}>
          {realWorldApps.map((a, i) => {
            const isCompleted = completedApps[i];
            const isCurrent = activeApp === i;
            const isLocked = i > 0 && !completedApps[i - 1] && !completedApps[i];

            return (
              <button
                key={i}
                onClick={() => { if (!isLocked) { setActiveApp(i); playSound('click'); } }}
                disabled={isLocked}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 18px',
                  fontSize: typo.small,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: isCurrent ? colors.primary : isCompleted ? colors.successBg : colors.bgSurface,
                  color: isCurrent ? '#fff' : isCompleted ? colors.success : isLocked ? colors.textMuted : colors.textSecondary,
                  border: `1px solid ${isCurrent ? colors.primary : isCompleted ? colors.success + '40' : colors.bgHover}`,
                  borderRadius: '12px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isCompleted ? '✓' : isLocked ? '🔒' : a.icon}
              </button>
            );
          })}
        </div>

        {/* App content */}
        <div style={{
          background: colors.bgSurface,
          borderRadius: '24px',
          padding: '28px',
          border: `1px solid ${colors.bgHover}`
        }}>
          {/* App header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: `${app.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px'
            }}>
              {app.icon}
            </div>
            <div>
              <h3 style={{ fontSize: typo.subheading, fontWeight: 700, color: app.color, margin: 0 }}>{app.title}</h3>
              <p style={{ fontSize: typo.small, color: colors.textMuted, margin: '2px 0 0' }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7, marginBottom: '16px' }}>
            {app.description}
          </p>

          {/* How it works detail */}
          <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6, marginBottom: '24px' }}>
            <strong style={{ color: colors.textPrimary }}>How it works:</strong> {app.howItWorks}
          </p>

          {/* Physics connection */}
          <div style={{
            background: `${app.color}15`,
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ color: app.color, fontSize: typo.body, margin: 0 }}>
              <strong>Physics Connection:</strong> {app.connection}
            </p>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {app.stats.map((s, i) => (
              <div key={i} style={{
                background: colors.bgDeep,
                borderRadius: '12px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>{s.icon}</span>
                <p style={{ color: colors.textPrimary, fontWeight: 700, fontSize: typo.body, margin: '0 0 2px' }}>{s.value}</p>
                <p style={{ color: colors.textMuted, fontSize: typo.label, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Continue button */}
          {!completedApps[activeApp] && (
            <button
              onClick={() => {
                if (isLastApp && completedApps.slice(0, -1).every(Boolean)) {
                  handleContinueApp();
                  goToPhase('test');
                } else {
                  handleContinueApp();
                }
              }}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: typo.bodyLarge,
                fontWeight: 600,
                color: '#fff',
                background: `linear-gradient(135deg, ${app.color} 0%, ${app.color}cc 100%)`,
                border: 'none',
                borderRadius: '14px',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              {isLastApp ? 'Got It - Take Test' : 'Got It'}
            </button>
          )}

          {completedApps[activeApp] && !allCompleted && (
            <p style={{ textAlign: 'center', color: colors.success, fontSize: typo.body, margin: 0 }}>
              ✓ Completed! Select another tab above.
            </p>
          )}
        </div>

        {/* Final test button */}
        {allCompleted && (
          <button
            onClick={() => goToPhase('test')}
            style={{
              width: '100%',
              marginTop: '28px',
              padding: '20px',
              fontSize: typo.bodyLarge,
              fontWeight: 600,
              color: '#fff',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              border: 'none',
              borderRadius: '18px',
              cursor: 'pointer',
              boxShadow: `0 8px 32px ${colors.primary}50`,
              minHeight: '44px'
            }}
          >
            Got It - Take the Knowledge Test
          </button>
        )}
      </div>
    );
  };

  // ============================================================================
  // PHASE: TEST
  // ============================================================================
  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const hasAnswered = testAnswers[currentQuestion] !== null;
    const allAnswered = testAnswers.every(a => a !== null);
    const progress = ((currentQuestion + 1) / 10) * 100;

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '640px', margin: '0 auto' }}>
        {/* Header with progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{
            fontSize: typo.small,
            color: colors.textMuted,
            background: colors.bgElevated,
            padding: '8px 14px',
            borderRadius: '24px'
          }}>
            Question {currentQuestion + 1} of 10
          </span>
          <span className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
            Question {currentQuestion + 1} of 10
          </span>
          <span style={{
            fontSize: typo.small,
            color: colors.success,
            background: colors.successBg,
            padding: '8px 14px',
            borderRadius: '24px',
            fontWeight: 600
          }}>
            Score: {testScore}/{testAnswers.filter(a => a !== null).length}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '28px' }}>
          {renderProgressBar(progress, colors.primary)}
        </div>

        {/* Question card */}
        <div style={{
          background: colors.bgSurface,
          borderRadius: '24px',
          padding: '28px',
          border: `1px solid ${colors.bgHover}`
        }}>
          {/* Scenario */}
          <div style={{
            background: colors.bgElevated,
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6 }}>
              {q.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{
            color: colors.textPrimary,
            fontSize: typo.bodyLarge,
            fontWeight: 600,
            marginBottom: '24px',
            lineHeight: 1.5
          }}>
            {q.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {q.options.map((opt) => {
              let bg = colors.bgElevated;
              let borderColor = 'transparent';

              if (hasAnswered) {
                if (opt.correct) {
                  bg = colors.successBg;
                  borderColor = colors.success;
                } else if (opt.id === testAnswers[currentQuestion]) {
                  bg = colors.errorBg;
                  borderColor = colors.error;
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleTestAnswer(opt.id)}
                  disabled={hasAnswered}
                  style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: typo.body,
                    background: bg,
                    color: colors.textPrimary,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '14px',
                    cursor: hasAnswered ? 'default' : 'pointer',
                    opacity: hasAnswered && !opt.correct && opt.id !== testAnswers[currentQuestion] ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: 600, marginRight: '12px', color: colors.textMuted }}>
                    {opt.id.toUpperCase()}.
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div style={{
              marginTop: '24px',
              padding: '18px',
              background: colors.successBg,
              border: `1px solid ${colors.success}40`,
              borderRadius: '14px'
            }}>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: colors.success }}>Explanation:</strong> {q.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
          <button
            onClick={() => {
              if (currentQuestion > 0) {
                setCurrentQuestion(currentQuestion - 1);
                setShowExplanation(testAnswers[currentQuestion - 1] !== null);
              }
            }}
            disabled={currentQuestion === 0}
            style={{
              padding: '14px 28px',
              fontSize: typo.body,
              fontWeight: 600,
              background: colors.bgElevated,
              color: currentQuestion === 0 ? colors.textMuted : colors.textSecondary,
              border: 'none',
              borderRadius: '12px',
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
              opacity: currentQuestion === 0 ? 0.5 : 1,
              minHeight: '44px'
            }}
          >
            Back
          </button>

          {currentQuestion < 9 ? (
            <button
              onClick={() => {
                setCurrentQuestion(currentQuestion + 1);
                setShowExplanation(testAnswers[currentQuestion + 1] !== null);
              }}
              style={{
                padding: '14px 28px',
                fontSize: typo.body,
                fontWeight: 600,
                background: colors.bgElevated,
                color: colors.textSecondary,
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Next
            </button>
          ) : allAnswered ? (
            <button
              onClick={() => {
                emitEvent('game_completed', { score: testScore, total: 10, passed: testScore >= 7 });
                playSound('complete');
                goToPhase('mastery');
              }}
              style={{
                padding: '14px 28px',
                fontSize: typo.body,
                fontWeight: 600,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Complete
            </button>
          ) : (
            <span style={{ fontSize: typo.small, color: colors.textSecondary, alignSelf: 'center' }}>
              Answer all to continue
            </span>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE: MASTERY
  // ============================================================================
  const renderMastery = () => {
    const percentage = Math.round((testScore / 10) * 100);
    const passed = testScore >= 7;

    const masteredConcepts = [
      { icon: '📐', title: 'P = rgh equation' },
      { icon: '⬇️', title: 'Pressure increases linearly with depth' },
      { icon: '🌀', title: 'Hydrostatic Paradox (shape independence)' },
      { icon: '↔️', title: 'Pressure acts equally in all directions' },
      { icon: '🔄', title: 'Pascal\'s Principle applications' }
    ];

    return (
      <div style={{
        padding: isMobile ? '32px 20px' : '48px 32px',
        maxWidth: '520px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        {/* Trophy/Icon */}
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>
          {passed ? '🌊' : '📚'}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: isMobile ? '32px' : '40px',
          fontWeight: 800,
          color: colors.textPrimary,
          marginBottom: '8px'
        }}>
          {passed ? 'Pressure Master!' : 'Keep Diving Deeper!'}
        </h1>

        {/* Score result */}
        <div style={{
          fontSize: '56px',
          fontWeight: 800,
          color: passed ? colors.success : colors.warning,
          marginBottom: '8px'
        }}>
          {percentage}%
        </div>
        <p style={{ color: colors.textSecondary, marginBottom: '12px', fontSize: typo.bodyLarge }}>
          {testScore}/10 correct answers
        </p>
        <p style={{ color: colors.textMuted, marginBottom: '36px', fontSize: typo.body }}>
          {passed ? 'Great achievement! You have mastered hydrostatic pressure concepts.' : 'Your score result shows areas to review. Keep learning and try again!'}
        </p>

        {/* Concepts mastered */}
        <div style={{
          background: colors.bgSurface,
          borderRadius: '24px',
          padding: '28px',
          marginBottom: '36px',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: typo.bodyLarge,
            fontWeight: 700,
            color: colors.primary,
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {passed ? 'Concepts Mastered' : 'Key Concepts to Review'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {masteredConcepts.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '24px' }}>{c.icon}</span>
                <span style={{ color: colors.textSecondary, fontSize: typo.body }}>
                  {passed && <span style={{ color: colors.success, marginRight: '8px' }}>✓</span>}
                  {c.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {passed ? (
            <>
              <button
                onClick={handleReturnToDashboard}
                style={{
                  padding: '18px',
                  fontSize: typo.bodyLarge,
                  fontWeight: 600,
                  color: '#fff',
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '16px',
                  fontSize: typo.body,
                  fontWeight: 600,
                  color: colors.textSecondary,
                  background: 'transparent',
                  border: `1px solid ${colors.bgHover}`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Play Again
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => goToPhase('test')}
                style={{
                  padding: '18px',
                  fontSize: typo.bodyLarge,
                  fontWeight: 600,
                  color: '#fff',
                  background: `linear-gradient(135deg, ${colors.warning} 0%, #ea580c 100%)`,
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Retake Test
              </button>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '16px',
                  fontSize: typo.body,
                  fontWeight: 600,
                  color: colors.textSecondary,
                  background: 'transparent',
                  border: `1px solid ${colors.bgHover}`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Play Again
              </button>
              <button
                onClick={handleReturnToDashboard}
                style={{
                  padding: '14px',
                  fontSize: typo.small,
                  color: colors.textSecondary,
                  background: 'transparent',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // PHASE ROUTER
  // ============================================================================
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Hydrostatic Pressure"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const currentPhaseIdx = phaseOrder.indexOf(phase);

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Background gradient effects */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 20% 20%, ${colors.primary}08 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, ${colors.secondary}05 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        background: `${colors.bgSurface}f0`,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.bgHover}`,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}>
        <span style={{ fontSize: typo.body, fontWeight: 600, color: colors.textPrimary }}>
          Hydrostatic Pressure
        </span>

        {renderNavDots()}

        <span style={{ fontSize: typo.small, fontWeight: 500, color: colors.primary }}>
          {currentPhaseIdx + 1}/10
        </span>
      </div>

      {/* Content area */}
      <div style={{
        flex: '1 1 0%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingTop: '48px',
        paddingBottom: '100px'
      }}>
        {renderPhase()}
      </div>

      {/* Fixed bottom navigation bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: `${colors.bgSurface}f0`,
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${colors.bgHover}`,
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            const idx = phaseOrder.indexOf(phase);
            if (idx > 0) goToPhase(phaseOrder[idx - 1]);
          }}
          style={{
            padding: '14px 28px',
            fontSize: typo.body,
            fontWeight: 600,
            background: colors.bgElevated,
            color: phaseOrder.indexOf(phase) === 0 ? colors.textMuted : colors.textSecondary,
            border: 'none',
            borderRadius: '12px',
            cursor: phaseOrder.indexOf(phase) === 0 ? 'not-allowed' : 'pointer',
            opacity: phaseOrder.indexOf(phase) === 0 ? 0.4 : 1,
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
          disabled={phaseOrder.indexOf(phase) === 0}
        >
          ← Back
        </button>

        <button
          onClick={() => {
            const idx = phaseOrder.indexOf(phase);
            if (phase === 'test') return;
            if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
          }}
          style={{
            padding: '14px 28px',
            fontSize: typo.body,
            fontWeight: 600,
            background: phase === 'test' ? colors.bgElevated : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            color: phase === 'test' ? colors.textMuted : '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: phase === 'test' ? 'not-allowed' : 'pointer',
            opacity: phase === 'test' ? 0.4 : 1,
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
          disabled={phase === 'test'}
        >
          Next →
        </button>
      </nav>
    </div>
  );
};

export default HydrostaticPressureRenderer;
