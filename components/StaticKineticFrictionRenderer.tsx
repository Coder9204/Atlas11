'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// STATIC VS KINETIC FRICTION RENDERER - Premium Design System
// ============================================================================

export interface GameEvent {
  type: 'phase_change' | 'interaction' | 'prediction' | 'result' | 'hint_request' | 'visual_state_update';
  phase: string;
  data: Record<string, unknown>;
  timestamp: number;
  eventType?: 'pull_start' | 'surface_change' | 'reset' | 'answer_submit';
}

interface StaticKineticFrictionRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
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

const SportShoesSVG: React.FC = () => (
  <svg width="200" height="140" viewBox="0 0 200 140">
    <defs>
      <linearGradient id="shoeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="soleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="100%" stopColor="#1f2937" />
      </linearGradient>
      <linearGradient id="courtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#854d0e" />
        <stop offset="100%" stopColor="#713f12" />
      </linearGradient>
      <filter id="shoeShadow">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Court floor */}
    <rect x="0" y="105" width="200" height="35" fill="url(#courtGrad)" />
    <line x1="0" y1="105" x2="200" y2="105" stroke="#a16207" strokeWidth="2" />
    <line x1="100" y1="105" x2="100" y2="140" stroke="#a16207" strokeWidth="1" strokeDasharray="4,4" />

    {/* Shoe */}
    <g filter="url(#shoeShadow)">
      {/* Sole */}
      <path d="M35 95 Q25 95 25 85 L25 80 L130 80 L145 85 Q155 90 155 100 L155 105 L35 105 Z" fill="url(#soleGrad)" />
      {/* Tread pattern */}
      {[40, 55, 70, 85, 100, 115, 130, 145].map((x, i) => (
        <rect key={i} x={x} y="98" width="8" height="6" rx="1" fill="#111827" />
      ))}
      {/* Upper */}
      <path d="M30 80 Q20 60 40 45 L90 35 Q120 30 140 50 L145 75 L145 80 L30 80 Z" fill="url(#shoeGrad)" />
      {/* Logo swoosh */}
      <path d="M45 65 Q80 55 110 60 Q85 62 55 70 Z" fill="white" opacity="0.9" />
      {/* Laces */}
      <circle cx="70" cy="55" r="3" fill="white" />
      <circle cx="85" cy="50" r="3" fill="white" />
      <circle cx="100" cy="48" r="3" fill="white" />
    </g>

    {/* Friction indicator */}
    <g transform="translate(165, 70)">
      <text x="0" y="0" fill={design.colors.accentPrimary} fontSize="10" fontWeight="600">High</text>
      <text x="0" y="12" fill={design.colors.accentPrimary} fontSize="10" fontWeight="600">Grip!</text>
      <path d="M-5 5 L-15 5" stroke={design.colors.accentPrimary} strokeWidth="2" />
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

    {/* Chalk particles */}
    {[0, 1, 2, 3, 4].map((i) => (
      <circle
        key={i}
        cx={140 + Math.random() * 20}
        cy={30 + Math.random() * 20}
        r={1 + Math.random() * 2}
        fill="white"
        opacity="0.5"
      />
    ))}

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
  onGameEvent,
  gamePhase
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

  const navigationLockRef = useRef(false);
  const animationRef = useRef<number>();

  const surfaceProperties: Record<Surface, { staticCoef: number; kineticCoef: number; color: string; name: string }> = {
    wood: { staticCoef: 0.5, kineticCoef: 0.3, color: '#8b7355', name: 'Wood' },
    rubber: { staticCoef: 0.9, kineticCoef: 0.6, color: '#2d2d2d', name: 'Rubber' },
    ice: { staticCoef: 0.1, kineticCoef: 0.03, color: '#a8d5e5', name: 'Ice' }
  };

  const weight = 10;
  const staticFrictionMax = weight * surfaceProperties[surface].staticCoef;
  const kineticFriction = weight * surfaceProperties[surface].kineticCoef;

  const testQuestions = [
    { question: "Why does the force needed to START moving a block exceed the force to KEEP it moving?", options: ["The block gets lighter once moving", "Static friction > kinetic friction due to surface interlocking", "Air resistance helps once moving", "Gravity changes direction"], correct: 1, explanation: "At rest, surfaces interlock more completely. Once sliding, the microscopic bonds keep breaking before they fully form, resulting in lower kinetic friction." },
    { question: "Static friction is:", options: ["Always equal to applied force up to a maximum", "Always at its maximum value", "Zero until the object moves", "Greater than kinetic friction always"], correct: 0, explanation: "Static friction matches the applied force exactly (preventing motion) until the maximum static friction is reached - then the object slips." },
    { question: "When a heavy box finally starts sliding, you notice:", options: ["You need to push harder to keep it moving", "You can push lighter to keep it moving", "The force stays exactly the same", "The box accelerates infinitely"], correct: 1, explanation: "Once the box breaks free (overcomes static friction), kinetic friction takes over, which is lower. You need less force to maintain motion." },
    { question: "Why does rubber have higher friction coefficients than ice?", options: ["Rubber is heavier", "Rubber deforms and interlocks with surfaces more", "Ice is colder", "Rubber is stickier due to glue"], correct: 1, explanation: "Rubber is soft and deforms around surface irregularities, creating more contact area and mechanical interlocking. Ice is hard and smooth with minimal interlocking." },
    { question: "If you double the weight on a block, friction force:", options: ["Stays the same", "Doubles (proportional to normal force)", "Halves", "Becomes zero"], correct: 1, explanation: "Friction force = \u03bc \u00d7 Normal force. Doubling the weight doubles the normal force, which doubles the friction force (both static and kinetic)." },
    { question: "Anti-lock brakes (ABS) work by:", options: ["Increasing kinetic friction", "Keeping tires at static friction (not sliding)", "Heating up the brakes", "Making tires lighter"], correct: 1, explanation: "ABS prevents wheels from locking (sliding). Static friction between tire and road is higher than kinetic, giving better stopping power." },
    { question: "The coefficient of friction is:", options: ["Always greater than 1", "A ratio of friction force to normal force", "Measured in Newtons", "The same for all materials"], correct: 1, explanation: "The friction coefficient (\u03bc) is the ratio of friction force to normal force: \u03bc = f/N. It's dimensionless and depends on the materials in contact." },
    { question: "Oil reduces friction by:", options: ["Making surfaces heavier", "Preventing direct surface contact", "Cooling the surfaces", "Increasing the normal force"], correct: 1, explanation: "Oil creates a thin layer between surfaces, preventing the microscopic interlocking that causes friction. This is called lubrication." },
    { question: "On a force-time graph during a pull test, the peak represents:", options: ["Kinetic friction", "Maximum static friction (just before slip)", "The weight of the object", "Air resistance"], correct: 1, explanation: "The peak in the force-time graph is the moment static friction reaches its maximum, just before the object starts to slide." },
    { question: "Walking relies on friction. Without it, you would:", options: ["Walk faster", "Slip backward when pushing off", "Float upward", "Walk normally"], correct: 1, explanation: "When you push backward with your foot, friction pushes you forward. Without friction (like on ice), your foot slides back and you can't walk." }
  ];

  const applications = [
    { title: "Car Tires & Grip", description: "Tire tread patterns maximize friction with road surfaces. Racing slicks use smooth rubber for max contact on dry tracks, while treaded tires channel water for wet grip.", stats: "\u03bc rubber-asphalt \u2248 0.7-0.9", SVG: CarTiresSVG },
    { title: "Sports Footwear", description: "Basketball shoes maximize court grip for quick stops and pivots. Different sports require different friction profiles - spikes for grass, smooth soles for courts.", stats: "Court shoes: \u03bc \u2248 0.8+", SVG: SportShoesSVG },
    { title: "Brake Systems", description: "Brake pads convert kinetic energy to heat through friction. ABS keeps tires in static friction regime - wheels roll rather than slide for maximum stopping power.", stats: "Brake pad \u03bc \u2248 0.35-0.45", SVG: BrakeSystemSVG },
    { title: "Rock Climbing", description: "Climbers use chalk to increase hand-rock friction. Climbing shoes have sticky rubber compounds with friction coefficients exceeding 1.0 on textured rock.", stats: "Climbing rubber \u03bc > 1.0", SVG: ClimbingSVG }
  ];

  useEffect(() => {
    if (gamePhase && gamePhase !== phase) setPhase(gamePhase as Phase);
  }, [gamePhase, phase]);

  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const emit = useCallback((type: GameEvent['type'], data: Record<string, unknown>, eventType?: GameEvent['eventType']) => {
    onGameEvent?.({ type, phase, data, timestamp: Date.now(), eventType });
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emit('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [emit, phase]);

  // Render button helper function
  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'ghost' | 'success' = 'primary',
    options?: { disabled?: boolean; fullWidth?: boolean; size?: 'sm' | 'md' | 'lg' }
  ) => {
    const { disabled = false, fullWidth = false, size = 'md' } = options || {};
    const sizes = {
      sm: { padding: '10px 18px', fontSize: '13px' },
      md: { padding: '14px 28px', fontSize: '15px' },
      lg: { padding: '18px 36px', fontSize: '17px' }
    };

    const baseStyle: React.CSSProperties = {
      ...sizes[size],
      borderRadius: design.radius.md,
      fontWeight: 600,
      fontFamily: design.font.sans,
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      width: fullWidth ? '100%' : 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      letterSpacing: '-0.01em',
      WebkitTapHighlightColor: 'transparent',
      userSelect: 'none',
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: `linear-gradient(135deg, ${design.colors.accentPrimary} 0%, ${design.colors.accentSecondary} 100%)`,
        color: '#000',
        boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.accentPrimary)}`
      },
      secondary: {
        background: design.colors.bgTertiary,
        color: design.colors.textPrimary,
        border: `1px solid ${design.colors.border}`
      },
      ghost: {
        background: 'transparent',
        color: design.colors.textSecondary
      },
      success: {
        background: `linear-gradient(135deg, ${design.colors.success} 0%, #059669 100%)`,
        color: '#fff',
        boxShadow: `${design.shadow.md}, ${design.shadow.glow(design.colors.success)}`
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

  const startPulling = useCallback(() => {
    if (isPulling) return;
    setIsPulling(true);
    setHasSlipped(false);
    setCurrentForce(0);
    setBlockPosition(0);
    setForceHistory([]);
    setPeakForce(0);
    setSteadyForce(0);

    emit('interaction', { surface, staticMax: staticFrictionMax, kinetic: kineticFriction }, 'pull_start');

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
        <span style={{ display: 'inline-block', animation: 'slideBox 2s ease-in-out infinite' }}>📦</span>
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
        The Friction Force Jump
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
        Pull a heavy box across the floor. Something strange happens when it starts sliding...
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
          "Is it harder to START sliding or to KEEP sliding?"
        </p>
      </div>

      {renderButton("Let's Find Out", () => goToPhase('predict'), 'primary', { size: 'lg' })}

      <p style={{
        fontSize: 13,
        color: design.colors.textTertiary,
        marginTop: design.spacing.lg,
        fontFamily: design.font.sans,
        letterSpacing: '0.02em'
      }}>
        Static vs Kinetic Friction \u2022 \u03bcs vs \u03bck
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>🤔</div>
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
        When pulling a block, which requires more force?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, width: '100%', maxWidth: 360 }}>
        {[
          { id: 'start_harder', label: 'Starting to slide requires more force', icon: '🏋️' },
          { id: 'keep_harder', label: 'Keeping it sliding requires more force', icon: '🔄' },
          { id: 'same', label: 'Both require the same force', icon: '⚖️' }
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
          {renderButton('Test It!', () => goToPhase('play'))}
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
          {!isPulling && blockPosition === 0 && renderButton('Start Pulling!', startPulling, 'success')}
          {(isPulling || blockPosition > 0) && renderButton('Reset', resetExperiment, 'secondary')}
        </div>

        <p style={{ fontSize: 13, color: design.colors.textTertiary, fontFamily: design.font.sans, textAlign: 'center' }}>
          Watch the force graph! Notice the peak then drop.
        </p>

        {experimentCount >= 2 && renderButton('I see the pattern!', () => goToPhase('review'))}
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>💡</div>
      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.md,
        fontFamily: design.font.sans
      }}>Static {'>'} Kinetic Friction!</h2>

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
          fontSize: 17,
          color: design.colors.accentPrimary,
          fontFamily: design.font.sans,
          textAlign: 'center',
          fontWeight: 600
        }}>
          It's harder to START sliding than to KEEP sliding!
        </p>
        <p style={{
          fontSize: 14,
          color: design.colors.textSecondary,
          fontFamily: design.font.sans,
          textAlign: 'center',
          marginTop: design.spacing.md,
          lineHeight: 1.6
        }}>
          When surfaces are at rest, they interlock more completely at the microscopic level.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, maxWidth: 360, width: '100%', marginBottom: design.spacing.md }}>
        <div style={{
          background: design.colors.dangerMuted,
          border: `1px solid ${design.colors.danger}30`,
          borderRadius: design.radius.md,
          padding: design.spacing.md
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.staticFriction, fontFamily: design.font.sans, marginBottom: 4 }}>
            Static Friction:
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, margin: 0 }}>
            Full interlocking \u2192 Maximum resistance to starting motion
          </p>
        </div>
        <div style={{
          background: `${design.colors.accentMuted}40`,
          border: `1px solid ${design.colors.accentPrimary}30`,
          borderRadius: design.radius.md,
          padding: design.spacing.md
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: design.colors.kineticFriction, fontFamily: design.font.sans, marginBottom: 4 }}>
            Kinetic Friction:
          </p>
          <p style={{ fontSize: 13, color: design.colors.textPrimary, fontFamily: design.font.sans, margin: 0 }}>
            Surfaces sliding \u2192 Bonds break before fully forming
          </p>
        </div>
      </div>

      <p style={{
        fontSize: 14,
        color: prediction === 'start_harder' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans,
        marginBottom: design.spacing.lg
      }}>
        Your prediction: {prediction === 'start_harder' ? '\u2705 Correct!' : '\ud83e\udd14 Now you understand!'}
      </p>

      {renderButton('What About Different Surfaces?', () => goToPhase('twist_predict'))}
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>🧊</div>
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.sm,
        fontFamily: design.font.sans
      }}>Plot Twist: Change the Surface!</h2>
      <p style={{
        fontSize: 15,
        color: design.colors.textSecondary,
        marginBottom: design.spacing.lg,
        fontFamily: design.font.sans,
        textAlign: 'center'
      }}>
        How does the surface material affect the friction "jump"?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: design.spacing.md, width: '100%', maxWidth: 360 }}>
        {[
          { id: 'same_ratio', label: "Same ratio - all surfaces behave the same" },
          { id: 'different', label: "Different surfaces have different ratios" },
          { id: 'ice_no_jump', label: "Ice has almost no friction jump" }
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
          {renderButton('Compare Surfaces!', () => goToPhase('twist_play'))}
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
              onMouseDown={() => {
                if (isPulling || navigationLockRef.current) return;
                navigationLockRef.current = true;
                setSurface(s);
                resetExperiment();
                emit('interaction', { surface: s }, 'surface_change');
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
              style={{
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
          {!isPulling && blockPosition === 0 && renderButton('Pull!', startPulling, 'success')}
          {(isPulling || blockPosition > 0) && renderButton('Reset', resetExperiment, 'secondary')}
        </div>

        {experimentCount >= 4 && renderButton('I understand!', () => goToPhase('twist_review'))}
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
      <div style={{ fontSize: 56, marginBottom: design.spacing.md }}>🔬</div>
      <h2 style={{
        fontSize: 22,
        fontWeight: 700,
        color: design.colors.textPrimary,
        marginBottom: design.spacing.md,
        fontFamily: design.font.sans
      }}>Surface Material Matters!</h2>

      <div style={{
        background: design.colors.bgSecondary,
        borderRadius: design.radius.lg,
        padding: design.spacing.lg,
        marginBottom: design.spacing.lg,
        maxWidth: 360,
        width: '100%',
        border: `1px solid ${design.colors.border}`
      }}>
        <p style={{ fontSize: 14, color: design.colors.textPrimary, fontFamily: design.font.sans, lineHeight: 1.8, margin: 0 }}>
          <strong style={{ color: '#2d2d2d', background: '#e5e5e5', padding: '2px 6px', borderRadius: 4 }}>Rubber:</strong> High friction, ratio \u2248 1.5\u00d7
          <br/>
          <strong style={{ color: '#8b7355' }}>Wood:</strong> Medium friction, medium jump
          <br/>
          <strong style={{ color: '#a8d5e5' }}>Ice:</strong> Low friction, HUGE ratio \u2248 3.3\u00d7
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
          Ice has low absolute friction, but a high static/kinetic ratio. That's why it's hard to start walking on ice, but once sliding, you can't stop!
        </p>
      </div>

      <p style={{
        fontSize: 14,
        color: twistPrediction === 'different' ? design.colors.success : design.colors.textSecondary,
        fontFamily: design.font.sans,
        marginBottom: design.spacing.lg
      }}>
        Your prediction: {twistPrediction === 'different' || twistPrediction === 'ice_no_jump' ? '\u2705 Good thinking!' : '\ud83e\udd14 Now you see the pattern!'}
      </p>

      {renderButton('See Real Examples', () => goToPhase('transfer'))}
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
                  opacity: isUnlocked ? 1 : 0.5
                }}
              >
                {completedApps.has(idx) && <span style={{ marginRight: 2 }}>✓</span>}
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

        <div style={{ marginTop: design.spacing.md }}>
          {completedApps.size >= applications.length ? (
            renderButton('Take the Quiz!', () => goToPhase('test'), 'primary', { fullWidth: true })
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
            renderButton('Complete!', () => goToPhase('mastery'))
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
          Friction Master!
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
              'Static friction > kinetic friction',
              'Force peaks then drops at slip',
              'f = \u03bcN (friction = coef \u00d7 normal)',
              'Surface material changes \u03bc values'
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
          setSurface('wood');
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
            {['\ud83d\udce6', '\ud83d\udd04', '\u2b50', '\u2728', '\ud83c\udfc6'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  const phases: Record<Phase, () => JSX.Element> = {
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

  const phaseList: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

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
      {phases[phase]()}

      {/* Progress dots */}
      <div style={{
        position: 'absolute',
        top: design.spacing.md,
        left: design.spacing.md,
        display: 'flex',
        gap: design.spacing.xs
      }}>
        {phaseList.map((p, idx) => (
          <div
            key={p}
            style={{
              width: 8,
              height: 8,
              borderRadius: design.radius.full,
              background: phase === p
                ? design.colors.accentPrimary
                : idx < phaseList.indexOf(phase)
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

export default StaticKineticFrictionRenderer;
