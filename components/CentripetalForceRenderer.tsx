'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

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

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
  setTestScore?: (score: number) => void;
}

const CentripetalForceRenderer: React.FC<Props> = ({ onGameEvent, gamePhase, onPhaseComplete, setTestScore }) => {
  const [phase, setPhase] = useState<Phase>('hook');

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#8b5cf6',       // violet-500 (circular motion)
    primaryDark: '#7c3aed',   // violet-600
    accent: '#f97316',        // orange-500
    secondary: '#3b82f6',     // blue-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    velocity: '#22d3ee',      // cyan-400
    force: '#ef4444',         // red-500
    car: '#fbbf24',           // amber-400
  };

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

  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  const [carAngle, setCarAngle] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [radius, setRadius] = useState(70);
  const [mass, setMass] = useState(1);
  const [showVectors, setShowVectors] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isSliding, setIsSliding] = useState(false);

  // Twist simulation state
  const [stringBroken, setStringBroken] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [releaseAngle, setReleaseAngle] = useState(0);

  const lastClickRef = useRef(0);

  // Phase sync from external control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

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

  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseLabel: phaseLabels[newPhase] } });
  }, [playSound, onPhaseComplete, onGameEvent]);

  const centripetalForce = (mass * speed * speed) / radius;
  const maxFriction = 0.8;

  useEffect(() => {
    setIsSliding(centripetalForce > maxFriction * 10);
  }, [centripetalForce]);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setCarAngle(prev => (prev + speed * 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, speed]);

  useEffect(() => {
    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', data: { phase } });
    }
  }, [phase, onGameEvent]);

  // Twist simulation animation
  useEffect(() => {
    if (!stringBroken) return;
    const interval = setInterval(() => {
      setBallPosition(prev => ({
        x: prev.x + Math.cos(releaseAngle) * 3,
        y: prev.y + Math.sin(releaseAngle) * 3
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [stringBroken, releaseAngle]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'B' ? 'success' : 'failure');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'B' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex } });
  }, [onGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex } });
  }, [playSound, onGameEvent]);

  const breakString = useCallback(() => {
    const angleRad = carAngle * Math.PI / 180;
    setReleaseAngle(angleRad + Math.PI / 2); // Tangent direction
    setBallPosition({ x: 0, y: 0 });
    setStringBroken(true);
  }, [carAngle]);

  const resetTwistSim = useCallback(() => {
    setStringBroken(false);
    setBallPosition({ x: 0, y: 0 });
  }, []);

  const testQuestions = [
    {
      question: "Centripetal force always points:",
      options: [
        { text: "Tangent to the circle", correct: false },
        { text: "Outward from center", correct: false },
        { text: "Toward the center", correct: true },
        { text: "In direction of motion", correct: false }
      ]
    },
    {
      question: "The formula for centripetal force is:",
      options: [
        { text: "F = ma", correct: false },
        { text: "F = mv²/r", correct: true },
        { text: "F = mg", correct: false },
        { text: "F = kx", correct: false }
      ]
    },
    {
      question: "If you double the speed on a curve, the required centripetal force:",
      options: [
        { text: "Doubles", correct: false },
        { text: "Quadruples", correct: true },
        { text: "Halves", correct: false },
        { text: "Stays the same", correct: false }
      ]
    },
    {
      question: "When a ball on a string is released, it travels:",
      options: [
        { text: "In a spiral outward", correct: false },
        { text: "In a straight line tangent to the circle", correct: true },
        { text: "Directly away from the center", correct: false },
        { text: "Continues in a circle briefly", correct: false }
      ]
    },
    {
      question: "What provides centripetal force for a car on a flat road?",
      options: [
        { text: "Engine power", correct: false },
        { text: "Air resistance", correct: false },
        { text: "Friction between tires and road", correct: true },
        { text: "Steering wheel", correct: false }
      ]
    },
    {
      question: "'Centrifugal force' is:",
      options: [
        { text: "A real force pushing outward", correct: false },
        { text: "An apparent force in rotating frames", correct: true },
        { text: "Same as centripetal force", correct: false },
        { text: "A gravitational effect", correct: false }
      ]
    },
    {
      question: "If curve radius decreases at constant speed:",
      options: [
        { text: "F_c decreases", correct: false },
        { text: "F_c increases", correct: true },
        { text: "F_c stays same", correct: false },
        { text: "Car stops", correct: false }
      ]
    },
    {
      question: "In a centrifuge, objects move outward because:",
      options: [
        { text: "Real outward force", correct: false },
        { text: "They continue straight while container curves", correct: true },
        { text: "Gravity pulls them", correct: false },
        { text: "Electric fields", correct: false }
      ]
    },
    {
      question: "At top of roller coaster loop, centripetal force is from:",
      options: [
        { text: "Friction only", correct: false },
        { text: "Normal force and gravity together", correct: true },
        { text: "Air resistance", correct: false },
        { text: "Motor", correct: false }
      ]
    },
    {
      question: "What happens to the centripetal force if you double the mass?",
      options: [
        { text: "It halves", correct: false },
        { text: "It stays the same", correct: false },
        { text: "It doubles", correct: true },
        { text: "It quadruples", correct: false }
      ]
    }
  ];

  const calculateScore = (): number => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  const renderCircularMotion = (showVec: boolean, size: number = 280) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const carX = centerX + Math.cos(carAngle * Math.PI / 180) * radius;
    const carY = centerY + Math.sin(carAngle * Math.PI / 180) * radius;
    const velAngle = carAngle + 90;
    const velX = Math.cos(velAngle * Math.PI / 180) * 35;
    const velY = Math.sin(velAngle * Math.PI / 180) * 35;
    const centX = (centerX - carX) / radius * 35 * Math.min(centripetalForce / 5, 2);
    const centY = (centerY - carY) / radius * 35 * Math.min(centripetalForce / 5, 2);

    // Motion trail positions (previous car positions)
    const trailAngles = [1, 2, 3, 4, 5].map(i => carAngle - i * 12);
    const trailPositions = trailAngles.map(angle => ({
      x: centerX + Math.cos(angle * Math.PI / 180) * radius,
      y: centerY + Math.sin(angle * Math.PI / 180) * radius
    }));

    return (
      <div className="relative">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            {/* Track gradient - outer to inner with depth */}
            <radialGradient id="centTrackGradient" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="40%" stopColor="#334155" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* Path line gradient */}
            <linearGradient id="centPathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Car body gradient - 3D effect */}
            <radialGradient id="centCarGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Sliding car gradient */}
            <radialGradient id="centCarSlidingGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>

            {/* Velocity arrow gradient */}
            <linearGradient id="centVelocityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* Force arrow gradient */}
            <linearGradient id="centForceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Center point gradient */}
            <radialGradient id="centCenterGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>

            {/* Glow filters */}
            <filter id="centVelocityGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="centForceGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="centCenterGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="centCarGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers with gradients */}
            <marker id="centArrowVelocity" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="url(#centVelocityGradient)" />
            </marker>
            <marker id="centArrowForce" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="url(#centForceGradient)" />
            </marker>
          </defs>

          {/* Track background with gradient */}
          <circle cx={centerX} cy={centerY} r={radius + 20} fill="url(#centTrackGradient)" />
          <circle cx={centerX} cy={centerY} r={radius - 20} fill="#0f172a" />

          {/* Path line with gradient */}
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="url(#centPathGradient)" strokeWidth="3" strokeDasharray="12 6" />

          {/* Road markings with subtle gradient */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <line key={angle}
              x1={centerX + Math.cos(angle * Math.PI / 180) * (radius - 15)}
              y1={centerY + Math.sin(angle * Math.PI / 180) * (radius - 15)}
              x2={centerX + Math.cos(angle * Math.PI / 180) * (radius + 15)}
              y2={centerY + Math.sin(angle * Math.PI / 180) * (radius + 15)}
              stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
          ))}

          {/* Motion trail effect */}
          {trailPositions.map((pos, i) => (
            <circle
              key={i}
              cx={pos.x}
              cy={pos.y}
              r={6 - i}
              fill={isSliding ? '#ef4444' : '#3b82f6'}
              opacity={0.4 - i * 0.07}
            />
          ))}

          {/* Sliding warning particles */}
          {isSliding && (
            <g>
              {[1, 2, 3, 4].map(i => (
                <circle
                  key={i}
                  cx={carX - centX * 0.25 * i}
                  cy={carY - centY * 0.25 * i}
                  r={5 - i}
                  fill="#ef4444"
                  opacity={0.9 - i * 0.2}
                  filter="url(#centForceGlow)"
                />
              ))}
            </g>
          )}

          {/* Car with 3D gradient */}
          <g transform={`translate(${carX}, ${carY}) rotate(${carAngle + 90})`} filter="url(#centCarGlow)">
            {/* Car shadow */}
            <rect x="-9" y="-14" width="18" height="28" rx="4" fill="rgba(0,0,0,0.3)" transform="translate(2, 2)" />
            {/* Car body */}
            <rect x="-10" y="-16" width="20" height="32" rx="4" fill={isSliding ? 'url(#centCarSlidingGradient)' : 'url(#centCarGradient)'} />
            {/* Windshield with reflection */}
            <rect x="-8" y="-12" width="16" height="10" rx="2" fill="#93c5fd" opacity="0.9" />
            <rect x="-6" y="-10" width="6" height="6" rx="1" fill="rgba(255,255,255,0.3)" />
            {/* Wheels with depth */}
            <rect x="-11" y="-14" width="5" height="7" rx="1" fill="#1f2937" />
            <rect x="6" y="-14" width="5" height="7" rx="1" fill="#1f2937" />
            <rect x="-11" y="6" width="5" height="7" rx="1" fill="#1f2937" />
            <rect x="6" y="6" width="5" height="7" rx="1" fill="#1f2937" />
            {/* Wheel highlights */}
            <rect x="-10" y="-13" width="3" height="2" rx="0.5" fill="#374151" />
            <rect x="7" y="-13" width="3" height="2" rx="0.5" fill="#374151" />
            <rect x="-10" y="7" width="3" height="2" rx="0.5" fill="#374151" />
            <rect x="7" y="7" width="3" height="2" rx="0.5" fill="#374151" />
          </g>

          {/* Vectors with glow effects */}
          {showVec && (
            <g>
              {/* Velocity vector with glow */}
              <line
                x1={carX}
                y1={carY}
                x2={carX + velX}
                y2={carY + velY}
                stroke="url(#centVelocityGradient)"
                strokeWidth="4"
                markerEnd="url(#centArrowVelocity)"
                filter="url(#centVelocityGlow)"
              />

              {/* Force vector with glow */}
              <line
                x1={carX}
                y1={carY}
                x2={carX + centX}
                y2={carY + centY}
                stroke="url(#centForceGradient)"
                strokeWidth="4"
                markerEnd="url(#centArrowForce)"
                filter="url(#centForceGlow)"
              />

              {/* Center point with glow */}
              <circle cx={centerX} cy={centerY} r="8" fill="url(#centCenterGradient)" filter="url(#centCenterGlow)" />
              <circle cx={centerX} cy={centerY} r="4" fill="#fef08a" />
            </g>
          )}
        </svg>

        {/* Text labels outside SVG using typo system */}
        {showVec && (
          <>
            <div
              className="absolute font-bold"
              style={{
                left: `${carX + velX * 1.3}px`,
                top: `${carY + velY * 1.3}px`,
                fontSize: typo.small,
                color: '#4ade80',
                textShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                transform: 'translate(-50%, -50%)'
              }}
            >
              v
            </div>
            <div
              className="absolute font-bold"
              style={{
                left: `${(carX + centerX) / 2}px`,
                top: `${(carY + centerY) / 2 - 12}px`,
                fontSize: typo.small,
                color: '#f87171',
                textShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                transform: 'translate(-50%, -50%)'
              }}
            >
              F_c
            </div>
          </>
        )}

        {/* Sliding warning label */}
        {isSliding && (
          <div
            className="absolute font-bold animate-pulse"
            style={{
              left: `${carX}px`,
              top: `${carY - 40}px`,
              fontSize: typo.small,
              color: '#ef4444',
              textShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
              transform: 'translate(-50%, -50%)'
            }}
          >
            SLIDING!
          </div>
        )}
      </div>
    );
  };

  const renderTwistSimulation = (size: number = 280) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const simRadius = 80;
    const ballX = centerX + Math.cos(carAngle * Math.PI / 180) * simRadius;
    const ballY = centerY + Math.sin(carAngle * Math.PI / 180) * simRadius;

    // Motion trail for ball
    const ballTrailAngles = [1, 2, 3, 4, 5].map(i => carAngle - i * 15);
    const ballTrailPositions = ballTrailAngles.map(angle => ({
      x: centerX + Math.cos(angle * Math.PI / 180) * simRadius,
      y: centerY + Math.sin(angle * Math.PI / 180) * simRadius
    }));

    // Velocity vector endpoint
    const velEndX = ballX + Math.cos((carAngle + 90) * Math.PI / 180) * 45;
    const velEndY = ballY + Math.sin((carAngle + 90) * Math.PI / 180) * 45;

    return (
      <div className="relative">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            {/* Background gradient */}
            <radialGradient id="centTwistBgGradient" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Path circle gradient */}
            <linearGradient id="centTwistPathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#475569" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* Ball gradient - 3D sphere effect */}
            <radialGradient id="centTwistBallGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Released ball gradient (red) */}
            <radialGradient id="centTwistBallReleasedGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>

            {/* String gradient */}
            <linearGradient id="centTwistStringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            {/* Center pivot gradient */}
            <radialGradient id="centTwistCenterGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>

            {/* Velocity arrow gradient */}
            <linearGradient id="centTwistVelocityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* Tangent path gradient */}
            <linearGradient id="centTwistTangentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.3" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="centTwistBallGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="centTwistCenterGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="centTwistVelocityGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker */}
            <marker id="centTwistArrowVelocity" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
              <path d="M0,0 L0,8 L12,4 z" fill="url(#centTwistVelocityGradient)" />
            </marker>
          </defs>

          {/* Background with gradient */}
          <circle cx={centerX} cy={centerY} r={simRadius + 30} fill="url(#centTwistBgGradient)" />

          {/* Path indicator with gradient */}
          <circle cx={centerX} cy={centerY} r={simRadius} fill="none" stroke="url(#centTwistPathGradient)" strokeWidth="2" strokeDasharray="6 4" />

          {/* Center pivot point with glow */}
          <circle cx={centerX} cy={centerY} r="10" fill="url(#centTwistCenterGradient)" filter="url(#centTwistCenterGlow)" />
          <circle cx={centerX} cy={centerY} r="5" fill="#fef08a" />

          {!stringBroken ? (
            <>
              {/* Motion trail */}
              {ballTrailPositions.map((pos, i) => (
                <circle
                  key={i}
                  cx={pos.x}
                  cy={pos.y}
                  r={8 - i * 1.2}
                  fill="#3b82f6"
                  opacity={0.4 - i * 0.07}
                />
              ))}

              {/* String with gradient and shadow */}
              <line
                x1={centerX}
                y1={centerY}
                x2={ballX}
                y2={ballY}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="4"
                transform="translate(1, 1)"
              />
              <line
                x1={centerX}
                y1={centerY}
                x2={ballX}
                y2={ballY}
                stroke="url(#centTwistStringGradient)"
                strokeWidth="3"
              />

              {/* Ball with 3D gradient and glow */}
              <circle cx={ballX} cy={ballY} r="16" fill="url(#centTwistBallGradient)" filter="url(#centTwistBallGlow)" />
              {/* Highlight reflection */}
              <ellipse cx={ballX - 5} cy={ballY - 5} rx="5" ry="4" fill="rgba(255,255,255,0.4)" />

              {/* Velocity vector with glow */}
              <line
                x1={ballX}
                y1={ballY}
                x2={velEndX}
                y2={velEndY}
                stroke="url(#centTwistVelocityGradient)"
                strokeWidth="4"
                markerEnd="url(#centTwistArrowVelocity)"
                filter="url(#centTwistVelocityGlow)"
              />
            </>
          ) : (
            <>
              {/* Broken string pieces at center */}
              <line x1={centerX} y1={centerY} x2={centerX + 15} y2={centerY + 8} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              <line x1={centerX} y1={centerY} x2={centerX - 12} y2={centerY + 10} stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />

              {/* Trail of flying ball */}
              {[1, 2, 3, 4, 5].map(i => (
                <circle
                  key={i}
                  cx={ballX + ballPosition.x - Math.cos(releaseAngle) * 8 * i}
                  cy={ballY + ballPosition.y - Math.sin(releaseAngle) * 8 * i}
                  r={10 - i * 1.5}
                  fill="#ef4444"
                  opacity={0.5 - i * 0.08}
                />
              ))}

              {/* Ball flying tangentially with glow */}
              <circle
                cx={ballX + ballPosition.x}
                cy={ballY + ballPosition.y}
                r="16"
                fill="url(#centTwistBallReleasedGradient)"
                filter="url(#centTwistBallGlow)"
              />
              <ellipse
                cx={ballX + ballPosition.x - 5}
                cy={ballY + ballPosition.y - 5}
                rx="5"
                ry="4"
                fill="rgba(255,255,255,0.3)"
              />

              {/* Tangent line showing straight path */}
              <line
                x1={ballX}
                y1={ballY}
                x2={ballX + Math.cos(releaseAngle) * 120}
                y2={ballY + Math.sin(releaseAngle) * 120}
                stroke="url(#centTwistTangentGradient)"
                strokeWidth="3"
                strokeDasharray="8 4"
                filter="url(#centTwistVelocityGlow)"
              />

              {/* Release point marker */}
              <circle cx={ballX} cy={ballY} r="6" fill="#22c55e" opacity="0.6" />
            </>
          )}
        </svg>

        {/* Text labels outside SVG using typo system */}
        {!stringBroken && (
          <div
            className="absolute font-bold"
            style={{
              left: `${velEndX + Math.cos((carAngle + 90) * Math.PI / 180) * 12}px`,
              top: `${velEndY + Math.sin((carAngle + 90) * Math.PI / 180) * 12}px`,
              fontSize: typo.body,
              color: '#4ade80',
              textShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
              transform: 'translate(-50%, -50%)'
            }}
          >
            v
          </div>
        )}

        {stringBroken && (
          <div
            className="absolute font-bold text-center"
            style={{
              left: '50%',
              bottom: '8px',
              fontSize: typo.small,
              color: '#f87171',
              textShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap'
            }}
          >
            Ball travels in a STRAIGHT LINE!
          </div>
        )}
      </div>
    );
  };

  const applications = [
    {
      title: "Roller Coasters",
      icon: "🎢",
      description: "At the top of a loop, gravity and the track's normal force both point toward the center, providing centripetal force.",
      details: "Clothoid loops (teardrop shaped) keep g-forces manageable. At the top: N + mg = mv²/r, so you feel lighter but stay on track!"
    },
    {
      title: "Satellites",
      icon: "🛰️",
      description: "Satellites orbit Earth because gravity provides the centripetal force needed for circular motion.",
      details: "At orbital altitude, gravity = mv²/r. The International Space Station orbits at 7.66 km/s, completing one orbit every 90 minutes!"
    },
    {
      title: "Washing Machines",
      icon: "🫧",
      description: "The spin cycle uses circular motion to force water out of clothes through holes in the drum.",
      details: "Clothes press against the drum wall while water escapes through perforations. Typical spin speeds: 800-1400 RPM."
    },
    {
      title: "Car Turns",
      icon: "🚗",
      description: "When a car turns on a flat road, friction between tires and pavement provides the centripetal force.",
      details: "If you turn too fast, the required centripetal force exceeds available friction, and the car slides! Banked curves help by using a component of normal force."
    }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-WORLD APPLICATIONS (Comprehensive)
  // ═══════════════════════════════════════════════════════════════════════════
  const realWorldApps = [
    {
      icon: "🧬",
      title: "Centrifuges",
      short: "Medical & Industrial Separation",
      tagline: "Spinning at thousands of RPM to separate matter by density",
      description: "Centrifuges use extremely high rotational speeds to create centripetal acceleration many times greater than gravity. This 'relative centrifugal force' causes denser materials to migrate outward faster than less dense materials, enabling precise separation of blood components, cell cultures, chemical compounds, and industrial materials.",
      connection: "The centripetal force equation F = mv²/r explains why faster spinning creates stronger separation. At high RPM, the required centripetal force becomes enormous - particles that can't be held in circular motion by intermolecular forces move outward relative to the spinning container.",
      howItWorks: "When a centrifuge spins, every particle experiences centripetal acceleration a = v²/r = ω²r. Denser particles require more centripetal force to maintain circular motion. Since the container walls provide equal force to all particles at the same radius, denser particles 'fall' outward while lighter particles remain closer to the center.",
      stats: [
        { value: "100,000+", label: "RPM in ultracentrifuges" },
        { value: "1,000,000 g", label: "Maximum relative centrifugal force" },
        { value: "0.1 nm", label: "Particle separation resolution" }
      ],
      examples: [
        "Blood separation into plasma, platelets, red cells, and white cells",
        "Uranium enrichment for nuclear fuel using gas centrifuges",
        "DNA/RNA extraction in molecular biology laboratories",
        "Cream separation from milk in dairy processing"
      ],
      companies: [
        "Beckman Coulter",
        "Thermo Fisher Scientific",
        "Eppendorf",
        "Sigma Laborzentrifugen"
      ],
      futureImpact: "Advanced microcentrifuges are enabling point-of-care diagnostics, allowing blood tests to be performed in minutes at a doctor's office rather than requiring laboratory processing. Ultracentrifuges continue to push boundaries in nanotechnology and virus research.",
      color: "#8b5cf6"
    },
    {
      icon: "🛣️",
      title: "Banked Curves on Roads",
      short: "Highway Engineering",
      tagline: "Tilted roads that help cars turn safely at high speeds",
      description: "Highway engineers design banked curves with precise angles calculated using centripetal force principles. The banking angle allows a component of the normal force from the road to provide centripetal force, reducing or eliminating the need for friction. This enables safer turns at higher speeds, especially in wet or icy conditions.",
      connection: "On a banked curve, the normal force N has a horizontal component N·sin(θ) pointing toward the center of the turn. For an ideal banking angle at a specific speed: tan(θ) = v²/(rg). At this speed, no friction is needed to maintain the circular path.",
      howItWorks: "When a road is banked at angle θ, the normal force from the road surface is perpendicular to the road, not vertical. This creates a horizontal component that provides centripetal force. The vertical component balances gravity. The ideal banking angle depends on the design speed and curve radius.",
      stats: [
        { value: "33°", label: "Maximum NASCAR track banking" },
        { value: "12%", label: "Typical highway superelevation" },
        { value: "70+ mph", label: "Design speeds for banked highways" }
      ],
      examples: [
        "NASCAR and Formula 1 race track turns with extreme banking",
        "Highway on-ramps and off-ramps with calculated superelevation",
        "Velodrome cycling tracks with 42-45 degree banking",
        "Railway curves with tilted tracks for high-speed trains"
      ],
      companies: [
        "AECOM",
        "Jacobs Engineering",
        "WSP Global",
        "Stantec",
        "HDR Inc"
      ],
      futureImpact: "Smart road surfaces with variable banking are being researched, potentially using electromagnetic or mechanical systems to adjust banking angles based on traffic speed and weather conditions. Autonomous vehicles may communicate with infrastructure to optimize cornering.",
      color: "#f97316"
    },
    {
      icon: "🌀",
      title: "Washing Machine Spin Cycles",
      short: "Home Appliances",
      tagline: "High-speed rotation that extracts water from your clothes",
      description: "The spin cycle of a washing machine uses centripetal force principles to remove water from fabrics. As the drum spins rapidly, clothes are pressed against the perforated drum wall. Water, being less constrained than fabric fibers, escapes through the holes while the clothes remain inside.",
      connection: "During the spin cycle, clothes require centripetal force F = mv²/r to move in a circle. The drum wall provides this force. Water droplets in the fabric also need centripetal force, but when the required force exceeds what surface tension and fabric structure can provide, water is 'flung' through the drum perforations.",
      howItWorks: "At high RPM, the centripetal acceleration can reach 300-500 times gravity (300-500 g). The drum wall provides centripetal force to the clothes, pressing them outward. Water molecules, loosely held by surface tension in the fabric, cannot maintain circular motion at this acceleration and escape through the drum holes.",
      stats: [
        { value: "1,400", label: "Maximum RPM in premium machines" },
        { value: "500 g", label: "Centripetal acceleration force" },
        { value: "90%", label: "Water extraction efficiency" }
      ],
      examples: [
        "Front-loading washing machines with horizontal drum rotation",
        "Industrial laundry extractors in hotels and hospitals",
        "Salad spinners using the same centripetal principle",
        "Industrial parts washing and degreasing equipment"
      ],
      companies: [
        "LG Electronics",
        "Samsung",
        "Whirlpool",
        "Bosch",
        "Miele"
      ],
      futureImpact: "Next-generation washing machines are incorporating AI to optimize spin cycles based on fabric type and load weight, maximizing water extraction while minimizing fabric wear. Some designs explore magnetic bearings for quieter, more efficient high-speed spinning.",
      color: "#06b6d4"
    },
    {
      icon: "🚀",
      title: "Space Station Artificial Gravity",
      short: "Future Space Habitats",
      tagline: "Rotating structures that simulate gravity for astronaut health",
      description: "Long-duration spaceflight causes significant health problems due to microgravity, including bone loss, muscle atrophy, and cardiovascular deconditioning. Rotating space stations can create artificial gravity through centripetal acceleration, providing the constant force astronauts' bodies need to maintain health during extended missions.",
      connection: "In a rotating space station, the floor pushes on astronauts with centripetal force F = mω²r, where ω is the angular velocity and r is the radius. This force feels exactly like gravity to the inhabitants. To simulate Earth gravity: ω²r = g, so for a given radius, the required rotation rate can be calculated.",
      howItWorks: "Astronauts inside a rotating habitat stand on the outer rim with their heads pointing toward the rotation axis. The floor provides centripetal force to keep them moving in a circle. From their reference frame, they experience an apparent outward force (centrifugal effect) that feels identical to gravitational pull.",
      stats: [
        { value: "450 m", label: "Ideal habitat radius for 1g at 1 RPM" },
        { value: "2 RPM", label: "Maximum comfortable rotation rate" },
        { value: "0.5-1 g", label: "Target artificial gravity level" }
      ],
      examples: [
        "Von Braun's 1952 rotating wheel space station concept",
        "Stanford Torus design for 10,000-person space colony",
        "Nautilus-X multi-mission space exploration vehicle",
        "Gateway Foundation's planned Voyager Station orbital hotel"
      ],
      companies: [
        "SpaceX",
        "Blue Origin",
        "Orbital Assembly",
        "Axiom Space",
        "NASA"
      ],
      futureImpact: "Rotating habitats are essential for Mars missions and permanent space settlements. Current research focuses on determining minimum effective gravity levels and managing the Coriolis effects that occur in rotating reference frames. The first commercial rotating station could be operational by the 2030s.",
      color: "#10b981"
    }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        Centripetal Force
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover the force that keeps objects moving in circles
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          {renderCircularMotion(true, 280)}

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              When a car turns, you feel pushed toward the outside.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Is there really an outward force, or is something else going on?
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                What force keeps the car moving in a circle?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Make Your Prediction
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">*</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">*</span>
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
          A car travels around a circular track at constant speed. In which direction is the NET force on the car?
        </p>
        {renderCircularMotion(false, 200)}
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Forward, in the direction of motion' },
          { id: 'B', text: 'Toward the center of the circle' },
          { id: 'C', text: 'Outward, away from the center' },
          { id: 'D', text: 'No net force - it\'s moving at constant speed' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
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
            Correct! This inward force is called <span className="text-cyan-400">centripetal force</span> - "center-seeking"!
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Centripetal Force Lab</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderCircularMotion(showVectors, 280)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-6">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Mass: {mass.toFixed(1)} kg</label>
          <input type="range" min="0.5" max="3" step="0.1" value={mass} onChange={(e) => setMass(parseFloat(e.target.value))} className="w-full accent-blue-500" />
          <p className="text-xs text-slate-400 mt-1">More mass = more force needed</p>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Speed: {speed.toFixed(1)} m/s</label>
          <input type="range" min="2" max="15" step="0.5" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full accent-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Higher speed = more force needed</p>
        </div>
        <div className="bg-slate-700/50 rounded-xl p-4">
          <label className="text-slate-300 text-sm block mb-2">Radius: {radius} m</label>
          <input type="range" min="40" max="100" value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} className="w-full accent-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Tighter curve = more force needed</p>
        </div>
      </div>
      <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-4 max-w-3xl w-full mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold ${isSliding ? 'text-red-400' : 'text-cyan-400'}`}>{centripetalForce.toFixed(2)} N</div>
            <div className="text-sm text-slate-300">Required F_c</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{(maxFriction * 10).toFixed(1)} N</div>
            <div className="text-sm text-slate-300">Max Friction</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${isSliding ? 'text-red-400' : 'text-emerald-400'}`}>{isSliding ? 'SLIDING' : 'GRIPPING'}</div>
            <div className="text-sm text-slate-300">Status</div>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-medium ${isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`}
        >
          {isAnimating ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => setShowVectors(!showVectors)}
          style={{ zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-medium ${showVectors ? 'bg-blue-600' : 'bg-slate-600'} text-white`}
        >
          Vectors {showVectors ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Key Formula: F = mv²/r</h3>
        <p className="text-slate-300 text-sm">
          <span className="text-green-400">v</span> (velocity) is tangent to the circle. <span className="text-red-400">F_c</span> points toward the center.
          Friction provides this force - if F_c exceeds max friction, the car slides!
        </p>
      </div>
      <button
        onClick={() => goToPhase('review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Centripetal Force</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Centripetal Force</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* "Center-seeking" - always toward the center</li>
            <li>* F = mv²/r (mass x velocity² / radius)</li>
            <li>* Changes direction, not speed</li>
            <li>* Not a new force - provided by friction, tension, gravity, etc.</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">"Centrifugal Force"</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* NOT a real force - it's fictitious</li>
            <li>* Only appears in rotating reference frames</li>
            <li>* You feel "pushed out" because you want to go straight</li>
            <li>* Newton's 1st Law: objects resist direction changes</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">The Physics</h3>
          <p className="text-slate-300 text-sm">
            <strong>Centripetal acceleration:</strong> a = v²/r always toward center<br />
            <strong>Newton's 2nd Law:</strong> F = ma = mv²/r<br />
            <strong>Double the speed?</strong> Requires 4x the force! (v² relationship)
          </p>
        </div>
      </div>
      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Imagine swinging a ball on a string in a circle above your head. The string provides the centripetal force.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens if the string suddenly breaks?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The ball spirals outward' },
          { id: 'B', text: 'The ball flies off in a straight line tangent to the circle' },
          { id: 'C', text: 'The ball flies directly away from the center' },
          { id: 'D', text: 'The ball falls straight down' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ zIndex: 10 }}
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
            Exactly! The ball continues in a straight line because there's no longer any force to change its direction!
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          >
            See It In Action
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Tangential Release</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderTwistSimulation(280)}
      </div>
      <div className="flex gap-4 mb-6">
        {!stringBroken ? (
          <button
            onClick={breakString}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl"
          >
            Break the String!
          </button>
        ) : (
          <button
            onClick={resetTwistSim}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
          >
            Reset Simulation
          </button>
        )}
      </div>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-amber-400 mb-3">What You're Seeing:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>* The ball moves in a circle because the string pulls it toward the center</li>
          <li>* The velocity is always TANGENT to the circle (perpendicular to the string)</li>
          <li>* When the string breaks, there's no more centripetal force</li>
          <li>* Without a force to change its direction, the ball travels in a straight line!</li>
        </ul>
        <p className="text-cyan-400 mt-4 text-sm">This is Newton's First Law in action - objects in motion stay in motion in a straight line unless acted upon by a force!</p>
      </div>
      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Key Discovery: Newton's First Law</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Why Objects Don't Fly Outward!</h3>
        <div className="space-y-4 text-slate-300 text-sm">
          <p>
            <strong className="text-white">The Common Misconception:</strong> Many people think objects in circular motion are "trying to fly outward" due to centrifugal force.
          </p>
          <p>
            <strong className="text-white">The Truth:</strong> Objects actually want to go STRAIGHT (Newton's First Law). The centripetal force constantly pulls them inward, curving their path into a circle.
          </p>
          <p>
            <strong className="text-white">When Released:</strong> Without the inward force, the object doesn't spiral out - it continues in a straight line in whatever direction it was moving at that instant (tangent to the circle).
          </p>
        </div>
        <div className="mt-4 p-3 bg-slate-800/50 rounded-xl">
          <p className="text-emerald-400 font-medium">Key Insight: Centripetal force doesn't push or pull objects along the circle - it curves their path!</p>
        </div>
      </div>
      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppTab === index ? 'bg-blue-600 text-white'
              : completedApps.has(index) ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {app.title}
          </button>
        ))}
      </div>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{applications[activeAppTab].icon}</span>
          <h3 className="text-xl font-bold text-white">{applications[activeAppTab].title}</h3>
        </div>
        <p className="text-lg text-slate-300 mt-4 mb-3">{applications[activeAppTab].description}</p>
        <p className="text-sm text-slate-400">{applications[activeAppTab].details}</p>
        {!completedApps.has(activeAppTab) && (
          <button
            onClick={() => handleAppComplete(activeAppTab)}
            style={{ zIndex: 10 }}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
          >
            Mark as Understood
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{applications.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button
          onClick={() => goToPhase('test')}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const handleSubmitTest = () => {
      const score = calculateScore();
      setShowTestResults(true);
      setTestScore?.(score);
      onGameEvent?.({ type: 'test_completed', data: { score, total: 10 } });
    };

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>
        {!showTestResults ? (
          <div className="space-y-6 max-w-2xl w-full">
            {testQuestions.map((q, qIndex) => (
              <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-white font-medium mb-3">{qIndex + 1}. {q.question}</p>
                <div className="grid gap-2">
                  {q.options.map((option, oIndex) => (
                    <button
                      key={oIndex}
                      onClick={() => handleTestAnswer(qIndex, oIndex)}
                      style={{ zIndex: 10 }}
                      className={`p-3 rounded-lg text-left text-sm transition-all ${testAnswers[qIndex] === oIndex ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={handleSubmitTest}
              disabled={testAnswers.includes(-1)}
              style={{ zIndex: 10 }}
              className={`w-full py-4 rounded-xl font-semibold text-lg ${testAnswers.includes(-1) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'}`}
            >
              Submit Answers
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '🎉' : '📚'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">Score: {calculateScore()}/10</h3>
            <p className="text-slate-300 mb-6">{calculateScore() >= 7 ? 'Excellent! You\'ve mastered centripetal force!' : 'Keep studying! Review and try again.'}</p>
            {calculateScore() >= 7 ? (
              <button
                onClick={() => goToPhase('mastery')}
                style={{ zIndex: 10 }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              >
                Claim Your Mastery Badge
              </button>
            ) : (
              <button
                onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
                style={{ zIndex: 10 }}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
              >
                Review and Try Again
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => {
    useEffect(() => {
      onGameEvent?.({ type: 'mastery_achieved', data: { topic: 'centripetal_force' } });
    }, []);

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <div className="bg-gradient-to-br from-blue-900/50 via-cyan-900/50 to-teal-900/50 rounded-3xl p-8 max-w-2xl">
          <div className="text-8xl mb-6">🚗</div>
          <h1 className="text-3xl font-bold text-white mb-4">Circular Motion Master!</h1>
          <p className="text-xl text-slate-300 mb-6">You've mastered centripetal force and circular motion!</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">F=mv²/r</div><p className="text-sm text-slate-300">Centripetal Force</p></div>
            <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🎢</div><p className="text-sm text-slate-300">Roller Coaster Loops</p></div>
            <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🛰️</div><p className="text-sm text-slate-300">Satellite Orbits</p></div>
            <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🚗</div><p className="text-sm text-slate-300">Car Turns</p></div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => goToPhase('hook')}
              style={{ zIndex: 10 }}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
            >
              Explore Again
            </button>
            <div>
              <button
                onClick={() => window.location.href = '/dashboard'}
                style={{ zIndex: 10 }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Centripetal Force</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default CentripetalForceRenderer;
