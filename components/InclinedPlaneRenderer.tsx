'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// INCLINED PLANE (GRAVITY COMPONENTS) RENDERER - Premium Design System
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
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

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

interface InclinedPlaneRendererProps {
  width?: number;
  height?: number;
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

// ============================================================================
// PREMIUM DESIGN TOKENS
// ============================================================================
const design = {
  colors: {
    bgDeep: '#060810',
    bgPrimary: '#0a0c14',
    bgSecondary: '#10141e',
    bgTertiary: '#181e2c',
    bgElevated: '#222a3c',
    textPrimary: '#f4f6fa',
    textSecondary: '#98a4b8',
    textTertiary: '#5a6880',
    accentPrimary: '#06b6d4',
    accentSecondary: '#22d3ee',
    accentMuted: '#164e63',
    accentGlow: 'rgba(6, 182, 212, 0.25)',
    secondary: '#f97316',
    secondaryMuted: '#7c2d12',
    ball: '#ef4444',
    ballHighlight: '#fca5a5',
    ramp: '#4a5568',
    rampLight: '#718096',
    gravity: '#a855f7',
    normal: '#22c55e',
    parallel: '#f59e0b',
    friction: '#ef4444',
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    danger: '#ef4444',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(152, 164, 184, 0.12)',
    borderHover: 'rgba(152, 164, 184, 0.25)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Fira Code", monospace'
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 8px 24px rgba(0,0,0,0.4)',
    lg: '0 16px 48px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 32px ${color}40`
  }
};


// ============================================================================
// APPLICATION TAB SVG GRAPHICS
// ============================================================================
const MountainRoadsSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#374151" />
      </linearGradient>
      <linearGradient id="roadGradInc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="100%" stopColor="#374151" />
      </linearGradient>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>

    {/* Sky */}
    <rect x="0" y="0" width="200" height="140" fill="url(#skyGrad)" />

    {/* Mountains */}
    <polygon points="0,140 40,60 80,140" fill="url(#mountainGrad)" />
    <polygon points="50,140 100,30 150,140" fill="#4b5563" />
    <polygon points="120,140 170,50 200,100 200,140" fill="url(#mountainGrad)" />

    {/* Snow caps */}
    <polygon points="100,30 90,55 110,55" fill="#e5e7eb" />
    <polygon points="170,50 160,70 180,70" fill="#e5e7eb" />

    {/* Switchback road */}
    <path d="M20 130 L60 110 L30 90 L70 70 L40 50 L80 35" stroke="#6b7280" strokeWidth="8" fill="none" strokeLinecap="round" />
    <path d="M20 130 L60 110 L30 90 L70 70 L40 50 L80 35" stroke="#f59e0b" strokeWidth="1" fill="none" strokeDasharray="4,8" />

    {/* Car */}
    <g transform="translate(55, 105) rotate(-20)">
      <rect x="0" y="0" width="12" height="6" rx="2" fill="#ef4444" />
      <rect x="1" y="-2" width="4" height="4" rx="1" fill="#93c5fd" />
      <circle cx="2" cy="7" r="2" fill="#1f2937" />
      <circle cx="10" cy="7" r="2" fill="#1f2937" />
    </g>

    {/* Labels */}
    <text x="150" y="125" fill={design.colors.accentPrimary} fontSize="10" fontWeight="600">15% Grade</text>
    <text x="100" y="15" fill="#9ca3af" fontSize="9">Switchback reduces slope</text>
  </svg>
);

const WheelchairRampSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="concreteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>
      <linearGradient id="railGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>

    {/* Building */}
    <rect x="140" y="20" width="60" height="120" fill="#374151" />
    <rect x="150" y="30" width="15" height="20" fill="#60a5fa" opacity="0.5" />
    <rect x="175" y="30" width="15" height="20" fill="#60a5fa" opacity="0.5" />
    <rect x="155" y="80" width="25" height="40" rx="2" fill="#4b5563" />

    {/* Ground */}
    <rect x="0" y="120" width="200" height="20" fill="#374151" />

    {/* Ramp */}
    <polygon points="20,120 140,120 140,70" fill="url(#concreteGrad)" />

    {/* Ramp surface lines */}
    {[0, 20, 40, 60, 80, 100].map((x, i) => (
      <line key={i} x1={30 + x} y1={118} x2={30 + x + 8} y2={118} stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" />
    ))}

    {/* Handrails */}
    <line x1="25" y1="110" x2="138" y2="60" stroke="url(#railGrad)" strokeWidth="4" strokeLinecap="round" />
    <line x1="25" y1="118" x2="138" y2="68" stroke="url(#railGrad)" strokeWidth="4" strokeLinecap="round" />

    {/* Wheelchair user */}
    <g transform="translate(70, 90)">
      {/* Wheel */}
      <circle cx="0" cy="15" r="12" fill="#1f2937" stroke="#4b5563" strokeWidth="2" />
      <circle cx="0" cy="15" r="3" fill="#6b7280" />
      {/* Small wheel */}
      <circle cx="20" cy="20" r="5" fill="#1f2937" />
      {/* Chair */}
      <rect x="-5" y="0" width="25" height="15" rx="3" fill="#3b82f6" />
      {/* Person */}
      <circle cx="8" cy="-8" r="8" fill="#fcd34d" />
      <rect x="2" y="0" width="12" height="10" rx="2" fill="#60a5fa" />
    </g>

    {/* Angle indicator */}
    <path d="M130 120 A 20 20 0 0 0 138 100" stroke={design.colors.accentPrimary} strokeWidth="2" fill="none" />
    <text x="115" y="115" fill={design.colors.accentPrimary} fontSize="10" fontWeight="600">4.8\u00b0</text>
    <text x="10" y="15" fill={design.colors.textSecondary} fontSize="9">ADA Compliant: 1:12 slope</text>
  </svg>
);

const SkiSlopeSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="snowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f0f9ff" />
        <stop offset="100%" stopColor="#bae6fd" />
      </linearGradient>
      <linearGradient id="skiSuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>

    {/* Sky */}
    <rect x="0" y="0" width="200" height="140" fill="#0c4a6e" />

    {/* Mountain slope */}
    <polygon points="0,30 200,100 200,140 0,140" fill="url(#snowGrad)" />

    {/* Trees */}
    <g transform="translate(20, 50)">
      <polygon points="0,30 8,-5 16,30" fill="#166534" />
      <rect x="6" y="30" width="4" height="8" fill="#78350f" />
    </g>
    <g transform="translate(170, 80)">
      <polygon points="0,25 6,-5 12,25" fill="#166534" />
      <rect x="4" y="25" width="4" height="6" fill="#78350f" />
    </g>

    {/* Ski tracks */}
    <path d="M40 45 Q100 80 180 115" stroke="#94a3b8" strokeWidth="1" fill="none" />
    <path d="M45 45 Q105 80 185 115" stroke="#94a3b8" strokeWidth="1" fill="none" />

    {/* Skier */}
    <g transform="translate(90, 65) rotate(25)">
      {/* Body */}
      <ellipse cx="0" cy="0" rx="6" ry="10" fill="url(#skiSuitGrad)" />
      {/* Head */}
      <circle cx="0" cy="-14" r="7" fill="#fcd34d" />
      {/* Helmet */}
      <path d="M-7 -18 Q0 -24 7 -18" fill="#1f2937" />
      {/* Goggles */}
      <rect x="-5" y="-15" width="10" height="3" rx="1" fill="#f97316" />
      {/* Skis */}
      <rect x="-20" y="12" width="40" height="3" rx="1" fill="#1f2937" />
      {/* Poles */}
      <line x1="-8" y1="-5" x2="-25" y2="15" stroke="#6b7280" strokeWidth="2" />
      <line x1="8" y1="-5" x2="25" y2="15" stroke="#6b7280" strokeWidth="2" />
    </g>

    {/* Speed lines */}
    <g opacity="0.5">
      <line x1="60" y1="55" x2="40" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="65" y1="60" x2="50" y2="58" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Slope rating */}
    <g transform="translate(150, 20)">
      <rect x="0" y="0" width="40" height="20" rx="4" fill="#1f2937" />
      <polygon points="8,5 14,15 20,5" fill="#1f2937" stroke="black" strokeWidth="2" />
      <polygon points="22,5 28,15 34,5" fill="#1f2937" stroke="black" strokeWidth="2" />
      <text x="20" y="13" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">40\u00b0+</text>
    </g>
    <text x="10" y="15" fill="#fef3c7" fontSize="9">Black Diamond: Expert Only</text>
  </svg>
);

const LoadingDockSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="truckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id="warehouseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>
      <linearGradient id="rampGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>
    </defs>

    {/* Warehouse */}
    <rect x="0" y="20" width="80" height="100" fill="url(#warehouseGrad)" />
    <rect x="10" y="30" width="25" height="20" fill="#1e3a5f" />
    <rect x="45" y="30" width="25" height="20" fill="#1e3a5f" />
    <rect x="20" y="70" width="40" height="50" rx="2" fill="#374151" />

    {/* Loading dock platform */}
    <rect x="60" y="70" width="25" height="50" fill="#4b5563" />

    {/* Ramp */}
    <polygon points="85,120 140,120 140,70 85,70" fill="url(#rampGrad2)" />

    {/* Truck */}
    <g transform="translate(130, 60)">
      {/* Trailer */}
      <rect x="0" y="10" width="60" height="40" rx="2" fill="url(#truckGrad)" />
      {/* Cab */}
      <rect x="55" y="25" width="20" height="25" rx="2" fill="#dc2626" />
      <rect x="60" y="28" width="12" height="10" rx="1" fill="#93c5fd" />
      {/* Wheels */}
      <circle cx="15" cy="52" r="6" fill="#1f2937" />
      <circle cx="45" cy="52" r="6" fill="#1f2937" />
      <circle cx="68" cy="52" r="6" fill="#1f2937" />
    </g>

    {/* Forklift on ramp */}
    <g transform="translate(100, 85)">
      {/* Body */}
      <rect x="0" y="5" width="20" height="15" rx="2" fill="#fbbf24" />
      {/* Cage */}
      <rect x="12" y="-5" width="10" height="15" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      {/* Forks */}
      <rect x="-8" y="15" width="10" height="3" fill="#6b7280" />
      <rect x="-8" y="20" width="10" height="3" fill="#6b7280" />
      {/* Wheels */}
      <circle cx="5" cy="22" r="4" fill="#1f2937" />
      <circle cx="18" cy="22" r="4" fill="#1f2937" />
      {/* Pallet */}
      <rect x="-10" y="5" width="12" height="10" fill="#a3a3a3" />
    </g>

    {/* Ground */}
    <rect x="0" y="120" width="200" height="20" fill="#374151" />

    {/* Labels */}
    <text x="95" y="135" fill={design.colors.accentPrimary} fontSize="9" fontWeight="600">5-10\u00b0 incline</text>
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const InclinedPlaneRenderer: React.FC<InclinedPlaneRendererProps> = ({
  width = 400,
  height = 500,
  onComplete,
  onGameEvent,
  currentPhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<number>(currentPhase ?? 0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [angle, setAngle] = useState(30);
  const [hasFriction, setHasFriction] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [ballPosition, setBallPosition] = useState(0);
  const [ballVelocity, setBallVelocity] = useState(0);
  const [showVectors, setShowVectors] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [bestTimes, setBestTimes] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  const navigationLockRef = useRef(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const g = 9.8;
  const mass = 1;
  const frictionCoef = hasFriction ? 0.3 : 0;
  const angleRad = (angle * Math.PI) / 180;
  const gravityParallel = mass * g * Math.sin(angleRad);
  const normalForce = mass * g * Math.cos(angleRad);
  const frictionForce = frictionCoef * normalForce;
  const netAcceleration = Math.max(0, (gravityParallel - frictionForce) / mass);

  const testQuestions = [
    { question: "Why does a ball roll faster on a steeper ramp?", options: ["Less air resistance", "More gravity pulls on it", "Larger component of gravity acts along the ramp", "The ball weighs more on a steeper ramp"], correct: 2, explanation: "Gravity's magnitude stays constant, but the component along the ramp (mg\u00b7sin\u03b8) increases with steeper angles, causing greater acceleration." },
    { question: "What happens to the normal force as the ramp gets steeper?", options: ["Increases", "Decreases (N = mg\u00b7cos\u03b8)", "Stays the same", "Becomes zero"], correct: 1, explanation: "Normal force N = mg\u00b7cos(\u03b8). As \u03b8 increases, cos(\u03b8) decreases, so the normal force decreases. At 90\u00b0, it would be zero!" },
    { question: "If there's no friction, a ball on a 30\u00b0 ramp has acceleration:", options: ["g (9.8 m/s\u00b2)", "g\u00b7sin(30\u00b0) = 4.9 m/s\u00b2", "g\u00b7cos(30\u00b0) = 8.5 m/s\u00b2", "Zero"], correct: 1, explanation: "Without friction, the acceleration is a = g\u00b7sin(\u03b8). For 30\u00b0, sin(30\u00b0) = 0.5, so a = 9.8 \u00d7 0.5 = 4.9 m/s\u00b2." },
    { question: "Friction on a ramp acts:", options: ["Downward, speeding up the ball", "Upward along the ramp, opposing motion", "Perpendicular to the ramp", "In the direction of gravity"], correct: 1, explanation: "Kinetic friction always opposes motion. For a ball rolling down, friction acts up the ramp, reducing the net acceleration." },
    { question: "At what angle would a frictionless ball have maximum acceleration?", options: ["0\u00b0 (flat)", "45\u00b0", "90\u00b0 (vertical drop)", "30\u00b0"], correct: 2, explanation: "At 90\u00b0, the entire weight acts downward and sin(90\u00b0) = 1, giving maximum acceleration of g. It's essentially free fall!" },
    { question: "Why do mountain roads zigzag instead of going straight up?", options: ["For better views", "To reduce the effective slope and required force", "Roads can't be built straight", "For drainage"], correct: 1, explanation: "Zigzag roads reduce the slope angle, decreasing the component of gravity cars must overcome. This allows vehicles to climb with less power." },
    { question: "A ball on a ramp with friction might not move if:", options: ["The ball is too heavy", "Static friction exceeds gravity's parallel component", "The ramp is too long", "There's no normal force"], correct: 1, explanation: "If static friction (\u03bcs \u00d7 N) is greater than mg\u00b7sin(\u03b8), the ball won't start moving. There's a critical angle below which objects stay put." },
    { question: "The parallel component of gravity equals:", options: ["mg", "mg \u00d7 cos(\u03b8)", "mg \u00d7 sin(\u03b8)", "mg \u00d7 tan(\u03b8)"], correct: 2, explanation: "Using vector decomposition, the component of gravity along (parallel to) the ramp is F_parallel = mg \u00d7 sin(\u03b8)." },
    { question: "If you double the mass of a ball on a frictionless ramp:", options: ["It accelerates twice as fast", "It accelerates the same (a = g\u00b7sin\u03b8)", "It accelerates half as fast", "It doesn't move"], correct: 1, explanation: "The acceleration a = g\u00b7sin(\u03b8) doesn't depend on mass! Both gravity force and inertia scale with mass, so they cancel out." },
    { question: "Skiers crouch down on steep slopes to:", options: ["Look cool", "Reduce air resistance and go faster", "Increase normal force", "Change the slope angle"], correct: 1, explanation: "Crouching reduces air resistance (drag), allowing skiers to reach higher speeds. The slope angle and gravity components stay the same." }
  ];

  const applications = [
    { title: "Mountain Roads", description: "Switchback roads reduce effective slope, allowing vehicles to climb mountains with reasonable power. The zigzag path trades distance for reduced gradient.", stats: "Max road grade: ~15% (8.5\u00b0)", SVG: MountainRoadsSVG },
    { title: "Wheelchair Ramps", description: "ADA requires ramps with max 1:12 slope (4.8\u00b0) for accessibility. This keeps the force needed to push a wheelchair manageable.", stats: "ADA max: 1:12 (4.76\u00b0)", SVG: WheelchairRampSVG },
    { title: "Ski Slopes", description: "Ski runs are rated by steepness: Green (10-25\u00b0), Blue (25-40\u00b0), Black (40\u00b0+). Steeper means faster acceleration!", stats: "Black diamond: 40\u00b0+ slope", SVG: SkiSlopeSVG },
    { title: "Loading Docks", description: "Truck ramps use gentle angles so forklifts can safely transport heavy loads. Too steep and the cargo could slide or tip.", stats: "Typical dock: 5-10\u00b0 incline", SVG: LoadingDockSVG }
  ];

  // Sync with external phase control
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase]);

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'error' | 'transition' = 'click') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const freqMap = { click: 440, success: 600, error: 300, transition: 520 };
      oscillator.frequency.value = freqMap[type];
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {}
  }, []);

  // Emit events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, data });
    }
  }, [onGameEvent]);

  // Phase navigation with 400ms debouncing
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emitEvent, phase, playSound, onPhaseComplete]);

  const goNext = useCallback(() => {
    if (phase < PHASES.length - 1) {
      goToPhase(phase + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const goBack = useCallback(() => {
    if (phase > 0) {
      goToPhase(phase - 1);
    }
  }, [phase, goToPhase]);

  // Render button helper function
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' | 'ghost' = 'primary',
    options?: { disabled?: boolean; fullWidth?: boolean; size?: 'sm' | 'md' | 'lg' }
  ) => {
    const { disabled = false, fullWidth = false, size = 'md' } = options || {};
    const baseStyle: React.CSSProperties = {
      padding: size === 'lg' ? `${design.spacing.md}px ${design.spacing.xl}px` :
               size === 'sm' ? `${design.spacing.xs}px ${design.spacing.md}px` :
               `${design.spacing.sm}px ${design.spacing.lg}px`,
      borderRadius: design.radius.md,
      border: 'none',
      fontWeight: 600,
      fontSize: size === 'lg' ? 17 : size === 'sm' ? 13 : 15,
      fontFamily: design.font.sans,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: design.spacing.sm
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
        color: '#000',
        boxShadow: design.shadow.glow(design.colors.accentPrimary)
      },
      secondary: {
        background: design.colors.bgTertiary,
        color: design.colors.textPrimary,
        border: `1px solid ${design.colors.border}`
      },
      success: {
        background: `linear-gradient(135deg, ${design.colors.success} 0%, #34d399 100%)`,
        color: '#000',
        boxShadow: design.shadow.glow(design.colors.success)
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary,
        border: `1px solid ${design.colors.border}`
      }
    };

    return (
      <button
        onMouseDown={(e) => {
          if (disabled || navigationLockRef.current) return;
          e.preventDefault();
          navigationLockRef.current = true;
          onClick();
          setTimeout(() => { navigationLockRef.current = false; }, 400);
        }}
        style={{ ...baseStyle, ...variants[variant] }}
      >
        {label}
      </button>
    );
  };

  const startRolling = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    setBallPosition(0);
    setBallVelocity(0);
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    emit('interaction', { angle, hasFriction, acceleration: netAcceleration }, 'roll_start');

    let pos = 0;
    let vel = 0;
    const accel = netAcceleration;

    const animate = () => {
      const dt = 0.016;
      vel += accel * dt * 3;
      pos += vel * dt * 10;

      setBallPosition(Math.min(pos, 100));
      setBallVelocity(vel);
      setElapsedTime((Date.now() - startTimeRef.current) / 1000);

      if (pos < 100) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        const finalTime = (Date.now() - startTimeRef.current) / 1000;
        setIsRolling(false);
        setExperimentCount(prev => prev + 1);
        setBestTimes(prev => ({
          ...prev,
          [angle]: prev[angle] ? Math.min(prev[angle], finalTime) : finalTime
        }));
        emit('result', { time: finalTime, angle, acceleration: accel });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isRolling, angle, hasFriction, netAcceleration, emit]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsRolling(false);
    setBallPosition(0);
    setBallVelocity(0);
    setElapsedTime(0);
    emit('interaction', { action: 'reset' }, 'reset');
  }, [emit]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = answerIndex === testQuestions[currentQuestion].correct;
    if (isCorrect) setCorrectAnswers(prev => prev + 1);
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    emit('interaction', { question: currentQuestion, answer: answerIndex, correct: isCorrect }, 'answer_submit');
  }, [currentQuestion, answeredQuestions, emit, testQuestions]);

  // ============================================================================
  // VISUALIZATION
  // ============================================================================
  const renderVisualization = () => {
    const rampLength = width - 100;
    const rampHeight = rampLength * Math.tan(angleRad);
    const rampStartX = 50;
    const rampStartY = 40;
    const rampEndX = rampStartX + rampLength;
    const rampEndY = rampStartY + rampHeight;

    const ballProgress = ballPosition / 100;
    const ballX = rampStartX + ballProgress * rampLength;
    const ballY = rampStartY + ballProgress * rampHeight;
    const ballRadius = 15;

    const vectorScale = 3;

    return (
      <svg width={width} height={height * 0.55} viewBox={`0 0 ${width} ${height * 0.55}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="rampGradMain" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={design.colors.rampLight} />
            <stop offset="100%" stopColor={design.colors.ramp} />
          </linearGradient>
          <radialGradient id="ballGradMain" cx="30%" cy="30%">
            <stop offset="0%" stopColor={design.colors.ballHighlight} />
            <stop offset="100%" stopColor={design.colors.ball} />
          </radialGradient>
          <filter id="ballShadowMain">
            <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.5" />
          </filter>
        </defs>

        <rect width={width} height={height * 0.55} fill={design.colors.bgDeep} />

        {/* Ground */}
        <line x1={0} y1={rampEndY + 8} x2={width} y2={rampEndY + 8} stroke={design.colors.textTertiary} strokeWidth={2} />

        {/* Ramp */}
        <polygon
          points={`${rampStartX},${rampStartY} ${rampEndX},${rampEndY} ${rampEndX},${rampEndY + 18} ${rampStartX},${rampStartY + 18}`}
          fill="url(#rampGradMain)"
          stroke={design.colors.rampLight}
          strokeWidth={2}
        />

        {/* Ramp surface indicator */}
        {hasFriction && (
          <text x={rampStartX + rampLength/2} y={rampStartY + rampHeight/2 + 35} textAnchor="middle"
                fill={design.colors.friction} fontSize="10" fontFamily={design.font.sans} fontWeight="500"
                transform={`rotate(${angle}, ${rampStartX + rampLength/2}, ${rampStartY + rampHeight/2 + 35})`}>
            ~ Rough Surface ~
          </text>
        )}

        {/* Angle arc */}
        <path
          d={`M${rampEndX - 45} ${rampEndY} A 45 45 0 0 0 ${rampEndX - 45 * Math.cos(angleRad)} ${rampEndY - 45 * Math.sin(angleRad)}`}
          fill="none"
          stroke={design.colors.accentPrimary}
          strokeWidth={2}
        />
        <text x={rampEndX - 60} y={rampEndY - 18} fill={design.colors.accentPrimary} fontSize="15" fontWeight="bold" fontFamily={design.font.sans}>
          {angle}\u00b0
        </text>

        {/* Ball */}
        <g filter="url(#ballShadowMain)">
          <circle cx={ballX} cy={ballY - ballRadius - 9} r={ballRadius} fill="url(#ballGradMain)" />
          <circle cx={ballX - 5} cy={ballY - ballRadius - 13} r={5} fill="rgba(255,255,255,0.4)" />
        </g>

        {/* Force vectors */}
        {showVectors && (
          <g transform={`translate(${ballX}, ${ballY - ballRadius - 9})`}>
            {/* Gravity (straight down) */}
            <line x1={0} y1={0} x2={0} y2={mass * g * vectorScale} stroke={design.colors.gravity} strokeWidth={3} />
            <polygon points={`0,${mass * g * vectorScale + 8} -5,${mass * g * vectorScale} 5,${mass * g * vectorScale}`} fill={design.colors.gravity} />
            <text x={10} y={mass * g * vectorScale / 2} fill={design.colors.gravity} fontSize="11" fontFamily={design.font.sans} fontWeight="500">mg</text>

            {/* Normal force (perpendicular to ramp) */}
            <g transform={`rotate(${-angle})`}>
              <line x1={0} y1={0} x2={0} y2={-normalForce * vectorScale} stroke={design.colors.normal} strokeWidth={3} />
              <polygon points={`0,${-normalForce * vectorScale - 8} -5,${-normalForce * vectorScale} 5,${-normalForce * vectorScale}`} fill={design.colors.normal} />
              <text x={10} y={-normalForce * vectorScale / 2} fill={design.colors.normal} fontSize="11" fontFamily={design.font.sans} fontWeight="500">N</text>
            </g>

            {/* Parallel component (along ramp) */}
            <g transform={`rotate(${angle})`}>
              <line x1={0} y1={0} x2={gravityParallel * vectorScale} y2={0} stroke={design.colors.parallel} strokeWidth={3} />
              <polygon points={`${gravityParallel * vectorScale + 8},0 ${gravityParallel * vectorScale},-5 ${gravityParallel * vectorScale},5`} fill={design.colors.parallel} />
              <text x={gravityParallel * vectorScale / 2} y={-14} fill={design.colors.parallel} fontSize="10" fontFamily={design.font.sans} fontWeight="500">mg\u00b7sin\u03b8</text>

              {/* Friction */}
              {hasFriction && frictionForce > 0 && (
                <>
                  <line x1={0} y1={0} x2={-frictionForce * vectorScale} y2={0} stroke={design.colors.friction} strokeWidth={3} />
                  <polygon points={`${-frictionForce * vectorScale - 8},0 ${-frictionForce * vectorScale},-5 ${-frictionForce * vectorScale},5`} fill={design.colors.friction} />
                  <text x={-frictionForce * vectorScale / 2} y={14} fill={design.colors.friction} fontSize="10" fontFamily={design.font.sans} fontWeight="500">f</text>
                </>
              )}
            </g>
          </g>
        )}

        {/* Info panel */}
        <g transform={`translate(${width - 115}, 15)`}>
          <rect x={0} y={0} width={100} height={80} rx={8} fill={design.colors.bgSecondary} stroke={design.colors.border} strokeWidth={1} />
          <text x={50} y={20} textAnchor="middle" fill={design.colors.textSecondary} fontSize="10" fontFamily={design.font.sans}>Acceleration</text>
          <text x={50} y={42} textAnchor="middle" fill={design.colors.success} fontSize="18" fontWeight="bold" fontFamily={design.font.mono}>
            {netAcceleration.toFixed(2)}
          </text>
          <text x={50} y={55} textAnchor="middle" fill={design.colors.textTertiary} fontSize="10" fontFamily={design.font.sans}>m/s\u00b2</text>
          <text x={50} y={72} textAnchor="middle" fill={design.colors.textTertiary} fontSize="9" fontFamily={design.font.sans}>
            v: {ballVelocity.toFixed(1)} m/s
          </text>
        </g>

        {/* Legend */}
        {showVectors && (
          <g transform={`translate(15, ${height * 0.55 - 75})`}>
            <rect x={0} y={0} width={125} height={60} rx={8} fill={design.colors.bgSecondary} stroke={design.colors.border} strokeWidth={1} />
            <circle cx={15} cy={16} r={5} fill={design.colors.gravity} />
            <text x={28} y={20} fill={design.colors.textSecondary} fontSize="9" fontFamily={design.font.sans}>Gravity (mg)</text>
            <circle cx={15} cy={32} r={5} fill={design.colors.normal} />
            <text x={28} y={36} fill={design.colors.textSecondary} fontSize="9" fontFamily={design.font.sans}>Normal (N)</text>
            <circle cx={15} cy={48} r={5} fill={design.colors.parallel} />
            <text x={28} y={52} fill={design.colors.textSecondary} fontSize="9" fontFamily={design.font.sans}>Parallel (mg\u00b7sin\u03b8)</text>
          </g>
        )}
      </svg>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: design.spacing.xl,
      background: `radial-gradient(ellipse at 50% 30%, ${design.colors.accentMuted}30 0%, ${design.colors.bgDeep} 70%)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: 70,
        height: 70,
        borderRadius: design.radius.lg,
        background: `linear-gradient(135deg, ${design.colors.gravity}30 0%, transparent 100%)`,
        animation: 'float 4s ease-in-out infinite',
        opacity: 0.4
      }} />
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '12%',
        width: 50,
        height: 50,
        borderRadius: design.radius.full,
        background: `linear-gradient(135deg, ${design.colors.accentPrimary}30 0%, transparent 100%)`,
        animation: 'float 5s ease-in-out infinite reverse',
        opacity: 0.5
      }} />

      <div style={{
        fontSize: 80,
        marginBottom: design.spacing.lg,
        filter: `drop-shadow(0 8px 24px ${design.colors.accentGlow})`,
        animation: 'float 3s ease-in-out infinite'
      }}>
        \ud83c\udfa2
      </div>

      <h1 style={{
        fontSize: 32,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.sm,
        fontFamily: design.font.sans,
        textAlign: 'center',
        letterSpacing: '-0.02em',
        lineHeight: 1.2
      }}>
        The Inclined Plane
      </h1>

      <p style={{
        fontSize: 17,
        color: design.colors.textSecondary,
        marginBottom: design.spacing.xl,
        fontFamily: design.font.sans,
        textAlign: 'center',
        maxWidth: 340,
        lineHeight: 1.6
      }}>
        Roll a ball down ramps of different steepness. How does the angle affect speed?
      </p>

      <div style={{
        background: `linear-gradient(135deg, ${design.colors.accentMuted}80 0%, ${design.colors.bgTertiary} 100%)`,
        border: `1px solid ${design.colors.accentPrimary}30`,
        borderRadius: design.radius.xl,
        padding: `${design.spacing.lg}px ${design.spacing.xl}px`,
        marginBottom: design.spacing.xl,
        maxWidth: 360,
        boxShadow: design.shadow.glow(design.colors.accentPrimary)
      }}>
        <p style={{
          fontSize: 20,
          color: design.colors.accentSecondary,
          fontFamily: design.font.sans,
          textAlign: 'center',
          fontWeight: 600,
          lineHeight: 1.5,
          margin: 0
        }}>
          "Steeper ramp = faster acceleration. But by how much?"
        </p>
      </div>

      {renderButton("Let's Investigate", () => goToPhase(1), 'primary', { size: 'lg' })}

      <p style={{
        fontSize: 13,
        color: design.colors.textTertiary,
        marginTop: design.spacing.lg,
        fontFamily: design.font.sans,
        letterSpacing: '0.02em'
      }}>
        Gravity Components \u2022 Vector Decomposition
      </p>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );

  const renderPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: design.spacing.xl,
      height: '100%',
      background: design.colors.bgPrimary
    }}>
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>\ud83e\udd14</div>
      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.sm,
        fontFamily: design.font.sans
      }}>Make Your Prediction</h2>
      <p style={{
        fontSize: 15,
        color: design.colors.textSecondary,
        marginBottom: design.spacing.lg,
        fontFamily: design.font.sans,
        textAlign: 'center'
      }}>
        If you double the ramp angle from 15\u00b0 to 30\u00b0, acceleration will:
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, width: '100%', maxWidth: 360 }}>
        {[
          { id: 'double', label: 'Exactly double (2\u00d7 more)', icon: '2\ufe0f\u20e3' },
          { id: 'more_than_double', label: 'More than double', icon: '\ud83d\udcc8' },
          { id: 'less_than_double', label: 'Increase, but less than double', icon: '\ud83d\udcca' }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              if (navigationLockRef.current) return;
              navigationLockRef.current = true;
              setPrediction(option.id);
              emit('prediction', { prediction: option.id });
              setTimeout(() => { navigationLockRef.current = false; }, 400);
            }}
            style={{
              padding: `${design.spacing.md}px ${design.spacing.lg}px`,
              borderRadius: design.radius.md,
              border: prediction === option.id ? `2px solid ${design.colors.accentPrimary}` : `1px solid ${design.colors.border}`,
              background: prediction === option.id ? `${design.colors.accentMuted}60` : design.colors.bgSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: design.spacing.md,
              transition: 'all 0.2s ease',
              boxShadow: prediction === option.id ? design.shadow.glow(design.colors.accentPrimary) : 'none'
            }}
          >
            <span style={{ fontSize: 28 }}>{option.icon}</span>
            <span style={{ fontSize: 15, color: design.colors.textPrimary, fontFamily: design.font.sans, fontWeight: 500, textAlign: 'left' }}>
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {prediction && (
        <div style={{ marginTop: design.spacing.xl }}>
          {renderButton('Test It!', () => goToPhase(2))}
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary }}>
      {renderVisualization()}
      <div style={{
        flex: 1,
        padding: design.spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: design.spacing.md,
        background: design.colors.bgSecondary,
        borderTop: `1px solid ${design.colors.border}`
      }}>
        <div style={{ width: '100%', maxWidth: 300 }}>
          <p style={{ fontSize: 13, color: design.colors.textSecondary, marginBottom: design.spacing.sm, fontFamily: design.font.sans }}>
            Ramp angle: <span style={{ color: design.colors.accentPrimary, fontWeight: 600 }}>{angle}\u00b0</span>
          </p>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={angle}
            onChange={(e) => { setAngle(parseInt(e.target.value)); resetExperiment(); emit('interaction', { angle: e.target.value }, 'angle_change'); }}
            disabled={isRolling}
            style={{ width: '100%', accentColor: design.colors.accentPrimary }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: design.colors.textTertiary, fontFamily: design.font.sans }}>
            <span>10\u00b0 (gentle)</span>
            <span>60\u00b0 (steep)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: design.spacing.md }}>
          <span style={{ fontSize: 13, color: design.colors.textSecondary, fontFamily: design.font.sans }}>Vectors:</span>
          <button
            onClick={() => setShowVectors(!showVectors)}
            style={{
              padding: `${design.spacing.xs}px ${design.spacing.md}px`,
              borderRadius: design.radius.md,
              border: 'none',
              background: showVectors ? design.colors.accentPrimary : design.colors.bgTertiary,
              color: showVectors ? '#000' : design.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {showVectors ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: design.spacing.md }}>
          {!isRolling && ballPosition === 0 && renderButton('Roll Ball!', startRolling, 'success')}
          {(isRolling || ballPosition > 0) && renderButton('Reset', resetExperiment, 'secondary')}
        </div>

        <p style={{ fontSize: 13, color: design.colors.textTertiary, fontFamily: design.font.sans }}>
          Experiments: {experimentCount} \u2022 Try different angles!
        </p>

        {experimentCount >= 3 && renderButton('I see the pattern!', () => goToPhase(3))}
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: design.spacing.xl,
      height: '100%',
      background: design.colors.bgPrimary,
      overflowY: 'auto'
    }}>
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>\ud83d\udca1</div>
      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.md,
        fontFamily: design.font.sans
      }}>Gravity Components!</h2>

      <div style={{
        background: design.colors.bgSecondary,
        borderRadius: design.radius.lg,
        padding: design.spacing.lg,
        marginBottom: design.spacing.lg,
        maxWidth: 360,
        width: '100%',
        border: `1px solid ${design.colors.border}`
      }}>
        <p style={{
          fontSize: 22,
          color: design.colors.accentPrimary,
          fontFamily: design.font.mono,
          textAlign: 'center',
          fontWeight: 700
        }}>
          a = g \u00d7 sin(\u03b8)
        </p>
        <p style={{
          fontSize: 14,
          color: design.colors.textSecondary,
          fontFamily: design.font.sans,
          textAlign: 'center',
          marginTop: design.spacing.md,
          lineHeight: 1.6
        }}>
          Acceleration depends on the <em>sine</em> of the angle, not the angle directly!
        </p>
      </div>

      <div style={{
        background: `${design.colors.accentMuted}50`,
        border: `1px solid ${design.colors.accentPrimary}30`,
        borderRadius: design.radius.md,
        padding: design.spacing.md,
        maxWidth: 360,
        width: '100%',
        marginBottom: design.spacing.md
      }}>
        <p style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.8, margin: 0 }}>
          <strong>15\u00b0:</strong> sin(15\u00b0) = 0.26 \u2192 a = 2.5 m/s\u00b2<br/>
          <strong>30\u00b0:</strong> sin(30\u00b0) = 0.50 \u2192 a = 4.9 m/s\u00b2<br/>
          <strong>Ratio:</strong> 4.9/2.5 = <span style={{ color: design.colors.success, fontWeight: 600 }}>1.9\u00d7 (not 2\u00d7!)</span>
        </p>
      </div>

      <p style={{
        fontSize: 14,
        color: prediction === 'less_than_double' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans,
        marginBottom: design.spacing.lg
      }}>
        Your prediction: {prediction === 'less_than_double' ? '\u2705 Correct!' : '\ud83e\udd14 The sine function isn\'t linear!'}
      </p>

      {renderButton('What About Friction?', () => goToPhase(4))}
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: design.spacing.xl,
      height: '100%',
      background: design.colors.bgPrimary
    }}>
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>\ud83e\uddf1</div>
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.sm,
        fontFamily: design.font.sans
      }}>Plot Twist: Rough Surface!</h2>
      <p style={{
        fontSize: 15,
        color: design.colors.textSecondary,
        marginBottom: design.spacing.lg,
        fontFamily: design.font.sans,
        textAlign: 'center'
      }}>
        What if the ramp has friction? How will acceleration change?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, width: '100%', maxWidth: 360 }}>
        {[
          { id: 'no_effect', label: "No effect - gravity is the same" },
          { id: 'slower', label: "Slower acceleration - friction opposes motion" },
          { id: 'faster', label: "Faster - friction helps somehow" }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              if (navigationLockRef.current) return;
              navigationLockRef.current = true;
              setTwistPrediction(option.id);
              emit('prediction', { twistPrediction: option.id });
              setTimeout(() => { navigationLockRef.current = false; }, 400);
            }}
            style={{
              padding: `${design.spacing.md}px ${design.spacing.lg}px`,
              borderRadius: design.radius.md,
              border: twistPrediction === option.id ? `2px solid ${design.colors.accentPrimary}` : `1px solid ${design.colors.border}`,
              background: twistPrediction === option.id ? `${design.colors.accentMuted}60` : design.colors.bgSecondary,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans }}>{option.label}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div style={{ marginTop: design.spacing.xl }}>
          {renderButton('Add Friction!', () => { setHasFriction(true); resetExperiment(); goToPhase(5); })}
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: design.colors.bgPrimary }}>
      {renderVisualization()}
      <div style={{
        flex: 1,
        padding: design.spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: design.spacing.md,
        background: design.colors.bgSecondary,
        borderTop: `1px solid ${design.colors.border}`
      }}>
        <div style={{ display: 'flex', gap: design.spacing.md, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: design.colors.textSecondary, fontFamily: design.font.sans }}>Surface:</span>
          <button
            onClick={() => { setHasFriction(false); resetExperiment(); }}
            disabled={isRolling}
            style={{
              padding: `${design.spacing.sm}px ${design.spacing.md}px`,
              borderRadius: design.radius.md,
              border: 'none',
              background: !hasFriction ? design.colors.success : design.colors.bgTertiary,
              color: !hasFriction ? '#fff' : design.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              cursor: isRolling ? 'not-allowed' : 'pointer'
            }}
          >
            Smooth
          </button>
          <button
            onClick={() => { setHasFriction(true); resetExperiment(); }}
            disabled={isRolling}
            style={{
              padding: `${design.spacing.sm}px ${design.spacing.md}px`,
              borderRadius: design.radius.md,
              border: 'none',
              background: hasFriction ? design.colors.friction : design.colors.bgTertiary,
              color: hasFriction ? '#fff' : design.colors.textSecondary,
              fontWeight: 600,
              fontSize: 13,
              cursor: isRolling ? 'not-allowed' : 'pointer'
            }}
          >
            Rough
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 300 }}>
          <p style={{ fontSize: 13, color: design.colors.textSecondary, marginBottom: design.spacing.sm, fontFamily: design.font.sans }}>
            Angle: {angle}\u00b0
          </p>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={angle}
            onChange={(e) => { setAngle(parseInt(e.target.value)); resetExperiment(); }}
            disabled={isRolling}
            style={{ width: '100%', accentColor: design.colors.accentPrimary }}
          />
        </div>

        <div style={{ display: 'flex', gap: design.spacing.md }}>
          <div style={{
            textAlign: 'center',
            padding: design.spacing.sm,
            background: design.colors.bgTertiary,
            borderRadius: design.radius.md,
            minWidth: 70
          }}>
            <p style={{ fontSize: 10, color: design.colors.textTertiary, fontFamily: design.font.sans, margin: 0 }}>mg\u00b7sin\u03b8</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: design.colors.parallel, fontFamily: design.font.mono, margin: 0 }}>{gravityParallel.toFixed(1)}N</p>
          </div>
          {hasFriction && (
            <div style={{
              textAlign: 'center',
              padding: design.spacing.sm,
              background: design.colors.bgTertiary,
              borderRadius: design.radius.md,
              minWidth: 70
            }}>
              <p style={{ fontSize: 10, color: design.colors.textTertiary, fontFamily: design.font.sans, margin: 0 }}>Friction</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: design.colors.friction, fontFamily: design.font.mono, margin: 0 }}>{frictionForce.toFixed(1)}N</p>
            </div>
          )}
          <div style={{
            textAlign: 'center',
            padding: design.spacing.sm,
            background: design.colors.bgTertiary,
            borderRadius: design.radius.md,
            minWidth: 70
          }}>
            <p style={{ fontSize: 10, color: design.colors.textTertiary, fontFamily: design.font.sans, margin: 0 }}>Net Accel</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: design.colors.success, fontFamily: design.font.mono, margin: 0 }}>{netAcceleration.toFixed(1)}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: design.spacing.md }}>
          {!isRolling && ballPosition === 0 && renderButton('Roll!', startRolling, 'success')}
          {(isRolling || ballPosition > 0) && renderButton('Reset', resetExperiment, 'secondary')}
        </div>

        {experimentCount >= 5 && renderButton('I understand!', () => goToPhase(6))}
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: design.spacing.xl,
      height: '100%',
      background: design.colors.bgPrimary,
      overflowY: 'auto'
    }}>
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>\u2694\ufe0f</div>
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.md,
        fontFamily: design.font.sans
      }}>Forces Compete!</h2>

      <div style={{
        background: design.colors.bgSecondary,
        borderRadius: design.radius.lg,
        padding: design.spacing.lg,
        marginBottom: design.spacing.lg,
        maxWidth: 360,
        width: '100%',
        border: `1px solid ${design.colors.border}`
      }}>
        <p style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans, textAlign: 'center', lineHeight: 1.8, margin: 0 }}>
          <span style={{ color: design.colors.parallel, fontWeight: 600 }}>mg\u00b7sin\u03b8</span> pulls down the ramp<br/>
          <span style={{ color: design.colors.friction, fontWeight: 600 }}>Friction (\u03bc\u00b7N)</span> opposes motion<br/>
          <span style={{ color: design.colors.success, fontWeight: 600 }}>Net = parallel - friction</span>
        </p>
      </div>

      <div style={{
        background: `${design.colors.accentMuted}50`,
        border: `1px solid ${design.colors.accentPrimary}30`,
        borderRadius: design.radius.lg,
        padding: design.spacing.lg,
        marginBottom: design.spacing.lg,
        maxWidth: 360,
        width: '100%'
      }}>
        <p style={{ fontSize: 14, color: design.colors.accentSecondary, fontFamily: design.font.sans, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
          At shallow angles, friction might even stop the ball from rolling! There's a critical angle where the ball just barely moves.
        </p>
      </div>

      <p style={{
        fontSize: 14,
        color: twistPrediction === 'slower' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans,
        marginBottom: design.spacing.lg
      }}>
        Your prediction: {twistPrediction === 'slower' ? '\u2705 Correct!' : '\ud83e\udd14 Friction always opposes motion!'}
      </p>

      {renderButton('See Real Examples', () => goToPhase(7))}
    </div>
  );

  const renderTransfer = () => {
    const app = applications[activeApp];
    const AppSVG = app.SVG;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: design.spacing.lg,
        background: design.colors.bgPrimary
      }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          color: design.colors.textPrimary,
          marginBottom: design.spacing.md,
          fontFamily: design.font.sans,
          textAlign: 'center'
        }}>
          Inclined Planes in Real Life
        </h2>

        {/* Tab buttons */}
        <div style={{
          display: 'flex',
          gap: design.spacing.xs,
          marginBottom: design.spacing.md,
          background: design.colors.bgSecondary,
          padding: design.spacing.xs,
          borderRadius: design.radius.md
        }}>
          {applications.map((a, idx) => {
            const isUnlocked = idx === 0 || completedApps.has(idx - 1);
            return (
              <button
                key={idx}
                onMouseDown={() => {
                  if (!isUnlocked || navigationLockRef.current) return;
                  navigationLockRef.current = true;
                  setActiveApp(idx);
                  setTimeout(() => { navigationLockRef.current = false; }, 400);
                }}
                style={{
                  flex: 1,
                  padding: `${design.spacing.sm}px ${design.spacing.xs}px`,
                  borderRadius: design.radius.sm,
                  border: 'none',
                  background: activeApp === idx ? design.colors.accentPrimary : 'transparent',
                  color: activeApp === idx ? '#000' : isUnlocked ? design.colors.textSecondary : design.colors.textTertiary,
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  fontFamily: design.font.sans,
                  opacity: isUnlocked ? 1 : 0.5,
                  position: 'relative'
                }}
              >
                {completedApps.has(idx) && <span style={{ marginRight: 4 }}>✓</span>}
                {a.title.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: design.colors.bgSecondary,
          borderRadius: design.radius.lg,
          padding: design.spacing.lg,
          border: `1px solid ${design.colors.border}`,
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: design.spacing.md
          }}>
            <AppSVG />
          </div>

          <h3 style={{
            fontSize: 18,
            fontWeight: 700,
            color: design.colors.accentPrimary,
            fontFamily: design.font.sans,
            textAlign: 'center',
            marginBottom: design.spacing.sm
          }}>
            {app.title}
          </h3>

          <p style={{
            fontSize: 14,
            color: design.colors.textSecondary,
            fontFamily: design.font.sans,
            textAlign: 'center',
            lineHeight: 1.6,
            marginBottom: design.spacing.md,
            flex: 1
          }}>
            {app.description}
          </p>

          <div style={{
            background: design.colors.bgTertiary,
            borderRadius: design.radius.md,
            padding: design.spacing.sm,
            textAlign: 'center',
            marginBottom: design.spacing.md
          }}>
            <span style={{
              fontSize: 13,
              color: design.colors.accentSecondary,
              fontFamily: design.font.mono,
              fontWeight: 600
            }}>
              \ud83d\udcca {app.stats}
            </span>
          </div>

          {/* Mark as Read button */}
          {!completedApps.has(activeApp) ? (
            <button
              onMouseDown={() => {
                if (navigationLockRef.current) return;
                navigationLockRef.current = true;
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                emit('interaction', { app: app.title, action: 'marked_read' });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
              style={{
                width: '100%',
                padding: `${design.spacing.sm}px ${design.spacing.md}px`,
                borderRadius: design.radius.md,
                border: `1px solid ${design.colors.success}`,
                background: design.colors.successMuted,
                color: design.colors.success,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: design.font.sans,
                transition: 'all 0.2s ease'
              }}
            >
              ✓ Mark "{app.title}" as Read
            </button>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: design.spacing.sm,
              color: design.colors.success,
              fontWeight: 600,
              fontSize: 14,
              fontFamily: design.font.sans
            }}>
              ✓ Completed
            </div>
          )}
        </div>

        {/* Quiz button */}
        <div style={{ marginTop: design.spacing.md }}>
          {completedApps.size >= applications.length ? (
            renderButton('Take the Quiz!', () => goToPhase(8), 'primary', { fullWidth: true })
          ) : (
            <div style={{
              textAlign: 'center',
              padding: design.spacing.md,
              color: design.colors.textTertiary,
              fontSize: 13,
              fontFamily: design.font.sans
            }}>
              Read all {applications.length} applications to unlock the quiz ({completedApps.size}/{applications.length})
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isAnswered = answeredQuestions.has(currentQuestion);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: design.spacing.lg,
        background: design.colors.bgPrimary
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: design.spacing.md
        }}>
          <span style={{ fontSize: 13, color: design.colors.textSecondary, fontFamily: design.font.sans }}>
            Question {currentQuestion + 1}/{testQuestions.length}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: design.colors.success, fontFamily: design.font.sans }}>
            Score: {correctAnswers}/{answeredQuestions.size}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4,
          background: design.colors.bgTertiary,
          borderRadius: design.radius.full,
          marginBottom: design.spacing.md,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${((currentQuestion + 1) / testQuestions.length) * 100}%`,
            background: `linear-gradient(90deg, ${design.colors.accentPrimary}, ${design.colors.accentSecondary})`,
            borderRadius: design.radius.full,
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: design.colors.textPrimary,
            fontFamily: design.font.sans,
            marginBottom: design.spacing.lg,
            lineHeight: 1.5
          }}>
            {q.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.sm }}>
            {q.options.map((option, idx) => {
              let bg = design.colors.bgSecondary;
              let border = design.colors.border;
              if (isAnswered) {
                if (idx === q.correct) { bg = design.colors.successMuted; border = design.colors.success; }
                else if (idx === selectedAnswer && idx !== q.correct) { bg = design.colors.dangerMuted; border = design.colors.danger; }
              }
              return (
                <button
                  key={idx}
                  onMouseDown={() => {
                    if (isAnswered || navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    handleTestAnswer(idx);
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  style={{
                    padding: `${design.spacing.md}px ${design.spacing.md}px`,
                    borderRadius: design.radius.md,
                    border: `1px solid ${border}`,
                    background: bg,
                    cursor: isAnswered ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans }}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{
              marginTop: design.spacing.md,
              background: `${design.colors.accentMuted}50`,
              border: `1px solid ${design.colors.accentPrimary}30`,
              borderRadius: design.radius.md,
              padding: design.spacing.md
            }}>
              <p style={{ fontSize: 13, color: design.colors.accentSecondary, fontFamily: design.font.sans, lineHeight: 1.5, margin: 0 }}>
                \ud83d\udca1 {q.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.md }}>
          {renderButton('\u2190 Back', () => {
            setCurrentQuestion(prev => Math.max(0, prev - 1));
            setSelectedAnswer(null);
            setShowExplanation(answeredQuestions.has(currentQuestion - 1));
          }, 'secondary', { disabled: currentQuestion === 0 })}

          {currentQuestion < testQuestions.length - 1 ? (
            renderButton('Next \u2192', () => {
              setCurrentQuestion(prev => prev + 1);
              setSelectedAnswer(null);
              setShowExplanation(answeredQuestions.has(currentQuestion + 1));
            }, 'secondary')
          ) : answeredQuestions.size === testQuestions.length ? (
            renderButton('Complete!', () => goToPhase(9))
          ) : (
            <span style={{ fontSize: 13, color: design.colors.textTertiary, fontFamily: design.font.sans, alignSelf: 'center' }}>
              Answer all questions
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((correctAnswers / testQuestions.length) * 100);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: design.spacing.xl,
        background: `radial-gradient(ellipse at 50% 40%, ${design.colors.accentMuted}40 0%, ${design.colors.bgDeep} 70%)`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: 80,
          marginBottom: design.spacing.md,
          filter: `drop-shadow(0 8px 24px ${design.colors.accentGlow})`
        }}>
          \ud83c\udfc6
        </div>

        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: design.colors.textPrimary,
          marginBottom: design.spacing.sm,
          fontFamily: design.font.sans,
          textAlign: 'center'
        }}>
          Inclined Plane Master!
        </h2>

        <div style={{
          fontSize: 64,
          fontWeight: 700,
          color: design.colors.success,
          marginBottom: design.spacing.sm,
          fontFamily: design.font.sans
        }}>
          {percentage}%
        </div>

        <p style={{
          fontSize: 16,
          color: design.colors.textSecondary,
          marginBottom: design.spacing.xl,
          fontFamily: design.font.sans
        }}>
          {correctAnswers}/{testQuestions.length} correct answers
        </p>

        <div style={{
          background: design.colors.bgSecondary,
          borderRadius: design.radius.lg,
          padding: design.spacing.lg,
          marginBottom: design.spacing.xl,
          maxWidth: 340,
          width: '100%',
          border: `1px solid ${design.colors.border}`
        }}>
          <h3 style={{
            fontSize: 15,
            fontWeight: 700,
            color: design.colors.accentPrimary,
            fontFamily: design.font.sans,
            marginBottom: design.spacing.md,
            textAlign: 'center'
          }}>
            Key Takeaways:
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'a = g \u00d7 sin(\u03b8)',
              'Steeper angle \u2192 faster acceleration',
              'Normal force N = mg \u00d7 cos(\u03b8)',
              'Friction opposes motion up the ramp'
            ].map((item, idx) => (
              <li key={idx} style={{
                fontSize: 13,
                color: design.colors.textPrimary,
                fontFamily: design.font.sans,
                marginBottom: design.spacing.sm,
                display: 'flex',
                alignItems: 'center',
                gap: design.spacing.sm
              }}>
                <span style={{ color: design.colors.success }}>\u2713</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {renderButton('Play Again', () => {
          setPhase('hook');
          setExperimentCount(0);
          setCurrentQuestion(0);
          setCorrectAnswers(0);
          setAnsweredQuestions(new Set());
          setPrediction(null);
          setTwistPrediction(null);
          setAngle(30);
          setHasFriction(false);
          setActiveApp(0);
          setCompletedApps(new Set());
          resetExperiment();
        })}

        {/* Confetti */}
        <style>{`
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
          }
        `}</style>
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`,
              pointerEvents: 'none',
              fontSize: '20px'
            }}
          >
            {['\ud83c\udfa2', '\u26f7\ufe0f', '\u2b50', '\u2728', '\ud83c\udfc6'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  const phaseRenderers: Record<number, () => JSX.Element> = {
    0: renderHook,
    1: renderPredict,
    2: renderPlay,
    3: renderReview,
    4: renderTwistPredict,
    5: renderTwistPlay,
    6: renderTwistReview,
    7: renderTransfer,
    8: renderTest,
    9: renderMastery
  };

  return (
    <div style={{
      width,
      height,
      borderRadius: design.radius.lg,
      overflow: 'hidden',
      position: 'relative',
      background: design.colors.bgPrimary,
      fontFamily: design.font.sans
    }}>
      {phaseRenderers[phase]()}

      {/* Progress dots */}
      <div style={{
        position: 'absolute',
        top: design.spacing.md,
        left: design.spacing.md,
        display: 'flex',
        gap: design.spacing.xs
      }}>
        {PHASES.map((p) => (
          <div
            key={p}
            style={{
              width: 8,
              height: 8,
              borderRadius: design.radius.full,
              background: phase === p
                ? design.colors.accentPrimary
                : p < phase
                  ? design.colors.accentSecondary
                  : design.colors.bgElevated,
              boxShadow: phase === p ? design.shadow.glow(design.colors.accentPrimary) : 'none',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default InclinedPlaneRenderer;
