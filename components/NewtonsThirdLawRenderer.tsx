'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// NEWTON'S THIRD LAW RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches Newton's Third Law: For every action, there is an equal and opposite reaction
// Features: Balloon rocket simulation, action-reaction force visualization
// ============================================================================

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#ef4444',
    primaryDark: '#dc2626',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    balloon: '#ef4444',
    air: '#93c5fd',
    background: {
      primary: '#0f0b15',
      secondary: '#1a1625',
      tertiary: '#252030',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#f5f3ff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.4)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
      secondary: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      warm: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
      cool: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
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

interface AirParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface NewtonsThirdLawRendererProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function NewtonsThirdLawRenderer({ onBack, onNext }: NewtonsThirdLawRendererProps) {
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

  // Play phase - Balloon rocket simulation
  const [balloonSize, setBalloonSize] = useState(50);
  const [balloonX, setBalloonX] = useState(80);
  const [isLaunched, setIsLaunched] = useState(false);
  const [airRemaining, setAirRemaining] = useState(100);
  const [airParticles, setAirParticles] = useState<AirParticle[]>([]);
  const [maxDistance, setMaxDistance] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Size comparison
  const [smallBalloonX, setSmallBalloonX] = useState(80);
  const [largeBalloonX, setLargeBalloonX] = useState(80);
  const [twistLaunched, setTwistLaunched] = useState(false);
  const [smallAir, setSmallAir] = useState(100);
  const [largeAir, setLargeAir] = useState(100);
  const twistRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "According to Newton's Third Law, when you push against a wall, what happens?",
      options: ["Nothing, the wall doesn't move", "The wall pushes back on you with equal force", "The wall absorbs your force", "Your force disappears"],
      correct: 1,
      explanation: "Newton's Third Law states that for every action, there's an equal and opposite reaction. When you push on the wall, it pushes back on you with equal force!"
    },
    {
      question: "Why does a balloon rocket move forward when air escapes backward?",
      options: ["The air pushes on the ground", "The air resistance pulls it forward", "The escaping air pushes the balloon forward (reaction)", "Magic"],
      correct: 2,
      explanation: "The balloon pushes air out (action), and the air pushes the balloon forward (reaction). This is Newton's Third Law in action!"
    },
    {
      question: "If a larger balloon has more air, what happens compared to a smaller balloon?",
      options: ["It goes slower", "It goes the same distance", "It can travel farther due to longer thrust", "Size doesn't matter"],
      correct: 2,
      explanation: "More air means the balloon can push air out for a longer time, providing thrust for longer and thus traveling farther."
    },
    {
      question: "When you swim, you push water backward. What is the reaction force?",
      options: ["The water disappears", "The water pushes you forward", "Gravity pulls you down", "Nothing happens"],
      correct: 1,
      explanation: "When you push water backward (action), the water pushes you forward (reaction). This is how you propel yourself through water!"
    },
    {
      question: "A gun recoils (kicks back) when fired because:",
      options: ["The gun is afraid of the noise", "The bullet pushes the gun backward (reaction)", "Air pressure pushes the gun", "The explosion happens twice"],
      correct: 1,
      explanation: "The gun pushes the bullet forward (action), and the bullet pushes the gun backward (reaction). The gun recoils due to Newton's Third Law."
    },
    {
      question: "Why do rockets work in the vacuum of space where there's nothing to push against?",
      options: ["They can't work in space", "They push against their own exhaust gases", "Space isn't really a vacuum", "They use solar wind"],
      correct: 1,
      explanation: "Rockets push exhaust gases out (action), and those gases push the rocket forward (reaction). They don't need anything external to push against!"
    },
    {
      question: "If action and reaction forces are equal, why do objects move?",
      options: ["They're not really equal", "The forces act on different objects", "One force is always stronger", "Movement is an illusion"],
      correct: 1,
      explanation: "Action and reaction forces act on DIFFERENT objects. When you push a cart, you push on the cart (it accelerates) while the cart pushes on you (but you're more massive)."
    },
    {
      question: "When a bird flaps its wings downward, what is the reaction?",
      options: ["The air pushes the bird up", "The bird gets tired", "Nothing, birds are too light", "Gravity increases"],
      correct: 0,
      explanation: "The bird pushes air downward (action), and the air pushes the bird upward (reaction). This is how birds generate lift with each wing stroke!"
    },
    {
      question: "A person standing on a skateboard throws a heavy ball forward. What happens?",
      options: ["Nothing", "The person rolls backward", "The ball stops mid-air", "The skateboard breaks"],
      correct: 1,
      explanation: "When the person pushes the ball forward (action), the ball pushes the person backward (reaction), causing them to roll backward on the skateboard."
    },
    {
      question: "If you're floating in space and throw your tool kit away from you, what happens?",
      options: ["You stay still", "You move in the opposite direction", "You start spinning randomly", "The tool kit comes back"],
      correct: 1,
      explanation: "When you push the tool kit away (action), it pushes you in the opposite direction (reaction). This is how astronauts can move in the weightlessness of space!"
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
        setBalloonX(80);
        setIsLaunched(false);
        setAirRemaining(100);
        setAirParticles([]);
        setMaxDistance(0);
      }
      if (newPhase === 'twist_play') {
        setSmallBalloonX(80);
        setLargeBalloonX(80);
        setTwistLaunched(false);
        setSmallAir(100);
        setLargeAir(100);
      }
    });
  }, [safeNavigate]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Balloon animation
  useEffect(() => {
    if (phase === 'play' && isLaunched && airRemaining > 0) {
      const animate = () => {
        setAirRemaining(prev => {
          const newAir = prev - (balloonSize / 30);
          if (newAir <= 0) return 0;
          return newAir;
        });

        setBalloonX(prev => {
          const thrust = (balloonSize / 50) * (airRemaining / 100) * 2;
          const newX = prev + thrust;
          if (newX > maxDistance) setMaxDistance(newX);
          return Math.min(newX, 700);
        });

        // Add air particles
        setAirParticles(prev => {
          const newParticles = [...prev];
          // Add new particles
          if (airRemaining > 0) {
            for (let i = 0; i < 3; i++) {
              newParticles.push({
                id: Date.now() + i,
                x: balloonX,
                y: 100 + (Math.random() - 0.5) * 20,
                vx: -5 - Math.random() * 5,
                vy: (Math.random() - 0.5) * 3,
                life: 30,
              });
            }
          }
          // Update and filter particles
          return newParticles
            .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
            .filter(p => p.life > 0 && p.x > 0);
        });

        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [phase, isLaunched, airRemaining, balloonSize, balloonX, maxDistance]);

  // Twist animation - comparing balloon sizes
  useEffect(() => {
    if (phase === 'twist_play' && twistLaunched) {
      const animate = () => {
        // Small balloon (size 30) - less air
        setSmallAir(prev => Math.max(0, prev - 3));
        setSmallBalloonX(prev => {
          if (smallAir > 0) {
            return Math.min(prev + 1.5, 700);
          }
          return prev;
        });

        // Large balloon (size 70) - more air
        setLargeAir(prev => Math.max(0, prev - 1.5));
        setLargeBalloonX(prev => {
          if (largeAir > 0) {
            return Math.min(prev + 2, 700);
          }
          return prev;
        });

        if (smallAir > 0 || largeAir > 0) {
          twistRef.current = requestAnimationFrame(animate);
        }
      };
      twistRef.current = requestAnimationFrame(animate);

      return () => {
        if (twistRef.current) cancelAnimationFrame(twistRef.current);
      };
    }
  }, [phase, twistLaunched, smallAir, largeAir]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (twistRef.current) cancelAnimationFrame(twistRef.current);
    };
  }, []);

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
        title: "🎈 The Balloon Rocket",
        content: "Have you ever let go of an inflated balloon and watched it zoom across the room? What makes it fly? Today we'll discover the secret!",
        visual: "🎈",
      },
      {
        title: "⚡ Action and Reaction",
        content: "300 years ago, Isaac Newton discovered a law that explains everything from rockets to swimming to how you walk. Every push has a push back!",
        visual: "⚡",
      },
      {
        title: "🚀 From Balloons to Rockets",
        content: "The same principle that makes a balloon zoom makes rockets fly to space. Let's discover Newton's Third Law and see action-reaction pairs everywhere!",
        visual: "🚀",
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
            {hookContent[hookStep].visual}
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
      { id: 'air_push', label: 'The air rushing out pushes the balloon forward', icon: '💨' },
      { id: 'lighter', label: 'The balloon gets lighter and floats up', icon: '🪶' },
      { id: 'pressure', label: 'The pressure inside makes it explode forward', icon: '💥' },
      { id: 'magic', label: 'The balloon just wants to move - no specific reason', icon: '✨' },
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
            Why does a balloon zoom forward when you let it go?
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
                  ? 'rgba(239, 68, 68, 0.2)'
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
    const currentBalloonRadius = 20 + (balloonSize / 100) * 20;
    const displaySize = 20 + (airRemaining / 100) * (balloonSize / 100) * 20;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🎈 Balloon Rocket Launch
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Inflate the balloon and watch it fly!
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
              width="100%"
              height="200"
              viewBox="0 0 700 200"
              style={{
                background: premiumDesign.colors.background.secondary,
                borderRadius: premiumDesign.radius.xl,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Track/String */}
              <line x1="50" y1="100" x2="680" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="5" />

              {/* Distance markers */}
              {[0, 100, 200, 300, 400, 500, 600].map(d => (
                <g key={d}>
                  <line x1={50 + d} y1="95" x2={50 + d} y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <text x={50 + d} y="125" textAnchor="middle" fill={premiumDesign.colors.text.muted} fontSize="10">
                    {d}cm
                  </text>
                </g>
              ))}

              {/* Air particles */}
              {airParticles.map(p => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r={3 + (p.life / 30) * 3}
                  fill={premiumDesign.colors.air}
                  opacity={p.life / 30}
                />
              ))}

              {/* Balloon */}
              <g transform={`translate(${balloonX}, 100)`}>
                {/* Balloon body */}
                <ellipse
                  cx={displaySize / 2}
                  cy="0"
                  rx={displaySize}
                  ry={displaySize * 0.8}
                  fill={premiumDesign.colors.balloon}
                  opacity={0.9}
                />
                {/* Balloon highlight */}
                <ellipse
                  cx={displaySize / 2 + 5}
                  cy="-5"
                  rx={displaySize * 0.3}
                  ry={displaySize * 0.2}
                  fill="white"
                  opacity={0.3}
                />
                {/* Nozzle */}
                <polygon
                  points={`0,5 -15,15 -15,-15 0,-5`}
                  fill={premiumDesign.colors.primaryDark}
                />

                {/* Force arrows when air is escaping */}
                {isLaunched && airRemaining > 0 && (
                  <>
                    {/* Action arrow (air going left) */}
                    <g transform="translate(-30, 0)">
                      <line x1="0" y1="0" x2="-40" y2="0" stroke={premiumDesign.colors.air} strokeWidth="3" markerEnd="url(#arrowBlue)" />
                      <text x="-20" y="-15" textAnchor="middle" fill={premiumDesign.colors.air} fontSize="10" fontWeight="bold">
                        AIR (Action)
                      </text>
                    </g>
                    {/* Reaction arrow (balloon going right) */}
                    <g transform={`translate(${displaySize + 10}, 0)`}>
                      <line x1="0" y1="0" x2="40" y2="0" stroke={premiumDesign.colors.primary} strokeWidth="3" markerEnd="url(#arrowRed)" />
                      <text x="20" y="-15" textAnchor="middle" fill={premiumDesign.colors.primary} fontSize="10" fontWeight="bold">
                        BALLOON (Reaction)
                      </text>
                    </g>
                  </>
                )}
              </g>

              {/* Arrow markers */}
              <defs>
                <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill={premiumDesign.colors.air} />
                </marker>
                <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill={premiumDesign.colors.primary} />
                </marker>
              </defs>
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
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.sm }}>
                Balloon Size: {balloonSize}%
              </h4>
              <input
                type="range"
                min="20"
                max="100"
                value={balloonSize}
                onChange={(e) => setBalloonSize(Number(e.target.value))}
                disabled={isLaunched}
                style={{ width: '100%', accentColor: premiumDesign.colors.primary }}
              />
              <p style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', marginTop: premiumDesign.spacing.xs }}>
                More air = More thrust!
              </p>
            </div>

            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: isLaunched ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isLaunched ? 'not-allowed' : 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!isLaunched) setIsLaunched(true);
              }}
            >
              {isLaunched ? '🎈 Launched!' : '🚀 Launch Balloon!'}
            </button>

            {isLaunched && (
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
                  setBalloonX(80);
                  setIsLaunched(false);
                  setAirRemaining(100);
                  setAirParticles([]);
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
                Distance Traveled
              </div>
              <div style={{ color: premiumDesign.colors.primary, fontSize: '24px', fontWeight: 700 }}>
                {Math.round(balloonX - 80)} cm
              </div>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px' }}>
                Air Remaining: {Math.round(airRemaining)}%
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
    const wasCorrect = prediction === 'air_push';

    const reviewContent = [
      {
        title: "Newton's Third Law",
        content: `${wasCorrect ? "Excellent! You got it! " : ""}For every ACTION, there is an equal and opposite REACTION.\n\nWhen the balloon pushes air OUT (action), the air pushes the balloon FORWARD (reaction). These forces are equal in strength but opposite in direction!`,
        highlight: wasCorrect,
      },
      {
        title: "Action-Reaction Pairs",
        content: "The key insight: Action and reaction forces act on DIFFERENT objects.\n\n• The balloon pushes on the air (action)\n• The air pushes on the balloon (reaction)\n\nThey're equal in force, but because they act on different things, movement happens!",
      },
      {
        title: "Why Movement Occurs",
        content: "You might wonder: if the forces are equal, why does anything move?\n\nAnswer: The forces act on different objects! The air zooms backward (it's pushed by the balloon), and the balloon zooms forward (it's pushed by the air). Each object responds to the force on IT.",
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
            🔍 Understanding Action & Reaction
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
                ✓ Great thinking! You correctly identified that the escaping air pushes the balloon forward.
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
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'New Variable →',
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
      { id: 'small_wins', label: 'The SMALLER balloon will travel farther (it\'s lighter!)', icon: '🎈' },
      { id: 'large_wins', label: 'The LARGER balloon will travel farther (more air!)', icon: '🎈🎈' },
      { id: 'same_distance', label: 'Both will travel the same distance', icon: '=' },
      { id: 'neither', label: 'Neither will move - size doesn\'t matter', icon: '🤷' },
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
            🎈 The Twist: Balloon Size
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            If we race a small balloon against a large balloon, which travels farther?
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
                  ? 'rgba(59, 130, 246, 0.2)'
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
            🏁 Balloon Race!
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Small balloon vs Large balloon - which wins?
          </p>
        </div>

        {/* Race Track */}
        <div style={{
          background: premiumDesign.colors.background.secondary,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <svg width="100%" height="200" viewBox="0 0 700 200">
            {/* Track lines */}
            <line x1="50" y1="60" x2="680" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5" />
            <line x1="50" y1="140" x2="680" y2="140" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5" />

            {/* Labels */}
            <text x="30" y="65" fill={premiumDesign.colors.text.muted} fontSize="12" textAnchor="end">Small</text>
            <text x="30" y="145" fill={premiumDesign.colors.text.muted} fontSize="12" textAnchor="end">Large</text>

            {/* Distance markers */}
            {[0, 100, 200, 300, 400, 500, 600].map(d => (
              <g key={d}>
                <line x1={50 + d} y1="170" x2={50 + d} y2="180" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <text x={50 + d} y="195" textAnchor="middle" fill={premiumDesign.colors.text.muted} fontSize="10">
                  {d}
                </text>
              </g>
            ))}

            {/* Small balloon */}
            <g transform={`translate(${smallBalloonX}, 60)`}>
              <ellipse cx="10" cy="0" rx={15} ry={12} fill={premiumDesign.colors.secondary} />
              <polygon points="0,4 -8,10 -8,-10 0,-4" fill="#2563eb" />
            </g>

            {/* Large balloon */}
            <g transform={`translate(${largeBalloonX}, 140)`}>
              <ellipse cx="15" cy="0" rx={25} ry={20} fill={premiumDesign.colors.primary} />
              <polygon points="0,6 -12,16 -12,-16 0,-6" fill={premiumDesign.colors.primaryDark} />
            </g>

            {/* Finish line indicator */}
            {(smallAir <= 0 && largeAir <= 0) && (
              <g>
                <line x1={Math.max(smallBalloonX, largeBalloonX) + 50} y1="30" x2={Math.max(smallBalloonX, largeBalloonX) + 50} y2="170" stroke={premiumDesign.colors.success} strokeWidth="3" strokeDasharray="10" />
                <text x={Math.max(smallBalloonX, largeBalloonX) + 60} y="100" fill={premiumDesign.colors.success} fontSize="14" fontWeight="bold">
                  🏆 {largeBalloonX > smallBalloonX ? 'Large Wins!' : 'Small Wins!'}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Controls and Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
          gap: premiumDesign.spacing.md,
        }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.md,
            border: '1px solid rgba(59, 130, 246, 0.3)',
            textAlign: 'center',
          }}>
            <div style={{ color: premiumDesign.colors.secondary, fontWeight: 600 }}>Small Balloon</div>
            <div style={{ color: premiumDesign.colors.text.primary, fontSize: '20px', fontWeight: 700 }}>
              {Math.round(smallBalloonX - 80)} cm
            </div>
            <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
              Air: {Math.round(smallAir)}%
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: twistLaunched ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.warm,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: twistLaunched ? 'not-allowed' : 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!twistLaunched) setTwistLaunched(true);
              }}
            >
              {twistLaunched ? '🏁 Racing!' : '🚀 Start Race!'}
            </button>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.md,
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'center',
          }}>
            <div style={{ color: premiumDesign.colors.primary, fontWeight: 600 }}>Large Balloon</div>
            <div style={{ color: premiumDesign.colors.text.primary, fontSize: '20px', fontWeight: 700 }}>
              {Math.round(largeBalloonX - 80)} cm
            </div>
            <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
              Air: {Math.round(largeAir)}%
            </div>
          </div>
        </div>

        {smallAir <= 0 && largeAir <= 0 && (
          <div style={{
            marginTop: premiumDesign.spacing.lg,
            padding: premiumDesign.spacing.md,
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            border: '1px solid rgba(16, 185, 129, 0.3)',
            textAlign: 'center',
          }}>
            <p style={{ color: premiumDesign.colors.success, margin: 0, fontWeight: 600 }}>
              🏆 The large balloon won! It traveled {Math.round(largeBalloonX - smallBalloonX)} cm farther because it had more air to push out!
            </p>
          </div>
        )}

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Understand Results →', onClick: nextPhase }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const wasCorrect = twistPrediction === 'large_wins';

    const twistReviewContent = [
      {
        title: "More Air = More Thrust Time",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The larger balloon travels farther because it has more air to push out. This means it can provide thrust for LONGER.\n\nRemember: It's not just about force - it's about how LONG that force acts!`,
        highlight: wasCorrect,
      },
      {
        title: "Impulse: Force × Time",
        content: "In physics, we call this IMPULSE = Force × Time.\n\nBoth balloons push with similar force, but the larger balloon pushes for longer because it has more air. More impulse = more speed = more distance!",
      },
      {
        title: "Real Rockets Use This Principle",
        content: "This is exactly why real rockets carry so much fuel! More fuel means:\n\n• Longer burn time\n• More total impulse\n• Higher final speed\n• Greater distance traveled\n\nThe Space Shuttle carried 2 million pounds of fuel!",
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
            🔍 Size Analysis
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
                ✓ Excellent reasoning! You understood that more air means longer thrust and greater distance.
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
        title: "🚀 Rocket Propulsion",
        description: "Rockets work by pushing exhaust gases out the back at high speed. The gases push back on the rocket, propelling it forward. This works even in the vacuum of space because the rocket pushes against its own exhaust, not the air!",
        fact: "The Saturn V rocket produced 7.5 million pounds of thrust by expelling exhaust at 10,000+ mph!",
      },
      {
        title: "🏊 Swimming",
        description: "When you swim, you push water backward with your arms and legs. The water pushes you forward in response! Every swimming stroke is an action-reaction pair. The harder you push the water back, the faster you go forward.",
        fact: "Olympic swimmers can push against 60+ pounds of water with each stroke!",
      },
      {
        title: "🔫 Gun Recoil",
        description: "When a gun fires, the explosive gases push the bullet forward. By Newton's Third Law, the bullet (and gases) push the gun backward - this is recoil. Heavier guns recoil less because they have more mass to accelerate.",
        fact: "A .50 caliber rifle can recoil with over 100 foot-pounds of energy - enough to bruise if not held properly!",
      },
      {
        title: "🚶 Walking",
        description: "You walk by pushing backward against the ground with your foot. The ground pushes forward on your foot, propelling you forward! Without friction (like on ice), you can't push effectively and you slip.",
        fact: "Every step you take involves pushing against the Earth with hundreds of pounds of force. The Earth pushes back equally - that's why you move, not the planet!",
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
            🌍 Newton's Third Law Everywhere
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
                ? 'You have mastered Newton\'s Third Law!'
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
                bgColor = 'rgba(239, 68, 68, 0.2)';
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
        {/* Confetti */}
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
          Action-Reaction Master!
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
            { icon: '↔️', label: 'Equal & Opposite' },
            { icon: '🎈', label: 'Air Pushes Balloon' },
            { icon: '🚀', label: 'Rockets in Space' },
            { icon: '🏊', label: 'Swimming & Walking' },
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
