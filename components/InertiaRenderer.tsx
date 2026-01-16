'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// INERTIA RENDERER - Premium 10-Phase Learning Experience
// ============================================================================
// Teaches Newton's First Law: Objects at rest stay at rest, objects in motion
// stay in motion, unless acted upon by an external force.
// Classic demo: Coin-Card-Cup trick
// ============================================================================

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#f59e0b',
    primaryDark: '#d97706',
    secondary: '#6366f1',
    accent: '#10b981',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    coin: '#fcd34d',
    coinEdge: '#b45309',
    card: '#ef4444',
    cup: '#6366f1',
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
      primary: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      secondary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      warm: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
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

interface InertiaRendererProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function InertiaRenderer({ onBack, onNext }: InertiaRendererProps) {
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

  // Play phase - Coin-Card-Cup simulation
  const [flickSpeed, setFlickSpeed] = useState<'slow' | 'fast'>('fast');
  const [hasFlicked, setHasFlicked] = useState(false);
  const [cardX, setCardX] = useState(0);
  const [coinY, setCoinY] = useState(0);
  const [coinFell, setCoinFell] = useState(false);
  const [coinMissed, setCoinMissed] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Tablecloth trick
  const [clothX, setClothX] = useState(0);
  const [dishesStayed, setDishesStayed] = useState(true);
  const [twistFlicked, setTwistFlicked] = useState(false);
  const [twistSpeed, setTwistSpeed] = useState<'slow' | 'fast'>('fast');
  const twistRef = useRef<number | null>(null);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "According to Newton's First Law, what happens to an object at rest with no forces acting on it?",
      options: ["It starts moving slowly", "It stays at rest", "It floats upward", "It shrinks"],
      correct: 1,
      explanation: "Newton's First Law (Law of Inertia) states that an object at rest stays at rest unless acted upon by an external force. No force = no change in motion."
    },
    {
      question: "In the coin-card-cup trick, why does the coin fall straight down into the cup?",
      options: ["The coin is magnetic", "The coin has inertia and resists horizontal motion", "Gravity is stronger on coins", "The cup pulls the coin"],
      correct: 1,
      explanation: "The coin has inertia - it resists changes to its state of motion. When the card is flicked away quickly, the coin 'wants' to stay still, so it drops straight down."
    },
    {
      question: "Why does a fast flick work better than a slow push for the coin trick?",
      options: ["Fast is more fun", "Less time for friction to act on the coin", "The coin likes speed", "Gravity works faster"],
      correct: 1,
      explanation: "A fast flick minimizes the time friction has to transfer horizontal motion to the coin. The quicker the card leaves, the less force is transferred to the coin."
    },
    {
      question: "When a bus suddenly stops, passengers lurch forward. This is because:",
      options: ["The bus pushes them forward", "Their bodies have inertia and continue moving", "Gravity changed direction", "The seats push them"],
      correct: 1,
      explanation: "Passengers' bodies were moving with the bus. When the bus stops, their bodies continue moving forward due to inertia until a force (seatbelt, seat, friction) stops them."
    },
    {
      question: "A tablecloth can be pulled from under dishes if pulled:",
      options: ["Slowly and carefully", "Quickly and sharply", "Upward at an angle", "While dishes are wet"],
      correct: 1,
      explanation: "Quick motion minimizes the time friction acts on the dishes. The dishes' inertia keeps them in place if the tablecloth is pulled fast enough."
    },
    {
      question: "Why do cars have seatbelts?",
      options: ["To look cool", "To stop inertia from throwing passengers forward in a crash", "To keep seats clean", "Legal requirement only"],
      correct: 1,
      explanation: "In a crash, the car stops but passengers continue moving forward due to inertia. Seatbelts provide the external force needed to stop the passenger safely."
    },
    {
      question: "A hockey puck on ice keeps sliding because:",
      options: ["Ice is magical", "Very little friction = little force to change its motion", "The puck is afraid to stop", "Cold temperatures speed things up"],
      correct: 1,
      explanation: "Ice has very low friction. With almost no external force acting on the puck, it continues moving in a straight line - demonstrating Newton's First Law perfectly."
    },
    {
      question: "If you're in a car making a sharp right turn, you feel pushed to the left. This is because:",
      options: ["The door pushes you", "Your body's inertia resists the change in direction", "Gravity shifts", "Wind from outside"],
      correct: 1,
      explanation: "Your body has inertia and 'wants' to continue in a straight line. The car turns right, but your body initially continues straight, making you feel 'pushed' left."
    },
    {
      question: "The coin-card trick works best when the card is:",
      options: ["Heavy and rough", "Light and smooth", "Wet", "Made of metal"],
      correct: 1,
      explanation: "A smooth card has less friction with the coin. A light card requires less force to accelerate quickly. Both factors help the coin stay in place."
    },
    {
      question: "An astronaut in space throws a ball. What happens to it?",
      options: ["It stops immediately", "It returns to the astronaut", "It keeps moving forever (in the same direction)", "It falls to Earth"],
      correct: 2,
      explanation: "In space, there's no air resistance or friction. With no external force to slow it down, the ball continues moving in a straight line forever - pure inertia!"
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
        setCardX(0);
        setCoinY(0);
        setHasFlicked(false);
        setCoinFell(false);
        setCoinMissed(false);
      }
      if (newPhase === 'twist_play') {
        setClothX(0);
        setTwistFlicked(false);
        setDishesStayed(true);
      }
    });
  }, [safeNavigate]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Coin-Card animation
  const flickCard = useCallback(() => {
    if (hasFlicked) return;
    setHasFlicked(true);

    const cardSpeed = flickSpeed === 'fast' ? 30 : 3;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      // Card moves to the right
      const newCardX = Math.min(elapsed * cardSpeed * 50, 300);
      setCardX(newCardX);

      // After card is gone, coin falls
      if (newCardX > 100) {
        if (flickSpeed === 'fast') {
          // Fast flick - coin falls straight down
          const fallTime = elapsed - (100 / (cardSpeed * 50));
          const newCoinY = Math.min(fallTime * 300, 80);
          setCoinY(newCoinY);
          if (newCoinY >= 80) {
            setCoinFell(true);
          }
        } else {
          // Slow flick - coin moves with card and misses
          const fallTime = elapsed - (100 / (cardSpeed * 50));
          const newCoinY = Math.min(fallTime * 300, 80);
          setCoinY(newCoinY);
          if (newCoinY >= 80) {
            setCoinMissed(true);
          }
        }
      }

      if (newCardX < 300) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [hasFlicked, flickSpeed]);

  // Tablecloth animation
  const pullCloth = useCallback(() => {
    if (twistFlicked) return;
    setTwistFlicked(true);

    const clothSpeed = twistSpeed === 'fast' ? 40 : 4;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newClothX = Math.min(elapsed * clothSpeed * 50, 400);
      setClothX(newClothX);

      if (twistSpeed === 'slow' && newClothX > 50) {
        setDishesStayed(false);
      }

      if (newClothX < 400) {
        twistRef.current = requestAnimationFrame(animate);
      }
    };

    twistRef.current = requestAnimationFrame(animate);
  }, [twistFlicked, twistSpeed]);

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
        title: "🪙 The Magic Coin Trick",
        content: "There's a classic magic trick: Place a coin on a card on top of a cup. Flick the card away, and the coin drops perfectly into the cup! How is this possible?",
        visual: "🪙",
      },
      {
        title: "🚗 The Sudden Stop",
        content: "Have you ever lurched forward when a car suddenly brakes? Or felt pushed back when it accelerates? Your body seems to have a mind of its own!",
        visual: "🚗",
      },
      {
        title: "⚖️ Newton's First Secret",
        content: "Isaac Newton discovered why these things happen. He called it INERTIA - the tendency of objects to resist changes in their motion. Today you'll master this principle!",
        visual: "⚖️",
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
      { id: 'coin_falls', label: 'The coin will drop straight down into the cup', icon: '⬇️' },
      { id: 'coin_flies', label: 'The coin will fly away with the card', icon: '➡️' },
      { id: 'coin_stays', label: 'The coin will hover in the air momentarily', icon: '🪙' },
      { id: 'coin_spins', label: 'The coin will spin and land randomly', icon: '🌀' },
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
            When you flick the card away quickly, what happens to the coin?
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
                  ? 'rgba(245, 158, 11, 0.2)'
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
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🪙 Coin-Card-Cup Experiment
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Flick the card and watch what happens to the coin!
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
              {/* Table */}
              <rect x="0" y="200" width="300" height="50" fill="#8B4513" />

              {/* Cup */}
              <g transform="translate(130, 120)">
                <path
                  d="M0 0 L10 80 L50 80 L60 0 Z"
                  fill={premiumDesign.colors.cup}
                  opacity={0.9}
                />
                <ellipse cx="30" cy="0" rx="30" ry="8" fill={premiumDesign.colors.cup} />
                <ellipse cx="30" cy="80" rx="20" ry="6" fill="#4f46e5" />
                {/* Inner cup */}
                <ellipse cx="30" cy="5" rx="22" ry="5" fill="#312e81" opacity={0.6} />
              </g>

              {/* Card (moving) */}
              {!coinFell && !coinMissed && (
                <g transform={`translate(${100 + cardX}, 80)`}>
                  <rect
                    x="0" y="0"
                    width="80" height="10"
                    fill={premiumDesign.colors.card}
                    rx="2"
                  />
                </g>
              )}

              {/* Coin */}
              <g transform={`translate(${flickSpeed === 'slow' && hasFlicked && cardX > 50 ? 145 + cardX * 0.3 : 145}, ${70 + coinY})`}>
                <ellipse cx="15" cy="0" rx="15" ry="4" fill={premiumDesign.colors.coinEdge} />
                <ellipse cx="15" cy="-3" rx="15" ry="4" fill={premiumDesign.colors.coin} />
                <text x="15" y="0" textAnchor="middle" fill={premiumDesign.colors.coinEdge} fontSize="10" fontWeight="bold">
                  $
                </text>
              </g>

              {/* Result messages */}
              {coinFell && (
                <g>
                  <text x="150" y="30" textAnchor="middle" fill={premiumDesign.colors.success} fontSize="16" fontWeight="bold">
                    ✓ SUCCESS!
                  </text>
                  <text x="150" y="50" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">
                    Coin dropped into cup!
                  </text>
                </g>
              )}
              {coinMissed && (
                <g>
                  <text x="150" y="30" textAnchor="middle" fill={premiumDesign.colors.error} fontSize="16" fontWeight="bold">
                    ✗ MISSED!
                  </text>
                  <text x="150" y="50" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">
                    Card dragged the coin!
                  </text>
                </g>
              )}

              {/* Finger indicator */}
              {!hasFlicked && (
                <g transform="translate(90, 70)">
                  <text fontSize="20">👆</text>
                  <text x="-10" y="50" fill={premiumDesign.colors.text.muted} fontSize="10">
                    Flick here!
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
                Flick Speed
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: premiumDesign.spacing.sm }}>
                {(['fast', 'slow'] as const).map(speed => (
                  <button
                    key={speed}
                    style={{
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: flickSpeed === speed ? `2px solid ${premiumDesign.colors.primary}` : '1px solid rgba(255,255,255,0.1)',
                      background: flickSpeed === speed ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!hasFlicked) setFlickSpeed(speed);
                    }}
                  >
                    {speed === 'fast' ? '⚡ Fast Flick' : '🐢 Slow Push'}
                  </button>
                ))}
              </div>
            </div>

            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: hasFlicked ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: hasFlicked ? 'not-allowed' : 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!hasFlicked) flickCard();
              }}
            >
              {hasFlicked ? '✓ Flicked!' : '👆 Flick the Card!'}
            </button>

            {(coinFell || coinMissed) && (
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
                  setCardX(0);
                  setCoinY(0);
                  setHasFlicked(false);
                  setCoinFell(false);
                  setCoinMissed(false);
                }}
              >
                🔄 Try Again
              </button>
            )}

            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Try both speeds to see the difference! Fast flick = inertia wins!
              </p>
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
    const wasCorrect = prediction === 'coin_falls';

    const reviewContent = [
      {
        title: "Newton's First Law of Motion",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The coin drops straight down because of INERTIA.\n\nNewton's First Law states: An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.`,
        highlight: wasCorrect,
      },
      {
        title: "Why the Fast Flick Works",
        content: "When you flick the card FAST:\n\n• The card leaves before friction can accelerate the coin\n• The coin's inertia keeps it in place\n• Gravity then pulls it straight down into the cup\n\nWhen you push SLOWLY, friction has time to drag the coin along!",
      },
      {
        title: "The Coin 'Wants' to Stay Still",
        content: "Inertia is the resistance to change.\n\n• The coin was at rest\n• It 'wants' to stay at rest\n• The fast-moving card doesn't give friction enough time\n• So the coin stays still horizontally and falls vertically!",
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
            🔍 Understanding Inertia
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
                ✓ Great prediction! You correctly anticipated the coin would fall straight down.
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
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'New Experiment →',
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
      { id: 'dishes_stay', label: 'The dishes will stay in place (inertia!)', icon: '🍽️' },
      { id: 'dishes_fly', label: 'The dishes will fly off the table', icon: '💨' },
      { id: 'dishes_crash', label: 'Everything will crash to the floor', icon: '💥' },
      { id: 'cloth_tears', label: 'The tablecloth will tear', icon: '📜' },
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
            🎪 The Twist: Tablecloth Trick
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            If you quickly pull a tablecloth from under dishes, what happens?
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
                  ? 'rgba(99, 102, 241, 0.2)'
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
            🎪 Tablecloth Trick
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Pull the tablecloth and see what happens to the dishes!
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
              width="350"
              height="220"
              style={{
                background: premiumDesign.colors.background.secondary,
                borderRadius: premiumDesign.radius.xl,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Table */}
              <rect x="20" y="150" width="310" height="20" fill="#8B4513" />
              <rect x="30" y="170" width="20" height="50" fill="#654321" />
              <rect x="280" y="170" width="20" height="50" fill="#654321" />

              {/* Tablecloth */}
              <g transform={`translate(${-clothX}, 0)`}>
                <rect x="20" y="140" width="310" height="15" fill="#dc2626" rx="2" />
                <rect x="0" y="140" width="25" height="15" fill="#b91c1c" rx="2" />
                {/* Cloth draping */}
                <path d="M20 155 L20 180 Q25 190 30 180 L30 155" fill="#dc2626" />
              </g>

              {/* Dishes - move if slow pull */}
              <g transform={`translate(${!dishesStayed ? clothX * 0.7 : 0}, ${!dishesStayed ? 20 : 0})`}>
                {/* Plate 1 */}
                <ellipse cx="80" cy="130" rx="30" ry="8" fill="#f5f5f5" />
                <ellipse cx="80" cy="128" rx="25" ry="6" fill="#e5e5e5" />

                {/* Glass */}
                <rect x="140" y="100" width="20" height="35" fill="rgba(200,200,255,0.5)" rx="3" />
                <ellipse cx="150" cy="100" rx="10" ry="4" fill="rgba(200,200,255,0.6)" />

                {/* Plate 2 */}
                <ellipse cx="220" cy="130" rx="30" ry="8" fill="#f5f5f5" />
                <ellipse cx="220" cy="128" rx="25" ry="6" fill="#e5e5e5" />

                {/* Candle */}
                <rect x="270" y="105" width="8" height="30" fill="#fff7ed" />
                <ellipse cx="274" cy="105" rx="5" ry="2" fill="#fcd34d" />
                {dishesStayed && <ellipse cx="274" cy="100" rx="3" ry="5" fill="#f97316" opacity={0.9} />}
              </g>

              {/* Result messages */}
              {twistFlicked && clothX > 350 && (
                <g>
                  {dishesStayed ? (
                    <>
                      <text x="175" y="40" textAnchor="middle" fill={premiumDesign.colors.success} fontSize="16" fontWeight="bold">
                        ✓ INERTIA WINS!
                      </text>
                      <text x="175" y="60" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">
                        Dishes stayed in place!
                      </text>
                    </>
                  ) : (
                    <>
                      <text x="175" y="40" textAnchor="middle" fill={premiumDesign.colors.error} fontSize="16" fontWeight="bold">
                        ✗ TOO SLOW!
                      </text>
                      <text x="175" y="60" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">
                        Friction dragged the dishes!
                      </text>
                    </>
                  )}
                </g>
              )}

              {/* Pull indicator */}
              {!twistFlicked && (
                <g transform="translate(10, 145)">
                  <text fontSize="16">👈</text>
                  <text x="25" y="5" fill={premiumDesign.colors.text.muted} fontSize="10">
                    Pull!
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
                Pull Speed
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: premiumDesign.spacing.sm }}>
                {(['fast', 'slow'] as const).map(speed => (
                  <button
                    key={speed}
                    style={{
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: twistSpeed === speed ? `2px solid ${premiumDesign.colors.secondary}` : '1px solid rgba(255,255,255,0.1)',
                      background: twistSpeed === speed ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!twistFlicked) setTwistSpeed(speed);
                    }}
                  >
                    {speed === 'fast' ? '⚡ Quick Pull' : '🐢 Slow Pull'}
                  </button>
                ))}
              </div>
            </div>

            <button
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: 'none',
                background: twistFlicked ? premiumDesign.colors.background.tertiary : premiumDesign.colors.gradient.secondary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: twistFlicked ? 'not-allowed' : 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!twistFlicked) pullCloth();
              }}
            >
              {twistFlicked ? '✓ Pulled!' : '👈 Pull Tablecloth!'}
            </button>

            {twistFlicked && clothX > 350 && (
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
                  setClothX(0);
                  setTwistFlicked(false);
                  setDishesStayed(true);
                }}
              >
                🔄 Try Again
              </button>
            )}
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
    const wasCorrect = twistPrediction === 'dishes_stay';

    const twistReviewContent = [
      {
        title: "Same Principle, Bigger Scale",
        content: `${wasCorrect ? "You predicted correctly! " : ""}The tablecloth trick works exactly like the coin trick!\n\nThe dishes have inertia - they resist changes to their motion. If you pull FAST enough, friction doesn't have time to accelerate them.`,
        highlight: wasCorrect,
      },
      {
        title: "Speed is the Key",
        content: "The faster you pull, the less time friction has to act.\n\nFriction force × Time = Impulse (change in momentum)\n\nShort time = Small impulse = Dishes barely move!",
      },
      {
        title: "Mass Helps Too",
        content: "Heavier objects have MORE inertia.\n\nThat's why professional magicians use heavy plates and silverware - they resist motion changes even more!\n\nF = ma → More mass = less acceleration for same force",
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
            🔍 The Physics Behind the Magic
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
                ✓ Excellent! You correctly applied inertia to the tablecloth scenario.
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
        title: "🚗 Car Safety Systems",
        description: "Seatbelts and airbags are designed to counteract inertia. In a crash, your body continues moving forward while the car stops. Seatbelts provide the force to slow you down gradually, preventing injury.",
        fact: "Modern seatbelts have 'pretensioners' that tighten in milliseconds during a crash, reducing the distance your body travels before being restrained!",
      },
      {
        title: "🎢 Roller Coasters",
        description: "That feeling of being 'pushed back' during acceleration or 'thrown forward' during braking is your inertia at work! Coaster designers use inertia to create thrilling sensations while keeping riders safe.",
        fact: "The fastest roller coaster accelerates from 0-150 mph in under 5 seconds - passengers feel 1.7G of force due to their inertia!",
      },
      {
        title: "🚀 Space Travel",
        description: "In space, there's almost no friction. Once a spacecraft reaches its velocity, it keeps moving without using fuel - pure inertia! This is how we can send probes to distant planets using minimal fuel.",
        fact: "The Voyager 1 probe, launched in 1977, is still traveling at 38,000 mph due to inertia - it hasn't used its engines in decades!",
      },
      {
        title: "⚽ Sports Physics",
        description: "Athletes use inertia constantly! A baseball pitcher's follow-through, a golfer's swing, a football player's tackle - all rely on understanding how objects (and bodies) resist changes in motion.",
        fact: "A professional pitcher's arm decelerates from 7,000°/second to 0 in just 0.05 seconds - requiring massive force to overcome the arm's inertia!",
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
            🌍 Inertia in Daily Life
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
                  ? 'rgba(245, 158, 11, 0.2)'
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
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(245, 158, 11, 0.3)',
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
                ? 'You have mastered the Law of Inertia!'
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
                bgColor = 'rgba(245, 158, 11, 0.2)';
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
          Inertia Master!
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
            { icon: '⚖️', label: 'Objects Resist Change' },
            { icon: '⚡', label: 'Speed Beats Friction' },
            { icon: '🪙', label: 'Coin Trick Mastered' },
            { icon: '🚗', label: 'Inertia in Motion' },
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
