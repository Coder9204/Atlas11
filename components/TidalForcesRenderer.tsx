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

interface TidalForcesRendererProps {
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
    question: 'Why are there TWO tidal bulges on Earth, not just one toward the Moon?',
    options: [
      { text: 'The Sun creates the second bulge', correct: false },
      { text: 'Earth\'s rotation creates the second bulge', correct: false },
      { text: 'Differential gravity: far side is pulled less than Earth\'s center, creating a second bulge', correct: true },
      { text: 'The second bulge is actually much smaller and barely noticeable', correct: false }
    ]
  },
  {
    question: 'What causes tidal forces?',
    options: [
      { text: 'The total gravitational pull of the Moon', correct: false },
      { text: 'The DIFFERENCE in gravitational pull across an object (varies with distance)', correct: true },
      { text: 'Earth\'s magnetic field interaction with the Moon', correct: false },
      { text: 'Water\'s special affinity for lunar radiation', correct: false }
    ]
  },
  {
    question: 'Why do we always see the same side of the Moon?',
    options: [
      { text: 'The Moon doesn\'t rotate', correct: false },
      { text: 'The Moon is tidally locked - its rotation period equals its orbital period', correct: true },
      { text: 'The other side is too dark to see', correct: false },
      { text: 'Earth\'s atmosphere blocks the view', correct: false }
    ]
  },
  {
    question: 'Spring tides (highest tides) occur when:',
    options: [
      { text: 'It\'s springtime', correct: false },
      { text: 'The Moon is closest to Earth', correct: false },
      { text: 'Sun, Moon, and Earth align (new/full moon) - gravitational effects add up', correct: true },
      { text: 'Earth is closest to the Sun', correct: false }
    ]
  },
  {
    question: 'What are neap tides and when do they occur?',
    options: [
      { text: 'Highest tides that occur during full moon', correct: false },
      { text: 'Weaker tides when Sun and Moon are at right angles (first/third quarter moon)', correct: true },
      { text: 'Tides that only occur in the Pacific Ocean', correct: false },
      { text: 'Tides caused by underwater earthquakes', correct: false }
    ]
  },
  {
    question: 'What is the Roche limit?',
    options: [
      { text: 'The maximum height of ocean tides', correct: false },
      { text: 'The distance within which tidal forces can tear apart a moon or satellite', correct: true },
      { text: 'The speed limit for spacecraft near planets', correct: false },
      { text: 'The minimum distance for stable planetary orbits', correct: false }
    ]
  },
  {
    question: 'Why is Jupiter\'s moon Io the most volcanically active body in our solar system?',
    options: [
      { text: 'It is very close to the Sun', correct: false },
      { text: 'Tidal heating from Jupiter\'s intense gravity flexes and heats Io\'s interior', correct: true },
      { text: 'It has a radioactive core', correct: false },
      { text: 'Solar radiation melts its surface', correct: false }
    ]
  },
  {
    question: 'How does tidal force strength depend on distance?',
    options: [
      { text: 'It decreases with 1/r (inverse of distance)', correct: false },
      { text: 'It decreases with 1/r^2 (inverse square law)', correct: false },
      { text: 'It decreases with 1/r^3 (inverse cube law)', correct: true },
      { text: 'It stays constant regardless of distance', correct: false }
    ]
  },
  {
    question: 'What would happen to Earth\'s tides if the Moon suddenly moved twice as far away?',
    options: [
      { text: 'Tides would be half as strong', correct: false },
      { text: 'Tides would be one-quarter as strong', correct: false },
      { text: 'Tides would be one-eighth as strong (1/2^3)', correct: true },
      { text: 'Tides would remain the same', correct: false }
    ]
  },
  {
    question: 'How is tidal locking related to our Moon\'s appearance?',
    options: [
      { text: 'The Moon has stopped rotating completely', correct: false },
      { text: 'Tidal friction synchronized the Moon\'s rotation with its orbit, so we see one face', correct: true },
      { text: 'Earth\'s gravity prevents us from seeing the far side', correct: false },
      { text: 'The far side is permanently in shadow', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Tidal Energy',
    description: 'Tidal barrages and turbines harvest energy from predictable tidal flow - twice daily!',
    icon: '⚡'
  },
  {
    title: 'Tidal Locking',
    description: 'The Moon shows us only one face because tidal friction synchronized its rotation with orbit.',
    icon: '🌙'
  },
  {
    title: 'Jupiter\'s Moon Io',
    description: 'Intense tidal flexing from Jupiter heats Io\'s interior, causing massive volcanic activity!',
    icon: '🌋'
  },
  {
    title: 'Navigation & Shipping',
    description: 'Accurate tide predictions are essential for ships entering harbors and coastal operations.',
    icon: '🚢'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
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
export default function TidalForcesRenderer({ phase: initialPhase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: TidalForcesRendererProps) {
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
  const [showVectors, setShowVectors] = useState(false);
  const [showDifferential, setShowDifferential] = useState(false);
  const [moonAngle, setMoonAngle] = useState(0);
  const [earthRotation, setEarthRotation] = useState(0);
  const [animPhase, setAnimPhase] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Twist state - tidal locking
  const [moonRotation, setMoonRotation] = useState(0);
  const [isTidallyLocked, setIsTidallyLocked] = useState(true);

  const navigationLockRef = useRef(false);

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

  // ─── Animation Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.03) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Orbital animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setMoonAngle(a => (a + 0.02) % (Math.PI * 2));
      setEarthRotation(r => (r + 0.15) % (Math.PI * 2)); // Earth rotates faster
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // Twist animation - tidal locking
  useEffect(() => {
    if (phase !== 'twist_play') return;

    const interval = setInterval(() => {
      setMoonAngle(a => (a + 0.02) % (Math.PI * 2));
      if (isTidallyLocked) {
        setMoonRotation(r => (r + 0.02) % (Math.PI * 2)); // Same rate as orbit
      } else {
        setMoonRotation(r => (r + 0.08) % (Math.PI * 2)); // Different rate
      }
    }, 50);

    return () => clearInterval(interval);
  }, [phase, isTidallyLocked]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setShowVectors(false);
      setShowDifferential(false);
      setMoonAngle(0);
      setEarthRotation(0);
      setIsAnimating(false);
    }
    if (phase === 'twist_play') {
      setMoonAngle(0);
      setMoonRotation(0);
      setIsTidallyLocked(true);
    }
  }, [phase]);

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderTidalScene = () => {
    const earthCenterX = 200;
    const earthCenterY = 150;
    const earthRadius = 50;
    const moonDistance = 130;

    const moonX = earthCenterX + Math.cos(moonAngle) * moonDistance;
    const moonY = earthCenterY + Math.sin(moonAngle) * moonDistance * 0.3;

    // Calculate bulge direction (toward and away from Moon)
    const bulgeAngle = moonAngle;

    // Generate stable stars based on index (avoiding Math.random in render)
    const stars = Array.from({ length: 40 }, (_, i) => ({
      x: (i * 47 + 13) % 400,
      y: (i * 31 + 7) % 280,
      r: 0.4 + (i % 5) * 0.15,
      opacity: 0.2 + (i % 4) * 0.15
    }));

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <defs>
          {/* ═══════════════════════════════════════════════════════════════════════════
              PREMIUM GRADIENTS & FILTERS FOR TIDAL FORCES VISUALIZATION
              ═══════════════════════════════════════════════════════════════════════════ */}

          {/* Deep space background gradient */}
          <linearGradient id="tidfSpaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0c1929" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Earth 3D sphere gradient - realistic blue marble */}
          <radialGradient id="tidfEarthSphere" cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="75%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>

          {/* Earth atmosphere glow */}
          <radialGradient id="tidfEarthAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="85%" stopColor="#60a5fa" stopOpacity="0.15" />
            <stop offset="95%" stopColor="#93c5fd" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.1" />
          </radialGradient>

          {/* Earth continents gradient */}
          <linearGradient id="tidfContinents" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="30%" stopColor="#16a34a" />
            <stop offset="60%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* Ocean tidal bulge gradient - dynamic water effect */}
          <linearGradient id="tidfOceanBulge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
            <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.4" />
            <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
          </linearGradient>

          {/* Moon 3D sphere gradient - realistic lunar surface */}
          <radialGradient id="tidfMoonSphere" cx="30%" cy="30%" r="70%" fx="25%" fy="25%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="20%" stopColor="#d1d5db" />
            <stop offset="45%" stopColor="#9ca3af" />
            <stop offset="70%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>

          {/* Moon crater shadows */}
          <radialGradient id="tidfCrater" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="60%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </radialGradient>

          {/* Force vector gradients */}
          <linearGradient id="tidfForceStrong" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          <linearGradient id="tidfForceMedium" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>

          <linearGradient id="tidfForceWeak" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>

          <linearGradient id="tidfForceTidal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>

          {/* Orbital path gradient */}
          <linearGradient id="tidfOrbitPath" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.2" />
          </linearGradient>

          {/* ═══════════════════════════════════════════════════════════════════════════
              GLOW FILTERS
              ═══════════════════════════════════════════════════════════════════════════ */}

          {/* Earth glow filter */}
          <filter id="tidfEarthGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Moon glow filter */}
          <filter id="tidfMoonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Tidal bulge glow */}
          <filter id="tidfBulgeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Star twinkle filter */}
          <filter id="tidfStarGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Force arrow glow */}
          <filter id="tidfArrowGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Legend panel shadow */}
          <filter id="tidfLegendShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
          </filter>

          {/* ═══════════════════════════════════════════════════════════════════════════
              ARROW MARKERS
              ═══════════════════════════════════════════════════════════════════════════ */}
          <marker id="tidfArrowRed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <marker id="tidfArrowYellow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
          </marker>
          <marker id="tidfArrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
          </marker>
          <marker id="tidfArrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
          </marker>
          <marker id="tidfArrowPink" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f472b6" />
          </marker>
        </defs>

        {/* Premium deep space background */}
        <rect width="400" height="280" fill="url(#tidfSpaceBg)" />

        {/* Stars with subtle glow */}
        {stars.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#ffffff"
            opacity={star.opacity}
            filter={i % 5 === 0 ? "url(#tidfStarGlow)" : undefined}
          />
        ))}

        {/* Distant galaxy hint */}
        <ellipse cx="350" cy="40" rx="15" ry="4" fill="#6366f1" opacity="0.1" />
        <ellipse cx="60" cy="250" rx="10" ry="3" fill="#8b5cf6" opacity="0.08" />

        {/* Orbital path with gradient */}
        <ellipse
          cx={earthCenterX}
          cy={earthCenterY}
          rx={moonDistance}
          ry={moonDistance * 0.3}
          fill="none"
          stroke="url(#tidfOrbitPath)"
          strokeWidth="1.5"
          strokeDasharray="8,4"
        />

        {/* Earth with premium 3D effects and tidal bulges */}
        <g transform={`translate(${earthCenterX}, ${earthCenterY})`}>
          {/* Atmosphere glow layer */}
          <circle cx={0} cy={0} r={earthRadius + 8} fill="url(#tidfEarthAtmosphere)" />

          {/* Tidal bulge - ocean water layer with glow */}
          <ellipse
            cx={0}
            cy={0}
            rx={earthRadius + 12}
            ry={earthRadius - 3}
            fill="url(#tidfOceanBulge)"
            filter="url(#tidfBulgeGlow)"
            transform={`rotate(${bulgeAngle * 180 / Math.PI})`}
            opacity="0.7"
          >
            <animate attributeName="opacity" values="0.6;0.8;0.6" dur="2s" repeatCount="indefinite" />
          </ellipse>

          {/* Earth solid sphere with 3D gradient */}
          <circle cx={0} cy={0} r={earthRadius} fill="url(#tidfEarthSphere)" filter="url(#tidfEarthGlow)" />

          {/* Continents with gradient */}
          <ellipse cx={-12} cy={-8} rx={18} ry={13} fill="url(#tidfContinents)" opacity="0.9" />
          <ellipse cx={14} cy={8} rx={14} ry={10} fill="url(#tidfContinents)" opacity="0.85" />
          <ellipse cx={-8} cy={18} rx={7} ry={9} fill="url(#tidfContinents)" opacity="0.8" />
          <ellipse cx={20} cy={-15} rx={6} ry={5} fill="url(#tidfContinents)" opacity="0.75" />

          {/* Specular highlight for 3D effect */}
          <ellipse cx={-18} cy={-18} rx={12} ry={8} fill="#ffffff" opacity="0.15" />

          {/* Tidal bulge outline - premium glowing effect */}
          <ellipse
            cx={0}
            cy={0}
            rx={earthRadius + 10}
            ry={earthRadius - 5}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="2.5"
            transform={`rotate(${bulgeAngle * 180 / Math.PI})`}
            filter="url(#tidfBulgeGlow)"
            opacity="0.9"
          >
            <animate attributeName="strokeWidth" values="2;3;2" dur="1.5s" repeatCount="indefinite" />
          </ellipse>

          {/* Tidal bulge labels with better styling */}
          <g transform={`rotate(${bulgeAngle * 180 / Math.PI})`}>
            {/* Near side bulge indicator */}
            <g transform={`translate(${earthRadius + 18}, 0)`}>
              <rect x="-2" y="-10" width="32" height="16" rx="4" fill="#0c4a6e" opacity="0.8" />
              <text
                x="14"
                y="2"
                className="fill-cyan-300 font-bold"
                textAnchor="middle"
                style={{ fontSize: '9px' }}
              >
                HIGH
              </text>
            </g>
            {/* Far side bulge indicator */}
            <g transform={`translate(${-earthRadius - 18}, 0)`}>
              <rect x="-30" y="-10" width="32" height="16" rx="4" fill="#0c4a6e" opacity="0.8" />
              <text
                x="-14"
                y="2"
                className="fill-cyan-300 font-bold"
                textAnchor="middle"
                style={{ fontSize: '9px' }}
              >
                HIGH
              </text>
            </g>
          </g>

          {/* Earth label */}
          <text x={0} y={earthRadius + 22} textAnchor="middle" className="fill-blue-300 font-semibold" style={{ fontSize: '10px' }}>
            Earth
          </text>
        </g>

        {/* Gravity vectors with premium styling */}
        {showVectors && (
          <g filter="url(#tidfArrowGlow)">
            {/* Near side - strongest pull */}
            <line
              x1={earthCenterX + Math.cos(bulgeAngle) * (earthRadius - 10)}
              y1={earthCenterY + Math.sin(bulgeAngle) * (earthRadius - 10) * 0.3}
              x2={earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 35)}
              y2={earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 35) * 0.3}
              stroke="url(#tidfForceStrong)"
              strokeWidth="4"
              strokeLinecap="round"
              markerEnd="url(#tidfArrowRed)"
            />
            {/* Center pull */}
            <line
              x1={earthCenterX}
              y1={earthCenterY}
              x2={earthCenterX + Math.cos(bulgeAngle) * 28}
              y2={earthCenterY + Math.sin(bulgeAngle) * 28 * 0.3}
              stroke="url(#tidfForceMedium)"
              strokeWidth="3.5"
              strokeLinecap="round"
              markerEnd="url(#tidfArrowYellow)"
            />
            {/* Far side - weakest pull */}
            <line
              x1={earthCenterX - Math.cos(bulgeAngle) * (earthRadius - 10)}
              y1={earthCenterY - Math.sin(bulgeAngle) * (earthRadius - 10) * 0.3}
              x2={earthCenterX - Math.cos(bulgeAngle) * (earthRadius - 28)}
              y2={earthCenterY - Math.sin(bulgeAngle) * (earthRadius - 28) * 0.3}
              stroke="url(#tidfForceWeak)"
              strokeWidth="3"
              strokeLinecap="round"
              markerEnd="url(#tidfArrowGreen)"
            />

            {/* Force magnitude labels */}
            <g transform={`translate(${earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 45)}, ${earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 45) * 0.3})`}>
              <text className="fill-red-300 font-bold" style={{ fontSize: '8px' }} textAnchor="middle">F+</text>
            </g>
            <g transform={`translate(${earthCenterX - Math.cos(bulgeAngle) * (earthRadius - 35)}, ${earthCenterY - Math.sin(bulgeAngle) * (earthRadius - 35) * 0.3})`}>
              <text className="fill-green-300 font-bold" style={{ fontSize: '8px' }} textAnchor="middle">F-</text>
            </g>
          </g>
        )}

        {/* Differential (tidal) vectors with premium styling */}
        {showDifferential && (
          <g filter="url(#tidfArrowGlow)">
            {/* Net outward on near side */}
            <line
              x1={earthCenterX + Math.cos(bulgeAngle) * earthRadius}
              y1={earthCenterY + Math.sin(bulgeAngle) * earthRadius * 0.3}
              x2={earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 25)}
              y2={earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 25) * 0.3}
              stroke="url(#tidfForceTidal)"
              strokeWidth="4"
              strokeLinecap="round"
              markerEnd="url(#tidfArrowBlue)"
            />
            {/* Net outward on far side (opposite direction!) */}
            <line
              x1={earthCenterX - Math.cos(bulgeAngle) * earthRadius}
              y1={earthCenterY - Math.sin(bulgeAngle) * earthRadius * 0.3}
              x2={earthCenterX - Math.cos(bulgeAngle) * (earthRadius + 25)}
              y2={earthCenterY - Math.sin(bulgeAngle) * (earthRadius + 25) * 0.3}
              stroke="url(#tidfForceTidal)"
              strokeWidth="4"
              strokeLinecap="round"
              markerEnd="url(#tidfArrowBlue)"
            />
            {/* Inward compression at perpendicular points */}
            <line
              x1={earthCenterX + Math.sin(bulgeAngle) * earthRadius * 0.6}
              y1={earthCenterY - Math.cos(bulgeAngle) * earthRadius}
              x2={earthCenterX + Math.sin(bulgeAngle) * earthRadius * 0.35}
              y2={earthCenterY - Math.cos(bulgeAngle) * (earthRadius - 18)}
              stroke="#f472b6"
              strokeWidth="2.5"
              strokeLinecap="round"
              markerEnd="url(#tidfArrowPink)"
            />
            <line
              x1={earthCenterX - Math.sin(bulgeAngle) * earthRadius * 0.6}
              y1={earthCenterY + Math.cos(bulgeAngle) * earthRadius}
              x2={earthCenterX - Math.sin(bulgeAngle) * earthRadius * 0.35}
              y2={earthCenterY + Math.cos(bulgeAngle) * (earthRadius - 18)}
              stroke="#f472b6"
              strokeWidth="2.5"
              strokeLinecap="round"
              markerEnd="url(#tidfArrowPink)"
            />

            {/* Tidal force direction labels */}
            <g transform={`translate(${earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 35)}, ${earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 35) * 0.3})`}>
              <text className="fill-blue-300 font-bold" style={{ fontSize: '7px' }} textAnchor="middle">STRETCH</text>
            </g>
            <g transform={`translate(${earthCenterX - Math.cos(bulgeAngle) * (earthRadius + 35)}, ${earthCenterY - Math.sin(bulgeAngle) * (earthRadius + 35) * 0.3})`}>
              <text className="fill-blue-300 font-bold" style={{ fontSize: '7px' }} textAnchor="middle">STRETCH</text>
            </g>
          </g>
        )}

        {/* Moon with premium 3D effects */}
        <g transform={`translate(${moonX}, ${moonY})`} filter="url(#tidfMoonGlow)">
          {/* Moon shadow for depth */}
          <ellipse cx={3} cy={3} rx={15} ry={15} fill="#1f2937" opacity="0.5" />

          {/* Moon sphere with 3D gradient */}
          <circle cx={0} cy={0} r={15} fill="url(#tidfMoonSphere)" />

          {/* Craters with depth */}
          <ellipse cx={-4} cy={-5} rx={4} ry={3.5} fill="url(#tidfCrater)" />
          <ellipse cx={5} cy={1} rx={3} ry={2.5} fill="url(#tidfCrater)" />
          <ellipse cx={-2} cy={6} rx={2.5} ry={2} fill="url(#tidfCrater)" />
          <circle cx={7} cy={-6} r={1.5} fill="url(#tidfCrater)" />

          {/* Specular highlight */}
          <ellipse cx={-5} cy={-6} rx={4} ry={3} fill="#ffffff" opacity="0.2" />

          {/* Moon label */}
          <text x={0} y={28} textAnchor="middle" className="fill-gray-300 font-semibold" style={{ fontSize: '10px' }}>
            Moon
          </text>

          {/* Gravitational pull indicator line to Earth */}
          <line
            x1={0}
            y1={0}
            x2={earthCenterX - moonX}
            y2={(earthCenterY - moonY) * 0.3}
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="4,3"
            opacity="0.4"
          />
        </g>

        {/* Premium Legend panels */}
        {showVectors && (
          <g transform="translate(8, 218)" filter="url(#tidfLegendShadow)">
            <rect x="0" y="0" width="155" height="58" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <rect x="0" y="0" width="155" height="18" rx="8" fill="#1e293b" />
            <rect x="0" y="10" width="155" height="8" fill="#1e293b" />
            <text x="77" y="13" textAnchor="middle" className="fill-slate-300 font-bold" style={{ fontSize: '9px' }}>GRAVITY VECTORS</text>

            <line x1="12" y1="30" x2="35" y2="30" stroke="url(#tidfForceStrong)" strokeWidth="3" strokeLinecap="round" />
            <text x="42" y="33" className="fill-gray-300" style={{ fontSize: '9px' }}>Strong (near side)</text>

            <line x1="12" y1="43" x2="35" y2="43" stroke="url(#tidfForceMedium)" strokeWidth="3" strokeLinecap="round" />
            <text x="42" y="46" className="fill-gray-300" style={{ fontSize: '9px' }}>Medium (center)</text>

            <line x1="100" y1="30" x2="123" y2="30" stroke="url(#tidfForceWeak)" strokeWidth="3" strokeLinecap="round" />
            <text x="126" y="33" className="fill-gray-300" style={{ fontSize: '8px' }}>Weak</text>
          </g>
        )}

        {showDifferential && (
          <g transform="translate(170, 218)" filter="url(#tidfLegendShadow)">
            <rect x="0" y="0" width="165" height="58" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <rect x="0" y="0" width="165" height="18" rx="8" fill="#1e3a5f" />
            <rect x="0" y="10" width="165" height="8" fill="#1e3a5f" />
            <text x="82" y="13" textAnchor="middle" className="fill-cyan-300 font-bold" style={{ fontSize: '9px' }}>NET TIDAL FORCES</text>

            <line x1="12" y1="32" x2="35" y2="32" stroke="url(#tidfForceTidal)" strokeWidth="3" strokeLinecap="round" />
            <text x="42" y="35" className="fill-blue-200" style={{ fontSize: '9px' }}>Outward (creates bulge)</text>

            <line x1="12" y1="47" x2="35" y2="47" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
            <text x="42" y="50" className="fill-pink-200" style={{ fontSize: '9px' }}>Inward (compression)</text>
          </g>
        )}

        {/* Title badge when no controls active */}
        {!showVectors && !showDifferential && (
          <g transform="translate(200, 12)">
            <rect x="-60" y="0" width="120" height="20" rx="10" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <text x="0" y="14" textAnchor="middle" className="fill-cyan-400 font-bold" style={{ fontSize: '10px' }}>
              TIDAL FORCES
            </text>
          </g>
        )}
      </svg>
    );
  };

  const renderTwistScene = () => {
    const earthCenterX = 120;
    const earthCenterY = 130;
    const moonOrbitRadius = 100;

    const moonX = earthCenterX + Math.cos(moonAngle) * moonOrbitRadius;
    const moonY = earthCenterY + Math.sin(moonAngle) * moonOrbitRadius * 0.4;

    // The side of moon facing Earth
    const moonFacingAngle = isTidallyLocked ? moonAngle + Math.PI : moonRotation;

    // Generate stable stars based on index
    const stars = Array.from({ length: 30 }, (_, i) => ({
      x: (i * 43 + 11) % 400,
      y: (i * 29 + 5) % 260,
      r: 0.4 + (i % 4) * 0.12,
      opacity: 0.2 + (i % 5) * 0.12
    }));

    return (
      <svg viewBox="0 0 400 260" className="w-full h-52">
        <defs>
          {/* ═══════════════════════════════════════════════════════════════════════════
              PREMIUM GRADIENTS & FILTERS FOR TIDAL LOCKING VISUALIZATION
              ═══════════════════════════════════════════════════════════════════════════ */}

          {/* Deep space background gradient */}
          <linearGradient id="tidfTwistSpaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="30%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="70%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Earth 3D sphere gradient */}
          <radialGradient id="tidfTwistEarthSphere" cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="30%" stopColor="#3b82f6" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>

          {/* Earth atmosphere */}
          <radialGradient id="tidfTwistEarthAtmo" cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="90%" stopColor="#60a5fa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.1" />
          </radialGradient>

          {/* Continents */}
          <linearGradient id="tidfTwistContinents" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* Moon 3D sphere gradient */}
          <radialGradient id="tidfTwistMoonSphere" cx="30%" cy="30%" r="70%" fx="25%" fy="25%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="25%" stopColor="#d1d5db" />
            <stop offset="50%" stopColor="#9ca3af" />
            <stop offset="80%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>

          {/* Moon near side (face) - slightly different shade */}
          <radialGradient id="tidfTwistMoonFace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f3f4f6" />
            <stop offset="50%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#9ca3af" />
          </radialGradient>

          {/* Moon crater */}
          <radialGradient id="tidfTwistCrater" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="70%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>

          {/* Orbital path gradient */}
          <linearGradient id="tidfTwistOrbitPath" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>

          {/* Reference line gradient */}
          <linearGradient id="tidfTwistRefLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
          </linearGradient>

          {/* Marker line for moon front */}
          <linearGradient id="tidfTwistMarkerLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>

          {/* Panel background gradient */}
          <linearGradient id="tidfTwistPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#0a0f1a" />
          </linearGradient>

          {/* Locked status gradient */}
          <linearGradient id="tidfTwistLockedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>

          {/* Unlocked status gradient */}
          <linearGradient id="tidfTwistUnlockedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* ═══════════════════════════════════════════════════════════════════════════
              GLOW FILTERS
              ═══════════════════════════════════════════════════════════════════════════ */}

          <filter id="tidfTwistEarthGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="tidfTwistMoonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="tidfTwistStarGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="tidfTwistPanelShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.6" />
          </filter>

          <filter id="tidfTwistMarkerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Premium deep space background */}
        <rect width="400" height="260" fill="url(#tidfTwistSpaceBg)" />

        {/* Stars with subtle glow */}
        {stars.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#ffffff"
            opacity={star.opacity}
            filter={i % 6 === 0 ? "url(#tidfTwistStarGlow)" : undefined}
          />
        ))}

        {/* Distant nebula hints */}
        <ellipse cx="380" cy="30" rx="12" ry="5" fill="#8b5cf6" opacity="0.08" />

        {/* Orbital path with gradient */}
        <ellipse
          cx={earthCenterX}
          cy={earthCenterY}
          rx={moonOrbitRadius}
          ry={moonOrbitRadius * 0.4}
          fill="none"
          stroke="url(#tidfTwistOrbitPath)"
          strokeWidth="1.5"
          strokeDasharray="6,4"
        />

        {/* Earth with premium 3D effects */}
        <g>
          {/* Atmosphere glow */}
          <circle cx={earthCenterX} cy={earthCenterY} r={35} fill="url(#tidfTwistEarthAtmo)" />

          {/* Earth sphere */}
          <circle cx={earthCenterX} cy={earthCenterY} r={30} fill="url(#tidfTwistEarthSphere)" filter="url(#tidfTwistEarthGlow)" />

          {/* Continents */}
          <ellipse cx={earthCenterX - 5} cy={earthCenterY - 5} rx={12} ry={8} fill="url(#tidfTwistContinents)" opacity="0.9" />
          <ellipse cx={earthCenterX + 8} cy={earthCenterY + 8} rx={8} ry={6} fill="url(#tidfTwistContinents)" opacity="0.85" />
          <ellipse cx={earthCenterX - 8} cy={earthCenterY + 12} rx={5} ry={4} fill="url(#tidfTwistContinents)" opacity="0.8" />

          {/* Specular highlight */}
          <ellipse cx={earthCenterX - 10} cy={earthCenterY - 10} rx={8} ry={5} fill="#ffffff" opacity="0.15" />

          {/* Earth label */}
          <text x={earthCenterX} y={earthCenterY + 45} textAnchor="middle" className="fill-blue-300 font-semibold" style={{ fontSize: '9px' }}>
            Earth
          </text>
        </g>

        {/* Observer on Earth */}
        <g transform={`translate(${earthCenterX}, ${earthCenterY - 32})`}>
          <circle cx={0} cy={-2} r={8} fill="#1e293b" stroke="#60a5fa" strokeWidth="1" />
          <text x={0} y={1} textAnchor="middle" style={{ fontSize: '10px' }}>👁️</text>
          <text x={0} y={14} textAnchor="middle" className="fill-slate-400 font-medium" style={{ fontSize: '8px' }}>Observer</text>
        </g>

        {/* Reference line from Moon to Earth */}
        <line
          x1={moonX}
          y1={moonY}
          x2={earthCenterX}
          y2={earthCenterY}
          stroke="url(#tidfTwistRefLine)"
          strokeWidth="1.5"
          strokeDasharray="4,3"
        />

        {/* Moon with premium 3D effects and rotation marker */}
        <g transform={`translate(${moonX}, ${moonY})`} filter="url(#tidfTwistMoonGlow)">
          {/* Moon shadow for depth */}
          <ellipse cx={2} cy={2} rx={18} ry={18} fill="#1f2937" opacity="0.4" />

          {/* Moon sphere */}
          <circle cx={0} cy={0} r={18} fill="url(#tidfTwistMoonSphere)" />

          {/* Moon's "face" - crater pattern that shows which side faces us */}
          <g transform={`rotate(${moonFacingAngle * 180 / Math.PI})`}>
            {/* Near side feature pattern (maria - the "face") */}
            <ellipse cx={-5} cy={-3} rx={4} ry={3.5} fill="url(#tidfTwistCrater)" />
            <ellipse cx={5} cy={-3} rx={4} ry={3.5} fill="url(#tidfTwistCrater)" />
            <ellipse cx={0} cy={6} rx={8} ry={3} fill="url(#tidfTwistCrater)" />

            {/* Marker line showing "front" of moon with glow */}
            <line
              x1={0}
              y1={0}
              x2={20}
              y2={0}
              stroke="url(#tidfTwistMarkerLine)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#tidfTwistMarkerGlow)"
            />

            {/* Arrow tip for direction */}
            <polygon points="18,-3 24,0 18,3" fill="#ef4444" />
          </g>

          {/* Specular highlight */}
          <ellipse cx={-6} cy={-7} rx={5} ry={4} fill="#ffffff" opacity="0.2" />

          {/* Moon label */}
          <text x={0} y={32} textAnchor="middle" className="fill-gray-300 font-semibold" style={{ fontSize: '9px' }}>
            Moon
          </text>
        </g>

        {/* Premium Explanation panel */}
        <g transform="translate(248, 25)" filter="url(#tidfTwistPanelShadow)">
          <rect x="0" y="0" width="145" height="105" rx="10" fill="url(#tidfTwistPanelBg)" stroke="#334155" strokeWidth="1" />

          {/* Status header */}
          <rect
            x="0"
            y="0"
            width="145"
            height="28"
            rx="10"
            fill={isTidallyLocked ? "url(#tidfTwistLockedGrad)" : "url(#tidfTwistUnlockedGrad)"}
            opacity="0.2"
          />
          <rect x="0" y="18" width="145" height="10" fill={isTidallyLocked ? "#22c55e" : "#ef4444"} opacity="0.1" />

          {/* Status icon and text */}
          <text x="20" y="19" className="fill-white font-bold" style={{ fontSize: '14px' }}>
            {isTidallyLocked ? '🔒' : '🔓'}
          </text>
          <text x="40" y="18" className={`font-bold ${isTidallyLocked ? 'fill-emerald-300' : 'fill-red-300'}`} style={{ fontSize: '11px' }}>
            {isTidallyLocked ? 'Tidally Locked' : 'NOT Locked'}
          </text>

          {/* Data display */}
          <g transform="translate(12, 40)">
            <rect x="0" y="0" width="120" height="22" rx="4" fill="#0f172a" />
            <text x="8" y="14" className="fill-slate-400" style={{ fontSize: '9px' }}>Orbital:</text>
            <text x="55" y="14" className="fill-cyan-300 font-mono font-bold" style={{ fontSize: '10px' }}>
              {(moonAngle * 180 / Math.PI).toFixed(0)}°
            </text>
            <text x="80" y="14" className="fill-slate-400" style={{ fontSize: '9px' }}>Rot:</text>
            <text x="100" y="14" className="fill-amber-300 font-mono font-bold" style={{ fontSize: '10px' }}>
              {(moonRotation * 180 / Math.PI).toFixed(0)}°
            </text>
          </g>

          {/* Status message */}
          <g transform="translate(12, 70)">
            <rect x="0" y="0" width="120" height="26" rx="4" fill={isTidallyLocked ? "#052e16" : "#450a0a"} opacity="0.5" />
            <text x="60" y="11" textAnchor="middle" className={`font-semibold ${isTidallyLocked ? 'fill-emerald-300' : 'fill-red-300'}`} style={{ fontSize: '8px' }}>
              {isTidallyLocked ? '✓ Same side always' : '✗ Different sides'}
            </text>
            <text x="60" y="22" textAnchor="middle" className={`font-medium ${isTidallyLocked ? 'fill-emerald-400' : 'fill-red-400'}`} style={{ fontSize: '8px' }}>
              {isTidallyLocked ? 'faces Earth' : 'face Earth'}
            </text>
          </g>
        </g>

        {/* Title badge */}
        <g transform="translate(120, 8)">
          <rect x="-55" y="0" width="110" height="18" rx="9" fill="#1e293b" stroke="#6366f1" strokeWidth="1" opacity="0.9" />
          <text x="0" y="12" textAnchor="middle" className="fill-indigo-300 font-bold" style={{ fontSize: '9px' }}>
            TIDAL LOCKING
          </text>
        </g>
      </svg>
    );
  };

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/30">
        <span className="text-4xl">🌊</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Two Bulges Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        You know the Moon&apos;s gravity pulls ocean water toward it, creating tides.
        But here&apos;s the mystery: there are <span className="text-cyan-400 font-semibold">TWO tidal bulges</span> -
        one toward the Moon AND one on the <span className="text-cyan-400 font-semibold">opposite side</span>!
      </p>

      {/* Premium card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />
        <div className="relative">
          <p className="text-xl text-cyan-300 font-medium">
            Why is there a bulge on the side AWAY from the Moon?
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); playSound('click'); nextPhase(); }}
        className="group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        The Moon pulls on Earth. Why would there be a tidal bulge on the far side, AWAY from the Moon?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'sun', text: 'The Sun creates the second bulge on the opposite side', icon: '☀️' },
          { id: 'differential', text: 'Differential gravity: far side is pulled LESS than Earth\'s center', icon: '↔️' },
          { id: 'centrifugal', text: 'Centrifugal force from Earth\'s rotation throws water outward', icon: '🔄' },
          { id: 'inertia', text: 'Water\'s inertia resists being pulled toward the Moon', icon: '⚖️' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-cyan-500 bg-cyan-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Differential Gravity</h2>

      {renderTidalScene()}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onMouseDown={() => {
            playSound('click');
            setShowVectors(!showVectors);
            if (!showVectors) setShowDifferential(false);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            showVectors
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {showVectors ? '✓' : '○'} Gravity Vectors
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setShowDifferential(!showDifferential);
            if (!showDifferential) setShowVectors(false);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            showDifferential
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {showDifferential ? '✓' : '○'} Net Tidal Force
        </button>
        <button
          onMouseDown={() => {
            playSound('click');
            setIsAnimating(!isAnimating);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            isAnimating
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          {isAnimating ? '⏸ Pause' : '▶ Animate'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-cyan-300 text-sm text-center">
          {showVectors && !showDifferential && (
            <>
              <strong>Different pull strengths!</strong> Near side: pulled more than Earth&apos;s center.
              Far side: pulled less. This difference creates tidal forces.
            </>
          )}
          {showDifferential && (
            <>
              <strong>Tidal force = difference from center.</strong> Near side stretches toward Moon.
              Far side &quot;lags behind&quot; → effectively stretches away. Two bulges!
            </>
          )}
          {!showVectors && !showDifferential && (
            <>Toggle the buttons to see how differential gravity creates two tidal bulges!</>
          )}
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Understanding Tidal Forces</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Near Side: Stronger Pull</h3>
              <p className="text-gray-400 text-sm">Closer to Moon → pulled MORE than Earth&apos;s center → bulges toward Moon</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Far Side: Weaker Pull</h3>
              <p className="text-gray-400 text-sm">Farther from Moon → pulled LESS than center → &quot;left behind&quot; → bulges away</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">Two High Tides Daily</h3>
              <p className="text-gray-400 text-sm">Earth rotates through both bulges every 24h → two high tides</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-cyan-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-cyan-300 font-semibold">Tidal Force ∝ 1/r³</p>
        <p className="text-gray-400 text-sm mt-1">
          Tidal forces depend on the gradient (change) of gravity,
          which falls off faster than gravity itself (1/r²).
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-cyan-400 font-semibold">{prediction === 'differential' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">🔄 The Twist!</h2>
      <p className="text-gray-300 text-center max-w-lg mx-auto">
        We always see the <span className="text-yellow-400 font-semibold">same side of the Moon</span> from Earth.
        The &quot;dark side&quot; isn&apos;t dark - we just never see it! Why?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'locked', text: 'Tidal forces synchronized Moon\'s rotation with its orbit (tidal locking)', icon: '🔒' },
          { id: 'no_rotate', text: 'The Moon doesn\'t rotate at all', icon: '🛑' },
          { id: 'coincidence', text: 'Pure coincidence - they just happen to match', icon: '🎲' },
          { id: 'heavy', text: 'One side is heavier and always faces Earth', icon: '⚖️' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              playSound('click');
              setTwistPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Tidal Locking</h2>

      {renderTwistScene()}

      <div className="flex justify-center gap-4">
        <button
          onMouseDown={() => { playSound('click'); setIsTidallyLocked(true); }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isTidallyLocked
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          🔒 Tidally Locked
        </button>
        <button
          onMouseDown={() => { playSound('click'); setIsTidallyLocked(false); }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            !isTidallyLocked
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          🔓 Not Locked
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-blue-300 text-sm text-center">
          <strong>Tidal locking:</strong> Over millions of years, tidal friction slowed the Moon&apos;s rotation
          until its rotation period matched its orbital period. The same side always faces Earth!
        </p>
      </div>

      <div className="text-center">
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Tidal Evolution</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          The Moon <span className="text-yellow-400 font-semibold">IS rotating</span> - exactly once per orbit!
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-blue-900/30 rounded-lg p-3">
            <div className="text-blue-400 font-semibold">Tidal Friction</div>
            <div className="text-gray-500">Tidal bulges create friction that transfers angular momentum</div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-3">
            <div className="text-purple-400 font-semibold">Synchronized Rotation</div>
            <div className="text-gray-500">Moon slowed until rotation period = orbital period (~27.3 days)</div>
          </div>
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-cyan-400 font-semibold">Earth Is Slowing Too!</div>
            <div className="text-gray-500">Days are getting ~2ms longer per century due to tidal drag</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-blue-400 font-semibold">{twistPrediction === 'locked' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onMouseDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Real-World Applications</h2>
      <p className="text-gray-400 text-center">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onMouseDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, index]));
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-cyan-500 bg-cyan-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onMouseDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Take the Quiz →
          </button>
        </div>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question) {
      const score = testAnswers.filter((a, i) => TEST_QUESTIONS[i].options[a]?.correct).length;
      if (score >= 3 && onCorrectAnswer) onCorrectAnswer();
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
          <p className="text-gray-300">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onMouseDown={() => {
              playSound(score >= 3 ? 'complete' : 'click');
              nextPhase();
            }}
            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            {score >= 3 ? 'Complete! 🎊' : 'Continue →'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white text-center">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mx-auto">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
          {question.options.map((option, i) => (
            <button
              key={i}
              onMouseDown={() => {
                playSound(option.correct ? 'success' : 'failure');
                setTestAnswers([...testAnswers, i]);
              }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-cyan-500 transition-all text-left text-gray-200"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl">🏆</div>
      <h2 className="text-2xl font-bold text-white">Tidal Forces Master!</h2>
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-cyan-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ TWO bulges from differential gravity (near and far side)</li>
          <li>✓ Tidal force depends on gravity gradient (1/r³)</li>
          <li>✓ Tidal locking synchronizes rotation with orbit</li>
          <li>✓ Real-world effects: energy, navigation, planetary geology</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Next time you see the tide come in, you&apos;ll know the physics! 🌊🌙
      </p>
      <button
        onMouseDown={() => {
          playSound('complete');
          if (onPhaseComplete) onPhaseComplete();
        }}
        className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
      >
        Complete! 🎊
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Tidal Forces</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">
            {phase.charAt(0).toUpperCase() + phase.slice(1).replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
