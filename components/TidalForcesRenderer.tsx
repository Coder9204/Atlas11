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

    return (
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#0a0a1a" />

        {/* Stars */}
        {[...Array(30)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 41) % 400}
            cy={(i * 23) % 280}
            r={0.5 + Math.random() * 0.5}
            fill="#ffffff"
            opacity={0.3 + Math.random() * 0.4}
          />
        ))}

        {/* Orbital path hint */}
        <ellipse
          cx={earthCenterX}
          cy={earthCenterY}
          rx={moonDistance}
          ry={moonDistance * 0.3}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {/* Earth with tidal bulges */}
        <g transform={`translate(${earthCenterX}, ${earthCenterY})`}>
          {/* Ocean layer with bulges */}
          <ellipse
            cx={0}
            cy={0}
            rx={earthRadius + 8}
            ry={earthRadius + 8}
            fill="#1e40af"
            opacity="0.5"
            transform={`rotate(${bulgeAngle * 180 / Math.PI})`}
            style={{
              transform: `rotate(${bulgeAngle * 180 / Math.PI}deg) scale(1.15, 0.9)`
            }}
          />

          {/* Earth solid */}
          <circle cx={0} cy={0} r={earthRadius} fill="#22c55e" />

          {/* Continents (simplified) */}
          <ellipse cx={-15} cy={-10} rx={20} ry={15} fill="#16a34a" />
          <ellipse cx={15} cy={10} rx={15} ry={12} fill="#16a34a" />
          <ellipse cx={-10} cy={20} rx={8} ry={10} fill="#16a34a" />

          {/* Water overlay */}
          <circle cx={0} cy={0} r={earthRadius} fill="#3b82f6" opacity="0.3" />

          {/* Tidal bulge visualization */}
          <ellipse
            cx={0}
            cy={0}
            rx={earthRadius + 10}
            ry={earthRadius - 5}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="3"
            transform={`rotate(${bulgeAngle * 180 / Math.PI})`}
            className="animate-pulse"
          />

          {/* Near side bulge label */}
          <g transform={`rotate(${bulgeAngle * 180 / Math.PI})`}>
            <text
              x={earthRadius + 20}
              y={5}
              className="fill-cyan-300 text-xs font-bold"
              textAnchor="start"
            >
              Bulge
            </text>
            <text
              x={-earthRadius - 20}
              y={5}
              className="fill-cyan-300 text-xs font-bold"
              textAnchor="end"
            >
              Bulge
            </text>
          </g>
        </g>

        {/* Gravity vectors */}
        {showVectors && (
          <g>
            {/* Near side - strongest pull */}
            <line
              x1={earthCenterX + Math.cos(bulgeAngle) * (earthRadius - 10)}
              y1={earthCenterY + Math.sin(bulgeAngle) * (earthRadius - 10) * 0.3}
              x2={earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 30)}
              y2={earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 30) * 0.3}
              stroke="#ef4444"
              strokeWidth="3"
              markerEnd="url(#arrowRed)"
            />
            {/* Center pull */}
            <line
              x1={earthCenterX}
              y1={earthCenterY}
              x2={earthCenterX + Math.cos(bulgeAngle) * 25}
              y2={earthCenterY + Math.sin(bulgeAngle) * 25 * 0.3}
              stroke="#fbbf24"
              strokeWidth="3"
              markerEnd="url(#arrowYellow)"
            />
            {/* Far side - weakest pull */}
            <line
              x1={earthCenterX - Math.cos(bulgeAngle) * (earthRadius - 10)}
              y1={earthCenterY - Math.sin(bulgeAngle) * (earthRadius - 10) * 0.3}
              x2={earthCenterX - Math.cos(bulgeAngle) * (earthRadius - 25)}
              y2={earthCenterY - Math.sin(bulgeAngle) * (earthRadius - 25) * 0.3}
              stroke="#22c55e"
              strokeWidth="3"
              markerEnd="url(#arrowGreen)"
            />
          </g>
        )}

        {/* Differential vectors */}
        {showDifferential && (
          <g>
            {/* Net outward on near side */}
            <line
              x1={earthCenterX + Math.cos(bulgeAngle) * earthRadius}
              y1={earthCenterY + Math.sin(bulgeAngle) * earthRadius * 0.3}
              x2={earthCenterX + Math.cos(bulgeAngle) * (earthRadius + 20)}
              y2={earthCenterY + Math.sin(bulgeAngle) * (earthRadius + 20) * 0.3}
              stroke="#60a5fa"
              strokeWidth="3"
              markerEnd="url(#arrowBlue)"
            />
            {/* Net outward on far side (opposite direction!) */}
            <line
              x1={earthCenterX - Math.cos(bulgeAngle) * earthRadius}
              y1={earthCenterY - Math.sin(bulgeAngle) * earthRadius * 0.3}
              x2={earthCenterX - Math.cos(bulgeAngle) * (earthRadius + 20)}
              y2={earthCenterY - Math.sin(bulgeAngle) * (earthRadius + 20) * 0.3}
              stroke="#60a5fa"
              strokeWidth="3"
              markerEnd="url(#arrowBlue)"
            />
            {/* Inward at perpendicular */}
            <line
              x1={earthCenterX + Math.sin(bulgeAngle) * earthRadius * 0.5}
              y1={earthCenterY - Math.cos(bulgeAngle) * earthRadius}
              x2={earthCenterX + Math.sin(bulgeAngle) * earthRadius * 0.3}
              y2={earthCenterY - Math.cos(bulgeAngle) * (earthRadius - 15)}
              stroke="#f472b6"
              strokeWidth="2"
              markerEnd="url(#arrowPink)"
            />
          </g>
        )}

        {/* Moon */}
        <g transform={`translate(${moonX}, ${moonY})`}>
          <circle cx={0} cy={0} r={15} fill="#9ca3af" />
          {/* Craters */}
          <circle cx={-3} cy={-4} r={3} fill="#6b7280" />
          <circle cx={5} cy={2} r={2} fill="#6b7280" />
          <circle cx={-2} cy={5} r={2} fill="#6b7280" />
          <text x={0} y={30} textAnchor="middle" className="fill-gray-400 text-xs">Moon</text>
        </g>

        {/* Arrow markers */}
        <defs>
          <marker id="arrowRed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <marker id="arrowYellow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
          </marker>
          <marker id="arrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
          </marker>
          <marker id="arrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
          </marker>
          <marker id="arrowPink" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f472b6" />
          </marker>
        </defs>

        {/* Legend */}
        {showVectors && (
          <g transform="translate(10, 230)">
            <rect x="0" y="0" width="150" height="50" fill="#1f2937" rx="5" opacity="0.9" />
            <line x1="10" y1="15" x2="30" y2="15" stroke="#ef4444" strokeWidth="2" />
            <text x="35" y="18" className="fill-gray-300 text-xs">Strong (near side)</text>
            <line x1="10" y1="30" x2="30" y2="30" stroke="#fbbf24" strokeWidth="2" />
            <text x="35" y="33" className="fill-gray-300 text-xs">Medium (center)</text>
            <line x1="10" y1="45" x2="30" y2="45" stroke="#22c55e" strokeWidth="2" />
            <text x="35" y="48" className="fill-gray-300 text-xs">Weak (far side)</text>
          </g>
        )}

        {showDifferential && (
          <g transform="translate(230, 230)">
            <rect x="0" y="0" width="160" height="35" fill="#1f2937" rx="5" opacity="0.9" />
            <line x1="10" y1="18" x2="30" y2="18" stroke="#60a5fa" strokeWidth="2" />
            <text x="35" y="21" className="fill-gray-300 text-xs">Net tidal force (outward)</text>
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

    return (
      <svg viewBox="0 0 400 260" className="w-full h-52">
        <rect width="400" height="260" fill="#0a0a1a" />

        {/* Stars */}
        {[...Array(25)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 37) % 400}
            cy={(i * 19) % 260}
            r={0.5 + Math.random() * 0.5}
            fill="#ffffff"
            opacity={0.3}
          />
        ))}

        {/* Orbital path */}
        <ellipse
          cx={earthCenterX}
          cy={earthCenterY}
          rx={moonOrbitRadius}
          ry={moonOrbitRadius * 0.4}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Earth */}
        <circle cx={earthCenterX} cy={earthCenterY} r={30} fill="#3b82f6" />
        <ellipse cx={earthCenterX - 5} cy={earthCenterY - 5} rx={12} ry={8} fill="#22c55e" />
        <ellipse cx={earthCenterX + 8} cy={earthCenterY + 8} rx={8} ry={6} fill="#22c55e" />

        {/* Observer on Earth */}
        <g transform={`translate(${earthCenterX}, ${earthCenterY - 30})`}>
          <text x={0} y={-5} textAnchor="middle" className="text-lg">👁️</text>
          <text x={0} y={10} textAnchor="middle" className="fill-gray-400 text-xs">Observer</text>
        </g>

        {/* Moon with visible marking */}
        <g transform={`translate(${moonX}, ${moonY})`}>
          <circle cx={0} cy={0} r={18} fill="#9ca3af" />

          {/* Moon's "face" - crater pattern that shows which side faces us */}
          <g transform={`rotate(${moonFacingAngle * 180 / Math.PI})`}>
            {/* This pattern shows "the face" we see or don't see */}
            <circle cx={-5} cy={-3} r={4} fill="#6b7280" />
            <circle cx={5} cy={-3} r={4} fill="#6b7280" />
            <ellipse cx={0} cy={6} rx={8} ry={3} fill="#6b7280" />
            {/* Marker line showing "front" of moon */}
            <line x1={0} y1={0} x2={18} y2={0} stroke="#ef4444" strokeWidth="2" />
          </g>
        </g>

        {/* Explanation panel */}
        <g transform="translate(250, 30)">
          <rect x="0" y="0" width="140" height="90" fill="#1f2937" rx="8" opacity="0.95" />
          <text x="70" y="20" textAnchor="middle" className="fill-gray-300 text-xs font-semibold">
            {isTidallyLocked ? 'Tidally Locked' : 'NOT Locked'}
          </text>
          <text x="70" y="40" textAnchor="middle" className="fill-gray-500 text-xs">
            Orbital: {(moonAngle * 180 / Math.PI).toFixed(0)}°
          </text>
          <text x="70" y="55" textAnchor="middle" className="fill-gray-500 text-xs">
            Rotation: {(moonRotation * 180 / Math.PI).toFixed(0)}°
          </text>
          <text x="70" y="75" textAnchor="middle" className={`text-xs ${isTidallyLocked ? 'fill-green-400' : 'fill-red-400'}`}>
            {isTidallyLocked ? '✓ Same side always faces Earth' : '✗ Different sides face Earth'}
          </text>
        </g>

        {/* Red line showing direction to Earth (for reference) */}
        <line
          x1={moonX}
          y1={moonY}
          x2={earthCenterX}
          y2={earthCenterY}
          stroke="#60a5fa"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.5"
        />
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
