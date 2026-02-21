'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// =============================================================================
// KINETIC THEORY OF GASES - COMPLETE 10-PHASE LEARNING GAME
// =============================================================================
// Physics: PV = NkT, v_rms = sqrt(3kT/m), KE_avg = (3/2)kT
// Key insight: Temperature IS molecular motion - gas pressure comes from
// countless molecular collisions with container walls
// =============================================================================

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

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: "A sealed balloon is taken from a comfortable room at sea level where the temperature is 300 K and placed inside a closed car that has been sitting in direct sunlight during summer. The car's interior temperature has risen to 330 K. The balloon visibly expands as the air inside responds to the temperature change.",
    question: "What happens to the average speed of air molecules inside the balloon when the temperature increases from 300 K to 330 K?",
    options: [
      { id: 'a', label: "Increases by about 5%", correct: true },
      { id: 'b', label: "Increases by about 10%" },
      { id: 'c', label: "Stays the same" },
      { id: 'd', label: "Decreases slightly" }
    ],
    explanation: "v_rms is proportional to sqrt(T). When T increases from 300 K to 330 K (10% increase), v_rms increases by sqrt(330/300) = 1.05, or about 5%. Speed scales with the square root of temperature, not linearly."
  },
  {
    scenario: "A physics laboratory has two identical sealed containers maintained at the same temperature of 300 K. One container is filled with helium gas (atomic mass 4 u) and the other with argon gas (atomic mass 40 u). Both containers have identical pressure and volume conditions.",
    question: "How does the RMS speed of helium atoms compare to the RMS speed of argon atoms at this temperature?",
    options: [
      { id: 'a', label: "Helium is sqrt(10) = 3.2x faster", correct: true },
      { id: 'b', label: "Helium is 10x faster" },
      { id: 'c', label: "They have the same speed" },
      { id: 'd', label: "Argon is faster (heavier = more momentum)" }
    ],
    explanation: "v_rms = sqrt(3kT/m). At the same temperature, lighter molecules move faster. v_He/v_Ar = sqrt(m_Ar/m_He) = sqrt(40/4) = sqrt(10) = 3.2. This is why hydrogen and helium escape Earth's atmosphere."
  },
  {
    scenario: "A gas in a piston is compressed to half its original volume while temperature is held constant.",
    question: "What happens to the pressure?",
    options: [
      { id: 'a', label: "Doubles", correct: true },
      { id: 'b', label: "Quadruples" },
      { id: 'c', label: "Stays the same" },
      { id: 'd', label: "Halves" }
    ],
    explanation: "PV = NkT (ideal gas law). At constant T and N, if V goes to V/2, then P goes to 2P. Molecules hit the walls twice as often in half the volume, doubling the pressure."
  },
  {
    scenario: "Scientists measure that oxygen molecules at room temperature have an RMS speed of about 480 m/s.",
    question: "Why don't we feel this 'molecular wind'?",
    options: [
      { id: 'a', label: "Molecules move randomly in all directions, averaging to zero net flow", correct: true },
      { id: 'b', label: "The molecules are too small to detect" },
      { id: 'c', label: "Our nerves aren't sensitive enough" },
      { id: 'd', label: "Air pressure cancels out the motion" }
    ],
    explanation: "While individual molecules zoom at hundreds of m/s, their directions are random. At any point, roughly equal numbers move left vs right, up vs down. The net momentum transfer is zero unless there's bulk flow (wind)."
  },
  {
    scenario: "A tire pressure gauge reads 32 psi when the car has been parked overnight at 20C. After highway driving, the tire temperature rises to 50C.",
    question: "What is the approximate new gauge pressure?",
    options: [
      { id: 'a', label: "About 35 psi", correct: true },
      { id: 'b', label: "About 40 psi" },
      { id: 'c', label: "About 32 psi (pressure doesn't depend on temperature)" },
      { id: 'd', label: "About 48 psi" }
    ],
    explanation: "P/T = constant for fixed volume and amount of gas. Converting to Kelvin: P2 = P1(T2/T1) = 32(323/293) = 35.3 psi. The 10% temperature increase (in Kelvin) causes a 10% pressure increase."
  },
  {
    scenario: "In the Maxwell-Boltzmann distribution, there's a peak (most probable) speed, an average speed, and an RMS speed.",
    question: "What is the correct ordering of these speeds from lowest to highest?",
    options: [
      { id: 'a', label: "Most probable < average < RMS", correct: true },
      { id: 'b', label: "RMS < average < most probable" },
      { id: 'c', label: "Average < most probable < RMS" },
      { id: 'd', label: "They're all equal" }
    ],
    explanation: "The Maxwell-Boltzmann distribution is asymmetric, with a long high-speed tail. This skews the average above the peak, and since RMS weights higher speeds more (due to squaring), RMS > average > most probable."
  },
  {
    scenario: "A container has a mixture of gases in thermal equilibrium: nitrogen (N2), oxygen (O2), and carbon dioxide (CO2).",
    question: "Which statement about their average kinetic energies is true?",
    options: [
      { id: 'a', label: "All molecules have the same average KE", correct: true },
      { id: 'b', label: "CO2 has the highest KE (largest molecule)" },
      { id: 'c', label: "N2 has the highest KE (moves fastest)" },
      { id: 'd', label: "O2 has the highest KE (most reactive)" }
    ],
    explanation: "Average kinetic energy depends ONLY on temperature: KE_avg = (3/2)kT. At thermal equilibrium, all species have the same temperature and therefore the same average KE, regardless of mass. Lighter molecules achieve this KE by moving faster."
  },
  {
    scenario: "At absolute zero (0 K), according to classical kinetic theory, molecules would have zero kinetic energy.",
    question: "Why is absolute zero impossible to reach in practice?",
    options: [
      { id: 'a', label: "Removing the last bit of energy requires infinite work (3rd law)", correct: true },
      { id: 'b', label: "Molecules are always vibrating due to chemical bonds" },
      { id: 'c', label: "The container walls always transfer some heat" },
      { id: 'd', label: "Gravity prevents molecules from stopping completely" }
    ],
    explanation: "The third law of thermodynamics states that absolute zero cannot be reached in a finite number of steps. As T approaches 0, extracting each remaining joule of heat requires exponentially more work. Quantum mechanics also requires zero-point energy."
  },
  {
    scenario: "A scuba diver's tank contains air at 200 atm and 20C. After rapid decompression to 1 atm, the air cools significantly.",
    question: "Why does rapid expansion cause cooling?",
    options: [
      { id: 'a', label: "Gas does work pushing against surrounding air, losing internal energy", correct: true },
      { id: 'b', label: "Lower pressure means lower temperature (direct relationship)" },
      { id: 'c', label: "The molecules slow down due to friction with the tank walls" },
      { id: 'd', label: "Heat is absorbed by the tank material" }
    ],
    explanation: "When gas expands against external pressure, it does work (W = P*deltaV). This work comes from the gas's internal (kinetic) energy. Since temperature is proportional to average KE, losing energy means cooling. This is adiabatic expansion."
  },
  {
    scenario: "Graham's Law states that the rate of gas effusion (leaking through a tiny hole) is inversely proportional to sqrt(molecular mass).",
    question: "This is a direct consequence of which kinetic theory principle?",
    options: [
      { id: 'a', label: "Lighter molecules have higher average speeds at the same temperature", correct: true },
      { id: 'b', label: "Lighter molecules have more kinetic energy" },
      { id: 'c', label: "Smaller molecules fit through holes more easily" },
      { id: 'd', label: "Lighter molecules have fewer collisions" }
    ],
    explanation: "Effusion rate depends on molecular speed (how often molecules hit the hole) and mass (momentum transfer). Since v_rms is proportional to 1/sqrt(m), lighter gases effuse faster. This is used in uranium enrichment to separate U-235 from U-238."
  }
];

// =============================================================================
// REAL WORLD APPLICATIONS - 4 detailed applications with stats
// =============================================================================
const realWorldApps = [
  {
    icon: '🚀',
    title: 'Aerospace Engineering',
    short: 'Rocket propulsion and high-altitude flight',
    tagline: 'Where molecular speeds become rocket speeds',
    description: 'Kinetic theory underlies rocket propulsion, atmospheric reentry heating, and spacecraft thermal control. Understanding molecular behavior at extreme temperatures is essential for space exploration. The Space Shuttle used over 24000 thermal tiles to manage molecular kinetic energy during reentry at 7800 m/s, when air molecules create temperatures exceeding 1650C and thermal flux of 35000 W per square meter.',
    connection: 'Rocket exhaust velocity depends directly on exhaust gas temperature and molecular mass - lighter, hotter gases produce faster exhaust and more thrust per unit mass. Hydrogen at 2 u provides 4500 m/s exhaust velocity versus 3000 m/s for kerosene at 170 u, a direct consequence of v = sqrt(T/M).',
    howItWorks: 'Rocket nozzles convert thermal energy (random molecular motion) into directed kinetic energy. The ideal exhaust velocity is proportional to sqrt(T/M), explaining why hydrogen fuel outperforms heavier propellants. Ion thrusters accelerate xenon ions to 30000 m/s, achieving 10x better fuel efficiency than chemical rockets.',
    stats: [
      { value: '3000 m/s', label: 'Typical exhaust speed', icon: '🔥' },
      { value: '10,000C', label: 'Reentry heating', icon: '☄️' },
      { value: '30,000 m/s', label: 'Ion thruster speed', icon: '⚡' }
    ],
    examples: ['SpaceX Raptor engines', 'Space Shuttle tiles', 'James Webb Telescope', 'NEXT ion thruster'],
    companies: ['SpaceX', 'NASA', 'Blue Origin', 'Rocket Lab'],
    futureImpact: 'Nuclear thermal rockets heating hydrogen to 2500C could halve Mars transit times.',
    color: '#f97316'
  },
  {
    icon: '❄️',
    title: 'HVAC & Refrigeration',
    short: 'Climate control systems',
    tagline: 'Molecular motion management for human comfort',
    description: 'Heating, ventilation, and air conditioning systems rely on kinetic theory to transfer heat efficiently. Understanding gas behavior under compression and expansion is fundamental to climate control.',
    connection: 'The relationship PV = NkT governs every stage of refrigeration cycles - compression heats gas, expansion cools it, enabling heat pumps that move thermal energy against natural flow.',
    howItWorks: 'Compressors increase gas density and temperature through molecular collisions. Expansion valves cause rapid cooling as gas molecules do work expanding against lower pressure.',
    stats: [
      { value: '$240B', label: 'Global HVAC market', icon: '💰' },
      { value: '6%', label: 'US electricity for AC', icon: '⚡' },
      { value: '400%', label: 'Heat pump efficiency', icon: '📈' }
    ],
    examples: ['Geothermal heat pumps', 'CO2 refrigeration', 'Hospital HVAC', 'EV thermal management'],
    companies: ['Carrier', 'Trane', 'Daikin', 'Honeywell'],
    futureImpact: 'Magnetocaloric cooling could replace compression-based systems with more efficient, refrigerant-free technology.',
    color: '#0ea5e9'
  },
  {
    icon: '⚗️',
    title: 'Chemical Engineering',
    short: 'Industrial reactions and separations',
    tagline: 'Controlling trillions of molecular collisions',
    description: 'Chemical reactors depend on kinetic theory to predict reaction rates and design separation processes. Collision frequency and energy distribution determine product yield.',
    connection: 'Reaction rates depend on molecular collision frequency (proportional to pressure) and the fraction of collisions with sufficient energy (proportional to e^(-Ea/kT)).',
    howItWorks: 'Higher temperature increases collision frequency and energy, accelerating reactions. Distillation separates mixtures using different molecular volatilities related to mass and intermolecular forces.',
    stats: [
      { value: '450C', label: 'Haber process temp', icon: '🌡️' },
      { value: '$4T', label: 'Refining industry', icon: '🛢️' },
      { value: '2x rate', label: 'Per 10C increase', icon: '⏱️' }
    ],
    examples: ['Ammonia synthesis', 'Hydrogen purification', 'Pharmaceutical crystallization', 'Natural gas processing'],
    companies: ['BASF', 'Dow Chemical', 'Air Liquide', 'Linde'],
    futureImpact: 'Designer catalysts and direct air capture of CO2 could help reverse climate change through controlled molecular reactions.',
    color: '#8b5cf6'
  },
  {
    icon: '🔬',
    title: 'Vacuum Technology',
    short: 'Ultra-high vacuum systems',
    tagline: 'The art of removing molecules',
    description: 'From semiconductor fabrication to particle accelerators, vacuum technology requires deep understanding of gas kinetics. Mean free path and molecular flow regimes determine system performance.',
    connection: 'Mean free path (average distance between collisions) increases as pressure decreases. At ultra-high vacuum, molecules travel meters between collisions, enabling atomic-scale precision.',
    howItWorks: 'Vacuum pumps remove molecules through mechanical, diffusion, and cryo-trapping mechanisms. At low pressures, molecules interact with walls more than each other (molecular flow regime).',
    stats: [
      { value: '10^-9', label: 'Torr for chips', icon: '💻' },
      { value: '100m', label: 'Mean free path', icon: '📏' },
      { value: '$8.5B', label: 'Market size', icon: '📊' }
    ],
    examples: ['Chip manufacturing', 'Electron microscopes', 'Thermal evaporation', 'Space simulation'],
    companies: ['Applied Materials', 'ASML', 'Edwards Vacuum', 'Pfeiffer'],
    futureImpact: 'Extreme vacuum enables next-gen quantum computers and atomic-precision manufacturing.',
    color: '#06b6d4'
  }
];

// =============================================================================
// INTERFACES
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

interface KineticTheoryGasesRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Molecule interface for simulation
interface Molecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
}

// Boltzmann constant
const k_B = 1.38e-23; // J/K

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const KineticTheoryGasesRenderer: React.FC<KineticTheoryGasesRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [temperature, setTemperature] = useState(300); // Kelvin
  const [volume, setVolume] = useState(100); // Arbitrary units
  const [particleCount, setParticleCount] = useState(40);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Twist phase - different gas masses
  const [gasMass, setGasMass] = useState(28); // Default to N2 (28 u)
  const [twistTemperature, setTwistTemperature] = useState(300);

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
  const animationRef = useRef<number | null>(null);

  // Responsive design
// Calculate RMS speed: v_rms = sqrt(3kT/m)
  const calculateRmsSpeed = useCallback((temp: number, mass: number = 4.65e-26) => {
    return Math.sqrt((3 * k_B * temp) / mass);
  }, []);

  // Initialize molecules
  const initializeMolecules = useCallback((temp: number, count: number, vol: number) => {
    const containerSize = vol * 3;
    const newMolecules: Molecule[] = [];
    const baseSpeed = calculateRmsSpeed(temp) * 0.00001; // Scale for visualization

    for (let i = 0; i < count; i++) {
      const speedFactor = 0.5 + Math.random() * 1.5;
      const speed = baseSpeed * speedFactor;
      const angle = Math.random() * 2 * Math.PI;

      newMolecules.push({
        id: i,
        x: 20 + Math.random() * (containerSize - 40),
        y: 20 + Math.random() * (containerSize - 40),
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        speed,
        radius: 5
      });
    }

    setMolecules(newMolecules);
  }, [calculateRmsSpeed]);

  // Animation loop for molecules
  useEffect(() => {
    if (!isSimulating) return;

    const animate = () => {
      setMolecules(prev => {
        const containerSize = volume * 3;
        return prev.map(mol => {
          let newX = mol.x + mol.vx * 60;
          let newY = mol.y + mol.vy * 60;
          let newVx = mol.vx;
          let newVy = mol.vy;

          // Wall collisions
          if (newX <= mol.radius || newX >= containerSize - mol.radius) {
            newVx = -newVx;
            newX = Math.max(mol.radius, Math.min(containerSize - mol.radius, newX));
          }
          if (newY <= mol.radius || newY >= containerSize - mol.radius) {
            newVy = -newVy;
            newY = Math.max(mol.radius, Math.min(containerSize - mol.radius, newY));
          }

          return { ...mol, x: newX, y: newY, vx: newVx, vy: newVy };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSimulating, volume]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(220, 225, 230, 0.8)',
    textMuted: 'rgba(210, 215, 220, 0.75)',
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
    twist_play: 'Explore Mass',
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
        gameType: 'kinetic-theory-gases',
        gameTitle: 'Kinetic Theory of Gases',
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

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    const isTestPhase = phase === 'test';
    const quizComplete = isTestPhase && testSubmitted;
    const canGoNext = !isLast && (!isTestPhase || quizComplete);
    return (
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <button onClick={() => !isFirst && goToPhase(phaseOrder[currentIndex - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isFirst ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.4 : 1 }}>Back</button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <div key={p} onClick={() => i <= currentIndex && goToPhase(p)} title={phaseLabels[p]} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? '#3b82f6' : i < currentIndex ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: i <= currentIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <button onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.4 }}>Next</button>
      </div>
    );
  };

  // Confirm flow for quiz
  const [confirmedIndex, setConfirmedIndex] = useState(-1);

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  // Molecule visualization component
  const MoleculeVisualization = ({ temp, vol, count, containerSize }: { temp: number; vol: number; count: number; containerSize: number }) => {
    // Generate static molecules if none exist (for direct phase rendering)
    const localMolecules = molecules.length > 0 ? molecules : (() => {
      const cSize = vol * 3;
      const baseSpd = calculateRmsSpeed(temp) * 0.00001;
      const mols: Molecule[] = [];
      for (let i = 0; i < count; i++) {
        const sf = 0.5 + (((i * 7 + 3) % 10) / 10) * 1.5;
        const spd = baseSpd * sf;
        const ang = ((i * 137.5) % 360) * Math.PI / 180;
        mols.push({
          id: i,
          x: 25 + ((i * 47 + 13) % (cSize - 50)),
          y: 35 + ((i * 59 + 17) % (cSize - 70)),
          vx: spd * Math.cos(ang),
          vy: spd * Math.sin(ang),
          speed: spd,
          radius: 5,
        });
      }
      return mols;
    })();
    const baseSpeed = calculateRmsSpeed(temp) * 0.00001;
    const pressure = (count * temp / vol).toFixed(1);

    return (
      <svg width={containerSize} height={containerSize} viewBox={`0 0 ${containerSize} ${containerSize}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Kinetic Theory Gases visualization">
        <defs>
          <radialGradient id="molSlow" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id="molMedium" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
          <radialGradient id="molFast" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
          <radialGradient id="molHot" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <linearGradient id="wallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="wallGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <g opacity="0.1">
          {Array.from({ length: 6 }).map((_, i) => (
            <React.Fragment key={i}>
              <line x1={i * containerSize / 5} y1="0" x2={i * containerSize / 5} y2={containerSize} stroke="white" strokeWidth="0.5" />
              <line x1="0" y1={i * containerSize / 5} x2={containerSize} y2={i * containerSize / 5} stroke="white" strokeWidth="0.5" />
            </React.Fragment>
          ))}
        </g>

        {/* Container border */}
        <g>
          <rect x="2" y="2" width={containerSize - 4} height={containerSize - 4} fill="none" stroke="url(#wallGrad)" strokeWidth="3" rx="10" filter="url(#wallGlow)" />
        </g>

        {/* Temperature display */}
        <g>
          <rect x={containerSize / 2 - 50} y="8" width="100" height="28" rx="6" fill="rgba(0,0,0,0.6)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
          <text x={containerSize / 2} y="27" textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="bold">{temp} K</text>
        </g>

        {/* Molecules */}
        <g>
          {localMolecules.map(mol => {
            const speedFactor = mol.speed / baseSpeed;
            let gradientId = 'molSlow';
            if (speedFactor >= 1.3) gradientId = 'molHot';
            else if (speedFactor >= 1.0) gradientId = 'molFast';
            else if (speedFactor >= 0.7) gradientId = 'molMedium';

            return (
              <g key={mol.id}>
                <circle
                  cx={mol.x}
                  cy={mol.y}
                  r={mol.radius}
                  fill={`url(#${gradientId})`}
                  filter="url(#glow)"
                />
                {/* Velocity arrow */}
                <line
                  x1={mol.x}
                  y1={mol.y}
                  x2={mol.x + mol.vx * 200}
                  y2={mol.y + mol.vy * 200}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g>
          <rect x="8" y={containerSize - 60} width="130" height="50" rx="6" fill="rgba(0,0,0,0.5)" />
          <circle cx="20" cy={containerSize - 44} r="4" fill="url(#molSlow)" />
          <text x="28" y={containerSize - 41} fill="rgba(156,163,175,0.9)" fontSize="11">Slow</text>
          <circle cx="65" cy={containerSize - 44} r="4" fill="url(#molFast)" />
          <text x="73" y={containerSize - 41} fill="rgba(156,163,175,0.9)" fontSize="11">Med</text>
          <circle cx="105" cy={containerSize - 44} r="4" fill="url(#molHot)" />
          <text x="113" y={containerSize - 41} fill="rgba(156,163,175,0.9)" fontSize="11">Fast</text>
          <text x="15" y={containerSize - 20} fill="rgba(156,163,175,0.9)" fontSize="11">
            N={count} V={vol} P={pressure}
          </text>
        </g>

        {/* Axis labels */}
        <text x={containerSize / 2} y={containerSize - 2} textAnchor="middle" fill="rgba(156,163,175,0.7)" fontSize="11">Position (velocity vectors show speed)</text>
        <text x="12" y={containerSize / 2} textAnchor="middle" fill="rgba(156,163,175,0.7)" fontSize="11" transform={`rotate(-90, 12, ${containerSize / 2})`}>Temperature {temp} K</text>
      </svg>
    );
  };

  // =============================================================================
  // PHASE RENDERS
  // =============================================================================

  const renderPhaseContent = (): React.ReactNode => {

  // HOOK PHASE
  if (phase === 'hook') {
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
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌡️💨
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Kinetic Theory of Gases
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Right now, air molecules are crashing into your skin at <span style={{ color: colors.accent }}>500 meters per second</span> -
          faster than a bullet! Yet you feel nothing but gentle air pressure. Why?
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
            "Temperature is not some mysterious property - it's simply the average kinetic energy of molecular motion.
            Every gas law emerges from the chaotic dance of countless molecules."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - The Microscopic View of Heat
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Molecular Motion
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Speed doubles (2x) - temperature and speed are directly proportional' },
      { id: 'b', text: 'Speed increases by sqrt(2) = 1.41x - speed scales with square root of temperature', correct: true },
      { id: 'c', text: 'Speed quadruples (4x) - kinetic energy doubles, so speed must quadruple' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
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
            If you DOUBLE the temperature (in Kelvin), what happens to the average molecular speed?
          </h2>

          {/* SVG Diagram - Temperature vs Speed */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 320 : 440} height={240} style={{ background: colors.bgCard, borderRadius: '12px' }}>
              <defs>
                <linearGradient id="coldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="hotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <filter id="predGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g>
                {/* Cold container */}
                <rect x="30" y="40" width="120" height="140" rx="10" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <text x="90" y="30" textAnchor="middle" fill="#3b82f6" fontSize="16" fontWeight="bold">300 K</text>
                {/* Cold molecules - slow */}
                <circle cx="60" cy="80" r="6" fill="url(#coldGrad)" filter="url(#predGlow)" />
                <circle cx="100" cy="110" r="6" fill="url(#coldGrad)" filter="url(#predGlow)" />
                <circle cx="75" cy="150" r="6" fill="url(#coldGrad)" filter="url(#predGlow)" />
                <circle cx="120" cy="70" r="6" fill="url(#coldGrad)" />
                {/* Speed arrows - short */}
                <g><line x1="66" y1="80" x2="78" y2="75" stroke="rgba(147,197,253,0.6)" strokeWidth="1.5" markerEnd="url(#arrowCold)" /></g>
                <g><line x1="106" y1="110" x2="115" y2="100" stroke="rgba(147,197,253,0.6)" strokeWidth="1.5" /></g>
                <text x="90" y="195" textAnchor="middle" fill="rgba(156,163,175,0.7)" fontSize="11">Slow</text>
              </g>
              <g>
                {/* Arrow between */}
                <text x={isMobile ? 175 : 220} y="115" textAnchor="middle" fill={colors.accent} fontSize="22" fontWeight="bold">2x T</text>
                <line x1={isMobile ? 155 : 195} y1="125" x2={isMobile ? 195 : 245} y2="125" stroke={colors.accent} strokeWidth="2" />
                <polygon points={`${isMobile ? 195 : 245},120 ${isMobile ? 205 : 255},125 ${isMobile ? 195 : 245},130`} fill={colors.accent} />
              </g>
              <g>
                {/* Hot container */}
                <rect x={isMobile ? 210 : 290} y="40" width="120" height="140" rx="10" fill="none" stroke="#ef4444" strokeWidth="2" />
                <text x={isMobile ? 270 : 350} y="30" textAnchor="middle" fill="#ef4444" fontSize="16" fontWeight="bold">600 K</text>
                {/* Hot molecules - faster */}
                <circle cx={isMobile ? 235 : 315} cy="70" r="6" fill="url(#hotGrad)" filter="url(#predGlow)" />
                <circle cx={isMobile ? 275 : 355} cy="100" r="6" fill="url(#hotGrad)" filter="url(#predGlow)" />
                <circle cx={isMobile ? 250 : 330} cy="140" r="6" fill="url(#hotGrad)" filter="url(#predGlow)" />
                <circle cx={isMobile ? 300 : 380} cy="85" r="6" fill="url(#hotGrad)" />
                {/* Speed arrows - longer */}
                <g><line x1={isMobile ? 241 : 321} y1="70" x2={isMobile ? 260 : 340} y2="60" stroke="rgba(252,165,165,0.6)" strokeWidth="2" /></g>
                <g><line x1={isMobile ? 281 : 361} y1="100" x2={isMobile ? 300 : 380} y2="85" stroke="rgba(252,165,165,0.6)" strokeWidth="2" /></g>
                <text x={isMobile ? 270 : 350} y="195" textAnchor="middle" fill="rgba(156,163,175,0.7)" fontSize="11">Speed = ???</text>
              </g>
              <g>
                <text x={isMobile ? 175 : 220} y="230" textAnchor="middle" fill="rgba(156,163,175,0.9)" fontSize="11">How much faster do molecules move?</text>
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
              onClick={() => {
                playSound('success');
                initializeMolecules(temperature, particleCount, volume);
                setIsSimulating(true);
                nextPhase();
              }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Simulator
  if (phase === 'play') {
    const containerSize = isMobile ? 280 : 360;
    const rmsSpeed = calculateRmsSpeed(temperature);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Molecular Motion Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            The visualization shows molecules moving inside a container. Adjust temperature to observe how molecular speeds change.
            The RMS speed is calculated as v = sqrt(3kT/m).
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            When temperature increases, molecular kinetic energy increases, causing molecules to move faster.
            This is important because it explains how heat affects gas behavior in engines, HVAC systems, and everyday applications.
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
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <MoleculeVisualization temp={temperature} vol={volume} count={particleCount} containerSize={containerSize} />
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
                    <div style={{ ...typo.h3, color: colors.accent }}>{rmsSpeed.toFixed(0)} m/s</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>RMS Speed</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.success }}>{((3/2) * k_B * temperature * 1e21).toFixed(2)}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Avg KE (x10^-21 J)</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: '#3b82f6' }}>{(particleCount * temperature / volume).toFixed(1)}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Pressure (NkT/V)</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Temperature slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{temperature} K</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="10"
                  value={temperature}
                  onChange={(e) => {
                    const newTemp = parseInt(e.target.value);
                    setTemperature(newTemp);
                    initializeMolecules(newTemp, particleCount, volume);
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: colors.accent,
                    touchAction: 'pan-y',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>100 K</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>800 K</span>
                </div>
              </div>

              {/* Particle count slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Molecules</span>
                  <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{particleCount}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={particleCount}
                  onChange={(e) => {
                    const newCount = parseInt(e.target.value);
                    setParticleCount(newCount);
                    initializeMolecules(temperature, newCount, volume);
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    accentColor: colors.success,
                    touchAction: 'pan-y',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              Try doubling the temperature (e.g., 300K to 600K). Does the speed double? Check the RMS speed display!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); setIsSimulating(false); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Molecular Motion
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>v_rms = sqrt(3kT/m)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                The RMS (root-mean-square) speed is proportional to the <span style={{ color: colors.accent }}>square root</span> of temperature, not temperature directly.
                This means doubling temperature increases speed by only sqrt(2) = 1.41x.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Why square root?</strong>
              </p>
              <p>
                Kinetic energy KE = (1/2)mv^2 = (3/2)kT. Since KE is proportional to T, and KE is proportional to v^2, then v is proportional to sqrt(T).
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
              Key Insight: Temperature IS Motion
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Temperature isn't an abstract property - it's the direct measure of molecular kinetic energy:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>KE_avg = (3/2)kT - Average kinetic energy per molecule</li>
              <li>Higher T means faster molecules (more collisions, more momentum transfer)</li>
              <li>This explains pressure: P = NkT/V (more molecules, hotter, smaller volume = more pressure)</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              Your Prediction
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              {prediction === 'b'
                ? "Correct! You understood that speed scales with the square root of temperature."
                : "The answer was B - speed increases by sqrt(2). Since KE is proportional to v^2, doubling KE (by doubling T) only increases v by sqrt(2)."}
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore: What About Different Gases?
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Helium moves faster - smaller atoms slip through easier' },
      { id: 'b', text: 'Helium moves sqrt(7) = 2.6x faster - speed inversely proportional to sqrt(mass)', correct: true },
      { id: 'c', text: 'Same speed - temperature determines speed, not mass' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
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
              New Variable: Molecular Mass
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            At the same temperature, how does Helium (mass 4 u) compare to Nitrogen (mass 28 u)?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 320 : 440} height={200} style={{ borderRadius: '12px' }}>
              <defs>
                <radialGradient id="heGrad" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </radialGradient>
                <radialGradient id="n2Grad" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="100%" stopColor="#ef4444" />
                </radialGradient>
                <filter id="twGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g>
                <rect x="20" y="30" width={isMobile ? 130 : 180} height="130" rx="8" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <text x={isMobile ? 85 : 110} y="22" textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="bold">He (4 u) - Light</text>
                <circle cx={isMobile ? 50 : 60} cy="70" r="5" fill="url(#heGrad)" filter="url(#twGlow)" />
                <circle cx={isMobile ? 90 : 120} cy="100" r="5" fill="url(#heGrad)" filter="url(#twGlow)" />
                <circle cx={isMobile ? 120 : 150} cy="70" r="5" fill="url(#heGrad)" />
                <circle cx={isMobile ? 70 : 80} cy="130" r="5" fill="url(#heGrad)" />
                <line x1={isMobile ? 55 : 65} y1="68" x2={isMobile ? 75 : 95} y2="58" stroke="rgba(147,197,253,0.8)" strokeWidth="2" />
                <line x1={isMobile ? 95 : 125} y1="98" x2={isMobile ? 115 : 155} y2="85" stroke="rgba(147,197,253,0.8)" strokeWidth="2" />
                <text x={isMobile ? 85 : 110} y="175" textAnchor="middle" fill="rgba(156,163,175,0.9)" fontSize="11">Fast?</text>
              </g>
              <g>
                <text x={isMobile ? 170 : 225} y="100" textAnchor="middle" fill="rgba(156,163,175,0.7)" fontSize="16">vs</text>
              </g>
              <g>
                <rect x={isMobile ? 200 : 260} y="30" width={isMobile ? 130 : 180} height="130" rx="8" fill="none" stroke="#ef4444" strokeWidth="2" />
                <text x={isMobile ? 265 : 350} y="22" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">N2 (28 u) - Heavy</text>
                <circle cx={isMobile ? 230 : 300} cy="80" r="8" fill="url(#n2Grad)" filter="url(#twGlow)" />
                <circle cx={isMobile ? 280 : 370} cy="110" r="8" fill="url(#n2Grad)" filter="url(#twGlow)" />
                <circle cx={isMobile ? 260 : 340} cy="60" r="8" fill="url(#n2Grad)" />
                <line x1={isMobile ? 237 : 307} y1="78" x2={isMobile ? 247 : 317} y2="73" stroke="rgba(252,165,165,0.8)" strokeWidth="1.5" />
                <text x={isMobile ? 265 : 350} y="175" textAnchor="middle" fill="rgba(156,163,175,0.9)" fontSize="11">Slow?</text>
              </g>
            </svg>
            <p style={{ ...typo.small, color: 'rgba(156,163,175,0.7)', marginTop: '16px' }}>
              Both gases at 300 K - same temperature, same average kinetic energy
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
              See the Comparison
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    // Calculate speeds for different gases
    const massOptions = [
      { name: 'H2', mass: 2, color: '#ef4444' },
      { name: 'He', mass: 4, color: '#f97316' },
      { name: 'N2', mass: 28, color: '#22c55e' },
      { name: 'O2', mass: 32, color: '#3b82f6' },
      { name: 'CO2', mass: 44, color: '#8b5cf6' },
    ];

    const getSpeed = (mass: number, temp: number) => {
      const massKg = mass * 1.66e-27; // Convert atomic mass units to kg
      return Math.sqrt((3 * k_B * temp) / massKg);
    };

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Mass vs Speed Comparison
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            All gases at the same temperature - compare their RMS speeds
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
                {/* Speed bars - SVG visualization */}
                <svg width={isMobile ? 300 : 420} height={260} style={{ borderRadius: '8px' }}>
                  <defs>
                    <filter id="barGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    {massOptions.map(gas => (
                      <linearGradient key={gas.name} id={`grad${gas.name}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={gas.color} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={gas.color} />
                      </linearGradient>
                    ))}
                  </defs>
                  <g>
                    <text x={isMobile ? 150 : 210} y="18" textAnchor="middle" fill="rgba(156,163,175,0.7)" fontSize="12">RMS Speed Comparison at {twistTemperature} K</text>
                  </g>
                  {massOptions.map((gas, idx) => {
                    const speed = getSpeed(gas.mass, twistTemperature);
                    const maxSpeed = getSpeed(2, 600);
                    const barWidth = (speed / maxSpeed) * (isMobile ? 200 : 300);
                    const y = 30 + idx * 46;
                    return (
                      <g key={gas.name}>
                        <text x="5" y={y + 18} fill="rgba(255,255,255,0.9)" fontSize="12" fontWeight="600">{gas.name}</text>
                        <text x="40" y={y + 18} fill="rgba(156,163,175,0.9)" fontSize="11">({gas.mass}u)</text>
                        <rect x="75" y={y + 2} width={isMobile ? 200 : 300} height="28" rx="4" fill="rgba(255,255,255,0.05)" />
                        <rect x="75" y={y + 2} width={barWidth} height="28" rx="4" fill={`url(#grad${gas.name})`} filter="url(#barGlow)" />
                        <text x={80 + barWidth} y={y + 20} fill={gas.color} fontSize="11" fontWeight="bold">{speed.toFixed(0)} m/s</text>
                      </g>
                    );
                  })}
                </svg>

                {/* Ratio display */}
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                }}>
                  <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center' }}>
                    H2 is <span style={{ color: colors.accent, fontWeight: 'bold' }}>
                      {(getSpeed(2, twistTemperature) / getSpeed(28, twistTemperature)).toFixed(2)}x
                    </span> faster than N2 at {twistTemperature} K
                  </p>
                </div>
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Temperature slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{twistTemperature} K</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="50"
                  value={twistTemperature}
                  onChange={(e) => setTwistTemperature(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    touchAction: 'pan-y',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              Notice: The ratio of speeds doesn't change with temperature! Lighter gases are always faster by sqrt(mass_ratio).
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Pattern
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Lighter Means Faster
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>KE</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Equal Kinetic Energy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                At thermal equilibrium, all gas molecules have the same <span style={{ color: colors.accent }}>average kinetic energy</span>:
                KE = (3/2)kT. This is true regardless of molecular mass!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>v</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Speed from Energy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Since KE = (1/2)mv^2, and KE is fixed, then v = sqrt(2KE/m).
                <span style={{ color: colors.success }}> Lighter mass means higher speed</span> to achieve the same kinetic energy.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌍</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Atmospheric Escape</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                This explains why Earth lost its hydrogen! H2 molecules move so fast (1900 m/s at 300K) that some exceed escape velocity
                in the upper atmosphere. Heavier gases like N2 (517 m/s) stay bound.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚗️</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Graham's Law</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Effusion rate (gas escaping through a tiny hole) is proportional to speed. This is used industrially to separate isotopes -
                like enriching uranium by passing UF6 through membranes (U-235 effuses 0.4% faster than U-238).
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
        conceptName="Kinetic Theory Gases"
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
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
                Physics Connection:
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

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: 'rgba(156,163,175,0.8)', margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                Industry Leaders:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.companies.map((company, i) => (
                  <span key={i} style={{
                    background: colors.bgCard,
                    padding: '4px 12px',
                    borderRadius: '16px',
                    ...typo.small,
                    color: 'rgba(156,163,175,0.7)',
                  }}>
                    {company}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              background: `${app.color}11`,
              borderRadius: '8px',
              padding: '12px',
            }}>
              <h4 style={{ ...typo.small, color: app.color, marginBottom: '4px', fontWeight: 600 }}>
                Future Impact:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.futureImpact}
              </p>
            </div>

            {/* Got It button for current app */}
            {!completedApps[selectedApp] && (
              <button
                onClick={() => {
                  playSound('click');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Got It - Next Application
              </button>
            )}
          </div>

          {allAppsCompleted ? (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          ) : (
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center' }}>
              Explore all 4 applications to continue ({completedCount} of {realWorldApps.length} done)
            </p>
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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
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
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand kinetic theory and molecular motion!'
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
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

          {/* Navigation with confirm flow */}
          {(() => {
            const hasAnswer = !!testAnswers[currentQuestion];
            const isConfirmed = confirmedIndex >= currentQuestion;
            const isLastQ = currentQuestion === 9;

            if (hasAnswer && !isConfirmed) {
              return (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => { setConfirmedIndex(currentQuestion); playSound('click'); }}
                    style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                    Check Answer
                  </button>
                </div>
              );
            }
            if (isConfirmed && !isLastQ) {
              return (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => { setCurrentQuestion(prev => prev + 1); playSound('click'); }}
                    style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                    Next Question
                  </button>
                </div>
              );
            }
            if (isConfirmed && isLastQ) {
              return (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => {
                    const score = testAnswers.reduce((acc, ans, i) => {
                      const correct = testQuestions[i].options.find(o => (o as any).correct)?.id;
                      return acc + (ans === correct ? 1 : 0);
                    }, 0);
                    setTestScore(score);
                    setTestSubmitted(true);
                    playSound(score >= 7 ? 'complete' : 'failure');
                  }}
                    style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: colors.success, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                    Submit Test
                  </button>
                </div>
              );
            }
            return null;
          })()}
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
          Kinetic Theory Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how temperature, pressure, and molecular motion are all connected through the kinetic theory of gases.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Temperature IS molecular kinetic energy',
              'v_rms = sqrt(3kT/m) - speed depends on both T and mass',
              'KE_avg = (3/2)kT - same for all gases at same T',
              'PV = NkT - ideal gas law from molecular collisions',
              'Lighter gases move faster at the same temperature',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            <strong style={{ color: colors.accent }}>Your Score: {testScore}/10</strong>
            <br />
            {testScore === 10 ? 'Perfect! You\'ve mastered the molecular world!' :
             testScore >= 8 ? 'Excellent understanding of kinetic theory!' :
             'Great job completing the lesson!'}
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
    );
  }

  return null;
  }; // end renderPhaseContent

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default KineticTheoryGasesRenderer;
