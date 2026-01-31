'use client';

import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

interface GameEvent {
  type: 'prediction' | 'observation' | 'interaction' | 'completion';
  phase: Phase;
  data: Record<string, unknown>;
}

interface TransformerRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
  primaryTurns: number;
  secondaryTurns: number;
  inputVoltage: number;
  isAC: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'What determines the voltage ratio in a transformer?',
    options: [
      { text: 'The thickness of the wire', correct: false },
      { text: 'The ratio of turns in primary to secondary coils', correct: true },
      { text: 'The speed of the AC current', correct: false },
      { text: 'The size of the iron core', correct: false }
    ]
  },
  {
    question: 'Why don\'t transformers work with DC (direct current)?',
    options: [
      { text: 'DC is too weak', correct: false },
      { text: 'DC flows in the wrong direction', correct: false },
      { text: 'DC creates a static field - no changing flux to induce current', correct: true },
      { text: 'DC would melt the transformer', correct: false }
    ]
  },
  {
    question: 'A transformer steps up voltage from 100V to 1000V. What happens to current?',
    options: [
      { text: 'Current increases 10x', correct: false },
      { text: 'Current stays the same', correct: false },
      { text: 'Current decreases to 1/10', correct: true },
      { text: 'Current becomes DC', correct: false }
    ]
  },
  {
    question: 'Why do power lines use high voltage for transmission?',
    options: [
      { text: 'High voltage travels faster', correct: false },
      { text: 'High voltage looks more impressive', correct: false },
      { text: 'Lower current means less I squared R heat loss in wires', correct: true },
      { text: 'High voltage is safer', correct: false }
    ]
  },
  {
    question: 'A transformer has 500 turns on the primary and 100 turns on the secondary. What type is it?',
    options: [
      { text: 'Step-up transformer', correct: false },
      { text: 'Step-down transformer', correct: true },
      { text: 'Isolation transformer', correct: false },
      { text: 'Auto-transformer', correct: false }
    ]
  },
  {
    question: 'What is the purpose of the iron core in a transformer?',
    options: [
      { text: 'To conduct electricity between coils', correct: false },
      { text: 'To concentrate and channel magnetic flux between coils', correct: true },
      { text: 'To cool down the transformer', correct: false },
      { text: 'To add weight for stability', correct: false }
    ]
  },
  {
    question: 'Why are transformer cores made of laminated sheets instead of solid iron?',
    options: [
      { text: 'Laminated sheets are cheaper to manufacture', correct: false },
      { text: 'To reduce eddy currents and energy loss', correct: true },
      { text: 'Solid iron would be too heavy', correct: false },
      { text: 'To make the transformer easier to assemble', correct: false }
    ]
  },
  {
    question: 'Your phone charger converts 120V AC to 5V DC. Which component steps down the voltage?',
    options: [
      { text: 'A resistor', correct: false },
      { text: 'A capacitor', correct: false },
      { text: 'A transformer (or switching circuit)', correct: true },
      { text: 'A diode', correct: false }
    ]
  },
  {
    question: 'In an ideal transformer, what is conserved between primary and secondary?',
    options: [
      { text: 'Voltage', correct: false },
      { text: 'Current', correct: false },
      { text: 'Power (V x I)', correct: true },
      { text: 'Frequency doubles', correct: false }
    ]
  },
  {
    question: 'A step-up transformer increases voltage. What happens to the output current compared to input?',
    options: [
      { text: 'Output current increases proportionally', correct: false },
      { text: 'Output current decreases proportionally', correct: true },
      { text: 'Output current stays the same', correct: false },
      { text: 'Output current becomes zero', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Power Grid',
    description: 'Power plants step up to 400kV for transmission, then step down to 240V for homes. This reduces losses by 99%!',
    icon: '⚡'
  },
  {
    title: 'Phone Chargers',
    description: 'Your phone charger contains a tiny transformer (or switching circuit) to convert 120/240V to the 5V your phone needs.',
    icon: '📱'
  },
  {
    title: 'Welding Equipment',
    description: 'Arc welders step down voltage but massively increase current, creating enough heat to melt steel.',
    icon: '🔧'
  },
  {
    title: 'Microwave Ovens',
    description: 'A transformer steps up 120V to 4000V to power the magnetron that generates microwaves.',
    icon: '📡'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function isValidPhase(phase: string): phase is Phase {
  return PHASES.includes(phase as Phase);
}

function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TransformerRenderer({ phase: initialPhase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: TransformerRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(initialPhase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

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

  // Simulation state
  const [primaryTurns, setPrimaryTurns] = useState(100);
  const [secondaryTurns, setSecondaryTurns] = useState(200);
  const [inputVoltage, setInputVoltage] = useState(120);
  const [isAC, setIsAC] = useState(true);
  const [acPhase, setAcPhase] = useState(0);

  // Twist state - DC comparison
  const [twistMode, setTwistMode] = useState<'ac' | 'dc'>('ac');

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Calculated values
  const turnsRatio = secondaryTurns / primaryTurns;
  const outputVoltage = isAC ? inputVoltage * turnsRatio : 0;
  const inputCurrent = 1; // Assume 1A input for simplicity
  const outputCurrent = isAC ? inputCurrent / turnsRatio : 0;
  const transformerType = turnsRatio > 1 ? 'Step-Up' : turnsRatio < 1 ? 'Step-Down' : 'Isolation';

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    if (onPhaseComplete) onPhaseComplete();

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // ─── Animation Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAC) return;

    const interval = setInterval(() => {
      setAcPhase(p => (p + 0.15) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [isAC]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setPrimaryTurns(100);
      setSecondaryTurns(200);
      setInputVoltage(120);
      setIsAC(true);
    }
    if (phase === 'twist_play') {
      setTwistMode('ac');
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Lab',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery'
  };

  const renderProgressBar = () => null; // Replaced by header progress dots

  const renderTransformer = (pTurns: number, sTurns: number, vIn: number, ac: boolean, animPhase: number) => {
    const ratio = sTurns / pTurns;
    const vOut = ac ? vIn * ratio : 0;
    const currentIntensity = ac ? Math.abs(Math.sin(animPhase)) : 0;
    const fluxIntensity = ac ? currentIntensity : 0;
    const inputCurrent = 1; // Assume 1A input
    const outputCurrent = ac ? inputCurrent / ratio : 0;

    return (
      <svg viewBox="0 0 500 340" className="w-full" style={{ maxHeight: '320px' }}>
        <defs>
          {/* Premium iron core gradient with laminated steel appearance */}
          <linearGradient id="xfmrIronCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="20%" stopColor="#4b5563" />
            <stop offset="40%" stopColor="#374151" />
            <stop offset="60%" stopColor="#4b5563" />
            <stop offset="80%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Laminated steel texture for core edges */}
          <linearGradient id="xfmrLaminatedSteel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="10%" stopColor="#475569" />
            <stop offset="20%" stopColor="#64748b" />
            <stop offset="30%" stopColor="#475569" />
            <stop offset="40%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="60%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="80%" stopColor="#64748b" />
            <stop offset="90%" stopColor="#475569" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Primary coil copper gradient */}
          <linearGradient id="xfmrCopperPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="75%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Secondary coil copper gradient */}
          <linearGradient id="xfmrCopperSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="25%" stopColor="#facc15" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>

          {/* Magnetic flux radial gradient - blue field effect */}
          <radialGradient id="xfmrMagneticFlux" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#2563eb" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </radialGradient>

          {/* Primary current glow - red energy */}
          <radialGradient id="xfmrPrimaryGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
            <stop offset="30%" stopColor="#f87171" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>

          {/* Secondary current glow - green energy */}
          <radialGradient id="xfmrSecondaryGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="30%" stopColor="#4ade80" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* Indicator panel gradient */}
          <linearGradient id="xfmrPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Lab background gradient */}
          <linearGradient id="xfmrLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Glow filter for active elements */}
          <filter id="xfmrGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong glow for flux visualization */}
          <filter id="xfmrFluxGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft inner glow for coils */}
          <filter id="xfmrCoilGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Voltage indicator glow */}
          <filter id="xfmrVoltageGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Premium lab background */}
        <rect width="500" height="340" fill="url(#xfmrLabBg)" />

        {/* Subtle grid pattern */}
        <pattern id="xfmrGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
        </pattern>
        <rect width="500" height="340" fill="url(#xfmrGrid)" />

        {/* === PREMIUM IRON CORE === */}
        <g transform="translate(145, 55)">
          {/* Outer core frame with laminated appearance */}
          <rect x="0" y="0" width="210" height="190" rx="8" fill="url(#xfmrIronCore)" stroke="url(#xfmrLaminatedSteel)" strokeWidth="4" />

          {/* Inner cutout (air gap / winding window) */}
          <rect x="25" y="25" width="160" height="140" rx="4" fill="#030712" stroke="#1f2937" strokeWidth="2" />

          {/* Lamination lines for realism */}
          {[...Array(8)].map((_, i) => (
            <line key={i} x1="5" y1={25 + i * 20} x2="20" y2={25 + i * 20} stroke="#374151" strokeWidth="1" opacity="0.6" />
          ))}
          {[...Array(8)].map((_, i) => (
            <line key={i} x1="190" y1={25 + i * 20} x2="205" y2={25 + i * 20} stroke="#374151" strokeWidth="1" opacity="0.6" />
          ))}

          {/* Core label */}
          <text x="105" y="-8" textAnchor="middle" className="text-[9px] fill-slate-400 font-medium uppercase tracking-wider">Laminated Iron Core</text>
        </g>

        {/* === MAGNETIC FLUX VISUALIZATION === */}
        {ac && (
          <g style={{ opacity: fluxIntensity * 0.9 }} filter="url(#xfmrFluxGlow)">
            {/* Top flux path */}
            <rect x="170" y="75" width="160" height="18" rx="3" fill="url(#xfmrMagneticFlux)">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.5s" repeatCount="indefinite" />
            </rect>
            {/* Bottom flux path */}
            <rect x="170" y="207" width="160" height="18" rx="3" fill="url(#xfmrMagneticFlux)">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.5s" repeatCount="indefinite" />
            </rect>
            {/* Left flux path */}
            <rect x="150" y="80" width="18" height="150" rx="3" fill="url(#xfmrMagneticFlux)">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
            </rect>
            {/* Right flux path */}
            <rect x="332" y="80" width="18" height="150" rx="3" fill="url(#xfmrMagneticFlux)">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
            </rect>

            {/* Flux direction arrows */}
            <g className="fill-blue-300" style={{ opacity: 0.8 }}>
              <polygon points="250,82 256,75 256,89" />
              <polygon points="250,218 244,225 256,225" />
              <polygon points="158,150 165,144 165,156" />
              <polygon points="342,150 335,156 335,144" />
            </g>

            {/* Flux label */}
            <text x="250" y="150" textAnchor="middle" className="text-[8px] fill-blue-300 font-medium">
              Magnetic Flux (Phi)
            </text>
          </g>
        )}

        {/* === PRIMARY COIL (LEFT) === */}
        <g transform="translate(180, 95)">
          {/* Coil glow background when active */}
          {ac && (
            <ellipse cx="0" cy="55" rx="30" ry="65" fill="url(#xfmrPrimaryGlow)" style={{ opacity: currentIntensity * 0.5 }} />
          )}

          {/* Copper windings */}
          {[...Array(Math.min(Math.floor(pTurns / 10), 10))].map((_, i) => (
            <g key={i}>
              <ellipse
                cx="0"
                cy={10 + i * 11}
                rx="22"
                ry="7"
                fill="none"
                stroke="url(#xfmrCopperPrimary)"
                strokeWidth="5"
                filter={ac ? "url(#xfmrCoilGlow)" : undefined}
                style={{ opacity: ac ? 0.7 + currentIntensity * 0.3 : 0.5 }}
              />
              {/* Highlight on each coil */}
              <ellipse
                cx="-5"
                cy={8 + i * 11}
                rx="8"
                ry="2"
                fill="#fde68a"
                opacity="0.3"
              />
            </g>
          ))}

          {/* Primary label */}
          <text x="0" y="135" textAnchor="middle" className="text-[10px] fill-red-400 font-bold">Primary</text>
          <text x="0" y="148" textAnchor="middle" className="text-[9px] fill-slate-400">{pTurns} turns</text>
        </g>

        {/* === SECONDARY COIL (RIGHT) === */}
        <g transform="translate(320, 95)">
          {/* Coil glow background when active */}
          {ac && vOut > 0 && (
            <ellipse cx="0" cy="55" rx="30" ry="65" fill="url(#xfmrSecondaryGlow)" style={{ opacity: currentIntensity * 0.5 }} />
          )}

          {/* Copper windings - more turns visible for step-up */}
          {[...Array(Math.min(Math.floor(sTurns / 10), 12))].map((_, i) => (
            <g key={i}>
              <ellipse
                cx="0"
                cy={8 + i * 9}
                rx="22"
                ry="6"
                fill="none"
                stroke="url(#xfmrCopperSecondary)"
                strokeWidth="4"
                filter={ac && vOut > 0 ? "url(#xfmrCoilGlow)" : undefined}
                style={{ opacity: ac && vOut > 0 ? 0.7 + currentIntensity * 0.3 : 0.5 }}
              />
              {/* Highlight on each coil */}
              <ellipse
                cx="-5"
                cy={6 + i * 9}
                rx="7"
                ry="2"
                fill="#fef08a"
                opacity="0.3"
              />
            </g>
          ))}

          {/* Secondary label */}
          <text x="0" y="135" textAnchor="middle" className="text-[10px] fill-green-400 font-bold">Secondary</text>
          <text x="0" y="148" textAnchor="middle" className="text-[9px] fill-slate-400">{sTurns} turns</text>
        </g>

        {/* === INPUT VOLTAGE/CURRENT INDICATOR === */}
        <g transform="translate(15, 75)">
          <rect x="0" y="0" width="95" height="110" rx="10" fill="url(#xfmrPanelBg)" stroke="#374151" strokeWidth="2" />
          <rect x="3" y="3" width="89" height="20" rx="6" fill="#0f172a" />
          <text x="47" y="17" textAnchor="middle" className="text-[10px] fill-slate-300 font-bold uppercase tracking-wide">Input</text>

          {/* Voltage display */}
          <rect x="8" y="28" width="79" height="32" rx="4" fill="#030712" stroke="#1e3a8a" strokeWidth="1" />
          <text x="47" y="50" textAnchor="middle" className="text-[16px] fill-red-400 font-bold font-mono" filter="url(#xfmrVoltageGlow)">
            {vIn}V
          </text>

          {/* Current display */}
          <rect x="8" y="65" width="79" height="20" rx="4" fill="#030712" stroke="#1e3a8a" strokeWidth="1" />
          <text x="47" y="79" textAnchor="middle" className="text-[11px] fill-amber-400 font-mono">
            {inputCurrent.toFixed(1)}A
          </text>

          {/* AC/DC indicator */}
          <rect x="8" y="90" width="79" height="16" rx="4" fill={ac ? '#14532d' : '#450a0a'} stroke={ac ? '#22c55e' : '#ef4444'} strokeWidth="1" />
          <text x="47" y="102" textAnchor="middle" className={`text-[10px] font-bold ${ac ? 'fill-green-400' : 'fill-red-400'}`}>
            {ac ? 'AC ∿ 60Hz' : 'DC ═'}
          </text>
        </g>

        {/* === OUTPUT VOLTAGE/CURRENT INDICATOR === */}
        <g transform="translate(390, 75)">
          <rect x="0" y="0" width="95" height="110" rx="10" fill="url(#xfmrPanelBg)" stroke="#374151" strokeWidth="2" />
          <rect x="3" y="3" width="89" height="20" rx="6" fill="#0f172a" />
          <text x="47" y="17" textAnchor="middle" className="text-[10px] fill-slate-300 font-bold uppercase tracking-wide">Output</text>

          {/* Voltage display */}
          <rect x="8" y="28" width="79" height="32" rx="4" fill="#030712" stroke={vOut > 0 ? '#14532d' : '#7f1d1d'} strokeWidth="1" />
          <text x="47" y="50" textAnchor="middle" className={`text-[16px] font-bold font-mono ${vOut > 0 ? 'fill-green-400' : 'fill-red-400'}`} filter="url(#xfmrVoltageGlow)">
            {vOut.toFixed(0)}V
          </text>

          {/* Current display */}
          <rect x="8" y="65" width="79" height="20" rx="4" fill="#030712" stroke={vOut > 0 ? '#14532d' : '#7f1d1d'} strokeWidth="1" />
          <text x="47" y="79" textAnchor="middle" className={`text-[11px] font-mono ${vOut > 0 ? 'fill-cyan-400' : 'fill-gray-500'}`}>
            {outputCurrent.toFixed(2)}A
          </text>

          {/* Status indicator */}
          <rect x="8" y="90" width="79" height="16" rx="4" fill={vOut > 0 ? '#14532d' : '#450a0a'} stroke={vOut > 0 ? '#22c55e' : '#ef4444'} strokeWidth="1" />
          <text x="47" y="102" textAnchor="middle" className={`text-[10px] font-bold ${vOut > 0 ? 'fill-green-400' : 'fill-red-400'}`}>
            {vOut > 0 ? 'ACTIVE' : 'NO OUTPUT'}
          </text>
        </g>

        {/* === WAVEFORM VISUALIZATION === */}
        <g transform="translate(0, 260)">
          {/* Input waveform panel */}
          <rect x="15" y="0" width="95" height="50" rx="6" fill="#030712" stroke="#374151" strokeWidth="1" />
          <text x="62" y="12" textAnchor="middle" className="text-[8px] fill-slate-400">Input Waveform</text>
          {ac ? (
            <path
              d={`M 22 35 ${[...Array(14)].map((_, i) =>
                `L ${22 + i * 6} ${35 + Math.sin(animPhase + i * 0.6) * 12}`
              ).join(' ')}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <line x1="22" y1="35" x2="100" y2="35" stroke="#6b7280" strokeWidth="2" strokeDasharray="4 2" />
          )}

          {/* Output waveform panel */}
          <rect x="390" y="0" width="95" height="50" rx="6" fill="#030712" stroke="#374151" strokeWidth="1" />
          <text x="437" y="12" textAnchor="middle" className="text-[8px] fill-slate-400">Output Waveform</text>
          {ac && vOut > 0 ? (
            <path
              d={`M 397 35 ${[...Array(14)].map((_, i) =>
                `L ${397 + i * 6} ${35 + Math.sin(animPhase + i * 0.6) * 12 * Math.min(ratio, 2)}`
              ).join(' ')}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <line x1="397" y1="35" x2="475" y2="35" stroke="#374151" strokeWidth="2" strokeDasharray="4 2" />
          )}
        </g>

        {/* === TRANSFORMER TYPE BADGE === */}
        <g transform="translate(175, 5)">
          <rect x="0" y="0" width="150" height="38" rx="10" fill="url(#xfmrPanelBg)" stroke={ratio > 1 ? '#22c55e' : ratio < 1 ? '#f97316' : '#3b82f6'} strokeWidth="2" />
          <text x="75" y="16" textAnchor="middle" className="text-[9px] fill-slate-400 uppercase tracking-wider">Transformer Type</text>
          <text x="75" y="31" textAnchor="middle" className={`text-[13px] font-bold ${
            ratio > 1 ? 'fill-green-400' : ratio < 1 ? 'fill-orange-400' : 'fill-blue-400'
          }`}>
            {ratio > 1 ? '⬆ STEP-UP' : ratio < 1 ? '⬇ STEP-DOWN' : '= ISOLATION'}
          </text>
        </g>

        {/* === TURNS RATIO DISPLAY === */}
        <g transform="translate(200, 315)">
          <rect x="0" y="0" width="100" height="22" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x="50" y="15" textAnchor="middle" className="text-[10px] fill-yellow-400 font-mono font-medium">
            Ratio: {ratio.toFixed(2)}:1
          </text>
        </g>

        {/* === CONNECTION WIRES === */}
        {/* Input wires */}
        <line x1="110" y1="105" x2="160" y2="105" stroke="#ef4444" strokeWidth="2" strokeDasharray={ac ? "none" : "4 2"} />
        <line x1="110" y1="165" x2="160" y2="165" stroke="#ef4444" strokeWidth="2" strokeDasharray={ac ? "none" : "4 2"} />

        {/* Output wires */}
        <line x1="340" y1="105" x2="390" y2="105" stroke={vOut > 0 ? "#22c55e" : "#374151"} strokeWidth="2" />
        <line x1="340" y1="165" x2="390" y2="165" stroke={vOut > 0 ? "#22c55e" : "#374151"} strokeWidth="2" />

        {/* Power flow indicators */}
        {ac && (
          <g style={{ opacity: currentIntensity }}>
            <circle cx={130 + Math.sin(animPhase * 2) * 15} cy="105" r="3" fill="#fca5a5" filter="url(#xfmrGlow)" />
            <circle cx={130 - Math.sin(animPhase * 2) * 15} cy="165" r="3" fill="#fca5a5" filter="url(#xfmrGlow)" />
          </g>
        )}
        {ac && vOut > 0 && (
          <g style={{ opacity: currentIntensity }}>
            <circle cx={365 + Math.sin(animPhase * 2) * 12} cy="105" r="3" fill="#86efac" filter="url(#xfmrGlow)" />
            <circle cx={365 - Math.sin(animPhase * 2) * 12} cy="165" r="3" fill="#86efac" filter="url(#xfmrGlow)" />
          </g>
        )}
      </svg>
    );
  };

  const renderPowerTransmission = (useHighVoltage: boolean) => {
    const transmissionVoltage = useHighVoltage ? 400000 : 240;
    const current = useHighVoltage ? 0.0006 : 1000; // P = VI = 240W
    const wireResistance = 10; // ohms
    const powerLoss = current * current * wireResistance;
    const efficiency = ((240 - powerLoss) / 240) * 100;

    return (
      <svg viewBox="0 0 500 220" className="w-full" style={{ maxHeight: '180px' }}>
        <defs>
          {/* Building gradient */}
          <linearGradient id="xfmrBuildingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="30%" stopColor="#374151" />
            <stop offset="70%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Transformer box gradient */}
          <linearGradient id="xfmrBoxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* High voltage wire glow */}
          <filter id="xfmrWireGlow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Heat glow filter */}
          <filter id="xfmrHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Transmission line gradient */}
          <linearGradient id="xfmrLineHV" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>

          <linearGradient id="xfmrLineLV" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* Background gradient */}
          <linearGradient id="xfmrTransBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="220" fill="url(#xfmrTransBg)" />

        {/* Grid pattern */}
        <pattern id="xfmrTransGrid" width="25" height="25" patternUnits="userSpaceOnUse">
          <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.3" />
        </pattern>
        <rect width="500" height="220" fill="url(#xfmrTransGrid)" />

        {/* === POWER PLANT === */}
        <g transform="translate(20, 70)">
          <rect x="0" y="0" width="70" height="70" rx="6" fill="url(#xfmrBuildingGrad)" stroke="#475569" strokeWidth="2" />
          {/* Smokestacks */}
          <rect x="10" y="-20" width="12" height="25" rx="2" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          <rect x="30" y="-25" width="12" height="30" rx="2" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          <rect x="50" y="-15" width="10" height="20" rx="2" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          {/* Windows */}
          <rect x="8" y="12" width="14" height="10" rx="1" fill="#fbbf24" opacity="0.6" />
          <rect x="28" y="12" width="14" height="10" rx="1" fill="#fbbf24" opacity="0.5" />
          <rect x="48" y="12" width="14" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
          <rect x="8" y="35" width="54" height="20" rx="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />
          <text x="35" y="49" textAnchor="middle" className="text-[9px] fill-slate-300 font-medium">GENERATOR</text>
          {/* Label */}
          <text x="35" y="85" textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">Power Plant</text>
          <text x="35" y="97" textAnchor="middle" className="text-[11px] fill-yellow-400 font-bold">240V AC</text>
        </g>

        {/* === STEP-UP TRANSFORMER === */}
        {useHighVoltage && (
          <g transform="translate(110, 85)">
            <rect x="0" y="0" width="50" height="50" rx="6" fill="url(#xfmrBoxGrad)" stroke="#22c55e" strokeWidth="2" />
            <rect x="5" y="5" width="40" height="15" rx="3" fill="#030712" stroke="#14532d" strokeWidth="1" />
            <text x="25" y="16" textAnchor="middle" className="text-[8px] fill-green-400 font-bold">STEP-UP</text>
            {/* Coil symbols */}
            <ellipse cx="15" cy="35" rx="8" ry="5" fill="none" stroke="#f59e0b" strokeWidth="2" />
            <ellipse cx="35" cy="35" rx="8" ry="5" fill="none" stroke="#fde047" strokeWidth="2" />
            <text x="25" y="60" textAnchor="middle" className="text-[7px] fill-slate-500">1:1667</text>
          </g>
        )}

        {/* === TRANSMISSION LINES === */}
        <g>
          {/* Power line towers */}
          {useHighVoltage && (
            <>
              <polygon points="200,60 210,120 190,120" fill="#374151" stroke="#475569" strokeWidth="1" />
              <line x1="185" y1="65" x2="215" y2="65" stroke="#475569" strokeWidth="2" />
              <polygon points="290,60 300,120 280,120" fill="#374151" stroke="#475569" strokeWidth="1" />
              <line x1="275" y1="65" x2="305" y2="65" stroke="#475569" strokeWidth="2" />
            </>
          )}

          {/* Transmission wire */}
          <line
            x1={useHighVoltage ? 160 : 90}
            y1={useHighVoltage ? 65 : 105}
            x2={useHighVoltage ? 330 : 390}
            y2={useHighVoltage ? 65 : 105}
            stroke={useHighVoltage ? 'url(#xfmrLineHV)' : 'url(#xfmrLineLV)'}
            strokeWidth={useHighVoltage ? 3 : 8}
            filter={useHighVoltage ? 'url(#xfmrWireGlow)' : undefined}
          />

          {/* Second wire for HV */}
          {useHighVoltage && (
            <line x1="160" y1="75" x2="330" y2="75" stroke="url(#xfmrLineHV)" strokeWidth="2" filter="url(#xfmrWireGlow)" />
          )}

          {/* Voltage/Current label */}
          <rect x="195" y={useHighVoltage ? 82 : 70} width="100" height="28" rx="6" fill="#0f172a" stroke={useHighVoltage ? '#22c55e' : '#ef4444'} strokeWidth="1" />
          <text x="245" y={useHighVoltage ? 93 : 81} textAnchor="middle" className={`text-[9px] font-bold ${useHighVoltage ? 'fill-green-400' : 'fill-red-400'}`}>
            {useHighVoltage ? '400,000V' : '240V'}
          </text>
          <text x="245" y={useHighVoltage ? 105 : 93} textAnchor="middle" className={`text-[8px] ${useHighVoltage ? 'fill-cyan-400' : 'fill-orange-400'}`}>
            {useHighVoltage ? '0.6mA' : '1000A'}
          </text>
        </g>

        {/* Heat loss visualization for low voltage */}
        {!useHighVoltage && (
          <g filter="url(#xfmrHeatGlow)">
            {[...Array(8)].map((_, i) => (
              <g key={i}>
                <circle cx={120 + i * 35} cy="90" r="8" fill="#ef4444" opacity="0.6">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${0.3 + i * 0.1}s`} repeatCount="indefinite" />
                  <animate attributeName="r" values="6;10;6" dur={`${0.4 + i * 0.05}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={120 + i * 35} cy="90" r="4" fill="#fbbf24" opacity="0.8">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur={`${0.25 + i * 0.08}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            <text x="245" y="125" textAnchor="middle" className="text-[10px] fill-red-400 font-bold">MASSIVE HEAT LOSS!</text>
          </g>
        )}

        {/* === STEP-DOWN TRANSFORMER === */}
        {useHighVoltage && (
          <g transform="translate(330, 85)">
            <rect x="0" y="0" width="50" height="50" rx="6" fill="url(#xfmrBoxGrad)" stroke="#f97316" strokeWidth="2" />
            <rect x="5" y="5" width="40" height="15" rx="3" fill="#030712" stroke="#7c2d12" strokeWidth="1" />
            <text x="25" y="16" textAnchor="middle" className="text-[7px] fill-orange-400 font-bold">STEP-DOWN</text>
            {/* Coil symbols */}
            <ellipse cx="15" cy="35" rx="8" ry="5" fill="none" stroke="#fde047" strokeWidth="2" />
            <ellipse cx="35" cy="35" rx="8" ry="5" fill="none" stroke="#f59e0b" strokeWidth="2" />
            <text x="25" y="60" textAnchor="middle" className="text-[7px] fill-slate-500">1667:1</text>
          </g>
        )}

        {/* === HOUSE === */}
        <g transform="translate(400, 70)">
          <rect x="0" y="20" width="70" height="50" rx="4" fill="url(#xfmrBuildingGrad)" stroke="#475569" strokeWidth="2" />
          {/* Roof */}
          <polygon points="35,-5 -5,20 75,20" fill="#374151" stroke="#475569" strokeWidth="1" />
          {/* Door */}
          <rect x="28" y="45" width="14" height="25" rx="2" fill="#78350f" stroke="#92400e" strokeWidth="1" />
          {/* Windows */}
          <rect x="8" y="30" width="14" height="12" rx="1" fill="#fbbf24" opacity="0.7" />
          <rect x="48" y="30" width="14" height="12" rx="1" fill="#fbbf24" opacity="0.6" />
          {/* Label */}
          <text x="35" y="85" textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">Home</text>
          <text x="35" y="97" textAnchor="middle" className="text-[11px] fill-yellow-400 font-bold">240V AC</text>
        </g>

        {/* === EFFICIENCY DISPLAY === */}
        <g transform="translate(160, 165)">
          <rect x="0" y="0" width="170" height="45" rx="8" fill="#0f172a" stroke={efficiency > 90 ? '#22c55e' : '#ef4444'} strokeWidth="2" />
          <text x="85" y="16" textAnchor="middle" className="text-[9px] fill-slate-400 uppercase tracking-wide">Power Delivered to Home</text>
          <text x="85" y="36" textAnchor="middle" className={`text-[14px] font-bold ${efficiency > 90 ? 'fill-green-400' : 'fill-red-400'}`}>
            {efficiency > 0 ? efficiency.toFixed(1) : '0.0'}% Efficiency
          </text>
          <text x="85" y="42" textAnchor="middle" className={`text-[8px] ${efficiency > 90 ? 'fill-emerald-300' : 'fill-red-300'}`}>
            {useHighVoltage ? '(Minimal Loss)' : '(Huge Loss - Wires Melt!)'}
          </text>
        </g>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-yellow-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-yellow-100 to-orange-200 bg-clip-text text-transparent">
        The Power Grid Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why 400,000 volts flow through power lines—yet your home only uses 120V
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-orange-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">⚡</div>
          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              If you tried to send household current through long wires, they&apos;d glow red hot!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              A simple device called a &quot;transformer&quot; makes our power grid possible.
            </p>
            <div className="pt-2">
              <p className="text-base text-yellow-400 font-semibold">
                Why did AC win the &quot;War of Currents&quot;?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); nextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/25 hover:scale-[1.02] active:scale-[0.98]"
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
          <span className="text-yellow-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">Make Your Prediction</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          A transformer has two coils wound around an iron core. If the secondary coil
          has twice as many turns as the primary, what happens to the output voltage?
        </p>
        <div className="space-y-3">
          {[
            'Output voltage is halved',
            'Output voltage stays the same',
            'Output voltage doubles',
            'No current flows at all'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setPrediction(option);
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                prediction === option
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {prediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Transformer Simulator</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderTransformer(primaryTurns, secondaryTurns, inputVoltage, isAC, acPhase)}

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-red-400 font-medium mb-2">
              Primary Turns: {primaryTurns}
            </label>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={primaryTurns}
              onChange={(e) => setPrimaryTurns(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <label className="block text-green-400 font-medium mb-2">
              Secondary Turns: {secondaryTurns}
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={secondaryTurns}
              onChange={(e) => setSecondaryTurns(Number(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-yellow-400 font-medium mb-2">
            Input Voltage: {inputVoltage}V
          </label>
          <input
            type="range"
            min="12"
            max="240"
            step="12"
            value={inputVoltage}
            onChange={(e) => setInputVoltage(Number(e.target.value))}
            className="w-full accent-yellow-500"
          />
        </div>

        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-center">
            <span className="text-yellow-400">Turns Ratio:</span> {turnsRatio.toFixed(2)}:1
            {' | '}
            <span className="text-green-400">Output:</span> {outputVoltage.toFixed(0)}V
            {' | '}
            <span className="text-cyan-400">Type:</span> {transformerType}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Understand the Physics →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">The Magic of Magnetic Coupling</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <h3 className="text-yellow-400 font-bold mb-2">How Transformers Work</h3>
          <p className="text-gray-300">
            AC current in the primary creates a <span className="text-blue-400 font-bold">changing magnetic flux</span> in
            the iron core. This flux passes through the secondary coil and induces voltage by Faraday&apos;s law!
          </p>
        </div>

        <div className="p-4 bg-gray-700 rounded-lg text-center">
          <p className="text-white font-mono text-lg">V₂/V₁ = N₂/N₁</p>
          <p className="text-gray-400 text-sm mt-2">
            Output voltage / Input voltage = Secondary turns / Primary turns
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
            <h4 className="text-green-400 font-bold mb-2">Step-Up</h4>
            <p className="text-gray-300 text-sm">
              More secondary turns → Higher voltage, lower current
              <br />
              Used for: Power transmission
            </p>
          </div>
          <div className="p-4 bg-orange-900/30 rounded-lg border border-orange-600">
            <h4 className="text-orange-400 font-bold mb-2">Step-Down</h4>
            <p className="text-gray-300 text-sm">
              Fewer secondary turns → Lower voltage, higher current
              <br />
              Used for: Phone chargers, doorbells
            </p>
          </div>
        </div>

        <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-600">
          <p className="text-purple-300">
            💡 <strong>Conservation of Energy:</strong> Power in ≈ Power out.
            If voltage goes up 10×, current goes down 10×. You can&apos;t create free energy!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          What About DC? →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">The DC Question</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 mb-6">
          What happens if you connect a battery (DC) to the primary coil of a transformer?
        </p>
        <div className="space-y-3">
          {[
            'The transformer works normally',
            'The output voltage is doubled',
            'No output voltage - DC creates a static field',
            'The transformer becomes a motor'
          ].map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound('click');
                setTwistPrediction(option);
              }}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                twistPrediction === option
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {twistPrediction && (
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          See What Happens →
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">AC vs DC: The Critical Difference</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        {renderTransformer(100, 200, 120, twistMode === 'ac', acPhase)}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onMouseDown={() => {
              playSound('click');
              setTwistMode('ac');
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              twistMode === 'ac' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            ∿ AC Input
          </button>
          <button
            onMouseDown={() => {
              playSound('click');
              setTwistMode('dc');
            }}
            className={`px-6 py-3 rounded-lg font-bold ${
              twistMode === 'dc' ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            ═ DC Input
          </button>
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${
          twistMode === 'ac'
            ? 'bg-green-900/30 border-green-600'
            : 'bg-red-900/30 border-red-600'
        }`}>
          <p className={`text-center ${twistMode === 'ac' ? 'text-green-300' : 'text-red-300'}`}>
            {twistMode === 'ac' ? (
              <>
                <span className="font-bold">AC: Constantly changing current → changing flux → induced EMF!</span>
                <br />
                <span className="text-sm">Output: 240V AC</span>
              </>
            ) : (
              <>
                <span className="font-bold">DC: Constant current → static flux → NO induction!</span>
                <br />
                <span className="text-sm">Output: 0V (nothing happens after initial moment)</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          Why This Matters →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Why AC Won the War of Currents</h2>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="p-4 bg-green-900/30 rounded-lg border border-green-600">
          <h3 className="text-green-400 font-bold mb-2">Tesla&apos;s Triumph</h3>
          <p className="text-gray-300">
            In the 1880s, Edison promoted DC while Tesla/Westinghouse championed AC.
            <span className="text-yellow-400 font-bold"> AC won because transformers work!</span>{' '}
            You can step voltage up for efficient transmission, then down for safe use.
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-white font-bold mb-2 text-center">Power Loss Comparison</h4>
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">With High Voltage Transmission (AC + Transformers):</p>
              {renderPowerTransmission(true)}
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">With Low Voltage (DC, no transformers):</p>
              {renderPowerTransmission(false)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm">
            💡 <strong>The Math:</strong> Power loss = I²R. If you step up voltage 1000×,
            current drops 1000×, and losses drop by 1,000,000×!
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
        >
          See Real Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Real-World Transformers</h2>
      <p className="text-gray-400 text-center">Explore how transformers power modern life</p>

      <div className="grid grid-cols-2 gap-4">
        {TRANSFER_APPS.map((app, i) => (
          <button
            key={i}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, i]));
            }}
            className={`p-4 rounded-xl text-left transition-all ${
              completedApps.has(i)
                ? 'bg-green-900/30 border-2 border-green-600'
                : 'bg-gray-800 border-2 border-gray-700 hover:border-yellow-500'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-bold mb-1">{app.title}</h3>
            <p className="text-gray-400 text-sm">{app.description}</p>
            {completedApps.has(i) && (
              <div className="mt-2 text-green-400 text-sm">✓ Explored</div>
            )}
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('complete'); nextPhase(); }}
            className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
          >
            Take the Test →
          </button>
        </div>
      )}

      {completedApps.size < 4 && (
        <p className="text-center text-gray-500">
          Explore all {4 - completedApps.size} remaining applications to continue
        </p>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const isComplete = currentQuestion >= TEST_QUESTIONS.length;

    if (isComplete) {
      const score = testAnswers.reduce(
        (acc, answer, i) => acc + (TEST_QUESTIONS[i].options[answer]?.correct ? 1 : 0),
        0
      );
      const passed = score >= 3;
      if (passed && onCorrectAnswer) onCorrectAnswer();

      return (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-white">Test Complete!</h2>
          <div className={`text-6xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {score}/{TEST_QUESTIONS.length}
          </div>
          <p className="text-gray-300">
            {passed ? 'Excellent understanding of transformers!' : 'Review the concepts and try again.'}
          </p>
          <button
            onMouseDown={() => {
              if (passed) {
                playSound('complete');
                nextPhase();
              } else {
                playSound('click');
                setTestAnswers([]);
              }
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg ${
              passed
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
            }`}
          >
            {passed ? 'Complete Lesson →' : 'Try Again'}
          </button>
        </div>
      );
    }

    const question = TEST_QUESTIONS[currentQuestion];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Knowledge Check</h2>
        <div className="flex justify-center gap-2 mb-4">
          {TEST_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentQuestion
                  ? TEST_QUESTIONS[i].options[testAnswers[i]]?.correct
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : i === currentQuestion
                    ? 'bg-yellow-500'
                    : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-white text-lg mb-6">{question.question}</p>
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  playSound(option.correct ? 'success' : 'failure');
                  setTestAnswers([...testAnswers, i]);
                }}
                className="w-full p-4 bg-gray-700 text-gray-300 rounded-lg text-left hover:bg-gray-600 transition-all"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-3xl font-bold text-white">Transformer Master!</h2>
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-gray-300 mb-4">You&apos;ve mastered:</p>
        <ul className="text-left text-gray-300 space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Voltage ratio = turns ratio
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Transformers need AC (changing flux)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Power conservation: V×I = constant
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span> Why high voltage reduces transmission losses
          </li>
        </ul>
      </div>
      <div className="p-4 bg-yellow-900/30 rounded-lg border border-yellow-600 max-w-md mx-auto">
        <p className="text-yellow-300">
          ⚡ Key Insight: Transformers make our power grid possible—step up for efficient transmission, step down for safe use!
        </p>
      </div>
      <button
        onMouseDown={() => {
          playSound('complete');
          if (onPhaseComplete) onPhaseComplete();
        }}
        className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all"
      >
        🎓 Claim Your Badge
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Transformers</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-yellow-400 w-6 shadow-lg shadow-yellow-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-yellow-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto">{renderPhase()}</div>
    </div>
  );
}
