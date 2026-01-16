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
    voltage: '#FBBF24',
    current: '#3B82F6',
    resistance: '#EF4444',
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
      circuit: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
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

interface Electron {
  id: number;
  x: number;
  y: number;
  pathPosition: number;
}

interface CircuitsRendererProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function CircuitsRenderer({ onBack, onNext }: CircuitsRendererProps) {
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

  // Play phase - Ohm's Law simulation
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(4);
  const [current, setCurrent] = useState(3);
  const [electrons, setElectrons] = useState<Electron[]>([]);
  const [isCircuitOn, setIsCircuitOn] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Series vs Parallel
  const [circuitType, setCircuitType] = useState<'series' | 'parallel'>('series');
  const [r1, setR1] = useState(4);
  const [r2, setR2] = useState(4);
  const [twistVoltage, setTwistVoltage] = useState(12);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "According to Ohm's Law, if you double the voltage across a resistor, the current will:",
      options: ["Stay the same", "Double", "Halve", "Quadruple"],
      correct: 1,
      explanation: "Ohm's Law: V = IR. If R is constant and V doubles, then I must also double to maintain the equation."
    },
    {
      question: "What is the unit of electrical resistance?",
      options: ["Volt", "Ampere", "Ohm", "Watt"],
      correct: 2,
      explanation: "Resistance is measured in Ohms (Ω), named after Georg Ohm who discovered the relationship V = IR."
    },
    {
      question: "In a series circuit, if one bulb burns out, what happens?",
      options: ["Other bulbs get brighter", "Other bulbs go out too", "Other bulbs stay the same", "The battery overheats"],
      correct: 1,
      explanation: "In a series circuit, there's only one path for current. If one component breaks, the circuit is broken and all components stop working."
    },
    {
      question: "The total resistance in a parallel circuit is:",
      options: ["Equal to the sum of all resistances", "Greater than the largest resistance", "Less than the smallest resistance", "Always zero"],
      correct: 2,
      explanation: "In parallel, 1/R_total = 1/R1 + 1/R2 + ... This always results in a total resistance LESS than any individual resistance."
    },
    {
      question: "Current in a series circuit:",
      options: ["Is different through each component", "Is the same through all components", "Only flows through the battery", "Flows backwards"],
      correct: 1,
      explanation: "In a series circuit, there's only one path, so all components must carry the same current. Current is conserved!"
    },
    {
      question: "Power in an electrical circuit is calculated as:",
      options: ["P = V + I", "P = V - I", "P = V × I", "P = V / I"],
      correct: 2,
      explanation: "Electrical power P = VI (voltage times current). This can also be written as P = I²R or P = V²/R."
    },
    {
      question: "In a parallel circuit, what stays the same across all branches?",
      options: ["Current", "Resistance", "Voltage", "Power"],
      correct: 2,
      explanation: "In parallel, all branches connect directly to the power source, so they all have the same voltage across them."
    },
    {
      question: "What happens to circuit current if you increase resistance (keeping voltage constant)?",
      options: ["Current increases", "Current decreases", "Current stays the same", "Current reverses direction"],
      correct: 1,
      explanation: "From V = IR, if V is constant and R increases, I must decrease. Higher resistance means less current flows."
    },
    {
      question: "A 12V battery pushes current through a 6Ω resistor. The current is:",
      options: ["2 A", "6 A", "72 A", "0.5 A"],
      correct: 0,
      explanation: "Using Ohm's Law: I = V/R = 12V / 6Ω = 2 Amperes."
    },
    {
      question: "Why do household circuits use parallel wiring instead of series?",
      options: ["It's cheaper", "Each device can operate independently", "It uses less wire", "It's more dangerous"],
      correct: 1,
      explanation: "Parallel wiring lets each device operate independently - turning off a lamp doesn't affect your TV. Each gets full voltage!"
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

  // Calculate current from Ohm's Law
  useEffect(() => {
    setCurrent(voltage / resistance);
  }, [voltage, resistance]);

  // Initialize electrons
  const initElectrons = useCallback(() => {
    const newElectrons: Electron[] = [];
    for (let i = 0; i < 12; i++) {
      newElectrons.push({
        id: i,
        x: 0,
        y: 0,
        pathPosition: i * (100 / 12),
      });
    }
    setElectrons(newElectrons);
  }, []);

  useEffect(() => {
    if (phase === 'play') {
      initElectrons();
    }
  }, [phase, initElectrons]);

  // Animate electrons
  useEffect(() => {
    if (phase === 'play' && isCircuitOn) {
      const animate = () => {
        setElectrons(prev => prev.map(e => {
          let newPos = (e.pathPosition + current * 0.3) % 100;
          return { ...e, pathPosition: newPos };
        }));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isCircuitOn, current]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  // Get electron position on circuit path
  const getElectronPosition = (pathPosition: number) => {
    // Circuit path: rectangle around the circuit
    // 0-25: bottom (left to right)
    // 25-50: right side (bottom to top)
    // 50-75: top (right to left)
    // 75-100: left side (top to bottom)
    const p = pathPosition;

    if (p < 25) {
      return { x: 60 + (p / 25) * 180, y: 220 };
    } else if (p < 50) {
      return { x: 240, y: 220 - ((p - 25) / 25) * 140 };
    } else if (p < 75) {
      return { x: 240 - ((p - 50) / 25) * 180, y: 80 };
    } else {
      return { x: 60, y: 80 + ((p - 75) / 25) * 140 };
    }
  };

  // Calculate series/parallel values
  const getSeriesValues = () => {
    const totalR = r1 + r2;
    const i = twistVoltage / totalR;
    const v1 = i * r1;
    const v2 = i * r2;
    return { totalR, i, v1, v2 };
  };

  const getParallelValues = () => {
    const totalR = (r1 * r2) / (r1 + r2);
    const i = twistVoltage / totalR;
    const i1 = twistVoltage / r1;
    const i2 = twistVoltage / r2;
    return { totalR, i, i1, i2 };
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
        background: premiumDesign.colors.gradient.circuit,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.voltage),
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
            background: premiumDesign.colors.gradient.circuit,
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
    const hookContent = [
      {
        title: "💡 The Flow of Power",
        text: "Every time you flip a light switch, charge a phone, or turn on a computer, electricity flows through circuits. But what controls how much electricity flows? What happens when you add more devices?",
      },
      {
        title: "🔌 The Traffic Analogy",
        text: "Think of electricity like cars on a highway. Voltage is the 'push' (like a hill), current is how many cars pass per second, and resistance is like traffic jams slowing things down. Understanding these relationships is the key to all electronics!",
      },
      {
        title: "⚡ Discover Ohm's Law",
        text: "Today we'll explore the fundamental law that governs all electrical circuits - Ohm's Law - and discover how voltage, current, and resistance dance together!",
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
                    ? premiumDesign.colors.voltage
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
      { id: 'direct', text: "Current increases when voltage increases (V and I are directly proportional)" },
      { id: 'inverse', text: "Current decreases when voltage increases (V and I are inversely proportional)" },
      { id: 'none', text: "Voltage doesn't affect current at all" },
      { id: 'complex', text: "The relationship is complex and unpredictable" },
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
            How does increasing voltage affect the current flowing through a resistor?
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
                  ? `2px solid ${premiumDesign.colors.voltage}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(251, 191, 36, 0.2)'
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
            ⚡ Ohm's Law Circuit Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Adjust voltage and resistance to see how current changes
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit Visualization */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }}>
              {/* Circuit wires */}
              <rect x="50" y="70" width="200" height="160" fill="none" stroke={isCircuitOn ? premiumDesign.colors.voltage : '#666'} strokeWidth="3" rx="10" />

              {/* Battery */}
              <g transform="translate(30, 130)">
                <rect x="0" y="0" width="20" height="50" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.voltage} strokeWidth="2" rx="3" />
                <line x1="5" y1="15" x2="15" y2="15" stroke={premiumDesign.colors.voltage} strokeWidth="3" />
                <line x1="10" y1="10" x2="10" y2="20" stroke={premiumDesign.colors.voltage} strokeWidth="3" />
                <line x1="5" y1="35" x2="15" y2="35" stroke={premiumDesign.colors.voltage} strokeWidth="2" />
                <text x="10" y="65" textAnchor="middle" fill={premiumDesign.colors.voltage} fontSize="12" fontWeight="bold">
                  {voltage}V
                </text>
              </g>

              {/* Resistor */}
              <g transform="translate(115, 50)">
                <rect x="0" y="0" width="70" height="25" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.resistance} strokeWidth="2" rx="3" />
                {/* Zigzag pattern */}
                <polyline points="10,12.5 20,5 30,20 40,5 50,20 60,12.5" fill="none" stroke={premiumDesign.colors.resistance} strokeWidth="2" />
                <text x="35" y="40" textAnchor="middle" fill={premiumDesign.colors.resistance} fontSize="12" fontWeight="bold">
                  {resistance}Ω
                </text>
              </g>

              {/* Light bulb (to show current) */}
              <g transform="translate(130, 220)">
                <circle cx="20" cy="0" r="18" fill={isCircuitOn ? `rgba(251, 191, 36, ${Math.min(1, current / 5)})` : 'rgba(100,100,100,0.3)'} stroke="#888" strokeWidth="2" />
                {isCircuitOn && (
                  <>
                    <line x1="12" y1="-10" x2="8" y2="-18" stroke={premiumDesign.colors.voltage} strokeWidth="2" />
                    <line x1="20" y1="-14" x2="20" y2="-22" stroke={premiumDesign.colors.voltage} strokeWidth="2" />
                    <line x1="28" y1="-10" x2="32" y2="-18" stroke={premiumDesign.colors.voltage} strokeWidth="2" />
                  </>
                )}
              </g>

              {/* Switch */}
              <g transform="translate(220, 135)">
                <circle cx="0" cy="0" r="5" fill={isCircuitOn ? premiumDesign.colors.success : '#666'} />
                <line x1="0" y1="0" x2={isCircuitOn ? "30" : "20"} y2={isCircuitOn ? "0" : "-15"} stroke={isCircuitOn ? premiumDesign.colors.success : '#666'} strokeWidth="3" />
                <circle cx="30" cy="0" r="5" fill={isCircuitOn ? premiumDesign.colors.success : '#666'} />
              </g>

              {/* Electrons */}
              {isCircuitOn && electrons.map(e => {
                const pos = getElectronPosition(e.pathPosition);
                return (
                  <circle
                    key={e.id}
                    cx={pos.x}
                    cy={pos.y}
                    r="4"
                    fill={premiumDesign.colors.current}
                  />
                );
              })}

              {/* Current indicator */}
              <g transform="translate(260, 150)">
                <text x="0" y="0" fill={premiumDesign.colors.current} fontSize="14" fontWeight="bold">
                  I = {current.toFixed(2)}A
                </text>
                <text x="0" y="18" fill={premiumDesign.colors.text.muted} fontSize="10">
                  Current
                </text>
              </g>

              {/* Ohm's Law formula */}
              <text x="150" y="290" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                V = I × R → {voltage}V = {current.toFixed(2)}A × {resistance}Ω
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
              <h4 style={{ color: premiumDesign.colors.voltage, marginBottom: premiumDesign.spacing.md }}>
                ⚡ Voltage: {voltage}V
              </h4>
              <input
                type="range"
                min="1"
                max="24"
                value={voltage}
                onChange={(e) => setVoltage(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.voltage }}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.resistance, marginBottom: premiumDesign.spacing.md }}>
                🔥 Resistance: {resistance}Ω
              </h4>
              <input
                type="range"
                min="1"
                max="20"
                value={resistance}
                onChange={(e) => setResistance(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance }}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', marginBottom: 4 }}>
                Calculated Current
              </div>
              <div style={{ color: premiumDesign.colors.current, fontSize: '28px', fontWeight: 700 }}>
                {current.toFixed(2)} A
              </div>
            </div>

            {renderButton(
              isCircuitOn ? '🔴 Turn Off' : '🟢 Turn On',
              () => setIsCircuitOn(!isCircuitOn),
              isCircuitOn ? 'secondary' : 'success'
            )}

            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Notice: When voltage ↑, current ↑. When resistance ↑, current ↓. This is Ohm's Law!
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
        title: "Ohm's Law: V = IR",
        content: "Ohm's Law states that Voltage (V) equals Current (I) times Resistance (R). This simple equation governs all electrical circuits and lets us predict how much current will flow.",
        formula: "V = I × R, or I = V/R, or R = V/I",
      },
      {
        title: "Direct Proportionality",
        content: "Current is directly proportional to voltage. Double the voltage (with same resistance) and current doubles! This is because more 'electrical pressure' pushes more charge through.",
        formula: "I ∝ V (when R is constant)",
      },
      {
        title: "Inverse Proportionality",
        content: "Current is inversely proportional to resistance. Double the resistance (with same voltage) and current halves! More resistance means less current can flow through.",
        formula: "I ∝ 1/R (when V is constant)",
      },
      {
        title: "Your Prediction",
        content: prediction === 'direct'
          ? "Excellent! You correctly predicted that voltage and current are directly proportional. This is the core insight of Ohm's Law!"
          : "The correct answer is that voltage and current are directly proportional (when resistance is constant). Higher voltage pushes more current through the circuit.",
        formula: "I = V/R ⟹ More V = More I",
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
            📊 Understanding Ohm's Law
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
            color: premiumDesign.colors.voltage,
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
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.voltage,
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
                    ? premiumDesign.colors.voltage
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
      { id: 'series', text: "Series: total resistance is the sum of individual resistances" },
      { id: 'parallel_sum', text: "Parallel: total resistance is the sum of individual resistances" },
      { id: 'parallel_less', text: "Parallel: total resistance is LESS than any individual resistance" },
      { id: 'same', text: "Both series and parallel give the same total resistance" },
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
            🔄 The Twist: Series vs Parallel
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when you connect two resistors in series vs parallel?
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
            onClick: nextPhase,
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const seriesVals = getSeriesValues();
    const parallelVals = getParallelValues();
    const vals = circuitType === 'series' ? seriesVals : parallelVals;

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
            🔌 Series vs Parallel Circuits
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Compare how resistors combine in different configurations
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit Visualization */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 300 280" style={{ width: '100%', maxHeight: 300 }}>
              {circuitType === 'series' ? (
                // Series circuit
                <g>
                  {/* Wires */}
                  <rect x="40" y="60" width="220" height="140" fill="none" stroke={premiumDesign.colors.voltage} strokeWidth="3" rx="10" />

                  {/* Battery */}
                  <g transform="translate(20, 110)">
                    <rect x="0" y="0" width="20" height="40" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.voltage} strokeWidth="2" rx="3" />
                    <text x="10" y="55" textAnchor="middle" fill={premiumDesign.colors.voltage} fontSize="11">{twistVoltage}V</text>
                  </g>

                  {/* Resistor 1 */}
                  <g transform="translate(80, 42)">
                    <rect x="0" y="0" width="50" height="20" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.resistance} strokeWidth="2" rx="3" />
                    <text x="25" y="35" textAnchor="middle" fill={premiumDesign.colors.resistance} fontSize="11">R₁={r1}Ω</text>
                  </g>

                  {/* Resistor 2 */}
                  <g transform="translate(170, 42)">
                    <rect x="0" y="0" width="50" height="20" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.resistance} strokeWidth="2" rx="3" />
                    <text x="25" y="35" textAnchor="middle" fill={premiumDesign.colors.resistance} fontSize="11">R₂={r2}Ω</text>
                  </g>

                  {/* Labels */}
                  <text x="150" y="130" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                    SERIES
                  </text>
                  <text x="150" y="150" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">
                    R_total = R₁ + R₂ = {seriesVals.totalR}Ω
                  </text>
                  <text x="150" y="170" textAnchor="middle" fill={premiumDesign.colors.current} fontSize="12">
                    I = {seriesVals.i.toFixed(2)}A (same through both)
                  </text>

                  {/* Voltage drops */}
                  <text x="105" y="95" textAnchor="middle" fill={premiumDesign.colors.voltage} fontSize="10">
                    V₁={seriesVals.v1.toFixed(1)}V
                  </text>
                  <text x="195" y="95" textAnchor="middle" fill={premiumDesign.colors.voltage} fontSize="10">
                    V₂={seriesVals.v2.toFixed(1)}V
                  </text>
                </g>
              ) : (
                // Parallel circuit
                <g>
                  {/* Main wires */}
                  <line x1="40" y1="70" x2="40" y2="190" stroke={premiumDesign.colors.voltage} strokeWidth="3" />
                  <line x1="260" y1="70" x2="260" y2="190" stroke={premiumDesign.colors.voltage} strokeWidth="3" />
                  <line x1="40" y1="70" x2="260" y2="70" stroke={premiumDesign.colors.voltage} strokeWidth="3" />
                  <line x1="40" y1="190" x2="260" y2="190" stroke={premiumDesign.colors.voltage} strokeWidth="3" />

                  {/* Branch wires */}
                  <line x1="100" y1="70" x2="100" y2="100" stroke={premiumDesign.colors.voltage} strokeWidth="2" />
                  <line x1="100" y1="140" x2="100" y2="190" stroke={premiumDesign.colors.voltage} strokeWidth="2" />
                  <line x1="200" y1="70" x2="200" y2="100" stroke={premiumDesign.colors.voltage} strokeWidth="2" />
                  <line x1="200" y1="140" x2="200" y2="190" stroke={premiumDesign.colors.voltage} strokeWidth="2" />

                  {/* Battery */}
                  <g transform="translate(20, 110)">
                    <rect x="0" y="0" width="20" height="40" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.voltage} strokeWidth="2" rx="3" />
                    <text x="10" y="55" textAnchor="middle" fill={premiumDesign.colors.voltage} fontSize="11">{twistVoltage}V</text>
                  </g>

                  {/* Resistor 1 (top branch) */}
                  <g transform="translate(75, 100)">
                    <rect x="0" y="0" width="50" height="20" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.resistance} strokeWidth="2" rx="3" />
                    <rect x="0" y="20" width="50" height="20" fill="transparent" />
                    <text x="25" y="35" textAnchor="middle" fill={premiumDesign.colors.resistance} fontSize="10">R₁={r1}Ω</text>
                  </g>

                  {/* Resistor 2 (bottom branch) */}
                  <g transform="translate(175, 100)">
                    <rect x="0" y="0" width="50" height="20" fill={premiumDesign.colors.background.tertiary} stroke={premiumDesign.colors.resistance} strokeWidth="2" rx="3" />
                    <rect x="0" y="20" width="50" height="20" fill="transparent" />
                    <text x="25" y="35" textAnchor="middle" fill={premiumDesign.colors.resistance} fontSize="10">R₂={r2}Ω</text>
                  </g>

                  {/* Labels */}
                  <text x="150" y="215" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                    PARALLEL
                  </text>
                  <text x="150" y="235" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="11">
                    1/R_total = 1/R₁ + 1/R₂ → R_total = {parallelVals.totalR.toFixed(2)}Ω
                  </text>
                  <text x="150" y="255" textAnchor="middle" fill={premiumDesign.colors.voltage} fontSize="11">
                    V = {twistVoltage}V (same across both)
                  </text>

                  {/* Current labels */}
                  <text x="100" y="165" textAnchor="middle" fill={premiumDesign.colors.current} fontSize="10">
                    I₁={parallelVals.i1.toFixed(2)}A
                  </text>
                  <text x="200" y="165" textAnchor="middle" fill={premiumDesign.colors.current} fontSize="10">
                    I₂={parallelVals.i2.toFixed(2)}A
                  </text>
                </g>
              )}
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
                Circuit Type
              </h4>
              <div style={{ display: 'flex', gap: premiumDesign.spacing.sm }}>
                {(['series', 'parallel'] as const).map(type => (
                  <button
                    key={type}
                    style={{
                      flex: 1,
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: circuitType === type ? `2px solid ${premiumDesign.colors.secondary}` : '1px solid rgba(255,255,255,0.1)',
                      background: circuitType === type ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCircuitType(type);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.resistance, marginBottom: premiumDesign.spacing.sm }}>
                R₁: {r1}Ω
              </h4>
              <input
                type="range"
                min="1"
                max="10"
                value={r1}
                onChange={(e) => setR1(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance }}
              />
              <h4 style={{ color: premiumDesign.colors.resistance, marginBottom: premiumDesign.spacing.sm, marginTop: premiumDesign.spacing.md }}>
                R₂: {r2}Ω
              </h4>
              <input
                type="range"
                min="1"
                max="10"
                value={r2}
                onChange={(e) => setR2(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance }}
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
                Total Resistance
              </div>
              <div style={{ color: premiumDesign.colors.resistance, fontSize: '24px', fontWeight: 700 }}>
                {vals.totalR.toFixed(2)} Ω
              </div>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px', marginTop: 4 }}>
                {circuitType === 'series'
                  ? `R₁ + R₂ = ${r1} + ${r2} = ${seriesVals.totalR}Ω`
                  : `(R₁×R₂)/(R₁+R₂) = ${parallelVals.totalR.toFixed(2)}Ω`
                }
              </div>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Notice: Parallel resistance ({parallelVals.totalR.toFixed(2)}Ω) is always LESS than the smallest resistor ({Math.min(r1, r2)}Ω)!
              </p>
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
        title: "Series: Resistances Add Up",
        content: "In series, current has only ONE path and must flow through BOTH resistors. Total resistance is simply the sum: R_total = R₁ + R₂. The same current flows through everything!",
        highlight: twistPrediction === 'series'
          ? "You correctly identified how series resistance works!"
          : "",
      },
      {
        title: "Parallel: Less Than the Smallest!",
        content: "In parallel, current has MULTIPLE paths and can split between them. More paths = easier flow = LESS total resistance! It's always less than the smallest individual resistor.",
        highlight: twistPrediction === 'parallel_less'
          ? "You correctly predicted that parallel resistance is less than any individual resistance!"
          : "The key insight is that parallel resistance is LESS than any individual resistance because current has multiple paths to take.",
      },
      {
        title: "Why It Matters",
        content: "Series is used when you want components to share the same current (like string lights). Parallel is used when you want components to operate independently and get full voltage (like home outlets).",
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
            🔍 Circuit Analysis
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
              background: (twistPrediction === 'series' || twistPrediction === 'parallel_less')
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${(twistPrediction === 'series' || twistPrediction === 'parallel_less') ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: (twistPrediction === 'series' || twistPrediction === 'parallel_less') ? premiumDesign.colors.success : '#EF4444',
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
        title: "🏠 Home Electrical Systems",
        description: "Your home uses parallel circuits so each outlet operates independently at 120V (or 240V in some countries). If one light burns out, others stay on. Circuit breakers protect against too much current.",
        fact: "A typical US home has 100-200 amp service - enough to power everything from lights to air conditioners simultaneously!",
      },
      {
        title: "🔋 Electric Vehicles",
        description: "EV batteries combine thousands of cells in series and parallel. Series increases voltage (for power), parallel increases capacity (for range). Battery management systems monitor each cell using Ohm's Law principles.",
        fact: "A Tesla Model S battery has over 7,000 individual cells arranged in a complex series-parallel configuration!",
      },
      {
        title: "💻 Computer Processors",
        description: "Computer chips contain billions of tiny transistors (essentially switches). Each transistor's behavior follows Ohm's Law. Engineers must carefully manage current flow to prevent overheating.",
        fact: "A modern CPU can have over 50 billion transistors, each switching billions of times per second!",
      },
      {
        title: "🔌 USB & Charging",
        description: "USB chargers must provide specific voltages and currents. Fast charging works by increasing current (more amps) or voltage. Ohm's Law determines how quickly energy transfers to your device.",
        fact: "USB-C Power Delivery can supply up to 240W - enough to charge laptops at 48V × 5A!",
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
            🌍 Circuits in the Real World
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
                  ? `2px solid ${premiumDesign.colors.voltage}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(251, 191, 36, 0.2)'
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
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(251, 191, 36, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.voltage, fontWeight: 600 }}>
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
              background: passed ? premiumDesign.colors.gradient.circuit : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
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
                ? 'You have mastered electrical circuits!'
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
          <span style={{ color: premiumDesign.colors.voltage, fontWeight: 600 }}>
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
                buttonStyle.borderColor = premiumDesign.colors.voltage;
                buttonStyle.background = 'rgba(251, 191, 36, 0.2)';
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
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.voltage, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
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
          background: premiumDesign.colors.gradient.circuit,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Circuit Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand Ohm's Law and how voltage, current, and resistance work together in circuits. You can analyze both series and parallel configurations!
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
          <h3 style={{ color: premiumDesign.colors.voltage, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Ohm's Law: V = IR</li>
            <li>Series: R_total = R₁ + R₂ + ...</li>
            <li>Parallel: 1/R_total = 1/R₁ + 1/R₂ + ...</li>
            <li>Power: P = V × I</li>
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
            background: premiumDesign.colors.gradient.circuit,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ⚡ Circuits & Ohm's Law
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
