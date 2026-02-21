'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Precession & Nutation - Complete 10-Phase Game
// The physics of spinning tops, gyroscopes, and Earth's wobble
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

interface PrecessionNutationRendererProps {
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
    scenario: "A toy manufacturer is designing a spinning top. They notice that when the top is tilted, instead of falling over, its axis traces a slow circle in the air while the top continues spinning.",
    question: "What causes this circular motion of the spin axis?",
    options: [
      { id: 'a', label: "Air resistance pushing on the top" },
      { id: 'b', label: "Gravity creating a torque on the tilted angular momentum", correct: true },
      { id: 'c', label: "Friction with the surface below" },
      { id: 'd', label: "The spin gradually slowing down" }
    ],
    explanation: "When a spinning top is tilted, gravity creates a torque perpendicular to the angular momentum vector. This torque doesn't make the top fall - instead, it changes the direction of the angular momentum, causing the axis to precess (trace a circle)."
  },
  {
    scenario: "An engineer is testing two identical tops. Top A spins at 3000 RPM while Top B spins at 1500 RPM. Both are tilted at the same angle.",
    question: "Which top precesses faster (completes circles faster)?",
    options: [
      { id: 'a', label: "Top A (faster spin) precesses faster" },
      { id: 'b', label: "Top B (slower spin) precesses faster", correct: true },
      { id: 'c', label: "Both precess at the same rate" },
      { id: 'd', label: "Neither will precess at these speeds" }
    ],
    explanation: "Precession rate is inversely proportional to spin rate: omega_precession = tau/(I*omega_spin). A faster spinning top has more angular momentum, making it harder for gravity's torque to change its direction, so it precesses more slowly."
  },
  {
    scenario: "A physicist observes a spinning gyroscope and notices a small wobbling motion superimposed on the steady precession. The wobble amplitude is small and varies periodically.",
    question: "What is this wobbling phenomenon called?",
    options: [
      { id: 'a', label: "Secondary precession" },
      { id: 'b', label: "Spin decay" },
      { id: 'c', label: "Nutation", correct: true },
      { id: 'd', label: "Gravitational oscillation" }
    ],
    explanation: "Nutation is the 'nodding' or wobbling motion superimposed on precession. It occurs when a gyroscope is released with initial conditions that don't exactly match steady precession, causing the axis to oscillate about the precession cone."
  },
  {
    scenario: "Ancient astronomers noticed that the position of the North Celestial Pole among the stars slowly drifts over centuries. Today Polaris is our North Star, but 5000 years ago it was Thuban.",
    question: "How long does it take for Earth's axis to complete one full precession cycle?",
    options: [
      { id: 'a', label: "About 1,000 years" },
      { id: 'b', label: "About 10,000 years" },
      { id: 'c', label: "About 26,000 years", correct: true },
      { id: 'd', label: "About 100,000 years" }
    ],
    explanation: "Earth's axial precession takes approximately 25,772 years to complete one cycle (often rounded to 26,000 years). This is caused by gravitational torques from the Sun and Moon on Earth's equatorial bulge."
  },
  {
    scenario: "Astronauts on the International Space Station are testing a gyroscope in the microgravity environment. They spin it up and release it at an angle.",
    question: "What will the gyroscope do in zero gravity?",
    options: [
      { id: 'a', label: "Precess faster than on Earth" },
      { id: 'b', label: "Precess slower than on Earth" },
      { id: 'c', label: "Spin without precessing - axis remains fixed", correct: true },
      { id: 'd', label: "Immediately stop spinning" }
    ],
    explanation: "Precession requires a torque, and on Earth this comes from gravity acting on the tilted center of mass. In zero gravity, there's no gravitational torque, so the gyroscope simply maintains its spin axis in a fixed direction (angular momentum conservation)."
  },
  {
    scenario: "A spacecraft engineer is designing attitude control using Control Moment Gyroscopes (CMGs). They need to rotate the spacecraft without using fuel.",
    question: "How do CMGs use precession to rotate a spacecraft?",
    options: [
      { id: 'a', label: "The CMG's spin creates thrust like a propeller" },
      { id: 'b', label: "Tilting the spinning CMG creates torque through precession", correct: true },
      { id: 'c', label: "The CMG absorbs rotational energy from space" },
      { id: 'd', label: "CMG vibrations push against the structure" }
    ],
    explanation: "When a spinning CMG is tilted (gimbaled), it produces a gyroscopic torque perpendicular to both the spin axis and the gimbal axis. This torque rotates the spacecraft. By combining multiple CMGs, engineers can rotate the spacecraft in any direction without using propellant."
  },
  {
    scenario: "An MRI technician is explaining how the machine works. She mentions that hydrogen protons in the body 'precess' around the magnetic field direction.",
    question: "What role does precession play in MRI imaging?",
    options: [
      { id: 'a', label: "Precession creates X-rays that pass through tissue" },
      { id: 'b', label: "Precessing protons emit radio signals at the Larmor frequency", correct: true },
      { id: 'c', label: "Precession heats up tissues for thermal imaging" },
      { id: 'd', label: "Precession removes water from cells for imaging" }
    ],
    explanation: "In an MRI, the strong magnetic field causes hydrogen proton spins to precess at the Larmor frequency. When RF pulses disturb this alignment, the precessing protons emit detectable radio signals. The frequency depends on local magnetic field strength, allowing spatial imaging."
  },
  {
    scenario: "A top designer wants to increase the precession rate of a spinning top without changing its spin speed. The current top has a 15-degree tilt angle.",
    question: "What change would increase the precession rate?",
    options: [
      { id: 'a', label: "Decrease the tilt angle to 10 degrees" },
      { id: 'b', label: "Increase the tilt angle to 25 degrees", correct: true },
      { id: 'c', label: "Make the top lighter without changing its shape" },
      { id: 'd', label: "Paint the top a different color" }
    ],
    explanation: "Increasing the tilt angle increases the gravitational torque (tau = m*g*r*sin(theta)), which increases the precession rate. Greater tilt means the center of mass is further from the vertical axis, creating more lever arm for gravity to act on."
  },
  {
    scenario: "Climate scientists study Milankovitch cycles - long-term variations in Earth's climate caused by changes in orbital parameters. Axial precession is one component.",
    question: "How does Earth's precession affect climate over millennia?",
    options: [
      { id: 'a', label: "It changes the length of Earth's year" },
      { id: 'b', label: "It causes seasons to occur at different points in Earth's orbit", correct: true },
      { id: 'c', label: "It changes Earth's distance from the Sun" },
      { id: 'd', label: "It creates more or fewer hours of daylight" }
    ],
    explanation: "Precession changes when seasons occur relative to Earth's elliptical orbit. Currently, Northern Hemisphere winter occurs near perihelion (closest to Sun). In 13,000 years, precession will cause Northern winter to occur near aphelion (farthest from Sun), affecting climate patterns."
  },
  {
    scenario: "A ship's gyrocompass uses a spinning gyroscope to find true north, unlike a magnetic compass which points to magnetic north. The gyroscope takes 1-4 hours to settle after starting.",
    question: "Why does a gyrocompass eventually point to true north?",
    options: [
      { id: 'a', label: "Earth's magnetic field slowly aligns the gyroscope" },
      { id: 'b', label: "Gravity causes it to precess until aligned with Earth's rotation axis", correct: true },
      { id: 'c', label: "It uses GPS to electronically adjust itself" },
      { id: 'd', label: "Friction with the air gradually orients it north" }
    ],
    explanation: "A gyrocompass uses Earth's rotation to find true north. If the gyro axis is tilted from Earth's rotation axis, Earth's rotation creates a torque that causes the gyro to precess toward alignment with the rotation axis - pointing true north."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🛰',
    title: 'Spacecraft Attitude Control',
    short: 'Gyroscopes stabilize satellites',
    tagline: 'Keeping satellites pointed right',
    description: 'Control Moment Gyroscopes (CMGs) use precession to rotate spacecraft without fuel. By tilting spinning flywheels, satellites can change orientation precisely for Earth observation, communications, and scientific instruments.',
    connection: 'Precession allows angular momentum transfer between gyroscopes and spacecraft, enabling fuel-free attitude adjustments that can last for decades.',
    howItWorks: 'When a CMG gimbal tilts a spinning flywheel, the resulting torque causes the spacecraft to rotate perpendicular to both the spin axis and tilt direction - pure precession physics.',
    stats: [
      { value: '35,786 km', label: 'GEO orbit altitude', icon: '🛰' },
      { value: '$500M', label: 'Market value', icon: '💰' },
      { value: '250 W', label: 'CMG power', icon: '⚡' }
    ],
    examples: ['Hubble Space Telescope', 'International Space Station', 'GPS satellites', 'Communication satellites'],
    companies: ['NASA', 'SpaceX', 'Lockheed Martin', 'Northrop Grumman'],
    futureImpact: 'Next-generation spacecraft will use advanced CMG arrays for autonomous asteroid mining and deep space exploration.',
    color: '#6366F1'
  },
  {
    icon: '🧭',
    title: 'Gyrocompasses',
    short: 'Navigation without magnetism',
    tagline: 'Finding true north anywhere',
    description: 'Gyrocompasses use Earth rotation-induced precession to find true north, unaffected by magnetic anomalies. Essential for ships, submarines, and aircraft where magnetic compasses fail.',
    connection: "Earth's rotation creates a torque on tilted gyroscopes, causing them to precess until aligned with Earth's rotational axis - pointing true north.",
    howItWorks: "A spinning gyroscope mounted with freedom to tilt experiences gravity-induced precession that gradually aligns it with Earth's rotation axis over 1-4 hours.",
    stats: [
      { value: '0.1deg', label: 'Accuracy', icon: '🎯' },
      { value: '$50K+', label: 'Marine unit cost', icon: '💰' },
      { value: '100%', label: 'Ships using them', icon: '🚢' }
    ],
    examples: ['Nuclear submarines', 'Container ships', 'Naval vessels', 'Commercial aircraft'],
    companies: ['Sperry Marine', 'Raytheon', 'Safran', 'Honeywell'],
    futureImpact: 'Fiber-optic and ring laser gyros are replacing mechanical versions with solid-state precision.',
    color: '#10B981'
  },
  {
    icon: '🏥',
    title: 'MRI Physics',
    short: 'Medical imaging via precession',
    tagline: 'Seeing inside the body',
    description: "MRI machines detect hydrogen proton precession in magnetic fields. When radio waves disturb aligned protons, their precession frequency reveals tissue composition for detailed medical imaging.",
    connection: "Proton spin axes precess around the MRI's magnetic field direction at the Larmor frequency, creating detectable radio signals.",
    howItWorks: 'Strong magnets align proton spins, RF pulses tip them, and receiver coils detect the precession frequency variations that map tissue density and type.',
    stats: [
      { value: '40M+', label: 'Scans per year', icon: '📊' },
      { value: '$3M', label: 'Machine cost', icon: '💰' },
      { value: '7 Tesla', label: 'Research field', icon: '🧲' }
    ],
    examples: ['Brain imaging', 'Cardiac MRI', 'Sports injury diagnosis', 'Cancer detection'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Canon Medical'],
    futureImpact: 'Portable MRI and ultra-high field systems will bring brain imaging to emergency rooms and enable molecular-level diagnostics.',
    color: '#EC4899'
  },
  {
    icon: '🌍',
    title: 'Climate & Astronomy',
    short: "Earth's 26,000-year wobble",
    tagline: 'Celestial mechanics at work',
    description: "Earth's axial precession changes which star is 'North Star' over millennia. This 26,000-year cycle affects climate patterns (Milankovitch cycles) and required ancient astronomers to update star catalogs.",
    connection: "The Sun and Moon's gravitational pull on Earth's equatorial bulge creates torque, causing our planet's axis to precess like a tilted spinning top.",
    howItWorks: "Earth's 23.5deg tilt combined with its equatorial bulge experiences differential gravitational pull, generating the torque that drives precession.",
    stats: [
      { value: '26,000', label: 'Years per cycle', icon: '🔄' },
      { value: '23.5deg', label: 'Axial tilt', icon: '📐' },
      { value: '50"', label: 'Shift per year', icon: '⭐' }
    ],
    examples: ['Ice age timing', 'Ancient Egyptian astronomy', 'Star catalog corrections', 'Agricultural calendar drift'],
    companies: ['NASA JPL', 'ESA', 'NOAA', 'Major observatories'],
    futureImpact: 'Understanding precession helps predict long-term climate and guides interstellar navigation for future space missions.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PrecessionNutationRenderer: React.FC<PrecessionNutationRendererProps> = ({ onGameEvent, gamePhase }) => {
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
// Top simulation state
  const [spinSpeed, setSpinSpeed] = useState(5);
  const [tiltAngle, setTiltAngle] = useState(20);
  const [showVectors, setShowVectors] = useState(true);
  const [isSpinning, setIsSpinning] = useState(true);
  const [hasGravity, setHasGravity] = useState(true);
  const [topAngle, setTopAngle] = useState(0);
  const [precessionAngle, setPrecessionAngle] = useState(0);
  const [nutationPhase, setNutationPhase] = useState(0);

  // Earth visualization state
  const [earthPrecessionAngle, setEarthPrecessionAngle] = useState(0);
  const [earthTiltAngle, setEarthTiltAngle] = useState(23.5);

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
// Top animation
  useEffect(() => {
    if (!isSpinning) return;
    const interval = setInterval(() => {
      setTopAngle(prev => (prev + spinSpeed) % 360);
      if (hasGravity && tiltAngle > 0) {
        const precessionRate = 0.3 * (tiltAngle / 20) / (spinSpeed / 5);
        setPrecessionAngle(prev => (prev + precessionRate) % 360);
        setNutationPhase(prev => (prev + 0.15) % (2 * Math.PI));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isSpinning, spinSpeed, tiltAngle, hasGravity]);

  // Earth precession animation
  useEffect(() => {
    if (phase === 'twist_play') {
      const interval = setInterval(() => {
        setEarthPrecessionAngle(prev => (prev + 0.5) % 360);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Calculate precession rate (approximate formula)
  const precessionRate = (hasGravity && tiltAngle > 0)
    ? (9.8 * Math.sin(tiltAngle * Math.PI / 180)) / (spinSpeed * 0.5)
    : 0;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#6366F1',
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#B8C0CC',
    textMuted: '#D1D5DB',
    border: '#2a2a3a',
    gyro: '#6366F1',
    torque: '#F59E0B',
    angular: '#10B981',
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
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Explore',
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
        gameType: 'precession-nutation',
        gameTitle: 'Precession & Nutation',
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

  // Progress bar
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
    background: `linear-gradient(135deg, ${colors.accent}, #4F46E5)`,
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

  // Navigation bar
  const renderNavigationBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => {
            if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
          }}
          disabled={currentIndex === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: currentIndex > 0 ? colors.bgCard : 'transparent',
            color: currentIndex > 0 ? colors.textPrimary : colors.textMuted,
            cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            opacity: currentIndex === 0 ? 0.4 : 1,
          }}
        >
          Back
        </button>
        <span style={{ ...typo.small, color: colors.textSecondary }}>
          {currentIndex + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={() => nextPhase()}
          disabled={currentIndex >= phaseOrder.length - 1}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: currentIndex < phaseOrder.length - 1 ? colors.accent : colors.textMuted,
            color: 'white',
            cursor: currentIndex < phaseOrder.length - 1 ? 'pointer' : 'not-allowed',
            fontWeight: 600,
          }}
        >
          Continue
        </button>
      </div>
    );
  };

  // Slider style helper
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    cursor: 'pointer',
    accentColor: colors.accent,
    touchAction: 'pan-y',
    WebkitAppearance: 'none' as const,
  };

  // Precession Rate Graph Visualization
  const PrecessionRateGraph = () => {
    const graphW = 350;
    const graphH = 280;
    const padL = 55;
    const padR = 20;
    const padT = 30;
    const padB = 45;
    const plotW = graphW - padL - padR;
    const plotH = graphH - padT - padB;

    // Generate precession rate curve: rate = k * sin(tiltAngle) / spinSpeed
    // X axis = spin speed (1 to 15), Y axis = precession rate
    const numPoints = 30;
    const minSpin = 1;
    const maxSpin = 15;
    const maxRate = (9.8 * Math.sin(45 * Math.PI / 180)) / (minSpin * 0.5);

    const getRate = (s: number) => (9.8 * Math.sin(tiltAngle * Math.PI / 180)) / (s * 0.5);

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      const s = minSpin + (maxSpin - minSpin) * i / (numPoints - 1);
      const rate = getRate(s);
      const px = padL + (s - minSpin) / (maxSpin - minSpin) * plotW;
      const py = padT + plotH - (rate / maxRate) * plotH;
      points.push({ x: px, y: py });
    }

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Reference curve at 20 deg tilt (baseline)
    const refRate = (s: number) => (9.8 * Math.sin(20 * Math.PI / 180)) / (s * 0.5);
    const refPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < numPoints; i++) {
      const s = minSpin + (maxSpin - minSpin) * i / (numPoints - 1);
      const rate = refRate(s);
      const px = padL + (s - minSpin) / (maxSpin - minSpin) * plotW;
      const py = padT + plotH - (rate / maxRate) * plotH;
      refPoints.push({ x: px, y: py });
    }
    const refPathD = refPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Interactive marker at current spin speed
    const currentRate = getRate(spinSpeed);
    const markerX = padL + (spinSpeed - minSpin) / (maxSpin - minSpin) * plotW;
    const markerY = padT + plotH - (currentRate / maxRate) * plotH;

    // Grid lines
    const hGridCount = 5;
    const vGridCount = 5;

    // Fill area under curve
    const fillPathD = pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${padT + plotH} L ${points[0].x.toFixed(1)} ${padT + plotH} Z`;

    return (
      <svg width={graphW} height={graphH} viewBox={`0 0 ${graphW} ${graphH}`} style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Precession Nutation visualization">
        <defs>
          <linearGradient id="curveFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="curveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <filter id="markerGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <g>
          <rect x="0" y="0" width={graphW} height={graphH} rx="8" fill={colors.bgSecondary} />
        </g>

        {/* Grid lines */}
        <g>
          {Array.from({ length: hGridCount }).map((_, i) => {
            const y = padT + (plotH * i) / (hGridCount - 1);
            return (
              <line key={`hg${i}`} x1={padL} y1={y} x2={padL + plotW} y2={y}
                stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            );
          })}
          {Array.from({ length: vGridCount }).map((_, i) => {
            const x = padL + (plotW * i) / (vGridCount - 1);
            return (
              <line key={`vg${i}`} x1={x} y1={padT} x2={x} y2={padT + plotH}
                stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            );
          })}
        </g>

        {/* Axes */}
        <g>
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={colors.textMuted} strokeWidth="2" />
          <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={colors.textMuted} strokeWidth="2" />
        </g>

        {/* Axis labels */}
        <text x={padL + plotW / 2} y={graphH - 4} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">
          Spin Speed (rad/s)
        </text>
        <text x="10" y={padT + plotH / 2} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600"
          transform={`rotate(-90, 10, ${padT + plotH / 2})`}>
          Rate (rad/s)
        </text>

        {/* Y-axis tick labels */}
        <text x={padL - 6} y={padT + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">
          {maxRate.toFixed(1)}
        </text>
        <text x={padL - 6} y={padT + plotH + 4} textAnchor="end" fill={colors.textMuted} fontSize="11">
          0
        </text>

        {/* X-axis tick labels */}
        <text x={padL} y={padT + plotH + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          1
        </text>
        <text x={padL + plotW} y={padT + plotH + 16} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          15
        </text>

        {/* Reference baseline curve (20 deg) */}
        <g>
          <path d={refPathD} fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.6" />
          <text x={padL + plotW - 5} y={padT + plotH - 10} textAnchor="end" fill="#9CA3AF" fontSize="11">
            baseline 20deg
          </text>
        </g>

        {/* Current curve with fill */}
        <g>
          <path d={fillPathD} fill="url(#curveFillGrad)" />
          <path d={pathD} fill="none" stroke="url(#curveStrokeGrad)" strokeWidth="2.5" />
        </g>

        {/* Interactive marker circle that moves with slider */}
        <circle cx={markerX} cy={markerY} r="8" fill={colors.accent} stroke="white" strokeWidth="2" filter="url(#markerGlow)" />
        <circle cx={markerX} cy={markerY} r="3" fill="white" />

        {/* Title */}
        <text x={padL + plotW / 2} y={padT - 10} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="bold">
          Precession Rate vs Spin Speed
        </text>
      </svg>
    );
  };

  // Spinning Top Visualization (smaller, used alongside graph)
  const SpinningTopVisualization = ({ size = 250, showLabels = true }: { size?: number; showLabels?: boolean }) => {
    const nutationOffset = hasGravity ? Math.sin(nutationPhase) * 2 : 0;
    const effectiveTilt = hasGravity ? tiltAngle + nutationOffset : 0;
    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 250;

    return (
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="topDiskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="topConeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="angularMomentumGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="torqueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="gravityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M 0 0 L 0 6 L 9 3 z" fill="#10B981" />
          </marker>
          <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M 0 0 L 0 6 L 9 3 z" fill="#F59E0B" />
          </marker>
          <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M 0 0 L 0 6 L 9 3 z" fill="#EF4444" />
          </marker>
        </defs>

        {/* Ground surface */}
        <ellipse
          cx={centerX}
          cy={centerY + 50 * scale}
          rx={70 * scale}
          ry={20 * scale}
          fill="#1e293b"
          opacity="0.5"
        />

        {/* Precession path */}
        {hasGravity && effectiveTilt > 0 && (
          <ellipse
            cx={centerX}
            cy={centerY - 30 * scale}
            rx={Math.sin(effectiveTilt * Math.PI / 180) * 60 * scale}
            ry={Math.sin(effectiveTilt * Math.PI / 180) * 20 * scale}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity="0.5"
          />
        )}

        {/* Main top group */}
        <g transform={`rotate(${effectiveTilt}, ${centerX}, ${centerY + 50 * scale})`}>
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Spinning disk */}
            <g transform={`rotate(${topAngle})`}>
              <ellipse cx="0" cy="0" rx={40 * scale} ry={12 * scale} fill="url(#topDiskGrad)" />
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <line
                  key={i}
                  x1="0" y1="0"
                  x2={Math.cos(angle * Math.PI / 180) * 36 * scale}
                  y2={Math.sin(angle * Math.PI / 180) * 10 * scale}
                  stroke={i % 2 === 0 ? '#ef4444' : '#3b82f6'}
                  strokeWidth={3 * scale}
                  strokeLinecap="round"
                />
              ))}
              <circle cx="0" cy="0" r={6 * scale} fill="#4f46e5" />
            </g>

            {/* Cone body */}
            <polygon
              points={`0,${45 * scale} ${-30 * scale},${-8 * scale} ${30 * scale},${-8 * scale}`}
              fill="url(#topConeGrad)"
            />

            {/* Handle */}
            <rect
              x={-8 * scale} y={-35 * scale}
              width={16 * scale} height={28 * scale}
              rx={4 * scale}
              fill="#92400e"
            />

            {/* Knob */}
            <circle
              cx="0" cy={-35 * scale}
              r={10 * scale}
              fill="#facc15"
              stroke="#eab308"
              strokeWidth="2"
            />
          </g>

          {/* Angular momentum vector (L) */}
          {showVectors && (
            <line
              x1={centerX}
              y1={centerY - 10 * scale}
              x2={centerX}
              y2={centerY - 60 * scale - spinSpeed * 3 * scale}
              stroke="url(#angularMomentumGrad)"
              strokeWidth={4 * scale}
              markerEnd="url(#arrowGreen)"
              filter="url(#glow)"
            />
          )}
        </g>

        {/* Torque vector (perpendicular) */}
        {showVectors && hasGravity && effectiveTilt > 0 && (
          <line
            x1={centerX}
            y1={centerY - 10 * scale}
            x2={centerX + Math.cos(precessionAngle * Math.PI / 180 + Math.PI/2) * 50 * scale}
            y2={centerY - 10 * scale + Math.sin(precessionAngle * Math.PI / 180 + Math.PI/2) * 15 * scale}
            stroke="url(#torqueGrad)"
            strokeWidth={4 * scale}
            markerEnd="url(#arrowOrange)"
            filter="url(#glow)"
          />
        )}

        {/* Gravity vector */}
        {showVectors && hasGravity && (
          <line
            x1={centerX + 70 * scale}
            y1={centerY - 30 * scale}
            x2={centerX + 70 * scale}
            y2={centerY + 30 * scale}
            stroke="url(#gravityGrad)"
            strokeWidth={3 * scale}
            markerEnd="url(#arrowRed)"
          />
        )}

        {/* Labels - positioned to avoid overlap */}
        {showLabels && showVectors && (
          <>
            <text
              x={centerX + 15 * scale}
              y={centerY - 80 * scale}
              fill={colors.angular}
              fontSize={14 * scale}
              fontWeight="bold"
            >
              L (angular momentum)
            </text>
            {hasGravity && (
              <text
                x={centerX + 78 * scale}
                y={centerY + 45 * scale}
                fill={colors.error}
                fontSize={14 * scale}
                fontWeight="bold"
              >
                g (gravity)
              </text>
            )}
          </>
        )}
      </svg>
    );
  };

  // Earth Precession Visualization
  const EarthPrecessionVisualization = () => {
    const width = isMobile ? 320 : 350;
    const height = isMobile ? 250 : 280;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%' }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="earthGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} rx="12" fill={colors.bgCard} />

        {/* Stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 47) % (width - 20) + 10}
            cy={(i * 29) % 80 + 10}
            r={0.5 + (i % 3) * 0.5}
            fill="white"
            opacity={0.3 + (i % 4) * 0.2}
          />
        ))}

        {/* Precession circle */}
        <ellipse
          cx={width / 2}
          cy={60}
          rx={50}
          ry={16}
          fill="none"
          stroke={colors.warning}
          strokeWidth="2"
          strokeDasharray="6,4"
          opacity="0.6"
        />

        {/* Current "North Star" position */}
        <circle
          cx={width / 2 + Math.cos(earthPrecessionAngle * Math.PI / 180) * 50}
          cy={60 + Math.sin(earthPrecessionAngle * Math.PI / 180) * 16}
          r="8"
          fill="url(#starGlow)"
        />
        <circle
          cx={width / 2 + Math.cos(earthPrecessionAngle * Math.PI / 180) * 50}
          cy={60 + Math.sin(earthPrecessionAngle * Math.PI / 180) * 16}
          r="3"
          fill="#fef3c7"
        />

        {/* Earth */}
        <g transform={`translate(${width / 2}, ${height / 2 + 30})`}>
          <circle cx="0" cy="0" r="60" fill="url(#earthGrad)" />
          {/* Continents */}
          <ellipse cx="-15" cy="-10" rx="18" ry="25" fill="#22c55e" opacity="0.6" />
          <ellipse cx="22" cy="5" rx="15" ry="12" fill="#22c55e" opacity="0.6" />
          {/* Ice caps */}
          <ellipse cx="0" cy="-55" rx="20" ry="7" fill="white" opacity="0.5" />
          <ellipse cx="0" cy="55" rx="16" ry="6" fill="white" opacity="0.4" />
          {/* Axis */}
          <line
            x1={Math.sin(earthPrecessionAngle * Math.PI / 180) * 10}
            y1="-80"
            x2="0"
            y2="0"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx={Math.sin(earthPrecessionAngle * Math.PI / 180) * 10}
            cy="-80"
            r="6"
            fill="#ef4444"
          />
        </g>

        {/* Tilt angle label */}
        <text
          x={width / 2 + 75}
          y={height / 2 + 10}
          fill={colors.textSecondary}
          fontSize="11"
        >
          Tilt: {earthTiltAngle.toFixed(1)}deg
        </text>

        {/* Label */}
        <text
          x={width / 2}
          y={height - 15}
          textAnchor="middle"
          fill={colors.textMuted}
          fontSize="12"
        >
          26,000-year precession cycle
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'spin 3s linear infinite',
          }}>
            🌀
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Precession & Nutation
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            Why does a spinning top not fall over? The answer involves one of physics most elegant phenomena - and the same principles govern spacecraft, MRI machines, and Earth itself.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <SpinningTopVisualization size={200} showLabels={false} />
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', marginTop: '16px' }}>
              A spinning object defies gravity not by fighting it, but by dancing with it.
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Discover Precession
          </button>

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The axis stays fixed - it points the same direction' },
      { id: 'b', text: 'The axis slowly rotates around the vertical (precession)', correct: true },
      { id: 'c', text: 'The top immediately falls toward the ground' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
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
              A spinning top is tilted at an angle. What happens to the direction its spin axis points?
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <SpinningTopVisualization size={180} showLabels={false} />
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

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Interactive Precession Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust spin speed and tilt angle to observe how precession changes. This is important for real-world applications from spacecraft engineering to MRI technology. The relationship is described by the equation: P = mgr*sin(theta) / (I*omega)
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Observe: When you increase spin speed, notice how the precession rate decreases. When you increase tilt angle, watch how the rate increases. Try moving the spin speed slider from low to high and notice the curve shape - faster spin means slower precession due to greater angular momentum.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Graph and top visualization side by side on desktop */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
                <PrecessionRateGraph />
                <SpinningTopVisualization size={isMobile ? 180 : 200} showLabels={true} />
              </div>

              {/* Spin speed slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Spin Speed</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{spinSpeed.toFixed(1)} rad/s</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={spinSpeed}
                  onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
                  onInput={(e) => setSpinSpeed(parseFloat((e.target as HTMLInputElement).value))}
                  style={{
                    ...sliderStyle,
                    background: `linear-gradient(to right, ${colors.accent} 0%, ${colors.accent} ${((spinSpeed - 1) / 14) * 100}%, ${colors.border} ${((spinSpeed - 1) / 14) * 100}%, ${colors.border} 100%)`,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>1 rad/s (Slow)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>15 rad/s (Fast)</span>
                </div>
              </div>

              {/* Tilt angle slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Tilt Angle</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{tiltAngle}deg</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={tiltAngle}
                  onChange={(e) => setTiltAngle(parseInt(e.target.value))}
                  onInput={(e) => setTiltAngle(parseInt((e.target as HTMLInputElement).value))}
                  style={{
                    ...sliderStyle,
                    background: `linear-gradient(to right, ${colors.warning} 0%, ${colors.warning} ${((tiltAngle - 5) / 40) * 100}%, ${colors.border} ${((tiltAngle - 5) / 40) * 100}%, ${colors.border} 100%)`,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: colors.textMuted }}>5deg (Small tilt)</span>
                  <span style={{ ...typo.small, color: colors.textMuted }}>45deg (Large tilt)</span>
                </div>
              </div>

              {/* Control buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => setIsSpinning(!isSpinning)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSpinning ? colors.error : colors.success,
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSpinning ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => setShowVectors(!showVectors)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: showVectors ? colors.accent : 'transparent',
                    color: showVectors ? 'white' : colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showVectors ? 'Vectors On' : 'Vectors Off'}
                </button>
                <button
                  onClick={() => setHasGravity(!hasGravity)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: hasGravity ? colors.warning : 'transparent',
                    color: hasGravity ? 'white' : colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {hasGravity ? 'Gravity On' : 'Gravity Off'}
                </button>
              </div>

              {/* Stats display - comparison grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.angular }}>{(spinSpeed * 0.5).toFixed(1)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Angular Momentum (L)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.torque }}>{hasGravity ? (9.8 * Math.sin(tiltAngle * Math.PI / 180) * 0.1).toFixed(2) : '0'}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Torque (N*m)</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{precessionRate.toFixed(2)}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Precession Rate (rad/s)</div>
                </div>
              </div>
            </div>

            {/* Key insight */}
            <div style={{
              background: `${colors.angular}22`,
              border: `1px solid ${colors.angular}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
                <strong style={{ color: colors.angular }}>Key Insight:</strong> Gravity creates torque perpendicular to angular momentum (L). This torque does not make the top fall - it changes the <em>direction</em> of L, causing precession. The rate is proportional to torque and inversely proportional to angular momentum.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Physics
            </button>
          </div>

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '12px', textAlign: 'center' }}>
              The Physics of Precession & Nutation
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              As you observed in the experiment, the spinning top does not fall over. Your prediction was tested - and the result shows that gravity's torque causes the axis to trace a circle rather than topple.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Precession: The Circular Dance
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>The slow rotation of the spin axis around the vertical</li>
                  <li>Caused by gravity's torque on tilted angular momentum</li>
                  <li><strong>Faster spin = slower precession</strong> (inverse relationship)</li>
                  <li><strong>Greater tilt = faster precession</strong></li>
                </ul>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Nutation: The Wobble
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>A wobbling nodding motion superimposed on precession</li>
                  <li>The axis bobs up and down while precessing</li>
                  <li>Results from initial conditions when the top is released</li>
                  <li>Eventually damps out due to friction</li>
                </ul>
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
                The Key Equations
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '8px' }}><strong>Angular Momentum:</strong> L = I * omega (moment of inertia x angular velocity)</p>
                <p style={{ marginBottom: '8px' }}><strong>Torque:</strong> tau = r x F = m*g*r*sin(theta)</p>
                <p><strong>Precession Rate:</strong> Omega = tau / L = mgr / (I*omega)</p>
              </div>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Why It Does Not Fall
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Torque changes the direction of angular momentum, not its magnitude. Since tau is perpendicular to L, the torque continuously redirects L in a circle rather than reducing it. This is why a fast-spinning top resists falling - it has gyroscopic rigidity.
              </p>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Discover Earth's Wobble
            </button>
          </div>

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The tilt angle increases until Earth flips over' },
      { id: 'b', text: 'Earth gradually stops rotating' },
      { id: 'c', text: "Earth's axis precesses, changing the North Star over millennia", correct: true },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Scenario: Earth as a Giant Top
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Earth's axis is tilted at 23.5 degrees. The Sun and Moon pull on Earth's equatorial bulge. What happens over thousands of years?
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Earth is like a cosmic spinning top, tilted with respect to its orbit around the Sun...
              </p>
              <svg width="200" height="200" viewBox="0 0 200 200" style={{ maxWidth: '100%', margin: '16px auto' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <radialGradient id="twistEarthGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#93c5fd" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </radialGradient>
                </defs>
                <circle cx="100" cy="110" r="55" fill="url(#twistEarthGrad)" />
                <ellipse cx="85" cy="100" rx="15" ry="22" fill="#22c55e" opacity="0.6" />
                <ellipse cx="118" cy="112" rx="12" ry="10" fill="#22c55e" opacity="0.6" />
                <line x1="85" y1="30" x2="100" y2="110" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
                <circle cx="85" cy="30" r="5" fill="#EF4444" />
                <ellipse cx="100" cy="25" rx="35" ry="12" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5,3" opacity="0.6" />
                <text x="100" y="190" textAnchor="middle" fill={colors.textMuted} fontSize="12">23.5deg axial tilt</text>
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
                style={{
                  ...primaryButtonStyle,
                  background: `linear-gradient(135deg, ${colors.warning}, #D97706)`,
                }}
              >
                See Earth's Precession
              </button>
            )}
          </div>

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Earth's 26,000-Year Wobble
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Watch how Earth's axis traces a circle among the stars. Adjust the tilt angle to observe how it affects precession speed.
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
            }}>
              <EarthPrecessionVisualization />
            </div>

            {/* Earth tilt angle slider */}
            <div style={{ marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Earth Tilt Angle</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{earthTiltAngle.toFixed(1)}deg</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="0.5"
                value={earthTiltAngle}
                onChange={(e) => setEarthTiltAngle(parseFloat(e.target.value))}
                onInput={(e) => setEarthTiltAngle(parseFloat((e.target as HTMLInputElement).value))}
                style={{
                  ...sliderStyle,
                  background: `linear-gradient(to right, ${colors.warning} 0%, ${colors.warning} ${((earthTiltAngle - 10) / 30) * 100}%, ${colors.border} ${((earthTiltAngle - 10) / 30) * 100}%, ${colors.border} 100%)`,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>10deg (Low tilt)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>40deg (High tilt)</span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
              }}>
                <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
                  Current Era
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Polaris is our North Star. Ancient sailors used it for navigation. The Big Dipper points to it.
                </p>
              </div>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
              }}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>
                  In 12,000 Years
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Vega will become the new North Star. Constellations will appear in different seasonal positions.
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h2, color: colors.warning }}>3000 BCE</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Thuban was North Star</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h2, color: colors.accent }}>Today</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Polaris is North Star</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h2, color: colors.success }}>14000 CE</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Vega will be North Star</div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                background: `linear-gradient(135deg, ${colors.warning}, #D97706)`,
              }}
            >
              Understand the Impact
            </button>
          </div>

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Earth's Precession: Why It Matters
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>🌟</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Changing North Star</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The North Celestial Pole traces a circle among the stars over 26,000 years. Different stars become the North Star at different times in this cycle. Ancient Egyptians used Thuban; we use Polaris; future generations will use Vega.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>🌡</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Milankovitch Cycles</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Precession affects when seasons occur relative to Earth's elliptical orbit. This contributes to long-term climate cycles. When Northern Hemisphere summer coincides with Earth's closest approach to the Sun, summers are hotter and winters milder - contributing to ice age timing.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>📅</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Calendar Drift</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  The precession of the equinoxes was discovered by ancient Greek astronomer Hipparchus. It means the vernal equinox slowly shifts through the zodiac constellations - we are no longer in the Age of Pisces but moving into the Age of Aquarius.
                </p>
              </div>

              <div style={{
                background: `${colors.success}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.success}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>🔬</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Same Physics, Cosmic Scale</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Earth precesses for the same reason a top does: gravitational torque on a tilted spinning object. The Sun and Moon pull on Earth's equatorial bulge (Earth is wider at the equator), creating the torque that drives this 26,000-year dance.
                </p>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Explore Real-World Applications
            </button>
          </div>

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Precession Nutation"
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '800px', margin: '20px auto 0' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length} - Explore all applications to continue
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
                      OK
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
                  How Precession Applies:
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
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  Technical Details:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.howItWorks}
                </p>
              </div>

              <div style={{
                background: `${app.color}11`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                border: `1px solid ${app.color}33`,
              }}>
                <h4 style={{ ...typo.small, color: app.color, marginBottom: '8px', fontWeight: 600 }}>
                  Future Impact:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.futureImpact}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                  Key Examples:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {app.examples.map((ex, i) => (
                    <span key={i} style={{
                      ...typo.small,
                      color: colors.textPrimary,
                      background: colors.bgSecondary,
                      padding: '6px 12px',
                      borderRadius: '6px',
                    }}>
                      {ex}
                    </span>
                  ))}
                </div>
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

            {/* Got It / Continue button for current app */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Auto-advance to next incomplete app
                const nextIncomplete = newCompleted.findIndex(c => !c);
                if (nextIncomplete >= 0) {
                  setSelectedApp(nextIncomplete);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginBottom: '16px',
                background: completedApps[selectedApp]
                  ? colors.success
                  : `linear-gradient(135deg, ${app.color}, ${colors.accent})`,
              }}
            >
              {completedApps[selectedApp] ? 'Got It - Completed' : 'Got It - Continue'}
            </button>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
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
        }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

            <div style={{ maxWidth: '600px', margin: '20px auto 0', textAlign: 'center' }}>
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
                  ? 'You understand precession and nutation physics!'
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

            {renderNavigationBar()}
          {renderNavDots()}
          </div>
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

          <div style={{ maxWidth: '700px', margin: '20px auto 0' }}>
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

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
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
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>

          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Precession & Nutation Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand one of physics most elegant phenomena - from spinning tops to spacecraft to planet Earth!
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Key Concepts Mastered:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Torque causes precession by changing angular momentum direction',
                'Faster spin means slower precession (inverse relationship)',
                'Nutation is wobbling superimposed on precession',
                "Earth's 26,000-year precession changes the North Star",
                'CMGs use precession for fuel-free spacecraft rotation',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>OK</span>
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

          {renderNavigationBar()}
          {renderNavDots()}
        </div>
      </div>
    );
  }

  return null;
};

export default PrecessionNutationRenderer;
