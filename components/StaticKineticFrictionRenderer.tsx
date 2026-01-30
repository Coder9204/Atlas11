'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// STATIC VS KINETIC FRICTION RENDERER - Premium Design System
// Complete 10-phase learning experience
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface StaticKineticFrictionRendererProps {
  width?: number;
  height?: number;
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

type Surface = 'wood' | 'rubber' | 'ice';

// ============================================================================
// PREMIUM DESIGN TOKENS
// ============================================================================
const design = {
  colors: {
    bgDeep: '#080608',
    bgPrimary: '#0c0a0e',
    bgSecondary: '#141018',
    bgTertiary: '#1c1622',
    bgElevated: '#24202c',
    textPrimary: '#f8f6fa',
    textSecondary: '#a8a0b4',
    textTertiary: '#685c78',
    accentPrimary: '#f59e0b',
    accentSecondary: '#fbbf24',
    accentMuted: '#78350f',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    secondary: '#06b6d4',
    secondaryMuted: '#164e63',
    block: '#6366f1',
    blockHighlight: '#818cf8',
    spring: '#22c55e',
    staticFriction: '#ef4444',
    kineticFriction: '#f59e0b',
    success: '#10b981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    danger: '#ef4444',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(168, 160, 180, 0.12)',
    borderHover: 'rgba(168, 160, 180, 0.25)',
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
const CarTiresSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3a3a3a" />
        <stop offset="100%" stopColor="#2a2a2a" />
      </linearGradient>
      <linearGradient id="tireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2d2d2d" />
        <stop offset="100%" stopColor="#1a1a1a" />
      </linearGradient>
      <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d4d4d4" />
        <stop offset="100%" stopColor="#808080" />
      </linearGradient>
      <filter id="tireShadow">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.5" />
      </filter>
    </defs>

    {/* Road */}
    <rect x="0" y="100" width="200" height="40" fill="url(#roadGrad)" />
    <rect x="30" y="115" width="30" height="4" rx="2" fill="#f59e0b" opacity="0.8" />
    <rect x="85" y="115" width="30" height="4" rx="2" fill="#f59e0b" opacity="0.8" />
    <rect x="140" y="115" width="30" height="4" rx="2" fill="#f59e0b" opacity="0.8" />

    {/* Tire */}
    <g filter="url(#tireShadow)">
      <circle cx="100" cy="70" r="40" fill="url(#tireGrad)" />
      {/* Tread pattern */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
        <rect
          key={i}
          x="98"
          y="30"
          width="4"
          height="10"
          rx="1"
          fill="#1a1a1a"
          transform={`rotate(${angle} 100 70)`}
        />
      ))}
      {/* Rim */}
      <circle cx="100" cy="70" r="20" fill="url(#rimGrad)" />
      <circle cx="100" cy="70" r="5" fill="#4a4a4a" />
      {/* Rim spokes */}
      {[0, 72, 144, 216, 288].map((angle, i) => (
        <rect
          key={i}
          x="98"
          y="52"
          width="4"
          height="16"
          rx="1"
          fill="#a0a0a0"
          transform={`rotate(${angle} 100 70)`}
        />
      ))}
    </g>

    {/* Friction arrows */}
    <g>
      <path d="M60 98 L30 98 L38 93 M30 98 L38 103" stroke={design.colors.staticFriction} strokeWidth="2" fill="none" />
      <text x="25" y="88" fill={design.colors.staticFriction} fontSize="9" fontWeight="600">Grip</text>
    </g>
    <g>
      <path d="M140 98 L170 98 L162 93 M170 98 L162 103" stroke={design.colors.success} strokeWidth="2" fill="none" />
      <text x="165" y="88" fill={design.colors.success} fontSize="9" fontWeight="600">Motion</text>
    </g>
  </svg>
);

const BrakeSystemSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="discGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#4b5563" />
      </linearGradient>
      <linearGradient id="caliperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
      <filter id="brakeGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Brake disc */}
    <circle cx="100" cy="70" r="50" fill="url(#discGrad)" stroke="#9ca3af" strokeWidth="2" />
    <circle cx="100" cy="70" r="20" fill="#374151" />
    <circle cx="100" cy="70" r="8" fill="#1f2937" />

    {/* Ventilation holes */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
      <circle
        key={i}
        cx={100 + 35 * Math.cos(angle * Math.PI / 180)}
        cy={70 + 35 * Math.sin(angle * Math.PI / 180)}
        r="4"
        fill="#374151"
      />
    ))}

    {/* Disc slots */}
    {[15, 75, 135, 195, 255, 315].map((angle, i) => (
      <line
        key={i}
        x1={100 + 22 * Math.cos(angle * Math.PI / 180)}
        y1={70 + 22 * Math.sin(angle * Math.PI / 180)}
        x2={100 + 45 * Math.cos(angle * Math.PI / 180)}
        y2={70 + 45 * Math.sin(angle * Math.PI / 180)}
        stroke="#4b5563"
        strokeWidth="2"
      />
    ))}

    {/* Brake caliper */}
    <g filter="url(#brakeGlow)">
      <rect x="75" y="15" width="50" height="25" rx="5" fill="url(#caliperGrad)" />
      <rect x="80" y="20" width="40" height="5" rx="2" fill="#fca5a5" opacity="0.3" />
      <text x="100" y="33" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">BRAKE</text>
    </g>

    {/* Brake pads */}
    <rect x="82" y="40" width="36" height="8" rx="2" fill="#78716c" />
    <rect x="82" y="92" width="36" height="8" rx="2" fill="#78716c" />

    {/* Friction heat lines */}
    <g opacity="0.6">
      <path d="M140 55 Q145 60 140 65 Q145 70 140 75" stroke="#f59e0b" strokeWidth="2" fill="none" />
      <path d="M150 50 Q155 57 150 64 Q155 71 150 78" stroke="#f59e0b" strokeWidth="2" fill="none" />
    </g>

    {/* Labels */}
    <text x="100" y="130" textAnchor="middle" fill={design.colors.textSecondary} fontSize="10">Disc brake with caliper</text>
  </svg>
);

const WalkingSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4a4a4a" />
        <stop offset="100%" stopColor="#333333" />
      </linearGradient>
    </defs>

    {/* Floor */}
    <rect x="0" y="110" width="200" height="30" fill="url(#floorGrad)" />
    <line x1="0" y1="110" x2="200" y2="110" stroke="#666" strokeWidth="2" />

    {/* Person walking */}
    <g transform="translate(100, 50)">
      {/* Head */}
      <circle cx="0" cy="-35" r="12" fill="#fcd9b6" stroke="#e5c4a1" strokeWidth="2" />
      {/* Body */}
      <line x1="0" y1="-23" x2="0" y2="10" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" />
      {/* Arms */}
      <line x1="0" y1="-15" x2="-15" y2="5" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
      <line x1="0" y1="-15" x2="15" y2="-5" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
      {/* Legs */}
      <line x1="0" y1="10" x2="-12" y2="50" stroke="#1e40af" strokeWidth="5" strokeLinecap="round" />
      <line x1="0" y1="10" x2="15" y2="45" stroke="#1e40af" strokeWidth="5" strokeLinecap="round" />
      {/* Feet */}
      <ellipse cx="-12" cy="55" rx="10" ry="5" fill="#333" />
      <ellipse cx="15" cy="50" rx="10" ry="5" fill="#333" />
    </g>

    {/* Friction arrow - foot pushing back */}
    <g>
      <path d="M65 108 L45 108 L50 103 M45 108 L50 113" stroke={design.colors.staticFriction} strokeWidth="2" fill="none" />
      <text x="35" y="98" fill={design.colors.staticFriction} fontSize="8" fontWeight="600">Push</text>
    </g>

    {/* Friction arrow - ground pushing forward */}
    <g>
      <path d="M95 108 L115 108 L110 103 M115 108 L110 113" stroke={design.colors.success} strokeWidth="2" fill="none" />
      <text x="115" y="98" fill={design.colors.success} fontSize="8" fontWeight="600">Friction</text>
    </g>

    <text x="100" y="135" textAnchor="middle" fill={design.colors.textSecondary} fontSize="10">Walking requires friction</text>
  </svg>
);

const ClimbingSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="rockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#78716c" />
        <stop offset="100%" stopColor="#57534e" />
      </linearGradient>
      <linearGradient id="holdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="shoeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>

    {/* Rock wall */}
    <rect x="30" y="0" width="140" height="140" fill="url(#rockGrad)" rx="8" />

    {/* Rock texture */}
    <circle cx="60" cy="30" r="15" fill="#6b7280" opacity="0.3" />
    <circle cx="120" cy="60" r="20" fill="#6b7280" opacity="0.3" />
    <circle cx="80" cy="100" r="12" fill="#6b7280" opacity="0.3" />
    <circle cx="140" cy="110" r="18" fill="#6b7280" opacity="0.3" />

    {/* Climbing holds */}
    <ellipse cx="70" cy="35" rx="12" ry="8" fill="url(#holdGrad)" />
    <ellipse cx="130" cy="55" rx="10" ry="7" fill="url(#holdGrad)" />
    <ellipse cx="85" cy="80" rx="14" ry="9" fill="url(#holdGrad)" />
    <ellipse cx="120" cy="110" rx="11" ry="7" fill="url(#holdGrad)" />

    {/* Climbing shoe on hold */}
    <g transform="translate(75, 72)">
      <path d="M0 0 Q-5 5 0 12 L25 15 Q35 12 35 8 L30 0 Z" fill="url(#shoeGrad2)" />
      <path d="M0 10 L30 13" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
    </g>

    {/* Chalked hand */}
    <g transform="translate(125, 45)">
      <ellipse cx="0" cy="0" rx="8" ry="10" fill="#fef3c7" opacity="0.8" />
      <ellipse cx="-6" cy="-8" rx="3" ry="5" fill="#fef3c7" opacity="0.8" />
      <ellipse cx="-2" cy="-10" rx="2" ry="5" fill="#fef3c7" opacity="0.8" />
      <ellipse cx="2" cy="-10" rx="2" ry="5" fill="#fef3c7" opacity="0.8" />
      <ellipse cx="6" cy="-8" rx="2" ry="4" fill="#fef3c7" opacity="0.8" />
    </g>

    {/* Friction indicator */}
    <g transform="translate(10, 60)">
      <text x="0" y="0" fill={design.colors.success} fontSize="9" fontWeight="600" transform="rotate(-90)">HIGH FRICTION</text>
    </g>
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const StaticKineticFrictionRenderer: React.FC<StaticKineticFrictionRendererProps> = ({
  width = 400,
  height = 500,
  onComplete,
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [surface, setSurface] = useState<Surface>('wood');
  const [isPulling, setIsPulling] = useState(false);
  const [hasSlipped, setHasSlipped] = useState(false);
  const [currentForce, setCurrentForce] = useState(0);
  const [blockPosition, setBlockPosition] = useState(0);
  const [forceHistory, setForceHistory] = useState<number[]>([]);
  const [peakForce, setPeakForce] = useState(0);
  const [steadyForce, setSteadyForce] = useState(0);
  const [experimentCount, setExperimentCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  const animationRef = useRef<number>();

  const surfaceProperties: Record<Surface, { staticCoef: number; kineticCoef: number; color: string; name: string }> = {
    wood: { staticCoef: 0.5, kineticCoef: 0.3, color: '#8b7355', name: 'Wood' },
    rubber: { staticCoef: 0.9, kineticCoef: 0.6, color: '#2d2d2d', name: 'Rubber' },
    ice: { staticCoef: 0.1, kineticCoef: 0.03, color: '#a8d5e5', name: 'Ice' }
  };

  const weight = 10;
  const staticFrictionMax = weight * surfaceProperties[surface].staticCoef;
  const kineticFriction = weight * surfaceProperties[surface].kineticCoef;

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

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

  const testQuestions = [
    { question: "Why does the force needed to START moving a block exceed the force to KEEP it moving?", options: [
      { text: "The block gets lighter once moving", correct: false },
      { text: "Static friction > kinetic friction due to surface interlocking", correct: true },
      { text: "Air resistance helps once moving", correct: false },
      { text: "Gravity changes direction", correct: false }
    ], explanation: "At rest, surfaces interlock more completely. Once sliding, the microscopic bonds keep breaking before they fully form, resulting in lower kinetic friction." },
    { question: "Static friction is:", options: [
      { text: "Always equal to applied force up to a maximum", correct: true },
      { text: "Always at its maximum value", correct: false },
      { text: "Zero until the object moves", correct: false },
      { text: "Greater than kinetic friction always", correct: false }
    ], explanation: "Static friction matches the applied force exactly (preventing motion) until the maximum static friction is reached - then the object slips." },
    { question: "When a heavy box finally starts sliding, you notice:", options: [
      { text: "You need to push harder to keep it moving", correct: false },
      { text: "You can push lighter to keep it moving", correct: true },
      { text: "The force stays exactly the same", correct: false },
      { text: "The box accelerates infinitely", correct: false }
    ], explanation: "Once the box breaks free (overcomes static friction), kinetic friction takes over, which is lower. You need less force to maintain motion." },
    { question: "Why does rubber have higher friction coefficients than ice?", options: [
      { text: "Rubber is heavier", correct: false },
      { text: "Rubber deforms and interlocks with surfaces more", correct: true },
      { text: "Ice is colder", correct: false },
      { text: "Rubber is stickier due to glue", correct: false }
    ], explanation: "Rubber is soft and deforms around surface irregularities, creating more contact area and mechanical interlocking. Ice is hard and smooth with minimal interlocking." },
    { question: "If you double the weight on a block, friction force:", options: [
      { text: "Stays the same", correct: false },
      { text: "Doubles (proportional to normal force)", correct: true },
      { text: "Halves", correct: false },
      { text: "Becomes zero", correct: false }
    ], explanation: "Friction force = \u03bc \u00d7 Normal force. Doubling the weight doubles the normal force, which doubles the friction force (both static and kinetic)." },
    { question: "Anti-lock brakes (ABS) work by:", options: [
      { text: "Increasing kinetic friction", correct: false },
      { text: "Keeping tires at static friction (not sliding)", correct: true },
      { text: "Heating up the brakes", correct: false },
      { text: "Making tires lighter", correct: false }
    ], explanation: "ABS prevents wheels from locking (sliding). Static friction between tire and road is higher than kinetic, giving better stopping power." },
    { question: "The coefficient of friction is:", options: [
      { text: "Always greater than 1", correct: false },
      { text: "A ratio of friction force to normal force", correct: true },
      { text: "Measured in Newtons", correct: false },
      { text: "The same for all materials", correct: false }
    ], explanation: "The friction coefficient (\u03bc) is the ratio of friction force to normal force: \u03bc = f/N. It's dimensionless and depends on the materials in contact." },
    { question: "Oil reduces friction by:", options: [
      { text: "Making surfaces heavier", correct: false },
      { text: "Preventing direct surface contact", correct: true },
      { text: "Cooling the surfaces", correct: false },
      { text: "Increasing the normal force", correct: false }
    ], explanation: "Oil creates a thin layer between surfaces, preventing the microscopic interlocking that causes friction. This is called lubrication." },
    { question: "On a force-time graph during a pull test, the peak represents:", options: [
      { text: "Kinetic friction", correct: false },
      { text: "Maximum static friction (just before slip)", correct: true },
      { text: "The weight of the object", correct: false },
      { text: "Air resistance", correct: false }
    ], explanation: "The peak in the force-time graph is the moment static friction reaches its maximum, just before the object starts to slide." },
    { question: "Walking relies on friction. Without it, you would:", options: [
      { text: "Walk faster", correct: false },
      { text: "Slip backward when pushing off", correct: true },
      { text: "Float upward", correct: false },
      { text: "Walk normally", correct: false }
    ], explanation: "When you push backward with your foot, friction pushes you forward. Without friction (like on ice), your foot slides back and you can't walk." }
  ];

  const applications = [
    { title: "Car Tires & Grip", description: "Tire tread patterns maximize friction with road surfaces. Racing slicks use smooth rubber for max contact on dry tracks, while treaded tires channel water for wet grip.", stats: "\u03bc rubber-asphalt \u2248 0.7-0.9", SVG: CarTiresSVG },
    { title: "Brake Systems", description: "Brake pads convert kinetic energy to heat through friction. ABS keeps tires in static friction regime - wheels roll rather than slide for maximum stopping power.", stats: "Brake pad \u03bc \u2248 0.35-0.45", SVG: BrakeSystemSVG },
    { title: "Walking & Running", description: "Every step relies on static friction between your foot and the ground. Your foot pushes back, friction pushes you forward. On ice, low friction makes walking dangerous.", stats: "Shoe-floor \u03bc \u2248 0.4-0.8", SVG: WalkingSVG },
    { title: "Rock Climbing", description: "Climbers use chalk to increase hand-rock friction. Climbing shoes have sticky rubber compounds with friction coefficients exceeding 1.0 on textured rock.", stats: "Climbing rubber \u03bc > 1.0", SVG: ClimbingSVG }
  ];

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // Emit events
  const emit = useCallback((type: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      type,
      gameType: 'static_kinetic_friction',
      gameTitle: 'Static vs Kinetic Friction',
      details: { phase, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase]);

  // Return to dashboard handler
  const handleReturnToDashboard = useCallback(() => {
    emit('mastery_achieved', { action: 'return_to_dashboard' });
    window.dispatchEvent(new CustomEvent('returnToDashboard'));
  }, [emit]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [emit, phase, playSound, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    } else if (onComplete) {
      onComplete();
    }
  }, [phase, goToPhase, onComplete]);

  const startPulling = useCallback(() => {
    if (isPulling) return;
    setIsPulling(true);
    setHasSlipped(false);
    setCurrentForce(0);
    setBlockPosition(0);
    setForceHistory([]);
    setPeakForce(0);
    setSteadyForce(0);

    emit('interaction', { surface, staticMax: staticFrictionMax, kinetic: kineticFriction, action: 'pull_start' });

    let force = 0;
    let slipped = false;
    let pos = 0;
    const history: number[] = [];

    const animate = () => {
      if (!slipped) {
        force += 0.15;
        if (force >= staticFrictionMax) {
          slipped = true;
          setHasSlipped(true);
          setPeakForce(force);
          force = kineticFriction + 0.5;
          setSteadyForce(kineticFriction);
        }
      } else {
        pos += 0.8;
        force = kineticFriction + Math.sin(pos * 0.1) * 0.3 + 0.3;
      }

      history.push(force);
      setForceHistory([...history]);
      setCurrentForce(force);
      setBlockPosition(pos);

      if (pos < 100) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPulling(false);
        setExperimentCount(prev => prev + 1);
        emit('result', { peakForce: staticFrictionMax, steadyForce: kineticFriction, surface });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isPulling, surface, staticFrictionMax, kineticFriction, emit]);

  const resetExperiment = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsPulling(false);
    setHasSlipped(false);
    setCurrentForce(0);
    setBlockPosition(0);
    setForceHistory([]);
    setPeakForce(0);
    setSteadyForce(0);
    emit('interaction', { action: 'reset' });
  }, [emit]);

  const handleTestAnswer = useCallback((answerIndex: number) => {
    if (answeredQuestions.has(currentQuestion)) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    const isCorrect = testQuestions[currentQuestion].options[answerIndex]?.correct;
    if (isCorrect) setCorrectAnswers(prev => prev + 1);
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));
    emit('interaction', { question: currentQuestion, answer: answerIndex, correct: isCorrect, action: 'answer_submit' });
  }, [currentQuestion, answeredQuestions, emit, testQuestions]);

  // ============================================================================
  // VISUALIZATION
  // ============================================================================
  const renderVisualization = () => {
    const surfaceY = height * 0.32;
    const blockWidth = 60;
    const blockHeight = 45;
    const blockX = 80 + blockPosition * 1.5;
    const graphY = height * 0.42;
    const graphHeight = 90;
    const graphWidth = width - 60;

    return (
      <svg width={width} height={height * 0.58} viewBox={`0 0 ${width} ${height * 0.58}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="blockGradFric" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={design.colors.blockHighlight} />
            <stop offset="100%" stopColor={design.colors.block} />
          </linearGradient>
          <linearGradient id="surfaceGradFric" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={surfaceProperties[surface].color} />
            <stop offset="100%" stopColor={`${surfaceProperties[surface].color}cc`} />
          </linearGradient>
          <filter id="blockShadowFric">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.5" />
          </filter>
          <filter id="graphGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={width} height={height * 0.58} fill={design.colors.bgDeep} />

        {/* Surface */}
        <rect x={20} y={surfaceY} width={width - 40} height={18} rx={3} fill="url(#surfaceGradFric)" />
        <text x={width - 30} y={surfaceY + 32} textAnchor="end" fill={design.colors.textTertiary} fontSize="11" fontFamily={design.font.sans} fontWeight="500">
          {surfaceProperties[surface].name}
        </text>

        {/* Block */}
        <g filter="url(#blockShadowFric)">
          <rect x={blockX} y={surfaceY - blockHeight} width={blockWidth} height={blockHeight} rx={6} fill="url(#blockGradFric)" />
          <text x={blockX + blockWidth/2} y={surfaceY - blockHeight/2 + 5} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily={design.font.sans}>
            1 kg
          </text>
        </g>

        {/* Spring/Pull mechanism */}
        <g transform={`translate(${blockX + blockWidth}, ${surfaceY - blockHeight/2})`}>
          <path
            d={`M0 0 ${Array.from({length: 8}, (_, i) => `L${10 + i*6} ${i % 2 === 0 ? -8 : 8}`).join(' ')} L${60 + currentForce * 2} 0`}
            stroke={design.colors.spring} strokeWidth={3} fill="none"
          />
          <circle cx={65 + currentForce * 2} cy={0} r={14} fill={design.colors.accentPrimary} stroke="#fff" strokeWidth={2} />
          <text x={65 + currentForce * 2} y={-22} textAnchor="middle" fill={design.colors.accentPrimary} fontSize="13" fontWeight="bold" fontFamily={design.font.sans}>
            {currentForce.toFixed(1)}N
          </text>
        </g>

        {/* Friction arrows */}
        {currentForce > 0 && (
          <g transform={`translate(${blockX}, ${surfaceY - 5})`}>
            <path
              d={`M0 0 L${-Math.min(currentForce * 3, 45)} 0 L${-Math.min(currentForce * 3, 45) + 8} -5 M${-Math.min(currentForce * 3, 45)} 0 L${-Math.min(currentForce * 3, 45) + 8} 5`}
              stroke={hasSlipped ? design.colors.kineticFriction : design.colors.staticFriction} strokeWidth={3} fill="none"
            />
            <text x={-28} y={-12} textAnchor="middle" fill={hasSlipped ? design.colors.kineticFriction : design.colors.staticFriction} fontSize="10" fontWeight="600" fontFamily={design.font.sans}>
              {hasSlipped ? 'Kinetic' : 'Static'}
            </text>
          </g>
        )}

        {/* Force-Time Graph */}
        <g transform={`translate(30, ${graphY})`}>
          <rect x={0} y={0} width={graphWidth} height={graphHeight} rx={8} fill={design.colors.bgSecondary} stroke={design.colors.border} strokeWidth={1} />

          {/* Graph labels */}
          <text x={8} y={16} fill={design.colors.textSecondary} fontSize="10" fontFamily={design.font.sans} fontWeight="500">Force (N)</text>
          <text x={graphWidth - 8} y={graphHeight - 8} textAnchor="end" fill={design.colors.textSecondary} fontSize="10" fontFamily={design.font.sans} fontWeight="500">Time</text>

          {/* Static friction line */}
          <line x1={8} y1={graphHeight - (staticFrictionMax / 10) * (graphHeight - 24) - 12} x2={graphWidth - 8} y2={graphHeight - (staticFrictionMax / 10) * (graphHeight - 24) - 12}
                stroke={design.colors.staticFriction} strokeWidth={1} strokeDasharray="5,5" opacity={0.6} />
          <text x={graphWidth - 10} y={graphHeight - (staticFrictionMax / 10) * (graphHeight - 24) - 16} textAnchor="end" fill={design.colors.staticFriction} fontSize="9" fontFamily={design.font.sans} fontWeight="500">
            \u03bcs max
          </text>

          {/* Kinetic friction line */}
          <line x1={8} y1={graphHeight - (kineticFriction / 10) * (graphHeight - 24) - 12} x2={graphWidth - 8} y2={graphHeight - (kineticFriction / 10) * (graphHeight - 24) - 12}
                stroke={design.colors.kineticFriction} strokeWidth={1} strokeDasharray="5,5" opacity={0.6} />
          <text x={graphWidth - 10} y={graphHeight - (kineticFriction / 10) * (graphHeight - 24) - 16} textAnchor="end" fill={design.colors.kineticFriction} fontSize="9" fontFamily={design.font.sans} fontWeight="500">
            \u03bck
          </text>

          {/* Force trace */}
          {forceHistory.length > 1 && (
            <g filter="url(#graphGlow)">
              <polyline
                points={forceHistory.map((f, i) => `${8 + (i / forceHistory.length) * (graphWidth - 16)},${graphHeight - (f / 10) * (graphHeight - 24) - 12}`).join(' ')}
                fill="none"
                stroke={design.colors.success}
                strokeWidth={2.5}
              />
            </g>
          )}

          {/* Peak marker */}
          {peakForce > 0 && forceHistory.length > 0 && (
            <g>
              <circle
                cx={8 + (forceHistory.indexOf(Math.max(...forceHistory)) / forceHistory.length) * (graphWidth - 16)}
                cy={graphHeight - (peakForce / 10) * (graphHeight - 24) - 12}
                r={6}
                fill={design.colors.staticFriction}
              />
              <text
                x={8 + (forceHistory.indexOf(Math.max(...forceHistory)) / forceHistory.length) * (graphWidth - 16)}
                y={graphHeight - (peakForce / 10) * (graphHeight - 24) - 22}
                textAnchor="middle"
                fill={design.colors.staticFriction}
                fontSize="10"
                fontWeight="bold"
                fontFamily={design.font.sans}
              >
                Peak!
              </text>
            </g>
          )}
        </g>
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
        top: '15%',
        left: '10%',
        width: 80,
        height: 80,
        borderRadius: design.radius.lg,
        background: `linear-gradient(135deg, ${design.colors.block}40 0%, transparent 100%)`,
        animation: 'float 4s ease-in-out infinite',
        opacity: 0.5
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: 60,
        height: 60,
        borderRadius: design.radius.full,
        background: `linear-gradient(135deg, ${design.colors.accentPrimary}30 0%, transparent 100%)`,
        animation: 'float 5s ease-in-out infinite reverse',
        opacity: 0.4
      }} />

      <div style={{
        fontSize: 80,
        marginBottom: design.spacing.lg,
        filter: `drop-shadow(0 8px 24px ${design.colors.accentGlow})`,
        animation: 'float 3s ease-in-out infinite'
      }}>
        <span style={{ display: 'inline-block', animation: 'slideBox 2s ease-in-out infinite' }}>&#128230;</span>
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
        Static vs Kinetic Friction
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
        Have you ever noticed it takes more effort to START pushing a heavy box than to KEEP it moving? Let's discover why!
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
          fontSize: 18,
          color: design.colors.accentSecondary,
          fontFamily: design.font.sans,
          textAlign: 'center',
          fontWeight: 600,
          lineHeight: 1.5,
          margin: 0
        }}>
          "Why is it harder to START sliding than to KEEP sliding?"
        </p>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{
          zIndex: 10,
          padding: '18px 36px',
          fontSize: '17px',
          borderRadius: design.radius.md,
          fontWeight: 600,
          fontFamily: design.font.sans,
          border: 'none',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
          color: '#000',
          boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
        }}
      >
        Let's Find Out
      </button>

      <p style={{
        fontSize: 13,
        color: design.colors.textTertiary,
        marginTop: design.spacing.lg,
        fontFamily: design.font.sans,
        letterSpacing: '0.02em'
      }}>
        Static vs Kinetic Friction - \u03bcs vs \u03bck
      </p>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes slideBox {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(8px); }
          75% { transform: translateX(-8px); }
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>&#129300;</div>
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
        Why is it harder to START moving a heavy object than to KEEP it moving?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, width: '100%', maxWidth: 360 }}>
        {[
          { id: 'inertia', label: 'Objects at rest want to stay at rest (inertia)', icon: '&#128260;' },
          { id: 'friction_type', label: 'Different types of friction act before and after sliding', icon: '&#128300;' },
          { id: 'weight', label: 'The object feels heavier when not moving', icon: '&#9878;&#65039;' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setPrediction(option.id);
              emit('prediction', { prediction: option.id });
            }}
            style={{
              zIndex: 10,
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
            <span style={{ fontSize: 28 }} dangerouslySetInnerHTML={{ __html: option.icon }} />
            <span style={{ fontSize: 15, color: design.colors.textPrimary, fontFamily: design.font.sans, fontWeight: 500, textAlign: 'left' }}>
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {prediction && (
        <div style={{ marginTop: design.spacing.xl }}>
          <button
            onClick={() => goToPhase('play')}
            style={{
              zIndex: 10,
              padding: '14px 28px',
              fontSize: '15px',
              borderRadius: design.radius.md,
              fontWeight: 600,
              fontFamily: design.font.sans,
              border: 'none',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
              color: '#000',
              boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
            }}
          >
            Test It!
          </button>
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
        <div style={{ display: 'flex', gap: design.spacing.lg }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: design.colors.staticFriction, fontFamily: design.font.sans, marginBottom: 4, fontWeight: 600 }}>Static Max</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: design.colors.staticFriction, fontFamily: design.font.mono }}>{staticFrictionMax.toFixed(1)}N</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: design.colors.kineticFriction, fontFamily: design.font.sans, marginBottom: 4, fontWeight: 600 }}>Kinetic</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: design.colors.kineticFriction, fontFamily: design.font.mono }}>{kineticFriction.toFixed(1)}N</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: design.spacing.md }}>
          {!isPulling && blockPosition === 0 && (
            <button
              onClick={startPulling}
              style={{
                zIndex: 10,
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: design.radius.md,
                fontWeight: 600,
                fontFamily: design.font.sans,
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
                color: '#fff',
                boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.success)}`
              }}
            >
              Start Pulling!
            </button>
          )}
          {(isPulling || blockPosition > 0) && (
            <button
              onClick={resetExperiment}
              style={{
                zIndex: 10,
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: design.radius.md,
                fontWeight: 600,
                fontFamily: design.font.sans,
                border: `1px solid ${design.colors.border}`,
                cursor: 'pointer',
                background: design.colors.bgTertiary,
                color: design.colors.textPrimary
              }}
            >
              Reset
            </button>
          )}
        </div>

        <p style={{ fontSize: 13, color: design.colors.textTertiary, fontFamily: design.font.sans, textAlign: 'center' }}>
          Watch the force graph! Notice the peak then drop.
        </p>

        {experimentCount >= 2 && (
          <button
            onClick={() => goToPhase('review')}
            style={{
              zIndex: 10,
              padding: '14px 28px',
              fontSize: '15px',
              borderRadius: design.radius.md,
              fontWeight: 600,
              fontFamily: design.font.sans,
              border: 'none',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
              color: '#000',
              boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
            }}
          >
            I see the pattern!
          </button>
        )}
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>&#128161;</div>
      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.md,
        fontFamily: design.font.sans
      }}>The Friction Equations</h2>

      <div style={{
        background: design.colors.bgSecondary,
        borderRadius: design.radius.lg,
        padding: design.spacing.lg,
        marginBottom: design.spacing.lg,
        maxWidth: 360,
        width: '100%',
        border: `1px solid ${design.colors.border}`
      }}>
        <div style={{ marginBottom: design.spacing.md }}>
          <p style={{
            fontSize: 18,
            color: design.colors.staticFriction,
            fontFamily: design.font.mono,
            textAlign: 'center',
            fontWeight: 700,
            marginBottom: 4
          }}>
            Fs_max = \u03bcs \u00d7 N
          </p>
          <p style={{
            fontSize: 13,
            color: design.colors.textSecondary,
            fontFamily: design.font.sans,
            textAlign: 'center'
          }}>
            Maximum static friction (before sliding)
          </p>
        </div>
        <div>
          <p style={{
            fontSize: 18,
            color: design.colors.kineticFriction,
            fontFamily: design.font.mono,
            textAlign: 'center',
            fontWeight: 700,
            marginBottom: 4
          }}>
            Fk = \u03bck \u00d7 N
          </p>
          <p style={{
            fontSize: 13,
            color: design.colors.textSecondary,
            fontFamily: design.font.sans,
            textAlign: 'center'
          }}>
            Kinetic friction (while sliding)
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, maxWidth: 360, width: '100%', marginBottom: design.spacing.md }}>
        <div style={{
          background: design.colors.dangerMuted,
          border: `1px solid ${design.colors.danger}30`,
          borderRadius: design.radius.md,
          padding: design.spacing.md
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.staticFriction, fontFamily: design.font.sans, marginBottom: 4 }}>
            Static Friction (\u03bcs):
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, margin: 0 }}>
            Surfaces interlock when at rest. Must overcome maximum to start sliding.
          </p>
        </div>
        <div style={{
          background: `${design.colors.accentMuted}40`,
          border: `1px solid ${design.colors.accentPrimary}30`,
          borderRadius: design.radius.md,
          padding: design.spacing.md
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.kineticFriction, fontFamily: design.font.sans, marginBottom: 4 }}>
            Kinetic Friction (\u03bck):
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, margin: 0 }}>
            While sliding, bonds break before fully forming. Always less than static!
          </p>
        </div>
      </div>

      <p style={{
        fontSize: 14,
        color: prediction === 'friction_type' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans,
        marginBottom: design.spacing.lg
      }}>
        Your prediction: {prediction === 'friction_type' ? '&#10004; Correct!' : '&#129300; Now you understand!'}
      </p>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{
          zIndex: 10,
          padding: '14px 28px',
          fontSize: '15px',
          borderRadius: design.radius.md,
          fontWeight: 600,
          fontFamily: design.font.sans,
          border: 'none',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
          color: '#000',
          boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
        }}
      >
        What About Different Surfaces?
      </button>
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>&#129482;</div>
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.sm,
        fontFamily: design.font.sans
      }}>Plot Twist: Different Surfaces!</h2>
      <p style={{
        fontSize: 15,
        color: design.colors.textSecondary,
        marginBottom: design.spacing.lg,
        fontFamily: design.font.sans,
        textAlign: 'center'
      }}>
        Wood, rubber, and ice all have different friction. What do you think determines the coefficient?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, width: '100%', maxWidth: 360 }}>
        {[
          { id: 'roughness', label: "Surface roughness determines friction" },
          { id: 'materials', label: "The materials in contact determine friction" },
          { id: 'temperature', label: "Temperature is the main factor" }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setTwistPrediction(option.id);
              emit('prediction', { twistPrediction: option.id });
            }}
            style={{
              zIndex: 10,
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
          <button
            onClick={() => goToPhase('twist_play')}
            style={{
              zIndex: 10,
              padding: '14px 28px',
              fontSize: '15px',
              borderRadius: design.radius.md,
              fontWeight: 600,
              fontFamily: design.font.sans,
              border: 'none',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
              color: '#000',
              boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
            }}
          >
            Compare Surfaces!
          </button>
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
        <div style={{ display: 'flex', gap: design.spacing.sm }}>
          {(['wood', 'rubber', 'ice'] as Surface[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (!isPulling) {
                  setSurface(s);
                  resetExperiment();
                  emit('interaction', { surface: s, action: 'surface_change' });
                }
              }}
              style={{
                zIndex: 10,
                padding: `${design.spacing.sm}px ${design.spacing.md}px`,
                borderRadius: design.radius.md,
                border: 'none',
                background: surface === s ? surfaceProperties[s].color : design.colors.bgTertiary,
                color: surface === s ? '#fff' : design.colors.textSecondary,
                fontWeight: 600,
                fontSize: 13,
                cursor: isPulling ? 'not-allowed' : 'pointer',
                opacity: isPulling ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {surfaceProperties[s].name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: design.spacing.md }}>
          <div style={{
            textAlign: 'center',
            padding: design.spacing.sm,
            background: design.colors.bgTertiary,
            borderRadius: design.radius.md,
            minWidth: 60
          }}>
            <p style={{ fontSize: 10, color: design.colors.textTertiary, fontFamily: design.font.sans, margin: 0 }}>\u03bcs</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: design.colors.staticFriction, fontFamily: design.font.mono, margin: 0 }}>
              {surfaceProperties[surface].staticCoef}
            </p>
          </div>
          <div style={{
            textAlign: 'center',
            padding: design.spacing.sm,
            background: design.colors.bgTertiary,
            borderRadius: design.radius.md,
            minWidth: 60
          }}>
            <p style={{ fontSize: 10, color: design.colors.textTertiary, fontFamily: design.font.sans, margin: 0 }}>\u03bck</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: design.colors.kineticFriction, fontFamily: design.font.mono, margin: 0 }}>
              {surfaceProperties[surface].kineticCoef}
            </p>
          </div>
          <div style={{
            textAlign: 'center',
            padding: design.spacing.sm,
            background: design.colors.bgTertiary,
            borderRadius: design.radius.md,
            minWidth: 60
          }}>
            <p style={{ fontSize: 10, color: design.colors.textTertiary, fontFamily: design.font.sans, margin: 0 }}>Ratio</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: design.colors.success, fontFamily: design.font.mono, margin: 0 }}>
              {(surfaceProperties[surface].staticCoef / surfaceProperties[surface].kineticCoef).toFixed(1)}\u00d7
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: design.spacing.md }}>
          {!isPulling && blockPosition === 0 && (
            <button
              onClick={startPulling}
              style={{
                zIndex: 10,
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: design.radius.md,
                fontWeight: 600,
                fontFamily: design.font.sans,
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
                color: '#fff',
                boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.success)}`
              }}
            >
              Pull!
            </button>
          )}
          {(isPulling || blockPosition > 0) && (
            <button
              onClick={resetExperiment}
              style={{
                zIndex: 10,
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: design.radius.md,
                fontWeight: 600,
                fontFamily: design.font.sans,
                border: `1px solid ${design.colors.border}`,
                cursor: 'pointer',
                background: design.colors.bgTertiary,
                color: design.colors.textPrimary
              }}
            >
              Reset
            </button>
          )}
        </div>

        {experimentCount >= 4 && (
          <button
            onClick={() => goToPhase('twist_review')}
            style={{
              zIndex: 10,
              padding: '14px 28px',
              fontSize: '15px',
              borderRadius: design.radius.md,
              fontWeight: 600,
              fontFamily: design.font.sans,
              border: 'none',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
              color: '#000',
              boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
            }}
          >
            I understand!
          </button>
        )}
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>&#128300;</div>
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.md,
        fontFamily: design.font.sans
      }}>Materials Determine Friction!</h2>

      <div style={{
        background: design.colors.bgSecondary,
        borderRadius: design.radius.lg,
        padding: design.spacing.lg,
        marginBottom: design.spacing.lg,
        maxWidth: 360,
        width: '100%',
        border: `1px solid ${design.colors.border}`
      }}>
        <p style={{ fontSize: 15, color: design.colors.accentSecondary, fontFamily: design.font.sans, textAlign: 'center', fontWeight: 600, marginBottom: design.spacing.md }}>
          The coefficient of friction depends on BOTH surfaces in contact!
        </p>
        <p style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.8, margin: 0 }}>
          <strong style={{ color: '#2d2d2d', background: '#e5e5e5', padding: '2px 6px', borderRadius: 4 }}>Rubber:</strong> Soft, deforms around irregularities, high friction
          <br/>
          <strong style={{ color: '#8b7355' }}>Wood:</strong> Medium roughness, moderate friction
          <br/>
          <strong style={{ color: '#a8d5e5' }}>Ice:</strong> Very smooth, minimal interlocking, low friction
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
          Key insight: Friction coefficients are determined experimentally for each pair of materials. There's no simple formula - it depends on the microscopic properties of both surfaces!
        </p>
      </div>

      <p style={{
        fontSize: 14,
        color: twistPrediction === 'materials' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans,
        marginBottom: design.spacing.lg
      }}>
        Your prediction: {twistPrediction === 'materials' ? '&#10004; Excellent thinking!' : '&#129300; Now you see the pattern!'}
      </p>

      <button
        onClick={() => goToPhase('transfer')}
        style={{
          zIndex: 10,
          padding: '14px 28px',
          fontSize: '15px',
          borderRadius: design.radius.md,
          fontWeight: 600,
          fontFamily: design.font.sans,
          border: 'none',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
          color: '#000',
          boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
        }}
      >
        See Real-World Applications
      </button>
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
          Friction in the Real World
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
                onClick={() => {
                  if (isUnlocked) setActiveApp(idx);
                }}
                style={{
                  zIndex: 10,
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
                  opacity: isUnlocked ? 1 : 0.5
                }}
              >
                {completedApps.has(idx) && <span style={{ marginRight: 2 }}>&#10003;</span>}
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
              &#128202; {app.stats}
            </span>
          </div>

          {/* Mark as Read button */}
          {!completedApps.has(activeApp) ? (
            <button
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                emit('interaction', { app: app.title, action: 'marked_read' });
                if (activeApp < applications.length - 1) {
                  setTimeout(() => setActiveApp(activeApp + 1), 300);
                }
              }}
              style={{
                zIndex: 10,
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
              &#10003; Mark "{app.title}" as Read
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
              &#10003; Completed
            </div>
          )}
        </div>

        <div style={{ marginTop: design.spacing.md }}>
          {completedApps.size >= applications.length ? (
            <button
              onClick={() => goToPhase('test')}
              style={{
                zIndex: 10,
                width: '100%',
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: design.radius.md,
                fontWeight: 600,
                fontFamily: design.font.sans,
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
                color: '#000',
                boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
              }}
            >
              Take the Quiz!
            </button>
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
                if (option.correct) { bg = design.colors.successMuted; border = design.colors.success; }
                else if (idx === selectedAnswer && !option.correct) { bg = design.colors.dangerMuted; border = design.colors.danger; }
              }
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isAnswered) handleTestAnswer(idx);
                  }}
                  style={{
                    zIndex: 10,
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
                    {option.text}
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
                &#128161; {q.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: design.spacing.md }}>
          <button
            onClick={() => {
              setCurrentQuestion(prev => Math.max(0, prev - 1));
              setSelectedAnswer(null);
              setShowExplanation(answeredQuestions.has(currentQuestion - 1));
            }}
            disabled={currentQuestion === 0}
            style={{
              zIndex: 10,
              padding: '14px 28px',
              fontSize: '15px',
              borderRadius: design.radius.md,
              fontWeight: 600,
              fontFamily: design.font.sans,
              border: `1px solid ${design.colors.border}`,
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
              background: design.colors.bgTertiary,
              color: design.colors.textPrimary,
              opacity: currentQuestion === 0 ? 0.4 : 1
            }}
          >
            &#8592; Back
          </button>

          {currentQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => {
                setCurrentQuestion(prev => prev + 1);
                setSelectedAnswer(null);
                setShowExplanation(answeredQuestions.has(currentQuestion + 1));
              }}
              style={{
                zIndex: 10,
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: design.radius.md,
                fontWeight: 600,
                fontFamily: design.font.sans,
                border: `1px solid ${design.colors.border}`,
                cursor: 'pointer',
                background: design.colors.bgTertiary,
                color: design.colors.textPrimary
              }}
            >
              Next &#8594;
            </button>
          ) : answeredQuestions.size === testQuestions.length ? (
            <button
              onClick={() => goToPhase('mastery')}
              style={{
                zIndex: 10,
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: design.radius.md,
                fontWeight: 600,
                fontFamily: design.font.sans,
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
                color: '#000',
                boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
              }}
            >
              Complete!
            </button>
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
    const passed = correctAnswers >= 7;

    const resetGame = () => {
      setPhase('hook');
      setExperimentCount(0);
      setCurrentQuestion(0);
      setCorrectAnswers(0);
      setAnsweredQuestions(new Set());
      setPrediction(null);
      setTwistPrediction(null);
      setSurface('wood');
      setActiveApp(0);
      setCompletedApps(new Set());
      resetExperiment();
    };

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
        {/* Confetti only for passing */}
        {passed && (
          <>
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
                {['&#128230;', '&#128260;', '&#11088;', '&#10024;', '&#127942;'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </>
        )}

        <div style={{
          fontSize: 80,
          marginBottom: design.spacing.md,
          filter: `drop-shadow(0 8px 24px ${design.colors.accentGlow})`
        }}>
          {passed ? '&#127942;' : '&#128218;'}
        </div>

        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: design.colors.textPrimary,
          marginBottom: design.spacing.sm,
          fontFamily: design.font.sans,
          textAlign: 'center'
        }}>
          {passed ? 'Congratulations! Friction Master!' : 'Keep Practicing!'}
        </h2>

        <div style={{
          fontSize: 64,
          fontWeight: 700,
          color: passed ? design.colors.success : '#f59e0b',
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
            {passed ? 'Concepts Mastered:' : 'Key Concepts to Review:'}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'Static friction > kinetic friction',
              'Fs_max = \u03bcs \u00d7 N (max static)',
              'Fk = \u03bck \u00d7 N (kinetic)',
              'Coefficients depend on materials'
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
                <span style={{ color: design.colors.success }}>{passed ? '&#10003;' : '&#9675;'}</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, width: '100%', maxWidth: 340 }}>
          <button
            onClick={handleReturnToDashboard}
            style={{
              zIndex: 10,
              width: '100%',
              padding: '14px 28px',
              fontSize: '15px',
              borderRadius: design.radius.md,
              fontWeight: 600,
              fontFamily: design.font.sans,
              border: 'none',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
              color: '#000',
              boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
            }}
          >
            &#127968; Return to Dashboard
          </button>
          <button
            onClick={resetGame}
            style={{
              zIndex: 10,
              width: '100%',
              padding: '14px 28px',
              fontSize: '15px',
              borderRadius: design.radius.md,
              fontWeight: 600,
              fontFamily: design.font.sans,
              border: `1px solid ${design.colors.border}`,
              cursor: 'pointer',
              background: design.colors.bgTertiary,
              color: design.colors.textPrimary
            }}
          >
            &#128300; {passed ? 'Review Lesson' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  const phaseRenderers: Record<Phase, () => JSX.Element> = {
    hook: renderHook,
    predict: renderPredict,
    play: renderPlay,
    review: renderReview,
    twist_predict: renderTwistPredict,
    twist_play: renderTwistPlay,
    twist_review: renderTwistReview,
    transfer: renderTransfer,
    test: renderTest,
    mastery: renderMastery
  };

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

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden" style={{ fontFamily: design.font.sans }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Premium Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Static vs Kinetic Friction</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phaseOrder.indexOf(p) < phaseOrder.indexOf(phase)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-8">
        {phaseRenderers[phase]()}
      </div>
    </div>
  );
};

export default StaticKineticFrictionRenderer;
