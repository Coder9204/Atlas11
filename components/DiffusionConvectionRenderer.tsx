'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// DIFFUSION VS CONVECTION RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches the difference between diffusion (random molecular motion) and
// convection (bulk fluid flow driven by temperature gradients)
// ============================================================================

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#a855f7',
    primaryDark: '#9333ea',
    secondary: '#ec4899',
    accent: '#06b6d4',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    cold: '#3b82f6',
    hot: '#ef4444',
    warm: '#f97316',
    dye: '#d946ef',
    background: {
      primary: '#0c0a09',
      secondary: '#1c1917',
      tertiary: '#292524',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#fafaf9',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.4)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      secondary: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
      warm: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
      cool: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      heat: 'linear-gradient(180deg, #3b82f6 0%, #ef4444 100%)',
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

interface DyeParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface ConvectionParticle {
  id: number;
  x: number;
  y: number;
  temp: number;
}

interface DiffusionConvectionRendererProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function DiffusionConvectionRenderer({ onBack, onNext }: DiffusionConvectionRendererProps) {
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

  // Play phase - Diffusion simulation
  const [dyeParticles, setDyeParticles] = useState<DyeParticle[]>([]);
  const [dyeDropped, setDyeDropped] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [waterTemp, setWaterTemp] = useState<'cold' | 'room' | 'hot'>('room');
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Convection currents
  const [convectionParticles, setConvectionParticles] = useState<ConvectionParticle[]>([]);
  const [heatSource, setHeatSource] = useState<'bottom' | 'side' | 'none'>('bottom');
  const [showCurrents, setShowCurrents] = useState(true);
  const convectionRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "What is the primary driving force behind diffusion?",
      options: ["Temperature differences", "Random molecular motion", "Gravity", "Pressure differences"],
      correct: 1,
      explanation: "Diffusion occurs due to random molecular motion (Brownian motion). Molecules naturally spread from high to low concentration areas through this random movement."
    },
    {
      question: "Why does dye spread faster in hot water than cold water?",
      options: ["Hot water is thinner", "Convection currents carry the dye", "Hot water has more oxygen", "Dye dissolves better when hot"],
      correct: 1,
      explanation: "In hot water, temperature gradients create convection currents that actively transport the dye throughout the liquid, much faster than diffusion alone."
    },
    {
      question: "What creates convection currents in a fluid?",
      options: ["Magnetic fields", "Temperature differences causing density changes", "Wind from outside", "Chemical reactions"],
      correct: 1,
      explanation: "Convection occurs because warm fluid is less dense and rises, while cooler fluid sinks. This creates circular current patterns that transport heat and matter."
    },
    {
      question: "In which scenario would you expect pure diffusion (no convection)?",
      options: ["Boiling water", "A uniformly heated room-temperature liquid", "A pot on a stove", "Ocean near the equator"],
      correct: 1,
      explanation: "Pure diffusion dominates when there are no temperature gradients. In a uniformly heated liquid, there's no density difference to drive convection."
    },
    {
      question: "Which process is faster for spreading substances through a liquid?",
      options: ["Diffusion", "Convection", "They're equally fast", "It depends on the substance"],
      correct: 1,
      explanation: "Convection is much faster because it involves bulk fluid movement, transporting large amounts of material simultaneously. Diffusion relies on slow random molecular motion."
    },
    {
      question: "In a lava lamp, what causes the colored blobs to rise and fall?",
      options: ["Magnets in the base", "Convection from the heated bottom", "Air bubbles", "Chemical reactions"],
      correct: 1,
      explanation: "The lava lamp works by convection. The light bulb heats the wax at the bottom, making it less dense so it rises. At the top, it cools, becomes denser, and sinks."
    },
    {
      question: "Ocean currents that distribute heat around the planet are an example of:",
      options: ["Diffusion", "Convection", "Conduction", "Radiation"],
      correct: 1,
      explanation: "Ocean currents are massive convection systems driven by temperature and salinity differences. They transport enormous amounts of heat from the equator to the poles."
    },
    {
      question: "Why are radiators typically placed near the floor in buildings?",
      options: ["They're easier to install there", "Warm air rises, creating room-wide convection", "Heat travels downward", "It's a safety requirement"],
      correct: 1,
      explanation: "Low-placed radiators heat the air near the floor. This warm air rises, creating convection currents that circulate heat throughout the entire room."
    },
    {
      question: "What happens to the rate of diffusion as temperature increases?",
      options: ["It decreases", "It stays the same", "It increases", "It stops completely"],
      correct: 2,
      explanation: "Higher temperature means faster molecular motion, which speeds up diffusion. However, in liquids, convection often dominates when temperature gradients exist."
    },
    {
      question: "The smell of perfume spreading across a still room is primarily due to:",
      options: ["Convection in air", "Diffusion of molecules", "Air conditioning", "Gravity pulling scent down"],
      correct: 1,
      explanation: "In still air without temperature gradients, perfume spreads primarily through diffusion - random molecular motion gradually carrying scent molecules throughout the room."
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
    safeNavigate(() => {
      setPhase(newPhase);
      if (newPhase === 'play') {
        setDyeParticles([]);
        setDyeDropped(false);
        setElapsedTime(0);
      }
      if (newPhase === 'twist_play') {
        initConvectionParticles();
      }
    });
  }, [safeNavigate]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Initialize convection particles
  const initConvectionParticles = useCallback(() => {
    const particles: ConvectionParticle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        id: i,
        x: 30 + Math.random() * 240,
        y: 30 + Math.random() * 180,
        temp: 50,
      });
    }
    setConvectionParticles(particles);
  }, []);

  // Diffusion animation
  useEffect(() => {
    if (phase === 'play' && dyeDropped) {
      const tempMultiplier = waterTemp === 'cold' ? 0.3 : waterTemp === 'hot' ? 2.5 : 1;

      const animate = () => {
        setElapsedTime(t => t + 0.016);
        setDyeParticles(prev => prev.map(p => {
          // Random walk (diffusion)
          const randomVx = (Math.random() - 0.5) * 2 * tempMultiplier;
          const randomVy = (Math.random() - 0.5) * 2 * tempMultiplier;

          // Add convection if hot
          let convectionVy = 0;
          if (waterTemp === 'hot') {
            // Simple convection: particles near bottom go up, near top go down at sides
            const centerX = 150;
            const distFromCenter = Math.abs(p.x - centerX);
            if (p.y > 150) {
              convectionVy = -0.5; // Rise from bottom
            } else if (p.y < 80 && distFromCenter > 50) {
              convectionVy = 0.3; // Sink at sides
            }
          }

          let newX = p.x + p.vx * 0.5 + randomVx;
          let newY = p.y + p.vy * 0.5 + randomVy + convectionVy;
          let newVx = p.vx * 0.95 + randomVx * 0.1;
          let newVy = p.vy * 0.95 + randomVy * 0.1;

          // Boundary checks
          if (newX < 35) { newX = 35; newVx = Math.abs(newVx); }
          if (newX > 265) { newX = 265; newVx = -Math.abs(newVx); }
          if (newY < 35) { newY = 35; newVy = Math.abs(newVy); }
          if (newY > 215) { newY = 215; newVy = -Math.abs(newVy); }

          return { ...p, x: newX, y: newY, vx: newVx, vy: newVy };
        }));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [phase, dyeDropped, waterTemp]);

  // Convection animation
  useEffect(() => {
    if (phase === 'twist_play') {
      const animate = () => {
        setConvectionParticles(prev => prev.map(p => {
          let newX = p.x;
          let newY = p.y;
          let newTemp = p.temp;

          if (heatSource === 'bottom') {
            // Heat from bottom
            if (p.y > 180) newTemp = Math.min(100, p.temp + 2);
            if (p.y < 50) newTemp = Math.max(20, p.temp - 1);

            // Convection current
            const centerX = 150;
            const buoyancy = (newTemp - 50) * 0.03;
            newY -= buoyancy;

            // Horizontal circulation
            if (p.y < 60) {
              newX += (p.x < centerX) ? -0.5 : 0.5;
            }
            if (p.y > 180) {
              newX += (p.x < centerX) ? 0.3 : -0.3;
            }
          } else if (heatSource === 'side') {
            // Heat from left side
            if (p.x < 50) newTemp = Math.min(100, p.temp + 2);
            if (p.x > 250) newTemp = Math.max(20, p.temp - 1);

            // Side-driven convection
            const buoyancy = (newTemp - 50) * 0.025;
            if (p.x < 100) newY -= buoyancy;
            if (p.x > 200) newY += buoyancy * 0.5;

            // Top/bottom circulation
            if (p.y < 50) newX += 0.4;
            if (p.y > 190) newX -= 0.3;
          } else {
            // No heat source - gradual equilibrium
            newTemp = newTemp + (50 - newTemp) * 0.01;
          }

          // Random motion (molecular)
          newX += (Math.random() - 0.5) * 0.8;
          newY += (Math.random() - 0.5) * 0.8;

          // Boundaries
          if (newX < 30) newX = 30;
          if (newX > 270) newX = 270;
          if (newY < 30) newY = 30;
          if (newY > 210) newY = 210;

          return { ...p, x: newX, y: newY, temp: newTemp };
        }));
        convectionRef.current = requestAnimationFrame(animate);
      };
      convectionRef.current = requestAnimationFrame(animate);

      return () => {
        if (convectionRef.current) cancelAnimationFrame(convectionRef.current);
      };
    }
  }, [phase, heatSource]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (convectionRef.current) cancelAnimationFrame(convectionRef.current);
    };
  }, []);

  // Drop dye
  const dropDye = useCallback(() => {
    const particles: DyeParticle[] = [];
    const centerX = 150;
    const centerY = 80;

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 15;
      particles.push({
        id: i,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: `hsl(${280 + Math.random() * 40}, 80%, ${50 + Math.random() * 20}%)`,
        size: 3 + Math.random() * 3,
      });
    }
    setDyeParticles(particles);
    setDyeDropped(true);
    setElapsedTime(0);
  }, []);

  // Get temperature color
  const getTempColor = (temp: number) => {
    if (temp < 40) return premiumDesign.colors.cold;
    if (temp > 70) return premiumDesign.colors.hot;
    return premiumDesign.colors.warm;
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
        background: `linear-gradient(135deg, ${premiumDesign.colors.success} 0%, #059669 100%)`,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.success),
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
            background: premiumDesign.colors.gradient.primary,
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

  // ==================== PHASE RENDERERS ====================

  function renderHookPhase() {
    const hookContent = [
      {
        title: "🧪 A Drop of Color",
        content: "Imagine dropping a single drop of food coloring into a glass of water. What do you think will happen? Will it stay in one spot, or spread throughout the water?",
        visual: "drop",
      },
      {
        title: "🌡️ Temperature Mystery",
        content: "Here's the puzzle: Does it matter if the water is hot or cold? Scientists have discovered something fascinating about how temperature affects the spreading of substances...",
        visual: "temp",
      },
      {
        title: "🔬 Two Hidden Forces",
        content: "Today you'll discover TWO different ways that substances spread through liquids: DIFFUSION and CONVECTION. They work in completely different ways!",
        visual: "forces",
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
          <div style={{ fontSize: '64px', marginBottom: premiumDesign.spacing.lg }}>
            {hookContent[hookStep].visual === 'drop' && '💧'}
            {hookContent[hookStep].visual === 'temp' && '🌡️'}
            {hookContent[hookStep].visual === 'forces' && '⚡'}
          </div>

          <h2 style={{
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {hookContent[hookStep].title}
          </h2>

          <p style={{
            fontSize: isMobile ? '16px' : '18px',
            color: premiumDesign.colors.text.secondary,
            maxWidth: '500px',
            lineHeight: 1.7,
          }}>
            {hookContent[hookStep].content}
          </p>

          {/* Progress dots */}
          <div style={{
            display: 'flex',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {hookContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === hookStep
                    ? premiumDesign.colors.primary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  safeNavigate(() => setHookStep(i));
                }}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          undefined,
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
      { id: 'same', label: 'The dye will spread at the same rate in hot and cold water', icon: '=' },
      { id: 'faster_hot', label: 'The dye will spread FASTER in hot water', icon: '🔥' },
      { id: 'faster_cold', label: 'The dye will spread FASTER in cold water', icon: '❄️' },
      { id: 'no_spread', label: 'The dye won\'t spread at all - it will sink', icon: '⬇️' },
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
            🤔 Make Your Prediction
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            What do you think will happen when we drop dye into water at different temperatures?
          </p>
        </div>

        <div style={{
          display: 'grid',
          gap: premiumDesign.spacing.md,
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
        }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: prediction === pred.id
                  ? `2px solid ${premiumDesign.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === pred.id
                  ? 'rgba(168, 85, 247, 0.2)'
                  : premiumDesign.colors.background.secondary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                safeNavigate(() => setPrediction(pred.id));
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: premiumDesign.spacing.md }}>
                <span style={{ fontSize: '24px' }}>{pred.icon}</span>
                <span style={{
                  color: premiumDesign.colors.text.primary,
                  fontSize: '15px',
                }}>
                  {pred.label}
                </span>
              </div>
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
    const spreadRadius = dyeParticles.length > 0
      ? Math.sqrt(dyeParticles.reduce((acc, p) => {
          const dx = p.x - 150;
          const dy = p.y - 125;
          return acc + dx * dx + dy * dy;
        }, 0) / dyeParticles.length)
      : 0;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🧪 Diffusion Experiment
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Drop dye into water and observe how it spreads
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.xl,
          flex: 1,
        }}>
          {/* Simulation */}
          <div style={{
            flex: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <svg
              width="300"
              height="250"
              style={{
                background: premiumDesign.colors.background.secondary,
                borderRadius: premiumDesign.radius.xl,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Beaker */}
              <rect
                x="30" y="30" width="240" height="190"
                fill={waterTemp === 'cold' ? 'rgba(59, 130, 246, 0.2)' : waterTemp === 'hot' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)'}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                rx="8"
              />

              {/* Temperature indicator */}
              <text
                x="150" y="235"
                textAnchor="middle"
                fill={waterTemp === 'cold' ? premiumDesign.colors.cold : waterTemp === 'hot' ? premiumDesign.colors.hot : premiumDesign.colors.text.secondary}
                fontSize="12"
              >
                {waterTemp === 'cold' ? '❄️ Cold (5°C)' : waterTemp === 'hot' ? '🔥 Hot (80°C)' : '🌡️ Room Temp (20°C)'}
              </text>

              {/* Dye particles */}
              {dyeParticles.map(p => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={p.size}
                  fill={p.color}
                  opacity={0.8}
                />
              ))}

              {/* Drop indicator */}
              {!dyeDropped && (
                <g>
                  <circle cx="150" cy="20" r="8" fill={premiumDesign.colors.dye} />
                  <path d="M150 28 L150 45" stroke={premiumDesign.colors.dye} strokeWidth="2" strokeDasharray="4" />
                  <text x="150" y="55" textAnchor="middle" fill={premiumDesign.colors.text.muted} fontSize="10">
                    Click to drop
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
                Water Temperature
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: premiumDesign.spacing.sm }}>
                {(['cold', 'room', 'hot'] as const).map(temp => (
                  <button
                    key={temp}
                    style={{
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: waterTemp === temp ? `2px solid ${temp === 'cold' ? premiumDesign.colors.cold : temp === 'hot' ? premiumDesign.colors.hot : premiumDesign.colors.primary}` : '1px solid rgba(255,255,255,0.1)',
                      background: waterTemp === temp ? `${temp === 'cold' ? premiumDesign.colors.cold : temp === 'hot' ? premiumDesign.colors.hot : premiumDesign.colors.primary}20` : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setWaterTemp(temp);
                      setDyeDropped(false);
                      setDyeParticles([]);
                      setElapsedTime(0);
                    }}
                  >
                    {temp === 'cold' ? '❄️ Cold' : temp === 'hot' ? '🔥 Hot' : '🌡️ Room'}
                  </button>
                ))}
              </div>
            </div>

            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: dyeDropped ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: dyeDropped ? 'not-allowed' : 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!dyeDropped) dropDye();
              }}
            >
              {dyeDropped ? '💧 Dye Dropped' : '💧 Drop Dye'}
            </button>

            {dyeDropped && (
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
                  setDyeDropped(false);
                  setDyeParticles([]);
                  setElapsedTime(0);
                }}
              >
                🔄 Reset
              </button>
            )}

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Spread Radius
              </div>
              <div style={{ color: premiumDesign.colors.dye, fontSize: '24px', fontWeight: 700 }}>
                {spreadRadius.toFixed(1)} px
              </div>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px' }}>
                Time: {elapsedTime.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('predict') },
          { text: 'See Results →', onClick: nextPhase }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const wasCorrect = prediction === 'faster_hot';

    const reviewContent = [
      {
        title: "What You Observed",
        content: `In hot water, the dye spreads much faster than in cold water. ${wasCorrect ? "Your prediction was correct!" : "This might be surprising!"} But WHY does this happen?`,
        highlight: wasCorrect,
      },
      {
        title: "The Secret: Two Different Processes",
        content: "There are TWO ways substances spread through fluids:\n\n• DIFFUSION: Random molecular motion (slow, happens everywhere)\n• CONVECTION: Bulk fluid movement driven by temperature (fast, needs heat)",
      },
      {
        title: "Why Hot Water Wins",
        content: "In cold water, you see mainly DIFFUSION - slow random molecular motion. In hot water, temperature gradients create CONVECTION CURRENTS that actively carry the dye throughout the liquid - much faster!",
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
            🔍 Understanding the Results
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
            color: premiumDesign.colors.primary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {reviewContent[reviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}>
            {reviewContent[reviewStep].content}
          </p>

          {reviewContent[reviewStep].highlight && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: '1px solid rgba(16, 185, 129, 0.5)',
            }}>
              <p style={{ color: premiumDesign.colors.success, margin: 0 }}>
                ✓ Great prediction! You correctly anticipated that hot water would spread the dye faster.
              </p>
            </div>
          )}

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
                    ? premiumDesign.colors.primary
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
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Explore Convection →',
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
    const predictions = [
      { id: 'bottom', label: 'Heating from the BOTTOM will create the strongest currents', icon: '⬆️' },
      { id: 'side', label: 'Heating from the SIDE will create the strongest currents', icon: '➡️' },
      { id: 'same', label: 'Both will create equally strong currents', icon: '=' },
      { id: 'none', label: 'Neither will create currents - heat just spreads evenly', icon: '○' },
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
            🌀 The Twist: Heat Position
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Does it matter WHERE we apply heat? What creates the strongest convection currents?
          </p>
        </div>

        <div style={{
          display: 'grid',
          gap: premiumDesign.spacing.md,
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%',
        }}>
          {predictions.map((pred) => (
            <button
              key={pred.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: twistPrediction === pred.id
                  ? `2px solid ${premiumDesign.colors.secondary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: twistPrediction === pred.id
                  ? 'rgba(236, 72, 153, 0.2)'
                  : premiumDesign.colors.background.secondary,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                safeNavigate(() => setTwistPrediction(pred.id));
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: premiumDesign.spacing.md }}>
                <span style={{ fontSize: '24px' }}>{pred.icon}</span>
                <span style={{ color: premiumDesign.colors.text.primary, fontSize: '15px' }}>
                  {pred.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test It →',
            onClick: nextPhase,
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🌀 Convection Currents
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch how heat position affects fluid flow
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.xl,
          flex: 1,
        }}>
          {/* Simulation */}
          <div style={{
            flex: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <svg
              width="300"
              height="250"
              style={{
                background: premiumDesign.colors.background.secondary,
                borderRadius: premiumDesign.radius.xl,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Container */}
              <rect
                x="25" y="25" width="250" height="200"
                fill="rgba(255, 255, 255, 0.02)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
                rx="8"
              />

              {/* Heat source indicator */}
              {heatSource === 'bottom' && (
                <rect x="25" y="220" width="250" height="8" fill={premiumDesign.colors.hot} rx="2" opacity={0.8} />
              )}
              {heatSource === 'side' && (
                <rect x="20" y="25" width="8" height="200" fill={premiumDesign.colors.hot} rx="2" opacity={0.8} />
              )}

              {/* Convection particles */}
              {convectionParticles.map(p => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={getTempColor(p.temp)}
                  opacity={0.7}
                />
              ))}

              {/* Current arrows */}
              {showCurrents && heatSource === 'bottom' && (
                <g opacity={0.4}>
                  <path d="M150 200 L150 50" stroke="white" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path d="M80 50 L80 150" stroke="white" strokeWidth="1.5" strokeDasharray="4" />
                  <path d="M220 50 L220 150" stroke="white" strokeWidth="1.5" strokeDasharray="4" />
                  <path d="M100 50 L200 50" stroke="white" strokeWidth="1.5" strokeDasharray="4" />
                </g>
              )}
              {showCurrents && heatSource === 'side' && (
                <g opacity={0.4}>
                  <path d="M50 180 L50 50" stroke="white" strokeWidth="2" />
                  <path d="M50 50 L250 50" stroke="white" strokeWidth="1.5" strokeDasharray="4" />
                  <path d="M250 50 L250 180" stroke="white" strokeWidth="1.5" strokeDasharray="4" />
                </g>
              )}

              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill="white" />
                </marker>
              </defs>

              {/* Legend */}
              <g transform="translate(30, 235)">
                <circle cx="5" cy="0" r="4" fill={premiumDesign.colors.cold} />
                <text x="15" y="4" fill={premiumDesign.colors.text.muted} fontSize="10">Cold</text>
                <circle cx="60" cy="0" r="4" fill={premiumDesign.colors.warm} />
                <text x="70" y="4" fill={premiumDesign.colors.text.muted} fontSize="10">Warm</text>
                <circle cx="120" cy="0" r="4" fill={premiumDesign.colors.hot} />
                <text x="130" y="4" fill={premiumDesign.colors.text.muted} fontSize="10">Hot</text>
              </g>
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
                Heat Source Position
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: premiumDesign.spacing.sm }}>
                {(['bottom', 'side', 'none'] as const).map(pos => (
                  <button
                    key={pos}
                    style={{
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: heatSource === pos ? `2px solid ${premiumDesign.colors.hot}` : '1px solid rgba(255,255,255,0.1)',
                      background: heatSource === pos ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setHeatSource(pos);
                    }}
                  >
                    {pos === 'bottom' ? '⬆️ Bottom' : pos === 'side' ? '➡️ Side' : '○ None'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: premiumDesign.spacing.sm,
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={showCurrents}
                  onChange={(e) => setShowCurrents(e.target.checked)}
                  style={{ accentColor: premiumDesign.colors.primary }}
                />
                Show current arrows
              </label>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Watch how {heatSource === 'bottom'
                  ? 'hot fluid rises from the bottom, creating a strong vertical current'
                  : heatSource === 'side'
                  ? 'heat from the side creates a diagonal circulation pattern'
                  : 'without heat, particles move randomly (diffusion only)'}
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Understand Results →', onClick: nextPhase }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const wasCorrect = twistPrediction === 'bottom';

    const twistReviewContent = [
      {
        title: "Bottom Heating Creates Strongest Currents",
        content: `${wasCorrect ? "You predicted correctly! " : ""}Heating from the BOTTOM creates the most efficient convection because:\n\n• Hot fluid naturally rises (lower density)\n• Creates a continuous cycle: rise → cool at top → sink → reheat\n• This is why we cook with heat from below!`,
        highlight: wasCorrect,
      },
      {
        title: "Side Heating: Weaker Currents",
        content: "Side heating still creates convection, but it's less efficient:\n\n• Only heats one side of the fluid\n• Creates diagonal, less organized flow\n• The top of the container tends to stay warmer than the bottom",
      },
      {
        title: "The Key Insight",
        content: "Convection is most efficient when heat can naturally drive the cycle:\n\n• Heat goes UP (hot rises)\n• Cool comes DOWN (cold sinks)\n• This is why radiators are placed low and air conditioners high!",
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
            🔍 Heat Position Analysis
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
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}>
            {twistReviewContent[twistReviewStep].content}
          </p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: '1px solid rgba(16, 185, 129, 0.5)',
            }}>
              <p style={{ color: premiumDesign.colors.success, margin: 0 }}>
                ✓ Excellent prediction! You understood that bottom heating creates the strongest convection.
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
        title: "🌊 Ocean Currents",
        description: "The world's oceans are giant convection systems! Warm water near the equator rises and flows toward the poles, while cold polar water sinks and flows back. This 'global conveyor belt' distributes heat around the planet and drives weather patterns.",
        fact: "The Gulf Stream carries 30 times more water than all the world's rivers combined, warming Northern Europe by 5-10°C!",
      },
      {
        title: "🏠 Home Heating & Cooling",
        description: "HVAC systems are designed around convection. Heating vents are placed low (warm air rises), while AC vents are placed high (cool air sinks). This creates natural circulation that distributes air efficiently without fans.",
        fact: "A well-designed convection heating system can reduce energy costs by 30% compared to forced-air systems!",
      },
      {
        title: "🌋 Plate Tectonics",
        description: "Earth's mantle undergoes slow convection over millions of years! Hot rock rises at mid-ocean ridges, spreads across the seafloor, cools, and sinks at subduction zones. This drives continental drift and causes earthquakes.",
        fact: "Convection in Earth's mantle moves plates at about the same rate your fingernails grow - a few centimeters per year!",
      },
      {
        title: "☕ Cooking & Food Science",
        description: "Boiling water, baking bread, and brewing coffee all rely on convection. That's why we heat from below - it creates efficient circulation. Convection ovens use fans to enhance this effect for more even cooking.",
        fact: "A convection oven cooks food 25% faster than a conventional oven because forced air increases heat transfer!",
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
            🌍 Diffusion & Convection in the Real World
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
                  ? `2px solid ${premiumDesign.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(168, 85, 247, 0.2)'
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
            background: 'rgba(168, 85, 247, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.primary, fontWeight: 600 }}>
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
              background: passed ? `linear-gradient(135deg, ${premiumDesign.colors.success} 0%, #059669 100%)` : premiumDesign.colors.gradient.warm,
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
                ? 'You have mastered diffusion and convection!'
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
          <span style={{ color: premiumDesign.colors.success, fontWeight: 600 }}>
            Score: {testScore}
          </span>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <h3 style={{
            fontSize: isMobile ? '18px' : '20px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.xl,
            lineHeight: 1.5,
          }}>
            {question.question}
          </h3>

          <div style={{ display: 'grid', gap: premiumDesign.spacing.md }}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correct;
              const showResult = showExplanation;

              let bgColor = premiumDesign.colors.background.secondary;
              let borderColor = 'rgba(255,255,255,0.1)';

              if (showResult) {
                if (isCorrect) {
                  bgColor = 'rgba(16, 185, 129, 0.2)';
                  borderColor = premiumDesign.colors.success;
                } else if (isSelected) {
                  bgColor = 'rgba(239, 68, 68, 0.2)';
                  borderColor = premiumDesign.colors.error;
                }
              } else if (isSelected) {
                bgColor = 'rgba(168, 85, 247, 0.2)';
                borderColor = premiumDesign.colors.primary;
              }

              return (
                <button
                  key={index}
                  style={{
                    padding: premiumDesign.spacing.lg,
                    borderRadius: premiumDesign.radius.lg,
                    border: `2px solid ${borderColor}`,
                    background: bgColor,
                    cursor: showExplanation ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                >
                  <span style={{
                    color: premiumDesign.colors.text.primary,
                    fontSize: '15px',
                  }}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {showExplanation && (
          <div style={{
            background: selectedAnswer === question.correct
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: `1px solid ${selectedAnswer === question.correct
              ? 'rgba(16, 185, 129, 0.3)'
              : 'rgba(239, 68, 68, 0.3)'}`,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            <p style={{
              color: selectedAnswer === question.correct
                ? premiumDesign.colors.success
                : premiumDesign.colors.error,
              fontWeight: 600,
              marginBottom: premiumDesign.spacing.sm,
            }}>
              {selectedAnswer === question.correct ? '✓ Correct!' : '✗ Not quite'}
            </p>
            <p style={{ color: premiumDesign.colors.text.secondary, margin: 0 }}>
              {question.explanation}
            </p>
          </div>
        )}

        {renderBottomBar(
          undefined,
          {
            text: showExplanation
              ? (currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →')
              : 'Check Answer',
            onClick: () => {
              if (showExplanation) {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(c => c + 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                } else {
                  setTestComplete(true);
                }
              } else {
                if (selectedAnswer === question.correct) {
                  setTestScore(s => s + 1);
                }
                setShowExplanation(true);
              }
            },
            disabled: selectedAnswer === null && !showExplanation,
          }
        )}
      </div>
    );
  }

  function renderMasteryPhase() {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Confetti animation */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: '10px',
              height: '10px',
              background: [
                premiumDesign.colors.primary,
                premiumDesign.colors.secondary,
                premiumDesign.colors.success,
                premiumDesign.colors.accent,
              ][i % 4],
              borderRadius: '2px',
              animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        {renderProgressBar()}

        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: premiumDesign.colors.gradient.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: premiumDesign.spacing.xl,
          boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
        }}>
          <span style={{ fontSize: '56px' }}>🏆</span>
        </div>

        <h1 style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 800,
          color: premiumDesign.colors.text.primary,
          marginBottom: premiumDesign.spacing.sm,
        }}>
          Heat Transfer Master!
        </h1>

        <p style={{
          fontSize: '20px',
          color: premiumDesign.colors.text.secondary,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          Final Score: <span style={{ color: premiumDesign.colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: premiumDesign.spacing.md,
          maxWidth: '400px',
          width: '100%',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          {[
            { icon: '💧', label: 'Diffusion = Random Motion' },
            { icon: '🌀', label: 'Convection = Bulk Flow' },
            { icon: '⬆️', label: 'Hot Rises, Cold Sinks' },
            { icon: '🌡️', label: 'Heat Position Matters' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                background: premiumDesign.colors.background.secondary,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: premiumDesign.spacing.xs }}>{item.icon}</div>
              <div style={{ fontSize: '13px', color: premiumDesign.colors.text.secondary }}>{item.label}</div>
            </div>
          ))}
        </div>

        {renderButton(
          'Complete Lesson ✓',
          () => {
            if (onNext) onNext();
          },
          'success'
        )}
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: premiumDesign.colors.background.primary,
    color: premiumDesign.colors.text.primary,
    fontFamily: premiumDesign.typography.fontFamily,
    padding: isMobile ? premiumDesign.spacing.md : premiumDesign.spacing.xl,
  };

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
