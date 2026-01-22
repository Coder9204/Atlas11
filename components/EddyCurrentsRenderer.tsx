'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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

const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook',
  1: 'Predict',
  2: 'Lab',
  3: 'Review',
  4: 'Twist Predict',
  5: 'Twist Lab',
  6: 'Twist Review',
  7: 'Transfer',
  8: 'Test',
  9: 'Mastery'
};

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    magnet: '#EF4444',
    eddy: '#3B82F6',
    conductor: '#94A3B8',
    background: {
      primary: '#0F0F1A',
      secondary: '#1A1A2E',
      tertiary: '#252542',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.4)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      secondary: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      warm: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      cool: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
      eddy: 'linear-gradient(135deg, #EF4444 0%, #8B5CF6 100%)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 4px 16px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glow: (color: string) => `0 0 20px ${color}40`,
  },
};

interface EddyCurrentsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  currentPhase?: number;
  onPhaseComplete?: (phase: number) => void;
}

export default function EddyCurrentsRenderer({ onGameEvent, currentPhase, onPhaseComplete }: EddyCurrentsRendererProps) {
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Core State
  const [phase, setPhase] = useState<number>(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase)) return currentPhase;
    return 0;
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Magnetic braking simulation
  const [magnetY, setMagnetY] = useState(50);
  const [magnetVelocity, setMagnetVelocity] = useState(0);
  const [conductorType, setConductorType] = useState<'copper' | 'aluminum' | 'air'>('copper');
  const [isDropping, setIsDropping] = useState(false);
  const [eddyStrength, setEddyStrength] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Pendulum damping
  const [pendulumAngle, setPendulumAngle] = useState(60);
  const [pendulumVelocity, setPendulumVelocity] = useState(0);
  const [dampingEnabled, setDampingEnabled] = useState(false);
  const [isPendulumRunning, setIsPendulumRunning] = useState(false);
  const [swingCount, setSwingCount] = useState(0);
  const pendulumRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "What causes eddy currents to form in a conductor?",
      options: ["Static electric charge", "Changing magnetic field", "Temperature difference", "Direct current"],
      correct: 1,
      explanation: "Eddy currents are induced in conductors when they experience a changing magnetic field, following Faraday's Law of electromagnetic induction."
    },
    {
      question: "According to Lenz's Law, eddy currents create a magnetic field that:",
      options: ["Enhances the original change", "Opposes the change that created them", "Has no effect", "Points in the same direction"],
      correct: 1,
      explanation: "Lenz's Law states that induced currents always create a magnetic field that opposes the change in magnetic flux that induced them."
    },
    {
      question: "Why does a magnet fall slowly through a copper tube?",
      options: ["Air resistance", "Friction", "Eddy currents create opposing magnetic field", "Gravity is weaker inside tubes"],
      correct: 2,
      explanation: "As the magnet falls, it induces eddy currents in the copper. These currents create a magnetic field opposing the magnet's motion, acting as a brake."
    },
    {
      question: "Eddy currents convert kinetic energy into:",
      options: ["Nuclear energy", "Chemical energy", "Heat energy", "Light energy"],
      correct: 2,
      explanation: "The resistance of the conductor causes eddy currents to dissipate energy as heat. This is how electromagnetic braking works - motion energy becomes thermal energy."
    },
    {
      question: "Which material would produce the STRONGEST eddy currents?",
      options: ["Wood", "Glass", "Copper", "Plastic"],
      correct: 2,
      explanation: "Copper is an excellent electrical conductor, so it allows large eddy currents to flow. Non-conductors like wood, glass, and plastic cannot support eddy currents."
    },
    {
      question: "To reduce unwanted eddy currents in transformers, engineers use:",
      options: ["Solid metal cores", "Laminated (layered) cores", "Rubber insulation", "Larger wires"],
      correct: 1,
      explanation: "Laminated cores (thin sheets with insulation between them) break up the path for eddy currents, reducing their magnitude and the energy lost as heat."
    },
    {
      question: "Electromagnetic brakes are preferred over friction brakes because they:",
      options: ["Are cheaper", "Don't wear out from contact", "Are heavier", "Work only at high speeds"],
      correct: 1,
      explanation: "Electromagnetic brakes have no physical contact, so there's no wear on brake pads. They're ideal for applications needing frequent, reliable braking."
    },
    {
      question: "If a magnet moves FASTER through a conductor, the eddy currents will be:",
      options: ["Weaker", "The same", "Stronger", "Zero"],
      correct: 2,
      explanation: "Faster motion means a faster rate of change of magnetic flux, which induces stronger eddy currents. This is why magnetic braking force increases with speed."
    },
    {
      question: "Induction cooktops use eddy currents to:",
      options: ["Cool food", "Generate electricity", "Heat metal pans directly", "Create magnetic fields in food"],
      correct: 2,
      explanation: "Induction cooktops create a rapidly changing magnetic field that induces eddy currents in metal cookware. The pan's resistance converts these currents to heat."
    },
    {
      question: "The phenomenon where eddy currents oppose the motion that creates them is a consequence of:",
      options: ["Newton's Laws", "Conservation of energy", "Relativity", "Quantum mechanics"],
      correct: 1,
      explanation: "Lenz's Law is a consequence of energy conservation. If eddy currents enhanced motion instead of opposing it, we could create energy from nothing - violating conservation!"
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Conductivity values
  const conductivity: Record<string, number> = {
    copper: 1.0,
    aluminum: 0.6,
    air: 0,
  };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external phase
  useEffect(() => {
    if (currentPhase !== undefined && PHASES.includes(currentPhase) && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

  // Sound effect
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
    } catch { /* Audio not supported */ }
  }, []);

  // Event emitter
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Safe state update helper
  const safeNavigate = useCallback((action: () => void) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    action();
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, []);

  // Debounced navigation
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    if (!PHASES.includes(newPhase)) return;
    navigationLockRef.current = true;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) goToPhase(PHASES[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex > 0) goToPhase(PHASES[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Magnet dropping animation
  useEffect(() => {
    if (phase === 2 && isDropping) {
      const animate = () => {
        setMagnetY(prevY => {
          const sigma = conductivity[conductorType];

          // Calculate eddy braking force (proportional to velocity and conductivity)
          const eddyBrake = magnetVelocity * sigma * 0.15;
          setEddyStrength(Math.abs(eddyBrake) * 10);

          // Update velocity: gravity - eddy braking
          const newVelocity = magnetVelocity + 0.2 - eddyBrake;
          setMagnetVelocity(newVelocity);

          // Update position
          const newY = prevY + newVelocity;

          // Check if reached bottom
          if (newY >= 230) {
            setIsDropping(false);
            setMagnetVelocity(0);
            return 230;
          }

          return newY;
        });

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isDropping, magnetVelocity, conductorType]);

  // Pendulum animation
  useEffect(() => {
    if (phase === 5 && isPendulumRunning) {
      let lastTime = Date.now();
      let crossedZero = false;

      const animate = () => {
        const now = Date.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        setPendulumAngle(prevAngle => {
          // Angular acceleration from gravity
          const gravity = -0.5 * Math.sin(prevAngle * Math.PI / 180);

          // Damping from eddy currents (proportional to velocity)
          const damping = dampingEnabled ? -pendulumVelocity * 0.08 : -pendulumVelocity * 0.005;

          // Update velocity
          const newVelocity = pendulumVelocity + (gravity + damping) * 60 * dt;
          setPendulumVelocity(newVelocity);

          // Track swings
          if (prevAngle > 0 && prevAngle + newVelocity <= 0) {
            if (!crossedZero) {
              setSwingCount(c => c + 1);
              crossedZero = true;
            }
          } else if (prevAngle < 0) {
            crossedZero = false;
          }

          // Update angle
          const newAngle = prevAngle + newVelocity;

          // Stop if nearly stopped
          if (Math.abs(newAngle) < 0.5 && Math.abs(newVelocity) < 0.1) {
            setIsPendulumRunning(false);
            setPendulumVelocity(0);
            return 0;
          }

          return newAngle;
        });

        pendulumRef.current = requestAnimationFrame(animate);
      };

      pendulumRef.current = requestAnimationFrame(animate);

      return () => {
        if (pendulumRef.current) {
          cancelAnimationFrame(pendulumRef.current);
        }
      };
    }
  }, [phase, isPendulumRunning, pendulumVelocity, dampingEnabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (pendulumRef.current) cancelAnimationFrame(pendulumRef.current);
    };
  }, [phase]);

  // Reset magnet
  const resetMagnet = () => {
    setMagnetY(50);
    setMagnetVelocity(0);
    setIsDropping(false);
    setEddyStrength(0);
  };

  // Reset pendulum
  const resetPendulum = () => {
    setPendulumAngle(60);
    setPendulumVelocity(0);
    setIsPendulumRunning(false);
    setSwingCount(0);
  };

  // Helper functions for UI elements
  function renderButton(
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      borderRadius: premiumDesign.radius.lg,
      border: 'none',
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: premiumDesign.typography.fontFamily,
      opacity: disabled ? 0.5 : 1,
    };

    const variants = {
      primary: {
        background: premiumDesign.colors.gradient.primary,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
      },
      secondary: {
        background: premiumDesign.colors.background.tertiary,
        color: premiumDesign.colors.text.primary,
        border: `1px solid rgba(255,255,255,0.1)`,
      },
      success: {
        background: premiumDesign.colors.gradient.eddy,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.magnet),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
      >
        {text}
      </button>
    );
  }

  function renderProgressBar() {
    const currentIndex = PHASES.indexOf(phase);
    const progress = ((currentIndex + 1) / PHASES.length) * 100;

    return (
      <div style={{ marginBottom: premiumDesign.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xs,
          fontSize: '12px',
          color: premiumDesign.colors.text.muted,
        }}>
          <span>Phase {currentIndex + 1} of {PHASES.length}</span>
          <span>{phase.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div style={{
          height: 6,
          background: premiumDesign.colors.background.tertiary,
          borderRadius: premiumDesign.radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: premiumDesign.colors.gradient.eddy,
            borderRadius: premiumDesign.radius.full,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  }

  function renderBottomBar(
    leftButton?: { text: string; onClick: () => void },
    rightButton?: { text: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success'; disabled?: boolean }
  ) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: premiumDesign.spacing.xl,
        paddingTop: premiumDesign.spacing.lg,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {leftButton ? renderButton(leftButton.text, leftButton.onClick, 'secondary') : <div />}
        {rightButton && renderButton(rightButton.text, rightButton.onClick, rightButton.variant || 'primary', rightButton.disabled)}
      </div>
    );
  }

  // Phase Renderers
  function renderHookPhase() {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-emerald-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Main title with gradient */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
          Eddy Currents
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10">
          Discover the invisible currents that fight gravity
        </p>

        {/* Premium card with content */}
        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 rounded-3xl" />

          <div className="relative">
            <div className="text-6xl mb-6">🧲</div>

            <div className="space-y-4">
              <p className="text-xl text-white/90 font-medium leading-relaxed">
                Drop a magnet through a copper tube - it falls in slow motion!
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                No strings, no tricks. What invisible force is fighting gravity?
              </p>
              <div className="pt-2">
                <p className="text-base text-emerald-400 font-semibold">
                  Explore electromagnetic braking and Lenz's Law!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium CTA button */}
        <button
          onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
          className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-3">
            Explore Eddy Currents
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Feature hints */}
        <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✦</span>
            Interactive Lab
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✦</span>
            Real-World Examples
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✦</span>
            Knowledge Test
          </div>
        </div>
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'slow', text: "The magnet falls slowly through a copper tube because eddy currents create an opposing magnetic field" },
      { id: 'fast', text: "The magnet falls faster through copper because metal helps it slide" },
      { id: 'same', text: "The magnet falls at the same speed whether copper is present or not" },
      { id: 'stuck', text: "The magnet gets permanently stuck to the copper" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            🤔 Make Your Prediction
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when you drop a magnet through a copper tube?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {predictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: prediction === p.id
                  ? `2px solid ${premiumDesign.colors.magnet}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(239, 68, 68, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                safeNavigate(() => setPrediction(p.id));
              }}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase(0) },
          {
            text: 'Test My Prediction →',
            onClick: goNext,
            disabled: !prediction,
          }
        )}
      </div>
    );
  }

  function renderPlayPhase() {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🧲 Magnetic Braking Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Drop the magnet through different materials and observe the braking effect
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Simulation View */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 280 300" style={{ width: '100%', maxHeight: 350 }}>
              {/* Tube */}
              <rect x="100" y="40" width="80" height="220" rx="5"
                fill={conductorType === 'air' ? 'transparent' : conductorType === 'copper' ? 'rgba(184, 115, 51, 0.3)' : 'rgba(192, 192, 192, 0.3)'}
                stroke={conductorType === 'air' ? '#666' : conductorType === 'copper' ? '#B87333' : '#C0C0C0'}
                strokeWidth="3"
                strokeDasharray={conductorType === 'air' ? '10,5' : 'none'}
              />

              {/* Tube label */}
              <text x="140" y="275" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                {conductorType.charAt(0).toUpperCase() + conductorType.slice(1)} {conductorType !== 'air' ? 'Tube' : '(No tube)'}
              </text>

              {/* Eddy current visualization */}
              {conductorType !== 'air' && eddyStrength > 0 && (
                <g>
                  {[0, 1, 2].map(i => (
                    <ellipse
                      key={i}
                      cx="140"
                      cy={magnetY + 10}
                      rx={30 + i * 8}
                      ry={5 + i * 2}
                      fill="none"
                      stroke={premiumDesign.colors.eddy}
                      strokeWidth="2"
                      opacity={Math.max(0, 0.7 - i * 0.2) * Math.min(1, eddyStrength / 5)}
                    >
                      <animate
                        attributeName="stroke-dasharray"
                        values="0,200;100,100;200,0"
                        dur="0.5s"
                        repeatCount="indefinite"
                      />
                    </ellipse>
                  ))}
                </g>
              )}

              {/* Magnet */}
              <g transform={`translate(140, ${magnetY})`}>
                {/* North pole */}
                <rect x="-15" y="-15" width="30" height="15" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" rx="3" />
                <text x="0" y="-4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">N</text>
                {/* South pole */}
                <rect x="-15" y="0" width="30" height="15" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" rx="3" />
                <text x="0" y="11" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">S</text>

                {/* Magnetic field lines */}
                <path
                  d="M -20 -15 Q -35 0 -20 15"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
                <path
                  d="M 20 -15 Q 35 0 20 15"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              </g>

              {/* Velocity indicator */}
              <g transform="translate(220, 150)">
                <text x="0" y="0" fill="white" fontSize="11">Speed:</text>
                <text x="0" y="16" fill={premiumDesign.colors.magnet} fontSize="14" fontWeight="bold">
                  {magnetVelocity.toFixed(1)} m/s
                </text>
                <text x="0" y="40" fill="white" fontSize="11">Eddy Force:</text>
                <text x="0" y="56" fill={premiumDesign.colors.eddy} fontSize="14" fontWeight="bold">
                  {(eddyStrength * conductivity[conductorType]).toFixed(1)} N
                </text>
              </g>

              {/* Start position marker */}
              <line x1="80" y1="50" x2="95" y2="50" stroke="#666" strokeWidth="1" />
              <text x="75" y="54" textAnchor="end" fill="#666" fontSize="10">Start</text>
            </svg>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Material
              </h4>
              {(['copper', 'aluminum', 'air'] as const).map(type => (
                <button
                  key={type}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: premiumDesign.spacing.sm,
                    marginBottom: premiumDesign.spacing.xs,
                    borderRadius: premiumDesign.radius.md,
                    border: conductorType === type ? `2px solid ${premiumDesign.colors.magnet}` : '1px solid rgba(255,255,255,0.1)',
                    background: conductorType === type ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: premiumDesign.colors.text.primary,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    textAlign: 'left',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setConductorType(type);
                    resetMagnet();
                  }}
                >
                  {type === 'air' ? '🌬️ Air (no tube)' : type === 'copper' ? '🟤 Copper tube' : '⚪ Aluminum tube'}
                  <span style={{ float: 'right', color: premiumDesign.colors.text.muted }}>
                    σ = {conductivity[type]}
                  </span>
                </button>
              ))}
            </div>

            {renderButton(
              isDropping ? '⏸ Dropping...' : '🧲 Drop Magnet',
              () => {
                resetMagnet();
                setTimeout(() => setIsDropping(true), 100);
              },
              isDropping ? 'secondary' : 'success'
            )}

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                resetMagnet();
              }}
            >
              🔄 Reset
            </button>

            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Compare copper vs air - notice how eddy currents create a magnetic braking force!
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase(1) },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const reviewContent = [
      {
        title: "Faraday's Law of Induction",
        content: "When a magnetic field changes near a conductor, it induces an electromotive force (EMF) that drives current through the conductor. Moving a magnet creates a changing field in nearby metal.",
        formula: "EMF = -dΦ/dt (rate of change of magnetic flux)",
      },
      {
        title: "Eddy Currents Form",
        content: "The induced EMF drives circular currents (eddy currents) that swirl through the conductor. These are called 'eddy' because they circulate like eddies in water.",
        formula: "I_eddy ∝ dΦ/dt × σ (conductivity)",
      },
      {
        title: "Lenz's Law: Opposition",
        content: "The eddy currents create their own magnetic field that OPPOSES the change that created them. If the magnet is falling, the eddy field pushes up against it - magnetic braking!",
        formula: "B_induced opposes change → Braking force",
      },
      {
        title: "Your Prediction",
        content: prediction === 'slow'
          ? "Excellent! You correctly predicted that eddy currents create an opposing magnetic field that slows the magnet's fall."
          : "The correct answer is that eddy currents create an opposing magnetic field. This electromagnetic braking slows the magnet significantly.",
        formula: "Nature resists change (Lenz's Law)",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            📊 Understanding Eddy Currents
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.magnet,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {reviewContent[reviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {reviewContent[reviewStep].content}
          </p>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.magnet,
            textAlign: 'center',
          }}>
            {reviewContent[reviewStep].formula}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {reviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === reviewStep
                    ? premiumDesign.colors.magnet
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  safeNavigate(() => setReviewStep(i));
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase(2) },
          {
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Try a Twist →',
            onClick: () => {
              if (reviewStep < reviewContent.length - 1) {
                safeNavigate(() => setReviewStep(r => r + 1));
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTwistPredictPhase() {
    const twistPredictions = [
      { id: 'faster', text: "The pendulum swings faster when passing through the magnetic field" },
      { id: 'slower', text: "The pendulum slows down and stops sooner due to eddy current damping" },
      { id: 'same', text: "The magnetic field has no effect on the pendulum's motion" },
      { id: 'stuck', text: "The pendulum gets stuck in the magnetic field" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            🔄 The Twist: Pendulum Damping
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when a copper pendulum swings through a magnetic field?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: twistPrediction === p.id
                  ? `2px solid ${premiumDesign.colors.secondary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: twistPrediction === p.id
                  ? 'rgba(139, 92, 246, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                safeNavigate(() => setTwistPrediction(p.id));
              }}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase(3) },
          {
            text: 'Test My Prediction →',
            onClick: () => {
              resetPendulum();
              goNext();
            },
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const pendulumLength = 100;
    const pivotX = 140;
    const pivotY = 60;
    const bobX = pivotX + pendulumLength * Math.sin(pendulumAngle * Math.PI / 180);
    const bobY = pivotY + pendulumLength * Math.cos(pendulumAngle * Math.PI / 180);

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🔄 Electromagnetic Damping
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Compare pendulum motion with and without magnetic damping
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Pendulum View */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 280 250" style={{ width: '100%', maxHeight: 280 }}>
              {/* Support structure */}
              <rect x="100" y="20" width="80" height="10" fill="#666" rx="2" />
              <rect x="135" y="30" width="10" height="35" fill="#666" />

              {/* Magnet (optional) */}
              {dampingEnabled && (
                <g transform="translate(120, 150)">
                  <rect x="0" y="0" width="40" height="60" fill="#666" stroke="#888" strokeWidth="2" rx="3" />
                  <rect x="5" y="5" width="12" height="50" fill="#EF4444" />
                  <rect x="23" y="5" width="12" height="50" fill="#3B82F6" />
                  <text x="20" y="75" textAnchor="middle" fill="white" fontSize="9">Magnet</text>
                </g>
              )}

              {/* Pendulum rod */}
              <line
                x1={pivotX}
                y1={pivotY}
                x2={bobX}
                y2={bobY}
                stroke="#888"
                strokeWidth="3"
              />

              {/* Pivot */}
              <circle cx={pivotX} cy={pivotY} r="5" fill="#666" />

              {/* Bob (copper plate) */}
              <rect
                x={bobX - 15}
                y={bobY - 5}
                width="30"
                height="35"
                fill="rgba(184, 115, 51, 0.8)"
                stroke="#B87333"
                strokeWidth="2"
                rx="3"
                transform={`rotate(${pendulumAngle}, ${bobX}, ${bobY})`}
              />

              {/* Eddy current visualization when passing through magnet */}
              {dampingEnabled && Math.abs(pendulumAngle) < 30 && Math.abs(pendulumVelocity) > 0.5 && (
                <g>
                  {[0, 1].map(i => (
                    <ellipse
                      key={i}
                      cx={bobX}
                      cy={bobY + 10}
                      rx={10 + i * 5}
                      ry={3 + i}
                      fill="none"
                      stroke={premiumDesign.colors.eddy}
                      strokeWidth="2"
                      opacity={0.7 - i * 0.3}
                    />
                  ))}
                </g>
              )}

              {/* Info display */}
              <text x="20" y="230" fill="white" fontSize="12">
                Swings: {swingCount}
              </text>
              <text x="200" y="230" fill="white" fontSize="12">
                Angle: {pendulumAngle.toFixed(1)}°
              </text>
            </svg>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.sm,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '16px',
              }}>
                <input
                  type="checkbox"
                  checked={dampingEnabled}
                  onChange={(e) => {
                    setDampingEnabled(e.target.checked);
                    resetPendulum();
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    accentColor: premiumDesign.colors.secondary,
                  }}
                />
                🧲 Enable Magnetic Damping
              </label>
              <p style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', marginTop: premiumDesign.spacing.sm }}>
                {dampingEnabled
                  ? "Magnet creates eddy currents in the copper bob, dissipating energy as heat"
                  : "No magnetic field - pendulum swings with minimal damping"}
              </p>
            </div>

            {renderButton(
              isPendulumRunning ? '⏸ Pause' : '▶️ Start Pendulum',
              () => {
                if (!isPendulumRunning) {
                  setIsPendulumRunning(true);
                } else {
                  setIsPendulumRunning(false);
                }
              },
              isPendulumRunning ? 'secondary' : 'success'
            )}

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                resetPendulum();
              }}
            >
              🔄 Reset
            </button>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Total Swings Before Stopping
              </div>
              <div style={{ color: premiumDesign.colors.secondary, fontSize: '28px', fontWeight: 700 }}>
                {swingCount}
              </div>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Run with and without damping - notice how the magnet dramatically reduces swing count!
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase(4) },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const twistReviewContent = [
      {
        title: "Eddy Current Damping",
        content: "When the copper bob passes through the magnetic field, eddy currents are induced. These currents dissipate energy as heat in the copper, rapidly removing kinetic energy from the swing.",
        highlight: twistPrediction === 'slower'
          ? "You correctly predicted that eddy currents would slow the pendulum!"
          : "The correct answer is that eddy currents dissipate energy as heat, causing the pendulum to stop much sooner.",
      },
      {
        title: "Energy Conversion",
        content: "The kinetic energy of the swinging pendulum isn't destroyed - it's converted to heat through electrical resistance. This is exactly how electromagnetic brakes work in trains and roller coasters!",
      },
      {
        title: "Braking Without Contact",
        content: "Unlike friction brakes that wear out, electromagnetic damping has no physical contact. The copper never touches the magnet, yet is strongly braked by the induced currents. This makes eddy current brakes extremely durable.",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🔍 Damping Analysis
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.secondary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].content}
          </p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div style={{
              background: twistPrediction === 'slower'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'slower' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'slower' ? premiumDesign.colors.success : '#EF4444',
                margin: 0
              }}>
                {twistReviewContent[twistReviewStep].highlight}
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === twistReviewStep
                    ? premiumDesign.colors.secondary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  safeNavigate(() => setTwistReviewStep(i));
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase(5) },
          {
            text: twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →',
            onClick: () => {
              if (twistReviewStep < twistReviewContent.length - 1) {
                safeNavigate(() => setTwistReviewStep(t => t + 1));
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTransferPhase() {
    const applications = [
      {
        title: "🎢 Roller Coaster Brakes",
        description: "Many roller coasters use magnetic braking systems. Metal fins on the coaster pass through powerful magnets, inducing eddy currents that safely slow the train - no friction, no wear, highly reliable!",
        fact: "Some roller coaster magnetic brakes can stop a train from 60 mph in just 2-3 seconds without any contact!",
      },
      {
        title: "🚄 Maglev Trains",
        description: "High-speed maglev trains use eddy current braking as part of their braking system. At high speeds, electromagnetic braking is more effective than mechanical brakes and doesn't produce brake dust.",
        fact: "The Japanese L0 Series maglev reached 374 mph (603 km/h), using electromagnetic systems for both propulsion and braking!",
      },
      {
        title: "🍳 Induction Cooktops",
        description: "Induction stoves use rapidly changing magnetic fields to induce eddy currents directly in your cookware. The pan becomes the heating element! This is more efficient than traditional electric or gas cooking.",
        fact: "Induction cooking is about 90% efficient - compared to 40% for gas and 70% for electric resistance!",
      },
      {
        title: "🔍 Metal Detectors",
        description: "Metal detectors work by inducing eddy currents in nearby metal objects. These currents create their own magnetic field that the detector senses, allowing it to find buried treasure (or your lost keys)!",
        fact: "Airport metal detectors can distinguish between different metals based on their unique eddy current 'signatures'!",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🌍 Eddy Currents in Action
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Explore all {applications.length} applications to unlock the quiz
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: premiumDesign.spacing.sm,
          marginBottom: premiumDesign.spacing.lg,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {applications.map((app, index) => (
            <button
              key={index}
              style={{
                padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
                borderRadius: premiumDesign.radius.full,
                border: activeApp === index
                  ? `2px solid ${premiumDesign.colors.magnet}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(239, 68, 68, 0.2)'
                  : completedApps.has(index)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                safeNavigate(() => setActiveApp(index));
              }}
            >
              {completedApps.has(index) && '✓ '}{app.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Application Content */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {applications[activeApp].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {applications[activeApp].description}
          </p>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.magnet, fontWeight: 600 }}>
              💡 Fun Fact
            </p>
            <p style={{ margin: `${premiumDesign.spacing.sm}px 0 0`, color: premiumDesign.colors.text.secondary }}>
              {applications[activeApp].fact}
            </p>
          </div>

          {!completedApps.has(activeApp) && (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: 'none',
                background: premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                safeNavigate(() => {
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  if (activeApp < applications.length - 1) {
                    setActiveApp(activeApp + 1);
                  }
                });
              }}
            >
              ✓ Mark as Read
            </button>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: premiumDesign.spacing.lg,
          color: premiumDesign.colors.text.muted,
        }}>
          {completedApps.size} of {applications.length} applications explored
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase(6) },
          {
            text: completedApps.size === applications.length ? 'Take the Quiz →' : `Explore ${applications.length - completedApps.size} More →`,
            onClick: goNext,
            disabled: completedApps.size < applications.length,
          }
        )}
      </div>
    );
  }

  function renderTestPhase() {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: premiumDesign.spacing.lg }}>
              {passed ? '🎉' : '📚'}
            </div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px',
              fontWeight: 700,
              color: premiumDesign.colors.text.primary,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              background: passed ? premiumDesign.colors.gradient.eddy : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: premiumDesign.spacing.md,
            }}>
              {testScore}/{testQuestions.length}
            </div>

            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '18px',
              marginBottom: premiumDesign.spacing.xl,
            }}>
              {passed
                ? 'You have mastered eddy currents!'
                : 'Review the material and try again.'}
            </p>

            {renderButton(
              passed ? 'Continue to Mastery →' : 'Review Material',
              () => {
                if (passed) {
                  goNext();
                } else {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase(3);
                }
              },
              passed ? 'success' : 'primary'
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <span style={{ color: premiumDesign.colors.text.muted }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ color: premiumDesign.colors.magnet, fontWeight: 600 }}>
            Score: {testScore}
          </span>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: isMobile ? '18px' : '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.xl,
            lineHeight: 1.5,
          }}>
            {question.question}
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {question.options.map((option, index) => {
              let buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: '2px solid rgba(255,255,255,0.1)',
                background: premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              };

              if (showExplanation) {
                if (index === question.correct) {
                  buttonStyle.background = 'rgba(16, 185, 129, 0.2)';
                  buttonStyle.borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && index !== question.correct) {
                  buttonStyle.background = 'rgba(239, 68, 68, 0.2)';
                  buttonStyle.borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                buttonStyle.borderColor = premiumDesign.colors.magnet;
                buttonStyle.background = 'rgba(239, 68, 68, 0.2)';
              }

              return (
                <button
                  key={index}
                  style={buttonStyle}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!showExplanation) {
                      safeNavigate(() => setSelectedAnswer(index));
                    }
                  }}
                  disabled={showExplanation}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{
              marginTop: premiumDesign.spacing.xl,
              padding: premiumDesign.spacing.lg,
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.magnet, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                Explanation:
              </p>
              <p style={{ color: premiumDesign.colors.text.secondary, margin: 0 }}>
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: premiumDesign.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
          {!showExplanation ? (
            renderButton(
              'Check Answer',
              () => {
                safeNavigate(() => {
                  setShowExplanation(true);
                  if (selectedAnswer === question.correct) {
                    setTestScore(s => s + 1);
                  }
                });
              },
              'primary',
              selectedAnswer === null
            )
          ) : (
            renderButton(
              currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results',
              () => {
                safeNavigate(() => {
                  if (currentQuestion < testQuestions.length - 1) {
                    setCurrentQuestion(c => c + 1);
                    setSelectedAnswer(null);
                    setShowExplanation(false);
                  } else {
                    setTestComplete(true);
                  }
                });
              },
              'primary'
            )
          )}
        </div>
      </div>
    );
  }

  function renderMasteryPhase() {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: premiumDesign.spacing.xl,
      }}>
        <div style={{
          fontSize: '80px',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          🏆
        </div>

        <h1 style={{
          fontSize: isMobile ? '32px' : '42px',
          fontWeight: 700,
          background: premiumDesign.colors.gradient.eddy,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Eddy Currents Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand how changing magnetic fields induce currents in conductors, and how Lenz's Law creates opposing forces useful for braking and damping!
        </p>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 500,
          width: '100%',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          <h3 style={{ color: premiumDesign.colors.magnet, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Faraday's Law: Changing B induces EMF</li>
            <li>Eddy currents swirl in conductors</li>
            <li>Lenz's Law: Induced field opposes change</li>
            <li>Kinetic energy → Heat via resistance</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: premiumDesign.spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          {renderButton('← Review Again', () => goToPhase(0), 'secondary')}
          {onNext && renderButton('Next Topic →', onNext, 'success')}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Eddy Currents</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-emerald-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto px-4">
        {phase === 0 && renderHookPhase()}
        {phase === 1 && renderPredictPhase()}
        {phase === 2 && renderPlayPhase()}
        {phase === 3 && renderReviewPhase()}
        {phase === 4 && renderTwistPredictPhase()}
        {phase === 5 && renderTwistPlayPhase()}
        {phase === 6 && renderTwistReviewPhase()}
        {phase === 7 && renderTransferPhase()}
        {phase === 8 && renderTestPhase()}
        {phase === 9 && renderMasteryPhase()}
      </div>
    </div>
  );
}
