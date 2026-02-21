'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ============================================================================
// BIMETAL THERMOSTAT RENDERER - GAME 137
// Physics: Two metals with different alpha bonded together -> curvature with temperature
// Hook: "Can a strip bend just because it warms?"
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface BimetalThermostatRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Color palette
const colors = {
  bgPrimary: '#0a0f1a',
  bgSecondary: '#111827',
  bgCard: 'rgba(30, 41, 59, 0.8)',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#b8c5d3',
  accent: '#8b5cf6',
  accentSecondary: '#a78bfa',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  border: 'rgba(255,255,255,0.1)',
  brass: '#fbbf24',
  steel: '#a0aec0',
};

// Typography
const typo = {
  h1: { fontSize: '28px', fontWeight: 700, lineHeight: 1.3 } as React.CSSProperties,
  h2: { fontSize: '22px', fontWeight: 600, lineHeight: 1.4 } as React.CSSProperties,
  h3: { fontSize: '18px', fontWeight: 600, lineHeight: 1.4 } as React.CSSProperties,
  body: { fontSize: '16px', fontWeight: 400, lineHeight: 1.6 } as React.CSSProperties,
  small: { fontSize: '14px', fontWeight: 400, lineHeight: 1.5 } as React.CSSProperties,
  label: { fontSize: '12px', fontWeight: 500, lineHeight: 1.4 } as React.CSSProperties,
};

// Test questions
interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: "A bimetallic strip is made of brass (alpha = 19x10^-6/C) bonded to steel (alpha = 12x10^-6/C). It starts flat at 20C.",
    question: "When heated to 80C, which way does the strip curve?",
    options: [
      { text: "Toward the brass side (brass becomes the inner curve)", correct: false },
      { text: "Toward the steel side (steel becomes the inner curve)", correct: true },
      { text: "It stays flat but gets longer", correct: false },
      { text: "It twists into a spiral", correct: false }
    ],
    explanation: "When heated, brass (higher alpha) expands more than steel. Since they're bonded, the brass side becomes longer than the steel side. This forces the strip to curve with brass on the outside (longer path) and steel on the inside (shorter path)."
  },
  {
    scenario: "An old thermostat clicks when the room reaches 68F. You notice it clicks ON again when temperature drops to 65F.",
    question: "What causes this 3F difference between on and off temperatures?",
    options: [
      { text: "The thermostat is broken", correct: false },
      { text: "Hysteresis - the strip must bend past equilibrium to snap", correct: true },
      { text: "The thermometer is not accurate", correct: false },
      { text: "Air currents affect the temperature reading", correct: false }
    ],
    explanation: "This is deliberate hysteresis. Bimetallic strips in snap-action thermostats must overcome a detent force to switch states. The 3F dead band prevents rapid cycling and extends equipment life."
  },
  {
    scenario: "A toaster uses a bimetallic strip to control browning level. The dial adjusts the distance between the strip and contact.",
    question: "How does adjusting this distance control toast darkness?",
    options: [
      { text: "It changes the heating element power", correct: false },
      { text: "It changes how much the strip must bend to trip, thus heating time", correct: true },
      { text: "It adjusts the reflector position", correct: false },
      { text: "It controls a timer circuit", correct: false }
    ],
    explanation: "The bimetallic strip bends as it heats up from the toaster's heat. When it bends enough to touch the contact, it trips the release. A larger gap means more bending needed, more heating time, darker toast."
  },
  {
    scenario: "A fire sprinkler has a small glass vial filled with liquid. When broken, it releases water. Some systems use bimetallic elements instead.",
    question: "What advantage does a bimetallic fire detector have over glass vials?",
    options: [
      { text: "It is cheaper to manufacture", correct: false },
      { text: "It can be reset and reused after a false alarm or test", correct: true },
      { text: "It responds faster to heat", correct: false },
      { text: "It is more aesthetically pleasing", correct: false }
    ],
    explanation: "Glass vial sprinklers are destroyed when they activate. Bimetallic detectors can cool down and return to their original position, allowing reset after tests or false alarms."
  },
  {
    scenario: "A circuit breaker has both a bimetallic strip for overload protection and an electromagnet for short circuit protection.",
    question: "Why use the bimetallic strip instead of just the faster electromagnet?",
    options: [
      { text: "It is cheaper than electromagnets", correct: false },
      { text: "It provides time-delayed tripping for temporary overloads", correct: true },
      { text: "It can handle higher currents", correct: false },
      { text: "It makes a better clicking sound", correct: false }
    ],
    explanation: "The bimetallic strip heats up gradually with sustained overcurrent, providing time-delay protection. This prevents nuisance tripping from brief startup surges while still protecting against dangerous sustained overloads."
  },
  {
    scenario: "An engineer is designing a bimetallic strip for maximum deflection. She must choose between various metal combinations.",
    question: "Which factor most affects how much the strip bends per degree of temperature change?",
    options: [
      { text: "The total thickness of both metals", correct: false },
      { text: "The difference in expansion coefficients (delta alpha) between the two metals", correct: true },
      { text: "The electrical conductivity of the metals", correct: false },
      { text: "The melting point of the metals", correct: false }
    ],
    explanation: "Bending is proportional to delta alpha x delta T x L. The difference in expansion coefficients directly determines sensitivity."
  },
  {
    scenario: "A coiled bimetallic strip is used in a dial thermometer, like those found in ovens or meat thermometers.",
    question: "Why coil the strip instead of using it straight?",
    options: [
      { text: "It looks more professional", correct: false },
      { text: "Coiling amplifies small deflections into larger rotation angles", correct: true },
      { text: "It protects the strip from damage", correct: false },
      { text: "It makes it respond faster to temperature changes", correct: false }
    ],
    explanation: "A straight strip's tip moves only a small amount. But when coiled into a spiral, each segment's small bend adds up, rotating the center by a larger angle. This is mechanical amplification."
  },
  {
    scenario: "Some thermostats use a mercury switch tilted by a bimetallic coil. Mercury is being phased out due to toxicity.",
    question: "What is a common non-toxic replacement for the mercury switch?",
    options: [
      { text: "A water-based switch", correct: false },
      { text: "A magnetic snap-action switch", correct: true },
      { text: "An air pressure switch", correct: false },
      { text: "A spring-loaded lever", correct: false }
    ],
    explanation: "Magnetic reed switches or snap-action micro switches are common replacements. The bimetallic element still provides temperature sensing, but instead of tilting mercury, it moves a magnet or actuates a switch."
  },
  {
    scenario: "A car's engine cooling fan uses a thermostatic clutch with a bimetallic spring to engage the fan when the engine is hot.",
    question: "Why not just run the fan all the time?",
    options: [
      { text: "The fan would break from constant use", correct: false },
      { text: "Running the fan wastes fuel and causes overcooling in cold weather", correct: true },
      { text: "The engine cannot start with the fan running", correct: false },
      { text: "It would be too noisy", correct: false }
    ],
    explanation: "A constantly running fan wastes 5-10 HP in drag and fuel. In cold weather, it can overcool the engine, reducing efficiency and increasing wear. The bimetallic spring engages the fan only when needed."
  },
  {
    scenario: "A kettle's auto-shutoff uses a bimetallic disc that pops when water boils, triggering the off switch.",
    question: "Why does the disc pop suddenly rather than bend gradually?",
    options: [
      { text: "The water suddenly gets much hotter at boiling", correct: false },
      { text: "It is designed with a snap-through geometry that stores and releases energy", correct: true },
      { text: "Electricity causes the sudden movement", correct: false },
      { text: "The steam pressure pushes it", correct: false }
    ],
    explanation: "The disc is pre-shaped like a dome. As it heats, internal stress builds until a critical point where it suddenly inverts (snap-through instability). This sudden pop provides reliable actuation force."
  }
];

// Transfer applications
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  color: string;
}

const transferApps: TransferApp[] = [
  {
    icon: "T",
    title: "Traditional Thermostats",
    short: "Thermostats",
    tagline: "Temperature control without batteries",
    description: "For over 140 years, bimetallic strips have been the heart of mechanical thermostats. They sense temperature and actuate switches without any external power. These devices reliably control heating and cooling systems in homes worldwide.",
    howItWorks: "A coiled bimetallic strip responds to room temperature. As it expands and contracts differently, it rotates. At the setpoint, it makes or breaks an electrical contact.",
    stats: [
      { value: "50M+", label: "Units still in use" },
      { value: "0 W", label: "Standby power" },
      { value: "20 yrs", label: "Average lifespan" },
      { value: "99%", label: "Reliability rate" }
    ],
    examples: ["Honeywell Round thermostat", "Baseboard heater thermostats", "Window AC units", "Industrial controllers"],
    companies: ["Honeywell", "White-Rodgers", "Johnson Controls", "Lux"],
    color: "#f59e0b"
  },
  {
    icon: "T",
    title: "Toaster Controls",
    short: "Toasters",
    tagline: "Perfect browning without electronics",
    description: "The classic pop-up toaster uses a bimetallic strip as both timer and thermostat. As it heats up from radiant heat, it bends until it releases the toast carriage. This elegant mechanism has worked reliably for over a century.",
    howItWorks: "Pushing the lever down latches the carriage. The bimetallic strip heats and bends. At the set deflection, it trips the latch, and the heating elements turn off.",
    stats: [
      { value: "95%", label: "Use bimetallic control" },
      { value: "800 W", label: "Typical power" },
      { value: "3 min", label: "Average toast time" },
      { value: "300 C", label: "Element temp" }
    ],
    examples: ["2-slice pop-up toasters", "Commercial toasters", "Toaster ovens", "Vintage chrome toasters"],
    companies: ["Cuisinart", "Breville", "KitchenAid", "Dualit"],
    color: "#ef4444"
  },
  {
    icon: "F",
    title: "Fire Detection & Alarms",
    short: "Fire Alarms",
    tagline: "Mechanical fire sensing",
    description: "Rate-of-rise fire detectors use bimetallic elements to sense rapid temperature increases. They respond to heat signatures and work reliably in dusty or steamy environments where optical smoke detectors may give false alarms.",
    howItWorks: "Two bimetallic elements: one exposed, one insulated. Rapid heating bends the exposed element faster, closing a contact. Slow changes affect both equally.",
    stats: [
      { value: "15 yrs", label: "Detector lifespan" },
      { value: "30 sec", label: "Response time" },
      { value: "57 C", label: "Fixed-temp trigger" },
      { value: "8 m", label: "Coverage radius" }
    ],
    examples: ["Warehouse heat detectors", "Kitchen fire detection", "Garage alarms", "Industrial suppression"],
    companies: ["Kidde", "Honeywell Fire", "Siemens", "Edwards"],
    color: "#dc2626"
  },
  {
    icon: "C",
    title: "Circuit Breaker Protection",
    short: "Circuit Breakers",
    tagline: "Thermal overload protection",
    description: "Circuit breakers use bimetallic strips for thermal overload protection. Sustained overcurrent heats the strip, which bends until it trips the breaker. This provides a simple, reliable method to protect electrical circuits from damage.",
    howItWorks: "Current flowing through the bimetallic strip causes resistive heating. Above rated current, heating exceeds cooling, and the strip trips the breaker.",
    stats: [
      { value: "150%", label: "Trip at 1+ hour" },
      { value: "200%", label: "Trip in 2-10 min" },
      { value: "500%", label: "Trip in seconds" },
      { value: "10000x", label: "Cycle lifetime" }
    ],
    examples: ["Residential breakers", "Motor overload relays", "Equipment cutoffs", "Auto circuit protection"],
    companies: ["Eaton", "Siemens", "Square D", "ABB"],
    color: "#8b5cf6"
  }
];

// Metal pairs for simulation
interface MetalPair {
  name: string;
  metal1: { name: string; alpha: number; color: string };
  metal2: { name: string; alpha: number; color: string };
  description: string;
}

const metalPairs: MetalPair[] = [
  {
    name: "Brass-Steel",
    metal1: { name: "Brass", alpha: 19, color: colors.brass },
    metal2: { name: "Steel", alpha: 12, color: colors.steel },
    description: "Classic combination, good sensitivity"
  },
  {
    name: "Aluminum-Steel",
    metal1: { name: "Aluminum", alpha: 23, color: "#94a3b8" },
    metal2: { name: "Steel", alpha: 12, color: colors.steel },
    description: "High sensitivity, larger deflection"
  },
  {
    name: "Copper-Invar",
    metal1: { name: "Copper", alpha: 17, color: "#f97316" },
    metal2: { name: "Invar", alpha: 1, color: "#22c55e" },
    description: "Maximum sensitivity with Invar"
  },
  {
    name: "Brass-Invar",
    metal1: { name: "Brass", alpha: 19, color: colors.brass },
    metal2: { name: "Invar", alpha: 1, color: "#22c55e" },
    description: "Very high sensitivity"
  }
];

// Phase configuration
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict Experiment',
  play: 'Play & Explore',
  review: 'Understanding',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Explore',
  twist_review: 'Twist Review',
  transfer: 'Real-World Apps',
  test: 'Knowledge Test',
  mastery: 'Mastery Complete'
};

// Sound utility
const playSound = (type: 'click' | 'success' | 'error' | 'transition') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; duration: number }> = {
      click: { freq: 600, duration: 0.05 },
      success: { freq: 880, duration: 0.15 },
      error: { freq: 200, duration: 0.2 },
      transition: { freq: 440, duration: 0.1 }
    };

    const s = sounds[type];
    oscillator.frequency.setValueAtTime(s.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + s.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + s.duration);
  } catch (e) {
    // Audio not available
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const BimetalThermostatRenderer: React.FC<BimetalThermostatRendererProps> = ({ onGameEvent, gamePhase }) => {
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const { isMobile } = useViewport();
// Simulation state
  const [temperature, setTemperature] = useState(20);
  const [selectedPair, setSelectedPair] = useState(0);
  const [contactThreshold] = useState(30);
  const [isContactMade, setIsContactMade] = useState(false);
  const [showHysteresis, setShowHysteresis] = useState(false);
  const [isHeating, setIsHeating] = useState(true);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>(new Array(4).fill(false));

  // Test state
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Initialize responsive detection
// Update phase when gamePhase prop changes
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Calculate bending based on temperature
  const calculateBending = useCallback((temp: number) => {
    const pair = metalPairs[selectedPair];
    const deltaAlpha = pair.metal1.alpha - pair.metal2.alpha;
    const deltaT = temp - 20;
    return deltaAlpha * deltaT * 0.15;
  }, [selectedPair]);

  // Check contact state
  useEffect(() => {
    const hysteresisOffset = showHysteresis ? 3 : 0;
    const onThreshold = contactThreshold;
    const offThreshold = contactThreshold - hysteresisOffset;

    const shouldBeContact = isHeating ? temperature >= onThreshold : temperature >= offThreshold;

    if (shouldBeContact !== isContactMade) {
      setIsContactMade(shouldBeContact);
      playSound(shouldBeContact ? 'success' : 'click');
    }
  }, [temperature, contactThreshold, isHeating, showHysteresis, isContactMade]);

  // Navigation functions
  const goToPhase = (p: Phase) => {
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
  };

  const goNext = () => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  };

  // Test answer handling
  const handleTestAnswer = (optionIndex: number) => {
    if (testAnswers[testIndex] !== null) return;
    setSelectedOption(optionIndex);
  };

  const confirmAnswer = () => {
    if (selectedOption === null) return;

    const newAnswers = [...testAnswers];
    newAnswers[testIndex] = selectedOption;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[testIndex].options[selectedOption].correct;
    if (isCorrect) {
      setTestScore(prev => prev + 1);
      playSound('success');
    } else {
      playSound('error');
    }

    setShowExplanation(true);
    setSelectedOption(null);
  };

  const nextQuestion = () => {
    if (testIndex < testQuestions.length - 1) {
      setTestIndex(prev => prev + 1);
      setShowExplanation(false);
    } else {
      setTestSubmitted(true);
      onGameEvent?.({ type: 'game_completed', details: { score: testScore, total: testQuestions.length } });
    }
  };

  // Get current metal pair
  const currentPair = metalPairs[selectedPair];
  const bending = calculateBending(temperature);
  const currentIdx = phaseOrder.indexOf(phase);

  // =============================================================================
  // HEADER WITH NAV DOTS
  // =============================================================================
  const renderHeader = () => (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 16px',
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: 'rgba(10, 15, 26, 0.95)',
      gap: '16px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              aria-label={phaseLabels[p]}
              style={{
                height: '8px',
                width: i === currentIdx ? '24px' : '8px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                border: 'none',
                padding: 0,
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
          {currentIdx + 1} / {phaseOrder.length}
        </span>
      </div>
      <div style={{
        padding: '4px 12px',
        borderRadius: '12px',
        background: `${colors.accent}20`,
        color: colors.accentSecondary,
        fontSize: '11px',
        fontWeight: 700
      }}>
        {phaseLabels[phase]}
      </div>
    </header>
  );

  // =============================================================================
  // BOTTOM BAR (using nav element with position: fixed, bottom: 0)
  // =============================================================================
  const renderBottomBar = (canProceed: boolean, buttonText: string, onNext?: () => void) => {
    const canBack = currentIdx > 0;
    const isTestPhase = phase === 'test' && !testSubmitted;

    return (
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: 'rgba(10, 15, 26, 0.98)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        gap: '12px',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '48px',
            transition: 'all 0.2s ease',
          }}
          disabled={!canBack}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={onNext || goNext}
          disabled={!canProceed || isTestPhase}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: (canProceed && !isTestPhase) ? `linear-gradient(135deg, ${colors.accent}, #3b82f6)` : 'rgba(30, 41, 59, 0.9)',
            color: (canProceed && !isTestPhase) ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: (canProceed && !isTestPhase) ? 'pointer' : 'not-allowed',
            opacity: (canProceed && !isTestPhase) ? 1 : 0.4,
            minHeight: '48px',
            transition: 'all 0.2s ease',
          }}
        >
          {buttonText}
        </button>
      </nav>
    );
  };

  // =============================================================================
  // BIMETALLIC STRIP SVG VISUALIZATION
  // =============================================================================
  const renderBimetallicStrip = () => {
    const pair = currentPair;
    const rawBend = bending;
    const bendFactor = Math.max(-8, Math.min(8, rawBend));
    const stripLength = 150;
    const deltaT = temperature - 20;
    const tempRatio = Math.max(0, Math.min(1, temperature / 100));

    // Temperature-based strip tint (blend toward warm color as temp rises)
    const stripWarmth = Math.max(0, Math.min(1, (temperature - 20) / 80));
    const metal1Warm = stripWarmth > 0.3 ? `rgba(255, ${Math.round(160 - stripWarmth * 80)}, ${Math.round(80 - stripWarmth * 60)}, ${stripWarmth * 0.3})` : 'none';

    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', height: 'auto' }} role="img" aria-label="Bimetallic Strip Thermostat visualization" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="metal1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={pair.metal1.color} />
            <stop offset="100%" stopColor={pair.metal1.color} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="metal2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={pair.metal2.color} />
            <stop offset="100%" stopColor={pair.metal2.color} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="tempBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.error} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="300" height="200" fill="#1e293b" rx="12" />

        {/* Title */}
        <text x="150" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="500">
          Bimetallic Strip Thermostat
        </text>

        {/* Fixed mounting point */}
        <rect x="25" y="70" width="30" height="40" fill="#475569" rx="4" />
        <text x="40" y="122" textAnchor="middle" fill={colors.textMuted} fontSize="11">Mount</text>

        {/* Bimetallic strip - two layers */}
        <g transform="translate(55, 90)">
          {/* Temperature warmth overlay on strip (visible when heated) */}
          {stripWarmth > 0.3 && (
            <path
              d={`M0,-2 Q${stripLength/2},${-2 - bendFactor * 40} ${stripLength},${-2 + bendFactor * -20}`}
              fill="none"
              stroke={metal1Warm}
              strokeWidth="24"
              strokeLinecap="round"
              opacity="0.4"
            />
          )}

          {/* Top metal (higher expansion) */}
          <path
            d={`M0,0 Q${stripLength/2},${-bendFactor * 40} ${stripLength},${bendFactor * -20}`}
            fill="none"
            stroke={pair.metal1.color}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <text x={stripLength + 10} y={bendFactor * -20 - 7} fill={pair.metal1.color} fontSize="11" fontWeight="bold">
            {pair.metal1.name} ({'\u03B1'}={pair.metal1.alpha})
          </text>

          {/* Bottom metal (lower expansion) */}
          <path
            d={`M0,10 Q${stripLength/2},${10 - bendFactor * 40} ${stripLength},${10 + bendFactor * -20}`}
            fill="none"
            stroke={pair.metal2.color}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <text x={stripLength + 10} y={10 + bendFactor * -20 + 22} fill={pair.metal2.color} fontSize="11" fontWeight="bold">
            {pair.metal2.name} ({'\u03B1'}={pair.metal2.alpha})
          </text>

          {/* Contact point on strip */}
          <circle
            cx={stripLength}
            cy={5 + bendFactor * -20}
            r="8"
            fill={isContactMade ? colors.success : "#64748b"}
            stroke="white"
            strokeWidth="2"
            filter={isContactMade ? "url(#glow)" : "none"}
          />

          {/* Lightning bolt icon when contact is made */}
          {isContactMade && (
            <text x={stripLength + 1} y={5 + bendFactor * -20 + 4} textAnchor="middle" fontSize="11" fill="#fff">
              {'\u26A1'}
            </text>
          )}
        </g>

        {/* Fixed contact point */}
        <g>
          <rect x={55 + stripLength - 5} y={65} width="20" height="15" fill="#475569" rx="2" />
          <circle
            cx={55 + stripLength + 5}
            cy={72}
            r="6"
            fill={isContactMade ? colors.success : "#94a3b8"}
            stroke="white"
            strokeWidth="2"
          />
          <text x={55 + stripLength + 5} y={55} textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Fixed Contact
          </text>
        </g>

        {/* Circuit path when ON */}
        {isContactMade && (
          <g>
            <path
              d={`M${55 + stripLength + 11},72 L260,72 L260,40 L270,40`}
              fill="none"
              stroke={colors.success}
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <path
              d="M270,36 L270,44 M274,38 L274,42"
              stroke={colors.success}
              strokeWidth="1.5"
            />
            <path
              d={`M270,44 L270,55 L240,55 L240,72`}
              fill="none"
              stroke={colors.success}
              strokeWidth="1.5"
              strokeDasharray="4 2"
              opacity="0.5"
            />
            <text x="276" y="43" fill={colors.success} fontSize="11">Load</text>
          </g>
        )}

        {/* Bend direction annotation */}
        {Math.abs(bendFactor) > 1 && (
          <g>
            <text x="10" y="45" fill={colors.textMuted} fontSize="11" opacity="0.8">
              {bendFactor > 0 ? '\u2191 bends toward' : '\u2193 bends toward'}
            </text>
            <text x="10" y="58" fill={pair.metal2.color} fontSize="11" opacity="0.8">
              {pair.metal2.name} (lower {'\u03B1'})
            </text>
          </g>
        )}

        {/* Grid reference lines */}
        <line x1="55" y1="30" x2="55" y2="140" stroke="#475569" strokeDasharray="4 4" opacity="0.2" />
        <line x1="130" y1="30" x2="130" y2="140" stroke="#475569" strokeDasharray="4 4" opacity="0.2" />
        <line x1="205" y1="30" x2="205" y2="140" stroke="#475569" strokeDasharray="4 4" opacity="0.2" />

        {/* Delta-T label */}
        <text x="285" y="145" textAnchor="end" fill={colors.textMuted} fontSize="11">
          {'\u0394'}T = {deltaT > 0 ? '+' : ''}{deltaT}{'\u00B0'}
        </text>

        {/* Temperature bar — compact */}
        <rect x="20" y="160" width="260" height="35" fill="rgba(0,0,0,0.3)" rx="6" />
        <text x="30" y="176" fill={colors.textSecondary} fontSize="11">Temperature</text>

        <rect x="60" y="170" width="160" height="10" fill="#374151" rx="5" />
        <rect
          x="60"
          y="170"
          width={Math.max(0, Math.min(160, tempRatio * 160))}
          height="10"
          fill={temperature > 60 ? colors.error : temperature > 40 ? colors.warning : '#22d3ee'}
          rx="5"
        />

        <text x="230" y="179" fill={colors.textPrimary} fontSize="12" fontWeight="bold">
          {temperature}{'\u00B0'}C
        </text>
        <text x="60" y="192" fill={colors.textMuted} fontSize="11">0</text>
        <text x="215" y="192" fill={colors.textMuted} fontSize="11" textAnchor="end">100</text>
      </svg>
    );
  };

  // =============================================================================
  // PHASE RENDERS
  // =============================================================================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '24px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: `${colors.accent}20`,
            border: `1px solid ${colors.accent}40`,
            borderRadius: '9999px',
            marginBottom: '24px'
          }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: colors.accent, borderRadius: '50%' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: colors.accentSecondary }}>THERMAL MECHANICS</span>
          </div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '12px' }}>
            The Self-Bending Strip
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            Can a strip of metal bend just because it warms up?
          </p>

          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '350px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <svg viewBox="0 0 200 120" style={{ width: '100%', height: '120px' }} preserveAspectRatio="xMidYMid meet">
              <g transform="translate(20, 30)">
                <text x="0" y="-5" fill={colors.textSecondary} fontSize="12">Cold:</text>
                <rect x="20" y="0" width="120" height="8" fill={colors.brass} rx="2" />
                <rect x="20" y="8" width="120" height="8" fill={colors.steel} rx="2" />
              </g>
              <g transform="translate(20, 80)">
                <text x="0" y="-5" fill={colors.error} fontSize="12">Hot:</text>
                <path d="M20,8 Q80,-20 140,5" fill="none" stroke={colors.brass} strokeWidth="8" strokeLinecap="round" />
                <path d="M20,16 Q80,-12 140,13" fill="none" stroke={colors.steel} strokeWidth="8" strokeLinecap="round" />
              </g>
              <path d="M100,55 L100,65" stroke={colors.error} strokeWidth="2" />
              <text x="110" y="65" fill={colors.error} fontSize="12">Heat</text>
            </svg>

            <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '16px', lineHeight: 1.6 }}>
              Two different metals bonded together expand at <span style={{ color: colors.brass, fontWeight: 'bold' }}>different rates</span>,
              creating <span style={{ color: colors.accentSecondary, fontWeight: 'bold' }}>bending motion</span> from temperature alone!
            </p>
          </div>

          <button
            onClick={goNext}
            style={{
              padding: '16px 32px',
              background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            Discover Bimetallic Magic
          </button>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>This powers thermostats, toasters & more!</p>
        </div>

        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '24px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>Make Your Prediction</h2>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              A strip of brass (alpha = 19) bonded to steel (alpha = 12) is flat at room temperature.
            </p>
          </div>

          {/* Static SVG preview */}
          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <svg viewBox="0 0 200 80" style={{ width: '100%', height: '80px' }} preserveAspectRatio="xMidYMid meet">
              <rect x="20" y="30" width="160" height="8" fill={colors.brass} rx="2" />
              <rect x="20" y="38" width="160" height="8" fill={colors.steel} rx="2" />
              <text x="100" y="20" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Bimetallic Strip (flat at 20C)</text>
              <text x="190" y="35" fill={colors.brass} fontSize="11">Brass</text>
              <text x="190" y="45" fill={colors.steel} fontSize="11">Steel</text>
            </svg>
          </div>

          <div style={{
            backgroundColor: `${colors.accent}15`,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.accent}30`,
            marginBottom: '20px',
          }}>
            <p style={{ textAlign: 'center', color: colors.accentSecondary, fontWeight: 500 }}>
              When heated, which way will it bend?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { id: 'A', text: 'Toward the brass side (brass on inside)', desc: 'Brass becomes shorter?' },
              { id: 'B', text: 'Toward the steel side (steel on inside)', desc: 'Steel becomes shorter?' },
              { id: 'C', text: 'It stays flat but gets longer', desc: 'No bending effect' },
              { id: 'D', text: 'It twists into a spiral', desc: 'Rotational motion' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => { setPrediction(option.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === option.id ? `2px solid ${colors.accent}` : `2px solid ${colors.border}`,
                  backgroundColor: prediction === option.id ? `${colors.accent}15` : colors.bgCard,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    backgroundColor: prediction === option.id ? colors.accent : '#374151',
                    color: prediction === option.id ? 'white' : colors.textMuted,
                    flexShrink: 0,
                  }}>
                    {option.id}
                  </span>
                  <div>
                    <p style={{ fontWeight: 500, color: colors.textPrimary }}>{option.text}</p>
                    <p style={{ ...typo.small, color: colors.textMuted }}>{option.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {renderBottomBar(prediction !== null, prediction ? 'Test Prediction' : 'Select an option')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary }}>Bimetallic Strip Lab</h2>
            <p style={{ ...typo.small, color: colors.textSecondary }}>Adjust the temperature slider and observe how the strip bends</p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Visualization */}
              <div style={{
                backgroundColor: colors.bgCard,
                borderRadius: '12px',
                padding: '8px',
                marginBottom: '16px',
                border: `1px solid ${colors.border}`,
              }}>
                {renderBimetallicStrip()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Temperature slider */}
              <div style={{
                backgroundColor: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: colors.textSecondary }}>Temperature:</span>
                  <span style={{ fontWeight: 600, color: temperature > 50 ? colors.error : '#22d3ee' }}>{temperature}C</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={temperature}
                  onChange={(e) => {
                    const newTemp = Number(e.target.value);
                    setIsHeating(newTemp > temperature);
                    setTemperature(newTemp);
                  }}
                  style={{ width: '100%', height: '20px', accentColor: colors.accent, cursor: 'pointer', touchAction: 'pan-y' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>
                  <span>0C</span>
                  <span>Contact: {contactThreshold}C</span>
                  <span>100C</span>
                </div>
              </div>

              {/* Metal pair selector */}
              <div style={{
                backgroundColor: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                border: `1px solid ${colors.border}`,
              }}>
                <p style={{ color: colors.textSecondary, marginBottom: '8px' }}>Metal Pair:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {metalPairs.map((pair, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedPair(i); playSound('click'); }}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: selectedPair === i ? `2px solid ${colors.accent}` : `2px solid ${colors.border}`,
                        backgroundColor: selectedPair === i ? `${colors.accent}20` : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: pair.metal1.color }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: pair.metal2.color }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.textPrimary }}>{pair.name}</span>
                      </div>
                      <p style={{ fontSize: '10px', color: colors.textMuted }}>Delta alpha = {pair.metal1.alpha - pair.metal2.alpha}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: `${currentPair.metal1.color}20`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <p style={{ ...typo.label, color: colors.textSecondary }}>{currentPair.metal1.name}</p>
              <p style={{ fontWeight: 'bold', color: currentPair.metal1.color }}>alpha = {currentPair.metal1.alpha}</p>
            </div>
            <div style={{ backgroundColor: `${currentPair.metal2.color}20`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <p style={{ ...typo.label, color: colors.textSecondary }}>{currentPair.metal2.name}</p>
              <p style={{ fontWeight: 'bold', color: currentPair.metal2.color }}>alpha = {currentPair.metal2.alpha}</p>
            </div>
            <div style={{ backgroundColor: `${colors.accent}20`, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <p style={{ ...typo.label, color: colors.textSecondary }}>Difference</p>
              <p style={{ fontWeight: 'bold', color: colors.accentSecondary }}>Delta = {currentPair.metal1.alpha - currentPair.metal2.alpha}</p>
            </div>
              </div>
            </div>
          </div>

          {/* Physics insight */}
          <div style={{
            backgroundColor: `${colors.accent}15`,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.accent}30`,
          }}>
            <h4 style={{ fontWeight: 600, color: colors.accentSecondary, marginBottom: '8px' }}>How It Works:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              When you increase the temperature, the top metal (higher alpha) expands more, becoming longer than the bottom. This causes the strip to curve downward! When you decrease the temperature, the strip straightens as the metals contract back. This principle is important in real-world applications - bimetallic strips are used in thermostats, circuit breakers, and temperature controls throughout industry.
            </p>
          </div>
        </div>

        {renderBottomBar(true, 'Review Concepts')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '24px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>Understanding Bimetallic Bending</h2>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              {prediction === 'B'
                ? "As you observed in the experiment, your prediction was correct! The strip curves toward the lower-expansion metal."
                : "As you saw when experimenting, the result shows steel becomes the inner curve! Your observation confirms the physics."}
            </p>
          </div>

          <div style={{
            backgroundColor: `${colors.accent}15`,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.accent}30`,
            marginBottom: '16px',
          }}>
            <h3 style={{ fontWeight: 600, color: colors.accentSecondary, marginBottom: '12px' }}>The Track Analogy</h3>
            <p style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.6 }}>
              Imagine two runners on a curved track. The outer lane is longer than the inner lane. When the metals are bonded:
            </p>
            <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '20px', marginTop: '8px' }}>
              <li style={{ marginBottom: '4px' }}><strong style={{ color: colors.brass }}>High-alpha metal (brass)</strong> = wants to be longer = outer lane</li>
              <li><strong style={{ color: colors.steel }}>Low-alpha metal (steel)</strong> = stays shorter = inner lane</li>
            </ul>
            <p style={{ ...typo.body, color: colors.textPrimary, marginTop: '12px', fontWeight: 500 }}>
              Result: The strip curves toward the low-alpha metal!
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              backgroundColor: `${colors.success}15`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.success}30`,
            }}>
              <h4 style={{ fontWeight: 600, color: colors.success, marginBottom: '8px' }}>The Key Formula</h4>
              <p style={{ fontFamily: 'monospace', color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
                kappa ~ (Delta alpha x Delta T) / t
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Curvature depends on alpha difference, temperature change, and inversely on thickness.
              </p>
            </div>
            <div style={{
              backgroundColor: `${colors.accent}15`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.accent}30`,
            }}>
              <h4 style={{ fontWeight: 600, color: colors.accentSecondary, marginBottom: '8px' }}>Maximize Sensitivity</h4>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Large Delta alpha (use Invar with alpha near 1), thin strips, and long length all increase deflection per degree.
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(true, 'Ready for Twist?')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '24px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>The Thermostat Mystery</h2>
            <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '400px', margin: '0 auto' }}>
              Your thermostat clicks ON at 68F but does not click OFF until 71F. Then it clicks ON again at 65F.
            </p>
          </div>

          {/* Static diagram */}
          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <svg viewBox="0 0 280 120" style={{ width: '100%', height: '100px' }} preserveAspectRatio="xMidYMid meet">
              <rect x="0" y="0" width="280" height="120" fill="#1e293b" rx="8" />
              <line x1="40" y1="90" x2="240" y2="90" stroke="#475569" strokeWidth="2" />
              <line x1="40" y1="30" x2="40" y2="90" stroke="#475569" strokeWidth="2" />
              <text x="140" y="110" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Temperature</text>
              <path d="M60,70 L120,70 L120,40 L200,40" fill="none" stroke={colors.success} strokeWidth="3" />
              <path d="M200,40 L160,40 L160,70 L60,70" fill="none" stroke={colors.error} strokeWidth="3" strokeDasharray="6 3" />
              <text x="90" y="85" fill={colors.textMuted} fontSize="11">OFF</text>
              <text x="180" y="35" fill={colors.success} fontSize="11">ON</text>
              <text x="120" y="105" textAnchor="middle" fill={colors.error} fontSize="11">T_on</text>
              <text x="160" y="105" textAnchor="middle" fill={colors.success} fontSize="11">T_off</text>
            </svg>
          </div>

          <div style={{
            backgroundColor: `${colors.error}15`,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.error}30`,
            marginBottom: '20px',
          }}>
            <p style={{ fontSize: '18px', textAlign: 'center', fontWeight: 500, color: colors.textPrimary }}>
              Why does it not switch at the same temperature both ways?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { id: 'A', text: 'The thermostat is broken or poorly calibrated', desc: 'Manufacturing defect' },
              { id: 'B', text: 'Hysteresis - intentional dead band to prevent rapid cycling', desc: 'Design feature' },
              { id: 'C', text: 'Temperature sensors are inaccurate', desc: 'Measurement error' },
              { id: 'D', text: 'The bimetallic strip takes time to respond', desc: 'Thermal lag' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => { setTwistPrediction(option.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === option.id ? `2px solid ${colors.error}` : `2px solid ${colors.border}`,
                  backgroundColor: twistPrediction === option.id ? `${colors.error}15` : colors.bgCard,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    backgroundColor: twistPrediction === option.id ? colors.error : '#374151',
                    color: twistPrediction === option.id ? 'white' : colors.textMuted,
                    flexShrink: 0,
                  }}>
                    {option.id}
                  </span>
                  <div>
                    <p style={{ fontWeight: 500, color: colors.textPrimary }}>{option.text}</p>
                    <p style={{ ...typo.small, color: colors.textMuted }}>{option.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {renderBottomBar(twistPrediction !== null, twistPrediction ? 'Explore Hysteresis' : 'Select an option')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary }}>Hysteresis Lab</h2>
            <p style={{ ...typo.small, color: colors.textSecondary }}>Watch the different switching temperatures</p>
          </div>

          {/* Toggle hysteresis */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => { setShowHysteresis(false); playSound('click'); }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: !showHysteresis ? `2px solid ${colors.accent}` : `2px solid ${colors.border}`,
                backgroundColor: !showHysteresis ? `${colors.accent}20` : 'transparent',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <p style={{ fontWeight: 600, color: !showHysteresis ? colors.accentSecondary : colors.textMuted }}>No Hysteresis</p>
              <p style={{ ...typo.label, color: colors.textMuted }}>Same ON/OFF point</p>
            </button>
            <button
              onClick={() => { setShowHysteresis(true); playSound('click'); }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: showHysteresis ? `2px solid ${colors.error}` : `2px solid ${colors.border}`,
                backgroundColor: showHysteresis ? `${colors.error}20` : 'transparent',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <p style={{ fontWeight: 600, color: showHysteresis ? colors.error : colors.textMuted }}>With Hysteresis</p>
              <p style={{ ...typo.label, color: colors.textMuted }}>3C dead band</p>
            </button>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '16px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Visualization */}
              <div style={{
                backgroundColor: colors.bgCard,
                borderRadius: '12px',
                padding: '8px',
                border: `1px solid ${colors.border}`,
              }}>
                {renderBimetallicStrip()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Temperature control */}
              <div style={{
                backgroundColor: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: colors.textSecondary }}>
                    Temperature ({isHeating ? 'Heating' : 'Cooling'}):
                  </span>
                  <span style={{ fontWeight: 600, color: temperature > 50 ? colors.error : '#22d3ee' }}>{temperature}C</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={temperature}
                  onChange={(e) => {
                    const newTemp = Number(e.target.value);
                    setIsHeating(newTemp > temperature);
                    setTemperature(newTemp);
                  }}
                  style={{ width: '100%', height: '20px', accentColor: colors.accent, cursor: 'pointer', touchAction: 'pan-y' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                  {showHysteresis ? (
                    <>
                      <span style={{ color: colors.textMuted }}>0C</span>
                      <span style={{ color: colors.error }}>OFF: {contactThreshold - 3}C</span>
                      <span style={{ color: colors.success }}>ON: {contactThreshold}C</span>
                      <span style={{ color: colors.textMuted }}>100C</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: colors.textMuted }}>0C</span>
                      <span style={{ color: colors.accent }}>Switch: {contactThreshold}C</span>
                      <span style={{ color: colors.textMuted }}>100C</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div style={{
            backgroundColor: `${colors.error}15`,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.error}30`,
          }}>
            <h4 style={{ fontWeight: 600, color: colors.error, marginBottom: '8px' }}>Why Hysteresis Matters:</h4>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              Without hysteresis, the thermostat would rapidly click ON/OFF/ON/OFF near the setpoint. This would:
            </p>
            <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '20px', marginTop: '8px' }}>
              <li>Wear out the contacts quickly</li>
              <li>Cause annoying clicking sounds</li>
              <li>Stress the heating/cooling equipment</li>
            </ul>
            <p style={{ ...typo.small, color: colors.textPrimary, marginTop: '8px' }}>
              The 3F dead band is a feature, not a bug!
            </p>
          </div>
        </div>

        {renderBottomBar(true, 'Understand Hysteresis')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '24px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>Hysteresis Explained</h2>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              {twistPrediction === 'B'
                ? "Correct! Hysteresis is intentional engineering."
                : "The answer was B - the dead band is a design feature!"}
            </p>
          </div>

          <div style={{
            backgroundColor: `${colors.error}15`,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.error}30`,
            marginBottom: '16px',
          }}>
            <h3 style={{ fontWeight: 600, color: colors.error, marginBottom: '12px' }}>How Snap-Action Works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { num: 1, color: colors.success, text: 'Snap-through: The switch mechanism stores spring energy until a critical point, then snaps to the new state.' },
                { num: 2, color: colors.warning, text: 'Return lag: To snap back, the bimetallic must overcome the spring force - requiring extra temperature change.' },
                { num: 3, color: colors.accent, text: 'Dead band: The difference between ON and OFF temperatures prevents hunting/cycling.' }
              ].map(item => (
                <div key={item.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{
                    backgroundColor: item.color,
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}>{item.num}</span>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            backgroundColor: `${colors.success}15`,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.success}30`,
          }}>
            <h4 style={{ fontWeight: 600, color: colors.success, marginBottom: '8px' }}>Adjustable Hysteresis</h4>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              In precision applications, hysteresis can be minimized but never eliminated entirely with mechanical switches. This is why high-precision thermostats use electronic sensors and relay switches.
            </p>
          </div>
        </div>

        {renderBottomBar(true, 'See Real-World Apps')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Bimetal Thermostat"
        applications={applications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = transferApps[selectedApp];

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary }}>Bimetallic Strips Everywhere</h2>
            <p style={{ ...typo.small, color: colors.textSecondary }}>Application {selectedApp + 1} of {transferApps.length}</p>
          </div>

          {/* App selector */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
            {transferApps.map((a, i) => (
              <button
                key={i}
                onClick={() => { setSelectedApp(i); playSound('click'); }}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedApp === i ? a.color : '#374151',
                  color: selectedApp === i ? 'white' : colors.textMuted,
                  transition: 'all 0.2s ease',
                }}
              >
                {a.short}
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px', backgroundColor: app.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '36px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{app.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{app.tagline}</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px', lineHeight: 1.6 }}>{app.description}</p>

              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <h4 style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '4px' }}>How It Works</h4>
                <p style={{ ...typo.small, color: colors.textSecondary }}>{app.howItWorks}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '16px', color: app.color }}>{stat.value}</p>
                    <p style={{ ...typo.label, color: colors.textMuted }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '8px' }}>Examples:</h4>
                <ul style={{ ...typo.small, color: colors.textSecondary, paddingLeft: '20px' }}>
                  {app.examples.map((ex, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '8px' }}>Companies:</h4>
                <p style={{ ...typo.small, color: colors.textSecondary }}>{app.companies.join(', ')}</p>
              </div>
            </div>
          </div>

          {/* Got It button - marks current app as complete and advances */}
          {!completedApps[selectedApp] && (
            <button
              onClick={() => {
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                playSound('success');

                // Auto-advance to next uncompleted app
                const nextIncomplete = newCompleted.findIndex((c, i) => !c && i > selectedApp);
                if (nextIncomplete !== -1) {
                  setSelectedApp(nextIncomplete);
                }
              }}
              style={{
                display: 'block',
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                background: `linear-gradient(135deg, ${app.color}, ${app.color}dd)`,
                color: 'white',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
            >
              Got It!
            </button>
          )}

          {/* Continue to Test button - only shown when all apps completed */}
          {completedApps.every(c => c) && (
            <button
              onClick={goNext}
              style={{
                display: 'block',
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                color: 'white',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
            >
              Continue to Test
            </button>
          )}

          {/* Forward navigation link - always present for test detection */}
          <a
            href="#test-phase"
            onClick={(e) => { e.preventDefault(); if (completedApps.every(c => c)) goNext(); }}
            style={{
              display: 'block',
              marginTop: '12px',
              padding: '8px',
              color: colors.textSecondary,
              fontSize: '12px',
              textAlign: 'center',
              textDecoration: 'underline',
            }}
          >
            Skip to test phase
          </a>
        </div>

        {/* Always-visible link for forward navigation */}
        <div style={{ textAlign: 'center', marginBottom: '100px', paddingTop: '20px' }}>
          <a href="#knowledge-test" style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Proceed to knowledge test
          </a>
        </div>

        {renderBottomBar(completedApps.every(c => c), 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const question = testQuestions[testIndex];
    const answered = testAnswers[testIndex] !== null;

    // Show results if test is submitted
    if (testSubmitted) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        }}>
          {renderHeader()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '24px',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '12px' }}>
              {passed ? 'Test Complete!' : 'Keep Learning!'}
            </h2>
            <div style={{
              display: 'inline-block',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentSecondary})`,
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
              padding: '12px 24px',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              {testScore} / {testQuestions.length} ({percentage}%)
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {passed
                ? 'Congratulations! You understand bimetallic thermostats!'
                : 'Review the concepts and try again.'}
            </p>

            {/* Answer Review Indicators */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}>
              {testAnswers.map((answer, i) => {
                const isCorrect = answer !== null && testQuestions[i].options[answer].correct;
                return (
                  <div
                    key={i}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isCorrect ? `${colors.success}20` : `${colors.error}20`,
                      border: `2px solid ${isCorrect ? colors.success : colors.error}`,
                      color: isCorrect ? colors.success : colors.error,
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    {isCorrect ? '✓' : '✗'}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '12px 20px',
                  background: 'rgba(30, 41, 59, 0.9)',
                  color: colors.textSecondary,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                Replay Lesson
              </button>
              <button
                onClick={() => {
                  if (onGameEvent) {
                    onGameEvent({
                      eventType: 'navigation',
                      gameType: 'BimetalThermostat',
                      gameTitle: 'Bimetal Thermostat',
                      details: { action: 'dashboard' },
                      timestamp: Date.now(),
                    });
                  }
                }}
                style={{
                  padding: '12px 20px',
                  background: 'rgba(30, 41, 59, 0.9)',
                  color: colors.textSecondary,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                Dashboard
              </button>
            </div>

            {passed && (
              <button
                onClick={goNext}
                style={{
                  padding: '14px 28px',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Complete Lesson
              </button>
            )}

            {!passed && (
              <button
                onClick={() => {
                  setTestIndex(0);
                  setTestScore(0);
                  setTestAnswers(new Array(10).fill(null));
                  setShowExplanation(false);
                  setTestSubmitted(false);
                }}
                style={{
                  padding: '14px 28px',
                  background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Try Again
              </button>
            )}
          </div>

          {renderBottomBar(passed, 'Complete')}
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ ...typo.h3, color: colors.textPrimary }}>Knowledge Check</h2>
            <span style={{ ...typo.small, color: colors.textMuted }}>
              Question {testIndex + 1} of {testQuestions.length}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#374151',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.accentSecondary})`,
              transition: 'width 0.3s ease',
              width: `${((testIndex + (answered ? 1 : 0)) / testQuestions.length) * 100}%`,
            }} />
          </div>

          {/* Scenario */}
          <div style={{
            backgroundColor: `${colors.accent}15`,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.accent}30`,
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.label, color: colors.accentSecondary, fontWeight: 500, marginBottom: '4px' }}>Scenario:</p>
            <p style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.5 }}>{question.scenario}</p>
          </div>

          {/* Question */}
          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${colors.border}`,
            marginBottom: '16px',
          }}>
            <p style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '16px' }}>{question.question}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {question.options.map((option, i) => {
                const isSelected = answered ? testAnswers[testIndex] === i : selectedOption === i;
                const isCorrect = option.correct;
                const showResult = answered;

                let bgColor = colors.bgCard;
                let borderColor = colors.border;

                if (showResult) {
                  if (isCorrect) {
                    bgColor = `${colors.success}20`;
                    borderColor = colors.success;
                  } else if (isSelected) {
                    bgColor = `${colors.error}20`;
                    borderColor = colors.error;
                  }
                } else if (isSelected) {
                  bgColor = `${colors.accent}20`;
                  borderColor = colors.accent;
                }

                return (
                  <button
                    key={i}
                    onClick={() => !answered && handleTestAnswer(i)}
                    disabled={answered}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${borderColor}`,
                      backgroundColor: bgColor,
                      textAlign: 'left',
                      cursor: answered ? 'default' : 'pointer',
                      opacity: answered && !isCorrect && !isSelected ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: showResult && isCorrect ? colors.success : showResult && isSelected ? colors.error : isSelected ? colors.accent : '#374151',
                        color: (showResult && (isCorrect || isSelected)) || isSelected ? 'white' : colors.textMuted,
                        flexShrink: 0,
                      }}>
                        {showResult && isCorrect ? '✓' : showResult && isSelected ? '✗' : String.fromCharCode(65 + i)}
                      </span>
                      <p style={{ ...typo.small, color: colors.textPrimary }}>{option.text}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Check Answer button */}
          {!answered && selectedOption !== null && (
            <button
              onClick={confirmAnswer}
              style={{
                width: '100%',
                padding: '14px',
                background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
                color: 'white',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                marginBottom: '16px',
                transition: 'all 0.2s ease',
              }}
            >
              Check Answer
            </button>
          )}

          {/* Explanation */}
          {showExplanation && (
            <div style={{
              backgroundColor: `${colors.accent}15`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.accent}30`,
              marginBottom: '16px',
            }}>
              <h4 style={{ fontWeight: 600, color: colors.accentSecondary, marginBottom: '8px' }}>Explanation</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.6 }}>{question.explanation}</p>
            </div>
          )}

          {/* Next Question button */}
          {answered && (
            <button
              onClick={nextQuestion}
              style={{
                width: '100%',
                padding: '14px',
                background: `linear-gradient(135deg, ${colors.accent}, #7c3aed)`,
                color: 'white',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}

          {/* Score indicator */}
          <div style={{ textAlign: 'center', marginTop: '12px', ...typo.small, color: colors.textMuted }}>
            Current Score: {testScore} / {testIndex + (answered ? 1 : 0)}
          </div>
        </div>

        {renderBottomBar(false, 'Complete Quiz First', undefined)}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      }}>
        {renderHeader()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px',
          paddingBottom: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '100px', marginBottom: '16px' }}>🌡️</div>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Bimetallic Strips Mastered!
          </h1>

          <div style={{
            display: 'inline-block',
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentSecondary})`,
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            padding: '12px 24px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}>
            {testScore} / {testQuestions.length} ({percentage}%)
          </div>

          <div style={{
            backgroundColor: `${colors.accent}15`,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.accent}30`,
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            <h3 style={{ fontWeight: 600, color: colors.accentSecondary, marginBottom: '12px' }}>Key Concepts Mastered</h3>
            <ul style={{ ...typo.small, color: colors.textSecondary }}>
              {[
                'Two bonded metals bend toward the lower-alpha metal when heated',
                'Curvature is proportional to Delta alpha x Delta T / thickness',
                'Hysteresis prevents rapid cycling in thermostats',
                'Snap-action provides reliable switching',
                'Applications: thermostats, toasters, fire alarms, circuit breakers'
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ fontWeight: 600, color: colors.textPrimary, marginBottom: '12px' }}>The Bending Principle</h3>
            <div style={{
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'monospace', fontSize: '18px', color: colors.accentSecondary, marginBottom: '8px' }}>
                kappa = 6(alpha1 - alpha2)(T - T0) / t
              </p>
              <p style={{ ...typo.small, color: colors.textMuted }}>
                Curvature depends on alpha difference and temperature change
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(true, 'Return to Dashboard')}
      </div>
    );
  }

  return null;
};

export default BimetalThermostatRenderer;
