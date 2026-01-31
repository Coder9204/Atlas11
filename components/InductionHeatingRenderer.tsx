'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
// String phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface InductionHeatingRendererProps {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_QUESTIONS = [
  {
    question: 'What causes metal to heat up in an induction cooktop?',
    options: [
      { text: 'Direct heat from burning gas', correct: false },
      { text: 'Radiation from a hot coil', correct: false },
      { text: 'Eddy currents induced in the metal pan', correct: true },
      { text: 'Microwaves penetrating the food', correct: false }
    ]
  },
  {
    question: 'Why doesn\'t a glass pan heat up on an induction stove?',
    options: [
      { text: 'Glass is already too hot', correct: false },
      { text: 'Glass is an insulator - no eddy currents form', correct: true },
      { text: 'The magnetic field passes through glass too fast', correct: false },
      { text: 'Glass reflects the magnetic field', correct: false }
    ]
  },
  {
    question: 'How do eddy currents cause heating?',
    options: [
      { text: 'They create friction with air molecules', correct: false },
      { text: 'They flow through resistance, converting electrical energy to heat (I²R)', correct: true },
      { text: 'They vibrate at ultrasonic frequencies', correct: false },
      { text: 'They create sparks inside the metal', correct: false }
    ]
  },
  {
    question: 'Why is induction cooking more efficient than gas?',
    options: [
      { text: 'It uses more electricity', correct: false },
      { text: 'Heat is generated directly in the pan, not wasted on air', correct: true },
      { text: 'Gas burners are turned down', correct: false },
      { text: 'Induction uses nuclear energy', correct: false }
    ]
  },
  {
    question: 'What property must a pan have to work on an induction cooktop?',
    options: [
      { text: 'It must be heavy', correct: false },
      { text: 'It must be magnetic (ferromagnetic)', correct: true },
      { text: 'It must be polished', correct: false },
      { text: 'It must be black in color', correct: false }
    ]
  },
  {
    question: 'Why do eddy currents flow in circular paths?',
    options: [
      { text: 'Because electrons prefer circles', correct: false },
      { text: 'Because the changing magnetic field induces circular EMF', correct: true },
      { text: 'Because metal is always round', correct: false },
      { text: 'Because of gravity', correct: false }
    ]
  },
  {
    question: 'What happens when you increase the frequency of the magnetic field?',
    options: [
      { text: 'Heating decreases', correct: false },
      { text: 'Heating increases (more rapid field changes = stronger currents)', correct: true },
      { text: 'Nothing changes', correct: false },
      { text: 'The pan flies off the stove', correct: false }
    ]
  },
  {
    question: 'Why is the cooktop surface cool while the pan is hot?',
    options: [
      { text: 'The cooktop is made of special ice', correct: false },
      { text: 'Heat only transfers up, not down', correct: false },
      { text: 'The ceramic doesn\'t conduct electricity - no eddy currents form in it', correct: true },
      { text: 'The cooktop has a cooling system', correct: false }
    ]
  },
  {
    question: 'What is the relationship described by P = I²R?',
    options: [
      { text: 'Power loss increases with the square of the current', correct: true },
      { text: 'Pressure equals current times resistance', correct: false },
      { text: 'Temperature is proportional to resistance', correct: false },
      { text: 'Voltage equals current squared', correct: false }
    ]
  },
  {
    question: 'Why are induction furnaces used for melting high-purity metals?',
    options: [
      { text: 'They are cheaper', correct: false },
      { text: 'No combustion gases contaminate the melt', correct: true },
      { text: 'They melt faster than any other method', correct: false },
      { text: 'They use less electricity', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Induction Cooktops',
    description: 'Oscillating field creates eddy currents in steel/iron pans. 80-90% efficient vs 40% for gas!',
    icon: '🍳'
  },
  {
    title: 'Metal Hardening',
    description: 'Rapid surface heating hardens tool steel without affecting the core. Used for gears and shafts.',
    icon: '⚙️'
  },
  {
    title: 'Induction Furnaces',
    description: 'Melt metals without contamination from fuel combustion. Essential for high-purity alloys.',
    icon: '🔥'
  },
  {
    title: 'Wireless Charging',
    description: 'Similar principle! Oscillating field induces current in your phone\'s receiver coil.',
    icon: '🔋'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const InductionHeatingRenderer: React.FC<InductionHeatingRendererProps> = ({ currentPhase, onPhaseComplete }) => {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(4).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [isHeating, setIsHeating] = useState(false);
  const [panMaterial, setPanMaterial] = useState<'steel' | 'aluminum' | 'glass' | 'copper'>('steel');
  const [temperature, setTemperature] = useState(25);
  const [frequency, setFrequency] = useState(25); // kHz
  const [fieldPhase, setFieldPhase] = useState(0);

  // Twist state
  const [twistMaterial, setTwistMaterial] = useState<'steel' | 'aluminum' | 'glass'>('steel');

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

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

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const handlePrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(pred);
    setShowPredictionFeedback(true);
    playSound(pred === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTwistPrediction = useCallback((pred: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(pred);
    setShowTwistFeedback(true);
    playSound(pred === 'B' ? 'success' : 'failure');
  }, [playSound]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  const calculateScore = () => testAnswers.reduce((score, answer, index) => score + (answer === TEST_QUESTIONS[index].correct ? 1 : 0), 0);

  // ─── Animation Effect ────────────────────────────────────────────────────────
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

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setIsHeating(false);
      setPanMaterial('steel');
      setTemperature(25);
      setFrequency(25);
    }
    if (phase === 'twist_play') {
      setTwistMaterial('steel');
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────

  const renderInductionCooktop = (material: string, temp: number, heating: boolean, animPhase: number) => {
    const props = getMaterialProperties(material);
    const hasEddyCurrents = heating && props.conductivity > 0;

    // Calculate temperature-based colors for the heated object
    const getTempGradientId = () => {
      if (temp > 300) return 'indhTempHot';
      if (temp > 150) return 'indhTempMedium';
      if (temp > 50) return 'indhTempWarm';
      return 'indhTempCool';
    };

    return (
      <svg viewBox="0 0 500 340" className="w-full h-64">
        <defs>
          {/* === PREMIUM GRADIENT DEFINITIONS === */}

          {/* Lab background gradient */}
          <linearGradient id="indhLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Ceramic cooktop surface gradient */}
          <linearGradient id="indhCeramicSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="20%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="80%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Copper coil metallic gradient */}
          <linearGradient id="indhCopperCoil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc8a5f" />
            <stop offset="20%" stopColor="#c2410c" />
            <stop offset="40%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#c2410c" />
            <stop offset="80%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>

          {/* Steel pan metallic gradient */}
          <linearGradient id="indhSteelPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9ca3af" />
            <stop offset="20%" stopColor="#6b7280" />
            <stop offset="40%" stopColor="#9ca3af" />
            <stop offset="60%" stopColor="#4b5563" />
            <stop offset="80%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Aluminum pan gradient */}
          <linearGradient id="indhAluminumPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="25%" stopColor="#d1d5db" />
            <stop offset="50%" stopColor="#e5e7eb" />
            <stop offset="75%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>

          {/* Glass pan gradient with transparency */}
          <linearGradient id="indhGlassPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
            <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.5" />
          </linearGradient>

          {/* Copper cookware gradient */}
          <linearGradient id="indhCopperPan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* === TEMPERATURE GRADIENTS FOR HEATED OBJECT === */}

          {/* Cool temperature (room temp) */}
          <linearGradient id="indhTempCool" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>

          {/* Warm temperature (50-150C) */}
          <linearGradient id="indhTempWarm" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Medium temperature (150-300C) */}
          <linearGradient id="indhTempMedium" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#9a3412" />
            <stop offset="30%" stopColor="#c2410c" />
            <stop offset="60%" stopColor="#ea580c" />
            <stop offset="85%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>

          {/* Hot temperature (300C+) */}
          <linearGradient id="indhTempHot" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="25%" stopColor="#991b1b" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="75%" stopColor="#ef4444" />
            <stop offset="90%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          {/* === RADIAL GRADIENTS FOR GLOW EFFECTS === */}

          {/* Coil heat glow */}
          <radialGradient id="indhCoilGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#ea580c" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#c2410c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
          </radialGradient>

          {/* Magnetic field glow */}
          <radialGradient id="indhFieldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>

          {/* Eddy current glow */}
          <radialGradient id="indhEddyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#ea580c" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
          </radialGradient>

          {/* Pan interior shadow */}
          <radialGradient id="indhPanInterior" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#1e293b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>

          {/* Handle wood grain gradient */}
          <linearGradient id="indhHandleWood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#292524" />
            <stop offset="25%" stopColor="#44403c" />
            <stop offset="50%" stopColor="#292524" />
            <stop offset="75%" stopColor="#44403c" />
            <stop offset="100%" stopColor="#1c1917" />
          </linearGradient>

          {/* === GLOW FILTERS === */}

          {/* Coil glow filter */}
          <filter id="indhCoilBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Eddy current glow filter */}
          <filter id="indhEddyBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Magnetic field glow filter */}
          <filter id="indhFieldBlur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Temperature glow filter */}
          <filter id="indhTempGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Control panel LED glow */}
          <filter id="indhLedGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" />
          </filter>

          {/* Arrow marker for field lines */}
          <marker id="indhArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#3b82f6" />
          </marker>

          {/* Grid pattern for lab background */}
          <pattern id="indhLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* === BACKGROUND === */}
        <rect width="500" height="340" fill="url(#indhLabBg)" />
        <rect width="500" height="340" fill="url(#indhLabGrid)" />

        {/* === COOKTOP UNIT === */}
        <g transform="translate(50, 180)">
          {/* Main cooktop body */}
          <rect x="0" y="0" width="400" height="60" rx="8" fill="#111827" stroke="#374151" strokeWidth="2" />

          {/* Ceramic surface */}
          <rect x="5" y="5" width="390" height="25" rx="4" fill="url(#indhCeramicSurface)" />

          {/* Cooking zone ring (visual indicator) */}
          <ellipse cx="200" cy="17" rx="85" ry="12" fill="none" stroke={heating ? '#f97316' : '#374151'} strokeWidth="2" strokeDasharray="4,2" opacity={heating ? 0.8 : 0.3} />
        </g>

        {/* === INDUCTION COIL (under ceramic surface) === */}
        <g transform="translate(250, 195)">
          {/* Coil glow background when heating */}
          {heating && (
            <ellipse cx="0" cy="0" rx="90" ry="18" fill="url(#indhCoilGlow)" opacity={0.6 + Math.sin(animPhase) * 0.2} />
          )}

          {/* Copper coil windings */}
          {[...Array(6)].map((_, i) => {
            const radius = 20 + i * 14;
            const yRadius = 4 + i * 2.5;
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
                stroke={isActive ? 'url(#indhCopperCoil)' : '#78350f'}
                strokeWidth={isActive ? 4 : 3}
                opacity={pulseOpacity}
                filter={isActive ? 'url(#indhCoilBlur)' : undefined}
              />
            );
          })}

          {/* Center connection point */}
          <circle cx="0" cy="0" r="8" fill="#292524" stroke="#c2410c" strokeWidth="2" />
        </g>

        {/* === OSCILLATING MAGNETIC FIELD VISUALIZATION === */}
        {heating && (
          <g transform="translate(250, 140)">
            {/* Field lines going up */}
            {[-60, -30, 0, 30, 60].map((xOffset, i) => {
              const phaseOffset = i * 0.4;
              const amplitude = 25 + Math.sin(animPhase + phaseOffset) * 15;
              const opacity = 0.4 + Math.sin(animPhase + phaseOffset) * 0.3;

              return (
                <g key={i} filter="url(#indhFieldBlur)">
                  <path
                    d={`M ${xOffset} 50 Q ${xOffset + Math.sin(animPhase + phaseOffset) * 8} ${50 - amplitude / 2} ${xOffset} ${50 - amplitude}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    opacity={opacity}
                    markerEnd="url(#indhArrow)"
                  />
                </g>
              );
            })}

            {/* "B" field label */}
            <text x="90" y="25" className="text-xs fill-blue-400 font-bold" style={{ fontSize: '11px' }}>
              B(t)
            </text>
            <text x="90" y="38" className="text-[9px] fill-blue-300" style={{ fontSize: '9px' }}>
              oscillating
            </text>
          </g>
        )}

        {/* === PAN WITH TEMPERATURE GRADIENT === */}
        <g transform="translate(250, 130)">
          {/* Pan shadow */}
          <ellipse cx="3" cy="48" rx="85" ry="18" fill="#000000" opacity="0.3" />

          {/* Pan bottom (shows temperature) */}
          <ellipse
            cx="0"
            cy="45"
            rx="82"
            ry="16"
            fill={`url(#${getTempGradientId()})`}
            filter={temp > 100 ? 'url(#indhTempGlow)' : undefined}
          />

          {/* Pan body */}
          <ellipse cx="0" cy="-30" rx="82" ry="22" fill={
            material === 'steel' ? 'url(#indhSteelPan)' :
            material === 'aluminum' ? 'url(#indhAluminumPan)' :
            material === 'glass' ? 'url(#indhGlassPan)' :
            'url(#indhCopperPan)'
          } />

          {/* Pan sides */}
          <path
            d={`M -82 -30 L -82 45 A 82 16 0 0 0 82 45 L 82 -30`}
            fill={
              material === 'steel' ? 'url(#indhSteelPan)' :
              material === 'aluminum' ? 'url(#indhAluminumPan)' :
              material === 'glass' ? 'url(#indhGlassPan)' :
              'url(#indhCopperPan)'
            }
            stroke={material === 'glass' ? '#60a5fa' : '#374151'}
            strokeWidth="1"
          />

          {/* Pan interior */}
          <ellipse cx="0" cy="-30" rx="72" ry="17" fill="url(#indhPanInterior)" />

          {/* Pan rim highlight */}
          <ellipse cx="0" cy="-30" rx="82" ry="22" fill="none" stroke={material === 'glass' ? '#93c5fd' : '#9ca3af'} strokeWidth="1" opacity="0.5" />

          {/* Handle */}
          <g transform="translate(82, 0)">
            <rect x="0" y="-10" width="65" height="20" rx="4" fill="url(#indhHandleWood)" stroke="#44403c" strokeWidth="1" />
            {/* Handle rivets */}
            <circle cx="15" cy="0" r="3" fill="#374151" stroke="#4b5563" strokeWidth="1" />
            <circle cx="50" cy="0" r="3" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          </g>

          {/* === EDDY CURRENT VISUALIZATION === */}
          {hasEddyCurrents && (
            <g filter="url(#indhEddyBlur)">
              {/* Multiple swirling eddy current loops */}
              {[0, 1, 2, 3].map((ring) => {
                const baseRadius = 55 - ring * 12;
                const yRadius = 12 - ring * 2.5;
                const rotationOffset = (animPhase * (ring % 2 === 0 ? 1 : -1) * 2) % 360;
                const dashOffset = animPhase * 30 * (ring % 2 === 0 ? 1 : -1);
                const opacity = 0.8 - ring * 0.15;
                const strokeColor = temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : '#fbbf24';

                return (
                  <g key={ring} style={{ transform: `rotate(${rotationOffset}deg)`, transformOrigin: '0px 5px' }}>
                    <ellipse
                      cx="0"
                      cy={5 + ring * 8}
                      rx={baseRadius}
                      ry={yRadius}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={3 - ring * 0.4}
                      strokeDasharray="12,6,4,6"
                      strokeDashoffset={dashOffset}
                      opacity={opacity}
                    />
                    {/* Arrow indicators showing current direction */}
                    {ring === 0 && (
                      <>
                        <circle cx={baseRadius - 5} cy={5} r="3" fill={strokeColor} opacity={0.9}>
                          <animate attributeName="opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={-baseRadius + 5} cy={5} r="3" fill={strokeColor} opacity={0.9}>
                          <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite" />
                        </circle>
                      </>
                    )}
                  </g>
                );
              })}

              {/* I²R heating indicator */}
              <text x="0" y="-5" textAnchor="middle" className="fill-orange-300 font-bold" style={{ fontSize: '10px' }}>
                I²R
              </text>
            </g>
          )}

          {/* No heating indicator for glass */}
          {material === 'glass' && heating && (
            <g>
              <rect x="-50" y="-10" width="100" height="24" rx="4" fill="#1e3a5f" opacity="0.9" />
              <text x="0" y="5" textAnchor="middle" className="fill-blue-300 font-bold" style={{ fontSize: '11px' }}>
                No eddy currents!
              </text>
              <text x="0" y="18" textAnchor="middle" className="fill-blue-400" style={{ fontSize: '8px' }}>
                (insulator)
              </text>
            </g>
          )}
        </g>

        {/* === TEMPERATURE DISPLAY === */}
        <g transform="translate(30, 25)">
          <rect x="0" y="0" width="90" height="55" rx="8" fill="#111827" stroke="#374151" strokeWidth="2" />
          <rect x="4" y="4" width="82" height="47" rx="6" fill="#0f172a" />
          <text x="45" y="18" textAnchor="middle" className="fill-slate-400" style={{ fontSize: '10px' }}>PAN TEMP</text>
          <text
            x="45"
            y="42"
            textAnchor="middle"
            className={`font-bold ${temp > 200 ? 'fill-red-400' : temp > 100 ? 'fill-orange-400' : temp > 50 ? 'fill-amber-400' : 'fill-slate-300'}`}
            style={{ fontSize: '18px' }}
          >
            {temp.toFixed(0)}°C
          </text>
        </g>

        {/* === MATERIAL DISPLAY === */}
        <g transform="translate(380, 25)">
          <rect x="0" y="0" width="90" height="55" rx="8" fill="#111827" stroke="#374151" strokeWidth="2" />
          <rect x="4" y="4" width="82" height="47" rx="6" fill="#0f172a" />
          <text x="45" y="18" textAnchor="middle" className="fill-slate-400" style={{ fontSize: '10px' }}>MATERIAL</text>
          <text x="45" y="42" textAnchor="middle" className="fill-white font-bold" style={{ fontSize: '14px', textTransform: 'capitalize' }}>
            {material}
          </text>
        </g>

        {/* === POWER STATUS === */}
        <g transform="translate(175, 265)">
          <rect x="0" y="0" width="150" height="50" rx="8" fill="#111827" stroke="#374151" strokeWidth="2" />
          <rect x="4" y="4" width="142" height="42" rx="6" fill="#0f172a" />

          {/* LED indicator */}
          <circle cx="25" cy="25" r="8" fill={heating ? '#22c55e' : '#374151'} filter={heating ? 'url(#indhLedGlow)' : undefined}>
            {heating && <animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite" />}
          </circle>
          <circle cx="25" cy="25" r="5" fill={heating ? '#4ade80' : '#4b5563'} />

          <text x="85" y="20" textAnchor="middle" className="fill-slate-400" style={{ fontSize: '10px' }}>INDUCTION</text>
          <text
            x="85"
            y="36"
            textAnchor="middle"
            className={`font-bold ${heating ? 'fill-orange-400' : 'fill-slate-500'}`}
            style={{ fontSize: '14px' }}
          >
            {heating ? 'ACTIVE' : 'STANDBY'}
          </text>
        </g>

        {/* === LABELS === */}
        <text x="250" y="310" textAnchor="middle" className="fill-slate-500" style={{ fontSize: '10px' }}>
          INDUCTION COOKTOP SIMULATION
        </text>
      </svg>
    );
  };

  const renderEddyCurrentDiagram = () => (
    <svg viewBox="0 0 400 180" className="w-full h-40">
      <defs>
        {/* Background gradient */}
        <linearGradient id="indhDiagBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#030712" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#030712" />
        </linearGradient>

        {/* Metal conductor gradient */}
        <linearGradient id="indhDiagMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="25%" stopColor="#6b7280" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="75%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>

        {/* Magnetic field glow */}
        <radialGradient id="indhDiagFieldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
        </radialGradient>

        {/* Eddy current glow */}
        <radialGradient id="indhDiagEddyGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>

        {/* Glow filters */}
        <filter id="indhDiagBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Arrow marker */}
        <marker id="indhDiagArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 L3,5 Z" fill="#fbbf24" />
        </marker>

        <marker id="indhDiagArrowBlue" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#3b82f6" />
        </marker>
      </defs>

      <rect width="400" height="180" fill="url(#indhDiagBg)" />

      {/* Changing B field */}
      <g transform="translate(80, 90)">
        <text x="0" y="-60" textAnchor="middle" className="fill-slate-300 font-semibold" style={{ fontSize: '11px' }}>Changing B Field</text>

        {/* Field glow */}
        <circle r="45" fill="url(#indhDiagFieldGlow)" />

        {/* Field lines circle */}
        <circle r="38" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" filter="url(#indhDiagBlur)">
          <animate attributeName="stroke-dashoffset" values="0;20" dur="1s" repeatCount="indefinite" />
        </circle>

        {/* Oscillating arrow */}
        <path d="M 0 -25 L 0 25" stroke="#60a5fa" strokeWidth="4" markerEnd="url(#indhDiagArrowBlue)" filter="url(#indhDiagBlur)">
          <animate attributeName="d" values="M 0 -25 L 0 25;M 0 25 L 0 -25;M 0 -25 L 0 25" dur="0.8s" repeatCount="indefinite" />
        </path>

        <text x="0" y="58" textAnchor="middle" className="fill-blue-400 font-bold" style={{ fontSize: '12px' }}>B(t)</text>
      </g>

      {/* Induces arrow */}
      <g transform="translate(145, 90)">
        <path d="M 0 0 L 50 0" stroke="#fbbf24" strokeWidth="3" markerEnd="url(#indhDiagArrow)" />
        <text x="25" y="20" textAnchor="middle" className="fill-amber-400 font-semibold" style={{ fontSize: '10px' }}>induces</text>
      </g>

      {/* Eddy currents in conductor */}
      <g transform="translate(280, 90)">
        <text x="0" y="-60" textAnchor="middle" className="fill-slate-300 font-semibold" style={{ fontSize: '11px' }}>Metal Conductor</text>

        {/* Metal block */}
        <rect x="-55" y="-40" width="110" height="80" rx="6" fill="url(#indhDiagMetal)" stroke="#4b5563" strokeWidth="1" />

        {/* Eddy glow */}
        <ellipse cx="0" cy="0" rx="40" ry="25" fill="url(#indhDiagEddyGlow)" />

        {/* Swirling currents - animated */}
        <ellipse cx="0" cy="0" rx="35" ry="20" fill="none" stroke="#f97316" strokeWidth="2.5" strokeDasharray="8,4" filter="url(#indhDiagBlur)">
          <animate attributeName="stroke-dashoffset" values="0;24" dur="0.5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="0" rx="22" ry="12" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,3" filter="url(#indhDiagBlur)">
          <animate attributeName="stroke-dashoffset" values="18;0" dur="0.5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="0" rx="10" ry="5" fill="none" stroke="#fbbf24" strokeWidth="1.5">
          <animate attributeName="stroke-dashoffset" values="0;12" dur="0.4s" repeatCount="indefinite" />
        </ellipse>

        {/* I²R label */}
        <text x="0" y="3" textAnchor="middle" className="fill-white font-bold" style={{ fontSize: '10px' }}>I²R</text>

        <text x="0" y="58" textAnchor="middle" className="fill-orange-400 font-bold" style={{ fontSize: '11px' }}>Eddy Currents</text>
        <text x="0" y="72" textAnchor="middle" className="fill-orange-300" style={{ fontSize: '9px' }}>generate heat</text>
      </g>
    </svg>
  );

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-red-200 bg-clip-text text-transparent">
        Heat Without Contact
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how invisible magnetic fields can cook your dinner
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 rounded-3xl" />

        <div className="relative">
          {renderInductionCooktop('steel', 25, false, 0)}

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Induction cooktops boil water in seconds, yet stay cool to touch!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              The heat is generated inside the pan itself, not transferred from the stove.
            </p>
            <div className="pt-2">
              <p className="text-base text-orange-400 font-semibold">
                How does invisible energy create visible heat?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          An oscillating magnetic field passes through a metal pan. What happens inside the metal?
        </p>
        {renderInductionCooktop('steel', 25, false, 0)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The metal vibrates like a speaker' },
          { id: 'B', text: 'Circular currents form and heat the metal (I²R)' },
          { id: 'C', text: 'The metal becomes a permanent magnet' },
          { id: 'D', text: 'Nothing - magnetism doesn\'t affect metal' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
            disabled={showPredictionFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && prediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Eddy currents induced by the changing field flow through resistance and generate heat!
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Induction Heating Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderInductionCooktop(panMaterial, temperature, isHeating, fieldPhase)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Pan Material</label>
          <div className="grid grid-cols-2 gap-2">
            {(['steel', 'aluminum', 'glass', 'copper'] as const).map(mat => (
              <button
                key={mat}
                onMouseDown={(e) => { e.preventDefault(); playSound('click'); setPanMaterial(mat); setTemperature(25); }}
                className={`px-3 py-2 rounded-lg font-bold text-sm capitalize ${panMaterial === mat ? 'bg-orange-600 text-white' : 'bg-slate-600 text-slate-300'}`}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Frequency: {frequency} kHz</label>
          <input type="range" min="10" max="50" value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full accent-orange-500" />
          <p className="text-xs text-slate-400 mt-1">Higher frequency = faster heating</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold ${temperature > 100 ? 'text-red-400' : 'text-orange-400'}`}>{temperature.toFixed(0)}°C</div>
            <div className="text-sm text-slate-300">Temperature</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{getMaterialProperties(panMaterial).magnetic ? 'Yes' : 'No'}</div>
            <div className="text-sm text-slate-300">Magnetic</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${getMaterialProperties(panMaterial).heatingRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {getMaterialProperties(panMaterial).heatingRate > 0.5 ? 'HEATING' : getMaterialProperties(panMaterial).heatingRate > 0 ? 'SLOW' : 'NONE'}
            </div>
            <div className="text-sm text-slate-300">Status</div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-6">
        <button onMouseDown={(e) => { e.preventDefault(); playSound('click'); setIsHeating(!isHeating); }} className={`px-4 py-2 rounded-lg font-medium ${isHeating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}>
          {isHeating ? 'Turn Off' : 'Turn On'}
        </button>
      </div>
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-orange-400 mb-2">Key Formula: P = I²R</h3>
        <p className="text-slate-300 text-sm">
          {panMaterial === 'glass' ? 'Glass is an insulator - no eddy currents, no heating!' :
           panMaterial === 'aluminum' || panMaterial === 'copper' ? 'Non-magnetic metal heats slowly (fewer eddy currents)' :
           'Steel heats efficiently - magnetic + conductive!'}
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); setIsHeating(false); goToNextPhase(); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl">
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Induction Heating</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-orange-400 mb-3">How It Works</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>A coil creates an oscillating magnetic field</li>
            <li>Changing field induces circular currents (eddy currents)</li>
            <li>Currents flow through resistance and generate heat (P = I²R)</li>
            <li>Heat is generated directly in the pan!</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Best Materials</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Iron/Steel: Magnetic + resistive = fast heating</li>
            <li>Cast iron: Excellent for induction cooking</li>
            <li>Higher resistance = more I²R heating</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">Poor Materials</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>Glass: No free electrons, no currents</li>
            <li>Aluminum: Low resistance, weak heating</li>
            <li>Copper: Too conductive, currents flow too easily</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Efficiency</h3>
          <p className="text-slate-300 text-sm">
            Induction: 80-90% efficient (heat generated directly in pan)<br/>
            Gas: Only 40% efficient (heat escapes into air)
          </p>
        </div>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }} className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        Discover the Material Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Material Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Why do induction cooktops require special pans? What happens if you use aluminum or glass?
        </p>
        <p className="text-lg text-orange-400 font-medium">
          What determines if a material heats up on an induction stove?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'All pans work equally well' },
          { id: 'B', text: 'Non-magnetic/non-conducting pans don\'t heat (or heat poorly)' },
          { id: 'C', text: 'The cooktop will break if wrong pan is used' },
          { id: 'D', text: 'All metal pans work, only glass fails' }
        ].map(option => (
          <button
            key={option.id}
            onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
            disabled={showTwistFeedback}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>
      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Only magnetic, conductive materials heat effectively on induction!
          </p>
          <button onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }} className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
            Compare Materials
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const materialProps: Record<string, { heats: boolean; rate: string; reason: string; color: string }> = {
      steel: { heats: true, rate: 'Fast', reason: 'Magnetic + moderate resistance = strong eddy currents + I²R heating', color: 'orange' },
      aluminum: { heats: true, rate: 'Slow', reason: 'Conductive but non-magnetic - weak eddy currents', color: 'amber' },
      glass: { heats: false, rate: 'None', reason: 'No free electrons - no currents can form!', color: 'blue' }
    };
    const props = materialProps[twistMaterial];

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Material Comparison Lab</h2>
        <div className="flex gap-3 mb-6">
          {(['steel', 'aluminum', 'glass'] as const).map(mat => (
            <button
              key={mat}
              onMouseDown={(e) => { e.preventDefault(); playSound('click'); setTwistMaterial(mat); }}
              className={`px-5 py-2 rounded-lg font-bold capitalize transition-all ${twistMaterial === mat ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {mat}
            </button>
          ))}
        </div>
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
          {renderInductionCooktop(twistMaterial === 'aluminum' ? 'aluminum' : twistMaterial === 'glass' ? 'glass' : 'steel', 25, true, fieldPhase)}
        </div>
        <div className={`p-6 rounded-2xl border-2 max-w-md ${props.heats ? 'bg-orange-900/30 border-orange-600' : 'bg-blue-900/30 border-blue-600'}`}>
          <div className="text-center mb-4">
            <span className={`text-3xl font-bold ${props.heats ? 'text-orange-400' : 'text-blue-400'}`}>
              Heating: {props.rate}
            </span>
          </div>
          <p className={`text-center text-lg ${props.heats ? 'text-orange-300' : 'text-blue-300'}`}>
            <span className="font-bold">{twistMaterial.charAt(0).toUpperCase() + twistMaterial.slice(1)}:</span> {props.reason}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-md">
          {Object.entries(materialProps).map(([mat, p]) => (
            <div key={mat} className={`p-3 rounded-lg ${mat === twistMaterial ? 'bg-slate-600' : 'bg-slate-700'}`}>
              <p className="text-white text-xs font-bold capitalize text-center">{mat}</p>
              <p className={`text-xs text-center ${p.heats ? 'text-orange-400' : 'text-blue-400'}`}>{p.rate}</p>
            </div>
          ))}
        </div>
        <button onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
          Understand Why
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Why Material Matters</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-cyan-400 mb-3">Two Key Properties for Induction</h3>
        <ul className="space-y-2 text-slate-300">
          <li>1. Electrical conductivity - for currents to flow</li>
          <li>2. Magnetic permeability - for stronger field coupling</li>
        </ul>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-xl">
        <div className="p-4 bg-emerald-900/40 rounded-xl border border-emerald-600 text-center">
          <p className="text-emerald-400 font-bold">Steel/Cast Iron</p>
          <p className="text-slate-400 text-xs mt-1">Conductive + Magnetic</p>
          <p className="text-emerald-300 text-sm font-bold mt-2">BEST</p>
        </div>
        <div className="p-4 bg-amber-900/40 rounded-xl border border-amber-600 text-center">
          <p className="text-amber-400 font-bold">Aluminum</p>
          <p className="text-slate-400 text-xs mt-1">Conductive, Not magnetic</p>
          <p className="text-amber-300 text-sm font-bold mt-2">POOR</p>
        </div>
        <div className="p-4 bg-red-900/40 rounded-xl border border-red-600 text-center">
          <p className="text-red-400 font-bold">Glass</p>
          <p className="text-slate-400 text-xs mt-1">Insulator, Not magnetic</p>
          <p className="text-red-300 text-sm font-bold mt-2">NONE</p>
        </div>
      </div>
      <div className="mt-6 p-4 bg-amber-900/30 rounded-xl border border-amber-600 max-w-xl">
        <p className="text-amber-300 text-sm">
          <strong>Pro Tip:</strong> Induction-ready aluminum pans have a steel plate bonded to the bottom!
        </p>
      </div>
      <button onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Real-World Applications</h2>
      <p className="text-slate-400 mb-6">Explore how induction heating powers modern industry</p>
      <div className="flex border-b border-slate-700 mb-6 max-w-xl w-full">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(i); handleAppComplete(i); }}
            className={`flex-1 py-3 text-center transition-all ${activeAppTab === i ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-xl">{app.icon}</span>
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-xl w-full">
        <h3 className="text-xl font-bold text-orange-400 mb-3">{TRANSFER_APPS[activeAppTab].title}</h3>
        <p className="text-slate-300">{TRANSFER_APPS[activeAppTab].description}</p>
        {completedApps.has(activeAppTab) && (
          <div className="mt-4 text-emerald-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Explored
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-6">
        {TRANSFER_APPS.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${completedApps.has(i) ? 'bg-emerald-400' : 'bg-slate-600'}`} />
        ))}
      </div>
      {completedApps.size >= 4 ? (
        <button onMouseDown={(e) => { e.preventDefault(); goToNextPhase(); }} className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl">
          Take the Test
        </button>
      ) : (
        <p className="mt-6 text-slate-500 text-sm">Explore all applications to continue ({completedApps.size}/4)</p>
      )}
    </div>
  );

  const renderTest = () => {
    const score = calculateScore();
    const allAnswered = testAnswers.every(a => a !== -1);

    if (showTestResults) {
      const passed = score >= 3;
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className={`text-6xl font-bold mb-4 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{passed ? 'Excellent!' : 'Keep Learning!'}</h2>
          <p className="text-slate-300 mb-6 max-w-md">
            {passed ? 'You have a solid understanding of induction heating!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={(e) => { e.preventDefault(); if (passed) { goToNextPhase(); } else { setTestAnswers(Array(4).fill(-1)); setShowTestResults(false); } }}
            className={`px-6 py-3 font-semibold rounded-xl ${passed ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'}`}
          >
            {passed ? 'Complete Mastery' : 'Try Again'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Check</h2>
        <div className="flex gap-2 mb-6">
          {TEST_QUESTIONS.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${testAnswers[i] !== -1 ? (testAnswers[i] === TEST_QUESTIONS[i].correct ? 'bg-emerald-400' : 'bg-red-400') : 'bg-slate-600'}`} />
          ))}
        </div>
        <div className="space-y-6 max-w-xl w-full">
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleTestAnswer(qIndex, oIndex); }}
                    disabled={testAnswers[qIndex] !== -1}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? oIndex === q.correct ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                        : testAnswers[qIndex] !== -1 && oIndex === q.correct ? 'bg-emerald-600/40 border-2 border-emerald-400'
                        : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {allAnswered && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowTestResults(true); playSound(score >= 3 ? 'complete' : 'failure'); }}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            See Results
          </button>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-amber-500/30">
        <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold text-white mb-4">Induction Heating Master!</h1>
      <p className="text-lg text-slate-400 max-w-md mb-8">
        You have mastered the physics of contactless heating through electromagnetic induction
      </p>
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 max-w-md border border-slate-700/50 mb-8">
        <h3 className="text-lg font-semibold text-orange-400 mb-4">Key Concepts Mastered</h3>
        <ul className="space-y-3 text-left">
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> Eddy currents from changing magnetic fields
          </li>
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> I²R heating in resistive materials
          </li>
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> Material selection for optimal heating
          </li>
          <li className="flex items-center gap-3 text-slate-300">
            <span className="text-emerald-400">&#10003;</span> Industrial applications of induction
          </li>
        </ul>
      </div>
      <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl p-4 max-w-md mb-8">
        <p className="text-orange-300 text-sm">
          Key Insight: Heat without direct contact - oscillating fields make currents, currents make heat!
        </p>
      </div>
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('complete'); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Claim Your Badge
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      </button>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Induction Heating</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, index) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : PHASE_ORDER.indexOf(phase) > index
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default InductionHeatingRenderer;
