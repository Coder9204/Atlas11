'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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
    capacitor: '#06B6D4',
    resistor: '#EF4444',
    voltage: '#FBBF24',
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
      rc: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
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

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface RCTimeConstantRendererProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function RCTimeConstantRenderer({ onBack, onNext }: RCTimeConstantRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Debounce refs
  const navigationLockRef = useRef(false);
  const lastNavigationTime = useRef(0);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - RC charging simulation
  const [resistance, setResistance] = useState(10); // kΩ
  const [capacitance, setCapacitance] = useState(100); // μF
  const [supplyVoltage, setSupplyVoltage] = useState(12);
  const [capacitorVoltage, setCapacitorVoltage] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeHistory, setChargeHistory] = useState<{ time: number; voltage: number }[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Discharging
  const [isDischarging, setIsDischarging] = useState(false);
  const [dischargeVoltage, setDischargeVoltage] = useState(12);
  const [dischargeHistory, setDischargeHistory] = useState<{ time: number; voltage: number }[]>([]);
  const [dischargeTime, setDischargeTime] = useState(0);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "The time constant τ (tau) of an RC circuit equals:",
      options: ["R + C", "R - C", "R × C", "R / C"],
      correct: 2,
      explanation: "The time constant τ = R × C (resistance times capacitance). It has units of time (seconds when R is in ohms and C is in farads)."
    },
    {
      question: "After one time constant (1τ), a charging capacitor reaches approximately:",
      options: ["50% of final voltage", "63% of final voltage", "86% of final voltage", "100% of final voltage"],
      correct: 1,
      explanation: "After 1τ, the capacitor charges to (1 - e⁻¹) ≈ 63.2% of the supply voltage. This is a fundamental property of exponential charging."
    },
    {
      question: "A capacitor is considered 'fully charged' after approximately:",
      options: ["1 time constant", "2 time constants", "5 time constants", "10 time constants"],
      correct: 2,
      explanation: "After 5τ, the capacitor reaches about 99.3% of its final value. For practical purposes, this is considered fully charged."
    },
    {
      question: "What happens if you increase the resistance in an RC circuit?",
      options: ["Charging gets faster", "Charging gets slower", "Maximum voltage increases", "Nothing changes"],
      correct: 1,
      explanation: "Higher resistance means less current can flow, so it takes longer to charge the capacitor. τ = RC, so larger R means larger τ."
    },
    {
      question: "The charging curve of a capacitor is:",
      options: ["Linear", "Exponential", "Parabolic", "Sinusoidal"],
      correct: 1,
      explanation: "Capacitor charging follows an exponential curve: V(t) = V₀(1 - e^(-t/τ)). It rises quickly at first, then slows as it approaches the supply voltage."
    },
    {
      question: "During discharge, capacitor voltage:",
      options: ["Decreases linearly", "Decreases exponentially", "Increases exponentially", "Stays constant"],
      correct: 1,
      explanation: "Discharging follows an exponential decay: V(t) = V₀e^(-t/τ). The voltage drops quickly at first, then more slowly."
    },
    {
      question: "If R = 10kΩ and C = 100μF, what is the time constant?",
      options: ["1 millisecond", "10 milliseconds", "100 milliseconds", "1 second"],
      correct: 3,
      explanation: "τ = RC = 10,000Ω × 0.0001F = 1 second. Remember to convert units: 100μF = 100 × 10⁻⁶F = 0.0001F."
    },
    {
      question: "Why can't a capacitor charge instantly to the supply voltage?",
      options: ["The battery is too weak", "Resistance limits current flow", "Capacitors are defective", "It's a software limitation"],
      correct: 1,
      explanation: "The resistor limits current flow. Initially, current is high but decreases as the capacitor charges. The gradual current flow causes gradual charging."
    },
    {
      question: "In a camera flash, a large capacitor is used to:",
      options: ["Store and quickly release energy", "Filter noise", "Regulate voltage", "Convert AC to DC"],
      correct: 0,
      explanation: "Camera flash capacitors slowly charge from the battery, then rapidly discharge to produce an intense flash of light in milliseconds."
    },
    {
      question: "After 2 time constants, a charging capacitor reaches approximately:",
      options: ["63%", "75%", "86%", "95%"],
      correct: 2,
      explanation: "After 2τ: V = V₀(1 - e⁻²) ≈ 86.5%. The percentages at each τ: 63% (1τ), 86% (2τ), 95% (3τ), 98% (4τ), 99% (5τ)."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounced navigation
  const safeNavigate = useCallback((action: () => void) => {
    const now = Date.now();
    if (navigationLockRef.current || now - lastNavigationTime.current < 400) {
      return;
    }
    navigationLockRef.current = true;
    lastNavigationTime.current = now;
    action();
    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    safeNavigate(() => setPhase(newPhase));
  }, [safeNavigate]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate time constant (in seconds)
  const timeConstant = (resistance * 1000) * (capacitance / 1000000); // R in Ω, C in F

  // Charging animation
  useEffect(() => {
    if (phase === 'play' && isCharging) {
      startTimeRef.current = Date.now() - elapsedTime * 1000;

      const animate = () => {
        const now = Date.now();
        const t = (now - startTimeRef.current) / 1000; // Time in seconds
        setElapsedTime(t);

        // V(t) = V₀(1 - e^(-t/τ))
        const v = supplyVoltage * (1 - Math.exp(-t / timeConstant));
        setCapacitorVoltage(v);

        // Record history for graph
        setChargeHistory(prev => {
          const newHistory = [...prev, { time: t, voltage: v }];
          // Keep last 100 points
          return newHistory.slice(-100);
        });

        // Stop when effectively fully charged (99.5%)
        if (v < supplyVoltage * 0.995) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCapacitorVoltage(supplyVoltage);
          setIsCharging(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isCharging, supplyVoltage, timeConstant, elapsedTime]);

  // Discharging animation
  useEffect(() => {
    if (phase === 'twist_play' && isDischarging) {
      const startTime = Date.now() - dischargeTime * 1000;
      const initialVoltage = dischargeVoltage;

      const animate = () => {
        const now = Date.now();
        const t = (now - startTime) / 1000;
        setDischargeTime(t);

        // V(t) = V₀ × e^(-t/τ)
        const v = initialVoltage * Math.exp(-t / timeConstant);
        setDischargeVoltage(v);

        setDischargeHistory(prev => {
          const newHistory = [...prev, { time: t, voltage: v }];
          return newHistory.slice(-100);
        });

        if (v > 0.01) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDischargeVoltage(0);
          setIsDischarging(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isDischarging, dischargeVoltage, timeConstant, dischargeTime]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  // Reset charging simulation
  const resetCharging = () => {
    setIsCharging(false);
    setCapacitorVoltage(0);
    setChargeHistory([]);
    setElapsedTime(0);
  };

  // Reset discharging simulation
  const resetDischarging = () => {
    setIsDischarging(false);
    setDischargeVoltage(supplyVoltage);
    setDischargeHistory([]);
    setDischargeTime(0);
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
        background: premiumDesign.colors.gradient.rc,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.capacitor),
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
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{ marginBottom: premiumDesign.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xs,
          fontSize: '12px',
          color: premiumDesign.colors.text.muted,
        }}>
          <span>Phase {currentIndex + 1} of {phaseOrder.length}</span>
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
            background: premiumDesign.colors.gradient.rc,
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

  // Render voltage graph
  function renderVoltageGraph(history: { time: number; voltage: number }[], maxVoltage: number, isCharge: boolean) {
    const width = 240;
    const height = 120;
    const padding = 25;

    // Calculate max time for x-axis (5 time constants)
    const maxTime = timeConstant * 5;

    // Generate path from history
    const pathPoints = history.map(point => {
      const x = padding + (point.time / maxTime) * (width - 2 * padding);
      const y = height - padding - (point.voltage / maxVoltage) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    // Generate time constant markers
    const tauMarkers = [1, 2, 3, 4, 5].map(n => {
      const x = padding + (n * timeConstant / maxTime) * (width - 2 * padding);
      const percent = isCharge
        ? Math.round((1 - Math.exp(-n)) * 100)
        : Math.round(Math.exp(-n) * 100);
      return { x, n, percent };
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: 150 }}>
        {/* Background */}
        <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding}
          fill="rgba(6, 182, 212, 0.05)" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1" />

        {/* Time constant vertical lines */}
        {tauMarkers.map(marker => (
          <g key={marker.n}>
            <line x1={marker.x} y1={padding} x2={marker.x} y2={height - padding}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3" />
            <text x={marker.x} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">
              {marker.n}τ
            </text>
          </g>
        ))}

        {/* Y-axis labels */}
        <text x={padding - 5} y={padding + 5} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="8">
          {maxVoltage}V
        </text>
        <text x={padding - 5} y={height - padding} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="8">
          0V
        </text>

        {/* 63% line for charging */}
        {isCharge && (
          <g>
            <line x1={padding} y1={height - padding - 0.632 * (height - 2 * padding)}
              x2={width - padding} y2={height - padding - 0.632 * (height - 2 * padding)}
              stroke={premiumDesign.colors.success} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            <text x={width - padding + 3} y={height - padding - 0.632 * (height - 2 * padding) + 3}
              fill={premiumDesign.colors.success} fontSize="7">63%</text>
          </g>
        )}

        {/* Voltage curve */}
        {history.length > 1 && (
          <polyline points={pathPoints} fill="none" stroke={premiumDesign.colors.capacitor}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Axes labels */}
        <text x={width / 2} y={height - 2} textAnchor="middle" fill="white" fontSize="9">Time</text>
        <text x={8} y={height / 2} textAnchor="middle" fill="white" fontSize="9"
          transform={`rotate(-90, 8, ${height / 2})`}>Voltage</text>
      </svg>
    );
  }

  // Phase Renderers
  function renderHookPhase() {
    const hookContent = [
      {
        title: "📸 The Camera Flash Mystery",
        text: "Have you ever noticed how a camera flash takes a few seconds to 'charge up' before it's ready? And then releases all that energy in a blinding instant? Something is storing that energy - but what, and how?",
      },
      {
        title: "🔋 Energy Reservoirs",
        text: "Capacitors are like tiny rechargeable energy tanks. They can slowly fill up with charge, then release it all at once - or slowly. The speed depends on a magical number called the 'time constant'!",
      },
      {
        title: "⏱️ Discover RC Circuits",
        text: "Today we'll explore how capacitors charge and discharge through resistors, and discover the exponential curves that govern timing circuits everywhere!",
      },
    ];

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
          padding: premiumDesign.spacing.xl,
        }}>
          <div style={{
            fontSize: isMobile ? '48px' : '72px',
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {hookContent[hookStep].title.split(' ')[0]}
          </div>

          <h2 style={{
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {hookContent[hookStep].title.split(' ').slice(1).join(' ')}
          </h2>

          <p style={{
            fontSize: isMobile ? '16px' : '18px',
            color: premiumDesign.colors.text.secondary,
            maxWidth: 600,
            lineHeight: 1.7,
          }}>
            {hookContent[hookStep].text}
          </p>

          <div style={{
            display: 'flex',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {hookContent.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: i === hookStep
                    ? premiumDesign.colors.capacitor
                    : premiumDesign.colors.background.tertiary,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          hookStep > 0 ? { text: '← Back', onClick: () => safeNavigate(() => setHookStep(h => h - 1)) } : undefined,
          {
            text: hookStep < hookContent.length - 1 ? 'Continue →' : 'Make a Prediction →',
            onClick: () => {
              if (hookStep < hookContent.length - 1) {
                safeNavigate(() => setHookStep(h => h + 1));
              } else {
                nextPhase();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'instant', text: "Capacitor charges instantly to the supply voltage" },
      { id: 'linear', text: "Capacitor voltage increases linearly (constant rate)" },
      { id: 'exponential', text: "Capacitor charges quickly at first, then slows down (exponential)" },
      { id: 'steps', text: "Capacitor charges in discrete steps" },
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
            How does a capacitor charge when connected through a resistor?
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
                  ? `2px solid ${premiumDesign.colors.capacitor}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(6, 182, 212, 0.2)'
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
          { text: '← Back', onClick: () => goToPhase('hook') },
          {
            text: 'Test My Prediction →',
            onClick: nextPhase,
            disabled: !prediction,
          }
        )}
      </div>
    );
  }

  function renderPlayPhase() {
    const chargePercent = (capacitorVoltage / supplyVoltage) * 100;

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
            🔋 Capacitor Charging Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch the exponential charging curve in real-time
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit and Graph */}
          <div style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {/* Circuit Diagram */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <svg viewBox="0 0 280 140" style={{ width: '100%', maxHeight: 160 }}>
                {/* Circuit path */}
                <rect x="30" y="20" width="220" height="100" fill="none"
                  stroke={isCharging ? premiumDesign.colors.capacitor : '#666'} strokeWidth="2" rx="5" />

                {/* Battery */}
                <g transform="translate(15, 50)">
                  <rect x="0" y="0" width="15" height="40" fill={premiumDesign.colors.background.tertiary}
                    stroke={premiumDesign.colors.voltage} strokeWidth="2" rx="2" />
                  <text x="7.5" y="55" textAnchor="middle" fill={premiumDesign.colors.voltage} fontSize="10">
                    {supplyVoltage}V
                  </text>
                </g>

                {/* Resistor */}
                <g transform="translate(80, 8)">
                  <rect x="0" y="0" width="50" height="16" fill={premiumDesign.colors.background.tertiary}
                    stroke={premiumDesign.colors.resistor} strokeWidth="2" rx="2" />
                  <text x="25" y="28" textAnchor="middle" fill={premiumDesign.colors.resistor} fontSize="9">
                    R={resistance}kΩ
                  </text>
                </g>

                {/* Capacitor */}
                <g transform="translate(180, 5)">
                  <line x1="0" y1="8" x2="0" y2="22" stroke={premiumDesign.colors.capacitor} strokeWidth="3" />
                  <line x1="10" y1="8" x2="10" y2="22" stroke={premiumDesign.colors.capacitor} strokeWidth="3" />
                  {/* Fill indicator */}
                  <rect x="1" y={22 - chargePercent * 0.14} width="8" height={chargePercent * 0.14}
                    fill={premiumDesign.colors.capacitor} opacity="0.5" />
                  <text x="5" y="35" textAnchor="middle" fill={premiumDesign.colors.capacitor} fontSize="9">
                    C={capacitance}μF
                  </text>
                </g>

                {/* Switch */}
                <g transform="translate(230, 60)">
                  <circle cx="0" cy="0" r="4" fill={isCharging ? premiumDesign.colors.success : '#666'} />
                  <line x1="0" y1="0" x2={isCharging ? "20" : "15"} y2={isCharging ? "0" : "-10"}
                    stroke={isCharging ? premiumDesign.colors.success : '#666'} strokeWidth="2" />
                  <circle cx="20" cy="0" r="4" fill={isCharging ? premiumDesign.colors.success : '#666'} />
                </g>

                {/* Voltage display */}
                <text x="140" y="85" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                  Vc = {capacitorVoltage.toFixed(2)}V ({chargePercent.toFixed(1)}%)
                </text>

                {/* Time constant display */}
                <text x="140" y="105" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="10">
                  τ = R × C = {timeConstant.toFixed(2)}s | Time: {elapsedTime.toFixed(2)}s ({(elapsedTime / timeConstant).toFixed(2)}τ)
                </text>
              </svg>
            </div>

            {/* Voltage Graph */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.sm, fontSize: '14px' }}>
                Voltage vs Time (Charging Curve)
              </h4>
              {renderVoltageGraph(chargeHistory, supplyVoltage, true)}
            </div>
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
              <h4 style={{ color: premiumDesign.colors.resistor, marginBottom: premiumDesign.spacing.sm }}>
                R: {resistance} kΩ
              </h4>
              <input
                type="range"
                min="1"
                max="50"
                value={resistance}
                onChange={(e) => { setResistance(Number(e.target.value)); resetCharging(); }}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistor }}
                disabled={isCharging}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.capacitor, marginBottom: premiumDesign.spacing.sm }}>
                C: {capacitance} μF
              </h4>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={capacitance}
                onChange={(e) => { setCapacitance(Number(e.target.value)); resetCharging(); }}
                style={{ width: '100%', accentColor: premiumDesign.colors.capacitor }}
                disabled={isCharging}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Time Constant τ = R × C
              </div>
              <div style={{ color: premiumDesign.colors.secondary, fontSize: '24px', fontWeight: 700 }}>
                {timeConstant.toFixed(2)} s
              </div>
            </div>

            {renderButton(
              isCharging ? '⏸ Pause' : capacitorVoltage > 0 ? '▶️ Resume' : '▶️ Start Charging',
              () => setIsCharging(!isCharging),
              isCharging ? 'secondary' : 'success'
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
                resetCharging();
              }}
            >
              🔄 Reset
            </button>

            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '13px', margin: 0 }}>
                💡 At 1τ: 63% | 2τ: 86% | 3τ: 95% | 5τ: 99%
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('predict') },
          { text: 'Review Results →', onClick: nextPhase }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const reviewContent = [
      {
        title: "Exponential Charging",
        content: "Capacitors charge with an exponential curve, NOT linearly. The voltage rises quickly at first (when there's maximum current), then slows down as the capacitor fills up and resists further charging.",
        formula: "V(t) = V₀(1 - e^(-t/τ))",
      },
      {
        title: "The Time Constant τ",
        content: "The time constant τ = RC determines HOW FAST charging occurs. After 1τ, the capacitor reaches 63% of supply voltage. After 5τ, it's essentially full (99.3%).",
        formula: "τ = R × C (seconds)",
      },
      {
        title: "Why Exponential?",
        content: "As the capacitor charges, its voltage opposes the supply. This reduces the voltage across the resistor, which reduces current, which slows charging. It's a natural feedback loop!",
        formula: "I = (V_supply - V_cap) / R → decreases as V_cap increases",
      },
      {
        title: "Your Prediction",
        content: prediction === 'exponential'
          ? "Excellent! You correctly predicted the exponential charging behavior. The curve starts fast and slows down as the capacitor approaches full charge."
          : "The correct answer is exponential charging. The capacitor charges quickly at first, then slows as it approaches the supply voltage.",
        formula: "Fast start → Gradual slowdown → Asymptotic approach to V₀",
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
            📊 Understanding RC Charging
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
            color: premiumDesign.colors.capacitor,
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
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.capacitor,
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
                    ? premiumDesign.colors.capacitor
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
          { text: '← Back', onClick: () => goToPhase('play') },
          {
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Try a Twist →',
            onClick: () => {
              if (reviewStep < reviewContent.length - 1) {
                safeNavigate(() => setReviewStep(r => r + 1));
              } else {
                nextPhase();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTwistPredictPhase() {
    const twistPredictions = [
      { id: 'instant', text: "Capacitor discharges instantly to zero" },
      { id: 'linear', text: "Voltage drops at a constant rate (linear)" },
      { id: 'exponential', text: "Voltage drops quickly at first, then slows down (exponential decay)" },
      { id: 'same', text: "Discharging curve is identical to charging curve" },
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
            🔄 The Twist: Discharging
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when a charged capacitor discharges through a resistor?
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
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test My Prediction →',
            onClick: () => {
              resetDischarging();
              nextPhase();
            },
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const dischargePercent = (dischargeVoltage / supplyVoltage) * 100;

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
            📉 Capacitor Discharging
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch the exponential decay as the capacitor releases its stored energy
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit and Graph */}
          <div style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {/* Circuit Diagram */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <svg viewBox="0 0 280 140" style={{ width: '100%', maxHeight: 160 }}>
                {/* Circuit path (no battery) */}
                <rect x="60" y="20" width="160" height="100" fill="none"
                  stroke={isDischarging ? premiumDesign.colors.secondary : '#666'} strokeWidth="2" rx="5" />

                {/* Resistor */}
                <g transform="translate(95, 8)">
                  <rect x="0" y="0" width="50" height="16" fill={premiumDesign.colors.background.tertiary}
                    stroke={premiumDesign.colors.resistor} strokeWidth="2" rx="2" />
                  <text x="25" y="28" textAnchor="middle" fill={premiumDesign.colors.resistor} fontSize="9">
                    R={resistance}kΩ
                  </text>
                </g>

                {/* Capacitor with charge indicator */}
                <g transform="translate(180, 5)">
                  <line x1="0" y1="8" x2="0" y2="22" stroke={premiumDesign.colors.secondary} strokeWidth="3" />
                  <line x1="10" y1="8" x2="10" y2="22" stroke={premiumDesign.colors.secondary} strokeWidth="3" />
                  {/* Charge level */}
                  <rect x="1" y={22 - dischargePercent * 0.14} width="8" height={dischargePercent * 0.14}
                    fill={premiumDesign.colors.secondary} opacity="0.6" />
                  <text x="5" y="35" textAnchor="middle" fill={premiumDesign.colors.secondary} fontSize="9">
                    C={capacitance}μF
                  </text>
                </g>

                {/* Light bulb showing discharge */}
                <g transform="translate(60, 55)">
                  <circle cx="0" cy="0" r="12" fill={`rgba(139, 92, 246, ${dischargePercent / 150})`}
                    stroke={premiumDesign.colors.secondary} strokeWidth="2" />
                  {dischargePercent > 10 && (
                    <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10">💡</text>
                  )}
                </g>

                {/* Switch indicator */}
                <g transform="translate(200, 110)">
                  <circle cx="0" cy="0" r="4" fill={isDischarging ? premiumDesign.colors.secondary : '#666'} />
                  <line x1="0" y1="0" x2={isDischarging ? "18" : "12"} y2={isDischarging ? "0" : "-8"}
                    stroke={isDischarging ? premiumDesign.colors.secondary : '#666'} strokeWidth="2" />
                  <circle cx="18" cy="0" r="4" fill={isDischarging ? premiumDesign.colors.secondary : '#666'} />
                </g>

                {/* Voltage display */}
                <text x="140" y="85" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                  Vc = {dischargeVoltage.toFixed(2)}V ({dischargePercent.toFixed(1)}%)
                </text>

                {/* Time display */}
                <text x="140" y="105" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="10">
                  Time: {dischargeTime.toFixed(2)}s ({(dischargeTime / timeConstant).toFixed(2)}τ)
                </text>
              </svg>
            </div>

            {/* Discharge Graph */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.sm, fontSize: '14px' }}>
                Voltage vs Time (Discharge Curve)
              </h4>
              {renderVoltageGraph(dischargeHistory, supplyVoltage, false)}
            </div>
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
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Time Constant τ
              </div>
              <div style={{ color: premiumDesign.colors.secondary, fontSize: '24px', fontWeight: 700 }}>
                {timeConstant.toFixed(2)} s
              </div>
            </div>

            {renderButton(
              isDischarging ? '⏸ Pause' : '▶️ Start Discharge',
              () => setIsDischarging(!isDischarging),
              isDischarging ? 'secondary' : 'success'
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
                resetDischarging();
              }}
            >
              🔄 Reset (Full Charge)
            </button>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '13px', margin: 0 }}>
                💡 Discharge follows V(t) = V₀ × e^(-t/τ). At 1τ: 37% remains | 3τ: 5% | 5τ: ~1%
              </p>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', marginBottom: 4 }}>
                Remaining charge at key time constants:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontSize: '11px' }}>
                <span style={{ color: premiumDesign.colors.text.secondary }}>1τ: 37%</span>
                <span style={{ color: premiumDesign.colors.text.secondary }}>2τ: 14%</span>
                <span style={{ color: premiumDesign.colors.text.secondary }}>3τ: 5%</span>
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Review Results →', onClick: nextPhase }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const twistReviewContent = [
      {
        title: "Exponential Decay",
        content: "Discharging also follows an exponential curve, but it's decay instead of growth. Voltage drops quickly at first (when there's maximum stored charge) then slows as less charge remains.",
        highlight: twistPrediction === 'exponential'
          ? "You correctly predicted exponential decay during discharge!"
          : "The correct answer is exponential decay. The voltage drops quickly at first, then gradually approaches zero.",
      },
      {
        title: "Mirror Image Curve",
        content: "The discharge curve is the 'flipped' version of charging. While charging approaches V₀ from below, discharging approaches 0 from above. Both use the same time constant τ!",
      },
      {
        title: "Same Time Constant",
        content: "Whether charging or discharging, the time constant τ = RC remains the same. After 1τ of discharge, 37% of the original voltage remains (100% - 63% = 37%).",
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
            🔍 Discharge Analysis
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
              background: twistPrediction === 'exponential'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'exponential' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'exponential' ? premiumDesign.colors.success : '#EF4444',
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
          { text: '← Back', onClick: () => goToPhase('twist_play') },
          {
            text: twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →',
            onClick: () => {
              if (twistReviewStep < twistReviewContent.length - 1) {
                safeNavigate(() => setTwistReviewStep(t => t + 1));
              } else {
                nextPhase();
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
        title: "📸 Camera Flash",
        description: "Camera flashes use large capacitors that slowly charge from the battery (you hear the whine!), then discharge all their energy through the flash tube in milliseconds, creating a bright burst of light.",
        fact: "A camera flash capacitor might store 100+ Joules of energy and discharge it in just 1/1000th of a second!",
      },
      {
        title: "📱 Touchscreens",
        description: "Capacitive touchscreens work by detecting changes in capacitance when your finger approaches. Your finger forms a small capacitor with the screen, changing the RC time constant of sensing circuits.",
        fact: "Modern touchscreens can detect touches with sub-millimeter precision using arrays of tiny capacitive sensors!",
      },
      {
        title: "🔊 Audio Filters",
        description: "RC circuits create high-pass and low-pass filters in audio equipment. The time constant determines which frequencies pass through - essential for equalizers, crossovers, and tone controls.",
        fact: "The 'bass' and 'treble' knobs on your stereo are adjusting RC filter circuits!",
      },
      {
        title: "⏰ Timing Circuits",
        description: "The 555 timer IC uses RC circuits to create precise timing intervals. From blinking LEDs to microwave ovens, countless devices use RC-based timing for their operations.",
        fact: "The 555 timer is one of the most successful ICs ever made - over 1 billion are manufactured every year!",
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
            🌍 RC Circuits in Action
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
                  ? `2px solid ${premiumDesign.colors.capacitor}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(6, 182, 212, 0.2)'
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
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.capacitor, fontWeight: 600 }}>
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
          { text: '← Back', onClick: () => goToPhase('twist_review') },
          {
            text: completedApps.size === applications.length ? 'Take the Quiz →' : `Explore ${applications.length - completedApps.size} More →`,
            onClick: nextPhase,
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
              background: passed ? premiumDesign.colors.gradient.rc : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
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
                ? 'You have mastered RC time constants!'
                : 'Review the material and try again.'}
            </p>

            {renderButton(
              passed ? 'Continue to Mastery →' : 'Review Material',
              () => {
                if (passed) {
                  nextPhase();
                } else {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('review');
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
          <span style={{ color: premiumDesign.colors.capacitor, fontWeight: 600 }}>
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
                buttonStyle.borderColor = premiumDesign.colors.capacitor;
                buttonStyle.background = 'rgba(6, 182, 212, 0.2)';
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
              background: 'rgba(6, 182, 212, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.capacitor, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
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
          background: premiumDesign.colors.gradient.rc,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          RC Circuit Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand how capacitors charge and discharge through resistors, and can predict timing behavior using the time constant τ!
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
          <h3 style={{ color: premiumDesign.colors.capacitor, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Time constant τ = R × C</li>
            <li>Charging: V(t) = V₀(1 - e^(-t/τ))</li>
            <li>Discharging: V(t) = V₀ × e^(-t/τ)</li>
            <li>1τ → 63% charged / 37% remaining</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: premiumDesign.spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          {renderButton('← Review Again', () => goToPhase('hook'), 'secondary')}
          {onNext && renderButton('Next Topic →', onNext, 'success')}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div style={{
      minHeight: '100vh',
      background: premiumDesign.colors.background.primary,
      color: premiumDesign.colors.text.primary,
      fontFamily: premiumDesign.typography.fontFamily,
      padding: isMobile ? premiumDesign.spacing.md : premiumDesign.spacing.xl,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          {onBack && (
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.xs,
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onBack();
              }}
            >
              ← Back
            </button>
          )}
          <h1 style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: 700,
            background: premiumDesign.colors.gradient.rc,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ⏱️ RC Time Constant
          </h1>
          <div style={{ width: 60 }} />
        </div>

        {/* Phase Content */}
        {phase === 'hook' && renderHookPhase()}
        {phase === 'predict' && renderPredictPhase()}
        {phase === 'play' && renderPlayPhase()}
        {phase === 'review' && renderReviewPhase()}
        {phase === 'twist_predict' && renderTwistPredictPhase()}
        {phase === 'twist_play' && renderTwistPlayPhase()}
        {phase === 'twist_review' && renderTwistReviewPhase()}
        {phase === 'transfer' && renderTransferPhase()}
        {phase === 'test' && renderTestPhase()}
        {phase === 'mastery' && renderMasteryPhase()}
      </div>
    </div>
  );
}
