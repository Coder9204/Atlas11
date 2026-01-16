import React, { useState, useRef, useEffect, useCallback } from 'react';

// Premium Design System - Apple/Airbnb inspired
const design = {
  colors: {
    primary: '#ec4899',       // Vibrant pink
    primaryLight: '#f472b6',
    primaryDark: '#db2777',
    accent: '#06b6d4',        // Cyan
    accentLight: '#22d3ee',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgPrimary: '#0a0a0f',     // Deepest background
    bgSecondary: '#12121a',   // Cards and elevated surfaces
    bgTertiary: '#1a1a24',    // Hover states, inputs
    bgElevated: '#22222e',    // Highly elevated elements
    border: '#2a2a36',
    borderLight: '#3a3a48',
    borderFocus: '#ec4899',
    textPrimary: '#fafafa',   // Headings
    textSecondary: '#a1a1aa', // Body text
    textTertiary: '#71717a',  // Captions, hints
    textInverse: '#0a0a0f',   // Text on light backgrounds
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
    glow: (color: string) => `0 0 40px ${color}40`,
  },
};

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
type DampingType = 'underdamped' | 'critical' | 'overdamped';

const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface DampingRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  emitGameEvent?: (event: string, data?: Record<string, unknown>) => void;
}

// Real-world applications data
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Car Suspension',
    tagline: 'Smooth Rides Through Damping',
    description: "Car shock absorbers use damped oscillation to provide a smooth ride. Without damping, hitting a bump would cause the car to bounce repeatedly. With critical damping, it returns to equilibrium quickly without oscillation.",
    connection: "Shock absorbers convert kinetic energy into heat through viscous fluid forced through small orifices. The damping coefficient is tuned to be slightly underdamped for comfort while avoiding dangerous oscillation.",
    howItWorks: "A piston moves through oil inside a cylinder. Small valves control oil flow, resisting motion proportionally to velocity. Spring provides restoring force, damper dissipates energy.",
    stats: [
      { value: '0.3-0.4', label: 'damping ratio target', icon: '🎯' },
      { value: '50-100k', label: 'cycles lifetime', icon: '🔄' },
      { value: '1-2s', label: 'settling time', icon: '⏱️' }
    ],
    examples: ['Passenger car suspensions', 'Motorcycle forks', 'Bicycle shock absorbers', 'Aircraft landing gear'],
    companies: ['Bilstein', 'KYB', 'Monroe', 'Öhlins'],
    color: design.colors.primary
  },
  {
    icon: '🚪',
    title: 'Door Closers',
    tagline: 'Gentle Close Every Time',
    description: "Hydraulic door closers use damping to close doors smoothly without slamming. They provide enough force to close but dissipate energy to prevent the door from swinging back open or making noise.",
    connection: "Door closers are tuned for critical or slightly overdamped response. The door returns to closed position efficiently without bouncing back open or slamming shut.",
    howItWorks: "Oil flows through adjustable valves as a spring forces the door closed. The valve opening controls damping - tighter valves mean slower, more controlled closing. Two stages: closing speed and latching speed.",
    stats: [
      { value: '5-7s', label: 'typical close time', icon: '⏱️' },
      { value: '1M+', label: 'cycle rating', icon: '🔁' },
      { value: '100+', label: 'lb holding force', icon: '💪' }
    ],
    examples: ['Commercial building doors', 'Fire doors', 'Screen doors', 'Cabinet hinges'],
    companies: ['LCN', 'Norton', 'Dorma', 'Yale'],
    color: '#8b5cf6'
  },
  {
    icon: '⌚',
    title: 'Watch Escapements',
    tagline: 'Precision Through Controlled Loss',
    description: "Mechanical watches use the balance wheel as an oscillator. The escapement provides tiny impulses to overcome damping from air resistance and friction, maintaining constant amplitude and accurate timekeeping.",
    connection: "Watch designers minimize damping to reduce energy loss, but some damping is necessary to prevent chaotic motion. The quality factor Q measures how many oscillations occur before amplitude drops to 1/e.",
    howItWorks: "The balance wheel oscillates at a precise frequency (usually 28,800 beats/hour). The escapement releases energy in tiny pulses to replace what's lost to friction. Higher Q means less energy needed and longer power reserve.",
    stats: [
      { value: '200-300', label: 'quality factor Q', icon: '🎚️' },
      { value: '4 Hz', label: 'typical frequency', icon: '〰️' },
      { value: '±2s', label: 'daily accuracy', icon: '🎯' }
    ],
    examples: ['Swiss lever escapement', 'Detent escapement', 'Cylinder escapement', 'Pin-lever escapement'],
    companies: ['Rolex', 'Omega', 'Seiko', 'Patek Philippe'],
    color: '#f59e0b'
  },
  {
    icon: '🏢',
    title: 'Seismic Dampers',
    tagline: 'Buildings That Survive Earthquakes',
    description: "Modern earthquake-resistant buildings use large dampers to absorb seismic energy. These can reduce building motion by 40-70%, protecting both structure and occupants during earthquakes.",
    connection: "Seismic dampers add damping to buildings that would otherwise oscillate dangerously. The damping ratio is increased from the natural 2-5% to 10-30%, dramatically reducing resonant amplification.",
    howItWorks: "Viscous dampers (giant shock absorbers) or friction dampers convert kinetic energy to heat. Tuned mass dampers swing out of phase with building motion. Base isolation allows the ground to move without transferring energy to the structure.",
    stats: [
      { value: '40-70%', label: 'sway reduction', icon: '📉' },
      { value: '1000+ kN', label: 'damper capacity', icon: '💪' },
      { value: '25-50', label: 'year design life', icon: '🏗️' }
    ],
    examples: ['Taipei 101 tuned mass damper', 'Tokyo Skytree friction dampers', 'SF Salesforce Tower viscous dampers', 'LA City Hall base isolation'],
    companies: ['Taylor Devices', 'Enidine', 'Damptech', 'Maurer'],
    color: '#ec4899'
  }
];

// Test questions with scenarios
const testQuestions = [
  {
    scenario: "You push a child on a swing once and watch them swing back and forth.",
    question: "What happens to the swing's amplitude over time if you don't push again?",
    options: [
      "It stays constant forever (perpetual motion)",
      "It gradually decreases due to air resistance and friction",
      "It increases as the swing speeds up",
      "It oscillates between high and low amplitude"
    ],
    correct: 1,
    explanation: "Real oscillators always lose energy to friction and air resistance. This energy is converted to heat, causing the amplitude to gradually decay. Without additional energy input, all oscillations eventually stop."
  },
  {
    scenario: "A car hits a bump and the suspension compresses. The shock absorber is working correctly.",
    question: "What's the ideal behavior after hitting the bump?",
    options: [
      "The car bounces up and down several times before settling",
      "The car returns to level quickly with minimal or no bouncing",
      "The car stays compressed for a long time before slowly rising",
      "The car immediately snaps back and overshoots significantly"
    ],
    correct: 1,
    explanation: "Optimal car suspension is slightly underdamped to critically damped. This allows the car to return to equilibrium quickly (unlike overdamped) without excessive bouncing (unlike underdamped). One small overshoot is acceptable for comfort."
  },
  {
    scenario: "You're designing a door closer for a hospital entrance.",
    question: "Why would you choose overdamped or critically damped rather than underdamped?",
    options: [
      "Underdamped doors close faster",
      "Overdamped doors are cheaper to manufacture",
      "Critically damped prevents the door from bouncing back open",
      "Underdamped doors use less energy"
    ],
    correct: 2,
    explanation: "An underdamped door would swing past closed, bounce back open, and oscillate before settling. This is dangerous in a hospital where gurneys need to pass through. Critical damping ensures the door closes once and stays closed without bouncing."
  },
  {
    scenario: "A pendulum in a vacuum oscillates at 1 Hz. The same pendulum in honey oscillates very slowly and doesn't swing back.",
    question: "What type of damping does the honey provide?",
    options: [
      "Underdamped - it still oscillates",
      "Critically damped - fastest return without oscillation",
      "Overdamped - slow return without oscillation",
      "Undamped - no energy loss"
    ],
    correct: 2,
    explanation: "Honey's high viscosity provides strong damping. When the pendulum doesn't oscillate at all and returns very slowly to equilibrium, it's overdamped. The damping force dominates the restoring force, preventing any overshoot."
  },
  {
    scenario: "Two identical springs with masses are set oscillating. One is in air, one is in water.",
    question: "How do their oscillation patterns compare?",
    options: [
      "Same frequency, water one decays faster",
      "Water one has higher frequency and decays faster",
      "Water one has lower frequency and decays faster",
      "They're identical since water only adds buoyancy"
    ],
    correct: 2,
    explanation: "Water adds damping (viscous drag) which causes faster amplitude decay. Additionally, the damping slightly reduces the natural frequency. The formula becomes ω_d = ω_0√(1-ζ²), where ζ is the damping ratio. Higher damping = lower frequency."
  },
  {
    scenario: "An engineer measures that a vibrating beam's amplitude drops to 37% (1/e) after 100 oscillations.",
    question: "What is the quality factor Q of this oscillator?",
    options: [
      "Q = 37",
      "Q = 100",
      "Q = 314 (100π)",
      "Q = 1000"
    ],
    correct: 2,
    explanation: "Quality factor Q measures how many radians of oscillation occur before amplitude drops to 1/e. Since amplitude drops to 1/e after 100 cycles, and each cycle is 2π radians: Q = 100 × 2π ≈ 628, but the closest answer is 100π ≈ 314 (this question uses the definition Q = number of cycles × π)."
  },
  {
    scenario: "A tuning fork produces sound at 440 Hz and rings for about 10 seconds before becoming inaudible.",
    question: "If you dip the same tuning fork in water, what happens to its ringing?",
    options: [
      "It rings longer because water adds mass",
      "It rings shorter because water adds damping",
      "It rings at the same duration but sounds different",
      "It stops ringing entirely"
    ],
    correct: 1,
    explanation: "Water adds significant viscous damping to the tuning fork's vibration. The energy is dissipated much faster into the water, causing the amplitude to decay more quickly. The tuning fork might only ring for 1-2 seconds in water instead of 10 seconds in air."
  },
  {
    scenario: "A building has a natural sway frequency of 0.2 Hz. Engineers want to add seismic damping.",
    question: "What's the benefit of increasing the damping ratio from 2% to 20%?",
    options: [
      "The building will sway at a higher frequency",
      "The building will experience less resonant amplification during earthquakes",
      "The building will be stiffer and not sway at all",
      "The building will sway more during earthquakes"
    ],
    correct: 1,
    explanation: "At resonance, amplification = 1/(2ζ). With 2% damping (ζ=0.02), amplification = 25×. With 20% damping (ζ=0.2), amplification = 2.5×. Higher damping dramatically reduces the dangerous amplification that occurs when earthquake frequency matches building frequency."
  },
  {
    scenario: "You're analyzing the amplitude decay of a guitar string after being plucked.",
    question: "The amplitude A(t) follows an exponential decay. Which equation describes this?",
    options: [
      "A(t) = A₀ cos(ωt)",
      "A(t) = A₀ e^(-γt) cos(ω_d t)",
      "A(t) = A₀ / t",
      "A(t) = A₀ (1 - e^(-γt))"
    ],
    correct: 1,
    explanation: "Damped oscillation combines oscillatory motion (cosine) with exponential decay (e^(-γt)). The full solution is A(t) = A₀ e^(-γt) cos(ω_d t), where γ is the decay constant and ω_d is the damped frequency. The envelope decays exponentially while the oscillation continues."
  },
  {
    scenario: "A physicist measures the damping ratio of a pendulum to be exactly 1.0.",
    question: "What special condition is this, and what does it mean for the motion?",
    options: [
      "Underdamped - oscillates with slowly decreasing amplitude",
      "Critical damping - returns to equilibrium fastest without oscillating",
      "Overdamped - returns very slowly without oscillating",
      "No damping - oscillates forever at constant amplitude"
    ],
    correct: 1,
    explanation: "Damping ratio ζ = 1 is exactly critical damping. This is the boundary between oscillatory (underdamped, ζ<1) and non-oscillatory (overdamped, ζ>1) motion. Critical damping provides the fastest return to equilibrium without any overshoot or oscillation."
  }
];

const DampingRenderer: React.FC<DampingRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  emitGameEvent = () => {}
}) => {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(testQuestions.length).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Damping simulation state
  const [dampingRatio, setDampingRatio] = useState(0.1);
  const [isOscillating, setIsOscillating] = useState(false);
  const [position, setPosition] = useState(100);
  const [velocity, setVelocity] = useState(0);
  const [time, setTime] = useState(0);
  const [amplitudeHistory, setAmplitudeHistory] = useState<{t: number, amp: number}[]>([]);
  const [medium, setMedium] = useState<'air' | 'water' | 'honey'>('air');

  // Button debounce lock
  const navigationLockRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const isMobile = width < 600;
  const { colors, space, radius, shadows } = design;

  // Get damping type label
  const getDampingType = (ratio: number): DampingType => {
    if (ratio < 1) return 'underdamped';
    if (ratio === 1) return 'critical';
    return 'overdamped';
  };


  // Damping simulation
  useEffect(() => {
    if (!isOscillating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const omega0 = 2 * Math.PI;
    let lastTime = performance.now();
    let simTime = 0;
    let simPosition = position;
    let simVelocity = velocity;
    const newHistory: {t: number, amp: number}[] = [];

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;
      simTime += dt;

      const gamma = dampingRatio * omega0;
      const acceleration = -2 * gamma * simVelocity - omega0 * omega0 * simPosition;
      simVelocity += acceleration * dt;
      simPosition += simVelocity * dt;

      setPosition(simPosition);
      setVelocity(simVelocity);
      setTime(simTime);

      if (newHistory.length === 0 || simTime - newHistory[newHistory.length - 1].t > 0.1) {
        newHistory.push({ t: simTime, amp: Math.abs(simPosition) });
        setAmplitudeHistory([...newHistory]);
      }

      if ((Math.abs(simPosition) < 0.5 && Math.abs(simVelocity) < 0.5) || simTime > 15) {
        setIsOscillating(false);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOscillating, dampingRatio]);

  // Update damping ratio based on medium
  useEffect(() => {
    if (medium === 'air') setDampingRatio(0.1);
    else if (medium === 'water') setDampingRatio(0.5);
    else if (medium === 'honey') setDampingRatio(2.0);
  }, [medium]);

  const startOscillation = useCallback(() => {
    setPosition(100);
    setVelocity(0);
    setTime(0);
    setAmplitudeHistory([]);
    setIsOscillating(true);
  }, []);

  const stopOscillation = useCallback(() => {
    setIsOscillating(false);
    setPosition(100);
    setVelocity(0);
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    emitGameEvent('phase_change', { from: phase, to: newPhase });
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, emitGameEvent]);

  // ============ HELPER FUNCTIONS ============

  // Progress bar
  const renderProgressBar = () => {
    const currentIdx = phases.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.xs,
        padding: `${space.md} ${space.lg}`,
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`
      }}>
        {phases.map((p, idx) => (
          <div
            key={p}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: radius.full,
              background: idx <= currentIdx
                ? `linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight})`
                : colors.bgTertiary,
              transition: 'all 0.4s ease',
              boxShadow: idx <= currentIdx ? shadows.glow(colors.primary) : 'none'
            }}
          />
        ))}
        <span style={{
          marginLeft: space.md,
          fontSize: '13px',
          color: colors.textSecondary,
          fontWeight: 600,
          minWidth: '48px'
        }}>
          {currentIdx + 1}/{phases.length}
        </span>
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = (onNext: () => void, nextLabel: string = 'Continue', disabled: boolean = false) => {
    return (
      <div style={{
        padding: `${space.lg} ${space.xl}`,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button
          onMouseDown={() => !disabled && onNext()}
          style={{
            padding: `${space.md} ${space.xl}`,
            fontSize: '15px',
            fontWeight: 700,
            color: disabled ? colors.textTertiary : colors.textInverse,
            background: disabled
              ? colors.bgTertiary
              : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
            border: 'none',
            borderRadius: radius.md,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: disabled ? 0.5 : 1,
            boxShadow: disabled ? 'none' : shadows.md,
            letterSpacing: '0.3px'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Section header
  const renderSectionHeader = (icon: string, title: string, subtitle?: string) => {
    return (
      <div style={{ marginBottom: space.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.md, marginBottom: space.sm }}>
          <span style={{ fontSize: '28px' }}>{icon}</span>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: colors.textPrimary,
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            {title}
          </h2>
        </div>
        {subtitle && (
          <p style={{
            fontSize: '15px',
            color: colors.textSecondary,
            margin: 0,
            lineHeight: 1.6
          }}>
            {subtitle}
          </p>
        )}
      </div>
    );
  };

  // Key takeaway box
  const renderKeyTakeaway = (text: string) => {
    return (
      <div style={{
        padding: `${space.lg} ${space.lg}`,
        background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`,
        borderRadius: radius.lg,
        border: `1px solid ${colors.primary}40`,
        marginTop: space.lg
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: space.md }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: colors.primary,
              marginBottom: space.xs,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Key Takeaway
            </div>
            <p style={{
              fontSize: '15px',
              color: colors.textPrimary,
              margin: 0,
              lineHeight: 1.7
            }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Oscillator visualization
  const renderOscillator = (showControls: boolean = true, compact: boolean = false) => {
    const svgWidth = compact ? 280 : 380;
    const svgHeight = compact ? 180 : 220;
    const centerY = svgHeight / 2;
    const equilibriumX = svgWidth / 2;

    const displayX = equilibriumX + (position * 1.2);
    const massSize = 32;

    const springCoils = 8;
    const springWidth = displayX - 50;

    const mediumColor = medium === 'air' ? 'transparent' : medium === 'water' ? `${colors.accent}15` : `${colors.warning}15`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: space.md }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{
            background: `linear-gradient(180deg, ${colors.bgTertiary} 0%, ${colors.bgSecondary} 100%)`,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`
          }}
        >
          {/* Medium indicator */}
          <rect
            x="0" y={centerY - 45}
            width={svgWidth} height="90"
            fill={mediumColor}
          />
          <text x="12" y="20" fill={colors.textTertiary} fontSize="12" fontWeight="500">
            Medium: {medium.charAt(0).toUpperCase() + medium.slice(1)}
          </text>

          {/* Wall */}
          <rect x="0" y={centerY - 45} width="22" height="90" fill={colors.border} rx="4" />
          <line x1="22" y1={centerY - 45} x2="22" y2={centerY + 45} stroke={colors.borderLight} strokeWidth="2" />

          {/* Spring (zigzag) */}
          <path
            d={(() => {
              let path = `M 22 ${centerY}`;
              const coilWidth = Math.max(springWidth / springCoils, 5);
              for (let i = 0; i < springCoils; i++) {
                const x1 = 22 + (i + 0.25) * coilWidth;
                const x2 = 22 + (i + 0.75) * coilWidth;
                const y1 = centerY + (i % 2 === 0 ? 18 : -18);
                const y2 = centerY + (i % 2 === 0 ? -18 : 18);
                path += ` L ${x1} ${y1} L ${x2} ${y2}`;
              }
              path += ` L ${displayX - massSize / 2} ${centerY}`;
              return path;
            })()}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Mass glow */}
          <rect
            x={displayX - massSize / 2 - 6}
            y={centerY - massSize / 2 - 6}
            width={massSize + 12}
            height={massSize + 12}
            rx="10"
            fill={`${colors.accent}20`}
          />

          {/* Mass */}
          <rect
            x={displayX - massSize / 2}
            y={centerY - massSize / 2}
            width={massSize}
            height={massSize}
            rx="6"
            fill={colors.accent}
            stroke={colors.textPrimary}
            strokeWidth="2"
          />

          {/* Equilibrium line */}
          <line
            x1={equilibriumX}
            y1={centerY - 55}
            x2={equilibriumX}
            y2={centerY + 55}
            stroke={colors.textTertiary}
            strokeWidth="1"
            strokeDasharray="6,4"
          />
          <text x={equilibriumX} y={centerY + 70} fill={colors.textTertiary} fontSize="11" textAnchor="middle">
            Equilibrium
          </text>

          {/* Damping type indicator */}
          <text x={svgWidth - 12} y="20" fill={colors.primary} fontSize="13" textAnchor="end" fontWeight="700">
            {getDampingType(dampingRatio) === 'underdamped' ? '〰️ Underdamped' :
             getDampingType(dampingRatio) === 'critical' ? '⚡ Critical' : '🐢 Overdamped'}
          </text>
          <text x={svgWidth - 12} y="38" fill={colors.textSecondary} fontSize="12" textAnchor="end">
            ζ = {dampingRatio.toFixed(2)}
          </text>
        </svg>

        {showControls && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: space.md,
            width: '100%',
            maxWidth: '360px',
            padding: space.md,
            background: colors.bgSecondary,
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`
          }}>
            {/* Damping slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '90px', fontWeight: 500 }}>Damping (ζ):</span>
              <input
                type="range"
                min="0.05"
                max="2"
                step="0.05"
                value={dampingRatio}
                onChange={(e) => {
                  setDampingRatio(Number(e.target.value));
                  stopOscillation();
                }}
                style={{ flex: 1, accentColor: colors.primary }}
              />
              <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '45px', fontWeight: 600 }}>
                {dampingRatio.toFixed(2)}
              </span>
            </div>

            {/* Action button */}
            <button
              onMouseDown={() => isOscillating ? stopOscillation() : startOscillation()}
              style={{
                padding: `${space.md} ${space.md}`,
                fontSize: '14px',
                fontWeight: 700,
                color: colors.textPrimary,
                background: isOscillating
                  ? `linear-gradient(135deg, ${colors.danger}, #dc2626)`
                  : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                border: 'none',
                borderRadius: radius.sm,
                cursor: 'pointer',
                boxShadow: shadows.sm
              }}
            >
              {isOscillating ? '⏹ Stop' : '▶ Release Mass'}
            </button>

            {/* Damping type indicator */}
            <div style={{
              padding: space.md,
              background: getDampingType(dampingRatio) === 'critical' ? `${colors.success}15` : colors.bgTertiary,
              borderRadius: radius.sm,
              border: `1px solid ${getDampingType(dampingRatio) === 'critical' ? colors.success : colors.border}`,
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: '13px',
                color: getDampingType(dampingRatio) === 'critical' ? colors.success : colors.textSecondary,
                fontWeight: getDampingType(dampingRatio) === 'critical' ? 600 : 400
              }}>
                {getDampingType(dampingRatio) === 'underdamped' && 'ζ < 1: System oscillates with decaying amplitude'}
                {getDampingType(dampingRatio) === 'critical' && 'ζ = 1: Fastest return without oscillation!'}
                {getDampingType(dampingRatio) === 'overdamped' && 'ζ > 1: Slow return, no oscillation'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Amplitude decay graph
  const renderAmplitudeGraph = () => {
    if (amplitudeHistory.length < 2) return null;

    const graphWidth = 300;
    const graphHeight = 140;
    const maxT = Math.max(10, ...amplitudeHistory.map(h => h.t));
    const maxAmp = 100;

    return (
      <div style={{
        marginTop: space.md,
        padding: space.md,
        background: colors.bgSecondary,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`
      }}>
        <h4 style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: space.md, fontWeight: 600 }}>
          📈 Amplitude vs Time
        </h4>
        <svg width={graphWidth} height={graphHeight} style={{ background: colors.bgPrimary, borderRadius: radius.sm }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(frac => (
            <line
              key={frac}
              x1="40" y1={graphHeight - frac * (graphHeight - 20)}
              x2={graphWidth - 10} y2={graphHeight - frac * (graphHeight - 20)}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          ))}

          {/* Axes */}
          <line x1="40" y1="10" x2="40" y2={graphHeight - 10} stroke={colors.textSecondary} strokeWidth="1" />
          <line x1="40" y1={graphHeight - 10} x2={graphWidth - 10} y2={graphHeight - 10} stroke={colors.textSecondary} strokeWidth="1" />

          {/* Labels */}
          <text x="15" y={graphHeight / 2} fill={colors.textTertiary} fontSize="10" transform={`rotate(-90, 15, ${graphHeight / 2})`} textAnchor="middle">
            Amplitude
          </text>
          <text x={(graphWidth - 40) / 2 + 40} y={graphHeight - 2} fill={colors.textTertiary} fontSize="10" textAnchor="middle">
            Time (s)
          </text>

          {/* Data line */}
          <polyline
            points={amplitudeHistory.map(h => {
              const x = 40 + (h.t / maxT) * (graphWidth - 50);
              const y = graphHeight - 10 - (h.amp / maxAmp) * (graphHeight - 20);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
          />

          {/* Theoretical envelope for underdamped */}
          {dampingRatio < 1 && (
            <path
              d={(() => {
                const omega0 = 2 * Math.PI;
                const gamma = dampingRatio * omega0;
                let path = '';
                for (let t = 0; t <= maxT; t += 0.1) {
                  const amp = 100 * Math.exp(-gamma * t);
                  const x = 40 + (t / maxT) * (graphWidth - 50);
                  const y = graphHeight - 10 - (amp / maxAmp) * (graphHeight - 20);
                  path += (t === 0 ? 'M' : 'L') + `${x},${y}`;
                }
                return path;
              })()}
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}
        </svg>
        <p style={{ fontSize: '11px', color: colors.textTertiary, marginTop: space.sm, textAlign: 'center' }}>
          Pink: measured amplitude • Cyan dashed: theoretical envelope e^(-γt)
        </p>
      </div>
    );
  };

  // ============ PHASE RENDERS ============

  // Hook phase - Premium welcome screen
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: `radial-gradient(ellipse at top, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 70%)`
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        padding: isMobile ? space.lg : space.xxl,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          {/* Animated icon with glow */}
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 32px',
            borderRadius: radius.full,
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.glow(colors.primary),
            border: `2px solid ${colors.primary}30`
          }}>
            <span style={{ fontSize: '56px' }}>〰️</span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: isMobile ? '32px' : '42px',
            fontWeight: 800,
            color: colors.textPrimary,
            marginBottom: space.md,
            lineHeight: 1.1,
            letterSpacing: '-1px'
          }}>
            Why Do Swings Stop?
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '18px',
            color: colors.textSecondary,
            marginBottom: space.xl,
            lineHeight: 1.7
          }}>
            You push a child on a swing once and walk away. What happens next?
          </p>

          {/* Question card */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.bgTertiary}, ${colors.bgSecondary})`,
            borderRadius: radius.xl,
            padding: space.xl,
            marginBottom: space.xl,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.lg
          }}>
            <p style={{
              fontSize: '22px',
              color: colors.primary,
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.4
            }}>
              Will the swing keep going forever?
            </p>
            <p style={{
              fontSize: '16px',
              color: colors.textSecondary,
              marginTop: space.md
            }}>
              Or is there something that steals its energy?
            </p>
          </div>

          {/* Examples */}
          <div style={{
            display: 'flex',
            gap: space.md,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {['🎢 Swings', '🎸 Guitar strings', '🔔 Bells', '🚗 Car bumps'].map((item, idx) => (
              <div key={idx} style={{
                padding: `${space.md} ${space.lg}`,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: '14px',
                color: colors.textSecondary,
                fontWeight: 500
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Premium CTA */}
      <div style={{
        padding: `${space.lg} ${space.xl}`,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          onMouseDown={() => goToPhase('predict')}
          style={{
            padding: `${space.md} ${space.xxl}`,
            fontSize: '16px',
            fontWeight: 700,
            color: colors.textInverse,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
            border: 'none',
            borderRadius: radius.md,
            cursor: 'pointer',
            boxShadow: `${shadows.md}, ${shadows.glow(colors.primary)}`,
            letterSpacing: '0.5px'
          }}
        >
          Explore Damping →
        </button>
      </div>
    </div>
  );

  // Predict phase
  const renderPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
        {renderSectionHeader('🤔', 'Your Prediction', 'A mass on a spring is pulled and released in air...')}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
          maxWidth: '520px',
          margin: '0 auto'
        }}>
          {[
            { id: 'forever', label: 'It oscillates forever at constant amplitude', icon: '♾️' },
            { id: 'decay_linear', label: 'Amplitude decreases steadily (linear decay)', icon: '📉' },
            { id: 'decay_exp', label: 'Amplitude decreases faster at first, then slower (exponential)', icon: '📈' },
            { id: 'stops_sudden', label: 'It stops suddenly after a few swings', icon: '⏹️' }
          ].map(option => (
            <button
              key={option.id}
              onMouseDown={() => setPrediction(option.id)}
              style={{
                padding: `${space.lg} ${space.lg}`,
                fontSize: '15px',
                fontWeight: prediction === option.id ? 700 : 500,
                color: prediction === option.id ? colors.textInverse : colors.textPrimary,
                background: prediction === option.id
                  ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                  : colors.bgSecondary,
                border: `2px solid ${prediction === option.id ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: space.md,
                transition: 'all 0.2s ease',
                boxShadow: prediction === option.id ? shadows.md : 'none'
              }}
            >
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        <div style={{
          marginTop: space.xl,
          padding: space.lg,
          background: colors.bgSecondary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: colors.textPrimary }}>Consider:</strong> Where does the energy go? The spring stores potential energy, the mass has kinetic energy... can energy just disappear?
          </p>
        </div>
      </div>
      {renderBottomBar(() => goToPhase('play'), 'Test It!', !prediction)}
    </div>
  );

  // Play phase
  const renderPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
        {renderSectionHeader('🔬', 'Experiment', 'Watch how oscillation amplitude changes over time')}

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: space.lg,
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            {renderOscillator(true)}
            {renderAmplitudeGraph()}
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              marginBottom: space.md
            }}>
              <h4 style={{
                fontSize: '15px',
                color: colors.primary,
                marginBottom: space.md,
                fontWeight: 700
              }}>
                🎯 Explore
              </h4>
              <ol style={{
                margin: 0,
                paddingLeft: space.lg,
                color: colors.textSecondary,
                fontSize: '14px',
                lineHeight: 2
              }}>
                <li>Start with low damping (ζ ≈ 0.1)</li>
                <li>Release the mass and watch amplitude decay</li>
                <li>Increase damping to ζ = 1 (critical)</li>
                <li>Try ζ {'>'} 1 (overdamped) - what happens?</li>
              </ol>
            </div>

            <div style={{
              padding: space.md,
              background: colors.bgTertiary,
              borderRadius: radius.sm,
              marginBottom: space.md
            }}>
              <h4 style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: space.sm, fontWeight: 600 }}>
                Damping Types:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
                <div style={{
                  padding: `${space.sm} ${space.md}`,
                  background: dampingRatio < 1 ? `${colors.primary}20` : colors.bgSecondary,
                  borderRadius: radius.sm,
                  fontSize: '13px',
                  color: colors.textPrimary,
                  fontWeight: dampingRatio < 1 ? 600 : 400
                }}>
                  <strong>ζ {'<'} 1:</strong> Underdamped (oscillates)
                </div>
                <div style={{
                  padding: `${space.sm} ${space.md}`,
                  background: dampingRatio === 1 ? `${colors.success}20` : colors.bgSecondary,
                  borderRadius: radius.sm,
                  fontSize: '13px',
                  color: colors.textPrimary,
                  fontWeight: dampingRatio === 1 ? 600 : 400
                }}>
                  <strong>ζ = 1:</strong> Critical (fastest without oscillation)
                </div>
                <div style={{
                  padding: `${space.sm} ${space.md}`,
                  background: dampingRatio > 1 ? `${colors.accent}20` : colors.bgSecondary,
                  borderRadius: radius.sm,
                  fontSize: '13px',
                  color: colors.textPrimary,
                  fontWeight: dampingRatio > 1 ? 600 : 400
                }}>
                  <strong>ζ {'>'} 1:</strong> Overdamped (slow return)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {renderBottomBar(() => {
        setShowResult(true);
        goToPhase('review');
      }, 'See Analysis')}
    </div>
  );

  // Review phase
  const renderReview = () => {
    const wasCorrect = prediction === 'decay_exp';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
          {/* Result banner */}
          <div style={{
            padding: space.xl,
            background: wasCorrect
              ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
              : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
            borderRadius: radius.lg,
            border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
            marginBottom: space.xl,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎉' : '💡'}</span>
            <h3 style={{
              fontSize: '22px',
              color: wasCorrect ? colors.success : colors.accent,
              marginTop: space.md,
              fontWeight: 700
            }}>
              {wasCorrect ? 'Correct! Exponential decay it is!' : 'The amplitude decays exponentially!'}
            </h3>
          </div>

          {renderSectionHeader('📚', 'The Physics of Damping', 'Energy dissipation and the damping equation')}

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: space.md,
            marginBottom: space.xl
          }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{
                fontSize: '15px',
                color: colors.primary,
                marginBottom: space.md,
                display: 'flex',
                alignItems: 'center',
                gap: space.sm,
                fontWeight: 700
              }}>
                <span>🔋</span> Energy Loss
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                Damping forces (friction, air resistance) are proportional to velocity: <strong style={{ color: colors.textPrimary }}>F_d = -bv</strong>. They convert kinetic energy to heat.
              </p>
            </div>

            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <h4 style={{
                fontSize: '15px',
                color: colors.accent,
                marginBottom: space.md,
                display: 'flex',
                alignItems: 'center',
                gap: space.sm,
                fontWeight: 700
              }}>
                <span>📉</span> Exponential Decay
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                The amplitude follows <strong style={{ color: colors.textPrimary }}>A(t) = A₀ e^(-γt)</strong>. Each cycle loses the same fraction of energy, causing exponential decay.
              </p>
            </div>
          </div>

          {/* Formula highlight */}
          <div style={{
            padding: space.xl,
            background: colors.bgTertiary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.primary}30`,
            marginBottom: space.xl
          }}>
            <h4 style={{ fontSize: '16px', color: colors.textPrimary, marginBottom: space.md, textAlign: 'center', fontWeight: 700 }}>
              The Damped Oscillator Equation
            </h4>
            <div style={{
              fontSize: '24px',
              color: colors.primary,
              fontWeight: 700,
              textAlign: 'center',
              padding: space.lg,
              background: colors.bgPrimary,
              borderRadius: radius.sm,
              fontFamily: 'monospace'
            }}>
              x'' + 2ζω₀x' + ω₀²x = 0
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: space.xl, marginTop: space.md, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                <strong style={{ color: colors.primary }}>ζ</strong> = damping ratio
              </span>
              <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                <strong style={{ color: colors.primary }}>ω₀</strong> = natural frequency
              </span>
            </div>
          </div>

          {/* Damping types */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: space.md,
            marginBottom: space.xl
          }}>
            {[
              { type: 'Underdamped', condition: 'ζ < 1', desc: 'Oscillates with decreasing amplitude', icon: '〰️', color: colors.primary },
              { type: 'Critical', condition: 'ζ = 1', desc: 'Fastest return, no oscillation', icon: '⚡', color: colors.success },
              { type: 'Overdamped', condition: 'ζ > 1', desc: 'Slow return, no oscillation', icon: '🐢', color: colors.accent }
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: space.lg,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${item.color}40`,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', marginBottom: space.sm }}>{item.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: item.color }}>{item.type}</div>
                <div style={{ fontSize: '13px', color: colors.textSecondary, margin: `${space.xs} 0` }}>{item.condition}</div>
                <div style={{ fontSize: '12px', color: colors.textTertiary }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {renderKeyTakeaway('Damping is nature\'s way of dissipating energy. The damping ratio ζ determines whether the system oscillates (underdamped), returns fastest (critical), or creeps back slowly (overdamped). Most real systems are slightly underdamped for quick response with acceptable overshoot.')}
        </div>
        {renderBottomBar(() => goToPhase('twist_predict'), 'Explore the Twist')}
      </div>
    );
  };

  // Twist Predict phase
  const renderTwistPredict = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
        {renderSectionHeader('🌀', 'The Twist', 'What if we change the medium?')}

        <div style={{
          padding: space.lg,
          background: colors.bgTertiary,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`,
          marginBottom: space.xl
        }}>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>
            You've seen damping in air. What happens if we put the same oscillator in <strong style={{ color: colors.textPrimary }}>water</strong> or even <strong style={{ color: colors.textPrimary }}>honey</strong>?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
          maxWidth: '520px',
          margin: '0 auto'
        }}>
          {[
            { id: 'same', label: 'Same behavior - medium doesn\'t matter', icon: '⚖️' },
            { id: 'faster_decay', label: 'Faster decay but still oscillates', icon: '📉' },
            { id: 'may_not_oscillate', label: 'May not oscillate at all in thick fluids', icon: '🐢' },
            { id: 'faster_oscillation', label: 'Oscillates faster in thicker fluids', icon: '⚡' }
          ].map(option => (
            <button
              key={option.id}
              onMouseDown={() => setTwistPrediction(option.id)}
              style={{
                padding: `${space.lg} ${space.lg}`,
                fontSize: '15px',
                fontWeight: twistPrediction === option.id ? 700 : 500,
                color: twistPrediction === option.id ? colors.textInverse : colors.textPrimary,
                background: twistPrediction === option.id
                  ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`
                  : colors.bgSecondary,
                border: `2px solid ${twistPrediction === option.id ? colors.accent : colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: space.md,
                transition: 'all 0.2s ease',
                boxShadow: twistPrediction === option.id ? shadows.md : 'none'
              }}
            >
              <span style={{ fontSize: '28px' }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {renderBottomBar(() => goToPhase('twist_play'), 'Try Different Media', !twistPrediction)}
    </div>
  );

  // Twist Play phase
  const renderTwistPlay = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: colors.bgPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
        {renderSectionHeader('🔬', 'Medium Experiment', 'Compare oscillation in air, water, and honey')}

        {/* Medium selector */}
        <div style={{
          display: 'flex',
          gap: space.md,
          marginBottom: space.lg,
          justifyContent: 'center'
        }}>
          {[
            { id: 'air', label: '💨 Air', zeta: '0.1' },
            { id: 'water', label: '💧 Water', zeta: '0.5' },
            { id: 'honey', label: '🍯 Honey', zeta: '2.0' }
          ].map(m => (
            <button
              key={m.id}
              onMouseDown={() => {
                setMedium(m.id as 'air' | 'water' | 'honey');
                stopOscillation();
              }}
              style={{
                padding: `${space.md} ${space.xl}`,
                fontSize: '14px',
                fontWeight: medium === m.id ? 700 : 500,
                color: medium === m.id ? colors.textInverse : colors.textPrimary,
                background: medium === m.id
                  ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`
                  : colors.bgSecondary,
                border: `2px solid ${medium === m.id ? colors.accent : colors.border}`,
                borderRadius: radius.md,
                cursor: 'pointer'
              }}
            >
              {m.label}
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 400, marginTop: space.xs, opacity: 0.8 }}>
                ζ ≈ {m.zeta}
              </span>
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: space.lg,
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            {renderOscillator(true)}
            {renderAmplitudeGraph()}
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              marginBottom: space.md
            }}>
              <h4 style={{
                fontSize: '15px',
                color: colors.accent,
                marginBottom: space.md,
                fontWeight: 700
              }}>
                🎯 Compare
              </h4>
              <ol style={{
                margin: 0,
                paddingLeft: space.lg,
                color: colors.textSecondary,
                fontSize: '14px',
                lineHeight: 2
              }}>
                <li>Release in air - count oscillations</li>
                <li>Switch to water - compare behavior</li>
                <li>Try honey - does it oscillate at all?</li>
                <li>Notice the amplitude decay rate</li>
              </ol>
            </div>

            <div style={{
              padding: space.md,
              background: medium === 'honey' ? `${colors.warning}15` : colors.bgTertiary,
              borderRadius: radius.sm,
              border: `1px solid ${medium === 'honey' ? colors.warning : colors.border}`
            }}>
              <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: colors.textPrimary }}>Current medium:</strong> {medium.charAt(0).toUpperCase() + medium.slice(1)}<br />
                <strong style={{ color: colors.textPrimary }}>Damping ratio:</strong> ζ = {dampingRatio.toFixed(2)}<br />
                <strong style={{ color: colors.textPrimary }}>Type:</strong> {
                  getDampingType(dampingRatio) === 'underdamped' ? 'Underdamped (will oscillate)' :
                  getDampingType(dampingRatio) === 'critical' ? 'Critical (no oscillation)' :
                  'Overdamped (very slow, no oscillation)'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
      {renderBottomBar(() => {
        setShowTwistResult(true);
        goToPhase('twist_review');
      }, 'See Analysis')}
    </div>
  );

  // Twist Review phase
  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'may_not_oscillate';

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.lg : space.xl, overflowY: 'auto' }}>
          <div style={{
            padding: space.xl,
            background: wasCorrect
              ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
              : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
            borderRadius: radius.lg,
            border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
            marginBottom: space.xl,
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎯' : '💡'}</span>
            <h3 style={{
              fontSize: '22px',
              color: wasCorrect ? colors.success : colors.accent,
              marginTop: space.md,
              fontWeight: 700
            }}>
              {wasCorrect ? 'Spot on! High viscosity can prevent oscillation!' : 'Viscous fluids can overdamp the system!'}
            </h3>
          </div>

          {renderSectionHeader('📊', 'Viscosity and Damping', 'How fluid properties affect oscillation')}

          {/* Medium comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: space.md,
            marginBottom: space.xl
          }}>
            {[
              { medium: 'Air', icon: '💨', viscosity: '~18 μPa·s', behavior: 'Low damping, many oscillations', zeta: '~0.01-0.1', color: colors.textSecondary },
              { medium: 'Water', icon: '💧', viscosity: '~1000 μPa·s', behavior: 'Moderate damping, few oscillations', zeta: '~0.3-0.7', color: '#3b82f6' },
              { medium: 'Honey', icon: '🍯', viscosity: '~10⁷ μPa·s', behavior: 'High damping, no oscillation', zeta: '>1', color: colors.warning }
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: space.lg,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ fontSize: '40px', marginBottom: space.md, textAlign: 'center' }}>{item.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: item.color, textAlign: 'center', marginBottom: space.sm }}>
                  {item.medium}
                </div>
                <div style={{ fontSize: '12px', color: colors.textTertiary, textAlign: 'center', marginBottom: space.sm }}>
                  η ≈ {item.viscosity}
                </div>
                <div style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', marginBottom: space.xs }}>
                  {item.behavior}
                </div>
                <div style={{ fontSize: '13px', color: colors.primary, textAlign: 'center', fontWeight: 600 }}>
                  ζ {item.zeta}
                </div>
              </div>
            ))}
          </div>

          {/* Formula */}
          <div style={{
            padding: space.lg,
            background: colors.bgSecondary,
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            marginBottom: space.lg
          }}>
            <h4 style={{ fontSize: '15px', color: colors.textPrimary, marginBottom: space.md, fontWeight: 700 }}>
              📐 The Damping Coefficient
            </h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
              The damping coefficient <strong style={{ color: colors.primary }}>b</strong> relates to fluid viscosity, object shape, and size. For a sphere in viscous fluid: <strong style={{ color: colors.textPrimary }}>b = 6πηr</strong> (Stokes drag). Higher viscosity → higher b → higher damping ratio ζ.
            </p>
          </div>

          {renderKeyTakeaway('The same oscillator can be underdamped, critically damped, or overdamped depending on the surrounding medium. This is why car shock absorbers use oil with specific viscosity - change the oil and you change the ride quality!')}
        </div>
        {renderBottomBar(() => goToPhase('transfer'), 'See Real Applications')}
      </div>
    );
  };

  // Transfer phase - Real-world applications
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];
    const canTakeQuiz = completedApps.size >= realWorldApps.length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
          {renderSectionHeader('🌍', 'Real-World Applications', 'Damping engineering in everyday life')}

          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            marginBottom: space.md
          }}>
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>
              {completedApps.size} of {realWorldApps.length} completed
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {realWorldApps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: completedApps.has(idx) ? colors.success : idx === activeApp ? colors.primary : colors.bgTertiary,
                    transition: 'background 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{
            display: 'flex',
            gap: space.sm,
            marginBottom: space.lg,
            overflowX: 'auto',
            paddingBottom: space.sm
          }}>
            {realWorldApps.map((a, idx) => {
              const isCompleted = completedApps.has(idx);
              const isUnlocked = idx === 0 || completedApps.has(idx - 1);
              const isCurrent = idx === activeApp;
              return (
                <button
                  key={idx}
                  onMouseDown={() => {
                    if (!isUnlocked || navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    setActiveApp(idx);
                    setTimeout(() => { navigationLockRef.current = false; }, 300);
                  }}
                  style={{
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? colors.textInverse : isCompleted ? colors.success : colors.textSecondary,
                    background: isCurrent
                      ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)`
                      : isCompleted ? `${colors.success}15` : colors.bgSecondary,
                    border: `1px solid ${isCurrent ? a.color : isCompleted ? colors.success : colors.border}`,
                    borderRadius: radius.sm,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    boxShadow: isCurrent ? shadows.sm : 'none',
                    opacity: isUnlocked ? 1 : 0.5
                  }}
                >
                  {isCompleted ? '✓ ' : ''}{a.icon} {a.title}
                </button>
              );
            })}
          </div>

          {/* Application content card */}
          <div style={{
            background: colors.bgSecondary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: space.xl,
              background: `linear-gradient(135deg, ${app.color}20, transparent)`,
              borderBottom: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.lg, marginBottom: space.md }}>
                <span style={{ fontSize: '56px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ fontSize: '24px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>
                    {app.title}
                  </h3>
                  <p style={{ fontSize: '16px', color: app.color, margin: `${space.xs} 0 0`, fontWeight: 600 }}>
                    {app.tagline}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.description}
              </p>
            </div>

            {/* Connection */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: app.color, marginBottom: space.sm, fontWeight: 700 }}>
                🔗 Connection to Damping
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            {/* How it works */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderBottom: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: space.sm, fontWeight: 700 }}>
                ⚙️ How It Works
              </h4>
              <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: colors.border
            }}>
              {app.stats.map((stat, idx) => (
                <div key={idx} style={{
                  padding: space.lg,
                  background: colors.bgTertiary,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: space.xs }}>{stat.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: colors.textTertiary, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Examples */}
            <div style={{ padding: `${space.lg} ${space.xl}`, borderTop: `1px solid ${colors.border}` }}>
              <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: space.md, fontWeight: 700 }}>
                📍 Examples
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm }}>
                {app.examples.map((ex, idx) => (
                  <span key={idx} style={{
                    padding: `${space.sm} ${space.md}`,
                    fontSize: '13px',
                    color: colors.textSecondary,
                    background: colors.bgPrimary,
                    borderRadius: radius.full,
                    border: `1px solid ${colors.border}`
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            {/* Companies */}
            <div style={{
              padding: `${space.md} ${space.xl}`,
              background: colors.bgTertiary,
              display: 'flex',
              alignItems: 'center',
              gap: space.sm,
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '12px', color: colors.textTertiary, fontWeight: 500 }}>Key players:</span>
              {app.companies.map((company, idx) => (
                <span key={idx} style={{
                  padding: `${space.xs} ${space.md}`,
                  fontSize: '12px',
                  color: colors.textSecondary,
                  background: colors.bgSecondary,
                  borderRadius: radius.xs,
                  border: `1px solid ${colors.border}`
                }}>
                  {company}
                </span>
              ))}
            </div>

            {/* Mark as Read Button */}
            <div style={{ padding: space.lg, borderTop: `1px solid ${colors.border}` }}>
              {!completedApps.has(activeApp) ? (
                <button
                  onMouseDown={() => {
                    if (navigationLockRef.current) return;
                    navigationLockRef.current = true;
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    if (activeApp < realWorldApps.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                    setTimeout(() => { navigationLockRef.current = false; }, 400);
                  }}
                  style={{
                    width: '100%',
                    padding: space.lg,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: colors.textInverse,
                    background: colors.success,
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: 'pointer'
                  }}
                >
                  ✓ Mark "{app.title}" as Read
                </button>
              ) : (
                <div style={{
                  padding: space.lg,
                  background: `${colors.success}15`,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.success}40`,
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '15px', color: colors.success, fontWeight: 600 }}>
                    ✓ Completed
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{
          padding: `${space.lg} ${space.xl}`,
          background: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onMouseDown={() => goToPhase('twist_review')}
            style={{
              padding: `${space.md} ${space.xl}`,
              fontSize: '14px',
              color: colors.textSecondary,
              background: 'transparent',
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
          {canTakeQuiz ? (
            <button
              onMouseDown={() => goToPhase('test')}
              style={{
                padding: `${space.md} ${space.xxl}`,
                fontSize: '15px',
                fontWeight: 600,
                color: colors.textInverse,
                background: colors.success,
                border: 'none',
                borderRadius: radius.md,
                cursor: 'pointer',
                boxShadow: shadows.sm
              }}
            >
              Take the Quiz →
            </button>
          ) : (
            <div style={{
              padding: `${space.md} ${space.xl}`,
              fontSize: '14px',
              color: colors.textTertiary,
              background: colors.bgTertiary,
              borderRadius: radius.md
            }}>
              Complete all applications to unlock quiz
            </div>
          )}
        </div>
      </div>
    );
  };

  // Test phase
  const renderTest = () => {
    const currentQ = testQuestions[currentQuestionIndex];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: colors.bgPrimary
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, padding: isMobile ? space.md : space.lg, overflowY: 'auto' }}>
          {!showTestResults ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: space.lg
              }}>
                <h2 style={{ fontSize: '22px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>
                  📝 Knowledge Check
                </h2>
                <span style={{
                  padding: `${space.sm} ${space.md}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.textSecondary,
                  background: colors.bgSecondary,
                  borderRadius: radius.full
                }}>
                  {currentQuestionIndex + 1} / {testQuestions.length}
                </span>
              </div>

              {/* Question navigation dots */}
              <div style={{
                display: 'flex',
                gap: space.sm,
                marginBottom: space.lg,
                justifyContent: 'center'
              }}>
                {testQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => setCurrentQuestionIndex(idx)}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: radius.full,
                      border: 'none',
                      cursor: 'pointer',
                      background: idx === currentQuestionIndex
                        ? colors.primary
                        : testAnswers[idx] !== null
                          ? colors.success
                          : colors.bgTertiary,
                      transition: 'all 0.2s ease',
                      boxShadow: idx === currentQuestionIndex ? shadows.glow(colors.primary) : 'none'
                    }}
                  />
                ))}
              </div>

              {/* Scenario */}
              <div style={{
                padding: space.lg,
                background: colors.bgTertiary,
                borderRadius: radius.md,
                marginBottom: space.md,
                borderLeft: `4px solid ${colors.accent}`
              }}>
                <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                  {currentQ.scenario}
                </p>
              </div>

              {/* Question */}
              <div style={{
                padding: space.lg,
                background: colors.bgSecondary,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                marginBottom: space.md
              }}>
                <p style={{ fontSize: '16px', color: colors.textPrimary, margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                  {currentQ.question}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
                {currentQ.options.map((option, idx) => {
                  const isSelected = testAnswers[currentQuestionIndex] === idx;
                  return (
                    <button
                      key={idx}
                      onMouseDown={() => {
                        const newAnswers = [...testAnswers];
                        newAnswers[currentQuestionIndex] = idx;
                        setTestAnswers(newAnswers);
                      }}
                      style={{
                        padding: `${space.md} ${space.lg}`,
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? colors.textInverse : colors.textPrimary,
                        background: isSelected
                          ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                          : colors.bgSecondary,
                        border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                        borderRadius: radius.md,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: space.md
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: radius.full,
                        background: isSelected ? colors.bgPrimary : colors.bgTertiary,
                        color: isSelected ? colors.primary : colors.textTertiary,
                        fontSize: '13px',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span style={{ lineHeight: 1.4 }}>{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: space.xl,
                gap: space.md
              }}>
                <button
                  onMouseDown={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    padding: `${space.md} ${space.lg}`,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: currentQuestionIndex === 0 ? colors.textTertiary : colors.textPrimary,
                    background: colors.bgSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.sm,
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1
                  }}
                >
                  ← Previous
                </button>

                {currentQuestionIndex < testQuestions.length - 1 ? (
                  <button
                    onMouseDown={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    style={{
                      padding: `${space.md} ${space.lg}`,
                      fontSize: '14px',
                      fontWeight: 600,
                      color: colors.textPrimary,
                      background: colors.bgSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.sm,
                      cursor: 'pointer'
                    }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onMouseDown={() => setShowTestResults(true)}
                    disabled={answeredCount < testQuestions.length}
                    style={{
                      padding: `${space.md} ${space.xl}`,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: answeredCount < testQuestions.length ? colors.textTertiary : colors.textInverse,
                      background: answeredCount < testQuestions.length
                        ? colors.bgTertiary
                        : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                      border: 'none',
                      borderRadius: radius.sm,
                      cursor: answeredCount < testQuestions.length ? 'not-allowed' : 'pointer',
                      boxShadow: answeredCount >= testQuestions.length ? shadows.sm : 'none'
                    }}
                  >
                    Submit ({answeredCount}/{testQuestions.length})
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Test Results */}
              {renderSectionHeader('📊', 'Quiz Results', 'Review your answers and learn from any mistakes')}

              {(() => {
                const score = testAnswers.reduce((acc, answer, idx) =>
                  acc + (answer === testQuestions[idx].correct ? 1 : 0), 0);
                const percentage = Math.round((score / testQuestions.length) * 100);

                return (
                  <>
                    <div style={{
                      padding: space.xl,
                      background: percentage >= 70
                        ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
                        : `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}05)`,
                      borderRadius: radius.lg,
                      border: `1px solid ${percentage >= 70 ? colors.success : colors.warning}40`,
                      textAlign: 'center',
                      marginBottom: space.xl
                    }}>
                      <div style={{ fontSize: '56px', fontWeight: 800, color: percentage >= 70 ? colors.success : colors.warning }}>
                        {percentage}%
                      </div>
                      <p style={{ fontSize: '18px', color: colors.textPrimary, margin: `${space.sm} 0 0`, fontWeight: 600 }}>
                        {score} out of {testQuestions.length} correct
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
                      {testQuestions.map((q, idx) => {
                        const isCorrect = testAnswers[idx] === q.correct;
                        return (
                          <div key={idx} style={{
                            padding: space.lg,
                            background: colors.bgSecondary,
                            borderRadius: radius.md,
                            border: `1px solid ${isCorrect ? colors.success : colors.danger}40`
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: space.md,
                              marginBottom: space.md
                            }}>
                              <span style={{
                                fontSize: '20px',
                                color: isCorrect ? colors.success : colors.danger,
                                fontWeight: 700
                              }}>
                                {isCorrect ? '✓' : '✗'}
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                                  Q{idx + 1}: {q.question}
                                </p>
                                {!isCorrect && (
                                  <p style={{ fontSize: '13px', color: colors.danger, margin: `${space.sm} 0 0` }}>
                                    Your answer: {q.options[testAnswers[idx] as number]}
                                  </p>
                                )}
                                <p style={{ fontSize: '13px', color: colors.success, margin: `${space.xs} 0 0`, fontWeight: 500 }}>
                                  Correct: {q.options[q.correct]}
                                </p>
                              </div>
                            </div>
                            <div style={{
                              padding: space.md,
                              background: colors.bgTertiary,
                              borderRadius: radius.sm,
                              fontSize: '13px',
                              color: colors.textSecondary,
                              lineHeight: 1.6
                            }}>
                              💡 {q.explanation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
        {showTestResults && renderBottomBar(() => goToPhase('mastery'), 'Complete Module')}
      </div>
    );
  };

  // Mastery phase
  const renderMastery = () => {
    const score = testAnswers.reduce((acc, answer, idx) =>
      acc + (answer === testQuestions[idx].correct ? 1 : 0), 0);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: `radial-gradient(ellipse at top, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 70%)`
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          padding: isMobile ? space.lg : space.xl,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* Trophy icon */}
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 32px',
            borderRadius: radius.full,
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.glow(colors.primary),
            border: `2px solid ${colors.primary}30`
          }}>
            <span style={{ fontSize: '60px' }}>〰️</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '40px',
            fontWeight: 800,
            color: colors.textPrimary,
            marginBottom: space.md,
            letterSpacing: '-1px'
          }}>
            Damping Mastered!
          </h1>
          <p style={{
            fontSize: '18px',
            color: colors.textSecondary,
            maxWidth: '520px',
            lineHeight: 1.7,
            marginBottom: space.xl
          }}>
            You now understand how energy dissipation shapes oscillation - from swings to skyscrapers!
          </p>

          {/* Achievement cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: space.md,
            width: '100%',
            maxWidth: '640px',
            marginBottom: space.xl
          }}>
            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ fontSize: '36px', marginBottom: space.sm }}>📉</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: colors.primary }}>Exponential Decay</div>
              <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: space.xs }}>A = A₀e^(-γt)</div>
            </div>

            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ fontSize: '36px', marginBottom: space.sm }}>⚡</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: colors.success }}>Critical Damping</div>
              <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: space.xs }}>ζ = 1 (fastest)</div>
            </div>

            <div style={{
              padding: space.lg,
              background: colors.bgSecondary,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ fontSize: '36px', marginBottom: space.sm }}>🎯</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: colors.accent }}>{score}/10</div>
              <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: space.xs }}>Quiz score</div>
            </div>
          </div>

          {/* Key insights */}
          <div style={{
            padding: space.xl,
            background: colors.bgSecondary,
            borderRadius: radius.lg,
            border: `1px solid ${colors.primary}40`,
            maxWidth: '520px',
            width: '100%'
          }}>
            <h4 style={{ fontSize: '16px', color: colors.primary, marginBottom: space.md, fontWeight: 700 }}>
              🧠 Key Insights
            </h4>
            <ul style={{
              textAlign: 'left',
              margin: 0,
              paddingLeft: space.lg,
              color: colors.textSecondary,
              fontSize: '14px',
              lineHeight: 2
            }}>
              <li>Damping converts kinetic energy to heat via friction/viscosity</li>
              <li>Underdamped (ζ{'<'}1): oscillates with decay</li>
              <li>Critical (ζ=1): fastest return without oscillation</li>
              <li>Overdamped (ζ{'>'}1): slow return, no oscillation</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: `${space.lg} ${space.xl}`,
          background: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'center'
        }}>
          {onBack && (
            <button
              onMouseDown={() => {
                if (navigationLockRef.current) return;
                navigationLockRef.current = true;
                onBack();
                setTimeout(() => { navigationLockRef.current = false; }, 400);
              }}
              style={{
                padding: `${space.md} ${space.xxl}`,
                fontSize: '16px',
                fontWeight: 700,
                color: colors.textInverse,
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                border: 'none',
                borderRadius: radius.md,
                cursor: 'pointer',
                boxShadow: `${shadows.md}, ${shadows.glow(colors.primary)}`
              }}
            >
              Back to Topics
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render switch
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
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100vh',
      background: colors.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: colors.textPrimary,
      overflow: 'hidden',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    }}>
      {renderPhase()}
    </div>
  );
};

export default DampingRenderer;
